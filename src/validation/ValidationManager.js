/*
 * ValidationManager.js
 * Phase 1 – Core validation controller
 * -----------------------------------
 *  • Debounced single-cell validation
 *  • Bulk re-validation with chunk option
 *  • Error add / remove helpers & full reset
 *  • Undo/Redo 안전성: onDataReset(), destroy()
 *
 * NOTE: 이 파일은 자동 생성되었으며, Jest 단위 테스트를 위해 ES module export 방식을 유지합니다.
 */

import { validateCell as _validateCell } from '../store/utils/validation.js';
import { validateDataAsync } from '../utils/asyncProcessor.js';
import { createWorkerSafely } from '../utils/workerUtils.js';

/**
 * @typedef {object} ValidationManagerOptions
 * @property {number} [debounceDelay=300]  –  validateCell 지연 시간(ms)
 * @property {number|null} [chunkSize=null] –  revalidateAll 기본 청크 크기(null=sync)
 * @property {boolean} [useWorker=false] – Web Worker 사용 여부
 * @property {boolean} [debug=false] – 디버그 로그 활성화 여부
 */

export class ValidationManager {
  /**
   * @param {import('vuex').Store} store  Vuex 인스턴스
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

    /** @type {Map<string, ReturnType<typeof setTimeout>>} */
    this.validationTimers = new Map();

    this._destroyed = false;

