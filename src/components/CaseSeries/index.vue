<template>
  <div class="app">
    <header class="app-header">
      <h1 class="app-title">Easy-Epidemiology Web v2.0</h1>
    </header>

    <div class="dashboard">
      <div class="summary-bar">
        <div class="summary-bar__title">
          <span class="material-icons summary-bar__logo">insights</span>
          사례군 조사
        </div>
      </div>

      <div class="analysis-card">
        <CaseSeriesControls 
          v-model:fontSize="tableFontSize"
          :rowCount="rowCount"
        />
        
        <CaseSeriesTable 
          :results="caseSeriesResults"
          :fontSize="tableFontSize"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import CaseSeriesControls from './components/CaseSeriesControls.vue';
import CaseSeriesTable from './components/CaseSeriesTable.vue';
import { useCaseSeriesAnalysis } from './composables/useCaseSeriesAnalysis';

const tableFontSize = ref(14);
const { caseSeriesResults, rowCount } = useCaseSeriesAnalysis();
</script>

<style scoped>
/* --- 기본 앱 및 대시보드 스타일 --- */
.app {
  background-color: #f0f0f0;
  min-height: 100vh;
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
.dashboard {
  display: flex;
  flex-direction: column;
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
}
.summary-bar {
  display: inline-flex;
  align-self: flex-start;
  width: fit-content;
  align-items: center;
  justify-content: space-between;
  background-color: white;
  padding: 12px 20px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  margin-bottom: 20px;
}

.summary-bar__title {
  display: flex;
  align-items: center;
  font-size: 1.25rem;
  font-weight: 600;
  color: #1a73e8;
}

.summary-bar__logo {
  margin-right: 12px;
  font-size: 28px;
  color: #1a73e8;
}

.analysis-card {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
</style>
