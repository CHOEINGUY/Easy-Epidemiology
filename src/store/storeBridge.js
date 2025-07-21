import { EnhancedStorageManager } from './enhancedStorageManager.js';
import { HistoryManager } from './historyManager.js';
import { UserManager } from '../auth/UserManager.js';
import { ref } from 'vue';

/**
 * 기존 store.js와 새로운 저장 시스템을 연결하는 브리지 클래스
 * 기존 코드의 호환성을 유지하면서 새로운 기능을 제공합니다.
 */
export class StoreBridge {
  constructor(legacyStore = null, validationManager = null, options = {}) {
    this.legacyStore = legacyStore;
    this.userManager = new UserManager();
    this.enhancedManager = new EnhancedStorageManager(legacyStore, this.userManager);
    this.history = new HistoryManager();
    this.validationManager = validationManager;
    this.isInitialized = false;
    
    // 반응성 있는 undo/redo 상태 관리
    this._canUndo = ref(false);
    this._canRedo = ref(false);
    
    // 필터 상태 관리 (환자여부 컬럼만)
    this.filterState = {
      activeFilters: new Map(), // colIndex -> FilterConfig
      isFiltered: false,
      filteredRowCount: 0,
      originalRowCount: 0,
      lastAppliedAt: null
    };
    
    // 필터된 행 인덱스 매핑
    this._filteredRowMapping = new Map();
    this._originalToFilteredMapping = new Map();
    
    // 디버그 옵션 설정
    this.debug = options.debug ?? (import.meta.env?.MODE === 'development' || false);
    
    if (legacyStore) {
      this.initialize();
    }
    
    // 초기 undo/redo 상태 업데이트
    this._updateUndoRedoState();
    
    // 필터 상태 복원
    this.loadFilterState();
  }
  
  /**
   * 브리지를 초기화합니다.
   */
  initialize() {
    if (this.isInitialized) {
      return;
    }
    
    if (!this.legacyStore) {
      console.error('[StoreBridge] 기존 store.js 인스턴스가 필요합니다.');
      return;
    }
    
    this.isInitialized = true;
  }
  
  /**
   * 기존 store.js 인스턴스를 설정합니다.
   * @param {Object} legacyStore - 기존 store.js 인스턴스
   */
  setLegacyStore(legacyStore) {
    this.legacyStore = legacyStore;
    this.enhancedManager.setLegacyStore(legacyStore);
    
    if (!this.isInitialized) {
      this.initialize();
    }
  }
  
  /**
   * 현재 사용자를 설정합니다.
   * @param {Object} user - 현재 사용자 정보
   */
  setCurrentUser(user) {
    this.enhancedManager.setCurrentUser(user);
    console.log('[StoreBridge] 현재 사용자가 설정되었습니다:', user?.username);
  }
  
  /**
   * 컬럼 메타데이터를 설정합니다.
   * @param {Array<Object>} columnMetas - 컬럼 메타데이터 배열
   */
  setColumnMetas(columnMetas) {
    this.columnMetas = columnMetas;
  }
  
  // ===== 셀 편집 관련 메서드 =====
  
  /**
   * 셀 편집을 시작합니다.
   * @param {Object} cellInfo - 셀 정보
   * @param {*} originalValue - 원래 값
   * @param {Object} columnMeta - 컬럼 메타 정보
   */
  startCellEdit(cellInfo, originalValue, columnMeta) {
    this.enhancedManager.startCellEdit(cellInfo, originalValue, columnMeta);
  }
  
  /**
   * 편집 중 임시 값을 업데이트합니다.
   * @param {*} value - 새로운 임시 값
   */
  updateTempValue(value) {
    this.enhancedManager.updateTempValue(value);
  }
  
  /**
   * 편집을 취소합니다.
   * @returns {Object|null} 취소된 편집 정보
   */
  cancelCellEdit() {
    return this.enhancedManager.cancelCellEdit();
  }
  
  /**
   * 편집을 완료합니다.
   * @returns {Object|null} 완료된 편집 정보
   */
  completeCellEdit() {
    return this.enhancedManager.completeCellEdit();
  }
  
  // ===== 기존 store.js actions 래핑 =====
  
  /**
   * 셀 업데이트 (기존 updateCell 래핑)
   * @param {Object} payload - 업데이트 페이로드
   */
  updateCell(payload) {
    if (this.enhancedManager.isEditing()) {
      // 편집 중이면 임시 저장
      this.enhancedManager.updateTempValue(payload.value);
      if (this.debug) {
        console.log('[StoreBridge] 편집 중: 임시 값으로 저장');
      }
    } else {
      // 편집 중이 아니면 스냅샷 후 즉시 저장
      const { rowIndex, key, value, cellIndex } = payload;
      const beforeValue = (() => {
        const row = this.legacyStore.state.rows[rowIndex];
        if (!row) return undefined;
        if (cellIndex !== null && cellIndex !== undefined) {
          return row[key]?.[cellIndex];
        }
        return row[key];
      })();

      if (beforeValue !== value) {
        this._captureSnapshot('cell_edit', { rowIndex, colKey: key, cellIndex, before: beforeValue, after: value });
      }

      this.legacyStore.dispatch('updateCell', payload);
      if (this.debug) {
        console.log('[StoreBridge] 기존 로직: 즉시 저장');
      }
      this.saveCurrentState();
    }
  }
  
  /**
   * 헤더 업데이트
   * @param {Object} payload - 업데이트 페이로드
   */
  updateHeader(payload) {
    this.legacyStore.dispatch('updateHeader', payload);
  }
  
  /**
   * 단일 헤더 업데이트 (cellIndex가 null인 경우)
   * @param {Object} payload - 업데이트 페이로드
   */
  updateSingleHeader(payload) {
    // cellIndex가 null인 경우의 헤더 업데이트
    this.legacyStore.dispatch('updateHeader', { 
      headerType: payload.headerType, 
      index: null, 
      text: payload.text 
    });
  }
  
  /**
   * 개별 노출시간 업데이트
   * @param {Object} payload - 업데이트 페이로드
   */
  updateIndividualExposureTime(payload) {
    this.legacyStore.dispatch('updateIndividualExposureTime', payload);
  }
  
  /**
   * 행 추가
   * @param {number} count - 추가할 행 수
   */
  async addRows(count) {
    // 변경 전 스냅샷 캡처
    this._captureSnapshot('addRows', { count });
    
    // 비동기 작업 완료 대기
    const result = await this.legacyStore.dispatch('addRows', count);
    
    // 작업 완료 후 상태 저장
    this.saveCurrentState();
    
    // 검증 처리
    if (this.validationManager) {
      const currentRows = this.legacyStore.state.rows;
      const columnMetas = this.getColumnMetas();
      
      // 새로 추가된 행들 검증
      for (let i = currentRows.length - count; i < currentRows.length; i++) {
        this.validationManager.handleRowAddition(i, currentRows[i], columnMetas);
      }
    }
    
    return result;
  }
  
  /**
   * 열 추가
   * @param {string} type - 열 타입
   */
  async addColumn(type) {
    // 변경 전 스냅샷 캡처
    this._captureSnapshot('addColumn', { type });
    
    // 비동기 작업 완료 대기
    const result = await this.legacyStore.dispatch('addColumn', type);
    
    // 작업 완료 후 상태 저장
    this.saveCurrentState();
    
    // 검증 처리
    if (this.validationManager) {
      const currentRows = this.legacyStore.state.rows;
      const columnMetas = this.getColumnMetas();
      const newColIndex = columnMetas.length - 1; // 새로 추가된 열의 인덱스
      const newColumnMeta = columnMetas[newColIndex];
      
      this.validationManager.handleColumnAddition(newColIndex, newColumnMeta, currentRows);
    }
    
    return result;
  }
  
  /**
   * 행 삭제
   * @param {number} rowIndex - 삭제할 행 인덱스
   */
  async deleteRow(rowIndex) {
    // 변경 전 스냅샷 캡처
    this._captureSnapshot('deleteRow', { rowIndex });
    
    // 비동기 작업 완료 대기
    await this.legacyStore.dispatch('deleteRow', rowIndex);
    
    // 작업 완료 후 상태 저장
    this.saveCurrentState();
    
    // 새로운 FilterRowValidationManager 사용
    if (this.validationManager) {
      const columnMetas = this.getColumnMetas();
      this.validationManager.filterRowManager.handleRowChanges([rowIndex], []);
      this.validationManager.remapValidationErrorsByRowDeletion([rowIndex], columnMetas);
    }
  }
  
  /**
   * 여러 행 삭제
   * @param {Object} payload - 삭제 페이로드
   */
  async deleteMultipleRows(payload) {
    // 변경 전 스냅샷 캡처
    this._captureSnapshot('deleteMultipleRows', payload);
    
    // 비동기 작업 완료 대기
    await this.legacyStore.dispatch('deleteMultipleRows', payload);
    
    // 작업 완료 후 상태 저장
    this.saveCurrentState();
    
    // 새로운 FilterRowValidationManager 사용
    if (this.validationManager) {
      let deletedRowIndices = [];
      
      if (Array.isArray(payload)) {
        // 배열 형태: [rowIndex1, rowIndex2, ...]
        deletedRowIndices = payload;
      } else if (payload.startRow !== undefined && payload.endRow !== undefined) {
        // 객체 형태: { startRow, endRow }
        for (let i = payload.startRow; i <= payload.endRow; i++) {
          deletedRowIndices.push(i);
        }
      }
      
      if (deletedRowIndices.length > 0) {
        const columnMetas = this.getColumnMetas();
        this.validationManager.filterRowManager.handleRowChanges(deletedRowIndices, []);
        this.validationManager.remapValidationErrorsByRowDeletion(deletedRowIndices, columnMetas);
      }
    }
  }
  
  /**
   * 개별 행 삭제
   * @param {Object} payload - 삭제 페이로드
   */
  async deleteIndividualRows(payload) {
    // 변경 전 스냅샷 캡처
    this._captureSnapshot('deleteIndividualRows', payload);
    
    // 비동기 작업 완료 대기
    await this.legacyStore.dispatch('deleteIndividualRows', payload);
    
    // 작업 완료 후 상태 저장
    this.saveCurrentState();
    
    // 새로운 FilterRowValidationManager 사용
    if (this.validationManager) {
      let deletedRowIndices = [];
      
      if (Array.isArray(payload)) {
        // 배열 형태: [rowIndex1, rowIndex2, ...]
        deletedRowIndices = payload;
      } else if (payload.rows && Array.isArray(payload.rows)) {
        // 객체 형태: { rows: [rowIndex1, rowIndex2, ...] }
        deletedRowIndices = payload.rows;
      }
      
      if (deletedRowIndices.length > 0) {
        const columnMetas = this.getColumnMetas();
        this.validationManager.filterRowManager.handleRowChanges(deletedRowIndices, []);
        this.validationManager.remapValidationErrorsByRowDeletion(deletedRowIndices, columnMetas);
      }
    }
  }
  
  /**
   * 열 삭제
   * @param {string} type - 열 타입
   */
  deleteColumn(type) {
    this._captureSnapshot('deleteColumn', { type });
    
    // 삭제 전에 현재 열 메타 정보 저장
    const beforeColumnMetas = this.getColumnMetas();
    const targetColumnMetas = beforeColumnMetas.filter(c => c.type === type);
    const deletedColIndices = targetColumnMetas.map(c => c.colIndex);
    
    const result = this.legacyStore.dispatch('deleteColumn', type);
    this.saveCurrentState();
    
    // 검증 처리
    if (this.validationManager && deletedColIndices.length > 0) {
      this.validationManager.handleColumnDeletion(deletedColIndices);
    }
    
    return result;
  }
  
  /**
   * 빈 행 삭제
   */
  deleteEmptyRows() {
    this._captureSnapshot('deleteEmptyRows');
    
    // 삭제 전에 현재 행 정보 저장
    const beforeRows = [...this.legacyStore.state.rows];
    const deletedRowIndices = [];
    
    // 빈 행들의 인덱스 찾기
    beforeRows.forEach((row, index) => {
      if (this._isEmptyRow(row)) {
        deletedRowIndices.push(index);
      }
    });
    
    const result = this.legacyStore.dispatch('deleteEmptyRows');
    this.saveCurrentState();
    
    // 새로운 FilterRowValidationManager 사용
    if (this.validationManager && deletedRowIndices.length > 0) {
      const columnMetas = this.getColumnMetas();
      this.validationManager.filterRowManager.handleRowChanges(deletedRowIndices, []);
      this.validationManager.remapValidationErrorsByRowDeletion(deletedRowIndices, columnMetas);
    }
    
    return result;
  }
  
  /**
   * 빈 열 삭제
   */
  deleteEmptyColumns() {
    this._captureSnapshot('deleteEmptyColumns');
    
    // 삭제 전에 현재 열 메타 정보 저장
    const beforeColumnMetas = this.getColumnMetas();
    const deletedColIndices = [];
    
    // 빈 열들의 인덱스 찾기
    beforeColumnMetas.forEach(columnMeta => {
      if (this._isEmptyColumn(columnMeta)) {
        deletedColIndices.push(columnMeta.colIndex);
      }
    });
    
    const result = this.legacyStore.dispatch('deleteEmptyColumns');
    this.saveCurrentState();
    
    // 검증 처리
    if (this.validationManager && deletedColIndices.length > 0) {
      this.validationManager.handleColumnDeletion(deletedColIndices);
    }
    
    return result;
  }
  
