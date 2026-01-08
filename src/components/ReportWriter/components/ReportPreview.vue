<template>
  <div class="flex-1 bg-white rounded-[10px] shadow-md overflow-hidden h-full flex flex-col relative">
    <!-- Header with Sticky -->
    <div class="flex justify-between items-center p-5 pb-2 flex-shrink-0 sticky top-0 bg-white z-10">
      <div class="flex flex-col gap-1">
        <h2 class="m-0 text-lg font-bold">미리보기</h2>
        <div class="flex gap-2">
          <button 
            v-for="section in sections" 
            :key="section.id"
            @click="scrollToSection(section.id)"
            class="px-2.5 py-1 text-[10px] font-black uppercase rounded-lg border border-gray-200 bg-gray-50 text-gray-500 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition-all cursor-pointer whitespace-nowrap"
          >
            {{ section.label }}
          </button>
        </div>
      </div>
      <div class="flex gap-2">
        <button 
          :class="[
            'flex items-center gap-1.5 px-4 py-2 border-none rounded-md text-sm font-medium cursor-pointer transition-colors relative',
            (reportData.studyDesign.value && !reportData.hasTooManyFoodItems.value) 
              ? 'bg-blue-600 text-white hover:bg-blue-700' 
              : 'bg-gradient-to-br from-amber-50 to-orange-50 border border-yellow-400 text-orange-500 shadow-sm hover:from-orange-50 hover:to-orange-100 hover:border-amber-500'
          ]"
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
    
    <!-- Content Area -->
    <div class="flex-1 overflow-hidden p-5 pt-2 min-h-0 flex flex-col">
      <div class="flex-1 border border-gray-200 rounded bg-white shadow-inner overflow-y-auto relative p-5">
        <div class="report-preview" v-html="reportData.renderedHtml.value"></div>
        <!-- Spacer to ensure bottom content is not hidden -->
        <div class="w-full h-10 flex-shrink-0"></div>
      </div>
    </div>

    <!-- Tooltip -->
    <Teleport to="body">
      <div v-if="showDownloadTooltip && downloadTooltipRef" 
           class="fixed bg-black border border-gray-700 rounded-lg p-3 shadow-xl text-[13px] leading-relaxed max-w-[300px] z-[10000]" 
           :style="downloadTooltipStyle">
        <div v-if="!reportData.studyDesign.value" class="text-white flex items-start gap-1.5">
          조사 디자인을 먼저 선택해주세요.
        </div>
        <div v-else-if="reportData.hasTooManyFoodItems.value" class="text-white flex items-start gap-1.5">
          요인(식단)이 {{ reportData.foodItemCount.value }}개로 34개를 초과합니다. 표4 요인별 표분석결과에 데이터가 들어가지 않습니다.
        </div>
        <div v-else class="text-white text-center">
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

const sections = [
  { id: 'section-overview', label: 'Ⅰ. 발생개요' },
  { id: 'section-team', label: 'Ⅱ. 조사반' },
  { id: 'section-results', label: 'Ⅳ. 결과' },
  { id: 'section-incubation', label: 'Ⅴ. 잠복기' }
];

const scrollToSection = (id) => {
  const element = document.getElementById(id);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};
</script>

<style scoped>
/* --- Deep Styles for v-html Content --- */
:deep(.report-wrapper) {
  margin: 0 auto;
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

:deep(img) {
  max-width: 100%;
  height: auto;
  min-height: 200px;
  object-fit: contain;
  background-color: #f5f5f5;
}

:deep(.placeholder-chart) {
  min-height: 200px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}
</style>
