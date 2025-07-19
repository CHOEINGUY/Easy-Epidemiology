<template>
  <div class="app">
    <header class="app-header">
      <h1 class="app-title">Easy-Epidemiology Web v1.0</h1>
    </header>

    <!-- 메인 편집 & 미리보기 레이아웃 -->
    <div class="report-container">
      <!-- 좌측: 보고서 항목 편집 영역 -->
      <div class="editor-pane">
        <h2 class="pane-title">보고서 항목</h2>
        
        <!-- 차트 이미지는 EpidemicCurve 탭 "보고서 저장" 버튼으로 자동 생성됨 -->

        <ul class="item-list">
          <li class="design-item">
            <span class="item-label">조사 디자인</span>
            <div class="design-options">
              <button
                :class="['design-btn', { active: studyDesign === 'case-control' }]"
                @click="studyDesign = 'case-control'"
              >환자-대조군 연구</button>
              <button
                :class="['design-btn', { active: studyDesign === 'cohort' }]"
                @click="studyDesign = 'cohort'"
              >후향적 코호트 연구</button>
            </div>
          </li>
          <li class="plain-item">
            <span class="item-label"><span class="material-icons icon">stacked_bar_chart</span> 사례 발병률</span>
            <span :class="['badge', { empty: !caseAttackRate }]">
              {{ caseAttackRate ? caseAttackRate + '%' : '미입력' }}
            </span>
          </li>
          <li class="plain-item">
            <span class="item-label"><span class="material-icons icon">bar_chart</span> 환자 발병률</span>
            <span :class="['badge', { empty: !patientAttackRate }]">
              {{ patientAttackRate ? patientAttackRate + '%' : '미입력' }}
            </span>
          </li>
          <li class="plain-item column">
            <div class="item-label"><span class="material-icons icon">event</span> 추정 노출일시</div>
            <div class="value-row"><span :class="['badge', { empty: !exposureDate }]">{{ exposureDate || '미입력' }}</span></div>
          </li>
          <li class="plain-item column">
            <div class="item-label"><span class="material-icons icon">medical_services</span> 최초사례 발생</div>
            <div class="value-row"><span :class="['badge', { empty: !firstCaseDate }]">{{ firstCaseDate || '미입력' }}</span></div>
          </li>
          <li class="plain-item">
            <span class="item-label"><span class="material-icons icon">timer</span> 평균 잠복기(시간)</span>
            <span :class="['badge', { empty: !meanIncubation }]">
              {{ meanIncubation ? meanIncubation + '시간' : '미입력' }}
            </span>
          </li>
          <li class="plain-item">
            <span class="item-label"><span class="material-icons icon">science</span> 추정 감염원</span>
            <span :class="['badge', { empty: !suspectedSource }]">
              {{ suspectedSource || '미입력' }}
            </span>
          </li>
          <li class="plain-item clickable" @click="openSectionModal('foodIntake')">
            <span class="item-label"><span class="material-icons icon">restaurant</span> 식품 섭취력 분석</span>
            <span :class="['badge', { empty: !foodIntakeAnalysis }]">
              {{ foodIntakeAnalysis ? '입력됨' : '미입력' }}
            </span>
          </li>
          <li class="plain-item">
            <span class="item-label"><span class="material-icons icon">show_chart</span> 유행곡선 차트</span>
            <span :class="['badge', { empty: !hasEpidemicChart }]">
              {{ hasEpidemicChart ? '입력됨' : '미입력' }}
            </span>
          </li>
          <li class="plain-item">
            <span class="item-label"><span class="material-icons icon">timeline</span> 잠복기 차트</span>
            <span :class="['badge', { empty: !hasIncubationChart }]">
              {{ hasIncubationChart ? '입력됨' : '미입력' }}
            </span>
          </li>
          <li class="plain-item">
            <span class="item-label"><span class="material-icons icon">table_chart</span> 주요증상 표</span>
            <span :class="['badge', { empty: !hasMainSymptomsTable }]">
              {{ hasMainSymptomsTable ? '입력됨' : '미입력' }}
            </span>
          </li>

        </ul>
      </div>

      <!-- 우측: 미리보기 영역 -->
      <div class="preview-pane">
        <div class="preview-header">
          <h2 class="pane-title">미리보기</h2>
          <div class="download-buttons">
            <button class="download-btn primary" @click="downloadHwpxReport">
              <span class="material-icons">description</span>
              HWPX 다운로드
            </button>
          </div>
        </div>
        <div class="report-preview" v-html="renderedHtml"></div>
      </div>
    </div>

    <!-- 섹션 편집 모달 -->
    <div v-if="showSectionModal" class="modal-overlay" @click="closeSectionModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>{{ getModalTitle() }}</h3>
          <button class="close-btn" @click="closeSectionModal">
            <span class="material-icons">close</span>
          </button>
        </div>
        <div class="modal-body">
          <textarea
            v-model="editingSectionContent"
            placeholder="섹션 내용을 입력하세요..."
            class="section-textarea"
          ></textarea>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="closeSectionModal">취소</button>
          <button class="btn btn-primary" @click="saveSectionContent">저장</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
// 현재는 UI 틀만 구성됨 (추후 보고서 작성 기능 구현 예정)
import { ref, computed } from 'vue';
import reportTemplate from '../templates/reportTemplate.js';
import { useStore } from 'vuex';

function formatKoreanDate(dateObj) {
  if (!dateObj || isNaN(dateObj)) return null;
  const days = ['일','월','화','수','목','금','토'];
  const yyyy = dateObj.getFullYear();
  const mm = String(dateObj.getMonth()+1).padStart(2,'0');
  const dd = String(dateObj.getDate()).padStart(2,'0');
  const day = days[dateObj.getDay()];
  const hh = String(dateObj.getHours()).padStart(2,'0');
  return `${yyyy}년 ${mm}월 ${dd}일 (${day}요일) ${hh}시`;
}

// --- 결과(IV) 관련 계산 ---
function formatKoreanDateTime(dateObj) {
  if (!dateObj || isNaN(dateObj)) return null;
  const days = ['일','월','화','수','목','금','토'];
  const yyyy = dateObj.getFullYear();
  const mm = String(dateObj.getMonth()+1).padStart(2,'0');
  const dd = String(dateObj.getDate()).padStart(2,'0');
  const day = days[dateObj.getDay()];
  const hh = String(dateObj.getHours()).padStart(2,'0');
  const mi = String(dateObj.getMinutes()).padStart(2,'0');
  return `${yyyy}년 ${mm}월 ${dd}일 (${day}요일) ${hh}시 ${mi}분`;
}

