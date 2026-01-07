<template>
  <div class="table-section">
    <div class="table-title">
      <span>
        <span class="selected-variable-details__title-dot"></span>&nbsp;{{ headerName === "" ? "(없음)" : headerName }}
      </span>
      <SharedIconButton
        icon="copy"
        label="테이블 복사"
        :showSuccess="isTableCopied"
        @click="handleCopyTable"
      />
    </div>
    <table class="frequency-table">
      <thead>
        <tr>
          <th class="frequency-table__header">구분</th>
          <th class="frequency-table__header">대상자수</th>
          <th class="frequency-table__header">대상자비율</th>
          <th class="frequency-table__header">환자수</th>
          <th class="frequency-table__header">환자비율</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(data, category) in frequencyData" :key="category" class="frequency-table__row">
          <td class="frequency-table__cell">{{ category }}</td>
          <td class="frequency-table__cell">{{ data.count }}</td>
          <td class="frequency-table__cell">{{ data.totalPercentage.toFixed(1) }}%</td>
          <td class="frequency-table__cell">{{ data.patientCount }}</td>
          <td class="frequency-table__cell">{{ data.patientPercentage.toFixed(1) }}%</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
// FrequencyTable.vue - 빈도 테이블 컴포넌트
import { useClipboardOperations } from '../composables/useClipboardOperations';
import SharedIconButton from './SharedIconButton.vue';

defineProps({
  headerName: {
    type: String,
    required: true
  },
  frequencyData: {
    type: Object,
    required: true
  }
});

const { isTableCopied, copyTableToClipboard } = useClipboardOperations();

const handleCopyTable = () => {
  copyTableToClipboard();
};
</script>

<style scoped>
.table-section {
  display: contents;
}

.table-title { 
  margin: 20px 20px 10px 20px; 
  font-size: 1.1em; 
  color: #333; 
  font-weight: 500; 
  text-align: left; 
  display: flex; 
  align-items: center; 
  justify-content: space-between;
}

.frequency-table { 
  width: calc(100% - 40px); 
  font-size: 14px; 
  border-collapse: collapse; 
  margin: 0px 20px 20px 20px; 
}

.frequency-table th, 
.frequency-table td { 
  border: 1px solid #ddd; 
  padding: 8px; 
  text-align: center; 
}

.frequency-table th { 
  background-color: #f2f2f2; 
  font-weight: 500; 
}

.selected-variable-details__title-dot { 
  display: inline-block; 
  width: 0.3em; 
  height: 0.3em; 
  background-color: currentColor; 
  margin-right: 0.3em; 
  vertical-align: middle; 
}

.copy-chart-button {
  padding: 8px 12px;
  border: none;
  background-color: white;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
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
