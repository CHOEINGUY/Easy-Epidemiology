<template>
  <div class="chart-container-wrapper incubation-chart-wrapper">
    <ChartActionButtons 
      :isSaved="isChartSaved" 
      :showSavedFeedback="showChartSavedTooltip" 
      :isCopied="isChartCopied"
      @saveReport="$emit('saveChartForReport')"
      @copyChart="handleCopyChart"
      @exportChart="handleExportChart"
    />

    <!-- 노출시간 경고 메시지 -->
    <div v-if="showWarningMessage" class="no-data-message">
      <DataGuideMessage
        icon="warning"
        title="증상발현시간을 노출시간 이후로 바꿔주세요"
        description="잠복기는 '노출 이후' 경과시간으로 계산됩니다. 현재는 모두 노출 이전으로 입력되어 계산할 수 없습니다."
        :steps="warningSteps"
      />
    </div>

    <div v-else ref="chartContainer" class="chart-instance" :style="{ width: chartWidth + 'px' }"></div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted, nextTick, markRaw } from 'vue';
import * as echarts from 'echarts';
import { debounce } from 'lodash-es';
import DataGuideMessage from '../../../DataGuideMessage.vue';
import ChartActionButtons from '../../../Common/ChartActionButtons.vue';

const props = defineProps({
  chartOptions: { type: Object, required: true },
  chartWidth: { type: Number, required: true },
  isChartSaved: { type: Boolean, default: false },
  showChartSavedTooltip: { type: Boolean, default: false },
  showWarningMessage: { type: Boolean, default: false },
  formattedExposureDateTime: { type: String, default: '' }
});

const emit = defineEmits(['saveChartForReport', 'copyChart', 'exportChart', 'chartInstance']);

// 경고 메시지 steps
const warningSteps = [
  { number: '!', text: `현재 노출시간: ${props.formattedExposureDateTime}` },
  { number: '1', text: '상단 의심원 노출시간 입력란을 클릭해 올바른 기준시간으로 다시 설정합니다' },
  { number: '2', text: '또는 데이터 입력 화면에서 각 환자의 증상발현시간을 노출시간 이후로 수정합니다' }
];

const chartContainer = ref(null);
const chartInstance = ref(null);
const isChartCopied = ref(false);

// 차트 초기화
const initChart = () => {
  if (!chartContainer.value || props.showWarningMessage) return;
  
  const rect = chartContainer.value.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return;

  if (chartInstance.value) {
    chartInstance.value.dispose();
  }

  chartInstance.value = markRaw(echarts.init(chartContainer.value));
  emit('chartInstance', chartInstance.value);
  
  if (props.chartOptions && typeof props.chartOptions === 'object') {
    chartInstance.value.setOption(props.chartOptions, false);
  }
};

// 차트 업데이트
const updateChart = () => {
  if (props.showWarningMessage) return;
  
  if (!chartInstance.value) {
    initChart();
    return;
  }
  
  if (props.chartOptions && typeof props.chartOptions === 'object') {
    chartInstance.value.setOption(props.chartOptions, false);
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

// 경고 메시지 상태 변경 감지
watch(() => props.showWarningMessage, (newValue, oldValue) => {
  if (!newValue && oldValue) {
    nextTick(() => {
      setTimeout(initChart, 50);
    });
  }
});

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

.chart-instance {
  flex: 1;
  width: 100%;
  min-height: 400px;
}

.no-data-message { 
  padding: 20px; 
  text-align: center; 
  color: #666; 
}
</style>
