<template>
  <div class="app">
    <header class="app-header">
      <h1 class="app-title">Easy-Epidemiology Web v1.0</h1>
    </header>

    <div class="dashboard">
      <div class="summary-bar">
        <div class="summary-bar__title">
          <img
            src="https://www.gstatic.com/mobilesdk/160503_mobilesdk/logo/2x/firebase_28dp.png"
            alt="Placeholder-Logo"
            class="summary-bar__logo"
          />
          코호트 연구
        </div>
      </div>

      <div class="top-info-wrapper">
        <div class="controls-area">
          <div class="ui-group">
            <label class="ui-label">폰트 크기:</label>
            <button class="control-button" @click="cycleFontSize">
              {{ tableFontSize }}px
            </button>
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
                <span class="selected-variable-details__title-dot"></span>&nbsp;요인별 표 분석 결과(코호트)
              </span>
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
            <table
              class="analysis-table"
              :style="{ fontSize: tableFontSize + 'px' }"
            >
              <thead>
                <tr>
                  <th rowspan="2" class="header-item">요인(식단)</th>
                  <th colspan="3" class="header-group-exposed">
                    섭취자(노출군)
                  </th>
                  <th colspan="3" class="header-group-unexposed">
                    비섭취자(비노출군)
                  </th>
                  <th rowspan="2" class="header-stat">카이제곱<br />P-value</th>
                  <th rowspan="2" class="header-stat">
                    상대위험비<br />Relative Risk<br />
                  </th>
                  <th colspan="2" class="header-stat">95% 신뢰구간</th>
                </tr>
                <tr>
                  <th class="header-sub">대상자수</th>
                  <th class="header-sub">환자수</th>
                  <th class="header-sub">발병률(%)</th>
                  <th class="header-sub">대상자수</th>
                  <th class="header-sub">환자수</th>
                  <th class="header-sub">발병률(%)</th>
                  <th class="header-sub">하한</th>
                  <th class="header-sub">상한</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-if="
                    !cohortAnalysisResults || cohortAnalysisResults.length === 0
                  "
                >
                  <td colspan="11" class="no-data-row">
                    분석할 데이터가 없거나 Vuex 스토어 연결을 확인하세요.
                  </td>
                </tr>
                <tr
                  v-for="(result, index) in cohortAnalysisResults"
                  :key="index"
                  class="data-row"
                  :class="{ 'significant-row': result.pValue !== null && result.pValue < 0.05 }"
                >
                  <td class="cell-item">{{ result.item }}</td>
                  <td class="cell-total">{{ result.rowTotal_Exposed }}</td>
                  <td class="cell-count">{{ result.a_obs }}</td>
                  <td class="cell-stat">
                    {{ result.incidence_exposed_formatted }}
                  </td>
                  <td class="cell-total">{{ result.rowTotal_Unexposed }}</td>
                  <td class="cell-count">{{ result.c_obs }}</td>
                  <td class="cell-stat">
                    {{ result.incidence_unexposed_formatted }}
                  </td>
                  <td
                    class="cell-stat value-pvalue"
                    :class="{
                      significant:
                        result.pValue !== null && result.pValue < 0.05,
                    }"
                  >
                    {{
                      result.pValue !== null
                        ? result.pValue < 0.001
                          ? "<0.001"
                          : result.pValue.toFixed(3)
                        : "N/A"
                    }}
                  </td>
                  <td class="cell-stat">{{ result.relativeRisk }}</td>
                  <td class="cell-stat">{{ result.rr_ci_lower }}</td>
                  <td class="cell-stat">{{ result.rr_ci_upper }}</td>
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
import { computed, ref } from "vue";
import { useStore } from "vuex";
import { jStat } from "jstat";

const store = useStore();

const fontSizes = [12, 14, 16];
const tableFontSize = ref(14);

const getNextValue = (currentValue, valueArray) => {
  const currentIndex = valueArray.indexOf(currentValue);
  const nextIndex = (currentIndex + 1) % valueArray.length;
  return valueArray[nextIndex];
};

