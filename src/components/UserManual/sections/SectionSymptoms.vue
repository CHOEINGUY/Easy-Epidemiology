<template>
  <div class="bg-white rounded-3xl p-10 shadow-sm border border-slate-200">
    <h2 class="text-3xl font-extrabold text-slate-900 mb-8 pb-4 border-b border-slate-200">4. 임상 증상 탭</h2>
    <div class="prose prose-slate max-w-none">
      <p class="text-slate-600 leading-relaxed mb-6">
        환자들의 주요 증상 호소율을 분석하여 가장 빈번한 임상적 특징을 파악합니다.
      </p>

      <h5 class="flex items-center gap-2 text-xl font-bold text-slate-800 mt-12 mb-4">
        <span class="w-1.5 h-6 bg-blue-500 rounded-full"></span>
        4.1. 개요
      </h5>
      <p class="text-slate-600 leading-relaxed mb-4">등록된 모든 증상에 대한 빈도와 비율을 자동으로 계산합니다.</p>

      <h5 class="flex items-center gap-2 text-xl font-bold text-slate-800 mt-12 mb-4">
        <span class="w-1.5 h-6 bg-blue-500 rounded-full"></span>
        4.2. 통계표 및 차트
      </h5>
      <ul class="list-disc pl-6 space-y-2 mb-6 text-slate-600">
        <li><strong>통계표:</strong> 각 증상별 환자 수와 백분율(%)을 표로 제공합니다.</li>
        <li><strong>차트:</strong> 막대 차트로 시각화하며, 가로/세로 모드 전환이 가능합니다.</li>
      </ul>

      <h5 class="flex items-center gap-2 text-xl font-bold text-slate-800 mt-12 mb-4">
        <span class="w-1.5 h-6 bg-blue-500 rounded-full"></span>
        4.3. 분석 팁
      </h5>
      <div class="bg-white border border-slate-200 rounded-2xl p-6 my-6 relative shadow-sm">
        <div class="absolute left-0 top-6 bottom-6 w-1 bg-gradient-to-b from-blue-500 to-emerald-400 rounded-r-full"></div>
        <p class="font-bold text-slate-900 mb-4">분석 팁</p>
        <p class="text-slate-600">
          '내림차순' 정렬을 사용하면 가장 흔한 증상을 쉽게 파악할 수 있으며, 중요 증상을 강조 표시하여 보고서에 활용하세요.
        </p>
      </div>
    </div>
  </div>
</template>
