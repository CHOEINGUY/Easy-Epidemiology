<template>
  <div class="app">
    <header class="app-header">
      <h1 class="app-title">Easy-Epidemiology Web v1.0</h1>
    </header>

    <div class="dashboard">
      <div class="summary-bar">
         <div class="summary-bar__title">
          <img
            src="https://www.gstatic.com/mobilesdk/160503_mobilesdk/logo/2x/firebase_28dp.png"
            alt="Firebase-Logo"
            class="summary-bar__logo"
          />
          유행곡선 및 잠복기 분석
        </div>
      </div>

      <div class="output-area">
        <div class="output-row">
          <div class="table-container analysis-table-container">
            <div class="table-title" style="display: flex; align-items: center; justify-content: space-between;">
              <span style="display: flex; align-items: center;">
                <span class="selected-variable-details__title-dot"></span>
                <span style="margin-left: 0.2em;">증상 발현 시간별 환자 수</span>
              </span>
              <div style="position: relative;">
                <button @click="copySymptomTableToClipboard" class="copy-chart-button">
                  <span class="button-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                  </span>
                  <span class="button-text">복사</span>
                </button>
                <div v-if="isSymptomTableCopied" class="copy-tooltip check-tooltip">
                  <svg width="32" height="32" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="12" fill="#1a73e8"/>
                    <polyline points="7,13 11,17 17,9" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </div>
              </div>
            </div>
            <table
              v-if="symptomOnsetTableData.length > 0"
              class="frequency-table"
            >
              <thead>
                <tr>
                  <th class="frequency-table__header">증상 발현 시간</th>
                  <th class="frequency-table__header">수</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(item, index) in symptomOnsetTableData"
                  :key="'onset-' + index"
                  class="frequency-table__row"
                >
                  <td class="frequency-table__cell">
                    {{ item.intervalLabel }}
                  </td>
                  <td class="frequency-table__cell">{{ item.count }}</td>
                </tr>
              </tbody>
            </table>
            <div v-else class="no-data-message">
              증상 발현 시간 테이블 데이터를 생성할 수 없습니다.
            </div>

            <div class="table-title symptom-summary-title">
              <span style="display: flex; align-items: center;">
                <span class="selected-variable-details__title-dot"></span>
                <span style="margin-left: 0.2em;">발생 요약 정보</span>
              </span>
            </div>

            <div class="summary-info-embedded">
              <div class="info-item">
                <span class="info-label">최초 발생일시 :</span>
                <span class="info-value">{{ formattedFirstOnsetTime }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">최종 발생일시 :</span>
                <span class="info-value">{{ formattedLastOnsetTime }}</span>
              </div>
            </div>
          </div>

          <div class="controls-and-chart-wrapper">
            <div class="controls-area symptom-controls-local">
              <div class="control-group">
                <label for="symptom-interval" class="control-label"
                  >증상발현 시간간격 :</label
                >
                <div class="control-button-wrapper">
                  <select
                    id="symptom-interval"
                    v-model.number="selectedSymptomInterval"
                    class="control-select"
                    @mouseenter="showTooltip('symptomInterval', '증상 발현 시간 간격을 변경합니다')" @mouseleave="hideTooltip"
                  >
                    <option value="3">3시간</option>
                    <option value="6">6시간</option>
                    <option value="12">12시간</option>
                    <option value="24">24시간</option>
                    <option value="48">48시간</option>
                  </select>
                  <div v-if="activeTooltip === 'symptomInterval'" class="control-tooltip">{{ tooltipText }}</div>
                </div>
              </div>
              <div class="control-group">
                <label class="control-label">폰트 크기:</label>
                <div class="control-button-wrapper">
                  <button class="control-button font-button" @click="cycleEpiFontSize" @mouseenter="handleEpiMouseEnterFontSize" @mouseleave="handleEpiMouseLeaveFontSize">
                    {{ epiFontSizeButtonText }}
                  </button>
                  <div v-if="activeTooltip === 'epiFontSize'" class="control-tooltip">{{ tooltipText }}</div>
                </div>
              </div>
              <div class="control-group">
                <label class="control-label">차트 너비:</label>
                <div class="control-button-wrapper">
                  <button class="control-button width-button" @click="cycleEpiChartWidth" @mouseenter="handleEpiMouseEnterChartWidth" @mouseleave="handleEpiMouseLeaveChartWidth">
                    {{ epiChartWidthButtonText }}
                  </button>
                  <div v-if="activeTooltip === 'epiChartWidth'" class="control-tooltip">{{ tooltipText }}</div>
                </div>
              </div>
              <div class="control-group">
                <label class="control-label">색상:</label>
                <div class="control-button-wrapper">
                  <button class="control-button color-button" :style="{ backgroundColor: epiBarColor }" @click="cycleEpiBarColor" @mouseenter="showTooltip('epiColor', '막대 색상을 변경합니다')" @mouseleave="hideTooltip"></button>
                  <div v-if="activeTooltip === 'epiColor'" class="control-tooltip">{{ tooltipText }}</div>
                </div>
              </div>
            </div>
            <div class="chart-container-wrapper epi-chart-wrapper">
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
                  <div v-if="isEpiChartCopied" class="copy-tooltip check-tooltip">
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
              <div ref="epiCurveChartContainer" class="chart-instance" :style="{ width: epiChartWidth + 'px' }"></div>
            </div>
          </div>
        </div>

        <div class="output-row">
          <div class="table-container">
            <div class="table-title" style="display: flex; align-items: center; justify-content: space-between;">
              <span style="display: flex; align-items: center;">
                <span class="selected-variable-details__title-dot"></span>
                <span style="margin-left: 0.2em;">예상 잠복 기간별 환자 수</span>
              </span>
              <div style="position: relative;">
                <button @click="copyIncubationTableToClipboard" class="copy-chart-button">
                  <span class="button-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                  </span>
                  <span class="button-text">복사</span>
                </button>
                <div v-if="isIncubationTableCopied" class="copy-tooltip check-tooltip">
                  <svg width="32" height="32" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="12" fill="#1a73e8"/>
                    <polyline points="7,13 11,17 17,9" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </div>
              </div>
            </div>
            <table
              v-if="incubationPeriodTableData.length > 0"
              class="frequency-table"
            >
              <thead>
                <tr>
                  <th class="frequency-table__header">예상 잠복 기간</th>
                  <th class="frequency-table__header">수</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(item, index) in incubationPeriodTableData"
                  :key="'incubation-' + index"
                  class="frequency-table__row"
                >
                  <td class="frequency-table__cell">
                    {{ item.intervalLabel }}
                  </td>
                  <td class="frequency-table__cell">{{ item.count }}</td>
                </tr>
              </tbody>
            </table>
            <div v-else class="no-data-message">
              잠복 기간 테이블 데이터를 생성할 수 없습니다.
            </div>

            <div class="table-title incubation-summary-title">
              <span style="display: flex; align-items: center;">
                <span class="selected-variable-details__title-dot"></span>
                <span style="margin-left: 0.2em;">잠복기 요약 정보</span>
              </span>
            </div>

            <div class="incubation-summary-info-embedded">
              <div class="info-item">
                  <span class="info-label">최소 잠복기 :</span>
                  <span class="info-value">{{ minIncubationPeriodFormatted }}</span>
              </div>
              <div class="info-item">
                  <span class="info-label">최대 잠복기 :</span>
                  <span class="info-value">{{ maxIncubationPeriodFormatted }}</span>
              </div>
              <div class="info-item">
                  <span class="info-label">평균 잠복기 :</span>
                  <span class="info-value">{{ avgIncubationPeriodFormatted }}</span>
              </div>
              <div class="info-item">
                  <span class="info-label">중앙 잠복기 :</span>
                  <span class="info-value">{{ medianIncubationPeriodFormatted }}</span>
              </div>
            </div>
          </div>

          <div class="controls-and-chart-wrapper">
            <div class="controls-area incubation-controls-local">
              <div v-if="!isIndividualExposureColumnVisible" class="control-group">
                <label for="exposure-time" class="control-label">의심원 노출시간 :</label>
                <div class="control-button-wrapper">
                  <input
                    type="datetime-local"
                    id="exposure-time"
                    v-model="exposureDateTime"
                    class="control-input-datetime"
                    @mouseenter="showTooltip('exposureTime', '기준 의심원 노출일을 설정합니다.', $event)"
                    @mouseleave="hideTooltip"
                    title="모든 환자에게 동일하게 적용될 기준 의심원 노출시간을 설정합니다."
                  />
                </div>
              </div>
              <div class="control-group">
                <label for="incubation-interval" class="control-label">계급 간격(시간) :</label>
                <div class="control-button-wrapper">
                  <select
                    id="incubation-interval"
                    v-model.number="selectedIncubationInterval"
                    class="control-select"
                    @mouseenter="showTooltip('incubationInterval', '잠복기 계산 간격을 변경합니다')" @mouseleave="hideTooltip"
                  >
                    <option value="3">3시간</option>
                    <option value="6">6시간</option>
                    <option value="12">12시간</option>
                    <option value="24">24시간</option>
                    <option value="48">48시간</option>
                  </select>
                  <div v-if="activeTooltip === 'incubationInterval'" class="control-tooltip">{{ tooltipText }}</div>
                </div>
              </div>
              <div class="control-group">
                <label class="control-label">폰트 크기:</label>
                <div class="control-button-wrapper">
                  <button class="control-button font-button" @click="cycleIncubationFontSize" @mouseenter="handleIncubationMouseEnterFontSize" @mouseleave="handleIncubationMouseLeaveFontSize">
                    {{ incubationFontSizeButtonText }}
                  </button>
                  <div v-if="activeTooltip === 'incubationFontSize'" class="control-tooltip">{{ tooltipText }}</div>
                </div>
              </div>
              <div class="control-group">
                <label class="control-label">차트 너비:</label>
                <div class="control-button-wrapper">
                  <button class="control-button width-button" @click="cycleIncubationChartWidth" @mouseenter="handleIncubationMouseEnterChartWidth" @mouseleave="handleIncubationMouseLeaveChartWidth">
                    {{ incubationChartWidthButtonText }}
                  </button>
                  <div v-if="activeTooltip === 'incubationChartWidth'" class="control-tooltip">{{ tooltipText }}</div>
                </div>
              </div>
              <div class="control-group">
                <label class="control-label">색상:</label>
                <div class="control-button-wrapper">
                  <button class="control-button color-button" :style="{ backgroundColor: incubationBarColor }" @click="cycleIncubationBarColor" @mouseenter="showTooltip('incubationColor', '막대 색상을 변경합니다')" @mouseleave="hideTooltip"></button>
                  <div v-if="activeTooltip === 'incubationColor'" class="control-tooltip">{{ tooltipText }}</div>
                </div>
              </div>
            </div>
            <div class="chart-container-wrapper incubation-chart-wrapper">
              <div class="chart-buttons">
                <div style="position: relative;">
                  <button @click="copyIncubationChartToClipboard" class="copy-chart-button">
                    <span class="button-icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                      </svg>
                    </span>
                    <span class="button-text">차트 복사</span>
                  </button>
                  <div v-if="isIncubationChartCopied" class="copy-tooltip check-tooltip">
                    <svg width="32" height="32" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="12" fill="#1a73e8"/>
                      <polyline points="7,13 11,17 17,9" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </div>
                </div>
                <button @click="exportIncubationChart" class="export-chart-button">
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
              <div ref="incubationChartContainer" class="chart-instance" :style="{ width: incubationChartWidth + 'px' }"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
// --- Script setup remains exactly the same ---
import {
  ref,
  computed,
  onMounted,
  onUnmounted,
  watch,
  nextTick,
  markRaw,
} from "vue";
import { useStore } from "vuex";
import { useStoreBridge } from "../store/storeBridge.js";
import { useUndoRedo } from "../hooks/useUndoRedo.js";
import * as echarts from "echarts";
// 성능 최적화: lodash-es 임포트
import { debounce } from 'lodash-es';

const store = useStore();
const storeBridge = useStoreBridge(store);
useUndoRedo(storeBridge);

// eslint-disable-next-line no-unused-vars
const headers = computed(() => storeBridge.headers);
const rows = computed(() => storeBridge.rows);

// '개별 노출 시간' 열 표시 여부 상태
const isIndividualExposureColumnVisible = computed(() => store.state.isIndividualExposureColumnVisible);

const selectedSymptomInterval = computed({
  get: () => store.getters.getSelectedSymptomInterval,
  set: (value) => storeBridge.updateSymptomInterval(value),
});
const exposureDateTime = computed({
  get: () => store.getters.getExposureDateTime,
  set: (value) => storeBridge.updateExposureDateTime(value),
});
const selectedIncubationInterval = computed({
  get: () => store.getters.getSelectedIncubationInterval,
  set: (value) => storeBridge.updateIncubationInterval(value),
});

// Chart customization states (상태 관리 개선)
const fontSizes = [12, 15, 18, 21, 24];
const chartWidths = [700, 900, 1100]; // 차트 너비 배열
const barColors = [
  "#5470c6", // 기본 파란색
  "#1E88E5", // 진한 파란색 (현재 유행곡선 하단 색상)
  "#29ABE2", // 밝은 파란색 (현재 유행곡선 상단 색상)  
  "#91cc75", // 녹색
  "#fac858", // 노란색
  "#ee6666", // 빨간색
  "#73c0de", // 하늘색
  "#3ba272", // 진한 녹색
  "#fc8452", // 주황색
  "#9a60b4", // 보라색
  "#ea7ccc", // 분홍색
];

// 유행곡선 차트 상태
const epiChartFontSize = ref(15);
const epiChartWidth = ref(1100);
const epiBarColor = ref("#1E88E5");
const epiFontSizeButtonText = ref(epiChartFontSize.value);
const epiChartWidthButtonText = ref(`${epiChartWidth.value}px`);

// 잠복기 차트 상태
const incubationChartFontSize = ref(15);
const incubationChartWidth = ref(1100);
const incubationBarColor = ref("#91cc75"); // 녹색으로 구분
const incubationFontSizeButtonText = ref(incubationChartFontSize.value);
const incubationChartWidthButtonText = ref(`${incubationChartWidth.value}px`);

const activeTooltip = ref(null);
const tooltipText = ref('');

const showTooltip = (key, text) => {
    activeTooltip.value = key;
    tooltipText.value = text;
};

const hideTooltip = () => {
    activeTooltip.value = null;
};

// 선택된 색상을 기반으로 그라디언트 생성하는 함수
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
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
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
  const lightColor = adjustBrightness(baseColor, 40);
  const darkColor = baseColor;
  return { lightColor, darkColor };
};

