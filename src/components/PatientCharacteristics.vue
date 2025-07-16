<template>
  <div class="app">
    <header class="app-header">
      <h1 class="app-title">Easy-Epidemiology Web v1.0</h1>
    </header>

    <div class="dashboard">
      <div class="summary-bar">
        <div class="summary-bar__title">
          <span class="material-icons summary-bar__logo">people</span>
          대상자 특성 분포
        </div>
      </div>

      <div class="top-section">
        <div class="variable-selection">
          <button v-for="(header, index) in headers.basic" :key="index" @click="selectVariable(index)" :class="{
              'variable-selection__button--active':
                selectedVariableIndex === index,
            }" class="variable-selection__button">
            {{ header === "" ? "(없음)" : header }}
          </button>
        </div>
        <div class="participant-summary">
          <div class="participant-summary__item">
            <span class="summary-bar__label">조사 대상자 수&nbsp;</span>
            <span class="summary-bar__value">{{ totalParticipants }}</span>
            <span class="summary-bar__unit">명</span>
          </div>
          <div class="participant-summary__item">
            <span class="summary-bar__label">총 환자 수&nbsp;</span>
            <span class="summary-bar__value">{{ totalPatients }}</span>
            <span class="summary-bar__unit">명</span>
          </div>
          <div class="participant-summary__item">
            <div class="control-button-wrapper">
              <div 
                class="attack-rate-display"
                @mouseenter="showTooltip('attackRate', '발병률 = (환자여부에 1을 입력한 사람 수 ÷ 전체 조사 대상자 수) × 100')"
                @mouseleave="hideTooltip"
              >
                <span class="summary-bar__label">발병률&nbsp;</span>
                <span class="summary-bar__value">{{ attackRate }}</span>
                <span class="summary-bar__unit">%</span>
              </div>
              <div v-if="activeTooltip === 'attackRate'" class="control-tooltip attack-rate-tooltip">{{ tooltipText }}</div>
            </div>
          </div>
          <!-- 확진율 (확진율 모드가 켜져 있을 때만 표시) -->
          <div v-if="isConfirmedCaseColumnVisible" class="participant-summary__item">
            <div class="control-button-wrapper">
              <div 
                class="confirmed-rate-display"
                @mouseenter="showTooltip('confirmedRate', '확진율 = (확진여부에 1을 입력한 사람 수 ÷ 전체 조사 대상자 수) × 100')"
                @mouseleave="hideTooltip"
              >
                <span class="summary-bar__label">확진율&nbsp;</span>
                <span class="summary-bar__value">{{ confirmedRate }}</span>
                <span class="summary-bar__unit">%</span>
              </div>
              <div v-if="activeTooltip === 'confirmedRate'" class="control-tooltip confirmed-rate-tooltip">{{ tooltipText }}</div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="selectedVariableIndex !== null" class="main-content-area">
        <div class="table-container">
          <div class="table-title" style="display: flex; align-items: center; justify-content: space-between;">
            <span>
              <span class="selected-variable-details__title-dot"></span>&nbsp;{{
                headers.basic[selectedVariableIndex] === ""
                  ? "(없음)"
                  : headers.basic[selectedVariableIndex]
              }}
            </span>
            <div style="position: relative;">
              <button @click="copyTableToClipboard" class="copy-chart-button">
                <span class="button-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                </span>
                <span class="button-text">테이블 복사</span>
              </button>
              <div v-if="isTableCopied" class="copy-tooltip check-tooltip">
                <svg width="32" height="32" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="12" fill="#1a73e8" />
                  <polyline points="7,13 11,17 17,9" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </div>
            </div>
          </div>
          <table class="frequency-table">
            <thead>
              <tr>
                <th class="frequency-table__header">구분</th>
                <th class="frequency-table__header">대상자수</th>
                <th class="frequency-table__header">대상자비율</th>
                <th class="frequency-table__header">환자수</th>
                <th class="frequency-table__header">환자비율</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(data, category) in frequencyData[selectedVariableIndex]" :key="category" class="frequency-table__row">
                <td class="frequency-table__cell">{{ category }}</td>
                <td class="frequency-table__cell">{{ data.count }}</td>
                <td class="frequency-table__cell">
                  {{ data.totalPercentage.toFixed(1) }}%
                </td>
                <td class="frequency-table__cell">{{ data.patientCount }}</td>
                <td class="frequency-table__cell">
                  {{ data.patientPercentage.toFixed(1) }}%
                </td>
              </tr>
            </tbody>
          </table>
          <div class="mapping-container">
            <div class="mapping-title"><span class="selected-variable-details__title-dot"></span>&nbsp;라벨 매핑</div>
            <div v-if="currentCategories.length > 0" class="mapping-items">
              <div v-for="category in currentCategories" :key="category" class="mapping-item">
                <span class="mapping-original-label">{{ category }} :</span>
                <input type="text" v-model.lazy="labelMappings[category]" placeholder="차트에 표시될 새 라벨" class="mapping-input" @change="triggerChartUpdate" />
              </div>
            </div>
            <div v-else class="mapping-nodata">
              매핑할 카테고리가 없습니다.
            </div>
          </div>
        </div>
        <div class="right-column">
          <div class="ui-container">
            <div class="ui-group">
              <span class="ui-label">차트 대상:</span>
              <div class="control-button-wrapper">
                <button @click="selectChartType('total')" :class="{ 'chart-select-button--active': selectedChartType === 'total' }" class="chart-select-button" @mouseenter="showTooltip('chartTypeTotal', '차트 표시 대상을 전체 대상자로 변경합니다')" @mouseleave="hideTooltip"> 전체 대상자 </button>
                <div v-if="activeTooltip === 'chartTypeTotal'" class="control-tooltip">{{ tooltipText }}</div>
              </div>
              <div class="control-button-wrapper">
                <button @click="selectChartType('patient')" :class="{ 'chart-select-button--active': selectedChartType === 'patient' }" class="chart-select-button" @mouseenter="showTooltip('chartTypePatient', '차트 표시 대상을 환자로 변경합니다')" @mouseleave="hideTooltip"> 환자 </button>
                <div v-if="activeTooltip === 'chartTypePatient'" class="control-tooltip">{{ tooltipText }}</div>
              </div>
            </div>
            <div class="ui-group">
                <span class="ui-label">데이터 유형:</span>
                <div class="control-button-wrapper">
                  <button @click="selectDataType('count')" :class="{ 'chart-select-button--active': selectedDataType === 'count' }" class="chart-select-button" @mouseenter="showTooltip('dataTypeCount', '데이터를 개수(명)으로 표시합니다')" @mouseleave="hideTooltip"> 수 </button>
                  <div v-if="activeTooltip === 'dataTypeCount'" class="control-tooltip">{{ tooltipText }}</div>
                </div>
                <div class="control-button-wrapper">
                  <button @click="selectDataType('percentage')" :class="{ 'chart-select-button--active': selectedDataType === 'percentage' }" class="chart-select-button" @mouseenter="showTooltip('dataTypePercentage', '데이터를 비율(%)로 표시합니다')" @mouseleave="hideTooltip"> 비율(%) </button>
                  <div v-if="activeTooltip === 'dataTypePercentage'" class="control-tooltip">{{ tooltipText }}</div>
                </div>
            </div>
            <div class="ui-group">
              <label class="ui-label">폰트 크기:</label>
              <div class="control-button-wrapper">
                <button class="control-button font-button" @click="cycleFontSize" @mouseenter="handleFontSizeMouseEnter" @mouseleave="handleFontSizeMouseLeave"> {{ fontSizeButtonText }} </button>
                <div v-if="activeTooltip === 'fontSize'" class="control-tooltip">{{ tooltipText }}</div>
              </div>
            </div>
            <div class="ui-group">
              <label class="ui-label">차트 너비:</label>
              <div class="control-button-wrapper">
                <button class="control-button width-button" @click="cycleChartWidth" @mouseenter="handleChartWidthMouseEnter" @mouseleave="handleChartWidthMouseLeave"> {{ chartWidthButtonText }} </button>
                <div v-if="activeTooltip === 'chartWidth'" class="control-tooltip">{{ tooltipText }}</div>
              </div>
            </div>
            <div class="ui-group">
              <label class="ui-label">막대 너비:</label>
              <div class="control-button-wrapper">
                <button class="control-button width-button" @click="cycleBarWidthPercent" @mouseenter="handleBarWidthMouseEnter" @mouseleave="handleBarWidthMouseLeave"> {{ barWidthButtonText }} </button>
                <div v-if="activeTooltip === 'barWidth'" class="control-tooltip">{{ tooltipText }}</div>
              </div>
            </div>
            <div class="ui-group highlight-group">
              <label class="ui-label">막대 강조:</label>
              <div class="control-button-wrapper">
                <button class="control-button highlight-button" @click="cycleHighlight" @mouseenter="handleMouseEnterHighlight" @mouseleave="handleMouseLeaveHighlight">
                  {{ highlightButtonText }}
                </button>
                <div v-if="activeTooltip === 'highlight'" class="control-tooltip">
                  {{ tooltipText }}
                </div>
              </div>
            </div>
            <div class="ui-group">
              <label class="ui-label">막대 색상:</label>
              <div class="control-button-wrapper">
                <button class="color-button" :style="{ backgroundColor: selectedBarColor }" @click="cycleBarColor" @mouseenter="showTooltip('barColor', '막대 색상을 변경합니다')" @mouseleave="hideTooltip"></button>
                <div v-if="activeTooltip === 'barColor'" class="control-tooltip">{{ tooltipText }}</div>
              </div>
            </div>
          </div>
          <div class="chart-container">
            <div class="chart-wrapper">
              <div class="chart-buttons">
                <div style="position: relative;">
                  <button @click="copyChartToClipboard" class="copy-chart-button">
                    <span class="button-icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                      </svg>
                    </span>
                    <span class="button-text">차트 복사</span>
                  </button>
                  <div v-if="isChartCopied" class="copy-tooltip check-tooltip">
                    <svg width="32" height="32" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="12" fill="#1a73e8"/>
                      <polyline points="7,13 11,17 17,9" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </div>
                </div>
                <button @click="exportChart" class="export-chart-button">
                  <span class="button-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="7 10 12 15 17 10"></polyline>
                      <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                  </span>
                  <span class="button-text">차트 저장</span>
                </button>
              </div>
              <div ref="chartContainer" :style="{ width: chartWidth + 'px', height: '500px' }"></div>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="no-data-message"> 표시할 변수를 선택해주세요.
      </div>
    </div>
  </div>
