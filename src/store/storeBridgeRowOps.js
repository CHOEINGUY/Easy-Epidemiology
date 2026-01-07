/**
 * StoreBridge Row Operations
 * 행 추가, 삭제, 삽입, 지우기 관련 메서드
 */

export const rowOperations = {
  /**
   * 행 추가
   * @param {number} count - 추가할 행 수
   */
  async addRows(count) {
    this._captureSnapshot('addRows', { count });
    
    const result = await this.legacyStore.dispatch('epidemic/addRows', count);
    this.saveCurrentState();
    
    if (this.validationManager) {
      const currentRows = this.legacyStore.state.epidemic.rows;
      const columnMetas = this.getColumnMetas();
      
      for (let i = currentRows.length - count; i < currentRows.length; i++) {
        this.validationManager.handleRowAddition(i, currentRows[i], columnMetas);
      }
    }
    
    return result;
  },
  
  /**
   * 행 삭제
   * @param {number} rowIndex - 삭제할 행 인덱스
   */
  async deleteRow(rowIndex) {
    this._captureSnapshot('deleteRow', { rowIndex });
    
    await this.legacyStore.dispatch('epidemic/deleteRow', rowIndex);
    this.saveCurrentState();
    
    if (this.validationManager) {
      const columnMetas = this.getColumnMetas();
      this.validationManager.filterRowManager.handleRowChanges([rowIndex], []);
      this.validationManager.remapValidationErrorsByRowDeletion([rowIndex], columnMetas);
    }
  },
  
  /**
   * 여러 행 삭제
   * @param {Object} payload - 삭제 페이로드
   */
  async deleteMultipleRows(payload) {
    this._captureSnapshot('deleteMultipleRows', payload);
    
    await this.legacyStore.dispatch('epidemic/deleteMultipleRows', payload);
    this.saveCurrentState();
    
    if (this.validationManager) {
      let deletedRowIndices = [];
      
      if (Array.isArray(payload)) {
        deletedRowIndices = payload;
      } else if (payload.startRow !== undefined && payload.endRow !== undefined) {
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
  },
  
  /**
   * 개별 행 삭제
   * @param {Object} payload - 삭제 페이로드
   */
  async deleteIndividualRows(payload) {
    this._captureSnapshot('deleteIndividualRows', payload);
    
    await this.legacyStore.dispatch('epidemic/deleteIndividualRows', payload);
    this.saveCurrentState();
    
    if (this.validationManager) {
      let deletedRowIndices = [];
      
      if (Array.isArray(payload)) {
        deletedRowIndices = payload;
      } else if (payload.rows && Array.isArray(payload.rows)) {
        deletedRowIndices = payload.rows;
      }
      
      if (deletedRowIndices.length > 0) {
        const columnMetas = this.getColumnMetas();
        this.validationManager.filterRowManager.handleRowChanges(deletedRowIndices, []);
        this.validationManager.remapValidationErrorsByRowDeletion(deletedRowIndices, columnMetas);
      }
    }
  },
  
  /**
   * 빈 행 삭제
   */
  deleteEmptyRows() {
    this._captureSnapshot('deleteEmptyRows');
    
    const beforeRows = [...this.legacyStore.state.epidemic.rows];
    const deletedRowIndices = [];
    
    beforeRows.forEach((row, index) => {
      if (this._isEmptyRow(row)) {
        deletedRowIndices.push(index);
      }
    });
    
    const result = this.legacyStore.dispatch('epidemic/deleteEmptyRows');
    this.saveCurrentState();
    
    if (this.validationManager && deletedRowIndices.length > 0) {
      const columnMetas = this.getColumnMetas();
      this.validationManager.filterRowManager.handleRowChanges(deletedRowIndices, []);
      this.validationManager.remapValidationErrorsByRowDeletion(deletedRowIndices, columnMetas);
    }
    
    return result;
  },
  
  /**
   * 특정 위치에 행 삽입
   * @param {Object} payload - 삽입 페이로드
   */
  insertRowAt(payload) {
    this._captureSnapshot('insertRowAt', payload);
    const result = this.legacyStore.dispatch('epidemic/insertRowAt', payload);
    this.saveCurrentState();
    return result;
  },
  
  /**
   * 데이터 붙여넣기
   * @param {Object} payload - 붙여넣기 페이로드
   */
  async pasteData(payload) {
    console.log('[StoreBridge] pasteData 호출됨', payload);
    this._captureSnapshot('pasteData', payload);
    const result = this.legacyStore.dispatch('epidemic/pasteData', payload);
    this.saveCurrentState();
    
    if (this.validationManager) {
      const { startRowIndex, startColIndex, data } = payload;
      const columnMetas = this.getColumnMetas();
      console.log('[StoreBridge] ValidationManager.handlePasteData 호출 직전', data, startRowIndex, startColIndex, columnMetas);
      this.validationManager.handlePasteData(data, startRowIndex, startColIndex, columnMetas);
    }
    
    return result;
  },
  
  /**
   * 헤더 데이터 붙여넣기
   * @param {Object} payload - 붙여넣기 페이로드
   */
  pasteHeaderData(payload) {
    this._captureSnapshot('pasteHeaderData', payload);
    const result = this.legacyStore.dispatch('epidemic/pasteHeaderData', payload);
    this.saveCurrentState();
    return result;
  },
  
  /**
   * 행 데이터 지우기 (validation 처리 포함)
   */
  clearRowData(payload) {
    if (this.debug) {
      console.log('StoreBridge.clearRowData:', payload);
    }
    
    this._captureSnapshot('clearRowData', payload);
    this.legacyStore.dispatch('epidemic/clearRowData', payload);
    this.saveCurrentState();
    
    if (this.validationManager) {
      let rowIndex = payload;
      
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
  },
  
  /**
   * 여러 행 데이터 지우기 (validation 처리 포함)
   */
  clearMultipleRowsData(payload) {
    if (this.debug) {
      console.log('StoreBridge.clearMultipleRowsData:', payload);
    }
    
    this._captureSnapshot('clearMultipleRowsData', payload);
    this.legacyStore.dispatch('epidemic/clearMultipleRowsData', payload);
    this.saveCurrentState();
    
    if (this.validationManager) {
      let rowIndices = [];
      
      if (Array.isArray(payload)) {
        rowIndices = payload;
      } else if (payload.startRow !== undefined && payload.endRow !== undefined) {
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
  },
  
  /**
   * 개별 행 데이터 지우기 (validation 처리 포함)
   */
  clearIndividualRowsData(payload) {
    if (this.debug) {
      console.log('StoreBridge.clearIndividualRowsData:', payload);
    }
    
    this._captureSnapshot('clearIndividualRowsData', payload);
    this.legacyStore.dispatch('epidemic/clearIndividualRowsData', payload);
    this.saveCurrentState();
    
    if (this.validationManager) {
      let rowIndices = [];
      
      if (Array.isArray(payload)) {
        rowIndices = payload;
      } else if (payload.rowIndices && Array.isArray(payload.rowIndices)) {
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
};
