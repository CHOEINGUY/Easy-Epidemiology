import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useSettingsStore } from './settingsStore';

// Helper Methods (Converted to internal functions)
function createInitialState() {
  // Diet columns: 20 total (all empty)
  const dietHeaders = Array(20).fill('');

  // Create 100 empty rows
  const initialRows = [];
  // Basic: 3 cols, Clinical: 5 cols, Diet: 20 cols
  for (let i = 0; i < 100; i++) {
    initialRows.push({
      isPatient: '',
      isConfirmedCase: '',
      basicInfo: Array(3).fill(''),
      clinicalSymptoms: Array(5).fill(''),
      symptomOnset: '',
      individualExposureTime: '',
      dietInfo: Array(20).fill('')
    });
  }

  return {
    headers: {
      basic: Array(3).fill(''),
      clinical: Array(5).fill(''),
      diet: dietHeaders
    },
    rows: initialRows
  };
}

function syncRowDataWithHeaders(headersState, rowsState) {
  rowsState.forEach(row => {
    if (headersState.basic) {
      if (!row.basicInfo) row.basicInfo = [];
      while (row.basicInfo.length < headersState.basic.length) row.basicInfo.push('');
      if (row.basicInfo.length > headersState.basic.length) row.basicInfo.length = headersState.basic.length;
    }
    if (headersState.clinical) {
      if (!row.clinicalSymptoms) row.clinicalSymptoms = [];
      while (row.clinicalSymptoms.length < headersState.clinical.length) row.clinicalSymptoms.push('');
      if (row.clinicalSymptoms.length > headersState.clinical.length) row.clinicalSymptoms.length = headersState.clinical.length;
    }
    if (headersState.diet) {
      if (!row.dietInfo) row.dietInfo = [];
      while (row.dietInfo.length < headersState.diet.length) row.dietInfo.push('');
      if (row.dietInfo.length > headersState.diet.length) row.dietInfo.length = headersState.diet.length;
    }
  });
}

function isColumnEmpty(headers, rows, type, index) {
  const rowKeyMap = { basic: 'basicInfo', clinical: 'clinicalSymptoms', diet: 'dietInfo' };
  const rowKey = rowKeyMap[type];
  if (!rowKey) return true;
  
  for (const row of rows) {
    if (row[rowKey] && row[rowKey][index] && String(row[rowKey][index]).trim() !== '') {
      return false;
    }
  }
  if (headers[type] && headers[type][index] && String(headers[type][index]).trim() !== '') return false;
  
  return true;
}


