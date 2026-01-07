<template>
  <div class="app">
    <header class="app-header">
      <h1 class="app-title">Easy-Epidemiology Web v2.0</h1>
    </header>

    <div class="dashboard">
      <div class="summary-bar">
        <div class="summary-bar__title">
          <span class="material-icons summary-bar__logo">groups</span>
          코호트 연구
        </div>
      </div>

      <div class="analysis-card">
        <CohortControls 
          :font-size="tableFontSize"
          :row-count="rows.length"
          @update:fontSize="updateFontSize"
        />

        <CohortResultTable 
          :results="cohortAnalysisResults"
          :font-size="tableFontSize"
          :use-yates-correction="useYatesCorrection"
          @toggle-yates="toggleYatesCorrection"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useEpidemicStore } from '../../stores/epidemicStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useCohortAnalysis } from './composables/useCohortAnalysis.js';
import CohortControls from './components/CohortControls.vue';
import CohortResultTable from './components/CohortResultTable.vue';

const epidemicStore = useEpidemicStore();
const settingsStore = useSettingsStore();

// --- State Management ---
const tableFontSize = ref(14);

const updateFontSize = (size) => {
  tableFontSize.value = size;
};

const rows = computed(() => epidemicStore.rows || []);
const headers = computed(() => epidemicStore.headers || { diet: [] });

// Yates 보정 토글 변수 (store에서 관리)
const yatesSettings = computed(() => settingsStore.yatesCorrectionSettings);
const useYatesCorrection = computed({
  get: () => yatesSettings.value?.cohort ?? false,
  set: (value) => settingsStore.setYatesCorrectionSettings({ type: 'cohort', enabled: value })
});

const toggleYatesCorrection = () => {
  useYatesCorrection.value = !useYatesCorrection.value;
};

// --- Analysis Logic ---
const { cohortAnalysisResults } = useCohortAnalysis(rows, headers, useYatesCorrection);

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

/* --- 통합 분석 카드 스타일 --- */
.analysis-card {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
</style>
