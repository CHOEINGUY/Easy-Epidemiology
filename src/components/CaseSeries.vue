<template>
  <div class="app">
    <header class="app-header">
      <h1 class="app-title">Easy-Epidemiology Web v1.0</h1>
    </header>

    <div class="dashboard">
      <div class="summary-bar">
        <div class="summary-bar__title">
          <span class="material-icons summary-bar__logo">insights</span>
          사례군 조사
        </div>
      </div>

      <div class="top-info-wrapper">
        <div class="controls-area">
          <div class="ui-group">
            <label class="ui-label">폰트 크기:</label>
            <div class="control-button-wrapper">
              <button class="control-button" @click="cycleFontSize" @mouseenter="handleFontSizeMouseEnter" @mouseleave="handleFontSizeMouseLeave">
                {{ fontSizeButtonText }}
              </button>
              <div v-if="activeTooltip === 'fontSize'" class="control-tooltip">{{ tooltipText }}</div>
            </div>
          </div>
        </div>
        <div class="summary-info-area">
          <p>총 {{ rows.length }}명의 데이터 분석</p>
        </div>
      </div>

      <div class="output-area">
        <div class="output-row">
          <div class="analysis-table-container">
            <div class="table-title table-title--with-copy">
              <span>
                <span class="selected-variable-details__title-dot"></span>&nbsp;요인별 사례군 분석 결과
              </span>
            <div class="button-group">
                <div style="position: relative;">
                  <button @click="copyTableToClipboard" class="copy-chart-button">
                    <span class="button-icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                      </svg>
                    </span>
                    <span class="button-text">테이블 복사</span>
                  </button>
                  <div v-if="isTableCopied" class="copy-tooltip check-tooltip">
                    <svg width="32" height="32" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="12" fill="#1a73e8"/>
                      <polyline points="7,13 11,17 17,9" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </div>
                </div>
            </div>
            </div> <!-- close table-title -->
            <table
              class="analysis-table"
              :style="{ fontSize: tableFontSize + 'px', '--table-font-size': tableFontSize + 'px' }"
            >
              <thead>
                <tr>
                  <th rowspan="2" class="header-item">요인(식단)</th>
                  <th colspan="3" class="header-group-case">환자군</th>
                  <th rowspan="2" class="header-stat">발병률(%)</th>
                </tr>
                <tr>
                  <th class="header-sub">섭취자</th>
                  <th class="header-sub">비섭취자</th>
                  <th class="header-sub">합계</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="!caseSeriesResults || caseSeriesResults.length === 0">
                  <td colspan="5" class="no-data-row">
                    분석할 데이터가 없거나 Vuex 스토어 연결을 확인하세요.
                  </td>
                </tr>
                <tr v-for="(result, index) in caseSeriesResults" :key="index" class="data-row">
                  <td class="cell-item">{{ result.item }}</td>
                  <td class="cell-count">{{ result.exposedCases }}</td>
                  <td class="cell-count">{{ result.unexposedCases }}</td>
                  <td class="cell-total">{{ result.totalCases }}</td>
                  <td class="cell-stat">{{ result.incidence_formatted }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import { useStore } from 'vuex';

const store = useStore();

// --- UI 상태 ---
const fontSizes = [12, 14, 16];
const fontSizeLabels = ['작게', '보통', '크게'];
const tableFontSize = ref(14);
const fontSizeButtonText = ref('보통');

const activeTooltip = ref(null);
const tooltipText = ref('');

const showTooltip = (key, text) => {
  activeTooltip.value = key;
  tooltipText.value = text;
};
const hideTooltip = () => {
  activeTooltip.value = null;
};
const handleFontSizeMouseEnter = () => {
  const currentIndex = fontSizes.indexOf(tableFontSize.value);
  const nextIndex = (currentIndex + 1) % fontSizes.length;
  const nextFontSize = fontSizeLabels[nextIndex];
  showTooltip('fontSize', `폰트 크기를 ${nextFontSize}로 변경합니다`);
};
const handleFontSizeMouseLeave = hideTooltip;
const getNextValue = (currentValue, valueArray) => {
  const currentIndex = valueArray.indexOf(currentValue);
  const nextIndex = (currentIndex + 1) % valueArray.length;
  return valueArray[nextIndex];
};
const cycleFontSize = () => {
  tableFontSize.value = getNextValue(tableFontSize.value, fontSizes);
  const currentIndex = fontSizes.indexOf(tableFontSize.value);
  fontSizeButtonText.value = fontSizeLabels[currentIndex];
};

// --- 데이터 ---
const headers = computed(() => store.getters.headers || { diet: [] });
const rows = computed(() => store.getters.rows || []);

// --- 사례군 분석 결과 계산 ---
const caseSeriesResults = computed(() => {
  if (!headers.value?.diet || headers.value.diet.length === 0 || rows.value.length === 0) {
    console.warn('사례군 분석을 위한 headers.diet 또는 rows 데이터가 없습니다.');
    return [];
  }

  return headers.value.diet.map((dietItem, index) => {
    const factorName = dietItem;

    let exposedCases = 0;   // 섭취자 (환자)
    let unexposedCases = 0; // 비섭취자 (환자)

    rows.value.forEach((row) => {
      const isPatient = row.isPatient;
      const dietValue = row.dietInfo && row.dietInfo.length > index ? row.dietInfo[index] : null;

      if (isPatient === '1') {
        if (dietValue === '1') exposedCases++;
        else if (dietValue === '0') unexposedCases++;
      }
    });

    const totalCases = exposedCases + unexposedCases;

    // 발병률(%) 계산: 노출군 발병률 (환자군 중 섭취자 비율)
    let incidence_formatted = 'N/A';
    if (totalCases > 0) {
      const incidence = (exposedCases / totalCases) * 100;
      incidence_formatted = `${incidence.toFixed(1)}%`;
    }

    return {
      item: factorName,
      exposedCases,
      unexposedCases,
      totalCases,
      incidence_formatted
    };
  });
});

// --- 테이블 복사 로직 ---
const isTableCopied = ref(false);
const copyTableToClipboard = async () => {
  try {
    const tableData = [];
    // 헤더
    tableData.push(['요인(식단)', '섭취자', '비섭취자', '합계', '발병률(%)']);
    // 데이터 행
    caseSeriesResults.value.forEach((result) => {
      tableData.push([
        result.item,
        result.exposedCases,
        result.unexposedCases,
        result.totalCases,
        result.incidence_formatted
      ]);
    });
    const tsv = tableData.map((row) => row.join('\t')).join('\n');
    await navigator.clipboard.writeText(tsv);
    isTableCopied.value = true;
    setTimeout(() => (isTableCopied.value = false), 1500);
  } catch (e) {
    console.error('테이블 복사 오류:', e);
  }
};
</script>

<style scoped>
/* --- 기본 앱 및 대시보드 스타일 (CaseControl과 동일) --- */
.app {
  background-color: #f0f0f0;
  min-height: 100vh;
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
.dashboard {
  display: flex;
  flex-direction: column;
  width: 97%;
  margin: 20px auto; /* CohortStudy와 동일 */
  background-color: #f0f0f0;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
}
.summary-bar {
  height: 40px;
  display: flex;
  align-items: center;
  font-size: 20px;
  color: white;
  background-color: #1a73e8;
  padding: 5px;
  font-family: "Noto Sans KR", sans-serif;
  font-weight: 300;
}
.summary-bar__title {
  display: flex;
  align-items: center;
  margin-left: 3px;
}
.summary-bar__logo {
  margin-right: 5px;
  width: 35px;
  height: auto;
  vertical-align: middle;
  display: inline-flex;
  align-items: center;
}

/* --- 상단 정보 래퍼 및 컨트롤 영역 --- */
.top-info-wrapper {
  display: flex;
  gap: 30px;
  margin: 20px 30px 0 30px;
  align-items: stretch;
  margin-bottom: 0; /* CohortStudy와 동일 간격(0) */
}
.controls-area {
  flex: 1;
  background-color: #fff;
  padding: 10px 15px;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
  gap: 15px;
  flex-wrap: wrap;
  box-sizing: border-box;
}
.ui-group {
  display: flex;
  align-items: center;
  gap: 6px;
}
.ui-label {
  font-size: 14px;
  font-weight: 500;
}
.control-button {
  padding: 6px 14px;
  border: 1px solid #dadce0;
  background: #f8f9fa;
  border-radius: 5px;
  font-size: 14px;
  color: #333;
  cursor: pointer;
  transition: background 0.2s, border 0.2s;
  outline: none;
  height: 32px;
  min-height: 32px;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
}
.control-button:hover {
  background: #e3eafc;
  border-color: #a0c3ff;
}
.summary-info-area {
  flex: 0 0 auto;
  background-color: #fff;
  padding: 10px 15px;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  height: 52px;
  box-sizing: border-box;
}

/* ----- 공통 테이블/타이틀 스타일 (CaseControl과 동일) ----- */
.table-title,
.table-title--with-copy {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: auto;
  min-width: 0;
  margin: 20px 20px 10px 20px;
  box-sizing: border-box;
}
.selected-variable-details__title-dot {
  display: inline-block;
  width: 0.4em;
  height: 0.4em;
  background-color: #1a73e8;
  margin-right: 0.4em;
  vertical-align: middle;
  border-radius: 50%;
}

/* --- 분석 테이블 스타일 --- */
.analysis-table {
  font-size: 13px;
  border-collapse: collapse;
  margin: 0 20px 20px 20px;
  table-layout: fixed;
  width: 100%;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
  max-width: calc(100% - 40px); /* 좌우 마진 20px 합 */
}
.analysis-table th,
.analysis-table td {
  border: 1px solid #ddd;
  padding: 6px 8px;
  text-align: center;
  white-space: nowrap;
  vertical-align: middle;
  font-family: inherit;
}
.analysis-table thead th {
  background-color: #f2f2f2;
  font-weight: bold;
  position: sticky;
  z-index: 1;
  box-shadow: inset 0 -1px 0 #ddd;
}
/* 첫 번째 헤더 행 (rowspan=2인 셀들) */
.analysis-table thead tr:first-child th {
  top: 0;
  z-index: 2;
}
/* 두 번째 헤더 행 */
.analysis-table thead tr:nth-child(2) th {
  top: 33px; /* 첫 번째 행의 실제 높이에 맞춤 (padding 포함) */
  z-index: 1;
}

/* 헤더 그룹 스타일 */
.header-item {
  width: 15%;
  background-color: #e8e8e8 !important;
}
.header-group-case {
  background-color: #fff0f0 !important;
}
.header-stat {
  width: 8%;
}
.header-sub {
  font-weight: normal;
  background-color: #f9f9f9 !important;
  width: 7%;
}

/* --- 각 테이블-차트 쌍을 담는 Row 스타일 --- */
.output-row {
  display: flex;
  gap: 30px;
  align-items: flex-start; /* 테이블 상단 정렬 */
}

/* --- 테이블/차트 출력 영역 스타일 --- */
.output-area {
  display: flex;
  flex-direction: column;
  gap: 30px;
  margin: 20px 30px 30px 30px; /* CohortStudy와 동일 */
}

/* --- 분석 결과 테이블 컨테이너 스타일 --- */
.analysis-table-container {
  flex: 1;
  margin: 0; /* flush inside output area which already has margin */
  display: flex;
  flex-direction: column;
  background-color: #fff;
  box-sizing: border-box;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  border-radius: 12px;
  overflow-x: auto; /* 테이블 넓으면 가로 스크롤 */
  overflow: visible;
  padding: 0 0 0 0;
}

/* override table margin to avoid overflow */
.analysis-table {
  margin: 0 20px 20px 20px; /* keep horizontal margin but ensure container has padding to absorb */
}

/* 테이블 바디 스타일 */
.analysis-table tbody tr:hover {
  background-color: #f5f5f5;
}
.cell-item {
  text-align: left !important;
  white-space: normal !important;
  font-weight: 500;
  word-break: keep-all;
  font-family: inherit;
}
.cell-count {
  font-family: inherit;
  font-weight: normal;
}
.cell-total {
  font-weight: normal;
  font-family: inherit;
}
.cell-stat {
  font-family: "SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace;
  font-size: 0.95em;
  letter-spacing: 0.02em;
}
.no-data-row {
  text-align: center !important;
  padding: 20px;
  color: #888;
  font-style: italic;
  font-family: inherit;
}

/* --- 버튼 그룹 & 복사 버튼 스타일 (CaseControl과 동일) --- */
.button-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.copy-chart-button {
  padding: 6px 10px;
  border: none;
  background-color: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  color: #1a73e8;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s ease;
}
.copy-chart-button:hover {
  background-color: rgba(26, 115, 232, 0.1);
}
.copy-chart-button:active {
  background-color: rgba(26, 115, 232, 0.2);
}
.button-icon {
  display: flex;
  align-items: center;
}
.button-text {
  font-family: "Noto Sans KR", sans-serif;
  font-weight: 400;
}
.copy-tooltip {
  position: absolute;
  left: 50%;
  top: 110%;
  transform: translateX(-50%);
  z-index: 10;
  pointer-events: none;
  animation: fadeInOut 1.5s;
}
.copy-tooltip.check-tooltip {
  width: 32px;
  height: 32px;
  padding: 0;
  background: none;
  box-shadow: none;
  display: flex;
  align-items: center;
  justify-content: center;
}
@keyframes fadeInOut {
  0% { opacity: 0; }
  10% { opacity: 0.95; }
  90% { opacity: 0.95; }
  100% { opacity: 0; }
}
</style> 