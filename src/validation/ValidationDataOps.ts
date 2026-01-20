import { GridHeader, GridRow } from '@/types/grid';
import { useEpidemicStore } from '@/stores/epidemicStore';
import { ValidationErrorManager } from './ValidationErrorManager';
import { validateCell as _validateCell } from '@/store/utils/validation';

type EpidemicStore = ReturnType<typeof useEpidemicStore>;
type ToastType = 'success' | 'warning' | 'error' | 'info';
type TranslationFn = (key: string, params?: Record<string, unknown>) => string;

export class ValidationDataOps {
  private store: EpidemicStore;
  private errorManager: ValidationErrorManager;
  private debug: boolean;
  private onProgress: ((progress: number) => void) | null;
  private showToast: ((message: string, type: ToastType) => void) | null;
  private _validateCellFn: ((rowIndex: number, colIndex: number, value: unknown, type: string, immediate: boolean) => void) | null;
  private _getCellValueFn: ((row: GridRow, columnMeta: GridHeader) => unknown) | null;

  constructor(store: EpidemicStore, errorManager: ValidationErrorManager, options: { debug?: boolean; onProgress?: (p: number) => void; showToast?: (msg: string, type: ToastType) => void } = {}) {
    this.store = store;
    this.errorManager = errorManager;
    this.debug = options.debug || false;
    this.onProgress = options.onProgress || null;
    this.showToast = options.showToast || null;
    this._validateCellFn = null;
    this._getCellValueFn = null;
  }

  setValidateCellFn(validateCellFn: (rowIndex: number, colIndex: number, value: unknown, type: string, immediate: boolean) => void) {
    this._validateCellFn = validateCellFn;
  }

  setGetCellValueFn(getCellValueFn: (row: GridRow, columnMeta: GridHeader) => unknown) {
    this._getCellValueFn = getCellValueFn;
  }

  async handleDataImport(importedData: GridRow[], columnMetas: GridHeader[]) {
    this.errorManager.clearAllErrors();
    
    const chunkSize = 1000;
    const totalRows = importedData.length;
    
    for (let i = 0; i < totalRows; i += chunkSize) {
      const chunk = importedData.slice(i, i + chunkSize);
      
      chunk.forEach((row, chunkIndex) => {
        const rowIndex = i + chunkIndex;
        columnMetas.forEach(columnMeta => {
          if (!columnMeta.isEditable) return;
          
          const value = this._getCellValue(row, columnMeta);
          if (value !== '' && value !== null && value !== undefined) {
            this._validateCell(rowIndex, columnMeta.colIndex ?? -1, value, columnMeta.type || '', true);
          }
        });
      });
      
      if (this.onProgress) {
        const progress = Math.round(((i + chunkSize) / totalRows) * 100);
        this.onProgress(Math.min(progress, 100));
      }
      
      if (i + chunkSize < totalRows) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }
    
    if (this.onProgress) {
      this.onProgress(100);
    }
  }

  handlePasteData(pasteData: string[][], startRow: number, startCol: number, columnMetas: GridHeader[]) {
    if (this.debug) {
      console.log('[ValidationDataOps] handlePasteData 호출됨', pasteData, startRow, startCol, columnMetas);
    }
    
    pasteData.forEach((row, rowOffset) => {
      const rowIndex = startRow + rowOffset;
      row.forEach((value, colOffset) => {
        const colIndex = startCol + colOffset;
        const columnMeta = columnMetas.find(c => c.colIndex === colIndex);
        if (columnMeta && columnMeta.isEditable) {
          if (this.debug) {
            console.log('[ValidationDataOps] validateCell 호출', rowIndex, colIndex, value, columnMeta.dataKey);
          }
          // Remove error first
          this.store.removeValidationError({ rowIndex, colIndex });
          if (value !== '' && value !== null && value !== undefined) {
            this._validateCell(rowIndex, colIndex, value, columnMeta.type || '', true);
          }
        }
      });
    });
  }

