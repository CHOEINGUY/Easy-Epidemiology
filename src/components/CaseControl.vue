<template>
  <div class="app">
    <header class="app-header">
      <h1 class="app-title">Easy-Epidemiology Web v1.0</h1>
    </header>

    <div class="dashboard">
      <div class="summary-bar">
        <div class="summary-bar__title">
          <span class="material-icons summary-bar__logo">compare_arrows</span>
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
                  (오즈비 ≥ {{ currentOrThreshold }}.0 필터 적용)
                </span>
              </span>
              <div class="button-group">
                <div @click="toggleOrFilter" class="filter-button" :class="{ active: isOrFilterActive }">
                  <span class="button-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46"></polygon>
                    </svg>
                  </span>
                  <span class="button-text">OR ≥ </span>
                  <button @click.stop="cycleOrThreshold" class="threshold-button">{{ currentOrThreshold }}.0</button>
                </div>
                <button @click="toggleYatesCorrection" class="filter-button" :class="{ active: !useYatesCorrection }">
                  <span class="button-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M12 1v6m0 6v6"></path>
                      <path d="M17.5 12h-11"></path>
                    </svg>
                  </span>
                  <span class="button-text">{{ useYatesCorrection ? 'Yates 보정 적용' : 'Yates 보정 미적용' }}</span>
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
                  <th rowspan="2" class="header-stat">오즈비<br />(Odds Ratio)</th>
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
                    {{ isOrFilterActive ? `오즈비 ${currentOrThreshold}.0 이상인 데이터가 없습니다.` : '분석할 데이터가 없거나 Vuex 스토어 연결을 확인하세요.' }}
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
                    :title="result.adj_chi === null && result.pValue !== null ? 'Fisher의 정확검정 (기대빈도 < 5)' : (useYatesCorrection ? 'Yates 보정 카이제곱 검정 (기대빈도 ≥ 5)' : '일반 카이제곱 검정 (기대빈도 ≥ 5)')"
                  >
                    <span v-if="result.pValue !== null">
                      {{ (result.pValue < 0.001 ? "<0.001" : result.pValue.toFixed(3)) }}<sup v-if="result.adj_chi === null" class="test-method fisher">*</sup>
                    </span>
                    <span v-else>N/A</span>
                  </td>
                  <td class="cell-stat">{{ result.oddsRatio }}{{ result.hasCorrection ? '†' : '' }}</td>
                  <td class="cell-stat">{{ result.ci_lower }}{{ result.hasCorrection ? '†' : '' }}</td>
                  <td class="cell-stat">{{ result.ci_upper }}{{ result.hasCorrection ? '†' : '' }}</td>
                </tr>
              </tbody>
            </table>
            <div class="table-legend">
              <div class="legend-header">
                <span class="legend-title">통계 검정 방법 및 표시 기준</span>
              </div>
              <div class="legend-content legend-content--plain">
                <div class="legend-item-plain">* : Fisher's Exact Test (기대빈도&nbsp;&lt;&nbsp;5인 셀이 있을 때)</div>
                <div class="legend-item-plain">- : {{ useYatesCorrection ? 'Yates\' Corrected Chi-square Test' : 'Chi-square Test' }} (모든 셀 기대빈도&nbsp;≥&nbsp;5)</div>
                <div class="legend-item-plain">N/A : 계산 불가(셀 값이 0인 경우)</div>
                <div class="legend-item-plain correction-note">
                  0인 셀이 있는 행에만 모든 셀에 0.5를 더하여 오즈비 계산 (Haldane-Anscombe 보정)
                </div>
                <div class="legend-item-plain">† : 0.5 보정 적용</div>
              </div>
            </div>
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

// Yates 보정 토글 변수 (기대값 5이상일 때 사용)
const useYatesCorrection = ref(true); // 기본값: Yates 보정 사용

const getNextValue = (currentValue, valueArray) => {
  const currentIndex = valueArray.indexOf(currentValue);
  const nextIndex = (currentIndex + 1) % valueArray.length;
  return valueArray[nextIndex];
};

