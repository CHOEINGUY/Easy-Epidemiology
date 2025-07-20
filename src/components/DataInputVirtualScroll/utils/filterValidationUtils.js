/**
 * 필터 기능과 유효성 검사 CSS 통합 관리 유틸리티
 * 
 * 이 파일은 필터가 적용된 상태에서 유효성 에러 CSS가 정확한 위치에 표시되도록
 * 인덱스 매핑과 CSS 클래스 관리를 통합적으로 처리합니다.
 */

import { getColumnUniqueKey, getErrorKey } from './validationUtils.js';
import { createComponentLogger } from '../../../utils/logger.js';

const logger = createComponentLogger('FilterValidationUtils');

/**
 * 필터된 상태에서의 인덱스 매핑과 유효성 검사 관리를 위한 클래스
 */
export class FilteredValidationManager {
  constructor() {
    // 원본 인덱스 -> 가상 인덱스 매핑
    this.originalToVirtual = new Map();
    // 가상 인덱스 -> 원본 인덱스 매핑  
    this.virtualToOriginal = new Map();
    // 필터 상태
    this.isFiltered = false;
    // 필터된 행 데이터
    this.filteredRows = [];
    // 유효성 에러 Map
    this.validationErrors = new Map();
  }

  /**
   * 필터 상태와 데이터 업데이트
   * @param {boolean} isFiltered - 필터 적용 여부
   * @param {Array} filteredRows - 필터된 행 데이터
   * @param {Map} validationErrors - 유효성 에러 Map
   */
  updateFilterState(isFiltered, filteredRows, validationErrors) {
    this.isFiltered = isFiltered;
    this.filteredRows = filteredRows || [];
    this.validationErrors = validationErrors || new Map();
    
    // 매핑 재계산
    this._rebuildMappings();
  }

  /**
   * 매핑 재구성
   */
  _rebuildMappings() {
    this.originalToVirtual.clear();
    this.virtualToOriginal.clear();

    if (!this.isFiltered) {
      return;
    }

    this.filteredRows.forEach((row, virtualIndex) => {
      if (row._originalIndex !== undefined) {
        this.originalToVirtual.set(row._originalIndex, virtualIndex);
        this.virtualToOriginal.set(virtualIndex, row._originalIndex);
      }
    });
  }

  /**
   * 가상 인덱스로 에러 여부 확인
   * @param {number} virtualIndex - 가상 인덱스
   * @param {number} colIndex - 열 인덱스
   * @param {Object} columnMeta - 열 메타데이터
   * @returns {boolean} 에러 여부
   */
  hasError(virtualIndex, colIndex, columnMeta) {
    if (!this.isFiltered) {
      // 필터되지 않은 상태에서는 가상 인덱스가 곧 원본 인덱스
      return this._hasErrorByOriginalIndex(virtualIndex, colIndex, columnMeta);
    }

    // 필터된 상태에서는 원본 인덱스로 변환 후 확인
    const originalIndex = this.virtualToOriginal.get(virtualIndex);
    if (originalIndex === undefined) {
      return false;
    }

    return this._hasErrorByOriginalIndex(originalIndex, colIndex, columnMeta);
  }

  /**
   * 원본 인덱스로 에러 여부 확인 (내부 메서드)
   */
  _hasErrorByOriginalIndex(originalIndex, colIndex, columnMeta) {
    if (!columnMeta) return false;
    
    const uniqueKey = getColumnUniqueKey(columnMeta);
    if (!uniqueKey) return false;
    
    const errorKey = getErrorKey(originalIndex, uniqueKey);
    return this.validationErrors.has(errorKey);
  }

  /**
   * 가상 인덱스로 에러 메시지 조회
   * @param {number} virtualIndex - 가상 인덱스
   * @param {number} colIndex - 열 인덱스
   * @param {Object} columnMeta - 열 메타데이터
   * @returns {string} 에러 메시지
   */
  getErrorMessage(virtualIndex, colIndex, columnMeta) {
    if (!this.isFiltered) {
      return this._getErrorMessageByOriginalIndex(virtualIndex, colIndex, columnMeta);
    }

    const originalIndex = this.virtualToOriginal.get(virtualIndex);
    if (originalIndex === undefined) {
      return '';
    }

    return this._getErrorMessageByOriginalIndex(originalIndex, colIndex, columnMeta);
  }

  /**
   * 원본 인덱스로 에러 메시지 조회 (내부 메서드)
   */
  _getErrorMessageByOriginalIndex(originalIndex, colIndex, columnMeta) {
    if (!columnMeta) return '';
    
    const uniqueKey = getColumnUniqueKey(columnMeta);
    if (!uniqueKey) return '';
    
    const errorKey = getErrorKey(originalIndex, uniqueKey);
    const error = this.validationErrors.get(errorKey);
    return error?.message || '';
  }

  /**
   * 원본 인덱스로 가상 인덱스 변환
   * @param {number} originalIndex - 원본 인덱스
   * @returns {number|undefined} 가상 인덱스
   */
  getVirtualIndex(originalIndex) {
    if (!this.isFiltered) {
      return originalIndex;
    }
    return this.originalToVirtual.get(originalIndex);
  }