</template>

<script setup>
// === 원본 스크립트 ===
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { useStore } from 'vuex';
import * as echarts from 'echarts';
// === 원본 스크립트 끝 ===

// +++ 신규: lodash-es 임포트 +++
import { debounce } from 'lodash-es'; // (설치 필요: npm install lodash-es)

// === 원본 스크립트 ===
// --- 상태 및 기본 설정 ---
const store = useStore();
const headers = computed(() => store.getters.headers || { basic: [] }); // 기본값 보강
const rows = computed(() => store.getters.rows || []); // 기본값 보강
const isConfirmedCaseColumnVisible = computed(() => store.state.isConfirmedCaseColumnVisible);
const selectedVariableIndex = ref(null);
const selectedChartType = ref('total');
const selectedDataType = ref('count'); // 'count' | 'percentage'
const chartInstance = ref(null);
const chartContainer = ref(null);
const fontSizes = [12, 15, 18, 21, 24];
const fontSizeLabels = ['매우 작게', '작게', '보통', '크게', '매우 크게'];
const chartWidths = [500, 700, 900, 1100];
const barWidthPercents = [30, 50, 70];
const barColors = [
  '#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de',
  '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc'
];
const chartFontSize = ref(18);
const chartWidth = ref(700);
const barWidthPercent = ref(50);
const selectedBarColor = ref(barColors[0]);
const fontSizeButtonText = ref('보통');
const chartWidthButtonText = ref(`${chartWidth.value}px`);
const barWidthButtonText = ref(`${barWidthPercent.value}%`);
// === 원본 스크립트 끝 ===

// +++ 신규: 라벨 매핑 상태 +++
const labelMappings = ref({});

// +++ 신규: 툴팁 상태 관리 +++
const activeTooltip = ref(null);
const tooltipText = ref('');

// +++ 신규: 툴팁 제어 함수 +++
const showTooltip = (key, text) => {
  activeTooltip.value = key;
  tooltipText.value = text;
};
const hideTooltip = () => {
  activeTooltip.value = null;
};



// 폰트 크기 마우스 이벤트 핸들러
const handleFontSizeMouseEnter = () => {
  const currentIndex = fontSizes.indexOf(chartFontSize.value);
  const nextIndex = (currentIndex + 1) % fontSizes.length;
  const nextFontSize = fontSizeLabels[nextIndex];
  fontSizeButtonText.value = nextFontSize;
  showTooltip('fontSize', `폰트 크기를 ${nextFontSize}로 변경합니다`);
};

const handleFontSizeMouseLeave = () => {
  const currentIndex = fontSizes.indexOf(chartFontSize.value);
  fontSizeButtonText.value = fontSizeLabels[currentIndex];
  hideTooltip();
};

// 차트 너비 마우스 이벤트 핸들러
const handleChartWidthMouseEnter = () => {
  const currentIndex = chartWidths.indexOf(chartWidth.value);
  const nextIndex = (currentIndex + 1) % chartWidths.length;
  const nextWidth = chartWidths[nextIndex];
  chartWidthButtonText.value = `${nextWidth}px`;
  showTooltip('chartWidth', `차트 너비를 ${nextWidth}px로 변경합니다`);
};

const handleChartWidthMouseLeave = () => {
  chartWidthButtonText.value = `${chartWidth.value}px`;
  hideTooltip();
};

// 막대 너비 마우스 이벤트 핸들러
const handleBarWidthMouseEnter = () => {
  const currentIndex = barWidthPercents.indexOf(barWidthPercent.value);
  const nextIndex = (currentIndex + 1) % barWidthPercents.length;
  const nextWidth = barWidthPercents[nextIndex];
  barWidthButtonText.value = `${nextWidth}%`;
  showTooltip('barWidth', `막대 너비를 ${nextWidth}%로 변경합니다`);
};

const handleBarWidthMouseLeave = () => {
  barWidthButtonText.value = `${barWidthPercent.value}%`;
  hideTooltip();
};

// === 원본 스크립트 ===
// --- 유틸리티 및 핸들러 ---
const getNextValue = (currentValue, valueArray) => {
  const currentIndex = valueArray.indexOf(currentValue);
  if (currentIndex === -1) return valueArray[0];
  const nextIndex = (currentIndex + 1) % valueArray.length;
  return valueArray[nextIndex];
};