// 잠복기 시간 라벨을 "HH:MM~HH:MM" 형식에서 "N~M시간" 형식으로 변환하는 함수
const formatIncubationLabel = (intervalLabel) => {
  try {
    // "00:00 ~ 03:00" 형식을 파싱
    const parts = intervalLabel.split(' ~ ');
    if (parts.length !== 2) return intervalLabel; // 형식이 맞지 않으면 원래 라벨 반환
    
    const startTime = parts[0].trim();
    const endTime = parts[1].trim();
    
    // HH:MM 형식에서 시간만 추출
    const startHour = parseInt(startTime.split(':')[0], 10);
    let endHour = parseInt(endTime.split(':')[0], 10);
    
    // 24시간을 0시로 처리하는 경우 대응
    if (endHour === 0 && startHour > 0) {
      endHour = 24;
    }
    
    return `${startHour}~${endHour}시간`;
  } catch (error) {
    console.warn('잠복기 라벨 포맷 변환 오류:', error, intervalLabel);
    return intervalLabel; // 오류 발생시 원래 라벨 반환
  }
};

// 상태 관리 개선: 데이터 유효성 검증 computed
const hasValidData = computed(() => {
  try {
    return Array.isArray(rows.value) && rows.value.length > 0;
  } catch (error) {
    console.error('hasValidData 계산 오류:', error);
    return false;
  }
});

