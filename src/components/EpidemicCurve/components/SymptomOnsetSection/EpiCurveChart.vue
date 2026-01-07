<template>
  <div class="chart-container-wrapper epi-chart-wrapper">
    <div class="chart-buttons">
      <div style="position: relative;">
        <button
          @click="$emit('saveChartForReport')"
          :class="['export-chart-button', isChartSaved ? 'saved' : 'unsaved', 'shadow-blink']"
          @mouseenter="onSaveMouseEnter"
          @mouseleave="onSaveMouseLeave"
        >
          <span class="button-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
              <polyline points="17 21 17 13 7 13 7 21"></polyline>
              <polyline points="7 3 7 8 15 8"></polyline>
            </svg>
          </span>
          <span class="button-text">{{ isChartSaved ? '저장 완료' : '보고서 저장' }}</span>
        </button>
        <div v-if="activeTooltip === 'saveEpiReport'" class="control-tooltip">{{ tooltipText }}</div>
        <div v-if="showChartSavedTooltip" class="copy-tooltip check-tooltip">
          <svg width="32" height="32" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="12" fill="#1a73e8"/>
            <polyline points="7,13 11,17 17,9" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
      </div>

      <div style="position: relative;">
        <button @click="handleCopyChart" class="copy-chart-button">
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
      </div>

      <div style="position: relative;">
        <button @click="handleExportChart" class="export-chart-button">
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
    </div>

    <div ref="chartContainer" class="chart-instance" :style="{ width: chartWidth + 'px' }"></div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted, nextTick, markRaw } from 'vue';
import * as echarts from 'echarts';
import { debounce } from 'lodash-es';
import { useTooltip } from '../../composables/useTooltip';

const props = defineProps({
  chartOptions: { type: Object, required: true },
  chartWidth: { type: Number, required: true },
  isChartSaved: { type: Boolean, default: false },
  showChartSavedTooltip: { type: Boolean, default: false }
});

const emit = defineEmits(['saveChartForReport', 'copyChart', 'exportChart', 'chartInstance']);

const { activeTooltip, tooltipText, showTooltip, hideTooltip } = useTooltip();

const chartContainer = ref(null);
const chartInstance = ref(null);
const isChartCopied = ref(false);

// 차트 초기화
const initChart = () => {
  if (!chartContainer.value) return;
  
  const rect = chartContainer.value.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return;

  if (chartInstance.value) {
    chartInstance.value.dispose();
  }

  chartInstance.value = markRaw(echarts.init(chartContainer.value));
  emit('chartInstance', chartInstance.value);
  
  if (props.chartOptions && typeof props.chartOptions === 'object') {
    chartInstance.value.setOption(props.chartOptions, true);
  }
};

// 차트 업데이트
const updateChart = () => {
  if (!chartInstance.value) {
    initChart();
    return;
  }
  
  if (props.chartOptions && typeof props.chartOptions === 'object') {
    chartInstance.value.setOption(props.chartOptions, true);
  }
};

const debouncedUpdateChart = debounce(updateChart, 200);

// 차트 옵션 변경 감지
watch(() => props.chartOptions, () => {
  nextTick(debouncedUpdateChart);
}, { deep: true });

// 차트 너비 변경 감지
watch(() => props.chartWidth, (newWidth, oldWidth) => {
  if (newWidth !== oldWidth && chartInstance.value) {
    chartInstance.value.dispose();
    chartInstance.value = null;
    nextTick(() => {
      setTimeout(() => {
        initChart();
      }, 50);
    });
  }
}, { flush: 'post' });

// 마운트 시 차트 초기화
onMounted(() => {
  nextTick(initChart);
});

// 언마운트 시 정리
onUnmounted(() => {
  if (chartInstance.value) {
    chartInstance.value.dispose();
    chartInstance.value = null;
  }
  if (debouncedUpdateChart.cancel) {
    debouncedUpdateChart.cancel();
  }
});

// 이벤트 핸들러
const onSaveMouseEnter = () => {
  showTooltip('saveEpiReport', '보고서 작성용으로 차트를 저장합니다');
};

const onSaveMouseLeave = () => {
  hideTooltip();
};

const handleCopyChart = async () => {
  if (!chartInstance.value) return;
  emit('copyChart', chartInstance.value);
  isChartCopied.value = true;
  setTimeout(() => (isChartCopied.value = false), 1500);
};

const handleExportChart = () => {
  if (!chartInstance.value) return;
  emit('exportChart', chartInstance.value);
};

// 외부에서 접근할 수 있도록 차트 인스턴스 노출
defineExpose({
  chartInstance,
  initChart,
  updateChart
});
</script>

<style scoped>
.chart-container-wrapper {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  padding: 20px;
  overflow-x: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1; /* 남은 높이 채우기 */
  min-height: 450px;
  width: 100%;
  box-sizing: border-box;
}

.chart-buttons {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
  width: 100%;
  justify-content: flex-end;
}

.chart-instance {
  flex: 1;
  width: 100%;
  min-height: 400px;
}

.copy-chart-button,
.export-chart-button {
  padding: 8px 12px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s ease;
}

.copy-chart-button {
  background-color: white;
  color: #1a73e8;
}

.copy-chart-button:hover {
  background-color: rgba(26, 115, 232, 0.1);
}

.export-chart-button {
  background-color: #1a73e8;
  color: white;
}

.export-chart-button:hover {
  background-color: #1557b0;
}

.export-chart-button.saved {
  background-color: #34a853;
}

.export-chart-button.unsaved {
  background-color: #1a73e8;
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

.control-tooltip {
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-top: 5px;
  padding: 6px 10px;
  background: #333;
  color: white;
  font-size: 12px;
  border-radius: 4px;
  white-space: nowrap;
  z-index: 100;
}

@keyframes fadeInOut {
  0% { opacity: 0; }
  10% { opacity: 0.95; }
  90% { opacity: 0.95; }
  100% { opacity: 0; }
}

/* --- Shadow Blink (soft glow pulse, no layout shift) --- */
.export-chart-button.shadow-blink { position: relative; z-index: 0; }
.export-chart-button.shadow-blink::after {
  content: '';
  position: absolute;
  inset: -1px;
  border-radius: 4px;
  pointer-events: none;
  box-shadow: 0 0 0 0 rgba(26,115,232,0.0), 0 0 0 rgba(26,115,232,0.0);
  opacity: 0;
}
.export-chart-button.shadow-blink.blink-active::after { animation: shadow-blink-key 3500ms ease-in-out 1; }
@keyframes shadow-blink-key {
  0% { opacity: 0; box-shadow: 0 0 0 0 rgba(26,115,232,0.00), 0 0 0 rgba(26,115,232,0.00); }
  50% { opacity: 1; box-shadow: 0 2px 10px 0 rgba(26,115,232,0.55), 0 0 16px rgba(26,115,232,0.45); }
  100% { opacity: 0; box-shadow: 0 0 0 0 rgba(26,115,232,0.00), 0 0 0 rgba(26,115,232,0.00); }
}
@media (prefers-reduced-motion: reduce) {
  .export-chart-button.shadow-blink.blink-active::after { animation: none; opacity: 1; box-shadow: 0 0 0 0 rgba(26,115,232,0.0), 0 0 12px rgba(26,115,232,0.25); }
}
</style>
