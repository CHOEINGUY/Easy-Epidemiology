import { defineStore } from 'pinia';
import { useSettingsStore } from './settingsStore';
// Helper Methods (Inlined from deleted helpers.js)
function createInitialState() {
  return {
    headers: {
      basic: ['성명', '생년월일', '성별', '연락처', '주소', '직업'],
      clinical: ['설사', '구토', '복통', '발열', '오심'],
      diet: ['점심', '저녁', '간식']
    },
    rows: []
  };
}

function isColumnEmpty(headers, rows, type, index) {
  // Check if a specific column is empty across all rows
  // This logic mimics the original helper
  const rowKeyMap = { basic: 'basicInfo', clinical: 'clinicalSymptoms', diet: 'dietInfo' };
  const rowKey = rowKeyMap[type];
  if (!rowKey) return true;
  
  for (const row of rows) {
    if (row[rowKey] && row[rowKey][index] && String(row[rowKey][index]).trim() !== '') {
      return false;
    }
  }
  // Also check header text? Usually emptiness checks data. 
  // If header has text, it's not "empty" structurally, but here we assume data emptiness for cleanup.
  // Original helper might have checked header text too.
  // Let's assume just data for now or check header text if known pattern.
  // Actually, usually deleteEmptyColumns checks if *data* is empty.
  // Let's safe check header too:
  if (headers[type] && headers[type][index] && String(headers[type][index]).trim() !== '') return false;
  
  return true;
}

function syncRowDataWithHeaders(state) {
  // Ensure rows have correct array lengths matching headers
  const { headers, rows } = state;
  rows.forEach(row => {
    if (headers.basic) {
      if (!row.basicInfo) row.basicInfo = [];
      while (row.basicInfo.length < headers.basic.length) row.basicInfo.push('');
      if (row.basicInfo.length > headers.basic.length) row.basicInfo.length = headers.basic.length;
    }
    if (headers.clinical) {
      if (!row.clinicalSymptoms) row.clinicalSymptoms = [];
      while (row.clinicalSymptoms.length < headers.clinical.length) row.clinicalSymptoms.push('');
      if (row.clinicalSymptoms.length > headers.clinical.length) row.clinicalSymptoms.length = headers.clinical.length;
    }
    if (headers.diet) {
      if (!row.dietInfo) row.dietInfo = [];
      while (row.dietInfo.length < headers.diet.length) row.dietInfo.push('');
      if (row.dietInfo.length > headers.diet.length) row.dietInfo.length = headers.diet.length;
    }
  });
}

