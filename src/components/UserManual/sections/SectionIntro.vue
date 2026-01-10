<template>
  <div class="bg-white rounded-3xl p-10 shadow-sm border border-slate-200">
    <h2 class="text-3xl font-extrabold text-slate-900 mb-8 pb-4 border-b border-slate-200">1. 프로그램 소개</h2>
    <div class="prose prose-slate max-w-none">
      <p class="text-lg leading-relaxed text-slate-600 mb-6">
        <strong>Easy-Epidemiology Web (v2.0)</strong>는 역학 조사를 위한 데이터 입력, 분석, 시각화 및 보고서 생성을 지원하는 <strong>설치가 필요 없는 웹 기반 도구</strong>입니다.
      </p>
      <div class="bg-blue-50 border border-blue-100 rounded-2xl p-6 my-6">
        <h4 class="font-bold text-blue-900 mb-2 flex items-center gap-2">
          <span class="material-icons-round text-blue-500">security</span>
          보안 및 개인정보 보호
        </h4>
        <p class="text-slate-700">
          본 프로그램은 <strong>서버에 데이터를 전송하지 않습니다.</strong> 입력하신 모든 민감한 정보(환자 명단 등)는 사용자의 PC(브라우저) 내부에만 임시 저장되므로 안심하고 사용하셔도 됩니다.
        </p>
      </div>
      <p class="text-slate-600 leading-relaxed mb-6">
        이 프로그램은 복잡한 역학 데이터를 손쉽게 관리하고, 다양한 통계 분석을 통해 의미 있는 결과를 도출할 수 있도록 설계되었습니다. 주요 기능은 다음과 같습니다.
      </p>
      <ul class="list-disc pl-6 space-y-2 mb-6 text-slate-600">
        <li>직관적인 표 형식의 데이터 입력 및 관리</li>
        <li>환자 특성, 임상 증상 등 자동 분석 및 시각화</li>
        <li>유행 곡선, 잠복기 차트 등 동적 차트 생성</li>
        <li>환자-대조군(Odds Ratio) 및 코호트(Relative Risk) 연구 지원</li>
        <li>분석 결과를 바탕으로 HWPX 보고서 초안 자동 생성</li>
      </ul>
    </div>
  </div>
</template>