    if (this.useWorker) {
      // 안전한 워커 생성
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
            // 먼저 모든 오류 제거 후 결과 반영
            this.clearAllErrors();
            invalidCells.forEach(({ row, col, message }) => {
              this.store.commit('ADD_VALIDATION_ERROR', {
                rowIndex: row,
                colIndex: col,
                message
              });
            });
          }
        };
      } else {
        // 워커 생성 실패 시 비동기 처리로 폴백
        this.useWorker = false;
        if (this.debug) {
          console.log('[ValidationManager] Worker creation failed, using async processor');
        }
      }
    }
  }

  /* -------------------------------------------------- */
  /*                   Public API                       */
  /* -------------------------------------------------- */

  /**
   * 셀을 검증합니다. 동일 셀에 대해 debounce 타이머가 있을 경우 clear 합니다.
   *
   * @param {number} rowIndex
   * @param {number} colIndex
   * @param {*} value          셀 값
   * @param {string} columnType  – validation.js 규칙 키
   * @param {boolean} [immediate=false] 즉시 검증 여부
   */
  validateCell(rowIndex, colIndex, value, columnType, immediate = false) {
    if (this._destroyed) return;

    // 헤더셀(rowIndex < 0)은 유효성검사에서 제외
    if (rowIndex < 0) {
      console.log(`헤더셀 유효성검사 건너뜀: 행 ${rowIndex}, 열 ${colIndex}`);
      return;
    }

    const cellKey = `${rowIndex}_${colIndex}`;

    console.log(`validateCell 호출: 행 ${rowIndex}, 열 ${colIndex}, 값 "${value}", 타입 "${columnType}", 즉시: ${immediate}`);

    // 기존 타이머 취소
    const existingTimer = this.validationTimers.get(cellKey);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // 즉시 검증이 필요한 경우
    if (immediate || this._shouldValidateImmediately(value)) {
      this.performValidation(rowIndex, colIndex, value, columnType);
      return;
    }

    // 지연 검증
    const timerId = setTimeout(() => {
      if (!this._destroyed) {
        this.performValidation(rowIndex, colIndex, value, columnType);
      }
      this.validationTimers.delete(cellKey);
    }, this.DEBOUNCE_DELAY);
    
    this.validationTimers.set(cellKey, timerId);
  }

  /**
   * 데이터 전체를 (또는 청크 단위로) 재검증합니다.
   *
   * @param {Array<object>} rows          – 원본 행 데이터
   * @param {Array<object>} columnMetas   – isEditable / colIndex / type / dataKey / cellIndex 등 포함
   * @param {object} [opts]
   * @param {number|null} [opts.chunkSize] – null = 동기, 숫자 = 비동기 청크 크기
   * @param {boolean} [opts.useAsyncProcessor] – requestIdleCallback 기반 비동기 처리 사용 여부
   * @param {Function} [opts.onProgress] – 진행률 콜백 함수
   */
  async revalidateAll(rows = [], columnMetas = [], opts = {}) {
    if (this._destroyed) return;

    // 0. 기존 오류 + 타이머 정리
    this.clearAllErrors();

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
      
      // 완료 시 100% 보고
      if (onProgress) {
        onProgress(100);
      }
      return;
    }

    // 2) requestIdleCallback 기반 비동기 처리 (권장)
    if (opts.useAsyncProcessor !== false) {
      return new Promise((resolve, reject) => {
        const validationTask = validateDataAsync(
          rows, 
          columnMetas, 
          _validateCell,
          {
            chunkSize: Math.min(chunkSize, 100),
            onProgress: (progress, processed, total) => {
              if (onProgress) {
                onProgress(progress);
              }
              if (this.debug) {
                console.log(`[ValidationManager] Progress: ${progress.toFixed(1)}% (${processed}/${total})`);
              }
            },
            onComplete: (invalidCells) => {
              // 검증 결과를 스토어에 반영
              invalidCells.forEach(({ row, col, message }) => {
                this.store.commit('ADD_VALIDATION_ERROR', {
                  rowIndex: row,
                  colIndex: col,
                  message
                });
              });
              
              if (this.debug) {
                console.log(`[ValidationManager] Validation complete. Found ${invalidCells.length} invalid cells.`);
              }
              resolve();
            },
            onError: (error) => {
              console.error('[ValidationManager] Validation error:', error);
              reject(error);
            }
          }
        );

        // 취소 가능한 작업으로 저장 (필요시)
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
        
        // 진행률 보고
        if (onProgress) {
          const progress = Math.round((processedRows / totalRows) * 100);
          onProgress(progress);
        }
        
        if (start < totalRows) {
          setTimeout(processChunk, 0); // Yield 이벤트 루프
        } else {
          resolve();
        }
      };

      processChunk();
    });
  }

  /**
   * 특정 행 인덱스 배열을 재검증합니다.
   * @param {Array<number>} rowIndices
   * @param {Array<object>} rows
   * @param {Array<object>} columnMetas
   */
  revalidateRows(rowIndices = [], rows = [], columnMetas = []) {
    rowIndices.forEach((rowIdx) => {
      const row = rows[rowIdx];
      if (!row) return;
      columnMetas.forEach((meta) => {
        if (!meta.isEditable) return;
        const value = this._getCellValue(row, meta);
        this.validateCell(rowIdx, meta.colIndex, value, meta.type, true);
      });
    });
  }

  /**
   * 특정 열 인덱스 배열을 재검증합니다.
   * @param {Array<number>} colIndices
   * @param {Array<object>} rows
   * @param {Array<object>} columnMetas
   */
  revalidateColumns(colIndices = [], rows = [], columnMetas = []) {
    const metas = columnMetas.filter((m) => colIndices.includes(m.colIndex));
    if (!metas.length) return;

    rows.forEach((row, rowIndex) => {
      metas.forEach((meta) => {
        const value = this._getCellValue(row, meta);
        this.validateCell(rowIndex, meta.colIndex, value, meta.type, true);
      });
    });
  }

  /**
   * 삭제된 행/열에 해당하는 오류를 제거합니다.
   * @param {Array<{row:number,col:number}>} cells
   */
  clearErrorsForCells(cells = []) {
    cells.forEach(({ row, col }) => {
      this.store.commit('REMOVE_VALIDATION_ERROR', { rowIndex: row, colIndex: col });
    });
  }

  /**
   * 특정 행의 모든 오류 제거
   * @param {number} rowIndex
   */
  clearErrorsForRow(rowIndex) {
    const errorsToRemove = [];
    
    this.store.state.validationState.errors.forEach((error, key) => {
      const [errorRow] = key.split('_').map(Number);
      if (errorRow === rowIndex) {
        errorsToRemove.push(key);
      }
    });
    
    errorsToRemove.forEach(key => {
      const [row, col] = key.split('_').map(Number);
      this.store.commit('REMOVE_VALIDATION_ERROR', { rowIndex: row, colIndex: col });
    });
  }

  /**
   * 특정 열의 모든 오류 제거
   * @param {number} colIndex
   */
  clearErrorsForColumn(colIndex) {
    const errorsToRemove = [];
    
    this.store.state.validationState.errors.forEach((error, key) => {
      const [, errorCol] = key.split('_').map(Number);
      if (errorCol === colIndex) {
        errorsToRemove.push(key);
      }
    });
    
    errorsToRemove.forEach(key => {
      const [row, col] = key.split('_').map(Number);
      this.store.commit('REMOVE_VALIDATION_ERROR', { rowIndex: row, colIndex: col });
    });
  }

  /** 모든 오류 + 타이머 제거 */
  clearAllErrors() {
    // 타이머 정리
    this.validationTimers.forEach((t) => clearTimeout(t));
    this.validationTimers.clear();
    // 상태 초기화
    this.store.commit('CLEAR_VALIDATION_ERRORS');
  }

  /** 타이머만 정리 (유효성 검사 오류는 유지) */
  clearTimers() {
    // 타이머만 정리
    this.validationTimers.forEach((t) => clearTimeout(t));
    this.validationTimers.clear();
  }

  /** 데이터/시트 초기화 시 호출 (Undo/Redo, reset 등) */
  onDataReset() {
    // 모든 타이머 정리
    this.validationTimers.forEach(timer => {
      if (timer && typeof clearTimeout === 'function') {
        clearTimeout(timer);
      }
    });
    this.validationTimers.clear();
    
    // 오류는 외부에서 복원하므로 여기서는 정리하지 않음
    // clearAllErrors() 호출하지 않음
  }

  /* -------------------------------------------------- */
  /*              대량 작업 지원 메서드들               */
  /* -------------------------------------------------- */

  /**
   * 행 추가 시 검증 처리
   * @param {number} rowIndex
   * @param {object} newRow
   * @param {Array<object>} columnMetas
   */
  handleRowAddition(rowIndex, newRow, columnMetas) {
    // 새 행의 검증 오류 초기화
    this.clearErrorsForRow(rowIndex);
    
    // 새 행의 데이터 검증
    columnMetas.forEach(columnMeta => {
      if (!columnMeta.isEditable) return;
      
      const value = this._getCellValue(newRow, columnMeta);
      if (value !== '' && value !== null && value !== undefined) {
        this.validateCell(rowIndex, columnMeta.colIndex, value, columnMeta.type, true);
      }
    });
  }

  /**
   * 행 삭제 시 검증 처리
   * @param {Array<number>} deletedRowIndices
   */
  handleRowDeletion(deletedRowIndices) {
    // 삭제된 행들의 검증 오류 제거
    deletedRowIndices.forEach(rowIndex => {
      this.clearErrorsForRow(rowIndex);
    });
    
    // 남은 행들의 인덱스 재조정
    this.reindexErrorsAfterRowDeletion(deletedRowIndices);
  }

  /**
   * 열 추가 시 검증 처리
   * @param {number} colIndex
   * @param {object} columnMeta
   * @param {Array<object>} rows
   */
  handleColumnAddition(colIndex, columnMeta, rows = []) {
    // 기존 오류들의 인덱스 재조정 (새 열 추가로 인한 인덱스 증가)
    this.reindexErrorsAfterColumnAddition(colIndex);
    
    // 새 열의 검증 오류 초기화
    this.clearErrorsForColumn(colIndex);
    
    // 기존 데이터가 있다면 검증
    if (rows && rows.length > 0) {
      rows.forEach((row, rowIndex) => {
        const value = this._getCellValue(row, columnMeta);
        if (value !== '' && value !== null && value !== undefined) {
          this.validateCell(rowIndex, colIndex, value, columnMeta.type, true);
        }
      });
    }
  }

  /**
   * 열 삭제 시 검증 처리
   * @param {Array<number>} deletedColIndices
   */
  handleColumnDeletion(deletedColIndices) {
    if (!deletedColIndices || !Array.isArray(deletedColIndices) || deletedColIndices.length === 0) {
      return;
    }

    const currentErrors = this.store.state.validationState.errors;
    if (currentErrors.size === 0) return;

    // 삭제된 열들의 오류 제거
    const newErrors = new Map();
    const deletedSet = new Set(deletedColIndices);

    for (const [key, error] of currentErrors) {
      const [, col] = key.split('_').map(Number);
      if (!deletedSet.has(col)) {
        newErrors.set(key, error);
      }
    }

    this.store.commit('SET_VALIDATION_ERRORS', newErrors);

    // 남은 오류들의 인덱스 재조정
    this.reindexErrorsAfterColumnDeletion(deletedColIndices);
  }

  /**
   * 데이터 클리어 시 검증 처리
   * @param {Array<{rowIndex: number, colIndex: number}>} clearedCells
   */
  handleDataClear(clearedCells) {
    // 클리어된 셀들의 검증 오류 제거
    const cellsForErrorClear = clearedCells.map(cell => ({
      row: cell.rowIndex,
      col: cell.colIndex
    }));
    
    this.clearErrorsForCells(cellsForErrorClear);
  }

  /**
   * 개별 노출시간 열 전용 검증 처리
   * @param {Array<{rowIndex: number, value: string}>} exposureData - 검증할 데이터 배열
   * @param {number} colIndex - 개별 노출시간 열의 인덱스
   * @param {Function} onProgress - 진행률 콜백 (선택사항)
   */
  validateIndividualExposureColumn(exposureData, colIndex, onProgress = null) {
    if (!exposureData || exposureData.length === 0) return;
    
    console.log('ValidationManager.validateIndividualExposureColumn 호출됨');
    console.log('입력 데이터:', exposureData);
    console.log('열 인덱스:', colIndex);
    
    const totalCells = exposureData.length;
    const chunkSize = 50; // 작은 청크로 빠른 응답성 확보
    
    // 청크 단위로 검증 수행
    for (let i = 0; i < totalCells; i += chunkSize) {
      const chunk = exposureData.slice(i, i + chunkSize);
      
      // 청크 검증
      chunk.forEach(({ rowIndex, value }) => {
        if (value !== '' && value !== null && value !== undefined) {
          console.log(`검증 중: 행 ${rowIndex}, 열 ${colIndex}, 값 "${value}"`);
          this.validateCell(rowIndex, colIndex, value, 'individualExposureTime', true);
        }
      });
      
      // 진행률 보고
      if (onProgress) {
        const progress = Math.round(((i + chunkSize) / totalCells) * 100);
        onProgress(Math.min(progress, 100));
      }
      
      // UI 블로킹 방지를 위한 지연 (필요시)
      if (i + chunkSize < totalCells && totalCells > 200) {
        setTimeout(() => {}, 0);
      }
    }
    
    // 완료 시 100% 보고
    if (onProgress) {
      onProgress(100);
    }
    
    console.log('ValidationManager.validateIndividualExposureColumn 완료');
  }

  /**
   * 엑셀 데이터 임포트 시 검증 처리
   * @param {Array<object>} importedData
   * @param {Array<object>} columnMetas
   */
  async handleDataImport(importedData, columnMetas) {
    // 기존 검증 오류 모두 제거
    this.clearAllErrors();
    
    // 청크 단위로 검증 수행
    const chunkSize = 1000;
    const totalRows = importedData.length;
    
    for (let i = 0; i < totalRows; i += chunkSize) {
      const chunk = importedData.slice(i, i + chunkSize);
      
      // 청크 검증
      chunk.forEach((row, chunkIndex) => {
        const rowIndex = i + chunkIndex;
        columnMetas.forEach(columnMeta => {
          if (!columnMeta.isEditable) return;
          
          const value = this._getCellValue(row, columnMeta);
          if (value !== '' && value !== null && value !== undefined) {
            this.validateCell(rowIndex, columnMeta.colIndex, value, columnMeta.type, true);
          }
        });
      });
      
      // 진행률 보고
      if (this.onProgress) {
        const progress = Math.round(((i + chunkSize) / totalRows) * 100);
        this.onProgress(Math.min(progress, 100));
      }
      
      // UI 업데이트를 위한 지연
      if (i + chunkSize < totalRows) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }
    
    // 완료 시 100% 보고
    if (this.onProgress) {
      this.onProgress(100);
    }
  }

  /**
   * 붙여넣기 시 검증 처리
   * @param {Array<Array<*>>} pasteData
   * @param {number} startRow
   * @param {number} startCol
   * @param {Array<object>} columnMetas
   */
  handlePasteData(pasteData, startRow, startCol, columnMetas) {
    pasteData.forEach((row, rowOffset) => {
      const rowIndex = startRow + rowOffset;
      
      row.forEach((value, colOffset) => {
        const colIndex = startCol + colOffset;
        const columnMeta = columnMetas.find(c => c.colIndex === colIndex);
        
        if (columnMeta && columnMeta.isEditable) {
          // 기존 오류 제거
          this.store.commit('REMOVE_VALIDATION_ERROR', { rowIndex, colIndex });
          
          // 새 값 검증
          if (value !== '' && value !== null && value !== undefined) {
            this.validateCell(rowIndex, colIndex, value, columnMeta.type, true);
          }
        }
      });
    });
  }

  /**
   * 행 삭제 후 오류 인덱스 재조정
   * @param {Array<number>} deletedRowIndices
   */
  reindexErrorsAfterRowDeletion(deletedRowIndices) {
    const newErrors = new Map();
    const deletedSet = new Set(deletedRowIndices);
    
    this.store.state.validationState.errors.forEach((error, key) => {
      const [row, col] = key.split('_').map(Number);
      
      if (!deletedSet.has(row)) {
        // 삭제된 행보다 뒤에 있는 행들의 인덱스 조정
        let newRowIndex = row;
        deletedRowIndices.forEach(deletedRow => {
          if (row > deletedRow) {
            newRowIndex--;
          }
        });
        
        const newKey = `${newRowIndex}_${col}`;
        newErrors.set(newKey, error);
      }
    });
    
    // Vuex 상태 업데이트
    this.store.commit('SET_VALIDATION_ERRORS', newErrors);
  }

  /**
   * 열 추가 후 오류 인덱스 재조정
   * @param {number} addedColIndex
   */
  reindexErrorsAfterColumnAddition(addedColIndex) {
    const newErrors = new Map();
    
    this.store.state.validationState.errors.forEach((error, key) => {
      const [row, col] = key.split('_').map(Number);
      
      // 추가된 열보다 뒤에 있는 열들의 인덱스 조정 (+1씩 증가)
      let newColIndex = col;
      if (col >= addedColIndex) {
        newColIndex++;
      }
      
      const newKey = `${row}_${newColIndex}`;
      newErrors.set(newKey, error);
    });
    
    // Vuex 상태 업데이트
    this.store.commit('SET_VALIDATION_ERRORS', newErrors);
  }

  /**
   * 여러 열 추가 후 오류 인덱스 재조정 (한 번에 처리)
   * @param {Array<number>} addedColIndices - 추가된 열 인덱스들 (오름차순)
   */
  reindexErrorsAfterMultipleColumnAddition(addedColIndices) {
    if (!addedColIndices || !Array.isArray(addedColIndices) || addedColIndices.length === 0) {
      return;
    }

    const currentErrors = this.store.state.validationState.errors;
    if (currentErrors.size === 0) return;

    const newErrors = new Map();
    const sortedIndices = [...addedColIndices].sort((a, b) => a - b);

    for (const [key, error] of currentErrors) {
      const [row, col] = key.split('_').map(Number);
      let newColIndex = col;
      let shiftCount = 0;

      // 삽입된 열들 중 현재 열보다 작은 것들의 개수만큼 이동
      for (const addedIndex of sortedIndices) {
        if (addedIndex <= col) {
          shiftCount++;
        }
      }

      newColIndex = col + shiftCount;
      const newKey = `${row}_${newColIndex}`;
      newErrors.set(newKey, error);
    }

    this.store.commit('SET_VALIDATION_ERRORS', newErrors);
  }

  /**
   * 열 삭제 후 오류 인덱스 재조정
   * @param {Array<number>} deletedColIndices
   */
  reindexErrorsAfterColumnDeletion(deletedColIndices) {
    if (this.debug) {
      console.log('[ValidationManager] reindexErrorsAfterColumnDeletion called with:', deletedColIndices);
      console.log('[ValidationManager] Errors before reindex:', Array.from(this.store.state.validationState.errors.keys()));
    }
    if (!deletedColIndices || !Array.isArray(deletedColIndices) || deletedColIndices.length === 0) {
      return;
    }

    const currentErrors = this.store.state.validationState.errors;
    if (currentErrors.size === 0) return;

    const newErrors = new Map();
    const sortedIndices = [...deletedColIndices].sort((a, b) => a - b);

    for (const [key, error] of currentErrors) {
      const [row, col] = key.split('_').map(Number);
      
      // 삭제된 열에 해당하는 오류는 제거
      if (deletedColIndices.includes(col)) {
        continue;
      }

      let newColIndex = col;
      let shiftCount = 0;

      // 삭제된 열들 중 현재 열보다 작은 것들의 개수만큼 이동
      for (const deletedIndex of sortedIndices) {
        if (deletedIndex < col) {
          shiftCount++;
        }
      }

      newColIndex = col - shiftCount;
      const newKey = `${row}_${newColIndex}`;
      newErrors.set(newKey, error);
    }

    this.store.commit('SET_VALIDATION_ERRORS', newErrors);

    if (this.debug) {
      console.log('[ValidationManager] Errors after reindex:', Array.from(newErrors.keys()));
    }
  }

  /** 컴포넌트 언마운트 시 리소스 정리 */
  destroy() {
    // 모든 타이머 정리
    this.validationTimers.forEach(timer => {
      if (timer && typeof clearTimeout === 'function') {
        clearTimeout(timer);
      }
    });
    this.validationTimers.clear();
    
    // 모든 오류 제거
    this.clearAllErrors();
    
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

  /* -------------------------------------------------- */
  /*                 Internal helpers                   */
  /* -------------------------------------------------- */

  /**
   * 실제 검증 수행
   */
  performValidation(rowIndex, colIndex, value, columnType) {
    console.log(`performValidation 호출: 행 ${rowIndex}, 열 ${colIndex}, 값 "${value}", 타입 "${columnType}"`);
    
    const result = _validateCell(value, columnType);
    
    console.log('검증 결과:', result);
    
    if (!result.valid) {
      console.log(`오류 추가: 행 ${rowIndex}, 열 ${colIndex}, 메시지: ${result.message}`);
      this.store.commit('ADD_VALIDATION_ERROR', {
        rowIndex,
        colIndex,
        message: result.message
      });
    } else {
      console.log(`오류 제거: 행 ${rowIndex}, 열 ${colIndex}`);
      this.store.commit('REMOVE_VALIDATION_ERROR', {
        rowIndex,
        colIndex
      });
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
      
      // 배열 범위 체크 추가
      if (columnMeta.cellIndex < 0 || columnMeta.cellIndex >= arr.length) {
        return '';
      }
      
      return arr[columnMeta.cellIndex] ?? '';
    }
    
    return row[columnMeta.dataKey] ?? '';
  }
}

export default ValidationManager; 