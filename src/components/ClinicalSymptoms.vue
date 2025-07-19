<template>
  <div class="app">
    <header class="app-header">
      <h1 class="app-title">Easy-Epidemiology Web v1.0</h1>
    </header>
    <div class="dashboard">
      <div class="summary-bar">
        <div class="summary-bar__title">
          <span class="material-icons summary-bar__logo">medical_services</span>
          임상증상
        </div>
      </div>
      <div class="output-area">
        <div class="output-row">
          <div class="analysis-table-container">
            <div class="table-title table-title--with-copy">
              <span>
                <span class="selected-variable-details__title-dot"></span>&nbsp;임상증상별 빈도
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
                    <circle cx="12" cy="12" r="12" fill="#1a73e8"/>
                    <polyline points="7,13 11,17 17,9" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </div>
              </div>
            </div>
            <table class="frequency-table">
              <colgroup>
                <col style="width: 80px;" />
                <col style="width: 80px;" />
                <col style="width: 80px;" />
              </colgroup>
              <thead>
                <tr>
                  <th>증상명</th>
                  <th>환자수(명)</th>
                  <th>백분율(%)</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, idx) in sortedSymptomStats" :key="idx">
                  <td>{{ item.name }}</td>
                  <td>{{ item.count }}</td>
                  <td>{{ item.percent }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div style="display: flex; flex-direction: column; flex: 2; min-width: 600px;">
            <div class="controls-area">
              <div class="control-group">
                <label class="control-label">막대 방향:</label>
                <div class="control-button-wrapper">
                  <button class="control-button" @click="toggleBarDirection" @mouseenter="handleBarDirectionMouseEnter" @mouseleave="handleBarDirectionMouseLeave">
                    {{ barDirectionButtonText }}
                  </button>
                  <div v-if="activeTooltip === 'direction'" class="control-tooltip">{{ tooltipText }}</div>
                </div>
              </div>
              <div class="control-group">
                <label class="control-label">폰트 크기:</label>
                <div class="control-button-wrapper">
                  <button class="control-button font-button" @click="cycleFontSize" @mouseenter="handleFontSizeMouseEnter" @mouseleave="handleFontSizeMouseLeave">
                    {{ fontSizeButtonText }}
                  </button>
                  <div v-if="activeTooltip === 'fontSize'" class="control-tooltip">{{ tooltipText }}</div>
                </div>
              </div>
              <div class="control-group">
                <label class="control-label">차트 너비:</label>
                <div class="control-button-wrapper">
                  <button class="control-button width-button" @click="cycleChartWidth" @mouseenter="handleChartWidthMouseEnter" @mouseleave="handleChartWidthMouseLeave">
                    {{ chartWidthButtonText }}
                  </button>
                  <div v-if="activeTooltip === 'chartWidth'" class="control-tooltip">{{ tooltipText }}</div>
                </div>
              </div>
              <div class="control-group">
                <label class="control-label">막대 너비:</label>
                <div class="control-button-wrapper">
                  <button class="control-button width-button" @click="cycleBarWidthPercent" @mouseenter="handleBarWidthMouseEnter" @mouseleave="handleBarWidthMouseLeave">
                    {{ barWidthButtonText }}
                  </button>
                  <div v-if="activeTooltip === 'barWidth'" class="control-tooltip">{{ tooltipText }}</div>
                </div>
              </div>
              <div class="control-group">
                <label class="control-label">색상:</label>
                <div class="control-button-wrapper">
                  <button class="control-button color-button" :style="{ backgroundColor: selectedBarColor }" @click="cycleBarColor" @mouseenter="handleBarColorMouseEnter" @mouseleave="handleBarColorMouseLeave"></button>
                  <div v-if="activeTooltip === 'color'" class="control-tooltip">{{ tooltipText }}</div>
                </div>
              </div>
              <div class="control-group highlight-group">
                <label class="control-label">막대 강조:</label>
                <div class="control-button-wrapper">
                  <button class="control-button highlight-button" @click="cycleHighlight" @mouseenter="handleMouseEnterHighlight" @mouseleave="handleMouseLeaveHighlight">
                    {{ highlightButtonText }}
                  </button>
                  <div v-if="activeTooltip === 'highlight'" class="control-tooltip">
                    {{ tooltipText }}
                  </div>
                </div>
              </div>
              <div class="control-group">
                <label class="control-label">정렬:</label>
                <div class="control-button-wrapper">
                  <button class="control-button sort-button" @click="cycleSort" @mouseenter="handleSortMouseEnter" @mouseleave="handleSortMouseLeave">
                    {{ sortButtonText }}
                  </button>
                  <div v-if="activeTooltip === 'sort'" class="control-tooltip">{{ tooltipText }}</div>
                </div>
              </div>
            </div>
            <div class="analysis-table-container chart-area-container" style="position: relative; margin-top: 0;">
              <div class="chart-buttons">
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
              <div ref="chartContainer" class="chart-instance" :style="{ width: chartWidth + 'px', height: '600px' }"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick, markRaw } from 'vue';
