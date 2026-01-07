<template>
  <div class="editor-pane">
    <h2 class="pane-title">보고서 항목</h2>
    
    <!-- 차트 이미지는 EpidemicCurve 탭 "보고서 저장" 버튼으로 자동 생성됨 -->

    <ul class="item-list">
      <li class="design-item">
        <div class="design-header">
          <span class="item-label">조사 디자인</span>
          <div 
            v-if="!reportData.studyDesign.value" 
            class="design-notice-inline" 
            :class="getNoticeClass()"
            @mouseenter="showDesignNoticeTooltip = true"
            @mouseleave="showDesignNoticeTooltip = false"
            style="cursor: help; position: relative;"
          >
            <span class="material-icons">{{ getNoticeIcon() }}</span>
            {{ getNoticeText() }}
            <div ref="designNoticeTooltipRef"></div>
          </div>
        </div>
        <div class="design-options">
          <button
            :class="['design-card-btn', { 
              active: reportData.studyDesign.value === 'case-control',
              'unselected': !reportData.studyDesign.value 
            }]"
            @click="reportData.handleStudyDesignChange('case-control')"
          >
            <span class="material-icons card-icon">compare_arrows</span>
            <span class="card-text">환자-대조군 연구</span>
          </button>
          <button
            :class="['design-card-btn', { 
              active: reportData.studyDesign.value === 'cohort',
              'unselected': !reportData.studyDesign.value 
            }]"
            @click="reportData.handleStudyDesignChange('cohort')"
          >
            <span class="material-icons card-icon">timeline</span>
            <span class="card-text">후향적 코호트 연구</span>
          </button>
        </div>
      </li>
      <li class="plain-item">
        <span class="item-label"><span class="material-icons icon">stacked_bar_chart</span> 사례 발병률</span>
        <span :class="['badge', { empty: !reportData.caseAttackRate.value }]">
          {{ reportData.caseAttackRate.value ? reportData.caseAttackRate.value + '%' : '미입력' }}
        </span>
      </li>
      <li class="plain-item">
        <span class="item-label"><span class="material-icons icon">bar_chart</span> 환자 발병률</span>
        <span :class="['badge', { empty: !reportData.patientAttackRate.value }]">
          {{ reportData.patientAttackRate.value ? reportData.patientAttackRate.value + '%' : '미입력' }}
        </span>
      </li>
      <li class="plain-item column">
        <div class="item-label"><span class="material-icons icon">event</span> 추정 노출일시</div>
        <div class="value-row"><span :class="['badge', { empty: !reportData.exposureDate.value }]">{{ reportData.exposureDate.value || '미입력' }}</span></div>
      </li>
      <li class="plain-item column">
        <div class="item-label"><span class="material-icons icon">medical_services</span> 최초사례 발생</div>
        <div class="value-row"><span :class="['badge', { empty: !reportData.firstCaseDate.value }]">{{ reportData.firstCaseDate.value || '미입력' }}</span></div>
      </li>
      <li class="plain-item">
        <span class="item-label"><span class="material-icons icon">timer</span> 평균 잠복기(시간)</span>
        <span :class="['badge', { empty: !reportData.meanIncubation.value }]">
          {{ reportData.meanIncubation.value ? reportData.meanIncubation.value + '시간' : '미입력' }}
        </span>
      </li>
      <li class="plain-item">
        <span class="item-label"><span class="material-icons icon">science</span> 추정 감염원</span>
        <span :class="['badge', { empty: !reportData.suspectedSource.value }]">
          {{ reportData.suspectedSource.value || '미입력' }}
        </span>
      </li>
      <li class="plain-item">
        <span class="item-label">
          <span class="material-icons icon">restaurant</span> 
          식품 섭취력 분석
        </span>
        <div class="badge-container">
          <span 
            v-if="reportData.hasTooManyFoodItems.value && reportData.foodIntakeAnalysis.value"
            class="warning-indicator"
            @mouseenter="showFoodAnalysisTooltip = true"
            @mouseleave="showFoodAnalysisTooltip = false"
            style="position: relative; cursor: help;"
          >
            <span class="material-icons">warning</span>
            <div ref="foodAnalysisTooltipRef"></div>
          </span>
          <span :class="['badge', { 
            empty: !reportData.foodIntakeAnalysis.value, 
            warning: reportData.hasTooManyFoodItems.value && reportData.foodIntakeAnalysis.value 
          }]">
            {{ reportData.foodIntakeAnalysis.value ? '입력됨' : '미입력' }}
          </span>
        </div>
      </li>
      <li class="plain-item">
        <span class="item-label"><span class="material-icons icon">show_chart</span> 유행곡선 차트</span>
        <span :class="['badge', { empty: !reportData.hasEpidemicChart.value }]">
          {{ reportData.hasEpidemicChart.value ? '입력됨' : '미입력' }}
        </span>
      </li>
      <li class="plain-item">
        <span class="item-label"><span class="material-icons icon">timeline</span> 잠복기 차트</span>
        <span :class="['badge', { empty: !reportData.hasIncubationChart.value }]">
          {{ reportData.hasIncubationChart.value ? '입력됨' : '미입력' }}
        </span>
      </li>
      <li class="plain-item">
        <span class="item-label"><span class="material-icons icon">table_chart</span> 주요증상 표</span>
        <span :class="['badge', { empty: !reportData.hasMainSymptomsTable.value }]">
          {{ reportData.hasMainSymptomsTable.value ? '입력됨' : '미입력' }}
        </span>
      </li>

    </ul>
    
    <!-- Tooltips -->
    <Teleport to="body">
       <div v-if="showFoodAnalysisTooltip && foodAnalysisTooltipRef" 
            class="item-tooltip tooltip-body" 
            :style="foodAnalysisTooltipStyle">
         <div class="tooltip-text">
           <div>요인(식단)이 {{ reportData.foodItemCount.value }}개로 34개를 초과합니다.</div>
           <div>표4 요인별 표분석결과에 데이터가 들어가지 않습니다.</div>
         </div>
       </div>

       <div v-if="showDesignNoticeTooltip && designNoticeTooltipRef"
            class="item-tooltip tooltip-body"
            :style="designNoticeTooltipStyle">
         <div class="tooltip-text">
           <div>조사 디자인을 먼저 선택해주세요.</div>
         </div>
       </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, defineProps } from 'vue';

