/**
 * StoreBridge Column Operations
 * 열 추가, 삭제, 삽입, 가시성 관련 메서드
 */

export const columnOperations = {
  /**
   * 열 추가
   * @param {string} type - 열 타입
   */
  async addColumn(type) {
    this._captureSnapshot('addColumn', { type });
    
    const result = await this.legacyStore.dispatch('epidemic/addColumn', type);
    this.saveCurrentState();
    
    if (this.validationManager) {
      const currentRows = this.legacyStore.state.epidemic.rows;
      const columnMetas = this.getColumnMetas();
      const newColIndex = columnMetas.length - 1;
      const newColumnMeta = columnMetas[newColIndex];
      
      this.validationManager.handleColumnAddition(newColIndex, newColumnMeta, currentRows);
    }
    
    return result;
  },
  
  /**
   * 여러 열 추가
   * @param {Object} payload - 추가 페이로드
   */
  addMultipleColumns(payload) {
    this._captureSnapshot('addMultipleColumns', payload);
    const result = this.legacyStore.dispatch('epidemic/addMultipleColumns', payload);
    this.saveCurrentState();
    return result;
  },
  
  /**
   * 특정 위치에 열 추가
   * @param {Object} payload - 추가 페이로드
   */
  insertColumnAt(payload) {
    const beforeColumnMetas = this.getColumnMetas();
    const { type, index } = payload;
    
    if (this.debug) {
      console.log(`[StoreBridge] insertColumnAt: type=${type}, index=${index}`);
    }
    
    this._captureSnapshot('insertColumnAt', payload);
    const result = this.legacyStore.dispatch('epidemic/insertColumnAt', payload);
    this.saveCurrentState();
    
    const afterColumnMetas = this.getColumnMetas();
    if (this.validationManager) {
      console.log('[StoreBridge] insertColumnAt: remapValidationErrorsByColumnIdentity 호출');
      this.validationManager.remapValidationErrorsByColumnIdentity(beforeColumnMetas, afterColumnMetas);
    }
    
    return result;
  },
  
  /**
   * 여러 열을 특정 위치에 삽입 (validation 처리 포함)
   */
  insertMultipleColumnsAt(payload) {
    const beforeColumnMetas = this.getColumnMetas();
    const { type, count, index } = payload;

    if (this.debug) {
      console.log(`[StoreBridge] insertMultipleColumnsAt: type=${type}, count=${count}, index=${index}`);
    }

    this._captureSnapshot('insertMultipleColumnsAt', payload);
    this.legacyStore.dispatch('epidemic/insertMultipleColumnsAt', payload);
    this.saveCurrentState();
    
    const afterColumnMetas = this.getColumnMetas();
    if (this.validationManager && count > 0) {
      console.log('[StoreBridge] insertMultipleColumnsAt: remapValidationErrorsByColumnIdentity 호출');
      this.validationManager.remapValidationErrorsByColumnIdentity(beforeColumnMetas, afterColumnMetas);
    }
  },
  
  /**
   * 열 삭제
   * @param {string} type - 열 타입
   */
  deleteColumn(type) {
    this._captureSnapshot('deleteColumn', { type });
    
    const beforeColumnMetas = this.getColumnMetas();
    const targetColumnMetas = beforeColumnMetas.filter(c => c.type === type);
    const deletedColIndices = targetColumnMetas.map(c => c.colIndex);
    
    const result = this.legacyStore.dispatch('epidemic/deleteColumn', type);
    this.saveCurrentState();
    
    if (this.validationManager && deletedColIndices.length > 0) {
      this.validationManager.handleColumnDeletion(deletedColIndices);
    }
    
    return result;
  },
  
  /**
   * 인덱스로 열 삭제
   * @param {Object} payload - 삭제 페이로드
   */
  deleteColumnByIndex(payload) {
    if (this.debug) {
      console.log('[StoreBridge] deleteColumnByIndex 호출:', payload);
    }
    this._captureSnapshot('deleteColumnByIndex', payload);
    const result = this.legacyStore.dispatch('epidemic/deleteColumnByIndex', payload);
    this.saveCurrentState();
    return result;
  },
  
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

    columns.forEach(({ type, index }) => {
      console.log(`[StoreBridge] 열 찾기: type=${type}, index=${index}`);
      const targetColumns = beforeColumnMetas.filter(c => c.type === type && c.cellIndex === index);
      console.log('[StoreBridge] 찾은 열들:', targetColumns);
      targetColumns.forEach(col => deletedColIndices.push(col.colIndex));
    });

    console.log('[StoreBridge] deletedColIndices:', deletedColIndices);
    console.log('[StoreBridge] validationManager 존재 여부:', !!this.validationManager);
    
    this._captureSnapshot('deleteMultipleColumnsByIndex', payload);
    this.legacyStore.dispatch('epidemic/deleteMultipleColumnsByIndex', payload);
    this.saveCurrentState();
    
    const afterColumnMetas = this.getColumnMetas();
    console.log('[StoreBridge] afterColumnMetas 개수:', afterColumnMetas.length);
    
    if (this.validationManager && deletedColIndices.length > 0) {
      console.log('[StoreBridge] remapValidationErrorsByColumnIdentity 호출 시작');
      this.validationManager.remapValidationErrorsByColumnIdentity(beforeColumnMetas, afterColumnMetas, deletedColIndices);
      console.log('[StoreBridge] remapValidationErrorsByColumnIdentity 호출 완료');
    } else {
      console.log('[StoreBridge] remapValidationErrorsByColumnIdentity 호출 건너뜀:', {
        hasValidationManager: !!this.validationManager,
        deletedColIndicesLength: deletedColIndices.length
      });
    }
  },
  
  /**
   * 빈 열 삭제
   */
  deleteEmptyColumns() {
    this._captureSnapshot('deleteEmptyColumns');
    
    const beforeColumnMetas = this.getColumnMetas();
    const deletedColIndices = [];
    
    beforeColumnMetas.forEach(columnMeta => {
      if (this._isEmptyColumn(columnMeta)) {
        deletedColIndices.push(columnMeta.colIndex);
      }
    });
    
    const result = this.legacyStore.dispatch('epidemic/deleteEmptyColumns');
    this.saveCurrentState();
    
    if (this.validationManager && deletedColIndices.length > 0) {
      this.validationManager.handleColumnDeletion(deletedColIndices);
    }
    
    return result;
  },
  
  /**
   * 단일 열 데이터 지우기
   * @param {Object} payload - 지우기 페이로드 { type, index }
   */
  clearColumnData(payload) {
    if (this.debug) {
      console.log('[StoreBridge] clearColumnData 호출됨:', payload);
    }
    this._captureSnapshot('clearColumnData', payload);
    const result = this.legacyStore.dispatch('epidemic/clearColumnData', payload);
    this.saveCurrentState();
    
    if (this.validationManager) {
      if (this.debug) {
        console.log('[StoreBridge] validationManager와 columnMetas 존재함 (단일열)');
      }
      const { type, index } = payload;
      const rows = this.legacyStore.state.epidemic.rows;
      const columnMetas = this.getColumnMetas();
      
      const targetColumns = columnMetas.filter(meta => 
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
          this.validationManager.validateCell(rowIndex, columnMeta.colIndex, value, columnMeta.type, true);
        });
      });
    } else if (this.debug) {
      console.log('[StoreBridge] validationManager 또는 columnMetas가 없음 (단일열):', {
        hasValidationManager: !!this.validationManager
      });
    }
    
    return result;
  },
  
  /**
   * 여러 열 데이터 지우기
   * @param {Object} payload - 지우기 페이로드
   */
  clearMultipleColumnsData(payload) {
    this._captureSnapshot('clearMultipleColumnsData', payload);
    const result = this.legacyStore.dispatch('epidemic/clearMultipleColumnsData', payload);
    this.saveCurrentState();
    
    if (this.validationManager) {
      const { columns } = payload;
      const columnMetas = this.getColumnMetas();
      const clearedCells = [];
      
      columns.forEach(({ type, index }) => {
        columnMetas.forEach(meta => {
          if (meta.type === type && meta.cellIndex === index) {
            const rows = this.legacyStore.state.epidemic.rows;
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
  },
  
  /**
   * 고정 열 데이터 지우기
   * @param {Object} payload - 지우기 페이로드
   */
  clearFixedColumnData(payload) {
    if (this.debug) {
      console.log('[StoreBridge] clearFixedColumnData 호출됨:', payload);
    }
    this._captureSnapshot('clearFixedColumnData', payload);
    const result = this.legacyStore.dispatch('epidemic/clearFixedColumnData', payload);
    this.saveCurrentState();
    
    if (this.validationManager) {
      if (this.debug) {
        console.log('[StoreBridge] validationManager와 columnMetas 존재함 (고정열)');
      }
      const { type } = payload;
      const rows = this.legacyStore.state.epidemic.rows;
      const columnMetas = this.getColumnMetas();
      
      const targetColumns = columnMetas.filter(meta => meta.type === type);
      
      if (this.debug) {
        console.log('[StoreBridge] targetColumns (고정열):', targetColumns);
      }
      
      targetColumns.forEach(columnMeta => {
        rows.forEach((row, rowIndex) => {
          const value = this._getCellValue(row, columnMeta);
          if (this.debug) {
            console.log(`[StoreBridge] validation 재실행 (고정열): row=${rowIndex}, col=${columnMeta.colIndex}, value="${value}", type=${columnMeta.type}`);
          }
          this.validationManager.validateCell(rowIndex, columnMeta.colIndex, value, columnMeta.type, true);
        });
      });
    } else if (this.debug) {
      console.log('[StoreBridge] validationManager 또는 columnMetas가 없음 (고정열):', {
        hasValidationManager: !!this.validationManager
      });
    }
    
    return result;
  },
  
  /**
   * 개별 노출시간 열 가시성 설정
   * @param {boolean} isVisible - 가시성 여부
   */
  setIndividualExposureColumnVisibility(isVisible) {
    const beforeColumnMetas = this.getColumnMetas();
    const wasVisible = this.legacyStore.state.settings.isIndividualExposureColumnVisible;
    const isAdding = isVisible && !wasVisible;
    const isRemoving = !isVisible && wasVisible;
    
    if (isVisible === wasVisible) {
      return;
    }
    
    let exposureColumnIndex = null;
    
    if (isAdding) {
      const clinicalColumns = beforeColumnMetas.filter(c => c.type === 'clinicalSymptoms');
      if (clinicalColumns.length > 0) {
        exposureColumnIndex = clinicalColumns[clinicalColumns.length - 1].colIndex + 1;
      } else {
        const basicColumns = beforeColumnMetas.filter(c => c.type === 'basic');
        if (basicColumns.length > 0) {
          exposureColumnIndex = basicColumns[basicColumns.length - 1].colIndex + 1;
        }
      }
    } else if (isRemoving) {
      const columnMetas = this.getColumnMetas();
      const exposureCol = columnMetas.find(col => 
        col.type === 'individualExposureTime' || 
        col.dataKey === 'individualExposureTime'
      );
      exposureColumnIndex = exposureCol ? exposureCol.colIndex : null;
    }
    
    if (this.debug) {
      console.log(`[StoreBridge] setIndividualExposureColumnVisibility: ${isVisible}`);
      console.log(`[StoreBridge] isAdding: ${isAdding}, isRemoving: ${isRemoving}`);
      console.log(`[StoreBridge] exposureColumnIndex: ${exposureColumnIndex}`);
    }
    
    const result = this.legacyStore.dispatch('settings/setIndividualExposureColumnVisibility', isVisible);
    this.saveCurrentState();
    
    const afterColumnMetas = this.getColumnMetas();
    if (this.validationManager) {
      console.log('[StoreBridge] setIndividualExposureColumnVisibility: remapValidationErrorsByColumnIdentity 호출');
      this.validationManager.remapValidationErrorsByColumnIdentity(beforeColumnMetas, afterColumnMetas);
    }
    
    return result;
  },
  
  /**
   * 확진자 여부 열 가시성 설정
   * @param {boolean} isVisible - 가시성 여부
   */
  setConfirmedCaseColumnVisibility(isVisible) {
    const beforeColumnMetas = this.getColumnMetas();
    const wasVisible = this.legacyStore.state.settings.isConfirmedCaseColumnVisible;
    const isAdding = isVisible && !wasVisible;
    const isRemoving = !isVisible && wasVisible;
    
    if (isVisible === wasVisible) {
      return;
    }
    
    let confirmedCaseColumnIndex = null;
    
    if (isAdding) {
      confirmedCaseColumnIndex = 2;
    } else if (isRemoving) {
      const columnMetas = this.getColumnMetas();
      const confirmedCaseCol = columnMetas.find(col => 
        col.type === 'isConfirmedCase' || 
        col.dataKey === 'isConfirmedCase'
      );
      confirmedCaseColumnIndex = confirmedCaseCol ? confirmedCaseCol.colIndex : null;
      
      if (confirmedCaseColumnIndex === null) {
        confirmedCaseColumnIndex = 2;
      }
    }
    
    if (this.debug) {
      console.log(`[StoreBridge] setConfirmedCaseColumnVisibility: ${isVisible}`);
      console.log(`[StoreBridge] isAdding: ${isAdding}, isRemoving: ${isRemoving}`);
      console.log(`[StoreBridge] confirmedCaseColumnIndex: ${confirmedCaseColumnIndex}`);
    }
    
    const result = this.legacyStore.dispatch('settings/setConfirmedCaseColumnVisibility', isVisible);
    this.saveCurrentState();
    
    const afterColumnMetas = this.getColumnMetas();
    if (this.validationManager) {
      console.log('[StoreBridge] setConfirmedCaseColumnVisibility: remapValidationErrorsByColumnIdentity 호출');
      this.validationManager.remapValidationErrorsByColumnIdentity(beforeColumnMetas, afterColumnMetas);
    }
    
    return result;
  },
  
  /**
   * 개별 노출시간 열 토글
   */
  toggleIndividualExposureColumn() {
    const result = this.legacyStore.dispatch('settings/toggleIndividualExposureColumn');
    this.saveCurrentState();
    return result;
  },
  
  /**
   * 확진자 여부 열 토글
   */
  toggleConfirmedCaseColumn() {
    const result = this.legacyStore.dispatch('settings/toggleConfirmedCaseColumn');
    this.saveCurrentState();
    return result;
  }
};