// --- 로컬 상태: 조사 디자인 선택 ---
const studyDesign = ref('case-control');

// --- 새로운 섹션 데이터 ---
const customFoodIntakeAnalysis = ref(''); // 사용자가 직접 입력한 내용

const foodIntakeAnalysis = computed(() => {
  // 사용자가 직접 입력한 내용이 있으면 그것을 우선 사용
  if (customFoodIntakeAnalysis.value.trim()) {
    return customFoodIntakeAnalysis.value;
  }
  
  // 분석 결과가 있으면 자동 생성된 내용 사용
  const results = store.getters.getAnalysisResults;
  const selectedFoods = store.getters.getSelectedSuspectedFoods;
  if (!results || !selectedFoods) return '';
  
  const designResults = studyDesign.value === 'case-control' ? (results.caseControl || []) : (results.cohort || []);
  const selected = selectedFoods.split(',').map(f => f.trim()).filter(f => f);
  const filtered = designResults.filter(r => selected.includes(r.item));
  
  if (!filtered.length) return '';
  
  // 분석 결과가 있으면 자동 생성된 텍스트 반환
  return generateFoodIntakeText();
});

// --- 모달 상태 ---
const showSectionModal = ref(false);
const editingSectionType = ref('');
const editingSectionContent = ref('');

// store access
const store = useStore();

// --- 통계 분석 옵션 (Vuex에서 수집) ---
const analysisOptions = computed(() => store.getters.getAnalysisOptions || { statMethod: 'chi-square', haldaneCorrection: false });

function getStatMethodText(method) {
  switch (method) {
  case 'chi-square':
    return '카이제곱검정을 통해';
  case 'chi-fisher':
    return '카이제곱검정 및 피셔의 정확검정을 통해';
  case 'yates':
    return 'Yates의 연속성 보정을 적용한 카이제곱검정을 통해';
  case 'yates-fisher':
    return 'Yates의 연속성 보정을 적용한 카이제곱검정과 피셔의 정확검정을 통해';
  default:
    return '';
  }
}

function buildStatAnalysisText() {
  const base = '통계분석은 전남대학교 의과대학 예방의학교실 및 광주, 전남 감염병관리지원단에서 제공하는 역학조사 자료 전문 분석 프로그램(Easy-Epidemiology Web)을 이용하여 진행되었다.';
  const methodText = getStatMethodText(analysisOptions.value.statMethod);
  let secondSentence = '';
  if (studyDesign.value === 'case-control') {
    secondSentence = `교차비(OR) 및 95% 신뢰 구간을 계산하였으며, ${methodText} 노출요인과 질병 연관성의 통계적 유의성을 확인하였다.`;
  } else {
    secondSentence = `상대위험도(RR) 및 95% 신뢰 구간을 계산하였으며, ${methodText} 노출요인과 질병 연관성의 통계적 유의성을 확인하였다.`;
  }
  let corrSentence = '';
  if (analysisOptions.value.haldaneCorrection) {
    const metric = studyDesign.value === 'case-control' ? '오즈비' : '상대위험도';
    corrSentence = ` 교차표의 특정 셀 빈도가 0인 경우, ${metric} 및 신뢰구간 계산 시 Haldane - Anscombe correction을 적용하였다.`;
  }
  return {
    base,
    method: `${secondSentence}${corrSentence}`
  };
}

// store access
const caseAttackRate = computed(() => store.getters.getCaseAttackRate);
const patientAttackRate = computed(() => store.getters.getPatientAttackRate);
const exposureDate = computed(() => {
  const raw = store.getters.getExposureDate;
  if (!raw) return null;
  if (raw.includes('~')) {
    // 범위
    const [start, end] = raw.split('~').map(s => new Date(s.trim()));
    return `${formatKoreanDate(start)} ~ ${formatKoreanDate(end)}`;
  }
  const dt = new Date(raw);
  return formatKoreanDate(dt);
});

const firstCaseDate = computed(() => {
  const dt = store.getters.getFirstCaseDate;
  if (!dt) return null;
  return formatKoreanDate(dt);
});
// EpidemicCurve.vue와 동일한 로직으로 평균 잠복기 계산
const meanIncubation = computed(() => {
  const patientRows = rows.value.filter(r => r && String(r.isPatient) === '1');
  const isIndividual = store.state.isIndividualExposureColumnVisible;
  
  let durations = [];
  
  if (isIndividual) {
    // 개별 노출 시간 사용
    durations = patientRows.map(row => {
      if (!row.symptomOnset || !row.individualExposureTime) return null;
      const onset = new Date(row.symptomOnset);
      const exposure = new Date(row.individualExposureTime);
      if (isNaN(onset.getTime()) || isNaN(exposure.getTime()) || onset < exposure) return null;
      return onset.getTime() - exposure.getTime();
    }).filter(duration => duration !== null);
  } else {
    // 공통 노출 시간 사용
    const exposureDateTime = store.getters.getExposureDateTime;
    if (!exposureDateTime) return null;
    
    const exposureDate = new Date(exposureDateTime);
    if (isNaN(exposureDate.getTime())) return null;
    
    durations = patientRows.map(row => {
      if (!row.symptomOnset) return null;
      const onset = new Date(row.symptomOnset);
      if (isNaN(onset.getTime()) || onset < exposureDate) return null;
      return onset.getTime() - exposureDate.getTime();
    }).filter(duration => duration !== null);
  }
  
  if (durations.length === 0) return null;
  
  // 평균 계산 (밀리초 → 시간)
  const sum = durations.reduce((acc, val) => acc + val, 0);
  const avgDuration = sum / durations.length;
  return (avgDuration / 3600000).toFixed(1); // 밀리초를 시간으로 변환
});
const suspectedSource = computed(() => {
  const selectedFoods = store.getters.getSelectedSuspectedFoods;
  if (selectedFoods && selectedFoods.trim()) {
    return selectedFoods;
  }
  return store.getters.getSuspectedSource;
});

const rows = computed(() => store.getters.rows || []);

const totalParticipants = computed(() => rows.value.length);

const patientRows = computed(() => rows.value.filter(r => r && String(r.isPatient) === '1'));

const patientCount = computed(() => patientRows.value.length);

