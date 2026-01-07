<template>
  <div class="app">
    <header class="app-header">
      <h1 class="app-title">Easy-Epidemiology Web v2.0</h1>
    </header>

    <div class="dashboard">
      <SummaryBar />

      <div class="output-area">
        <!-- 첫 번째 행: 증상 발현 테이블 + 유행곡선 차트 -->
        <div class="output-row">
          <div class="table-container analysis-table-container">
            <SuspectedFoodSelector />
            <SymptomOnsetTable
              :tableData="symptomOnsetTableData"
              :firstOnsetTime="formattedFirstOnsetTime"
              :lastOnsetTime="formattedLastOnsetTime"
            />
          </div>

          <div class="controls-and-chart-wrapper">
            <EpiCurveControls
              :selectedInterval="selectedSymptomInterval"
              :fontSizeButtonText="epiFontSizeButtonText"
              :chartWidthButtonText="epiChartWidthButtonText"
              :barColor="epiBarColor"
              :displayMode="chartDisplayMode"
              :showConfirmedCaseToggle="isConfirmedCaseColumnVisible"
              :showConfirmedCaseLine="showConfirmedCaseLine"
              @update:selectedInterval="onSymptomIntervalChange"
              @cycleFontSize="handleCycleEpiFontSize"
              @cycleChartWidth="handleCycleEpiChartWidth"
              @cycleBarColor="handleCycleEpiBarColor"
              @selectDisplayMode="handleSelectDisplayMode"
              @toggleConfirmedCaseLine="toggleConfirmedCaseLine"
              @resetSettings="handleResetEpiSettings"
              @fontSizeMouseEnter="handleEpiFontSizeMouseEnter"
              @fontSizeMouseLeave="handleEpiFontSizeMouseLeave"
              @chartWidthMouseEnter="handleEpiChartWidthMouseEnter"
              @chartWidthMouseLeave="handleEpiChartWidthMouseLeave"
            />
            <EpiCurveChart
              ref="epiCurveChartRef"
              :chartOptions="epiCurveChartOptions"
              :chartWidth="epiChartWidth"
              :isChartSaved="isEpiChartSaved"
              :showChartSavedTooltip="showEpiChartSavedTooltip"
              @saveChartForReport="saveEpiChartForReport"
              @copyChart="handleCopyEpiChart"
              @exportChart="handleExportEpiChart"
              @chartInstance="onEpiChartInstance"
            />
          </div>
        </div>

        <!-- 두 번째 행: 잠복기 테이블 + 잠복기 차트 -->
        <div class="output-row">
          <div class="table-container">
            <IncubationTable
              :tableData="incubationPeriodTableData"
              :minIncubation="minIncubationPeriodFormatted"
              :maxIncubation="maxIncubationPeriodFormatted"
              :avgIncubation="avgIncubationPeriodFormatted"
              :medianIncubation="medianIncubationPeriodFormatted"
              :hasExposureDateTime="!!exposureDateTime"
              :isIndividualExposureColumnVisible="isIndividualExposureColumnVisible"
            />
          </div>

          <div class="controls-and-chart-wrapper">
            <IncubationControls
              :selectedInterval="selectedIncubationInterval"
              :fontSizeButtonText="incubationFontSizeButtonText"
              :chartWidthButtonText="incubationChartWidthButtonText"
              :barColor="incubationBarColor"
              :displayMode="incubationChartDisplayMode"
              :formattedExposureDateTime="formattedExposureDateTime"
              :isIndividualExposureColumnVisible="isIndividualExposureColumnVisible"
              @update:selectedInterval="onIncubationIntervalChange"
              @cycleFontSize="handleCycleIncubationFontSize"
              @cycleChartWidth="handleCycleIncubationChartWidth"
              @cycleBarColor="handleCycleIncubationBarColor"
              @selectDisplayMode="handleSelectIncubationDisplayMode"
              @resetSettings="handleResetIncubationSettings"
              @showExposureDateTimePicker="showExposureDateTimePicker($event)"
              @fontSizeMouseEnter="handleIncubationFontSizeMouseEnter"
              @fontSizeMouseLeave="handleIncubationFontSizeMouseLeave"
              @chartWidthMouseEnter="handleIncubationChartWidthMouseEnter"
              @chartWidthMouseLeave="handleIncubationChartWidthMouseLeave"
            />
            <IncubationChart
              ref="incubationChartRef"
              :chartOptions="incubationChartOptions"
              :chartWidth="incubationChartWidth"
              :isChartSaved="isIncubationChartSaved"
              :showChartSavedTooltip="showIncubationChartSavedTooltip"
              :showWarningMessage="showIncubationWarningMessage"
              :formattedExposureDateTime="formattedExposureDateTime"
              @saveChartForReport="saveIncubationChartForReport"
              @copyChart="handleCopyIncubationChart"
              @exportChart="handleExportIncubationChart"
              @chartInstance="onIncubationChartInstance"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- DateTimePicker -->
    <DateTimePicker
      ref="exposureDateTimePickerRef"
      :visible="exposureDateTimePickerState.visible"
      :position="exposureDateTimePickerState.position"
      :initialValue="exposureDateTimePickerState.initialValue"
      @confirm="onExposureDateTimeConfirm"
      @cancel="onExposureDateTimeCancel"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onActivated, nextTick } from 'vue';
