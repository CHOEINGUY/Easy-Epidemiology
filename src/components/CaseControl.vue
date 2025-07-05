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
          환자대조군 연구
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
                <span class="selected-variable-details__title-dot"></span>&nbsp;요인별 표 분석 결과
                <span v-if="isOrFilterActive" class="filter-status">
                  (오즈비 ≥ 2.0 필터 적용)
                </span>
              </span>
              <div class="button-group">
                <button @click="toggleOrFilter" class="filter-button" :class="{ active: isOrFilterActive }">
                  <span class="button-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46"></polygon>
                    </svg>
                  </span>
                  <span class="button-text">OR ≥ 2.0</span>
                </button>
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
            </div>
            <table
              class="analysis-table"
              :style="{ fontSize: tableFontSize + 'px', '--table-font-size': tableFontSize + 'px' }"
            >
              <thead>
                <tr>
                  <th rowspan="2" class="header-item">요인(식단)</th>
                  <th colspan="3" class="header-group-case">환자군</th>
                  <th colspan="3" class="header-group-control">대조군</th>
                  <th rowspan="2" class="header-stat">카이제곱<br />P-value</th>
                  <th rowspan="2" class="header-stat">
                    오즈비<br />(Odds Ratio)
                  </th>
                  <th colspan="2" class="header-stat">95% 신뢰구간</th>
                </tr>
                <tr>
                  <th class="header-sub">섭취자</th>
                  <th class="header-sub">비섭취자</th>
                  <th class="header-sub">합계</th>
                  <th class="header-sub">섭취자</th>
                  <th class="header-sub">비섭취자</th>
                  <th class="header-sub">합계</th>
                  <th class="header-sub">하한</th>
                  <th class="header-sub">상한</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="!filteredAnalysisResults || filteredAnalysisResults.length === 0">
                  <td colspan="11" class="no-data-row">
                    {{ isOrFilterActive ? '오즈비 2.0 이상인 데이터가 없습니다.' : '분석할 데이터가 없거나 Vuex 스토어 연결을 확인하세요.' }}
                  </td>
                </tr>
                <tr
                  v-for="(result, index) in filteredAnalysisResults"
                  :key="index"
                  class="data-row"
                  :class="{ 'significant-row': result.pValue !== null && result.pValue < 0.05 }"
                >
                  <td class="cell-item">{{ result.item }}</td>
                  <td class="cell-count">{{ result.b_obs }}</td>
                  <td class="cell-count">{{ result.c_obs }}</td>
                  <td class="cell-total">{{ result.rowTotal_Case }}</td>
                  <td class="cell-count">{{ result.e_obs }}</td>
                  <td class="cell-count">{{ result.f_obs }}</td>
                  <td class="cell-total">{{ result.rowTotal_Control }}</td>
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
                  <td class="cell-stat">{{ result.oddsRatio }}</td>
                  <td class="cell-stat">{{ result.ci_lower }}</td>
                  <td class="cell-stat">{{ result.ci_upper }}</td>
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
// jStat 라이브러리 import
import { jStat } from 'jstat';

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

// Vuex 스토어에서 headers와 rows 데이터 가져오기
const headers = computed(() => store.getters.headers || { diet: [] });
const rows = computed(() => store.getters.rows || []);

// 오즈비 필터링 상태
const isOrFilterActive = ref(false);

