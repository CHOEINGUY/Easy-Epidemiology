<template>
  <div class="flex flex-wrap gap-4 items-center justify-end">
    <div class="flex items-baseline bg-white px-4 py-2 rounded-xl shadow border border-slate-100">
      <span class="text-xs text-slate-500 font-medium mr-2">조사 대상자 수</span>
      <span class="text-2xl font-bold text-slate-800 tracking-tight">{{ totalParticipants }}</span>
      <span class="text-xs text-slate-500 ml-1">명</span>
    </div>
    <div class="flex items-baseline bg-white px-4 py-2 rounded-xl shadow border border-slate-100">
      <span class="text-xs text-slate-500 font-medium mr-2">총 환자 수</span>
      <span class="text-2xl font-bold text-slate-800 tracking-tight">{{ totalPatients }}</span>
      <span class="text-xs text-slate-500 ml-1">명</span>
    </div>
    <div class="relative group">
      <div 
        class="flex items-baseline bg-white px-4 py-2 rounded-xl shadow border border-slate-100 cursor-help"
        @mouseenter="showTooltip('attackRate', '발병률 = (환자여부에 1을 입력한 사람 수 ÷ 전체 조사 대상자 수) × 100')"
        @mouseleave="hideTooltip"
      >
        <span class="text-xs text-slate-500 font-medium mr-2">발병률</span>
        <span class="text-2xl font-bold text-slate-800 tracking-tight">{{ attackRate }}</span>
        <span class="text-xs text-slate-500 ml-1">%</span>
      </div>
      <transition enter-active-class="transition ease-out duration-200" enter-from-class="opacity-0 translate-y-1" enter-to-class="opacity-100 translate-y-0" leave-active-class="transition ease-in duration-150" leave-from-class="opacity-100 translate-y-0" leave-to-class="opacity-0 translate-y-1">
        <div v-if="activeTooltip === 'attackRate'" class="absolute bottom-full mb-2 right-0 bg-slate-800 text-white px-3 py-2 rounded shadow-lg text-xs whitespace-nowrap z-50">
          {{ tooltipText }}
          <div class="absolute top-full right-4 border-4 border-transparent border-t-slate-800"></div>
        </div>
      </transition>
    </div>
    <!-- 확진율 (확진율 모드가 켜져 있을 때만 표시) -->
    <div v-if="isConfirmedCaseColumnVisible" class="relative group">
      <div 
        class="flex items-baseline bg-white px-4 py-2 rounded-xl shadow border border-slate-100 cursor-help"
        @mouseenter="showTooltip('confirmedRate', '확진율 = (확진여부에 1을 입력한 사람 수 ÷ 전체 조사 대상자 수) × 100')"
        @mouseleave="hideTooltip"
      >
        <span class="text-xs text-slate-500 font-medium mr-2">확진율</span>
        <span class="text-2xl font-bold text-slate-800 tracking-tight">{{ confirmedRate }}</span>
        <span class="text-xs text-slate-500 ml-1">%</span>
      </div>
      <transition enter-active-class="transition ease-out duration-200" enter-from-class="opacity-0 translate-y-1" enter-to-class="opacity-100 translate-y-0" leave-active-class="transition ease-in duration-150" leave-from-class="opacity-100 translate-y-0" leave-to-class="opacity-0 translate-y-1">
        <div v-if="activeTooltip === 'confirmedRate'" class="absolute bottom-full mb-2 right-0 bg-slate-800 text-white px-3 py-2 rounded shadow-lg text-xs whitespace-nowrap z-50">
          {{ tooltipText }}
          <div class="absolute top-full right-4 border-4 border-transparent border-t-slate-800"></div>
        </div>
      </transition>
    </div>
  </div>
</template>

<script setup>
// ParticipantSummary.vue - 대상자 요약 정보 컴포넌트
import { useTooltip } from '../composables/useTooltip';

defineProps({
  totalParticipants: {
    type: Number,
    required: true
  },
  totalPatients: {
    type: Number,
    required: true
  },
  attackRate: {
    type: String,
    required: true
  },
  confirmedRate: {
    type: String,
    required: true
  },
  isConfirmedCaseColumnVisible: {
    type: Boolean,
    default: false
  }
});

const { activeTooltip, tooltipText, showTooltip, hideTooltip } = useTooltip();
</script>
