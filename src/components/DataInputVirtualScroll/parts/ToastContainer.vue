<template>
  <div class="toast-container">
    <div 
      v-for="toast in toasts" 
      :key="toast.id" 
      :class="['toast-item', `toast-${toast.type}`]"
    >
      <div v-if="toast.type !== 'confirm'" class="toast-content">
        <div class="toast-icon">
          <span v-if="toast.type === 'success'">✅</span>
          <span v-else-if="toast.type === 'error'">❌</span>
          <span v-else-if="toast.type === 'warning'">⚠️</span>
          <span v-else>ℹ️</span>
        </div>
        <div class="toast-message">{{ toast.message }}</div>
        <button @click="removeToast(toast.id)" class="toast-close">×</button>
      </div>
      <div v-else class="toast-confirm-content">
        <div class="toast-message">{{ toast.message }}</div>
        <div class="toast-buttons">
          <button @click="toast.onConfirm" class="toast-btn toast-btn-confirm">확인</button>
          <button @click="toast.onCancel" class="toast-btn toast-btn-cancel">취소</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useToast } from '../logic/toast.js';

const { toasts, removeToast } = useToast();
</script>

<style scoped>
/* Toast 시스템 스타일 */
.toast-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 10000;
  display: flex;
  flex-direction: column;
  gap: 10px;
  pointer-events: none;
}

.toast-item {
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  max-width: 400px;
  pointer-events: auto;
  animation: slideIn 0.3s ease-out;
}

.toast-content {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  gap: 12px;
}

.toast-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.toast-message {
  flex: 1;
  font-size: 14px;
  line-height: 1.4;
  color: #333;
  word-break: break-word;
}

.toast-close {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: #666;
  padding: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.toast-close:hover {
  color: #333;
}

.toast-confirm {
  border-left: 4px solid #2196F3;
}

.toast-confirm-content {
  padding: 16px;
}

.toast-confirm-content .toast-message {
  margin-bottom: 12px;
  font-size: 14px;
  color: #333;
  line-height: 1.4;
}

.toast-buttons {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.toast-btn {
  padding: 6px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
}

.toast-btn-confirm {
  background: #2196F3;
  color: white;
}

.toast-btn-confirm:hover {
  background: #1976D2;
}

.toast-btn-cancel {
  background: #f5f5f5;
  color: #666;
}

.toast-btn-cancel:hover {
  background: #e0e0e0;
}

/* Toast 타입별 스타일 */
.toast-success {
  border-left: 4px solid #4CAF50;
}

.toast-error {
  border-left: 4px solid #F44336;
}

.toast-warning {
  border-left: 4px solid #FF9800;
}

.toast-info {
  border-left: 4px solid #2196F3;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
</style> 