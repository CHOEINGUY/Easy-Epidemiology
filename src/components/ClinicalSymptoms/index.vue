<template>
  <div class="app">
    <header class="app-header">
      <h1 class="app-title">Easy-Epidemiology Web v2.0</h1>
    </header>
    <div class="dashboard">
      <SummaryBar title="임상증상" />
      <div class="output-area">
        <div class="output-row">
          <FrequencyTable 
            :data="sortedSymptomStats" 
            :is-table-copied="isTableCopied"
            @copy="copyTableToClipboard"
          />
          <div style="display: flex; flex-direction: column; flex: 2; min-width: 600px;">
            <ChartControlPanel
              :bar-direction="barDirection"
              :bar-direction-button-text="barDirectionButtonText"
              :font-size-button-text="fontSizeButtonText"
              :chart-width-button-text="chartWidthButtonText"
              :bar-width-button-text="barWidthButtonText"
              :selected-bar-color="selectedBarColor"
              :highlight-button-text="highlightButtonText"
              :sort-button-text="sortButtonText"
              :font-sizes="fontSizes"
              :font-size-labels="fontSizeLabels"
              :chart-font-size="chartFontSize"
              :chart-widths="chartWidths"
              :chart-width="chartWidth"
              :bar-width-percents="barWidthPercents"
              :bar-width-percent="barWidthPercent"
              :highlight-options="highlightOptions"
              :current-highlight="currentHighlight"
              :sort-options="sortOptions"
              :current-sort="currentSort"
              @toggle-direction="handleToggleDirection"
              @cycle-font-size="handleCycleFontSize"
              @cycle-chart-width="handleCycleChartWidth"
              @cycle-bar-width="handleCycleBarWidth"
              @cycle-color="handleCycleColor"
              @cycle-highlight="handleCycleHighlight"
              @cycle-sort="handleCycleSort"
            />
            <SymptomBarChart
              ref="symptomBarChartRef"
              :chart-width="chartWidth"
              :is-chart-copied="isChartCopied"
              @copy="copyChartToClipboard"
              @export="exportChart"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick, markRaw } from 'vue';
import * as echarts from 'echarts';
import { debounce } from 'lodash-es';

// Components
import SummaryBar from './components/SummaryBar.vue';
import FrequencyTable from './components/FrequencyTable.vue';
import ChartControlPanel from './components/ChartControlPanel.vue';
import SymptomBarChart from './components/SymptomBarChart.vue';

// Composables
import { useSymptomStats } from './composables/useSymptomStats';
import { useChartControls } from './composables/useChartControls';
import { useChartOptions } from './composables/useChartOptions';
import { useClipboardOperations } from './composables/useClipboardOperations';

// Chart Controls
const {
  fontSizes,
  fontSizeLabels,
  chartWidths,
  barWidthPercents,
  highlightOptions,
  sortOptions,
  chartFontSize,
  chartWidth,
  barWidthPercent,
  selectedBarColor,
  barDirection,
  currentHighlight,
  currentSort,
  fontSizeButtonText,
  chartWidthButtonText,
  barWidthButtonText,
  barDirectionButtonText,
  highlightButtonText,
  sortButtonText,
  cycleFontSize,
  cycleChartWidth,
  cycleBarWidthPercent,
  cycleBarColor,
  toggleBarDirection,
  cycleHighlight,
  cycleSort
} = useChartControls();

// Symptom Stats
const {
  sortedSymptomStats,
  symptomStats,
  chartStates,
  canUpdateChart
} = useSymptomStats({ currentSort });

// Chart Options
const { chartOptions } = useChartOptions({
  sortedSymptomStats,
  barDirection,
  chartFontSize,
  selectedBarColor,
  currentHighlight,
  barWidthPercent
});

// Chart instance
const chartInstance = ref(null);
const symptomBarChartRef = ref(null);

// Clipboard Operations
const {
  isTableCopied,
  isChartCopied,
  copyTableToClipboard,
  copyChartToClipboard,
  exportChart
} = useClipboardOperations({
  chartInstance,
  chartWidth
});

// Chart rendering
const debouncedRenderChart = debounce(() => {
  console.log('Debounced chart render triggered');
  renderChart();
}, 150);

const renderChart = () => {
  try {
    const chartContainer = symptomBarChartRef.value?.chartContainerRef;
    if (!chartContainer) {
      console.warn('renderChart: 차트 컨테이너가 없음');
      return;
    }
    
    if (!canUpdateChart()) {
      console.warn('renderChart: 차트 업데이트 불가 상태');
      return;
    }
    
    const states = chartStates.value;
    console.log('차트 렌더링 시작:', states);
    
    if (!chartInstance.value) {
      chartInstance.value = markRaw(echarts.init(chartContainer));
      console.log('차트 인스턴스 생성됨');
    }
    
    const options = chartOptions.value;
    if (options && typeof options === 'object') {
      chartInstance.value.setOption(options, false);
      console.log('차트 업데이트 완료');
    } else {
      console.error('renderChart: 유효하지 않은 차트 옵션');
    }
  } catch (error) {
    console.error('renderChart 오류:', error);
  }
};