const confirmedRows = computed(() => rows.value.filter(r => r && String(r.isConfirmedCase) === '1'));

const confirmedCount = computed(() => {
  // 확진여부 열이 보이지 않으면 null 반환
  if (!store.state.isConfirmedCaseColumnVisible) return null;
  return confirmedRows.value.length;
});

// 차트와 표 상태 확인
const epidemicChartSettings = computed(() => store.getters.getEpidemicCurveSettings);
const hasEpidemicChart = computed(() => epidemicChartSettings.value?.reportChartDataUrl);
const hasIncubationChart = computed(() => epidemicChartSettings.value?.reportIncubationChartDataUrl);
const hasMainSymptomsTable = computed(() => {
  const patientRows = rows.value.filter(r => r && String(r.isPatient) === '1');
  const clinicalHeaders = store.getters.headers?.clinical || [];
  if (!patientRows.length || !clinicalHeaders.length) return false;
  
  const symptomStats = clinicalHeaders.map((symptom, index) => {
    const count = patientRows.filter(row => 
      row.clinicalSymptoms && 
      row.clinicalSymptoms[index] === '1'
    ).length;
    return count;
  }).filter(count => count > 0);
  
  return symptomStats.length > 0;
});


const confirmedAttackRate = computed(() => {
  // 확진여부 열이 보이지 않으면 null 반환
  if (!store.state.isConfirmedCaseColumnVisible || totalParticipants.value === 0) return null;
  // confirmedCount가 null이면 null 반환
  if (confirmedCount.value === null) return null;
  return ((confirmedCount.value / totalParticipants.value) * 100).toFixed(1);
});

// earliest and last onset dates
const firstCaseDateTime = computed(() => {
  const onsets = rows.value
    .map(r => r?.symptomOnset)
    .filter(Boolean)
    .map(ts => new Date(ts));
  if (!onsets.length) return null;
  const earliest = new Date(Math.min(...onsets));
  return formatKoreanDateTime(earliest);
});

const lastCaseDateTime = computed(() => {
  const onsets = rows.value
    .map(r => r?.symptomOnset)
    .filter(Boolean)
    .map(ts => new Date(ts));
  if (!onsets.length) return null;
  const latest = new Date(Math.max(...onsets));
  return formatKoreanDateTime(latest);
});

// symptom list of earliest case
const symptomList = computed(() => {
  if (!rows.value.length) return null;
  const onsetsWithIndex = rows.value.map((row, idx) => ({ idx, onset: row?.symptomOnset }));
  const valid = onsetsWithIndex.filter(o => o.onset);
  if (!valid.length) return null;
  const earliestIdx = valid.reduce((prev, curr) => new Date(prev.onset) < new Date(curr.onset) ? prev : curr).idx;
  const earliestRow = rows.value[earliestIdx];
  if (!earliestRow?.clinicalSymptoms) return null;
  const clinicalHeaders = store.getters.headers?.clinical || [];
  const list = earliestRow.clinicalSymptoms
    .map((val, idx) => val === '1' ? (clinicalHeaders[idx] || `증상${idx+1}`) : null)
    .filter(Boolean);
  return list.join(', ');
});





// 잠복기 및 추정 위험 노출 시기 텍스트 생성
function generateIncubationExposureText() {
  const selectedList = parseSuspectedFoods();
  const suspected = selectedList.length ? selectedList.join(', ') : (suspectedSource.value || '--');
  const isIndividual = store.state.isIndividualExposureColumnVisible;
  const patientRowsArr = patientRows.value;

  // Helper to format number or '--'
  const fmt = (num) => (num === null || num === undefined || isNaN(num) ? '--' : Number(num).toFixed(1));

  const durations = [];

  const exposureSingleStr = store.getters.getExposureDateTime || store.getters.getExposureDate || '';
  let exposureSingleDate = null;
  if (!isIndividual && exposureSingleStr && !exposureSingleStr.includes('~')) {
    // Normalize exposure date string
    const normalized = exposureSingleStr.includes('T') ? exposureSingleStr : exposureSingleStr.replace(' ', 'T');
    const d = new Date(normalized);
    if (!isNaN(d.getTime())) exposureSingleDate = d;
  }

  let exposureRangeStart = null;
  let exposureRangeEnd = null;

  patientRowsArr.forEach(row => {
    if (!row || !row.symptomOnset) return;
    const onset = new Date(row.symptomOnset.includes('T') ? row.symptomOnset : row.symptomOnset.replace(' ', 'T'));
    if (isNaN(onset.getTime())) return;

    let expDate = null;
    if (isIndividual) {
      if (!row.individualExposureTime) return;
      expDate = new Date(row.individualExposureTime.includes('T') ? row.individualExposureTime : row.individualExposureTime.replace(' ', 'T'));
    } else {
      expDate = exposureSingleDate;
    }
    if (!expDate || isNaN(expDate.getTime()) || onset < expDate) return;

    const diffHours = (onset.getTime() - expDate.getTime()) / 3600000;
    durations.push(diffHours);

    if (isIndividual) {
      if (!exposureRangeStart || expDate < exposureRangeStart) exposureRangeStart = expDate;
      if (!exposureRangeEnd || expDate > exposureRangeEnd) exposureRangeEnd = expDate;
    }
  });

  if (!durations.length) return '<div class="placeholder-table">잠복기/노출 데이터가 부족합니다.</div>';

  durations.sort((a,b) => a-b);
  const minH = durations[0];
  const maxH = durations[durations.length-1];
  const meanH = durations.reduce((a,b) => a+b,0)/durations.length;
  const medianH = durations.length%2===1 ? durations[(durations.length-1)/2] : (durations[durations.length/2 -1]+durations[durations.length/2])/2;

  if (!isIndividual) {
    const expTxt = exposureSingleDate ? formatKoreanDateTime(exposureSingleDate) : '--';
    return `역학조사 결과, 감염원은 ${suspected}으로 추정되었으며, 노출 시점은 ${expTxt}으로 추정되었다. 이 시점을 기준으로 증상 발생까지의 평균 잠복기는 ${fmt(meanH)}시간으로, 최소 ${fmt(minH)}시간, 최대 ${fmt(maxH)}시간, 중앙값 ${fmt(medianH)}시간으로 나타났다.`;
  } else {
    const startTxt = exposureRangeStart ? formatKoreanDateTime(exposureRangeStart) : '--';
    const endTxt = exposureRangeEnd ? formatKoreanDateTime(exposureRangeEnd) : '--';
    return `역학조사 결과, 감염원은 ${suspected}으로 추정되었으며, 노출 시점은 ${startTxt}부터 ${endTxt}까지의 범위로 파악되었다. 이 기간 내 노출된 환례의 증상 발생까지의 평균 잠복기는 ${fmt(meanH)}시간이었으며, 최소 ${fmt(minH)}시간, 최대 ${fmt(maxH)}시간, 중앙값 ${fmt(medianH)}시간으로 나타났다.`;
  }
}

