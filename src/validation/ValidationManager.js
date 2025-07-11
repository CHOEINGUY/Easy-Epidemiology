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
import { 
  getColumnUniqueKey, 
  getErrorKey, 
  parseErrorKey 
} from '../components/DataInputVirtualScroll/utils/validationUtils.js';

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
    this.columnMetas = []; // 현재 열 메타데이터 저장

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
              // Worker 결과는 colIndex 기반이므로 고유 식별자로 변환
              const columnMeta = this.columnMetas.find(meta => meta.colIndex === col);
              if (columnMeta) {
                const uniqueKey = getColumnUniqueKey(columnMeta);
                const errorKey = getErrorKey(row, uniqueKey);
                
                this.store.commit('ADD_VALIDATION_ERROR_BY_UNIQUE_KEY', {
                  errorKey,
                  message
                });
              } else {
                // fallback: 기존 방식
                this.store.commit('ADD_VALIDATION_ERROR', {
                  rowIndex: row,
                  colIndex: col,
                  message
                });
              }
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
  /*              고유 식별자 시스템                    */
  /* -------------------------------------------------- */

  // 고유 식별자 관련 함수들은 공통 유틸리티에서 import하여 사용
  getColumnUniqueKey = getColumnUniqueKey;
  getErrorKey = getErrorKey;
  parseErrorKey = parseErrorKey;

  /**
   * 열 메타데이터 배열에서 고유 식별자 매핑 생성
   * @param {Array} columnMetas - 열 메타데이터 배열
   * @returns {Object} {uniqueKey: columnMeta} 매핑
   */
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

  /**
   * 고유 식별자로 colIndex 찾기
   * @param {string} uniqueKey - 고유 식별자
   * @param {Array} columnMetas - 열 메타데이터 배열
   * @returns {number|null} colIndex
   */
  findColIndexByUniqueKey(uniqueKey, columnMetas) {
    const meta = columnMetas.find(col => this.getColumnUniqueKey(col) === uniqueKey);
    return meta ? meta.colIndex : null;
  }

  /**
   * 기존 colIndex 기반 에러를 고유 식별자 기반으로 마이그레이션
   * @param {Array} columnMetas - 현재 열 메타데이터 배열
   */
  migrateErrorsToUniqueKeys(columnMetas) {
    if (this.debug) {
      console.log('[ValidationManager] 기존 에러를 고유 식별자 기반으로 마이그레이션 시작');
    }

    const currentErrors = this.store.state.validationState.errors;
    if (!currentErrors || currentErrors.size === 0) {
      if (this.debug) {
        console.log('[ValidationManager] 마이그레이션할 에러가 없음');
      }
      return;
    }

    const newErrors = new Map();
    let migratedCount = 0;
    let skippedCount = 0;
    let alreadyUniqueCount = 0;

    for (const [oldKey, error] of currentErrors) {
      // 1. 이미 고유 키 형식인지 확인 (row_uniqueKey 형식)
      const parsed = this.parseErrorKey(oldKey);
      if (parsed) {
        // 이미 고유 키 형식이면 그대로 유지
        newErrors.set(oldKey, error);
        alreadyUniqueCount++;
        if (this.debug) {
          console.log(`[ValidationManager] 이미 고유 키 형식 유지: ${oldKey}`);
        }
        continue;
      }

      // 2. 기존 row_col 형식인지 확인
      const parts = oldKey.split('_');
      if (parts.length !== 2) {
        if (this.debug) {
          console.warn('[ValidationManager] 잘못된 에러 키 형식:', oldKey);
        }
        skippedCount++;
        continue;
      }

      const rowIndex = parseInt(parts[0]);
      const colIndex = parseInt(parts[1]);

      if (isNaN(rowIndex) || isNaN(colIndex)) {
        if (this.debug) {
          console.warn('[ValidationManager] 잘못된 행/열 인덱스:', oldKey);
        }
        skippedCount++;
        continue;
      }

      const columnMeta = columnMetas.find(meta => meta.colIndex === colIndex);
      if (!columnMeta) {
        if (this.debug) {
          console.warn('[ValidationManager] 해당 colIndex의 열 메타를 찾을 수 없음:', colIndex);
        }
        skippedCount++;
        continue;
      }

      const uniqueKey = this.getColumnUniqueKey(columnMeta);
      if (!uniqueKey) {
        if (this.debug) {
          console.warn('[ValidationManager] 고유 식별자를 생성할 수 없음:', columnMeta);
        }
        skippedCount++;
        continue;
      }

      const newKey = this.getErrorKey(rowIndex, uniqueKey);
      newErrors.set(newKey, error);
      migratedCount++;

      if (this.debug) {
        console.log(`[ValidationManager] 에러 마이그레이션: ${oldKey} -> ${newKey}`);
      }
    }

    // 새로운 에러 Map으로 교체
    this.store.commit('SET_VALIDATION_ERRORS', newErrors);

    if (this.debug) {
      console.log(`[ValidationManager] 마이그레이션 완료: 성공 ${migratedCount}개, 이미 고유 키 ${alreadyUniqueCount}개, 건너뜀 ${skippedCount}개`);
      this.printErrorKeys('마이그레이션 후', newErrors);
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
      // columnMeta를 찾아서 전달
      const columnMeta = this.columnMetas.find(meta => meta.colIndex === colIndex);
      this.performValidation(rowIndex, colIndex, value, columnType, columnMeta);
      return;
    }

    // 지연 검증
    const timerId = setTimeout(() => {
      if (!this._destroyed) {
        // columnMeta를 찾아서 전달
        const columnMeta = this.columnMetas.find(meta => meta.colIndex === colIndex);
        this.performValidation(rowIndex, colIndex, value, columnType, columnMeta);
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
              // 검증 결과를 스토어에 반영 (고유 식별자 기반)
              invalidCells.forEach(({ row, col, message }) => {
                const columnMeta = columnMetas.find(meta => meta.colIndex === col);
                if (columnMeta) {
                  const uniqueKey = getColumnUniqueKey(columnMeta);
                  const errorKey = getErrorKey(row, uniqueKey);
                  
                  this.store.commit('ADD_VALIDATION_ERROR_BY_UNIQUE_KEY', {
                    errorKey,
                    message
                  });
                } else {
                  // fallback: 기존 방식
                  this.store.commit('ADD_VALIDATION_ERROR', {
                    rowIndex: row,
                    colIndex: col,
                    message
                  });
                }
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
   * 삭제된 행/열에 해당하는 오류를 제거합니다. (고유 식별자 기반)
   * @param {Array<{row:number,col:number}>} cells
   */
  clearErrorsForCells(cells = []) {
    cells.forEach(({ row, col }) => {
      const columnMeta = this.columnMetas.find(meta => meta.colIndex === col);
      if (columnMeta) {
        const uniqueKey = getColumnUniqueKey(columnMeta);
        const errorKey = getErrorKey(row, uniqueKey);
        
        this.store.commit('REMOVE_VALIDATION_ERROR_BY_UNIQUE_KEY', { errorKey });
      } else {
        // fallback: 기존 방식
        this.store.commit('REMOVE_VALIDATION_ERROR', { rowIndex: row, colIndex: col });
      }
    });
  }

  /**
   * 특정 행의 모든 오류 제거 (고유 식별자 기반)
   * @param {number} rowIndex
   */
  clearErrorsForRow(rowIndex) {
    const errorsToRemove = [];
    
    this.store.state.validationState.errors.forEach((error, key) => {
      const parsed = parseErrorKey(key);
      if (parsed && parsed.rowIndex === rowIndex) {
        errorsToRemove.push(key);
      }
    });
    
    errorsToRemove.forEach(key => {
      this.store.commit('REMOVE_VALIDATION_ERROR_BY_UNIQUE_KEY', { errorKey: key });
    });
  }

  /**
   * 특정 열의 모든 오류 제거 (고유 식별자 기반)
   * @param {number} colIndex
   */
  clearErrorsForColumn(colIndex) {
    const errorsToRemove = [];
    
    // 해당 colIndex의 고유 식별자 찾기
    const columnMeta = this.columnMetas.find(meta => meta.colIndex === colIndex);
    if (!columnMeta) return;
    
    const uniqueKey = getColumnUniqueKey(columnMeta);
    if (!uniqueKey) return;
    
    this.store.state.validationState.errors.forEach((error, key) => {
      const parsed = parseErrorKey(key);
      if (parsed && parsed.uniqueKey === uniqueKey) {
        errorsToRemove.push(key);
      }
    });
    
    errorsToRemove.forEach(key => {
      this.store.commit('REMOVE_VALIDATION_ERROR_BY_UNIQUE_KEY', { errorKey: key });
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
  handleRowDeletion(deletedRowIndices, columnMetas = []) {
    console.log('[ValidationManager] handleRowDeletion 호출:', deletedRowIndices);
    
    // 고유 키 기반 재매핑 사용 (권장)
    if (columnMetas && columnMetas.length > 0) {
      this.remapValidationErrorsByRowDeletion(deletedRowIndices, columnMetas);
    } else {
      // 기존 방식 (fallback)
      console.log('[ValidationManager] columnMetas가 없어 기존 방식 사용');
      
      // 삭제된 행들의 검증 오류 제거
      deletedRowIndices.forEach(rowIndex => {
        this.clearErrorsForRow(rowIndex);
      });
      
      // 남은 행들의 인덱스 재조정
      this.reindexErrorsAfterRowDeletion(deletedRowIndices);
    }
  }

  /**
   * 열 추가 시 검증 처리
   * @param {number} colIndex - 추가된 열의 인덱스
   * @param {Object} columnMeta - 열 메타데이터
   * @param {Array} rows - 현재 데이터 행들
   */
  handleColumnAddition(colIndex, columnMeta, rows = []) {
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
   * 확진자 여부 열 전용 검증 처리
   * @param {Array<{rowIndex: number, value: string}>} confirmedCaseData - 검증할 데이터 배열
   * @param {number} colIndex - 확진자 여부 열의 인덱스
   * @param {Function} onProgress - 진행률 콜백 (선택사항)
   */
  validateConfirmedCaseColumn(confirmedCaseData, colIndex, onProgress = null) {
    if (!confirmedCaseData || confirmedCaseData.length === 0) return;
    
    console.log('ValidationManager.validateConfirmedCaseColumn 호출됨');
    console.log('입력 데이터:', confirmedCaseData);
    console.log('열 인덱스:', colIndex);
    
    const totalCells = confirmedCaseData.length;
    const chunkSize = 50; // 작은 청크로 빠른 응답성 확보
    
    // 청크 단위로 검증 수행
    for (let i = 0; i < totalCells; i += chunkSize) {
      const chunk = confirmedCaseData.slice(i, i + chunkSize);
      
      // 청크 검증
      chunk.forEach(({ rowIndex, value }) => {
        if (value !== '' && value !== null && value !== undefined) {
          console.log(`검증 중: 행 ${rowIndex}, 열 ${colIndex}, 값 "${value}"`);
          this.validateCell(rowIndex, colIndex, value, 'isConfirmedCase', true);
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
    
    console.log('ValidationManager.validateConfirmedCaseColumn 완료');
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
   * 붙여넣기 시 검증 처리 (개선된 버전)
   * @param {Array<Array<*>>} pasteData
   * @param {number} startRow
   * @param {number} startCol
   * @param {Array<object>} columnMetas
   * @param {Object} options - 추가 옵션
   */
  handlePasteData(pasteData, startRow, startCol, columnMetas) {
    console.log('[ValidationManager] handlePasteData 호출됨', pasteData, startRow, startCol, columnMetas);
    pasteData.forEach((row, rowOffset) => {
      const rowIndex = startRow + rowOffset;
      row.forEach((value, colOffset) => {
        const colIndex = startCol + colOffset;
        const columnMeta = columnMetas.find(c => c.colIndex === colIndex);
        if (columnMeta && columnMeta.isEditable) {
          console.log('[ValidationManager] validateCell 호출', rowIndex, colIndex, value, columnMeta.dataKey);
          this.store.commit('REMOVE_VALIDATION_ERROR', { rowIndex, colIndex });
          if (value !== '' && value !== null && value !== undefined) {
            this.validateCell(rowIndex, colIndex, value, columnMeta.dataKey, true);
          }
        }
      });
    });
  }

  /**
   * 붙여넣기 영역의 기존 오류 제거
   * @private
   */
  _clearErrorsInPasteArea(startRow, startCol, rowCount, colCount) {
    const errorsToRemove = [];
    
    this.store.state.validationState.errors.forEach((error, key) => {
      const [errorRow, errorCol] = key.split('_').map(Number);
      
      // 붙여넣기 영역 내의 오류인지 확인
      if (errorRow >= startRow && 
          errorRow < startRow + rowCount &&
          errorCol >= startCol && 
          errorCol < startCol + colCount) {
        errorsToRemove.push(key);
      }
    });

    // 오류 제거
    errorsToRemove.forEach(key => {
      const [row, col] = key.split('_').map(Number);
      this.store.commit('REMOVE_VALIDATION_ERROR', { rowIndex: row, colIndex: col });
    });

    if (errorsToRemove.length > 0) {
      console.log(`[ValidationManager] 붙여넣기 영역 기존 오류 ${errorsToRemove.length}개 제거`);
    }
  }

  /**
   * 즉시 셀 검증 (지연 없이)
   * @private
   */
  _validateCellImmediate(rowIndex, colIndex, value, columnType, columnMeta) {
    const result = _validateCell(value, columnType);
    
    if (!result.valid) {
      // 고유 식별자 기반으로 에러 추가
      if (columnMeta) {
        const uniqueKey = this.getColumnUniqueKey(columnMeta);
        const errorKey = this.getErrorKey(rowIndex, uniqueKey);
        
        this.store.commit('ADD_VALIDATION_ERROR_BY_UNIQUE_KEY', {
          errorKey,
          message: result.message
        });
      } else {
        // 하위 호환성을 위한 기존 방식
        this.store.commit('ADD_VALIDATION_ERROR', {
          rowIndex,
          colIndex,
          message: result.message
        });
      }
    }
    
    return result;
  }

  /**
   * 붙여넣기 검증 결과 요약 표시
   * @private
   */
  _showPasteValidationSummary(errors, totalCells) {
    const errorCount = errors.length;
    const errorRate = ((errorCount / totalCells) * 100).toFixed(1);
    
    // 오류 타입별 분류
    const errorTypes = {};
    errors.forEach(error => {
      errorTypes[error.type] = (errorTypes[error.type] || 0) + 1;
    });

    console.group('[ValidationManager] 붙여넣기 검증 결과');
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

    // 사용자에게 토스트 메시지 표시 (옵션)
    if (typeof window !== 'undefined' && window.showToast) {
      const message = `붙여넣기 완료: ${totalCells}개 셀 중 ${errorCount}개 오류 발견 (${errorRate}%)`;
      const type = errorCount > 0 ? 'warning' : 'success';
      window.showToast(message, type);
    }
  }

  /**
   * 행 삭제 후 오류 인덱스 재조정
   * @param {Array<number>} deletedRowIndices
   */
  reindexErrorsAfterRowDeletion(deletedRowIndices) {
    if (!deletedRowIndices || !Array.isArray(deletedRowIndices) || deletedRowIndices.length === 0) {
      return;
    }

    const currentErrors = this.store.state.validationState.errors;
    if (currentErrors.size === 0) return;

    const newErrors = new Map();
    const sortedIndices = [...deletedRowIndices].sort((a, b) => a - b);

    for (const [key, error] of currentErrors) {
      const [row, col] = key.split('_').map(Number);
      
      // 삭제된 행에 해당하는 오류는 제거
      if (deletedRowIndices.includes(row)) {
        continue;
      }

      let newRowIndex = row;
      let shiftCount = 0;

      // 삭제된 행들 중 현재 행보다 작은 것들의 개수만큼 이동
      for (const deletedIndex of sortedIndices) {
        if (deletedIndex < row) {
          shiftCount++;
        }
      }

      newRowIndex = row - shiftCount;
      const newKey = `${newRowIndex}_${col}`;
      newErrors.set(newKey, error);
    }

    this.store.commit('SET_VALIDATION_ERRORS', newErrors);
  }

  /**
   * 행 삭제 시 고유 키 기반 validationErrors 재매핑
   * @param {Array<number>} deletedRowIndices - 삭제된 행 인덱스 배열
   * @param {Array} columnMetas - 현재 열 메타데이터 배열 (향후 확장용)
   */
  remapValidationErrorsByRowDeletion(deletedRowIndices, columnMetas) {
    // eslint-disable-next-line no-unused-vars
    const _columnMetas = columnMetas; // 향후 확장을 위해 보존
    if (!deletedRowIndices || !Array.isArray(deletedRowIndices) || deletedRowIndices.length === 0) {
      console.log('[ValidationManager] remapValidationErrorsByRowDeletion: 삭제된 행이 없음');
      return;
    }

    const currentErrors = this.store.state.validationState.errors;
    if (!currentErrors || currentErrors.size === 0) {
      console.log('[ValidationManager] remapValidationErrorsByRowDeletion: 재매핑할 오류가 없음');
      return;
    }

    console.log('[ValidationManager] remapValidationErrorsByRowDeletion 시작');
    console.log('[ValidationManager] 삭제된 행 인덱스:', deletedRowIndices);
    console.log('[ValidationManager] 변경 전 오류 개수:', currentErrors.size);
    console.log('[ValidationManager] 변경 전 오류 키들:', Array.from(currentErrors.keys()));

    // 1. 삭제된 행들의 오류 제거 및 아래 행들의 오류 키 재계산
    const newErrors = new Map();
    const sortedDeletedIndices = [...deletedRowIndices].sort((a, b) => a - b);

    for (const [oldErrorKey, error] of currentErrors) {
      // 오류 키 파싱
      const parsed = this.parseErrorKey(oldErrorKey);
      if (!parsed) {
        console.warn('[ValidationManager] 잘못된 오류 키 형식:', oldErrorKey);
        continue;
      }

      const { rowIndex, uniqueKey } = parsed;

      // 삭제된 행의 오류는 제거
      if (deletedRowIndices.includes(rowIndex)) {
        console.log(`[ValidationManager] 삭제된 행의 오류 제거: ${oldErrorKey}`);
        continue;
      }

      // 아래 행들의 오류 키 재계산
      let newRowIndex = rowIndex;
      let shiftCount = 0;

      // 삭제된 행들 중 현재 행보다 작은 것들의 개수만큼 이동
      for (const deletedIndex of sortedDeletedIndices) {
        if (deletedIndex < rowIndex) {
          shiftCount++;
        }
      }

      newRowIndex = rowIndex - shiftCount;
      const newErrorKey = this.getErrorKey(newRowIndex, uniqueKey);

      newErrors.set(newErrorKey, error);
      console.log(`[ValidationManager] 오류 키 변환: ${oldErrorKey} -> ${newErrorKey}`);
    }

    console.log('[ValidationManager] 변경 후 오류 개수:', newErrors.size);
    console.log('[ValidationManager] 변경 후 오류 키들:', Array.from(newErrors.keys()));

    // 2. 새로운 오류 맵 적용
    this.store.commit('SET_VALIDATION_ERRORS', newErrors);
  }

  /**
   * 디버깅용: 에러 키들 출력
   * @param {string} label - 라벨
   * @param {Map} errors - 에러 맵
   */
  printErrorKeys(label, errors) {
    if (!this.debug) return;
    
    console.log(`[ValidationManager] ${label}:`, Array.from(errors.keys()));
  }

  /**
   * 디버깅용: 고유 키 매핑 출력
   * @param {Array} columnMetas - 컬럼 메타 배열
   */
  printUniqueKeyMapping(columnMetas) {
    if (!this.debug) return;
    
    const mapping = {};
    columnMetas.forEach(col => {
      const uniqueKey = this.getColumnUniqueKey(col);
      mapping[`${col.type}[${col.cellIndex}]`] = uniqueKey;
    });
    console.log('[ValidationManager] 고유 키 매핑:', mapping);
  }

  /**
   * 컬럼 메타데이터 업데이트
   * @param {Array} columnMetas - 새로운 컬럼 메타 배열
   */
  updateColumnMetas(columnMetas) {
    this.columnMetas = columnMetas;
    console.log('[ValidationManager] 열 메타데이터 업데이트:', columnMetas.length, '개');
  }

  /**
   * 디버깅용: 에러 차이 출력
   * @param {Map} before - 변경 전 에러 맵
   * @param {Map} after - 변경 후 에러 맵
   */
  printErrorDiff(before, after) {
    if (!this.debug) return;
    
    const beforeKeys = Array.from(before.keys());
    const afterKeys = Array.from(after.keys());
    
    const removed = beforeKeys.filter(key => !afterKeys.includes(key));
    const added = afterKeys.filter(key => !beforeKeys.includes(key));
    
    console.log('[ValidationManager] 제거된 에러:', removed);
    console.log('[ValidationManager] 추가된 에러:', added);
  }

  /**
   * 열 구조 변경 후 validationErrors Map의 키를 올바르게 재매핑
   * 구조적 변경(삽입/삭제)을 감지하여 에러 위치를 정확히 재조정
   * @param {Array} oldColumnsMeta - 변경 전 컬럼 메타 배열
   * @param {Array} newColumnsMeta - 변경 후 컬럼 메타 배열
   * @param {Array} deletedColIndices - 삭제된 열의 colIndex 배열 (선택적)
   */
  remapValidationErrorsByColumnIdentity(oldColumnsMeta, newColumnsMeta, deletedColIndices = []) {
    const currentErrors = this.store.state.validationState.errors;
    if (!currentErrors || currentErrors.size === 0) {
      return;
    }

    console.log('[ValidationManager] remapValidationErrorsByColumnIdentity 시작');
    console.log('[ValidationManager] 변경 전 에러 개수:', currentErrors.size);
    console.log('[ValidationManager] 변경 전 에러 키들:', Array.from(currentErrors.keys()));
    console.log('[ValidationManager] deletedColIndices:', deletedColIndices);

    // 1. 구조적 변경 사항 분석
    const structuralChanges = this._analyzeStructuralChanges(oldColumnsMeta, newColumnsMeta, deletedColIndices);
    console.log('[ValidationManager] 구조적 변경 사항:', structuralChanges);
    
    // 2. 각 에러에 대해 새로운 위치 계산
    const newErrors = new Map();
    const rows = this.store.state.rows || [];

    for (const [oldErrorKey, error] of currentErrors) {
      const newErrorKey = this._calculateNewErrorKey(oldErrorKey, structuralChanges, oldColumnsMeta, newColumnsMeta, rows);
      
      if (newErrorKey) {
        newErrors.set(newErrorKey, error);
        console.log(`[ValidationManager] 에러 키 변환: ${oldErrorKey} -> ${newErrorKey}`);
      } else {
        console.log(`[ValidationManager] 에러 키 제거: ${oldErrorKey} (삭제된 열)`);
      }
    }

    console.log('[ValidationManager] 변경 후 에러 개수:', newErrors.size);
    console.log('[ValidationManager] 변경 후 에러 키들:', Array.from(newErrors.keys()));

    // 3. 새로운 에러 맵 적용
    this.store.commit('SET_VALIDATION_ERRORS', newErrors);
    
    // 4. 새로 추가된 열들에 대한 검증 수행
    const currentRows = this.store.state.rows || [];
    if (structuralChanges.insertions.length > 0 && currentRows.length > 0) {
      for (const insertion of structuralChanges.insertions) {
        // 새로 추가된 열들 찾기
        const addedColumns = newColumnsMeta.filter(col => {
          const colUniqueKey = this.getColumnUniqueKey(col);
          return colUniqueKey.includes(`__${insertion.position}`) || 
                 (col.colIndex >= insertion.position && col.colIndex < insertion.position + insertion.count);
        });
        
        // 각 행에 대해 새로 추가된 열들 검증
        currentRows.forEach((row, rowIndex) => {
          addedColumns.forEach(columnMeta => {
            const value = this._getCellValue(row, columnMeta);
            if (value !== '' && value !== null && value !== undefined) {
              this.validateCell(rowIndex, columnMeta.colIndex, value, columnMeta.type, true);
            }
          });
        });
      }
    }
  }

  /**
   * 구조적 변경 사항을 분석하여 변경 정보를 반환
   * @param {Array} oldColumnsMeta - 변경 전 컬럼 메타 배열
   * @param {Array} newColumnsMeta - 변경 후 컬럼 메타 배열
   * @param {Array} deletedColIndices - 삭제된 열의 colIndex 배열 (선택적)
   * @returns {Object} 구조적 변경 정보
   */
  _analyzeStructuralChanges(oldColumnsMeta, newColumnsMeta, deletedColIndices = []) {
    console.log('[ValidationManager] _analyzeStructuralChanges 시작');
    console.log('[ValidationManager] 변경 전 열 개수:', oldColumnsMeta.length);
    console.log('[ValidationManager] 변경 후 열 개수:', newColumnsMeta.length);
    
    const changes = {
      insertions: [],     // { position: colIndex, count: number, type: string }
      deletions: [],      // { position: colIndex, count: number, type: string }
      typeChanges: {},    // { [oldColIndex]: newColIndex }
      totalOldCols: oldColumnsMeta.length,
      totalNewCols: newColumnsMeta.length
    };

    // 1. 타입별 그룹 분석
    const oldGroups = this._groupColumnsByType(oldColumnsMeta);
    const newGroups = this._groupColumnsByType(newColumnsMeta);
    
    console.log('[ValidationManager] 변경 전 타입별 그룹:', oldGroups);
    console.log('[ValidationManager] 변경 후 타입별 그룹:', newGroups);

    // 2. 각 타입별로 변경 사항 분석
    for (const type of new Set([...Object.keys(oldGroups), ...Object.keys(newGroups)])) {
      const oldCols = oldGroups[type] || [];
      const newCols = newGroups[type] || [];
      
      console.log(`[ValidationManager] 타입 ${type} 분석: 기존 ${oldCols.length}개 -> 새로 ${newCols.length}개`);
      
      if (oldCols.length !== newCols.length) {
        if (newCols.length > oldCols.length) {
          // 열 추가
          const addedCount = newCols.length - oldCols.length;
          const insertPosition = this._findInsertionPosition(oldCols, newCols);
          changes.insertions.push({
            position: insertPosition,
            count: addedCount,
            type
          });
          console.log(`[ValidationManager] 열 추가 감지: ${type}, position=${insertPosition}, count=${addedCount}`);
        } else {
          // 열 삭제
          const deletedCount = oldCols.length - newCols.length;
          
          // deletedColIndices가 있으면 그것을 사용, 없으면 기존 방식 사용
          let deletePosition;
          if (deletedColIndices.length > 0) {
            // deletedColIndices에서 해당 타입의 열을 찾아서 cellIndex 반환
            const deletedCol = oldCols.find(col => deletedColIndices.includes(col.colIndex));
            if (deletedCol) {
              deletePosition = deletedCol.cellIndex !== undefined ? deletedCol.cellIndex : deletedCol.colIndex;
              console.log(`[ValidationManager] deletedColIndices 사용: colIndex=${deletedCol.colIndex}, cellIndex=${deletePosition}`);
            } else {
              deletePosition = this._findDeletionPosition(oldCols, newCols);
              console.log(`[ValidationManager] deletedColIndices에서 해당 타입 열을 찾을 수 없음, 기존 방식 사용: ${deletePosition}`);
            }
          } else {
            deletePosition = this._findDeletionPosition(oldCols, newCols);
          }
          
          changes.deletions.push({
            position: deletePosition, // 이제 cellIndex
            count: deletedCount,
            type
          });
          console.log(`[ValidationManager] 열 삭제 감지: ${type}, position(cellIndex)=${deletePosition}, count=${deletedCount}`);
        }
      }
    }

    // 3. 열 매핑 (타입과 cellIndex 기반)
    for (const oldCol of oldColumnsMeta) {
      const matchingNewCol = newColumnsMeta.find(newCol => 
        newCol.type === oldCol.type && 
        newCol.cellIndex === oldCol.cellIndex &&
        (newCol.group || '') === (oldCol.group || '')
      );
      
      if (matchingNewCol) {
        changes.typeChanges[oldCol.colIndex] = matchingNewCol.colIndex;
        console.log(`[ValidationManager] 열 매핑: ${oldCol.colIndex} -> ${matchingNewCol.colIndex} (${oldCol.type})`);
      }
    }

    console.log('[ValidationManager] 최종 구조적 변경 사항:', changes);
    return changes;
  }

  /**
   * 타입별로 컬럼을 그룹화
   * @param {Array} columnsMeta - 컬럼 메타 배열
   * @returns {Object} 타입별 그룹화된 컬럼 정보
   */
  _groupColumnsByType(columnsMeta) {
    const groups = {};
    for (const col of columnsMeta) {
      if (!groups[col.type]) {
        groups[col.type] = [];
      }
      groups[col.type].push(col);
    }
    return groups;
  }

  /**
   * 열 추가 위치 찾기 (삽입 영향을 받는 첫 번째 위치)
   * @param {Array} oldCols - 변경 전 같은 타입 열들
   * @param {Array} newCols - 변경 후 같은 타입 열들
   * @returns {number} 삽입 영향 시작 위치 (colIndex)
   */
  _findInsertionPosition(oldCols, newCols) {
    // 기존 열들의 colIndex 세트
    const oldColIndices = new Set(oldCols.map(col => col.colIndex));
    
    // 새로 추가된 열들을 찾기
    const newColsAdded = newCols.filter(col => !oldColIndices.has(col.colIndex));
    
    if (newColsAdded.length > 0) {
      // 새로 추가된 열 중 가장 작은 colIndex
      const minNewColIndex = Math.min(...newColsAdded.map(col => col.colIndex));
      
      return minNewColIndex;
    }
    
    // 기본값: 그룹의 시작 위치
    return oldCols.length > 0 ? oldCols[0].colIndex : 0;
  }

  /**
   * 열 삭제 위치 찾기
   * @param {Array} oldCols - 변경 전 같은 타입 열들
   * @param {Array} newCols - 변경 후 같은 타입 열들
   * @returns {number} 삭제 위치 (colIndex)
   */
  _findDeletionPosition(oldCols, newCols) {
    console.log(`[ValidationManager] _findDeletionPosition 시작: oldCols=${oldCols.length}개, newCols=${newCols.length}개`);
    
    // 기존 열들 중 새로운 열 목록에 없는 열의 위치 찾기
    const newColIndices = new Set(newCols.map(col => col.colIndex));
    const deletedCols = oldCols.filter(col => !newColIndices.has(col.colIndex));
    
    console.log('[ValidationManager] _findDeletionPosition: newColIndices=', Array.from(newColIndices));
    console.log('[ValidationManager] _findDeletionPosition: deletedCols=', deletedCols.map(col => ({ colIndex: col.colIndex, cellIndex: col.cellIndex, type: col.type })));
    
    if (deletedCols.length > 0) {
      // 삭제된 열들 중 가장 작은 colIndex를 가진 열을 찾아서 그 열의 cellIndex를 반환
      const deletedColWithMinColIndex = deletedCols.reduce((min, col) => {
        return col.colIndex < min.colIndex ? col : min;
      });
      
      const deletionCellIndex = deletedColWithMinColIndex.cellIndex !== undefined ? 
        deletedColWithMinColIndex.cellIndex : deletedColWithMinColIndex.colIndex;
      
      console.log(`[ValidationManager] _findDeletionPosition: 삭제된 열 cellIndex=${deletionCellIndex}, colIndex=${deletedColWithMinColIndex.colIndex}`);
      return deletionCellIndex;
    }
    
    console.log('[ValidationManager] _findDeletionPosition: 삭제된 열이 없음, 기본값 반환');
    // 기본값: 그룹의 마지막 위치
    return oldCols.length > 0 ? 
      (oldCols[oldCols.length - 1].cellIndex !== undefined ? oldCols[oldCols.length - 1].cellIndex : oldCols[oldCols.length - 1].colIndex) : 0;
  }

  /**
   * 기존 에러 키에 대한 새로운 에러 키 계산
   * @param {string} oldErrorKey - 기존 에러 키
   * @param {Object} structuralChanges - 구조적 변경 정보
   * @param {Array} oldColumnsMeta - 변경 전 컬럼 메타 배열
   * @param {Array} newColumnsMeta - 변경 후 컬럼 메타 배열
   * @param {Array} rows - 현재 데이터 행들
   * @returns {string|null} 새로운 에러 키 또는 null (제거해야 하는 경우)
   */
  _calculateNewErrorKey(oldErrorKey, structuralChanges, oldColumnsMeta, newColumnsMeta, rows) {
    console.log(`[ValidationManager] _calculateNewErrorKey 시작: ${oldErrorKey}`);
    
    // 1. 기존 에러 키 파싱
    const isUniqueKeyFormat = oldErrorKey.includes('__') || oldErrorKey.includes('confirmed_case') || oldErrorKey.includes('patient_id') || oldErrorKey.includes('patient_name') || oldErrorKey.includes('exposure_');
    let rowIndex, colIndex, newCellIndex;
    
    if (isUniqueKeyFormat) {
      console.log(`[ValidationManager] 고유 식별자 기반 키 처리: ${oldErrorKey}`);
      
      // 고유 식별자 기반 키 파싱
      const parsed = this.parseErrorKey(oldErrorKey);
      if (!parsed) {
        console.log(`[ValidationManager] 키 파싱 실패: ${oldErrorKey}`);
        return null;
      }
      
      rowIndex = parsed.rowIndex;
      console.log(`[ValidationManager] 파싱 결과: rowIndex=${rowIndex}, uniqueKey=${parsed.uniqueKey}`);
      
      // 고유 식별자에서 cellIndex 추출
      const uniqueKeyParts = parsed.uniqueKey.split('__');
      const oldCellIndex = uniqueKeyParts.length > 1 ? parseInt(uniqueKeyParts[uniqueKeyParts.length - 1]) : null;
      console.log(`[ValidationManager] oldCellIndex: ${oldCellIndex}`);
      
      // cellIndex가 있는 경우 구조적 변경에 따라 새로운 cellIndex 계산
      newCellIndex = oldCellIndex;
      if (oldCellIndex !== null && !isNaN(oldCellIndex)) {
        // 삽입 사항 적용하여 cellIndex 재계산 (같은 타입의 열에만 적용)
        for (const insertion of structuralChanges.insertions) {
          // 같은 타입의 열 삽입에만 cellIndex 변경 적용
          const currentColumnType = uniqueKeyParts[0]; // 첫 번째 부분이 타입 (예: clinicalSymptoms)
          
          // 특수 열들의 타입 매칭 처리
          let isMatchingType = false;
          if (insertion.type === currentColumnType) {
            isMatchingType = true;
          } else if (insertion.type === 'isConfirmedCase' && currentColumnType === 'confirmed') {
            isMatchingType = true;
          } else if (insertion.type === 'patientId' && currentColumnType === 'patient') {
            isMatchingType = true;
          } else if (insertion.type === 'patientName' && currentColumnType === 'patient') {
            isMatchingType = true;
          } else if (insertion.type === 'individualExposureTime' && currentColumnType === 'exposure') {
            isMatchingType = true;
          }
          
          // 기존 colIndex 기반 position 값을 cellIndex 로 변환 (같은 타입 그룹 내부)
          const insertionPosMeta = newColumnsMeta.find(col => col.colIndex === insertion.position && col.type === insertion.type);
          const insertionPosCellIndex = insertionPosMeta && insertionPosMeta.cellIndex !== undefined ? insertionPosMeta.cellIndex : insertion.position;
          
          if (isMatchingType && oldCellIndex >= insertionPosCellIndex) {
            newCellIndex += insertion.count;
            console.log(`[ValidationManager] 삽입 적용: oldCellIndex=${oldCellIndex} -> newCellIndex=${newCellIndex} (${insertion.type})`);
          }
        }
        
        // 삭제 사항 적용하여 cellIndex 재계산 (같은 타입의 열에만 적용)
        for (const deletion of structuralChanges.deletions) {
          console.log(`[ValidationManager] 삭제 사항 처리: ${deletion.type}, position=${deletion.position}, count=${deletion.count}`);
          console.log('[ValidationManager] 삭제 사항 원본:', deletion);
          
          // 같은 타입의 열 삭제에만 cellIndex 변경 적용
          const currentColumnType = uniqueKeyParts[0]; // 첫 번째 부분이 타입
          
          // 특수 열들의 타입 매칭 처리
          let isMatchingType = false;
          if (deletion.type === currentColumnType) {
            isMatchingType = true;
          } else if (deletion.type === 'isConfirmedCase' && currentColumnType === 'confirmed') {
            isMatchingType = true;
          } else if (deletion.type === 'patientId' && currentColumnType === 'patient') {
            isMatchingType = true;
          } else if (deletion.type === 'patientName' && currentColumnType === 'patient') {
            isMatchingType = true;
          } else if (deletion.type === 'individualExposureTime' && currentColumnType === 'exposure') {
            isMatchingType = true;
          }
          
          console.log(`[ValidationManager] 타입 매칭: currentColumnType=${currentColumnType}, deletion.type=${deletion.type}, isMatchingType=${isMatchingType}`);
          
          // deletion.position은 이제 cellIndex
          const deletionPosCellIndex = deletion.position;
          console.log(`[ValidationManager] deletionPosCellIndex: ${deletionPosCellIndex}`);
          
          if (isMatchingType) {
            if (oldCellIndex >= deletionPosCellIndex + deletion.count) {
              // 삭제된 범위 이후의 열들은 삭제된 개수만큼 앞으로 이동
              newCellIndex -= deletion.count;
              console.log(`[ValidationManager] 삭제 후 이동: oldCellIndex=${oldCellIndex} -> newCellIndex=${newCellIndex}`);
            } else if (oldCellIndex >= deletionPosCellIndex) {
              // 삭제된 범위 내의 열들은 삭제된 위치로 이동 (첫 번째 삭제된 열의 위치)
              newCellIndex = deletionPosCellIndex;
              console.log(`[ValidationManager] 삭제된 범위 내 이동: oldCellIndex=${oldCellIndex} -> newCellIndex=${newCellIndex}`);
            }
          }
        }
      }
      
      // 새로운 cellIndex로 고유 식별자 재구성
      let newUniqueKey;
      if (oldCellIndex !== null && !isNaN(oldCellIndex)) {
        // cellIndex가 있는 경우
        const baseUniqueKey = uniqueKeyParts.slice(0, -1).join('__');
        newUniqueKey = newCellIndex !== null && !isNaN(newCellIndex) 
          ? `${baseUniqueKey}__${newCellIndex}`
          : baseUniqueKey;
      } else {
        // cellIndex가 없는 기본 열인 경우 (예: clinicalSymptoms__clinicalSymptoms)
        // 구조적 변경에 따라 cellIndex가 추가되었는지 확인
        if (structuralChanges.insertions.length > 0) {
          // 열 삽입이 있으면 기본 고유 키를 그대로 사용
          newUniqueKey = parsed.uniqueKey;
        } else {
          // 삽입이 없으면 기존 키 그대로 사용
          newUniqueKey = parsed.uniqueKey;
        }
      }
      
      console.log(`[ValidationManager] 재구성된 고유 키: ${newUniqueKey}`);
      
      // 새로운 고유 식별자로 colIndex 찾기
      const matchingNewCol = newColumnsMeta.find(col => {
        const colUniqueKey = this.getColumnUniqueKey(col);
        console.log(`[ValidationManager] 비교: ${colUniqueKey} vs ${newUniqueKey}`);
        return colUniqueKey === newUniqueKey;
      });
      
      if (!matchingNewCol) {
        console.log(`[ValidationManager] 매칭되는 새 열을 찾을 수 없음: ${newUniqueKey}`);
        console.log('[ValidationManager] 사용 가능한 새 열들:');
        newColumnsMeta.forEach(col => {
          const colUniqueKey = this.getColumnUniqueKey(col);
          console.log(`  - colIndex=${col.colIndex}, type=${col.type}, cellIndex=${col.cellIndex}, uniqueKey=${colUniqueKey}`);
        });
        
        // 고유 키 매칭이 실패한 경우, 타입과 cellIndex로 직접 찾기 시도
        // currentColumnType은 uniqueKey에서 파싱된 타입 정보를 사용
        const uniqueKeyParts = newUniqueKey.split('__');
        const fallbackType = uniqueKeyParts.length > 1 ? uniqueKeyParts[1] : null;
        
        console.log(`[ValidationManager] 타입과 cellIndex로 직접 찾기 시도: type=${fallbackType}, newCellIndex=${newCellIndex}`);
        const fallbackMatch = newColumnsMeta.find(col => 
          col.type === fallbackType && 
          col.cellIndex === newCellIndex
        );
        
        if (fallbackMatch) {
          console.log(`[ValidationManager] 대체 매칭 성공: colIndex=${fallbackMatch.colIndex}`);
          colIndex = fallbackMatch.colIndex;
        } else {
          console.log('[ValidationManager] 대체 매칭도 실패');
          return null;
        }
      } else {
        colIndex = matchingNewCol.colIndex;
        console.log(`[ValidationManager] 매칭된 새 열: colIndex=${colIndex}`);
      }
    } else {
      console.log(`[ValidationManager] 기존 rowIndex_colIndex 형식 키 처리: ${oldErrorKey}`);
      
      // 기존 rowIndex_colIndex 형식 키 파싱
      const parts = oldErrorKey.split('_');
      if (parts.length !== 2) return null;
      
      rowIndex = parseInt(parts[0]);
      const oldColIndex = parseInt(parts[1]);
      
      // 구조적 변경 사항 적용하여 새로운 colIndex 계산
      const newColIndex = this._calculateNewColIndex(oldColIndex, structuralChanges, oldColumnsMeta, newColumnsMeta);
      if (newColIndex === null) {
        return null;
      }
      
      colIndex = newColIndex;
    }

    // 2. 새로운 위치의 유효성 검사
    const newColumnMeta = newColumnsMeta.find(col => col.colIndex === colIndex);
    if (!newColumnMeta) {
      console.log(`[ValidationManager] 새로운 위치의 열 메타를 찾을 수 없음: colIndex=${colIndex}`);
      return null;
    }

    // 3. 해당 셀에 실제 값이 있는지 확인 (중요: 새로운 cellIndex 사용)
    if (rows[rowIndex]) {
      // 새로운 cellIndex가 계산된 경우, 임시로 columnMeta의 cellIndex를 업데이트하여 값 확인
      const tempColumnMeta = { ...newColumnMeta };
      if (newCellIndex !== null && newCellIndex !== undefined && !isNaN(newCellIndex)) {
        tempColumnMeta.cellIndex = newCellIndex;
      }
      
      // 구조적 변경이 있더라도 빈 값에 대해서는 에러를 마이그레이션하지 않음
      const hasValue = this._cellHasValue(rows[rowIndex], tempColumnMeta);
      if (!hasValue) {
        console.log(`[ValidationManager] 빈 값이므로 에러 제거: rowIndex=${rowIndex}, colIndex=${colIndex}`);
        return null;
      }
    } else {
      console.log(`[ValidationManager] 행이 존재하지 않음: rowIndex=${rowIndex}`);
      return null;
    }

    // 4. 새로운 에러 키 생성
    let newErrorKey;
    if (isUniqueKeyFormat) {
      // cellIndex 보정이 이뤄진 경우(삽입/삭제 후) getColumnUniqueKey 가
      // 최신 cellIndex 값을 이용하도록 columnMeta 사본을 수정한다
      const finalColMeta = { ...newColumnMeta };
      if (newCellIndex !== undefined && newCellIndex !== null && !isNaN(newCellIndex)) {
        finalColMeta.cellIndex = newCellIndex;
      }
      const finalUniqueKey = this.getColumnUniqueKey(finalColMeta);
      newErrorKey = this.getErrorKey(rowIndex, finalUniqueKey);
    } else {
      newErrorKey = `${rowIndex}_${colIndex}`;
    }
    
    console.log(`[ValidationManager] 최종 에러 키: ${newErrorKey}`);
    return newErrorKey;
  }

  /**
   * 구조적 변경 사항을 적용하여 새로운 colIndex 계산
   * @param {number} oldColIndex - 기존 colIndex
   * @param {Object} structuralChanges - 구조적 변경 정보
   * @param {Array} oldColumnsMeta - 변경 전 컬럼 메타 배열
   * @param {Array} newColumnsMeta - 변경 후 컬럼 메타 배열
   * @returns {number|null} 새로운 colIndex 또는 null (제거해야 하는 경우)
   */
  _calculateNewColIndex(oldColIndex, structuralChanges, oldColumnsMeta, newColumnsMeta) {
    const oldColumnMeta = oldColumnsMeta.find(col => col.colIndex === oldColIndex);
    if (!oldColumnMeta) {
      return null;
    }

    // 1. 직접 매핑이 있는 경우 (동일한 논리적 열)
    if (structuralChanges.typeChanges[oldColIndex] !== undefined) {
      const directMappedIndex = structuralChanges.typeChanges[oldColIndex];
      return directMappedIndex;
    }

    // 2. 같은 타입의 새로운 열 찾기 (논리적 동일성 기반)
    const matchingNewCol = newColumnsMeta.find(col => 
      col.type === oldColumnMeta.type && 
      col.cellIndex === oldColumnMeta.cellIndex &&
      (col.group || '') === (oldColumnMeta.group || '')
    );
    
    if (matchingNewCol) {
      return matchingNewCol.colIndex;
    }

    // 3. 구조적 변경 사항 적용 (위치 기반 이동)
    let newColIndex = oldColIndex;
    
    // 삽입 사항 적용
    for (const insertion of structuralChanges.insertions) {
      if (oldColIndex >= insertion.position) {
        newColIndex += insertion.count;
      }
    }
    
    // 삭제 사항 적용
    for (const deletion of structuralChanges.deletions) {
      if (oldColIndex >= deletion.position + deletion.count) {
        newColIndex -= deletion.count;
      } else if (oldColIndex >= deletion.position) {
        // 삭제된 열에 해당하는 에러
        return null;
      }
    }

    // 4. 새로운 colIndex 범위 확인
    if (newColIndex < 0 || newColIndex >= structuralChanges.totalNewCols) {
      return null;
    }

    return newColIndex;
  }

  /**
   * 셀에 값이 있는지 확인
   * @param {Object} row - 데이터 행
   * @param {Object} columnMeta - 컬럼 메타데이터
   * @returns {boolean} 값 존재 여부
   */
  _cellHasValue(row, columnMeta) {
    if (!row || !columnMeta.dataKey) {
      return false;
    }
    
    if (columnMeta.cellIndex !== null && columnMeta.cellIndex !== undefined) {
      const arr = row[columnMeta.dataKey];
      
      if (!Array.isArray(arr)) {
        return false;
      }
      
      if (columnMeta.cellIndex < 0 || columnMeta.cellIndex >= arr.length) {
        return false;
      }
      
      const value = arr[columnMeta.cellIndex];
      const hasValue = value !== undefined && value !== null && value !== '';
      
      return hasValue;
    }
    
    const value = row[columnMeta.dataKey];
    const hasValue = value !== undefined && value !== null && value !== '';
    
    return hasValue;
  }

  /**
   * 기존 colIndex 기반 재매핑 함수 (하위 호환성용)
   * @param {Array} oldColumnsMeta - 변경 전 컬럼 메타 배열
   * @param {Array} newColumnsMeta - 변경 후 컬럼 메타 배열
   */
  remapValidationErrorsByColumnOrder(oldColumnsMeta, newColumnsMeta) {
    // 새로운 고유 식별자 기반 함수로 위임
    this.remapValidationErrorsByColumnIdentity(oldColumnsMeta, newColumnsMeta);
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
   * 실제 검증 수행 (고유 식별자 기반)
   */
  performValidation(rowIndex, colIndex, value, columnType, columnMeta = null) {
    console.log(`performValidation 호출: 행 ${rowIndex}, 열 ${colIndex}, 값 "${value}", 타입 "${columnType}"`);
    
    const result = _validateCell(value, columnType);
    
    console.log('검증 결과:', result);
    
    if (!result.valid) {
      console.log(`오류 추가: 행 ${rowIndex}, 열 ${colIndex}, 메시지: ${result.message}`);
      
      // 고유 식별자 기반으로 에러 추가
      if (columnMeta) {
        const uniqueKey = this.getColumnUniqueKey(columnMeta);
        const errorKey = this.getErrorKey(rowIndex, uniqueKey);
        
        this.store.commit('ADD_VALIDATION_ERROR_BY_UNIQUE_KEY', {
          errorKey,
          message: result.message
        });
      } else {
        // 하위 호환성을 위한 기존 방식
        this.store.commit('ADD_VALIDATION_ERROR', {
          rowIndex,
          colIndex,
          message: result.message
        });
      }
    } else {
      console.log(`오류 제거: 행 ${rowIndex}, 열 ${colIndex}`);
      
      // 고유 식별자 기반으로 에러 제거
      if (columnMeta) {
        const uniqueKey = this.getColumnUniqueKey(columnMeta);
        const errorKey = this.getErrorKey(rowIndex, uniqueKey);
        
        this.store.commit('REMOVE_VALIDATION_ERROR_BY_UNIQUE_KEY', {
          errorKey
        });
      } else {
        // 하위 호환성을 위한 기존 방식
        this.store.commit('REMOVE_VALIDATION_ERROR', {
          rowIndex,
          colIndex
        });
      }
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