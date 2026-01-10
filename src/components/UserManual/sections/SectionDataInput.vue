<template>
  <div class="bg-white rounded-3xl p-10 shadow-sm border border-slate-200">
    <h2 class="text-3xl font-extrabold text-slate-900 mb-8 pb-4 border-b border-slate-200">2. 데이터 입력 탭 사용 설명</h2>
    <div class="prose prose-slate max-w-none">
      <p class="text-slate-600 leading-relaxed mb-8">
        이 탭은 역학조사 데이터를 입력하고 관리하는 핵심 공간입니다. <strong>엑셀(Excel)</strong>과 매우 유사한 표 형태로 되어 있어, 평소 엑셀을 다루듯이 데이터를 쉽게 붙여넣거나 수정할 수 있습니다.
      </p>

      <!-- 2.1 -->
      <h5 class="flex items-center gap-2 text-xl font-bold text-slate-800 mt-12 mb-4">
        <span class="w-1.5 h-6 bg-blue-500 rounded-full"></span>
        2.1. 화면 구성 이해하기
      </h5>
      <p class="text-slate-600 leading-relaxed mb-4">"데이터 입력" 탭의 주요 영역은 다음과 같습니다.</p>
      <p class="text-slate-600 leading-relaxed mb-4">"데이터 입력" 탭의 주요 영역은 다음과 같습니다.</p>
      <ul class="list-disc pl-6 space-y-2 mb-6 text-slate-600">
        <li><strong>① 데이터 입력 표 (그리드):</strong> 엑셀처럼 자유롭게 데이터를 입력하고 수정하는 공간입니다.</li>
        <li><strong>② 상단 기능 버튼 (Function Bar):</strong> 엑셀 파일 가져오기, 데이터 내보내기, 초기화 등의 기능을 수행합니다.</li>
        <li><strong>③ 헤더(Header):</strong> 각 열의 제목(변수명)이 표시되는 곳입니다.</li>
      </ul>

      <!-- 2.2 -->
      <h5 class="flex items-center gap-2 text-xl font-bold text-slate-800 mt-12 mb-4">
        <span class="w-1.5 h-6 bg-blue-500 rounded-full"></span>
        2.2. 컨텍스트 메뉴 (우클릭)
      </h5>
      <p class="text-slate-600 leading-relaxed mb-4">셀을 우클릭하면 셀/행/열에 대한 편집 메뉴가 나타납니다.</p>
      <ul class="list-disc pl-6 space-y-2 mb-6 text-slate-600">
        <li><strong>행/열 추가 및 삭제:</strong> 원하는 위치에 행이나 열을 삽입하거나 삭제할 수 있습니다.</li>
        <li><strong>데이터 삭제:</strong> 선택한 셀이나 행/열의 내용을 지웁니다.</li>
      </ul>

      <!-- 2.3 -->
      <h5 class="flex items-center gap-2 text-xl font-bold text-slate-800 mt-12 mb-4">
        <span class="w-1.5 h-6 bg-blue-500 rounded-full"></span>
        2.3. 데이터 필터링
      </h5>
      <p class="text-slate-600 leading-relaxed mb-4">헤더를 우클릭하여 원하는 데이터만 필터링하여 볼 수 있습니다.</p>
      <div class="bg-white border border-slate-200 rounded-2xl p-6 my-6 relative shadow-sm">
        <div class="absolute left-0 top-6 bottom-6 w-1 bg-gradient-to-b from-blue-500 to-emerald-400 rounded-r-full"></div>
        <p class="font-bold text-slate-900 mb-4">필터 사용 방법</p>
        <ol class="list-decimal pl-6 text-slate-600 space-y-1 mb-4">
          <li>헤더 셀에서 <strong>마우스 우클릭</strong>을 하세요.</li>
          <li>나타나는 메뉴에서 원하는 값들을 <strong>체크박스</strong>로 선택(또는 해제)하세요.</li>
          <li>필터가 적용되면 해당 열의 조건에 맞는 데이터만 표시됩니다.</li>
        </ol>
        <p class="text-sm text-slate-500 bg-slate-100 p-3 rounded-lg">
          <strong>💡 팁:</strong> 적용된 필터를 모두 해제하려면, 컨텍스트 메뉴(우클릭) 맨 아래에 있는 <strong>'모든 필터 해제'</strong>를 선택하시면 됩니다.
        </p>
      </div>

      <!-- 2.4 -->
      <h5 class="flex items-center gap-2 text-xl font-bold text-slate-800 mt-12 mb-4">
        <span class="w-1.5 h-6 bg-blue-500 rounded-full"></span>
        2.4. 엑셀 파일 가져오기 및 내보내기
      </h5>
      <div class="bg-slate-50 border border-slate-200 rounded-2xl p-6 mb-6">
        <h6 class="font-bold text-slate-900 mb-3">엑셀 파일 가져오기 (Import)</h6>
        <p class="text-slate-600 mb-2">
          기존에 작성된 기초역학조사서(엑셀 파일)가 있다면 <strong>[Excel 파일 가져오기]</strong> 버튼을 눌러 한번에 등록할 수 있습니다.
        </p>
        <ul class="list-disc pl-6 text-slate-600 text-sm space-y-1">
          <li><strong>첫 번째 줄(Row 1):</strong> 반드시 <strong>변수명</strong>(예: 이름, 성별, 나이)이어야 합니다.</li>
          <li><strong>두 번째 줄부터:</strong> 실제 데이터가 들어가야 합니다.</li>
          <li>파일을 선택하면 프로그램이 자동으로 열을 매칭하여 데이터를 불러옵니다.</li>
        </ul>
      </div>

      <div class="bg-slate-50 border border-slate-200 rounded-2xl p-6 mb-6">
        <h6 class="font-bold text-slate-900 mb-3">데이터 내보내기 (Export)</h6>
        <p class="text-slate-600">
          작업 중인 내용을 <strong>[데이터 내보내기]</strong> 버튼을 통해 엑셀 파일로 저장하여, PC에 백업하거나 다른 사람에게 공유할 수 있습니다.
        </p>
      </div>

      <!-- 2.5 단축키 -->
      <h5 class="flex items-center gap-2 text-xl font-bold text-slate-800 mt-12 mb-4">
        <span class="w-1.5 h-6 bg-blue-500 rounded-full"></span>
        2.5. 유용한 단축키
      </h5>
      <p class="text-slate-600 leading-relaxed mb-4">
        마우스를 쓰지 않고 키보드만으로도 빠르게 작업할 수 있습니다.
      </p>
      <div class="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6">
        <ul class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-700">
          <li class="flex items-center gap-2"><span class="bg-white border border-slate-300 px-2 py-0.5 rounded font-mono text-xs shadow-sm">Enter</span> <span>입력 내용 저장 / 아래 셀로 이동</span></li>
          <li class="flex items-center gap-2"><span class="bg-white border border-slate-300 px-2 py-0.5 rounded font-mono text-xs shadow-sm">Tab</span> <span>오른쪽 셀로 이동</span></li>
          <li class="flex items-center gap-2"><span class="bg-white border border-slate-300 px-2 py-0.5 rounded font-mono text-xs shadow-sm">Shift + Tab</span> <span>왼쪽 셀로 이동</span></li>
          <li class="flex items-center gap-2"><span class="bg-white border border-slate-300 px-2 py-0.5 rounded font-mono text-xs shadow-sm">방향키(↑↓←→)</span> <span>셀 이동</span></li>
          <li class="flex items-center gap-2"><span class="bg-white border border-slate-300 px-2 py-0.5 rounded font-mono text-xs shadow-sm">Delete</span> <span>선택된 셀 내용 삭제</span></li>
          <li class="flex items-center gap-2"><span class="bg-white border border-slate-300 px-2 py-0.5 rounded font-mono text-xs shadow-sm">F2</span> <span>셀 편집 모드 진입</span></li>
        </ul>
      </div>

      <p class="text-slate-600 leading-relaxed mb-4">
        일반적인 윈도우 단축키도 모두 지원합니다.
      </p>
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div class="bg-white border border-slate-200 rounded-xl p-4 text-center">
          <div class="text-slate-400 text-xs mb-1">복사하기</div>
          <code class="bg-slate-100 px-2 py-1 rounded text-slate-900 font-bold">Ctrl + C</code>
        </div>
        <div class="bg-white border border-slate-200 rounded-xl p-4 text-center">
          <div class="text-slate-400 text-xs mb-1">붙여넣기</div>
          <code class="bg-slate-100 px-2 py-1 rounded text-slate-900 font-bold">Ctrl + V</code>
        </div>
        <div class="bg-white border border-slate-200 rounded-xl p-4 text-center">
          <div class="text-slate-400 text-xs mb-1">실행 취소</div>
          <code class="bg-slate-100 px-2 py-1 rounded text-slate-900 font-bold">Ctrl + Z</code>
        </div>
        <div class="bg-white border border-slate-200 rounded-xl p-4 text-center">
          <div class="text-slate-400 text-xs mb-1">다시 실행</div>
          <code class="bg-slate-100 px-2 py-1 rounded text-slate-900 font-bold">Ctrl + Y</code>
        </div>
      </div>

      <!-- 2.7 -> 2.5 -->
      <h5 class="flex items-center gap-2 text-xl font-bold text-slate-800 mt-12 mb-4">
        <span class="w-1.5 h-6 bg-blue-500 rounded-full"></span>
        2.6. 데이터 유효성 검사 (오류 알림)
      </h5>
      <p class="text-slate-600 leading-relaxed mb-4">
        날짜 형식(YYYY-MM-DD)이 틀리거나, 숫자가 들어가야 할 곳에 문자가 입력되면 <strong>셀 테두리가 <span class="text-red-500 font-bold">빨간색</span></strong>으로 변합니다.
        <br>화면 하단에 뜨는 <strong>오류 알림창(Toast)을 클릭</strong>하면, 오류가 있는 셀 위치로 <strong>자동으로 스크롤이 이동</strong>합니다. 오류 데이터를 빠르게 찾아 수정하세요.
      </p>

      <!-- 2.8 -> 2.6 -->
      <!-- 2.7 -->
      <h5 class="flex items-center gap-2 text-xl font-bold text-slate-800 mt-12 mb-4">
        <span class="w-1.5 h-6 bg-blue-500 rounded-full"></span>
        2.7. 자동 저장
      </h5>
      <div class="bg-blue-50/50 border border-blue-100 rounded-2xl p-6 my-6 text-center">
        <p class="font-bold text-blue-900 mb-2">안심하세요!</p>
        <p class="text-slate-600 italic">입력하는 모든 내용은 브라우저에 실시간으로 자동 저장됩니다.</p>
      </div>
    </div>
  </div>
</template>
