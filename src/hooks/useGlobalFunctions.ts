/**
 * 전역 함수 관리를 위한 Vue 컴포지션 API 훅
 * 컴포넌트 생명주기와 연동하여 메모리 누수를 방지합니다.
 */

import { onBeforeUnmount, getCurrentInstance, ComponentPublicInstance } from 'vue';
import globalFunctionRegistry from '../utils/globalFunctionRegistry';

interface GlobalFunctionsOptions {
  autoCleanup?: boolean;
}

interface GlobalFunctionsReturn {
  registerFunction: (functionName: string, func: Function) => void;
  unregisterFunction: (functionName: string) => void;
  unregisterAll: () => void;
}

/**
 * 전역 함수 관리를 위한 컴포지션 API 훅
 * @param {GlobalFunctionsOptions} options - 설정 옵션
 * @returns {GlobalFunctionsReturn} 전역 함수 관리 메서드들
 */
export function useGlobalFunctions(options: GlobalFunctionsOptions = {}): GlobalFunctionsReturn {
  const instance = getCurrentInstance();
  
  if (!instance) {
    console.warn('[useGlobalFunctions] Vue 인스턴스가 없습니다.');
    return {
      registerFunction: () => {},
      unregisterFunction: () => {},
      unregisterAll: () => {}
    };
  }

  const componentInstance = (instance.proxy || instance) as ComponentPublicInstance;

  /**
   * 전역 함수 등록
   * @param {string} functionName - 함수명
   * @param {Function} func - 등록할 함수
   */
  const registerFunction = (functionName: string, func: Function): void => {
    globalFunctionRegistry.register(functionName, func, componentInstance);
  };

  /**
   * 전역 함수 제거
   * @param {string} functionName - 제거할 함수명
   */
  const unregisterFunction = (functionName: string): void => {
    globalFunctionRegistry.unregister(functionName);
  };

  /**
   * 현재 컴포넌트의 모든 전역 함수 제거
   */
  const unregisterAll = (): void => {
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
 * @param {string[]} functionNames - 확인할 함수명 배열
 * @returns {Record<string, boolean>} 각 함수의 사용 가능 여부
 */
export function checkGlobalFunctions(functionNames: string[]): Record<string, boolean> {
  const result: Record<string, boolean> = {};
  
  functionNames.forEach(name => {
    result[name] = typeof window !== 'undefined' && 
                  (window as any)[name] && 
                  typeof (window as any)[name] === 'function';
  });
  
  return result;
}

/**
 * 전역 함수 호출을 안전하게 처리하는 래퍼
 * @param {string} functionName - 호출할 함수명
 * @param {any[]} args - 함수 인자들
 * @param {any} fallback - 함수가 없을 때 반환할 값
 */
export function safeCallGlobalFunction<T>(functionName: string, args: any[] = [], fallback: T | null = null): T | null {
  if (typeof window !== 'undefined' && 
      (window as any)[functionName] && 
      typeof (window as any)[functionName] === 'function') {
    try {
      return (window as any)[functionName](...args);
    } catch (error) {
      console.error(`[safeCallGlobalFunction] ${functionName} 호출 중 오류:`, error);
      return fallback;
    }
  }
  return fallback;
}
