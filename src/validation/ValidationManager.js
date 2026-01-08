/**
 * ValidationManager.js
 * Phase 1 – Core validation controller (Refactored)
 * -----------------------------------
 * 이 파일은 유효성 검사의 핵심 컨트롤러입니다.
 * 세부 기능은 다음 모듈로 분리되었습니다:
 * 
 * - ValidationErrorManager.js: 에러 CRUD 및 타이머 관리
 * - ValidationRowColumnOps.js: 행/열 추가/삭제 시 검증 처리
 * - ValidationDataOps.js: 데이터 임포트/붙여넣기 검증
 * - ValidationStructuralMapper.js: 열 구조 변경 시 에러 키 재매핑
 */

import { validateCell as _validateCell } from '../store/utils/validation.js';
import { validateDataAsync } from '../utils/asyncProcessor.js';
import { createWorkerSafely } from '../utils/workerUtils.js';
import { 
  getColumnUniqueKey, 
  getErrorKey, 
  parseErrorKey 
} from '../components/DataInputVirtualScroll/utils/validationUtils.js';

// 분리된 모듈 import
import { ValidationErrorManager } from './ValidationErrorManager.js';
import { ValidationRowColumnOps } from './ValidationRowColumnOps.js';
import { ValidationDataOps } from './ValidationDataOps.js';
import { ValidationStructuralMapper } from './ValidationStructuralMapper.js';

/**
 * @typedef {object} ValidationManagerOptions
 * @property {number} [debounceDelay=300] – validateCell 지연 시간(ms)
 * @property {number|null} [chunkSize=null] – revalidateAll 기본 청크 크기(null=sync)
 * @property {boolean} [useWorker=false] – Web Worker 사용 여부
 * @property {boolean} [debug=false] – 디버그 로그 활성화 여부
 */

export class ValidationManager {
  /**
   * @param {Object} store Vuex 인스턴스 (or Pinia Shim)
   * @param {ValidationManagerOptions} [options] 설정값
   */
  constructor(store, options = {}) {
    if (!store) throw new Error('ValidationManager: Vuex store instance required');

    this.store = store;

    const {
      debounceDelay = 300,
      chunkSize = null,
      useWorker = false,
      onProgress = null,
      debug = false
    } = options;

    this.DEBOUNCE_DELAY = debounceDelay;
    this.defaultChunkSize = chunkSize;
    this.useWorker = useWorker;
    this.onProgress = onProgress;
    this.debug = debug;
    this._destroyed = false;

    // ============ 모듈 인스턴스 생성 ============
    this.errorManager = new ValidationErrorManager(store, { debug });
    this.rowColumnOps = new ValidationRowColumnOps(store, this.errorManager, { debug });
    this.dataOps = new ValidationDataOps(store, this.errorManager, { debug, onProgress });
    this.structuralMapper = new ValidationStructuralMapper(store, this.errorManager, { debug });

    // 모듈에 validateCell 함수 주입
    const boundValidateCell = this.validateCell.bind(this);
    const boundGetCellValue = this._getCellValue.bind(this);
    
    this.rowColumnOps.setValidateCellFn(boundValidateCell);
    this.rowColumnOps.setGetCellValueFn(boundGetCellValue);
    this.dataOps.setValidateCellFn(boundValidateCell);
    this.dataOps.setGetCellValueFn(boundGetCellValue);
    this.structuralMapper.setValidateCellFn(boundValidateCell);
    this.structuralMapper.setGetCellValueFn(boundGetCellValue);

    // 하위 호환성을 위한 validationTimers 참조
    this.validationTimers = this.errorManager.validationTimers;
    this.columnMetas = [];

    // Web Worker 설정
    if (this.useWorker) {
      this._worker = createWorkerSafely(new URL('./workers/validationWorker.js', import.meta.url));
      
      if (this._worker) {
        this._worker.onmessage = (e) => {
          if (this._destroyed) return;
          const { type, invalidCells, error } = e.data || {};
          if (type === 'error') {
            console.error('[ValidationManager worker]', error);
            return;
          }
          if (Array.isArray(invalidCells)) {
            this.errorManager.clearAllErrors();
            invalidCells.forEach(({ row, col, message }) => {
              const columnMeta = this.columnMetas.find(meta => meta.colIndex === col);
              if (columnMeta) {
                const uniqueKey = getColumnUniqueKey(columnMeta);
                const errorKey = getErrorKey(row, uniqueKey);
                this.store.commit('ADD_VALIDATION_ERROR_BY_UNIQUE_KEY', { errorKey, message });
              } else {
                this.store.commit('ADD_VALIDATION_ERROR', { rowIndex: row, colIndex: col, message });
              }
            });
          }
        };
      } else {
        this.useWorker = false;
        if (this.debug) {
          console.log('[ValidationManager] Worker creation failed, using async processor');
        }
      }
    }
  }