import { useStore } from 'vuex';
import * as echarts from 'echarts';
// 성능 최적화: lodash-es 임포트
import { debounce } from 'lodash-es';

const store = useStore();
const headers = computed(() => store.getters.headers || { clinical: [] });
const rows = computed(() => store.getters.rows || []);
const chartContainer = ref(null);
const chartInstance = ref(null);

// 상태 관리 개선: 데이터 유효성 검증
const hasValidData = computed(() => {
  try {
    return Array.isArray(rows.value) && rows.value.length > 0;
  } catch (error) {
    console.error('hasValidData 계산 오류:', error);
    return false;
  }
});

const hasValidClinicalHeaders = computed(() => {
  try {
    const clinicalHeaders = headers.value.clinical;
    return Array.isArray(clinicalHeaders) && clinicalHeaders.length > 0;
  } catch (error) {
    console.error('hasValidClinicalHeaders 계산 오류:', error);
    return false;
  }
});

const hasValidPatientData = computed(() => {
  try {
    if (!hasValidData.value) return false;
    return rows.value.some(row => row.isPatient === '1' && row.clinicalSymptoms);
  } catch (error) {
    console.error('hasValidPatientData 계산 오류:', error);
    return false;
  }
});

// 차트 상태 관리
const chartStates = computed(() => {
  return {
    hasData: hasValidData.value,
    hasHeaders: hasValidClinicalHeaders.value,
    hasPatients: hasValidPatientData.value,
    isReady: hasValidData.value && hasValidClinicalHeaders.value && hasValidPatientData.value,
    symptomCount: sortedSymptomStats.value.length
  };
});

// 증상별 빈도 계산 (에러 처리 강화)
const patientRows = computed(() => {
  try {
    if (!hasValidData.value) return [];
    return rows.value.filter(row => row && row.isPatient === '1');
  } catch (error) {
    console.error('patientRows 계산 오류:', error);
    return [];
  }
});

const totalPatients = computed(() => {
  try {
    return patientRows.value.length;
  } catch (error) {
    console.error('totalPatients 계산 오류:', error);
    return 0;
  }
});

const symptomStats = computed(() => {
  try {
    if (!hasValidClinicalHeaders.value || !hasValidPatientData.value) {
      console.warn('symptomStats: 유효하지 않은 데이터 상태');
      return [];
    }
    
    const clinicalHeaders = headers.value.clinical || [];
    const patients = patientRows.value;
    
    const stats = clinicalHeaders.map((name, idx) => {
      try {
        let count = 0;
        
        // 성능 최적화: forEach 대신 for 루프 사용
        for (const row of patients) {
          if (row && 
              row.clinicalSymptoms && 
              Array.isArray(row.clinicalSymptoms) && 
              row.clinicalSymptoms[idx] === '1') {
            count++;
          }
        }
        
        const total = totalPatients.value;
        const percent = total > 0 ? ((count / total) * 100).toFixed(1) : '0.0';
        
        return { 
          name: name || `증상${idx + 1}`, 
          count, 
          percent: parseFloat(percent) // 숫자로 변환하여 차트에서 사용하기 쉽게
        };
      } catch (itemError) {
        console.error(`증상 ${name} 처리 오류:`, itemError);
        return { name: name || `증상${idx + 1}`, count: 0, percent: 0 };
      }
    });
    
    console.log('증상 통계 계산 완료:', stats.length, '개 증상');
    return stats;
  } catch (error) {
    console.error('symptomStats 계산 오류:', error);
    return [];
  }
});

