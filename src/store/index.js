/**
 * 새로운 저장 시스템의 메인 설정 파일
 * 기존 store.js와의 연동을 관리합니다.
 */

import { StoreBridge, useStoreBridge } from './storeBridge.js';
import { EnhancedStorageManager } from './enhancedStorageManager.js';
import { CellInputState } from './cellInputState.js';

// 전역 인스턴스
let globalStoreBridge = null;

// 개발 환경 확인
const isDevelopment = import.meta.env?.MODE === 'development' || false;

/**
 * 전역 StoreBridge 인스턴스를 초기화합니다.
 * @param {Object} legacyStore - 기존 store.js 인스턴스
 * @returns {StoreBridge} 초기화된 StoreBridge 인스턴스
 */
export function initializeStoreBridge(legacyStore) {
  if (!legacyStore) {
    console.error('[Store] 기존 store.js 인스턴스가 필요합니다.');
    return null;
  }
  
  if (globalStoreBridge) {
    console.warn('[Store] StoreBridge가 이미 초기화되었습니다.');
    return globalStoreBridge;
  }
  
  globalStoreBridge = new StoreBridge(legacyStore, null, { 
    debug: isDevelopment
  });
  console.log('[Store] StoreBridge가 초기화되었습니다.');
  
  return globalStoreBridge;
}

/**
 * 전역 StoreBridge 인스턴스를 반환합니다.
 * @returns {StoreBridge|null} StoreBridge 인스턴스
 */
export function getStoreBridge() {
  return globalStoreBridge;
}

/**
 * 전역 StoreBridge 인스턴스를 설정합니다.
 * @param {StoreBridge} bridge - StoreBridge 인스턴스
 */
export function setStoreBridge(bridge) {
  globalStoreBridge = bridge;
}

/**
 * Vue Composition API용 훅을 반환합니다.
 * @param {Object} legacyStore - 기존 store.js 인스턴스
 * @returns {Object} useStoreBridge 훅의 반환값
 */
export function useStore(legacyStore = null) {
  if (!globalStoreBridge && legacyStore) {
    initializeStoreBridge(legacyStore);
  }
  
  if (!globalStoreBridge) {
    console.error('[Store] StoreBridge가 초기화되지 않았습니다.');
    return null;
  }
  
  return useStoreBridge(globalStoreBridge.legacyStore, null, { 
    debug: isDevelopment
  });
}

/**
 * 저장 시스템의 상태를 검증합니다.
 * @returns {boolean} 유효한 상태 여부
 */
export function validateStoreSystem() {
  if (!globalStoreBridge) {
    console.error('[Store] StoreBridge가 초기화되지 않았습니다.');
    return false;
  }
  
  return globalStoreBridge.validate();
}

/**
 * 저장 시스템의 디버그 정보를 반환합니다.
 * @returns {Object} 디버그 정보
 */
export function getStoreDebugInfo() {
  if (!globalStoreBridge) {
    return { error: 'StoreBridge가 초기화되지 않았습니다.' };
  }
  
  return globalStoreBridge.getDebugInfo();
}

/**
 * 저장 시스템을 초기화합니다.
 */
export function resetStoreSystem() {
  if (globalStoreBridge) {
    globalStoreBridge.reset();
  }
  globalStoreBridge = null;
  console.log('[Store] 저장 시스템이 초기화되었습니다.');
}

/**
 * StoreBridge 시스템을 store와 연결합니다.
 * @param {Object} legacyStore - 기존 store.js 인스턴스
 * @param {Object} validationManager - ValidationManager 인스턴스
 * @returns {Object} StoreBridge 메서드들
 */
export function setupStoreBridge(legacyStore, validationManager) {
  if (!globalStoreBridge) {
    globalStoreBridge = new StoreBridge(legacyStore, validationManager, { 
      debug: isDevelopment
    });
    console.log('[Store Index] StoreBridge가 설정되었습니다.');
  } else {
    globalStoreBridge.setLegacyStore(legacyStore);
    console.log('[Store Index] 기존 StoreBridge에 legacyStore가 업데이트되었습니다.');
  }
}

// 내보내기
export {
  StoreBridge,
  useStoreBridge,
  EnhancedStorageManager,
  CellInputState
};

// 기본 내보내기
export default {
  initializeStoreBridge,
  getStoreBridge,
  setStoreBridge,
  useStore,
  validateStoreSystem,
  getStoreDebugInfo,
  resetStoreSystem,
  StoreBridge,
  useStoreBridge,
  EnhancedStorageManager,
  CellInputState
}; 