  // ============ 고유 식별자 시스템 (하위 호환성) ============
  getColumnUniqueKey = getColumnUniqueKey;
  getErrorKey = getErrorKey;
  parseErrorKey = parseErrorKey;

  createUniqueKeyMapping(columnMetas) {
    const mapping = {};
    columnMetas.forEach(meta => {
      const uniqueKey = this.getColumnUniqueKey(meta);
      if (uniqueKey) {
        mapping[uniqueKey] = meta;
      }
    });
    return mapping;
  }

  findColIndexByUniqueKey(uniqueKey, columnMetas) {
    const meta = columnMetas.find(col => this.getColumnUniqueKey(col) === uniqueKey);
    return meta ? meta.colIndex : null;
  }

  migrateErrorsToUniqueKeys(columnMetas) {
    if (this.debug) {
      console.log('[ValidationManager] 기존 에러를 고유 식별자 기반으로 마이그레이션 시작');
    }

    const currentErrors = this.store.state.epidemic.validationState.errors;
    if (!currentErrors || currentErrors.size === 0) return;

    const newErrors = new Map();
    let migratedCount = 0;
    let skippedCount = 0;
    let alreadyUniqueCount = 0;

    for (const [oldKey, error] of currentErrors) {
      const parsed = this.parseErrorKey(oldKey);
      if (parsed) {
        newErrors.set(oldKey, error);
        alreadyUniqueCount++;
        continue;
      }

      const parts = oldKey.split('_');
      if (parts.length !== 2) {
        skippedCount++;
        continue;
      }

      const rowIndex = parseInt(parts[0]);
      const colIndex = parseInt(parts[1]);

      if (isNaN(rowIndex) || isNaN(colIndex)) {
        skippedCount++;
        continue;
      }

      const columnMeta = columnMetas.find(meta => meta.colIndex === colIndex);
      if (!columnMeta) {
        skippedCount++;
        continue;
      }

      const uniqueKey = this.getColumnUniqueKey(columnMeta);
      if (!uniqueKey) {
        skippedCount++;
        continue;
      }

      const newKey = this.getErrorKey(rowIndex, uniqueKey);
      newErrors.set(newKey, error);
      migratedCount++;
    }

    this.store.commit('SET_VALIDATION_ERRORS', newErrors);

    if (this.debug) {
      console.log(`[ValidationManager] 마이그레이션 완료: 성공 ${migratedCount}개, 이미 고유 키 ${alreadyUniqueCount}개, 건너뜀 ${skippedCount}개`);
    }
  }

  // ============ Core Public API ============

  /**
   * 셀을 검증합니다. 동일 셀에 대해 debounce 타이머가 있을 경우 clear 합니다.
   */
  validateCell(rowIndex, colIndex, value, columnType, immediate = false) {
    if (this._destroyed) return;
    if (rowIndex < 0) return;

    const cellKey = `${rowIndex}_${colIndex}`;

    if (this.debug) {
      console.log(`validateCell 호출: 행 ${rowIndex}, 열 ${colIndex}, 값 "${value}", 타입 "${columnType}", 즉시: ${immediate}`);
    }

    // 기존 타이머 취소
    this.errorManager.cancelTimer(cellKey);

    // 즉시 검증이 필요한 경우
    if (immediate || this._shouldValidateImmediately(value)) {
      const columnMeta = this.columnMetas.find(meta => meta.colIndex === colIndex);
      this.performValidation(rowIndex, colIndex, value, columnType, columnMeta);
      return;
    }

    // 지연 검증
    this.errorManager.setTimer(cellKey, () => {
      if (!this._destroyed) {
        const columnMeta = this.columnMetas.find(meta => meta.colIndex === colIndex);
        this.performValidation(rowIndex, colIndex, value, columnType, columnMeta);
      }
    }, this.DEBOUNCE_DELAY);
  }