const cycleFontSize = () => {
  tableFontSize.value = getNextValue(tableFontSize.value, fontSizes);
};

const headers = computed(() => store.getters.headers || { diet: [] });
const rows = computed(() => store.getters.rows || []);

const isTableCopied = ref(false);
const copyTableToClipboard = async () => {
  let tableEl = null;
  const tableContainer = document.querySelector('.analysis-table-container');
  if (tableContainer) {
    tableEl = tableContainer.querySelector('.analysis-table');
  }
  if (!tableEl) {
    tableEl = document.querySelector('.analysis-table');
  }
  if (!tableEl) {
    isTableCopied.value = false;
    return;
  }
  try {
    const tempTable = tableEl.cloneNode(true);
    tempTable.style.borderCollapse = 'collapse';
    tempTable.style.border = '1px solid #888';
    tempTable.style.fontSize = '14px';
    tempTable.style.width = '100%';
    tempTable.querySelectorAll('th').forEach(th => {
      th.style.border = '1px solid #888';
      th.style.padding = '8px 4px';
      th.style.background = '#f2f2f2';
      th.style.fontWeight = 'bold';
      th.style.textAlign = 'center';
    });
    tempTable.querySelectorAll('td').forEach(td => {
      td.style.border = '1px solid #888';
      td.style.padding = '8px 4px';
      td.style.textAlign = 'center';
    });
    tempTable.querySelectorAll('tbody tr').forEach(tr => {
      const firstTd = tr.querySelector('td');
      if (firstTd) firstTd.style.textAlign = 'left';
    });
    const html = tempTable.outerHTML;
    const text = tableEl.innerText;
    if (navigator.clipboard && window.ClipboardItem) {
      await navigator.clipboard.write([
        new window.ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([text], { type: 'text/plain' })
        })
      ]);
    } else {
      await navigator.clipboard.writeText(text);
    }
    isTableCopied.value = true;
    setTimeout(() => (isTableCopied.value = false), 1500);
  } catch (e) {
    isTableCopied.value = false;
  }
};

// --- 카이제곱 항 계산 함수 (Yates' 보정 포함) ---
const calculateChiTerm = (observed, expected) => {
  // 기대빈도가 0이면 카이제곱 검정 적용 불가
  if (expected === 0) {
    console.warn(`기대빈도가 0입니다. observed: ${observed}, expected: ${expected}`);
    return 0; // 이 경우는 상위에서 canApplyChiSquare로 미리 걸러짐
  }
  
  const diff = Math.abs(observed - expected);
  // Yates' 보정: 절대값 차이에서 0.5를 빼줌 (최소 0)
  const correctedDiff = Math.max(0, diff - 0.5);
  return (correctedDiff * correctedDiff) / expected;
};

