import { EnhancedStorageManager } from './enhancedStorageManager.js';
import { HistoryManager } from './historyManager.js';
import { ref } from 'vue';

/**
 * 기존 store.js와 새로운 저장 시스템을 연결하는 브리지 클래스
 * 기존 코드의 호환성을 유지하면서 새로운 기능을 제공합니다.
 */
export class StoreBridge {
  constructor(legacyStore = null, validationManager = null, options = {}) {
    this.legacyStore = legacyStore;
    this.enhancedManager = new EnhancedStorageManager(legacyStore);
    this.history = new HistoryManager();
    this.validationManager = validationManager;
    this.isInitialized = false;
    
    // 반응성 있는 undo/redo 상태 관리
    this._canUndo = ref(false);
    this._canRedo = ref(false);
    
    // 디버그 옵션 설정
    this.debug = options.debug ?? (import.meta.env?.MODE === 'development' || false);
    
    if (legacyStore) {
      this.initialize();
    }
    
    // 초기 undo/redo 상태 업데이트
    this._updateUndoRedoState();
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
  addRows(count) {
    this._captureSnapshot('addRows', { count });
    const result = this.legacyStore.dispatch('addRows', count);
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
  addColumn(type) {
    this._captureSnapshot('addColumn', { type });
    const result = this.legacyStore.dispatch('addColumn', type);
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
  deleteRow(rowIndex) {
    // 기존 로직 실행
    this.legacyStore.dispatch('deleteRow', rowIndex);
    this.saveCurrentState();
    
    // Validation 처리 - 삭제된 행 오류 제거 + 남은 행들 인덱스 재조정
    if (this.validationManager) {
      this.validationManager.reindexErrorsAfterRowDeletion([rowIndex]);
    }
  }
  
  /**
   * 여러 행 삭제
   * @param {Object} payload - 삭제 페이로드
   */
  deleteMultipleRows(payload) {
    // 기존 로직 실행
    this.legacyStore.dispatch('deleteMultipleRows', payload);
    this.saveCurrentState();
    
    // Validation 처리 - 삭제된 행들 오류 제거 + 남은 행들 인덱스 재조정
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
        this.validationManager.reindexErrorsAfterRowDeletion(deletedRowIndices);
      }
    }
  }
  
  /**
   * 개별 행 삭제
   * @param {Object} payload - 삭제 페이로드
   */
  deleteIndividualRows(payload) {
    // 기존 로직 실행
    this.legacyStore.dispatch('deleteIndividualRows', payload);
    this.saveCurrentState();
    
    // Validation 처리 - 삭제된 행들 오류 제거 + 남은 행들 인덱스 재조정
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
        this.validationManager.reindexErrorsAfterRowDeletion(deletedRowIndices);
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
    
    // 검증 처리
    if (this.validationManager && deletedRowIndices.length > 0) {
      this.validationManager.handleRowDeletion(deletedRowIndices);
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
  pasteData(payload) {
    this._captureSnapshot('pasteData', payload);
    const result = this.legacyStore.dispatch('pasteData', payload);
    this.saveCurrentState();
    
    // 검증 처리
    if (this.validationManager) {
      const { startRowIndex, startColIndex, data } = payload;
      const columnMetas = this.getColumnMetas();
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
  updateHeadersFromExcel(headers) {
    const result = this.legacyStore.dispatch('updateHeadersFromExcel', headers);
    this.saveCurrentState();
    return result;
  }
  
  /**
   * 엑셀에서 행 추가
   * @param {Array} rows - 행 데이터
   */
  async addRowsFromExcel(rows) {
    const result = this.legacyStore.dispatch('addRowsFromExcel', rows);
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
    const wasVisible = this.legacyStore.state.isIndividualExposureColumnVisible;
    const isAdding = isVisible && !wasVisible; // 열을 추가하는 경우
    const isRemoving = !isVisible && wasVisible; // 열을 제거하는 경우
    
    // 변경이 없으면 조기 리턴
    if (isVisible === wasVisible) {
      return;
    }
    
    let exposureColumnIndex = null;
    
    if (isAdding) {
      // 추가할 때는 증상발현시간 열 앞에 삽입됨
      exposureColumnIndex = this.symptomOnsetStartIndex;
    } else if (isRemoving) {
      // 제거할 때는 현재 개별 노출시간 열의 위치를 찾아야 함
      const columnMetas = this.getColumnMetas();
      const individualExposureCol = columnMetas.find(col => 
        col.type === 'individualExposureTime' || 
        col.dataKey === 'individualExposureTime'
      );
      exposureColumnIndex = individualExposureCol ? individualExposureCol.colIndex : null;
    }
    
    if (this.debug) {
      console.log(`[StoreBridge] setIndividualExposureColumnVisibility: ${isVisible}`);
      console.log(`[StoreBridge] isAdding: ${isAdding}, isRemoving: ${isRemoving}`);
      console.log(`[StoreBridge] exposureColumnIndex: ${exposureColumnIndex}`);
    }
    
    // 🔥 중요: 유효성 검사 오류 인덱스 재조정을 Vuex 변경 **전**에 실행
    if (this.validationManager && exposureColumnIndex !== null) {
      if (isAdding) {
        // 열 추가 시: 해당 위치부터 모든 열의 인덱스를 +1
        if (this.debug) {
          console.log(`[StoreBridge] 개별 노출시간 열 추가 - reindexErrorsAfterColumnAddition(${exposureColumnIndex})`);
        }
        this.validationManager.reindexErrorsAfterColumnAddition(exposureColumnIndex);
      } else if (isRemoving) {
        // 열 제거 시: 해당 열의 오류 제거 및 나머지 열의 인덱스를 -1
        if (this.debug) {
          console.log(`[StoreBridge] 개별 노출시간 열 제거 - reindexErrorsAfterColumnDeletion([${exposureColumnIndex}])`);
        }
        this.validationManager.reindexErrorsAfterColumnDeletion([exposureColumnIndex]);
      }
    }
    
    // Vuex state 변경
    const result = this.legacyStore.dispatch('setIndividualExposureColumnVisibility', isVisible);
    this.saveCurrentState();
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
    
    // 삽입될 위치의 colIndex 찾기
    const targetColumns = beforeColumnMetas.filter(c => c.type === type);
    const insertColIndex = targetColumns.length > 0 ? targetColumns[0].colIndex + index : 0;
    
    if (this.debug) {
      console.log(`[StoreBridge] insertColumnAt: type=${type}, index=${index}, insertColIndex=${insertColIndex}`);
    }
    
    const result = this.legacyStore.dispatch('insertColumnAt', payload);
    this.saveCurrentState();
    
    // 검증 처리: 삽입된 열에 대해 인덱스 재조정
    if (this.validationManager) {
      if (this.debug) {
        console.log(`[StoreBridge] insertColumnAt: calling reindexErrorsAfterColumnAddition(${insertColIndex})`);
      }
      this.validationManager.reindexErrorsAfterColumnAddition(insertColIndex);
    }
    
    return result;
  }
  
  /**
   * 여러 열을 특정 위치에 삽입 (validation 처리 포함)
   */
  insertMultipleColumnsAt(payload) {
    const { type, count, index } = payload;
    
    // 삽입 전에 현재 열 메타 정보 저장
    const beforeColumnMetas = this.getColumnMetas();
    const addedColIndices = [];
    
    // --- 삽입될 열들의 전체 colIndex 계산 ---
    // 1) 동일 type 중에서 cellIndex >= index 중 가장 작은 colIndex 찾기 (중간 삽입)
    let insertColIndex;
    const candidates = beforeColumnMetas
      .filter(c => c.type === type && c.cellIndex >= index)
      .sort((a, b) => a.cellIndex - b.cellIndex);

    if (candidates.length > 0) {
      // 중간에 삽입할 위치
      insertColIndex = candidates[0].colIndex;
    } else {
      // 맨 뒤에 삽입 – 동일 type 중 가장 오른쪽 colIndex 다음
      const sameType = beforeColumnMetas.filter(c => c.type === type);
      if (sameType.length > 0) {
        insertColIndex = Math.max(...sameType.map(c => c.colIndex)) + 1;
      } else {
        // 해당 type 열이 하나도 없으면, 전체 메타 끝에 삽입
        insertColIndex = beforeColumnMetas.length;
      }
    }

    if (this.debug) {
      console.log('[StoreBridge] insertMultipleColumnsAt] Calculated insertColIndex:', insertColIndex);
    }
    
    // 기존 로직 실행
    this.legacyStore.dispatch('insertMultipleColumnsAt', payload);
    this.saveCurrentState();
    
    // 삽입된 열들의 인덱스 수집
    for (let i = 0; i < count; i++) {
      addedColIndices.push(insertColIndex + i);
    }
    
    // Validation 처리
    if (this.validationManager && addedColIndices.length > 0) {
      this.validationManager.reindexErrorsAfterMultipleColumnAddition(addedColIndices);
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
    // 삭제 전에 현재 열 메타 정보 저장
    const beforeColumnMetas = this.getColumnMetas();
    const { columns } = payload;
    const deletedColIndices = [];
    
    if (this.debug) {
      console.log('[StoreBridge] deleteMultipleColumnsByIndex payload:', JSON.stringify(payload));
      console.log('[StoreBridge] beforeColumnMetas (first 20):', beforeColumnMetas.slice(0, 20));
    }

    // 삭제될 열들의 인덱스 수집
    columns.forEach(({ type, index }) => {
      // 실제 타입으로 직접 매칭 (이미 올바른 타입으로 전달됨)
      const targetColumns = beforeColumnMetas.filter(c => c.type === type && c.cellIndex === index);
      targetColumns.forEach(col => deletedColIndices.push(col.colIndex));
    });

    if (this.debug) {
      console.log('[StoreBridge] deletedColIndices (colIndex):', deletedColIndices);
    }
    
    // 기존 로직 실행
    this.legacyStore.dispatch('deleteMultipleColumnsByIndex', payload);
    this.saveCurrentState();
    
    // Validation 처리
    if (this.validationManager && deletedColIndices.length > 0) {
      if (this.debug) {
        console.log('[StoreBridge] Calling validationManager.reindexErrorsAfterColumnDeletion with:', deletedColIndices);
      }
      this.validationManager.reindexErrorsAfterColumnDeletion(deletedColIndices);
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
  
  dispatch(actionName, payload) {
    if (!this.legacyStore) {
      console.error('[StoreBridge] legacyStore가 없습니다.');
      return;
    }

    const isMutative = StoreBridge.MUTATIVE_ACTIONS.includes(actionName);

    if (isMutative) {
      this._captureSnapshot(actionName, payload);
    }

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
    
    const result = this.legacyStore.dispatch(actionName, payload);

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
    
    const cloned = JSON.parse(JSON.stringify({
      headers: this.legacyStore.state.headers,
      rows: this.legacyStore.state.rows,
      settings: {
        isIndividualExposureColumnVisible: this.legacyStore.state.isIndividualExposureColumnVisible
      },
      validationErrors,
      validationSchemaVersion: this.legacyStore.state.validationState?.version ?? 0
    }));
    this.history.saveSnapshot(cloned, action, meta);
    
    // 스냅샷 저장 후 상태 업데이트
    this._updateUndoRedoState();
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
}

// Vue Composition API용 훅
export function useStoreBridge(legacyStore = null, validationManager = null, options = {}) {
  const bridge = new StoreBridge(legacyStore, validationManager, options);
  
  return {
    bridge,
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
    updateHeadersBatch: (payload) => bridge.updateHeadersBatch(payload),
    clearRowData: (payload) => bridge.clearRowData(payload),
    clearMultipleRowsData: (payload) => bridge.clearMultipleRowsData(payload),
    clearIndividualRowsData: (payload) => bridge.clearIndividualRowsData(payload),
    loadInitialData: () => bridge.loadInitialData(),
    updateSingleHeader: (payload) => bridge.updateSingleHeader(payload)
  };
} 