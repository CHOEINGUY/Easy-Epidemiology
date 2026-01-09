<template>
  <div v-if="isOpen" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
    <!-- Backdrop with clear blur -->
    <div 
      class="absolute inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity duration-300"
      @click="$emit('close')"
    ></div>

    <!-- Modal Content (Clean & Sharp Style) -->
    <div class="relative w-full max-w-[1000px] bg-white border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] font-premium transform transition-all duration-300 rounded-lg">
      
      <!-- Header -->
      <div class="flex items-center justify-between px-8 py-6 border-b border-slate-100 bg-white sticky top-0 z-10">
        <div class="flex items-center gap-4">
          <div class="w-10 h-10 bg-blue-600 text-white flex items-center justify-center shadow-md rounded-sm">
             <span class="material-icons text-xl">groups</span>
          </div>
          <div>
            <h3 class="text-2xl font-bold text-slate-900 tracking-tight">코호트 연구 통계 가이드</h3>
            <p class="text-sm text-slate-500 font-medium mt-0.5">상대위험비(RR)와 발병률 분석 이해하기</p>
          </div>
        </div>
        
        <button 
          @click="$emit('close')"
          class="w-8 h-8 flex items-center justify-center hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all duration-200 rounded-sm"
        >
          <span class="material-icons">close</span>
        </button>
      </div>

      <!-- Scrollable Content -->
      <div class="overflow-y-auto px-10 py-10 space-y-10 custom-scrollbar bg-white">
        
        <!-- 1. 2x2 Table Visual -->
        <section>
          <div class="flex items-start gap-4 mb-6">
            <div class="w-8 h-8 bg-slate-900 text-white flex items-center justify-center text-sm font-bold shrink-0 rounded-sm">1</div>
            <div>
              <h4 class="text-xl font-bold text-slate-900 mb-2">2x2 분할표 (Contingency Table)</h4>
              <p class="text-slate-500 text-body leading-relaxed">
                코호트 연구는 위험요인 노출 여부에 따른 질병 발생률을 직접 비교하는 연구입니다.
                각 집단의 발병률(Incidence)을 계산하여 비교합니다.
              </p>
            </div>
          </div>
          
          <div class="grid grid-cols-[120px_1fr_1fr_110px] gap-px bg-slate-200 border border-slate-200 overflow-hidden text-center text-sm shadow-sm rounded-sm">
            <!-- Header Row -->
            <div class="bg-slate-50 p-4 font-bold text-slate-700 flex items-center justify-center uppercase tracking-wider text-xs">구분</div>
            <div class="bg-blue-50/50 p-4 font-bold text-blue-900">환자 (Case)</div>
            <div class="bg-emerald-50/50 p-4 font-bold text-emerald-900">비환자 (Non-Case)</div>
            <div class="bg-slate-50 p-4 font-bold text-slate-700">합계</div>

            <!-- Exposed Row -->
            <div class="bg-white p-4 font-bold text-slate-700 flex flex-col justify-center">
              <span class="text-base">노출군</span>
              <span class="text-xs text-slate-400 font-normal mt-1">Exposed</span>
            </div>
            <div class="bg-white p-6 relative group font-math hover:bg-blue-50 transition-colors">
              <span class="text-3xl font-bold text-slate-800">a</span>
              <span class="absolute text-[10px] text-slate-400 bottom-2 right-3 font-premium uppercase tracking-wide not-italic">노출+발병</span>
            </div>
            <div class="bg-white p-6 relative group font-math hover:bg-emerald-50 transition-colors">
              <span class="text-3xl font-bold text-slate-800">b</span>
              <span class="absolute text-[10px] text-slate-400 bottom-2 right-3 font-premium uppercase tracking-wide not-italic">노출+미발병</span>
            </div>
            <div class="bg-slate-50 p-6 text-slate-500 font-medium font-math flex items-center justify-center text-lg italic whitespace-nowrap">a + b</div>

            <!-- Unexposed Row -->
            <div class="bg-white p-4 font-bold text-slate-700 flex flex-col justify-center">
              <span class="text-base">비노출군</span>
              <span class="text-xs text-slate-400 font-normal mt-1">Unexposed</span>
            </div>
            <div class="bg-white p-6 relative group font-math hover:bg-blue-50 transition-colors">
              <span class="text-3xl font-bold text-slate-800">c</span>
              <span class="absolute text-[10px] text-slate-400 bottom-2 right-3 font-premium uppercase tracking-wide not-italic">비노출+발병</span>
            </div>
            <div class="bg-white p-6 relative group font-math hover:bg-emerald-50 transition-colors">
              <span class="text-3xl font-bold text-slate-800">d</span>
              <span class="absolute text-[10px] text-slate-400 bottom-2 right-3 font-premium uppercase tracking-wide not-italic">비노출+미발병</span>
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
          <!-- 2. Relative Risk -->
          <section>
            <div class="flex items-center gap-3 mb-4 border-b border-slate-100 pb-2">
              <span class="text-indigo-600 font-bold text-lg">02</span>
              <h4 class="text-lg font-bold text-slate-900 tracking-tight">상대위험비 (Relative Risk, RR)</h4>
            </div>
            
            <div class="bg-slate-50 p-4 border border-slate-200 mb-6 font-math text-center text-slate-800 text-lg rounded-sm leading-loose">
              <div class="mb-2">
                <span class="not-italic font-bold text-slate-600 font-premium text-xs uppercase tracking-wide">Incidence</span> 
                (<span class="italic">I<sub>e</sub></span>) = <span class="text-blue-700">a</span> / (<span class="text-blue-700">a</span> + <span class="text-emerald-700">b</span>)
              </div>
              <div>
                <span class="not-italic font-bold text-slate-600 font-premium text-xs uppercase tracking-wide">RR Formula</span> : 
                <span class="text-xl">RR = <span class="italic">I<sub>e</sub></span> / <span class="italic">I<sub>u</sub></span></span>
              </div>
            </div>
            
            <ul class="space-y-6 text-sm text-slate-600">
              <li class="flex flex-col gap-2">
                <span class="font-bold text-slate-900 text-xs uppercase tracking-wider text-opacity-80">정의</span>
                <span class="leading-relaxed text-slate-700">위험요인 노출군에서의 발병률이 비노출군에 비해 몇 배나 높은지를 나타내는 지표입니다.</span>
              </li>
              <li class="flex flex-col gap-2">
                <span class="font-bold text-slate-900 text-xs uppercase tracking-wider text-opacity-80">결과 해석</span>
                <div class="space-y-0 text-sm border-l-2 border-slate-200 pl-4">
                  <div class="py-2 flex items-center gap-3 border-b border-slate-50"><span class="font-bold text-slate-800 w-16">RR > 1</span> <span class="text-slate-600">요인 노출 시 발병 위험 <span class="text-red-600 font-semibold underline decoration-red-200 decoration-2 underline-offset-2">증가 (위험요인)</span></span></div>
                  <div class="py-2 flex items-center gap-3 border-b border-slate-50"><span class="font-bold text-slate-800 w-16">RR < 1</span> <span class="text-slate-600">요인 노출 시 발병 위험 <span class="text-emerald-600 font-semibold underline decoration-emerald-200 decoration-2 underline-offset-2">감소 (방어요인)</span></span></div>
                  <div class="py-2 flex items-center gap-3"><span class="font-bold text-slate-800 w-16">RR = 1</span> <span class="text-slate-500">발병 위험의 차이가 없음</span></div>
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
                계산된 상대위험비(RR)가 우연에 의해 관찰되었을 확률입니다. 통상적으로 <span class="font-bold text-slate-900 border-b-2 border-yellow-300">0.05 (5%)</span> 미만일 때 통계적으로 유의하다고 판단합니다.
              </p>
              
              <div class="bg-white p-0 text-sm mt-4">
                <p class="font-bold text-slate-900 mb-3 text-xs uppercase tracking-wider text-opacity-80">검정 방법 선택 기준</p>
                <div class="space-y-4">
                  <div class="flex items-start gap-4 group">
                    <div class="w-1 h-1 bg-slate-300 rounded-full mt-2 group-hover:bg-blue-500 transition-colors"></div>
                    <div>
                      <span class="font-bold text-slate-800 block mb-0.5">카이제곱 검정 (Chi-square)</span>
                      <span class="text-xs text-slate-400">두 집단의 발병률 차이를 검정</span>
                    </div>
                  </div>
                  <div class="flex items-start gap-4 group">
                    <div class="w-1 h-1 bg-slate-300 rounded-full mt-2 group-hover:bg-blue-500 transition-colors"></div>
                    <div>
                      <span class="font-bold text-slate-800 block mb-0.5">피셔의 정확 검정 (Fisher's Exact)</span>
                      <span class="text-xs text-slate-400">빈도가 5 미만인 경우 사용</span>
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
                상대위험비의 참값이 존재할 것으로 확신하는 95% 범위입니다. 
                신뢰구간이 <span class="font-bold text-slate-900 border-b-2 border-slate-200">1을 포함하는지 여부</span>가 중요합니다.
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
      <div class="p-6 bg-white border-t border-slate-100 flex justify-end gap-3 sticky bottom-0 z-10">
        <button 
          @click="$emit('close')"
          class="px-10 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold shadow-lg shadow-slate-200 transition-all hover:shadow-xl active:scale-95 rounded-sm"
        >
          확인
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  isOpen: boolean;
}>();

defineEmits<{
  (e: 'close'): void;
}>();
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: #cbd5e1;
  border-radius: 3px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background-color: #94a3b8;
}

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
