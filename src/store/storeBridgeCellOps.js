/**
 * StoreBridge Cell Operations
 * 셀 편집, 저장, 삭제 관련 메서드
 */

export const cellOperations = {
  // ===== 셀 편집 관련 메서드 =====
  
  /**
   * 셀 편집을 시작합니다.
   * @param {Object} cellInfo - 셀 정보
   * @param {*} originalValue - 원래 값
   * @param {Object} columnMeta - 컬럼 메타 정보
   */
  startCellEdit(cellInfo, originalValue, columnMeta) {
    this.enhancedManager.startCellEdit(cellInfo, originalValue, columnMeta);
  },
  
  /**
   * 편집 중 임시 값을 업데이트합니다.
   * @param {*} value - 새로운 임시 값
   */
  updateTempValue(value) {
    this.enhancedManager.updateTempValue(value);
  },
  
  /**
   * 편집을 취소합니다.
   * @returns {Object|null} 취소된 편집 정보
   */
  cancelCellEdit() {
    return this.enhancedManager.cancelCellEdit();
  },
  
  /**
   * 편집을 완료합니다.
   * @returns {Object|null} 완료된 편집 정보
   */
  completeCellEdit() {
    return this.enhancedManager.completeCellEdit();
  },
  
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
        const row = this.legacyStore.state.epidemic.rows[rowIndex];
        if (!row) return undefined;
        if (cellIndex !== null && cellIndex !== undefined) {
          return row[key]?.[cellIndex];
        }
        return row[key];
      })();

      if (beforeValue !== value) {
        this._captureSnapshot('cell_edit', { rowIndex, colKey: key, cellIndex, before: beforeValue, after: value });
      }

      this.legacyStore.dispatch('epidemic/updateCell', payload);
      if (this.debug) {
        console.log('[StoreBridge] 기존 로직: 즉시 저장');
      }
      this.saveCurrentState();
    }
  },
  
  /**
   * 헤더 업데이트
   * @param {Object} payload - 업데이트 페이로드
   */
  updateHeader(payload) {
    this.legacyStore.dispatch('epidemic/updateHeader', payload);
  },
  
  /**
   * 단일 헤더 업데이트 (cellIndex가 null인 경우)
   * @param {Object} payload - 업데이트 페이로드
   */
  updateSingleHeader(payload) {
    this.legacyStore.dispatch('epidemic/updateHeader', { 
      headerType: payload.headerType, 
      index: null, 
      text: payload.text 
    });
  },
  
  /**
   * 개별 노출시간 업데이트
   * @param {Object} payload - 업데이트 페이로드
   */
  updateIndividualExposureTime(payload) {
    this.legacyStore.dispatch('epidemic/updateIndividualExposureTime', payload);
  },
  
  /**
   * 여러 셀 일괄 업데이트
   * @param {Object} payload - 업데이트 페이로드
   */
  updateCellsBatch(payload) {
    if (this.debug) {
      console.log('[StoreBridge] updateCellsBatch 호출됨:', payload);
    }
    this._captureSnapshot('updateCellsBatch', payload);
    const result = this.legacyStore.dispatch('epidemic/updateCellsBatch', payload);
    this.saveCurrentState();
    
    // 검증 처리: 업데이트된 셀들에 대해 validation 재실행
    if (this.validationManager && Array.isArray(payload)) {
      if (this.debug) {
        console.log('[StoreBridge] validationManager 존재함 (updateCellsBatch)');
      }
      
      const columnMetas = this.getColumnMetas();
      
      payload.forEach(update => {
        const { rowIndex, key, value, cellIndex } = update;
        
        // 해당하는 컬럼 메타데이터 찾기
        const targetColumns = columnMetas.filter(meta => 
          meta.dataKey === key && meta.cellIndex === cellIndex
        );
        
        if (this.debug) {
          console.log('[StoreBridge] targetColumns (updateCellsBatch):', targetColumns);
        }
        
        targetColumns.forEach(columnMeta => {
          if (this.debug) {
            console.log(`[StoreBridge] validation 재실행 (updateCellsBatch): row=${rowIndex}, col=${columnMeta.colIndex}, value="${value}", type=${columnMeta.type}`);
          }
          this.validationManager.validateCell(rowIndex, columnMeta.colIndex, value, columnMeta.type, true);
        });
      });
    } else if (this.debug) {
      console.log('[StoreBridge] validationManager가 없거나 데이터가 배열이 아님 (updateCellsBatch):', {
        hasValidationManager: !!this.validationManager,
        isArray: Array.isArray(payload)
      });
    }
    
    return result;
  },
  
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
    const row = this.legacyStore.state.epidemic.rows[rowIndex];
    if (!row) {
      console.warn('[StoreBridge] clearCellData: 행이 존재하지 않음:', rowIndex);
      return;
    }
    
    // 컬럼 메타데이터에서 해당 셀 정보 찾기 (colIndex로만 찾음 - type은 context menu와 일치하지 않을 수 있음)
    const columnMetas = this.getColumnMetas();
    const columnMeta = columnMetas.find(meta => meta.colIndex === colIndex);
    
    if (!columnMeta) {
      console.error('[StoreBridge] clearCellData: 컬럼 메타데이터를 찾을 수 없음:', { colIndex, type, availableColIndices: columnMetas.map(m => m.colIndex) });
      if (typeof window !== 'undefined' && window.showToast) {
        window.showToast('데이터 삭제 중 오류가 발생했습니다.', 'error');
      }
      return;
    }
    
    if (this.debug) {
      console.log('[StoreBridge] clearCellData: 찾은 컬럼 메타:', columnMeta);
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
    
    // 셀 데이터 지우기
    const updatePayload = {
      rowIndex,
      key: columnMeta.dataKey,
      value: null,
      cellIndex: columnMeta.cellIndex
    };
    
    const result = this.legacyStore.dispatch('epidemic/updateCell', updatePayload);
    this.saveCurrentState();
    
    // 검증 처리
    if (this.validationManager) {
      if (this.debug) {
        console.log(`[StoreBridge] validation 재실행 (단일셀): row=${rowIndex}, col=${colIndex}, value=null, type=${type}`);
      }
      this.validationManager.validateCell(rowIndex, columnMeta.colIndex, null, type, true);
    }
    
    return result;
  },
  
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
      const row = this.legacyStore.state.epidemic.rows[rowIndex];
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
    this.legacyStore.dispatch('epidemic/updateCell', payload);

    // persistence
    this.saveCurrentState();

    // Validation
    if (this.validationManager) {
      this.validationManager.validateCell(rowIndex, columnMeta.colIndex, value, columnMeta.type);
    }
    return true;
  },

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

    const beforeValue = this.legacyStore.state.epidemic.headers[headerType]?.[headerIndex];
    if (beforeValue === value) return;

    this._captureSnapshot('header_edit', {
      headerType,
      headerIndex,
      before: beforeValue,
      after: value
    });

    const payload = { headerType, index: headerIndex, text: value };
    this.legacyStore.dispatch('epidemic/updateHeader', payload);

    this.saveCurrentState();
  }
};
