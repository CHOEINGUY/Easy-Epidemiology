/**
 * 작업 가드를 위한 Vue 컴포지션 API 훅
 * 비동기 작업의 경쟁 상태를 방지합니다.
 */

import { computed } from 'vue';
import globalOperationManager from '../utils/globalOperationManager.js';
import { showToast } from '../components/DataInputVirtualScroll/logic/toast.js';

/**
 * 작업 가드 훅
 * @param {Object} options - 설정 옵션
 * @returns {Object} 작업 가드 메서드들
 */
export function useOperationGuard(options = {}) {
  const {
    showBlockedMessage = true,
    blockedMessage = '다른 작업이 진행 중입니다. 잠시 기다려주세요.'
  } = options;

  /**
   * 작업이 차단되었는지 확인
   */
  const isBlocked = computed(() => globalOperationManager.hasBlockingOperations());

  /**
   * 작업 시작을 시도하고 성공 여부를 반환
   * @param {string} operationName - 작업 이름
   * @param {Object} operationOptions - 작업 옵션
   * @returns {boolean} 작업 시작 성공 여부
   */
  const tryStartOperation = (operationName, operationOptions = {}) => {
    const success = globalOperationManager.startOperation(operationName, operationOptions);
    
    if (!success && showBlockedMessage) {
      showToast(blockedMessage, 'warning');
    }
    
    return success;
  };

  /**
   * 작업 종료
   * @param {string} operationName - 작업 이름
   */
  const endOperation = (operationName) => {
    globalOperationManager.endOperation(operationName);
  };

  /**
   * 특정 작업이 실행 중인지 확인
   * @param {string} operationName - 작업 이름
   * @returns {boolean}
   */
  const isOperationActive = (operationName) => {
    return globalOperationManager.isOperationActive(operationName);
  };

  /**
   * 작업을 래핑하는 함수 생성
   * @param {string} operationName - 작업 이름
   * @param {Function} operationFunction - 실행할 함수
   * @param {Object} options - 옵션
   * @returns {Function} 래핑된 함수
   */
  const wrapOperation = (operationName, operationFunction, options = {}) => {
    return async (...args) => {
      if (!tryStartOperation(operationName, options)) {
        return false;
      }

      try {
        const result = await operationFunction(...args);
        return result;
      } finally {
        endOperation(operationName);
      }
    };
  };

  /**
   * 조건부 작업 실행
   * @param {string} operationName - 작업 이름
   * @param {Function} operationFunction - 실행할 함수
   * @param {Object} options - 옵션
   * @returns {Promise<boolean>} 실행 성공 여부
   */
  const executeIfNotBlocked = async (operationName, operationFunction, options = {}) => {
    if (!tryStartOperation(operationName, options)) {
      return false;
    }

    try {
      await operationFunction();
      return true;
    } finally {
      endOperation(operationName);
    }
  };

  return {
    isBlocked,
    tryStartOperation,
    endOperation,
    isOperationActive,
    wrapOperation,
    executeIfNotBlocked
  };
}

/**
 * 특정 작업 타입별 가드 함수들
 */
export const operationGuards = {
  /**
   * 엑셀 업로드 가드
   */
  excelUpload: (operationFunction) => {
    return async (...args) => {
      const { tryStartOperation, endOperation } = useOperationGuard();
      if (!tryStartOperation('excel_upload', { blocking: true, timeout: 60000 })) {
        return false;
      }
      try {
        return await operationFunction(...args);
      } finally {
        endOperation('excel_upload');
      }
    };
  },

  /**
   * 데이터 초기화 가드
   */
  dataReset: (operationFunction) => {
    return async (...args) => {
      const { tryStartOperation, endOperation } = useOperationGuard();
      if (!tryStartOperation('data_reset', { blocking: true, timeout: 10000 })) {
        return false;
      }
      try {
        return await operationFunction(...args);
      } finally {
        endOperation('data_reset');
      }
    };
  },

  /**
   * 열 삭제 가드
   */
  columnDeletion: (operationFunction) => {
    return async (...args) => {
      const { tryStartOperation, endOperation } = useOperationGuard();
      if (!tryStartOperation('column_deletion', { blocking: true, timeout: 5000 })) {
        return false;
      }
      try {
        return await operationFunction(...args);
      } finally {
        endOperation('column_deletion');
      }
    };
  },

  /**
   * 행 삭제 가드
   */
  rowDeletion: (operationFunction) => {
    return async (...args) => {
      const { tryStartOperation, endOperation } = useOperationGuard();
      if (!tryStartOperation('row_deletion', { blocking: true, timeout: 5000 })) {
        return false;
      }
      try {
        return await operationFunction(...args);
      } finally {
        endOperation('row_deletion');
      }
    };
  },

  /**
   * 데이터 내보내기 가드 (비차단)
   */
  dataExport: (operationFunction) => {
    return async (...args) => {
      const { tryStartOperation, endOperation } = useOperationGuard();
      if (!tryStartOperation('data_export', { blocking: false, timeout: 30000 })) {
        return false;
      }
      try {
        return await operationFunction(...args);
      } finally {
        endOperation('data_export');
      }
    };
  }
};

/**
 * 전역 작업 상태 확인 함수
 */
export function getGlobalOperationStatus() {
  return globalOperationManager.getStatus();
}

/**
 * 대기 중인 작업 목록 확인
 */
export function getQueuedOperations() {
  return globalOperationManager.getQueuedOperations();
} 