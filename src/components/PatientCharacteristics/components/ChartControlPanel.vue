<template>
  <div class="ui-container">
    <!-- 차트 대상 -->
    <div class="ui-group">
      <span class="ui-label">차트 대상:</span>
      <div class="control-button-wrapper">
        <button 
          @click="$emit('update:chartType', 'total')" 
          :class="{ 'chart-select-button--active': chartType === 'total' }" 
          class="chart-select-button" 
          @mouseenter="showTooltip('chartTypeTotal', '차트 표시 대상을 전체 대상자로 변경합니다')" 
          @mouseleave="hideTooltip"
        > 
          전체 대상자 
        </button>
        <div v-if="activeTooltip === 'chartTypeTotal'" class="control-tooltip">{{ tooltipText }}</div>
      </div>
      <div class="control-button-wrapper">
        <button 
          @click="$emit('update:chartType', 'patient')" 
          :class="{ 'chart-select-button--active': chartType === 'patient' }" 
          class="chart-select-button" 
          @mouseenter="showTooltip('chartTypePatient', '차트 표시 대상을 환자로 변경합니다')" 
          @mouseleave="hideTooltip"
        > 
          환자 
        </button>
        <div v-if="activeTooltip === 'chartTypePatient'" class="control-tooltip">{{ tooltipText }}</div>
      </div>
    </div>

    <!-- 데이터 유형 -->
    <div class="ui-group">
      <span class="ui-label">데이터 유형:</span>
      <div class="control-button-wrapper">
        <button 
          @click="$emit('update:dataType', 'count')" 
          :class="{ 'chart-select-button--active': dataType === 'count' }" 
          class="chart-select-button" 
          @mouseenter="showTooltip('dataTypeCount', '데이터를 개수(명)으로 표시합니다')" 
          @mouseleave="hideTooltip"
        > 
          수 
        </button>
        <div v-if="activeTooltip === 'dataTypeCount'" class="control-tooltip">{{ tooltipText }}</div>
      </div>
      <div class="control-button-wrapper">
        <button 
          @click="$emit('update:dataType', 'percentage')" 
          :class="{ 'chart-select-button--active': dataType === 'percentage' }" 
          class="chart-select-button" 
          @mouseenter="showTooltip('dataTypePercentage', '데이터를 비율(%)로 표시합니다')" 
          @mouseleave="hideTooltip"
        > 
          비율(%) 
        </button>
        <div v-if="activeTooltip === 'dataTypePercentage'" class="control-tooltip">{{ tooltipText }}</div>
      </div>
    </div>

    <!-- 폰트 크기 -->
    <div class="ui-group">
      <label class="ui-label">폰트 크기:</label>
      <div class="control-button-wrapper">
        <button 
          class="control-button font-button" 
          @click="cycleFontSize" 
          @mouseenter="handleFontSizeMouseEnter" 
          @mouseleave="handleFontSizeMouseLeave"
        > 
          {{ fontSizeButtonText }} 
        </button>
        <div v-if="activeTooltip === 'fontSize'" class="control-tooltip">{{ tooltipText }}</div>
      </div>
    </div>

    <!-- 차트 너비 -->
    <div class="ui-group">
      <label class="ui-label">차트 너비:</label>
      <div class="control-button-wrapper">
        <button 
          class="control-button width-button" 
          @click="cycleChartWidth" 
          @mouseenter="handleChartWidthMouseEnter" 
          @mouseleave="handleChartWidthMouseLeave"
        > 
          {{ chartWidthButtonText }} 
        </button>
        <div v-if="activeTooltip === 'chartWidth'" class="control-tooltip">{{ tooltipText }}</div>
      </div>
    </div>

    <!-- 막대 너비 -->
    <div class="ui-group">
      <label class="ui-label">막대 너비:</label>
      <div class="control-button-wrapper">
        <button 
          class="control-button width-button" 
          @click="cycleBarWidth" 
          @mouseenter="handleBarWidthMouseEnter" 
          @mouseleave="handleBarWidthMouseLeave"
        > 
          {{ barWidthButtonText }} 
        </button>
        <div v-if="activeTooltip === 'barWidth'" class="control-tooltip">{{ tooltipText }}</div>
      </div>
    </div>

    <!-- 막대 강조 -->
    <div class="ui-group highlight-group">
      <label class="ui-label">막대 강조:</label>
      <div class="control-button-wrapper">
        <button 
          class="control-button highlight-button" 
          @click="cycleHighlight" 
          @mouseenter="handleMouseEnterHighlight" 
          @mouseleave="handleMouseLeaveHighlight"
        >
          {{ highlightButtonText }}
        </button>
        <div v-if="activeTooltip === 'highlight'" class="control-tooltip">
          {{ tooltipText }}
        </div>
      </div>
    </div>

    <!-- 막대 색상 -->
    <div class="ui-group">
      <label class="ui-label">막대 색상:</label>
      <div class="control-button-wrapper">
        <button 
          class="color-button" 
          :style="{ backgroundColor: barColor }" 
          @click="cycleBarColor" 
          @mouseenter="showTooltip('barColor', '막대 색상을 변경합니다')" 
          @mouseleave="hideTooltip"
        ></button>
        <div v-if="activeTooltip === 'barColor'" class="control-tooltip">{{ tooltipText }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
// ChartControlPanel.vue - 차트 설정 컨트롤 패널
import { ref, computed } from 'vue';
import { useTooltip } from '../composables/useTooltip';

const props = defineProps({
  chartType: {
    type: String,
    default: 'total'
  },
  dataType: {
    type: String,
    default: 'count'
  },
  fontSize: {
    type: Number,
    default: 18
  },
  chartWidth: {
    type: Number,
    default: 700
  },
  barWidth: {
    type: Number,
    default: 50
  },
  barColor: {
    type: String,
    default: '#5470c6'
  },
  highlight: {
    type: String,
    default: 'none'
  }
});

const emit = defineEmits([
  'update:chartType', 
  'update:dataType', 
  'update:fontSize', 
  'update:chartWidth', 
  'update:barWidth', 
  'update:barColor',
  'update:highlight'
]);

const { activeTooltip, tooltipText, showTooltip, hideTooltip } = useTooltip();

// 옵션 배열들
const fontSizes = [12, 15, 18, 21, 24];
const fontSizeLabels = ['매우 작게', '작게', '보통', '크게', '매우 크게'];
const chartWidths = [500, 700, 900, 1100];
const barWidthPercents = [30, 50, 70];
const barColors = [
  '#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de',
  '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc'
];
const highlightOptions = [
  { key: 'none', label: '강조 없음', tooltip: '모든 막대를 같은 색상으로 표시합니다' },
  { key: 'max', label: '최대값 강조', tooltip: '가장 큰 값의 막대를 다른 색상으로 강조합니다' },
  { key: 'min', label: '최소값 강조', tooltip: '가장 작은 값의 막대를 다른 색상으로 강조합니다' },
  { key: 'both', label: '최대/최소값 강조', tooltip: '가장 큰 값과 가장 작은 값의 막대를 강조합니다' }
];

// 버튼 텍스트 상태
const fontSizeButtonText = ref(fontSizeLabels[fontSizes.indexOf(props.fontSize)] || '보통');
const chartWidthButtonText = ref(`${props.chartWidth}px`);
const barWidthButtonText = ref(`${props.barWidth}%`);
const highlightButtonText = ref(highlightOptions.find(opt => opt.key === props.highlight)?.label || '강조 없음');

// 유틸리티 함수
const getNextValue = (currentValue, valueArray) => {
  const currentIndex = valueArray.indexOf(currentValue);
  if (currentIndex === -1) return valueArray[0];
  const nextIndex = (currentIndex + 1) % valueArray.length;
  return valueArray[nextIndex];
};

// 폰트 크기 관련
const cycleFontSize = () => {
  const nextSize = getNextValue(props.fontSize, fontSizes);
  emit('update:fontSize', nextSize);
  fontSizeButtonText.value = fontSizeLabels[fontSizes.indexOf(nextSize)];
};

const handleFontSizeMouseEnter = () => {
  const currentIndex = fontSizes.indexOf(props.fontSize);
  const nextIndex = (currentIndex + 1) % fontSizes.length;
  const nextFontSize = fontSizeLabels[nextIndex];
  fontSizeButtonText.value = nextFontSize;
  showTooltip('fontSize', `폰트 크기를 ${nextFontSize}로 변경합니다`);
};

const handleFontSizeMouseLeave = () => {
  fontSizeButtonText.value = fontSizeLabels[fontSizes.indexOf(props.fontSize)];
  hideTooltip();
};

// 차트 너비 관련
const cycleChartWidth = () => {
  const nextWidth = getNextValue(props.chartWidth, chartWidths);
  emit('update:chartWidth', nextWidth);
  chartWidthButtonText.value = `${nextWidth}px`;
};

const handleChartWidthMouseEnter = () => {
  const currentIndex = chartWidths.indexOf(props.chartWidth);
  const nextIndex = (currentIndex + 1) % chartWidths.length;
  const nextWidth = chartWidths[nextIndex];
  chartWidthButtonText.value = `${nextWidth}px`;
  showTooltip('chartWidth', `차트 너비를 ${nextWidth}px로 변경합니다`);
};

const handleChartWidthMouseLeave = () => {
  chartWidthButtonText.value = `${props.chartWidth}px`;
  hideTooltip();
};

// 막대 너비 관련
const cycleBarWidth = () => {
  const nextWidth = getNextValue(props.barWidth, barWidthPercents);
  emit('update:barWidth', nextWidth);
  barWidthButtonText.value = `${nextWidth}%`;
};

const handleBarWidthMouseEnter = () => {
  const currentIndex = barWidthPercents.indexOf(props.barWidth);
  const nextIndex = (currentIndex + 1) % barWidthPercents.length;
  const nextWidth = barWidthPercents[nextIndex];
  barWidthButtonText.value = `${nextWidth}%`;
  showTooltip('barWidth', `막대 너비를 ${nextWidth}%로 변경합니다`);
};

const handleBarWidthMouseLeave = () => {
  barWidthButtonText.value = `${props.barWidth}%`;
  hideTooltip();
};

// 막대 색상 관련
const cycleBarColor = () => {
  const nextColor = getNextValue(props.barColor, barColors);
  emit('update:barColor', nextColor);
};

// 강조 관련
const getNextHighlight = computed(() => {
  const currentIndex = highlightOptions.findIndex(opt => opt.key === props.highlight);
  const nextIndex = (currentIndex + 1) % highlightOptions.length;
  return highlightOptions[nextIndex];
});

const cycleHighlight = () => {
  const nextOption = getNextHighlight.value;
  emit('update:highlight', nextOption.key);
  highlightButtonText.value = nextOption.label;
};

const handleMouseEnterHighlight = () => {
  const nextOption = getNextHighlight.value;
  highlightButtonText.value = nextOption.label;
  showTooltip('highlight', nextOption.tooltip);
};

const handleMouseLeaveHighlight = () => {
  const currentOption = highlightOptions.find(opt => opt.key === props.highlight);
  highlightButtonText.value = currentOption.label;
  hideTooltip();
};
</script>

<style scoped>
.ui-container { 
  padding: 10px 15px; 
  background-color: #fff; 
  border-radius: 10px; 
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08); 
  display: flex; 
  align-items: center; 
  gap: 15px; 
  flex-wrap: wrap; 
  box-sizing: border-box; 
}

