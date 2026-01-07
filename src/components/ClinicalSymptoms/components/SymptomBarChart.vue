<template>
  <div class="analysis-table-container chart-area-container" style="position: relative; margin-top: 0;">
    <div class="chart-buttons">
      <button @click="$emit('copy')" class="copy-chart-button">
        <span class="button-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
        </span>
        <span class="button-text">차트 복사</span>
      </button>
      <div v-if="isChartCopied" class="copy-tooltip check-tooltip">
        <svg width="32" height="32" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="12" fill="#1a73e8"/>
          <polyline points="7,13 11,17 17,9" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <button @click="$emit('export')" class="export-chart-button">
        <span class="button-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
        </span>
        <span class="button-text">차트 저장</span>
      </button>
    </div>
    <div ref="chartContainerRef" class="chart-instance" :style="{ width: chartWidth + 'px', height: '600px' }"></div>
  </div>
</template>

<script setup>
import { ref, defineExpose } from 'vue';

defineProps({
  chartWidth: {
    type: Number,
    default: 700
  },
  isChartCopied: {
    type: Boolean,
    default: false
  }
});

defineEmits(['copy', 'export']);

const chartContainerRef = ref(null);

// 부모 컴포넌트에서 차트 컨테이너에 접근할 수 있도록 expose
defineExpose({
  chartContainerRef
});
</script>

<style scoped>
.analysis-table-container.chart-area-container {
  flex: 1.5; /* 너비 비중 조절 */
  min-width: 600px;
  min-height: 700px; /* 차트(600px) + 패딩 및 버튼 공간 확보 */
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  position: relative;
  padding: 40px 20px 20px 20px; /* 상단 여백 확보 (버튼용) */
  background-color: #fff;
  box-sizing: border-box;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  border-radius: 12px;
}
.chart-buttons {
  position: absolute;
  top: 10px;
  right: 18px;
  display: flex;
  gap: 8px;
  z-index: 2;
}
.chart-instance {
  height: 600px;
  min-height: 600px;
  max-height: 600px;
  margin: auto;
}
.export-chart-button,
.copy-chart-button {
  padding: 6px 10px;
  border: none;
  background-color: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  color: #1a73e8;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s ease;
}
.export-chart-button:hover,
.copy-chart-button:hover {
  background-color: rgba(26, 115, 232, 0.1);
}
.export-chart-button:active,
.copy-chart-button:active {
  background-color: rgba(26, 115, 232, 0.2);
}
.button-icon {
  display: flex;
  align-items: center;
}
.button-text {
  font-family: "Noto Sans KR", sans-serif;
  font-weight: 400;
}
.copy-tooltip {
  position: absolute;
  left: 50%;
  top: 110%;
  transform: translateX(-50%);
  z-index: 10;
  pointer-events: none;
  animation: fadeInOut 1.5s;
}
.copy-tooltip.check-tooltip {
  width: 32px;
  height: 32px;
  padding: 0;
  background: none;
  box-shadow: none;
  display: flex;
  align-items: center;
  justify-content: center;
}
.copy-tooltip.check-tooltip svg {
  display: block;
}
@keyframes fadeInOut {
  0% { opacity: 0; }
  10% { opacity: 0.95; }
  90% { opacity: 0.95; }
  100% { opacity: 0; }
}
</style>