// --- 코호트 분석 결과 계산 ---
const cohortAnalysisResults = computed(() => {
  if (
    !headers.value?.diet ||
    headers.value.diet.length === 0 ||
    rows.value.length === 0
  ) {
    console.warn(
      "코호트 분석을 위한 headers.diet 또는 rows 데이터가 없습니다."
    );
    return [];
  }

  const z_crit = jStat.normal.inv(0.975, 0, 1);

  return headers.value.diet.map((dietItem, index) => {
    const factorName = dietItem;

    let a_obs = 0,
      b_obs = 0,
      c_obs = 0,
      d_obs = 0;

    rows.value.forEach((row) => {
      const isPatient = row.isPatient;
      const dietValue =
        row.dietInfo && row.dietInfo.length > index
          ? row.dietInfo[index]
          : null;

      if (dietValue === "1") {
        if (isPatient === "1") a_obs++;
        else if (isPatient === "0") b_obs++;
      } else if (dietValue === "0") {
        if (isPatient === "1") c_obs++;
        else if (isPatient === "0") d_obs++;
      }
    });

    const rowTotal_Exposed = a_obs + b_obs;
    const rowTotal_Unexposed = c_obs + d_obs;
    const colTotal_Disease = a_obs + c_obs;
    const colTotal_NoDisease = b_obs + d_obs;
    const grandTotal = rowTotal_Exposed + rowTotal_Unexposed;

    let a_exp = NaN,
      b_exp = NaN,
      c_exp = NaN,
      d_exp = NaN;
    let adj_chi = null;
    let pValue = null;
    let relativeRisk = "N/A";
    let rr_ci_lower = "N/A";
    let rr_ci_upper = "N/A";

    // --- 발병률 계산 및 포맷팅 ---
    let incidence_exposed_formatted = "N/A";
    let incidence_unexposed_formatted = "N/A";

    if (rowTotal_Exposed > 0) {
      const incidence_exposed = (a_obs / rowTotal_Exposed) * 100;
      incidence_exposed_formatted = incidence_exposed.toFixed(1) + "%"; // 소수점 첫째자리 + %
    }
    if (rowTotal_Unexposed > 0) {
      const incidence_unexposed = (c_obs / rowTotal_Unexposed) * 100;
      incidence_unexposed_formatted = incidence_unexposed.toFixed(1) + "%"; // 소수점 첫째자리 + %
    }

    // --- 카이제곱 및 P-value 계산 ---
    if (grandTotal > 0) {
      // 기대 빈도 계산
      a_exp = (rowTotal_Exposed * colTotal_Disease) / grandTotal;
      b_exp = (rowTotal_Exposed * colTotal_NoDisease) / grandTotal;
      c_exp = (rowTotal_Unexposed * colTotal_Disease) / grandTotal;
      d_exp = (rowTotal_Unexposed * colTotal_NoDisease) / grandTotal;

      // 카이제곱 검정 적용 가능성 검사
      // 1. 모든 기대빈도가 0보다 커야 함
      // 2. 특정 식단의 값이 모두 같으면 (rowTotal_Exposed = 0 또는 rowTotal_Unexposed = 0) 검정 불가
      // 3. 모든 사람이 환자이거나 모든 사람이 정상이면 (colTotal_Disease = 0 또는 colTotal_NoDisease = 0) 검정 불가
      const canApplyChiSquare = rowTotal_Exposed > 0 && rowTotal_Unexposed > 0 && 
                                colTotal_Disease > 0 && colTotal_NoDisease > 0;

      if (canApplyChiSquare) {
        // Yates' 보정 카이제곱 값 계산
      const term1 = calculateChiTerm(a_obs, a_exp);
      const term2 = calculateChiTerm(b_obs, b_exp);
      const term3 = calculateChiTerm(c_obs, c_exp);
      const term4 = calculateChiTerm(d_obs, d_exp);
      adj_chi = term1 + term2 + term3 + term4;

        // P-value 계산 (자유도=1)
      if (isFinite(adj_chi) && adj_chi >= 0) {
        try {
          pValue = 1 - jStat.chisquare.cdf(adj_chi, 1);
            if (isNaN(pValue)) pValue = null; // 계산 불가 시 null 처리
        } catch (e) {
          console.error(`P-value calculation error for item ${factorName}:`, e);
          pValue = null;
        }
      } else {
          adj_chi = null; // 카이제곱 계산 불가 시 null 처리
        }
      } else {
        // 카이제곱 검정 적용 불가
        adj_chi = null;
        pValue = null;
        console.log(`카이제곱 검정 적용 불가 - ${factorName}: rowTotal_Exposed=${rowTotal_Exposed}, rowTotal_Unexposed=${rowTotal_Unexposed}, colTotal_Disease=${colTotal_Disease}, colTotal_NoDisease=${colTotal_NoDisease}`);
      }
    }

    // --- RR 및 95% CI 계산 ---
    // 카이제곱 검정이 불가능한 경우 RR 계산도 의미가 없음
    if (rowTotal_Exposed > 0 && rowTotal_Unexposed > 0) {
    const hasZeroCell =
      a_obs === 0 || b_obs === 0 || c_obs === 0 || d_obs === 0;
    const a_adj = hasZeroCell ? a_obs + 0.5 : a_obs;
    const b_adj = hasZeroCell ? b_obs + 0.5 : b_obs;
    const c_adj = hasZeroCell ? c_obs + 0.5 : c_obs;
    const d_adj = hasZeroCell ? d_obs + 0.5 : d_obs;
    const total_exposed_adj = a_adj + b_adj;
    const total_unexposed_adj = c_adj + d_adj;

    try {
      const risk_exposed =
        total_exposed_adj > 0 ? a_adj / total_exposed_adj : 0;
      const risk_unexposed =
        total_unexposed_adj > 0 ? c_adj / total_unexposed_adj : 0;

      let rr_calc = NaN;
      if (risk_unexposed > 0) {
        rr_calc = risk_exposed / risk_unexposed;
      } else if (risk_exposed > 0 && risk_unexposed === 0) {
        rr_calc = Infinity;
      } else {
        rr_calc = NaN;
      }

      if (isFinite(rr_calc) && rr_calc >= 0) {
        relativeRisk = rr_calc.toFixed(3);
        const logRR = Math.log(rr_calc <= 0 ? Number.EPSILON : rr_calc);
        let se_logRR = NaN;
        const term_se1 = a_adj * total_exposed_adj;
        const term_se2 = c_adj * total_unexposed_adj;

        if (term_se1 > 0 && term_se2 > 0) {
          se_logRR = Math.sqrt(b_adj / term_se1 + d_adj / term_se2);
        }

        if (isFinite(se_logRR)) {
          const logCI_lower = logRR - z_crit * se_logRR;
          const logCI_upper = logRR + z_crit * se_logRR;
          rr_ci_lower = Math.exp(logCI_lower).toFixed(3);
          rr_ci_upper = Math.exp(logCI_upper).toFixed(3);
          if (rr_calc === 0) rr_ci_lower = "0.000";
          if (parseFloat(rr_ci_upper) === 0) rr_ci_upper = "0.000";
        } else {
          rr_ci_lower = "N/A";
          rr_ci_upper = "N/A";
        }
      } else if (rr_calc === Infinity) {
        relativeRisk = "Inf";
        let se_logRR_inf = NaN;
        const term_se1_inf = a_adj * total_exposed_adj;
        const term_se2_inf = c_adj * total_unexposed_adj;
        if (term_se1_inf > 0 && term_se2_inf > 0) {
          se_logRR_inf = Math.sqrt(b_adj / term_se1_inf + d_adj / term_se2_inf);
        }
        if (isFinite(se_logRR_inf)) {
          try {
            const approx_logRR = Math.log(risk_exposed / Number.EPSILON);
            const logCI_lower_inf = approx_logRR - z_crit * se_logRR_inf;
            rr_ci_lower = Math.exp(logCI_lower_inf).toFixed(3);
          } catch {
            rr_ci_lower = "N/A";
          }
        } else {
          rr_ci_lower = "N/A";
        }
        rr_ci_upper = "Inf";
      } else {
        relativeRisk = "N/A";
        rr_ci_lower = "N/A";
        rr_ci_upper = "N/A";
      }
    } catch (e) {
      console.error(`RR/CI calculation error for item ${factorName}:`, e);
      relativeRisk = "Error";
      rr_ci_lower = "Error";
      rr_ci_upper = "Error";
      }
    } else {
      // 노출군 또는 비노출군이 없는 경우 RR 계산 불가
      relativeRisk = "N/A";
      rr_ci_lower = "N/A";
      rr_ci_upper = "N/A";
      console.log(`RR 계산 불가 - ${factorName}: 노출군 또는 비노출군이 없음`);
    }

    // --- 최종 결과 객체 반환 (발병률 추가) ---
    return {
      item: factorName,
      a_obs, // 노출군 환자수 (a)
      rowTotal_Exposed, // 노출군 대상자수 (a+b)
      incidence_exposed_formatted, // 노출군 발병률 (%)
      c_obs, // 비노출군 환자수 (c)
      rowTotal_Unexposed, // 비노출군 대상자수 (c+d)
      incidence_unexposed_formatted, // 비노출군 발병률 (%)
      adj_chi,
      pValue,
      relativeRisk,
      rr_ci_lower,
      rr_ci_upper,
    };
  });
});
</script>