const fontSizes = [14, 16, 18, 20, 24];
const fontSizeLabels = ['매우 작게', '작게', '보통', '크게', '매우 크게'];
const chartWidths = [500, 700, 900, 1100];
const barWidthPercents = [30, 50, 70];
const barColors = [
  '#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de',
  '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc'
];
const chartFontSize = ref(16);
const chartWidth = ref(700);
const barWidthPercent = ref(50);
const selectedBarColor = ref(barColors[0]);
const barDirection = ref('vertical'); // 'vertical' or 'horizontal'
const fontSizeButtonText = ref('보통');
const chartWidthButtonText = ref(`${chartWidth.value}px`);
const barWidthButtonText = ref(`${barWidthPercent.value}%`);
const barDirectionButtonText = ref('세로');
const sortButtonText = ref('빈도순');

// +++ 신규: 그라디언트 색상 생성 함수 (PatientCharacteristics.vue에서 가져옴) +++
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

// 강조 기능 관련 상태
const highlightOptions = [
  { key: 'none', label: '강조 없음', tooltip: '모든 막대를 같은 색상으로 표시합니다' },
  { key: 'max', label: '최대값 강조', tooltip: '가장 큰 값의 막대를 다른 색상으로 강조합니다' },
  { key: 'min', label: '최소값 강조', tooltip: '가장 작은 값의 막대를 다른 색상으로 강조합니다' },
  { key: 'both', label: '최대/최소값 강조', tooltip: '가장 큰 값과 가장 작은 값의 막대를 강조합니다' }
];

const currentHighlight = ref('none');
const highlightButtonText = ref(highlightOptions[0].label);

// 정렬 옵션 정의
const sortOptions = [
  { key: 'none', label: '정렬 없음', tooltip: '원본 순서대로 표시합니다' },
  { key: 'percent-asc', label: '오름차순', tooltip: '백분율이 낮은 순으로 정렬합니다' },
  { key: 'percent-desc', label: '내림차순', tooltip: '백분율이 높은 순으로 정렬합니다' }
];

const currentSort = ref('none');


// 정렬된 증상 통계 데이터
const sortedSymptomStats = computed(() => {
  const stats = symptomStats.value;
  if (!Array.isArray(stats) || stats.length === 0) return [];
  
  const sorted = [...stats]; // 원본 배열 복사
  
  switch (currentSort.value) {
  case 'percent-asc':
    return sorted.sort((a, b) => a.percent - b.percent);
  case 'percent-desc':
    return sorted.sort((a, b) => b.percent - a.percent);
  default:
    return stats; // 원본 순서
  }
});

const activeTooltip = ref(null);
const tooltipText = ref('');

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

// 막대 방향 마우스 이벤트 핸들러
const handleBarDirectionMouseEnter = () => {
  const nextDirection = barDirection.value === 'vertical' ? '가로' : '세로';
  barDirectionButtonText.value = nextDirection;
  showTooltip('direction', `막대 방향을 ${nextDirection}로 변경합니다`);
};

const handleBarDirectionMouseLeave = () => {
  const currentDirection = barDirection.value === 'vertical' ? '세로' : '가로';
  barDirectionButtonText.value = currentDirection;
  hideTooltip();
};

// 막대 색상 마우스 이벤트 핸들러
const handleBarColorMouseEnter = () => {
  showTooltip('color', '막대 색상을 변경합니다');
};

const handleBarColorMouseLeave = () => {
  hideTooltip();
};

// 정렬 마우스 이벤트 핸들러
const handleSortMouseEnter = () => {
  const currentIndex = sortOptions.findIndex(option => option.key === currentSort.value);
  const nextIndex = (currentIndex + 1) % sortOptions.length;
  const nextSort = sortOptions[nextIndex];
  sortButtonText.value = nextSort.label;
  showTooltip('sort', nextSort.tooltip);
};

const handleSortMouseLeave = () => {
  const currentSortOption = sortOptions.find(option => option.key === currentSort.value);
  sortButtonText.value = currentSortOption.label;
  hideTooltip();
};

/**
 * 배열에서 다음 값을 순환적으로 반환
 * @param {any} currentValue - 현재 값
 * @param {Array} valueArray - 값 배열
 * @returns {any} 다음 값
 */