const cycleFontSize = () => {
  chartFontSize.value = getNextValue(chartFontSize.value, fontSizes);
  const currentIndex = fontSizes.indexOf(chartFontSize.value);
  fontSizeButtonText.value = fontSizeLabels[currentIndex];
  // +++ 수정: 차트 업데이트 트리거 호출 +++
  triggerChartUpdate();
};
const cycleChartWidth = () => { // 이 함수는 watch에서 처리하므로 trigger 불필요
  chartWidth.value = getNextValue(chartWidth.value, chartWidths);
};
const cycleBarWidthPercent = () => {
  barWidthPercent.value = getNextValue(barWidthPercent.value, barWidthPercents);
  barWidthButtonText.value = `${barWidthPercent.value}%`;
  // +++ 수정: 차트 업데이트 트리거 호출 +++
  triggerChartUpdate();
};
const cycleBarColor = () => {
  selectedBarColor.value = getNextValue(selectedBarColor.value, barColors);
  // +++ 수정: 차트 업데이트 트리거 호출 +++
  triggerChartUpdate();
};
const selectVariable = (index) => {
  selectedVariableIndex.value = index;
};
const selectChartType = (type) => {
  selectedChartType.value = type;
};
const selectDataType = (type) => {
  selectedDataType.value = type;
};
// === 원본 스크립트 끝 ===


// === 원본 스크립트 ===
// --- 데이터 계산 로직 ---
const filteredRows = computed(() => {
  const currentRows = rows.value || [];
  return currentRows.filter((row) => {
    if (!row) return false;
    return (
      (row.isPatient !== undefined && row.isPatient !== '') ||
      (row.basicInfo && row.basicInfo.some(cell => cell !== '' && cell !== null && cell !== undefined)) ||
      (row.clinicalSymptoms && row.clinicalSymptoms.some(cell => cell !== '' && cell !== null && cell !== undefined)) ||
      (row.symptomOnset !== undefined && row.symptomOnset !== '') ||
      (row.dietInfo && row.dietInfo.some(cell => cell !== '' && cell !== null && cell !== undefined))
    );
  });
});
// 성능 최적화: 메모이제이션된 계산
const totalParticipants = computed(() => filteredRows.value.length);
const totalPatients = computed(() => {
  // 캐싱을 위한 최적화: 빈번한 재계산 방지
  const currentRows = filteredRows.value;
  if (currentRows.length === 0) return 0;
  
  let count = 0;
  for (const row of currentRows) {
    if (row && String(row.isPatient) === '1') {
      count++;
    }
  }
  return count;
});

const attackRate = computed(() => {
  const participants = totalParticipants.value;
  const patients = totalPatients.value;
  if (participants === 0) return '0.0';
  return ((patients / participants) * 100).toFixed(1);
});

// 확진율 계산 로직
const totalConfirmedCases = computed(() => {
  const currentRows = filteredRows.value;
  if (currentRows.length === 0) return 0;
  
  let count = 0;
  for (const row of currentRows) {
    if (row && String(row.isConfirmedCase) === '1') {
      count++;
    }
  }
  return count;
});

const confirmedRate = computed(() => {
  const participants = totalParticipants.value;
  const confirmed = totalConfirmedCases.value;
  if (participants === 0) return '0.0';
  return ((confirmed / participants) * 100).toFixed(1);
});
const frequencyData = computed(() => { // 원본 로직 유지
  if (!headers.value?.basic || !Array.isArray(headers.value.basic)) return [];
  const currentFilteredRows = filteredRows.value;
  const currentTotalParticipants = totalParticipants.value;
  return headers.value.basic.map((header, headerIndex) => {
    const categories = {};
    currentFilteredRows.forEach((row) => {
      if (!row?.basicInfo || headerIndex >= row.basicInfo.length) return;
      const value = row.basicInfo[headerIndex];
      if (value === '' || value === null || value === undefined) return;
      const categoryKey = String(value);
      if (!categories[categoryKey]) {
        categories[categoryKey] = { count: 0, patientCount: 0 };
      }
      categories[categoryKey].count++;
      if (String(row.isPatient) === '1') {
        categories[categoryKey].patientCount++;
      }
    });
    for (const category in categories) {
      const data = categories[category]; // 변수 선언
      data.totalPercentage = currentTotalParticipants > 0 ? (data.count / currentTotalParticipants) * 100 : 0;
      // 환자비율 수정: 해당 카테고리의 전체 대상자 중 환자 비율
      data.patientPercentage = data.count > 0 ? (data.patientCount / data.count) * 100 : 0;
    }
    const sortedCategories = {};
    Object.keys(categories)
      .sort((a, b) => {
        const numA = Number(a);
        const numB = Number(b);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        // 숫자 우선 후 문자열 (localeCompare 사용)
        if (!isNaN(numA) && isNaN(numB)) return -1;
        if (isNaN(numA) && !isNaN(numB)) return 1;
        return String(a).localeCompare(String(b), undefined, { numeric: true });
      })
      .forEach((key) => {
        sortedCategories[key] = categories[key];
      });
    return sortedCategories;
  });
});

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

// === 원본 스크립트 끝 ===


// +++ 신규: 라벨 매핑 적용 헬퍼 함수 +++
const getMappedLabel = (originalCat) => {
  if (Object.prototype.hasOwnProperty.call(labelMappings.value, originalCat)) {
    const mapped = labelMappings.value[originalCat];
    if (mapped && String(mapped).trim()) {
      return String(mapped).trim();
    }
  }
  return originalCat;
};


// --- 차트 옵션 생성 함수는 강조 변수 선언 후에 정의됨 ---


// === 원본 스크립트 ===
// --- 차트 업데이트 함수 (성능 최적화) ---
const updateCharts = () => {
  if (!chartInstance.value || selectedVariableIndex.value === null) return;
  if (!headers.value?.basic || !frequencyData.value || frequencyData.value.length <= selectedVariableIndex.value) {
    console.warn('차트 업데이트 건너뛰기: 데이터 준비 안됨'); 
    return;
  }
  
  const header = headers.value.basic[selectedVariableIndex.value] || '(없음)';
  const data = frequencyData.value[selectedVariableIndex.value];
  
  // 데이터가 비어있으면 업데이트 건너뛰기
  if (!data || Object.keys(data).length === 0) {
    console.warn('차트 업데이트 건너뛰기: 빈 데이터');
    return;
  }
  
  const options = selectedChartType.value === 'total'
    ? generateTotalChartOptions(header, data, selectedDataType.value)
    : generatePatientChartOptions(header, data, selectedDataType.value);
  
  try {
    if (chartInstance.value && typeof chartInstance.value.setOption === 'function') {
      // notMerge: false로 설정하여 기존 옵션과 병합 (성능 향상)
      chartInstance.value.setOption(options, false);
      console.log('Chart options updated efficiently.');
    } else { 
      console.error('차트 인스턴스 유효하지 않음'); 
    }
  } catch (error) { 
    console.error('ECharts setOption 오류:', error, options); 
  }
};

// --- 차트 재생성 함수 ---
const recreateChart = () => { // 원본 로직 유지
  console.log('Attempting to recreate chart...');
  if (chartInstance.value && typeof chartInstance.value.dispose === 'function') {
    try { chartInstance.value.dispose(); console.log('Previous chart instance disposed.'); }
    catch (e) { console.error('Error disposing chart instance:', e); }
    finally { chartInstance.value = null; }
  }
  nextTick(() => {
    if (chartContainer.value instanceof HTMLElement) {
      try {
        console.log(`Initializing new chart in container with width: ${chartContainer.value.offsetWidth}px`);
        chartInstance.value = echarts.init(chartContainer.value);
        console.log('New chart instance initialized.');
        updateCharts(); // 원본 로직 유지 (updateCharts 호출)
      } catch (error) { console.error('ECharts 재초기화 실패:', error); alert('차트를 다시 그리는 중 오류가 발생했습니다.'); }
    } else { console.error('차트 컨테이너 DOM 요소를 찾을 수 없습니다.'); }
  });
};
// === 원본 스크립트 끝 ===


