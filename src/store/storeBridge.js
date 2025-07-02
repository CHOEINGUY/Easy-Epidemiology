import { EnhancedStorageManager } from './enhancedStorageManager.js';
import { HistoryManager } from './historyManager.js';

/**
 * 기존 store.js와 새로운 저장 시스템을 연결하는 브리지 클래스
 * 기존 코드의 호환성을 유지하면서 새로운 기능을 제공합니다.
 */
export class StoreBridge {
  constructor(legacyStore = null) {
    this.legacyStore = legacyStore;
    this.enhancedManager = new EnhancedStorageManager(legacyStore);
    this.history = new HistoryManager();
    this.isInitialized = false;
    
    if (legacyStore) {
      this.initialize();
    }
  }
  
  /**
   * 브리지를 초기화합니다.
   */
  initialize() {
    if (this.isInitialized) {
      console.warn('[StoreBridge] 이미 초기화되었습니다.');
      return;
    }
    
    if (!this.legacyStore) {
      console.error('[StoreBridge] 기존 store.js 인스턴스가 필요합니다.');
      return;
    }
    
    this.isInitialized = true;
    console.log('[StoreBridge] 브리지가 초기화되었습니다.');
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
      console.log('[StoreBridge] 편집 중: 임시 값으로 저장');
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
      console.log('[StoreBridge] 기존 로직: 즉시 저장');
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
    return result;
  }
  
  /**
   * 행 삭제
   * @param {number} rowIndex - 삭제할 행 인덱스
   */
  deleteRow(rowIndex) {
    this._captureSnapshot('deleteRow', { rowIndex });
    const result = this.legacyStore.dispatch('deleteRow', rowIndex);
    this.saveCurrentState();
    return result;
  }
  
  /**
   * 여러 행 삭제
   * @param {Object} payload - 삭제 페이로드
   */
  deleteMultipleRows(payload) {
    this._captureSnapshot('deleteMultipleRows', payload);
    const result = this.legacyStore.dispatch('deleteMultipleRows', payload);
    this.saveCurrentState();
    return result;
  }
  
  /**
   * 개별 행 삭제
   * @param {Object} payload - 삭제 페이로드
   */
  deleteIndividualRows(payload) {
    this._captureSnapshot('deleteIndividualRows', payload);
    const result = this.legacyStore.dispatch('deleteIndividualRows', payload);
    this.saveCurrentState();
    return result;
  }
  
  /**
   * 열 삭제
   * @param {string} type - 열 타입
   */
  deleteColumn(type) {
    this._captureSnapshot('deleteColumn', { type });
    const result = this.legacyStore.dispatch('deleteColumn', type);
    this.saveCurrentState();
    return result;
  }
  
  /**
   * 빈 행 삭제
   */
  deleteEmptyRows() {
    this._captureSnapshot('deleteEmptyRows');
    const result = this.legacyStore.dispatch('deleteEmptyRows');
    this.saveCurrentState();
    return result;
  }
  
  /**
   * 빈 열 삭제
   */
  deleteEmptyColumns() {
    this._captureSnapshot('deleteEmptyColumns');
    const result = this.legacyStore.dispatch('deleteEmptyColumns');
    this.saveCurrentState();
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
    return result;
  }
  
  /**
   * 실행 취소
   */
  undo() {
    const prevState = this.history.undo();
    if (!prevState) return false;

    // Vuex mutation으로 상태 치환
    if (this.legacyStore) {
      this.legacyStore.commit('SET_INITIAL_DATA', prevState);
    }

    // localStorage 최신화
    this.enhancedManager.saveData(prevState);
    return true;
  }
  
