/**
 * 전역 함수 관리를 위한 Vue 컴포지션 API 훅
 * 컴포넌트 생명주기와 연동하여 메모리 누수를 방지합니다.
 */

import { onBeforeUnmount, getCurrentInstance } from 'vue';
import globalFunctionRegistry from '../utils/globalFunctionRegistry.js';

/**
 * 전역 함수 관리를 위한 컴포지션 API 훅
 * @param {Object} options - 설정 옵션
 * @returns {Object} 전역 함수 관리 메서드들
 */
export function useGlobalFunctions(options = {}) {
  const instance = getCurrentInstance();
  
  if (!instance) {
    console.warn('[useGlobalFunctions] Vue 인스턴스가 없습니다.');
    return {
      registerFunction: () => {},
      unregisterFunction: () => {},
      unregisterAll: () => {}
    };
  }

  const componentInstance = instance.proxy || instance;

  /**
   * 전역 함수 등록
   * @param {string} functionName - 함수명
   * @param {Function} func - 등록할 함수
   */
  const registerFunction = (functionName, func) => {
    globalFunctionRegistry.register(functionName, func, componentInstance);
  };

  /**
   * 전역 함수 제거
   * @param {string} functionName - 제거할 함수명
   */
  const unregisterFunction = (functionName) => {
    globalFunctionRegistry.unregister(functionName);
  };

  /**
   * 현재 컴포넌트의 모든 전역 함수 제거
   */
  const unregisterAll = () => {
    globalFunctionRegistry.unregisterAllForComponent(componentInstance);
  };

  // 컴포넌트 언마운트 시 자동 정리
  onBeforeUnmount(() => {
    if (options.autoCleanup !== false) {
      unregisterAll();
    }
  });

  return {
    registerFunction,
    unregisterFunction,
    unregisterAll
  };
}

/**
 * 특정 전역 함수들이 사용 가능한지 확인하는 유틸리티
 * @param {Array<string>} functionNames - 확인할 함수명 배열
 * @returns {Object} 각 함수의 사용 가능 여부
 */
export function checkGlobalFunctions(functionNames) {
  const result = {};
  
  functionNames.forEach(name => {
    result[name] = typeof window !== 'undefined' && 
                  window[name] && 
                  typeof window[name] === 'function';
  });
  
  return result;
}

/**
 * 전역 함수 호출을 안전하게 처리하는 래퍼
 * @param {string} functionName - 호출할 함수명
 * @param {Array} args - 함수 인자들
 * @param {*} fallback - 함수가 없을 때 반환할 값
 */
export function safeCallGlobalFunction(functionName, args = [], fallback = null) {
  if (typeof window !== 'undefined' && 
      window[functionName] && 
      typeof window[functionName] === 'function') {
    try {
      return window[functionName](...args);
    } catch (error) {
      console.error(`[safeCallGlobalFunction] ${functionName} 호출 중 오류:`, error);
      return fallback;
    }
  }
  return fallback;
} 