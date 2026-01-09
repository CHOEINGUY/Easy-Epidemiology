<template>
  <div class="flex-none w-[320px] bg-white rounded-[10px] shadow-md p-5 overflow-y-auto flex flex-col gap-6">
    <div class="flex flex-col gap-2 w-full mb-2">
      <div class="flex justify-between items-end px-1">
        <h2 class="m-0 text-lg font-bold text-gray-800">보고서 항목</h2>
        <div class="flex items-baseline gap-1.5">
          <span class="text-xl font-bold text-slate-700 font-numeric">{{ Math.round(completionRate) }}%</span>
          <span class="text-[11px] font-medium text-slate-400">완료</span>
        </div>
      </div>
      
      <!-- Linear Progress Bar -->
      <div class="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div 
          class="h-full bg-slate-600 transition-all duration-1000 ease-out rounded-full"
          :style="{ width: `${completionRate}%` }"
        ></div>
      </div>
    </div>
    
    <!-- 차트 이미지는 EpidemicCurve 탭 "보고서 저장" 버튼으로 자동 생성됨 -->

    <ul class="list-none p-0 m-0 flex flex-col gap-1">
      <li class="flex flex-col items-start py-3 border-b border-gray-100 group">
        <div class="flex justify-between items-center w-full mb-2">
          <span class="flex items-center gap-2 text-sm font-semibold text-slate-700 transition-colors">
            <span class="material-icons text-lg text-slate-400">assignment</span>
            조사 디자인
          </span>
          <div 
            v-if="!reportData.studyDesign.value" 
            class="design-notice-inline flex items-center gap-1 text-xs font-bold text-rose-500 cursor-help relative animate-fadeInScale" 
            @mouseenter="showDesignNoticeTooltip = true"
            @mouseleave="showDesignNoticeTooltip = false"
          >
            <span class="material-icons text-sm">error_outline</span>
            선택 필요
            <div ref="designNoticeTooltipRef"></div>
          </div>
          <span v-else class="text-xs font-bold text-blue-600">선택됨</span>
        </div>
        <div class="flex gap-2 w-full">
          <button
            :class="[
              'flex-1 flex items-center justify-center gap-1.5 py-2 px-1 border rounded bg-white cursor-pointer transition-all duration-200',
              { 
                'border-slate-600 text-slate-800 bg-slate-50 font-bold': reportData.studyDesign.value === 'case-control',
                'border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-600': reportData.studyDesign.value !== 'case-control'
              }
            ]"
            @click="reportData.handleStudyDesignChange('case-control')"
          >
            <span class="text-xs">환자-대조군</span>
          </button>
          <button
            :class="[
              'flex-1 flex items-center justify-center gap-1.5 py-2 px-1 border rounded bg-white cursor-pointer transition-all duration-200',
              { 
                'border-slate-600 text-slate-800 bg-slate-50 font-bold': reportData.studyDesign.value === 'cohort',
                'border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-600': reportData.studyDesign.value !== 'cohort'
              }
            ]"
            @click="reportData.handleStudyDesignChange('cohort')"
          >
            <span class="text-xs">후향적 코호트</span>
          </button>
        </div>
      </li>
      <!-- Items with Refined Status -->
      <component :is="'li'" v-for="item in statusItems" :key="item.label" class="flex justify-between items-center py-2.5 border-b border-gray-50 group cursor-default hover:bg-gray-50 px-1 rounded transition-colors">
        <span class="flex items-center gap-2 text-sm text-slate-600 group-hover:text-slate-900 transition-colors">
          <span class="material-icons text-lg text-slate-300 group-hover:text-slate-500 transition-colors">{{ item.icon }}</span> 
          {{ item.label }}
        </span>
        <div class="flex items-center gap-1.5">
          <!-- Warning for food analysis > 34 items -->
          <span 
            v-if="item.warning"
            class="relative cursor-help"
            @mouseenter="showFoodAnalysisTooltip = true"
            @mouseleave="showFoodAnalysisTooltip = false"
          >
            <span class="material-icons text-lg text-amber-500">warning_amber</span>
            <div v-if="item.label === '식품 섭취력 분석'" ref="foodAnalysisTooltipRef"></div>
          </span>

          <span :class="[
            'text-xs font-medium transition-all duration-300',
            item.status === 'complete' ? 'text-blue-600 font-bold' :
            item.status === 'warning' ? 'text-amber-600 font-bold' :
            item.status === 'analysis-required' ? 'text-rose-500 font-bold' :
            'text-gray-300'
          ]">
            {{ item.statusText }}
          </span>
        </div>
      </component>
    </ul>
    
    <!-- Tooltips -->
    <Teleport to="body">
       <div v-if="showFoodAnalysisTooltip && foodAnalysisTooltipRef" 
            class="fixed bg-black border border-gray-700 rounded-lg p-3 shadow-xl text-[13px] leading-relaxed max-w-xs text-white flex items-start gap-1.5 z-[10000]" 
            :style="foodAnalysisTooltipStyle">
         <div>
           <div class="mb-0.5">요인(식단)이 {{ reportData.foodItemCount.value }}개로 34개를 초과합니다.</div>
           <div>표4 요인별 표분석결과에 데이터가 들어가지 않습니다.</div>
         </div>
       </div>

       <div v-if="showDesignNoticeTooltip && designNoticeTooltipRef"
            class="fixed bg-black border border-gray-700 rounded-lg p-3 shadow-xl text-[13px] leading-relaxed max-w-xs text-white flex items-start gap-1.5 z-[10000]"
            :style="designNoticeTooltipStyle">
         <div>
           <div>조사 디자인을 먼저 선택해주세요.</div>
         </div>
       </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { ReportData } from '../../../types/report';

