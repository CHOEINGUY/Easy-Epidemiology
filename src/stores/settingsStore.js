import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useSettingsStore = defineStore('settings', () => {
  // --- State ---
  const selectedSymptomInterval = ref(6);
  
  const exposureDateTime = ref((() => {
    try {
      return localStorage.getItem('exposureDateTime') || '';
    } catch (error) {
      console.warn('Failed to load exposureDateTime from localStorage:', error);
      return '';
    }
  })());

  const selectedIncubationInterval = ref(6);
  
  const isIndividualExposureColumnVisible = ref(false);
  const isConfirmedCaseColumnVisible = ref(false);

  const analysisOptions = ref({
    statMethod: 'chi-square',
    haldaneCorrection: false
  });

  const yatesCorrectionSettings = ref((() => {
    try {
      const saved = localStorage.getItem('yatesCorrectionSettings');
      if (saved) return JSON.parse(saved);
    } catch (error) {
      console.warn('Failed to load yatesCorrectionSettings from localStorage:', error);
    }
    return { caseControl: false, cohort: false };
  })());

  const selectedSuspectedFoods = ref((() => {
    try {
      return localStorage.getItem('selectedSuspectedFoods') || '';
    } catch {
      return '';
    }
  })());

  const epidemicCurveSettings = ref((() => {
    try {
      const saved = localStorage.getItem('epidemicCurveSettings');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          timeInterval: 6, chartWidth: 800, chartHeight: 400, fontSize: 14,
          barColor: '#5470c6', showGrid: true, showLegend: true, backgroundColor: '#ffffff',
          displayMode: 'time', reportChartDataUrl: null, reportIncubationChartDataUrl: null,
          incubationFontSize: 15, incubationChartWidth: 1100, incubationBarColor: '#91cc75',
          incubationDisplayMode: 'hour',
          ...parsed
        };
      }
    } catch (error) {
      console.warn('Failed to load epidemicCurveSettings from localStorage:', error);
    }
    return {
      timeInterval: 6, chartWidth: 800, chartHeight: 400, fontSize: 14,
      barColor: '#5470c6', showGrid: true, showLegend: true, backgroundColor: '#ffffff',
      displayMode: 'time', reportChartDataUrl: null, reportIncubationChartDataUrl: null,
      incubationFontSize: 15, incubationChartWidth: 1100, incubationBarColor: '#91cc75',
      incubationDisplayMode: 'hour'
    };
  })());

  const suspectedSource = ref('');

  const analysisResults = ref((() => {
    try {
      const saved = localStorage.getItem('analysisResults');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          caseControl: parsed.caseControl || [],
          cohort: parsed.cohort || []
        };
      }
    } catch (error) {
      console.warn('Failed to load analysisResults from localStorage:', error);
    }
    return { caseControl: [], cohort: [] };
  })());

  // --- Getters ---
  const getSelectedSymptomInterval = computed(() => selectedSymptomInterval.value);
  const getExposureDateTime = computed(() => exposureDateTime.value);
  const getExposureDate = computed(() => exposureDateTime.value || null);
  const getSelectedIncubationInterval = computed(() => selectedIncubationInterval.value);
  const getAnalysisOptions = computed(() => analysisOptions.value);
  const getEpidemicCurveSettings = computed(() => epidemicCurveSettings.value);
  const getAnalysisResults = computed(() => analysisResults.value);
  const getSelectedSuspectedFoods = computed(() => selectedSuspectedFoods.value);
  const getYatesCorrectionSettings = computed(() => yatesCorrectionSettings.value);
  const getSuspectedSource = computed(() => suspectedSource.value || null);

  // --- Actions ---
  function updateSymptomInterval(value) {
    selectedSymptomInterval.value = Number(value);
  }

  function updateExposureDateTime(value) {
    exposureDateTime.value = value;
    try {
      localStorage.setItem('exposureDateTime', value);
    } catch (error) {
      console.warn('Failed to save exposureDateTime to localStorage:', error);
    }
  }

  function updateIncubationInterval(value) {
    selectedIncubationInterval.value = value;
  }

  function setSuspectedSource(value) {
    suspectedSource.value = value;
  }

  function setIndividualExposureColumnVisibility(isVisible) {
    isIndividualExposureColumnVisible.value = !!isVisible;
  }

  function setConfirmedCaseColumnVisibility(isVisible) {
    isConfirmedCaseColumnVisible.value = !!isVisible;
  }

  function toggleIndividualExposureColumn() {
    isIndividualExposureColumnVisible.value = !isIndividualExposureColumnVisible.value;
  }

  function toggleConfirmedCaseColumn() {
    isConfirmedCaseColumnVisible.value = !isConfirmedCaseColumnVisible.value;
  }

  function setAnalysisOptions({ statMethod, haldaneCorrection }) {
    analysisOptions.value.statMethod = statMethod || 'chi-square';
    analysisOptions.value.haldaneCorrection = !!haldaneCorrection;
  }

  function updateEpidemicCurveSettings(settings) {
    epidemicCurveSettings.value = { ...epidemicCurveSettings.value, ...settings };
    try {
      localStorage.setItem('epidemicCurveSettings', JSON.stringify(epidemicCurveSettings.value));
    } catch (error) {
      console.warn('Failed to save epidemicCurveSettings to localStorage:', error);
    }
  }

  function setAnalysisResults({ type, results }) {
    if (type === 'caseControl' || type === 'cohort') {
      analysisResults.value[type] = results;
      try {
        localStorage.setItem('analysisResults', JSON.stringify(analysisResults.value));
      } catch (error) {
        console.warn('Failed to save analysisResults to localStorage:', error);
      }
    }
  }

  function setSelectedSuspectedFoods(foodsStr) {
    selectedSuspectedFoods.value = foodsStr;
    try {
      localStorage.setItem('selectedSuspectedFoods', foodsStr);
    } catch (error) {
      console.warn('Failed to save selectedSuspectedFoods to localStorage:', error);
    }
  }

  function setYatesCorrectionSettings({ type, enabled }) {
    yatesCorrectionSettings.value[type] = enabled;
    try {
      localStorage.setItem('yatesCorrectionSettings', JSON.stringify(yatesCorrectionSettings.value));
    } catch (error) {
      console.warn('Failed to save yatesCorrectionSettings to localStorage:', error);
    }
  }

  return {
    // State
    selectedSymptomInterval,
    exposureDateTime,
    selectedIncubationInterval,
    isIndividualExposureColumnVisible,
    isConfirmedCaseColumnVisible,
    analysisOptions,
    yatesCorrectionSettings,
    selectedSuspectedFoods,
    epidemicCurveSettings,
    suspectedSource,
    analysisResults,

    // Getters
    getSelectedSymptomInterval,
    getExposureDateTime,
    getExposureDate,
    getSelectedIncubationInterval,
    getAnalysisOptions,
    getEpidemicCurveSettings,
    getAnalysisResults,
    getSelectedSuspectedFoods,
    getYatesCorrectionSettings,
    getSuspectedSource,

    // Actions
    updateSymptomInterval,
    updateExposureDateTime,
    updateIncubationInterval,
    setSuspectedSource,
    setIndividualExposureColumnVisibility,
    setConfirmedCaseColumnVisibility,
    toggleIndividualExposureColumn,
    toggleConfirmedCaseColumn,
    setAnalysisOptions,
    updateEpidemicCurveSettings,
    setAnalysisResults,
    setSelectedSuspectedFoods,
    setYatesCorrectionSettings
  };
});
