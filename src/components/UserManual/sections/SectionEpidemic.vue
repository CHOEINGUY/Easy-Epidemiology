<template>
  <div class="bg-white rounded-3xl p-10 shadow-sm border border-slate-200">
    <h2 class="text-3xl font-extrabold text-slate-900 mb-8 pb-4 border-b border-slate-200">5. 유행곡선 및 잠복기 분석</h2>
    <div class="prose prose-slate max-w-none">
      <p class="text-slate-600 leading-relaxed mb-6">
        시간별 환자 발생 패턴인 유행곡선(Epi Curve)을 그리고, 이를 통해 감염원 노출 시점을 추정하거나 잠복기를 분석합니다.
      </p>

      <h5 class="flex items-center gap-2 text-xl font-bold text-slate-800 mt-12 mb-4">
        <span class="w-1.5 h-6 bg-blue-500 rounded-full"></span>
        5.1. 추정 감염원 선택
      </h5>
      <p class="text-slate-600 leading-relaxed mb-4">
        이전 단계(환자대조군/코호트)에서 파악된 통계적으로 유의한 위험 요인을 선택하여 차트 제목 등에 반영할 수 있습니다.
      </p>

      <h5 class="flex items-center gap-2 text-xl font-bold text-slate-800 mt-12 mb-4">
        <span class="w-1.5 h-6 bg-blue-500 rounded-full"></span>
        5.2. 유행곡선 차트
      </h5>
      <p class="text-slate-600 leading-relaxed mb-4">
        3시간, 6시간, 12시간, 24시간 등 간격을 버튼으로 조절하며 유행 패턴을 파악하세요.
      </p>
      <div class="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-600 space-y-2">
        <p><strong>• 단일 노출 (Single Source):</strong> 하나의 크고 뾰족한 봉우리가 나타나면 짧은 시간 동안 공통된 원인에 노출되었음을 의미할 수 있습니다.</p>
        <p><strong>• 지속 노출 (Continuous Source):</strong> 환자 발생이 오랫동안 지속되거나 평평한 형태를 보이면 원인에 지속적으로 노출되고 있음을 시사합니다.</p>
      </div>

      <h5 class="flex items-center gap-2 text-xl font-bold text-slate-800 mt-12 mb-4">
        <span class="w-1.5 h-6 bg-blue-500 rounded-full"></span>
        5.3. 잠복기 분석
      </h5>
      <p class="text-slate-600 leading-relaxed mb-4">
        잠복기를 계산하기 위해서는 기준이 되는 시점이 필요합니다. 화면 상단의 <strong>[추정 노출일]</strong> 입력란에 날짜와 시간을 입력해주세요.
        <br>입력된 시점과 각 환자의 증상 발현일 차이를 자동으로 계산하여 <strong>최소, 최대, 평균, 중위수 잠복기</strong>를 도출합니다.
      </p>
    </div>
  </div>
</template>