const incubationExposureText = computed(() => generateIncubationExposureText());

// 분석 결과 관련 변수들
const suspectedFoodsStr = computed(() => store.getters.getSelectedSuspectedFoods || '');
const analysisResultsAll = computed(() => store.getters.getAnalysisResults || {});

// 분석 결과 관련 함수들
function getDesignResults() {
  return studyDesign.value === 'case-control' ? (analysisResultsAll.value.caseControl || []) : (analysisResultsAll.value.cohort || []);
}

function parseSuspectedFoods() {
  return suspectedFoodsStr.value.split(',').map(f => f.trim()).filter(f => f);
}

// --- 유행곡선 차트 이미지 ---
// 차트 이미지는 EpidemicCurve 탭 "보고서 저장" 버튼으로 자동 생성됨

// --- generateFoodIntakeText 함수 선언문으로 이동 (다운로드 함수들보다 위에 위치) ---
function generateFoodIntakeText() {
  const results = getDesignResults();
  if(!results.length) return '';
  // 유행곡선 탭에서 선택된 추정 감염원들 가져오기
  const selectedFoods = parseSuspectedFoods();
  const filtered = results.filter(r => selectedFoods.includes(r.item));
  if(!filtered.length) return '';
  const metric = studyDesign.value==='case-control' ? 'OR' : 'RR';
  const parts = filtered.map(r => `${r.item} (p = ${(r.pValue<0.001?'<0.001':r.pValue.toFixed(3))}, ${metric} = ${studyDesign.value==='case-control'?r.oddsRatio:r.relativeRisk} (${studyDesign.value==='case-control'?r.ci_lower:r.rr_ci_lower} - ${studyDesign.value==='case-control'?r.ci_upper:r.rr_ci_upper}))`);
  return `식품 섭취력에 따른 환례 연관성 분석 결과, ${parts.join(', ')}이 통계적으로 유의하게 나타났다.`;
}

// 차트 이미지 경로 결정 (store에 저장된 데이터)
const getChartImagePath = () => {
  const settings = store.getters.getEpidemicCurveSettings;
  console.log('ReportWriter - 차트 설정:', settings);
  console.log('ReportWriter - reportChartDataUrl:', settings?.reportChartDataUrl);
  return settings && settings.reportChartDataUrl ? settings.reportChartDataUrl : null;
};

// 잠복기 차트 이미지 경로 결정 (store에 저장된 데이터)
const getIncubationChartImagePath = () => {
  const settings = store.getters.getEpidemicCurveSettings;
  console.log('ReportWriter - 잠복기 차트 설정:', settings);
  console.log('ReportWriter - reportIncubationChartDataUrl:', settings?.reportIncubationChartDataUrl);
  return settings && settings.reportIncubationChartDataUrl ? settings.reportIncubationChartDataUrl : null;
};

// 주요증상 데이터 계산 (공통 함수)
const getSymptomStats = () => {
  if (!rows.value.length || !patientCount.value) {
    return null;
  }

  // 환자 데이터만 필터링
  const patientRows = rows.value.filter(r => r && String(r.isPatient) === '1');
  
  // 증상 헤더 가져오기
  const clinicalHeaders = store.getters.headers?.clinical || [];
  
  if (!clinicalHeaders.length) {
    return null;
  }

  // 각 증상별 환례수 계산
  const symptomStats = clinicalHeaders.map((symptom, index) => {
    const count = patientRows.filter(row => 
      row.clinicalSymptoms && 
      row.clinicalSymptoms[index] === '1'
    ).length;
    
    const percentage = patientCount.value > 0 ? ((count / patientCount.value) * 100).toFixed(1) : '0.0';
    
    return {
      symptom,
      count,
      percentage
    };
  }).filter(stat => stat.count > 0) // 환례수가 0인 증상은 제외
    .sort((a, b) => b.count - a.count); // 환례수 내림차순 정렬

  return symptomStats.length > 0 ? symptomStats : null;
};

// 주요증상 테이블 생성 (미리보기용 HTML)
const generateMainSymptomsTable = () => {
  const symptomStats = getSymptomStats();
  
  if (!symptomStats) {
    return '<div class="placeholder-table">증상 데이터가 없습니다.</div>';
  }

  // HTML 테이블 행 생성 (미리보기용)
  return symptomStats.map(stat => 
    `<tr>
      <td>${stat.symptom}</td>
      <td style="text-align: center;">${stat.count}</td>
      <td style="text-align: center;">${stat.percentage}%</td>
    </tr>`
  ).join('');
};




