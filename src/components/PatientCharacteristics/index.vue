<template>
  <div class="bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen">
    <header class="flex items-center justify-between px-4 py-2 bg-white/80 backdrop-blur-md border-b border-white/20 shadow-glass z-[4] sticky top-0">
      <CommonHeader />
    </header>

    <div class="flex flex-col p-6 max-w-[1600px] mx-auto w-full">
      <div class="mb-6">
        <SummaryBar />
      </div>

      <div class="bg-white/60 backdrop-blur-sm border border-white/40 rounded-2xl shadow-glass p-5 mb-6 flex justify-between items-center flex-wrap gap-4">
        <VariableSelector 
          :headers="headers.basic || []" 
          :selectedIndex="selectedVariableIndex" 
          @select="selectVariable"
        />
        <ParticipantSummary 
          :totalParticipants="totalParticipants"
          :totalPatients="totalPatients"
          :attackRate="attackRate"
          :confirmedRate="confirmedRate"
          :isConfirmedCaseColumnVisible="isConfirmedCaseColumnVisible"
        />
      </div>

      <div v-if="selectedVariableIndex !== null" class="flex gap-6 items-start flex-wrap lg:flex-nowrap">
        <div class="flex-1 min-w-[500px] bg-white rounded-2xl shadow-premium border border-slate-100 overflow-hidden flex flex-col h-fit lg:max-w-[550px]">
          <FrequencyTable 
            :headerName="currentHeaderName"
            :frequencyData="currentFrequencyData"
            :is-table-copied="isTableCopied"
            @copy="copyTableToClipboard"
          />
          <LabelMappingPanel 
            :categories="currentCategories"
            v-model="labelMappings"
            @change="handleLabelMappingChange"
          />
        </div>
        <div class="flex-[1.5] min-w-[600px] bg-white rounded-2xl shadow-premium border border-slate-100 p-6 flex flex-col gap-6 relative">
          <ChartControlPanel 
            v-model:chartType="selectedChartType"
            v-model:dataType="selectedDataType"
            v-model:fontSize="chartFontSize"
            v-model:chartWidth="chartWidth"
            v-model:barWidth="barWidthPercent"
            v-model:barColor="selectedBarColor"
            v-model:highlight="currentHighlight"
          />
          <BarChart 
            ref="barChartRef"
            :chartWidth="chartWidth"
            :selectedVariableIndex="selectedVariableIndex"
            :selectedChartType="selectedChartType"
            :selectedDataType="selectedDataType"
            :frequencyData="frequencyData"
            :headers="headers"
            :chartFontSize="chartFontSize"
            :barWidthPercent="barWidthPercent"
            :selectedBarColor="selectedBarColor"
            :currentHighlight="currentHighlight"
            :labelMappings="labelMappings"
          />
        </div>
      </div>
      <div v-else class="p-10 text-center text-slate-500 bg-white/60 backdrop-blur-sm rounded-2xl border border-white/40 shadow-glass">
        <DataGuideMessage
          icon="analytics"
          title="분석할 변수를 선택해주세요"
          description="위의 변수 선택 버튼 중 하나를 클릭하여 차트로 분석할 특성을 선택하세요."
          :steps="[
            { number: '1', text: '분석하고 싶은 변수 버튼을 클릭하세요' },
            { number: '2', text: '선택한 변수의 분포 차트가 자동으로 생성됩니다' },
            { number: '3', text: '차트 설정을 조정하여 원하는 형태로 표시하세요' }
          ]"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
// index.vue - PatientCharacteristics 메인 컴포넌트
import { ref, computed, onMounted, watch } from 'vue';
import DataGuideMessage from '../DataGuideMessage.vue';

// 하위 컴포넌트 임포트
import CommonHeader from '../Common/CommonHeader.vue';
import SummaryBar from './components/SummaryBar.vue';
import VariableSelector from './components/VariableSelector.vue';
import ParticipantSummary from './components/ParticipantSummary.vue';
import FrequencyTable from './components/FrequencyTable.vue';
import LabelMappingPanel from './components/LabelMappingPanel.vue';
import ChartControlPanel from './components/ChartControlPanel.vue';
import BarChart from './components/BarChart.vue';

// Composable 임포트
import { usePatientStats } from './composables/usePatientStats';
import { useClipboardOperations } from './composables/useClipboardOperations';

// 통계 데이터
const {
  headers,
  isConfirmedCaseColumnVisible,
  totalParticipants,
  totalPatients,
  attackRate,
  confirmedRate,
  frequencyData
} = usePatientStats();

const { isTableCopied, copyTableToClipboard } = useClipboardOperations();

// UI 상태
const selectedVariableIndex = ref(null);
const selectedChartType = ref('total');
const selectedDataType = ref('count');
const chartFontSize = ref(18);
const chartWidth = ref(700);
const barWidthPercent = ref(50);
const selectedBarColor = ref('#5470c6');
const currentHighlight = ref('none');
const labelMappings = ref({});
const barChartRef = ref(null);

// 현재 선택된 헤더 이름
const currentHeaderName = computed(() => {
  if (selectedVariableIndex.value === null) return '';
  return headers.value?.basic?.[selectedVariableIndex.value] || '';
});

// 현재 선택된 빈도 데이터
const currentFrequencyData = computed(() => {
  if (selectedVariableIndex.value === null) return {};
  return frequencyData.value?.[selectedVariableIndex.value] || {};
});

// 현재 카테고리 목록
const currentCategories = computed(() => {
  if (
    selectedVariableIndex.value !== null &&
    frequencyData.value &&
    frequencyData.value.length > selectedVariableIndex.value &&
    frequencyData.value[selectedVariableIndex.value]
  ) {
    return Object.keys(frequencyData.value[selectedVariableIndex.value]);
  }
  return [];
});

// 변수 선택
const selectVariable = (index) => {
  selectedVariableIndex.value = index;
};

// 라벨 매핑 변경 핸들러
const handleLabelMappingChange = () => {
  if (barChartRef.value) {
    barChartRef.value.triggerChartUpdate();
  }
};

// 마운트 시 첫 번째 변수 자동 선택
onMounted(() => {
  if (headers.value?.basic?.length > 0 && selectedVariableIndex.value === null) {
    selectVariable(0);
  }
});

// 변수 변경 시 라벨 매핑 초기화
watch(selectedVariableIndex, (newIndex, oldIndex) => {
  if (newIndex !== oldIndex && newIndex !== null) {
    console.log(`Variable changed: ${oldIndex} -> ${newIndex}`);
    labelMappings.value = {};
    
    const currentFreqData = frequencyData.value?.[newIndex];
    if (currentFreqData && typeof currentFreqData === 'object') {
      const categories = Object.keys(currentFreqData);
      const newMappings = {};
      categories.forEach(cat => { newMappings[cat] = ''; });
      labelMappings.value = newMappings;
      console.log('Initialized mappings efficiently');
    }
  }
});
</script>
