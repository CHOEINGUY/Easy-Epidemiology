<template>
  <div class="bg-gradient-to-br from-slate-50 to-slate-100 h-full flex flex-col overflow-hidden">
    <header class="flex items-center justify-between px-4 py-2 bg-white/80 backdrop-blur-md border-b border-white/20 shadow-glass z-[4] sticky top-0">
      <CommonHeader />
    </header>

    <div class="flex gap-[30px] mx-[30px] mt-5 mb-[68px] flex-1 min-h-0 relative z-0">
      <ReportEditor :reportData="reportData" />
      <ReportPreview :reportData="reportData" />
    </div>

    <!-- 분석 필요 모달 -->
    <div v-if="reportData.showAnalysisModal.value" 
         class="fixed inset-0 bg-black/40 flex justify-center items-center z-[20000]" 
         @click="reportData.closeAnalysisModal">
      <div class="bg-white p-6 rounded-lg w-[400px] max-w-[90%] shadow-lg" @click.stop>
        <div class="mb-4">
          <h3 class="m-0 text-lg text-gray-800">분석이 필요합니다</h3>
        </div>
        <div class="text-gray-500 leading-relaxed">
          <p class="mb-3">{{ reportData.analysisModalMessage.value }}</p>
          <p class="mb-3">해당 탭에서 통계 분석을 실행한 후 보고서를 작성할 수 있습니다.</p>
        </div>
        <div class="flex justify-end mt-6">
          <button 
            class="px-4 py-2 rounded font-medium cursor-pointer border-none bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            @click="reportData.closeAnalysisModal"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useReportData } from './composables/useReportData';
import CommonHeader from '../Common/CommonHeader.vue';
import ReportEditor from './components/ReportEditor.vue';
import ReportPreview from './components/ReportPreview.vue';
import { ReportData } from '../../types/report';

const reportData: ReportData = useReportData();
</script>
