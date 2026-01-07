<template>
  <div class="preview-pane">
    <div class="preview-header">
      <h2 class="pane-title">미리보기</h2>
      <div class="download-buttons">
        <button 
          class="download-btn" 
          :class="{ 
            'primary': reportData.studyDesign.value && !reportData.hasTooManyFoodItems.value,
            'warning': !reportData.studyDesign.value || reportData.hasTooManyFoodItems.value 
          }"
          @click="reportData.studyDesign.value ? reportData.downloadHwpxReport() : null"
          @mouseenter="showDownloadTooltip = true"
          @mouseleave="showDownloadTooltip = false"
        >
          <span class="material-icons">{{ !reportData.studyDesign.value ? 'info' : (reportData.hasTooManyFoodItems.value ? 'warning' : 'description') }}</span>
          {{ !reportData.studyDesign.value ? '조사 디자인 선택 필요' : '보고서 다운로드' }}
          <div ref="downloadTooltipRef"></div>
        </button>
      </div>
    </div>
    <div class="report-preview" v-html="reportData.renderedHtml.value"></div>

    <!-- Tooltip -->
    <Teleport to="body">
      <div v-if="showDownloadTooltip && downloadTooltipRef" 
           class="tooltip tooltip-body" 
           :style="downloadTooltipStyle">
        <div v-if="!reportData.studyDesign.value" class="tooltip-warning">
          조사 디자인을 먼저 선택해주세요.
        </div>
        <div v-else-if="reportData.hasTooManyFoodItems.value" class="tooltip-warning">
          요인(식단)이 {{ reportData.foodItemCount.value }}개로 34개를 초과합니다. 표4 요인별 표분석결과에 데이터가 들어가지 않습니다.
        </div>
        <div v-else class="tooltip-normal">
          요인(식단) {{ reportData.foodItemCount.value }}개가 포함됩니다.
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, defineProps } from 'vue';

defineProps({
  reportData: {
    type: Object,
    required: true
  }
});

const showDownloadTooltip = ref(false);
const downloadTooltipRef = ref(null);

const downloadTooltipStyle = computed(() => {
  if (!downloadTooltipRef.value) return {};
  const buttonRect = downloadTooltipRef.value.parentElement?.getBoundingClientRect();
  if (!buttonRect) return {};
  return {
    position: 'fixed',
    bottom: `${window.innerHeight - buttonRect.top + 8}px`,
    right: `${window.innerWidth - buttonRect.right + 20}px`,
    zIndex: 10000
  };
});
</script>

<style scoped>
/* Duplicate styles for preview pane */
.preview-pane {
  flex: 1;
  background-color: #ffffff;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  padding: 20px;
  overflow: auto;
  min-height: 0; /* Critical for flex scroll */
  display: flex;
  flex-direction: column;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  flex-shrink: 0;
}

.pane-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.download-buttons {
  display: flex;
  gap: 8px;
}

.download-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
  position: relative;
}

.download-btn.primary {
  background-color: #1a73e8;
  color: white;
}

.download-btn.primary:hover {
  background-color: #1557b0;
}

.download-btn.warning {
  background: linear-gradient(135deg, #fff8e1 0%, #fff3e0 100%);
  border: 1px solid #ffcc02;
  color: #f57c00;
  box-shadow: 0 1px 4px rgba(255, 193, 7, 0.2);
}

.download-btn.warning:hover {
  background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
  border-color: #ffb300;
}

.report-preview {
  flex: 1;
  overflow-y: auto;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 20px;
  background-color: #fff;
  min-height: 0; /* Critical for nested flex scroll */
}

/* Tooltip Styles */
.tooltip {
  position: absolute;
  bottom: 100%;
  right: 0;
  margin-bottom: 8px;
  background: #000;
  border: 1px solid #333;
  border-radius: 8px;
  padding: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  font-size: 13px;
  line-height: 1.4;
  z-index: 1000;
  max-width: 300px;
  white-space: normal;
}

.tooltip::after {
  content: '';
  position: absolute;
  top: 100%;
  right: 20px;
  border: 6px solid transparent;
  border-top-color: #000;
}

.tooltip-warning {
  color: #fff;
  display: flex;
  align-items: flex-start;
  gap: 6px;
}

.tooltip-normal {
  color: #fff;
  text-align: center;
}

.tooltip-body {
  position: fixed !important;
  z-index: 10000 !important;
}

/* --- Deep Styles for v-html Content --- */
:deep(.report-wrapper) {
  /* This class is defined in reportTemplate.js style block, 
     but we can override or ensure it behaves correctly here if needed. */
  margin: 0 auto; /* Center the report */
}

:deep(.section-heading) {
  font-size: 1.4rem;
  font-weight: 700;
  margin-top: 30px;
  margin-bottom: 15px;
  color: #333;
  border-bottom: 2px solid #555;
  padding-bottom: 8px;
}

:deep(h3) {
  font-size: 1.1rem;
  font-weight: 600;
  margin-top: 24px;
  margin-bottom: 10px;
  color: #444;
}

:deep(.summary-table) {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 20px;
  font-size: 14px;
  color: #333;
}

:deep(.summary-table th),
:deep(.summary-table td) {
  border: 1px solid #bbb;
  padding: 8px 10px;
  vertical-align: middle;
}

:deep(.summary-table th) {
  background-color: #f5f7fa;
  font-weight: 600;
  text-align: center;
}

:deep(.summary-table th.label) {
  width: 25%;
  background-color: #e9ecef;
}

:deep(.summary-table td) {
  text-align: left;
}

:deep(.cell-count),
:deep(.cell-total),
:deep(.cell-stat) {
  text-align: center !important;
}

:deep(.cell-total) {
  font-weight: 600;
  background-color: #fcfcfc;
}

:deep(p) {
  line-height: 1.6;
  margin-bottom: 12px;
  color: #444;
}

/* Ensure images fit and reserve space */
:deep(img) {
  max-width: 100%;
  height: auto;
  min-height: 200px; /* Reserve space for chart images */
  object-fit: contain;
  background-color: #f5f5f5;
}

/* Placeholder chart styling */
:deep(.placeholder-chart) {
  min-height: 200px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}
</style>
