<template>
  <div class="bg-white rounded-3xl p-10 shadow-sm border border-slate-200">
    <h2 class="text-3xl font-extrabold text-slate-900 mb-8 pb-4 border-b border-slate-200">7. 코호트 연구</h2>
    <div class="prose prose-slate max-w-none">
      <p class="text-slate-600 leading-relaxed mb-6">
         노출군(섭취자)과 비노출군(비섭취자)의 발병률을 직접 비하여 <strong>상대위험도(Relative Risk, RR)</strong>를 산출합니다.
      </p>

      <h5 class="flex items-center gap-2 text-xl font-bold text-slate-800 mt-12 mb-4">
        <span class="w-1.5 h-6 bg-blue-500 rounded-full"></span>
        7.1. 언제 사용하나요?
      </h5>
      <p class="text-slate-600 leading-relaxed mb-4">
        학교 급식, 수련회 등 <strong>전체 대상자의 명단과 섭취 여부</strong>가 확실하게 파악된 경우에 사용합니다.
      </p>

      <h5 class="flex items-center gap-2 text-xl font-bold text-slate-800 mt-12 mb-4">
        <span class="w-1.5 h-6 bg-blue-500 rounded-full"></span>
        7.2. 결과 해석
      </h5>
      <ul class="list-disc pl-6 space-y-2 mb-6 text-slate-600">
        <li><strong>RR > 1:</strong> 해당 식품 섭취 시 발병 위험이 높음 (예: RR=2.5는 섭취 시 발병률이 2.5배)</li>
        <li><strong>RR = 1:</strong> 연관성 없음</li>
        <li><strong>RR < 1:</strong> 예방 효과 (혹은 역상관 관계)</li>
      </ul>
    </div>
  </div>
</template>