const cycleFontSize = () => {
  tableFontSize.value = getNextValue(tableFontSize.value, fontSizes);
};

// Yates 보정 토글 함수
const toggleYatesCorrection = () => {
  useYatesCorrection.value = !useYatesCorrection.value;
};

// Vuex 스토어에서 headers와 rows 데이터 가져오기
const headers = computed(() => store.getters.headers || { diet: [] });
const rows = computed(() => store.getters.rows || []);

// 오즈비 필터링 상태
const isOrFilterActive = ref(false);
const orThresholds = [2, 3, 4]; // 2 → 3 → 4 → 2
const currentOrThreshold = ref(2);

// 오즈비 필터 토글 함수
const toggleOrFilter = () => {
  isOrFilterActive.value = !isOrFilterActive.value;
};

// 오즈비 임계값 순환 함수
const cycleOrThreshold = () => {
  currentOrThreshold.value = getNextValue(currentOrThreshold.value, orThresholds);
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
    let hasCorrection = false; // 0.5 보정 적용 여부

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
                                rowTotal_Case > 0 && rowTotal_Control > 0 &&
                                b_exp > 0 && c_exp > 0 && e_exp > 0 && f_exp > 0;

      if (canApplyChiSquare) {
        // 기대빈도 5미만 체크
        const hasSmallExpected = b_exp < 5 || c_exp < 5 || e_exp < 5 || f_exp < 5;
        
        if (hasSmallExpected) {
          // 기대빈도 5미만: Fisher의 정확검정 사용
          try {
            pValue = calculateFisherExactTest(b_obs, c_obs, e_obs, f_obs);
            adj_chi = null; // Fisher 검정에서는 카이제곱 값 계산 안함
            console.log(`Fisher의 정확검정 적용 - ${factorName}: 기대빈도 5미만`);
          } catch (e) {
            console.error(`Fisher's exact test calculation error for item ${factorName}:`, e);
            pValue = null;
            adj_chi = null;
          }
        } else {
          // 기대빈도 5이상: 일반 카이제곱 또는 Yates' 보정 카이제곱 검정 사용
          if (useYatesCorrection.value) {
            // Yates' 보정 카이제곱 검정 사용
            const term1 = calculateChiTerm(b_obs, b_exp);
            const term2 = calculateChiTerm(c_obs, c_exp);
            const term3 = calculateChiTerm(e_obs, e_exp);
            const term4 = calculateChiTerm(f_obs, f_exp);
            adj_chi = term1 + term2 + term3 + term4;
          } else {
            // 일반 카이제곱 검정 사용 (보정 없음)
            const term1 = ((b_obs - b_exp) * (b_obs - b_exp)) / b_exp;
            const term2 = ((c_obs - c_exp) * (c_obs - c_exp)) / c_exp;
            const term3 = ((e_obs - e_exp) * (e_obs - e_exp)) / e_exp;
            const term4 = ((f_obs - f_exp) * (f_obs - f_exp)) / f_exp;
            adj_chi = term1 + term2 + term3 + term4;
          }

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
      // 0인 셀이 있는지 확인
      const hasZeroCell = b_obs === 0 || c_obs === 0 || e_obs === 0 || f_obs === 0;

      if (hasZeroCell) {
        // 0이 있는 행에만 모든 셀에 0.5 보정 적용
        hasCorrection = true;
        const b_corrected = b_obs + 0.5;
        const c_corrected = c_obs + 0.5;
        const e_corrected = e_obs + 0.5;
        const f_corrected = f_obs + 0.5;

        // Odds Ratio 계산: OR = (b*f)/(c*e)
        const or_calc = (b_corrected * f_corrected) / (c_corrected * e_corrected);

        if (isFinite(or_calc) && or_calc > 0) {
          // OR 값 포맷팅
          oddsRatio = or_calc.toFixed(3);

          // Log Odds Ratio 계산
          const logOR = Math.log(or_calc);

          // Standard Error of Log Odds Ratio 계산: sqrt(1/b + 1/c + 1/e + 1/f)
          const se_logOR = Math.sqrt(
            1 / b_corrected + 1 / c_corrected + 1 / e_corrected + 1 / f_corrected
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
        } else if (or_calc === 0) {
          // OR이 0인 경우: 분모가 0이 아닌데 분자가 0인 경우
          oddsRatio = '0.000';
          ci_lower = '0.000';
          ci_upper = '0.000';

        } else {
          // OR이 무한대(Inf) 또는 계산 불가(NaN)인 경우
          if (c_corrected * e_corrected === 0 && b_corrected * f_corrected > 0) {
            oddsRatio = 'Inf';
            ci_lower = 'Inf';
            ci_upper = 'Inf';

          } else {
            oddsRatio = 'N/A';
            ci_lower = 'N/A';
            ci_upper = 'N/A';
          }
        }
      } else {
        // 0인 셀이 없는 경우 그냥 계산
        const b_corrected = b_obs;
        const c_corrected = c_obs;
        const e_corrected = e_obs;
        const f_corrected = f_obs;

        // Odds Ratio 계산: OR = (b*f)/(c*e)
        const or_calc = (b_corrected * f_corrected) / (c_corrected * e_corrected);

        if (isFinite(or_calc) && or_calc > 0) {
          // OR 값 포맷팅
          oddsRatio = or_calc.toFixed(3);

          // Log Odds Ratio 계산
          const logOR = Math.log(or_calc);

          // Standard Error of Log Odds Ratio 계산: sqrt(1/b + 1/c + 1/e + 1/f)
          const se_logOR = Math.sqrt(
            1 / b_corrected + 1 / c_corrected + 1 / e_corrected + 1 / f_corrected
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
        } else if (or_calc === 0) {
          // OR이 0인 경우: 분모가 0이 아닌데 분자가 0인 경우
          oddsRatio = '0.000';
          ci_lower = '0.000';
          ci_upper = '0.000';

        } else {
          // OR이 무한대(Inf) 또는 계산 불가(NaN)인 경우
          if (c_corrected * e_corrected === 0 && b_corrected * f_corrected > 0) {
            oddsRatio = 'Inf';
            ci_lower = 'Inf';
            ci_upper = 'Inf';

          } else {
            oddsRatio = 'N/A';
            ci_lower = 'N/A';
            ci_upper = 'N/A';
          }
        }
      }
    } else {
      // 환자군/대조군 또는 노출/비노출군이 없는 경우 OR 계산 불가
      oddsRatio = 'N/A';
      ci_lower = 'N/A';
      ci_upper = 'N/A';
      console.log(`OR 계산 불가 - ${factorName}: 환자군/대조군 또는 노출/비노출군이 없음`);
    }

    // --- 최종 결과 객체 반환 ---
    const result = {
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
      ci_upper, // 계산된 CI 상한
      hasCorrection // 0.5 보정 적용 여부
    };
    
    // 통계 검증 실행
    validateStatistics(result, factorName);
    
    return result;
  });
});