const renderedHtml = computed(() => {
  let html = reportTemplate;
  const designText = studyDesign.value === 'case-control' ? '환자-대조군 연구' : '후향적 코호트 연구';
  const statAnalysisObj = buildStatAnalysisText();
  
  // Helper function to wrap values with placeholder styling
  const wrapPlaceholder = (value) => {
    if (value === '--') return value;
    return `<span class="placeholder-value">${value}</span>`;
  };
  
  // 차트 이미지 HTML
  const chartImagePath = getChartImagePath();
  console.log('ReportWriter - chartImagePath:', chartImagePath ? '있음' : '없음');
  const chartImageHtml = chartImagePath 
    ? `<img src="${chartImagePath}" alt="유행곡선 차트" style="max-width: 100%; height: auto; margin: 20px 0; border: 1px solid #ddd;" />`
    : '<div class="placeholder-chart"><strong>유행곡선 차트</strong><br/><small>EpidemicCurve 탭에서 "보고서 저장" 버튼을 클릭하여<br/>차트 이미지를 저장한 후 확인하세요.</small></div>';
  console.log('ReportWriter - chartImageHtml 길이:', chartImageHtml.length);
  console.log('ReportWriter - chartImageHtml 시작 부분:', chartImageHtml.substring(0, 100));
  
  // 잠복기 차트 이미지 HTML
  const incubationChartImagePath = getIncubationChartImagePath();
  console.log('ReportWriter - incubationChartImagePath:', incubationChartImagePath ? '있음' : '없음');
  const incubationChartImageHtml = incubationChartImagePath 
    ? `<img src="${incubationChartImagePath}" alt="잠복기 차트" style="max-width: 100%; height: auto; margin: 20px 0; border: 1px solid #ddd;" />`
    : '<div class="placeholder-chart"><strong>잠복기 차트</strong><br/><small>EpidemicCurve 탭에서 잠복기 차트 "보고서 저장" 버튼을 클릭하여<br/>차트 이미지를 저장한 후 확인하세요.</small></div>';
  console.log('ReportWriter - incubationChartImageHtml 길이:', incubationChartImageHtml.length);
  
  function generateFoodIntakeTable() {
    const results = getDesignResults();
    const selected = parseSuspectedFoods();
    const filtered = results.filter(r => selected.includes(r.item));
    if(!filtered.length) return '<div class="placeholder-table">선택된 추정 감염원 데이터가 없습니다.</div>';
    const isCase = studyDesign.value === 'case-control';
    let tableHtml = '';
    if(isCase){
      tableHtml += `<table class="summary-table">
        <tr>
          <th rowspan="2">요인(식단)</th>
          <th colspan="3">환자군</th>
          <th colspan="3">대조군</th>
          <th rowspan="2">카이제곱<br/>P-value</th>
          <th rowspan="2">오즈비<br/>(OR)</th>
          <th colspan="2">95% 신뢰구간</th>
        </tr>
        <tr>
          <th>섭취자</th><th>비섭취자</th><th>합계</th>
          <th>섭취자</th><th>비섭취자</th><th>합계</th>
          <th>하한</th><th>상한</th>
        </tr>`;
      filtered.forEach(r => {
        const p = r.pValue!==null ? (r.pValue<0.001?'&lt;0.001':r.pValue.toFixed(3)):'N/A';
        tableHtml += `<tr>
          <td>${r.item}</td>
          <td class="cell-count">${r.b_obs}</td>
          <td class="cell-count">${r.c_obs}</td>
          <td class="cell-total">${r.rowTotal_Case}</td>
          <td class="cell-count">${r.e_obs}</td>
          <td class="cell-count">${r.f_obs}</td>
          <td class="cell-total">${r.rowTotal_Control}</td>
          <td class="cell-stat">${p}</td>
          <td class="cell-stat">${r.oddsRatio}</td>
          <td class="cell-stat">${r.ci_lower}</td>
          <td class="cell-stat">${r.ci_upper}</td>
        </tr>`;
      });
      tableHtml += '</table>';
    } else {
      tableHtml += `<table class="summary-table">
        <tr>
          <th rowspan="2">요인(식단)</th>
          <th colspan="3">섭취자(노출군)</th>
          <th colspan="3">비섭취자(비노출군)</th>
          <th rowspan="2">카이제곱<br/>P-value</th>
          <th rowspan="2">상대위험비<br/>(RR)</th>
          <th colspan="2">95% 신뢰구간</th>
        </tr>
        <tr>
          <th>대상자수</th><th>환자수</th><th>발병률(%)</th>
          <th>대상자수</th><th>환자수</th><th>발병률(%)</th>
          <th>하한</th><th>상한</th>
        </tr>`;
      filtered.forEach(r => {
        const p = r.pValue!==null ? (r.pValue<0.001?'&lt;0.001':r.pValue.toFixed(3)):'N/A';
        tableHtml += `<tr>
          <td>${r.item}</td>
          <td class="cell-total">${r.rowTotal_Exposed}</td>
          <td class="cell-count">${r.a_obs}</td>
          <td class="cell-stat">${r.incidence_exposed_formatted}</td>
          <td class="cell-total">${r.rowTotal_Unexposed}</td>
          <td class="cell-count">${r.c_obs}</td>
          <td class="cell-stat">${r.incidence_unexposed_formatted}</td>
          <td class="cell-stat">${p}</td>
          <td class="cell-stat">${r.relativeRisk}</td>
          <td class="cell-stat">${r.rr_ci_lower}</td>
          <td class="cell-stat">${r.rr_ci_upper}</td>
        </tr>`;
      });
      tableHtml += '</table>';
    }
    return tableHtml;
  }

  const foodIntakeAnalysisHtml = computed(() => {
    return `${generateFoodIntakeTable()}<p>${generateFoodIntakeText()}</p>`;
  });

  const replacements = {
    caseAttackRate: wrapPlaceholder(caseAttackRate.value ? `${caseAttackRate.value}%` : '--'),
    patientAttackRate: wrapPlaceholder(patientAttackRate.value ? `${patientAttackRate.value}%` : '--'),
    exposureDate: wrapPlaceholder(exposureDate.value || '--'),
    firstCaseDate: wrapPlaceholder(firstCaseDate.value || '--'),
    meanIncubation: wrapPlaceholder(meanIncubation.value ? `${meanIncubation.value}시간` : '--'),
    suspectedSource: wrapPlaceholder(suspectedSource.value || (parseSuspectedFoods().join(', ') || '--')),
    studyDesign: wrapPlaceholder(designText),
    statAnalysis: `${statAnalysisObj.base} <span class="placeholder-value">${statAnalysisObj.method}</span>`,
    firstCaseDateTime: wrapPlaceholder(firstCaseDateTime.value || '--'),
    lastCaseDateTime: wrapPlaceholder(lastCaseDateTime.value || '--'),
    patientCount: wrapPlaceholder(patientCount.value || '--'),
    totalParticipants: wrapPlaceholder(totalParticipants.value || '--'),
    confirmedCount: wrapPlaceholder(confirmedCount.value || '--'),
    confirmedAttackRate: wrapPlaceholder(confirmedAttackRate.value ? `${confirmedAttackRate.value}%` : '--'),
    symptomList: wrapPlaceholder(symptomList.value || '--'),
    caseAttackRateNumeric: wrapPlaceholder(caseAttackRate.value || '--'),
    epidemicChart: chartImageHtml,
    incubationChart: incubationChartImageHtml,
    mainSymptomsTable: generateMainSymptomsTable(),
    foodIntakeAnalysis: foodIntakeAnalysis.value || '<div class="placeholder-table">식품 섭취력 분석 내용을 입력하세요.</div>',
    foodIntakeAnalysisHtml: foodIntakeAnalysisHtml.value,
    incubationExposureText: wrapPlaceholder(incubationExposureText.value),
    foodIntakeTable: generateFoodIntakeTable(),
    '% % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % %식품섭취력분석% % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % %': foodIntakeAnalysis.value || generateFoodIntakeText() || '식품 섭취력 분석 내용을 입력하세요.',
    '% % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % %최초환자발생일시% % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % %': `사례정의에 부합하는 최초 사례는 ${firstCaseDateTime.value || '--'}경에 ${symptomList.value || '--'} 증상이 발생하였다. 이후 ${lastCaseDateTime.value || '--'}까지 총 ${patientCount.value || '--'}명의 환례가 있었다.`,
    '% % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % %발병률결과% % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % %': `조사에 포함된 대상자 ${totalParticipants.value || '--'}명 중 사례 수는 ${patientCount.value || '--'}명으로 사례 발병률은 ${caseAttackRate.value ? `${caseAttackRate.value}%` : '--'}이다. 이 중, 인체 검사 결과 검출된 확진환자 수는 ${confirmedCount.value || '--'}명으로 확진환자 발병률은 ${confirmedAttackRate.value ? `${confirmedAttackRate.value}%` : '--'}이다.`
  };
  Object.entries(replacements).forEach(([key, val]) => {
    html = html.replaceAll(`%${key}%`, val);
  });
  return html;
});