const recreateChart = () => {
  console.log('Attempting to recreate chart...');
  if (chartInstance.value && typeof chartInstance.value.dispose === 'function') {
    try { 
      chartInstance.value.dispose(); 
      console.log('Previous chart instance disposed.'); 
    }
    catch (e) { 
      console.error('Error disposing chart instance:', e); 
    }
    finally { 
      chartInstance.value = null; 
    }
  }
  nextTick(() => {
    const chartContainer = symptomBarChartRef.value?.chartContainerRef;
    if (chartContainer instanceof HTMLElement) {
      try {
        console.log(`Initializing new chart in container with width: ${chartContainer.offsetWidth}px`);
        chartInstance.value = markRaw(echarts.init(chartContainer));
        console.log('New chart instance initialized.');
        renderChart();
      } catch (error) { 
        console.error('ECharts 재초기화 실패:', error); 
        alert('차트를 다시 그리는 중 오류가 발생했습니다.'); 
      }
    } else { 
      console.error('차트 컨테이너 DOM 요소를 찾을 수 없습니다.'); 
    }
  });
};

// Event handlers
const handleToggleDirection = () => {
  toggleBarDirection();
  nextTick(() => {
    if (canUpdateChart()) {
      debouncedRenderChart();
    }
  });
};

const handleCycleFontSize = () => {
  cycleFontSize();
  nextTick(() => {
    if (canUpdateChart()) {
      debouncedRenderChart();
    }
  });
};

const handleCycleChartWidth = () => {
  cycleChartWidth();
  nextTick(() => {
    if (canUpdateChart()) {
      recreateChart();
    }
  });
};

const handleCycleBarWidth = () => {
  cycleBarWidthPercent();
  nextTick(() => {
    if (canUpdateChart()) {
      debouncedRenderChart();
    }
  });
};

const handleCycleColor = () => {
  cycleBarColor();
  nextTick(() => {
    if (canUpdateChart()) {
      debouncedRenderChart();
    }
  });
};

const handleCycleHighlight = () => {
  cycleHighlight();
  nextTick(() => {
    if (canUpdateChart()) {
      debouncedRenderChart();
    }
  });
};

const handleCycleSort = () => {
  cycleSort();
  nextTick(() => {
    if (canUpdateChart()) {
      debouncedRenderChart();
    }
  });
};

// Lifecycle
onMounted(() => {
  console.log('ClinicalSymptoms 컴포넌트 마운트됨');
  nextTick(() => {
    if (canUpdateChart()) {
      renderChart();
    }
  });
});

onUnmounted(() => {
  if (chartInstance.value && typeof chartInstance.value.dispose === 'function') {
    try {
      chartInstance.value.dispose();
      chartInstance.value = null;
      console.log('차트 인스턴스 정리 완료');
    } catch (error) {
      console.error('차트 정리 오류:', error);
    }
  }
  
  if (debouncedRenderChart && typeof debouncedRenderChart.cancel === 'function') {
    debouncedRenderChart.cancel();
  }
  
  console.log('ClinicalSymptoms 컴포넌트 cleanup 완료');
});

// Watchers
watch(chartWidth, (newWidth, oldWidth) => {
  if (newWidth !== oldWidth && chartInstance.value && canUpdateChart()) {
    console.log(`Chart width changed: ${oldWidth} -> ${newWidth}. Recreating chart.`);
    nextTick(() => {
      recreateChart();
    });
  }
}, { flush: 'post' });

watch([
  symptomStats,
  barDirection,
  selectedBarColor,
  chartFontSize,
  currentHighlight,
  barWidthPercent
], ([newStats, newDirection, newColor, newFontSize, newHighlight, newBarWidth],
  [oldStats, oldDirection, oldColor, oldFontSize, oldHighlight, oldBarWidth]) => {
  
  try {
    const hasStatsChange = newStats !== oldStats;
    const hasDirectionChange = newDirection !== oldDirection;
    const hasColorChange = newColor !== oldColor;
    const hasFontChange = newFontSize !== oldFontSize;
    const hasHighlightChange = newHighlight !== oldHighlight;
    const hasBarWidthChange = newBarWidth !== oldBarWidth;
    
    if (!hasStatsChange && !hasDirectionChange && !hasColorChange && !hasFontChange && !hasHighlightChange && !hasBarWidthChange) {
      return;
    }
    
    console.log('차트 업데이트 triggered:', {
      hasStatsChange, hasDirectionChange, hasColorChange, hasFontChange, hasHighlightChange, hasBarWidthChange
    });
    
    nextTick(() => {
      if (canUpdateChart()) {
        debouncedRenderChart();
      }
    });
  } catch (error) {
    console.error('watch 핸들러 오류:', error);
  }
}, { 
  deep: false, 
  immediate: false,
  flush: 'post'
});
</script>

<style scoped>
.app {
  background-color: #f0f0f0;
}
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
.dashboard {
  display: flex;
  flex-direction: column;
  width: 97%;
  margin: 20px auto;
  background-color: #f0f0f0;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
}
.output-area {
  display: flex;
  flex-direction: column;
  gap: 30px;
  margin: 20px 30px 30px 30px;
}
.output-row {
  display: flex;
  gap: 30px;
  align-items: flex-start;
}
</style>
