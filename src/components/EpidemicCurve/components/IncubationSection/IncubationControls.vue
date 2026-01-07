<template>
  <div class="controls-area incubation-controls-local">
    <div v-if="!isIndividualExposureColumnVisible" class="control-group">
      <label for="exposure-time" class="control-label">의심원 노출시간 :</label>
      <div class="control-button-wrapper">
        <input
          type="text"
          id="exposure-time"
          :value="formattedExposureDateTime"
          @click="$emit('showExposureDateTimePicker', $event)"
          readonly
          class="control-input-datetime"
          @mouseenter="showTooltip('exposureTime', '기준 의심원 노출일을 설정합니다.')"
          @mouseleave="hideTooltip"
          placeholder="YYYY-MM-DD HH:MM"
        />
        <div v-if="activeTooltip === 'exposureTime'" class="control-tooltip">{{ tooltipText }}</div>
      </div>
    </div>

    <div class="control-group">
      <label for="incubation-interval" class="control-label">계급 간격(시간) :</label>
      <div class="control-button-wrapper">
        <select
          id="incubation-interval"
          :value="selectedInterval"
          @change="$emit('update:selectedInterval', Number($event.target.value))"
          class="control-select"
          @mouseenter="showTooltip('incubationInterval', '잠복기 계산 간격을 변경합니다')"
          @mouseleave="hideTooltip"
        >
          <option value="3">3시간</option>
          <option value="6">6시간</option>
          <option value="12">12시간</option>
          <option value="24">24시간</option>
          <option value="48">48시간</option>
        </select>
        <div v-if="activeTooltip === 'incubationInterval'" class="control-tooltip">{{ tooltipText }}</div>
      </div>
    </div>

    <div class="control-group">
      <label class="control-label">폰트 크기:</label>
      <div class="control-button-wrapper">
        <button class="control-button font-button" @click="onCycleFontSize" @mouseenter="onFontSizeMouseEnter" @mouseleave="onFontSizeMouseLeave">
          {{ fontSizeButtonText }}
        </button>
        <div v-if="activeTooltip === 'incubationFontSize'" class="control-tooltip">{{ tooltipText }}</div>
      </div>
    </div>

    <div class="control-group">
      <label class="control-label">차트 너비:</label>
      <div class="control-button-wrapper">
        <button class="control-button width-button" @click="onCycleChartWidth" @mouseenter="onChartWidthMouseEnter" @mouseleave="onChartWidthMouseLeave">
          {{ chartWidthButtonText }}
        </button>
        <div v-if="activeTooltip === 'incubationChartWidth'" class="control-tooltip">{{ tooltipText }}</div>
      </div>
    </div>

    <div class="control-group">
      <label class="control-label">색상:</label>
      <div class="control-button-wrapper">
        <button class="control-button color-button" :style="{ backgroundColor: barColor }" @click="onCycleBarColor" @mouseenter="showTooltip('incubationColor', '막대 색상을 변경합니다')" @mouseleave="hideTooltip"></button>
        <div v-if="activeTooltip === 'incubationColor'" class="control-tooltip">{{ tooltipText }}</div>
      </div>
    </div>

    <div class="control-group">
      <label class="control-label">차트 표시:</label>
      <div class="control-button-wrapper">
        <button @click="$emit('selectDisplayMode', 'hour')" :class="{ 'chart-select-button--active': displayMode === 'hour' }" class="chart-select-button">시간 단위</button>
      </div>
      <div class="control-button-wrapper">
        <button @click="$emit('selectDisplayMode', 'hhmm')" :class="{ 'chart-select-button--active': displayMode === 'hhmm' }" class="chart-select-button">시:분 단위</button>
      </div>
    </div>

    <div class="control-group reset-button-group">
      <button @click="$emit('resetSettings')" class="control-button reset-text-button" @mouseenter="showTooltip('resetIncubationChart', '잠복기 차트 설정을 기본값으로 초기화합니다')" @mouseleave="hideTooltip">
        초기화
      </button>
      <div v-if="activeTooltip === 'resetIncubationChart'" class="control-tooltip">{{ tooltipText }}</div>
    </div>
  </div>
</template>

<script setup>
import { useTooltip } from '../../composables/useTooltip';

defineProps({
  selectedInterval: { type: Number, required: true },
  fontSizeButtonText: { type: String, required: true },
  chartWidthButtonText: { type: String, required: true },
  barColor: { type: String, required: true },
  displayMode: { type: String, required: true },
  formattedExposureDateTime: { type: String, default: '' },
  isIndividualExposureColumnVisible: { type: Boolean, default: false }
});

const emit = defineEmits([
  'update:selectedInterval',
  'cycleFontSize',
  'cycleChartWidth',
  'cycleBarColor',
  'selectDisplayMode',
  'resetSettings',
  'showExposureDateTimePicker',
  'fontSizeMouseEnter',
  'fontSizeMouseLeave',
  'chartWidthMouseEnter',
  'chartWidthMouseLeave'
]);

const { activeTooltip, tooltipText, showTooltip, hideTooltip } = useTooltip();

const onCycleFontSize = () => emit('cycleFontSize');
const onCycleChartWidth = () => emit('cycleChartWidth');
const onCycleBarColor = () => emit('cycleBarColor');
const onFontSizeMouseEnter = () => emit('fontSizeMouseEnter');
const onFontSizeMouseLeave = () => emit('fontSizeMouseLeave');
const onChartWidthMouseEnter = () => emit('chartWidthMouseEnter');
const onChartWidthMouseLeave = () => emit('chartWidthMouseLeave');
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
}

.control-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.control-label {
  font-size: 14px;
  color: #555;
  white-space: nowrap;
}

.control-button-wrapper {
  position: relative;
}

.control-select {
  padding: 6px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  background: white;
  cursor: pointer;
}

.control-input-datetime {
  padding: 6px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  background: white;
  cursor: pointer;
  width: 160px;
}

.control-button {
  padding: 6px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
}

.control-button:hover {
  background: #f0f0f0;
}

.color-button {
  width: 30px;
  height: 30px;
  padding: 0;
  border-radius: 50%;
}

.chart-select-button {
  padding: 6px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
}

.chart-select-button--active {
  background: #1a73e8;
  color: white;
  border-color: #1a73e8;
}

.reset-button-group {
  margin-left: auto;
}

.reset-text-button {
  color: #666;
  background: transparent;
  border: 1px solid #ccc;
}

.reset-text-button:hover {
  color: #333;
  border-color: #999;
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
</style>
