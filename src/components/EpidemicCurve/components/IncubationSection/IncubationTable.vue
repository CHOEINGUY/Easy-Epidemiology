<template>
  <div class="table-section">
    <div class="table-title" style="display: flex; align-items: center; justify-content: space-between;">
      <span style="display: flex; align-items: center;">
        <span class="selected-variable-details__title-dot"></span>
        <span style="margin-left: 0.2em;">예상 잠복 기간별 환자 수</span>
      </span>
      <div style="position: relative;">
        <button @click="handleCopyTable" class="copy-chart-button">
          <span class="button-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          </span>
          <span class="button-text">복사</span>
        </button>
        <div v-if="isTableCopied" class="copy-tooltip check-tooltip">
          <svg width="32" height="32" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="12" fill="#1a73e8"/>
            <polyline points="7,13 11,17 17,9" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
      </div>
    </div>

    <table v-if="tableData.length > 0" class="frequency-table">
      <thead>
        <tr>
          <th class="frequency-table__header">예상 잠복 기간</th>
          <th class="frequency-table__header">수</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(item, index) in tableData" :key="'incubation-' + index" class="frequency-table__row">
          <td class="frequency-table__cell">{{ item.intervalLabel }}</td>
          <td class="frequency-table__cell">{{ item.count }}</td>
        </tr>
      </tbody>
    </table>

    <div v-else class="no-data-message">
      <DataGuideMessage
        v-if="!hasExposureDateTime && !isIndividualExposureColumnVisible"
        icon="event"
        title="의심원 노출시간을 설정해주세요"
        description="잠복기 분석을 위해 기준이 되는 의심원 노출시간을 설정해야 합니다."
        :steps="exposureGuideSteps"
      />
      <DataGuideMessage
        v-else
        icon="schedule"
        title="증상 발현 시간 데이터가 필요합니다"
        description="유행곡선을 생성하려면 환자들의 증상 발현 시간 정보가 필요합니다."
        :steps="symptomGuideSteps"
      />
    </div>

    <div class="table-title incubation-summary-title">
      <span style="display: flex; align-items: center;">
        <span class="selected-variable-details__title-dot"></span>
        <span style="margin-left: 0.2em;">잠복기 요약 정보</span>
      </span>
    </div>

    <div class="incubation-summary-info-embedded">
      <div class="info-item">
        <span class="info-label">최소 잠복기 :</span>
        <span class="info-value">{{ minIncubation }}</span>
      </div>
      <div class="info-item">
        <span class="info-label">최대 잠복기 :</span>
        <span class="info-value">{{ maxIncubation }}</span>
      </div>
      <div class="info-item">
        <span class="info-label">평균 잠복기 :</span>
        <span class="info-value">{{ avgIncubation }}</span>
      </div>
      <div class="info-item">
        <span class="info-label">중앙 잠복기 :</span>
        <span class="info-value">{{ medianIncubation }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import DataGuideMessage from '../../../DataGuideMessage.vue';
import { useClipboardOperations } from '../../composables/useClipboardOperations';

// 안내 메시지 steps
const exposureGuideSteps = [
  { number: '1', text: '위의 의심원 노출시간 입력란을 클릭하세요' },
  { number: '2', text: '모든 환자에게 공통으로 적용될 기준 노출시간을 설정하세요' },
  { number: '3', text: '설정 후 잠복기 분석이 자동으로 시작됩니다' }
];

const symptomGuideSteps = [
  { number: '1', text: '데이터 입력 화면에서 증상발현시간 열에 시간을 입력하세요' },
  { number: '2', text: '최소 2명 이상의 환자 데이터가 필요합니다' },
  { number: '3', text: '시간 형식: YYYY-MM-DD HH:MM (예: 2024-01-15 14:30)' }
];

defineProps({
  tableData: {
    type: Array,
    required: true
  },
  minIncubation: {
    type: String,
    default: '--:--'
  },
  maxIncubation: {
    type: String,
    default: '--:--'
  },
  avgIncubation: {
    type: String,
    default: '--:--'
  },
  medianIncubation: {
    type: String,
    default: '--:--'
  },
  hasExposureDateTime: {
    type: Boolean,
    default: false
  },
  isIndividualExposureColumnVisible: {
    type: Boolean,
    default: false
  }
});

const { isIncubationTableCopied, copyIncubationTableToClipboard } = useClipboardOperations();
const isTableCopied = isIncubationTableCopied;

const handleCopyTable = () => {
  copyIncubationTableToClipboard();
};
</script>

<style scoped>
.table-section {
  display: flex;
  flex-direction: column;
  flex: 1;
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

.incubation-summary-title {
  margin-top: 20px;
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

.incubation-summary-info-embedded {
  margin: 0 20px 20px 20px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 8px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.info-item:last-child {
  margin-bottom: 0;
}

.info-label {
  font-size: 14px;
  color: #666;
  min-width: 100px;
}

.info-value {
  font-size: 14px;
  color: #333;
  font-weight: 500;
}

.no-data-message { 
  padding: 20px; 
  text-align: center; 
  color: #666; 
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

@keyframes fadeInOut {
  0% { opacity: 0; }
  10% { opacity: 0.95; }
  90% { opacity: 0.95; }
  100% { opacity: 0; }
}
</style>
