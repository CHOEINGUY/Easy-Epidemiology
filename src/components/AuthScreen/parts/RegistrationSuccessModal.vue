<template>
  <div class="modal-overlay" @click="$emit('close')">
    <div class="modal-content" @click.stop>
      <div class="success-icon-large">
        <span class="material-icons">check_circle</span>
      </div>
      <h3 class="modal-title">회원가입이 완료되었습니다!</h3>
      <p class="modal-message">
        입력하신 정보가 정상적으로 등록되었습니다.<br>
        <strong>상위 기관의 승인을 기다려주세요.</strong><br>
        승인 완료 후 로그인이 가능합니다.
      </p>
      <div class="modal-actions">
        <button class="primary-btn" @click="$emit('close')">
          확인
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'RegistrationSuccessModal'
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.3s ease;
}

.modal-content {
  background: white;
  border-radius: 12px;
  padding: 40px;
  max-width: 400px;
  width: 90%;
  text-align: center;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: slideIn 0.3s ease;
}

.success-icon-large {
  margin-bottom: 24px;
}

.success-icon-large .material-icons {
  font-size: 64px;
  color: #4caf50;
}

.modal-title {
  font-size: 24px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 16px;
}

.modal-message {
  font-size: 16px;
  color: #666;
  line-height: 1.6;
  margin-bottom: 32px;
}

.modal-message strong {
  color: #1a1a1a;
  font-weight: 600;
}

.modal-actions {
  display: flex;
  justify-content: center;
}

.primary-btn {
  min-width: 120px;
  padding: 14px 24px;
  background: #4285f4;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.primary-btn:hover {
  background: #3367d6;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(66, 133, 244, 0.3);
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideIn {
  from { 
    opacity: 0; 
    transform: translateY(-20px) scale(0.95); 
  }
  to { 
    opacity: 1; 
    transform: translateY(0) scale(1); 
  }
}
</style>