<style scoped>
/* CSS는 이전과 동일 */
/* --- 기본 앱 및 대시보드 스타일 --- */
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
  margin: 20px auto;
  background-color: #f0f0f0;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
}
.summary-bar {
  height: 40px;
  display: flex;
  align-items: center;
  font-size: 20px;
  color: white;
  background-color: #1a73e8; /* 색상 유지 */
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
}

/* --- 상단 정보 래퍼 스타일 --- */
.top-info-wrapper {
  display: flex;
  gap: 30px;
  margin: 20px 30px 0 30px;
  align-items: stretch;
}

/* --- 입력 컨트롤 영역 스타일 --- */
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

/* --- UI 컨트롤 스타일 --- */
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

/* --- 요약 정보 영역 스타일 --- */
.summary-info-area {
  flex: 0 0 auto;
  background-color: #fff;
  padding: 10px 15px;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  height: 52px; /* controls-area와 높이 맞춤 (padding 10*2 + button 32) */
  box-sizing: border-box;
}

/* --- 테이블/차트 출력 영역 스타일 --- */
.output-area {
  display: flex;
  flex-direction: column;
  gap: 30px;
  margin: 20px 30px 30px 30px;
}

/* --- 각 테이블-차트 쌍을 담는 Row 스타일 --- */
.output-row {
  display: flex;
  gap: 30px;
  align-items: flex-start; /* 테이블 상단 정렬 */
}

