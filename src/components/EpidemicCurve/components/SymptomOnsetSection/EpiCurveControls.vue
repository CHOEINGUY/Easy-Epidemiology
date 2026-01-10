<template>
  <EpidemicChartControls
    intervalLabel="증상발현 시간간격 :"
    intervalId="symptom-interval"
    intervalTooltipText="증상 발현 시간 간격을 변경합니다"
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

    :displayModeOptions="displayModeOptions"
    
    :fontSizes="fontSizes"
    :fontSizeLabels="fontSizeLabels"
    :chartWidths="chartWidths"
    :barColors="barColors"
    
    @resetSettings="$emit('resetSettings')"
  >
    <!-- Append Slot: Confirmed Case Toggle -->
    <template #append>
      <div v-if="showConfirmedCaseToggle" class="flex items-center gap-2">
        <label class="text-xs font-semibold text-slate-500 uppercase tracking-wider">확진자 꺾은선:</label>
        <div class="relative group">
          <BaseButton 
            @click="$emit('toggleConfirmedCaseLine')" 
            :variant="showConfirmedCaseLine ? 'primary' : 'secondary'"
            size="sm"
            @mouseenter="showTooltip('confirmedCaseLine', '확진자 꺾은선 표시/숨김')" 
            @mouseleave="hideTooltip"
          >
            {{ showConfirmedCaseLine ? '표시' : '숨김' }}
          </BaseButton>
          <!-- Tooltip -->
          <div v-if="activeTooltip === 'confirmedCaseLine'" class="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-3 py-2 rounded shadow-lg text-xs whitespace-nowrap z-50">
            {{ tooltipText }}
            <div class="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-slate-800"></div>
          </div>
        </div>
      </div>
    </template>
  </EpidemicChartControls>
</template>

<script setup lang="ts">
import EpidemicChartControls from '../EpidemicChartControls.vue';
import BaseButton from '../../../Common/BaseButton.vue';
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
  showConfirmedCaseToggle?: boolean;
  showConfirmedCaseLine?: boolean;
}>(), {
  fontSizes: () => [],
  fontSizeLabels: () => [],
  chartWidths: () => [],
  barColors: () => [],
  showConfirmedCaseToggle: false,
  showConfirmedCaseLine: true
});

defineEmits<{
  (e: 'update:selectedInterval', value: number): void;
  (e: 'update:chartFontSize', value: number): void;
  (e: 'update:chartWidth', value: number): void;
  (e: 'update:barColor', value: string): void;
  (e: 'update:displayMode', value: string): void;
  (e: 'toggleConfirmedCaseLine'): void;
  (e: 'resetSettings'): void;
}>();

const { activeTooltip, tooltipText, showTooltip, hideTooltip } = useTooltip();

const displayModeOptions = [
  { value: 'time', label: '시 단위', tooltip: '간단한 시 단위 표시' },
  { value: 'datetime', label: '날짜+시간', tooltip: '정확한 날짜와 시간 표시' }
];
</script>
