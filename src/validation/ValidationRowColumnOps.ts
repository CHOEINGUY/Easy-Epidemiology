import { GridHeader, GridRow } from '@/types/grid';
import { useEpidemicStore } from '@/stores/epidemicStore';
import { ValidationErrorManager } from './ValidationErrorManager';
import { FilterRowValidationManager } from '@/components/DataInputVirtualScroll/utils/FilterRowValidationManager';

type EpidemicStore = ReturnType<typeof useEpidemicStore>;

export class ValidationRowColumnOps {
  private store: EpidemicStore;
  private errorManager: ValidationErrorManager;
  private debug: boolean;
  public filterRowManager: FilterRowValidationManager;
  private _validateCellFn: ((rowIndex: number, colIndex: number, value: unknown, type: string, immediate: boolean) => void) | null;
  private _getCellValueFn: ((row: GridRow, columnMeta: GridHeader) => unknown) | null;

  constructor(store: EpidemicStore, errorManager: ValidationErrorManager, options: { debug?: boolean } = {}) {
    this.store = store;
    this.errorManager = errorManager;
    this.debug = options.debug || false;
    this.filterRowManager = new FilterRowValidationManager();
    this._validateCellFn = null;
    this._getCellValueFn = null;
  }

  setValidateCellFn(validateCellFn: (rowIndex: number, colIndex: number, value: unknown, type: string, immediate: boolean) => void) {
    this._validateCellFn = validateCellFn;
  }

  setGetCellValueFn(getCellValueFn: (row: GridRow, columnMeta: GridHeader) => unknown) {
    this._getCellValueFn = getCellValueFn;
  }

  handleRowAddition(rowIndex: number, newRow: GridRow | GridRow[], columnMetas: GridHeader[], count: number = 1) {
    // 1. Shift existing errors down
    this.reindexErrorsAfterRowAddition(rowIndex, count);

    // 2. Validate new rows (optional, usually empty rows are valid, or we leave them clean)
  }

  reindexErrorsAfterRowAddition(startIndex: number, count: number) {
    if (count <= 0) return;
    const currentErrors = this.store.validationState.errors;
    if (!currentErrors || currentErrors.size === 0) return;

    const newErrors = new Map<string, unknown>();
    
    for (const [key, error] of currentErrors) {
      const parts = key.split('_');
      
      if (parts.length < 2) {
         newErrors.set(key, error);
         continue;
      }

      const row = Number(parts[0]);
      if (isNaN(row)) {
          newErrors.set(key, error);
          continue;
      }

      if (row < startIndex) {
          newErrors.set(key, error);
      } else {
          const newRowIndex = row + count;
          const rest = parts.slice(1).join('_'); // Rejoin rest
          const newKey = `${newRowIndex}_${rest}`;
          newErrors.set(newKey, error);
      }
    }
    this.errorManager.setErrors(newErrors);
  }

  handleRowDeletion(deletedRowIndices: number[], columnMetas: GridHeader[] = []) {
    if (this.debug) {
      console.log('[ValidationRowColumnOps] handleRowDeletion 호출:', deletedRowIndices);
    }
    
    if (columnMetas && columnMetas.length > 0) {
      this.remapValidationErrorsByRowDeletion(deletedRowIndices, columnMetas);
    } else {
      if (this.debug) {
        console.log('[ValidationRowColumnOps] columnMetas가 없어 기존 방식 사용');
      }
      
      deletedRowIndices.forEach(rowIndex => {
        this.errorManager.clearErrorsForRow(rowIndex);
      });
      
      this.reindexErrorsAfterRowDeletion(deletedRowIndices);
    }
  }

  handleColumnAddition(colIndex: number, columnMeta: GridHeader, rows: GridRow[] = []) {
    this.errorManager.clearErrorsForColumn(colIndex);
    
    if (rows && rows.length > 0) {
      rows.forEach((row, rowIndex) => {
        const value = this._getCellValue(row, columnMeta);
        if (value !== '' && value !== null && value !== undefined) {
          this._validateCell(rowIndex, colIndex, value, columnMeta.type || '', true);
        }
      });
    }
  }