  /**
   * 데이터 붙여넣기
   * @param {Object} payload - 붙여넣기 페이로드
   */
  async pasteData(payload) {
    console.log('[StoreBridge] pasteData 호출됨', payload);
    this._captureSnapshot('pasteData', payload);
    const result = this.legacyStore.dispatch('pasteData', payload);
    this.saveCurrentState();
    
    // 검증 처리 (개선된 버전)
    if (this.validationManager) {
      const { startRowIndex, startColIndex, data } = payload;
      const columnMetas = this.getColumnMetas();
      console.log('[StoreBridge] ValidationManager.handlePasteData 호출 직전', data, startRowIndex, startColIndex, columnMetas);
      this.validationManager.handlePasteData(data, startRowIndex, startColIndex, columnMetas);
    }
    
    return result;
  }
  
  /**
   * 실행 취소
   */
  undo() {
    const prevState = this.history.undo();
    if (!prevState) {
      this._updateUndoRedoState();
      return false;
    }

    // 현재 상태 백업
    const currentRows = [...this.legacyStore.state.rows];
    const currentErrors = new Map(this.legacyStore.state.validationState.errors);
    const columnMetas = this.getColumnMetas(); // 캐싱

    // Vuex mutation으로 상태 치환
    if (this.legacyStore) {
      this.legacyStore.commit('SET_INITIAL_DATA', prevState);
    }

    // localStorage 최신화
    this.enhancedManager.saveData(prevState);

    // 필터 상태 복원 (핵심 추가)
    if (prevState.filterState) {
      this.filterState.activeFilters = new Map(prevState.filterState.activeFilters || []);
      this.filterState.isFiltered = prevState.filterState.isFiltered || false;
      this.filterState.filteredRowCount = prevState.filterState.filteredRowCount || 0;
      this.filterState.originalRowCount = prevState.filterState.originalRowCount || 0;
      this.filterState.lastAppliedAt = prevState.filterState.lastAppliedAt || null;
      
      // 필터된 행 재계산
      this._updateFilteredRows();
      
      if (this.debug) {
        console.log('[StoreBridge] 필터 상태 복원 완료:', {
          isFiltered: this.filterState.isFiltered,
          activeFiltersCount: this.filterState.activeFilters.size,
          filteredRowCount: this.filterState.filteredRowCount
        });
      }
    } else {
      // 필터 상태가 없으면 초기화
      this.clearAllFilters();
    }

    // Validation 오류 복원
    if (prevState.validationErrors && typeof prevState.validationErrors === 'object') {
      // ValidationManager 타이머 정리
      if (this.validationManager) {
        this.validationManager.clearAllErrors();
      }
      
      // 이전 상태의 오류들 복원
      const restoredErrors = new Map();
      Object.entries(prevState.validationErrors).forEach(([key, errorData]) => {
        const message = errorData.message || errorData;
        restoredErrors.set(key, { message, timestamp: errorData.timestamp || Date.now() });
      });
      
      // 변경되지 않은 행들의 오류 유지
      currentErrors.forEach((error, key) => {
        const [rowIndex, colIndex] = key.split('_').map(Number);
        
        // 현재 행이 이전 상태에도 존재하고, 해당 셀의 값이 변경되지 않았다면 오류 유지
        if (prevState.rows[rowIndex] && currentRows[rowIndex]) {
          const prevValue = this._getCellValueByIndex(prevState.rows[rowIndex], colIndex, columnMetas);
          const currentValue = this._getCellValueByIndex(currentRows[rowIndex], colIndex, columnMetas);
          
          if (prevValue === currentValue && !restoredErrors.has(key)) {
            restoredErrors.set(key, error);
          }
        }
      });
      
      this.legacyStore.commit('SET_VALIDATION_ERRORS', restoredErrors);
    }
    
    // 상태 업데이트
    this._updateUndoRedoState();
    console.log('[StoreBridge] undo 완료 - canUndo:', this.canUndo, 'canRedo:', this.canRedo);
    
    return true;
  }
  
  /**
   * 재실행
   */
  redo() {
    const nextState = this.history.redo();
    if (!nextState) {
      this._updateUndoRedoState();
      return false;
    }

    // 현재 상태 백업
    const currentRows = [...this.legacyStore.state.rows];
    const currentErrors = new Map(this.legacyStore.state.validationState.errors);
    const columnMetas = this.getColumnMetas(); // 캐싱

    if (this.legacyStore) {
      this.legacyStore.commit('SET_INITIAL_DATA', nextState);
    }

    this.enhancedManager.saveData(nextState);

    // 필터 상태 복원 (핵심 추가)
    if (nextState.filterState) {
      this.filterState.activeFilters = new Map(nextState.filterState.activeFilters || []);
      this.filterState.isFiltered = nextState.filterState.isFiltered || false;
      this.filterState.filteredRowCount = nextState.filterState.filteredRowCount || 0;
      this.filterState.originalRowCount = nextState.filterState.originalRowCount || 0;
      this.filterState.lastAppliedAt = nextState.filterState.lastAppliedAt || null;
      
      // 필터된 행 재계산
      this._updateFilteredRows();
      
      if (this.debug) {
        console.log('[StoreBridge] 필터 상태 복원 완료:', {
          isFiltered: this.filterState.isFiltered,
          activeFiltersCount: this.filterState.activeFilters.size,
          filteredRowCount: this.filterState.filteredRowCount
        });
      }
    } else {
      // 필터 상태가 없으면 초기화
      this.clearAllFilters();
    }

    // Validation 오류 복원
    if (nextState.validationErrors && typeof nextState.validationErrors === 'object') {
      // ValidationManager 타이머 정리
      if (this.validationManager) {
        this.validationManager.clearAllErrors();
      }
      
      // 다음 상태의 오류들 복원
      const restoredErrors = new Map();
      Object.entries(nextState.validationErrors).forEach(([key, errorData]) => {
        const message = errorData.message || errorData;
        restoredErrors.set(key, { message, timestamp: errorData.timestamp || Date.now() });
      });
      
      // 변경되지 않은 행들의 오류 유지
      currentErrors.forEach((error, key) => {
        const [rowIndex, colIndex] = key.split('_').map(Number);
        
        // 현재 행이 다음 상태에도 존재하고, 해당 셀의 값이 변경되지 않았다면 오류 유지
        if (nextState.rows[rowIndex] && currentRows[rowIndex]) {
          const nextValue = this._getCellValueByIndex(nextState.rows[rowIndex], colIndex, columnMetas);
          const currentValue = this._getCellValueByIndex(currentRows[rowIndex], colIndex, columnMetas);
          
          if (nextValue === currentValue && !restoredErrors.has(key)) {
            restoredErrors.set(key, error);
          }
        }
      });
      
      this.legacyStore.commit('SET_VALIDATION_ERRORS', restoredErrors);
    }
    
    // 상태 업데이트
    this._updateUndoRedoState();
    console.log('[StoreBridge] redo 완료 - canUndo:', this.canUndo, 'canRedo:', this.canRedo);
    
    return true;
  }
  
  /**
   * 시트 초기화
   */
  resetSheet() {
    this._captureSnapshot('resetSheet');
    const result = this.legacyStore.dispatch('resetSheet');
    this.saveCurrentState();
    return result;
  }
  
  /**
   * 엑셀에서 헤더 업데이트
   * @param {Object} headers - 헤더 데이터
   */
  async updateHeadersFromExcel(headers) {
    // 변경 전 스냅샷 캡처
    this._captureSnapshot('updateHeadersFromExcel', { headerCount: Object.keys(headers).length });
    
    // 비동기 작업 완료 대기
    const result = await this.legacyStore.dispatch('updateHeadersFromExcel', headers);
    
    // 작업 완료 후 상태 저장
    this.saveCurrentState();
    return result;
  }
  
  /**
   * 엑셀에서 행 추가
   * @param {Array} rows - 행 데이터
   */
  async addRowsFromExcel(rows) {
    // 변경 전 스냅샷 캡처
    this._captureSnapshot('addRowsFromExcel', { rowCount: rows.length });
    
    // 비동기 작업 완료 대기
    const result = await this.legacyStore.dispatch('addRowsFromExcel', rows);
    
    // 작업 완료 후 상태 저장
    this.saveCurrentState();
    
    // 검증 처리
    if (this.validationManager) {
      const columnMetas = this.getColumnMetas();
      await this.validationManager.handleDataImport(rows, columnMetas);
    }
    
    return result;
  }
  
  /**
   * 개별 노출시간 열 가시성 설정
   * @param {boolean} isVisible - 가시성 여부
   */
  setIndividualExposureColumnVisibility(isVisible) {
    const beforeColumnMetas = this.getColumnMetas();
    const wasVisible = this.legacyStore.state.isIndividualExposureColumnVisible;
    const isAdding = isVisible && !wasVisible; // 열을 추가하는 경우
    const isRemoving = !isVisible && wasVisible; // 열을 제거하는 경우
    
    if (isVisible === wasVisible) {
      return;
    }
    
    if (this.debug) {
      console.log(`[StoreBridge] setIndividualExposureColumnVisibility: ${isVisible}`);
      console.log(`[StoreBridge] isAdding: ${isAdding}, isRemoving: ${isRemoving}`);
    }
    
    // 기존 로직 실행
    const result = this.legacyStore.dispatch('setIndividualExposureColumnVisibility', isVisible);
    this.saveCurrentState();
    
    // 고유 식별자 기반 에러 재매핑만 사용
    const afterColumnMetas = this.getColumnMetas();
    if (this.validationManager) {
      console.log('[StoreBridge] setIndividualExposureColumnVisibility: remapValidationErrorsByColumnIdentity 호출');
      this.validationManager.remapValidationErrorsByColumnIdentity(beforeColumnMetas, afterColumnMetas);
    }
    
    return result;
  }
  
  /**
   * 확진자 여부 열 가시성 설정
   * @param {boolean} isVisible - 가시성 여부
   */
  setConfirmedCaseColumnVisibility(isVisible) {
    const beforeColumnMetas = this.getColumnMetas();
    const wasVisible = this.legacyStore.state.isConfirmedCaseColumnVisible;
    const isAdding = isVisible && !wasVisible;
    const isRemoving = !isVisible && wasVisible;
    
    if (isVisible === wasVisible) {
      return;
    }
    
    let confirmedCaseColumnIndex = null;
    
    if (isAdding) {
      // 추가할 때는 환자여부 열 다음에 삽입됨
      confirmedCaseColumnIndex = 2; // COL_IDX_CONFIRMED_CASE
    } else if (isRemoving) {
      // 제거할 때는 현재 확진자 여부 열의 위치를 찾아야 함
      const columnMetas = this.getColumnMetas();
      const confirmedCaseCol = columnMetas.find(col => 
        col.type === 'isConfirmedCase' || 
        col.dataKey === 'isConfirmedCase'
      );
      confirmedCaseColumnIndex = confirmedCaseCol ? confirmedCaseCol.colIndex : null;
      
      // 만약 찾지 못했다면, 기본적으로 환자여부 열 다음 위치로 가정
      if (confirmedCaseColumnIndex === null) {
        confirmedCaseColumnIndex = 2; // COL_IDX_CONFIRMED_CASE
      }
    }
    
    if (this.debug) {
      console.log(`[StoreBridge] setConfirmedCaseColumnVisibility: ${isVisible}`);
      console.log(`[StoreBridge] isAdding: ${isAdding}, isRemoving: ${isRemoving}`);
      console.log(`[StoreBridge] confirmedCaseColumnIndex: ${confirmedCaseColumnIndex}`);
    }
    
    // Vuex state 변경
    const result = this.legacyStore.dispatch('setConfirmedCaseColumnVisibility', isVisible);
    this.saveCurrentState();
    
    // 고유 식별자 기반 에러 재매핑만 사용
    const afterColumnMetas = this.getColumnMetas();
    if (this.validationManager) {
      console.log('[StoreBridge] setConfirmedCaseColumnVisibility: remapValidationErrorsByColumnIdentity 호출');
      this.validationManager.remapValidationErrorsByColumnIdentity(beforeColumnMetas, afterColumnMetas);
    }
    
    return result;
  }
  
  /**
   * 여러 열 추가
   * @param {Object} payload - 추가 페이로드
   */
  addMultipleColumns(payload) {
    const result = this.legacyStore.dispatch('addMultipleColumns', payload);
    this.saveCurrentState();
    return result;
  }
  
  /**
   * 특정 위치에 열 추가
   * @param {Object} payload - 추가 페이로드
   */
  insertColumnAt(payload) {
    // 삽입 전에 현재 열 메타 정보 저장
    const beforeColumnMetas = this.getColumnMetas();
    const { type, index } = payload;
    
    if (this.debug) {
      console.log(`[StoreBridge] insertColumnAt: type=${type}, index=${index}`);
    }
    
    const result = this.legacyStore.dispatch('insertColumnAt', payload);
    this.saveCurrentState();
    
    // 고유 식별자 기반 에러 재매핑만 사용
    const afterColumnMetas = this.getColumnMetas();
    if (this.validationManager) {
      console.log('[StoreBridge] insertColumnAt: remapValidationErrorsByColumnIdentity 호출');
      this.validationManager.remapValidationErrorsByColumnIdentity(beforeColumnMetas, afterColumnMetas);
    }
    
    return result;
  }
  
