<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
    <header class="flex items-center justify-between px-4 py-2 bg-white/80 backdrop-blur-md border-b border-white/20 shadow-glass z-[4] sticky top-0">
      <CommonHeader />
    </header>

    <div class="flex flex-col p-5 max-w-[1400px] mx-auto">
      <div class="inline-flex self-start w-fit items-center justify-between bg-white/60 backdrop-blur-sm border border-white/40 px-5 py-3 rounded-2xl shadow-glass mb-6">
        <div class="flex items-center text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-400">
          <span class="material-icons mr-3 text-[28px] text-blue-500">insights</span>
          사례군 조사
        </div>
      </div>

      <div class="flex flex-col overflow-hidden bg-white rounded-2xl shadow-premium border border-slate-100 transition-all duration-300 hover:shadow-xl">
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
import CommonHeader from '../Common/CommonHeader.vue';
import CaseSeriesControls from './components/CaseSeriesControls.vue';
import CaseSeriesTable from './components/CaseSeriesTable.vue';
import { useCaseSeriesAnalysis } from './composables/useCaseSeriesAnalysis';

const tableFontSize = ref(14);
const { caseSeriesResults, rowCount } = useCaseSeriesAnalysis();
</script>