// +++ 신규: 차트 업데이트 트리거 함수 (성능 최적화) +++
const triggerChartUpdate = debounce(() => {
  console.log('Debounced chart update triggered.');
  if (chartInstance.value && selectedVariableIndex.value !== null) {
    updateCharts();
  } else {
    console.log('Chart instance not found or no variable selected, skipping update trigger.');
  }
}, 200); // 200ms로 단축하여 더 빠른 반응성


// === 원본 스크립트 ===
// --- 차트 리사이즈 핸들러 (성능 최적화) ---
const handleResize = debounce(() => {
  if (chartInstance.value && 
      typeof chartInstance.value.resize === 'function' && 
      selectedVariableIndex.value !== null) {
    try { 
      console.log('Resizing chart due to window resize...'); 
      chartInstance.value.resize({
        animation: {
          duration: 200,
          easing: 'cubicOut'
        }
      });
    }
    catch (error) { 
      console.error('ECharts resize 오류 (window):', error); 
    }
  }
}, 150); // 150ms로 단축하여 더 빠른 반응성

// +++ 리플 이펙트 메서드 추가 +++
// 버튼 클릭 효과는 CSS로 처리하므로 이 함수는 제거

// --- 차트 내보내기/복사 함수 수정 ---
const exportChart = async () => {
  const instance = chartInstance.value;
  if (!instance || typeof instance.getDataURL !== 'function') {
    alert('차트 내보내기 불가');
    return;
  }
  const header = headers.value?.basic?.[selectedVariableIndex.value] || '(없음)';
  const chartKind = selectedChartType.value === 'total' ? '전체' : '환자';
  const filename = `${header}_${chartKind}_분포_고화질.png`;
  
  try {
    // 1. 임시 컨테이너 생성 (충분히 큰 크기)
    const tempContainer = document.createElement('div');
    tempContainer.style.width = `${chartWidth.value}px`;
    tempContainer.style.height = '500px';
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    tempContainer.style.top = '-9999px';
    document.body.appendChild(tempContainer);
    
    // 2. 임시 차트 인스턴스 생성
    const tempChart = echarts.init(tempContainer);
    
    // 3. 현재 차트의 옵션을 가져와서 임시 차트에 적용
    const currentOption = instance.getOption();
    currentOption.animation = false;
    tempChart.setOption(currentOption, true);
    
    // 4. 차트가 완전히 렌더링될 때까지 대기
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // 5. 임시 차트에서 완전한 이미지 생성
    const dataUrl = tempChart.getDataURL({
      type: 'png',
      pixelRatio: 3,
      backgroundColor: '#fff'
    });
    
    if (!dataUrl || !dataUrl.startsWith('data:image/png')) {
      throw new Error('유효하지 않은 이미지 데이터 URL');
    }
    
    // 6. 파일 다운로드
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // 7. 임시 요소들 정리
    tempChart.dispose();
    document.body.removeChild(tempContainer);
    
    console.log('차트 저장 완료:', filename);
  } catch (error) {
    const message = `차트 내보내기 오류: ${error.message}`;
    console.error(message);
    alert(message);
  }
};

const isTableCopied = ref(false);
const isChartCopied = ref(false);

const copyTableToClipboard = async () => {
  // 성능 최적화: 더 효율적인 엘리먼트 찾기
  const tableEl = document.querySelector('.table-container .frequency-table') ||
                   document.querySelector('.frequency-table');
  
  if (!tableEl) {
    isTableCopied.value = false;
    return;
  }
  
  try {
    // 성능 최적화: DocumentFragment 사용하여 DOM 조작 최소화
    const tempTable = tableEl.cloneNode(true);
    
    // 스타일 객체로 한 번에 적용
    const tableStyles = {
      borderCollapse: 'collapse',
      border: '1px solid #888',
      fontSize: '14px',
      width: '100%'
    };
    Object.assign(tempTable.style, tableStyles);
    
    const cellStyles = {
      border: '1px solid #888',
      padding: '8px 4px',
      textAlign: 'center'
    };
    
    const headerStyles = {
      ...cellStyles,
      background: '#f2f2f2',
      fontWeight: 'bold'
    };
    
    // 배치 스타일 적용
    tempTable.querySelectorAll('th').forEach(th => {
      Object.assign(th.style, headerStyles);
    });
    
    tempTable.querySelectorAll('td').forEach(td => {
      Object.assign(td.style, cellStyles);
    });
    
    // 첫 번째 td만 왼쪽 정렬
    tempTable.querySelectorAll('tbody tr').forEach(tr => {
      const firstTd = tr.querySelector('td');
      if (firstTd) firstTd.style.textAlign = 'left';
    });
    
    const html = tempTable.outerHTML;
    const text = tableEl.innerText;
    
    if (navigator.clipboard && window.ClipboardItem) {
      await navigator.clipboard.write([
        new window.ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([text], { type: 'text/plain' })
        })
      ]);
    } else {
      await navigator.clipboard.writeText(text);
    }
    
    isTableCopied.value = true;
    setTimeout(() => (isTableCopied.value = false), 1500);
  } catch (e) {
    console.error('테이블 복사 오류:', e);
    isTableCopied.value = false;
  }
};

const copyChartToClipboard = async () => {
  const instance = chartInstance.value;
  if (!instance || typeof instance.getDataURL !== 'function') {
    isChartCopied.value = false;
    return;
  }
  if (!navigator.clipboard || !navigator.clipboard.write) {
    isChartCopied.value = false;
    return;
  }
  if (typeof ClipboardItem === 'undefined') {
    isChartCopied.value = false;
    return;
  }
  
  try {
    // 1. 임시 컨테이너 생성 (충분히 큰 크기)
    const tempContainer = document.createElement('div');
    tempContainer.style.width = `${chartWidth.value}px`;
    tempContainer.style.height = '500px';
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    tempContainer.style.top = '-9999px';
    document.body.appendChild(tempContainer);
    
    // 2. 임시 차트 인스턴스 생성
    const tempChart = echarts.init(tempContainer);
    
    // 3. 현재 차트의 옵션을 가져와서 임시 차트에 적용
    const currentOption = instance.getOption();
    currentOption.animation = false;
    tempChart.setOption(currentOption, true);
    
    // 4. 차트가 완전히 렌더링될 때까지 대기
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // 5. 임시 차트에서 완전한 이미지 생성
    const dataUrl = tempChart.getDataURL({
      type: 'png',
      pixelRatio: 3,
      backgroundColor: '#fff'
    });
    
    if (!dataUrl || !dataUrl.startsWith('data:image/png')) {
      throw new Error('유효하지 않은 이미지 데이터 URL');
    }
    
    // 6. 클립보드에 복사
    const response = await fetch(dataUrl);
    if (!response.ok) {
      throw new Error(`이미지 로드 실패: ${response.statusText}`);
    }
    const blob = await response.blob();
    await navigator.clipboard.write([
      new ClipboardItem({ [blob.type]: blob })
    ]);
    
    // 7. 임시 요소들 정리
    tempChart.dispose();
    document.body.removeChild(tempContainer);
    
    isChartCopied.value = true;
    setTimeout(() => (isChartCopied.value = false), 1500);
    console.log('차트 복사 완료');
  } catch (error) {
    console.error('차트 복사 오류:', error);
    isChartCopied.value = false;
  }
};

