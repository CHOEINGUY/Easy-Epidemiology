/**
 * FilterRowValidationManager
 * 
 * 필터 기능과 행 삭제/추가에 따른 CSS 위치 변경 로직을 통합하여 관리하는 클래스
 * 열 변경 관련 로직은 전혀 건드리지 않고, 필터와 행 변경만 통합하여 관리 복잡성을 줄임
 */
export class FilterRowValidationManager {
  constructor() {
    // 필터 관련 상태
    this.filterMappings = new Map(); // 원본 인덱스 → 가상 인덱스
    this.isFiltered = false;
    this.filteredRows = [];
    
    // 행 변경 관련 상태
    this.rowMappings = new Map();    // 행 변경 매핑
    this.deletedRowIndices = [];     // 삭제된 행 인덱스들
    this.addedRowIndices = [];       // 추가된 행 인덱스들
    
    // 통합 상태
    this.combinedMappings = new Map(); // 통합 매핑
    this.validationErrors = new Map();
    
    // 디버그 모드
    this.debug = false;
  }

  /**
   * 필터 상태 업데이트
   * @param {boolean} isFiltered - 필터 적용 여부
   * @param {Array} filteredRows - 필터된 행 데이터 (원본 인덱스 포함)
   * @param {Map} validationErrors - 전체 유효성 검사 오류
   */
  updateFilterState(isFiltered, filteredRows, validationErrors) {
    this.isFiltered = isFiltered;
    this.filteredRows = filteredRows || [];
    this.validationErrors = validationErrors || new Map();
    
    this._updateFilterMappings();
    this._updateCombinedMappings();
    
    if (this.debug) {
      console.log('[FilterRowValidationManager] 필터 상태 업데이트:', {
        isFiltered,
        filteredRowsCount: this.filteredRows.length,
        validationErrorsCount: this.validationErrors.size
      });
    }
  }

  /**
   * 행 변경 처리
   * @param {Array} deletedRowIndices - 삭제된 행 인덱스들
   * @param {Array} addedRowIndices - 추가된 행 인덱스들
   */
  handleRowChanges(deletedRowIndices, addedRowIndices) {
    this.deletedRowIndices = deletedRowIndices || [];
    this.addedRowIndices = addedRowIndices || [];
    
    this._updateRowMappings();
    this._updateCombinedMappings();
    
    if (this.debug) {
      console.log('[FilterRowValidationManager] 행 변경 처리:', {
        deletedRowIndices: this.deletedRowIndices,
        addedRowIndices: this.addedRowIndices
      });
    }
  }

  /**
   * 특정 셀의 에러 가시성 확인
   * @param {number} rowIndex - 행 인덱스 (가상 또는 원본)
   * @returns {boolean} 에러가 보이는지 여부
   */
  isErrorVisible(rowIndex) {
    if (!this.isFiltered) {
      // 필터가 적용되지 않은 경우: 행 변경만 고려
      return this._isRowVisibleAfterChanges(rowIndex);
    }
    
    // 필터가 적용된 경우: 필터와 행 변경 모두 고려
    // rowIndex는 이미 가상 인덱스이므로 직접 사용
    if (rowIndex >= this.filteredRows.length) {
      return false; // 필터된 행 범위를 벗어난 인덱스
    }
    
    const filteredRow = this.filteredRows[rowIndex];
    if (!filteredRow || filteredRow._originalIndex === undefined) {
      return false; // 필터에서 제외된 행
    }
    
    const originalRowIndex = filteredRow._originalIndex;
    
    // 필터된 행 중에서 행 변경을 고려
    return this._isRowVisibleAfterChanges(originalRowIndex);
  }

