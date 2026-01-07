/**
 * StoreBridge Filter Operations
 * 필터링 관련 메서드
 */

export const filterOperations = {
  /**
   * 환자여부 필터 토글 (1 또는 0)
   * @param {string} value - '1' 또는 '0'
   */
  togglePatientFilter(value) {
    const colIndex = 1;
    const currentFilter = this.filterState.activeFilters.get(colIndex);
    
    console.log('[Filter] 현재 필터 상태:', { currentFilter });
    
    let newValues;
    
    if (!currentFilter) {
      console.log('[Filter] 필터 없음 - 단일 값 선택');
      newValues = [value];
    } else {
      newValues = [...currentFilter.values];
      const valueIndex = newValues.indexOf(value);
      
      console.log('[Filter] 값 토글:', { value, valueIndex, newValues });
      
      if (valueIndex > -1) {
        newValues.splice(valueIndex, 1);
        console.log('[Filter] 값 제거됨:', newValues);
      } else {
        newValues.push(value);
        console.log('[Filter] 값 추가됨:', newValues);
      }
    }
    
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
  },

  /**
   * 임상증상 필터 토글 (1 또는 0)
   * @param {number} colIndex - 컬럼 인덱스
   * @param {string} value - '1' 또는 '0' 또는 'empty'
   */
  toggleClinicalFilter(colIndex, value) {
    console.log('[Filter] toggleClinicalFilter 호출:', { colIndex, value });
    
    const currentFilter = this.filterState.activeFilters.get(colIndex);
    
    let newValues;
    
    if (!currentFilter) {
      newValues = [value];
    } else {
      newValues = [...currentFilter.values];
      const valueIndex = newValues.indexOf(value);
      
      if (valueIndex > -1) {
        newValues.splice(valueIndex, 1);
      } else {
        newValues.push(value);
      }
    }
    
    if (newValues.length === 0) {
      this.removeFilter(colIndex);
      return;
    }
    
    this.applyFilter(colIndex, {
      type: 'binary',
      values: newValues,
      columnType: 'clinicalSymptoms'
    });
  },

  /**
   * 식단 필터 토글 (1 또는 0)
   * @param {number} colIndex - 컬럼 인덱스
   * @param {string} value - '1' 또는 '0' 또는 'empty'
   */
  toggleDietFilter(colIndex, value) {
    console.log('[Filter] toggleDietFilter 호출:', { colIndex, value });
    
    const currentFilter = this.filterState.activeFilters.get(colIndex);
    
    let newValues;
    
    if (!currentFilter) {
      newValues = [value];
    } else {
      newValues = [...currentFilter.values];
      const valueIndex = newValues.indexOf(value);
      
      if (valueIndex > -1) {
        newValues.splice(valueIndex, 1);
      } else {
        newValues.push(value);
      }
    }
    
    if (newValues.length === 0) {
      this.removeFilter(colIndex);
      return;
    }
    
    this.applyFilter(colIndex, {
      type: 'binary',
      values: newValues,
      columnType: 'dietInfo'
    });
  },

  /**
   * 기본정보 필터 토글 (텍스트 검색)
   * @param {number} colIndex - 컬럼 인덱스
   * @param {string} value - 검색할 텍스트 또는 'empty'
   */
  toggleBasicFilter(colIndex, value) {
    console.log('[Filter] toggleBasicFilter 호출:', { colIndex, value });
    
    const currentFilter = this.filterState.activeFilters.get(colIndex);
    
    let newValues;
    
    if (!currentFilter) {
      newValues = [value];
    } else {
      newValues = [...currentFilter.values];
      const valueIndex = newValues.indexOf(value);
      
      if (valueIndex > -1) {
        newValues.splice(valueIndex, 1);
      } else {
        newValues.push(value);
      }
    }
    
    if (newValues.length === 0) {
      this.removeFilter(colIndex);
      return;
    }
    
    this.applyFilter(colIndex, {
      type: 'text',
      values: newValues,
      columnType: 'basicInfo'
    });
  },

  /**
   * 확진여부 필터 토글
   */
  toggleConfirmedFilter(colIndex, value) {
    console.log('[Filter] toggleConfirmedFilter 호출:', { colIndex, value });
    
    const currentFilter = this.filterState.activeFilters.get(colIndex);
    
    let newValues;
    
    if (!currentFilter) {
      newValues = [value];
    } else {
      newValues = [...currentFilter.values];
      const valueIndex = newValues.indexOf(value);
      
      if (valueIndex > -1) {
        newValues.splice(valueIndex, 1);
      } else {
        newValues.push(value);
      }
    }
    
    if (newValues.length === 0) {
      this.removeFilter(colIndex);
      return;
    }
    
    this.applyFilter(colIndex, {
      type: 'text',
      values: newValues,
      columnType: 'isConfirmedCase'
    });
  },

  /**
   * 날짜/시간 필터 토글 (특정 날짜만)
   * @param {number} colIndex - 컬럼 인덱스
   * @param {string} dateValue - 날짜 값 (yyyy-mm-dd 형식)
   */
  toggleDateTimeFilter(colIndex, dateValue) {
    console.log('[Filter] toggleDateTimeFilter 호출:', { colIndex, dateValue });
    
    const currentFilter = this.filterState.activeFilters.get(colIndex);
    
    let newValues;
    
    if (!currentFilter) {
      newValues = [dateValue];
    } else {
      newValues = [...currentFilter.values];
      const valueIndex = newValues.indexOf(dateValue);
      
      if (valueIndex > -1) {
        newValues.splice(valueIndex, 1);
      } else {
        newValues.push(dateValue);
      }
    }
    
    if (newValues.length === 0) {
      this.removeFilter(colIndex);
      return;
    }
    
    this.applyFilter(colIndex, {
      type: 'date',
      values: newValues,
      columnType: this._getColumnTypeByIndex(colIndex)
    });
  },

  /**
   * 필터 적용
   * @param {number} colIndex - 컬럼 인덱스
   * @param {Object} filterConfig - 필터 설정
   */
  applyFilter(colIndex, filterConfig) {
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
  },

  /**
   * 모든 필터 해제
   */
  clearAllFilters() {
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
  },

  /**
   * 개별 필터 제거
   * @param {number} colIndex - 컬럼 인덱스
   */
  removeFilter(colIndex) {
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
  },

  /**
   * 필터된 행 업데이트
   */
  _updateFilteredRows() {
    if (!this.legacyStore) {
      return;
    }
    
    const rows = this.legacyStore.state.epidemic.rows;
    this.filterState.originalRowCount = rows.length;
    
    if (this.filterState.activeFilters.size === 0) {
      this.filterState.isFiltered = false;
      this.filterState.filteredRowCount = rows.length;
      this._filteredRowMapping.clear();
      this._originalToFilteredMapping.clear();
      return;
    }
    
    const filteredIndices = [];
    rows.forEach((row, originalIndex) => {
      if (this._applyFilters(row)) {
        filteredIndices.push(originalIndex);
      }
    });
    
    this.filterState.filteredRowCount = filteredIndices.length;
    this.filterState.isFiltered = true;
    
    this._filteredRowMapping.clear();
    this._originalToFilteredMapping.clear();
    
    filteredIndices.forEach((originalIndex, filteredIndex) => {
      this._filteredRowMapping.set(filteredIndex, originalIndex);
      this._originalToFilteredMapping.set(originalIndex, filteredIndex);
    });
  },

  /**
   * 필터 적용 로직
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
  },

  /**
   * 개별 필터 매칭
   * @param {Object} row - 행 데이터
   * @param {number} colIndex - 컬럼 인덱스
   * @param {Object} filterConfig - 필터 설정
   * @returns {boolean} 매칭 여부
   */
  _matchesFilter(row, colIndex, filterConfig) {
    // 1. 컬럼 메타데이터 가져오기
    const columnMetas = this.getColumnMetas();
    const columnMeta = columnMetas.find(c => c.colIndex === colIndex);
    
    // 메타데이터가 없는 경우 기본적으로 통과 (필터링 불가)
    if (!columnMeta) return true;
    
    // 2. 셀 값 추출
    let cellValue = '';
    
    if (columnMeta.dataKey) {
      if (columnMeta.cellIndex !== null && columnMeta.cellIndex !== undefined) {
        // 배열 데이터 (clinicalSymptoms, dietInfo, basicInfo)
        cellValue = String(row[columnMeta.dataKey]?.[columnMeta.cellIndex] ?? '');
      } else {
        // 단일 데이터 (isPatient, isConfirmedCase, symptomOnset, individualExposureTime)
        cellValue = String(row[columnMeta.dataKey] ?? '');
      }
    }
    
    // 3. 필터링 로직 공통 처리
    
    // Empty 값 처리 (null, undefined, 빈 문자열)
    const isEmpty = cellValue === '' || cellValue === 'null' || cellValue === 'undefined';
    const allowEmpty = filterConfig.values.includes('empty');
    
    if (isEmpty) {
      return allowEmpty;
    }

    // 날짜 타입 처리 (symptomOnset, individualExposureTime)
    if (columnMeta.type === 'symptomOnset' || columnMeta.type === 'individualExposureTime') {
      const extractDatePart = (dateTimeString) => {
        if (!dateTimeString || dateTimeString === '') return '';
        const dateMatch = dateTimeString.match(/^(\d{4}-\d{2}-\d{2})/);
        if (dateMatch) return dateMatch[1];
        const altDateMatch = dateTimeString.match(/^(\d{4}[/-]\d{2}[/-]\d{2})/);
        if (altDateMatch) return altDateMatch[1].replace(/[/]/g, '-');
        return dateTimeString;
      };
      
      const cellDatePart = extractDatePart(cellValue);
      
      return filterConfig.values.some(filterDate => {
        if (filterDate === 'empty') return false;
        return cellDatePart === filterDate;
      });
    }
    
    // 텍스트 검색 타입 처리 (basicInfo) - 부분 일치
    if (columnMeta.type === 'basic') {
      return filterConfig.values.some(filterValue => {
        if (filterValue === 'empty') return false;
        // 정확히 일치하거나 포함되는 경우 (여기서는 선택된 값들에 대해서는 정확히 일치를 기대하지만, 
        // toggleBasicFilter가 텍스트 검색 모드인 경우를 고려)
        return cellValue.toLowerCase() === filterValue.toLowerCase();
      });
    }

    // 그 외 (binary, string literal match)
    return filterConfig.values.includes(cellValue);
  },

  /**
   * Public 필터 매칭 메서드
   */
  matchesFilter(row, colIndex, filterConfig) {
    return this._matchesFilter(row, colIndex, filterConfig);
  },

  /**
   * 필터된 인덱스를 원본 인덱스로 변환
   */
  getOriginalIndexFromFiltered(filteredIndex) {
    if (!this.filterState.isFiltered) {
      return filteredIndex;
    }
    
    const originalIndex = this._filteredRowMapping.get(filteredIndex);
    return originalIndex !== undefined ? originalIndex : filteredIndex;
  },

  /**
   * 원본 인덱스를 필터된 인덱스로 변환
   */
  getFilteredIndexFromOriginal(originalIndex) {
    if (!this.filterState.isFiltered) {
      return originalIndex;
    }
    
    const filteredIndex = this._originalToFilteredMapping.get(originalIndex);
    return filteredIndex !== undefined ? filteredIndex : -1;
  },

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
  },

  /**
   * 필터 상태 복원 (페이지 새로고침 후에도 유지)
   */
  loadFilterState() {
    try {
      const savedData = localStorage.getItem('dataInputFilters');
      if (!savedData) return;
      
      const filterData = JSON.parse(savedData);
      
      this.filterState.activeFilters = new Map(filterData.activeFilters || []);
      this.filterState.isFiltered = filterData.isFiltered || false;
      this.filterState.lastAppliedAt = filterData.lastAppliedAt || null;
      
      if (this.filterState.isFiltered) {
        this._updateFilteredRows();
      }
      
      console.log('[Filter] 필터 상태 복원 완료');
    } catch (error) {
      console.error('[Filter] 필터 상태 복원 실패:', error);
      this.clearAllFilters();
    }
  },

  /**
   * 컬럼 인덱스로 컬럼 타입을 가져오는 헬퍼 메서드
   */
  _getColumnTypeByIndex(colIndex) {
    const columnMetas = this.getColumnMetas();
    const columnMeta = columnMetas.find(c => c.colIndex === colIndex);
    return columnMeta?.type || 'unknown';
  }
};