// --- 라이프사이클 훅 ---
onMounted(() => { // 원본 로직 유지
  if (headers.value?.basic?.length > 0 && selectedVariableIndex.value === null) {
    selectVariable(0);
  }
  if (selectedVariableIndex.value !== null) {
    recreateChart();
  }
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => { // 메모리 누수 방지 강화
  // 이벤트 리스너 제거
  window.removeEventListener('resize', handleResize);
  
  // 차트 인스턴스 정리
  if (chartInstance.value && typeof chartInstance.value.dispose === 'function') {
    try { 
      chartInstance.value.dispose(); 
      chartInstance.value = null; 
      console.log('ECharts 인스턴스 정리 완료.'); 
    }
    catch (error) { 
      console.error('ECharts 인스턴스 정리 오류:', error); 
    }
  }
  
  // debounced 함수들 취소
  if (triggerChartUpdate && typeof triggerChartUpdate.cancel === 'function') {
    triggerChartUpdate.cancel();
  }
  if (handleResize && typeof handleResize.cancel === 'function') {
    handleResize.cancel();
  }
  
  // 참조 정리
  chartContainer.value = null;
  
  console.log('컴포넌트 cleanup 완료');
});
// === 원본 스크립트 끝 ===


// --- Watchers (성능 최적화됨) - 강조 변수 선언 후 정의 ---

// +++ 신규: 그라디언트 색상 생성 함수 (EpidemicCurve.vue에서 가져옴) +++
const generateGradientColors = (baseColor) => {
  // 색상을 RGB로 변환
  const hex2rgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };
  
  // RGB를 HEX로 변환
  const rgb2hex = (r, g, b) => {
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  };
  
  // 밝기 조절 함수
  const adjustBrightness = (color, percent) => {
    const rgb = hex2rgb(color);
    if (!rgb) return color;
    
    const factor = percent / 100;
    const r = Math.min(255, Math.max(0, Math.round(rgb.r + (255 - rgb.r) * factor)));
    const g = Math.min(255, Math.max(0, Math.round(rgb.g + (255 - rgb.g) * factor)));
    const b = Math.min(255, Math.max(0, Math.round(rgb.b + (255 - rgb.b) * factor)));
    
    return rgb2hex(r, g, b);
  };
  
  // 선택된 색상을 기준으로 밝은 색(상단)과 기본 색(하단) 생성
  const lightColor = adjustBrightness(baseColor, 30); // 30% 밝게
  const darkColor = baseColor; // 기본 색상을 하단에 사용
  
  return { lightColor, darkColor };
};

// +++ 신규: 강조 기능 관련 상태 +++
const highlightOptions = [
  { key: 'none', label: '강조 없음', tooltip: '모든 막대를 같은 색상으로 표시합니다' },
  { key: 'max', label: '최대값 강조', tooltip: '가장 큰 값의 막대를 다른 색상으로 강조합니다' },
  { key: 'min', label: '최소값 강조', tooltip: '가장 작은 값의 막대를 다른 색상으로 강조합니다' },
  { key: 'both', label: '최대/최소값 강조', tooltip: '가장 큰 값과 가장 작은 값의 막대를 강조합니다' }
];

const currentHighlight = ref('none');
const highlightButtonText = ref(highlightOptions[0].label);

// +++ 신규: 강조 관련 함수 +++
const getNextHighlight = computed(() => {
  const currentIndex = highlightOptions.findIndex(opt => opt.key === currentHighlight.value);
  const nextIndex = (currentIndex + 1) % highlightOptions.length;
  return highlightOptions[nextIndex];
});

const handleMouseEnterHighlight = () => {
  const nextOption = getNextHighlight.value;
  highlightButtonText.value = nextOption.label;
  showTooltip('highlight', nextOption.tooltip);
};

const handleMouseLeaveHighlight = () => {
  const currentOption = highlightOptions.find(opt => opt.key === currentHighlight.value);
  highlightButtonText.value = currentOption.label;
  hideTooltip();
};

const cycleHighlight = () => {
  const nextOption = getNextHighlight.value;
  currentHighlight.value = nextOption.key;
  highlightButtonText.value = nextOption.label;
  triggerChartUpdate();
};

// --- 차트 옵션 생성 함수 (수정됨: 라벨 매핑 적용, 강조 기능 추가) ---
const generateTotalChartOptions = (header, data, dataType = 'count') => { // 원본 함수 구조 유지, 내부 수정
  if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
    // 원본 데이터 없음 처리
    return { /* ... */ };
  }
  const originalCategories = Object.keys(data); // *** 원본 카테고리 목록 저장 ***
  const totalCounts = originalCategories.map((key) => (data[key] ? data[key].count : 0));
  const totalPercentages = originalCategories.map((key) => (data[key] ? data[key].totalPercentage : 0));
  
  // 데이터 타입에 따라 사용할 데이터 결정
  const chartData = dataType === 'percentage' ? totalPercentages : totalCounts;

  // +++ 개선된 강조 기능: 중복된 최솟값/최댓값 모두 처리 +++
  const maxValue = Math.max(...chartData);
  const minValue = Math.min(...chartData);
  const maxIndices = chartData.map((value, index) => value === maxValue ? index : -1).filter(i => i !== -1);
  const minIndices = chartData.map((value, index) => value === minValue ? index : -1).filter(i => i !== -1);

  // 막대별 기본 색상 결정
  const getBarColor = (index) => {
    let baseColor = selectedBarColor.value;
    
    if (currentHighlight.value !== 'none') {
      const isMax = maxIndices.includes(index);
      const isMin = minIndices.includes(index);
      
      if (currentHighlight.value === 'max' && isMax) {
        baseColor = '#ff6b6b'; // 빨간색으로 최대값 강조
      } else if (currentHighlight.value === 'min' && isMin) {
        baseColor = '#4ecdc4'; // 청록색으로 최소값 강조
      } else if (currentHighlight.value === 'both') {
        if (isMax) baseColor = '#ff6b6b';
        else if (isMin) baseColor = '#4ecdc4';
      }
    }
    
    return baseColor;
  };

  return { // 원본 옵션 구조 유지
    textStyle: {
      fontFamily: 'Noto Sans KR, sans-serif'
    },
    title: { 
      text: `전체 대상자 ${header || '(알 수 없음)'} 분포`, 
      left: 'center', 
      textStyle: { 
        fontSize: chartFontSize.value, 
        fontFamily: 'Noto Sans KR, sans-serif' 
      }
    },
    tooltip: {
      trigger: 'axis', axisPointer: { type: 'shadow' },
      formatter (params) {
        if (!params || params.length === 0) return '';
        const param = params[0];
        const dataIndex = param.dataIndex;
        const originalCategory = originalCategories[dataIndex];
        const displayLabel = getMappedLabel(originalCategory);
        const categoryData = data[originalCategory];

        if (!categoryData) return '';
        
        const value = param.value;
        const seriesName = param.seriesName;

        let tooltipText = `<strong>${displayLabel}</strong><br/>`;

        if (dataType === 'percentage') {
          tooltipText += `${seriesName}: <strong>${value}</strong>%`;
          if (categoryData.count !== undefined) {
            tooltipText += ` (${categoryData.count}명)`;
          }
        } else { // count
          tooltipText += `${seriesName}: <strong>${value}</strong>명`;
          if (categoryData.totalPercentage !== undefined) {
            tooltipText += ` (${categoryData.totalPercentage.toFixed(1)}%)`;
          }
        }
        return tooltipText;
      }
    },
    legend: { 
      data: [{
        name: dataType === 'percentage' ? '대상자 비율' : '대상자 수',
        icon: 'rect',
        itemStyle: {
          color: selectedBarColor.value
        }
      }], 
      top: 'bottom', 
      selectedMode: false, 
      textStyle: { 
        fontSize: chartFontSize.value,
        fontFamily: 'Noto Sans KR, sans-serif'
      }
    },
    grid: { left: '3%', right: '4%', bottom: '10%', top: '15%', containLabel: true },
    xAxis: {
      type: 'category',
      data: originalCategories.map(cat => getMappedLabel(cat)),
      axisLabel: {
        interval: 0, rotate: originalCategories.length > 10 ? 30 : 0,
        fontSize: chartFontSize.value, hideOverlap: true,
        fontFamily: 'Noto Sans KR, sans-serif'
      }
    },
    yAxis: { 
      type: 'value', 
      axisLabel: { 
        fontSize: chartFontSize.value,
        fontFamily: 'Noto Sans KR, sans-serif'
      }
    },
    series: [{
      name: dataType === 'percentage' ? '대상자 비율' : '대상자 수', 
      type: 'bar', 
      data: chartData,
      itemStyle: { 
        color(params) {
          const baseColor = getBarColor(params.dataIndex);
          const colors = generateGradientColors(baseColor);
          return new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: colors.lightColor }, 
            { offset: 1, color: colors.darkColor }
          ]);
        }
      },
      barWidth: `${barWidthPercent.value}%`,
      emphasis: { 
        focus: 'series',
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#FDB813' }, 
            { offset: 1, color: '#F9A825' }
          ])
        }
      },
      label: {
        show: chartData.length < 15, position: 'top',
        fontSize: Math.max(10, chartFontSize.value - 4), color: '#333',
        fontFamily: 'Noto Sans KR, sans-serif',
        formatter(params) {
          const dataIndex = params.dataIndex;
          const count = totalCounts[dataIndex];
          const percentage = totalPercentages[dataIndex].toFixed(1);
          if (dataType === 'percentage') {
            return `${percentage}% (${count})`;
          }
          return `${count} (${percentage}%)`;
        }
      }
    }]
  };
};

