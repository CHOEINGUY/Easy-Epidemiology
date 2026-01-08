<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
    <header class="flex items-center justify-between px-4 py-2 bg-white/80 backdrop-blur-md border-b border-white/20 shadow-glass z-[4] sticky top-0">
      <CommonHeader />
    </header>

    <div class="flex flex-col p-5 max-w-[1400px] mx-auto">
      <div class="inline-flex self-start w-fit items-center justify-between bg-white/60 backdrop-blur-sm border border-white/40 px-5 py-3 rounded-2xl shadow-glass mb-6">
        <div class="flex items-center text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-400">
          <span class="material-icons mr-3 text-[28px] text-blue-500">groups</span>
          코호트 연구
        </div>
      </div>

      <div class="flex flex-col overflow-hidden bg-white rounded-2xl shadow-premium border border-slate-100 transition-all duration-300 hover:shadow-xl">
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
import CommonHeader from '../Common/CommonHeader.vue';
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