  /**
   * 여러 열을 특정 위치에 삽입 (validation 처리 포함)
   */
  insertMultipleColumnsAt(payload) {
    const beforeColumnMetas = this.getColumnMetas();
    const { type, count, index } = payload;

    if (this.debug) {
      console.log(`[StoreBridge] insertMultipleColumnsAt: type=${type}, count=${count}, index=${index}`);
    }

    this.legacyStore.dispatch('insertMultipleColumnsAt', payload);
    this.saveCurrentState();
    
    // 고유 식별자 기반 에러 재매핑만 사용
    const afterColumnMetas = this.getColumnMetas();
    if (this.validationManager && count > 0) {
      console.log('[StoreBridge] insertMultipleColumnsAt: remapValidationErrorsByColumnIdentity 호출');
      this.validationManager.remapValidationErrorsByColumnIdentity(beforeColumnMetas, afterColumnMetas);
    }
  }
  
  /**
   * 인덱스로 열 삭제
   * @param {Object} payload - 삭제 페이로드
   */
  deleteColumnByIndex(payload) {
    if (this.debug) {
      console.log('[StoreBridge] deleteColumnByIndex 호출:', payload);
    }
    const result = this.legacyStore.dispatch('deleteColumnByIndex', payload);
    this.saveCurrentState();
    return result;
  }
  
  /**
   * 여러 열을 인덱스로 삭제 (validation 처리 포함)
   */
  deleteMultipleColumnsByIndex(payload) {
    console.log('[StoreBridge] deleteMultipleColumnsByIndex 시작');
    
    const beforeColumnMetas = this.getColumnMetas();
    const { columns } = payload;
    const deletedColIndices = [];
    
    console.log('[StoreBridge] payload:', JSON.stringify(payload));
    console.log('[StoreBridge] beforeColumnMetas 개수:', beforeColumnMetas.length);

    // 삭제될 열들의 인덱스 수집
    columns.forEach(({ type, index }) => {
      console.log(`[StoreBridge] 열 찾기: type=${type}, index=${index}`);
      // 실제 타입으로 직접 매칭 (이미 올바른 타입으로 전달됨)
      const targetColumns = beforeColumnMetas.filter(c => c.type === type && c.cellIndex === index);
      console.log('[StoreBridge] 찾은 열들:', targetColumns);
      targetColumns.forEach(col => deletedColIndices.push(col.colIndex));
    });

    console.log('[StoreBridge] deletedColIndices:', deletedColIndices);
    console.log('[StoreBridge] validationManager 존재 여부:', !!this.validationManager);
    
    // 기존 로직 실행
    this.legacyStore.dispatch('deleteMultipleColumnsByIndex', payload);
    this.saveCurrentState();
    
    const afterColumnMetas = this.getColumnMetas();
    console.log('[StoreBridge] afterColumnMetas 개수:', afterColumnMetas.length);
    
    if (this.validationManager && deletedColIndices.length > 0) {
      console.log('[StoreBridge] remapValidationErrorsByColumnIdentity 호출 시작');
      // 고유 식별자 기반 재매핑만 사용 (기존 reindexErrorsAfterColumnDeletion 제거)
      this.validationManager.remapValidationErrorsByColumnIdentity(beforeColumnMetas, afterColumnMetas, deletedColIndices);
      console.log('[StoreBridge] remapValidationErrorsByColumnIdentity 호출 완료');
    } else {
      console.log('[StoreBridge] remapValidationErrorsByColumnIdentity 호출 건너뜀:', {
        hasValidationManager: !!this.validationManager,
        deletedColIndicesLength: deletedColIndices.length
      });
    }
  }
  
  /**
   * 여러 열 데이터 지우기
   * @param {Object} payload - 지우기 페이로드
   */
  clearMultipleColumnsData(payload) {
    this._captureSnapshot('clearMultipleColumnsData', payload);
    const result = this.legacyStore.dispatch('clearMultipleColumnsData', payload);
    this.saveCurrentState();
    
    // 검증 처리
    if (this.validationManager) {
      const { columns } = payload;
      const columnMetas = this.getColumnMetas();
      const clearedCells = [];
      
      // 각 열에 대해 모든 행의 해당 열 셀들을 지울 대상으로 추가
      columns.forEach(({ type, index }) => {
        columnMetas.forEach(meta => {
          if (meta.type === type && meta.cellIndex === index) {
            const rows = this.legacyStore.state.rows;
            rows.forEach((row, rowIndex) => {
              clearedCells.push({
                rowIndex,
                colIndex: meta.colIndex
              });
            });
          }
        });
      });
      
      this.validationManager.handleDataClear(clearedCells);
    }
    
    return result;
  }
  
  /**
   * 단일 열 데이터 지우기
   * @param {Object} payload - 지우기 페이로드 { type, index }
   */
  clearColumnData(payload) {
    if (this.debug) {
      console.log('[StoreBridge] clearColumnData 호출됨:', payload);
    }
    this._captureSnapshot('clearColumnData', payload);
    const result = this.legacyStore.dispatch('clearColumnData', payload);
    this.saveCurrentState();
    
    // 검증 처리: 해당 열의 모든 셀에 대해 validation 재실행
    if (this.validationManager && this.columnMetas) {
      if (this.debug) {
        console.log('[StoreBridge] validationManager와 columnMetas 존재함 (단일열)');
      }
      const { type, index } = payload;
      const rows = this.legacyStore.state.rows;
      
      // 해당 타입과 인덱스의 열을 찾아서 모든 행의 해당 열 셀들을 다시 검증
      const targetColumns = this.columnMetas.filter(meta => 
        meta.type === type && meta.cellIndex === index
      );
      
      if (this.debug) {
        console.log('[StoreBridge] targetColumns (단일열):', targetColumns);
      }
      
      targetColumns.forEach(columnMeta => {
        rows.forEach((row, rowIndex) => {
          const value = this._getCellValue(row, columnMeta);
          if (this.debug) {
            console.log(`[StoreBridge] validation 재실행 (단일열): row=${rowIndex}, col=${columnMeta.colIndex}, value="${value}", type=${columnMeta.type}`);
          }
          // 빈 값이므로 validation 재실행 (오류 제거)
          this.validationManager.validateCell(rowIndex, columnMeta.colIndex, value, columnMeta.type, true);
        });
      });
    } else if (this.debug) {
      console.log('[StoreBridge] validationManager 또는 columnMetas가 없음 (단일열):', {
        hasValidationManager: !!this.validationManager,
        hasColumnMetas: !!this.columnMetas
      });
    }
    
    return result;
  }
  
  /**
   * 단일 셀 데이터 지우기
   * @param {Object} payload - 지우기 페이로드 { rowIndex, colIndex, type }
   */
  clearCellData(payload) {
    if (this.debug) {
      console.log('[StoreBridge] clearCellData 호출됨:', payload);
    }
    
    const { rowIndex, colIndex, type } = payload;
    
    // 해당 셀의 현재 값 가져오기
    const row = this.legacyStore.state.rows[rowIndex];
    if (!row) {
      console.warn('[StoreBridge] clearCellData: 행이 존재하지 않음:', rowIndex);
      return;
    }
    
    // 컬럼 메타데이터에서 해당 셀 정보 찾기
    const columnMeta = this.columnMetas?.find(meta => 
      meta.colIndex === colIndex && meta.type === type
    );
    
    if (!columnMeta) {
      console.error('[StoreBridge] clearCellData: 컬럼 메타데이터를 찾을 수 없음:', { colIndex, type });
      // 사용자에게 알림
      if (typeof window !== 'undefined' && window.showToast) {
        window.showToast('데이터 삭제 중 오류가 발생했습니다.', 'error');
      }
      return;
    }
    
    // 현재 값 가져오기
    const currentValue = this._getCellValue(row, columnMeta);
    
    // 스냅샷 캡처
    this._captureSnapshot('clearCellData', { 
      rowIndex, 
      colIndex, 
      type, 
      before: currentValue, 
      after: null 
    });
    
    // 셀 데이터 지우기 (기존 store.js의 updateCell 액션 사용)
    const updatePayload = {
      rowIndex,
      key: columnMeta.dataKey,
      value: null,
      cellIndex: columnMeta.cellIndex
    };
    
    const result = this.legacyStore.dispatch('updateCell', updatePayload);
    this.saveCurrentState();
    
    // 검증 처리: 해당 셀에 대해 validation 재실행
    if (this.validationManager) {
      if (this.debug) {
        console.log(`[StoreBridge] validation 재실행 (단일셀): row=${rowIndex}, col=${colIndex}, value=null, type=${type}`);
      }
      // 빈 값이므로 validation 재실행 (오류 제거)
      this.validationManager.validateCell(rowIndex, columnMeta.colIndex, null, type, true);
    }
    
    return result;
  }
  
  /**
   * 고정 열 데이터 지우기
   * @param {Object} payload - 지우기 페이로드
   */
  clearFixedColumnData(payload) {
    if (this.debug) {
      console.log('[StoreBridge] clearFixedColumnData 호출됨:', payload);
    }
    this._captureSnapshot('clearFixedColumnData', payload);
    const result = this.legacyStore.dispatch('clearFixedColumnData', payload);
    this.saveCurrentState();
    
    // 검증 처리: 고정 열의 모든 셀에 대해 validation 재실행
    if (this.validationManager && this.columnMetas) {
      if (this.debug) {
        console.log('[StoreBridge] validationManager와 columnMetas 존재함 (고정열)');
      }
      const { type } = payload;
      const rows = this.legacyStore.state.rows;
      
      // 해당 타입의 고정 열을 찾아서 모든 행의 해당 열 셀들을 다시 검증
      const targetColumns = this.columnMetas.filter(meta => meta.type === type);
      
      if (this.debug) {
        console.log('[StoreBridge] targetColumns (고정열):', targetColumns);
      }
      
      targetColumns.forEach(columnMeta => {
        rows.forEach((row, rowIndex) => {
          const value = this._getCellValue(row, columnMeta);
          if (this.debug) {
            console.log(`[StoreBridge] validation 재실행 (고정열): row=${rowIndex}, col=${columnMeta.colIndex}, value="${value}", type=${columnMeta.type}`);
          }
          // 빈 값이므로 validation 재실행 (오류 제거)
          this.validationManager.validateCell(rowIndex, columnMeta.colIndex, value, columnMeta.type, true);
        });
      });
    } else if (this.debug) {
      console.log('[StoreBridge] validationManager 또는 columnMetas가 없음 (고정열):', {
        hasValidationManager: !!this.validationManager,
        hasColumnMetas: !!this.columnMetas
      });
    }
    
    return result;
  }
  
  /**
   * Enter 키 처리
   * @param {Object} payload - 처리 페이로드
   */
  handleEnter(payload) {
    const result = this.legacyStore.dispatch('handleEnter', payload);
    this.saveCurrentState();
    return result;
  }
  
  /**
   * 특정 위치에 행 삽입
   * @param {Object} payload - 삽입 페이로드
   */
  insertRowAt(payload) {
    const result = this.legacyStore.dispatch('insertRowAt', payload);
    this.saveCurrentState();
    return result;
  }
  
  /**
   * 헤더 데이터 붙여넣기
   * @param {Object} payload - 붙여넣기 페이로드
   */
  pasteHeaderData(payload) {
    const result = this.legacyStore.dispatch('pasteHeaderData', payload);
    this.saveCurrentState();
    return result;
  }
  
  /**
   * 여러 셀 일괄 업데이트
   * @param {Object} payload - 업데이트 페이로드
   */
  updateCellsBatch(payload) {
    if (this.debug) {
      console.log('[StoreBridge] updateCellsBatch 호출됨:', payload);
    }
    this._captureSnapshot('updateCellsBatch', payload);
    const result = this.legacyStore.dispatch('updateCellsBatch', payload);
    this.saveCurrentState();
    
    // 검증 처리: 업데이트된 셀들에 대해 validation 재실행
    if (this.validationManager && this.columnMetas && Array.isArray(payload)) {
      if (this.debug) {
        console.log('[StoreBridge] validationManager와 columnMetas 존재함 (updateCellsBatch)');
      }
      
      payload.forEach(update => {
        const { rowIndex, key, value, cellIndex } = update;
        
        // 해당하는 컬럼 메타데이터 찾기
        const targetColumns = this.columnMetas.filter(meta => 
          meta.dataKey === key && meta.cellIndex === cellIndex
        );
        
        if (this.debug) {
          console.log('[StoreBridge] targetColumns (updateCellsBatch):', targetColumns);
        }
        
        targetColumns.forEach(columnMeta => {
          if (this.debug) {
            console.log(`[StoreBridge] validation 재실행 (updateCellsBatch): row=${rowIndex}, col=${columnMeta.colIndex}, value="${value}", type=${columnMeta.type}`);
          }
          // 빈 값이므로 validation 재실행 (오류 제거)
          this.validationManager.validateCell(rowIndex, columnMeta.colIndex, value, columnMeta.type, true);
        });
      });
    } else if (this.debug) {
      console.log('[StoreBridge] validationManager 또는 columnMetas가 없음 (updateCellsBatch):', {
        hasValidationManager: !!this.validationManager,
        hasColumnMetas: !!this.columnMetas,
        isArray: Array.isArray(payload)
      });
    }
    
    return result;
  }
  