const getNextValue = (currentValue, valueArray) => {
  try {
    if (!Array.isArray(valueArray) || valueArray.length === 0) {
      console.warn('getNextValue: 유효하지 않은 배열:', valueArray);
      return currentValue;
    }
    
    const currentIndex = valueArray.indexOf(currentValue);
    if (currentIndex === -1) return valueArray[0];
    const nextIndex = (currentIndex + 1) % valueArray.length;
    return valueArray[nextIndex];
  } catch (error) {
    console.error('getNextValue 오류:', error);
    return currentValue;
  }
};

/**
 * 차트 준비 상태 검증
 * @returns {boolean} 차트 업데이트 가능 여부
 */
const canUpdateChart = () => {
  try {
    const states = chartStates.value;
    return states.isReady && states.symptomCount > 0;
  } catch (error) {
    console.error('canUpdateChart 검증 오류:', error);
    return false;
  }
};

/**
 * 폰트 크기를 순환적으로 변경
 * @returns {void}
 */
function cycleFontSize() {
  try {
    chartFontSize.value = getNextValue(chartFontSize.value, fontSizes);
    const currentIndex = fontSizes.indexOf(chartFontSize.value);
    fontSizeButtonText.value = fontSizeLabels[currentIndex];
    console.log('폰트 크기 변경:', chartFontSize.value);
    nextTick(() => {
      if (canUpdateChart()) {
        debouncedRenderChart();
      }
    });
  } catch (error) {
    console.error('cycleFontSize 오류:', error);
  }
}

/**
 * 차트 너비를 순환적으로 변경
 * @returns {void}
 */
function cycleChartWidth() {
  try {
    chartWidth.value = getNextValue(chartWidth.value, chartWidths);
    chartWidthButtonText.value = `${chartWidth.value}px`;
    console.log('차트 너비 변경:', chartWidth.value);
    // 차트 너비 변경 시 차트 재생성 필요
    nextTick(() => {
      if (canUpdateChart()) {
        recreateChart();
      }
    });
  } catch (error) {
    console.error('cycleChartWidth 오류:', error);
  }
}

/**
 * 막대 너비를 순환적으로 변경
 * @returns {void}
 */
function cycleBarWidthPercent() {
  try {
    barWidthPercent.value = getNextValue(barWidthPercent.value, barWidthPercents);
    barWidthButtonText.value = `${barWidthPercent.value}%`;
    console.log('막대 너비 변경:', barWidthPercent.value);
    nextTick(() => {
      if (canUpdateChart()) {
        debouncedRenderChart();
      }
    });
  } catch (error) {
    console.error('cycleBarWidthPercent 오류:', error);
  }
}

/**
 * 막대 색상을 순환적으로 변경
 * @returns {void}
 */
function cycleBarColor() {
  try {
    selectedBarColor.value = getNextValue(selectedBarColor.value, barColors);
    console.log('막대 색상 변경:', selectedBarColor.value);
    nextTick(() => {
      if (canUpdateChart()) {
        debouncedRenderChart();
      }
    });
  } catch (error) {
    console.error('cycleBarColor 오류:', error);
  }
}

/**
 * 막대 방향을 토글 (세로/가로)
 * @returns {void}
 */
function toggleBarDirection() {
  try {
    barDirection.value = barDirection.value === 'vertical' ? 'horizontal' : 'vertical';
    const currentDirection = barDirection.value === 'vertical' ? '세로' : '가로';
    barDirectionButtonText.value = currentDirection;
    console.log('막대 방향 변경:', barDirection.value);
    nextTick(() => {
      if (canUpdateChart()) {
        debouncedRenderChart();
      }
    });
  } catch (error) {
    console.error('toggleBarDirection 오류:', error);
  }
}

/**
 * 강조 기능 관련 함수
 */
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
  showTooltip('highlight', nextOption.tooltip);
  nextTick(() => {
    if (canUpdateChart()) {
      debouncedRenderChart();
    }
  });
};

/**
 * 정렬 옵션을 순환적으로 변경
 * @returns {void}
 */
const cycleSort = () => {
  try {
    const currentIndex = sortOptions.findIndex(option => option.key === currentSort.value);
    const nextIndex = (currentIndex + 1) % sortOptions.length;
    currentSort.value = sortOptions[nextIndex].key;
    const currentSortOption = sortOptions.find(option => option.key === currentSort.value);
    sortButtonText.value = currentSortOption.label;
    
    console.log('정렬 변경:', currentSort.value);
    nextTick(() => {
      if (canUpdateChart()) {
        debouncedRenderChart();
      }
    });
  } catch (error) {
    console.error('cycleSort 오류:', error);
  }
};

