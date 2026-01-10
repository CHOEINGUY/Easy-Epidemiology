<template>
  <div class="bg-white rounded-3xl p-10 shadow-sm border border-slate-200">
    <h2 class="text-3xl font-extrabold text-slate-900 mb-8 pb-4 border-b border-slate-200">8. 보고서 작성</h2>
    <div class="prose prose-slate max-w-none">
      <p class="text-slate-600 leading-relaxed mb-6">
        이전 탭들에서 분석한 모든 결과를 종합하여, <strong>HWPX 포맷의 역학조사 보고서 초안</strong>을 자동으로 생성합니다.
        <br>생성된 파일은 완성본이 아니므로, 반드시 <strong>한글(Hangeul) 프로그램</strong>에서 열어 내용을 검토하고 다듬으셔야 합니다.
      </p>

      <h5 class="flex items-center gap-2 text-xl font-bold text-slate-800 mt-12 mb-4">
        <span class="w-1.5 h-6 bg-blue-500 rounded-full"></span>
        8.1. 생성 단계 (필수)
      </h5>
      <div class="bg-white border border-slate-200 rounded-2xl p-6 my-6 relative shadow-sm">
        <div class="absolute left-0 top-6 bottom-6 w-1 bg-gradient-to-b from-blue-500 to-emerald-400 rounded-r-full"></div>
        <ol class="list-decimal pl-6 text-slate-600 space-y-2">
          <li>모든 분석 탭(임상증상, 환자대조군 등)의 내용 확인</li>
          <li><strong>'유행곡선' 탭에서 차트 '보고서 저장' 버튼 클릭 (가장 중요)</strong></li>
          <li>보고서 탭의 미리보기 화면 검토</li>
          <li>우측 상단 <strong>[다운로드]</strong> 버튼 클릭</li>
        </ol>
      </div>

      <div class="bg-amber-50 border border-amber-200 rounded-2xl p-6 relative my-8">
        <span class="material-icons-round absolute left-6 top-6 text-2xl text-amber-500">warning</span>
        <div class="ml-10">
          <h4 class="text-amber-900 text-lg font-bold mb-2">차트가 안 나와요!</h4>
          <p class="text-amber-800/90 leading-relaxed">
            유행곡선과 잠복기 차트는 이미지로 캡처되어 삽입됩니다. 따라서 반드시 <strong>5번 유행곡선 탭</strong>에서 디자인을 확정하고 <strong>[보고서 저장]</strong> 버튼을 눌러야만 보고서에 포함됩니다.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