  /**
   * 증상 간격 업데이트
   * @param {number} value - 간격 값
   */
  updateSymptomInterval(value) {
    const result = this.legacyStore.dispatch('updateSymptomInterval', value);
    this.saveCurrentState();
    return result;
  }
  
  /**
   * 노출 날짜시간 업데이트
   * @param {string} value - 날짜시간 값
   */
  updateExposureDateTime(value) {
    const result = this.legacyStore.dispatch('updateExposureDateTime', value);
    this.saveCurrentState();
    return result;
  }
  
  /**
   * 잠복기 간격 업데이트
   * @param {number} value - 간격 값
   */
  updateIncubationInterval(value) {
    const result = this.legacyStore.dispatch('updateIncubationInterval', value);
    this.saveCurrentState();
    return result;
  }
  
  /**
   * 개별 노출시간 열 토글
   */
  toggleIndividualExposureColumn() {
    const result = this.legacyStore.dispatch('toggleIndividualExposureColumn');
    this.saveCurrentState();
    return result;
  }
  
  /**
   * 확진자 여부 열 토글
   */
  toggleConfirmedCaseColumn() {
    const result = this.legacyStore.dispatch('toggleConfirmedCaseColumn');
    this.saveCurrentState();
    return result;
  }
  
  /**
   * 확진자 여부 값 업데이트
   * @param {Object} payload - { rowIndex, value }
   */
  updateConfirmedCase(payload) {
    const result = this.legacyStore.dispatch('updateConfirmedCase', payload);
    this.saveCurrentState();
    return result;
  }
  
  /**
   * 여러 헤더 일괄 업데이트
   * @param {Object} payload - 업데이트 페이로드
   */
  updateHeadersBatch(payload) {
    const result = this.legacyStore.dispatch('updateHeadersBatch', payload);
    this.saveCurrentState();
    return result;
  }
  
  /**
   * 행 데이터 지우기 (validation 처리 포함)
   */
  clearRowData(payload) {
    if (this.debug) {
      console.log('StoreBridge.clearRowData:', payload);
    }
    
    // 기존 로직 실행
    this.legacyStore.dispatch('clearRowData', payload);
    this.saveCurrentState();
    
    // Validation 처리 - 해당 행의 모든 셀 오류 제거
    if (this.validationManager) {
      let rowIndex = payload;
      
      // payload가 객체인 경우 rowIndex 필드에서 추출
      if (typeof payload === 'object' && payload.rowIndex !== undefined) {
        rowIndex = payload.rowIndex;
      }
      
      if (typeof rowIndex === 'number') {
        const columnMetas = this.getColumnMetas();
        const cellsToClear = columnMetas
          .filter(col => col.isEditable)
          .map(col => ({ row: rowIndex, col: col.colIndex }));
        
        if (cellsToClear.length > 0) {
          this.validationManager.clearErrorsForCells(cellsToClear);
        }
      }
    }
  }
  
  /**
   * 여러 행 데이터 지우기 (validation 처리 포함)
   */
  clearMultipleRowsData(payload) {
    if (this.debug) {
      console.log('StoreBridge.clearMultipleRowsData:', payload);
    }
    
    // 기존 로직 실행
    this.legacyStore.dispatch('clearMultipleRowsData', payload);
    this.saveCurrentState();
    
    // Validation 처리 - 해당 행들의 모든 셀 오류 제거
    if (this.validationManager) {
      let rowIndices = [];
      
      if (Array.isArray(payload)) {
        // 배열 형태: [rowIndex1, rowIndex2, ...]
        rowIndices = payload;
      } else if (payload.startRow !== undefined && payload.endRow !== undefined) {
        // 객체 형태: { startRow, endRow }
        for (let i = payload.startRow; i <= payload.endRow; i++) {
          rowIndices.push(i);
        }
      }
      
      if (rowIndices.length > 0) {
        const columnMetas = this.getColumnMetas();
        const cellsToClear = [];
        
        rowIndices.forEach(rowIndex => {
          columnMetas
            .filter(col => col.isEditable)
            .forEach(col => {
              cellsToClear.push({ row: rowIndex, col: col.colIndex });
            });
        });
        
        if (cellsToClear.length > 0) {
          this.validationManager.clearErrorsForCells(cellsToClear);
        }
      }
    }
  }
  
  /**
   * 개별 행 데이터 지우기 (validation 처리 포함)
   */
  clearIndividualRowsData(payload) {
    if (this.debug) {
      console.log('StoreBridge.clearIndividualRowsData:', payload);
    }
    
    // 기존 로직 실행
    this.legacyStore.dispatch('clearIndividualRowsData', payload);
    this.saveCurrentState();
    
    // Validation 처리 - 해당 행들의 모든 셀 오류 제거
    if (this.validationManager) {
      let rowIndices = [];
      
      if (Array.isArray(payload)) {
        // 배열 형태: [rowIndex1, rowIndex2, ...]
        rowIndices = payload;
      } else if (payload.rowIndices && Array.isArray(payload.rowIndices)) {
        // 객체 형태: { rowIndices: [rowIndex1, rowIndex2, ...] }
        rowIndices = payload.rowIndices;
      }
      
      if (rowIndices.length > 0) {
        const columnMetas = this.getColumnMetas();
        const cellsToClear = [];
        
        rowIndices.forEach(rowIndex => {
          columnMetas
            .filter(col => col.isEditable)
            .forEach(col => {
              cellsToClear.push({ row: rowIndex, col: col.colIndex });
            });
        });
        
        if (cellsToClear.length > 0) {
          this.validationManager.clearErrorsForCells(cellsToClear);
        }
      }
    }
  }
  
  /**
   * 초기 데이터 로드
   */
  loadInitialData() {
    try {
      if (this.debug) {
        console.log('[StoreBridge] 초기 데이터 로드를 시작합니다...');
      }
      
      // EnhancedStorageManager를 통해 데이터 로드 (마이그레이션 포함)
      const loadedData = this.enhancedManager.loadData();
      
      if (loadedData) {
        // 로드된 데이터를 legacyStore에 설정
        this.legacyStore.commit('SET_INITIAL_DATA', {
          headers: loadedData.headers,
          rows: loadedData.rows
        });
        
        if (loadedData.settings?.isIndividualExposureColumnVisible !== undefined) {
          this.legacyStore.commit('SET_INDIVIDUAL_EXPOSURE_COLUMN_VISIBILITY', 
            loadedData.settings.isIndividualExposureColumnVisible);
        }
        
        if (loadedData.settings?.isConfirmedCaseColumnVisible !== undefined) {
          this.legacyStore.commit('SET_CONFIRMED_CASE_COLUMN_VISIBILITY', 
            loadedData.settings.isConfirmedCaseColumnVisible);
        }
        
        // validation 상태 복원
        if (loadedData.validationState) {
          if (this.debug) {
            console.log('[StoreBridge] validation 상태 복원:', loadedData.validationState);
          }
          const { errors, version } = loadedData.validationState;
          
          // validation 오류들을 Map으로 변환하여 복원
          const errorMap = new Map();
          if (errors && typeof errors === 'object') {
            Object.entries(errors).forEach(([key, errorData]) => {
              // errorData가 객체인지 확인하고 안전하게 복원
              if (typeof errorData === 'object' && errorData !== null) {
                errorMap.set(key, {
                  message: errorData.message || '유효성 검사 오류',
                  timestamp: errorData.timestamp || Date.now()
                });
              } else if (typeof errorData === 'string') {
                errorMap.set(key, {
                  message: errorData,
                  timestamp: Date.now()
                });
              } else {
                errorMap.set(key, {
                  message: '유효성 검사 오류',
                  timestamp: Date.now()
                });
              }
            });
          }
          
          console.log('[StoreBridge] 복원된 유효성 검사 오류:', errorMap);
          this.legacyStore.commit('SET_VALIDATION_ERRORS', errorMap);
          this.legacyStore.commit('SET_VALIDATION_VERSION', version);
          
          // 새로고침 후 오류 재매핑 (열 구조 변경에 대응)
          if (this.validationManager && errorMap.size > 0) {
            console.log('[StoreBridge] 새로고침 후 유효성 오류 재매핑 시작');
            
            // 현재 열 메타데이터 가져오기
            const columnMetas = this.getColumnMetas();
            if (columnMetas && columnMetas.length > 0) {
              // ValidationManager의 columnMetas 업데이트
              this.validationManager.updateColumnMetas(columnMetas);
              
              // 기존 오류들을 현재 열 구조에 맞게 재매핑
              const currentErrors = this.legacyStore.state.validationState.errors;
              if (currentErrors && currentErrors.size > 0) {
                console.log('[StoreBridge] 기존 오류 개수:', currentErrors.size);
                
                // 각 오류 키를 현재 열 구조에 맞게 재계산
                const remappedErrors = new Map();
                
                for (const [oldKey, error] of currentErrors) {
                  // 오류 키 파싱
                  const parsed = this.validationManager.parseErrorKey(oldKey);
                  if (parsed) {
                    const { rowIndex, uniqueKey } = parsed;
                    
                    // 고유 키에서 열 정보 추출
                    const uniqueKeyParts = uniqueKey.split('__');
                    if (uniqueKeyParts.length >= 3) {
                      const columnType = uniqueKeyParts[1];
                      const cellIndex = parseInt(uniqueKeyParts[2]);
                      
                      // 현재 열 구조에서 해당 타입과 cellIndex의 열 찾기
                      const matchingColumn = columnMetas.find(col => 
                        col.type === columnType && col.cellIndex === cellIndex
                      );
                      
                      if (matchingColumn) {
                        // 새로운 고유 키 생성
                        const newUniqueKey = this.validationManager.getColumnUniqueKey(matchingColumn);
                        const newErrorKey = this.validationManager.getErrorKey(rowIndex, newUniqueKey);
                        
                        remappedErrors.set(newErrorKey, error);
                        console.log(`[StoreBridge] 오류 키 재매핑: ${oldKey} -> ${newErrorKey}`);
                      } else {
                        // 매칭되는 열이 없으면 기존 키 유지
                        remappedErrors.set(oldKey, error);
                        console.log(`[StoreBridge] 매칭되는 열 없음, 기존 키 유지: ${oldKey}`);
                      }
                    } else {
                      // 고유 키 형식이 잘못된 경우 기존 키 유지
                      remappedErrors.set(oldKey, error);
                      console.log(`[StoreBridge] 잘못된 고유 키 형식, 기존 키 유지: ${oldKey}`);
                    }
                  } else {
                    // 파싱 실패 시 기존 키 유지
                    remappedErrors.set(oldKey, error);
                    console.log(`[StoreBridge] 오류 키 파싱 실패, 기존 키 유지: ${oldKey}`);
                  }
                }
                
                // 재매핑된 오류들로 업데이트
                this.legacyStore.commit('SET_VALIDATION_ERRORS', remappedErrors);
                console.log('[StoreBridge] 새로고침 후 유효성 오류 재매핑 완료:', remappedErrors.size, '개');
              }
            } else {
              console.log('[StoreBridge] 열 메타데이터가 없어 재매핑 건너뜀');
            }
          }
        }
        
        if (this.debug) {
          console.log('[StoreBridge] 초기 데이터 로드 완료');
        }
        return loadedData;
      } else {
        // 데이터가 없으면 기본 상태로 설정
        if (this.debug) {
          console.log('[StoreBridge] 저장된 데이터가 없어 기본 상태로 설정합니다.');
        }
        return this.legacyStore.dispatch('loadInitialData');
      }
      
    } catch (error) {
      console.error('[StoreBridge] 초기 데이터 로드 중 오류 발생:', error);
      // 오류 발생 시 기본 상태로 설정
      return this.legacyStore.dispatch('loadInitialData');
    }
  }
  
  // ===== 기존 store.js getters 래핑 =====
  
  /**
   * 헤더 정보 반환
   */
  get headers() {
    return this.legacyStore.getters.headers;
  }
  
  /**
   * 행 데이터 반환
   */
  get rows() {
    return this.legacyStore.getters.rows;
  }
  
  /**
   * 기본정보 시작 인덱스
   */
  get basicInfoStartIndex() {
    return this.legacyStore.getters.basicInfoStartIndex;
  }
  
  /**
   * 임상증상 시작 인덱스
   */
  get clinicalSymptomsStartIndex() {
    return this.legacyStore.getters.clinicalSymptomsStartIndex;
  }
  
  /**
   * 개별 노출시간 시작 인덱스
   */
  get individualExposureTimeStartIndex() {
    return this.legacyStore.getters.individualExposureTimeStartIndex;
  }
  