// 오즈비 필터 토글 함수
const toggleOrFilter = () => {
  isOrFilterActive.value = !isOrFilterActive.value;
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

// --- 분석 결과 계산 (Computed Property) ---
const analysisResults = computed(() => {
  if (
    !headers.value?.diet ||
    headers.value.diet.length === 0 ||
    rows.value.length === 0
  ) {
    console.warn('분석을 위한 headers.diet 또는 rows 데이터가 없습니다.');
    return [];
  }

  // 95% CI를 위한 Z-score (양측 검정, 표준정규분포에서 0.975에 해당하는 값)
  const z_crit = jStat.normal.inv(0.975, 0, 1); // 약 1.96

  return headers.value.diet.map((dietItem, index) => {
    const factorName = dietItem;
    let b_obs = 0, // 환자군 + 요인 노출
      c_obs = 0, // 환자군 + 요인 비노출
      e_obs = 0, // 대조군 + 요인 노출
      f_obs = 0; // 대조군 + 요인 비노출

    // 데이터 순회하며 각 셀 관측값 계산
    rows.value.forEach((row) => {
      const isPatient = row.isPatient;
      const dietValue =
        row.dietInfo && row.dietInfo.length > index
          ? row.dietInfo[index]
          : null;

      if (isPatient === '1') {
        // 환자군
        if (dietValue === '1') b_obs++;
        else if (dietValue === '0') c_obs++;
      } else if (isPatient === '0') {
        // 대조군
        if (dietValue === '1') e_obs++;
        else if (dietValue === '0') f_obs++;
      }
    });

    // 각 행/열 합계 계산
    const rowTotal_Case = b_obs + c_obs;
    const rowTotal_Control = e_obs + f_obs;
    const colTotal_Exposed = b_obs + e_obs;
    const colTotal_Unexposed = c_obs + f_obs;
    const grandTotal = rowTotal_Case + rowTotal_Control;

    // 결과 변수 초기화
    let b_exp = NaN,
      c_exp = NaN,
      e_exp = NaN,
      f_exp = NaN;
    let adj_chi = null; // Yates' 보정 카이제곱 값
    let pValue = null; // P-value
    let oddsRatio = 'N/A'; // Odds Ratio 추정치
    let ci_lower = 'N/A'; // 95% CI 하한
    let ci_upper = 'N/A'; // 95% CI 상한

    // --- 카이제곱 및 P-value 계산 ---
    if (grandTotal > 0) {
      // 기대 빈도 계산
      b_exp = (rowTotal_Case * colTotal_Exposed) / grandTotal;
      c_exp = (rowTotal_Case * colTotal_Unexposed) / grandTotal;
      e_exp = (rowTotal_Control * colTotal_Exposed) / grandTotal;
      f_exp = (rowTotal_Control * colTotal_Unexposed) / grandTotal;

      // 카이제곱 검정 적용 가능성 검사
      // 1. 모든 기대빈도가 0보다 커야 함
      // 2. 특정 식단의 값이 모두 같으면 (colTotal_Exposed = 0 또는 colTotal_Unexposed = 0) 검정 불가
      const canApplyChiSquare = colTotal_Exposed > 0 && colTotal_Unexposed > 0 && 
                                rowTotal_Case > 0 && rowTotal_Control > 0;

      if (canApplyChiSquare) {
      // Yates' 보정 카이제곱 값 계산
        const term1 = calculateChiTerm(b_obs, b_exp);
        const term2 = calculateChiTerm(c_obs, c_exp);
        const term3 = calculateChiTerm(e_obs, e_exp);
        const term4 = calculateChiTerm(f_obs, f_exp);
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
        // 카이제곱 검정 적용 불가 (모든 값이 동일하거나 한 그룹이 비어있음)
        adj_chi = null;
        pValue = null;
        console.log(`카이제곱 검정 적용 불가 - ${factorName}: colTotal_Exposed=${colTotal_Exposed}, colTotal_Unexposed=${colTotal_Unexposed}`);
      }
    }

    // --- Odds Ratio 및 95% CI 계산 ---
    // 카이제곱 검정이 불가능한 경우 OR 계산도 의미가 없음
    if (colTotal_Exposed > 0 && colTotal_Unexposed > 0 && 
        rowTotal_Case > 0 && rowTotal_Control > 0) {
    // 0인 셀이 있는지 확인 (신뢰구간 계산 시 0으로 나누는 것을 방지하기 위함)
      const hasZeroCell =
      b_obs === 0 || c_obs === 0 || e_obs === 0 || f_obs === 0;

      // 0.5 보정 적용: 0인 셀이 하나라도 있으면 모든 셀에 0.5를 더함 (Haldane-Anscombe correction)
      const b_adj = hasZeroCell ? b_obs + 0.5 : b_obs;
      const c_adj = hasZeroCell ? c_obs + 0.5 : c_obs;
      const e_adj = hasZeroCell ? e_obs + 0.5 : e_obs;
      const f_adj = hasZeroCell ? f_obs + 0.5 : f_obs;

      try {
      // (보정된 값으로) Odds Ratio 계산: OR = (a*d)/(b*c) -> (b_adj * f_adj) / (c_adj * e_adj)
        const or_calc = (b_adj * f_adj) / (c_adj * e_adj);

        if (isFinite(or_calc) && or_calc > 0) {
        // OR 값 포맷팅
          oddsRatio = or_calc.toFixed(3);

          // Log Odds Ratio 계산
          const logOR = Math.log(or_calc);

          // Standard Error of Log Odds Ratio 계산: sqrt(1/a + 1/b + 1/c + 1/d)
          const se_logOR = Math.sqrt(
            1 / b_adj + 1 / c_adj + 1 / e_adj + 1 / f_adj
          );

          // 신뢰구간 계산 가능 여부 확인
          if (isFinite(se_logOR)) {
          // Log Scale에서 CI 계산
            const logCI_lower = logOR - z_crit * se_logOR;
            const logCI_upper = logOR + z_crit * se_logOR;

            // 원래 스케일(OR)로 변환 (지수 함수 적용) 및 포맷팅
            ci_lower = Math.exp(logCI_lower).toFixed(3);
            ci_upper = Math.exp(logCI_upper).toFixed(3);
          }
        // else: se_logOR 계산 불가 시 ci_lower, ci_upper는 초기값 "N/A" 유지
        } else if (or_calc === 0) {
        // OR이 0인 경우
          oddsRatio = '0.000';
          ci_lower = '0.000'; // 하한은 0
          // 상한 계산 (se_logOR이 계산 가능해야 함)
          const se_logOR_for_zero = Math.sqrt(
            1 / b_adj + 1 / c_adj + 1 / e_adj + 1 / f_adj
          );
          if (isFinite(se_logOR_for_zero)) {
          // 0에 매우 작은 값을 더해 log 계산 시 음의 무한대 방지
            const logOR_zero = Math.log(or_calc + Number.EPSILON); // Number.EPSILON 사용
            const logCI_upper_zero = logOR_zero + z_crit * se_logOR_for_zero;
            ci_upper = Math.exp(logCI_upper_zero).toFixed(3);
            // 상한이 매우 작은 값으로 나올 수 있음 (예: 0.000)
            if (parseFloat(ci_upper) === 0) ci_upper = '0.000';
          } else {
            ci_upper = 'N/A';
          }
        } else {
        // OR이 무한대(Inf) 또는 계산 불가(NaN)인 경우
        // 분모(c_adj * e_adj)가 0에 가까워 발생 가능
          oddsRatio = c_adj * e_adj === 0 ? 'Inf' : 'N/A'; // 조건 수정
          ci_lower = 'N/A';
          ci_upper = 'N/A';
          // 만약 b_adj*f_adj도 0이면 NaN이 될 수 있음
          if (isNaN(or_calc)) oddsRatio = 'N/A';
        }
      } catch (e) {
      // 계산 중 예외 발생 시
        console.error(`OR/CI calculation error for item ${factorName}:`, e);
        oddsRatio = 'Error';
        ci_lower = 'Error';
        ci_upper = 'Error';
      }
    } else {
      // 환자군/대조군 또는 노출/비노출군이 없는 경우 OR 계산 불가
      oddsRatio = 'N/A';
      ci_lower = 'N/A';
      ci_upper = 'N/A';
      console.log(`OR 계산 불가 - ${factorName}: 환자군/대조군 또는 노출/비노출군이 없음`);
    }

    // --- 최종 결과 객체 반환 ---
    return {
      item: factorName,
      b_obs,
      c_obs,
      rowTotal_Case,
      e_obs,
      f_obs,
      rowTotal_Control,
      adj_chi,
      pValue,
      oddsRatio, // 계산된 OR 값
      ci_lower, // 계산된 CI 하한
      ci_upper // 계산된 CI 상한
    };
  });
});

// --- 필터링된 분석 결과 (오즈비 2.0 이상) ---
const filteredAnalysisResults = computed(() => {
  if (!isOrFilterActive.value) {
    return analysisResults.value;
  }
  
  return analysisResults.value.filter(result => {
    // 오즈비가 숫자인지 확인하고 2.0 이상인지 체크
    const orValue = parseFloat(result.oddsRatio);
    return !isNaN(orValue) && orValue >= 2.0;
  });
});

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
</script>

<style scoped>
/* CSS 스타일은 원본과 동일하게 유지 */
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
  flex: 1; /* Row 내에서 남은 가로 공간을 모두 차지 */
  margin: 0;
  display: flex;
  flex-direction: column;
  background-color: #fff;
  box-sizing: border-box;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  border-radius: 12px;
  overflow-x: auto; /* 테이블 넓으면 가로 스크롤 */
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
  background-color: #1a73e8;
  margin-right: 0.4em;
  vertical-align: middle;
  border-radius: 50%;
}

