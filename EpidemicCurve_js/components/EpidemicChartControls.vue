<template>
  <div class="flex flex-wrap items-center gap-4 p-4 bg-slate-50/80 rounded-xl border border-slate-200 shadow-sm backdrop-blur-sm w-full mb-[18px]">
    
    <!-- Custom Prepend Slot (e.g. Exposure Time) -->
    <slot name="prepend"></slot>

    <!-- Interval Select -->
    <div class="flex items-center gap-2">
      <label :for="intervalId" class="text-xs font-semibold text-slate-500 uppercase tracking-wider">{{ intervalLabel }}</label>
      <div class="relative group">
        <select
          :id="intervalId"
          :value="selectedInterval"
          @change="$emit('update:selectedInterval', Number($event.target.value))"
          class="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 shadow-sm hover:border-blue-400 hover:text-blue-600 transition-colors outline-none focus:ring-2 focus:ring-blue-100"
          @mouseenter="showTooltip('interval', intervalTooltipText)"
          @mouseleave="hideTooltip"
        >
          <option v-for="option in intervalOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
        <!-- Tooltip -->
        <transition enter-active-class="transition duration-200 ease-out" enter-from-class="opacity-0 translate-y-[-4px]" enter-to-class="opacity-100 translate-y-0" leave-active-class="transition duration-150 ease-in" leave-from-class="opacity-100 translate-y-0" leave-to-class="opacity-0 translate-y-[-4px]">
          <div v-if="activeTooltip === 'interval'" class="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-3 py-2 rounded shadow-lg text-xs whitespace-nowrap z-50">
            {{ intervalTooltipText }}
            <div class="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-slate-800"></div>
          </div>
        </transition>
      </div>
    </div>

    <!-- Font Size -->
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

    <!-- Chart Width -->
    <ControlCycleText
      label="차트 너비:"
      :modelValue="chartWidth"
      @update:modelValue="$emit('update:chartWidth', $event)"
      :options="chartWidths"
      tooltipPrefix="차트 너비를"
      suffix="px"
      tooltipSuffix="로 변경합니다"
      minWidthClass="min-w-[70px]"
    />

    <!-- Bar Color -->
    <ControlCycleColor
      label="색상:"
      :modelValue="barColor"
      @update:modelValue="$emit('update:barColor', $event)"
      :options="barColors"
    />

    <!-- Display Mode -->
    <ControlGroup
      label="차트 표시:"
      :modelValue="displayMode"
      @update:modelValue="$emit('update:displayMode', $event)"
      :options="displayModeOptions"
    />

    <!-- Custom Append Slot (e.g. Confirmed Lines toggle) -->
    <slot name="append"></slot>

    <!-- Reset Button -->
    <div class="ml-auto flex items-center">
      <div class="relative group">
        <button 
          @click="$emit('resetSettings')" 
          class="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-500 hover:text-slate-800 hover:border-slate-400 transition-colors shadow-sm" 
          @mouseenter="showTooltip('reset', '차트 설정을 기본값으로 초기화합니다')" 
          @mouseleave="hideTooltip"
        >
          초기화
        </button>
        <transition enter-active-class="transition duration-200 ease-out" enter-from-class="opacity-0 translate-y-[-4px]" enter-to-class="opacity-100 translate-y-0" leave-active-class="transition duration-150 ease-in" leave-from-class="opacity-100 translate-y-0" leave-to-class="opacity-0 translate-y-[-4px]">
          <div v-if="activeTooltip === 'reset'" class="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-3 py-2 rounded shadow-lg text-xs whitespace-nowrap z-50 right-0 left-auto translate-x-0 origin-top-right">
            차트 설정을 기본값으로 초기화합니다
            <div class="absolute bottom-full right-3 border-4 border-transparent border-b-slate-800"></div>
          </div>
        </transition>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useTooltip } from '../composables/useTooltip';
import ControlCycleText from './controls/ControlCycleText.vue';
import ControlCycleColor from './controls/ControlCycleColor.vue';
import ControlGroup from './controls/ControlGroup.vue';

defineProps({
  intervalLabel: { type: String, default: '시간 간격 :' },
  intervalId: { type: String, default: 'interval-select' },
  intervalTooltipText: { type: String, default: '시간 간격을 변경합니다' },
  selectedInterval: { type: Number, required: true },
  intervalOptions: { type: Array, default: () => [
    { value: 3, label: '3시간' }, { value: 6, label: '6시간' }, 
    { value: 12, label: '12시간' }, { value: 24, label: '24시간' }, { value: 48, label: '48시간' }
  ]},
  
  // Refactored Props
  chartFontSize: { type: Number, default: 16 },
  chartWidth: { type: Number, default: 700 },
  barColor: { type: String, default: '#5470c6' },
  displayMode: { type: String, default: 'time' },
  
  // Options Arrays
  fontSizes: { type: Array, default: () => [] },
  fontSizeLabels: { type: Array, default: () => [] },
  chartWidths: { type: Array, default: () => [] },
  barColors: { type: Array, default: () => [] },
  displayModeOptions: { type: Array, default: () => [] }
});

defineEmits([
  'update:selectedInterval',
  'update:chartFontSize',
  'update:chartWidth',
  'update:barColor',
  'update:displayMode',
  'resetSettings'
]);

const { activeTooltip, showTooltip, hideTooltip } = useTooltip();
</script>
