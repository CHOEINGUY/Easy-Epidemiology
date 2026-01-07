<template>
  <div class="analysis-table-container">
    <div class="table-title table-title--with-copy">
      <span>
        <span class="selected-variable-details__title-dot"></span>&nbsp;임상증상별 빈도
      </span>
      <div style="position: relative;">
        <button @click="$emit('copy')" class="copy-chart-button">
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
    <table class="frequency-table">
      <colgroup>
        <col style="width: 80px;" />
        <col style="width: 80px;" />
        <col style="width: 80px;" />
      </colgroup>
      <thead>
        <tr>
          <th>증상명</th>
          <th>환자수(명)</th>
          <th>백분율(%)</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(item, idx) in data" :key="idx">
          <td>{{ item.name }}</td>
          <td>{{ item.count }}</td>
          <td>{{ item.percent }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
defineProps({
  data: {
    type: Array,
    default: () => []
  },
  isTableCopied: {
    type: Boolean,
    default: false
  }
});

defineEmits(['copy']);
</script>

<style scoped>
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
  background-color: #1a73e8;
  margin-right: 0.4em;
  vertical-align: middle;
  border-radius: 50%;
}
.frequency-table {
  font-size: 14px;
  border-collapse: collapse;
  margin: 0 20px 20px 20px;
  table-layout: fixed;
  width: auto;
}
.frequency-table th,
.frequency-table td {
  border: 1px solid #ddd;
  padding: 8px 12px;
  text-align: center;
  white-space: nowrap;
}
.frequency-table thead th {
  background-color: #f2f2f2;
  font-weight: 500;
  position: sticky;
  top: 0;
  z-index: 1;
}
.frequency-table tbody td:first-child {
  text-align: left;
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
.copy-tooltip.check-tooltip svg {
  display: block;
}
@keyframes fadeInOut {
  0% { opacity: 0; }
  10% { opacity: 0.95; }
  90% { opacity: 0.95; }
  100% { opacity: 0; }
}
</style>
