/**
 * StoreBridge Getters & Utils
 * Getters, 유틸리티 메서드, 데이터 조회 메서드
 */

export const getterOperations = {
  // ===== 편집 상태 관련 메서드 =====
  
  /**
   * 편집 중인지 여부 반환
   */
  isEditing() {
    return this.enhancedManager.isEditing();
  },
  
  /**
   * 원래 값 반환
   */
  getOriginalValue() {
    return this.enhancedManager.getOriginalValue();
  },
  
  /**
   * 임시 값 반환
   */
  getTempValue() {
    return this.enhancedManager.getTempValue();
  },
  
  /**
   * 현재 편집 정보 반환
   */
  getCurrentEditInfo() {
    return this.enhancedManager.getCurrentEditInfo();
  },
  
  // ===== 유틸리티 메서드 =====
  
  /**
   * 대기 중인 저장 작업 처리
   */
  processPendingSaves() {
    this.enhancedManager.processPendingSaves();
  },
  
  /**
   * 대기 중인 저장 작업 취소
   */
  cancelPendingSaves() {
    this.enhancedManager.cancelPendingSaves();
  },
  
  /**
   * 저장 지연 시간 설정
   */
  setSaveDelay(delay) {
    this.enhancedManager.setSaveDelay(delay);
  },
  
  /**
   * 브리지 상태 검증
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
  },
  
  /**
   * 디버깅을 위한 상태 정보 반환
   */
  getDebugInfo() {
    return {
      isInitialized: this.isInitialized,
      legacyStore: !!this.legacyStore,
      enhancedManager: this.enhancedManager.getDebugInfo()
    };
  },
  
  /**
   * 브리지 초기화
   */
  reset() {
    this.enhancedManager.reset();
    console.log('[StoreBridge] 브리지가 초기화되었습니다.');
  },
  
  /**
   * 데이터를 로드하고 필요한 경우 마이그레이션을 실행합니다.
   */
  loadData() {
    return this.enhancedManager.loadData();
  },
  
  /**
   * 현재 상태를 새로운 형식으로 저장합니다.
   */
  saveCurrentState() {
    return this.enhancedManager.saveCurrentState();
  },
  
  /**
   * 셀 값 추출 헬퍼
   */
  _getCellValue(row, columnMeta) {
    if (!row || !columnMeta.dataKey) return '';
    
    if (columnMeta.cellIndex !== null && columnMeta.cellIndex !== undefined) {
      const arr = row[columnMeta.dataKey];
      return Array.isArray(arr) ? arr[columnMeta.cellIndex] || '' : '';
    } else {
      return row[columnMeta.dataKey] || '';
    }
  },

  /**
   * colIndex로 셀 값 추출 헬퍼 (Undo/Redo용)
   */
  _getCellValueByIndex(row, colIndex, columnMetas = null) {
    if (!row || colIndex === undefined) return '';
    
    const metas = columnMetas || this.getColumnMetas();
    const columnMeta = metas.find(meta => meta.colIndex === colIndex);
    
    if (!columnMeta) return '';
    
    return this._getCellValue(row, columnMeta);
  },

  /**
   * 행이 비어있는지 확인
   */
  _isEmptyRow(row) {
    if (!row) return true;
    
    const fields = ['isPatient', 'symptomOnset', 'individualExposureTime'];
    const arrayFields = ['basicInfo', 'clinicalSymptoms', 'dietInfo'];
    
    for (const field of fields) {
      if (row[field] && row[field].toString().trim() !== '') {
        return false;
      }
    }
    
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
  },

  /**
   * 열이 비어있는지 확인
   */
  _isEmptyColumn(columnMeta) {
    if (!columnMeta || !this.legacyStore) return true;
    
    const rows = this.legacyStore.state.epidemic.rows;
    if (!rows || rows.length === 0) return true;
    
    for (const row of rows) {
      const value = this._getCellValue(row, columnMeta);
      if (value && value.toString().trim() !== '') {
        return false;
      }
    }
    
    return true;
  },

  /**
   * 컬럼 메타데이터 가져오기 헬퍼
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
    
    // 확진여부 컬럼 (colIndex 2) - 가시성 체크 추가
    if (this.legacyStore.state.settings.isConfirmedCaseColumnVisible) {
      columnMetas.push({
        colIndex: colIndex++,
        dataKey: 'isConfirmedCase',
        cellIndex: null,
        type: 'isConfirmedCase',
        isEditable: true
      });
    }
    
    // 기본정보 컬럼들
    this.legacyStore.state.epidemic.headers.basic?.forEach((header, index) => {
      columnMetas.push({
        colIndex: colIndex++,
        dataKey: 'basicInfo',
        cellIndex: index,
        type: 'basic',
        isEditable: true
      });
    });
    
    // 임상증상 컬럼들
    this.legacyStore.state.epidemic.headers.clinical?.forEach((header, index) => {
      columnMetas.push({
        colIndex: colIndex++,
        dataKey: 'clinicalSymptoms',
        cellIndex: index,
        type: 'clinicalSymptoms',
        isEditable: true
      });
    });
    
    // 개별 노출시간 컬럼 (가시성이 활성화된 경우)
    if (this.legacyStore.state.settings.isIndividualExposureColumnVisible) {
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
    this.legacyStore.state.epidemic.headers.diet?.forEach((header, index) => {
      columnMetas.push({
        colIndex: colIndex++,
        dataKey: 'dietInfo',
        cellIndex: index,
        type: 'dietInfo',
        isEditable: true
      });
    });
    
    return columnMetas;
  },

  /**
   * 모든 데이터를 한꺼번에 가져옵니다. (내보내기용)
   */
  getAllData() {
    if (!this.legacyStore) return { headers: [], rows: [] };
    return {
      headers: this.legacyStore.state.epidemic.headers,
      rows: this.legacyStore.state.epidemic.rows
    };
  },

  /**
   * Enter 키 처리
   */
  handleEnter(payload) {
    this._captureSnapshot('handleEnter', payload);
    const result = this.legacyStore.dispatch('epidemic/handleEnter', payload);
    this.saveCurrentState();
    return result;
  },

  /**
   * 증상 간격 업데이트
   */
  updateSymptomInterval(value) {
    this._captureSnapshot('updateSymptomInterval', { value });
    const result = this.legacyStore.dispatch('settings/updateSymptomInterval', value);
    this.saveCurrentState();
    return result;
  },

  /**
   * 노출 날짜시간 업데이트
   */
  updateExposureDateTime(value) {
    this._captureSnapshot('updateExposureDateTime', { value });
    const result = this.legacyStore.dispatch('settings/updateExposureDateTime', value);
    this.saveCurrentState();
    return result;
  },

  /**
   * 잠복기 간격 업데이트
   */
  updateIncubationInterval(value) {
    this._captureSnapshot('updateIncubationInterval', { value });
    const result = this.legacyStore.dispatch('settings/updateIncubationInterval', value);
    this.saveCurrentState();
    return result;
  },

  /**
   * 확진자 여부 값 업데이트
   */
  updateConfirmedCase(payload) {
    this._captureSnapshot('updateConfirmedCase', payload);
    const result = this.legacyStore.dispatch('epidemic/updateConfirmedCase', payload);
    this.saveCurrentState();
    return result;
  },

  /**
   * 여러 헤더 일괄 업데이트
   */
  updateHeadersBatch(payload) {
    this._captureSnapshot('updateHeadersBatch', payload);
    const result = this.legacyStore.dispatch('epidemic/updateHeadersBatch', payload);
    this.saveCurrentState();
    return result;
  },

  /**
   * 엑셀에서 헤더 업데이트
   */
  async updateHeadersFromExcel(headers) {
    this._captureSnapshot('updateHeadersFromExcel', { headerCount: Object.keys(headers).length });
    const result = await this.legacyStore.dispatch('epidemic/updateHeadersFromExcel', headers);
    this.saveCurrentState();
    return result;
  },

  /**
   * 엑셀에서 행 추가
   */
  async addRowsFromExcel(rows) {
    this._captureSnapshot('addRowsFromExcel', { rowCount: rows.length });
    const result = await this.legacyStore.dispatch('epidemic/addRowsFromExcel', rows);
    this.saveCurrentState();
    
    if (this.validationManager) {
      const columnMetas = this.getColumnMetas();
      await this.validationManager.handleDataImport(rows, columnMetas);
    }
    
    return result;
  }
};
