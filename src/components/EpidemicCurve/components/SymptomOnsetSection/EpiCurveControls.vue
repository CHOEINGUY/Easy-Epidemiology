<template>
  <div class="controls-area symptom-controls-local">
    <div class="control-group">
      <label for="symptom-interval" class="control-label">증상발현 시간간격 :</label>
      <div class="control-button-wrapper">
        <select
          id="symptom-interval"
          :value="selectedInterval"
          @change="$emit('update:selectedInterval', Number($event.target.value))"
          class="control-select"
          @mouseenter="showTooltip('symptomInterval', '증상 발현 시간 간격을 변경합니다')"
          @mouseleave="hideTooltip"
        >
          <option value="3">3시간</option>
          <option value="6">6시간</option>
          <option value="12">12시간</option>
          <option value="24">24시간</option>
          <option value="48">48시간</option>
        </select>
        <div v-if="activeTooltip === 'symptomInterval'" class="control-tooltip">{{ tooltipText }}</div>
      </div>
    </div>

    <div class="control-group">
      <label class="control-label">폰트 크기:</label>
      <div class="control-button-wrapper">
        <button class="control-button font-button" @click="onCycleFontSize" @mouseenter="onFontSizeMouseEnter" @mouseleave="onFontSizeMouseLeave">
          {{ fontSizeButtonText }}
        </button>
        <div v-if="activeTooltip === 'epiFontSize'" class="control-tooltip">{{ tooltipText }}</div>
      </div>
    </div>

    <div class="control-group">
      <label class="control-label">차트 너비:</label>
      <div class="control-button-wrapper">
        <button class="control-button width-button" @click="onCycleChartWidth" @mouseenter="onChartWidthMouseEnter" @mouseleave="onChartWidthMouseLeave">
          {{ chartWidthButtonText }}
        </button>
        <div v-if="activeTooltip === 'epiChartWidth'" class="control-tooltip">{{ tooltipText }}</div>
      </div>
    </div>

    <div class="control-group">
      <label class="control-label">색상:</label>
      <div class="control-button-wrapper">
        <button class="control-button color-button" :style="{ backgroundColor: barColor }" @click="onCycleBarColor" @mouseenter="showTooltip('epiColor', '막대 색상을 변경합니다')" @mouseleave="hideTooltip"></button>
        <div v-if="activeTooltip === 'epiColor'" class="control-tooltip">{{ tooltipText }}</div>
      </div>
    </div>

    <div class="control-group">
      <label class="control-label">차트 표시:</label>
      <div class="control-button-wrapper">
        <button @click="$emit('selectDisplayMode', 'time')" :class="{ 'chart-select-button--active': displayMode === 'time' }" class="chart-select-button" @mouseenter="showTooltip('displayModeTime', '간단한 시 단위 표시')" @mouseleave="hideTooltip">
          시 단위
        </button>
        <div v-if="activeTooltip === 'displayModeTime'" class="control-tooltip">{{ tooltipText }}</div>
      </div>
      <div class="control-button-wrapper">
        <button @click="$emit('selectDisplayMode', 'datetime')" :class="{ 'chart-select-button--active': displayMode === 'datetime' }" class="chart-select-button" @mouseenter="showTooltip('displayModeDateTime', '정확한 날짜와 시간 표시')" @mouseleave="hideTooltip">
          날짜+시간
        </button>
        <div v-if="activeTooltip === 'displayModeDateTime'" class="control-tooltip">{{ tooltipText }}</div>
      </div>
    </div>

    <div v-if="showConfirmedCaseToggle" class="control-group">
      <label class="control-label">확진자 꺾은선:</label>
      <div class="control-button-wrapper">
        <button @click="$emit('toggleConfirmedCaseLine')" :class="{ 'chart-select-button--active': showConfirmedCaseLine }" class="chart-select-button" @mouseenter="showTooltip('confirmedCaseLine', '확진자 꺾은선 표시/숨김')" @mouseleave="hideTooltip">
          {{ showConfirmedCaseLine ? '표시' : '숨김' }}
        </button>
        <div v-if="activeTooltip === 'confirmedCaseLine'" class="control-tooltip">{{ tooltipText }}</div>
      </div>
    </div>

    <div class="control-group reset-button-group">
      <button @click="$emit('resetSettings')" class="control-button reset-text-button" @mouseenter="showTooltip('resetEpiChart', '유행곡선 차트 설정을 기본값으로 초기화합니다')" @mouseleave="hideTooltip">
        초기화
      </button>
      <div v-if="activeTooltip === 'resetEpiChart'" class="control-tooltip">{{ tooltipText }}</div>
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
  showConfirmedCaseToggle: { type: Boolean, default: false },
  showConfirmedCaseLine: { type: Boolean, default: true }
});

const emit = defineEmits([
  'update:selectedInterval',
  'cycleFontSize',
  'cycleChartWidth',
  'cycleBarColor',
  'selectDisplayMode',
  'toggleConfirmedCaseLine',
  'resetSettings',
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