  /**
   * 보이는 에러만 반환
   * @returns {Map} 보이는 유효성 검사 오류들
   */
  getVisibleErrors() {
    if (!this.isFiltered && this.deletedRowIndices.length === 0) {
      // 필터도 없고 행 변경도 없는 경우: 전체 에러 반환
      return this.validationErrors;
    }
    
    const visibleErrors = new Map();
    
    this.validationErrors.forEach((error, key) => {
      const parts = key.split('_');
      const rowIndexStr = parts[0];
      const uniqueKey = parts.slice(1).join('_'); // 나머지 모든 부분을 uniqueKey로
      const originalRowIndex = parseInt(rowIndexStr, 10);
      
      if (this.debug) {
        console.log('[FilterRowValidationManager] 에러 처리:', {
          key,
          originalRowIndex,
          uniqueKey,
          isFiltered: this.isFiltered,
          filteredRowsCount: this.filteredRows.length
        });
      }
      
      // 행 변경을 고려한 실제 인덱스 계산
      const actualRowIndex = this._getActualRowIndexAfterChanges(originalRowIndex);
      
      if (actualRowIndex === null) {
        if (this.debug) {
          console.log('[FilterRowValidationManager] 삭제된 행의 에러 제외:', key);
        }
        return; // 삭제된 행의 에러는 제외
      }
      
      // 필터가 적용된 경우 필터링 확인
      if (this.isFiltered) {
        const isInFilteredRows = this.filteredRows.some(row => 
          row._originalIndex === originalRowIndex
        );
        
        if (!isInFilteredRows) {
          if (this.debug) {
            console.log('[FilterRowValidationManager] 필터에서 제외된 행의 에러 제외:', key);
          }
          return; // 필터에서 제외된 행의 에러는 제외
        }
      }
      
      // 새로운 키 생성 (실제 인덱스 사용)
      // uniqueKey가 이미 전체 키이므로 그대로 사용
      const newKey = `${actualRowIndex}_${uniqueKey}`;
      visibleErrors.set(newKey, error);
      
      if (this.debug) {
        console.log('[FilterRowValidationManager] 에러 추가:', {
          oldKey: key,
          newKey,
          error
        });
      }
    });
    
    if (this.debug) {
      console.log('[FilterRowValidationManager] 보이는 에러 계산:', {
        totalErrors: this.validationErrors.size,
        visibleErrors: visibleErrors.size
      });
    }
    
    return visibleErrors;
  }

  /**
   * 특정 셀의 에러 메시지 조회
   * @param {number} rowIndex - 행 인덱스
   * @param {number} colIndex - 열 인덱스
   * @param {Object} columnMeta - 열 메타데이터
   * @returns {string|null} 에러 메시지
   */
  getErrorMessage(rowIndex, colIndex, columnMeta) {
    if (!columnMeta) return null;
    
    // 고유 키 생성 (ValidationManager와 동일한 방식)
    const uniqueKey = this._generateColumnUniqueKey(columnMeta);
    
    // 원본 인덱스로 변환
    const originalRowIndex = this._getOriginalRowIndex(rowIndex);
    const key = `${originalRowIndex}_${uniqueKey}`;
    
    return this.validationErrors.get(key) || null;
  }

  /**
   * 행 변경 후 재매핑된 에러 반환
   * @param {Map} currentErrors - 현재 에러 맵
   * @returns {Map} 재매핑된 에러 맵
   */
  getRemappedErrors(currentErrors) {
    if (!currentErrors || currentErrors.size === 0) {
      return new Map();
    }
    
    const remappedErrors = new Map();
    
    currentErrors.forEach((error, key) => {
      const parts = key.split('_');
      const rowIndexStr = parts[0];
      const uniqueKey = parts.slice(1).join('_'); // 나머지 모든 부분을 uniqueKey로
      const originalRowIndex = parseInt(rowIndexStr, 10);
      
      // 행 변경을 고려한 새로운 인덱스 계산
      const newRowIndex = this._getNewRowIndexAfterChanges(originalRowIndex);
      
      if (newRowIndex !== null) {
        const newKey = `${newRowIndex}_${uniqueKey}`;
        remappedErrors.set(newKey, error);
      }
    });
    
    if (this.debug) {
      console.log('[FilterRowValidationManager] 에러 재매핑:', {
        originalErrors: currentErrors.size,
        remappedErrors: remappedErrors.size
      });
    }
    
    return remappedErrors;
  }

  /**
   * 디버그 모드 설정
   * @param {boolean} enabled - 디버그 모드 활성화 여부
   */
  setDebugMode(enabled) {
    this.debug = enabled;
  }

  /**
   * 현재 상태 정보 반환 (디버깅용)
   * @returns {Object} 현재 상태 정보
   */
  getStateInfo() {
    return {
      isFiltered: this.isFiltered,
      filteredRowsCount: this.filteredRows.length,
      deletedRowIndices: this.deletedRowIndices,
      addedRowIndices: this.addedRowIndices,
      validationErrorsCount: this.validationErrors.size,
      filterMappingsSize: this.filterMappings.size,
      rowMappingsSize: this.rowMappings.size,
      combinedMappingsSize: this.combinedMappings.size
    };
  }

  // === 내부 메서드들 ===

  /**
   * 필터 매핑 업데이트
   * @private
   */
  _updateFilterMappings() {
    this.filterMappings.clear();
    
    if (!this.isFiltered || !this.filteredRows.length) {
      return;
    }
    
    this.filteredRows.forEach((row, virtualIndex) => {
      if (row._originalIndex !== undefined) {
        this.filterMappings.set(row._originalIndex, virtualIndex);
      }
    });
  }

