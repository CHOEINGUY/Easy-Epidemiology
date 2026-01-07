<template>
  <div class="controls-area">
    <!-- 막대 방향 -->
    <div class="control-group">
      <label class="control-label">막대 방향:</label>
      <div class="control-button-wrapper">
        <button 
          class="control-button" 
          @click="$emit('toggle-direction')" 
          @mouseenter="handleBarDirectionMouseEnter($event)" 
          @mouseleave="handleBarDirectionMouseLeave"
        >
          {{ barDirectionButtonText }}
        </button>
        <div v-if="activeTooltip === 'direction'" class="control-tooltip" :style="tooltipStyle">{{ tooltipText }}</div>
      </div>
    </div>
    
    <!-- 폰트 크기 -->
    <div class="control-group">
      <label class="control-label">폰트 크기:</label>
      <div class="control-button-wrapper">
        <button 
          class="control-button font-button" 
          @click="$emit('cycle-font-size')" 
          @mouseenter="handleFontSizeMouseEnter($event)" 
          @mouseleave="handleFontSizeMouseLeave"
        >
          {{ fontSizeButtonText }}
        </button>
        <div v-if="activeTooltip === 'fontSize'" class="control-tooltip" :style="tooltipStyle">{{ tooltipText }}</div>
      </div>
    </div>
    
    <!-- 차트 너비 -->
    <div class="control-group">
      <label class="control-label">차트 너비:</label>
      <div class="control-button-wrapper">
        <button 
          class="control-button width-button" 
          @click="$emit('cycle-chart-width')" 
          @mouseenter="handleChartWidthMouseEnter($event)" 
          @mouseleave="handleChartWidthMouseLeave"
        >
          {{ chartWidthButtonText }}
        </button>
        <div v-if="activeTooltip === 'chartWidth'" class="control-tooltip" :style="tooltipStyle">{{ tooltipText }}</div>
      </div>
    </div>
    
    <!-- 막대 너비 -->
    <div class="control-group">
      <label class="control-label">막대 너비:</label>
      <div class="control-button-wrapper">
        <button 
          class="control-button width-button" 
          @click="$emit('cycle-bar-width')" 
          @mouseenter="handleBarWidthMouseEnter($event)" 
          @mouseleave="handleBarWidthMouseLeave"
        >
          {{ barWidthButtonText }}
        </button>
        <div v-if="activeTooltip === 'barWidth'" class="control-tooltip" :style="tooltipStyle">{{ tooltipText }}</div>
      </div>
    </div>
    
    <!-- 색상 -->
    <div class="control-group">
      <label class="control-label">색상:</label>
      <div class="control-button-wrapper">
        <button 
          class="control-button color-button" 
          :style="{ backgroundColor: selectedBarColor }" 
          @click="$emit('cycle-color')" 
          @mouseenter="handleBarColorMouseEnter($event)" 
          @mouseleave="handleBarColorMouseLeave"
        ></button>
        <div v-if="activeTooltip === 'color'" class="control-tooltip" :style="tooltipStyle">{{ tooltipText }}</div>
      </div>
    </div>
    
    <!-- 막대 강조 -->
    <div class="control-group highlight-group">
      <label class="control-label">막대 강조:</label>
      <div class="control-button-wrapper">
        <button 
          class="control-button highlight-button" 
          @click="$emit('cycle-highlight')" 
          @mouseenter="handleMouseEnterHighlight($event)" 
          @mouseleave="handleMouseLeaveHighlight"
        >
          {{ highlightButtonText }}
        </button>
        <div v-if="activeTooltip === 'highlight'" class="control-tooltip" :style="tooltipStyle">
          {{ tooltipText }}
        </div>
      </div>
    </div>
    
    <!-- 정렬 -->
    <div class="control-group">
      <label class="control-label">정렬:</label>
      <div class="control-button-wrapper">
        <button 
          class="control-button sort-button" 
          @click="$emit('cycle-sort')" 
          @mouseenter="handleSortMouseEnter($event)" 
          @mouseleave="handleSortMouseLeave"
        >
          {{ sortButtonText }}
        </button>
        <div v-if="activeTooltip === 'sort'" class="control-tooltip" :style="tooltipStyle">{{ tooltipText }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useTooltip } from '../composables/useTooltip';