/**
 * ECharts 옵션 생성 (에러 처리 강화)
 * @returns {Object} ECharts 옵션 객체
 */
const chartOptions = computed(() => {
  try {
    const stats = sortedSymptomStats.value;
    
    if (!Array.isArray(stats) || stats.length === 0) {
      console.warn('chartOptions: 유효하지 않은 증상 데이터');
      return { title: { text: '데이터 없음' } };
    }
    
    const isHorizontal = barDirection.value === 'horizontal';
    const fontSize = chartFontSize.value || 16;
    
    // 데이터 검증
    const hasValidNames = stats.every(item => 
      item && typeof item.name === 'string' && item.name.trim() !== ''
    );
    
    if (!hasValidNames) {
      console.error('chartOptions: 유효하지 않은 증상명 데이터');
      return { title: { text: '데이터 형식 오류' } };
    }
    
    // 차트 데이터 준비
    const names = stats.map(item => item.name);
    const percentData = stats.map(item => {
      const percent = Number(item.percent);
      return isNaN(percent) ? 0 : percent;
    });

    // +++ 개선된 강조 기능: 중복된 최솟값/최댓값 모두 처리 +++
    const maxValue = Math.max(...percentData);
    const minValue = Math.min(...percentData);
    const maxIndices = percentData.map((value, index) => value === maxValue ? index : -1).filter(i => i !== -1);
    const minIndices = percentData.map((value, index) => value === minValue ? index : -1).filter(i => i !== -1);
    
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
    
    console.log('차트 옵션 생성:', {
      direction: barDirection.value,
      fontSize,
      color: selectedBarColor.value,
      dataCount: stats.length
    });

    return {
      textStyle: {
        fontFamily: 'Noto Sans KR, sans-serif'
      },
      title: {
        text: '환자의 임상증상 분포',
        left: 'center',
        textStyle: { fontSize, fontFamily: 'Noto Sans KR, sans-serif' }
      },
      tooltip: { 
        trigger: 'axis',
        formatter(params) {
          if (params && params[0]) {
            const data = params[0];
            const statsData = sortedSymptomStats.value.find(s => s.name === data.name);
            let result = `<strong>${data.name}</strong><br/>${data.seriesName}: <strong>${data.value}</strong>%`;
            if(statsData) {
              result += ` (${statsData.count}명)`;
            }
            return result;
          }
          return '';
        }
      },
      grid: { 
        left: '8%', 
        right: isHorizontal ? '20%' : '8%', 
        bottom: isHorizontal ? '15%' : '10%', 
        top: '15%', 
        containLabel: true 
      },
      xAxis: isHorizontal
        ? { 
          type: 'value', 
          name: '백분율(%)', 
          nameTextStyle: { fontSize, fontFamily: 'Noto Sans KR, sans-serif' }, 
          axisLabel: { fontSize, fontFamily: 'Noto Sans KR, sans-serif' }, 
          max: 100,
          min: 0
        }
        : { 
          type: 'category', 
          data: names, 
          axisLabel: { 
            interval: 0, 
            rotate: stats.length > 10 ? 30 : 0, 
            fontSize,
            fontFamily: 'Noto Sans KR, sans-serif'
          } 
        },
      yAxis: isHorizontal
        ? { 
          type: 'category', 
          data: names, 
          axisLabel: { fontSize, fontFamily: 'Noto Sans KR, sans-serif' } 
        }
        : { 
          type: 'value', 
          name: '백분율(%)', 
          nameTextStyle: { fontSize, fontFamily: 'Noto Sans KR, sans-serif' }, 
          axisLabel: { fontSize, fontFamily: 'Noto Sans KR, sans-serif' }, 
          max: 100,
          min: 0
        },
      series: [
        {
          name: '백분율',
          type: 'bar',
          data: percentData,
          itemStyle: { 
            color(params) {
              const baseColor = getBarColor(params.dataIndex);
              const colors = generateGradientColors(baseColor);
              if (barDirection.value === 'horizontal') {
                return new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                  { offset: 0, color: colors.darkColor },
                  { offset: 1, color: colors.lightColor }
                ]);
              }
              return new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: colors.lightColor },
                { offset: 1, color: colors.darkColor }
              ]);
            }
          },
          emphasis: {
            focus: 'series',
            itemStyle: {
              color: isHorizontal
                ? new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                  { offset: 0, color: '#F9A825' },
                  { offset: 1, color: '#FDB813' }
                ])
                : new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                  { offset: 0, color: '#FDB813' },
                  { offset: 1, color: '#F9A825' }
                ])
            }
          },
          label: { 
            show: true, 
            position: isHorizontal ? 'right' : 'top', 
            fontSize: Math.max(10, fontSize - 2), 
            formatter: '{c}%',
            fontFamily: 'Noto Sans KR, sans-serif',
            color: '#333'
          },
          barWidth: `${barWidthPercent.value}%`,
          orientation: isHorizontal ? 'horizontal' : 'vertical'
        }
      ]
    };
  } catch (error) {
    console.error('chartOptions 생성 오류:', error);
    return { title: { text: '차트 생성 오류' } };
  }
});

