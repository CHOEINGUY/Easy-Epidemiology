<template>
  <div class="app">
    <header class="app-header">
      <h1 class="app-title">Easy-Epidemiology Web v2.0</h1>
    </header>

    <div class="report-container">
      <ReportEditor :reportData="reportData" />
      <ReportPreview :reportData="reportData" />
    </div>

    <!-- 분석 필요 모달 -->
    <div v-if="reportData.showAnalysisModal.value" class="modal-overlay" @click="reportData.closeAnalysisModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>분석이 필요합니다</h3>
        </div>
        <div class="modal-body">
          <p>{{ reportData.analysisModalMessage.value }}</p>
          <p>해당 탭에서 통계 분석을 실행한 후 보고서를 작성할 수 있습니다.</p>
        </div>
        <div class="modal-footer">
          <button class="modal-btn primary" @click="reportData.closeAnalysisModal">확인</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useReportData } from './composables/useReportData.js';
import ReportEditor from './components/ReportEditor.vue';
import ReportPreview from './components/ReportPreview.vue';

const reportData = useReportData();
</script>

<style scoped>
.app {
  background-color: #f0f0f0;
  height: 100vh;
  overflow: hidden;
}
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background-color: white;
  border-bottom: 1px solid #e0e0e0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  z-index: 4;
}
.app-title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 300;
  font-family: "Noto Sans KR", sans-serif;
  color: #202124;
}

.report-container {
  display: flex;
  gap: 30px;
  margin: 20px 30px 37px 30px;
  height: calc(100vh - 131px); /* 헤더(37px) + 상하여백(20px+37px) + 탭(37px) */
}

/* Modal Styles from original */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.4);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 20000;
}

.modal-content {
  background-color: white;
  padding: 24px;
  border-radius: 8px;
  width: 400px;
  max-width: 90%;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.modal-header h3 {
  margin: 0 0 16px 0;
  font-size: 18px;
  color: #202124;
}

.modal-body p {
  margin: 0 0 12px 0;
  color: #5f6368;
  line-height: 1.5;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 24px;
}

.modal-btn {
  padding: 8px 16px;
  border-radius: 4px;
  border: none;
  font-weight: 500;
  cursor: pointer;
}

.modal-btn.primary {
  background-color: #1a73e8;
  color: white;
}

.modal-btn.primary:hover {
  background-color: #1557b0;
}
</style>
