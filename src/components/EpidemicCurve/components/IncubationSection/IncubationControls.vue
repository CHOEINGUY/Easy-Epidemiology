<template>
  <EpidemicChartControls
    intervalLabel="계급 간격(시간) :"
    intervalId="incubation-interval"
    intervalTooltipText="잠복기 계산 간격을 변경합니다"
    :selectedInterval="selectedInterval"
    @update:selectedInterval="$emit('update:selectedInterval', $event)"
    
    :chartFontSize="chartFontSize"
    @update:chartFontSize="$emit('update:chartFontSize', $event)"
    
    :chartWidth="chartWidth"
    @update:chartWidth="$emit('update:chartWidth', $event)"
    
    :barColor="barColor"
    @update:barColor="$emit('update:barColor', $event)"
    
    :displayMode="displayMode"
    @update:displayMode="$emit('update:displayMode', $event)"
    
    :displayModeOptions="[
      { value: 'hour', label: '시간 단위', tooltip: '시간 단위로 표시합니다' },
      { value: 'hhmm', label: '시:분 단위', tooltip: '상세 시간을 표시합니다' }
    ]"
    
    :fontSizes="fontSizes"
    :fontSizeLabels="fontSizeLabels"
    :chartWidths="chartWidths"
    :barColors="barColors"
    
    @resetSettings="$emit('resetSettings')"
  >
  </EpidemicChartControls>
</template>

<script setup lang="ts">
import EpidemicChartControls from '../EpidemicChartControls.vue';
import { useTooltip } from '../../composables/useTooltip';

withDefaults(defineProps<{
  selectedInterval: number;
  chartFontSize: number;
  chartWidth: number;
  barColor: string;
  displayMode: string;
  fontSizes?: number[];
  fontSizeLabels?: string[];
  chartWidths?: number[];
  barColors?: string[];
  formattedExposureDateTime?: string;
  isIndividualExposureColumnVisible?: boolean;
}>(), {
  fontSizes: () => [],
  fontSizeLabels: () => [],
  chartWidths: () => [],
  barColors: () => [],
  formattedExposureDateTime: '',
  isIndividualExposureColumnVisible: false
});

defineEmits<{
  (e: 'update:selectedInterval', value: number): void;
  (e: 'update:chartFontSize', value: number): void;
  (e: 'update:chartWidth', value: number): void;
  (e: 'update:barColor', value: string): void;
  (e: 'update:displayMode', value: string): void;
  (e: 'resetSettings'): void;
  (e: 'showExposureDateTimePicker', event: MouseEvent): void;
}>();

const { activeTooltip, tooltipText, showTooltip, hideTooltip } = useTooltip();
</script>