const generatePatientChartOptions = (header, data, dataType = 'count') => { // 원본 함수 구조 유지, 내부 수정
  if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
    // 원본 데이터 없음 처리
    return { /* ... */ };
  }
  const allOriginalCategories = Object.keys(data);
  const patientCounts = allOriginalCategories.map((key) => (data[key] ? data[key].patientCount : 0));
  const patientPercentages = allOriginalCategories.map((key) => (data[key] ? data[key].patientPercentage : 0));

  const filteredOriginalCategories = []; // *** 필터링된 '원본' 카테고리 ***
  const filteredPatientCounts = [];
  const filteredPatientPercentages = [];
  const filteredDataMap = {}; // 원본 키 사용

  allOriginalCategories.forEach((cat, index) => {
    if (patientCounts[index] > 0) {
      filteredOriginalCategories.push(cat); // *** 원본 저장 ***
      filteredPatientCounts.push(patientCounts[index]);
      filteredPatientPercentages.push(patientPercentages[index]);
      if (data[cat]) { filteredDataMap[cat] = data[cat]; }
    }
  });

  // 데이터 타입에 따라 사용할 데이터 결정
  const chartData = dataType === 'percentage' ? filteredPatientPercentages : filteredPatientCounts;

  // +++ 개선된 강조 기능: 중복된 최솟값/최댓값 모두 처리 +++
  const maxValue = Math.max(...chartData);
  const minValue = Math.min(...chartData);
  const maxIndices = chartData.map((value, index) => value === maxValue ? index : -1).filter(i => i !== -1);
  const minIndices = chartData.map((value, index) => value === minValue ? index : -1).filter(i => i !== -1);

  // 막대별 기본 색상 결정
  const getPatientBarColor = (index) => {
    let baseColor = selectedBarColor.value;
    
    if (currentHighlight.value !== 'none') {
      const isMax = maxIndices.includes(index);
      const isMin = minIndices.includes(index);
      
      if (currentHighlight.value === 'max' && isMax) {
        baseColor = '#ff6b6b'; // 빨간색으로 최대값 강조
      } else if (currentHighlight.value === 'min' && isMin) {
        baseColor = '#4ecdc4'; // 청록색으로 최소값 강조
      } else if (currentHighlight.value === 'both') {
        if (isMax) baseColor = '#ff6b6b';
        else if (isMin) baseColor = '#4ecdc4';
      }
    }
    
    return baseColor;
  };
  if (filteredOriginalCategories.length === 0) {
    // 원본 환자 데이터 없음 처리
    return { /* ... */ };
  }
  return { // 원본 옵션 구조 유지
    textStyle: {
      fontFamily: 'Noto Sans KR, sans-serif'
    },
    title: { 
      text: `환자 ${header || '(알 수 없음)'} 분포`, 
      left: 'center', 
      textStyle: { 
        fontSize: chartFontSize.value,
        fontFamily: 'Noto Sans KR, sans-serif'
      }
    },
    tooltip: {
      trigger: 'axis', axisPointer: { type: 'shadow' },
      formatter (params) {
        if (!params || params.length === 0) return '';
        const param = params[0];
        const dataIndex = param.dataIndex;
        const originalCategory = filteredOriginalCategories[dataIndex];
        const displayLabel = getMappedLabel(originalCategory);
        const categoryData = filteredDataMap[originalCategory];

        if (!categoryData) return '';
        
        const value = param.value;
        const seriesName = param.seriesName;

        let tooltipText = `<strong>${displayLabel}</strong><br/>`;

        if (dataType === 'percentage') {
          tooltipText += `${seriesName}: <strong>${value}</strong>%`;
          if (categoryData.patientCount !== undefined) {
            tooltipText += ` (${categoryData.patientCount}명)`;
          }
        } else { // count
          tooltipText += `${seriesName}: <strong>${value}</strong>명`;
          if (categoryData.patientPercentage !== undefined) {
            tooltipText += ` (${categoryData.patientPercentage.toFixed(1)}%)`;
          }
        }
        return tooltipText;
      }
    },
    legend: { 
      data: [{
        name: dataType === 'percentage' ? '환자 비율' : '환자 수',
        icon: 'rect',
        itemStyle: {
          color: selectedBarColor.value
        }
      }], 
      top: 'bottom', 
      selectedMode: false, 
      textStyle: { 
        fontSize: chartFontSize.value,
        fontFamily: 'Noto Sans KR, sans-serif'
      }
    },
    grid: { left: '3%', right: '4%', bottom: '10%', containLabel: true },
    xAxis: {
      type: 'category',
      data: filteredOriginalCategories.map(cat => getMappedLabel(cat)),
      axisLabel: {
        interval: 0, rotate: filteredOriginalCategories.length > 10 ? 30 : 0,
        fontSize: chartFontSize.value, hideOverlap: true,
        fontFamily: 'Noto Sans KR, sans-serif'
      }
    },
    yAxis: { 
      type: 'value', 
      axisLabel: { 
        fontSize: chartFontSize.value,
        fontFamily: 'Noto Sans KR, sans-serif'
      }
    },
    series: [{
      name: dataType === 'percentage' ? '환자 비율' : '환자 수', 
      type: 'bar', 
      data: chartData,
      itemStyle: { 
        color(params) {
          const baseColor = getPatientBarColor(params.dataIndex);
          const colors = generateGradientColors(baseColor);
          return new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: colors.lightColor }, 
            { offset: 1, color: colors.darkColor }
          ]);
        }
      },
      barWidth: `${barWidthPercent.value}%`,
      emphasis: { 
        focus: 'series',
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#FDB813' }, 
            { offset: 1, color: '#F9A825' }
          ])
        }
      },
      label: {
        show: chartData.length < 15, position: 'top',
        fontSize: Math.max(10, chartFontSize.value - 4), color: '#333',
        fontFamily: 'Noto Sans KR, sans-serif',
        formatter(params) {
          const dataIndex = params.dataIndex;
          const count = filteredPatientCounts[dataIndex];
          const percentage = filteredPatientPercentages[dataIndex].toFixed(1);
          if (dataType === 'percentage') {
            return `${percentage}% (${count})`;
          }
          return `${count} (${percentage}%)`;
        }
      }
    }]
  };
};

