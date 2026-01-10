<template>
  <BaseModal
    :modelValue="isOpen"
    title="통계 분석 가이드"
    subtitle="환자-대조군 연구의 핵심 통계 지표 이해하기"
    icon="school"
    size="xl"
    @update:modelValue="(val) => !val && $emit('close')"
    @close="$emit('close')"
  >
    <!-- Scrollable Content -->
    <div class="space-y-10 custom-scrollbar">
      
      <!-- 1. 2x2 Table Visual -->
      <section>
        <div class="flex items-start gap-4 mb-6">
          <div class="w-8 h-8 bg-slate-900 text-white flex items-center justify-center text-sm font-bold shrink-0 rounded-sm">1</div>
          <div>
            <h4 class="text-xl font-bold text-slate-900 mb-2">2x2 분할표 (Contingency Table)</h4>
            <p class="text-slate-500 text-body leading-relaxed">
              환자-대조군 연구는 특정 요인에 노출된 집단과 비노출된 집단 간의 질병 발생 여부를 비교하는 연구입니다.
              데이터는 아래와 같은 2x2 표로 정리되어 분석됩니다.
            </p>
          </div>
        </div>
        
        <div class="grid grid-cols-[120px_1fr_1fr_110px] gap-px bg-slate-200 border border-slate-200 overflow-hidden text-center text-sm shadow-sm rounded-sm">
          <!-- Header Row -->
          <div class="bg-slate-50 p-4 font-bold text-slate-700 flex items-center justify-center uppercase tracking-wider text-xs">구분</div>
          <div class="bg-blue-50/50 p-4 font-bold text-blue-900">환자군 (Case)</div>
          <div class="bg-emerald-50/50 p-4 font-bold text-emerald-900">대조군 (Control)</div>
          <div class="bg-slate-50 p-4 font-bold text-slate-700">합계</div>

          <!-- Exposed Row -->
          <div class="bg-white p-4 font-bold text-slate-700 flex flex-col justify-center">
            <span class="text-base">노출 (Yes)</span>
            <span class="text-xs text-slate-400 font-normal mt-1">위험요인 O</span>
          </div>
          <div class="bg-white p-6 relative group font-math hover:bg-blue-50 transition-colors">
            <span class="text-3xl font-bold text-slate-800">a</span>
            <span class="absolute text-[10px] text-slate-400 bottom-2 right-3 font-premium uppercase tracking-wide not-italic">환자+노출</span>
          </div>
          <div class="bg-white p-6 relative group font-math hover:bg-emerald-50 transition-colors">
            <span class="text-3xl font-bold text-slate-800">b</span>
            <span class="absolute text-[10px] text-slate-400 bottom-2 right-3 font-premium uppercase tracking-wide not-italic">대조+노출</span>
          </div>
          <div class="bg-slate-50 p-6 text-slate-500 font-medium font-math flex items-center justify-center text-lg italic whitespace-nowrap">a + b</div>

          <!-- Unexposed Row -->
          <div class="bg-white p-4 font-bold text-slate-700 flex flex-col justify-center">
            <span class="text-base">비노출 (No)</span>
            <span class="text-xs text-slate-400 font-normal mt-1">위험요인 X</span>
          </div>
          <div class="bg-white p-6 relative group font-math hover:bg-blue-50 transition-colors">
            <span class="text-3xl font-bold text-slate-800">c</span>
            <span class="absolute text-[10px] text-slate-400 bottom-2 right-3 font-premium uppercase tracking-wide not-italic">환자+비노출</span>
          </div>
          <div class="bg-white p-6 relative group font-math hover:bg-emerald-50 transition-colors">
            <span class="text-3xl font-bold text-slate-800">d</span>
            <span class="absolute text-[10px] text-slate-400 bottom-2 right-3 font-premium uppercase tracking-wide not-italic">대조+비노출</span>
          </div>
          <div class="bg-slate-50 p-6 text-slate-500 font-medium font-math flex items-center justify-center text-lg italic whitespace-nowrap">c + d</div>

          <!-- Total Row -->
          <div class="bg-slate-50 p-4 font-bold text-slate-700">합계</div>
          <div class="bg-slate-50 p-4 text-slate-500 font-medium font-math text-lg italic">a + c</div>
          <div class="bg-slate-50 p-4 text-slate-500 font-medium font-math text-lg italic">b + d</div>
          <div class="bg-slate-50 p-4 text-slate-700 font-bold font-math text-lg italic">N</div>
        </div>
      </section>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-12">
        <!-- 2. Odds Ratio -->
        <section>
          <div class="flex items-center gap-3 mb-4 border-b border-slate-100 pb-2">
            <span class="text-indigo-600 font-bold text-lg">02</span>
            <h4 class="text-lg font-bold text-slate-900 tracking-tight">교차비 (Odds Ratio)</h4>
          </div>
          
          <div class="bg-slate-50 p-4 border border-slate-200 mb-6 font-math text-center text-slate-800 text-xl rounded-sm">
            <span class="not-italic font-bold text-slate-600 pr-2 font-premium text-sm">Formula:</span> 
            OR = ( <span class="text-blue-700">a</span> × <span class="text-emerald-700">d</span> ) / ( <span class="text-emerald-700">b</span> × <span class="text-blue-700">c</span> )
          </div>
          
          <ul class="space-y-6 text-sm text-slate-600">
            <li class="flex flex-col gap-2">
              <span class="font-bold text-slate-900 text-xs uppercase tracking-wider text-opacity-80">정의</span>
              <span class="leading-relaxed text-slate-700">환자군이 대조군보다 위험요인에 노출되었을 가능성이(Odds) 몇 배 더 높은지 나타내는 지표입니다.</span>
            </li>
            <li class="flex flex-col gap-2">
              <span class="font-bold text-slate-900 text-xs uppercase tracking-wider text-opacity-80">결과 해석</span>
              <div class="space-y-0 text-sm border-l-2 border-slate-200 pl-4">
                <div class="py-2 flex items-center gap-3 border-b border-slate-50"><span class="font-bold text-slate-800 w-16">OR > 1</span> <span class="text-slate-600">질병의 <span class="text-red-600 font-semibold underline decoration-red-200 decoration-2 underline-offset-2">위험 요인</span></span></div>
                <div class="py-2 flex items-center gap-3 border-b border-slate-50"><span class="font-bold text-slate-800 w-16">OR < 1</span> <span class="text-slate-600">질병의 <span class="text-emerald-600 font-semibold underline decoration-emerald-200 decoration-2 underline-offset-2">방어 요인</span></span></div>
                <div class="py-2 flex items-center gap-3"><span class="font-bold text-slate-800 w-16">OR = 1</span> <span class="text-slate-500">연관성 없음</span></div>
              </div>
            </li>
          </ul>
        </section>

        <!-- 3. P-value -->
        <section>
          <div class="flex items-center gap-3 mb-4 border-b border-slate-100 pb-2">
            <span class="text-pink-600 font-bold text-lg">03</span>
            <h4 class="text-lg font-bold text-slate-900 tracking-tight">유의확률 (P-value)</h4>
          </div>
          
          <div class="space-y-6 text-sm text-slate-600 h-full">
            <p class="leading-relaxed text-slate-700">
              구해진 교차비(OR)가 우연히 나왔을 확률을 의미합니다. 통상적으로 <span class="font-bold text-slate-900 border-b-2 border-yellow-300">0.05 (5%)</span> 미만일 때 통계적으로 유의하다고 판단합니다.
            </p>
            
            <div class="bg-white p-0 text-sm mt-4">
              <p class="font-bold text-slate-900 mb-3 text-xs uppercase tracking-wider text-opacity-80">검정 방법 선택 기준</p>
              <div class="space-y-4">
                <div class="flex items-start gap-4 group">
                  <div class="w-1 h-1 bg-slate-300 rounded-full mt-2 group-hover:bg-blue-500 transition-colors"></div>
                  <div>
                    <span class="font-bold text-slate-800 block mb-0.5">카이제곱 검정 (Chi-square)</span>
                    <span class="text-xs text-slate-400">관측 빈도가 충분할 때 사용</span>
                  </div>
                </div>
                <div class="flex items-start gap-4 group">
                  <div class="w-1 h-1 bg-slate-300 rounded-full mt-2 group-hover:bg-blue-500 transition-colors"></div>
                  <div>
                    <span class="font-bold text-slate-800 block mb-0.5">피셔의 정확 검정 (Fisher's Exact)</span>
                    <span class="text-xs text-slate-400">빈도가 5 미만인 셀이 있을 때 사용</span>
                  </div>
                </div>
                 <div class="flex items-start gap-4 group">
                  <div class="w-1 h-1 bg-slate-300 rounded-full mt-2 group-hover:bg-blue-500 transition-colors"></div>
                  <div>
                    <span class="font-bold text-slate-800 block mb-0.5">Yates' Continuity Correction</span>
                    <span class="text-xs text-slate-400">보정 옵션 활성화 시 적용</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <!-- 4. Confidence Interval -->
      <section>
        <div class="flex items-start gap-4 mb-6">
          <div class="w-8 h-8 bg-slate-900 text-white flex items-center justify-center text-sm font-bold shrink-0 rounded-sm">4</div>
          <div>
            <h4 class="text-xl font-bold text-slate-900 mb-2">95% 신뢰구간 (95% CI)</h4>
            <p class="text-slate-500 text-body leading-relaxed">
              오즈비의 참값이 존재할 것으로 확신하는 범위입니다. 
              신뢰구간이 <span class="font-bold text-slate-900 border-b-2 border-slate-200">1을 포함하는지 여부</span>가 통계적 유의성 판단의 핵심입니다.
            </p>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-0 border border-slate-200 rounded-sm overflow-hidden">
          <div class="bg-slate-50 p-6 flex flex-col items-center text-center border-r border-slate-200 group hover:bg-red-50/10 transition-colors">
            <div class="font-bold text-slate-900 mb-2">통계적 유의성 <span class="text-blue-600">있음</span></div>
            <div class="text-xs text-slate-500 mb-4">구간이 1을 포함하지 않음</div>
            <div class="font-mono-premium text-lg text-slate-800 bg-white border border-slate-200 px-4 py-2 w-full">1.5 ~ 4.2</div>
          </div>
          
          <div class="bg-white p-6 flex flex-col items-center text-center group hover:bg-slate-50 transition-colors">
            <div class="font-bold text-slate-400 mb-2">통계적 유의성 없음</div>
            <div class="text-xs text-slate-400 mb-4">구간이 1을 포함함</div>
            <div class="font-mono-premium text-lg text-slate-400 bg-slate-50 border border-slate-100 px-4 py-2 w-full">0.8 ~ 2.1</div>
          </div>
        </div>
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

.font-mono-premium {
  font-family: "SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace;
  font-variant-numeric: tabular-nums;
}

/* Math Font for Variables */
.font-math {
  font-family: "Times New Roman", Times, serif;
  font-style: italic;
}
</style>
