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
    <!-- Prepend Slot: Exposure Time Input -->
    <template #prepend>
      <div v-if="!isIndividualExposureColumnVisible" class="flex items-center gap-2">
        <label for="exposure-time" class="text-xs font-semibold text-slate-500 uppercase tracking-wider">의심원 노출시간 :</label>
        <div class="relative group">
          <input
            type="text"
            id="exposure-time"
            :value="formattedExposureDateTime"
            @click="$emit('showExposureDateTimePicker', $event)"
            readonly
            class="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 shadow-sm hover:border-blue-400 hover:text-blue-600 transition-colors w-[160px] cursor-pointer outline-none focus:ring-2 focus:ring-blue-100"
            @mouseenter="showTooltip('exposureTime', '기준 의심원 노출일을 설정합니다.')"
            @mouseleave="hideTooltip"
            placeholder="YYYY-MM-DD HH:MM"
          />
          <div v-if="activeTooltip === 'exposureTime'" class="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-3 py-2 rounded shadow-lg text-xs whitespace-nowrap z-50">
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
  
  formattedExposureDateTime: { type: String, default: '' },
  isIndividualExposureColumnVisible: { type: Boolean, default: false }
});

defineEmits([
  'update:selectedInterval',
  'update:chartFontSize',
  'update:chartWidth',
  'update:barColor',
  'update:displayMode',
  'resetSettings',
  'showExposureDateTimePicker'
]);

const { activeTooltip, tooltipText, showTooltip, hideTooltip } = useTooltip();
</script>
