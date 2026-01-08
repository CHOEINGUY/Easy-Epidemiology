/**
 * ValidationDataOps.js
 * 데이터 연산 관련 유효성 검사 모듈
 * ---------------------------------
 * • 데이터 임포트 검증
 * • 붙여넣기 검증
 * • 특수 열 검증 (개별 노출시간, 확진자 여부)
 */

import { validateCell as _validateCell } from '../store/utils/validation.js';

/**
 * 데이터 연산 관련 유효성 검사 클래스
 */
export class ValidationDataOps {
  /**
   * @param {Object} store - Vuex store 인스턴스
   * @param {Object} errorManager - ValidationErrorManager 인스턴스
   * @param {Object} options - 설정 옵션
   */
  constructor(store, errorManager, options = {}) {
    this.store = store;
    this.errorManager = errorManager;
    this.debug = options.debug || false;
    this.onProgress = options.onProgress || null;
  }

  /**
   * validateCell 함수 주입 (ValidationManager에서 호출)
   * @param {Function} validateCellFn - 셀 검증 함수
   */
  setValidateCellFn(validateCellFn) {
    this._validateCellFn = validateCellFn;
  }

  /**
   * _getCellValue 함수 주입
   * @param {Function} getCellValueFn - 셀 값 조회 함수
   */
  setGetCellValueFn(getCellValueFn) {
    this._getCellValueFn = getCellValueFn;
  }

