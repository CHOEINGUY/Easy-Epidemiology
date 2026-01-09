<template>
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
</template>

<script setup lang="ts">
defineProps<{
  useYatesCorrection?: boolean;
}>();
</script>

<style scoped>
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
  font-family: inherit;
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
  font-family: inherit;
}

.correction-note {
  margin-top: 4px;
  font-style: italic;
  color: #5f6368;
}
</style>
