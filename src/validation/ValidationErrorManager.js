/**
 * ValidationErrorManager.js
 * 유효성 검사 에러 관리 모듈
 * ---------------------------------
 * • 에러 CRUD 연산
 * • 타이머 관리
 * • 디버깅 유틸리티
 */

import { 
  getColumnUniqueKey, 
  getErrorKey, 
  parseErrorKey 
} from '../components/DataInputVirtualScroll/utils/validationUtils.js';

/**
 * 유효성 검사 에러 관리 클래스
 */
export class ValidationErrorManager {
  /**
   * @param {Object} store - Vuex store 인스턴스
   * @param {Object} options - 설정 옵션
   */
  constructor(store, options = {}) {
    this.store = store;
    this.debug = options.debug || false;
    
    /** @type {Map<string, ReturnType<typeof setTimeout>>} */
    this.validationTimers = new Map();
    
    /** @type {Array} 현재 열 메타데이터 */
    this.columnMetas = [];
  }

  /**
   * 열 메타데이터 업데이트
   * @param {Array} columnMetas - 새로운 열 메타데이터 배열
   */
  updateColumnMetas(columnMetas) {
    this.columnMetas = columnMetas;
    if (this.debug) {
      console.log('[ValidationErrorManager] 열 메타데이터 업데이트:', columnMetas.length, '개');
    }
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
    
    this.store.state.epidemic.validationState.errors.forEach((error, key) => {
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
    
    this.store.state.epidemic.validationState.errors.forEach((error, key) => {
      const parsed = parseErrorKey(key);
      if (parsed && parsed.uniqueKey === uniqueKey) {
        errorsToRemove.push(key);
      }
    });
    
    errorsToRemove.forEach(key => {
      this.store.commit('REMOVE_VALIDATION_ERROR_BY_UNIQUE_KEY', { errorKey: key });
    });
  }

  /**
   * 모든 오류 + 타이머 제거
   */
  clearAllErrors() {
    // 타이머 정리
    this.validationTimers.forEach((t) => clearTimeout(t));
    this.validationTimers.clear();
    // 상태 초기화
    this.store.commit('CLEAR_VALIDATION_ERRORS');
  }

  /**
   * 타이머만 정리 (유효성 검사 오류는 유지)
   */
  clearTimers() {
    this.validationTimers.forEach((t) => clearTimeout(t));
    this.validationTimers.clear();
  }

  /**
   * 특정 셀의 타이머 취소
   * @param {string} cellKey - 셀 키 (rowIndex_colIndex)
   * @returns {boolean} 타이머가 존재했는지 여부
   */
  cancelTimer(cellKey) {
    const existingTimer = this.validationTimers.get(cellKey);
    if (existingTimer) {
      clearTimeout(existingTimer);
      this.validationTimers.delete(cellKey);
      return true;
    }
    return false;
  }

  /**
   * 타이머 설정
   * @param {string} cellKey - 셀 키
   * @param {Function} callback - 콜백 함수
   * @param {number} delay - 지연 시간(ms)
   */
  setTimer(cellKey, callback, delay) {
    const timerId = setTimeout(() => {
      callback();
      this.validationTimers.delete(cellKey);
    }, delay);
    this.validationTimers.set(cellKey, timerId);
  }

  /**
   * 에러 추가 (고유 식별자 기반)
   * @param {number} rowIndex - 행 인덱스
   * @param {number} colIndex - 열 인덱스
   * @param {string} message - 에러 메시지
   * @param {Object} columnMeta - 열 메타데이터 (선택)
   */
  addError(rowIndex, colIndex, message, columnMeta = null) {
    const meta = columnMeta || this.columnMetas.find(m => m.colIndex === colIndex);
    
    if (meta) {
      const uniqueKey = getColumnUniqueKey(meta);
      const errorKey = getErrorKey(rowIndex, uniqueKey);
      
      this.store.commit('ADD_VALIDATION_ERROR_BY_UNIQUE_KEY', {
        errorKey,
        message
      });
    } else {
      // fallback: 기존 방식
      this.store.commit('ADD_VALIDATION_ERROR', {
        rowIndex,
        colIndex,
        message
      });
    }
  }

  /**
   * 에러 제거 (고유 식별자 기반)
   * @param {number} rowIndex - 행 인덱스
   * @param {number} colIndex - 열 인덱스
   * @param {Object} columnMeta - 열 메타데이터 (선택)
   */
  removeError(rowIndex, colIndex, columnMeta = null) {
    const meta = columnMeta || this.columnMetas.find(m => m.colIndex === colIndex);
    
    if (meta) {
      const uniqueKey = getColumnUniqueKey(meta);
      const errorKey = getErrorKey(rowIndex, uniqueKey);
      
      this.store.commit('REMOVE_VALIDATION_ERROR_BY_UNIQUE_KEY', { errorKey });
    } else {
      // fallback: 기존 방식
      this.store.commit('REMOVE_VALIDATION_ERROR', { rowIndex, colIndex });
    }
  }

  /**
   * 디버깅용: 에러 키들 출력
   * @param {string} label - 라벨
   * @param {Map} errors - 에러 맵 (생략시 현재 에러)
   */
  printErrorKeys(label, errors = null) {
    if (!this.debug) return;
    
    const errorMap = errors || this.store.state.epidemic.validationState.errors;
    console.log(`[ValidationErrorManager] ${label}:`, Array.from(errorMap.keys()));
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
    
    console.log('[ValidationErrorManager] 제거된 에러:', removed);
    console.log('[ValidationErrorManager] 추가된 에러:', added);
  }

  /**
   * 디버깅용: 고유 키 매핑 출력
   * @param {Array} columnMetas - 컬럼 메타 배열 (생략시 현재 메타)
   */
  printUniqueKeyMapping(columnMetas = null) {
    if (!this.debug) return;
    
    const metas = columnMetas || this.columnMetas;
    const mapping = {};
    metas.forEach(col => {
      const uniqueKey = getColumnUniqueKey(col);
      mapping[`${col.type}[${col.cellIndex}]`] = uniqueKey;
    });
    console.log('[ValidationErrorManager] 고유 키 매핑:', mapping);
  }

  /**
   * 현재 에러 개수 조회
   * @returns {number}
   */
  getErrorCount() {
    return this.store.state.epidemic.validationState.errors.size;
  }

  /**
   * 에러 맵 스냅샷 생성
   * @returns {Map}
   */
  createErrorSnapshot() {
    return new Map(this.store.state.epidemic.validationState.errors);
  }

  /**
   * 에러 맵 교체
   * @param {Map} newErrors - 새로운 에러 맵
   */
  setErrors(newErrors) {
    this.store.commit('SET_VALIDATION_ERRORS', newErrors);
  }

  /**
   * 리소스 정리
   */
  destroy() {
    this.clearTimers();
    this.columnMetas = [];
  }
}

export default ValidationErrorManager;