// 성능 최적화: debounced 차트 렌더링
const debouncedRenderChart = debounce(() => {
  console.log('Debounced chart render triggered');
  renderChart();
}, 150);

/**
 * 차트 재생성 함수
 * @returns {void}
 */
const recreateChart = () => {
  console.log('Attempting to recreate chart...');
  if (chartInstance.value && typeof chartInstance.value.dispose === 'function') {
    try { 
      chartInstance.value.dispose(); 
      console.log('Previous chart instance disposed.'); 
    }
    catch (e) { 
      console.error('Error disposing chart instance:', e); 
    }
    finally { 
      chartInstance.value = null; 
    }
  }
  nextTick(() => {
    if (chartContainer.value instanceof HTMLElement) {
      try {
        console.log(`Initializing new chart in container with width: ${chartContainer.value.offsetWidth}px`);
        chartInstance.value = markRaw(echarts.init(chartContainer.value));
        console.log('New chart instance initialized.');
        renderChart();
      } catch (error) { 
        console.error('ECharts 재초기화 실패:', error); 
        alert('차트를 다시 그리는 중 오류가 발생했습니다.'); 
      }
    } else { 
      console.error('차트 컨테이너 DOM 요소를 찾을 수 없습니다.'); 
    }
  });
};

/**
 * 차트 렌더링 및 업데이트 (성능 최적화)
 * @returns {void}
 */
const renderChart = () => {
  try {
    if (!chartContainer.value) {
      console.warn('renderChart: 차트 컨테이너가 없음');
      return;
    }
    
    // 상태 검증
    if (!canUpdateChart()) {
      console.warn('renderChart: 차트 업데이트 불가 상태');
      return;
    }
    
    const states = chartStates.value;
    console.log('차트 렌더링 시작:', states);
    
    if (!chartInstance.value) {
      chartInstance.value = markRaw(echarts.init(chartContainer.value));
      console.log('차트 인스턴스 생성됨');
    }
    
    const options = chartOptions.value;
    if (options && typeof options === 'object') {
      // 성능 향상: 병합 방식 사용
      chartInstance.value.setOption(options, false);
      console.log('차트 업데이트 완료');
    } else {
      console.error('renderChart: 유효하지 않은 차트 옵션');
    }
  } catch (error) {
    console.error('renderChart 오류:', error);
  }
};

onMounted(() => {
  console.log('ClinicalSymptoms 컴포넌트 마운트됨');
  nextTick(() => {
    if (canUpdateChart()) {
      renderChart();
    }
  });
});

onUnmounted(() => {
  // 차트 인스턴스 정리
  if (chartInstance.value && typeof chartInstance.value.dispose === 'function') {
    try {
      chartInstance.value.dispose();
      chartInstance.value = null;
      console.log('차트 인스턴스 정리 완료');
    } catch (error) {
      console.error('차트 정리 오류:', error);
    }
  }
  
  // debounced 함수 취소
  if (debouncedRenderChart && typeof debouncedRenderChart.cancel === 'function') {
    debouncedRenderChart.cancel();
  }
  
  // 참조 정리
  chartContainer.value = null;
  
  console.log('ClinicalSymptoms 컴포넌트 cleanup 완료');
});

