<template>
  <div class="bg-white rounded-3xl p-10 shadow-sm border border-slate-200">
    <h2 class="text-3xl font-extrabold text-slate-900 mb-8 pb-4 border-b border-slate-200">3. 환자 특성 탭</h2>
    <div class="prose prose-slate max-w-none">
      <p class="text-slate-600 leading-relaxed mb-6">
        환자들의 인구학적 특성을 자동으로 요약하고 시각화합니다.
      </p>

      <h5 class="flex items-center gap-2 text-xl font-bold text-slate-800 mt-12 mb-4">
        <span class="w-1.5 h-6 bg-blue-500 rounded-full"></span>
        3.1. 개요
      </h5>
      <p class="text-slate-600 leading-relaxed mb-4">전체 대상자, 환자 수, 발병률 등을 한눈에 확인할 수 있습니다.</p>

      <h5 class="flex items-center gap-2 text-xl font-bold text-slate-800 mt-12 mb-4">
        <span class="w-1.5 h-6 bg-blue-500 rounded-full"></span>
        3.2. 통계표 분석
      </h5>
      <p class="text-slate-600 leading-relaxed mb-4">
        좌측(메뉴)에서 원하는 변수(성별, 연령대 등)를 <strong>체크박스로 선택</strong>하면, 오른쪽에 해당 변수에 대한 통계표가 즉시 생성됩니다.
      </p>

      <h5 class="flex items-center gap-2 text-xl font-bold text-slate-800 mt-12 mb-4">
        <span class="w-1.5 h-6 bg-blue-500 rounded-full"></span>
        3.3. 차트 분석
      </h5>
      <p class="text-slate-600 leading-relaxed mb-4">
        선택된 변수에 대한 막대 차트가 자동으로 그려집니다. 차트 우측 상단의 <strong>[이미지 저장]</strong> 버튼을 누르면 차트를 PNG 파일로 다운로드하여 보고서에 바로 활용할 수 있습니다.
      </p>

      <h5 class="flex items-center gap-2 text-xl font-bold text-slate-800 mt-12 mb-4">
        <span class="w-1.5 h-6 bg-blue-500 rounded-full"></span>
        3.4. 팁 및 주의사항
      </h5>
      <div class="bg-amber-50 border border-amber-200 rounded-2xl p-6 relative">
        <span class="material-icons-round absolute left-6 top-6 text-2xl text-amber-500">warning</span>
        <div class="ml-10">
          <h4 class="text-amber-900 text-lg font-bold mb-2">해석 주의</h4>
          <p class="text-amber-800/90 leading-relaxed">
            환자 비율과 발병률의 차이를 구분하여 해석하시기 바랍니다. 환자 비율은 해당 그룹 내에서의 환자 비중이며, 발병률은 전체 대비 발생률과는 다를 수 있습니다.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