export const useEpidemicStore = defineStore('epidemic', () => {
  // --- State ---
  const headers = ref({ basic: [], clinical: [], diet: [] });
  const rows = ref([]);
  const deletedRowIndex = ref(null);
  const validationState = ref({
    errors: new Map(), // key: "row_col", value: { message, timestamp }
    version: 0
  });

  // --- Getters ---
  const basicInfoStartIndex = computed(() => 2);
  
  const clinicalSymptomsStartIndex = computed(() => {
    return 2 + (headers.value.basic?.length || 0);
  });
  
  const individualExposureTimeStartIndex = computed(() => {
    const settingsStore = useSettingsStore();
    return settingsStore.isIndividualExposureColumnVisible
      ? clinicalSymptomsStartIndex.value + (headers.value.clinical?.length || 0)
      : null;
  });
  
  const symptomOnsetStartIndex = computed(() => {
    const settingsStore = useSettingsStore();
    return clinicalSymptomsStartIndex.value +
      (headers.value.clinical?.length || 0) +
      (settingsStore.isIndividualExposureColumnVisible ? 1 : 0);
  });
  
  const dietInfoStartIndex = computed(() => symptomOnsetStartIndex.value + 1);

  // Statistics Getters
  const getCaseAttackRate = computed(() => {
    const total = rows.value.length;
    if (!total) return null;
    const cases = rows.value.filter(r => r && r.isPatient === '1').length;
    return ((cases / total) * 100).toFixed(1);
  });

  const getPatientAttackRate = computed(() => {
    const settingsStore = useSettingsStore();
    if (!settingsStore.isConfirmedCaseColumnVisible) return null;
    const total = rows.value.length;
    if (!total) return null;
    const confirmed = rows.value.filter(r => r && r.isConfirmedCase === '1').length;
    return ((confirmed / total) * 100).toFixed(1);
  });

  const getFirstCaseDate = computed(() => {
    const onsets = rows.value
      .map(r => r.symptomOnset)
      .filter(Boolean)
      .map(ts => new Date(ts));
    if (!onsets.length) return null;
    return new Date(Math.min(...onsets));
  });

  const getMeanIncubation = computed(() => {
    const settingsStore = useSettingsStore();
    const exposure = new Date(settingsStore.exposureDateTime || '');
    if (!settingsStore.exposureDateTime || isNaN(exposure)) return null;
    const diffs = rows.value
      .map(r => r.symptomOnset)
      .filter(Boolean)
      .map(ts => (new Date(ts) - exposure) / 3600000)
      .filter(h => h > 0);
    if (!diffs.length) return null;
    const avg = diffs.reduce((a,b) => a+b,0) / diffs.length;
    return avg.toFixed(1);
  });

  // --- Actions ---

  function loadInitialData() {
    const initialState = createInitialState();
    headers.value = initialState.headers;
    rows.value = initialState.rows;
  }

  function setInitialData(payload) {
    headers.value = payload.headers;
    rows.value = payload.rows;
  }

  function addRows(count) {
    const newRows = [];
    for (let i = 0; i < count; i++) {
      newRows.push({
        isPatient: '',
        isConfirmedCase: '',
        basicInfo: Array(headers.value.basic?.length || 0).fill(''),
        clinicalSymptoms: Array(headers.value.clinical?.length || 0).fill(''),
        symptomOnset: '',
        individualExposureTime: '',
        dietInfo: Array(headers.value.diet?.length || 0).fill('')
      });
    }
    rows.value = rows.value.concat(newRows);
  }

  function addColumn(type) {
    if (!headers.value[type]) return;
    headers.value[type].push('');
    syncRowDataWithHeaders(headers.value, rows.value);
  }

  function addMultipleColumns({ type, count }) {
    if (!headers.value[type] || count <= 0) return;
    const rowKeyMap = { basic: 'basicInfo', clinical: 'clinicalSymptoms', diet: 'dietInfo' };
    const rowKey = rowKeyMap[type];
    if (!rowKey) return;
    
    for (let i = 0; i < count; i++) {
      headers.value[type].push('');
      rows.value.forEach((row) => {
        if (!row[rowKey]) row[rowKey] = [];
        row[rowKey].push('');
      });
    }
  }

  function insertColumnAt({ type, index }) {
    let headerType = type;
    let rowKey = type;
    
    if (type === 'clinicalSymptoms') { headerType = 'clinical'; rowKey = 'clinicalSymptoms'; }
    else if (type === 'dietInfo') { headerType = 'diet'; rowKey = 'dietInfo'; }
    else if (type === 'basic') { headerType = 'basic'; rowKey = 'basicInfo'; }
    
    if (!headers.value[headerType] || index < 0 || index > headers.value[headerType].length) return;
    
    headers.value[headerType].splice(index, 0, '');
    rows.value.forEach((row) => {
      if (!row[rowKey]) row[rowKey] = [];
      while (row[rowKey].length < headers.value[headerType].length - 1) {
        row[rowKey].push('');
      }
      row[rowKey].splice(index, 0, '');
    });
  }

  function insertMultipleColumnsAt({ type, count, index }) {
    let headerType = type;
    let rowKey = type;
    
    if (type === 'clinicalSymptoms') { headerType = 'clinical'; rowKey = 'clinicalSymptoms'; }
    else if (type === 'dietInfo') { headerType = 'diet'; rowKey = 'dietInfo'; }
    else if (type === 'basic') { headerType = 'basic'; rowKey = 'basicInfo'; }
    
    if (!headers.value[headerType] || count <= 0 || index < 0 || index > headers.value[headerType].length) return;
    
    for (let i = 0; i < count; i++) {
      headers.value[headerType].splice(index + i, 0, '');
    }
    
    rows.value.forEach((row) => {
      if (!row[rowKey]) row[rowKey] = [];
      while (row[rowKey].length < headers.value[headerType].length - count) {
        row[rowKey].push('');
      }
      for (let i = 0; i < count; i++) {
        row[rowKey].splice(index + i, 0, '');
      }
    });
  }

  function deleteColumn(type) {
    if (!headers.value[type] || headers.value[type].length <= 1) return;
    headers.value[type].pop();
    syncRowDataWithHeaders(headers.value, rows.value);
  }

  function deleteColumnByIndex({ type, index }) {
    let headerType = type;
    let rowKey = type;
      
    if (type === 'clinicalSymptoms') { headerType = 'clinical'; rowKey = 'clinicalSymptoms'; }
    else if (type === 'dietInfo') { headerType = 'diet'; rowKey = 'dietInfo'; }
    else if (type === 'basic') { headerType = 'basic'; rowKey = 'basicInfo'; }
      
    if (!headers.value[headerType] || index < 0 || index >= headers.value[headerType].length) return;
      
    headers.value[headerType].splice(index, 1);
    rows.value.forEach((row) => row[rowKey]?.splice(index, 1));
  }

  function deleteMultipleColumnsByIndex({ columns }) {
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
        
      if (!rowKey || !headers.value[headerType]) continue;
      const sortedIndices = indices.sort((a, b) => b - a);
      sortedIndices.forEach(index => {
        if (index >= 0 && index < headers.value[headerType].length) {
          headers.value[headerType].splice(index, 1);
          rows.value.forEach(row => row[rowKey]?.splice(index, 1));
        }
      });
    }
  }

  function clearColumnData({ type, index }) {
    let headerType = type;
    let rowKey = type;
      
    if (type === 'clinicalSymptoms') { headerType = 'clinical'; rowKey = 'clinicalSymptoms'; }
    else if (type === 'dietInfo') { headerType = 'diet'; rowKey = 'dietInfo'; }
    else if (type === 'basic') { headerType = 'basic'; rowKey = 'basicInfo'; }
      
    if (!headers.value[headerType] || index < 0 || index >= headers.value[headerType].length) return;
      
    headers.value[headerType][index] = '';
    rows.value.forEach((row) => {
      if (row[rowKey] && Array.isArray(row[rowKey]) && index < row[rowKey].length) {
        row[rowKey][index] = '';
      }
    });
  }

  function clearMultipleColumnsData({ columns }) {
    if (!columns || columns.length === 0) return;
    columns.forEach(col => {
      const { type, cellIndex } = col;
      let headerType = type;
      let rowKey = type;
      if (type === 'clinicalSymptoms') { headerType = 'clinical'; rowKey = 'clinicalSymptoms'; }
      else if (type === 'dietInfo') { headerType = 'diet'; rowKey = 'dietInfo'; }
      else if (type === 'basic') { headerType = 'basic'; rowKey = 'basicInfo'; }
      
      if (!headers.value[headerType] || !rowKey || cellIndex < 0 || cellIndex >= headers.value[headerType].length) return;
      headers.value[headerType][cellIndex] = '';
      rows.value.forEach((row) => {
        if (row[rowKey] && Array.isArray(row[rowKey]) && cellIndex < row[rowKey].length) {
          row[rowKey][cellIndex] = '';
        }
      });
    });
  }

  function clearFixedColumnData({ type }) {
    if (type === 'isPatient') rows.value.forEach((row) => (row.isPatient = ''));
    else if (type === 'symptomOnset') rows.value.forEach((row) => (row.symptomOnset = ''));
    else if (type === 'individualExposureTime') rows.value.forEach((row) => (row.individualExposureTime = ''));
  }

  function updateHeader({ headerType, index, text }) {
    if (headers.value[headerType] && headers.value[headerType][index] !== undefined) {
      headers.value[headerType][index] = text;
    }
  }

  function updateCell({ rowIndex, key, value, cellIndex }) {
    if (!rows.value[rowIndex]) return;
    if (cellIndex !== null && cellIndex !== undefined) {
      if (!rows.value[rowIndex][key]) rows.value[rowIndex][key] = [];
      while (rows.value[rowIndex][key].length <= cellIndex) rows.value[rowIndex][key].push('');
      rows.value[rowIndex][key][cellIndex] = value;
    } else {
      rows.value[rowIndex][key] = value;
    }
  }

  function updateCellsBatch(updates) {
    if (!Array.isArray(updates)) return;
    updates.forEach(({ rowIndex, key, value, cellIndex }) => {
      updateCell({ rowIndex, key, value, cellIndex });
    });
  }

  function deleteRow(rowIndex) {
    if (rowIndex !== null && rowIndex >= 0 && rowIndex < rows.value.length) {
      rows.value.splice(rowIndex, 1);
      deletedRowIndex.value = rowIndex;
    }
  }

  function deleteMultipleRows({ startRow, endRow }) {
    if (startRow !== null && startRow >= 0 && endRow >= startRow && endRow < rows.value.length) {
      rows.value.splice(startRow, endRow - startRow + 1);
      deletedRowIndex.value = startRow;
    }
  }

  function deleteIndividualRows({ rows: rowsToDelete }) {
    if (!rowsToDelete || rowsToDelete.length === 0) return;
    const sortedRows = [...rowsToDelete].sort((a, b) => b - a);
    for (const rowIndex of sortedRows) {
      if (rowIndex !== null && rowIndex >= 0 && rowIndex < rows.value.length) {
        rows.value.splice(rowIndex, 1);
      }
    }
    if (rowsToDelete.length > 0) deletedRowIndex.value = Math.min(...rowsToDelete);
  }

  function insertRowAt({ index, count = 1 }) {
    const newRows = Array(count).fill().map(() => ({
      isPatient: '',
      isConfirmedCase: '',
      basicInfo: Array(headers.value.basic?.length || 0).fill(''),
      clinicalSymptoms: Array(headers.value.clinical?.length || 0).fill(''),
      symptomOnset: '',
      individualExposureTime: '',
      dietInfo: Array(headers.value.diet?.length || 0).fill('')
    }));
    if (index >= 0 && index <= rows.value.length) {
      rows.value.splice(index, 0, ...newRows);
    }
  }

  function clearDeletedRowIndex() {
    deletedRowIndex.value = null;
  }

  function deleteEmptyRows() {
    const emptyRowIndices = [];
    const rowKeyMap = { basic: 'basicInfo', clinical: 'clinicalSymptoms', diet: 'dietInfo' };
    rows.value.forEach((row, index) => {
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
      rows.value.splice(emptyRowIndices[i], 1);
    }
  }

  function deleteEmptyColumns() {
    const rowKeyMap = { basic: 'basicInfo', clinical: 'clinicalSymptoms', diet: 'dietInfo' };
    for (const headerType of ['basic', 'clinical', 'diet']) {
      if (!headers.value[headerType]) continue;
      const emptyIndices = [];
      for (let i = 0; i < headers.value[headerType].length; i++) {
        if (isColumnEmpty(headers.value, rows.value, headerType, i)) emptyIndices.push(i);
      }
      const maxRemovable = headers.value[headerType].length - 1;
      const indicesToRemove = emptyIndices.slice(0, maxRemovable);
      for (let i = indicesToRemove.length - 1; i >= 0; i--) {
        const indexToRemove = indicesToRemove[i];
        headers.value[headerType].splice(indexToRemove, 1);
        rows.value.forEach((row) => {
          const rowKey = rowKeyMap[headerType];
          if (row[rowKey]) row[rowKey].splice(indexToRemove, 1);
        });
      }
      if (headers.value[headerType].length === 0) {
        headers.value[headerType].push('');
        rows.value.forEach((row) => {
          const rowKey = rowKeyMap[headerType];
          if (!row[rowKey]) row[rowKey] = [];
          row[rowKey].push('');
        });
      }
    }
  }

  function clearRowData({ rowIndex }) {
    if (rows.value[rowIndex]) {
      const row = rows.value[rowIndex];
      row.isPatient = ''; row.isConfirmedCase = ''; row.symptomOnset = ''; row.individualExposureTime = '';
      if (row.basicInfo) row.basicInfo.fill('');
      if (row.clinicalSymptoms) row.clinicalSymptoms.fill('');
      if (row.dietInfo) row.dietInfo.fill('');
    }
  }

  function clearMultipleRowsData({ startRow, endRow }) {
    for (let i = startRow; i <= endRow; i++) {
      clearRowData({ rowIndex: i });
    }
  }

  function clearIndividualRowsData({ rowIndices }) {
    if (!rowIndices || !Array.isArray(rowIndices)) return;
    rowIndices.forEach(rowIndex => clearRowData({ rowIndex }));
  }

  // Excel & Paste Helpers
  function updateHeadersFromExcel(newHeaders) {
    headers.value = newHeaders;
    syncRowDataWithHeaders(headers.value, rows.value);
  }

  function addRowsFromExcel(newRows) {
    rows.value = newRows;
  }

  function pasteHeaderData({ startColIndex, headerType, data }) {
    if (!headers.value[headerType]) return;
    const basicStartIndex = 2; 
    const clinicalStartIndex = basicStartIndex + (headers.value.basic?.length || 0);
    const dietStartIndex = clinicalStartIndex + (headers.value.clinical?.length || 0) + 1;
    
    let currentHeaderArrayIndex = -1;
    if (headerType === 'basic') currentHeaderArrayIndex = startColIndex - basicStartIndex;
    else if (headerType === 'clinical') currentHeaderArrayIndex = startColIndex - clinicalStartIndex;
    else if (headerType === 'diet') currentHeaderArrayIndex = startColIndex - dietStartIndex;
    
    if (currentHeaderArrayIndex < 0) return;
    for (let i = 0; i < data.length; i++) {
      const targetIndex = currentHeaderArrayIndex + i;
      if (targetIndex >= 0 && targetIndex < headers.value[headerType].length) {
        headers.value[headerType][targetIndex] = data[i] ?? '';
      }
    }
  }

  function pasteData(payload) {
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
    const clinicalStartIndex = dynamicBasicStartIndex + (headers.value.basic?.length || 0);
    const individualExposureIndex = isIndividualExposureVisible ? clinicalStartIndex + (headers.value.clinical?.length || 0) : -1;
    const onsetIndex = clinicalStartIndex + (headers.value.clinical?.length || 0) + (isIndividualExposureVisible ? 1 : 0);
    const dietStartIndex = onsetIndex + 1;

    for (let i = 0; i < data.length; i++) {
      const rowData = data[i];
      const currentRowIndex = startRowIndex + i;
      if (currentRowIndex >= rows.value.length) {
        rows.value.push({
          isPatient: '', isConfirmedCase: '',
          basicInfo: Array(headers.value.basic?.length || 0).fill(''),
          clinicalSymptoms: Array(headers.value.clinical?.length || 0).fill(''),
          symptomOnset: '', individualExposureTime: '',
          dietInfo: Array(headers.value.diet?.length || 0).fill('')
        });
      }
      const targetRow = rows.value[currentRowIndex];
      // Note: in setup store, targetRow is reactive, no need for special handling usually if modifying existing object properties
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
          if (idx < (headers.value.basic?.length || 0)) {
            if (!targetRow.basicInfo) targetRow.basicInfo = [];
            while(targetRow.basicInfo.length <= idx) targetRow.basicInfo.push('');
            targetRow.basicInfo[idx] = cellValue;
          }
        } else if (currentColumn >= clinicalStartIndex && currentColumn < (isIndividualExposureVisible ? individualExposureIndex : onsetIndex)) {
          const idx = currentColumn - clinicalStartIndex;
          if (idx < (headers.value.clinical?.length || 0)) {
            if (!targetRow.clinicalSymptoms) targetRow.clinicalSymptoms = [];
            while(targetRow.clinicalSymptoms.length <= idx) targetRow.clinicalSymptoms.push('');
            targetRow.clinicalSymptoms[idx] = cellValue;
          }
        } else if (currentColumn >= dietStartIndex) {
          const idx = currentColumn - dietStartIndex;
          if (idx < (headers.value.diet?.length || 0)) {
            if (!targetRow.dietInfo) targetRow.dietInfo = [];
            while(targetRow.dietInfo.length <= idx) targetRow.dietInfo.push('');
            targetRow.dietInfo[idx] = cellValue;
          }
        }
        currentColumn++;
      }
    }
  }

  function updateConfirmedCase({ rowIndex, value }) {
    if (rows.value[rowIndex]) rows.value[rowIndex].isConfirmedCase = value;
  }

  function updateIndividualExposureTime({ rowIndex, value }) {
    if (rows.value[rowIndex]) rows.value[rowIndex].individualExposureTime = value;
  }

  function handleEnter({ rowIndex, key, cellIndex }) {
    const getColumnIndex = (k, cIdx) => {
      switch (k) {
      case 'isPatient': return 1;
      case 'basicInfo': return basicInfoStartIndex.value + cIdx;
      case 'clinicalSymptoms': return clinicalSymptomsStartIndex.value + cIdx;
      case 'symptomOnset': return symptomOnsetStartIndex.value;
      case 'individualExposureTime': return individualExposureTimeStartIndex.value;
      case 'dietInfo': return dietInfoStartIndex.value + cIdx;
      default: return -1;
      }
    };
    
    const currentColumnIndex = getColumnIndex(key, cellIndex);
    if (currentColumnIndex === -1) return;
    
    const nextRowIndex = rowIndex + 1;
    
    if (nextRowIndex >= rows.value.length) {
      addRows(1);
    }
    
    return { rowIndex: nextRowIndex, columnIndex: currentColumnIndex };
  }

  function resetSheet() {
    // 1. Reset Data (Preserve View Settings)
    const initialState = createInitialState();
    headers.value = initialState.headers;
    rows.value = initialState.rows;
    
    // Reset Validation & Analysis Results (Data-dependent)
    validationState.value.errors = new Map();
    validationState.value.version++;

    const settingsStore = useSettingsStore();
    // Clear Analysis Results as they strictly depend on Data
    settingsStore.setAnalysisResults({ type: 'caseControl', results: [] });
    settingsStore.setAnalysisResults({ type: 'cohort', results: [] });
    
    // Clear Suspected Source/Foods as they are data-dependent inputs
    settingsStore.setSelectedSuspectedFoods('');
    settingsStore.setSuspectedSource('');
  }

  function setValidationErrors(errors) {
    validationState.value.errors = errors;
    validationState.value.version++;
    if (window.storeBridge) window.storeBridge.saveCurrentState();
  }
  
  function setValidationVersion(version) {
    validationState.value.version = version;
  }
  
  function clearValidationErrors() {
    validationState.value.errors = new Map();
    validationState.value.version++;
  }
  
  function addValidationErrorByUniqueKey({ errorKey, message }) {
    const newMap = new Map(validationState.value.errors);
    newMap.set(errorKey, { message, timestamp: Date.now() });
    validationState.value.errors = newMap;
    validationState.value.version++;
    if (window.storeBridge) window.storeBridge.saveCurrentState();
  }
  
  function removeValidationErrorByUniqueKey({ errorKey }) {
    if (!validationState.value.errors.has(errorKey)) return;
    const newMap = new Map(validationState.value.errors);
    newMap.delete(errorKey);
    validationState.value.errors = newMap;
    validationState.value.version++;
    if (window.storeBridge) window.storeBridge.saveCurrentState();
  }

  function addValidationError({ rowIndex, colIndex, message }) {
    const errorKey = `${rowIndex}_${colIndex}`;
    const newMap = new Map(validationState.value.errors);
    newMap.set(errorKey, { message, timestamp: Date.now() });
    validationState.value.errors = newMap;
    validationState.value.version++;
  }
  
  function removeValidationError({ rowIndex, colIndex }) {
    const errorKey = `${rowIndex}_${colIndex}`;
    if (!validationState.value.errors.has(errorKey)) return;
    const newMap = new Map(validationState.value.errors);
    newMap.delete(errorKey);
    validationState.value.errors = newMap;
    validationState.value.version++;
  }

  return {
    // State
    headers,
    rows,
    deletedRowIndex,
    validationState,
    
    // Getters
    basicInfoStartIndex,
    clinicalSymptomsStartIndex,
    individualExposureTimeStartIndex,
    symptomOnsetStartIndex,
    dietInfoStartIndex,
    getCaseAttackRate,
    getPatientAttackRate,
    getFirstCaseDate,
    getMeanIncubation,
    
    // Actions
    loadInitialData,
    setInitialData,
    addRows,
    addColumn,
    addMultipleColumns,
    insertColumnAt,
    insertMultipleColumnsAt,
    deleteColumn,
    deleteColumnByIndex,
    deleteMultipleColumnsByIndex,
    clearColumnData,
    clearMultipleColumnsData,
    clearFixedColumnData,
    updateHeader,
    updateCell,
    updateCellsBatch,
    deleteRow,
    deleteMultipleRows,
    deleteIndividualRows,
    insertRowAt,
    clearDeletedRowIndex,
    deleteEmptyRows,
    deleteEmptyColumns,
    clearRowData,
    clearMultipleRowsData,
    clearIndividualRowsData,
    updateHeadersFromExcel,
    addRowsFromExcel,
    pasteHeaderData,
    pasteData,
    updateConfirmedCase,
    updateIndividualExposureTime,
    handleEnter,
    resetSheet,
    setValidationErrors,
    setValidationVersion,
    clearValidationErrors,
    addValidationErrorByUniqueKey,
    removeValidationErrorByUniqueKey,
    addValidationError,
    removeValidationError
  };
});