const props = defineProps({
  reportData: {
    type: Object,
    required: true
  }
});

// Tooltip state
const showFoodAnalysisTooltip = ref(false);
const showDesignNoticeTooltip = ref(false);

const foodAnalysisTooltipRef = ref(null);
const designNoticeTooltipRef = ref(null);

// Tooltip Positioning
const foodAnalysisTooltipStyle = computed(() => {
  if (!foodAnalysisTooltipRef.value) return {};
  const badgeRect = foodAnalysisTooltipRef.value.parentElement?.getBoundingClientRect();
  if (!badgeRect) return {};
  return {
    position: 'fixed',
    bottom: `${window.innerHeight - badgeRect.top + 8}px`,
    left: `${badgeRect.left + badgeRect.width / 2}px`,
    transform: 'translateX(-50%)',
    zIndex: 10000
  };
});

const designNoticeTooltipStyle = computed(() => {
  if (!designNoticeTooltipRef.value) return {};
  const elRect = designNoticeTooltipRef.value.parentElement?.getBoundingClientRect();
  if (!elRect) return {};
  return {
    position: 'fixed',
    bottom: `${window.innerHeight - elRect.top + 8}px`,
    left: `${elRect.left + elRect.width / 2}px`,
    transform: 'translateX(-50%)',
    zIndex: 10000
  };
});

// Helpers
function getNoticeClass() {
  const status = props.reportData.analysisStatus.value;
  if (status === 'no-analysis' || status === 'no-valid-data') {
    return 'design-notice-inline analysis-required';
  }
  return 'design-notice-inline selection-required';
}

function getNoticeIcon() {
  const status = props.reportData.analysisStatus.value;
  if (status === 'no-analysis' || status === 'no-valid-data') {
    return 'science';
  }
  return 'info';
}