// --- Watchers (성능 최적화됨) ---
// 차트 너비 변경 감지 -> 차트 재생성 호출 (성능 최적화)
watch(chartWidth, (newWidth, oldWidth) => {
  if (newWidth !== oldWidth && chartInstance.value && selectedVariableIndex.value !== null) {
    chartWidthButtonText.value = `${newWidth} px`;
    console.log(`Chart width changed: ${oldWidth} -> ${newWidth}. Recreating chart.`);
    // nextTick을 사용하여 DOM 업데이트 완료 후 차트 재생성
    nextTick(() => {
      recreateChart();
    });
  }
}, { flush: 'post' }); // DOM 업데이트 후 실행

// 다른 옵션 변경 감지 (성능 최적화됨)
watch(
  [ 
    selectedVariableIndex,
    selectedChartType,
    selectedDataType,
    frequencyData,
    chartFontSize,
    barWidthPercent,
    selectedBarColor,
    currentHighlight
  ],
  ([newIndex, newChartType, newDataType, newFreqData, newFontSize, newBarWidth, newBarColor, newHighlight], 
    [oldIndex, oldChartType, oldDataType, oldFreqData, oldFontSize, oldBarWidth, oldBarColor, oldHighlight]) => {
    
    // 실제 변경사항이 있는지 확인 (불필요한 업데이트 방지)
    const hasIndexChange = newIndex !== oldIndex;
    const hasChartTypeChange = newChartType !== oldChartType;
    const hasDataTypeChange = newDataType !== oldDataType;
    const hasStyleChange = newFontSize !== oldFontSize || 
                          newBarWidth !== oldBarWidth || 
                          newBarColor !== oldBarColor ||
                          newHighlight !== oldHighlight;
    const hasDataChange = newFreqData !== oldFreqData;
    
    if (!hasIndexChange && !hasChartTypeChange && !hasDataTypeChange && !hasStyleChange && !hasDataChange) {
      return; // 변경사항 없으면 조기 종료
    }

    console.log('Watcher triggered with changes:', { 
      hasIndexChange, hasChartTypeChange, hasDataTypeChange, hasStyleChange, hasDataChange 
    });

    // 변수 변경 시 매핑 초기화 (최적화)
    if (hasIndexChange && newIndex !== null) {
      console.log(`Variable changed: ${oldIndex} -> ${newIndex}`);
      labelMappings.value = {};
      
      const currentFreqData = newFreqData?.[newIndex];
      if (currentFreqData && typeof currentFreqData === 'object') {
        const categories = Object.keys(currentFreqData);
        const newMappings = {};
        categories.forEach(cat => { newMappings[cat] = ''; });
        labelMappings.value = newMappings;
        console.log('Initialized mappings efficiently');
      }
    }

    // 차트 업데이트 (조건부 최적화)
    if (chartInstance.value && newIndex !== null) {
      console.log('Triggering optimized chart update');
      nextTick(() => {
        updateCharts();
      });
    } else if (!chartInstance.value && newIndex !== null) {
      console.log('Chart instance not found, recreating chart');
      nextTick(() => {
        recreateChart();
      });
    }
  },
  { 
    deep: false, 
    immediate: false,
    flush: 'post' // DOM 업데이트 후 실행
  }
);

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

.summary-bar { 
  height: 40px; 
  display: flex; 
  align-items: center; 
  font-size: 20px; 
  color: white; 
  background-color: #1a73e8; 
  padding: 5px; 
  font-family: "Noto Sans KR", sans-serif; 
  font-weight: 300; 
}

.summary-bar__title { 
  display: flex; 
  align-items: center; 
  margin-left: 3px; 
}

.summary-bar__logo { 
  margin-right: 5px; 
  width: 35px; 
  height: auto; 
  vertical-align: middle;
  display: inline-flex;
  align-items: center;
}

.top-section { 
  display: flex; 
  justify-content: space-between; 
  align-items: center; 
  margin: 20px 30px 20px 30px; 
  flex-wrap: wrap; 
}

.variable-selection { 
  display: flex; 
  gap: 20px; 
  justify-content: flex-start; 
  flex-wrap: wrap; 
  height: 46px; 
}

.variable-selection__button { 
  padding: 5px 15px; 
  border: 1px solid #ccc; 
  border-radius: 12px; 
  background-color: white; 
  cursor: pointer; 
  font-family: "Noto Sans KR", sans-serif; 
  font-size: 20px; 
}

.variable-selection__button--active { 
  background-color: #1a73e8; 
  color: white; 
  border-color: #1a73e8; 
}

.participant-summary { 
  display: flex; 
  justify-content: flex-end; 
  gap: 20px; 
}

.participant-summary__item { 
  background-color: white; 
  border: none; 
  padding: 7px 15px; 
  text-align: right; 
  border-radius: 12px; 
  display: flex; 
  align-items: baseline; 
}

.participant-summary__label { 
  font-size: 0.8rem; 
  color: #666; 
}

.participant-summary__value { 
  font-weight: normal; 
  font-size: 1.5rem; 
  color: #333; 
  font-family: sans-serif; 
  margin-left: 4px; 
  margin-right: 2px; 
}

.participant-summary__unit { 
  font-size: 0.8rem; 
  color: #666; 
}

.summary-bar__value { 
  font-weight: normal; 
  font-size: 1.5rem; 
  color: #333; 
  font-family: sans-serif; 
  margin-left: 4px; 
  margin-right: 2px; 
}

