<template>
  <div class="flex flex-wrap items-center gap-4 p-4 bg-slate-50/80 rounded-xl border border-slate-200 shadow-sm backdrop-blur-sm w-full mb-[18px]">
    <!-- 막대 방향 -->
    <ControlCycleText
      label="막대 방향:"
      :modelValue="barDirection"
      @update:modelValue="$emit('update:barDirection', $event)"
      :options="['vertical', 'horizontal']"
      :displayLabels="['세로', '가로']"
      tooltipPrefix="막대 방향을"
      suffix="로 변경합니다"
    />
    
    <!-- 폰트 크기 -->
    <ControlCycleText
      label="폰트 크기:"
      :modelValue="chartFontSize"
      @update:modelValue="$emit('update:chartFontSize', $event)"
      :options="fontSizes"
      :displayLabels="fontSizeLabels"
      tooltipPrefix="폰트 크기를"
      suffix="로 변경합니다"
      minWidthClass="min-w-[60px]"
    />
    
    <!-- 차트 너비 -->
    <ControlCycleText
      label="차트 너비:"
      :modelValue="chartWidth"
      @update:modelValue="$emit('update:chartWidth', $event)"
      :options="chartWidths"
      tooltipPrefix="차트 너비를"
      suffix="px"
      minWidthClass="min-w-[70px]"
    />
    
    <!-- 막대 너비 -->
    <ControlCycleText
      label="막대 너비:"
      :modelValue="barWidthPercent"
      @update:modelValue="$emit('update:barWidthPercent', $event)"
      :options="barWidthPercents"
      tooltipPrefix="막대 너비를"
      suffix="%"
      minWidthClass="min-w-[50px]"
    />
    
    <!-- 막대 강조 -->
    <ControlCycleText
      label="막대 강조:"
      :modelValue="currentHighlight"
      @update:modelValue="$emit('update:currentHighlight', $event)"
      :options="highlightOptionsNormalized"
      minWidthClass="min-w-[100px]"
    />
    
    <!-- 정렬 -->
    <ControlCycleText
      label="정렬:"
      :modelValue="currentSort"
      @update:modelValue="$emit('update:currentSort', $event)"
      :options="sortOptionsNormalized"
      minWidthClass="min-w-[90px]"
    />
    
    <!-- 색상 -->
    <ControlCycleColor
      label="막대 색상:"
      :modelValue="selectedBarColor"
      @update:modelValue="$emit('update:selectedBarColor', $event)"
      :options="barColors"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue';
import ControlCycleText from './controls/ControlCycleText.vue';
import ControlCycleColor from './controls/ControlCycleColor.vue';

const props = defineProps({
  barDirection: { type: String, default: 'vertical' },
  chartFontSize: { type: Number, default: 16 },
  chartWidth: { type: Number, default: 700 },
  barWidthPercent: { type: Number, default: 50 },
  selectedBarColor: { type: String, default: '#5470c6' },
  currentHighlight: { type: String, default: 'none' },
  currentSort: { type: String, default: 'none' },
  
  // 옵션 배열들
  fontSizes: { type: Array, default: () => [] },
  fontSizeLabels: { type: Array, default: () => [] },
  chartWidths: { type: Array, default: () => [] },
  barWidthPercents: { type: Array, default: () => [] },
  barColors: { type: Array, default: () => [] }, // Index receives defaults from useChartControls, usually passed in
  highlightOptions: { type: Array, default: () => [] },
  sortOptions: { type: Array, default: () => [] }
});

defineEmits([
  'update:barDirection',
  'update:chartFontSize',
  'update:chartWidth',
  'update:barWidthPercent',
  'update:selectedBarColor',
  'update:currentHighlight',
  'update:currentSort'
]);

// Normalize options for ControlCycleText ({value, label, tooltip})
const highlightOptionsNormalized = computed(() => {
  return props.highlightOptions.map(opt => ({
    value: opt.key,
    label: opt.label,
    tooltip: opt.tooltip
  }));
});

const sortOptionsNormalized = computed(() => {
  return props.sortOptions.map(opt => ({
    value: opt.key,
    label: opt.label,
    tooltip: opt.tooltip
  }));
});
</script>