  /**
   * 데이터 전체를 (또는 청크 단위로) 재검증합니다.
   */
  async revalidateAll(rows = [], columnMetas = [], opts = {}) {
    if (this._destroyed) return;

    this.errorManager.clearAllErrors();

    if (!rows.length || !columnMetas.length) return;

    const totalCells = rows.length * columnMetas.filter(meta => meta.isEditable).length;
    const chunkSize = opts.chunkSize !== undefined ? opts.chunkSize : this.defaultChunkSize;
    const onProgress = opts.onProgress || this.onProgress;

    // 1) 동기 처리 (작은 데이터셋)
    if (!chunkSize || chunkSize <= 0 || totalCells < 500) {
      rows.forEach((row, rowIndex) => {
        columnMetas.forEach((meta) => {
          if (!meta.isEditable) return;
          const value = this._getCellValue(row, meta);
          if (value !== '' && value !== null && value !== undefined) {
            this.validateCell(rowIndex, meta.colIndex, value, meta.type, true);
          }
        });
      });
      
      if (onProgress) onProgress(100);
      return;
    }

    // 2) requestIdleCallback 기반 비동기 처리
    if (opts.useAsyncProcessor !== false) {
      return new Promise((resolve, reject) => {
        const validationTask = validateDataAsync(
          rows, 
          columnMetas, 
          _validateCell,
          {
            chunkSize: Math.min(chunkSize, 100),
            onProgress: (progress) => {
              if (onProgress) onProgress(progress);
            },
            onComplete: (invalidCells) => {
              invalidCells.forEach(({ row, col, message }) => {
                const columnMeta = columnMetas.find(meta => meta.colIndex === col);
                if (columnMeta) {
                  const uniqueKey = getColumnUniqueKey(columnMeta);
                  const errorKey = getErrorKey(row, uniqueKey);
                  this.store.commit('ADD_VALIDATION_ERROR_BY_UNIQUE_KEY', { errorKey, message });
                } else {
                  this.store.commit('ADD_VALIDATION_ERROR', { rowIndex: row, colIndex: col, message });
                }
              });
              resolve();
            },
            onError: (error) => {
              console.error('[ValidationManager] Validation error:', error);
              reject(error);
            }
          }
        );
        this._currentValidationTask = validationTask;
      });
    }

    // 3) 기존 setTimeout 기반 청크 처리 (폴백)
    return new Promise((resolve) => {
      const totalRows = rows.length;
      let start = 0;
      let processedRows = 0;
      
      const processChunk = () => {
        if (this._destroyed) {
          resolve();
          return;
        }
        
        const end = Math.min(start + chunkSize, totalRows);
        for (let rowIndex = start; rowIndex < end; rowIndex++) {
          const row = rows[rowIndex];
          columnMetas.forEach((meta) => {
            if (!meta.isEditable) return;
            const value = this._getCellValue(row, meta);
            if (value !== '' && value !== null && value !== undefined) {
              this.validateCell(rowIndex, meta.colIndex, value, meta.type, true);
            }
          });
        }
        
        processedRows = end;
        start = end;
        
        if (onProgress) {
          const progress = Math.round((processedRows / totalRows) * 100);
          onProgress(progress);
        }
        
        if (start < totalRows) {
          setTimeout(processChunk, 0);
        } else {
          resolve();
        }
      };

      processChunk();
    });
  }

  // ============ 위임 메서드들 (하위 호환성) ============

  // ErrorManager 위임
  clearErrorsForCells(cells) { this.errorManager.clearErrorsForCells(cells); }
  clearErrorsForRow(rowIndex) { this.errorManager.clearErrorsForRow(rowIndex); }
  clearErrorsForColumn(colIndex) { this.errorManager.clearErrorsForColumn(colIndex); }
  clearAllErrors() { this.errorManager.clearAllErrors(); }
  clearTimers() { this.errorManager.clearTimers(); }
  printErrorKeys(label, errors) { this.errorManager.printErrorKeys(label, errors); }
  printErrorDiff(before, after) { this.errorManager.printErrorDiff(before, after); }
  printUniqueKeyMapping(columnMetas) { this.errorManager.printUniqueKeyMapping(columnMetas); }

  // RowColumnOps 위임
  handleRowAddition(rowIndex, newRow, columnMetas) { 
    this.rowColumnOps.handleRowAddition(rowIndex, newRow, columnMetas); 
  }
  handleRowDeletion(deletedRowIndices, columnMetas) { 
    this.rowColumnOps.handleRowDeletion(deletedRowIndices, columnMetas); 
  }
  handleColumnAddition(colIndex, columnMeta, rows) { 
    this.rowColumnOps.handleColumnAddition(colIndex, columnMeta, rows); 
  }
  handleColumnDeletion(deletedColIndices) { 
    this.rowColumnOps.handleColumnDeletion(deletedColIndices); 
  }
  revalidateRows(rowIndices, rows, columnMetas) { 
    this.rowColumnOps.revalidateRows(rowIndices, rows, columnMetas); 
  }
  revalidateColumns(colIndices, rows, columnMetas) { 
    this.rowColumnOps.revalidateColumns(colIndices, rows, columnMetas); 
  }
  reindexErrorsAfterRowDeletion(deletedRowIndices) { 
    this.rowColumnOps.reindexErrorsAfterRowDeletion(deletedRowIndices); 
  }
  remapValidationErrorsByRowDeletion(deletedRowIndices, columnMetas) { 
    this.rowColumnOps.remapValidationErrorsByRowDeletion(deletedRowIndices, columnMetas); 
  }
  handleDataClear(clearedCells) { 
    this.rowColumnOps.handleDataClear(clearedCells); 
  }

