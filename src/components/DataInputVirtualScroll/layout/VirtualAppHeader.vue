<template>
  <header class="app-header">
    <h1 class="app-title">Easy-Epidemiology Web v1.0</h1>
    <!-- Validation error button will be implemented in a later step -->
    <!-- 
    <button class="validation-error-button">
      데이터 유효성 오류 (0)
    </button>
    -->
  </header>
</template>

<script setup>
// Props and events will be added in later steps.
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
  background: #f4f8ff;
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
}

.validation-error-button:hover {
  background: #eaf2ff;
}
</style> 