// --- 필터링된 분석 결과 (오즈비 임계값 이상) ---
const filteredAnalysisResults = computed(() => {
  if (!isOrFilterActive.value) {
    return analysisResults.value;
  }
  
  return analysisResults.value.filter(result => {
    // 오즈비가 숫자인지 확인하고 임계값 이상인지 체크
    const orValue = parseFloat(result.oddsRatio);
    return !isNaN(orValue) && orValue >= currentOrThreshold.value;
  });
});

const isTableCopied = ref(false);


// 엑셀 방식의 테이블 복사 (병합된 헤더 구조)
const copyTableToClipboard = async () => {
  try {
    // 엑셀 방식으로 테이블 데이터 구성
    const tableData = [];
    
    // 헤더 1행: 주요 그룹 헤더 (엑셀 방식 - 병합된 셀 내용 중복)
    tableData.push([
      '요인(식단)',
      '환자군', '환자군', '환자군', 
      '대조군', '대조군', '대조군',
      '카이제곱',
      '오즈비',
      '95% 신뢰구간', '95% 신뢰구간'
    ]);
    
    // 헤더 2행: 세부 헤더
    tableData.push([
      '',
      '섭취자', '비섭취자', '합계',
      '섭취자', '비섭취자', '합계',
      'P-value',
      '(Odds Ratio)',
      '하한', '상한'
    ]);
    
    // 데이터 행들
    filteredAnalysisResults.value.forEach(result => {
      tableData.push([
        result.item,
        result.b_obs,
        result.c_obs,
        result.rowTotal_Case,
        result.e_obs,
        result.f_obs,
        result.rowTotal_Control,
        result.pValue !== null ? 
          (result.pValue < 0.001 ? '<0.001' : result.pValue.toFixed(3)) + 
          (result.adj_chi === null ? '<sup>*</sup>' : '') : 
          'N/A',
        result.oddsRatio,
        result.ci_lower,
        result.ci_upper
      ]);
    });
    
    // TSV 형식으로 변환
    const tsvText = `${tableData.map(row => row.join('\t')).join('\n')}\n\n` +
      '통계 검정 방법 및 표시 기준:\n' +
      '* : Fisher\'s Exact Test (기대빈도 < 5인 셀이 있을 때)\n' +
      '- : Yates\' Corrected Chi-square Test (모든 셀 기대빈도 ≥ 5)\n' +
      'N/A : 계산 불가(셀 값이 0인 경우)';
    
    // HTML 테이블도 생성 (병합 셀 구조 포함)
    const htmlTable = `
      <table style="border-collapse: collapse; border: 1px solid #888; font-size: 8pt; font-family: '맑은 고딕', monospace; table-layout: fixed; width: 120%; box-sizing: border-box;">
        <tr>
          <th rowspan="2" style="border: 1px solid #888; padding: 2px; text-align: center; background: #f2f2f2; font-weight: bold; width: 13%; min-width: 13%; max-width: 13%;"><span style="font-size: 8pt;">요인(식단)</span></th>
          <th colspan="3" style="border: 1px solid #888; padding: 2px; text-align: center; background: #f2f2f2; font-weight: bold; width: 20%; min-width: 20%; max-width: 20%;"><span style="font-size: 8pt;">환자군</span></th>
          <th colspan="3" style="border: 1px solid #888; padding: 2px; text-align: center; background: #f2f2f2; font-weight: bold; width: 20%; min-width: 20%; max-width: 20%;"><span style="font-size: 8pt;">대조군</span></th>
          <th rowspan="2" style="border: 1px solid #888; padding: 2px; text-align: center; background: #f2f2f2; font-weight: bold; width: 10%; min-width: 10%; max-width: 10%;"><span style="font-size: 8pt;">카이제곱 P-value</span></th>
          <th rowspan="2" style="border: 1px solid #888; padding: 2px; text-align: center; background: #f2f2f2; font-weight: bold; width: 10%; min-width: 10%; max-width: 10%;"><span style="font-size: 8pt;">오즈비 (Odds Ratio)</span></th>
          <th colspan="2" style="border: 1px solid #888; padding: 2px; text-align: center; background: #f2f2f2; font-weight: bold; width: 12%; min-width: 12%; max-width: 12%;"><span style="font-size: 8pt;">95% 신뢰구간</span></th>
        </tr>
        <tr>
          <th style="border: 1px solid #888; padding: 2px; text-align: center; background: #f2f2f2; font-weight: bold; width: 7%; min-width: 7%; max-width: 7%; white-space: nowrap; overflow: hidden; box-sizing: border-box;"><span style="font-size: 8pt;">섭취자</span></th>
          <th style="border: 1px solid #888; padding: 2px; text-align: center; background: #f2f2f2; font-weight: bold; width: 7%; min-width: 7%; max-width: 7%; white-space: nowrap; overflow: hidden; box-sizing: border-box;"><span style="font-size: 8pt;">비섭취자</span></th>
          <th style="border: 1px solid #888; padding: 2px; text-align: center; background: #f2f2f2; font-weight: bold; width: 7%; min-width: 7%; max-width: 7%; white-space: nowrap; overflow: hidden; box-sizing: border-box;"><span style="font-size: 8pt;">합계</span></th>
          <th style="border: 1px solid #888; padding: 2px; text-align: center; background: #f2f2f2; font-weight: bold; width: 7%; min-width: 7%; max-width: 7%; white-space: nowrap; overflow: hidden; box-sizing: border-box;"><span style="font-size: 8pt;">섭취자</span></th>
          <th style="border: 1px solid #888; padding: 2px; text-align: center; background: #f2f2f2; font-weight: bold; width: 7%; min-width: 7%; max-width: 7%; white-space: nowrap; overflow: hidden; box-sizing: border-box;"><span style="font-size: 8pt;">비섭취자</span></th>
          <th style="border: 1px solid #888; padding: 2px; text-align: center; background: #f2f2f2; font-weight: bold; width: 7%; min-width: 7%; max-width: 7%; white-space: nowrap; overflow: hidden; box-sizing: border-box;"><span style="font-size: 8pt;">합계</span></th>
          <th style="border: 1px solid #888; padding: 2px; text-align: center; background: #f2f2f2; font-weight: bold; width: 6%; min-width: 6%; max-width: 6%;"><span style="font-size: 8pt;">하한</span></th>
          <th style="border: 1px solid #888; padding: 2px; text-align: center; background: #f2f2f2; font-weight: bold; width: 6%; min-width: 6%; max-width: 6%;"><span style="font-size: 8pt;">상한</span></th>
        </tr>
        ${filteredAnalysisResults.value.map(result => `
          <tr>
            <td style="border: 1px solid #888; padding: 4px 2px 4px 4px; text-align: left; width: 13%; min-width: 13%; max-width: 13%; box-sizing: border-box; ${result.pValue !== null && result.pValue < 0.05 ? 'background-color: #fffbe6;' : ''}"><span style="font-size: 8pt;">${result.item}</span></td>
            <td style="border: 1px solid #888; padding: 4px 2px; text-align: center; width: 7%; min-width: 7%; max-width: 7%; white-space: nowrap; overflow: hidden; box-sizing: border-box; ${result.pValue !== null && result.pValue < 0.05 ? 'background-color: #fffbe6;' : ''}"><span style="font-size: 8pt;">${result.b_obs}</span></td>
            <td style="border: 1px solid #888; padding: 4px 2px; text-align: center; width: 7%; min-width: 7%; max-width: 7%; white-space: nowrap; overflow: hidden; box-sizing: border-box; ${result.pValue !== null && result.pValue < 0.05 ? 'background-color: #fffbe6;' : ''}"><span style="font-size: 8pt;">${result.c_obs}</span></td>
            <td style="border: 1px solid #888; padding: 4px 2px; text-align: center; width: 7%; min-width: 7%; max-width: 7%; white-space: nowrap; overflow: hidden; box-sizing: border-box; ${result.pValue !== null && result.pValue < 0.05 ? 'background-color: #fffbe6;' : ''}"><span style="font-size: 8pt;">${result.rowTotal_Case}</span></td>
            <td style="border: 1px solid #888; padding: 4px 2px; text-align: center; width: 7%; min-width: 7%; max-width: 7%; white-space: nowrap; overflow: hidden; box-sizing: border-box; ${result.pValue !== null && result.pValue < 0.05 ? 'background-color: #fffbe6;' : ''}"><span style="font-size: 8pt;">${result.e_obs}</span></td>
            <td style="border: 1px solid #888; padding: 4px 2px; text-align: center; width: 7%; min-width: 7%; max-width: 7%; white-space: nowrap; overflow: hidden; box-sizing: border-box; ${result.pValue !== null && result.pValue < 0.05 ? 'background-color: #fffbe6;' : ''}"><span style="font-size: 8pt;">${result.f_obs}</span></td>
            <td style="border: 1px solid #888; padding: 4px 2px; text-align: center; width: 7%; min-width: 7%; max-width: 7%; white-space: nowrap; overflow: hidden; box-sizing: border-box; ${result.pValue !== null && result.pValue < 0.05 ? 'background-color: #fffbe6;' : ''}"><span style="font-size: 8pt;">${result.rowTotal_Control}</span></td>
            <td style="border: 1px solid #888; padding: 4px 2px; text-align: center; width: 10%; min-width: 10%; max-width: 10%; box-sizing: border-box; ${result.pValue !== null && result.pValue < 0.05 ? 'background-color: #fffbe6;' : ''}"><span style="font-size: 8pt; ${result.pValue !== null && result.pValue < 0.05 ? 'color: #e74c3c; font-weight: bold;' : ''}">${result.pValue !== null ? (result.pValue < 0.001 ? '<0.001' : result.pValue.toFixed(3)) + (result.adj_chi === null ? '<sup>*</sup>' : '') : 'N/A'}</span></td>
            <td style="border: 1px solid #888; padding: 4px 2px; text-align: center; width: 10%; min-width: 10%; max-width: 10%; box-sizing: border-box; ${result.pValue !== null && result.pValue < 0.05 ? 'background-color: #fffbe6;' : ''}"><span style="font-size: 8pt;">${result.oddsRatio}</span></td>
            <td style="border: 1px solid #888; padding: 4px 2px; text-align: center; width: 6%; min-width: 6%; max-width: 6%; box-sizing: border-box; ${result.pValue !== null && result.pValue < 0.05 ? 'background-color: #fffbe6;' : ''}"><span style="font-size: 8pt;">${result.ci_lower}</span></td>
            <td style="border: 1px solid #888; padding: 4px 2px; text-align: center; width: 6%; min-width: 6%; max-width: 6%; box-sizing: border-box; ${result.pValue !== null && result.pValue < 0.05 ? 'background-color: #fffbe6;' : ''}"><span style="font-size: 8pt;">${result.ci_upper}</span></td>
          </tr>
        `).join('')}
      </table>
      <div style="font-size: 8pt; line-height: 1.4; font-family: '맑은 고딕', monospace;">
        <div><strong>통계 검정 방법 및 표시 기준</strong></div>
        <div>* : Fisher's Exact Test (기대빈도 &lt; 5인 셀이 있을 때)</div>
        <div>- : Yates' Corrected Chi-square Test (모든 셀 기대빈도 ≥ 5)</div>
        <div>N/A : 계산 불가(셀 값이 0인 경우)</div>
      </div>
    `;

    // 클립보드에 복사
    if (navigator.clipboard && window.ClipboardItem) {
      await navigator.clipboard.write([
        new window.ClipboardItem({
          'text/html': new Blob([htmlTable], { type: 'text/html' }),
          'text/plain': new Blob([tsvText], { type: 'text/plain' })
        })
      ]);
    } else {
      await navigator.clipboard.writeText(tsvText);
    }
    
    isTableCopied.value = true;
    setTimeout(() => (isTableCopied.value = false), 1500);
  } catch (e) {
    console.error('Copy failed', e);
    isTableCopied.value = false;
  }
};