.ui-group { 
  display: flex; 
  align-items: center; 
  gap: 6px; 
}

.ui-label { 
  font-size: 13px; 
  color: #333; 
  white-space: nowrap; 
  font-weight: 500; 
}

.chart-select-button { 
  padding: 4px 10px; 
  border: 1px solid #ccc; 
  border-radius: 14px; 
  background-color: white; 
  cursor: pointer; 
  font-family: "Noto Sans KR", sans-serif; 
  font-size: 13px; 
  transition: all 0.2s ease; 
}

.chart-select-button:hover { 
  background-color: #f0f0f0; 
  border-color: #aaa; 
}

.chart-select-button--active { 
  background-color: #1a73e8; 
  color: white; 
  border-color: #1a73e8; 
  font-weight: 500; 
}

.chart-select-button--active:hover { 
  background-color: #155ab6; 
}

.control-button { 
  padding: 4px 8px; 
  border: 1px solid #ccc; 
  border-radius: 5px; 
  background-color: #f8f9fa; 
  color: #333; 
  cursor: pointer; 
  font-size: 13px; 
  font-family: "Roboto", sans-serif; 
  min-width: 45px; 
  height: 28px; 
  line-height: 18px; 
  text-align: center; 
  transition: background-color 0.2s, border-color 0.2s, color 0.2s, box-shadow 0.2s; 
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05); 
  white-space: nowrap; 
}

