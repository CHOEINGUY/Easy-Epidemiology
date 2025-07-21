/**
 * 전역 객체 접근 래퍼
 * 전역 객체에 안전하게 접근하고 메모리 누수를 방지합니다.
 */

/**
 * 전역 객체에서 안전하게 값을 가져오는 함수
 * @param {string} key - 접근할 키
 * @param {*} defaultValue - 기본값
 * @returns {*} 값 또는 기본값
 */
export function safeGetGlobal(key, defaultValue = null) {
  if (typeof window === 'undefined') return defaultValue;
  
  try {
    const value = window[key];
    return value !== undefined ? value : defaultValue;
  } catch (error) {
    console.warn(`[globalAccessWrapper] ${key} 접근 중 오류:`, error);
    return defaultValue;
  }
}

/**
 * 전역 객체에 안전하게 값을 설정하는 함수
 * @param {string} key - 설정할 키
 * @param {*} value - 설정할 값
 * @returns {boolean} 성공 여부
 */
export function safeSetGlobal(key, value) {
  if (typeof window === 'undefined') return false;
  
  try {
    window[key] = value;
    return true;
  } catch (error) {
    console.warn(`[globalAccessWrapper] ${key} 설정 중 오류:`, error);
    return false;
  }
}

/**
 * 전역 객체에서 안전하게 함수를 호출하는 함수
 * @param {string} functionName - 호출할 함수명
 * @param {Array} args - 함수 인자들
 * @param {*} fallback - 함수가 없을 때 반환할 값
 * @returns {*} 함수 결과 또는 fallback 값
 */
export function safeCallGlobal(functionName, args = [], fallback = null) {
  if (typeof window === 'undefined') return fallback;
  
  try {
    const func = window[functionName];
    if (func && typeof func === 'function') {
      return func(...args);
    }
    return fallback;
  } catch (error) {
    console.warn(`[globalAccessWrapper] ${functionName} 호출 중 오류:`, error);
    return fallback;
  }
}

/**
 * 전역 객체에서 안전하게 속성에 접근하는 함수
 * @param {string} objectKey - 객체 키
 * @param {string} propertyKey - 속성 키
 * @param {*} defaultValue - 기본값
 * @returns {*} 속성 값 또는 기본값
 */
export function safeGetGlobalProperty(objectKey, propertyKey, defaultValue = null) {
  if (typeof window === 'undefined') return defaultValue;
  
  try {
    const obj = window[objectKey];
    if (obj && typeof obj === 'object') {
      const value = obj[propertyKey];
      return value !== undefined ? value : defaultValue;
    }
    return defaultValue;
  } catch (error) {
    console.warn(`[globalAccessWrapper] ${objectKey}.${propertyKey} 접근 중 오류:`, error);
    return defaultValue;
  }
}

/**
 * 전역 객체의 특정 키가 존재하는지 확인
 * @param {string} key - 확인할 키
 * @returns {boolean} 존재 여부
 */
export function hasGlobalKey(key) {
  if (typeof window === 'undefined') return false;
  
  try {
    return key in window;
  } catch (error) {
    console.warn(`[globalAccessWrapper] ${key} 존재 확인 중 오류:`, error);
    return false;
  }
}

/**
 * 전역 객체에서 특정 키를 안전하게 제거
 * @param {string} key - 제거할 키
 * @returns {boolean} 성공 여부
 */
export function safeDeleteGlobal(key) {
  if (typeof window === 'undefined') return false;
  
  try {
    delete window[key];
    return true;
  } catch (error) {
    console.warn(`[globalAccessWrapper] ${key} 제거 중 오류:`, error);
    return false;
  }
} 