  /**
   * 증상발현 시작 인덱스
   */
  get symptomOnsetStartIndex() {
    return this.legacyStore.getters.symptomOnsetStartIndex;
  }
  
  /**
   * 식단정보 시작 인덱스
   */
  get dietInfoStartIndex() {
    return this.legacyStore.getters.dietInfoStartIndex;
  }
  
  /**
   * 실행 취소 가능 여부
   */
  get canUndo() {
    return this._canUndo.value;
  }
  
  /**
   * 재실행 가능 여부
   */
  get canRedo() {
    return this._canRedo.value;
  }
  
  // ===== 기존 store.js state 래핑 =====
  
  /**
   * 상태 정보 반환
   */
  get state() {
    return this.legacyStore.state;
  }
  
  // ===== 편집 상태 관련 메서드 =====
  
  /**
   * 편집 중인지 여부 반환
   * @returns {boolean} 편집 중 여부
   */
  isEditing() {
    return this.enhancedManager.isEditing();
  }
  
  /**
   * 원래 값 반환
   * @returns {*} 원래 값
   */
  getOriginalValue() {
    return this.enhancedManager.getOriginalValue();
  }
  
  /**
   * 임시 값 반환
   * @returns {*} 임시 값
   */
  getTempValue() {
    return this.enhancedManager.getTempValue();
  }
  
  /**
   * 현재 편집 정보 반환
   * @returns {Object|null} 현재 편집 정보
   */
  getCurrentEditInfo() {
    return this.enhancedManager.getCurrentEditInfo();
  }
  
  // ===== 유틸리티 메서드 =====
  
  /**
   * 대기 중인 저장 작업 처리
   */
  processPendingSaves() {
    this.enhancedManager.processPendingSaves();
  }
  
  /**
   * 대기 중인 저장 작업 취소
   */
  cancelPendingSaves() {
    this.enhancedManager.cancelPendingSaves();
  }
  
  /**
   * 저장 지연 시간 설정
   * @param {number} delay - 지연 시간 (밀리초)
   */
  setSaveDelay(delay) {
    this.enhancedManager.setSaveDelay(delay);
  }
  
  /**
   * 브리지 상태 검증
   * @returns {boolean} 유효한 상태 여부
   */
  validate() {
    if (!this.isInitialized) {
      console.error('[StoreBridge] 브리지가 초기화되지 않았습니다.');
      return false;
    }
    
    if (!this.legacyStore) {
      console.error('[StoreBridge] 기존 store.js 인스턴스가 없습니다.');
      return false;
    }
    
    return this.enhancedManager.validate();
  }
  
  /**
   * 디버깅을 위한 상태 정보 반환
   * @returns {Object} 상태 정보
   */
  getDebugInfo() {
    return {
      isInitialized: this.isInitialized,
      legacyStore: !!this.legacyStore,
      enhancedManager: this.enhancedManager.getDebugInfo()
    };
  }
  
  /**
   * 브리지 초기화
   */
  reset() {
    this.enhancedManager.reset();
    console.log('[StoreBridge] 브리지가 초기화되었습니다.');
  }
  
  /**
   * 데이터를 로드하고 필요한 경우 마이그레이션을 실행합니다.
   * @returns {Object|null} 로드된 데이터 또는 null
   */
  loadData() {
    return this.enhancedManager.loadData();
  }
  
  /**
   * 현재 상태를 새로운 형식으로 저장합니다.
   * @returns {boolean} 저장 성공 여부
   */
  saveCurrentState() {
    return this.enhancedManager.saveCurrentState();
  }
  
  /**
   * 특정 셀 값을 저장하고 스냅샷을 남깁니다. (바디 셀)
   * @param {number} rowIndex
   * @param {number} colIndex
   * @param {*} value
   * @param {Object} columnMeta
   */
  saveCellValue(rowIndex, colIndex, value, columnMeta) {
    if (!this.legacyStore) {
      console.error('[StoreBridge] legacyStore가 없습니다.');
      return;
    }

    // 헤더 행(-1)인 경우 헤더 저장 로직으로 위임
    if (rowIndex < 0) {
      this.saveHeaderValue(colIndex, value, columnMeta);
      return;
    }

    const payload = {
      rowIndex,
      key: columnMeta.dataKey,
      value,
      cellIndex: columnMeta.cellIndex
    };

    // 변경 전 값 확인 → 동일하면 조용히 리턴
    const beforeValue = (() => {
      const row = this.legacyStore.state.rows[rowIndex];
      if (!row) return undefined;
      if (payload.cellIndex !== null && payload.cellIndex !== undefined) {
        return row[payload.key]?.[payload.cellIndex];
      }
      return row[payload.key];
    })();

    if (beforeValue === value) return;

    // 스냅샷
    this._captureSnapshot('cell_edit', {
      rowIndex,
      colIndex,
      before: beforeValue,
      after: value
    });

    // 실제 Vuex 업데이트
    this.legacyStore.dispatch('updateCell', payload);

    // persistence
    this.saveCurrentState();

    // Validation: validationManager 주입 시 호출
    if (this.validationManager) {
      this.validationManager.validateCell(rowIndex, columnMeta.colIndex, value, columnMeta.type);
    }
    return true;
  }

  /**
   * 헤더 셀 값을 저장하고 스냅샷을 남깁니다.
   * @param {number} colIndex
   * @param {*} value
   * @param {Object} columnMeta
   */
  saveHeaderValue(colIndex, value, columnMeta) {
    if (this.debug) {
      console.log('[StoreBridge] saveHeaderValue 호출됨:', { colIndex, value, columnMeta });
    }

    const typeMap = {
      basic: 'basic',
      clinical: 'clinical',
      clinicalSymptoms: 'clinical',
      diet: 'diet',
      dietInfo: 'diet'
    };
    const headerType = typeMap[columnMeta.type];
    const headerIndex = columnMeta.cellIndex;

    if (!headerType || headerIndex === undefined) {
      console.error('[StoreBridge] 잘못된 헤더 메타:', columnMeta);
      return;
    }

    const beforeValue = this.legacyStore.state.headers[headerType]?.[headerIndex];
    if (beforeValue === value) return;

    this._captureSnapshot('header_edit', {
      headerType,
      headerIndex,
      before: beforeValue,
      after: value
    });

    const payload = { headerType, index: headerIndex, text: value };
    this.legacyStore.dispatch('updateHeader', payload);

    this.saveCurrentState();
  }
  
  // ===== 내부 상수 =====
  static MUTATIVE_ACTIONS = [
    // 행·열 삽입/추가/삭제 계열
    'insertRowAt',
    'addRows',
    'addRowsFromExcel',
    'deleteRow',
    'deleteMultipleRows',
    'deleteIndividualRows',
    'insertColumnAt',
    'insertMultipleColumnsAt',
    'addColumn',
    'addMultipleColumns',
    'deleteColumn',
    'deleteColumnByIndex',
    'deleteMultipleColumnsByIndex',
    'deleteEmptyRows',
    'deleteEmptyColumns',
    // 데이터 지우기 / 붙여넣기 / Excel
    'clearRowData',
    'clearMultipleRowsData',
    'clearIndividualRowsData',
    'clearColumnData',
    'clearCellData',
    'clearMultipleColumnsData',
    'clearFixedColumnData',
    'pasteData',
    'pasteHeaderData',
    'updateHeadersFromExcel',
    // 전체 초기화
    'resetSheet'
  ];
  
  async dispatch(actionName, payload) {
    if (!this.legacyStore) {
      console.error('[StoreBridge] legacyStore가 없습니다.');
      return;
    }

    const isMutative = StoreBridge.MUTATIVE_ACTIONS.includes(actionName);

    if (this.debug) {
      console.log(`[StoreBridge] dispatch 호출: ${actionName}`, payload);
    }
    
    // 특정 action들은 StoreBridge에서 직접 처리
    if (actionName === 'clearFixedColumnData') {
      return this.clearFixedColumnData(payload);
    } else if (actionName === 'clearColumnData') {
      return this.clearColumnData(payload);
    } else if (actionName === 'clearCellData') {
      return this.clearCellData(payload);
    } else if (actionName === 'clearMultipleColumnsData') {
      return this.clearMultipleColumnsData(payload);
    } else if (actionName === 'updateCellsBatch') {
      return this.updateCellsBatch(payload);
    } else if (actionName === 'insertMultipleColumnsAt') {
      return this.insertMultipleColumnsAt(payload);
    } else if (actionName === 'insertColumnAt') {
      return this.insertColumnAt(payload);
    } else if (actionName === 'deleteColumnByIndex') {
      return this.deleteColumnByIndex(payload);
    } else if (actionName === 'deleteMultipleColumnsByIndex') {
      return this.deleteMultipleColumnsByIndex(payload);
    } else if (actionName === 'clearRowData') {
      return this.clearRowData(payload);
    } else if (actionName === 'clearMultipleRowsData') {
      return this.clearMultipleRowsData(payload);
    } else if (actionName === 'clearIndividualRowsData') {
      return this.clearIndividualRowsData(payload);
    } else if (actionName === 'deleteRow') {
      return this.deleteRow(payload);
    } else if (actionName === 'deleteMultipleRows') {
      return this.deleteMultipleRows(payload);
    } else if (actionName === 'deleteIndividualRows') {
      return this.deleteIndividualRows(payload);
    }
    
    // 변경 전 스냅샷 캡처 (변경 전 상태 보존)
    if (isMutative) {
      this._captureSnapshot(actionName, payload);
    }
    
    // 비동기 작업 완료 대기
    const result = await this.legacyStore.dispatch(actionName, payload);

    // 작업 완료 후 상태 저장 (변경 후 상태)
    if (isMutative) {
      this.saveCurrentState();
    }

    return result;
  }
  
  /**
   * 컬럼 메타데이터 가져오기 헬퍼
   * @returns {Array<object>} 컬럼 메타데이터 배열
   */
  getColumnMetas() {
    if (!this.legacyStore) return [];
    
    const columnMetas = [];
    let colIndex = 0;
    
    // 연번 컬럼 (colIndex 0)
    columnMetas.push({
      colIndex: colIndex++,
      dataKey: null,
      cellIndex: null,
      type: 'serial',
      isEditable: false
    });
    
    // 환자여부 컬럼 (colIndex 1)
    columnMetas.push({
      colIndex: colIndex++,
      dataKey: 'isPatient',
      cellIndex: null,
      type: 'isPatient',
      isEditable: true
    });
    
    // 확진여부 컬럼 (colIndex 2)
    columnMetas.push({
      colIndex: colIndex++,
      dataKey: 'isConfirmedCase',
      cellIndex: null,
      type: 'isConfirmedCase',
      isEditable: true
    });
    
    // 기본정보 컬럼들
    this.legacyStore.state.headers.basic?.forEach((header, index) => {
      columnMetas.push({
        colIndex: colIndex++,
        dataKey: 'basicInfo',
        cellIndex: index,
        type: 'basic',
        isEditable: true
      });
    });
    
    // 임상증상 컬럼들
    this.legacyStore.state.headers.clinical?.forEach((header, index) => {
      columnMetas.push({
        colIndex: colIndex++,
        dataKey: 'clinicalSymptoms',
        cellIndex: index,
        type: 'clinicalSymptoms',
        isEditable: true
      });
    });
    
    // 개별 노출시간 컬럼 (가시성이 활성화된 경우)
    if (this.legacyStore.state.isIndividualExposureColumnVisible) {
      columnMetas.push({
        colIndex: colIndex++,
        dataKey: 'individualExposureTime',
        cellIndex: null,
        type: 'individualExposureTime',
        isEditable: true
      });
    }
    
    // 증상발현 컬럼
    columnMetas.push({
      colIndex: colIndex++,
      dataKey: 'symptomOnset',
      cellIndex: null,
      type: 'symptomOnset',
      isEditable: true
    });
    
    // 식단정보 컬럼들
    this.legacyStore.state.headers.diet?.forEach((header, index) => {
      columnMetas.push({
        colIndex: colIndex++,
        dataKey: 'dietInfo',
        cellIndex: index,
        type: 'dietInfo',
        isEditable: true
      });
    });
    
    return columnMetas;
  }

