<template>
  <div class="app">
    <header class="app-header">
      <h1 class="app-title">Easy-Epidemiology Web v1.4</h1>
    </header>

    <div class="dashboard">
      <div class="summary-bar">
        <div class="summary-bar__title">
          <span class="material-icons summary-bar__logo">groups</span>
          코호트 연구
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
                <span class="selected-variable-details__title-dot"></span>&nbsp;요인별 표 분석 결과(코호트)
              </span>
              <div class="button-group">
                <button @click="toggleYatesCorrection" class="filter-button" :class="{ active: useYatesCorrection }">
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
                    :title="result.adj_chi === null && result.pValue !== null ? 'Fisher의 정확검정 (기대빈도 < 5)' : (useYatesCorrection ? 'Yates 보정 카이제곱 검정 (기대빈도 ≥ 5)' : '일반 카이제곱 검정 (기대빈도 ≥ 5)')"
                  >
                    <span v-if="result.pValue !== null">
                      {{ (result.pValue < 0.001 ? "<0.001" : result.pValue.toFixed(3)) }}<sup v-if="result.adj_chi === null" class="test-method fisher">*</sup>
                    </span>
                    <span v-else>N/A</span>
                  </td>
                  <td class="cell-stat">{{ result.relativeRisk }}{{ result.hasCorrection ? '†' : '' }}</td>
                  <td class="cell-stat">{{ result.rr_ci_lower }}{{ result.hasCorrection ? '†' : '' }}</td>
                  <td class="cell-stat">{{ result.rr_ci_upper }}{{ result.hasCorrection ? '†' : '' }}</td>
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
                  0인 셀이 있는 행에만 모든 셀에 0.5를 더하여 상대위험비 계산 (Haldane-Anscombe 보정)
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
import { computed, ref, watch } from 'vue';
import { useStore } from 'vuex';
import { jStat } from 'jstat';

const store = useStore();

const fontSizes = [12, 14, 16];
const fontSizeLabels = ['작게', '보통', '크게'];
const tableFontSize = ref(14);

// Yates 보정 토글 변수 (store에서 관리)
const yatesSettings = computed(() => store.getters.getYatesCorrectionSettings);
const useYatesCorrection = computed({
  get: () => yatesSettings.value?.cohort ?? false,
  set: (value) => store.commit('SET_YATES_CORRECTION_SETTINGS', { type: 'cohort', enabled: value })
});
const fontSizeButtonText = ref('보통');

// 툴팁 상태 관리
const activeTooltip = ref(null);
const tooltipText = ref('');

const showTooltip = (key, text) => {
  activeTooltip.value = key;
  tooltipText.value = text;
};

const hideTooltip = () => {
  activeTooltip.value = null;
};

// 폰트 크기 마우스 이벤트 핸들러
const handleFontSizeMouseEnter = () => {
  const currentIndex = fontSizes.indexOf(tableFontSize.value);
  const nextIndex = (currentIndex + 1) % fontSizes.length;
  const nextFontSize = fontSizeLabels[nextIndex];
  showTooltip('fontSize', `폰트 크기를 ${nextFontSize}로 변경합니다`);
};

const handleFontSizeMouseLeave = () => {
  hideTooltip();
};

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

// Yates 보정 토글 함수
const toggleYatesCorrection = () => {
  useYatesCorrection.value = !useYatesCorrection.value;
};

const headers = computed(() => store.getters.headers || { diet: [] });
const rows = computed(() => store.getters.rows || []);