const props = defineProps<{
  reportData: ReportData
}>();

// Tooltip state
const showFoodAnalysisTooltip = ref(false);
const showDesignNoticeTooltip = ref(false);

const foodAnalysisTooltipRef = ref<HTMLElement | null>(null);
const designNoticeTooltipRef = ref<HTMLElement | null>(null);

// Tooltip Positioning
const foodAnalysisTooltipStyle = computed(() => {
  if (!foodAnalysisTooltipRef.value) return {};
  const badgeRect = foodAnalysisTooltipRef.value.parentElement?.getBoundingClientRect();
  if (!badgeRect) return {};
  return {
    position: 'fixed' as const,
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
    position: 'fixed' as const,
    bottom: `${window.innerHeight - elRect.top + 8}px`,
    left: `${elRect.left + elRect.width / 2}px`,
    transform: 'translateX(-50%)',
    zIndex: 10000
  };
});

const statusItems = computed(() => [
  { label: '사례 발병률', icon: 'stacked_bar_chart', status: props.reportData.caseAttackRate.value ? 'complete' : 'pending', statusText: props.reportData.caseAttackRate.value ? '입력됨' : '대기' },
  { label: '환자 발병률', icon: 'bar_chart', status: props.reportData.patientAttackRate.value ? 'complete' : 'pending', statusText: props.reportData.patientAttackRate.value ? '입력됨' : '대기' },
  { label: '추정 노출일시', icon: 'event', status: props.reportData.exposureDate.value ? 'complete' : 'pending', statusText: props.reportData.exposureDate.value ? '입력됨' : '대기' },
  { label: '최초사례 발생', icon: 'medical_services', status: props.reportData.firstCaseDate.value ? 'complete' : 'pending', statusText: props.reportData.firstCaseDate.value ? '입력됨' : '대기' },
  { label: '평균 잠복기', icon: 'timer', status: props.reportData.meanIncubation.value ? 'complete' : 'pending', statusText: props.reportData.meanIncubation.value ? '입력됨' : '대기' },
  { label: '추정 감염원', icon: 'science', status: props.reportData.suspectedSource.value ? 'complete' : 'pending', statusText: props.reportData.suspectedSource.value ? '입력됨' : '대기' },
  { 
    label: '식품 섭취력 분석', 
    icon: 'restaurant', 
    status: !props.reportData.studyDesign.value ? 'analysis-required' : (props.reportData.foodIntakeAnalysis.value ? (props.reportData.hasTooManyFoodItems.value ? 'warning' : 'complete') : 'pending'),
    statusText: !props.reportData.studyDesign.value ? '디자인 선택필요' : (props.reportData.foodIntakeAnalysis.value ? '입력됨' : '대기'),
    warning: props.reportData.hasTooManyFoodItems.value && props.reportData.foodIntakeAnalysis.value
  },
  { label: '유행곡선 차트', icon: 'show_chart', status: props.reportData.hasEpidemicChart.value ? 'complete' : 'pending', statusText: props.reportData.hasEpidemicChart.value ? '입력됨' : '대기' },
  { label: '잠복기 차트', icon: 'timeline', status: props.reportData.hasIncubationChart.value ? 'complete' : 'pending', statusText: props.reportData.hasIncubationChart.value ? '입력됨' : '대기' },
  { label: '주요증상 표', icon: 'table_chart', status: props.reportData.hasMainSymptomsTable.value ? 'complete' : 'pending', statusText: props.reportData.hasMainSymptomsTable.value ? '입력됨' : '대기' }
]);

const completedCount = computed(() => {
  let count = props.reportData.studyDesign.value ? 1 : 0;
  statusItems.value.forEach(item => {
    if (item.status === 'complete' || item.status === 'warning') count++;
  });
  return count;
});

const totalSteps = computed(() => statusItems.value.length + 1);
const completionRate = computed(() => (completedCount.value / totalSteps.value) * 100);

// Helpers

</script>

<style scoped>
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

.animate-fadeInScale {
  animation: fadeInScale 0.3s ease-out;
}
</style>