  /**
   * 행 변경 매핑 업데이트
   * @private
   */
  _updateRowMappings() {
    this.rowMappings.clear();
    
    if (this.deletedRowIndices.length === 0 && this.addedRowIndices.length === 0) {
      return;
    }
    
    // 삭제된 행들 처리
    this.deletedRowIndices.forEach(deletedIndex => {
      this.rowMappings.set(deletedIndex, null); // 삭제된 행은 null로 매핑
    });
    
    // 추가된 행들 처리 (현재는 단순화)
    // 실제로는 더 복잡한 로직이 필요할 수 있음
  }

  /**
   * 통합 매핑 업데이트
   * @private
   */
  _updateCombinedMappings() {
    this.combinedMappings.clear();
    
    // 필터와 행 변경을 모두 고려한 매핑 생성
    // 현재는 단순화된 구현
  }

  /**
   * 가상 인덱스를 원본 인덱스로 변환
   * @param {number} virtualIndex - 가상 인덱스
   * @returns {number} 원본 인덱스
   * @private
   */
  _getOriginalRowIndex(virtualIndex) {
    if (!this.isFiltered) {
      return virtualIndex; // 필터가 없으면 그대로 반환
    }
    
    // 필터된 행에서 원본 인덱스 찾기
    const filteredRow = this.filteredRows[virtualIndex];
    return filteredRow ? filteredRow._originalIndex : virtualIndex;
  }

  /**
   * 행 변경 후 실제 인덱스 계산
   * @param {number} originalIndex - 원본 인덱스
   * @returns {number|null} 실제 인덱스 (삭제된 경우 null)
   * @private
   */
  _getActualRowIndexAfterChanges(originalIndex) {
    // 삭제된 행인지 확인
    if (this.deletedRowIndices.includes(originalIndex)) {
      return null;
    }
    
    // 삭제된 행들 중에서 현재 인덱스보다 작은 것들의 개수만큼 빼기
    const deletedBeforeCount = this.deletedRowIndices.filter(
      deletedIndex => deletedIndex < originalIndex
    ).length;
    
    return originalIndex - deletedBeforeCount;
  }

  /**
   * 행 변경 후 새로운 인덱스 계산 (에러 재매핑용)
   * @param {number} originalIndex - 원본 인덱스
   * @returns {number|null} 새로운 인덱스 (삭제된 경우 null)
   * @private
   */
  _getNewRowIndexAfterChanges(originalIndex) {
    return this._getActualRowIndexAfterChanges(originalIndex);
  }

  /**
   * 행 변경 후 가시성 확인
   * @param {number} rowIndex - 행 인덱스
   * @returns {boolean} 보이는지 여부
   * @private
   */
  _isRowVisibleAfterChanges(rowIndex) {
    return !this.deletedRowIndices.includes(rowIndex);
  }

  /**
   * 열 고유 키 생성 (ValidationManager와 동일한 방식)
   * @param {Object} columnMeta - 열 메타데이터
   * @returns {string} 고유 키
   * @private
   */
  _generateColumnUniqueKey(columnMeta) {
    if (!columnMeta) return '';
    
    // ValidationManager의 getColumnUniqueKey 메서드와 동일한 로직
    if (columnMeta.type === 'serial') return 'serial';
    if (columnMeta.type === 'isPatient') return 'isPatient';
    if (columnMeta.type === 'isConfirmedCase') return 'isConfirmedCase';
    if (columnMeta.type === 'individualExposureTime') return 'individualExposureTime';
    if (columnMeta.type === 'symptomOnset') return 'symptomOnset';
    
    // 배열 기반 열들
    if (columnMeta.dataKey && columnMeta.cellIndex !== null && columnMeta.cellIndex !== undefined) {
      return `${columnMeta.dataKey}_${columnMeta.cellIndex}`;
    }
    
    // 단일 값 열들
    if (columnMeta.dataKey) {
      return columnMeta.dataKey;
    }
    
    return '';
  }
}

/**
 * CSS 업데이트를 위한 헬퍼 클래스
 */
export class FilterCSSUpdater {
  /**
   * 필터 상태 변경 시 CSS 업데이트 처리
   * @param {boolean} newIsFiltered - 새로운 필터 상태
   * @param {boolean} oldIsFiltered - 이전 필터 상태
   * @param {Object} store - Vuex 스토어
   * @param {Function} nextTick - Vue의 nextTick 함수
   */
  static handleFilterStateChange(newIsFiltered, oldIsFiltered, store, nextTick) {
    if (newIsFiltered !== oldIsFiltered) {
      console.log('[FilterCSSUpdater] 필터 상태 변경 감지:', {
        oldIsFiltered,
        newIsFiltered
      });
      
      // 강제로 CSS 재계산
      nextTick(() => {
        // 전역 이벤트 발생으로 CSS 업데이트 트리거
        window.dispatchEvent(new CustomEvent('filter-state-changed', {
          detail: { isFiltered: newIsFiltered }
        }));
      });
    }
  }
} 