/* --- 분석 결과 테이블 컨테이너 스타일 --- */
.analysis-table-container {
  flex: 1;
  margin: 0;
  display: flex;
  flex-direction: column;
  background-color: #fff;
  box-sizing: border-box;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  border-radius: 12px;
  overflow-x: auto;
  overflow: visible;
}
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
  background-color: #1a73e8; /* 색상 유지 */
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
}
.analysis-table th,
.analysis-table td {
  border: 1px solid #ddd;
  padding: 6px 8px;
  text-align: center;
  white-space: nowrap;
  vertical-align: middle;
}
.analysis-table thead th {
  background-color: #f2f2f2;
  font-weight: bold;
  position: sticky;
  top: 0;
  z-index: 1;
  box-shadow: inset 0 -1px 0 #ddd;
}
/* 헤더 그룹 스타일 (명칭만 바뀜) */
.header-item {
  width: 15%;
  background-color: #e8e8e8 !important;
}
.header-group-exposed {
  background-color: #fff0f0 !important;
}
.header-group-unexposed {
  background-color: #f0f5ff !important;
}
.header-stat {
  width: 8%;
}
.header-sub {
  font-weight: normal;
  background-color: #f9f9f9 !important;
  width: 7%; /* 너비 유지 */
}

/* 테이블 바디 스타일 */
.analysis-table tbody tr:hover {
  background-color: #f5f5f5;
}
.data-row td {
}
.cell-item {
  text-align: left !important;
  white-space: normal !important;
  font-weight: 500;
  word-break: keep-all;
}
.cell-count {
  /* 환자수 */
}
.cell-total {
  /* 대상자수 */
  font-weight: bold;
}
.cell-stat {
  /* 통계값들 (발병률 포함) */
  font-family: Consolas, monospace;
}
/* 특정 값 스타일 (변경 없음) */
.value-adj-chi {
  font-weight: bold;
  color: #c0392b;
}
.value-pvalue {
}
.value-pvalue.significant {
  font-weight: bold;
  color: #e74c3c;
}
.no-data-row td {
  text-align: center !important;
  padding: 20px;
  color: #888;
  font-style: italic;
}
.significant-row {
  background-color: #fffbe6 !important;
  font-weight: bold;
  color: red !important;
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
.copy-tooltip.check-tooltip svg {
  display: block;
}
@keyframes fadeInOut {
  0% { opacity: 0; }
  10% { opacity: 0.95; }
  90% { opacity: 0.95; }
  100% { opacity: 0; }
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
</style>