import { useStoreBridge } from '../../store/storeBridge.js';
import { useSettingsStore } from '../../stores/settingsStore.js';
import { useUndoRedo } from '../../hooks/useUndoRedo.js';

// 컴포넌트 가져오기
import SummaryBar from './components/SummaryBar.vue';
import SuspectedFoodSelector from './components/SuspectedFoodSelector.vue';
import SymptomOnsetTable from './components/SymptomOnsetSection/SymptomOnsetTable.vue';
import EpiCurveControls from './components/SymptomOnsetSection/EpiCurveControls.vue';
import EpiCurveChart from './components/SymptomOnsetSection/EpiCurveChart.vue';
import IncubationTable from './components/IncubationSection/IncubationTable.vue';
import IncubationControls from './components/IncubationSection/IncubationControls.vue';
import IncubationChart from './components/IncubationSection/IncubationChart.vue';
import DateTimePicker from '../DataInputVirtualScroll/parts/DateTimePicker.vue';

// Composables
import { useEpidemicStats } from './composables/useEpidemicStats';
import { useIncubationStats } from './composables/useIncubationStats';
import { useChartSettings } from './composables/useChartSettings';
import { useSuspectedFood } from './composables/useSuspectedFood';
import { useClipboardOperations } from './composables/useClipboardOperations';
import { generateEpiCurveChartOptions } from './composables/useEpiCurveChartOptions';
import { generateIncubationChartOptions } from './composables/useIncubationChartOptions';

const settingsStore = useSettingsStore();
const storeBridge = useStoreBridge();
useUndoRedo(storeBridge);

const {
  isIndividualExposureColumnVisible,
  isConfirmedCaseColumnVisible,
  exposureDateTime,
  selectedSymptomInterval,
  symptomOnsetTableData,
  confirmedCaseOnsetTableData,
  formattedFirstOnsetTime,
  formattedLastOnsetTime
} = useEpidemicStats();

const {
  selectedIncubationInterval,
  formattedExposureDateTime,
  incubationDurations,
  minIncubationPeriodFormatted,
  maxIncubationPeriodFormatted,
  avgIncubationPeriodFormatted,
  medianIncubationPeriodFormatted,
  createIncubationPeriodTableData
} = useIncubationStats();

const {
  epiChartFontSize,
  epiChartWidth,
  epiBarColor,
  chartDisplayMode,
  epiFontSizeButtonText,
  epiChartWidthButtonText,
  incubationChartFontSize,
  incubationChartWidth,
  incubationBarColor,
  incubationChartDisplayMode,
  incubationFontSizeButtonText,
  incubationChartWidthButtonText,
  cycleEpiFontSize,
  cycleEpiChartWidth,
  cycleEpiBarColor,
  selectDisplayMode,
  resetEpiChartSettings,
  cycleIncubationFontSize,
  cycleIncubationChartWidth,
  cycleIncubationBarColor,
  selectIncubationDisplayMode,
  resetIncubationChartSettings,
  handleEpiFontSizeMouseEnter,
  handleEpiFontSizeMouseLeave,
  handleEpiChartWidthMouseEnter,
  handleEpiChartWidthMouseLeave,
  handleIncubationFontSizeMouseEnter,
  handleIncubationFontSizeMouseLeave,
  handleIncubationChartWidthMouseEnter,
  handleIncubationChartWidthMouseLeave
} = useChartSettings();

const { suspectedFood } = useSuspectedFood();

const {
  copyEpiChartToClipboard,
  copyIncubationChartToClipboard,
  exportEpiChart,
  exportIncubationChart
} = useClipboardOperations();

// 차트 참조
const epiCurveChartRef = ref(null);
const incubationChartRef = ref(null);
const epiCurveChartInstance = ref(null);
const incubationChartInstance = ref(null);

