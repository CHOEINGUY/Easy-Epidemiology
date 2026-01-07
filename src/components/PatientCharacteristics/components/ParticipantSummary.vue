<template>
  <div class="participant-summary">
    <div class="participant-summary__item">
      <span class="summary-bar__label">조사 대상자 수&nbsp;</span>
      <span class="summary-bar__value">{{ totalParticipants }}</span>
      <span class="summary-bar__unit">명</span>
    </div>
    <div class="participant-summary__item">
      <span class="summary-bar__label">총 환자 수&nbsp;</span>
      <span class="summary-bar__value">{{ totalPatients }}</span>
      <span class="summary-bar__unit">명</span>
    </div>
    <div class="participant-summary__item">
      <div class="control-button-wrapper">
        <div 
          class="attack-rate-display"
          @mouseenter="showTooltip('attackRate', '발병률 = (환자여부에 1을 입력한 사람 수 ÷ 전체 조사 대상자 수) × 100')"
          @mouseleave="hideTooltip"
        >
          <span class="summary-bar__label">발병률&nbsp;</span>
          <span class="summary-bar__value">{{ attackRate }}</span>
          <span class="summary-bar__unit">%</span>
        </div>
        <div v-if="activeTooltip === 'attackRate'" class="control-tooltip attack-rate-tooltip">{{ tooltipText }}</div>
      </div>
    </div>
    <!-- 확진율 (확진율 모드가 켜져 있을 때만 표시) -->
    <div v-if="isConfirmedCaseColumnVisible" class="participant-summary__item">
      <div class="control-button-wrapper">
        <div 
          class="confirmed-rate-display"
          @mouseenter="showTooltip('confirmedRate', '확진율 = (확진여부에 1을 입력한 사람 수 ÷ 전체 조사 대상자 수) × 100')"
          @mouseleave="hideTooltip"
        >
          <span class="summary-bar__label">확진율&nbsp;</span>
          <span class="summary-bar__value">{{ confirmedRate }}</span>
          <span class="summary-bar__unit">%</span>
        </div>
        <div v-if="activeTooltip === 'confirmedRate'" class="control-tooltip confirmed-rate-tooltip">{{ tooltipText }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
// ParticipantSummary.vue - 대상자 요약 정보 컴포넌트
import { useTooltip } from '../composables/useTooltip';

defineProps({
  totalParticipants: {
    type: Number,
    required: true
  },
  totalPatients: {
    type: Number,
    required: true
  },
  attackRate: {
    type: String,
    required: true
  },
  confirmedRate: {
    type: String,
    required: true
  },
  isConfirmedCaseColumnVisible: {
    type: Boolean,
    default: false
  }
});

const { activeTooltip, tooltipText, showTooltip, hideTooltip } = useTooltip();
</script>

<style scoped>
.participant-summary { 
  display: flex; 
  justify-content: flex-end; 
  gap: 20px; 
}

.participant-summary__item { 
  background-color: white; 
  border: none; 
  padding: 7px 15px; 
  text-align: right; 
  border-radius: 12px; 
  display: flex; 
  align-items: baseline; 
}

.summary-bar__label { 
  font-size: 0.8rem; 
  color: #666; 
}

.summary-bar__value { 
  font-weight: normal; 
  font-size: 1.5rem; 
  color: #333; 
  font-family: sans-serif; 
  margin-left: 4px; 
  margin-right: 2px; 
}

.summary-bar__unit { 
  font-size: 0.8rem; 
  color: #666; 
}

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
  z-index: 1050;
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

.attack-rate-display,
.confirmed-rate-display {
  cursor: help;
  display: flex;
  align-items: baseline;
  padding: 2px 4px;
  border-radius: 4px;
  transition: background-color 0.2s ease;
}

.attack-rate-display:hover,
.confirmed-rate-display:hover {
  background-color: rgba(26, 115, 232, 0.1);
}

.attack-rate-tooltip,
.confirmed-rate-tooltip {
  left: auto !important;
  right: 0 !important;
  transform: none !important;
}

.attack-rate-tooltip::after,
.confirmed-rate-tooltip::after {
  left: auto !important;
  right: 10px !important;
  transform: translateX(0) !important;
}
</style>