  clearErrorsInPasteArea(startRow: number, startCol: number, rowCount: number, colCount: number) {
    const errorsToRemove: string[] = [];
    
    const errors = this.store.validationState.errors;
    for (const key of errors.keys()) {
      const parts = key.split('_');
      // Logic for row_col keys
      if (parts.length === 2 && !isNaN(Number(parts[0])) && !isNaN(Number(parts[1]))) {
          const errorRow = Number(parts[0]);
          const errorCol = Number(parts[1]);
          
          if (errorRow >= startRow && 
              errorRow < startRow + rowCount &&
              errorCol >= startCol && 
              errorCol < startCol + colCount) {
            errorsToRemove.push(key);
          }
      }
    }

    errorsToRemove.forEach(key => {
      const [row, col] = key.split('_').map(Number);
      this.store.removeValidationError({ rowIndex: row, colIndex: col });
    });
  }

  validateCellImmediate(rowIndex: number, colIndex: number, value: unknown, columnType: string, columnMeta?: GridHeader) {
    // Use utility directly for immediate return
    const result = _validateCell(value as any, columnType);
    
    if (!result.valid) {
      this.errorManager.addError(rowIndex, colIndex, result.message || 'Validation failed', columnMeta);
    }
    
    return result;
  }

  showPasteValidationSummary(errors: any[], totalCells: number, t?: TranslationFn) {
    const errorCount = errors.length;
    const errorRate = ((errorCount / totalCells) * 100).toFixed(1);
    
    const errorTypes: Record<string, number> = {};
    errors.forEach(error => {
      const type = error.type || 'unknown';
      errorTypes[type] = (errorTypes[type] || 0) + 1;
    });

    console.group('[ValidationDataOps] 붙여넣기 검증 결과');
    console.log(`총 셀 수: ${totalCells}`);
    console.log(`오류 셀 수: ${errorCount} (${errorRate}%)`);
    console.log('오류 타입별 분류:', errorTypes);
    
    if (errorCount > 0) {
      console.log('첫 5개 오류 예시:');
      errors.slice(0, 5).forEach((error, index) => {
        console.log(`  ${index + 1}. 행${error.row} 열${error.col}: "${error.value}" → ${error.message}`);
      });
    }
    console.groupEnd();

    if (this.showToast) {
      const message = t 
        ? t('dataInput.toast.pasteSummary', { total: totalCells, error: errorCount, rate: errorRate })
        : `붙여넣기 완료: ${totalCells}개 셀 중 ${errorCount}개 오류 발견 (${errorRate}%)`;
      const type = errorCount > 0 ? 'warning' : 'success';
      try {
        this.showToast(message, type);
      } catch (error) {
        console.warn('[ValidationDataOps] showToast 호출 실패:', error);
      }
    }
  }

  validateIndividualExposureColumn(exposureData: { rowIndex: number; value: unknown }[], colIndex: number, onProgress: ((p: number) => void) | null = null) {
    if (!exposureData || exposureData.length === 0) return;
    
    if (this.debug) {
      console.log('[ValidationDataOps] validateIndividualExposureColumn 호출됨');
    }
    
    const totalCells = exposureData.length;
    const chunkSize = 50;
    
    for (let i = 0; i < totalCells; i += chunkSize) {
      const chunk = exposureData.slice(i, i + chunkSize);
      
      chunk.forEach(({ rowIndex, value }) => {
        if (value !== '' && value !== null && value !== undefined) {
           this._validateCell(rowIndex, colIndex, value, 'individualExposureTime', true);
        }
      });
      
      if (onProgress) {
        const progress = Math.round(((i + chunkSize) / totalCells) * 100);
        onProgress(Math.min(progress, 100));
      }
    }
    
    if (onProgress) onProgress(100);
  }

  validateConfirmedCaseColumn(confirmedCaseData: { rowIndex: number; value: unknown }[], colIndex: number, onProgress: ((p: number) => void) | null = null) {
    if (!confirmedCaseData || confirmedCaseData.length === 0) return;
    
    const totalCells = confirmedCaseData.length;
    const chunkSize = 50;
    
    for (let i = 0; i < totalCells; i += chunkSize) {
      const chunk = confirmedCaseData.slice(i, i + chunkSize);
      
      chunk.forEach(({ rowIndex, value }) => {
         if (value !== '' && value !== null && value !== undefined) {
           this._validateCell(rowIndex, colIndex, value, 'isConfirmedCase', true);
         }
      });
      
      if (onProgress) {
        const progress = Math.round(((i + chunkSize) / totalCells) * 100);
        onProgress(Math.min(progress, 100));
      }
    }
    if (onProgress) onProgress(100);
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
    this.onProgress = null;
  }
}