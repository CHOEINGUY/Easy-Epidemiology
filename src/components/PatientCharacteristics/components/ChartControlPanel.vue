<template>
  <div class="flex flex-wrap items-center gap-4 p-4 bg-slate-50/80 rounded-xl border border-slate-200 shadow-sm backdrop-blur-sm">
    <!-- 차트 대상 -->
    <ControlGroup
      label="차트 대상:"
      :modelValue="chartType"
      @update:modelValue="$emit('update:chartType', $event)"
      :options="[
        { value: 'total', label: '전체 대상자', tooltip: '차트 표시 대상을 전체 대상자로 변경합니다' },
        { value: 'patient', label: '환자', tooltip: '차트 표시 대상을 환자로 변경합니다' }
      ]"
    />

    <div class="w-px h-8 bg-slate-200 mx-1"></div>

    <!-- 데이터 유형 -->
    <ControlGroup
      label="데이터 유형:"
      :modelValue="dataType"
      @update:modelValue="$emit('update:dataType', $event)"
      :options="[
        { value: 'count', label: '수', tooltip: '데이터를 개수(명)으로 표시합니다' },
        { value: 'percentage', label: '비율(%)', tooltip: '데이터를 비율(%)로 표시합니다' }
      ]"
    />

    <!-- 폰트 크기 -->
    <ControlCycleText
      label="폰트 크기:"
      :modelValue="fontSize"
      @update:modelValue="$emit('update:fontSize', $event)"
      :options="[12, 15, 18, 21, 24]"
      :displayLabels="['매우 작게', '작게', '보통', '크게', '매우 크게']"
      tooltipPrefix="폰트 크기를"
      suffix="로 변경합니다"
      minWidthClass="min-w-[60px]"
    />

    <!-- 차트 너비 -->
    <ControlCycleText
      label="차트 너비:"
      :modelValue="chartWidth"
      @update:modelValue="$emit('update:chartWidth', $event)"
      :options="[500, 700, 900, 1100]"
      tooltipPrefix="차트 너비를"
      suffix="px"
      minWidthClass="min-w-[70px]"
    />

    <!-- 막대 너비 -->
    <ControlCycleText
      label="막대 너비:"
      :modelValue="barWidth"
      @update:modelValue="$emit('update:barWidth', $event)"
      :options="[30, 50, 70]"
      tooltipPrefix="막대 너비를"
      suffix="%"
      minWidthClass="min-w-[50px]"
    />

    <!-- 막대 강조 -->
    <ControlCycleText
      label="막대 강조:"
      :modelValue="highlight"
      @update:modelValue="$emit('update:highlight', $event)"
      :options="highlightOptionsNormalized"
      minWidthClass="min-w-[100px]"
    />

    <!-- 막대 색상 -->
    <ControlCycleColor
      label="막대 색상:"
      :modelValue="barColor"
      @update:modelValue="$emit('update:barColor', $event)"
      :options="barColors"
      tooltip="막대 색상을 변경합니다"
    />
  </div>
</template>

<script setup>
// ChartControlPanel.vue - 차트 설정 컨트롤 패널 (Refactored)
import { computed } from 'vue';
import ControlGroup from './controls/ControlGroup.vue';
import ControlCycleText from './controls/ControlCycleText.vue';
import ControlCycleColor from './controls/ControlCycleColor.vue';

defineProps({
  chartType: { type: String, default: 'total' },
  dataType: { type: String, default: 'count' },
  fontSize: { type: Number, default: 18 },
  chartWidth: { type: Number, default: 700 },
  barWidth: { type: Number, default: 50 },
  barColor: { type: String, default: '#5470c6' },
  highlight: { type: String, default: 'none' }
});

defineEmits([
  'update:chartType', 
  'update:dataType', 
  'update:fontSize', 
  'update:chartWidth', 
  'update:barWidth', 
  'update:barColor',
  'update:highlight'
]);

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

// Normalize highlight options to { value, label, tooltip }
const highlightOptionsNormalized = computed(() => {
  return highlightOptions.map(opt => ({
    value: opt.key,
    label: opt.label,
    tooltip: opt.tooltip
  }));
});
</script>