// --- 통계 계산 검증 함수 ---
const validateStatistics = (result, factorName) => {
  const issues = [];
  
  // P-value 검증
  if (result.pValue !== null) {
    if (result.pValue < 0 || result.pValue > 1) {
      issues.push(`P-value 범위 오류: ${result.pValue}`);
    }
  }
  
  // Odds Ratio 검증
  if (result.oddsRatio !== 'N/A' && result.oddsRatio !== 'Inf' && result.oddsRatio !== 'Error') {
    const or = parseFloat(result.oddsRatio);
    if (isNaN(or) || or < 0) {
      issues.push(`Odds Ratio 값 오류: ${result.oddsRatio}`);
    }
  }
  
  // 신뢰구간 검증
  if (result.ci_lower !== 'N/A' && result.ci_upper !== 'N/A') {
    const lower = parseFloat(result.ci_lower);
    const upper = parseFloat(result.ci_upper);
    if (!isNaN(lower) && !isNaN(upper) && lower > upper) {
      issues.push(`신뢰구간 순서 오류: ${result.ci_lower} > ${result.ci_upper}`);
    }
  }
  
  if (issues.length > 0) {
    console.warn(`통계 검증 오류 - ${factorName}:`, issues);
  }
  
  return issues.length === 0;
};

// --- Fisher의 정확검정 계산 함수 ---
const calculateFisherExactTest = (a, b, c, d) => {
  // 2x2 분할표에서 Fisher의 정확검정 계산
  const n = a + b + c + d;
  const row1 = a + b;
  const row2 = c + d;
  const col1 = a + c;
  const col2 = b + d;
  
  // 초기 확률 계산
  let pValue = 0;
  
  // 모든 가능한 분할표에 대해 확률 계산
  for (let x = 0; x <= Math.min(row1, col1); x++) {
    const y = row1 - x;
    const z = col1 - x;
    const w = row2 - z;
    
    if (y >= 0 && z >= 0 && w >= 0) {
      // 현재 분할표의 확률
      const currentProb = (factorial(row1) * factorial(row2) * factorial(col1) * factorial(col2)) /
                         (factorial(n) * factorial(x) * factorial(y) * factorial(z) * factorial(w));
      
      // 관측된 분할표보다 극단적인 경우의 확률만 합산
      if (x <= a) {
        pValue += currentProb;
      }
    }
  }
  
  return pValue;
};