  /**
   * 현재 Vuex state를 깊은 복사해 HistoryManager 에 저장합니다.
   * 반드시 "변경 전" 시점에 호출해야 합니다.
   * @param {string} action 액션 이름
   * @param {object} [meta] 추가 메타
   */
  _captureSnapshot(action = 'unknown', meta = {}) {
    if (!this.legacyStore) return;
    
    // validationErrors를 올바른 형식으로 변환
    const validationErrors = {};
    const currentErrors = this.legacyStore.state.validationState?.errors;
    if (currentErrors && currentErrors instanceof Map) {
      for (const [key, error] of currentErrors) {
        validationErrors[key] = {
          message: error.message || error,
          timestamp: error.timestamp || Date.now()
        };
      }
    }
    
    // 필터 상태 포함 (핵심 수정)
    const filterState = {
      activeFilters: Array.from(this.filterState.activeFilters.entries()),
      isFiltered: this.filterState.isFiltered,
      filteredRowCount: this.filterState.filteredRowCount,
      originalRowCount: this.filterState.originalRowCount,
      lastAppliedAt: this.filterState.lastAppliedAt
    };
    
    const cloned = JSON.parse(JSON.stringify({
      headers: this.legacyStore.state.headers,
      rows: this.legacyStore.state.rows,
      settings: {
        isIndividualExposureColumnVisible: this.legacyStore.state.isIndividualExposureColumnVisible,
        isConfirmedCaseColumnVisible: this.legacyStore.state.isConfirmedCaseColumnVisible
      },
      validationErrors,
      validationSchemaVersion: this.legacyStore.state.validationState?.version ?? 0,
      filterState  // 필터 상태 추가
    }));
    
    this.history.saveSnapshot(cloned, action, meta);
    
    // 스냅샷 저장 후 상태 업데이트
    this._updateUndoRedoState();
    
    if (this.debug) {
      console.log(`[StoreBridge] 스냅샷 캡처 완료: ${action}`, {
        hasFilterState: !!cloned.filterState,
        filterIsFiltered: cloned.filterState?.isFiltered,
        filterCount: cloned.filterState?.activeFilters?.length || 0
      });
    }
  }
  
  /**
   * 셀 값 추출 헬퍼
   * @param {Object} row - 행 데이터
   * @param {Object} columnMeta - 컬럼 메타데이터
   * @returns {*} 셀 값
   */
  _getCellValue(row, columnMeta) {
    if (!row || !columnMeta.dataKey) return '';
    
    if (columnMeta.cellIndex !== null && columnMeta.cellIndex !== undefined) {
      const arr = row[columnMeta.dataKey];
      return Array.isArray(arr) ? arr[columnMeta.cellIndex] || '' : '';
    } else {
      return row[columnMeta.dataKey] || '';
    }
  }

  /**
   * colIndex로 셀 값 추출 헬퍼 (Undo/Redo용)
   * @param {Object} row - 행 데이터
   * @param {number} colIndex - 컬럼 인덱스
   * @param {Array} [columnMetas] - 컬럼 메타데이터 (캐싱용)
   * @returns {*} 셀 값
   */
  _getCellValueByIndex(row, colIndex, columnMetas = null) {
    if (!row || colIndex === undefined) return '';
    
    const metas = columnMetas || this.getColumnMetas();
    const columnMeta = metas.find(meta => meta.colIndex === colIndex);
    
    if (!columnMeta) return '';
    
    return this._getCellValue(row, columnMeta);
  }

  /**
   * 행이 비어있는지 확인
   */
  _isEmptyRow(row) {
    if (!row) return true;
    
    // 주요 필드들이 모두 비어있는지 확인
    const fields = ['isPatient', 'symptomOnset', 'individualExposureTime'];
    const arrayFields = ['basicInfo', 'clinicalSymptoms', 'dietInfo'];
    
    // 단일 필드 확인
    for (const field of fields) {
      if (row[field] && row[field].toString().trim() !== '') {
        return false;
      }
    }
    
    // 배열 필드 확인
    for (const field of arrayFields) {
      if (row[field] && Array.isArray(row[field])) {
        for (const value of row[field]) {
          if (value && value.toString().trim() !== '') {
            return false;
          }
        }
      }
    }
    
    return true;
  }

  /**
   * 열이 비어있는지 확인
   */
  _isEmptyColumn(columnMeta) {
    if (!columnMeta || !this.legacyStore) return true;
    
    const rows = this.legacyStore.state.rows;
    if (!rows || rows.length === 0) return true;
    
    // 해당 열의 모든 셀이 비어있는지 확인
    for (const row of rows) {
      const value = this._getCellValue(row, columnMeta);
      if (value && value.toString().trim() !== '') {
        return false;
      }
    }
    
    return true;
  }

  // ===== 내부 메서드들 =====

  /**
   * 초기 undo/redo 상태 업데이트
   */
  _updateUndoRedoState() {
    this._canUndo.value = this.history.canUndo();
    this._canRedo.value = this.history.canRedo();
  }

  // ===== 필터 관련 메서드들 (환자여부 컬럼만) =====

  /**
   * 환자여부 필터 토글 (1 또는 0)
   * @param {string} value - '1' 또는 '0'
   */
  togglePatientFilter(value) {

    
    const colIndex = 1; // 환자여부 컬럼 인덱스
    const currentFilter = this.filterState.activeFilters.get(colIndex);
    
    console.log('[Filter] 현재 필터 상태:', { currentFilter });
    
    let newValues;
    
    if (!currentFilter) {
      // 필터가 없으면 클릭한 값만 선택 (포함 방식)
      console.log('[Filter] 필터 없음 - 단일 값 선택');
      newValues = [value];
    } else {
      // 현재 필터에서 해당 값 토글
      newValues = [...currentFilter.values];
      const valueIndex = newValues.indexOf(value);
      
      console.log('[Filter] 값 토글:', { value, valueIndex, newValues });
      
      if (valueIndex > -1) {
        // 값이 있으면 제거
        newValues.splice(valueIndex, 1);
        console.log('[Filter] 값 제거됨:', newValues);
      } else {
        // 값이 없으면 추가
        newValues.push(value);
        console.log('[Filter] 값 추가됨:', newValues);
      }
    }
    
    // 모든 값이 해제되면 필터 제거 (모든 행 표시)
    if (newValues.length === 0) {
      console.log('[Filter] 모든 값 제거됨 - 필터 제거');
      this.removeFilter(colIndex);
      return;
    }
    
    console.log('[Filter] 최종 필터 적용:', { colIndex, newValues });
    this.applyFilter(colIndex, {
      type: 'binary',
      values: newValues,
      columnType: 'isPatient'
    });
  }

  /**
   * 임상증상 필터 토글 (1 또는 0)
   * @param {number} colIndex - 컬럼 인덱스
   * @param {string} value - '1' 또는 '0' 또는 'empty'
   */
  toggleClinicalFilter(colIndex, value) {
    console.log('[Filter] toggleClinicalFilter 호출:', { colIndex, value });
    
    const currentFilter = this.filterState.activeFilters.get(colIndex);
    
    console.log('[Filter] 현재 필터 상태:', { currentFilter });
    
    let newValues;
    
    if (!currentFilter) {
      // 필터가 없으면 클릭한 값만 선택 (포함 방식)
      console.log('[Filter] 필터 없음 - 단일 값 선택');
      newValues = [value];
    } else {
      // 현재 필터에서 해당 값 토글
      newValues = [...currentFilter.values];
      const valueIndex = newValues.indexOf(value);
      
      console.log('[Filter] 값 토글:', { value, valueIndex, newValues });
      
      if (valueIndex > -1) {
        // 값이 있으면 제거
        newValues.splice(valueIndex, 1);
        console.log('[Filter] 값 제거됨:', newValues);
      } else {
        // 값이 없으면 추가
        newValues.push(value);
        console.log('[Filter] 값 추가됨:', newValues);
      }
    }
    
    // 모든 값이 해제되면 필터 제거 (모든 행 표시)
    if (newValues.length === 0) {
      console.log('[Filter] 모든 값 제거됨 - 필터 제거');
      this.removeFilter(colIndex);
      return;
    }
    
    console.log('[Filter] 최종 필터 적용:', { colIndex, newValues });
    this.applyFilter(colIndex, {
      type: 'binary',
      values: newValues,
      columnType: 'clinicalSymptoms'
    });
  }

  /**
   * 식단 필터 토글 (1 또는 0)
   * @param {number} colIndex - 컬럼 인덱스
   * @param {string} value - '1' 또는 '0' 또는 'empty'
   */
  toggleDietFilter(colIndex, value) {
    console.log('[Filter] toggleDietFilter 호출:', { colIndex, value });
    
    const currentFilter = this.filterState.activeFilters.get(colIndex);
    
    console.log('[Filter] 현재 필터 상태:', { currentFilter });
    
    let newValues;
    
    if (!currentFilter) {
      // 필터가 없으면 클릭한 값만 선택 (포함 방식)
      console.log('[Filter] 필터 없음 - 단일 값 선택');
      newValues = [value];
    } else {
      // 현재 필터에서 해당 값 토글
      newValues = [...currentFilter.values];
      const valueIndex = newValues.indexOf(value);
      
      console.log('[Filter] 값 토글:', { value, valueIndex, newValues });
      
      if (valueIndex > -1) {
        // 값이 있으면 제거
        newValues.splice(valueIndex, 1);
        console.log('[Filter] 값 제거됨:', newValues);
      } else {
        // 값이 없으면 추가
        newValues.push(value);
        console.log('[Filter] 값 추가됨:', newValues);
      }
    }
    
    // 모든 값이 해제되면 필터 제거 (모든 행 표시)
    if (newValues.length === 0) {
      console.log('[Filter] 모든 값 제거됨 - 필터 제거');
      this.removeFilter(colIndex);
      return;
    }
    
    console.log('[Filter] 최종 필터 적용:', { colIndex, newValues });
    this.applyFilter(colIndex, {
      type: 'binary',
      values: newValues,
      columnType: 'dietInfo'
    });
  }

  /**
   * 기본정보 필터 토글 (텍스트 검색)
   * @param {number} colIndex - 컬럼 인덱스
   * @param {string} value - 검색할 텍스트 또는 'empty'
   */
  toggleBasicFilter(colIndex, value) {
    console.log('[Filter] toggleBasicFilter 호출:', { colIndex, value });
    
    const currentFilter = this.filterState.activeFilters.get(colIndex);
    
    console.log('[Filter] 현재 필터 상태:', { 
      currentFilter,
      activeFiltersSize: this.filterState.activeFilters.size,
      allActiveFilters: Array.from(this.filterState.activeFilters.entries())
    });
    
    let newValues;
    
    if (!currentFilter) {
      // 필터가 없으면 새로 생성
      console.log('[Filter] 필터 없음 - 새로 생성');
      newValues = [value];
    } else {
      // 현재 필터에서 해당 값 토글
      newValues = [...currentFilter.values];
      const valueIndex = newValues.indexOf(value);
      
      console.log('[Filter] 값 토글:', { value, valueIndex, newValues });
      
      if (valueIndex > -1) {
        // 값이 있으면 제거
        newValues.splice(valueIndex, 1);
        console.log('[Filter] 값 제거됨:', newValues);
      } else {
        // 값이 없으면 추가
        newValues.push(value);
        console.log('[Filter] 값 추가됨:', newValues);
      }
    }
    
    // 빈 값 필터는 항상 유지 가능
    if (newValues.length === 0) {
      // 모두 해제하려고 하면 필터 제거
      console.log('[Filter] 모든 값 제거됨 - 필터 제거');
      this.removeFilter(colIndex);
      return;
    }
    
    console.log('[Filter] 최종 필터 적용:', { colIndex, newValues });
    this.applyFilter(colIndex, {
      type: 'text',
      values: newValues,
      columnType: 'basicInfo'
    });
  }

  toggleConfirmedFilter(colIndex, value) {
    console.log('[Filter] toggleConfirmedFilter 호출:', { colIndex, value });
    
    const currentFilter = this.filterState.activeFilters.get(colIndex);
    
    console.log('[Filter] 현재 필터 상태:', { 
      currentFilter,
      activeFiltersSize: this.filterState.activeFilters.size,
      allActiveFilters: Array.from(this.filterState.activeFilters.entries())
    });
    
    let newValues;
    
    if (!currentFilter) {
      // 필터가 없으면 새로 생성
      console.log('[Filter] 필터 없음 - 새로 생성');
      newValues = [value];
    } else {
      // 현재 필터에서 해당 값 토글
      newValues = [...currentFilter.values];
      const valueIndex = newValues.indexOf(value);
      
      console.log('[Filter] 값 토글:', { value, valueIndex, newValues });
      
      if (valueIndex > -1) {
        // 값이 있으면 제거
        newValues.splice(valueIndex, 1);
        console.log('[Filter] 값 제거됨:', newValues);
      } else {
        // 값이 없으면 추가
        newValues.push(value);
        console.log('[Filter] 값 추가됨:', newValues);
      }
    }
    
    // 빈 값 필터는 항상 유지 가능
    if (newValues.length === 0) {
      // 모두 해제하려고 하면 필터 제거
      console.log('[Filter] 모든 값 제거됨 - 필터 제거');
      this.removeFilter(colIndex);
      return;
    }
    
    console.log('[Filter] 최종 필터 적용:', { colIndex, newValues });
    this.applyFilter(colIndex, {
      type: 'text',
      values: newValues,
      columnType: 'isConfirmedCase'
    });
  }

  /**
   * 필터 적용
   * @param {number} colIndex - 컬럼 인덱스
   * @param {Object} filterConfig - 필터 설정
   */
  applyFilter(colIndex, filterConfig) {
    // 변경 전 스냅샷 캡처
    this._captureSnapshot('filter_apply', {
      colIndex,
      filterType: filterConfig.type,
      filterValues: filterConfig.values,
      columnType: filterConfig.columnType
    });
    
    this.filterState.activeFilters.set(colIndex, {
      ...filterConfig,
      appliedAt: Date.now()
    });
    
    this._updateFilteredRows();
    this._saveFilterState();
  }

