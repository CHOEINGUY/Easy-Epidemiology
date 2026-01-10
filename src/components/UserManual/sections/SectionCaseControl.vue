<template>
  <div class="bg-white rounded-3xl p-10 shadow-sm border border-slate-200">
    <h2 class="text-3xl font-extrabold text-slate-900 mb-8 pb-4 border-b border-slate-200">6. 환자대조군 연구</h2>
    <div class="prose prose-slate max-w-none">
      <p class="text-slate-600 leading-relaxed mb-6">
        환자군과 대조군의 노출력 비교를 통해 위험 요인을 규명합니다. 주로 식중독 조사 등에서 병원체가 불명확할 때 유용합니다.
      </p>

      <h5 class="flex items-center gap-2 text-xl font-bold text-slate-800 mt-12 mb-4">
        <span class="w-1.5 h-6 bg-blue-500 rounded-full"></span>
        6.1. 핵심 지표
      </h5>
      <ul class="list-disc pl-6 space-y-2 mb-6 text-slate-600">
        <li><strong>오즈비 (Odds Ratio, OR):</strong> 환자군이 대조군보다 해당 식품을 먹었을 확률의 비입니다. (예: OR이 3이면, 해당 식품을 먹은 사람이 안 먹은 사람보다 발병 위험이 약 3배 높았을 가능성을 시사)</li>
        <li><strong>95% 신뢰구간 (CI):</strong> 1을 포함하지 않아야 통계적으로 유의</li>
        <li><strong>P-value:</strong> 0.05 미만일 경우 유의한 차이로 인정</li>
      </ul>

      <h5 class="flex items-center gap-2 text-xl font-bold text-slate-800 mt-12 mb-4">
        <span class="w-1.5 h-6 bg-blue-500 rounded-full"></span>
        6.2. 통계 검정 방법
      </h5>
      <p class="text-slate-600 leading-relaxed mb-4">
        기대 빈도에 따라 <strong>카이제곱 검정</strong> 또는 <strong>Fisher의 정확 검정</strong>이 자동으로 적용됩니다.
      </p>

      <div class="bg-amber-50 border border-amber-200 rounded-2xl p-6 relative my-8">
        <span class="material-icons-round absolute left-6 top-6 text-2xl text-amber-500">warning</span>
        <div class="ml-10">
          <h4 class="text-amber-900 text-lg font-bold mb-2">해석 팁</h4>
          <p class="text-amber-800/90 leading-relaxed">
            일반적으로 <strong>P-value < 0.05</strong>이면서 <strong>OR이 가장 높은</strong> 식품을 유력한 원인으로 추정합니다.
            <br>테이블 헤더의 <strong>[P-value]</strong>를 클릭하여 오름차순으로 정렬하면, 통계적으로 유의한 항목을 쉽게 찾을 수 있습니다.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
