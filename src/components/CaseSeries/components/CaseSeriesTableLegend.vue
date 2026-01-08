<template>
  <div class="table-legend">
    <div class="legend-header">
      <span class="legend-title">통계 검정 방법 및 표시 기준</span>
    </div>
    <div class="legend-content legend-content--plain">
      <div class="legend-item-plain">N/A : 계산 불가(셀 값이 0인 경우)</div>
      <div class="legend-item-plain">발병률(%) : 사례군 내 해당 요인 노출자 비율</div>
    </div>
  </div>
</template>

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
</style>
