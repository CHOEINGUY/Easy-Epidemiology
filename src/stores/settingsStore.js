import { defineStore } from 'pinia';

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    // --- Epidemic Curve Tab State ---
    selectedSymptomInterval: 6, // Default: 6 hours
    exposureDateTime: (() => {
      try {
        const saved = localStorage.getItem('exposureDateTime');
        return saved || '';
      } catch (error) {
        console.warn('Failed to load exposureDateTime from localStorage:', error);
        return '';
      }
    })(),
    selectedIncubationInterval: 6, // Default: 6 hours
    
    // --- Column Visibility Settings ---
    isIndividualExposureColumnVisible: false,
    isConfirmedCaseColumnVisible: false,

    // --- Analysis Options (Report) ---
    analysisOptions: {
      statMethod: 'chi-square', // 'chi-square' | 'chi-fisher' | 'yates' | 'yates-fisher'
      haldaneCorrection: false
    },

    // --- Yates Correction Settings (Case Control / Cohort) ---
    yatesCorrectionSettings: (() => {
      try {
        const saved = localStorage.getItem('yatesCorrectionSettings');
        if (saved) {
          return JSON.parse(saved);
        }
      } catch (error) {
        console.warn('Failed to load yatesCorrectionSettings from localStorage:', error);
      }
      return {
        caseControl: false,
        cohort: false
      };
    })(),

    // --- Selected Suspected Foods (Epidemic Curve Tab) ---
    selectedSuspectedFoods: (() => {
      try {
        return localStorage.getItem('selectedSuspectedFoods') || '';
      } catch {
        return '';
      }
    })(),
    
    // --- Epidemic Curve Chart Settings (Report) ---
    epidemicCurveSettings: (() => {
      try {
        const saved = localStorage.getItem('epidemicCurveSettings');
        if (saved) {
          const parsed = JSON.parse(saved);
          return {
            timeInterval: 6,
            chartWidth: 800,
            chartHeight: 400,
            fontSize: 14,
            barColor: '#5470c6',
            showGrid: true,
            showLegend: true,
            backgroundColor: '#ffffff',
            displayMode: 'time',
            reportChartDataUrl: null,
            reportIncubationChartDataUrl: null,
            incubationFontSize: 15,
            incubationChartWidth: 1100,
            incubationBarColor: '#91cc75',
            incubationDisplayMode: 'hour',
            ...parsed
          };
        }
      } catch (error) {
        console.warn('Failed to load epidemicCurveSettings from localStorage:', error);
      }
      
      return {
        timeInterval: 6,
        chartWidth: 800,
        chartHeight: 400,
        fontSize: 14,
        barColor: '#5470c6',
        showGrid: true,
        showLegend: true,
        backgroundColor: '#ffffff',
        displayMode: 'time',
        reportChartDataUrl: null,
        reportIncubationChartDataUrl: null,
        incubationFontSize: 15,
        incubationChartWidth: 1100,
        incubationBarColor: '#91cc75',
        incubationDisplayMode: 'hour'
      };
    })(),

    // --- Derived Statistics for Report ---
    suspectedSource: '',
    
    // --- Analysis Results (for Suspected Food Dropdown) ---
    analysisResults: (() => {
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
      return {
        caseControl: [],
        cohort: []
      };
    })()
  }),

  getters: {
    getSelectedSymptomInterval: (state) => state.selectedSymptomInterval,
    getExposureDateTime: (state) => state.exposureDateTime,
    getExposureDate: (state) => state.exposureDateTime || null, // Alias for component compatibility
    getSelectedIncubationInterval: (state) => state.selectedIncubationInterval,
    getAnalysisOptions: (state) => state.analysisOptions,
    getEpidemicCurveSettings: (state) => state.epidemicCurveSettings,
    getAnalysisResults: (state) => state.analysisResults,
    getSelectedSuspectedFoods: (state) => state.selectedSuspectedFoods,
    getYatesCorrectionSettings: (state) => state.yatesCorrectionSettings,
    getSuspectedSource: (state) => state.suspectedSource || null
  },

  actions: {
    // --- Actions (replacing Mutations + Actions) ---
    // Note: Pinia actions can directly modify state

    updateSymptomInterval(value) {
      this.selectedSymptomInterval = Number(value);
    },

    updateExposureDateTime(value) {
      this.exposureDateTime = value;
      try {
        localStorage.setItem('exposureDateTime', value);
      } catch (error) {
        console.warn('Failed to save exposureDateTime to localStorage:', error);
      }
    },

    updateIncubationInterval(value) {
      this.selectedIncubationInterval = value;
    },

    setSuspectedSource(value) {
      this.suspectedSource = value;
    },

    setIndividualExposureColumnVisibility(isVisible) {
      this.isIndividualExposureColumnVisible = !!isVisible;
    },

    setConfirmedCaseColumnVisibility(isVisible) {
      this.isConfirmedCaseColumnVisible = !!isVisible;
    },

    toggleIndividualExposureColumn() {
      this.isIndividualExposureColumnVisible = !this.isIndividualExposureColumnVisible;
    },

    toggleConfirmedCaseColumn() {
      this.isConfirmedCaseColumnVisible = !this.isConfirmedCaseColumnVisible;
    },

    setAnalysisOptions({ statMethod, haldaneCorrection }) {
      this.analysisOptions.statMethod = statMethod || 'chi-square';
      this.analysisOptions.haldaneCorrection = !!haldaneCorrection;
    },

    updateEpidemicCurveSettings(settings) {
      this.epidemicCurveSettings = { ...this.epidemicCurveSettings, ...settings };
      try {
        localStorage.setItem('epidemicCurveSettings', JSON.stringify(this.epidemicCurveSettings));
      } catch (error) {
        console.warn('Failed to save epidemicCurveSettings to localStorage:', error);
      }
    },

    setAnalysisResults({ type, results }) {
      if (type === 'caseControl' || type === 'cohort') {
        this.analysisResults[type] = results;
        try {
          localStorage.setItem('analysisResults', JSON.stringify(this.analysisResults));
        } catch (error) {
          console.warn('Failed to save analysisResults to localStorage:', error);
        }
      }
    },

    setSelectedSuspectedFoods(foodsStr) {
      this.selectedSuspectedFoods = foodsStr;
      try {
        localStorage.setItem('selectedSuspectedFoods', foodsStr);
      } catch (error) {
        console.warn('Failed to save selectedSuspectedFoods to localStorage:', error);
      }
    },

    setYatesCorrectionSettings({ type, enabled }) {
      this.yatesCorrectionSettings[type] = enabled;
      try {
        localStorage.setItem('yatesCorrectionSettings', JSON.stringify(this.yatesCorrectionSettings));
      } catch (error) {
        console.warn('Failed to save yatesCorrectionSettings to localStorage:', error);
      }
    }
  }
});
