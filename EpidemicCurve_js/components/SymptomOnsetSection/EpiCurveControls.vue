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
    
    :displayModeOptions="[
      { value: 'time', label: '시 단위', tooltip: '간단한 시 단위 표시' },
      { value: 'datetime', label: '날짜+시간', tooltip: '정확한 날짜와 시간 표시' }
    ]"
    
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
          <button 
            @click="$emit('toggleConfirmedCaseLine')" 
            :class="[showConfirmedCaseLine ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700' : 'bg-white text-slate-700 border-slate-200 hover:border-blue-400 hover:text-blue-600']" 
            class="px-3 py-1.5 border rounded-lg text-sm font-medium shadow-sm transition-colors"
            @mouseenter="showTooltip('confirmedCaseLine', '확진자 꺾은선 표시/숨김')" 
            @mouseleave="hideTooltip"
          >
            {{ showConfirmedCaseLine ? '표시' : '숨김' }}
          </button>
          <div v-if="activeTooltip === 'confirmedCaseLine'" class="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-3 py-2 rounded shadow-lg text-xs whitespace-nowrap z-50">
            {{ tooltipText }}
            <div class="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-slate-800"></div>
          </div>
        </div>
      </div>
    </template>
  </EpidemicChartControls>
</template>

<script setup>
import EpidemicChartControls from '../EpidemicChartControls.vue';
import { useTooltip } from '../../composables/useTooltip';

defineProps({
  selectedInterval: { type: Number, required: true },
  chartFontSize: { type: Number, required: true },
  chartWidth: { type: Number, required: true },
  barColor: { type: String, required: true },
  displayMode: { type: String, required: true },
  
  fontSizes: { type: Array, default: () => [] },
  fontSizeLabels: { type: Array, default: () => [] },
  chartWidths: { type: Array, default: () => [] },
  barColors: { type: Array, default: () => [] },
  
  showConfirmedCaseToggle: { type: Boolean, default: false },
  showConfirmedCaseLine: { type: Boolean, default: true }
});

defineEmits([
  'update:selectedInterval',
  'update:chartFontSize',
  'update:chartWidth',
  'update:barColor',
  'update:displayMode',
  'toggleConfirmedCaseLine',
  'resetSettings'
]);

const { activeTooltip, tooltipText, showTooltip, hideTooltip } = useTooltip();
</script>