  /**
   * 모든 필터 해제
   */
  clearAllFilters() {
    // 변경 전 스냅샷 캡처
    this._captureSnapshot('filter_clear_all', {
      clearedFilters: Array.from(this.filterState.activeFilters.entries())
    });
    
    this.filterState.activeFilters.clear();
    this.filterState.isFiltered = false;
    this.filterState.filteredRowCount = 0;
    this.filterState.originalRowCount = 0;
    this._filteredRowMapping.clear();
    this._originalToFilteredMapping.clear();
    
    this._saveFilterState();
  }

  /**
   * 개별 필터 제거
   * @param {number} colIndex - 컬럼 인덱스
   */
  removeFilter(colIndex) {
    // 변경 전 스냅샷 캡처
    this._captureSnapshot('filter_remove', {
      colIndex,
      removedFilter: this.filterState.activeFilters.get(colIndex)
    });
    
    this.filterState.activeFilters.delete(colIndex);
    
    if (this.filterState.activeFilters.size === 0) {
      this.clearAllFilters();
    } else {
      this._updateFilteredRows();
      this._saveFilterState();
    }
  }

  /**
   * 필터된 행 업데이트
   */
  _updateFilteredRows() {
    if (!this.legacyStore) {
      return;
    }
    
    const rows = this.legacyStore.state.rows;
    this.filterState.originalRowCount = rows.length;
    
    if (this.filterState.activeFilters.size === 0) {
      this.filterState.isFiltered = false;
      this.filterState.filteredRowCount = rows.length;
      this._filteredRowMapping.clear();
      this._originalToFilteredMapping.clear();
      return;
    }
    
    // 필터링된 행들의 원본 인덱스를 찾아서 저장
    const filteredIndices = [];
    rows.forEach((row, originalIndex) => {
      if (this._applyFilters(row)) {
        filteredIndices.push(originalIndex);
      }
    });
    
    this.filterState.filteredRowCount = filteredIndices.length;
    this.filterState.isFiltered = true;
    
    // 매핑 업데이트
    this._filteredRowMapping.clear();
    this._originalToFilteredMapping.clear();
    
    filteredIndices.forEach((originalIndex, filteredIndex) => {
      this._filteredRowMapping.set(filteredIndex, originalIndex);
      this._originalToFilteredMapping.set(originalIndex, filteredIndex);
    });
  }

  /**
   * 필터 적용 로직 (환자여부만)
   * @param {Object} row - 행 데이터
   * @returns {boolean} 필터 통과 여부
   */
  _applyFilters(row) {
    for (const [colIndex, filterConfig] of this.filterState.activeFilters) {
      if (!this._matchesFilter(row, colIndex, filterConfig)) {
        return false;
      }
    }
    return true;
  }

  /**
   * 개별 필터 매칭 (환자여부, 임상증상, 식단)
   * @param {Object} row - 행 데이터
   * @param {number} colIndex - 컬럼 인덱스
   * @param {Object} filterConfig - 필터 설정
   * @returns {boolean} 매칭 여부
   */
  _matchesFilter(row, colIndex, filterConfig) {

    
    // 환자여부 컬럼 처리
    if (colIndex === 1 && filterConfig.columnType === 'isPatient') {
      const cellValue = String(row.isPatient ?? '');

      
      // 'empty'가 포함된 경우 빈 값도 허용
      const allowEmpty = filterConfig.values.includes('empty');
      if (allowEmpty && (cellValue === '' || cellValue === 'null' || cellValue === 'undefined')) {
        return true;
      }
      
      const matches = filterConfig.values.includes(cellValue);
      return matches;
    }
    
    // 확진여부 컬럼 처리
    if (filterConfig.columnType === 'isConfirmedCase') {
      const cellValue = String(row.isConfirmedCase ?? '');
      
      // 'empty'가 포함된 경우 빈 값도 허용
      const allowEmpty = filterConfig.values.includes('empty');
      if (allowEmpty && (cellValue === '' || cellValue === 'null' || cellValue === 'undefined')) {
        return true;
      }
      
      const matches = filterConfig.values.includes(cellValue);
      return matches;
    }
    
    // 임상증상 컬럼 처리
    if (filterConfig.columnType === 'clinicalSymptoms') {
      // 컬럼 메타데이터에서 해당 컬럼의 cellIndex 찾기
      const columnMeta = this.columnMetas?.find(c => c.colIndex === colIndex);

      
      if (!columnMeta) {
        // 메타데이터 없음 - 필터링 건너뜀
        return true;
      }
      
      // cellIndex가 없으면 임시로 계산 (colIndex에서 기본정보 컬럼 수를 빼서 계산)
      let cellIndex = columnMeta.cellIndex;
      if (cellIndex === null || cellIndex === undefined) {
        // 기본정보 컬럼 수 계산 (연번: 0, 환자여부: 1, 확진여부: 2(있을 경우))
        const basicInfoCount = this.columnMetas?.filter(c => c.type === 'basic').length || 0;
        const confirmedCaseOffset = this.columnMetas?.some(c => c.type === 'isConfirmedCase') ? 1 : 0;
        cellIndex = colIndex - 2 - confirmedCaseOffset - basicInfoCount;
        console.log('[Filter] cellIndex 계산됨:', { colIndex, basicInfoCount, confirmedCaseOffset, calculatedCellIndex: cellIndex });
      }
      
      if (cellIndex < 0) {
        console.log('[Filter] cellIndex가 음수:', { colIndex, cellIndex });
        return true;
      }
      
      const cellValue = String(row.clinicalSymptoms?.[cellIndex] ?? '');
      console.log('[Filter] 임상증상 필터링:', { 
        colIndex,
        cellIndex,
        cellValue, 
        filterValues: filterConfig.values,
        clinicalSymptomsArray: row.clinicalSymptoms,
        clinicalSymptomsLength: row.clinicalSymptoms?.length
      });
      
      // 'empty'가 포함된 경우 빈 값도 허용
      const allowEmpty = filterConfig.values.includes('empty');
      if (allowEmpty && (cellValue === '' || cellValue === 'null' || cellValue === 'undefined')) {
        console.log('[Filter] 빈 값 허용됨');
        return true;
      }
      
      const matches = filterConfig.values.includes(cellValue);
      console.log('[Filter] 임상증상 값 매칭 결과:', { 
        cellValue, 
        matches,
        includesCheck: filterConfig.values.includes(cellValue)
      });
      return matches;
    }
    
    // 식단 컬럼 처리
    if (filterConfig.columnType === 'dietInfo') {
      // 컬럼 메타데이터에서 해당 컬럼의 cellIndex 찾기
      const columnMeta = this.columnMetas?.find(c => c.colIndex === colIndex);
      console.log('[Filter] 식단 컬럼 메타데이터 검색:', { 
        colIndex, 
        columnMeta,
        allColumnMetas: this.columnMetas?.map(c => ({ colIndex: c.colIndex, type: c.type, cellIndex: c.cellIndex }))
      });
      
      if (!columnMeta) {
        console.log('[Filter] 식단 컬럼 메타데이터 없음:', { colIndex, columnMeta });
        return true;
      }
      
      // cellIndex가 없으면 임시로 계산
      let cellIndex = columnMeta.cellIndex;
      if (cellIndex === null || cellIndex === undefined) {
        // 기본정보, 임상증상, 개별노출시간, 증상발현시간 컬럼 수 계산
        const basicInfoCount = this.columnMetas?.filter(c => c.type === 'basic').length || 0;
        const clinicalCount = this.columnMetas?.filter(c => c.type === 'clinicalSymptoms').length || 0;
        const confirmedCaseOffset = this.columnMetas?.some(c => c.type === 'isConfirmedCase') ? 1 : 0;
        const individualExposureOffset = this.columnMetas?.some(c => c.type === 'individualExposureTime') ? 1 : 0;
        cellIndex = colIndex - 2 - confirmedCaseOffset - basicInfoCount - clinicalCount - individualExposureOffset - 1; // 증상발현시간 1개
        console.log('[Filter] 식단 cellIndex 계산됨:', { colIndex, basicInfoCount, clinicalCount, confirmedCaseOffset, individualExposureOffset, calculatedCellIndex: cellIndex });
      }
      
      if (cellIndex < 0) {
        console.log('[Filter] 식단 cellIndex가 음수:', { colIndex, cellIndex });
        return true;
      }
      
      const cellValue = String(row.dietInfo?.[cellIndex] ?? '');
      console.log('[Filter] 식단 필터링:', { 
        colIndex,
        cellIndex,
        cellValue, 
        filterValues: filterConfig.values,
        dietInfoArray: row.dietInfo,
        dietInfoLength: row.dietInfo?.length
      });
      
      // 'empty'가 포함된 경우 빈 값도 허용
      const allowEmpty = filterConfig.values.includes('empty');
      if (allowEmpty && (cellValue === '' || cellValue === 'null' || cellValue === 'undefined')) {
        console.log('[Filter] 빈 값 허용됨');
        return true;
      }
      
      const matches = filterConfig.values.includes(cellValue);
      console.log('[Filter] 식단 값 매칭 결과:', { 
        cellValue, 
        matches,
        includesCheck: filterConfig.values.includes(cellValue)
      });
      return matches;
    }
    
    // 기본정보 컬럼 처리
    if (filterConfig.columnType === 'basicInfo') {
      // 컬럼 메타데이터에서 해당 컬럼의 cellIndex 찾기
      const columnMeta = this.columnMetas?.find(c => c.colIndex === colIndex);
      console.log('[Filter] 기본정보 컬럼 메타데이터 검색:', { 
        colIndex, 
        columnMeta,
        allColumnMetas: this.columnMetas?.map(c => ({ colIndex: c.colIndex, type: c.type, cellIndex: c.cellIndex }))
      });
      
      if (!columnMeta || columnMeta.cellIndex === null || columnMeta.cellIndex === undefined) {
        console.log('[Filter] 기본정보 컬럼 메타데이터 없음:', { colIndex, columnMeta });
        return true;
      }
      
      const cellValue = String(row.basicInfo?.[columnMeta.cellIndex] ?? '');
      console.log('[Filter] 기본정보 필터링:', { 
        colIndex,
        cellIndex: columnMeta.cellIndex,
        cellValue, 
        filterValues: filterConfig.values,
        basicInfoArray: row.basicInfo,
        basicInfoLength: row.basicInfo?.length
      });
      
      // 'empty'가 포함된 경우 빈 값도 허용
      const allowEmpty = filterConfig.values.includes('empty');
      if (allowEmpty && (cellValue === '' || cellValue === 'null' || cellValue === 'undefined')) {
        console.log('[Filter] 빈 값 허용됨');
        return true;
      }
      
      // 정확한 값 매칭 (대소문자 구분 없이)
      const hasExactMatch = filterConfig.values.some(filterValue => {
        if (filterValue === 'empty') return false; // empty는 이미 처리됨
        return cellValue.toLowerCase() === filterValue.toLowerCase();
      });
      
      console.log('[Filter] 기본정보 값 매칭 결과:', { 
        cellValue, 
        hasExactMatch, 
        filterValues: filterConfig.values.filter(v => v !== 'empty')
      });
      
      return hasExactMatch;
    }
    
    // 날짜/시간 컬럼 처리 (증상발현시간, 개별노출시간)
    if (filterConfig.columnType === 'symptomOnset' || filterConfig.columnType === 'individualExposureTime') {
      const cellValue = String(row[filterConfig.columnType] ?? '');
      console.log('[Filter] 날짜/시간 필터링:', { 
        colIndex,
        columnType: filterConfig.columnType,
        cellValue, 
        filterValues: filterConfig.values,
        filterValuesType: typeof filterConfig.values,
        filterValuesLength: filterConfig.values?.length,
        filterValuesString: JSON.stringify(filterConfig.values)
      });
      
      // 'empty'가 포함된 경우 빈 값도 허용
      const allowEmpty = filterConfig.values.includes('empty');
      if (allowEmpty && (cellValue === '' || cellValue === 'null' || cellValue === 'undefined')) {
        console.log('[Filter] 빈 값 허용됨');
        return true;
      }
      
      // 날짜 값에서 날짜 부분만 추출 (시간 제거)
      const extractDatePart = (dateTimeString) => {
        if (!dateTimeString || dateTimeString === '') return '';
        
        // yyyy-mm-dd hh:mm 형식에서 날짜 부분만 추출
        const dateMatch = dateTimeString.match(/^(\d{4}-\d{2}-\d{2})/);
        if (dateMatch) {
          return dateMatch[1]; // yyyy-mm-dd 부분만 반환
        }
        
        // 다른 형식도 시도 (yyyy/mm/dd 등)
        const altDateMatch = dateTimeString.match(/^(\d{4}[/-]\d{2}[/-]\d{2})/);
        if (altDateMatch) {
          // yyyy/mm/dd를 yyyy-mm-dd로 변환
          return altDateMatch[1].replace(/[/]/g, '-');
        }
        
        return dateTimeString; // 매칭되지 않으면 원본 반환
      };
      
      const cellDatePart = extractDatePart(cellValue);
      console.log('[Filter] 날짜 부분 추출:', { 
        originalValue: cellValue, 
        extractedDate: cellDatePart 
      });
      
      // 필터 값들과 비교
      const hasDateMatch = filterConfig.values.some(filterDate => {
        if (filterDate === 'empty') return false; // empty는 이미 처리됨
        return cellDatePart === filterDate;
      });
      
      console.log('[Filter] 날짜 매칭 결과:', { 
        cellDatePart, 
        hasDateMatch,
        filterDates: filterConfig.values.filter(v => v !== 'empty')
      });
      
      return hasDateMatch;
    }
    
    console.log('[Filter] 지원하지 않는 컬럼 타입 - 필터링하지 않음');
    return true; // 지원하지 않는 컬럼은 필터링하지 않음
  }

