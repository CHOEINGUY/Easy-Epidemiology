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

  // 유행곡선 상태
  const epiChartFontSize = ref(chartSettings.value.fontSize || 18);
  const epiChartWidth = ref(chartSettings.value.chartWidth || 1100);
  const epiBarColor = ref(chartSettings.value.barColor || '#1E88E5');
  const chartDisplayMode = ref(chartSettings.value.displayMode || 'time');

  // 잠복기 차트 상태
  const incubationChartFontSize = ref(chartSettings.value.incubationFontSize || 18);
  const incubationChartWidth = ref(chartSettings.value.incubationChartWidth || 800);
  const incubationBarColor = ref(chartSettings.value.incubationBarColor || '#91cc75');
  const incubationChartDisplayMode = ref(chartSettings.value.incubationDisplayMode || 'hour');

  // 유행곡선 설정 함수
  const setEpiFontSize = (val) => {
    epiChartFontSize.value = val;
    settingsStore.updateEpidemicCurveSettings({ fontSize: val });
  };

  const setEpiChartWidth = (val) => {
    epiChartWidth.value = val;
    settingsStore.updateEpidemicCurveSettings({ chartWidth: val });
  };

  const setEpiBarColor = (val) => {
    epiBarColor.value = val;
    settingsStore.updateEpidemicCurveSettings({ barColor: val });
  };

  const setChartDisplayMode = (val) => {
    chartDisplayMode.value = val;
    settingsStore.updateEpidemicCurveSettings({ displayMode: val });
  };

  // 잠복기 설정 함수
  const setIncubationFontSize = (val) => {
    incubationChartFontSize.value = val;
    settingsStore.updateEpidemicCurveSettings({ incubationFontSize: val });
  };

  const setIncubationChartWidth = (val) => {
    incubationChartWidth.value = val;
    settingsStore.updateEpidemicCurveSettings({ incubationChartWidth: val });
  };

  const setIncubationBarColor = (val) => {
    incubationBarColor.value = val;
    settingsStore.updateEpidemicCurveSettings({ incubationBarColor: val });
  };

  const setIncubationDisplayMode = (val) => {
    incubationChartDisplayMode.value = val;
    settingsStore.updateEpidemicCurveSettings({ incubationDisplayMode: val });
  };

  // 초기화 함수
  const resetEpiChartSettings = () => {
    setEpiFontSize(18);
    setEpiChartWidth(1100);
    setEpiBarColor('#1E88E5');
    setChartDisplayMode('time');
  };

  const resetIncubationChartSettings = () => {
    setIncubationFontSize(18);
    setIncubationChartWidth(800);
    setIncubationBarColor('#91cc75');
    setIncubationDisplayMode('hour');
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
    
    // 잠복기 상태
    incubationChartFontSize,
    incubationChartWidth,
    incubationBarColor,
    incubationChartDisplayMode,
    
    // 유행곡선 함수
    setEpiFontSize,
    setEpiChartWidth,
    setEpiBarColor,
    setChartDisplayMode,
    resetEpiChartSettings,
    
    // 잠복기 함수
    setIncubationFontSize,
    setIncubationChartWidth,
    setIncubationBarColor,
    setIncubationDisplayMode,
    resetIncubationChartSettings
  };
}