  /**
   * 재실행
   */
  redo() {
    const nextState = this.history.redo();
    if (!nextState) return false;

    if (this.legacyStore) {
      this.legacyStore.commit('SET_INITIAL_DATA', nextState);
    }

    this.enhancedManager.saveData(nextState);
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
  addRowsFromExcel(rows) {
    const result = this.legacyStore.dispatch('addRowsFromExcel', rows);
    this.saveCurrentState();
    return result;
  }
  
  /**
   * 개별 노출시간 열 가시성 설정
   * @param {boolean} isVisible - 가시성 여부
   */
  setIndividualExposureColumnVisibility(isVisible) {
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
    const result = this.legacyStore.dispatch('insertColumnAt', payload);
    this.saveCurrentState();
    return result;
  }
  
  /**
   * 특정 위치에 여러 열 추가
   * @param {Object} payload - 추가 페이로드
   */
  insertMultipleColumnsAt(payload) {
    const result = this.legacyStore.dispatch('insertMultipleColumnsAt', payload);
    this.saveCurrentState();
    return result;
  }
  
  /**
   * 인덱스로 열 삭제
   * @param {Object} payload - 삭제 페이로드
   */
  deleteColumnByIndex(payload) {
    const result = this.legacyStore.dispatch('deleteColumnByIndex', payload);
    this.saveCurrentState();
    return result;
  }
  
  /**
   * 여러 열을 인덱스로 삭제
   * @param {Object} payload - 삭제 페이로드
   */
  deleteMultipleColumnsByIndex(payload) {
    const result = this.legacyStore.dispatch('deleteMultipleColumnsByIndex', payload);
    this.saveCurrentState();
    return result;
  }
  
  /**
   * 열 데이터 지우기
   * @param {Object} payload - 지우기 페이로드
   */
  clearColumnData(payload) {
    this._captureSnapshot('clearColumnData', payload);
    const result = this.legacyStore.dispatch('clearColumnData', payload);
    this.saveCurrentState();
    return result;
  }
  
  /**
   * 여러 열 데이터 지우기
   * @param {Object} payload - 지우기 페이로드
   */
  clearMultipleColumnsData(payload) {
    this._captureSnapshot('clearMultipleColumnsData', payload);
    const result = this.legacyStore.dispatch('clearMultipleColumnsData', payload);
    this.saveCurrentState();
    return result;
  }
  
  /**
   * 고정 열 데이터 지우기
   * @param {Object} payload - 지우기 페이로드
   */
  clearFixedColumnData(payload) {
    this._captureSnapshot('clearFixedColumnData', payload);
    const result = this.legacyStore.dispatch('clearFixedColumnData', payload);
    this.saveCurrentState();
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
    this._captureSnapshot('updateCellsBatch', payload);
    const result = this.legacyStore.dispatch('updateCellsBatch', payload);
    this.saveCurrentState();
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
   * 행 데이터 지우기
   * @param {Object} payload - 지우기 페이로드
   */
  clearRowData(payload) {
    this._captureSnapshot('clearRowData', payload);
    const result = this.legacyStore.dispatch('clearRowData', payload);
    this.saveCurrentState();
    return result;
  }
  
  /**
   * 여러 행 데이터 지우기
   * @param {Object} payload - 지우기 페이로드
   */
  clearMultipleRowsData(payload) {
    this._captureSnapshot('clearMultipleRowsData', payload);
    const result = this.legacyStore.dispatch('clearMultipleRowsData', payload);
    this.saveCurrentState();
    return result;
  }
  
  /**
   * 개별 행 데이터 지우기
   * @param {Object} payload - 지우기 페이로드
   */
  clearIndividualRowsData(payload) {
    this._captureSnapshot('clearIndividualRowsData', payload);
    const result = this.legacyStore.dispatch('clearIndividualRowsData', payload);
    this.saveCurrentState();
    return result;
  }
  
  /**
   * 초기 데이터 로드
   */
  loadInitialData() {
    try {
      console.log('[StoreBridge] 초기 데이터 로드를 시작합니다...');
      
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
        
        console.log('[StoreBridge] 초기 데이터 로드 완료');
        return loadedData;
      } else {
        // 데이터가 없으면 기본 상태로 설정
        console.log('[StoreBridge] 저장된 데이터가 없어 기본 상태로 설정합니다.');
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
    return this.history.canUndo();
  }
  
  /**
   * 재실행 가능 여부
   */
  get canRedo() {
    return this.history.canRedo();
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
  }

  /**
   * 헤더 셀 값을 저장하고 스냅샷을 남깁니다.
   * @param {number} colIndex
   * @param {*} value
   * @param {Object} columnMeta
   */
  saveHeaderValue(colIndex, value, columnMeta) {
    console.log('[StoreBridge] saveHeaderValue 호출됨:', { colIndex, value, columnMeta });

    const typeMap = {
      basic: 'basic',
      clinical: 'clinical',
      diet: 'diet'
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
    'clearMultipleColumnsData',
    'clearFixedColumnData',
    'pasteData',
    'pasteHeaderData',
    'updateHeadersFromExcel',
    // 전체 초기화
    'resetSheet',
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

    console.log(`[StoreBridge] dispatch 호출: ${actionName}`, payload);
    const result = this.legacyStore.dispatch(actionName, payload);

    if (isMutative) {
      this.saveCurrentState();
    }

    return result;
  }
  
  /**
   * 현재 Vuex state를 깊은 복사해 HistoryManager 에 저장합니다.
   * 반드시 "변경 전" 시점에 호출해야 합니다.
   * @param {string} action 액션 이름
   * @param {object} [meta] 추가 메타
   */
  _captureSnapshot(action = 'unknown', meta = {}) {
    if (!this.legacyStore) return;
    const cloned = JSON.parse(JSON.stringify({
      headers: this.legacyStore.state.headers,
      rows: this.legacyStore.state.rows,
      settings: {
        isIndividualExposureColumnVisible: this.legacyStore.state.isIndividualExposureColumnVisible,
      },
    }));
    this.history.saveSnapshot(cloned, action, meta);
  }
}

// Vue Composition API용 훅
export function useStoreBridge(legacyStore = null) {
  const bridge = new StoreBridge(legacyStore);
  
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