// 차트 저장 상태
const isEpiChartSaved = ref(false);
const isIncubationChartSaved = ref(false);
const showEpiChartSavedTooltip = ref(false);
const showIncubationChartSavedTooltip = ref(false);

// 확진자 꺾은선 표시 여부
const showConfirmedCaseLine = ref(true);

// DateTimePicker 상태
const exposureDateTimePickerRef = ref(null);
const exposureDateTimePickerState = ref({
  visible: false,
  position: { top: 0, left: 0 },
  initialValue: null
});

// 잠복기 테이블 데이터
const incubationPeriodTableData = computed(() => {
  return createIncubationPeriodTableData(incubationChartDisplayMode.value);
});

// 잠복기 경고 메시지 표시 여부
const showIncubationWarningMessage = computed(() => {
  return exposureDateTime.value && 
         incubationDurations.value.length === 0 && 
         !isIndividualExposureColumnVisible.value;
});

// 차트 옵션 생성
const epiCurveChartOptions = computed(() => {
  return generateEpiCurveChartOptions({
    symptomOnsetTableData: symptomOnsetTableData.value,
    confirmedCaseOnsetTableData: confirmedCaseOnsetTableData.value,
    selectedSymptomInterval: selectedSymptomInterval.value,
    chartDisplayMode: chartDisplayMode.value,
    epiChartFontSize: epiChartFontSize.value,
    epiBarColor: epiBarColor.value,
    suspectedFood: suspectedFood.value,
    isConfirmedCaseColumnVisible: isConfirmedCaseColumnVisible.value,
    showConfirmedCaseLine: showConfirmedCaseLine.value
  });
});

const incubationChartOptions = computed(() => {
  return generateIncubationChartOptions({
    incubationPeriodTableData: incubationPeriodTableData.value,
    incubationChartDisplayMode: incubationChartDisplayMode.value,
    incubationChartFontSize: incubationChartFontSize.value,
    incubationBarColor: incubationBarColor.value,
    suspectedFood: suspectedFood.value
  });
});

// 이벤트 핸들러
const onSymptomIntervalChange = (value) => {
  storeBridge.updateSymptomInterval(value);
};

const onIncubationIntervalChange = (value) => {
  storeBridge.updateIncubationInterval(value);
};

const handleCycleEpiFontSize = () => cycleEpiFontSize();
const handleCycleEpiChartWidth = () => cycleEpiChartWidth();
const handleCycleEpiBarColor = () => cycleEpiBarColor();
const handleSelectDisplayMode = (mode) => selectDisplayMode(mode);
const handleResetEpiSettings = () => resetEpiChartSettings();

const handleCycleIncubationFontSize = () => cycleIncubationFontSize();
const handleCycleIncubationChartWidth = () => cycleIncubationChartWidth();
const handleCycleIncubationBarColor = () => cycleIncubationBarColor();
const handleSelectIncubationDisplayMode = (mode) => selectIncubationDisplayMode(mode);
const handleResetIncubationSettings = () => resetIncubationChartSettings();

const toggleConfirmedCaseLine = () => {
  showConfirmedCaseLine.value = !showConfirmedCaseLine.value;
};

// 차트 인스턴스 핸들러
const onEpiChartInstance = (instance) => {
  epiCurveChartInstance.value = instance;
  window.epidemicCurveChartInstance = instance;
  window.currentEpidemicChartInstance = instance;
};

const onIncubationChartInstance = (instance) => {
  incubationChartInstance.value = instance;
};

// 차트 저장/복사/내보내기
const saveEpiChartForReport = () => {
  if (!epiCurveChartInstance.value) {
    console.warn('EpiCurve chart instance not found');
    return;
  }
  
  const dataUrl = epiCurveChartInstance.value.getDataURL({
    type: 'png',
    pixelRatio: 2,
    backgroundColor: '#fff'
  });
  
  settingsStore.updateEpidemicCurveSettings({
    reportChartDataUrl: dataUrl,
    reportChartWidth: epiChartWidth.value
  });
  
  isEpiChartSaved.value = true;
  showEpiChartSavedTooltip.value = true;
  setTimeout(() => (showEpiChartSavedTooltip.value = false), 1500);
};

