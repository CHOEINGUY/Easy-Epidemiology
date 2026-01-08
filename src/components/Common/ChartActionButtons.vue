<template>
  <div class="flex justify-end gap-2 mb-2 w-full">
    <!-- Save Report Button -->
    <div class="relative">
      <button
        @click="$emit('saveReport')"
        :class="[
          'flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-sm font-medium transition-all shadow-sm',
          isSaved 
            ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100' 
            : 'bg-white border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50'
        ]"
        @mouseenter="showTooltip('saveReport')"
        @mouseleave="hideTooltip"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
          <polyline points="17 21 17 13 7 13 7 21"></polyline>
          <polyline points="7 3 7 8 15 8"></polyline>
        </svg>
        <span class="font-['Noto_Sans_KR'] font-normal">{{ isSaved ? '저장 완료' : '보고서 저장' }}</span>
      </button>

      <!-- Control Tooltip (Below to avoid clipping) -->
      <transition enter-active-class="transition duration-200 ease-out" enter-from-class="opacity-0 translate-y-[-4px]" enter-to-class="opacity-100 translate-y-0" leave-active-class="transition duration-150 ease-in" leave-from-class="opacity-100 translate-y-0" leave-to-class="opacity-0 translate-y-[-4px]">
        <div 
          v-if="activeTooltip === 'saveReport'" 
          class="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-3 py-2 rounded shadow-lg text-xs whitespace-nowrap z-[100]"
        >
          보고서 작성용으로 차트를 저장합니다
          <div class="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-slate-800"></div>
        </div>
      </transition>

      <!-- Feedback Tooltip (Below - Checkmark) -->
      <transition enter-active-class="transition ease-out duration-300 transform" enter-from-class="opacity-0 translate-y-2 scale-90" enter-to-class="opacity-100 translate-y-0 scale-100" leave-active-class="transition ease-in duration-200 transform" leave-from-class="opacity-100 translate-y-0 scale-100" leave-to-class="opacity-0 translate-y-2 scale-90">
        <div v-if="showSavedFeedback" class="absolute left-1/2 top-[115%] -translate-x-1/2 z-[100] pointer-events-none flex items-center justify-center w-8 h-8 rounded-full shadow-lg bg-white border border-slate-100">
          <svg width="20" height="20" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="12" fill="#1a73e8"/>
            <polyline points="7,13 11,17 17,9" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
      </transition>
    </div>

    <!-- Copy Chart Button -->
    <div class="relative">
      <button 
        @click="$emit('copyChart')" 
        class="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 transition-all shadow-sm"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
        <span class="font-['Noto_Sans_KR'] font-normal">차트 복사</span>
      </button>

      <!-- Feedback Tooltip (Below - Checkmark) -->
      <transition enter-active-class="transition ease-out duration-300 transform" enter-from-class="opacity-0 translate-y-2 scale-90" enter-to-class="opacity-100 translate-y-0 scale-100" leave-active-class="transition ease-in duration-200 transform" leave-from-class="opacity-100 translate-y-0 scale-100" leave-to-class="opacity-0 translate-y-2 scale-90">
        <div v-if="isCopied" class="absolute left-1/2 top-[115%] -translate-x-1/2 z-[100] pointer-events-none flex items-center justify-center w-8 h-8 rounded-full shadow-lg bg-white border border-slate-100">
          <svg width="20" height="20" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="12" fill="#1a73e8"/>
            <polyline points="7,13 11,17 17,9" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
      </transition>
    </div>

    <!-- Export Chart Button -->
    <div class="relative">
      <button 
        @click="$emit('exportChart')" 
        class="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 transition-all shadow-sm"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="7 10 12 15 17 10"></polyline>
          <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>
        <span class="font-['Noto_Sans_KR'] font-normal">차트 저장</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

defineProps({
  isSaved: { type: Boolean, default: false },
  showSavedFeedback: { type: Boolean, default: false },
  isCopied: { type: Boolean, default: false }
});

defineEmits(['saveReport', 'copyChart', 'exportChart']);

const activeTooltip = ref(null);

const showTooltip = (id) => {
  activeTooltip.value = id;
};

const hideTooltip = () => {
  activeTooltip.value = null;
};
</script>