  /**
   * Public 필터 매칭 메서드
   * @param {Object} row - 행 데이터
   * @param {number} colIndex - 컬럼 인덱스
   * @param {Object} filterConfig - 필터 설정
   * @returns {boolean} 매칭 여부
   */
  matchesFilter(row, colIndex, filterConfig) {
    return this._matchesFilter(row, colIndex, filterConfig);
  }

  /**
   * 필터된 인덱스를 원본 인덱스로 변환
   * @param {number} filteredIndex - 필터된 인덱스
   * @returns {number} 원본 인덱스
   */
  getOriginalIndexFromFiltered(filteredIndex) {
    if (!this.filterState.isFiltered) {
      return filteredIndex;
    }
    
    const originalIndex = this._filteredRowMapping.get(filteredIndex);
    return originalIndex !== undefined ? originalIndex : filteredIndex;
  }

  /**
   * 원본 인덱스를 필터된 인덱스로 변환
   * @param {number} originalIndex - 원본 인덱스
   * @returns {number} 필터된 인덱스
   */
  getFilteredIndexFromOriginal(originalIndex) {
    if (!this.filterState.isFiltered) {
      return originalIndex;
    }
    
    const filteredIndex = this._originalToFilteredMapping.get(originalIndex);
    return filteredIndex !== undefined ? filteredIndex : -1; // -1은 숨겨진 행
  }

  /**
   * 필터 상태 저장 (localStorage)
   */
  _saveFilterState() {
    try {
      const filterData = {
        activeFilters: Array.from(this.filterState.activeFilters.entries()),
        isFiltered: this.filterState.isFiltered,
        lastAppliedAt: this.filterState.lastAppliedAt
      };
      
      localStorage.setItem('dataInputFilters', JSON.stringify(filterData));
      console.log('[Filter] 필터 상태 저장 완료');
    } catch (error) {
      console.error('[Filter] 필터 상태 저장 실패:', error);
    }
  }

  /**
   * 필터 상태 복원 (페이지 새로고침 후에도 유지)
   */
  loadFilterState() {
    try {
      const savedData = localStorage.getItem('dataInputFilters');
      if (!savedData) return;
      
      const filterData = JSON.parse(savedData);
      
      // 활성 필터 복원
      this.filterState.activeFilters = new Map(filterData.activeFilters || []);
      this.filterState.isFiltered = filterData.isFiltered || false;
      this.filterState.lastAppliedAt = filterData.lastAppliedAt || null;
      
      // 필터된 행 재계산
      if (this.filterState.isFiltered) {
        this._updateFilteredRows();
      }
      
      console.log('[Filter] 필터 상태 복원 완료');
    } catch (error) {
      console.error('[Filter] 필터 상태 복원 실패:', error);
      // 오류 시 필터 초기화
      this.clearAllFilters();
    }
  }

  /**
   * 날짜/시간 필터 토글 (특정 날짜만)
   * @param {number} colIndex - 컬럼 인덱스
   * @param {string} dateValue - 날짜 값 (yyyy-mm-dd 형식)
   */
  toggleDateTimeFilter(colIndex, dateValue) {
    console.log('[Filter] toggleDateTimeFilter 호출:', { colIndex, dateValue });
    
    const currentFilter = this.filterState.activeFilters.get(colIndex);
    
    console.log('[Filter] 현재 필터 상태:', { 
      currentFilter,
      activeFiltersSize: this.filterState.activeFilters.size,
      allActiveFilters: Array.from(this.filterState.activeFilters.entries())
    });
    
    let newValues;
    
    if (!currentFilter) {
      // 필터가 없으면 새로 생성
      console.log('[Filter] 필터 없음 - 새로 생성');
      newValues = [dateValue];
    } else {
      // 현재 필터에서 해당 값 토글
      newValues = [...currentFilter.values];
      const valueIndex = newValues.indexOf(dateValue);
      
      console.log('[Filter] 값 토글:', { dateValue, valueIndex, newValues });
      
      if (valueIndex > -1) {
        // 값이 있으면 제거
        newValues.splice(valueIndex, 1);
        console.log('[Filter] 값 제거됨:', newValues);
      } else {
        // 값이 없으면 추가
        newValues.push(dateValue);
        console.log('[Filter] 값 추가됨:', newValues);
      }
    }
    
    // 빈 값 필터는 항상 유지 가능
    if (newValues.length === 0) {
      // 모두 해제하려고 하면 필터 제거
      console.log('[Filter] 모든 값 제거됨 - 필터 제거');
      this.removeFilter(colIndex);
      return;
    }
    
    console.log('[Filter] 최종 필터 적용:', { colIndex, newValues });
    this.applyFilter(colIndex, {
      type: 'date',
      values: newValues,
      columnType: this._getColumnTypeByIndex(colIndex)
    });
  }

  /**
   * 컬럼 인덱스로 컬럼 타입을 가져오는 헬퍼 메서드
   * @param {number} colIndex - 컬럼 인덱스
   * @returns {string} 컬럼 타입
   */
  _getColumnTypeByIndex(colIndex) {
    const columnMeta = this.columnMetas?.find(c => c.colIndex === colIndex);
    return columnMeta?.type || 'unknown';
  }
}

// Vue Composition API용 훅
export function useStoreBridge(legacyStore = null, validationManager = null, options = {}) {
  const bridge = new StoreBridge(legacyStore, validationManager, options);
  
  return {
    bridge,
    // validationManager 접근을 위한 속성 추가
    validationManager: bridge.validationManager,
    
    // 편집 관련 메서드들
    startCellEdit: (cellInfo, originalValue, columnMeta) => 
      bridge.startCellEdit(cellInfo, originalValue, columnMeta),
    updateTempValue: (value) => bridge.updateTempValue(value),
    cancelCellEdit: () => bridge.cancelCellEdit(),
    completeCellEdit: () => bridge.completeCellEdit(),
    
    // 기존 store.js 메서드들
    dispatch: (actionName, payload) => bridge.dispatch(actionName, payload),
    updateCell: (payload) => bridge.updateCell(payload),
    updateHeader: (payload) => bridge.updateHeader(payload),
    updateIndividualExposureTime: (payload) => bridge.updateIndividualExposureTime(payload),
    addRows: (count) => bridge.addRows(count),
    addColumn: (type) => bridge.addColumn(type),
    deleteRow: (rowIndex) => bridge.deleteRow(rowIndex),
    deleteMultipleRows: (payload) => bridge.deleteMultipleRows(payload),
    deleteIndividualRows: (payload) => bridge.deleteIndividualRows(payload),
    deleteColumn: (type) => bridge.deleteColumn(type),
    deleteEmptyRows: () => bridge.deleteEmptyRows(),
    deleteEmptyColumns: () => bridge.deleteEmptyColumns(),
    pasteData: (payload) => bridge.pasteData(payload),
    undo: () => bridge.undo(),
    redo: () => bridge.redo(),
    resetSheet: () => bridge.resetSheet(),
    updateHeadersFromExcel: (headers) => bridge.updateHeadersFromExcel(headers),
    addRowsFromExcel: (rows) => bridge.addRowsFromExcel(rows),
    setIndividualExposureColumnVisibility: (isVisible) => 
      bridge.setIndividualExposureColumnVisibility(isVisible),
    setConfirmedCaseColumnVisibility: (isVisible) => 
      bridge.setConfirmedCaseColumnVisibility(isVisible),
    
    // getters
    headers: bridge.headers,
    rows: bridge.rows,
    basicInfoStartIndex: bridge.basicInfoStartIndex,
    clinicalSymptomsStartIndex: bridge.clinicalSymptomsStartIndex,
    individualExposureTimeStartIndex: bridge.individualExposureTimeStartIndex,
    symptomOnsetStartIndex: bridge.symptomOnsetStartIndex,
    dietInfoStartIndex: bridge.dietInfoStartIndex,
    canUndo: bridge.canUndo,
    canRedo: bridge.canRedo,
    
    // state
    state: bridge.state,
    
    // 편집 상태
    isEditing: () => bridge.isEditing(),
    getOriginalValue: () => bridge.getOriginalValue(),
    getTempValue: () => bridge.getTempValue(),
    getCurrentEditInfo: () => bridge.getCurrentEditInfo(),
    
    // 유틸리티
    processPendingSaves: () => bridge.processPendingSaves(),
    cancelPendingSaves: () => bridge.cancelPendingSaves(),
    setSaveDelay: (delay) => bridge.setSaveDelay(delay),
    validate: () => bridge.validate(),
    getDebugInfo: () => bridge.getDebugInfo(),
    reset: () => bridge.reset(),
    saveCellValue: (rowIndex, colIndex, value, columnMeta) => bridge.saveCellValue(rowIndex, colIndex, value, columnMeta),
    
    // 데이터 로드/저장
    loadData: () => bridge.loadData(),
    saveCurrentState: () => bridge.saveCurrentState(),
    
    // 내부 메서드들 (Undo/Redo용)
    _captureSnapshot: (action, meta) => bridge._captureSnapshot(action, meta),
    _actions: bridge._actions || {},
    
    // 추가된 메서드들
    addMultipleColumns: (payload) => bridge.addMultipleColumns(payload),
    insertColumnAt: (payload) => bridge.insertColumnAt(payload),
    insertMultipleColumnsAt: (payload) => bridge.insertMultipleColumnsAt(payload),
    deleteColumnByIndex: (payload) => bridge.deleteColumnByIndex(payload),
    deleteMultipleColumnsByIndex: (payload) => bridge.deleteMultipleColumnsByIndex(payload),
    clearColumnData: (payload) => bridge.clearColumnData(payload),
    clearMultipleColumnsData: (payload) => bridge.clearMultipleColumnsData(payload),
    clearFixedColumnData: (payload) => bridge.clearFixedColumnData(payload),
    handleEnter: (payload) => bridge.handleEnter(payload),
    insertRowAt: (payload) => bridge.insertRowAt(payload),
    pasteHeaderData: (payload) => bridge.pasteHeaderData(payload),
    updateCellsBatch: (payload) => bridge.updateCellsBatch(payload),
    updateSymptomInterval: (value) => bridge.updateSymptomInterval(value),
    updateExposureDateTime: (value) => bridge.updateExposureDateTime(value),
    updateIncubationInterval: (value) => bridge.updateIncubationInterval(value),
    toggleIndividualExposureColumn: () => bridge.toggleIndividualExposureColumn(),
    toggleConfirmedCaseColumn: () => bridge.toggleConfirmedCaseColumn(),
    updateConfirmedCase: (payload) => bridge.updateConfirmedCase(payload),
    updateHeadersBatch: (payload) => bridge.updateHeadersBatch(payload),
    clearRowData: (payload) => bridge.clearRowData(payload),
    clearMultipleRowsData: (payload) => bridge.clearMultipleRowsData(payload),
    clearIndividualRowsData: (payload) => bridge.clearIndividualRowsData(payload),
    loadInitialData: () => bridge.loadInitialData(),
    updateSingleHeader: (payload) => bridge.updateSingleHeader(payload),
    
    // 필터 관련 메서드들
    togglePatientFilter: (value) => bridge.togglePatientFilter(value),
    toggleClinicalFilter: (colIndex, value) => bridge.toggleClinicalFilter(colIndex, value),
    toggleDietFilter: (colIndex, value) => bridge.toggleDietFilter(colIndex, value),
    toggleBasicFilter: (colIndex, value) => bridge.toggleBasicFilter(colIndex, value),
    toggleConfirmedFilter: (colIndex, value) => bridge.toggleConfirmedFilter(colIndex, value),
    toggleDateTimeFilter: (colIndex, dateValue) => bridge.toggleDateTimeFilter(colIndex, dateValue),
    applyFilter: (colIndex, filterConfig) => bridge.applyFilter(colIndex, filterConfig),
    clearAllFilters: () => bridge.clearAllFilters(),
    removeFilter: (colIndex) => bridge.removeFilter(colIndex),
    getOriginalIndexFromFiltered: (filteredIndex) => bridge.getOriginalIndexFromFiltered(filteredIndex),
    getFilteredIndexFromOriginal: (originalIndex) => bridge.getFilteredIndexFromOriginal(originalIndex),
    matchesFilter: (row, colIndex, filterConfig) => bridge.matchesFilter(row, colIndex, filterConfig),
    
    // 필터 상태 접근
    filterState: bridge.filterState,
    
    // 내부 매핑 접근 (필터링용)
    _filteredRowMapping: bridge._filteredRowMapping,
    _originalToFilteredMapping: bridge._originalToFilteredMapping
  };
}