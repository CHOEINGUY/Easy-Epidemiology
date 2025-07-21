/**
 * 전역 함수 레지스트리 시스템
 * 메모리 누수를 방지하면서 전역 함수를 안전하게 관리합니다.
 */

class GlobalFunctionRegistry {
  constructor() {
    this.registrations = new Map();
    this.componentInstances = new WeakMap();
  }

  /**
   * 컴포넌트 인스턴스와 함께 전역 함수를 등록
   * @param {string} functionName - 전역 함수명
   * @param {Function} func - 등록할 함수
   * @param {Object} componentInstance - 컴포넌트 인스턴스
   */
  register(functionName, func, componentInstance) {
    if (typeof window === 'undefined') return;

    // 기존 등록이 있다면 정리
    this.unregister(functionName);

    // 전역에 함수 등록
    window[functionName] = func;

    // 등록 정보 저장
    this.registrations.set(functionName, {
      func,
      componentInstance,
      timestamp: Date.now()
    });

    // 컴포넌트 인스턴스와 함수명 연결
    if (!this.componentInstances.has(componentInstance)) {
      this.componentInstances.set(componentInstance, new Set());
    }
    this.componentInstances.get(componentInstance).add(functionName);

    console.log(`[GlobalFunctionRegistry] 함수 등록: ${functionName}`);
  }

  /**
   * 특정 함수명의 전역 함수 제거
   * @param {string} functionName - 제거할 함수명
   */
  unregister(functionName) {
    if (typeof window === 'undefined') return;

    const registration = this.registrations.get(functionName);
    if (registration) {
      // 전역에서 제거
      delete window[functionName];

      // 컴포넌트 인스턴스에서도 제거
      const { componentInstance } = registration;
      if (componentInstance && this.componentInstances.has(componentInstance)) {
        this.componentInstances.get(componentInstance).delete(functionName);
        
        // 해당 컴포넌트의 모든 함수가 제거되었으면 컴포넌트도 제거
        if (this.componentInstances.get(componentInstance).size === 0) {
          this.componentInstances.delete(componentInstance);
        }
      }

      // 등록 정보 제거
      this.registrations.delete(functionName);

      console.log(`[GlobalFunctionRegistry] 함수 제거: ${functionName}`);
    }
  }

  /**
   * 컴포넌트 인스턴스와 관련된 모든 전역 함수 제거
   * @param {Object} componentInstance - 컴포넌트 인스턴스
   */
  unregisterAllForComponent(componentInstance) {
    if (typeof window === 'undefined') return;

    const functionNames = this.componentInstances.get(componentInstance);
    if (functionNames) {
      // 복사본을 만들어서 순회 (Set을 순회하면서 삭제하면 문제 발생)
      const namesToRemove = Array.from(functionNames);
      namesToRemove.forEach(functionName => {
        this.unregister(functionName);
      });
    }
  }

  /**
   * 모든 전역 함수 정리
   */
  clearAll() {
    if (typeof window === 'undefined') return;

    const functionNames = Array.from(this.registrations.keys());
    functionNames.forEach(functionName => {
      this.unregister(functionName);
    });

    console.log('[GlobalFunctionRegistry] 모든 전역 함수 정리 완료');
  }

  /**
   * 등록된 함수 목록 조회 (디버깅용)
   */
  getRegisteredFunctions() {
    return Array.from(this.registrations.keys());
  }

  /**
   * 특정 함수가 등록되어 있는지 확인
   * @param {string} functionName - 확인할 함수명
   * @returns {boolean}
   */
  isRegistered(functionName) {
    return this.registrations.has(functionName);
  }
}

// 싱글톤 인스턴스 생성
const globalFunctionRegistry = new GlobalFunctionRegistry();

export default globalFunctionRegistry; 