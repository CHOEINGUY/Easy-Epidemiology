<template>
  <div class="summary-bar">
    <div class="summary-bar__title">
      <span class="material-icons summary-bar__logo">people</span>
      대상자 특성 분포
    </div>
  </div>
</template>

<script setup>
// SummaryBar.vue - 상단 요약 바 컴포넌트
</script>

<style scoped>
.summary-bar { 
  height: 40px; 
  display: flex; 
  align-items: center; 
  font-size: 20px; 
  color: white; 
  background-color: #1a73e8; 
  padding: 5px; 
  font-family: "Noto Sans KR", sans-serif; 
  font-weight: 300; 
}

.summary-bar__title { 
  display: flex; 
  align-items: center; 
  margin-left: 3px; 
}

.summary-bar__logo { 
  margin-right: 5px; 
  width: 35px; 
  height: auto; 
  vertical-align: middle;
  display: inline-flex;
  align-items: center;
}
</style>