const hasValidPatientData = computed(() => {
  try {
    if (!hasValidData.value) return false;
    return rows.value.some(row => row.isPatient === "1" && row.symptomOnset);
  } catch (error) {
    console.error('hasValidPatientData 계산 오류:', error);
    return false;
  }
});

const hasValidExposureData = computed(() => {
  try {
    if (!hasValidPatientData.value) {
      return false;
    }

    // 개별 노출 시간 모드인지 공통 노출 시간 모드인지에 따라 유효성 검사 분기
    if (isIndividualExposureColumnVisible.value) {
      // 개별 노출 시간 모드: 계산된 유효한 잠복기 데이터가 하나 이상 있는지 확인
      return incubationDurations.value.length > 0;
    } else {
      // 공통 노출 시간 모드: 설정된 공통 노출 시간이 유효한지 확인
      return exposureTimestamp.value !== null;
    }
  } catch (error) {
    console.error('hasValidExposureData 계산 오류:', error);
    return false;
  }
});

// 차트 상태 관리
const chartStates = computed(() => {
  return {
    hasEpiCurveData: symptomOnsetTableData.value.length > 1, // 빈 행 제외하고 실제 데이터가 있는지
    hasIncubationData: incubationPeriodTableData.value.length > 1,
    isEpiCurveReady: hasValidPatientData.value,
    isIncubationReady: hasValidExposureData.value
  };
});

// Utility functions for cycling through values (개선된 상태 관리)

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
const canUpdateCharts = () => {
  try {
    const states = chartStates.value;
    return states.isEpiCurveReady || states.isIncubationReady;
  } catch (error) {
    console.error('canUpdateCharts 검증 오류:', error);
    return false;
  }
};

// 유행곡선 차트 마우스 이벤트 핸들러 (단순화)
const handleEpiMouseEnterFontSize = () => {
  showTooltip('epiFontSize', '폰트 크기를 조절합니다');
};
const handleEpiMouseLeaveFontSize = () => {
  hideTooltip();
};
const handleEpiMouseEnterChartWidth = () => {
  showTooltip('epiChartWidth', '차트 너비를 조절합니다');
};
const handleEpiMouseLeaveChartWidth = () => {
  hideTooltip();
};

// 잠복기 차트 마우스 이벤트 핸들러 (단순화)
const handleIncubationMouseEnterFontSize = () => {
  showTooltip('incubationFontSize', '폰트 크기를 조절합니다');
};
const handleIncubationMouseLeaveFontSize = () => {
  hideTooltip();
};
const handleIncubationMouseEnterChartWidth = () => {
  showTooltip('incubationChartWidth', '차트 너비를 조절합니다');
};
const handleIncubationMouseLeaveChartWidth = () => {
  hideTooltip();
};

// 유행곡선 차트 사이클 버튼 핸들러
const cycleEpiFontSize = () => {
  epiChartFontSize.value = getNextValue(epiChartFontSize.value, fontSizes);
  epiFontSizeButtonText.value = epiChartFontSize.value;
  nextTick(updateCharts);
};
const cycleEpiChartWidth = () => {
  epiChartWidth.value = getNextValue(epiChartWidth.value, chartWidths);
  epiChartWidthButtonText.value = `${epiChartWidth.value}px`;
};
const cycleEpiBarColor = () => {
  epiBarColor.value = getNextValue(epiBarColor.value, barColors);
  nextTick(updateCharts);
};

// 잠복기 차트 사이클 버튼 핸들러
const cycleIncubationFontSize = () => {
  incubationChartFontSize.value = getNextValue(
    incubationChartFontSize.value,
    fontSizes
  );
  incubationFontSizeButtonText.value = incubationChartFontSize.value;
  nextTick(updateCharts);
};
const cycleIncubationChartWidth = () => {
  incubationChartWidth.value = getNextValue(
    incubationChartWidth.value,
    chartWidths
  );
  incubationChartWidthButtonText.value = `${incubationChartWidth.value}px`;
};
const cycleIncubationBarColor = () => {
  incubationBarColor.value = getNextValue(
    incubationBarColor.value,
    barColors
  );
  nextTick(updateCharts);
};

// Chart export functions
const exportChart = async () => {
  const instance = epiCurveChartInstance.value;
  if (!instance || typeof instance.getDataURL !== "function") {
    alert("차트 내보내기 불가");
    return;
  }
  const filename = `유행곡선_${selectedSymptomInterval.value}시간_${new Date().toISOString().split('T')[0]}.png`;
  try {
    const dataUrl = instance.getDataURL({
      type: "png",
      pixelRatio: 3,
      backgroundColor: "#fff",
    });
    if (!dataUrl || !dataUrl.startsWith("data:image/png"))
      throw new Error("유효하지 않은 이미지 데이터 URL");
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error("차트 내보내기 오류:", error);
    alert(`차트 내보내기 오류: ${error.message}`);
  }
};

const isSymptomTableCopied = ref(false);
const isIncubationTableCopied = ref(false);
const isEpiChartCopied = ref(false);
const isIncubationChartCopied = ref(false);

const copySymptomTableToClipboard = async () => {
  const tableEl = document.querySelector('.output-row .table-container .frequency-table');
  if (!tableEl) { 
    isSymptomTableCopied.value = false; 
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
    
    isSymptomTableCopied.value = true;
    setTimeout(() => (isSymptomTableCopied.value = false), 1500);
  } catch (e) { 
    console.error('증상 테이블 복사 오류:', e);
    isSymptomTableCopied.value = false; 
  }
};

const copyIncubationTableToClipboard = async () => {
  const tableEl = document.querySelectorAll('.output-row .table-container .frequency-table')[1];
  if (!tableEl) { 
    isIncubationTableCopied.value = false; 
    return; 
  }
  
  try {
    // 성능 최적화: 동일한 패턴으로 최적화
    const tempTable = tableEl.cloneNode(true);
    
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
    
    isIncubationTableCopied.value = true;
    setTimeout(() => (isIncubationTableCopied.value = false), 1500);
  } catch (e) { 
    console.error('잠복기 테이블 복사 오류:', e);
    isIncubationTableCopied.value = false; 
  }
};

const copyChartToClipboard = async () => {
  const instance = epiCurveChartInstance.value;
  if (!instance || typeof instance.getDataURL !== "function") {
    isEpiChartCopied.value = false;
    return;
  }
  if (!navigator.clipboard || !navigator.clipboard.write) {
    isEpiChartCopied.value = false;
    return;
  }
  if (typeof ClipboardItem === "undefined") {
    isEpiChartCopied.value = false;
    return;
  }
  try {
    const dataUrl = instance.getDataURL({
      type: "png",
      pixelRatio: 3,
      backgroundColor: "#fff",
    });
    if (!dataUrl || !dataUrl.startsWith("data:image/png")) throw new Error("유효하지 않은 이미지 데이터 URL");
    const response = await fetch(dataUrl);
    if (!response.ok) throw new Error(`이미지 로드 실패: ${response.statusText}`);
    const blob = await response.blob();
    await navigator.clipboard.write([
      new ClipboardItem({ [blob.type]: blob }),
    ]);
    isEpiChartCopied.value = true;
    setTimeout(() => (isEpiChartCopied.value = false), 1500);
  } catch (error) { isEpiChartCopied.value = false; }
};

