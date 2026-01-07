<template>
  <div class="output-area">
    <div class="output-row">
      <div class="analysis-table-container">
        <div class="table-title table-title--with-copy">
          <span>
            <span class="selected-variable-details__title-dot"></span>&nbsp;요인별 표 분석 결과(코호트)
          </span>
          <div class="button-group">
            <button @click="$emit('toggle-yates')" class="filter-button" :class="{ active: useYatesCorrection }">
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
          :style="{ fontSize: fontSize + 'px', '--table-font-size': fontSize + 'px' }"
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
              v-if="!results || results.length === 0"
            >
              <td colspan="11" class="no-data-row">
                분석할 데이터가 없거나 Vuex 스토어 연결을 확인하세요.
              </td>
            </tr>
            <tr
              v-for="(result, index) in results"
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
</template>

<script setup>
import { ref, defineProps, defineEmits } from 'vue';

const props = defineProps({
  results: {
    type: Array,
    required: true,
    default: () => []
  },
  fontSize: {
    type: Number,
    required: true
  },
  useYatesCorrection: {
    type: Boolean,
    required: true
  }
});

defineEmits(['toggle-yates']);

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
    props.results.forEach(result => {
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
        ${props.results.map(result => `
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
</script>

<style scoped>
.output-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: transparent; /* Transparent */
  overflow: hidden;
}

.output-row {
  display: flex;
  gap: 24px;
  height: 100%;
}

.analysis-table-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: auto;
  padding: 0; /* Remove padding */
}

.table-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0;
  padding: 16px 20px; /* Add padding back */
  font-size: 1.1rem;
  font-weight: 600;
  color: #1a1a1a;
}

.selected-variable-details__title-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  background-color: #1a73e8;
  border-radius: 50%;
  margin-right: 8px;
}

.button-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background-color: white;
  border: 1px solid #dadce0;
  border-radius: 4px;
  color: #5f6368;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.filter-button:hover {
  background-color: #f8f9fa;
  color: #202124;
  border-color: #dadce0;
}

.filter-button.active {
  background-color: #e8f0fe;
  color: #1967d2;
  border-color: #d2e3fc;
}

.copy-chart-button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background-color: #fff;
  border: 1px solid #dadce0;
  border-radius: 4px;
  color: #5f6368;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.copy-chart-button:hover {
  background-color: #f8f9fa;
  color: #202124;
  border-color: #dadce0;
}

.copy-tooltip {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: white;
  border-radius: 50%;
  box-shadow: 0 2px 10px rgba(0,0,0,0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px;
  pointer-events: none;
  animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  z-index: 10;
}

.check-tooltip {
  background-color: white;
}

/* 테이블 스타일 */
.analysis-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--table-font-size, 14px);
  table-layout: fixed;
}

.analysis-table th,
.analysis-table td {
  border: 1px solid #e0e0e0;
  padding: 8px;
  text-align: center;
  vertical-align: middle;
}

.analysis-table thead th {
  background-color: #f8f9fa;
  font-weight: 600;
  color: #495057;
  position: sticky;
  top: 0;
  z-index: 1;
}

.header-item {
  width: 14%;
  background-color: #f1f3f4;
}

.header-group-exposed {
  width: 25%;
  background-color: #e8f0fe;
  color: #1967d2;
}

.header-group-unexposed {
  width: 25%;
  background-color: #fce8e6;
  color: #c5221f;
}

.header-stat {
  width: 12%;
  background-color: #e6f4ea;
  color: #137333;
}

.header-sub {
  font-size: 0.9em;
  font-weight: normal;
  background-color: #f8f9fa;
  color: #5f6368;
}

.cell-item {
  text-align: left !important;
  font-weight: 500;
  background-color: #fff;
}

.cell-total {
  background-color: #f8f9fa;
}

.cell-count {
  font-weight: 500;
}

.cell-stat {
  font-feature-settings: "tnum";
  font-variant-numeric: tabular-nums;
}

.value-pvalue {
  font-weight: 500;
}

.significant-row td {
  background-color: #fffbe6;
}

.significant {
  color: #d93025;
  font-weight: 700;
}

.no-data-row {
  text-align: center;
  padding: 40px;
  color: #5f6368;
  font-style: italic;
}

.test-method.fisher {
  color: #d93025;
  font-weight: bold;
}

.table-legend {
  margin-top: 16px;
  padding: 12px;
  background-color: #f8f9fa;
  border-radius: 4px;
  border: 1px solid #e0e0e0;
}

.legend-header {
  margin-bottom: 8px;
}

.legend-title {
  font-size: 13px;
  font-weight: 600;
  color: #3c4043;
}

.legend-content--plain {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.legend-item-plain {
  font-size: 12px;
  color: #5f6368;
  line-height: 1.4;
}

.correction-note {
  margin-top: 4px;
  font-style: italic;
}

@keyframes popIn {
  from {
    transform: translate(-50%, -50%) scale(0.5);
    opacity: 0;
  }
  to {
    transform: translate(-50%, -50%) scale(1);
    opacity: 1;
  }
}
</style>