  /**
   * 엑셀 데이터 임포트 시 검증 처리
   * @param {Array<object>} importedData - 임포트된 데이터
   * @param {Array<object>} columnMetas - 열 메타데이터
   */
  async handleDataImport(importedData, columnMetas) {
    // 기존 검증 오류 모두 제거
    this.errorManager.clearAllErrors();
    
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
            this._validateCell(rowIndex, columnMeta.colIndex, value, columnMeta.type, true);
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
   * @param {Array<Array<*>>} pasteData - 붙여넣기 데이터
   * @param {number} startRow - 시작 행
   * @param {number} startCol - 시작 열
   * @param {Array<object>} columnMetas - 열 메타데이터
   */
  handlePasteData(pasteData, startRow, startCol, columnMetas) {
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
          this.store.commit('REMOVE_VALIDATION_ERROR', { rowIndex, colIndex });
          if (value !== '' && value !== null && value !== undefined) {
            this._validateCell(rowIndex, colIndex, value, columnMeta.type, true);
          }
        }
      });
    });
  }

  /**
   * 붙여넣기 영역의 기존 오류 제거
   * @param {number} startRow - 시작 행
   * @param {number} startCol - 시작 열
   * @param {number} rowCount - 행 개수
   * @param {number} colCount - 열 개수
   */
  clearErrorsInPasteArea(startRow, startCol, rowCount, colCount) {
    const errorsToRemove = [];
    
    this.store.state.epidemic.validationState.errors.forEach((error, key) => {
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

    if (errorsToRemove.length > 0 && this.debug) {
      console.log(`[ValidationDataOps] 붙여넣기 영역 기존 오류 ${errorsToRemove.length}개 제거`);
    }
  }

  /**
   * 즉시 셀 검증 (지연 없이)
   * @param {number} rowIndex - 행 인덱스
   * @param {number} colIndex - 열 인덱스
   * @param {*} value - 셀 값
   * @param {string} columnType - 열 타입
   * @param {Object} columnMeta - 열 메타데이터
   * @returns {Object} 검증 결과
   */
  validateCellImmediate(rowIndex, colIndex, value, columnType, columnMeta) {
    const result = _validateCell(value, columnType);
    
    if (!result.valid) {
      this.errorManager.addError(rowIndex, colIndex, result.message, columnMeta);
    }
    
    return result;
  }

  /**
   * 붙여넣기 검증 결과 요약 표시
   * @param {Array} errors - 에러 배열
   * @param {number} totalCells - 총 셀 수
   */
  showPasteValidationSummary(errors, totalCells) {
    const errorCount = errors.length;
    const errorRate = ((errorCount / totalCells) * 100).toFixed(1);
    
    // 오류 타입별 분류
    const errorTypes = {};
    errors.forEach(error => {
      errorTypes[error.type] = (errorTypes[error.type] || 0) + 1;
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

    // 사용자에게 토스트 메시지 표시 (옵션)
    if (typeof window !== 'undefined' && window.showToast) {
      const message = `붙여넣기 완료: ${totalCells}개 셀 중 ${errorCount}개 오류 발견 (${errorRate}%)`;
      const type = errorCount > 0 ? 'warning' : 'success';
      try {
        window.showToast(message, type);
      } catch (error) {
        console.warn('[ValidationDataOps] showToast 호출 실패:', error);
      }
    }
  }

  /**
   * 개별 노출시간 열 전용 검증 처리
   * @param {Array<{rowIndex: number, value: string}>} exposureData - 검증할 데이터
   * @param {number} colIndex - 열 인덱스
   * @param {Function} onProgress - 진행률 콜백
   */
  validateIndividualExposureColumn(exposureData, colIndex, onProgress = null) {
    if (!exposureData || exposureData.length === 0) return;
    
    if (this.debug) {
      console.log('[ValidationDataOps] validateIndividualExposureColumn 호출됨');
      console.log('입력 데이터:', exposureData);
      console.log('열 인덱스:', colIndex);
    }
    
    const totalCells = exposureData.length;
    const chunkSize = 50;
    
    for (let i = 0; i < totalCells; i += chunkSize) {
      const chunk = exposureData.slice(i, i + chunkSize);
      
      chunk.forEach(({ rowIndex, value }) => {
        if (value !== '' && value !== null && value !== undefined) {
          if (this.debug) {
            console.log(`검증 중: 행 ${rowIndex}, 열 ${colIndex}, 값 "${value}"`);
          }
          this._validateCell(rowIndex, colIndex, value, 'individualExposureTime', true);
        }
      });
      
      if (onProgress) {
        const progress = Math.round(((i + chunkSize) / totalCells) * 100);
        onProgress(Math.min(progress, 100));
      }
      
      if (i + chunkSize < totalCells && totalCells > 200) {
        setTimeout(() => {}, 0);
      }
    }
    
    if (onProgress) {
      onProgress(100);
    }
    
    if (this.debug) {
      console.log('[ValidationDataOps] validateIndividualExposureColumn 완료');
    }
  }

  /**
   * 확진자 여부 열 전용 검증 처리
   * @param {Array<{rowIndex: number, value: string}>} confirmedCaseData - 검증할 데이터
   * @param {number} colIndex - 열 인덱스
   * @param {Function} onProgress - 진행률 콜백
   */
  validateConfirmedCaseColumn(confirmedCaseData, colIndex, onProgress = null) {
    if (!confirmedCaseData || confirmedCaseData.length === 0) return;
    
    if (this.debug) {
      console.log('[ValidationDataOps] validateConfirmedCaseColumn 호출됨');
      console.log('입력 데이터:', confirmedCaseData);
      console.log('열 인덱스:', colIndex);
    }
    
    const totalCells = confirmedCaseData.length;
    const chunkSize = 50;
    
    for (let i = 0; i < totalCells; i += chunkSize) {
      const chunk = confirmedCaseData.slice(i, i + chunkSize);
      
      chunk.forEach(({ rowIndex, value }) => {
        if (value !== '' && value !== null && value !== undefined) {
          if (this.debug) {
            console.log(`검증 중: 행 ${rowIndex}, 열 ${colIndex}, 값 "${value}"`);
          }
          this._validateCell(rowIndex, colIndex, value, 'isConfirmedCase', true);
        }
      });
      
      if (onProgress) {
        const progress = Math.round(((i + chunkSize) / totalCells) * 100);
        onProgress(Math.min(progress, 100));
      }
      
      if (i + chunkSize < totalCells && totalCells > 200) {
        setTimeout(() => {}, 0);
      }
    }
    
    if (onProgress) {
      onProgress(100);
    }
    
    if (this.debug) {
      console.log('[ValidationDataOps] validateConfirmedCaseColumn 완료');
    }
  }

  // ============ Private Helper Methods ============

  /**
   * 셀 검증 호출 (주입된 함수 사용)
   * @private
   */
  _validateCell(rowIndex, colIndex, value, type, immediate) {
    if (this._validateCellFn) {
      this._validateCellFn(rowIndex, colIndex, value, type, immediate);
    }
  }

  /**
   * 셀 값 조회 (주입된 함수 사용)
   * @private
   */
  _getCellValue(row, columnMeta) {
    if (this._getCellValueFn) {
      return this._getCellValueFn(row, columnMeta);
    }
    // 기본 구현
    return row[columnMeta.dataKey];
  }

  /**
   * 리소스 정리
   */
  destroy() {
    this.onProgress = null;
  }
}

export default ValidationDataOps;
