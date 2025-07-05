<template>
  <!-- 일반 toast는 오른쪽 상단에 -->
  <div class="toast-container">
    <div 
      v-for="toast in toasts.filter(t => t.type !== 'confirm')" 
      :key="toast.id" 
      :class="['toast-item', `toast-${toast.type}`]"
    >
      <div class="toast-content">
        <div class="toast-icon">
          <span v-if="toast.type === 'error'">❌</span>
          <span v-else-if="toast.type === 'warning'">⚠️</span>
          <span v-else-if="toast.type === 'info'">ℹ️</span>
        </div>
        <div class="toast-message">{{ toast.message }}</div>
        <button @click="removeToast(toast.id)" class="toast-close">×</button>
      </div>
    </div>
  </div>

  <!-- 확인 toast만 가운데에 -->
  <div v-if="toasts.some(t => t.type === 'confirm')" class="toast-overlay">
    <div class="toast-center-container">
      <div 
        v-for="toast in toasts.filter(t => t.type === 'confirm')" 
        :key="toast.id" 
        :class="['toast-item', `toast-${toast.type}`]"
      >
        <div class="toast-confirm-content">
          <div class="toast-header">
            <div class="toast-title">확인</div>
          </div>
          <div class="toast-message">{{ toast.message }}</div>
          <div class="toast-buttons">
            <button @click="toast.onCancel" class="toast-btn toast-btn-cancel">취소</button>
            <button @click="toast.onConfirm" class="toast-btn toast-btn-confirm">확인</button>
          </div>
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

/* Toast 오버레이 - 확인 toast만 가운데에 */
.toast-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.5);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(2px);
}

.toast-center-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 90vw;
  max-height: 90vh;
  overflow-y: auto;
}

/* Toast 아이템 */
.toast-item {
  background: white;
  border-radius: 0px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  max-width: 400px;
  border: 1px solid #e0e0e0;
  pointer-events: auto;
}

/* 가운데 toast는 더 크게 */
.toast-overlay .toast-item {
  min-width: 400px;
  max-width: 600px;
}

/* 일반 토스트 내용 */
.toast-content {
  display: flex;
  align-items: center;
  padding: 20px 24px;
  gap: 16px;
}

.toast-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.toast-message {
  flex: 1;
  font-size: 16px;
  line-height: 1.5;
  color: #333;
  word-break: break-word;
}

.toast-close {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #999;
  padding: 4px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0px;
  transition: all 0.2s;
}

.toast-close:hover {
  background: #f5f5f5;
  color: #666;
}

/* 확인 토스트 내용 */
.toast-confirm {
  border-left: 4px solid #2196F3;
}

.toast-confirm-content {
  padding: 0;
}

.toast-header {
  padding: 20px 24px 0 24px;
  border-bottom: 1px solid #f0f0f0;
}

.toast-title {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin-bottom: 16px;
}

.toast-confirm-content .toast-message {
  padding: 20px 24px;
  font-size: 16px;
  color: #555;
  line-height: 1.6;
  margin: 0;
}

.toast-buttons {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding: 20px 24px;
  background: #fafafa;
  border-radius: 0px;
}

.toast-btn {
  padding: 12px 24px;
  border: none;
  border-radius: 0px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
  min-width: 80px;
}

.toast-btn-confirm {
  background: #2196F3;
  color: white;
}

.toast-btn-confirm:hover {
  background: #1976D2;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(33, 150, 243, 0.3);
}

.toast-btn-cancel {
  background: white;
  color: #000;
  border: 1px solid #e0e0e0;
}

.toast-btn-cancel:hover {
  background: #f5f5f5;
  color: #000;
  transform: translateY(-1px);
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

/* 반응형 */
@media (max-width: 768px) {
  .toast-item {
    min-width: 90vw;
    max-width: 90vw;
  }
  
  .toast-buttons {
    flex-direction: column;
  }
  
  .toast-btn {
    width: 100%;
  }
}
</style> 