const saveIncubationChartForReport = () => {
  if (!incubationChartInstance.value) {
    console.warn('Incubation chart instance not found');
    return;
  }
  
  const dataUrl = incubationChartInstance.value.getDataURL({
    type: 'png',
    pixelRatio: 2,
    backgroundColor: '#fff'
  });
  
  settingsStore.updateEpidemicCurveSettings({
    reportIncubationChartDataUrl: dataUrl,
    reportIncubationChartWidth: incubationChartWidth.value
  });
  
  isIncubationChartSaved.value = true;
  showIncubationChartSavedTooltip.value = true;
  setTimeout(() => (showIncubationChartSavedTooltip.value = false), 1500);
};

const handleCopyEpiChart = (instance) => {
  copyEpiChartToClipboard(instance, epiChartWidth.value);
};

const handleCopyIncubationChart = (instance) => {
  copyIncubationChartToClipboard(instance, incubationChartWidth.value);
};

const handleExportEpiChart = (instance) => {
  exportEpiChart(instance, epiChartWidth.value, selectedSymptomInterval.value);
};

const handleExportIncubationChart = (instance) => {
  exportIncubationChart(instance, incubationChartWidth.value, selectedIncubationInterval.value);
};

// 헬퍼: 날짜 문자열 -> 객체
const parseDateString = (dateStr) => {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    const now = new Date();
    return {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      day: now.getDate(),
      hour: String(now.getHours()).padStart(2, '0'),
      minute: String(now.getMinutes()).padStart(2, '0')
    };
  }
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
    hour: String(date.getHours()).padStart(2, '0'),
    minute: String(date.getMinutes()).padStart(2, '0')
  };
};

// 헬퍼: 객체 -> 날짜 문자열
const formatDateObject = (dateObj) => {
  if (!dateObj) return '';
  const { year, month, day, hour, minute } = dateObj;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${hour}:${minute}`;
};

// DateTimePicker 핸들러
const showExposureDateTimePicker = (event) => {
  if (!event || !event.target) return;
  const rect = event.target.getBoundingClientRect();
  exposureDateTimePickerState.value = {
    visible: true,
    position: { 
      top: rect.bottom + window.scrollY + 5, 
      left: rect.left + window.scrollX 
    },
    initialValue: parseDateString(exposureDateTime.value)
  };
};

const onExposureDateTimeConfirm = (dateTimeObject) => {
  try {
    const formattedDateTime = formatDateObject(dateTimeObject);
    storeBridge.updateExposureDateTime(formattedDateTime);
    console.log('노출시간 설정 완료:', formattedDateTime);
  } catch (error) {
    console.error('노출시간 설정 오류:', error);
  }
  exposureDateTimePickerState.value.visible = false;
};

const onExposureDateTimeCancel = () => {
  exposureDateTimePickerState.value.visible = false;
};

// 라이프사이클
onMounted(() => {
  console.log('EpidemicCurve 컴포넌트 마운트됨');
});

onActivated(() => {
  console.log('EpidemicCurve 탭 활성화됨');
  nextTick(() => {
    if (epiCurveChartRef.value) {
      epiCurveChartRef.value.updateChart?.();
    }
    if (incubationChartRef.value) {
      incubationChartRef.value.updateChart?.();
    }
  });
});
</script>

<style scoped>
.app { 
  font-family: "Noto Sans KR", sans-serif; 
  width: 100%; 
  margin: 0; 
  padding: 0; 
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

.output-area { 
  display: flex; 
  flex-direction: column; 
  gap: 30px; 
  margin: 20px 30px 30px 30px; 
  align-items: stretch; /* 아이템들이 가로로 꽉 차게 */
  padding: 0;
}

.output-row { 
  display: flex; 
  gap: 30px; 
  align-items: stretch;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  /* height: 700px; - Removed fixed height to allow flexibility like PatientCharacteristics, but keeping stretch behavior for row consistency */
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
  flex: 0 0 400px; 
  align-self: stretch; /* 부모 높이에 맞춤 */
}

.analysis-table-container,
.controls-and-chart-wrapper {
  /* height: 100%; - 제거: stretch와 충돌 가능성 */
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.controls-and-chart-wrapper {
  flex: 1;
  gap: 15px;
  min-width: 600px;
  display: flex;
  flex-direction: column;
  align-self: stretch; /* 부모 높이에 맞춤 */
}

/* 차트 컴포넌트 자체가 남은 공간을 다 비우도록 강제 */
.controls-and-chart-wrapper > :last-child {
  flex: 1;
  display: flex;
  flex-direction: column;
}

/* 반응형 디자인 */
@media (max-width: 1200px) {
  .output-row {
    flex-direction: column;
    height: auto;
  }
  
  .table-container,
  .controls-and-chart-wrapper {
    flex-basis: auto;
    width: 100%;
    min-width: 0;
  }
}
</style>