// 차트 이미지 관련 관리 (정적 이미지 방식)
// 실제 구현 시에는 EpidemicCurve에서 차트를 이미지로 저장하는 기능을 추가하고
// 여기서는 해당 이미지 파일을 참조하는 방식으로 구현

// --- 모달 관련 함수들 ---
function openSectionModal(sectionType) {
  editingSectionType.value = sectionType;
  editingSectionContent.value = getSectionContent(sectionType);
  showSectionModal.value = true;
}

function closeSectionModal() {
  showSectionModal.value = false;
  editingSectionType.value = '';
  editingSectionContent.value = '';
}

function getSectionContent(sectionType) {
  switch (sectionType) {
  case 'foodIntake':
    return customFoodIntakeAnalysis.value;
  default:
    return '';
  }
}

function saveSectionContent() {
  switch (editingSectionType.value) {
  case 'foodIntake':
    customFoodIntakeAnalysis.value = editingSectionContent.value;
    break;
  }
  closeSectionModal();
}

function getModalTitle() {
  switch (editingSectionType.value) {
  case 'foodIntake':
    return '식품 섭취력 분석';
  default:
    return '섹션 편집';
  }
}

// HWPX 파일 처리 유틸리티 import
import { 
  loadTemplateSection0, 
  replacePlaceholders,
  createHwpxFromTemplate,
  downloadHwpxFile
} from '../utils/hwpxProcessor.js';

// 환자-대조군 연구용 표 데이터 생성 함수
function generateCaseControlTableData() {
  const results = getDesignResults();
  const selected = parseSuspectedFoods();
  const filtered = results.filter(r => selected.includes(r.item));
  
  const tableData = {};
  
  // 5개 행에 대해 데이터 설정
  for (let i = 1; i <= 5; i++) {
    const result = filtered[i - 1];
    
    if (result) {
      // 식품명
      tableData[`%F${i}`] = result.item;
      
      // 환자군 데이터
      tableData[`%C${i}`] = result.b_obs || '0';  // 섭취자
      tableData[`%CN${i}`] = result.c_obs || '0'; // 비섭취자
      tableData[`%CT${i}`] = result.rowTotal_Case || '0'; // 합계
      
      // 대조군 데이터
      tableData[`%O${i}`] = result.e_obs || '0';  // 섭취자
      tableData[`%ON${i}`] = result.f_obs || '0'; // 비섭취자
      tableData[`%OT${i}`] = result.rowTotal_Control || '0'; // 합계
      
      // 통계 결과
      tableData[`%P${i}`] = result.pValue !== null ? (result.pValue < 0.001 ? '<0.001' : result.pValue.toFixed(3)) : 'N/A';
      tableData[`%OR${i}`] = result.oddsRatio || 'N/A';
      tableData[`%L${i}`] = result.ci_lower || 'N/A';
      tableData[`%U${i}`] = result.ci_upper || 'N/A';
    } else {
      // 데이터가 없는 경우 빈 값으로 설정
      tableData[`%F${i}`] = '';
      tableData[`%C${i}`] = '';
      tableData[`%CN${i}`] = '';
      tableData[`%CT${i}`] = '';
      tableData[`%O${i}`] = '';
      tableData[`%ON${i}`] = '';
      tableData[`%OT${i}`] = '';
      tableData[`%P${i}`] = '';
      tableData[`%OR${i}`] = '';
      tableData[`%L${i}`] = '';
      tableData[`%U${i}`] = '';
    }
  }
  
  return tableData;
}

// 코호트 연구용 표 데이터 생성 함수
function generateCohortTableData() {
  const results = getDesignResults();
  const selected = parseSuspectedFoods();
  const filtered = results.filter(r => selected.includes(r.item));
  
  const tableData = {};
  
  // 5개 행에 대해 데이터 설정
  for (let i = 1; i <= 5; i++) {
    const result = filtered[i - 1];
    
    if (result) {
      // 식품명
      tableData[`%F${i}`] = result.item;
      
      // 섭취자(노출군) 데이터
      tableData[`%E${i}`] = result.rowTotal_Exposed || '0';  // 대상자수
      tableData[`%EP${i}`] = result.a_obs || '0';  // 환자수
      tableData[`%ER${i}`] = result.incidence_exposed_formatted || '0.0';  // 발병률
      
      // 비섭취자(비노출군) 데이터
      tableData[`%U${i}`] = result.rowTotal_Unexposed || '0';  // 대상자수
      tableData[`%UP${i}`] = result.c_obs || '0';  // 환자수
      tableData[`%UR${i}`] = result.incidence_unexposed_formatted || '0.0';  // 발병률
      
      // 통계 결과
      tableData[`%P${i}`] = result.pValue !== null ? (result.pValue < 0.001 ? '<0.001' : result.pValue.toFixed(3)) : 'N/A';
      tableData[`%RR${i}`] = result.relativeRisk || 'N/A';
      tableData[`%L${i}`] = result.rr_ci_lower || 'N/A';
      tableData[`%U${i}`] = result.rr_ci_upper || 'N/A';
    } else {
      // 데이터가 없는 경우 빈 값으로 설정
      tableData[`%F${i}`] = '';
      tableData[`%E${i}`] = '';
      tableData[`%EP${i}`] = '';
      tableData[`%ER${i}`] = '';
      tableData[`%U${i}`] = '';
      tableData[`%UP${i}`] = '';
      tableData[`%UR${i}`] = '';
      tableData[`%P${i}`] = '';
      tableData[`%RR${i}`] = '';
      tableData[`%L${i}`] = '';
      tableData[`%U${i}`] = '';
    }
  }
  
  return tableData;
}