  /**
   * 가상 인덱스로 원본 인덱스 변환
   * @param {number} virtualIndex - 가상 인덱스
   * @returns {number|undefined} 원본 인덱스
   */
  getOriginalIndex(virtualIndex) {
    if (!this.isFiltered) {
      return virtualIndex;
    }
    return this.virtualToOriginal.get(virtualIndex);
  }

  /**
   * 필터된 상태에서 보이는 유효성 에러만 반환
   * @returns {Map} 보이는 에러만 포함된 Map
   */
  getVisibleErrors() {
    if (!this.isFiltered) {
      return this.validationErrors;
    }

    const visibleErrors = new Map();
    
    this.validationErrors.forEach((error, errorKey) => {
      const [rowIndex] = errorKey.split('_');
      const originalRowIndex = parseInt(rowIndex, 10);
      
      // 필터된 행들 중에서 해당 원본 인덱스가 있는지 확인
      const isVisible = this.filteredRows.some(row => 
        row._originalIndex === originalRowIndex
      );
      
      if (isVisible) {
        visibleErrors.set(errorKey, error);
      }
    });

    return visibleErrors;
  }

  /**
   * 셀 클래스 계산 (통합 메서드)
   * @param {number} virtualIndex - 가상 인덱스
   * @param {number} colIndex - 열 인덱스
   * @param {Object} columnMeta - 열 메타데이터
   * @param {Array} baseClasses - 기본 클래스 배열
   * @returns {Array} 최종 클래스 배열
   */
  getCellClasses(virtualIndex, colIndex, columnMeta, baseClasses = []) {
    const classes = [...baseClasses];
    
    // 유효성 에러 클래스 추가
    if (this.hasError(virtualIndex, colIndex, columnMeta)) {
      classes.push('validation-error');
    }
    
    return classes;
  }

  /**
   * 디버깅 정보 출력
   */
  debugInfo() {
    logger.debug('[FilteredValidationManager] 디버깅 정보:', {
      isFiltered: this.isFiltered,
      filteredRowsCount: this.filteredRows.length,
      validationErrorsCount: this.validationErrors.size,
      originalToVirtualSize: this.originalToVirtual.size,
      virtualToOriginalSize: this.virtualToOriginal.size,
      mappings: Array.from(this.originalToVirtual.entries()).slice(0, 5) // 처음 5개만
    });
  }
}

/**
 * 필터 상태에 따른 CSS 클래스 관리
 */
export class FilterCSSManager {
  /**
   * 필터 상태에 따른 컨테이너 클래스 계산
   * @param {boolean} isFiltered - 필터 적용 여부
   * @returns {Object} 클래스 객체
   */
  static getContainerClasses(isFiltered) {
    return {
      'filtered': isFiltered
    };
  }

  /**
   * 필터 상태에 따른 셀 클래스 계산
   * @param {boolean} isFiltered - 필터 적용 여부
   * @param {string} cellType - 셀 타입 ('serial', 'normal', 'error')
   * @param {Array} baseClasses - 기본 클래스
   * @returns {Array} 최종 클래스 배열
   */
  static getCellClasses(isFiltered, cellType = 'normal', baseClasses = []) {
    const classes = [...baseClasses];
    
    if (isFiltered) {
      if (cellType === 'serial') {
        classes.push('filtered-serial-cell');
      } else if (cellType === 'error') {
        classes.push('filtered-error-cell');
      }
    }
    
    return classes;
  }
}

/**
 * 필터 상태 변경 시 CSS 업데이트를 위한 헬퍼 함수
 */
export class FilterCSSUpdater {
  /**
   * 필터 상태 변경 시 CSS 강제 업데이트
   * @param {Object} store - Vuex store
   * @param {Function} nextTick - Vue nextTick 함수
   */
  static forceCSSUpdate(store, nextTick) {
    nextTick(() => {
      // validationErrors의 버전을 강제로 증가시켜 반응성 트리거
      if (store.state.validationState) {
        store.state.validationState.version++;
      }
      
      // DOM 강제 업데이트를 위한 추가 틱
      nextTick(() => {
        logger.debug('[FilterCSSUpdater] 유효성 에러 CSS 업데이트 완료');
      });
    });
  }

  /**
   * 필터 상태 변경 감지 및 CSS 업데이트
   * @param {boolean} newIsFiltered - 새로운 필터 상태
   * @param {boolean} oldIsFiltered - 이전 필터 상태
   * @param {Object} store - Vuex store
   * @param {Function} nextTick - Vue nextTick 함수
   */
  static handleFilterStateChange(newIsFiltered, oldIsFiltered, store, nextTick) {
    if (newIsFiltered !== oldIsFiltered) {
      logger.debug('[FilterCSSUpdater] 필터 상태 변경 감지:', { newIsFiltered, oldIsFiltered });
      this.forceCSSUpdate(store, nextTick);
    }
  }
} 