/* --- 버튼 그룹 스타일 --- */
.button-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

/* --- 필터 상태 표시 스타일 --- */
.filter-status {
  font-size: 14px;
  color: #1a73e8;
  font-weight: normal;
}

/* --- 필터 버튼 스타일 --- */
.filter-button {
  padding: 6px 10px;
  border: 1px solid #ddd;
  background-color: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  color: #666;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s ease;
}

.filter-button:hover {
  background-color: rgba(26, 115, 232, 0.1);
  border-color: #1a73e8;
  color: #1a73e8;
}

.filter-button.active {
  background-color: #1a73e8;
  border-color: #1a73e8;
  color: white;
}

.filter-button.active:hover {
  background-color: #1557b8;
}

/* --- 분석 테이블 스타일 --- */
.analysis-table {
  font-size: 13px;
  border-collapse: collapse;
  margin: 0 20px 20px 20px;
  table-layout: fixed;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
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
  top: 0;
  z-index: 1;
  box-shadow: inset 0 -1px 0 #ddd;
}
/* 헤더 그룹 스타일 */
.header-item {
  width: 15%;
  background-color: #e8e8e8 !important;
}
.header-group-case {
  background-color: #fff0f0 !important;
}
.header-group-control {
  background-color: #f0f5ff !important;
}
.header-stat {
  width: 8%;
}
.header-sub {
  font-weight: normal;
  background-color: #f9f9f9 !important;
  width: 7%;
}

/* 테이블 바디 스타일 */
.analysis-table tbody tr:hover {
  background-color: #f5f5f5;
}
.data-row td {
  font-family: inherit;
}
.cell-item {
  text-align: left !important;
  white-space: normal !important; /* 긴 요인 이름 줄바꿈 허용 */
  font-weight: 500;
  word-break: keep-all; /* 단어 단위 줄바꿈 */
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
.value-adj-chi {
  font-weight: bold;
  color: #c0392b;
  font-family: inherit;
}
.value-pvalue {
  font-family: "SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace;
  font-size: 0.95em;
  letter-spacing: 0.02em;
  font-weight: normal;
} /* P-value 기본 스타일 */
.value-pvalue.significant {
  /* P-value < 0.05 일 때 */
  font-weight: bold;
  color: #e74c3c; /* 강조 색상 */
}
.no-data-row td {
  text-align: center !important;
  padding: 20px;
  color: #888;
  font-style: italic;
  font-family: inherit;
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
