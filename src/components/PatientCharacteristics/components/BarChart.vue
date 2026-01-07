<template>
  <div class="chart-container">
    <div class="chart-wrapper">
      <div class="chart-buttons">
        <SharedIconButton
          icon="copy"
          label="차트 복사"
          :showSuccess="isChartCopied"
          @click="handleCopyChart"
        />
        <SharedIconButton
          icon="download"
          label="차트 저장"
          @click="handleExportChart"
        />
      </div>
      <div ref="chartContainer" :style="{ width: chartWidth + 'px', height: '500px' }"></div>
    </div>
  </div>
</template>

<script setup>
// BarChart.vue - 차트 표시 컴포넌트
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue';
import * as echarts from 'echarts';
import { debounce } from 'lodash-es';
import { useClipboardOperations } from '../composables/useClipboardOperations';
import { generateTotalChartOptions, generatePatientChartOptions } from '../composables/useChartOptions';
import SharedIconButton from './SharedIconButton.vue';

const props = defineProps({
  chartWidth: {
    type: Number,
    default: 700
  },
  selectedVariableIndex: {
    type: Number,
    default: null
  },
  selectedChartType: {
    type: String,
    default: 'total'
  },
  selectedDataType: {
    type: String,
    default: 'count'
  },
  frequencyData: {
    type: Array,
    default: () => []
  },
  headers: {
    type: Object,
    default: () => ({ basic: [] })
  },
  chartFontSize: {
    type: Number,
    default: 18
  },
  barWidthPercent: {
    type: Number,
    default: 50
  },
  selectedBarColor: {
    type: String,
    default: '#5470c6'
  },
  currentHighlight: {
    type: String,
    default: 'none'
  },
  labelMappings: {
    type: Object,
    default: () => ({})
  }
});

const emit = defineEmits(['chartUpdated']);

const chartContainer = ref(null);
const chartInstance = ref(null);

const { isChartCopied, copyChartToClipboard, exportChart } = useClipboardOperations();

// 라벨 매핑 헬퍼 함수
const getMappedLabel = (originalCat) => {
  if (Object.prototype.hasOwnProperty.call(props.labelMappings, originalCat)) {
    const mapped = props.labelMappings[originalCat];
    if (mapped && String(mapped).trim()) {
      return String(mapped).trim();
    }
  }
  return originalCat;
};

// 차트 업데이트
const updateCharts = () => {
  if (!chartInstance.value || props.selectedVariableIndex === null) return;
  if (!props.headers?.basic || !props.frequencyData || props.frequencyData.length <= props.selectedVariableIndex) {
    console.warn('차트 업데이트 건너뛰기: 데이터 준비 안됨'); 
    return;
  }
  
  const header = props.headers.basic[props.selectedVariableIndex] || '(없음)';
  const data = props.frequencyData[props.selectedVariableIndex];
  
  if (!data || Object.keys(data).length === 0) {
    console.warn('차트 업데이트 건너뛰기: 빈 데이터');
    return;
  }
  
  const chartOptions = {
    chartFontSize: props.chartFontSize,
    barWidthPercent: props.barWidthPercent,
    selectedBarColor: props.selectedBarColor,
    currentHighlight: props.currentHighlight,
    getMappedLabel
  };

  const options = props.selectedChartType === 'total'
    ? generateTotalChartOptions(header, data, props.selectedDataType, chartOptions)
    : generatePatientChartOptions(header, data, props.selectedDataType, chartOptions);
  
  try {
    if (chartInstance.value && typeof chartInstance.value.setOption === 'function') {
      chartInstance.value.setOption(options, false);
      console.log('Chart options updated efficiently.');
      emit('chartUpdated');
    } else { 
      console.error('차트 인스턴스 유효하지 않음'); 
    }
  } catch (error) { 
    console.error('ECharts setOption 오류:', error, options); 
  }
};

// 차트 재생성
const recreateChart = () => {
  console.log('Attempting to recreate chart...');
  if (chartInstance.value && typeof chartInstance.value.dispose === 'function') {
    try { 
      chartInstance.value.dispose(); 
      console.log('Previous chart instance disposed.'); 
    }
    catch (e) { console.error('Error disposing chart instance:', e); }
    finally { chartInstance.value = null; }
  }
  nextTick(() => {
    if (chartContainer.value instanceof HTMLElement) {
      try {
        console.log(`Initializing new chart in container with width: ${chartContainer.value.offsetWidth}px`);
        chartInstance.value = echarts.init(chartContainer.value);
        console.log('New chart instance initialized.');
        updateCharts();
      } catch (error) { 
        console.error('ECharts 재초기화 실패:', error); 
        alert('차트를 다시 그리는 중 오류가 발생했습니다.'); 
      }
    } else { 
      console.error('차트 컨테이너 DOM 요소를 찾을 수 없습니다.'); 
    }
  });
};