  // DataOps 위임
  async handleDataImport(importedData, columnMetas) { 
    return this.dataOps.handleDataImport(importedData, columnMetas); 
  }
  handlePasteData(pasteData, startRow, startCol, columnMetas) { 
    this.dataOps.handlePasteData(pasteData, startRow, startCol, columnMetas); 
  }
  validateIndividualExposureColumn(exposureData, colIndex, onProgress) { 
    this.dataOps.validateIndividualExposureColumn(exposureData, colIndex, onProgress); 
  }
  validateConfirmedCaseColumn(confirmedCaseData, colIndex, onProgress) { 
    this.dataOps.validateConfirmedCaseColumn(confirmedCaseData, colIndex, onProgress); 
  }
  _clearErrorsInPasteArea(startRow, startCol, rowCount, colCount) {
    this.dataOps.clearErrorsInPasteArea(startRow, startCol, rowCount, colCount);
  }
  _validateCellImmediate(rowIndex, colIndex, value, columnType, columnMeta) {
    return this.dataOps.validateCellImmediate(rowIndex, colIndex, value, columnType, columnMeta);
  }
  _showPasteValidationSummary(errors, totalCells) {
    this.dataOps.showPasteValidationSummary(errors, totalCells);
  }

  // StructuralMapper 위임
  remapValidationErrorsByColumnIdentity(oldColumnsMeta, newColumnsMeta, deletedColIndices) { 
    this.structuralMapper.remapValidationErrorsByColumnIdentity(oldColumnsMeta, newColumnsMeta, deletedColIndices); 
  }
  remapValidationErrorsByColumnOrder(oldColumnsMeta, newColumnsMeta) { 
    this.structuralMapper.remapValidationErrorsByColumnOrder(oldColumnsMeta, newColumnsMeta); 
  }

  // ============ 데이터 관리 ============

  updateColumnMetas(columnMetas) {
    this.columnMetas = columnMetas;
    this.errorManager.updateColumnMetas(columnMetas);
    if (this.debug) {
      console.log('[ValidationManager] 열 메타데이터 업데이트:', columnMetas.length, '개');
    }
  }

  onDataReset() {
    this.errorManager.clearTimers();
  }

  // ============ 리소스 정리 ============

  destroy() {
    // 모듈 정리
    this.errorManager.destroy();
    this.rowColumnOps.destroy();
    this.dataOps.destroy();
    this.structuralMapper.destroy();
    
    // Worker 정리
    if (this._worker) {
      try {
        this._worker.terminate();
      } catch (error) {
        // Worker가 이미 종료된 경우 무시
      }
      this._worker = null;
    }
    
    // 참조 정리
    this.store = null;
    this.onProgress = null;
    this._destroyed = true;
  }

  // ============ Internal Helpers ============

  performValidation(rowIndex, colIndex, value, columnType, columnMeta = null) {
    if (this.debug) {
      console.log(`performValidation 호출: 행 ${rowIndex}, 열 ${colIndex}, 값 "${value}", 타입 "${columnType}"`);
    }
    
    const result = _validateCell(value, columnType);
    
    if (!result.valid) {
      this.errorManager.addError(rowIndex, colIndex, result.message, columnMeta);
    } else {
      this.errorManager.removeError(rowIndex, colIndex, columnMeta);
    }
  }

  _shouldValidateImmediately(value) {
    return value === '' || value === null || value === undefined;
  }

  _getCellValue(row, columnMeta) {
    if (!row || !columnMeta.dataKey) return '';
    
    if (columnMeta.cellIndex !== null && columnMeta.cellIndex !== undefined) {
      const arr = row[columnMeta.dataKey];
      if (!Array.isArray(arr)) return '';
      
      if (columnMeta.cellIndex < 0 || columnMeta.cellIndex >= arr.length) {
        return '';
      }
      
      return arr[columnMeta.cellIndex] ?? '';
    }
    
    return row[columnMeta.dataKey] ?? '';
  }

  // ============ 하위 호환성을 위한 private 메서드 노출 ============
  // (일부 외부 코드에서 직접 접근할 수 있으므로 유지)
  
  get filterRowManager() {
    return this.rowColumnOps.filterRowManager;
  }
}

export default ValidationManager;