// --- 팩토리얼 계산 함수 ---
const factorial = (n) => {
  if (n < 0) return NaN;
  if (n === 0 || n === 1) return 1;
  let result = 1;
  for (let i = 2; i <= n; i++) {
    result *= i;
  }
  return result;
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
  vertical-align: middle;
  display: inline-flex;
  align-items: center;
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

/* --- two-line header cells without <br> (for better copy) --- */
/* Prevent artificial newline when copying by setting spans to inline-block */
.header-stat--two-line span {
  display: inline-block;
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

/* --- 테이블 범례 스타일 --- */
.table-legend {
  margin: 15px 20px 20px 20px;
  padding: 0;
  background-color: #ffffff;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.legend-header {
  background-color: #f8f9fa;
  padding: 8px 15px;
  border-bottom: 1px solid #e0e0e0;
}

.legend-title {
  font-size: 13px;
  font-weight: 600;
  color: #333;
  font-family: "Noto Sans KR", sans-serif;
}

.legend-content {
  padding: 12px 15px;
}

.legend-item {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  font-size: 12px;
  font-family: "Noto Sans KR", sans-serif;
}

.legend-item:last-child {
  margin-bottom: 0;
}

.legend-marker {
  display: inline-block;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  margin-right: 10px;
  min-width: 45px;
  text-align: center;
}

.legend-marker.fisher {
  background-color: #e3f2fd;
  color: #1a73e8;
  border: 1px solid #bbdefb;
}

.legend-marker.yates {
  background-color: #e8f5e8;
  color: #34a853;
  border: 1px solid #c8e6c9;
}

.legend-marker.na {
  background-color: #f5f5f5;
  color: #666;
  border: 1px solid #ddd;
}

.legend-description {
  color: #666;
  font-weight: 400;
}

/* --- 검정 방법 표시 스타일 (더 이상 사용하지 않음) --- */

.legend-content--plain {
  padding: 12px 15px;
}
.legend-item-plain {
  font-size: 13px;
  color: #444;
  font-family: "Noto Sans KR", sans-serif;
  margin-bottom: 6px;
}
.legend-item-plain:last-child {
  margin-bottom: 0;
}

.correction-note {
  font-weight: 500;
  font-style: italic;
  color: #1a73e8;
}

.threshold-button {
  background: none;
  border: 1px solid #ddd;
  border-radius: 3px;
  padding: 1px 4px;
  margin: 0 2px;
  font-family: inherit;
  font-size: inherit;
  font-weight: inherit;
  color: inherit;
  cursor: pointer;
}

.threshold-button:hover {
  background-color: #1a73e8;
  border-color: #1a73e8;
  color: white;
}

/* 숫자 버튼에 호버할 때 부모 필터 버튼의 호버 효과 방지 */
.filter-button:hover .threshold-button:hover {
  background-color: #1a73e8;
  border-color: #1a73e8;
  color: white;
}
</style>