const props = defineProps({
  barDirection: {
    type: String,
    default: 'vertical'
  },
  barDirectionButtonText: {
    type: String,
    default: '세로'
  },
  fontSizeButtonText: {
    type: String,
    default: '보통'
  },
  chartWidthButtonText: {
    type: String,
    default: '700px'
  },
  barWidthButtonText: {
    type: String,
    default: '50%'
  },
  selectedBarColor: {
    type: String,
    default: '#5470c6'
  },
  highlightButtonText: {
    type: String,
    default: '강조 없음'
  },
  sortButtonText: {
    type: String,
    default: '정렬 없음'
  },
  // 옵션 상수들
  fontSizes: {
    type: Array,
    default: () => [14, 16, 18, 20, 24]
  },
  fontSizeLabels: {
    type: Array,
    default: () => ['매우 작게', '작게', '보통', '크게', '매우 크게']
  },
  chartFontSize: {
    type: Number,
    default: 16
  },
  chartWidths: {
    type: Array,
    default: () => [500, 700, 900, 1100]
  },
  chartWidth: {
    type: Number,
    default: 700
  },
  barWidthPercents: {
    type: Array,
    default: () => [30, 50, 70]
  },
  barWidthPercent: {
    type: Number,
    default: 50
  },
  highlightOptions: {
    type: Array,
    default: () => []
  },
  currentHighlight: {
    type: String,
    default: 'none'
  },
  sortOptions: {
    type: Array,
    default: () => []
  },
  currentSort: {
    type: String,
    default: 'none'
  }
});

defineEmits([
  'toggle-direction',
  'cycle-font-size',
  'cycle-chart-width',
  'cycle-bar-width',
  'cycle-color',
  'cycle-highlight',
  'cycle-sort'
]);

const { activeTooltip, tooltipText, tooltipStyle, showTooltip, hideTooltip } = useTooltip();

// 마우스 이벤트 핸들러들
const handleBarDirectionMouseEnter = (event) => {
  const nextDirection = props.barDirection === 'vertical' ? '가로' : '세로';
  showTooltip('direction', `막대 방향을 ${nextDirection}로 변경합니다`, event);
};

const handleBarDirectionMouseLeave = () => {
  hideTooltip();
};

const handleFontSizeMouseEnter = (event) => {
  const currentIndex = props.fontSizes.indexOf(props.chartFontSize);
  const nextIndex = (currentIndex + 1) % props.fontSizes.length;
  const nextFontSize = props.fontSizeLabels[nextIndex];
  showTooltip('fontSize', `폰트 크기를 ${nextFontSize}로 변경합니다`, event);
};

const handleFontSizeMouseLeave = () => {
  hideTooltip();
};

const handleChartWidthMouseEnter = (event) => {
  const currentIndex = props.chartWidths.indexOf(props.chartWidth);
  const nextIndex = (currentIndex + 1) % props.chartWidths.length;
  const nextWidth = props.chartWidths[nextIndex];
  showTooltip('chartWidth', `차트 너비를 ${nextWidth}px로 변경합니다`, event);
};

const handleChartWidthMouseLeave = () => {
  hideTooltip();
};

const handleBarWidthMouseEnter = (event) => {
  const currentIndex = props.barWidthPercents.indexOf(props.barWidthPercent);
  const nextIndex = (currentIndex + 1) % props.barWidthPercents.length;
  const nextWidth = props.barWidthPercents[nextIndex];
  showTooltip('barWidth', `막대 너비를 ${nextWidth}%로 변경합니다`, event);
};

const handleBarWidthMouseLeave = () => {
  hideTooltip();
};

const handleBarColorMouseEnter = (event) => {
  showTooltip('color', '막대 색상을 변경합니다', event);
};

const handleBarColorMouseLeave = () => {
  hideTooltip();
};

const handleMouseEnterHighlight = (event) => {
  const currentIndex = props.highlightOptions.findIndex(opt => opt.key === props.currentHighlight);
  const nextIndex = (currentIndex + 1) % props.highlightOptions.length;
  const nextOption = props.highlightOptions[nextIndex];
  showTooltip('highlight', nextOption?.tooltip || '', event);
};

const handleMouseLeaveHighlight = () => {
  hideTooltip();
};

const handleSortMouseEnter = (event) => {
  const currentIndex = props.sortOptions.findIndex(option => option.key === props.currentSort);
  const nextIndex = (currentIndex + 1) % props.sortOptions.length;
  const nextSort = props.sortOptions[nextIndex];
  showTooltip('sort', nextSort?.tooltip || '', event);
};

const handleSortMouseLeave = () => {
  hideTooltip();
};
</script>

<style scoped>
.controls-area {
  padding: 10px 15px;
  background-color: #fff;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
  gap: 15px;
  flex-wrap: wrap;
  box-sizing: border-box;
  width: 100%;
  justify-content: flex-start;
  margin-bottom: 18px;
  overflow: visible;
}
.control-group {
  display: flex;
  align-items: center;
  gap: 6px;
  position: relative;
}
.control-label {
  font-size: 13px;
  color: #333;
  white-space: nowrap;
  font-weight: 500;
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
.control-button-wrapper {
  position: relative;
  display: inline-block;
  z-index: 20;
  justify-content: center;
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
  height: 28px;
  box-sizing: border-box;
}
.sort-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-width: 90px;
  padding: 4px 8px;
  text-align: center;
  height: 28px;
  box-sizing: border-box;
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