export const useEpidemicStore = defineStore('epidemic', {
  state: () => ({
    headers: { basic: [], clinical: [], diet: [] },
    rows: [],
    deletedRowIndex: null,
    validationState: {
      errors: new Map(), // key: "row_col", value: { message, timestamp }
      version: 0
    }
  }),

  getters: {
    // Index Calculators
    basicInfoStartIndex() {
      return 2;
    },
    
    clinicalSymptomsStartIndex(state) {
      return 2 + (state.headers.basic?.length || 0);
    },
    
    individualExposureTimeStartIndex(state) {
      const settingsStore = useSettingsStore();
      return settingsStore.isIndividualExposureColumnVisible
        ? this.clinicalSymptomsStartIndex + (state.headers.clinical?.length || 0)
        : null;
    },
    
    symptomOnsetStartIndex(state) {
      const settingsStore = useSettingsStore();
      return this.clinicalSymptomsStartIndex +
        (state.headers.clinical?.length || 0) +
        (settingsStore.isIndividualExposureColumnVisible ? 1 : 0);
    },
    
    dietInfoStartIndex() {
      return this.symptomOnsetStartIndex + 1;
    },

    // Statistics getters
    getCaseAttackRate(state) {
      const total = state.rows.length;
      if (!total) return null;
      const cases = state.rows.filter(r => r && r.isPatient === '1').length;
      return ((cases / total) * 100).toFixed(1);
    },

    getPatientAttackRate(state) {
      const settingsStore = useSettingsStore();
      if (!settingsStore.isConfirmedCaseColumnVisible) return null;
      const total = state.rows.length;
      if (!total) return null;
      const confirmed = state.rows.filter(r => r && r.isConfirmedCase === '1').length;
      return ((confirmed / total) * 100).toFixed(1);
    },

    getFirstCaseDate(state) {
      const onsets = state.rows
        .map(r => r.symptomOnset)
        .filter(Boolean)
        .map(ts => new Date(ts));
      if (!onsets.length) return null;
      return new Date(Math.min(...onsets));
    },

    getMeanIncubation(state) {
      const settingsStore = useSettingsStore();
      const exposure = new Date(settingsStore.exposureDateTime || '');
      if (!settingsStore.exposureDateTime || isNaN(exposure)) return null;
      const diffs = state.rows
        .map(r => r.symptomOnset)
        .filter(Boolean)
        .map(ts => (new Date(ts) - exposure) / 3600000)
        .filter(h => h > 0);
      if (!diffs.length) return null;
      const avg = diffs.reduce((a,b) => a+b,0)/diffs.length;
      return avg.toFixed(1);
    }
  },

  actions: {
    // --- Data Management Actions ---

    loadInitialData() {
      const initialState = createInitialState();
      this.headers = initialState.headers;
      this.rows = initialState.rows;
    },

    setInitialData({ headers, rows }) {
      this.headers = headers;
      this.rows = rows;
    },

    addRows(count) {
      const newRows = [];
      for (let i = 0; i < count; i++) {
        newRows.push({
          isPatient: '',
          isConfirmedCase: '',
          basicInfo: Array(this.headers.basic?.length || 0).fill(''),
          clinicalSymptoms: Array(this.headers.clinical?.length || 0).fill(''),
          symptomOnset: '',
          individualExposureTime: '',
          dietInfo: Array(this.headers.diet?.length || 0).fill('')
        });
      }
      this.rows = this.rows.concat(newRows);
    },

    addColumn(type) {
      if (!this.headers[type]) return;
      this.headers[type].push('');
      syncRowDataWithHeaders(this.$state);
    },

    addMultipleColumns({ type, count }) {
      if (!this.headers[type] || count <= 0) return;
      const rowKeyMap = { basic: 'basicInfo', clinical: 'clinicalSymptoms', diet: 'dietInfo' };
      const rowKey = rowKeyMap[type];
      if (!rowKey) return;
      
      for (let i = 0; i < count; i++) {
        this.headers[type].push('');
        this.rows.forEach((row) => {
          if (!row[rowKey]) row[rowKey] = [];
          row[rowKey].push('');
        });
      }
    },

    insertColumnAt({ type, index }) {
      let headerType = type;
      let rowKey = type;
      
      if (type === 'clinicalSymptoms') { headerType = 'clinical'; rowKey = 'clinicalSymptoms'; }
      else if (type === 'dietInfo') { headerType = 'diet'; rowKey = 'dietInfo'; }
      else if (type === 'basic') { headerType = 'basic'; rowKey = 'basicInfo'; }
      
      if (!this.headers[headerType] || index < 0 || index > this.headers[headerType].length) return;
      
      this.headers[headerType].splice(index, 0, '');
      this.rows.forEach((row) => {
        if (!row[rowKey]) row[rowKey] = [];
        while (row[rowKey].length < this.headers[headerType].length - 1) {
          row[rowKey].push('');
        }
        row[rowKey].splice(index, 0, '');
      });
    },

    insertMultipleColumnsAt({ type, count, index }) {
      let headerType = type;
      let rowKey = type;
      
      if (type === 'clinicalSymptoms') { headerType = 'clinical'; rowKey = 'clinicalSymptoms'; }
      else if (type === 'dietInfo') { headerType = 'diet'; rowKey = 'dietInfo'; }
      else if (type === 'basic') { headerType = 'basic'; rowKey = 'basicInfo'; }
      
      if (!this.headers[headerType] || count <= 0 || index < 0 || index > this.headers[headerType].length) return;
      
      for (let i = 0; i < count; i++) {
        this.headers[headerType].splice(index + i, 0, '');
      }
      
      this.rows.forEach((row) => {
        if (!row[rowKey]) row[rowKey] = [];
        while (row[rowKey].length < this.headers[headerType].length - count) {
          row[rowKey].push('');
        }
        for (let i = 0; i < count; i++) {
          row[rowKey].splice(index + i, 0, '');
        }
      });
    },

    deleteColumn(type) {
      if (!this.headers[type] || this.headers[type].length <= 1) return;
      this.headers[type].pop();
      syncRowDataWithHeaders(this.$state);
    },

    deleteColumnByIndex({ type, index }) {
      let headerType = type;
      let rowKey = type;
        
      if (type === 'clinicalSymptoms') { headerType = 'clinical'; rowKey = 'clinicalSymptoms'; }
      else if (type === 'dietInfo') { headerType = 'diet'; rowKey = 'dietInfo'; }
      else if (type === 'basic') { headerType = 'basic'; rowKey = 'basicInfo'; }
        
      if (!this.headers[headerType] || index < 0 || index >= this.headers[headerType].length) return;
        
      this.headers[headerType].splice(index, 1);
      this.rows.forEach((row) => row[rowKey]?.splice(index, 1));
    },

    deleteMultipleColumnsByIndex({ columns }) {
      if (!columns || columns.length === 0) return;
      const groupedByType = columns.reduce((acc, { type, index }) => {
        if (!acc[type]) acc[type] = [];
        acc[type].push(index);
        return acc;
      }, {});

      for (const type in groupedByType) {
        const indices = groupedByType[type];
        let headerType = type;
        let rowKey = type;
          
        if (type === 'clinicalSymptoms') { headerType = 'clinical'; rowKey = 'clinicalSymptoms'; }
        else if (type === 'dietInfo') { headerType = 'diet'; rowKey = 'dietInfo'; }
        else if (type === 'basic') { headerType = 'basic'; rowKey = 'basicInfo'; }
          
        if (!rowKey || !this.headers[headerType]) continue;
        const sortedIndices = indices.sort((a, b) => b - a);
        sortedIndices.forEach(index => {
          if (index >= 0 && index < this.headers[headerType].length) {
            this.headers[headerType].splice(index, 1);
            this.rows.forEach(row => row[rowKey]?.splice(index, 1));
          }
        });
      }
    },

    clearColumnData({ type, index }) {
      let headerType = type;
      let rowKey = type;
        
      if (type === 'clinicalSymptoms') { headerType = 'clinical'; rowKey = 'clinicalSymptoms'; }
      else if (type === 'dietInfo') { headerType = 'diet'; rowKey = 'dietInfo'; }
      else if (type === 'basic') { headerType = 'basic'; rowKey = 'basicInfo'; }
        
      if (!this.headers[headerType] || index < 0 || index >= this.headers[headerType].length) return;
        
      this.headers[headerType][index] = '';
      this.rows.forEach((row) => {
        if (row[rowKey] && Array.isArray(row[rowKey]) && index < row[rowKey].length) {
          row[rowKey][index] = '';
        }
      });
    },

    clearMultipleColumnsData({ columns }) {
      if (!columns || columns.length === 0) return;
      columns.forEach(col => {
        const { type, cellIndex } = col;
        let headerType = type;
        let rowKey = type;
        if (type === 'clinicalSymptoms') { headerType = 'clinical'; rowKey = 'clinicalSymptoms'; }
        else if (type === 'dietInfo') { headerType = 'diet'; rowKey = 'dietInfo'; }
        else if (type === 'basic') { headerType = 'basic'; rowKey = 'basicInfo'; }
        
        if (!this.headers[headerType] || !rowKey || cellIndex < 0 || cellIndex >= this.headers[headerType].length) return;
        this.headers[headerType][cellIndex] = '';
        this.rows.forEach((row) => {
          if (row[rowKey] && Array.isArray(row[rowKey]) && cellIndex < row[rowKey].length) {
            row[rowKey][cellIndex] = '';
          }
        });
      });
    },

    clearFixedColumnData({ type }) {
      if (type === 'isPatient') this.rows.forEach((row) => (row.isPatient = ''));
      else if (type === 'symptomOnset') this.rows.forEach((row) => (row.symptomOnset = ''));
      else if (type === 'individualExposureTime') this.rows.forEach((row) => (row.individualExposureTime = ''));
    },

    updateHeader({ headerType, index, text }) {
      if (this.headers[headerType] && this.headers[headerType][index] !== undefined) {
        this.headers[headerType][index] = text;
      }
    },

    updateCell({ rowIndex, key, value, cellIndex }) {
      if (!this.rows[rowIndex]) return;
      if (cellIndex !== null && cellIndex !== undefined) {
        if (!this.rows[rowIndex][key]) this.rows[rowIndex][key] = [];
        while (this.rows[rowIndex][key].length <= cellIndex) this.rows[rowIndex][key].push('');
        this.rows[rowIndex][key][cellIndex] = value;
      } else {
        this.rows[rowIndex][key] = value;
      }
    },

    updateCellsBatch(updates) {
      if (!Array.isArray(updates)) return;
      updates.forEach(({ rowIndex, key, value, cellIndex }) => {
        this.updateCell({ rowIndex, key, value, cellIndex });
      });
    },

    deleteRow(rowIndex) {
      if (rowIndex !== null && rowIndex >= 0 && rowIndex < this.rows.length) {
        this.rows.splice(rowIndex, 1);
        this.deletedRowIndex = rowIndex;
      }
    },

    deleteMultipleRows({ startRow, endRow }) {
      if (startRow !== null && startRow >= 0 && endRow >= startRow && endRow < this.rows.length) {
        this.rows.splice(startRow, endRow - startRow + 1);
        this.deletedRowIndex = startRow;
      }
    },

    deleteIndividualRows({ rows }) {
      if (!rows || rows.length === 0) return;
      const sortedRows = [...rows].sort((a, b) => b - a);
      for (const rowIndex of sortedRows) {
        if (rowIndex !== null && rowIndex >= 0 && rowIndex < this.rows.length) {
          this.rows.splice(rowIndex, 1);
        }
      }
      if (rows.length > 0) this.deletedRowIndex = Math.min(...rows);
    },

    insertRowAt({ index, count = 1 }) {
      const newRows = Array(count).fill().map(() => ({
        isPatient: '',
        isConfirmedCase: '',
        basicInfo: Array(this.headers.basic?.length || 0).fill(''),
        clinicalSymptoms: Array(this.headers.clinical?.length || 0).fill(''),
        symptomOnset: '',
        individualExposureTime: '',
        dietInfo: Array(this.headers.diet?.length || 0).fill('')
      }));
      if (index >= 0 && index <= this.rows.length) {
        this.rows.splice(index, 0, ...newRows);
      }
    },

    clearDeletedRowIndex() {
      this.deletedRowIndex = null;
    },

    deleteEmptyRows() {
      const emptyRowIndices = [];
      const rowKeyMap = { basic: 'basicInfo', clinical: 'clinicalSymptoms', diet: 'dietInfo' };
      this.rows.forEach((row, index) => {
        let isEmpty = true;
        if (row.isPatient && String(row.isPatient).trim() !== '') isEmpty = false;
        if (row.symptomOnset && String(row.symptomOnset).trim() !== '') isEmpty = false;
        for (const key in rowKeyMap) {
          const dataKey = rowKeyMap[key];
          if (row[dataKey] && row[dataKey].some(val => val !== null && val !== undefined && String(val).trim() !== '')) {
            isEmpty = false; break;
          }
        }
        if (isEmpty) emptyRowIndices.push(index);
      });
      for (let i = emptyRowIndices.length - 1; i >= 0; i--) {
        this.rows.splice(emptyRowIndices[i], 1);
      }
    },

    deleteEmptyColumns() {
      const rowKeyMap = { basic: 'basicInfo', clinical: 'clinicalSymptoms', diet: 'dietInfo' };
      for (const headerType of ['basic', 'clinical', 'diet']) {
        if (!this.headers[headerType]) continue;
        const emptyIndices = [];
        for (let i = 0; i < this.headers[headerType].length; i++) {
          if (isColumnEmpty(this.headers, this.rows, headerType, i)) emptyIndices.push(i);
        }
        const maxRemovable = this.headers[headerType].length - 1;
        const indicesToRemove = emptyIndices.slice(0, maxRemovable);
        for (let i = indicesToRemove.length - 1; i >= 0; i--) {
          const indexToRemove = indicesToRemove[i];
          this.headers[headerType].splice(indexToRemove, 1);
          this.rows.forEach((row) => {
            const rowKey = rowKeyMap[headerType];
            if (row[rowKey]) row[rowKey].splice(indexToRemove, 1);
          });
        }
        if (this.headers[headerType].length === 0) {
          this.headers[headerType].push('');
          this.rows.forEach((row) => {
            const rowKey = rowKeyMap[headerType];
            if (!row[rowKey]) row[rowKey] = [];
            row[rowKey].push('');
          });
        }
      }
    },

    clearRowData({ rowIndex }) {
      if (this.rows[rowIndex]) {
        const row = this.rows[rowIndex];
        row.isPatient = ''; row.isConfirmedCase = ''; row.symptomOnset = ''; row.individualExposureTime = '';
        if (row.basicInfo) row.basicInfo.fill('');
        if (row.clinicalSymptoms) row.clinicalSymptoms.fill('');
        if (row.dietInfo) row.dietInfo.fill('');
      }
    },

    clearMultipleRowsData({ startRow, endRow }) {
      for (let i = startRow; i <= endRow; i++) {
        this.clearRowData({ rowIndex: i });
      }
    },

    clearIndividualRowsData({ rowIndices }) {
      if (!rowIndices || !Array.isArray(rowIndices)) return;
      rowIndices.forEach(rowIndex => this.clearRowData({ rowIndex }));
    },

    // Excel & Paste Helpers
    updateHeadersFromExcel(headers) {
      this.headers = headers;
      syncRowDataWithHeaders(this.$state);
    },

    addRowsFromExcel(rows) {
      this.rows = rows;
    },

    pasteHeaderData({ startColIndex, headerType, data }) {
      if (!this.headers[headerType]) return;
      const basicStartIndex = 2; 
      const clinicalStartIndex = basicStartIndex + (this.headers.basic?.length || 0);
      const dietStartIndex = clinicalStartIndex + (this.headers.clinical?.length || 0) + 1;
      
      let currentHeaderArrayIndex = -1;
      if (headerType === 'basic') currentHeaderArrayIndex = startColIndex - basicStartIndex;
      else if (headerType === 'clinical') currentHeaderArrayIndex = startColIndex - clinicalStartIndex;
      else if (headerType === 'diet') currentHeaderArrayIndex = startColIndex - dietStartIndex;
      
      if (currentHeaderArrayIndex < 0) return;
      for (let i = 0; i < data.length; i++) {
        const targetIndex = currentHeaderArrayIndex + i;
        if (targetIndex >= 0 && targetIndex < this.headers[headerType].length) {
          this.headers[headerType][targetIndex] = data[i] ?? '';
        }
      }
    },

    pasteData(payload) {
      const settingsStore = useSettingsStore();
      const { startRowIndex, startColIndex, data } = payload;
      const isIndividualExposureVisible = settingsStore.isIndividualExposureColumnVisible;
      const isConfirmedCaseVisible = settingsStore.isConfirmedCaseColumnVisible;
      
      let currentColIndex = 0;
      const colMap = {};
      colMap[currentColIndex++] = { type: 'serial' };
      colMap[currentColIndex++] = { type: 'isPatient' };
      if (isConfirmedCaseVisible) { colMap[currentColIndex++] = { type: 'isConfirmedCase' }; }
      
      const dynamicBasicStartIndex = currentColIndex;
      const clinicalStartIndex = dynamicBasicStartIndex + (this.headers.basic?.length || 0);
      const individualExposureIndex = isIndividualExposureVisible ? clinicalStartIndex + (this.headers.clinical?.length || 0) : -1;
      const onsetIndex = clinicalStartIndex + (this.headers.clinical?.length || 0) + (isIndividualExposureVisible ? 1 : 0);
      const dietStartIndex = onsetIndex + 1;

      for (let i = 0; i < data.length; i++) {
        const rowData = data[i];
        const currentRowIndex = startRowIndex + i;
        if (currentRowIndex >= this.rows.length) {
          this.rows.push({
            isPatient: '', isConfirmedCase: '',
            basicInfo: Array(this.headers.basic?.length || 0).fill(''),
            clinicalSymptoms: Array(this.headers.clinical?.length || 0).fill(''),
            symptomOnset: '', individualExposureTime: '',
            dietInfo: Array(this.headers.diet?.length || 0).fill('')
          });
        }
        const targetRow = this.rows[currentRowIndex];
        if (!targetRow) continue;
        let currentColumn = startColIndex;
        for (let j = 0; j < rowData.length; j++) {
          const cellValue = rowData[j] ?? '';
          if (colMap[currentColumn]?.type === 'isPatient') {
            targetRow.isPatient = cellValue;
          } else if (colMap[currentColumn]?.type === 'isConfirmedCase') {
            targetRow.isConfirmedCase = cellValue;
          } else if (isIndividualExposureVisible && currentColumn === individualExposureIndex) {
            targetRow.individualExposureTime = cellValue;
          } else if (currentColumn === onsetIndex) {
            targetRow.symptomOnset = cellValue;
          } else if (currentColumn >= dynamicBasicStartIndex && currentColumn < clinicalStartIndex) {
            const idx = currentColumn - dynamicBasicStartIndex;
            if (idx < (this.headers.basic?.length || 0)) {
              if (!targetRow.basicInfo) targetRow.basicInfo = [];
              while(targetRow.basicInfo.length <= idx) targetRow.basicInfo.push('');
              targetRow.basicInfo[idx] = cellValue;
            }
          } else if (currentColumn >= clinicalStartIndex && currentColumn < (isIndividualExposureVisible ? individualExposureIndex : onsetIndex)) {
            const idx = currentColumn - clinicalStartIndex;
            if (idx < (this.headers.clinical?.length || 0)) {
              if (!targetRow.clinicalSymptoms) targetRow.clinicalSymptoms = [];
              while(targetRow.clinicalSymptoms.length <= idx) targetRow.clinicalSymptoms.push('');
              targetRow.clinicalSymptoms[idx] = cellValue;
            }
          } else if (currentColumn >= dietStartIndex) {
            const idx = currentColumn - dietStartIndex;
            if (idx < (this.headers.diet?.length || 0)) {
              if (!targetRow.dietInfo) targetRow.dietInfo = [];
              while(targetRow.dietInfo.length <= idx) targetRow.dietInfo.push('');
              targetRow.dietInfo[idx] = cellValue;
            }
          }
          currentColumn++;
        }
      }
    },

    updateConfirmedCase({ rowIndex, value }) {
      if (this.rows[rowIndex]) this.rows[rowIndex].isConfirmedCase = value;
    },

    updateIndividualExposureTime({ rowIndex, value }) {
      if (this.rows[rowIndex]) this.rows[rowIndex].individualExposureTime = value;
    },

    handleEnter({ rowIndex, key, cellIndex }) {
      const getColumnIndex = (k, cIdx) => {
        switch (k) {
        case 'isPatient': return 1;
        case 'basicInfo': return this.basicInfoStartIndex + cIdx;
        case 'clinicalSymptoms': return this.clinicalSymptomsStartIndex + cIdx;
        case 'symptomOnset': return this.symptomOnsetStartIndex;
        case 'individualExposureTime': return this.individualExposureTimeStartIndex;
        case 'dietInfo': return this.dietInfoStartIndex + cIdx;
        default: return -1;
        }
      };
      
      const currentColumnIndex = getColumnIndex(key, cellIndex);
      if (currentColumnIndex === -1) return;
      
      const nextRowIndex = rowIndex + 1;
      
      if (nextRowIndex >= this.rows.length) {
        this.addRows(1);
      }
      
      return { rowIndex: nextRowIndex, columnIndex: currentColumnIndex };
    },

    resetSheet() {
      // 1. Reset Data
      const initialState = createInitialState();
      this.headers = initialState.headers;
      this.rows = initialState.rows;
      this.validationState.errors = new Map();
      this.validationState.version++;

      // 2. Reset Settings (via settingsStore)
      const settingsStore = useSettingsStore();
      settingsStore.setIndividualExposureColumnVisibility(false);
      settingsStore.setConfirmedCaseColumnVisibility(false);
      settingsStore.setAnalysisResults({ type: 'caseControl', results: [] });
      settingsStore.setAnalysisResults({ type: 'cohort', results: [] });
      
      settingsStore.updateSymptomInterval(6);
      settingsStore.updateExposureDateTime('');
      settingsStore.updateIncubationInterval(6);
      settingsStore.updateEpidemicCurveSettings({
        timeInterval: 6, chartWidth: 800, chartHeight: 400, fontSize: 14,
        barColor: '#5470c6', showGrid: true, showLegend: true, backgroundColor: '#ffffff',
        displayMode: 'time', reportChartDataUrl: null, reportIncubationChartDataUrl: null,
        incubationFontSize: 15, incubationChartWidth: 1100, incubationBarColor: '#91cc75',
        incubationDisplayMode: 'hour'
      });
      
      settingsStore.setSelectedSuspectedFoods('');
      settingsStore.setSuspectedSource('');
      settingsStore.setAnalysisOptions({ statMethod: 'chi-square', haldaneCorrection: false });
      settingsStore.setYatesCorrectionSettings({ type: 'caseControl', enabled: false });
      settingsStore.setYatesCorrectionSettings({ type: 'cohort', enabled: false });
    },

    // Validation Actions
    setValidationErrors(errors) {
      this.validationState.errors = errors;
      this.validationState.version++;
      if (window.storeBridge) window.storeBridge.saveCurrentState();
    },
    
    setValidationVersion(version) {
      this.validationState.version = version;
    },
    
    clearValidationErrors() {
      this.validationState.errors = new Map();
      this.validationState.version++;
    },
    
    addValidationErrorByUniqueKey({ errorKey, message }) {
      const newMap = new Map(this.validationState.errors);
      newMap.set(errorKey, { message, timestamp: Date.now() });
      this.validationState.errors = newMap;
      this.validationState.version++;
      if (window.storeBridge) window.storeBridge.saveCurrentState();
    },
    
    removeValidationErrorByUniqueKey({ errorKey }) {
      if (!this.validationState.errors.has(errorKey)) return;
      const newMap = new Map(this.validationState.errors);
      newMap.delete(errorKey);
      this.validationState.errors = newMap;
      this.validationState.version++;
      if (window.storeBridge) window.storeBridge.saveCurrentState();
    },

    addValidationError({ rowIndex, colIndex, message }) {
      const errorKey = `${rowIndex}_${colIndex}`;
      const newMap = new Map(this.validationState.errors);
      newMap.set(errorKey, { message, timestamp: Date.now() });
      this.validationState.errors = newMap;
      this.validationState.version++;
    },
    
    removeValidationError({ rowIndex, colIndex }) {
      const errorKey = `${rowIndex}_${colIndex}`;
      if (!this.validationState.errors.has(errorKey)) return;
      const newMap = new Map(this.validationState.errors);
      newMap.delete(errorKey);
      this.validationState.errors = newMap;
      this.validationState.version++;
    }
  }
});
