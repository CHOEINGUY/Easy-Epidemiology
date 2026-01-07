<template>
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
        </div>
        <table
          class="analysis-table"
          :style="{ fontSize: fontSize + 'px', '--table-font-size': fontSize + 'px' }"
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
            <tr v-if="!results || results.length === 0">
              <td colspan="5" class="no-data-row">
                분석할 데이터가 없거나 Vuex 스토어 연결을 확인하세요.
              </td>
            </tr>
            <tr v-for="(result, index) in results" :key="index" class="data-row">
              <td class="cell-item">{{ result.item }}</td>
              <td class="cell-count">{{ result.exposedCases }}</td>
              <td class="cell-count">{{ result.unexposedCases }}</td>
              <td class="cell-total">{{ result.totalCases }}</td>
              <td class="cell-stat">{{ result.incidence_formatted }}</td>
            </tr>
          </tbody>
        </table>
        
        <div class="table-legend">
          <div class="legend-header">
            <span class="legend-title">통계 검정 방법 및 표시 기준</span>
          </div>
          <div class="legend-content legend-content--plain">
            <div class="legend-item-plain">N/A : 계산 불가(셀 값이 0인 경우)</div>
            <div class="legend-item-plain">발병률(%) : 사례군 내 해당 요인 노출자 비율</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, defineProps } from 'vue';

const props = defineProps({
  results: {
    type: Array,
    required: true,
    default: () => []
  },
  fontSize: {
    type: Number,
    required: true
  }
});

const isTableCopied = ref(false);

const copyTableToClipboard = async () => {
  try {
    const tableData = [];
    tableData.push(['요인(식단)', '섭취자', '비섭취자', '합계', '발병률(%)']);
    props.results.forEach((result) => {
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
.output-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: transparent;
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
  padding: 0;
}

.table-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0;
  padding: 16px 20px;
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
  width: 25%;
  background-color: #f1f3f4;
}

.header-group-case {
  background-color: #e8f0fe;
  color: #1967d2;
}

.header-stat {
  width: 15%;
  background-color: #f8f9fa;
  color: #495057;
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

.no-data-row {
  text-align: center !important;
  padding: 40px;
  color: #5f6368;
  font-style: italic;
}

/* Legend Styles */
.table-legend {
  margin-top: 16px;
  margin-left: 20px;
  margin-right: 20px;
  margin-bottom: 20px;
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
