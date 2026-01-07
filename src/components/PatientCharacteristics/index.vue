<template>
  <div class="app">
    <header class="app-header">
      <h1 class="app-title">Easy-Epidemiology Web v2.0</h1>
    </header>

    <div class="dashboard">
      <SummaryBar />

      <div class="top-section">
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

      <div v-if="selectedVariableIndex !== null" class="main-content-area">
        <div class="table-container">
          <FrequencyTable 
            :headerName="currentHeaderName"
            :frequencyData="currentFrequencyData"
          />
          <LabelMappingPanel 
            :categories="currentCategories"
            v-model="labelMappings"
            @change="handleLabelMappingChange"
          />
        </div>
        <div class="right-column">
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
      <div v-else class="no-data-message">
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
import SummaryBar from './components/SummaryBar.vue';
import VariableSelector from './components/VariableSelector.vue';
import ParticipantSummary from './components/ParticipantSummary.vue';
import FrequencyTable from './components/FrequencyTable.vue';
import LabelMappingPanel from './components/LabelMappingPanel.vue';
import ChartControlPanel from './components/ChartControlPanel.vue';
import BarChart from './components/BarChart.vue';

// Composable 임포트
import { usePatientStats } from './composables/usePatientStats';

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

<style scoped>
/* === 기본 레이아웃 === */
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
  text-align: center; 
  width: 97%; 
  margin: 20px auto; 
  background-color: #f0f0f0; 
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3); 
}

.top-section { 
  display: flex; 
  justify-content: space-between; 
  align-items: center; 
  margin: 20px 30px 20px 30px; 
  flex-wrap: wrap; 
}

.main-content-area { 
  display: flex; 
  gap: 30px; 
  margin: 0 30px 30px 30px; 
  align-items: flex-start; 
  flex-wrap: wrap; 
}

.table-container { 
  margin: 0; 
  display: flex; 
  flex-direction: column; 
  background-color: #fff; 
  box-sizing: border-box; 
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1); 
  border-radius: 12px; 
  overflow-x: auto; 
  flex: 0 0 550px; 
  height: fit-content; 
}

.right-column {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-width: 500px;
  position: relative;
}

.no-data-message { 
  padding: 20px; 
  text-align: center; 
  color: #666; 
}

/* === 반응형 디자인 === */
@media (max-width: 1100px) {
  .main-content-area { 
    flex-direction: column; 
    gap: 20px; 
  }
  
  .table-container,
  .right-column { 
    flex-basis: auto; 
    width: 100%; 
    min-width: 0; 
  }
}
</style>
