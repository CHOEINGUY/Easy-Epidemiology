/**
 * ValidationRowColumnOps.js
 * 행/열 연산 관련 유효성 검사 모듈
 * ---------------------------------
 * • 행 추가/삭제 시 검증 처리
 * • 열 추가/삭제 시 검증 처리
 * • 에러 인덱스 재조정
 */

import { FilterRowValidationManager } from '../components/DataInputVirtualScroll/utils/FilterRowValidationManager.js';

/**
 * 행/열 연산 관련 유효성 검사 클래스
 */
export class ValidationRowColumnOps {
  /**
   * @param {Object} store - Vuex store 인스턴스
   * @param {Object} errorManager - ValidationErrorManager 인스턴스
   * @param {Object} options - 설정 옵션
   */
  constructor(store, errorManager, options = {}) {
    this.store = store;
    this.errorManager = errorManager;
    this.debug = options.debug || false;
    
    // 필터 + 행 변경 통합 매니저 인스턴스
    this.filterRowManager = new FilterRowValidationManager();
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
   * 행 추가 시 검증 처리
   * @param {number} rowIndex - 행 인덱스
   * @param {object} newRow - 새 행 데이터
   * @param {Array<object>} columnMetas - 열 메타데이터
   */
  handleRowAddition(rowIndex, newRow, columnMetas) {
    // 새 행의 검증 오류 초기화
    this.errorManager.clearErrorsForRow(rowIndex);
    
    // 새 행의 데이터 검증
    columnMetas.forEach(columnMeta => {
      if (!columnMeta.isEditable) return;
      
      const value = this._getCellValue(newRow, columnMeta);
      if (value !== '' && value !== null && value !== undefined) {
        this._validateCell(rowIndex, columnMeta.colIndex, value, columnMeta.type, true);
      }
    });
  }

  /**
   * 행 삭제 시 검증 처리
   * @param {Array<number>} deletedRowIndices - 삭제된 행 인덱스 배열
   * @param {Array} columnMetas - 열 메타데이터 배열
   */
  handleRowDeletion(deletedRowIndices, columnMetas = []) {
    if (this.debug) {
      console.log('[ValidationRowColumnOps] handleRowDeletion 호출:', deletedRowIndices);
    }
    
    // 고유 키 기반 재매핑 사용 (권장)
    if (columnMetas && columnMetas.length > 0) {
      this.remapValidationErrorsByRowDeletion(deletedRowIndices, columnMetas);
    } else {
      // 기존 방식 (fallback)
      if (this.debug) {
        console.log('[ValidationRowColumnOps] columnMetas가 없어 기존 방식 사용');
      }
      
      // 삭제된 행들의 검증 오류 제거
      deletedRowIndices.forEach(rowIndex => {
        this.errorManager.clearErrorsForRow(rowIndex);
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
    this.errorManager.clearErrorsForColumn(colIndex);
    
    // 기존 데이터가 있다면 검증
    if (rows && rows.length > 0) {
      rows.forEach((row, rowIndex) => {
        const value = this._getCellValue(row, columnMeta);
        if (value !== '' && value !== null && value !== undefined) {
          this._validateCell(rowIndex, colIndex, value, columnMeta.type, true);
        }
      });
    }
  }

  /**
   * 열 삭제 시 검증 처리
   * @param {Array<number>} deletedColIndices - 삭제된 열 인덱스 배열
   */
  handleColumnDeletion(deletedColIndices) {
    if (!deletedColIndices || !Array.isArray(deletedColIndices) || deletedColIndices.length === 0) {
      return;
    }

    const currentErrors = this.store.state.epidemic.validationState.errors;
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

    this.errorManager.setErrors(newErrors);
  }

  /**
   * 특정 행 인덱스 배열을 재검증합니다.
   * @param {Array<number>} rowIndices - 재검증할 행 인덱스 배열
   * @param {Array<object>} rows - 전체 행 데이터
   * @param {Array<object>} columnMetas - 열 메타데이터
   */
  revalidateRows(rowIndices = [], rows = [], columnMetas = []) {
    rowIndices.forEach((rowIdx) => {
      const row = rows[rowIdx];
      if (!row) return;
      columnMetas.forEach((meta) => {
        if (!meta.isEditable) return;
        const value = this._getCellValue(row, meta);
        this._validateCell(rowIdx, meta.colIndex, value, meta.type, true);
      });
    });
  }

  /**
   * 특정 열 인덱스 배열을 재검증합니다.
   * @param {Array<number>} colIndices - 재검증할 열 인덱스 배열
   * @param {Array<object>} rows - 전체 행 데이터
   * @param {Array<object>} columnMetas - 열 메타데이터
   */
  revalidateColumns(colIndices = [], rows = [], columnMetas = []) {
    const metas = columnMetas.filter((m) => colIndices.includes(m.colIndex));
    if (!metas.length) return;

    rows.forEach((row, rowIndex) => {
      metas.forEach((meta) => {
        const value = this._getCellValue(row, meta);
        this._validateCell(rowIndex, meta.colIndex, value, meta.type, true);
      });
    });
  }

  /**
   * 행 삭제 후 오류 인덱스 재조정
   * @param {Array<number>} deletedRowIndices - 삭제된 행 인덱스 배열
   */
  reindexErrorsAfterRowDeletion(deletedRowIndices) {
    if (!deletedRowIndices || !Array.isArray(deletedRowIndices) || deletedRowIndices.length === 0) {
      return;
    }

    const currentErrors = this.store.state.epidemic.validationState.errors;
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

    this.errorManager.setErrors(newErrors);
  }

  /**
   * 행 삭제 시 고유 키 기반 validationErrors 재매핑
   * @param {Array<number>} deletedRowIndices - 삭제된 행 인덱스 배열
   * @param {Array} columnMetas - 현재 열 메타데이터 배열
   */
  remapValidationErrorsByRowDeletion(deletedRowIndices, columnMetas) {
    // eslint-disable-next-line no-unused-vars
    const _columnMetas = columnMetas; // 향후 확장을 위해 보존
    if (!deletedRowIndices || !Array.isArray(deletedRowIndices) || deletedRowIndices.length === 0) {
      if (this.debug) {
        console.log('[ValidationRowColumnOps] remapValidationErrorsByRowDeletion: 삭제된 행이 없음');
      }
      return;
    }

    const currentErrors = this.store.state.epidemic.validationState.errors;
    if (!currentErrors || currentErrors.size === 0) {
      if (this.debug) {
        console.log('[ValidationRowColumnOps] remapValidationErrorsByRowDeletion: 재매핑할 오류가 없음');
      }
      return;
    }

    if (this.debug) {
      console.log('[ValidationRowColumnOps] remapValidationErrorsByRowDeletion 시작');
      console.log('[ValidationRowColumnOps] 삭제된 행 인덱스:', deletedRowIndices);
      console.log('[ValidationRowColumnOps] 변경 전 오류 개수:', currentErrors.size);
    }

    // 새로운 FilterRowValidationManager 사용
    this.filterRowManager.handleRowChanges(deletedRowIndices, []);
    
    // 기존 로직은 유지하되 새로운 매니저와 연동
    const newErrors = this.filterRowManager.getRemappedErrors(currentErrors);
    
    if (this.debug) {
      console.log('[ValidationRowColumnOps] 변경 후 오류 개수:', newErrors.size);
    }

    // 새로운 오류 맵 적용
    this.errorManager.setErrors(newErrors);
  }

  /**
   * 데이터 클리어 시 검증 처리
   * @param {Array<{rowIndex: number, colIndex: number}>} clearedCells - 클리어된 셀 배열
   */
  handleDataClear(clearedCells) {
    // 클리어된 셀들의 검증 오류 제거
    const cellsForErrorClear = clearedCells.map(cell => ({
      row: cell.rowIndex,
      col: cell.colIndex
    }));
    
    this.errorManager.clearErrorsForCells(cellsForErrorClear);
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
    this.filterRowManager = null;
  }
}

export default ValidationRowColumnOps;