// HWPX 파일 다운로드 함수 (실제 사용)
async function downloadHwpxReport() {
  try {
    console.log('HWPX 파일 생성 시작...');
    
    // 1. 템플릿 Section0 파일을 텍스트로 로드
    const section0Text = await loadTemplateSection0(studyDesign.value);
    
    // 2. 교체할 텍스트 데이터 준비
    const statAnalysisText = buildStatAnalysisText();
    // 조사 디자인 텍스트
    const designText = studyDesign.value === 'case-control' ? '환자-대조군 연구' : '후향적 코호트 연구';
    // 식품 섭취력 분석 텍스트 (미리보기와 동일한 형태)
    const foodIntakeText = foodIntakeAnalysis.value || generateFoodIntakeText() || '식품 섭취력 분석 내용을 입력하세요.';
    // 잠복기 및 추정 위험 노출 시기 텍스트 (미리보기와 동일한 형태)
    const incubationText = generateIncubationExposureText() || '미상';
    // 주요증상 표 데이터 준비
    const symptomStats = getSymptomStats();
    
    const replacements = {
      '%사례발병률%': caseAttackRate.value ? `${caseAttackRate.value}%` : '미상상',
      '%추정감염원%': suspectedSource.value || '미상',
      '%평균잠복기%': meanIncubation.value ? `${meanIncubation.value}시간` : '미상',
      '%환자발병률%': patientAttackRate.value ? `${patientAttackRate.value}%` : '미상',
      '%%%추정위험노출일시%%%': exposureDate.value || '미상',
      '%%%최초사례발생일시%%%': firstCaseDate.value || '미상',
      '%조사디자인%': designText,
      '% % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % %식품섭취력분석% % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % %': foodIntakeText,
      '% % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % %잠복기및추정위험노출시기% % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % %': incubationText,
      '% % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % %최초환자발생일시% % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % %': `사례정의에 부합하는 최초 사례는 ${firstCaseDateTime.value || '미상'}경에 ${symptomList.value || '미상'} 증상이 발생하였다. 이후 ${lastCaseDateTime.value || '미상'}까지 총 ${patientCount.value || '미상'}명의 환례가 있었다.`,
      '% % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % %통계분석에사용한분석기법% % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % %': statAnalysisText.method,
      // 주요증상 표 개별 셀 데이터
      '%TOTAL_COUNT%': patientCount.value || '0'
    };
    
    // 조사 디자인에 따라 표 데이터 추가
    if (studyDesign.value === 'case-control') {
      const tableData = generateCaseControlTableData();
      Object.assign(replacements, tableData);
    } else if (studyDesign.value === 'cohort') {
      const tableData = generateCohortTableData();
      Object.assign(replacements, tableData);
    }
    
    // 증상별 데이터 추가 (최대 10개)
    if (symptomStats) {
      for (let i = 0; i < Math.min(symptomStats.length, 10); i++) {
        const stat = symptomStats[i];
        replacements[`%SYMPTOM_${i + 1}%`] = stat.symptom;
        replacements[`%COUNT_${i + 1}%`] = stat.count.toString();
        replacements[`%PERCENT_${i + 1}%`] = `${stat.percentage}%`;
      }
    }
    
    // 빈 셀들 처리 (증상이 10개 미만인 경우)
    for (let i = (symptomStats ? symptomStats.length : 0) + 1; i <= 10; i++) {
      replacements[`%SYMPTOM_${i}%`] = '';
      replacements[`%COUNT_${i}%`] = '';
      replacements[`%PERCENT_${i}%`] = '';
    }
    
    // 디버깅: 교체할 데이터 확인
    console.log('🔍 교체할 데이터:', replacements);
    
    // 발병률결과 키 추가
    replacements['% % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % %발병률결과% % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % %'] = `조사에 포함된 대상자 ${totalParticipants.value || '미상'}명 중 사례 수는 ${patientCount.value || '미상'}명으로 사례 발병률은 ${caseAttackRate.value ? `${caseAttackRate.value}%` : '미상'}이다. 이 중, 인체 검사 결과 검출된 확진환자 수는 ${confirmedCount.value || '미상'}명으로 확진환자 발병률은 ${confirmedAttackRate.value ? `${confirmedAttackRate.value}%` : '미상'}이다.`;
    
    // 3. 텍스트에서 플레이스홀더 교체
    const modifiedXmlText = replacePlaceholders(section0Text, replacements);
    
    // 4. 차트 이미지 정보 준비
    const settings = store.getters.getEpidemicCurveSettings;
    const chartImages = {};
    
    if (settings.reportIncubationChartDataUrl) {
      chartImages.incubationChart = {
        dataUrl: settings.reportIncubationChartDataUrl,
        width: settings.reportIncubationChartWidth || 1100
      };
      console.log('📊 잠복기 차트 이미지 정보:', chartImages.incubationChart);
    }
    
    if (settings.reportChartDataUrl) {
      chartImages.epidemicChart = {
        dataUrl: settings.reportChartDataUrl,
        width: settings.reportChartWidth || 1100
      };
      console.log('📊 유행곡선 차트 이미지 정보:', chartImages.epidemicChart);
    }
    
    // 5. HWPX 파일 생성 (이미지 포함)
    const hwpxBlob = await createHwpxFromTemplate(modifiedXmlText, chartImages, studyDesign.value);
    
    // 6. HWPX 파일 다운로드
    const filename = `역학조사보고서_${new Date().toISOString().slice(0, 10)}.hwpx`;
    downloadHwpxFile(hwpxBlob, filename);
    
    console.log('HWPX 파일 생성 완료!');
    console.log('📄 HWPX 파일을 다운로드했습니다.');
    console.log('📝 한글 프로그램에서 열어서 확인하세요.');
    
  } catch (error) {
    console.error('HWPX 파일 생성 오류:', error);
    alert(`보고서 생성 중 오류가 발생했습니다: ${error.message}`);
  }
}


 
</script>

