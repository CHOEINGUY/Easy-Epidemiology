// useChartSettings.js - 차트 설정 로직 분리
import { ref, computed } from 'vue';
import { useSettingsStore } from '../../../stores/settingsStore';

export function useChartSettings() {
  const settingsStore = useSettingsStore();

  // 상수 정의
  const fontSizes = [12, 15, 18, 21, 24];
  const fontSizeLabels = ['매우 작게', '작게', '보통', '크게', '매우 크게'];
  const chartWidths = [700, 900, 1100];
  const barColors = [
    '#5470c6', '#1E88E5', '#29ABE2', '#91cc75', '#fac858',
    '#ee6666', '#73c0de', '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc'
  ];

  // Store에서 설정 불러오기
  const chartSettings = computed(() => settingsStore.epidemicCurveSettings);

  // 유행곡선 차트 상태
  const epiChartFontSize = ref(chartSettings.value.fontSize || 18);
  const epiChartWidth = ref(chartSettings.value.chartWidth || 1100);
  const epiBarColor = ref(chartSettings.value.barColor || '#1E88E5');
  const chartDisplayMode = ref(chartSettings.value.displayMode || 'time');
  const epiFontSizeButtonText = ref(fontSizeLabels[fontSizes.indexOf(epiChartFontSize.value)] || '보통');
  const epiChartWidthButtonText = ref(`${epiChartWidth.value}px`);

  // 잠복기 차트 상태
  const incubationChartFontSize = ref(chartSettings.value.incubationFontSize || 18);
  const incubationChartWidth = ref(chartSettings.value.incubationChartWidth || 800);
  const incubationBarColor = ref(chartSettings.value.incubationBarColor || '#91cc75');
  const incubationChartDisplayMode = ref(chartSettings.value.incubationDisplayMode || 'hour');
  const incubationFontSizeButtonText = ref(fontSizeLabels[fontSizes.indexOf(incubationChartFontSize.value)] || '보통');
  const incubationChartWidthButtonText = ref(`${incubationChartWidth.value}px`);

  // 유틸리티 함수
  const getNextValue = (currentValue, valueArray) => {
    if (!Array.isArray(valueArray) || valueArray.length === 0) {
      return currentValue;
    }
    const currentIndex = valueArray.indexOf(currentValue);
    if (currentIndex === -1) return valueArray[0];
    return valueArray[(currentIndex + 1) % valueArray.length];
  };

  // 유행곡선 사이클 함수
  const cycleEpiFontSize = (onUpdate) => {
    epiChartFontSize.value = getNextValue(epiChartFontSize.value, fontSizes);
    epiFontSizeButtonText.value = fontSizeLabels[fontSizes.indexOf(epiChartFontSize.value)];
    settingsStore.updateEpidemicCurveSettings({ fontSize: epiChartFontSize.value });
    if (onUpdate) onUpdate();
  };

  const cycleEpiChartWidth = () => {
    epiChartWidth.value = getNextValue(epiChartWidth.value, chartWidths);
    epiChartWidthButtonText.value = `${epiChartWidth.value}px`;
    settingsStore.updateEpidemicCurveSettings({ chartWidth: epiChartWidth.value });
  };

  const cycleEpiBarColor = (onUpdate) => {
    epiBarColor.value = getNextValue(epiBarColor.value, barColors);
    settingsStore.updateEpidemicCurveSettings({ barColor: epiBarColor.value });
    if (onUpdate) onUpdate();
  };

  const selectDisplayMode = (mode, onUpdate) => {
    chartDisplayMode.value = mode;
    settingsStore.updateEpidemicCurveSettings({ displayMode: mode });
    if (onUpdate) onUpdate();
  };

  // 잠복기 사이클 함수
  const cycleIncubationFontSize = (onUpdate) => {
    incubationChartFontSize.value = getNextValue(incubationChartFontSize.value, fontSizes);
    incubationFontSizeButtonText.value = fontSizeLabels[fontSizes.indexOf(incubationChartFontSize.value)];
    settingsStore.updateEpidemicCurveSettings({ incubationFontSize: incubationChartFontSize.value });
    if (onUpdate) onUpdate();
  };

  const cycleIncubationChartWidth = () => {
    incubationChartWidth.value = getNextValue(incubationChartWidth.value, chartWidths);
    incubationChartWidthButtonText.value = `${incubationChartWidth.value}px`;
    settingsStore.updateEpidemicCurveSettings({ incubationChartWidth: incubationChartWidth.value });
  };

  const cycleIncubationBarColor = (onUpdate) => {
    incubationBarColor.value = getNextValue(incubationBarColor.value, barColors);
    settingsStore.updateEpidemicCurveSettings({ incubationBarColor: incubationBarColor.value });
    if (onUpdate) onUpdate();
  };

  const selectIncubationDisplayMode = (mode, onUpdate) => {
    incubationChartDisplayMode.value = mode;
    settingsStore.updateEpidemicCurveSettings({ incubationDisplayMode: mode });
    if (onUpdate) onUpdate();
  };

  // 초기화 함수
  const resetEpiChartSettings = (onUpdate) => {
    epiChartFontSize.value = 18;
    epiChartWidth.value = 1100;
    epiBarColor.value = '#1E88E5';
    chartDisplayMode.value = 'time';
    epiFontSizeButtonText.value = '보통';
    epiChartWidthButtonText.value = '1100px';
    epiChartWidthButtonText.value = '1100px';
    settingsStore.updateEpidemicCurveSettings({
      fontSize: 18,
      chartWidth: 1100,
      barColor: '#1E88E5',
      displayMode: 'time'
    });
    if (onUpdate) onUpdate();
  };

  const resetIncubationChartSettings = (onUpdate) => {
    incubationChartFontSize.value = 18;
    incubationChartWidth.value = 800;
    incubationBarColor.value = '#91cc75';
    incubationChartDisplayMode.value = 'hour';
    incubationFontSizeButtonText.value = '보통';
    incubationChartWidthButtonText.value = '800px';
    incubationFontSizeButtonText.value = '보통';
    incubationChartWidthButtonText.value = '800px';
    settingsStore.updateEpidemicCurveSettings({
      incubationFontSize: 18,
      incubationChartWidth: 800,
      incubationBarColor: '#91cc75',
      incubationDisplayMode: 'hour'
    });
    if (onUpdate) onUpdate();
  };

  // 마우스 이벤트 핸들러
  const handleEpiFontSizeMouseEnter = (showTooltip) => {
    const currentIndex = fontSizes.indexOf(epiChartFontSize.value);
    const nextIndex = (currentIndex + 1) % fontSizes.length;
    epiFontSizeButtonText.value = fontSizeLabels[nextIndex];
    if (typeof showTooltip === 'function') {
      showTooltip('epiFontSize', `폰트 크기를 ${fontSizeLabels[nextIndex]}로 변경합니다`);
    }
  };

  const handleEpiFontSizeMouseLeave = (hideTooltip) => {
    epiFontSizeButtonText.value = fontSizeLabels[fontSizes.indexOf(epiChartFontSize.value)];
    if (typeof hideTooltip === 'function') {
      hideTooltip();
    }
  };

  const handleEpiChartWidthMouseEnter = (showTooltip) => {
    const currentIndex = chartWidths.indexOf(epiChartWidth.value);
    const nextIndex = (currentIndex + 1) % chartWidths.length;
    epiChartWidthButtonText.value = `${chartWidths[nextIndex]}px`;
    if (typeof showTooltip === 'function') {
      showTooltip('epiChartWidth', `차트 너비를 ${chartWidths[nextIndex]}px로 변경합니다`);
    }
  };

  const handleEpiChartWidthMouseLeave = (hideTooltip) => {
    epiChartWidthButtonText.value = `${epiChartWidth.value}px`;
    if (typeof hideTooltip === 'function') {
      hideTooltip();
    }
  };

  const handleIncubationFontSizeMouseEnter = (showTooltip) => {
    const currentIndex = fontSizes.indexOf(incubationChartFontSize.value);
    const nextIndex = (currentIndex + 1) % fontSizes.length;
    incubationFontSizeButtonText.value = fontSizeLabels[nextIndex];
    if (typeof showTooltip === 'function') {
      showTooltip('incubationFontSize', `폰트 크기를 ${fontSizeLabels[nextIndex]}로 변경합니다`);
    }
  };

  const handleIncubationFontSizeMouseLeave = (hideTooltip) => {
    incubationFontSizeButtonText.value = fontSizeLabels[fontSizes.indexOf(incubationChartFontSize.value)];
    if (typeof hideTooltip === 'function') {
      hideTooltip();
    }
  };

  const handleIncubationChartWidthMouseEnter = (showTooltip) => {
    const currentIndex = chartWidths.indexOf(incubationChartWidth.value);
    const nextIndex = (currentIndex + 1) % chartWidths.length;
    incubationChartWidthButtonText.value = `${chartWidths[nextIndex]}px`;
    if (typeof showTooltip === 'function') {
      showTooltip('incubationChartWidth', `차트 너비를 ${chartWidths[nextIndex]}px로 변경합니다`);
    }
  };

  const handleIncubationChartWidthMouseLeave = (hideTooltip) => {
    incubationChartWidthButtonText.value = `${incubationChartWidth.value}px`;
    if (typeof hideTooltip === 'function') {
      hideTooltip();
    }
  };

  return {
    // 상수
    fontSizes,
    fontSizeLabels,
    chartWidths,
    barColors,
    
    // 유행곡선 상태
    epiChartFontSize,
    epiChartWidth,
    epiBarColor,
    chartDisplayMode,
    epiFontSizeButtonText,
    epiChartWidthButtonText,
    
    // 잠복기 상태
    incubationChartFontSize,
    incubationChartWidth,
    incubationBarColor,
    incubationChartDisplayMode,
    incubationFontSizeButtonText,
    incubationChartWidthButtonText,
    
    // 유틸리티
    getNextValue,
    
    // 유행곡선 함수
    cycleEpiFontSize,
    cycleEpiChartWidth,
    cycleEpiBarColor,
    selectDisplayMode,
    resetEpiChartSettings,
    
    // 잠복기 함수
    cycleIncubationFontSize,
    cycleIncubationChartWidth,
    cycleIncubationBarColor,
    selectIncubationDisplayMode,
    resetIncubationChartSettings,
    
    // 마우스 이벤트 핸들러
    handleEpiFontSizeMouseEnter,
    handleEpiFontSizeMouseLeave,
    handleEpiChartWidthMouseEnter,
    handleEpiChartWidthMouseLeave,
    handleIncubationFontSizeMouseEnter,
    handleIncubationFontSizeMouseLeave,
    handleIncubationChartWidthMouseEnter,
    handleIncubationChartWidthMouseLeave
  };
}