.control-button:not(.color-button):hover { 
  background-color: #1a73e8; 
  color: white; 
  border-color: #1a73e8; 
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.07); 
}

.control-button:active { 
  background-color: #e9ecef; 
  color: #333; 
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1); 
}

.font-button { 
  min-width: 35px; 
}

.width-button { 
  min-width: 35px; 
}

.color-button {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid #dadce0;
  padding: 0;
  background: none;
  margin-left: 2px;
  margin-right: 2px;
  cursor: pointer;
  display: inline-block;
  box-shadow: none;
  min-width: unset;
  line-height: 32px;
}

.color-button:hover {
  border-color: #4285f4;
  opacity: 0.85;
  transform: scale(1.05);
}

.highlight-group {
  position: relative;
}

.highlight-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-width: 110px;
  padding: 4px 8px;
  text-align: center;
}

.control-button-wrapper {
  position: relative;
  display: inline-block;
}

.control-tooltip {
  position: absolute;
  bottom: calc(100% + 5px);
  left: 50%;
  transform: translateX(-50%);
  background-color: #333;
  color: white;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 12px;
  white-space: nowrap;
  z-index: 1050;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  animation: tooltipFadeIn 0.2s ease-in-out;
}

.control-tooltip::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 5px solid transparent;
  border-top-color: #333;
}

@keyframes tooltipFadeIn {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}
</style>