// Watcher 최적화 (성능 향상)
// 차트 너비 변경 감지 -> 차트 재생성 호출
watch(chartWidth, (newWidth, oldWidth) => {
  if (newWidth !== oldWidth && chartInstance.value && canUpdateChart()) {
    chartWidthButtonText.value = `${newWidth}px`;
    console.log(`Chart width changed: ${oldWidth} -> ${newWidth}. Recreating chart.`);
    nextTick(() => {
      recreateChart();
    });
  }
}, { flush: 'post' });

// 다른 옵션 변경 감지
watch([
  symptomStats,
  barDirection,
  selectedBarColor,
  chartFontSize,
  currentHighlight,
  barWidthPercent
], ([newStats, newDirection, newColor, newFontSize, newHighlight, newBarWidth],
  [oldStats, oldDirection, oldColor, oldFontSize, oldHighlight, oldBarWidth]) => {
  
  try {
    // 실제 변경사항 확인 (불필요한 업데이트 방지)
    const hasStatsChange = newStats !== oldStats;
    const hasDirectionChange = newDirection !== oldDirection;
    const hasColorChange = newColor !== oldColor;
    const hasFontChange = newFontSize !== oldFontSize;
    const hasHighlightChange = newHighlight !== oldHighlight;
    const hasBarWidthChange = newBarWidth !== oldBarWidth;
    
    if (!hasStatsChange && !hasDirectionChange && !hasColorChange && !hasFontChange && !hasHighlightChange && !hasBarWidthChange) {
      return; // 변경사항 없으면 조기 종료
    }
    
    console.log('차트 업데이트 triggered:', {
      hasStatsChange, hasDirectionChange, hasColorChange, hasFontChange, hasHighlightChange, hasBarWidthChange
    });
    
    nextTick(() => {
      if (canUpdateChart()) {
        debouncedRenderChart();
      }
    });
  } catch (error) {
    console.error('watch 핸들러 오류:', error);
  }
}, { 
  deep: false, 
  immediate: false,
  flush: 'post' // DOM 업데이트 후 실행
});

// 차트 복사/저장 기능
const isTableCopied = ref(false);
const isChartCopied = ref(false);

/**
 * 테이블을 클립보드에 복사 (성능 최적화)
 * @returns {Promise<void>}
 */
const copyTableToClipboard = async () => {
  let tableEl = null;
  
  try {
    // 이 컴포넌트의 첫 번째 테이블만 복사
    const tableContainer = document.querySelector('.analysis-table-container');
    if (tableContainer) {
      tableEl = tableContainer.querySelector('.frequency-table');
    }
    if (!tableEl) {
      tableEl = document.querySelector('.frequency-table');
    }
    if (!tableEl) {
      console.warn('copyTableToClipboard: 테이블 요소를 찾을 수 없음');
      isTableCopied.value = false;
      return;
    }
    
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
    console.log('테이블 복사 완료');
  } catch (e) {
    console.error('테이블 복사 오류:', e);
    isTableCopied.value = false;
  }
};

/**
 * 차트를 클립보드에 복사 (에러 처리 강화)
 * @returns {Promise<void>}
 */