<style scoped>
.app {
  background-color: #f0f0f0;
  height: 100vh;
  overflow: hidden;
}
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background-color: white;
  border-bottom: 1px solid #e0e0e0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  z-index: 4;
}
.app-title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 300;
  font-family: "Noto Sans KR", sans-serif;
  color: #202124;
}

/* --- 레이아웃 --- */
.report-container {
  display: flex;
  gap: 30px;
  margin: 20px 30px 37px 30px;
  height: calc(100vh - 131px); /* 헤더(37px) + 상하여백(20px+37px) + 탭(37px) */
}
.editor-pane {
  flex: 0 0 280px; /* 좌측 폭 고정 */
  background-color: #ffffff;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  padding: 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}
.preview-pane {
  flex: 1;
  background-color: #ffffff;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  padding: 20px;
  overflow: hidden;
  max-height: 100%;
  display: flex;
  flex-direction: column;
}
.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  flex-shrink: 0;
}

.pane-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.download-buttons {
  display: flex;
  gap: 8px;
}

.download-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.download-btn.primary {
  background-color: #1a73e8;
  color: white;
}

.download-btn.primary:hover {
  background-color: #1557b0;
}

.download-btn.secondary {
  background-color: #f1f3f4;
  color: #5f6368;
  border: 1px solid #dadce0;
}

.download-btn.secondary:hover {
  background-color: #e8eaed;
}

.download-btn .material-icons {
  font-size: 18px;
}
.placeholder-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.placeholder-list li {
  padding: 8px 0;
  border-bottom: 1px solid #e0e0e0;
  font-size: 14px;
}
.preview-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #777;
  font-size: 14px;
  font-style: italic;
}
/* 디자인 항목 스타일 */
.design-item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 8px 0;
  border-bottom: 1px solid #e0e0e0;
}
.item-label {
  font-size: 14px;
  font-weight: 500;
}
.design-options {
  display: flex;
  gap: 6px;
  margin-top: 6px;
}
.design-btn {
  padding: 4px 10px;
  border: 1px solid #dadce0;
  background: #f8f9fa;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.2s, border 0.2s;
}
.design-btn.active {
  background: #1a73e8;
  border-color: #1a73e8;
  color: #ffffff;
}
.design-btn:hover {
  background: #e3eafc;
}

/* --- List style --- */
.item-list {
  list-style: none;
  padding: 0;
  margin: 0;
  flex: 1;
  min-height: 0;
}
.plain-item {
  padding: 10px 0;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
}
.plain-item.column { flex-direction: column; align-items:flex-start; }
.value-row { margin-top:6px; width:100%; text-align:right; }
.item-label {
  display: flex; align-items:center; gap:4px;
}
.icon { font-size:18px; color:#5f6368; }

.badge {
  padding: 2px 10px;
  border-radius: 12px;
  background: #e8f0fe;
  color: #1a73e8;
  font-weight: 600;
  font-size: 13px;
}
.badge.empty { background:#f1f3f4; color:#9aa0a6; }
.report-preview{ 
  width: 100%; 
  flex: 1;
  background-color: #f8f9fa;
  border-radius: 8px;
  padding: 30px;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
  overflow-y: auto;
  box-sizing: border-box;
  min-height: 0;
}

/* 클릭 가능한 항목 스타일 */
.plain-item.clickable {
  cursor: pointer;
  transition: background-color 0.2s;
}
.plain-item.clickable:hover {
  background-color: #f8f9fa;
}

/* 모달 스타일 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e0e0e0;
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  color: #5f6368;
}

.close-btn:hover {
  background-color: #f1f3f4;
}

.modal-body {
  flex: 1;
  padding: 20px;
  overflow: hidden;
}

.section-textarea {
  width: 100%;
  height: 300px;
  border: 1px solid #dadce0;
  border-radius: 4px;
  padding: 12px;
  font-family: inherit;
  font-size: 14px;
  line-height: 1.5;
  resize: vertical;
}

.section-textarea:focus {
  outline: none;
  border-color: #1a73e8;
  box-shadow: 0 0 0 2px rgba(26, 115, 232, 0.2);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid #e0e0e0;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-secondary {
  background-color: #f1f3f4;
  color: #5f6368;
}

.btn-secondary:hover {
  background-color: #e8eaed;
}

.btn-primary {
  background-color: #1a73e8;
  color: white;
}

.btn-primary:hover {
  background-color: #1557b0;
}

/* 차트 생성 버튼 제거: 관련 스타일 삭제 */
</style>

<style>
.report-preview .report-wrapper{ 
  max-width:900px; 
  margin:0 auto; 
  padding:40px; 
  background:#fff; 
  min-height: auto;
  box-sizing: border-box;
  border-radius: 4px;
  margin-bottom: 20px;
}
.report-preview h1{ text-align:center; font-size:28px; font-weight:700; margin:20px 0 15px; line-height:1.35; }
.page-num{ text-align:center; font-size:12px; margin-top:20px; }
.report-preview .section-heading{ font-size:18px; font-weight:600; margin:30px 0 10px; }
/* 표 스타일 */
.report-preview .summary-table{ width:100%; border-collapse:collapse; font-size:13px; table-layout:fixed; margin:15px 0; }
.report-preview .summary-table th,.report-preview .summary-table td{ border:1px solid #000; padding:6px 4px; height:26px; width:25%; text-align:center; }
.report-preview .summary-table th.label{ background:#e5e5e5; font-weight:600; text-align:left; padding-left:6px; }
/* 플레이스홀더 스타일 */
.report-preview .placeholder-chart{ 
  background:#f8f9fa; 
  border:2px dashed #dadce0; 
  padding:40px 20px; 
  text-align:center; 
  margin:20px 0; 
  border-radius:8px;
  color:#5f6368;
}
.report-preview .placeholder-table{ 
  background:#f8f9fa; 
  border:1px solid #dadce0; 
  padding:20px; 
  text-align:center; 
  margin:15px 0; 
  border-radius:4px;
  color:#5f6368;
}
.report-preview .placeholder-value{ 
  background:#fff3cd; 
  padding:2px 6px; 
  border-radius:3px; 
  border:1px solid #ffeaa7;
  font-weight:500;
}
</style> 