const copyIncubationChartToClipboard = async () => {
  const instance = incubationChartInstance.value;
  if (!instance || typeof instance.getDataURL !== "function") {
    isIncubationChartCopied.value = false;
    return;
  }
  if (!navigator.clipboard || !navigator.clipboard.write) {
    isIncubationChartCopied.value = false;
    return;
  }
  if (typeof ClipboardItem === "undefined") {
    isIncubationChartCopied.value = false;
    return;
  }
  try {
    const dataUrl = instance.getDataURL({
      type: "png",
      pixelRatio: 3,
      backgroundColor: "#fff",
    });
    if (!dataUrl || !dataUrl.startsWith("data:image/png")) throw new Error("유효하지 않은 이미지 데이터 URL");
    const response = await fetch(dataUrl);
    if (!response.ok) throw new Error(`이미지 로드 실패: ${response.statusText}`);
    const blob = await response.blob();
    await navigator.clipboard.write([
      new ClipboardItem({ [blob.type]: blob }),
    ]);
    isIncubationChartCopied.value = true;
    setTimeout(() => (isIncubationChartCopied.value = false), 1500);
  } catch (error) { isIncubationChartCopied.value = false; }
};

// --- Helper Functions (타입 안전성 강화) ---

/**
 * 날짜를 MM-dd HH:mm 형식으로 포맷팅
 * @param {Date} date - 포맷팅할 날짜 객체
 * @returns {string} 포맷팅된 날짜 문자열 또는 빈 문자열
 */
