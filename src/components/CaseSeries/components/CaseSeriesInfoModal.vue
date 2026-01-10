<template>
  <BaseModal
    :modelValue="isOpen"
    title="사례군 조사 통계 가이드"
    subtitle="환자군 특성 및 폭로율(Exposure Rate) 분석"
    icon="insights"
    size="lg"
    @update:modelValue="(val) => !val && $emit('close')"
    @close="$emit('close')"
  >
    <!-- Scrollable Content -->
    <div class="space-y-10 custom-scrollbar">
      
      <!-- Concept -->
      <section>
        <div class="flex items-start gap-4 mb-6">
          <div class="w-8 h-8 bg-slate-900 text-white flex items-center justify-center text-sm font-bold shrink-0 rounded-sm">1</div>
          <div>
            <h4 class="text-xl font-bold text-slate-900 mb-2">분석 개요 (Overview)</h4>
            <p class="text-slate-500 text-body leading-relaxed">
              사례군 조사는 대조군 없이 <span class="text-indigo-600 font-bold">환자(Case)들만의 특성</span>을 분석하는 기술 역학 연구입니다.
              특정 병원체가 확인된 환자들 중에서 각 위험요인(음식 등)에 노출된 비율을 확인하여, 공통된 노출 요인을 추정합니다.
            </p>
          </div>
        </div>
      </section>

      <!-- Metrics -->
      <section>
        <div class="flex items-center gap-3 mb-4 border-b border-slate-100 pb-2">
          <span class="text-indigo-600 font-bold text-lg">02</span>
          <h4 class="text-lg font-bold text-slate-900 tracking-tight">주요 지표: 폭로율 (Exposure Rate)</h4>
        </div>
        
        <div class="bg-indigo-50 p-6 border border-indigo-100 mb-6 text-center rounded-sm">
           <div class="text-lg text-slate-800 font-medium font-math mb-3">
             Exposure Rate = ( <span class="text-indigo-700 font-bold">Exposed Cases</span> / <span class="text-slate-600 font-bold">Total Cases</span> ) × 100
           </div>
           <p class="text-sm text-indigo-600">환자 중에서 해당 요인에 노출된 사람의 비율</p>
        </div>

        <ul class="space-y-4 text-sm text-slate-600">
           <li class="flex items-start gap-3">
             <span class="material-icons text-indigo-500 text-sm mt-[3px]">check_circle</span>
             <span>
               <strong class="text-slate-900">높은 폭로율의 의미:</strong> 대부분의 환자가 해당 음식을 섭취했다면, 그 음식이 감염원일 가능성이 있음을 시사합니다.
             </span>
           </li>
           <li class="flex items-start gap-3">
             <span class="material-icons text-slate-400 text-sm mt-[3px]">info</span>
             <span>
               <strong class="text-slate-900">해석의 한계:</strong> 대조군(Control)과의 비교가 없으므로, 통계적인 연관성(Odds Ratio, P-value)을 산출할 수 없으며 인과관계를 확증하기 어렵습니다.
             </span>
           </li>
        </ul>
      </section>

    </div>
    
    <!-- Footer -->
    <template #footer>
      <BaseButton
        variant="primary"
        size="lg"
        @click="$emit('close')"
        rounded="sm"
      >
        확인
      </BaseButton>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import BaseModal from '../../Common/BaseModal.vue';
import BaseButton from '../../Common/BaseButton.vue';

defineProps<{
  isOpen: boolean;
}>();

defineEmits<{
  (e: 'close'): void;
}>();
</script>

<style scoped>
/* Premium Font Stacks */
.font-premium {
  font-family: "Pretendard", -apple-system, BlinkMacSystemFont, system-ui, Roboto, "Helvetica Neue", "Segoe UI", "Apple SD Gothic Neo", "Malgun Gothic", "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", sans-serif;
  letter-spacing: -0.01em;
}

/* Math Font for Variables */
.font-math {
  font-family: "Times New Roman", Times, serif;
  font-style: italic;
}
</style>
