/**
 * 토스트 시스템 로직
 * 
 * 토스트 메시지 표시, 확인 다이얼로그 등을 관리합니다.
 */

import { ref } from 'vue';

// 토스트 상태 관리
const toasts = ref([]);
let toastIdCounter = 0;

/**
 * 토스트 메시지를 표시합니다
 * @param {string} message - 표시할 메시지
 * @param {string} type - 토스트 타입 ('info', 'success', 'error', 'warning')
 * @param {number} duration - 표시 시간 (ms), 0이면 자동 삭제하지 않음
 */
export function showToast(message, type = 'info', duration = 3000) {
  const id = ++toastIdCounter;
  const toast = {
    id,
    message,
    type,
    timestamp: Date.now()
  };
  
  toasts.value.push(toast);
  
  // 최대 3개까지만 표시
  if (toasts.value.length > 3) {
    toasts.value.shift();
  }
  
  if (duration > 0) {
    setTimeout(() => {
      removeToast(id);
    }, duration);
  }
}

/**
 * 토스트를 제거합니다
 * @param {number} id - 제거할 토스트 ID
 */
export function removeToast(id) {
  const index = toasts.value.findIndex(toast => toast.id === id);
  if (index > -1) {
    toasts.value.splice(index, 1);
  }
}

/**
 * 확인/취소 버튼이 있는 토스트를 표시합니다
 * @param {string} message - 표시할 메시지
 * @param {Function} onConfirm - 확인 버튼 클릭 시 실행할 함수
 * @param {Function} onCancel - 취소 버튼 클릭 시 실행할 함수 (기본값: null)
 */
export function showConfirmToast(message, onConfirm, onCancel = null) {
  const id = ++toastIdCounter;
  const toast = {
    id,
    message,
    type: 'confirm',
    onConfirm: () => {
      removeToast(id);
      onConfirm();
    },
    onCancel: onCancel ? () => {
      removeToast(id);
      onCancel();
    } : () => {
      removeToast(id);
    }
  };
  
  toasts.value.push(toast);
  
  // 최대 3개까지만 표시
  if (toasts.value.length > 3) {
    toasts.value.shift();
  }
}

/**
 * 토스트 상태를 반환하는 컴포저블
 * @returns {Object} { toasts, showToast, removeToast, showConfirmToast }
 */
export function useToast() {
  return {
    toasts,
    showToast,
    removeToast,
    showConfirmToast
  };
} 