const copyChartToClipboard = async () => {
  const instance = chartInstance.value;
  if (!instance || typeof instance.getDataURL !== 'function') {
    console.warn('copyChartToClipboard: 차트 인스턴스가 없거나 getDataURL 함수가 없음');
    isChartCopied.value = false;
    return;
  }
  if (!navigator.clipboard || !navigator.clipboard.write) {
    console.warn('copyChartToClipboard: 클립보드 API를 사용할 수 없음');
    isChartCopied.value = false;
    return;
  }
  if (typeof ClipboardItem === 'undefined') {
    console.warn('copyChartToClipboard: ClipboardItem을 사용할 수 없음');
    isChartCopied.value = false;
    return;
  }
  
  try {
    // 1. 임시 컨테이너 생성 (충분히 큰 크기)
    const tempContainer = document.createElement('div');
    tempContainer.style.width = `${chartWidth.value}px`;
    tempContainer.style.height = '600px';
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
    await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
    
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

/**
 * 차트를 파일로 저장 (에러 처리 강화)
 * @returns {Promise<void>}
 */
const exportChart = async () => {
  const instance = chartInstance.value;
  if (!instance || typeof instance.getDataURL !== 'function') {
    alert('차트 내보내기 불가');
    return;
  }
  const filename = `임상증상_분석_${new Date().toISOString().split('T')[0]}.png`;
  
  try {
    // 1. 임시 컨테이너 생성 (충분히 큰 크기)
    const tempContainer = document.createElement('div');
    tempContainer.style.width = `${chartWidth.value}px`;
    tempContainer.style.height = '600px';
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
</script>

<style scoped>
.app {
  background-color: #f0f0f0;
  height: 100vh;
  overflow: hidden;
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
  width: 97%;
  margin: 20px auto 37px auto;
  background-color: #f0f0f0;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
  height: calc(100vh - 131px); /* 헤더(37px) + 상하여백(20px+37px) + 탭(37px) */
  overflow: hidden;
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
.summary-bar__info {
  background: #fff;
  margin: 12px 30px 0 30px;
  padding: 8px 18px;
  border-radius: 8px;
  font-size: 15px;
  color: #333;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  font-family: "Noto Sans KR", sans-serif;
  font-weight: 400;
  display: block;
  min-height: unset;
}
.output-area {
  display: flex;
  flex-direction: column;
  gap: 30px;
  margin: 20px 30px 30px 30px;
  flex: 1;
  overflow: auto;
}
.output-row {
  display: flex;
  gap: 30px;
  align-items: flex-start;
}
.analysis-table-container {
  flex: 1;
  margin: 0;
  display: flex;
  flex-direction: column;
  background-color: #fff;
  box-sizing: border-box;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  border-radius: 12px;
  overflow-x: auto;
  overflow: visible;
}
.analysis-table-container:last-child {
  flex: 2;
  min-width: 600px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.table-title,
.table-title--with-copy {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: auto;
  min-width: 0;
  margin: 20px 20px 10px 20px;
  box-sizing: border-box;
}
.selected-variable-details__title-dot {
  display: inline-block;
  width: 0.4em;
  height: 0.4em;
  background-color: #1a73e8;
  margin-right: 0.4em;
  vertical-align: middle;
  border-radius: 50%;
}
.frequency-table {
  font-size: 14px;
  border-collapse: collapse;
  margin: 0 20px 20px 20px;
  table-layout: fixed;
  width: auto;
}
.frequency-table th,
.frequency-table td {
  border: 1px solid #ddd;
  padding: 8px 12px;
  text-align: center;
  white-space: nowrap;
}
.frequency-table thead th {
  background-color: #f2f2f2;
  font-weight: 500;
  position: sticky;
  top: 0;
  z-index: 1;
}
.frequency-table tbody td:first-child {
  text-align: left;
}
.controls-area {
  padding: 10px 15px;
  background-color: #fff;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
  gap: 15px;
  flex-wrap: wrap;
  box-sizing: border-box;
  width: 100%;
  justify-content: flex-start;
  margin-bottom: 18px;
}
.control-group {
  display: flex;
  align-items: center;
  gap: 6px;
  position: relative;
}
.control-label {
  font-size: 13px;
  color: #333;
  white-space: nowrap;
  font-weight: 500;
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
  transition: background-color 0.2s, border-color 0.2s, color 0.2s,
    box-shadow 0.2s;
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

/* === 강조 버튼 및 공용 툴팁 스타일 === */
.control-button-wrapper {
  position: relative;
  display: inline-block;
  z-index: 20;
  justify-content: center;
}

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
  height: 28px;
  box-sizing: border-box;
}

.sort-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-width: 90px;
  padding: 4px 8px;
  text-align: center;
  height: 28px;
  box-sizing: border-box;
}

.highlight-icon {
  font-size: 14px;
  display: flex;
  align-items: center;
  margin: auto;
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
  z-index: 1000;
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
.controls-and-chart-wrapper {
  max-width: 700px;
  margin: 0 auto;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.chart-container-wrapper {
  width: 100%;
  max-width: 650px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.chart-instance {
  height: 600px;
  min-height: 600px;
  max-height: 600px;
  margin: auto;
}

.width-button {
  min-width: 35px;
}
.export-chart-button,
.copy-chart-button {
  padding: 6px 10px;
  border: none;
  background-color: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
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
.analysis-table-container.chart-area-container {
  flex: 2;
  min-width: 600px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  padding-top: 28px;
}
.chart-buttons {
  position: absolute;
  top: 10px;
  right: 18px;
  display: flex;
  gap: 8px;
  z-index: 2;
}
</style> 