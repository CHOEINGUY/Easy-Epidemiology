/**
 * StoreBridge History Operations
 * Undo/Redo 및 스냅샷 관련 메서드
 */

import { getColumnUniqueKey, parseErrorKey } from '../components/DataInputVirtualScroll/utils/validationUtils.js';

export const historyOperations = {
  /**
   * 실행 취소
   */
  undo() {
    const prevState = this.history.undo();
    if (!prevState) {
      this._updateUndoRedoState();
      return false;
    }

    const currentRows = [...this.legacyStore.state.epidemic.rows];
    const currentErrors = new Map(this.legacyStore.state.epidemic.validationState.errors);
    const columnMetas = this.getColumnMetas();

    if (this.legacyStore) {
      this.legacyStore.commit('epidemic/SET_INITIAL_DATA', prevState);
    }

    this.enhancedManager.saveData(prevState);

    // 필터 상태 복원
    if (prevState.filterState) {
      this.filterState.activeFilters = new Map(prevState.filterState.activeFilters || []);
      this.filterState.isFiltered = prevState.filterState.isFiltered || false;
      this.filterState.filteredRowCount = prevState.filterState.filteredRowCount || 0;
      this.filterState.originalRowCount = prevState.filterState.originalRowCount || 0;
      this.filterState.lastAppliedAt = prevState.filterState.lastAppliedAt || null;
      
      this._updateFilteredRows();
      
      if (this.debug) {
        console.log('[StoreBridge] 필터 상태 복원 완료:', {
          isFiltered: this.filterState.isFiltered,
          activeFiltersCount: this.filterState.activeFilters.size,
          filteredRowCount: this.filterState.filteredRowCount
        });
      }
    } else {
      this.clearAllFilters();
    }

    // Validation 오류 복원
    if (prevState.validationErrors && typeof prevState.validationErrors === 'object') {
      if (this.validationManager) {
        this.validationManager.clearAllErrors();
      }
      
      const restoredErrors = new Map();
      Object.entries(prevState.validationErrors).forEach(([key, errorData]) => {
        const message = errorData.message || errorData;
        restoredErrors.set(key, { message, timestamp: errorData.timestamp || Date.now() });
      });
      
      currentErrors.forEach((error, key) => {
        // [Fix] 고유 식별자 키 파싱 로직 개선
        const parsed = parseErrorKey(key);
        let rowIndex, colIndex;
        let foundColumn = false;

        if (parsed) {
          rowIndex = parsed.rowIndex;
          const uniqueKey = parsed.uniqueKey;
          
          // 1. 고유 키로 컬럼 찾기
          const colMeta = columnMetas.find(c => getColumnUniqueKey(c) === uniqueKey);
          if (colMeta) {
            colIndex = colMeta.colIndex;
            foundColumn = true;
          } else {
            // 2. Fallback: 고유 키가 숫자인지 확인 (구버전 키: row_col)
            const parsedCol = parseInt(uniqueKey, 10);
            if (!isNaN(parsedCol)) {
              colIndex = parsedCol;
              foundColumn = true;
            }
          }
        } 

        // 컬럼을 찾지 못했거나 rowIndex가 유효하지 않으면 스킵
        if (!foundColumn || rowIndex === undefined || colIndex === undefined) return;
        
        if (prevState.rows[rowIndex] && currentRows[rowIndex]) {
          const prevValue = this._getCellValueByIndex(prevState.rows[rowIndex], colIndex, columnMetas);
          const currentValue = this._getCellValueByIndex(currentRows[rowIndex], colIndex, columnMetas);
          
          if (prevValue === currentValue && !restoredErrors.has(key)) {
            // 값이 변하지 않았다면 오류 유지
            restoredErrors.set(key, error);
          }
        }
      });
      
      this.legacyStore.commit('epidemic/SET_VALIDATION_ERRORS', restoredErrors);
    }
    
    this._updateUndoRedoState();
    console.log('[StoreBridge] undo 완료 - canUndo:', this.canUndo, 'canRedo:', this.canRedo);
    
    return true;
  },
  
  /**
   * 재실행
   */
  redo() {
    const nextState = this.history.redo();
    if (!nextState) {
      this._updateUndoRedoState();
      return false;
    }

    const currentRows = [...this.legacyStore.state.epidemic.rows];
    const currentErrors = new Map(this.legacyStore.state.epidemic.validationState.errors);
    const columnMetas = this.getColumnMetas();

    if (this.legacyStore) {
      this.legacyStore.commit('SET_INITIAL_DATA', nextState);
    }

    this.enhancedManager.saveData(nextState);

    // 필터 상태 복원
    if (nextState.filterState) {
      this.filterState.activeFilters = new Map(nextState.filterState.activeFilters || []);
      this.filterState.isFiltered = nextState.filterState.isFiltered || false;
      this.filterState.filteredRowCount = nextState.filterState.filteredRowCount || 0;
      this.filterState.originalRowCount = nextState.filterState.originalRowCount || 0;
      this.filterState.lastAppliedAt = nextState.filterState.lastAppliedAt || null;
      
      this._updateFilteredRows();
      
      if (this.debug) {
        console.log('[StoreBridge] 필터 상태 복원 완료:', {
          isFiltered: this.filterState.isFiltered,
          activeFiltersCount: this.filterState.activeFilters.size,
          filteredRowCount: this.filterState.filteredRowCount
        });
      }
    } else {
      this.clearAllFilters();
    }

    // Validation 오류 복원
    if (nextState.validationErrors && typeof nextState.validationErrors === 'object') {
      if (this.validationManager) {
        this.validationManager.clearAllErrors();
      }
      
      const restoredErrors = new Map();
      Object.entries(nextState.validationErrors).forEach(([key, errorData]) => {
        const message = errorData.message || errorData;
        restoredErrors.set(key, { message, timestamp: errorData.timestamp || Date.now() });
      });
      
      currentErrors.forEach((error, key) => {
        // [Fix] 고유 식별자 키 파싱 로직 개선
        const parsed = parseErrorKey(key);
        let rowIndex, colIndex;
        let foundColumn = false;

        if (parsed) {
          rowIndex = parsed.rowIndex;
          const uniqueKey = parsed.uniqueKey;
          
          // 1. 고유 키로 컬럼 찾기
          const colMeta = columnMetas.find(c => getColumnUniqueKey(c) === uniqueKey);
          if (colMeta) {
            colIndex = colMeta.colIndex;
            foundColumn = true;
          } else {
            // 2. Fallback: 고유 키가 숫자인지 확인 (구버전 키: row_col)
            const parsedCol = parseInt(uniqueKey, 10);
            if (!isNaN(parsedCol)) {
              colIndex = parsedCol;
              foundColumn = true;
            }
          }
        } 

        // 컬럼을 찾지 못했거나 rowIndex가 유효하지 않으면 스킵
        if (!foundColumn || rowIndex === undefined || colIndex === undefined) return;
        
        if (nextState.rows[rowIndex] && currentRows[rowIndex]) {
          const nextValue = this._getCellValueByIndex(nextState.rows[rowIndex], colIndex, columnMetas);
          const currentValue = this._getCellValueByIndex(currentRows[rowIndex], colIndex, columnMetas);
          
          if (nextValue === currentValue && !restoredErrors.has(key)) {
            // 값이 변하지 않았다면 오류 유지
            restoredErrors.set(key, error);
          }
        }
      });
      
      this.legacyStore.commit('epidemic/SET_VALIDATION_ERRORS', restoredErrors);
    }
    
    this._updateUndoRedoState();
    console.log('[StoreBridge] redo 완료 - canUndo:', this.canUndo, 'canRedo:', this.canRedo);
    
    return true;
  },
  
  /**
   * 시트 초기화
   */
  resetSheet() {
    this._captureSnapshot('resetSheet');
    
    if (this.validationManager) {
      this.validationManager.clearAllErrors();
    }
    
    const result = this.legacyStore.dispatch('epidemic/resetSheet');
    this.saveCurrentState();
    return result;
  },
  
  /**
   * 현재 Vuex state를 깊은 복사해 HistoryManager에 저장합니다.
   * 반드시 "변경 전" 시점에 호출해야 합니다.
   * @param {string} action 액션 이름
   * @param {object} [meta] 추가 메타
   */
  _captureSnapshot(action = 'unknown', meta = {}) {
    if (!this.legacyStore) return;
    
    const validationErrors = {};
    const currentErrors = this.legacyStore.state.epidemic.validationState?.errors;
    if (currentErrors && currentErrors instanceof Map) {
      for (const [key, error] of currentErrors) {
        validationErrors[key] = {
          message: error.message || error,
          timestamp: error.timestamp || Date.now()
        };
      }
    }
    
    const filterState = {
      activeFilters: Array.from(this.filterState.activeFilters.entries()),
      isFiltered: this.filterState.isFiltered,
      filteredRowCount: this.filterState.filteredRowCount,
      originalRowCount: this.filterState.originalRowCount,
      lastAppliedAt: this.filterState.lastAppliedAt
    };
    
    const cloned = JSON.parse(JSON.stringify({
      headers: this.legacyStore.state.epidemic.headers,
      rows: this.legacyStore.state.epidemic.rows,
      settings: {
        isIndividualExposureColumnVisible: this.legacyStore.state.settings.isIndividualExposureColumnVisible,
        isConfirmedCaseColumnVisible: this.legacyStore.state.settings.isConfirmedCaseColumnVisible
      },
      validationErrors,
      validationSchemaVersion: this.legacyStore.state.epidemic.validationState?.version ?? 0,
      filterState
    }));
    
    this.history.saveSnapshot(cloned, action, meta);
    this._updateUndoRedoState();
    
    if (this.debug) {
      console.log(`[StoreBridge] 스냅샷 캡처 완료: ${action}`, {
        hasFilterState: !!cloned.filterState,
        filterIsFiltered: cloned.filterState?.isFiltered,
        filterCount: cloned.filterState?.activeFilters?.length || 0
      });
    }
  },
  
  /**
   * 초기 undo/redo 상태 업데이트
   */
  _updateUndoRedoState() {
    this._canUndo.value = this.history.canUndo();
    this._canRedo.value = this.history.canRedo();
  }
};
