<template>
  <header class="app-header">
    <h1 class="app-title">Easy-Epidemiology Web v2.0</h1>
    <button 
      v-if="errorCount > 0"
      class="validation-error-button"
      @click="$emit('focusFirstError')"
    >
      <svg class="warning-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L1 21H23L12 2Z" fill="#e74c3c"/>
        <path d="M12 8V14" stroke="white" stroke-width="2" stroke-linecap="round"/>
        <circle cx="12" cy="17" r="1" fill="white"/>
      </svg>
      데이터 유효성 오류
      <span class="badge">{{ errorCount }}</span>
    </button>
  </header>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue';
defineProps({
  errorCount: { type: Number, default: 0 }
});
defineEmits(['focusFirstError']);
</script>

<style scoped>
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background-color: white;
  border-bottom: 1px solid #e0e0e0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  z-index: 4;
}

.app-title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 300;
  font-family: "Noto Sans KR", sans-serif;
  color: #202124;
}

.validation-error-button {
  background: #ffeaea;
  border: none;
  color: #e74c3c;
  border-radius: 8px;
  font-weight: 600;
  font-size: 15px;
  padding: 7px 18px;
  display: flex;
  align-items: center;
  gap: 7px;
  justify-content: center;
  cursor: pointer;
  box-shadow: none;
  transition: none;
  position: relative;
}

.validation-error-button:hover {
  background: #ffd6d6;
}

.warning-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.badge {
  background: #e74c3c;
  color: #fff;
  border-radius: 50%;
  padding: 2px 8px;
  font-size: 14px;
  margin-left: 4px;
  font-weight: bold;
}
</style> 