const isTableCopied = ref(false);
// 엑셀 방식의 테이블 복사 (병합된 헤더 구조)
const copyTableToClipboard = async () => {
  try {
    // 엑셀 방식으로 테이블 데이터 구성
    const tableData = [];
    
    // 헤더 1행: 주요 그룹 헤더 (엑셀 방식 - 병합된 셀 내용 중복)
    tableData.push([
      '요인(식단)',
      '섭취자(노출군)', '섭취자(노출군)', '섭취자(노출군)', 
      '비섭취자(비노출군)', '비섭취자(비노출군)', '비섭취자(비노출군)',
      '카이제곱',
      '상대위험비',
      '95% 신뢰구간', '95% 신뢰구간'
    ]);
    
    // 헤더 2행: 세부 헤더
    tableData.push([
      '',
      '대상자수', '환자수', '발병률(%)',
      '대상자수', '환자수', '발병률(%)',
      'P-value',
      'Relative Risk',
      '하한', '상한'
    ]);
    
    // 데이터 행들
    cohortAnalysisResults.value.forEach(result => {
      tableData.push([
        result.item,
        result.rowTotal_Exposed,
        result.a_obs,
        result.incidence_exposed_formatted,
        result.rowTotal_Unexposed,
        result.c_obs,
        result.incidence_unexposed_formatted,
        result.pValue !== null ? 
          (result.pValue < 0.001 ? '<0.001' : result.pValue.toFixed(3)) + 
          (result.adj_chi === null ? '*' : '') : 
          'N/A',
        result.relativeRisk,
        result.rr_ci_lower,
        result.rr_ci_upper
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
          <th colspan="3" style="border: 1px solid #888; padding: 2px; text-align: center; background: #f2f2f2; font-weight: bold; width: 20%; min-width: 20%; max-width: 20%;"><span style="font-size: 8pt;">섭취자(노출군)</span></th>
          <th colspan="3" style="border: 1px solid #888; padding: 2px; text-align: center; background: #f2f2f2; font-weight: bold; width: 20%; min-width: 20%; max-width: 20%;"><span style="font-size: 8pt;">비섭취자(비노출군)</span></th>
          <th rowspan="2" style="border: 1px solid #888; padding: 2px; text-align: center; background: #f2f2f2; font-weight: bold; width: 10%; min-width: 10%; max-width: 10%;"><span style="font-size: 8pt;">카이제곱 P-value</span></th>
          <th rowspan="2" style="border: 1px solid #888; padding: 2px; text-align: center; background: #f2f2f2; font-weight: bold; width: 10%; min-width: 10%; max-width: 10%;"><span style="font-size: 8pt;">상대위험비 Relative Risk</span></th>
          <th colspan="2" style="border: 1px solid #888; padding: 2px; text-align: center; background: #f2f2f2; font-weight: bold; width: 12%; min-width: 12%; max-width: 12%;"><span style="font-size: 8pt;">95% 신뢰구간</span></th>
        </tr>
        <tr>
          <th style="border: 1px solid #888; padding: 2px; text-align: center; background: #f2f2f2; font-weight: bold; width: 7%; min-width: 7%; max-width: 7%; white-space: nowrap; overflow: hidden; box-sizing: border-box;"><span style="font-size: 8pt;">대상자수</span></th>
          <th style="border: 1px solid #888; padding: 2px; text-align: center; background: #f2f2f2; font-weight: bold; width: 7%; min-width: 7%; max-width: 7%; white-space: nowrap; overflow: hidden; box-sizing: border-box;"><span style="font-size: 8pt;">환자수</span></th>
          <th style="border: 1px solid #888; padding: 2px; text-align: center; background: #f2f2f2; font-weight: bold; width: 7%; min-width: 7%; max-width: 7%; white-space: nowrap; overflow: hidden; box-sizing: border-box;"><span style="font-size: 8pt;">발병률(%)</span></th>
          <th style="border: 1px solid #888; padding: 2px; text-align: center; background: #f2f2f2; font-weight: bold; width: 7%; min-width: 7%; max-width: 7%; white-space: nowrap; overflow: hidden; box-sizing: border-box;"><span style="font-size: 8pt;">대상자수</span></th>
          <th style="border: 1px solid #888; padding: 2px; text-align: center; background: #f2f2f2; font-weight: bold; width: 7%; min-width: 7%; max-width: 7%; white-space: nowrap; overflow: hidden; box-sizing: border-box;"><span style="font-size: 8pt;">환자수</span></th>
          <th style="border: 1px solid #888; padding: 2px; text-align: center; background: #f2f2f2; font-weight: bold; width: 7%; min-width: 7%; max-width: 7%; white-space: nowrap; overflow: hidden; box-sizing: border-box;"><span style="font-size: 8pt;">발병률(%)</span></th>
          <th style="border: 1px solid #888; padding: 2px; text-align: center; background: #f2f2f2; font-weight: bold; width: 6%; min-width: 6%; max-width: 6%;"><span style="font-size: 8pt;">하한</span></th>
          <th style="border: 1px solid #888; padding: 2px; text-align: center; background: #f2f2f2; font-weight: bold; width: 6%; min-width: 6%; max-width: 6%;"><span style="font-size: 8pt;">상한</span></th>
        </tr>
        ${cohortAnalysisResults.value.map(result => `
          <tr>
            <td style="border: 1px solid #888; padding: 4px 2px 4px 4px; text-align: left; width: 13%; min-width: 13%; max-width: 13%; box-sizing: border-box; ${result.pValue !== null && result.pValue < 0.05 ? 'background-color: #fffbe6;' : ''}"><span style="font-size: 8pt;">${result.item}</span></td>
            <td style="border: 1px solid #888; padding: 4px 2px; text-align: center; width: 7%; min-width: 7%; max-width: 7%; white-space: nowrap; overflow: hidden; box-sizing: border-box; ${result.pValue !== null && result.pValue < 0.05 ? 'background-color: #fffbe6;' : ''}"><span style="font-size: 8pt;">${result.rowTotal_Exposed}</span></td>
            <td style="border: 1px solid #888; padding: 4px 2px; text-align: center; width: 7%; min-width: 7%; max-width: 7%; white-space: nowrap; overflow: hidden; box-sizing: border-box; ${result.pValue !== null && result.pValue < 0.05 ? 'background-color: #fffbe6;' : ''}"><span style="font-size: 8pt;">${result.a_obs}</span></td>
            <td style="border: 1px solid #888; padding: 4px 2px; text-align: center; width: 7%; min-width: 7%; max-width: 7%; white-space: nowrap; overflow: hidden; box-sizing: border-box; ${result.pValue !== null && result.pValue < 0.05 ? 'background-color: #fffbe6;' : ''}"><span style="font-size: 8pt;">${result.incidence_exposed_formatted}</span></td>
            <td style="border: 1px solid #888; padding: 4px 2px; text-align: center; width: 7%; min-width: 7%; max-width: 7%; white-space: nowrap; overflow: hidden; box-sizing: border-box; ${result.pValue !== null && result.pValue < 0.05 ? 'background-color: #fffbe6;' : ''}"><span style="font-size: 8pt;">${result.rowTotal_Unexposed}</span></td>
            <td style="border: 1px solid #888; padding: 4px 2px; text-align: center; width: 7%; min-width: 7%; max-width: 7%; white-space: nowrap; overflow: hidden; box-sizing: border-box; ${result.pValue !== null && result.pValue < 0.05 ? 'background-color: #fffbe6;' : ''}"><span style="font-size: 8pt;">${result.c_obs}</span></td>
            <td style="border: 1px solid #888; padding: 4px 2px; text-align: center; width: 7%; min-width: 7%; max-width: 7%; white-space: nowrap; overflow: hidden; box-sizing: border-box; ${result.pValue !== null && result.pValue < 0.05 ? 'background-color: #fffbe6;' : ''}"><span style="font-size: 8pt;">${result.incidence_unexposed_formatted}</span></td>
            <td style="border: 1px solid #888; padding: 4px 2px; text-align: center; width: 10%; min-width: 10%; max-width: 10%; box-sizing: border-box; ${result.pValue !== null && result.pValue < 0.05 ? 'background-color: #fffbe6;' : ''}"><span style="font-size: 8pt; ${result.pValue !== null && result.pValue < 0.05 ? 'color: #e74c3c; font-weight: bold;' : ''}">${result.pValue !== null ? (result.pValue < 0.001 ? '<0.001' : result.pValue.toFixed(3)) + (result.adj_chi === null ? '*' : '') : 'N/A'}</span></td>
            <td style="border: 1px solid #888; padding: 4px 2px; text-align: center; width: 10%; min-width: 10%; max-width: 10%; box-sizing: border-box; ${result.pValue !== null && result.pValue < 0.05 ? 'background-color: #fffbe6;' : ''}"><span style="font-size: 8pt;">${result.relativeRisk}</span></td>
            <td style="border: 1px solid #888; padding: 4px 2px; text-align: center; width: 6%; min-width: 6%; max-width: 6%; box-sizing: border-box; ${result.pValue !== null && result.pValue < 0.05 ? 'background-color: #fffbe6;' : ''}"><span style="font-size: 8pt;">${result.rr_ci_lower}</span></td>
            <td style="border: 1px solid #888; padding: 4px 2px; text-align: center; width: 6%; min-width: 6%; max-width: 6%; box-sizing: border-box; ${result.pValue !== null && result.pValue < 0.05 ? 'background-color: #fffbe6;' : ''}"><span style="font-size: 8pt;">${result.rr_ci_upper}</span></td>
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
  // 조건 완화: 식단 헤더가 없어도 기본 분석 가능하도록 수정
  if (!rows.value || rows.value.length === 0) {
    console.warn('코호트 분석을 위한 rows 데이터가 없습니다.');
    return [];
  }

  // 식단 헤더가 없으면 기본 헤더 생성
  const dietHeaders = headers.value?.diet || [];
  if (dietHeaders.length === 0) {
    console.log('식단 헤더가 없어 기본 코호트 분석을 수행합니다.');
    // 기본 식단 항목들 생성 (실제 데이터에서 추출)
    const defaultDietItems = [];
    for (let i = 0; i < 10; i++) {
      defaultDietItems.push(`식단${i + 1}`);
    }
    dietHeaders.push(...defaultDietItems);
  }

  const z_crit = jStat.normal.inv(0.975, 0, 1);

  return dietHeaders.map((dietItem, index) => {
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

      if (dietValue === '1') {
        if (isPatient === '1') a_obs++;
        else if (isPatient === '0') b_obs++;
      } else if (dietValue === '0') {
        if (isPatient === '1') c_obs++;
        else if (isPatient === '0') d_obs++;
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
    let relativeRisk = 'N/A';
    let rr_ci_lower = 'N/A';
    let rr_ci_upper = 'N/A';
    let hasCorrection = false; // 0.5 보정 적용 여부

    // --- 발병률 계산 및 포맷팅 ---
    let incidence_exposed_formatted = 'N/A';
    let incidence_unexposed_formatted = 'N/A';

    if (rowTotal_Exposed > 0) {
      const incidence_exposed = (a_obs / rowTotal_Exposed) * 100;
      incidence_exposed_formatted = `${incidence_exposed.toFixed(1)}%`; // 소수점 첫째자리 + %
    }
    if (rowTotal_Unexposed > 0) {
      const incidence_unexposed = (c_obs / rowTotal_Unexposed) * 100;
      incidence_unexposed_formatted = `${incidence_unexposed.toFixed(1)}%`; // 소수점 첫째자리 + %
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
                                colTotal_Disease > 0 && colTotal_NoDisease > 0 &&
                                a_exp > 0 && b_exp > 0 && c_exp > 0 && d_exp > 0;

      if (canApplyChiSquare) {
        // 기대빈도 5미만 체크
        const hasSmallExpected = a_exp < 5 || b_exp < 5 || c_exp < 5 || d_exp < 5;
        
        if (hasSmallExpected) {
          // 기대빈도 5미만: Fisher의 정확검정 사용
          try {
            pValue = calculateFisherExactTest(a_obs, b_obs, c_obs, d_obs);
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
            const term1 = calculateChiTerm(a_obs, a_exp);
            const term2 = calculateChiTerm(b_obs, b_exp);
            const term3 = calculateChiTerm(c_obs, c_exp);
            const term4 = calculateChiTerm(d_obs, d_exp);
            adj_chi = term1 + term2 + term3 + term4;
          } else {
            // 일반 카이제곱 검정 사용 (보정 없음)
            const term1 = ((a_obs - a_exp) * (a_obs - a_exp)) / a_exp;
            const term2 = ((b_obs - b_exp) * (b_obs - b_exp)) / b_exp;
            const term3 = ((c_obs - c_exp) * (c_obs - c_exp)) / c_exp;
            const term4 = ((d_obs - d_exp) * (d_obs - d_exp)) / d_exp;
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
      
      // 0인 셀이 있으면 모든 셀에 0.5 보정 적용
      if (hasZeroCell) {
        // 0이 있는 행에만 모든 셀에 0.5 보정 적용
        hasCorrection = true;
        const a_corrected = a_obs + 0.5;
        const b_corrected = b_obs + 0.5;
        const c_corrected = c_obs + 0.5;
        const d_corrected = d_obs + 0.5;
        
        const total_exposed = a_corrected + b_corrected;
        const total_unexposed = c_corrected + d_corrected;

        try {
          const risk_exposed = total_exposed > 0 ? a_corrected / total_exposed : 0;
          const risk_unexposed = total_unexposed > 0 ? c_corrected / total_unexposed : 0;

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
            const term_se1 = a_corrected * total_exposed;
            const term_se2 = c_corrected * total_unexposed;

            if (term_se1 > 0 && term_se2 > 0) {
              se_logRR = Math.sqrt(b_corrected / term_se1 + d_corrected / term_se2);
            }

            if (isFinite(se_logRR)) {
              const logCI_lower = logRR - z_crit * se_logRR;
              const logCI_upper = logRR + z_crit * se_logRR;
              rr_ci_lower = Math.exp(logCI_lower).toFixed(3);
              rr_ci_upper = Math.exp(logCI_upper).toFixed(3);
              if (rr_calc === 0) rr_ci_lower = '0.000';
              if (parseFloat(rr_ci_upper) === 0) rr_ci_upper = '0.000';
            } else {
              rr_ci_lower = 'N/A';
              rr_ci_upper = 'N/A';
            }
          } else if (rr_calc === Infinity) {
            relativeRisk = 'Inf';
            // 무한대인 경우 신뢰구간 계산은 의미가 없음
            rr_ci_lower = 'Inf';
            rr_ci_upper = 'Inf';
          } else {
            relativeRisk = 'N/A';
            rr_ci_lower = 'N/A';
            rr_ci_upper = 'N/A';
          }
        } catch (e) {
          console.error(`RR/CI calculation error for item ${factorName}:`, e);
          relativeRisk = 'Error';
          rr_ci_lower = 'Error';
          rr_ci_upper = 'Error';
        }
      } else {
        // 0인 셀이 없을 때는 그냥 계산
        const total_exposed = a_obs + b_obs;
        const total_unexposed = c_obs + d_obs;

        try {
          const risk_exposed = total_exposed > 0 ? a_obs / total_exposed : 0;
          const risk_unexposed = total_unexposed > 0 ? c_obs / total_unexposed : 0;

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
            const term_se1 = a_obs * total_exposed;
            const term_se2 = c_obs * total_unexposed;

            if (term_se1 > 0 && term_se2 > 0) {
              se_logRR = Math.sqrt(b_obs / term_se1 + d_obs / term_se2);
            }

            if (isFinite(se_logRR)) {
              const logCI_lower = logRR - z_crit * se_logRR;
              const logCI_upper = logRR + z_crit * se_logRR;
              rr_ci_lower = Math.exp(logCI_lower).toFixed(3);
              rr_ci_upper = Math.exp(logCI_upper).toFixed(3);
              if (rr_calc === 0) rr_ci_lower = '0.000';
              if (parseFloat(rr_ci_upper) === 0) rr_ci_upper = '0.000';
            } else {
              rr_ci_lower = 'N/A';
              rr_ci_upper = 'N/A';
            }
          } else if (rr_calc === Infinity) {
            relativeRisk = 'Inf';
            // 무한대인 경우 신뢰구간 계산은 의미가 없음
            rr_ci_lower = 'Inf';
            rr_ci_upper = 'Inf';
          } else {
            relativeRisk = 'N/A';
            rr_ci_lower = 'N/A';
            rr_ci_upper = 'N/A';
          }
        } catch (e) {
          console.error(`RR/CI calculation error for item ${factorName}:`, e);
          relativeRisk = 'Error';
          rr_ci_lower = 'Error';
          rr_ci_upper = 'Error';
        }
      }
    } else {
      // 노출군 또는 비노출군이 없는 경우 RR 계산 불가
      relativeRisk = 'N/A';
      rr_ci_lower = 'N/A';
      rr_ci_upper = 'N/A';
      console.log(`RR 계산 불가 - ${factorName}: 노출군 또는 비노출군이 없음`);
    }

    // --- 최종 결과 객체 반환 (발병률 추가) ---
    const result = {
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
      hasCorrection // 0.5 보정 적용 여부
    };
    
    // 통계 검증 실행
    validateCohortStatistics(result, factorName);
    
    return result;
  });
});

// --- 통계 계산 검증 함수 ---
const validateCohortStatistics = (result, factorName) => {
  const issues = [];
  
  // P-value 검증
  if (result.pValue !== null) {
    if (result.pValue < 0 || result.pValue > 1) {
      issues.push(`P-value 범위 오류: ${result.pValue}`);
    }
  }
  
  // Relative Risk 검증
  if (result.relativeRisk !== 'N/A' && result.relativeRisk !== 'Inf' && result.relativeRisk !== 'Error') {
    const rr = parseFloat(result.relativeRisk);
    if (isNaN(rr) || rr < 0) {
      issues.push(`Relative Risk 값 오류: ${result.relativeRisk}`);
    }
  }
  
  // 발병률 검증
  if (result.incidence_exposed_formatted !== 'N/A') {
    const exposed = parseFloat(result.incidence_exposed_formatted);
    if (!isNaN(exposed) && (exposed < 0 || exposed > 100)) {
      issues.push(`노출군 발병률 범위 오류: ${result.incidence_exposed_formatted}`);
    }
  }
  
  if (result.incidence_unexposed_formatted !== 'N/A') {
    const unexposed = parseFloat(result.incidence_unexposed_formatted);
    if (!isNaN(unexposed) && (unexposed < 0 || unexposed > 100)) {
      issues.push(`비노출군 발병률 범위 오류: ${result.incidence_unexposed_formatted}`);
    }
  }
  
  if (issues.length > 0) {
    console.warn(`코호트 통계 검증 오류 - ${factorName}:`, issues);
  }
  
  return issues.length === 0;
};

// --- Fisher의 정확검정 계산 함수 (양측 검정) ---
const calculateFisherExactTest = (a, b, c, d) => {
  // 2x2 분할표에서 Fisher의 정확검정 계산 (양측 검정)
  const n = a + b + c + d;
  const row1 = a + b;
  const row2 = c + d;
  const col1 = a + c;
  const col2 = b + d;
  
  // 관측된 분할표의 확률 계산
  const observedProb = (factorial(row1) * factorial(row2) * factorial(col1) * factorial(col2)) /
                      (factorial(n) * factorial(a) * factorial(b) * factorial(c) * factorial(d));
  
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
      
      // 관측된 분할표보다 극단적인 경우의 확률만 합산 (양측 검정)
      if (currentProb <= observedProb) {
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

// --- Vuex: 분석 요약 업데이트 ---
watch([cohortAnalysisResults, useYatesCorrection], () => {
  const fisherUsed = cohortAnalysisResults.value.some(r => r.adj_chi === null && r.pValue !== null);
  const yatesUsed = useYatesCorrection.value;
  let statMethod = 'chi-square';
  if (fisherUsed && yatesUsed) statMethod = 'yates-fisher';
  else if (fisherUsed && !yatesUsed) statMethod = 'chi-fisher';
  else if (!fisherUsed && yatesUsed) statMethod = 'yates';

  const haldaneCorrectionUsed = cohortAnalysisResults.value.some(r => r.hasCorrection);
  store.commit('SET_ANALYSIS_OPTIONS', { statMethod, haldaneCorrection: haldaneCorrectionUsed });
  
  // 분석 결과를 store에 저장 (의심식단 드롭다운용)
  store.commit('SET_ANALYSIS_RESULTS', { 
    type: 'cohort', 
    results: cohortAnalysisResults.value 
  });
}, { immediate: true });

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
  font-family: inherit;
}
.cell-item {
  text-align: left !important;
  white-space: normal !important;
  font-weight: 500;
  word-break: keep-all;
  font-family: inherit;
}
.cell-count {
  /* 환자수 */
  font-family: inherit;
  font-weight: normal;
}
.cell-total {
  /* 대상자수 */
  font-weight: normal;
  font-family: inherit;
}
.cell-stat {
  /* 통계값들 (발병률 포함) */
  font-family: "SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace;
  font-size: 0.95em;
  letter-spacing: 0.02em;
}
/* 특정 값 스타일 (변경 없음) */
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

/* --- 버튼 그룹 스타일 --- */
.button-group {
  display: flex;
  align-items: center;
  gap: 10px;
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

/* --- 툴팁 스타일 --- */
.control-button-wrapper {
  position: relative;
  display: inline-block;
}

.control-tooltip {
  position: absolute;
  bottom: calc(100% + 5px);
  left: 50%;
  transform: translateX(-50%);
  background-color: #333;
  color: white;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 12px;
  white-space: nowrap;
  z-index: 1000;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  animation: tooltipFadeIn 0.2s ease-in-out;
}

.control-tooltip::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 5px solid transparent;
  border-top-color: #333;
}

@keyframes tooltipFadeIn {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}
</style>