// 디바운스된 차트 업데이트
const triggerChartUpdate = debounce(() => {
  console.log('Debounced chart update triggered.');
  if (chartInstance.value && props.selectedVariableIndex !== null) {
    updateCharts();
  } else {
    console.log('Chart instance not found or no variable selected, skipping update trigger.');
  }
}, 200);

// 리사이즈 핸들러
const handleResize = debounce(() => {
  if (chartInstance.value && 
      typeof chartInstance.value.resize === 'function' && 
      props.selectedVariableIndex !== null) {
    try { 
      console.log('Resizing chart due to window resize...'); 
      chartInstance.value.resize({
        animation: {
          duration: 200,
          easing: 'cubicOut'
        }
      });
    }
    catch (error) { 
      console.error('ECharts resize 오류 (window):', error); 
    }
  }
}, 150);

// 클립보드 작업 핸들러
const handleCopyChart = () => {
  if (chartInstance.value) {
    copyChartToClipboard(chartInstance.value, props.chartWidth);
  }
};

const handleExportChart = () => {
  if (chartInstance.value) {
    const header = props.headers?.basic?.[props.selectedVariableIndex] || '(없음)';
    exportChart(chartInstance.value, props.chartWidth, header, props.selectedChartType);
  }
};

// 라이프사이클
onMounted(() => {
  if (props.selectedVariableIndex !== null) {
    recreateChart();
  }
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  
  if (chartInstance.value && typeof chartInstance.value.dispose === 'function') {
    try { 
      chartInstance.value.dispose(); 
      chartInstance.value = null; 
      console.log('ECharts 인스턴스 정리 완료.'); 
    }
    catch (error) { 
      console.error('ECharts 인스턴스 정리 오류:', error); 
    }
  }
  
  if (triggerChartUpdate && typeof triggerChartUpdate.cancel === 'function') {
    triggerChartUpdate.cancel();
  }
  if (handleResize && typeof handleResize.cancel === 'function') {
    handleResize.cancel();
  }
  
  chartContainer.value = null;
  console.log('컴포넌트 cleanup 완료');
});

// 차트 너비 변경 감시 (resize 사용으로 성능 최적화)
watch(() => props.chartWidth, (newWidth, oldWidth) => {
  if (newWidth !== oldWidth && chartInstance.value && props.selectedVariableIndex !== null) {
    console.log(`Chart width changed: ${oldWidth} -> ${newWidth}. Resizing chart.`);
    nextTick(() => {
      if (chartInstance.value && typeof chartInstance.value.resize === 'function') {
        try {
          chartInstance.value.resize({
            width: newWidth,
            animation: {
              duration: 200,
              easing: 'cubicOut'
            }
          });
          console.log('Chart resized successfully.');
        } catch (error) {
          console.error('Chart resize error, falling back to recreate:', error);
          recreateChart();
        }
      }
    });
  }
}, { flush: 'post' });

// 다른 옵션 변경 감시
watch(
  [ 
    () => props.selectedVariableIndex,
    () => props.selectedChartType,
    () => props.selectedDataType,
    () => props.frequencyData,
    () => props.chartFontSize,
    () => props.barWidthPercent,
    () => props.selectedBarColor,
    () => props.currentHighlight,
    () => props.labelMappings
  ],
  ([newIndex]) => {
    console.log('BarChart watcher triggered');

    if (chartInstance.value && newIndex !== null) {
      console.log('Triggering optimized chart update');
      nextTick(() => {
        updateCharts();
      });
    } else if (!chartInstance.value && newIndex !== null) {
      console.log('Chart instance not found, recreating chart');
      nextTick(() => {
        recreateChart();
      });
    }
  },
  { 
    deep: true, 
    immediate: false,
    flush: 'post'
  }
);

// 외부에서 호출 가능한 메서드 노출
defineExpose({
  updateCharts,
  recreateChart,
  triggerChartUpdate
});
</script>

<style scoped>
.chart-container {
  background-color: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  box-sizing: border-box;
  margin: 0;
  padding: 20px;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: visible;
  position: relative;
}

.chart-wrapper {
  position: relative;
  padding: 45px 20px 20px 20px;
  box-sizing: border-box;
  width: 90%;
  height: 90%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.chart-buttons {
  position: absolute;
  top: -5px;
  right: -45px;
  display: flex;
  gap: 12px;
  z-index: 10;
}

.export-chart-button,
.copy-chart-button {
  padding: 8px 12px;
  border: none;
  background-color: white;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
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