  handleColumnDeletion(deletedColIndices: number[]) {
    if (!deletedColIndices || deletedColIndices.length === 0) return;

    const currentErrors = this.store.validationState.errors;
    if (currentErrors.size === 0) return;

    const newErrors = new Map<string, unknown>();
    const deletedSet = new Set(deletedColIndices);

    for (const [key, error] of currentErrors) {
      const parts = key.split('_');
      let col: number | undefined;
      
      if (parts.length === 2 && !isNaN(Number(parts[0])) && !isNaN(Number(parts[1]))) {
          col = Number(parts[1]);
      } 
      
      if (col !== undefined && deletedSet.has(col)) {
         // Drop error
      } else {
         newErrors.set(key, error);
      }
    }
    
    this.errorManager.setErrors(newErrors);
  }

  revalidateRows(rowIndices: number[] = [], rows: GridRow[] = [], columnMetas: GridHeader[] = []) {
    rowIndices.forEach((rowIdx) => {
      const row = rows[rowIdx];
      if (!row) return;
      columnMetas.forEach((meta) => {
        if (!meta.isEditable) return;
        const value = this._getCellValue(row, meta);
        this._validateCell(rowIdx, meta.colIndex ?? -1, value, meta.type || '', true);
      });
    });
  }

  revalidateColumns(colIndices: number[] = [], rows: GridRow[] = [], columnMetas: GridHeader[] = []) {
    const metas = columnMetas.filter((m) => m.colIndex !== undefined && colIndices.includes(m.colIndex));
    if (!metas.length) return;

    rows.forEach((row, rowIndex) => {
      metas.forEach((meta) => {
        const value = this._getCellValue(row, meta);
        this._validateCell(rowIndex, meta.colIndex ?? -1, value, meta.type || '', true);
      });
    });
  }

  reindexErrorsAfterRowDeletion(deletedRowIndices: number[]) {
    if (!deletedRowIndices || deletedRowIndices.length === 0) return;

    const currentErrors = this.store.validationState.errors;
    if (currentErrors.size === 0) return;

    const newErrors = new Map<string, unknown>();
    const sortedIndices = [...deletedRowIndices].sort((a, b) => a - b);

    for (const [key, error] of currentErrors) {
      const parts = key.split('_');
      if (parts.length < 2) {
          newErrors.set(key, error);
          continue;
      }
      
      const row = Number(parts[0]);
      if (deletedRowIndices.includes(row)) continue;

      let newRowIndex = row;
      let shiftCount = 0;
      for (const deletedIndex of sortedIndices) {
        if (deletedIndex < row) shiftCount++;
      }
      newRowIndex = row - shiftCount;
      
      const rest = parts.slice(1).join('_');
      const newKey = `${newRowIndex}_${rest}`;
      newErrors.set(newKey, error);
    }

    this.errorManager.setErrors(newErrors);
  }

  remapValidationErrorsByRowDeletion(deletedRowIndices: number[], columnMetas: GridHeader[]) {
    if (!deletedRowIndices || deletedRowIndices.length === 0) return;

    const currentErrors = this.store.validationState.errors;
    if (!currentErrors || currentErrors.size === 0) return;

    this.filterRowManager.handleRowChanges(deletedRowIndices, []);
    
    // Use 'as any' here only if getRemappedErrors is not strictly typed yet in FilterRowValidationManager
    // Assuming it accepts Map<string, any> and returns the same.
    const newErrors = this.filterRowManager.getRemappedErrors(currentErrors as unknown as Map<string, any>);
    
    this.errorManager.setErrors(newErrors as unknown as Map<string, unknown>);
  }

  handleDataClear(clearedCells: { rowIndex: number; colIndex: number }[]) {
     const cellsForErrorClear = clearedCells.map(cell => ({
      row: cell.rowIndex,
      col: cell.colIndex
    }));
    this.errorManager.clearErrorsForCells(cellsForErrorClear);
  }

  private _validateCell(rowIndex: number, colIndex: number, value: unknown, type: string, immediate: boolean) {
    if (this._validateCellFn) {
      this._validateCellFn(rowIndex, colIndex, value, type, immediate);
    }
  }

  private _getCellValue(row: GridRow, columnMeta: GridHeader): unknown {
    if (this._getCellValueFn) {
      return this._getCellValueFn(row, columnMeta);
    }
    return columnMeta.dataKey ? row[columnMeta.dataKey] : undefined;
  }

  destroy() {
    // Clean up
  }
}