.selected-variable-details__title-dot { 
  display: inline-block; 
  width: 0.3em; 
  height: 0.3em; 
  background-color: currentColor; 
  margin-right: 0.3em; 
  vertical-align: middle; 
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

.table-title { 
  margin: 20px 20px 10px 20px; 
  font-size: 1.1em; 
  color: #333; 
  font-weight: 500; 
  text-align: left; 
  display: flex; 
  align-items: center; 
  justify-content: space-between;
}

.frequency-table { 
  width: calc(100% - 40px); 
  font-size: 14px; 
  border-collapse: collapse; 
  margin: 0px 20px 20px 20px; 
}

.frequency-table th, 
.frequency-table td { 
  border: 1px solid #ddd; 
  padding: 8px; 
  text-align: center; 
}

.frequency-table th { 
  background-color: #f2f2f2; 
  font-weight: 500; 
}

.right-column {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-width: 500px;
  position: relative;
}

.chart-container {
  background-color: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  box-sizing: border-box;
  margin: 0;
  padding: 20px;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: visible;
  position: relative;
}

.chart-wrapper {
  position: relative;
  padding: 45px 20px 20px 20px;
  box-sizing: border-box;
  width: 90%;
  height: 90%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.chart-buttons {
  position: absolute;
  top: -5px;
  right: -45px;
  display: flex;
  gap: 12px;
  z-index: 10;
}

.export-chart-button,
.copy-chart-button {
  padding: 8px 12px;
  border: none;
  background-color: white;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  color: #1a73e8;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s ease;
}

.export-chart-button:hover,
.copy-chart-button:hover {
  background-color: rgba(26, 115, 232, 0.1);
}

.export-chart-button:active,
.copy-chart-button:active {
  background-color: rgba(26, 115, 232, 0.2);
}

.button-icon {
  display: flex;
  align-items: center;
}

.button-text {
  font-family: "Noto Sans KR", sans-serif;
  font-weight: 400;
}

.ripple {
  position: absolute;
  border-radius: 50%;
  transform: scale(0);
  animation: ripple 0.4s linear;
  background-color: rgba(26, 115, 232, 0.2);
  pointer-events: none;
}

@keyframes ripple {
  to {
    transform: scale(2);
    opacity: 0;
  }
}

/* === UI 컨트롤 === */
.ui-container { 
  padding: 10px 15px; 
  background-color: #fff; 
  border-radius: 10px; 
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08); 
  display: flex; 
  align-items: center; 
  gap: 15px; 
  flex-wrap: wrap; 
  box-sizing: border-box; 
}

.ui-group { 
  display: flex; 
  align-items: center; 
  gap: 6px; 
}

.ui-label { 
  font-size: 13px; 
  color: #333; 
  white-space: nowrap; 
  font-weight: 500; 
}

.chart-select-button { 
  padding: 4px 10px; 
  border: 1px solid #ccc; 
  border-radius: 14px; 
  background-color: white; 
  cursor: pointer; 
  font-family: "Noto Sans KR", sans-serif; 
  font-size: 13px; 
  transition: all 0.2s ease; 
}

.chart-select-button:hover { 
  background-color: #f0f0f0; 
  border-color: #aaa; 
}

.chart-select-button--active { 
  background-color: #1a73e8; 
  color: white; 
  border-color: #1a73e8; 
  font-weight: 500; 
}

.chart-select-button--active:hover { 
  background-color: #155ab6; 
}

.control-button { 
  padding: 4px 8px; 
  border: 1px solid #ccc; 
  border-radius: 5px; 
  background-color: #f8f9fa; 
  color: #333; 
  cursor: pointer; 
  font-size: 13px; 
  font-family: "Roboto", sans-serif; 
  min-width: 45px; 
  height: 28px; 
  line-height: 18px; 
  text-align: center; 
  transition: background-color 0.2s, border-color 0.2s, color 0.2s, box-shadow 0.2s; 
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05); 
  white-space: nowrap; 
}

.control-button:not(.color-button):hover { 
  background-color: #1a73e8; 
  color: white; 
  border-color: #1a73e8; 
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.07); 
}

.control-button:active { 
  background-color: #e9ecef; 
  color: #333; 
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1); 
}

.font-button { 
  min-width: 35px; 
}

.width-button { 
  min-width: 35px; 
}

.color-button {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid #dadce0;
  padding: 0;
  background: none;
  margin-left: 2px;
  margin-right: 2px;
  cursor: pointer;
  display: inline-block;
  box-shadow: none;
  min-width: unset;
  line-height: 32px;
}

.color-button:hover {
  border-color: #4285f4;
  opacity: 0.85;
  transform: scale(1.05);
}

/* === 강조 버튼 스타일 === */
.highlight-group {
  position: relative;
}

.highlight-button-wrapper {
  position: relative;
  display: inline-block;
}

.highlight-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-width: 110px;
  padding: 4px 8px;
  text-align: center;
}

.highlight-icon {
  font-size: 14px;
  display: flex;
  align-items: center;
}

.highlight-tooltip {
  position: absolute;
  bottom: 110%;
  left: 50%;
  transform: translateX(-50%);
  background-color: #333;
  color: white;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 12px;
  white-space: nowrap;
  z-index: 1000;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  animation: tooltipFadeIn 0.2s ease-in-out;
}

.highlight-tooltip::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 5px solid transparent;
  border-top-color: #333;
}

@keyframes tooltipFadeIn {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

/* === 라벨 매핑 === */
.mapping-container {
  padding: 15px 20px;
  margin: 0px 0px 10px 0px;
  border-top: 1px solid #eee;
  background-color: #fff;
  max-height: 300px;
  overflow-y: auto;
  box-sizing: border-box;
}

.mapping-title { 
  margin: 0px 10px 20px 0px; 
  font-size: 1.1em; 
  color: #333; 
  font-weight: 500; 
  text-align: left; 
  display: flex; 
  align-items: center; 
}

.mapping-items {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
}

.mapping-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.mapping-original-label {
  font-size: 14px;
  white-space: nowrap;
  text-align: left;
  font-weight: 500;
}

.mapping-input {
  max-width: 300px;
  padding: 6px 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 0.85rem;
  line-height: 1.4;
  box-sizing: border-box;
}

.mapping-input::placeholder {
  color: #aaa;
  font-style: italic;
  font-size: 0.8rem;
}

.mapping-input:focus {
  outline: none;
  border-color: #1a73e8;
  box-shadow: 0 0 0 2px rgba(26, 115, 232, 0.2);
}

.mapping-nodata {
  font-size: 0.85rem;
  color: #888;
  text-align: left;
  padding: 15px 0;
}

.no-data-message { 
  padding: 20px; 
  text-align: center; 
  color: #666; 
}

.copy-tooltip {
  position: absolute;
  left: 50%;
  top: 110%;
  transform: translateX(-50%);
  z-index: 10;
  pointer-events: none;
  animation: fadeInOut 1.5s;
}

.copy-tooltip.check-tooltip {
  width: 32px;
  height: 32px;
  padding: 0;
  background: none;
  box-shadow: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

.copy-tooltip.check-tooltip svg {
  display: block;
}

@keyframes fadeInOut {
  0% { opacity: 0; }
  10% { opacity: 0.95; }
  90% { opacity: 0.95; }
  100% { opacity: 0; }
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
  
  .table-container { 
    overflow-x: auto; 
  }
}

/* +++ 신규: 표준 툴팁 CSS +++ */
.control-button-wrapper {
  position: relative;
  display: inline-block;
}

.control-tooltip {
  position: absolute;
  bottom: calc(100% + 5px);
  left: 50%;
  transform: translateX(-50%);
  background-color: #333;
  color: white;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 12px;
  white-space: nowrap;
  z-index: 1050;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  animation: tooltipFadeIn 0.2s ease-in-out;
}

.control-tooltip::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 5px solid transparent;
  border-top-color: #333;
}

/* +++ 발병률 툴팁 스타일 +++ */
.attack-rate-display {
  cursor: help;
  display: flex;
  align-items: baseline;
  padding: 2px 4px;
  border-radius: 4px;
  transition: background-color 0.2s ease;
}

.attack-rate-display:hover {
  background-color: rgba(26, 115, 232, 0.1);
}

/* +++ 발병률 툴팁 전용 스타일 +++ */
.attack-rate-tooltip {
  left: auto !important;
  right: 0 !important;
  transform: none !important;
}

.attack-rate-tooltip::after {
  left: auto !important;
  right: 10px !important;
  transform: translateX(0) !important;
}

/* +++ 확진율 툴팁 스타일 +++ */
.confirmed-rate-display {
  cursor: help;
  display: flex;
  align-items: baseline;
  padding: 2px 4px;
  border-radius: 4px;
  transition: background-color 0.2s ease;
}

.confirmed-rate-display:hover {
  background-color: rgba(26, 115, 232, 0.1);
}

.confirmed-rate-tooltip {
  left: auto !important;
  right: 0 !important;
  transform: none !important;
}

.confirmed-rate-tooltip::after {
  left: auto !important;
  right: 10px !important;
  transform: translateX(0) !important;
}
</style>
