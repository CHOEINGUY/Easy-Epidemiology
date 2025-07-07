/**
 * environmentUtils.js
 * 환경 감지 및 적절한 처리 방식 선택 유틸리티
 */

/**
 * 현재 환경이 file:/// 프로토콜인지 확인
 * @returns {boolean}
 */
export function isFileProtocol() {
  return window.location.protocol === 'file:';
}

/**
 * 웹 워커를 사용할 수 있는 환경인지 확인
 * @returns {boolean}
 */
export function canUseWebWorkers() {
  // 개발 환경에서는 워커 사용을 비활성화 (웹팩 개발 서버 문제 방지)
  if (import.meta.env?.MODE === 'development') {
    return false;
  }
  return typeof Worker !== 'undefined' && !isFileProtocol();
}

/**
 * requestIdleCallback을 사용할 수 있는지 확인
 * @returns {boolean}
 */
export function canUseIdleCallback() {
  return typeof window.requestIdleCallback !== 'undefined' || 
         typeof window.requestAnimationFrame !== 'undefined';
}

/**
 * 환경에 따른 최적의 처리 방식을 반환
 * @returns {string} 'worker' | 'idle' | 'sync'
 */
export function getOptimalProcessingMode() {
  // 개발 환경에서는 항상 idle 모드 사용
  if (import.meta.env?.MODE === 'development') {
    return 'idle';
  }
  
  if (canUseWebWorkers()) {
    return 'worker';
  }
  if (canUseIdleCallback()) {
    return 'idle';
  }
  return 'sync';
}

/**
 * 환경 정보를 로깅
 */
export function logEnvironmentInfo() {
  const env = {
    protocol: window.location.protocol,
    isFileProtocol: isFileProtocol(),
    canUseWorkers: canUseWebWorkers(),
    canUseIdleCallback: canUseIdleCallback(),
    optimalMode: getOptimalProcessingMode(),
    userAgent: navigator.userAgent
  };

  console.log('[EnvironmentUtils] Environment info:', env);
  return env;
}

/**
 * 처리 방식 선택을 위한 옵션 객체 생성
 * @param {Object} options - 사용자 옵션
 * @returns {Object} 최적화된 옵션
 */
export function createProcessingOptions(options = {}) {
  const optimalMode = getOptimalProcessingMode();
  
  return {
    // 기본값
    useWorker: false,
    useAsyncProcessor: true,
    chunkSize: 100,
    
    // 환경에 따른 자동 설정
    ...(optimalMode === 'worker' && { useWorker: true }),
    ...(optimalMode === 'idle' && { useAsyncProcessor: true }),
    ...(optimalMode === 'sync' && { useAsyncProcessor: false, chunkSize: null }),
    
    // 사용자 옵션으로 덮어쓰기
    ...options
  };
} 