const formatDateTime = (date) => {
  try {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      console.warn('formatDateTime: 유효하지 않은 날짜:', date);
      return "";
    }
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${month}-${day} ${hours}:${minutes}`;
  } catch (error) {
    console.error('formatDateTime 오류:', error, 'date:', date);
    return "";
  }
};

/**
 * 주어진 타임스탬프를 지정된 시간 간격의 시작점으로 내림 처리
 * @param {number} timestamp - 처리할 타임스탬프 (밀리초)
 * @param {number} intervalHours - 시간 간격 (시간 단위)
 * @returns {number} 간격 시작점의 타임스탬프 또는 NaN
 */
const floorToIntervalStart = (timestamp, intervalHours) => {
  try {
    if (isNaN(timestamp) || isNaN(intervalHours) || intervalHours <= 0) {
      console.warn('floorToIntervalStart: 유효하지 않은 파라미터:', { timestamp, intervalHours });
      return NaN;
    }
    
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      console.warn('floorToIntervalStart: 유효하지 않은 타임스탬프:', timestamp);
      return NaN;
    }
    
    const localHours = date.getHours();
    const startHour = Math.floor(localHours / intervalHours) * intervalHours;
    const blockStartDate = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      startHour,
      0,
      0,
      0
    );
    
    const result = blockStartDate.getTime();
    return !isNaN(result) ? result : NaN;
  } catch (error) {
    console.error('floorToIntervalStart 오류:', error, { timestamp, intervalHours });
    return NaN;
  }
};

/**
 * 밀리초 단위의 기간을 HH:MM 형식으로 포맷팅
 * @param {number} durationMillis - 기간 (밀리초)
 * @returns {string} HH:MM 형식의 문자열 또는 "--:--"
 */
const formatDurationHHMM = (durationMillis) => {
  try {
    // Handle NaN or invalid inputs gracefully
    if (isNaN(durationMillis) || durationMillis < 0) {
      console.warn('formatDurationHHMM: 유효하지 않은 duration:', durationMillis);
      return "--:--";
    }
    
    const totalMinutes = Math.round(durationMillis / (60 * 1000)); // Round to nearest minute
    if (isNaN(totalMinutes)) {
      console.warn('formatDurationHHMM: totalMinutes 계산 실패:', durationMillis);
      return "--:--";
    }
    
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  } catch (error) {
    console.error('formatDurationHHMM 오류:', error, 'duration:', durationMillis);
    return "--:--";
  }
};

/**
 * 날짜를 YYYY-MM-dd HH:mm 형식으로 포맷팅
 * @param {Date} date - 포맷팅할 날짜 객체
 * @returns {string} 포맷팅된 날짜 문자열 또는 "N/A"
 */
const formatShortDateTime = (date) => {
  try {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      console.warn('formatShortDateTime: 유효하지 않은 날짜:', date);
      return "N/A";
    }
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  } catch (error) {
    console.error('formatShortDateTime 오류:', error, 'date:', date);
    return "N/A";
  }
};

// --- Symptom Onset Data Calculations ---
const patientOnsetTimes = computed(() => {
  if (!rows.value || rows.value.length === 0) return [];
  return rows.value
    .filter((r) => r.isPatient === "1" && r.symptomOnset)
    .map((r) => {
      try {
        // Handle potential timezone issues by ensuring 'T' separator
        const dateStr = r.symptomOnset.includes("T")
          ? r.symptomOnset
          : r.symptomOnset.replace(" ", "T");
        const d = new Date(dateStr);
        return !isNaN(d.getTime()) ? d : null;
      } catch {
        return null;
      }
    })
    .filter((d) => d)
    .sort((a, b) => a.getTime() - b.getTime());
});
const firstOnsetTime = computed(() =>
  patientOnsetTimes.value.length > 0 ? patientOnsetTimes.value[0] : null
);
const lastOnsetTime = computed(() =>
  patientOnsetTimes.value.length > 0
    ? patientOnsetTimes.value[patientOnsetTimes.value.length - 1]
    : null
);
const formattedFirstOnsetTime = computed(() =>
  formatShortDateTime(firstOnsetTime.value)
);
const formattedLastOnsetTime = computed(() =>
  formatShortDateTime(lastOnsetTime.value)
);
const symptomOnsetTableData = computed(() => {
  const intervalHours = selectedSymptomInterval.value;
  if (
    !intervalHours ||
    !patientOnsetTimes.value ||
    patientOnsetTimes.value.length === 0 ||
    !firstOnsetTime.value || // Ensure first/last onset times are valid
    !lastOnsetTime.value
  )
    return [];

  const intervalMillis = intervalHours * 3600000;
  const minTimestamp = firstOnsetTime.value.getTime();
  const maxTimestamp = lastOnsetTime.value.getTime();

  // 🔥 NEW: 양쪽 패딩 구간 설정 (앞뒤로 1개씩)
  const PADDING_INTERVALS_BEFORE = 1;
  const PADDING_INTERVALS_AFTER = 1;

  // Ensure blockStart is valid before proceeding
  const blockStartTimestamp = floorToIntervalStart(minTimestamp, intervalHours);
   if (isNaN(blockStartTimestamp)) {
       console.error("Invalid blockStartTimestamp calculated.");
       return []; // Return empty if calculation fails
   }

  // 🔥 NEW: 첫 환자가 속한 구간을 찾은 후, 그 이전 1개 구간부터 시작
  let firstPatientIntervalStart = blockStartTimestamp;
  while (firstPatientIntervalStart > minTimestamp) {
      firstPatientIntervalStart -= intervalMillis;
  }
  // 첫 환자가 실제로 구간에 포함되는지 확인
  if (minTimestamp >= firstPatientIntervalStart + intervalMillis) {
      firstPatientIntervalStart += intervalMillis;
  }
  
  // 🔥 NEW: 첫 환자 구간 이전에 패딩 구간 추가
  let firstIntervalStart = firstPatientIntervalStart - (PADDING_INTERVALS_BEFORE * intervalMillis);

  // 🔥 NEW: 마지막 환자 이후 1개 구간을 추가하여 종료점 확장
  const extendedMaxTimestamp = maxTimestamp + (PADDING_INTERVALS_AFTER * intervalMillis);

  const data = [];
  let currentIntervalStart = firstIntervalStart;
  let guard = 0; // Loop guard

  // 🔥 NEW: 확장된 종료점까지 처리
  while (currentIntervalStart <= extendedMaxTimestamp && guard < 1000) {
    const currentIntervalEnd = currentIntervalStart + intervalMillis;
    
    // 성능 최적화: filter 대신 for 루프 사용
    let count = 0;
    for (const time of patientOnsetTimes.value) {
      const timestamp = time.getTime();
      if (timestamp >= currentIntervalStart && timestamp < currentIntervalEnd) {
        count++;
      }
    }

    // 🔥 NEW: 모든 구간을 추가 (0명인 구간도 포함)
    data.push({
      intervalLabel: `${formatDateTime(
        new Date(currentIntervalStart)
      )} ~ ${formatDateTime(new Date(currentIntervalEnd))}`,
      count,
    });

    currentIntervalStart = currentIntervalEnd;
    guard++;
  }
  if (guard >= 1000) console.error("Loop guard hit in symptom onset");

  return data;
});


// --- Incubation Period Data Calculations ---
const exposureTimestamp = computed(() => {
  const expStr = exposureDateTime.value;
  if (!expStr) return null;
  try {
    const dateStr = expStr.includes("T") ? expStr : expStr.replace(" ", "T");
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d.getTime();
  } catch {
    return null;
  }
});

// NEW: Calculate raw incubation durations in milliseconds
const incubationDurations = computed(() => {
  const patientRows = store.getters.rows.filter(row => row.isPatient === '1');
  
  if (isIndividualExposureColumnVisible.value) {
    // 개별 노출 시간 사용
    return patientRows.map(row => {
      if (!row.symptomOnset || !row.individualExposureTime) {
        return null;
      }
      const onset = new Date(row.symptomOnset);
      const exposure = new Date(row.individualExposureTime);

      if (isNaN(onset.getTime()) || isNaN(exposure.getTime()) || onset < exposure) {
        return null;
      }
      
      return onset.getTime() - exposure.getTime();
    }).filter(duration => duration !== null);
  } else {
    // 공통 노출 시간 사용
    const exposureDate = new Date(exposureDateTime.value);
    if (isNaN(exposureDate.getTime())) return [];

    return patientRows.map(row => {
      if (!row.symptomOnset) {
        return null;
      }
      const onset = new Date(row.symptomOnset);
      if (isNaN(onset.getTime()) || onset < exposureDate) {
        return null;
      }
      return onset.getTime() - exposureDate.getTime();
    }).filter(duration => duration !== null);
  }
});

// NEW: Calculate summary statistics for incubation period
const minIncubationPeriodFormatted = computed(() => {
    if (incubationDurations.value.length === 0) return '--:--';
    const minDuration = Math.min(...incubationDurations.value);
    return formatDurationHHMM(minDuration);
});

const maxIncubationPeriodFormatted = computed(() => {
    if (incubationDurations.value.length === 0) return '--:--';
    const maxDuration = Math.max(...incubationDurations.value);
    return formatDurationHHMM(maxDuration);
});

const avgIncubationPeriodFormatted = computed(() => {
    if (incubationDurations.value.length === 0) return '--:--';
    const sum = incubationDurations.value.reduce((acc, val) => acc + val, 0);
    const avgDuration = sum / incubationDurations.value.length;
    return formatDurationHHMM(avgDuration);
});

const medianIncubationPeriodFormatted = computed(() => {
    if (incubationDurations.value.length === 0) return '--:--';
    const sortedDurations = [...incubationDurations.value].sort((a, b) => a - b);
    const mid = Math.floor(sortedDurations.length / 2);
    let medianDuration;
    if (sortedDurations.length % 2 === 0) {
        // Even number of values: average the two middle ones
        medianDuration = (sortedDurations[mid - 1] + sortedDurations[mid]) / 2;
    } else {
        // Odd number of values: take the middle one
        medianDuration = sortedDurations[mid];
    }
    return formatDurationHHMM(medianDuration);
});


const incubationPeriodTableData = computed(() => {
  const intervalHours = selectedIncubationInterval.value;
  const durations = incubationDurations.value; // Use the calculated durations

  if (!intervalHours || durations.length === 0) {
      return [];
  }

  const intervalMillis = intervalHours * 3600000;
  const maxDuration = Math.max(...durations);
  const data = [];
  let currentIntervalStart = 0;
  let guard = 0;

  while (currentIntervalStart <= maxDuration && guard < 1000) {
    const currentIntervalEnd = currentIntervalStart + intervalMillis;
    
    // 성능 최적화: filter 대신 for 루프 사용
    let count = 0;
    for (const duration of durations) {
      if (duration >= currentIntervalStart && duration < currentIntervalEnd) {
        count++;
      }
    }

    // Only add if there's a count or it's the first interval for context
    if (count > 0 || currentIntervalStart === 0) {
        data.push({
          intervalLabel: `${formatDurationHHMM(
            currentIntervalStart
          )} ~ ${formatDurationHHMM(currentIntervalEnd)}`,
          count,
        });
    }

    currentIntervalStart = currentIntervalEnd;
    guard++;
  }
  if (guard >= 1000) console.error("Loop guard hit in incubation period table");

   // Add the final "empty" interval if the last duration wasn't exactly at the start of the last interval
   if (currentIntervalStart <= maxDuration + intervalMillis) {
      data.push({
          intervalLabel: `${formatDurationHHMM(currentIntervalStart)} ~ `,
          count: 0
      });
   }

  return data;
});


// --- Chart Instances ---
const epiCurveChartContainer = ref(null);
const incubationChartContainer = ref(null);
const epiCurveChartInstance = ref(null);
const incubationChartInstance = ref(null);

// --- Chart Options Generation (에러 처리 강화) ---

/**
 * 유행곡선 차트 옵션 생성
 * @returns {Object} ECharts 옵션 객체
 */
const generateEpiCurveChartOptions = () => {
  try {
    const data = symptomOnsetTableData.value;
    
    if (!Array.isArray(data)) {
      console.error('generateEpiCurveChartOptions: data가 배열이 아님:', data);
      return { title: { text: "데이터 형식 오류" } };
    }
    
    // 🔥 NEW: 이제 모든 데이터를 사용 (패딩 구간 포함)
    const validData = data;
    if (!validData || validData.length === 0) {
      console.warn('generateEpiCurveChartOptions: 유효한 데이터가 없음');
      return { title: { text: "데이터 없음" } };
    }

    // --- 제공된 최종 예제 코드를 기반으로 로직 재구성 ---

    // 1. 데이터 가공 (날짜/시간 포맷팅)
    const processedData = validData.map(item => {
        const intervalLabel = item.intervalLabel;
        const parts = intervalLabel.split(' ~ ');
        const startDateStr = parts[0]; // "04-08 00:00"
        
        const datePart = startDateStr.split(' ')[0]; // "04-08"
        const timePart = startDateStr.split(' ')[1]; // "00:00"

        const [month, day] = datePart.split('-').map(p => parseInt(p, 10));

        const year = new Date().getFullYear();
        const dateObj = new Date(year, month - 1, day);
        const dayOfWeekMap = ['일', '월', '화', '수', '목', '금', '토'];
        const dayOfWeek = dayOfWeekMap[dateObj.getDay()];

        const formattedDate = `${month}. ${day}.(${dayOfWeek})`;

        const startTime = timePart.split(':')[0];
        let endTime = '??';
        if (parts[1] && parts[1].includes(':')) {
            endTime = parts[1].split(' ')[1].split(':')[0];
        } else {
             const intervalHours = selectedSymptomInterval.value || 3;
             endTime = String((parseInt(startTime, 10) + intervalHours) % 24).padStart(2, '0');
        }
        
        const formattedTime = `${parseInt(startTime, 10)}~${endTime === '00' ? 24 : parseInt(endTime, 10)}시`;

        return {
            formattedDate: formattedDate,
            formattedTime: formattedTime,
            value: Number(item.count) || 0
        };
    });
    
    const timeData = processedData.map(item => item.formattedTime);
    const seriesData = processedData.map(item => item.value);

    // 2. 날짜 그룹 정보 생성
    const dateGroups = [];
    const dateMap = new Map();
    processedData.forEach((item, index) => {
        if (!dateMap.has(item.formattedDate)) {
            dateMap.set(item.formattedDate, { startIndex: index, count: 0 });
        }
        dateMap.get(item.formattedDate).count++;
    });
    dateMap.forEach((value, key) => {
        dateGroups.push({ name: key, ...value });
    });


    return {
      textStyle: {
        fontFamily: 'Noto Sans KR, sans-serif'
      },
      title: {
        text: "시간별 발생자 수",
        left: "center",
        textStyle: { fontSize: (epiChartFontSize.value || 15) + 4, fontWeight: 'bold' },
        top: 15
      },
      tooltip: { 
        trigger: "axis",
        axisPointer: { type: 'shadow' },
        formatter: (params) => {
            const dataIndex = params[0].dataIndex;
            const item = processedData[dataIndex];
            return `<strong>${item.formattedDate}</strong><br/>${item.formattedTime} : <strong>${item.value}</strong> 명`;
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '7%',
        top: 80, // 제목과 그래프 사이 간격 확보
        containLabel: true
      },
      xAxis: [
        {
          type: 'category',
          data: timeData,
          axisLine: { show: true, onZero: false },
          axisTick: { show: false },
          axisLabel: { 
            interval: 0,
            color: '#333',
            fontSize: epiChartFontSize.value || 15,
            margin: 10
          },
          splitLine: { show: false },
        },
        {
          type: 'category',
          position: 'bottom',
          offset: 35, // 라벨 높이에 따라 조절
          axisLine: { show: true, lineStyle: { color: '#cccccc', width: 2 } },
          axisTick: {
            show: true,
            inside: false,
            length: 70, // offset과 동일하게 설정하여 위쪽 축에 닿도록 함
            lineStyle: { color: '#cccccc', width: 2 },
            interval: (index, value) => value !== ''
          },
          axisLabel: {
            show: true,
            interval: (index, value) => value !== '',
            color: '#333',
            fontSize: epiChartFontSize.value || 15,
          },
          splitLine: { show: false },
          data: dateGroups.flatMap(group => {
              const groupData = Array(group.count).fill('');
              if (groupData.length > 0) {
                groupData[0] = group.name; 
              }
              return groupData;
          })
        }
      ],
      yAxis: { 
        type: "value", 
        name: "환자 수 (명)",
        nameTextStyle: { padding: [0, 0, 0, 60], fontSize: epiChartFontSize.value || 15 },
        axisLabel: { fontSize: epiChartFontSize.value || 15 },
        splitLine: { show: true, lineStyle: { type: 'dashed' } }
      },
      series: [
        {
          name: "환자 수",
          type: "bar",
          xAxisIndex: 0, 
          data: seriesData,
          barWidth: '100%',
          itemStyle: {
              color: (() => {
                const colors = generateGradientColors(epiBarColor.value || "#1E88E5");
                return new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                  { offset: 0, color: colors.lightColor }, 
                  { offset: 1, color: colors.darkColor }
                ]);
              })()
          },
          emphasis: {
              focus: 'series',
              itemStyle: {
                  color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                      { offset: 0, color: '#FDB813' }, { offset: 1, color: '#F9A825' }
                  ])
              }
          },
          label: { 
            show: true, 
            position: "top", 
            fontSize: Math.max(10, (epiChartFontSize.value || 15) - 1)
          },
        }
      ]
    };
  } catch (error) {
    console.error('generateEpiCurveChartOptions 오류:', error);
    return { title: { text: "차트 생성 오류" } };
  }
};

/**
 * 잠복기 유행곡선 차트 옵션 생성
 * @returns {Object} ECharts 옵션 객체
 */
const generateIncubationChartOptions = () => {
  try {
    const data = incubationPeriodTableData.value;
    
    if (!Array.isArray(data)) {
      console.error('generateIncubationChartOptions: data가 배열이 아님:', data);
      return { title: { text: "데이터 형식 오류" } };
    }
    
    // Filter out the last "empty" row for charting
    const validData = data.slice(0, -1);
    if (!validData || validData.length === 0) {
      console.warn('generateIncubationChartOptions: 유효한 데이터가 없음');
      return { title: { text: "데이터 없음" } };
    }

    // 데이터 검증
    const hasValidLabels = validData.every(item => 
      item && typeof item.intervalLabel === 'string'
    );
    
    if (!hasValidLabels) {
      console.error('generateIncubationChartOptions: 유효하지 않은 라벨 형식');
      return { title: { text: "데이터 라벨 오류" } };
    }

    return {
      textStyle: {
        fontFamily: 'Noto Sans KR, sans-serif'
      },
      title: {
        text: "잠복기별 환자 수",
        left: "center",
        textStyle: { 
          fontSize: (incubationChartFontSize.value || 15) + 4, 
          fontWeight: 'bold' 
        },
        top: 15
      },
      tooltip: { 
        trigger: "axis", 
        axisPointer: { type: 'shadow' },
        formatter: (params) => {
          if (!params || params.length === 0) return "";
          const param = params[0];
          return `<strong>${param.name}</strong><br/>${param.seriesName}: <strong>${param.value}</strong> 명`;
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '5%',
        top: 80, // 제목과 그래프 사이 간격 확보
        containLabel: true
      },
      xAxis: {
        type: "category",
        data: validData.map((item) => {
          try {
            return formatIncubationLabel(item.intervalLabel || '시간 오류');
          } catch (error) {
            console.warn('xAxis 라벨 처리 오류:', error, item);
            return '시간 오류';
          }
        }),
        axisLabel: { 
          rotate: 0, // 라벨을 수평으로 표시
          interval: 0, // 모든 라벨 표시
          fontSize: incubationChartFontSize.value || 15,
          color: '#333',
          margin: 10
        },
        axisLine: { show: true, onZero: false },
        axisTick: { show: false },
        splitLine: { show: false }
      },
      yAxis: { 
        type: "value", 
        name: "환자 수 (명)",
        nameTextStyle: { 
          padding: [0, 0, 0, 60], 
          fontSize: incubationChartFontSize.value || 15 
        },
        axisLabel: { 
          fontSize: incubationChartFontSize.value || 15 
        },
        splitLine: { 
          show: true, 
          lineStyle: { type: 'dashed' } 
        }
      },
      series: [
        {
          name: "환자 수",
          type: "bar",
          data: validData.map((item) => Number(item.count) || 0),
          barWidth: '100%', // 유행곡선과 동일한 막대 너비
          itemStyle: {
            color: (() => {
              const colors = generateGradientColors(incubationBarColor.value || "#1E88E5");
              return new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: colors.lightColor }, 
                { offset: 1, color: colors.darkColor }
              ]);
            })()
          },
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
            show: true, 
            position: "top", 
            fontSize: Math.max(10, (incubationChartFontSize.value || 15) - 1)
          }
        },
      ],
    };
  } catch (error) {
    console.error('generateIncubationChartOptions 오류:', error);
    return { title: { text: "차트 생성 오류" } };
  }
};

// --- Chart Update Logic (성능 최적화) ---

/**
 * 차트 인스턴스들을 업데이트
 * 유행곡선과 잠복기 차트를 모두 업데이트합니다.
 * @returns {void}
 */
const updateCharts = () => {
  try {
    // 상태 검증: 차트 업데이트 가능 여부 확인
    if (!canUpdateCharts()) {
      console.warn('차트 업데이트 건너뜀: 데이터가 준비되지 않음');
      return;
    }
    
    const states = chartStates.value;
    console.log('차트 업데이트 시작:', states);
    
    // 유행곡선 차트 업데이트
    if (epiCurveChartContainer.value && states.isEpiCurveReady) {
      if (!epiCurveChartInstance.value) {
        epiCurveChartInstance.value = markRaw(
          echarts.init(epiCurveChartContainer.value)
        );
        console.log('유행곡선 차트 인스턴스 생성됨');
      }
      
      const epiOptions = generateEpiCurveChartOptions();
      if (epiOptions && typeof epiOptions === 'object') {
        epiCurveChartInstance.value.setOption(epiOptions, false); // 성능 향상: 병합 방식
        console.log('유행곡선 차트 업데이트 완료');
      }
    }
    
    // 잠복기 차트 업데이트
    if (incubationChartContainer.value && states.isIncubationReady) {
      if (!incubationChartInstance.value) {
        incubationChartInstance.value = markRaw(
          echarts.init(incubationChartContainer.value)
        );
        console.log('잠복기 차트 인스턴스 생성됨');
      }
      
      const incubationOptions = generateIncubationChartOptions();
      if (incubationOptions && typeof incubationOptions === 'object') {
        incubationChartInstance.value.setOption(incubationOptions, false); // 성능 향상: 병합 방식
        console.log('잠복기 차트 업데이트 완료');
      }
    }
    
    console.log('전체 차트 업데이트 완료');
  } catch (error) {
    console.error("차트 업데이트 중 오류 발생:", error);
    // 에러 발생 시 사용자에게 알림 (선택적)
    // alert(`차트 업데이트 오류: ${error.message}`);
  }
};

// --- Lifecycle Hooks ---
onMounted(() => {
  console.log("유행곡선 컴포넌트 마운트됨");
  nextTick(updateCharts);
});
onUnmounted(() => {
  // 차트 인스턴스 정리
  if (epiCurveChartInstance.value && typeof epiCurveChartInstance.value.dispose === 'function') {
    try {
      epiCurveChartInstance.value.dispose();
      epiCurveChartInstance.value = null;
      console.log("유행곡선 차트 인스턴스 정리 완료");
    } catch (error) {
      console.error("유행곡선 차트 정리 오류:", error);
    }
  }
  
  if (incubationChartInstance.value && typeof incubationChartInstance.value.dispose === 'function') {
    try {
      incubationChartInstance.value.dispose();
      incubationChartInstance.value = null;
      console.log("잠복기 차트 인스턴스 정리 완료");
    } catch (error) {
      console.error("잠복기 차트 정리 오류:", error);
    }
  }
  
  // debounced 함수 취소
  if (debouncedUpdateCharts && typeof debouncedUpdateCharts.cancel === 'function') {
    debouncedUpdateCharts.cancel();
  }
  
  // 참조 정리
  epiCurveChartContainer.value = null;
  incubationChartContainer.value = null;
  
  console.log("EpidemicCurve 컴포넌트 cleanup 완료");
});

// 성능 최적화: debounced 차트 업데이트
const debouncedUpdateCharts = debounce(() => {
  console.log("Debounced chart update triggered");
  updateCharts();
}, 200);

// --- Watcher (성능 최적화) ---
// 유행곡선 차트 너비 변경 시 차트 재생성
watch(
  epiChartWidth,
  (newWidth, oldWidth) => {
    if (newWidth !== oldWidth && epiCurveChartInstance.value) {
      console.log(`Epi chart width changed: ${oldWidth} -> ${newWidth}. Recreating epi chart.`);
      
      // 유행곡선 차트 인스턴스 dispose하고 재생성
      if (epiCurveChartInstance.value && typeof epiCurveChartInstance.value.dispose === "function") {
        try {
          epiCurveChartInstance.value.dispose();
          epiCurveChartInstance.value = null;
        } catch (e) {
          console.error("Error disposing epi curve chart:", e);
        }
      }
      
      // DOM 업데이트 후 차트 재생성
      nextTick(() => {
        if (epiCurveChartContainer.value) {
          try {
            epiCurveChartInstance.value = markRaw(echarts.init(epiCurveChartContainer.value));
            updateCharts();
          } catch (error) {
            console.error("EpiCurve chart recreation failed:", error);
          }
        }
      });
    }
  },
  { flush: 'post' } // DOM 업데이트 후 실행
);

// 잠복기 차트 너비 변경 시 차트 재생성
watch(
  incubationChartWidth,
  (newWidth, oldWidth) => {
    if (newWidth !== oldWidth && incubationChartInstance.value) {
      console.log(`Incubation chart width changed: ${oldWidth} -> ${newWidth}. Recreating incubation chart.`);
      
      // 잠복기 차트 인스턴스 dispose하고 재생성
      if (incubationChartInstance.value && typeof incubationChartInstance.value.dispose === "function") {
        try {
          incubationChartInstance.value.dispose();
          incubationChartInstance.value = null;
        } catch (e) {
          console.error("Error disposing incubation chart:", e);
        }
      }
      
      // DOM 업데이트 후 차트 재생성
      nextTick(() => {
        if (incubationChartContainer.value) {
          try {
            incubationChartInstance.value = markRaw(echarts.init(incubationChartContainer.value));
            updateCharts();
          } catch (error) {
            console.error("Incubation chart recreation failed:", error);
          }
        }
      });
    }
  },
  { flush: 'post' } // DOM 업데이트 후 실행
);

// 유행곡선 차트 시간 간격 변경 시 자동 너비 조정
watch(
  selectedSymptomInterval,
  (newInterval) => {
    if (newInterval === 3) {
      epiChartWidth.value = 1100;
      epiChartWidthButtonText.value = `${epiChartWidth.value}px`;
      console.log("유행곡선 차트: 3시간 간격 설정으로 너비를 1100px로 자동 조정");
    }
  },
  { immediate: false }
);

// 잠복기 차트 시간 간격 변경 시 자동 너비 조정
watch(
  selectedIncubationInterval,
  (newInterval) => {
    if (newInterval === 3) {
      incubationChartWidth.value = 1100;
      incubationChartWidthButtonText.value = `${incubationChartWidth.value}px`;
      console.log("잠복기 차트: 3시간 간격 설정으로 너비를 1100px로 자동 조정");
    }
  },
  { immediate: false }
);

// 다른 속성 변경 시 차트 업데이트
watch(
  [
    selectedSymptomInterval,
    exposureDateTime,
    selectedIncubationInterval,
    rows,
    epiBarColor,
    epiChartFontSize,
    incubationBarColor,
    incubationChartFontSize
  ],
  ([newSymptomInterval, newExposureDateTime, newIncubationInterval, newRows, newEpiBarColor, newEpiFontSize, newIncubationBarColor, newIncubationFontSize],
   [oldSymptomInterval, oldExposureDateTime, oldIncubationInterval, oldRows, oldEpiBarColor, oldEpiFontSize, oldIncubationBarColor, oldIncubationFontSize]) => {
    
    // 실제 변경사항 확인 (불필요한 업데이트 방지)
    const hasSymptomChange = newSymptomInterval !== oldSymptomInterval;
    const hasExposureChange = newExposureDateTime !== oldExposureDateTime;
    const hasIncubationChange = newIncubationInterval !== oldIncubationInterval;
    const hasDataChange = newRows !== oldRows;
    const hasEpiStyleChange = newEpiBarColor !== oldEpiBarColor || newEpiFontSize !== oldEpiFontSize;
    const hasIncubationStyleChange = newIncubationBarColor !== oldIncubationBarColor || newIncubationFontSize !== oldIncubationFontSize;
    
    if (!hasSymptomChange && !hasExposureChange && !hasIncubationChange && !hasDataChange && !hasEpiStyleChange && !hasIncubationStyleChange) {
      return; // 변경사항 없으면 조기 종료
    }
    
    console.log("Chart update triggered with changes:", {
      hasSymptomChange, hasExposureChange, hasIncubationChange, hasDataChange, hasEpiStyleChange, hasIncubationStyleChange
    });
    
    nextTick(() => {
      debouncedUpdateCharts();
    });
  },
  { 
    deep: false, 
    immediate: false,
    flush: 'post' // DOM 업데이트 후 실행
  }
);

// 잠복기 차트 내보내기 함수 추가
const exportIncubationChart = async () => {
  const instance = incubationChartInstance.value;
  if (!instance || typeof instance.getDataURL !== "function") {
    alert("차트 내보내기 불가");
    return;
  }
  const filename = `잠복기_유행곡선_${selectedIncubationInterval.value}시간_${new Date().toISOString().split('T')[0]}.png`;
  try {
    const dataUrl = instance.getDataURL({
      type: "png",
      pixelRatio: 3,
      backgroundColor: "#fff",
    });
    if (!dataUrl || !dataUrl.startsWith("data:image/png"))
      throw new Error("유효하지 않은 이미지 데이터 URL");
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error("차트 내보내기 오류:", error);
    alert(`차트 내보내기 오류: ${error.message}`);
  }
};
</script>

<style scoped>
/* ... (기본 스타일 및 컨트롤 영역 등 변경 없음) ... */

/* --- 기본 앱 및 대시보드 스타일 --- */
.app {
  background-color: #f0f0f0;
  min-height: 100vh;
}
.dashboard {
  display: flex;
  flex-direction: column;
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
}

/* --- 입력 컨트롤 영역 스타일 (PatientCharacteristics UI container 스타일 적용) --- */
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

/* --- 컨트롤 그룹 스타일 --- */
.control-group {
  display: flex;
  align-items: center;
  gap: 6px;
  position: relative; /* z-index 컨텍스트 제공 */
}

.control-label {
  font-size: 13px;
  color: #333;
  white-space: nowrap;
  font-weight: 500;
}

.control-select {
  padding: 5px 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 14px;
  min-width: 80px;
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

.control-input-datetime {
  padding: 4px 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 13px;
  min-width: 150px;
  height: 28px;
  box-sizing: border-box;
  font-family: "Noto Sans KR", sans-serif;
}

/* --- 요약 정보 아이템 스타일 (텍스트 기반) --- */
.info-item {
  display: flex;
  gap: 8px;
  font-size: 13px;
  align-items: center;
}
.info-label {
  font-weight: 500;
  text-align: left;
  white-space: nowrap;
  flex-shrink: 0;
  padding-left: 10px;
}
.info-value {
  color: #333;
  font-weight: bold;
}

/* --- 테이블/차트 출력 영역 스타일 --- */
.output-area {
  display: flex;
  flex-direction: column;
  gap: 30px;
  margin: 20px 30px 30px 30px;
}

/* --- 각 테이블-차트 쌍을 담는 Row 스타일 --- */
.output-row {
  display: flex;
  gap: 30px;
  align-items: stretch;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  height: 700px;
}
.analysis-table-container,
.controls-and-chart-wrapper {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

/* --- 테이블 컨테이너 스타일 --- */
.table-container {
  margin: 0;
  display: flex;
  flex-direction: column;
  background-color: #fff;
  box-sizing: border-box;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  border-radius: 12px;
  overflow-x: auto;
  flex: 0 0 350px;
  min-width: 350px;
  max-width: 350px;
  height: 700px; /* 고정 높이로 변경 */
}

/* --- 테이블 내 요약 정보 스타일 (공통, 텍스트 기반) --- */
.summary-info-embedded,
.incubation-summary-info-embedded {
  margin: 0 20px 20px 20px; /* 상단 마진 제거, 좌우/하단 여백 */
  border-top: none;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

/* --- 테이블 제목 스타일 (공통) --- */
.table-title {
  font-size: 1.1em;
  color: #333;
  font-weight: 500;
  text-align: left;
  display: flex;
  align-items: center;
  flex-shrink: 0;
  margin: 20px 20px 10px 20px; /* 기본 마진 */
}
/* 테이블 컨테이너 내 첫번째 제목 마진 유지 */
.table-container > .table-title:first-of-type {
   margin: 20px 20px 10px 20px;
}
/* 하단 요약 정보 제목 마진 */
.symptom-summary-title,
.incubation-summary-title {
    /* 테이블과의 상단 간격 줄임 */
    margin: 10px 20px 10px 20px;
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

/* --- 빈도 테이블 스타일 --- */
.frequency-table {
  width: auto;
  font-size: 14px;
  border-collapse: collapse;
  /* 테이블과 아래 요약 제목 사이 간격 조절 위해 하단 마진 유지 */
  margin: 0px 20px 0px 20px;
}
.frequency-table thead th {
  background-color: #f2f2f2;
  font-weight: 500;
  position: sticky;
  top: 0;
  z-index: 1;
}
.frequency-table th,
.frequency-table td {
  border: 1px solid #ddd;
  padding: 8px 12px;
  text-align: center;
  white-space: nowrap;
}
.frequency-table tbody td:first-child {
  text-align: left;
}

.no-data-message {
  padding: 20px;
  text-align: center;
  color: #888;
  margin: 20px;
  flex-grow: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* --- 컨트롤 + 차트 래퍼 공통 스타일 --- */
.controls-and-chart-wrapper {
  flex: 1 1 0;
  min-width: 0;
  overflow: visible; /* hidden에서 visible로 변경하여 툴팁이 잘리지 않도록 함 */
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

/* --- 차트 컨테이너 스타일 --- */
.chart-container-wrapper {
  flex: 1 1 0;
  min-width: 0;
  overflow: hidden;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  background-color: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  padding: 12px 20px 20px 20px; /* 상단만 8px로 줄임 */
  position: relative;
  width: 100%;
  margin: 0;
  flex: 1;
}

/* --- 차트 버튼 스타일 --- */
.chart-buttons {
  align-self: flex-end;
  display: flex;
  gap: 8px;
  z-index: 10;
  margin-bottom: 10px;
  margin-top: 5px;
}

/* --- 차트 인스턴스 스타일 --- */
.chart-instance {
  height: 550px;
  min-height: 550px;
  max-height: 550px;
  margin: auto;
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

/* --- 반응형 스타일 --- */
@media (max-width: 1100px) {
  .controls-area {
    flex-direction: column;
    align-items: stretch;
  }
  
  .control-group {
    justify-content: space-between;
  }
  
  .chart-container-wrapper {
    padding: 15px;
  }

  .button-text {
    display: none;
  }

  .export-chart-button,
  .copy-chart-button {
    padding: 6px;
  }
}



/* --- 복사 툴크 스타일 --- */
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

.control-button-wrapper {
  position: relative;
  display: inline-block;
  /* z-index: 20; 제거 */
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
  z-index: 1050; /* z-index 값 증가 */
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

.control-button.active {
  background-color: #1a73e8;
  color: white;
  border-color: #1a73e8;
  font-weight: 500;
}

.button-group-toggle {
  display: flex;
  border: 1px solid #ccc;
  border-radius: 5px;
  overflow: hidden;
}

.button-group-toggle .control-button {
  border: none;
  border-radius: 0;
  box-shadow: none;
  border-left: 1px solid #ccc;
}

.button-group-toggle .control-button:first-child {
  border-left: none;
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
</style>