function getNoticeText() {
  const status = props.reportData.analysisStatus.value;
  if (status === 'no-analysis' || status === 'no-valid-data') {
    return '분석 필요';
  }
  return '선택 필요';
}
</script>

<style scoped>
/* Inherited styles from parent (need to be duplicated or global, sticking to scoped duplication for now as requested by user to keep refactor clean visually) */
.editor-pane {
  flex: 0 0 280px; /* 좌측 폭 고정 */
  background-color: #ffffff;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  padding: 20px 20px 20px 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.pane-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 20px;
}

.item-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.design-item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 8px 0;
  border-bottom: 1px solid #e0e0e0;
}

.design-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  margin-bottom: 6px;
}

.item-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 500;
  color: #5f6368;
}

.item-label .icon {
  font-size: 18px;
  color: #5f6368;
}

.design-options {
  display: flex;
  gap: 8px;
  width: 100%;
}

.design-card-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 10px 4px;
  border: 1px solid #dadce0;
  border-radius: 8px;
  background-color: #fff;
  cursor: pointer;
  transition: all 0.2s;
}

.design-card-btn.active {
  border-color: #1a73e8;
  background-color: #e8f0fe;
  color: #1967d2;
}

.design-card-btn.unselected:hover {
  background-color: #f8f9fa;
  border-color: #202124;
}

.design-card-btn .card-icon {
  font-size: 20px;
}

.design-card-btn .card-text {
  font-size: 11px;
  font-weight: 500;
  text-align: center;
}

.plain-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 8px;
  border-bottom: 1px dashed #e0e0e0;
}

.plain-item.column {
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
}

.plain-item.column .value-row {
  width: 100%;
  display: flex;
  justify-content: flex-end;
}

.badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 12px;
  background-color: #e6f4ea;
  color: #137333;
  font-size: 12px;
  font-weight: 500;
}

.badge.empty {
  background-color: #f1f3f4;
  color: #5f6368;
}

.badge.warning {
  background-color: #fff8e1;
  color: #f57c00;
  border: 1px solid #ffcc02;
}

.badge-container {
  display: flex;
  align-items: center;
  gap: 4px;
}

.warning-indicator .material-icons {
  font-size: 18px;
  color: #f57c00;
}

.design-notice-inline {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: linear-gradient(135deg, #fff8e1 0%, #fff3e0 100%);
  border: 1px solid #ffcc02;
  border-radius: 12px;
  color: #f57c00;
  font-size: 12px;
  font-weight: 500;
  box-shadow: 0 1px 4px rgba(255, 193, 7, 0.2);
  animation: fadeInScale 0.3s ease-out;
}

.design-notice-inline .material-icons {
  font-size: 14px;
  color: #f57c00;
}

.design-notice-inline.analysis-required {
  background: linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%);
  border: 1px solid #ef5350;
  color: #d32f2f;
  box-shadow: 0 1px 4px rgba(239, 83, 80, 0.2);
}

.design-notice-inline.analysis-required .material-icons {
  color: #d32f2f;
}

.design-notice-inline.selection-required {
  background: linear-gradient(135deg, #fff8e1 0%, #fff3e0 100%);
  border: 1px solid #ffcc02;
  color: #f57c00;
  box-shadow: 0 1px 4px rgba(255, 193, 7, 0.2);
}

.design-notice-inline.selection-required .material-icons {
  color: #f57c00;
}

@keyframes fadeInScale {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* Tooltip styles duplication for component self-sufficiency */
.item-tooltip {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-bottom: 8px;
  background: #000;
  border: 1px solid #333;
  border-radius: 8px;
  padding: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  font-size: 13px;
  line-height: 1.4;
  z-index: 1000;
  max-width: 320px;
  white-space: normal;
  color: #fff;
  display: flex;
  align-items: flex-start;
  gap: 6px;
}

.item-tooltip::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 6px solid transparent;
  border-top-color: #000;
}

.tooltip-body {
  position: fixed !important;
  z-index: 10000 !important;
}

.tooltip-text > div {
  margin-bottom: 2px;
}
</style>
