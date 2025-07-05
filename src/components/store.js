import { createStore } from 'vuex';

// 빈 열인지 확인하는 함수
function isColumnEmpty(headers, rows, headerType, columnIndex) {
  if (headers[headerType]?.[columnIndex]?.trim() !== '') {
    return false;
  }
  const rowKeyMap = {
    basic: 'basicInfo',
    clinical: 'clinicalSymptoms',
    diet: 'dietInfo'
  };
  const rowKey = rowKeyMap[headerType];
  if (!rowKey) return true;
  return rows.every(
    (row) =>
      !row ||
      !row[rowKey] ||
      row[rowKey][columnIndex] === null ||
      row[rowKey][columnIndex] === undefined ||
      String(row[rowKey][columnIndex]).trim() === ''
  );
}

/**
 * 행 데이터와 헤더 길이 동기화
 * 모든 행의 데이터 배열 길이를 해당 헤더 길이와 정확히 맞춤
 * @param {Object} state - Vuex state
 */
function syncRowDataWithHeaders(state) {
  const rowKeyMap = {
    basic: 'basicInfo',
    clinical: 'clinicalSymptoms',
    diet: 'dietInfo'
  };
  
  state.rows.forEach((row) => {
    Object.keys(rowKeyMap).forEach((headerType) => {
      const rowKey = rowKeyMap[headerType];
      const headerLength = state.headers[headerType]?.length || 0;
      
      if (!row[rowKey]) {
        row[rowKey] = [];
      }
      
      // 데이터 배열을 헤더 길이와 정확히 맞춤
      if (row[rowKey].length > headerLength) {
        // 더 긴 경우 자르기 (추가 데이터 제거)
        row[rowKey] = row[rowKey].slice(0, headerLength);
      } else {
        // 짧은 경우 빈 문자열로 채우기
        while (row[rowKey].length < headerLength) {
          row[rowKey].push('');
        }
      }
    });
  });
}

// 기본 헤더 및 행 구조 생성 함수
function createInitialState() {
  const initialHeaders = {
    basic: ['', ''],
    clinical: ['', '', '', '', ''],
    diet: ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '']
  };
  const initialRows = Array.from({ length: 10 }, () => ({
    isPatient: '',
    basicInfo: Array(initialHeaders.basic.length).fill(''),
    clinicalSymptoms: Array(initialHeaders.clinical.length).fill(''),
    symptomOnset: '',
    individualExposureTime: '',
    dietInfo: Array(initialHeaders.diet.length).fill('')
  }));
  return { headers: initialHeaders, rows: initialRows };
}

const store = createStore({
  state: {
    // --- 기존 상태 ---
    headers: { basic: [], clinical: [], diet: [] },
    rows: [],
    nextCellToFocus: null,
    deletedRowIndex: null,

    // --- 유행곡선 탭 관련 상태 추가 ---
    selectedSymptomInterval: 6, // 증상발현 시간간격 (기본값: 6시간)
    exposureDateTime: '2023-04-07T20:00', // 의심원 노출시간 (기본값, YYYY-MM-DDTHH:MM 형식)
    selectedIncubationInterval: 6, // 잠복기 간격 (기본값: 6시간)
    isIndividualExposureColumnVisible: false,
    // === Validation ===
    validationState: {
      errors: new Map(), // key: "row_col" , value: { message, timestamp }
      version: 0
    }
  },
  getters: {
    // --- 기존 Getters ---
    headers: (state) => state.headers,
    rows: (state) => state.rows,
    basicInfoStartIndex: () => 2,
    clinicalSymptomsStartIndex: (state, getters) =>
      getters.basicInfoStartIndex + (state.headers.basic?.length || 0),
    individualExposureTimeStartIndex: (state, getters) =>
      state.isIndividualExposureColumnVisible
        ? getters.clinicalSymptomsStartIndex +
          (state.headers.clinical?.length || 0)
        : null,
    symptomOnsetStartIndex: (state, getters) =>
      getters.clinicalSymptomsStartIndex +
      (state.headers.clinical?.length || 0) +
      (state.isIndividualExposureColumnVisible ? 1 : 0),
    dietInfoStartIndex: (state, getters) =>
      getters.symptomOnsetStartIndex + 1,

    // --- 유행곡선 탭 관련 Getters 추가 ---
    getSelectedSymptomInterval: (state) => state.selectedSymptomInterval,
    getExposureDateTime: (state) => state.exposureDateTime,
    getSelectedIncubationInterval: (state) => state.selectedIncubationInterval
  },
  mutations: {
    // --- 기존 Mutations ---
    SET_INITIAL_DATA(state, { headers, rows }) {
      state.headers = headers;
      state.rows = rows;
      // 유효성 검사 오류는 별도로 관리하므로 여기서 초기화하지 않음
      // state.validationState.errors = new Map();
      // state.validationState.version++;
    },
    ADD_ROWS(state, count) {
      const newRows = [];
      for (let i = 0; i < count; i++) {
        newRows.push({
          isPatient: '',
          basicInfo: Array(state.headers.basic?.length || 0).fill(''),
          clinicalSymptoms: Array(state.headers.clinical?.length || 0).fill(''),
          symptomOnset: '',
          individualExposureTime: '',
          dietInfo: Array(state.headers.diet?.length || 0).fill('')
        });
      }
      state.rows = state.rows.concat(newRows);
    },
    ADD_COLUMN(state, type) {
      if (!state.headers[type]) return;
      
      // 헤더에 새 열 추가
      state.headers[type].push('');
      
      // 모든 행 데이터와 헤더 길이 동기화
      syncRowDataWithHeaders(state);
    },
    ADD_MULTIPLE_COLUMNS(state, { type, count }) {
      if (!state.headers[type] || count <= 0) return;
      
      const rowKeyMap = {
        basic: 'basicInfo',
        clinical: 'clinicalSymptoms',
        diet: 'dietInfo'
      };
      const rowKey = rowKeyMap[type];
      if (!rowKey) return;
      
      // 지정된 개수만큼 열 추가
      for (let i = 0; i < count; i++) {
        state.headers[type].push('');
        state.rows.forEach((row) => {
          if (!row[rowKey]) row[rowKey] = [];
          row[rowKey].push('');
        });
      }
    },
    INSERT_COLUMN_AT(state, { type, index }) {
      // 타입 매핑: 실제 타입을 store의 헤더 타입으로 변환
      let headerType = type;
      let rowKey = type;
      
      if (type === 'clinicalSymptoms') {
        headerType = 'clinical';
        rowKey = 'clinicalSymptoms';
      } else if (type === 'dietInfo') {
        headerType = 'diet';
        rowKey = 'dietInfo';
      } else if (type === 'basic') {
        headerType = 'basic';
        rowKey = 'basicInfo';
      }
      
      if (!state.headers[headerType] || index < 0 || index > state.headers[headerType].length) return;
      
      // 헤더에 특정 위치에 빈 열 삽입
      state.headers[headerType].splice(index, 0, '');
      
      // 모든 행의 해당 위치에 빈 데이터 삽입
      state.rows.forEach((row) => {
        if (!row[rowKey]) row[rowKey] = [];
        // 배열 길이를 맞춤
        while (row[rowKey].length < state.headers[headerType].length - 1) {
          row[rowKey].push('');
        }
        // 특정 인덱스에 빈 값 삽입
        row[rowKey].splice(index, 0, '');
      });
    },
    INSERT_MULTIPLE_COLUMNS_AT(state, { type, count, index }) {
      // 타입 매핑: 실제 타입을 store의 헤더 타입으로 변환
      let headerType = type;
      let rowKey = type;
      
      if (type === 'clinicalSymptoms') {
        headerType = 'clinical';
        rowKey = 'clinicalSymptoms';
      } else if (type === 'dietInfo') {
        headerType = 'diet';
        rowKey = 'dietInfo';
      } else if (type === 'basic') {
        headerType = 'basic';
        rowKey = 'basicInfo';
      }
      
      if (!state.headers[headerType] || count <= 0 || index < 0 || index > state.headers[headerType].length) return;
      
      // 지정된 개수만큼 특정 위치에 열 삽입
      for (let i = 0; i < count; i++) {
        // 헤더에 빈 열 삽입 (같은 인덱스에 계속 삽입하면 순서대로 들어감)
        state.headers[headerType].splice(index + i, 0, '');
      }
      
      // 모든 행의 해당 위치에 빈 데이터 삽입
      state.rows.forEach((row) => {
        if (!row[rowKey]) row[rowKey] = [];
        // 배열 길이를 맞춤
        while (row[rowKey].length < state.headers[headerType].length - count) {
          row[rowKey].push('');
        }
        // 지정된 개수만큼 빈 값 삽입
        for (let i = 0; i < count; i++) {
          row[rowKey].splice(index + i, 0, '');
        }
      });
    },
    DELETE_COLUMN(state, type) {
      if (!state.headers[type] || state.headers[type].length <= 1) return;
      
      // 헤더에서 마지막 열 제거
      state.headers[type].pop();
      
      // 모든 행 데이터와 헤더 길이 동기화
      syncRowDataWithHeaders(state);
    },
    DELETE_COLUMN_BY_INDEX(state, { type, index }) {
      // 타입 매핑: 실제 타입을 store의 헤더 타입으로 변환
      let headerType = type;
      let rowKey = type;
      
      if (type === 'clinicalSymptoms') {
        headerType = 'clinical';
        rowKey = 'clinicalSymptoms';
      } else if (type === 'dietInfo') {
        headerType = 'diet';
        rowKey = 'dietInfo';
      } else if (type === 'basic') {
        headerType = 'basic';
        rowKey = 'basicInfo';
      }
      
      if (!state.headers[headerType] || index < 0 || index >= state.headers[headerType].length) return;
      
      // 헤더에서 특정 인덱스 삭제
      state.headers[headerType].splice(index, 1);
      
      state.rows.forEach((row) => row[rowKey]?.splice(index, 1));
    },
    DELETE_MULTIPLE_COLUMNS_BY_INDEX(state, { columns }) {
      if (!columns || columns.length === 0) return;

      // 1. 타입별로 그룹화 (실제 타입으로 그룹화)
      const groupedByType = columns.reduce((acc, { type, index }) => {
        if (!acc[type]) {
          acc[type] = [];
        }
        acc[type].push(index);
        return acc;
      }, {});

      // 2. 타입별로 처리
      for (const type in groupedByType) {
        const indices = groupedByType[type];
        
        // 타입 매핑: 실제 타입을 store의 헤더 타입으로 변환
        let headerType = type;
        let rowKey = type;
        
        if (type === 'clinicalSymptoms') {
          headerType = 'clinical';
          rowKey = 'clinicalSymptoms';
        } else if (type === 'dietInfo') {
          headerType = 'diet';
          rowKey = 'dietInfo';
        } else if (type === 'basic') {
          headerType = 'basic';
          rowKey = 'basicInfo';
        }
        
        if (!rowKey || !state.headers[headerType]) continue;

        // 3. 인덱스를 내림차순으로 정렬하여 뒤에서부터 삭제
        const sortedIndices = indices.sort((a, b) => b - a);

        sortedIndices.forEach(index => {
          if (index >= 0 && index < state.headers[headerType].length) {
            state.headers[headerType].splice(index, 1);
            state.rows.forEach(row => row[rowKey]?.splice(index, 1));
          }
        });
      }
    },
    CLEAR_COLUMN_DATA(state, { type, index }) {
      // 타입 매핑: 실제 타입을 store의 헤더 타입으로 변환
      let headerType = type;
      let rowKey = type;
      
      if (type === 'clinicalSymptoms') {
        headerType = 'clinical';
        rowKey = 'clinicalSymptoms';
      } else if (type === 'dietInfo') {
        headerType = 'diet';
        rowKey = 'dietInfo';
      } else if (type === 'basic') {
        headerType = 'basic';
        rowKey = 'basicInfo';
      }
      
      if (!state.headers[headerType] || index < 0 || index >= state.headers[headerType].length) return;
      
      // 헤더 텍스트를 빈 문자열로 설정
      state.headers[headerType][index] = '';
      
      // 모든 행의 해당 인덱스 데이터를 빈 문자열로 설정
      state.rows.forEach((row) => {
        if (row[rowKey] && Array.isArray(row[rowKey]) && index < row[rowKey].length) {
          row[rowKey][index] = '';
        }
      });
    },
    CLEAR_MULTIPLE_COLUMNS_DATA(state, { columns }) {
      if (!columns || columns.length === 0) return;
      
      // 각 열의 헤더와 데이터를 빈 문자열로 설정
      columns.forEach(col => {
        const { type, cellIndex } = col;
        
        // 타입 매핑: 실제 타입을 store의 헤더 타입으로 변환
        let headerType = type;
        let rowKey = type;
        
        if (type === 'clinicalSymptoms') {
          headerType = 'clinical';
          rowKey = 'clinicalSymptoms';
        } else if (type === 'dietInfo') {
          headerType = 'diet';
          rowKey = 'dietInfo';
        } else if (type === 'basic') {
          headerType = 'basic';
          rowKey = 'basicInfo';
        }
        
        if (!state.headers[headerType] || !rowKey || cellIndex < 0 || cellIndex >= state.headers[headerType].length) return;
        
        // 헤더 텍스트를 빈 문자열로 설정
        state.headers[headerType][cellIndex] = '';
        
        // 모든 행의 해당 인덱스 데이터를 빈 문자열로 설정
        state.rows.forEach((row) => {
          if (row[rowKey] && Array.isArray(row[rowKey]) && cellIndex < row[rowKey].length) {
            row[rowKey][cellIndex] = '';
          }
        });
      });
    },
    CLEAR_FIXED_COLUMN_DATA(state, { type }) {
      if (type === 'isPatient') {
        state.rows.forEach((row) => (row.isPatient = ''));
      } else if (type === 'symptomOnset') {
        state.rows.forEach((row) => (row.symptomOnset = ''));
      } else if (type === 'individualExposureTime') {
        state.rows.forEach((row) => (row.individualExposureTime = ''));
      }
    },
    UPDATE_HEADER(state, { headerType, index, text }) {
      if (state.headers[headerType] && state.headers[headerType][index] !== undefined) {
        state.headers[headerType][index] = text;
      }
    },
    UPDATE_CELL(state, { rowIndex, key, value, cellIndex }) {
      console.log('💾 UPDATE_CELL 시작:', { rowIndex, key, value, cellIndex });
      
      if (!state.rows[rowIndex]) {
        console.error('❌ 행이 존재하지 않음:', rowIndex, '전체 행 수:', state.rows.length);
        return;
      }
      
      if (cellIndex !== null && cellIndex !== undefined) {
        // 배열 타입 (basicInfo, clinicalSymptoms, dietInfo)
        if (!state.rows[rowIndex][key]) state.rows[rowIndex][key] = [];
        while (state.rows[rowIndex][key].length <= cellIndex)
          state.rows[rowIndex][key].push('');
        state.rows[rowIndex][key][cellIndex] = value;
        console.log('✅ 배열 저장 완료:', `${key}[${cellIndex}] =`, value);
      } else {
        // 단일 값 타입 (isPatient, symptomOnset)
        if (state.rows[rowIndex][key] !== undefined) {
          state.rows[rowIndex][key] = value;
        } else {
          state.rows[rowIndex][key] = value; // 키가 없을 경우 새로 생성 (예: isPatient, symptomOnset)
        }
        console.log('✅ 단일값 저장 완료:', `${key} =`, value);
      }
      
      console.log('💾 최종 행 데이터:', state.rows[rowIndex]);
    },
    DELETE_EMPTY_ROWS(state) {
      const emptyRowIndices = [];
      const rowKeyMap = {
        basic: 'basicInfo',
        clinical: 'clinicalSymptoms',
        diet: 'dietInfo'
      };

      state.rows.forEach((row, index) => {
        let isEmpty = true;
        if (row.isPatient && String(row.isPatient).trim() !== '') isEmpty = false;
        if (row.symptomOnset && String(row.symptomOnset).trim() !== '') isEmpty = false;
        
        for (const key in rowKeyMap) {
          const dataKey = rowKeyMap[key];
          if (row[dataKey] && row[dataKey].some(val => val !== null && val !== undefined && String(val).trim() !== '')) {
            isEmpty = false;
            break;
          }
        }
        if (isEmpty) {
          emptyRowIndices.push(index);
        }
      });

      // 뒤에서부터 삭제하여 인덱스 문제를 방지
      for (let i = emptyRowIndices.length - 1; i >= 0; i--) {
        state.rows.splice(emptyRowIndices[i], 1);
      }
    },
    DELETE_EMPTY_COLUMNS(state) {
      const rowKeyMap = {
        basic: 'basicInfo',
        clinical: 'clinicalSymptoms',
        diet: 'dietInfo'
      };

      for (const headerType of ['basic', 'clinical', 'diet']) {
        if (!state.headers[headerType]) continue;

        const emptyIndices = [];
        for (let i = 0; i < state.headers[headerType].length; i++) {
          if (isColumnEmpty(state.headers, state.rows, headerType, i)) {
            emptyIndices.push(i);
          }
        }

        // 그룹당 최소 1개 열을 남기도록 계산
        const maxRemovable = state.headers[headerType].length - 1;
        const indicesToRemove = emptyIndices.slice(0, maxRemovable);

        // 역순으로 삭제하여 인덱스 문제 방지
        for (let i = indicesToRemove.length - 1; i >= 0; i--) {
          const indexToRemove = indicesToRemove[i];
          state.headers[headerType].splice(indexToRemove, 1);
          state.rows.forEach((row) => {
            const rowKey = rowKeyMap[headerType];
            if (row[rowKey]) {
              row[rowKey].splice(indexToRemove, 1);
            }
          });
        }

        // 만약 모든 열이 삭제되어 0개가 될 상황이라면, 빈 열 1개를 추가하여 최소 1개 보장
        if (state.headers[headerType].length === 0) {
          state.headers[headerType].push('');
          state.rows.forEach((row) => {
            const rowKey = rowKeyMap[headerType];
            if (!row[rowKey]) row[rowKey] = [];
            row[rowKey].push('');
          });
        }
      }
    },
    FOCUS_NEXT_CELL(state, { rowIndex, columnIndex }) {
      state.nextCellToFocus = { rowIndex, columnIndex };
    },
    CLEAR_NEXT_CELL_FOCUS(state) {
      state.nextCellToFocus = null;
    },
    PASTE_DATA(state, { startRowIndex, startColIndex, data }) {
      const basicStartIndex = 2;
      const clinicalStartIndex =
        basicStartIndex + (state.headers.basic?.length || 0);
      
      // UI와 데이터 모델의 열 순서 동기화
      const individualExposureIndex = state.isIndividualExposureColumnVisible
        ? clinicalStartIndex + (state.headers.clinical?.length || 0)
        : -1;
      const onsetIndex =
        clinicalStartIndex +
        (state.headers.clinical?.length || 0) +
        (state.isIndividualExposureColumnVisible ? 1 : 0);
      const dietStartIndex = onsetIndex + 1;

      for (let i = 0; i < data.length; i++) {
        const rowData = data[i];
        const currentRowIndex = startRowIndex + i;
        if (currentRowIndex >= state.rows.length) {
          state.rows.push({
            isPatient: '',
            basicInfo: Array(state.headers.basic?.length || 0).fill(''),
            clinicalSymptoms: Array(state.headers.clinical?.length || 0).fill(
              ''
            ),
            symptomOnset: '',
            individualExposureTime: '',
            dietInfo: Array(state.headers.diet?.length || 0).fill('')
          });
        }
        const targetRow = state.rows[currentRowIndex];
        if (!targetRow) continue;
        let currentColumn = startColIndex;
        for (let j = 0; j < rowData.length; j++) {
          const cellValue = rowData[j] ?? '';
          if (currentColumn === 1) {
            targetRow.isPatient = cellValue;
          } else if (
            state.isIndividualExposureColumnVisible &&
            currentColumn === individualExposureIndex
          ) {
            targetRow.individualExposureTime = cellValue;
          } else if (currentColumn === onsetIndex) {
            targetRow.symptomOnset = cellValue;
          } else if (
            currentColumn >= basicStartIndex &&
            currentColumn < clinicalStartIndex
          ) {
            const idx = currentColumn - basicStartIndex;
            if (idx < (state.headers.basic?.length || 0)) {
              if (!targetRow.basicInfo) targetRow.basicInfo = [];
              while (targetRow.basicInfo.length <= idx)
                targetRow.basicInfo.push('');
              targetRow.basicInfo[idx] = cellValue;
            }
          } else if (
            currentColumn >= clinicalStartIndex &&
            currentColumn <
              (state.isIndividualExposureColumnVisible
                ? individualExposureIndex
                : onsetIndex)
          ) {
            const idx = currentColumn - clinicalStartIndex;
            if (idx < (state.headers.clinical?.length || 0)) {
              if (!targetRow.clinicalSymptoms) targetRow.clinicalSymptoms = [];
              while (targetRow.clinicalSymptoms.length <= idx)
                targetRow.clinicalSymptoms.push('');
              targetRow.clinicalSymptoms[idx] = cellValue;
            }
          } else if (currentColumn >= dietStartIndex) {
            const idx = currentColumn - dietStartIndex;
            if (idx < (state.headers.diet?.length || 0)) {
              if (!targetRow.dietInfo) targetRow.dietInfo = [];
              while (targetRow.dietInfo.length <= idx)
                targetRow.dietInfo.push('');
              targetRow.dietInfo[idx] = cellValue;
            }
          }
          currentColumn++;
        }
      }
    },
    DELETE_ROW(state, rowIndex) {
      if (rowIndex !== null && rowIndex >= 0 && rowIndex < state.rows.length) {
        state.rows.splice(rowIndex, 1);
        state.deletedRowIndex = rowIndex;
      }
    },
    DELETE_MULTIPLE_ROWS(state, { startRow, endRow }) {
      if (startRow !== null && startRow >= 0 && endRow >= startRow && endRow < state.rows.length) {
        const deleteCount = endRow - startRow + 1;
        state.rows.splice(startRow, deleteCount);
        state.deletedRowIndex = startRow; // 첫 번째 삭제된 행의 인덱스 저장
      }
    },
    DELETE_INDIVIDUAL_ROWS(state, { rows }) {
      if (!rows || rows.length === 0) return;
      
      // 내림차순으로 정렬하여 뒤에서부터 삭제 (인덱스 변경 방지)
      const sortedRows = [...rows].sort((a, b) => b - a);
      
      for (const rowIndex of sortedRows) {
        if (rowIndex !== null && rowIndex >= 0 && rowIndex < state.rows.length) {
          state.rows.splice(rowIndex, 1);
        }
      }
      
      // 첫 번째 삭제된 행의 인덱스 저장 (가장 작은 인덱스)
      if (rows.length > 0) {
        state.deletedRowIndex = Math.min(...rows);
      }
    },
    INSERT_ROW_AT(state, { index, count = 1 }) {
      // 새로운 빈 행 생성
      const newRows = Array(count).fill().map(() => ({
        isPatient: '',
        basicInfo: Array(state.headers.basic?.length || 0).fill(''),
        clinicalSymptoms: Array(state.headers.clinical?.length || 0).fill(''),
        symptomOnset: '',
        individualExposureTime: '',
        dietInfo: Array(state.headers.diet?.length || 0).fill('')
      }));
      
      // 지정된 위치에 행 삽입
      if (index >= 0 && index <= state.rows.length) {
        state.rows.splice(index, 0, ...newRows);
      }
    },
    CLEAR_DELETED_ROW_INDEX(state) {
      state.deletedRowIndex = null;
    },
    PASTE_HEADER_DATA(state, { startColIndex, headerType, data }) {
      if (!state.headers[headerType]) return;
      const basicStartIndex = 2;
      const clinicalStartIndex =
        basicStartIndex + (state.headers.basic?.length || 0);
      const dietStartIndex =
        clinicalStartIndex + (state.headers.clinical?.length || 0) + 1;
      let currentHeaderArrayIndex = -1;
      if (headerType === 'basic')
        currentHeaderArrayIndex = startColIndex - basicStartIndex;
      else if (headerType === 'clinical')
        currentHeaderArrayIndex = startColIndex - clinicalStartIndex;
      else if (headerType === 'diet')
        currentHeaderArrayIndex = startColIndex - dietStartIndex;
      if (currentHeaderArrayIndex < 0) return;
      for (let i = 0; i < data.length; i++) {
        const targetIndex = currentHeaderArrayIndex + i;
        if (
          targetIndex >= 0 &&
          targetIndex < state.headers[headerType].length
        ) {
          state.headers[headerType][targetIndex] = data[i] ?? '';
        }
      }
    },
    UPDATE_CELLS_BATCH(state, updates) {
      updates.forEach(({ rowIndex, key, value, cellIndex }) => {
        if (!state.rows[rowIndex]) return;
        if (cellIndex !== null && cellIndex !== undefined) {
          if (!state.rows[rowIndex][key]) state.rows[rowIndex][key] = [];
          while (state.rows[rowIndex][key].length <= cellIndex)
            state.rows[rowIndex][key].push('');
          state.rows[rowIndex][key][cellIndex] = value;
        } else {
          state.rows[rowIndex][key] = value;
        }
      });
    },

    // --- 유행곡선 탭 관련 Mutations 추가 ---
    SET_SYMPTOM_INTERVAL(state, value) {
      // 숫자로 변환하여 저장 (select의 value는 문자열일 수 있음)
      state.selectedSymptomInterval = Number(value);
    },
    SET_EXPOSURE_DATETIME(state, value) {
      state.exposureDateTime = value;
    },
    SET_INCUBATION_INTERVAL(state, value) {
      state.selectedIncubationInterval = value;
    },
    TOGGLE_INDIVIDUAL_EXPOSURE_COLUMN(state) {
      state.isIndividualExposureColumnVisible = !state.isIndividualExposureColumnVisible;
    },
    UPDATE_INDIVIDUAL_EXPOSURE_TIME(state, { rowIndex, value }) {
      if (state.rows[rowIndex]) {
        state.rows[rowIndex].individualExposureTime = value;
      }
    },
    SET_INDIVIDUAL_EXPOSURE_COLUMN_VISIBILITY(state, isVisible) {
      state.isIndividualExposureColumnVisible = isVisible;
    },

    // --- Excel Upload Mutations ---
    
    /**
     * 엑셀에서 읽어온 헤더로 전체 업데이트
     */
    UPDATE_HEADERS_FROM_EXCEL(state, headers) {
      if (!headers || typeof headers !== 'object') {
        console.error('Invalid headers format');
        return;
      }

      // 기본 구조 설정
      state.headers = {
        basic: headers.basic || [],
        clinical: headers.clinical || [],
        diet: headers.diet || []
      };

      // 기존 행들의 배열 크기를 새로운 헤더에 맞게 조정
      state.rows.forEach((row) => {
        // basicInfo 배열 조정
        if (!row.basicInfo) row.basicInfo = [];
        while (row.basicInfo.length < state.headers.basic.length) {
          row.basicInfo.push('');
        }
        row.basicInfo = row.basicInfo.slice(0, state.headers.basic.length);

        // clinicalSymptoms 배열 조정
        if (!row.clinicalSymptoms) row.clinicalSymptoms = [];
        while (row.clinicalSymptoms.length < state.headers.clinical.length) {
          row.clinicalSymptoms.push('');
        }
        row.clinicalSymptoms = row.clinicalSymptoms.slice(
          0,
          state.headers.clinical.length
        );

        // dietInfo 배열 조정
        if (!row.dietInfo) row.dietInfo = [];
        while (row.dietInfo.length < state.headers.diet.length) {
          row.dietInfo.push('');
        }
        row.dietInfo = row.dietInfo.slice(0, state.headers.diet.length);
      });
    },

    /**
     * 엑셀에서 읽어온 데이터로 행들 추가
     */
    ADD_ROWS_FROM_EXCEL(state, rows) {
      if (!rows || !Array.isArray(rows)) {
        console.error('Invalid rows format');
        return;
      }

      state.rows = rows;
    },

    // 행 데이터 삭제 (행은 유지, 데이터만 초기화)
    CLEAR_ROW_DATA(state, { rowIndex }) {
      if (rowIndex < 0 || rowIndex >= state.rows.length) return;
      
      const row = state.rows[rowIndex];
      if (!row) return;
      
      // 행의 모든 데이터를 초기값으로 설정
      row.isPatient = '';
      row.basicInfo = Array(state.headers.basic?.length || 0).fill('');
      row.clinicalSymptoms = Array(state.headers.clinical?.length || 0).fill('');
      row.symptomOnset = '';
      row.individualExposureTime = '';
      row.dietInfo = Array(state.headers.diet?.length || 0).fill('');
    },

    // 여러 행 데이터 삭제 (연속 범위)
    CLEAR_MULTIPLE_ROWS_DATA(state, { startRow, endRow }) {
      if (startRow < 0 || endRow >= state.rows.length || startRow > endRow) return;
      
      for (let i = startRow; i <= endRow; i++) {
        const row = state.rows[i];
        if (!row) continue;
        
        // 각 행의 데이터를 초기값으로 설정
        row.isPatient = '';
        row.basicInfo = Array(state.headers.basic?.length || 0).fill('');
        row.clinicalSymptoms = Array(state.headers.clinical?.length || 0).fill('');
        row.symptomOnset = '';
        row.individualExposureTime = '';
        row.dietInfo = Array(state.headers.diet?.length || 0).fill('');
      }
    },

    // 개별 선택된 행들 데이터 삭제
    CLEAR_INDIVIDUAL_ROWS_DATA(state, { rowIndices }) {
      if (!Array.isArray(rowIndices)) return;
      
      rowIndices.forEach(rowIndex => {
        if (rowIndex < 0 || rowIndex >= state.rows.length) return;
        
        const row = state.rows[rowIndex];
        if (!row) return;
        
        // 행의 모든 데이터를 초기값으로 설정
        row.isPatient = '';
        row.basicInfo = Array(state.headers.basic?.length || 0).fill('');
        row.clinicalSymptoms = Array(state.headers.clinical?.length || 0).fill('');
        row.symptomOnset = '';
        row.individualExposureTime = '';
        row.dietInfo = Array(state.headers.diet?.length || 0).fill('');
      });
    },

    /* ===== Validation mutations ===== */
    ADD_VALIDATION_ERROR(state, { rowIndex, colIndex, message }) {
      const key = `${rowIndex}_${colIndex}`;
      const newMap = new Map(state.validationState.errors);
      newMap.set(key, { message, timestamp: Date.now() });
      state.validationState.errors = newMap;
      state.validationState.version++;
      
      // 유효성 검사 오류가 변경되면 자동 저장
      if (window.storeBridge) {
        window.storeBridge.saveCurrentState();
      }
    },
    
    REMOVE_VALIDATION_ERROR(state, { rowIndex, colIndex }) {
      const key = `${rowIndex}_${colIndex}`;
      if (!state.validationState.errors.has(key)) {
        return;
      }
      const newMap = new Map(state.validationState.errors);
      newMap.delete(key);
      state.validationState.errors = newMap;
      state.validationState.version++;
      
      // 유효성 검사 오류가 변경되면 자동 저장
      if (window.storeBridge) {
        window.storeBridge.saveCurrentState();
      }
    },
    
    CLEAR_VALIDATION_ERRORS(state) {
      state.validationState.errors = new Map();
      state.validationState.version++;
      
      // 유효성 검사 오류가 변경되면 자동 저장
      if (window.storeBridge) {
        window.storeBridge.saveCurrentState();
      }
    },
    
    SET_VALIDATION_ERRORS(state, errors) {
      state.validationState.errors = errors;
      state.validationState.version++;
      
      // 유효성 검사 오류가 변경되면 자동 저장
      if (window.storeBridge) {
        window.storeBridge.saveCurrentState();
      }
    },
    SET_VALIDATION_VERSION(state, version) {
      state.validationState.version = version;
    }
  },
  actions: {
    // --- 기존 Actions (SAVE_HISTORY 호출 등 유지) ---
    loadInitialData({ commit }) {
      // 새로운 시스템에서는 StoreBridge를 통해 데이터 로드
      // 이 액션은 App.vue에서만 호출되므로 기본 상태로 설정
      const initialState = createInitialState();
      commit('SET_INITIAL_DATA', initialState);
      commit('SET_INDIVIDUAL_EXPOSURE_COLUMN_VISIBILITY', false);
    },
    addRows({ commit }, count) {
      commit('ADD_ROWS', count);
    },
    addColumn({ commit }, type) {
      commit('ADD_COLUMN', type);
    },
    addMultipleColumns({ commit }, { type, count }) {
      commit('ADD_MULTIPLE_COLUMNS', { type, count });
    },
    insertColumnAt({ commit }, { type, index }) {
      commit('INSERT_COLUMN_AT', { type, index });
    },
    insertMultipleColumnsAt({ commit }, { type, count, index }) {
      commit('INSERT_MULTIPLE_COLUMNS_AT', { type, count, index });
    },
    deleteColumn({ commit }, type) {
      commit('DELETE_COLUMN', type);
    },
    deleteColumnByIndex({ commit }, { type, index }) {
      commit('DELETE_COLUMN_BY_INDEX', { type, index });
    },
    deleteMultipleColumnsByIndex({ commit }, { columns }) {
      commit('DELETE_MULTIPLE_COLUMNS_BY_INDEX', { columns });
    },
    clearColumnData({ commit }, { type, index }) {
      commit('CLEAR_COLUMN_DATA', { type, index });
    },
    clearMultipleColumnsData({ commit }, { columns }) {
      commit('CLEAR_MULTIPLE_COLUMNS_DATA', { columns });
    },
    clearFixedColumnData({ commit }, { type }) {
      commit('CLEAR_FIXED_COLUMN_DATA', { type });
    },
    updateHeader({ commit }, payload) {
      commit('UPDATE_HEADER', payload);
    },
    updateCell({ commit }, payload) {
      commit('UPDATE_CELL', payload);
    },
    handleEnter(context, { rowIndex, key, cellIndex }) {
      const getColumnIndex = (k, cIdx) => {
        switch (k) {
        case 'isPatient':
          return 1;
        case 'basicInfo':
          return context.getters.basicInfoStartIndex + cIdx;
        case 'clinicalSymptoms':
          return context.getters.clinicalSymptomsStartIndex + cIdx;
        case 'symptomOnset':
          return context.getters.symptomOnsetStartIndex;
        case 'individualExposureTime':
          return context.getters.individualExposureTimeStartIndex;
        case 'dietInfo':
          return context.getters.dietInfoStartIndex + cIdx;
        default:
          return -1;
        }
      };
      const currentColumnIndex = getColumnIndex(key, cellIndex);
      if (currentColumnIndex === -1) return;
      const nextRowIndex = rowIndex + 1;
      if (nextRowIndex < context.state.rows.length) {
        context.commit('FOCUS_NEXT_CELL', {
          rowIndex: nextRowIndex,
          columnIndex: currentColumnIndex
        });
      } else {
        context.dispatch('addRows', 1).then(() => {
          setTimeout(() => {
            context.commit('FOCUS_NEXT_CELL', {
              rowIndex: nextRowIndex,
              columnIndex: currentColumnIndex
            });
          }, 0);
        });
      }
    },
    deleteEmptyRows({ commit }) {
      commit('DELETE_EMPTY_ROWS');
    },
    deleteEmptyColumns({ commit }) {
      commit('DELETE_EMPTY_COLUMNS');
    },
    resetSheet({ commit }) {
      const { headers, rows } = createInitialState();
      commit('SET_INITIAL_DATA', { headers, rows });
    },
    pasteData({ commit }, payload) {
      commit('PASTE_DATA', payload);
    },
    deleteRow({ commit }, rowIndex) {
      commit('DELETE_ROW', rowIndex);
      commit('CLEAR_DELETED_ROW_INDEX');
    },
    deleteMultipleRows({ commit }, { startRow, endRow }) {
      commit('DELETE_MULTIPLE_ROWS', { startRow, endRow });
      commit('CLEAR_DELETED_ROW_INDEX');
    },
    deleteIndividualRows({ commit }, { rows }) {
      commit('DELETE_INDIVIDUAL_ROWS', { rows });
      commit('CLEAR_DELETED_ROW_INDEX');
    },
    insertRowAt({ commit }, { index, count = 1 }) {
      commit('INSERT_ROW_AT', { index, count });
    },
    pasteHeaderData({ commit }, payload) {
      commit('PASTE_HEADER_DATA', payload);
    },
    updateCellsBatch({ commit }, updates) {
      commit('UPDATE_CELLS_BATCH', updates);
    },


    // --- 유행곡선 탭 관련 Actions 추가 ---
    updateSymptomInterval({ commit }, value) {
      // 이 설정 변경은 Undo/Redo 대상이 아님
      commit('SET_SYMPTOM_INTERVAL', value);
      // 이 설정값을 localStorage에 저장할 필요가 있다면 여기에 로직 추가
      // 예: storage.save({...state, selectedSymptomInterval: value }); (save 함수 수정 필요)
    },
    updateExposureDateTime({ commit }, value) {
      commit('SET_EXPOSURE_DATETIME', value);
      // 필요하다면 localStorage 저장 로직 추가
    },
    updateIncubationInterval({ commit }, value) {
      commit('SET_INCUBATION_INTERVAL', value);
      // 필요하다면 localStorage 저장 로직 추가
    },
    toggleIndividualExposureColumn({ commit }) {
      commit('TOGGLE_INDIVIDUAL_EXPOSURE_COLUMN');
      // 참고: 이 액션은 UI 표시 여부만 바꾸므로 히스토리 저장 불필요
    },
    updateIndividualExposureTime({ commit }, { rowIndex, value }) {
      commit('UPDATE_INDIVIDUAL_EXPOSURE_TIME', { rowIndex, value });
    },
    setIndividualExposureColumnVisibility({ commit }, isVisible) {
      commit('SET_INDIVIDUAL_EXPOSURE_COLUMN_VISIBILITY', isVisible);
    },

    // --- Excel Upload Actions ---
    
    /**
     * 엑셀에서 읽어온 헤더로 업데이트
     */
    updateHeadersFromExcel({ commit }, headers) {
      // 새 헤더로 업데이트
      commit('UPDATE_HEADERS_FROM_EXCEL', headers);
    },

    /**
     * 엑셀에서 읽어온 데이터로 행 추가
     */
    addRowsFromExcel({ commit }, rows) {
      commit('ADD_ROWS_FROM_EXCEL', rows);
    },

    /**
     * 헤더 배치 업데이트 (엑셀 업로드용)
     */
    updateHeadersBatch({ commit }, headerUpdates) {
      headerUpdates.forEach(update => {
        commit('UPDATE_HEADER', update);
      });
    },

    // 행 데이터 삭제 (행은 유지, 데이터만 초기화)
    clearRowData({ commit }, { rowIndex }) {
      commit('CLEAR_ROW_DATA', { rowIndex });
    },

    // 여러 행 데이터 삭제 (연속 범위)
    clearMultipleRowsData({ commit }, { startRow, endRow }) {
      commit('CLEAR_MULTIPLE_ROWS_DATA', { startRow, endRow });
    },

    // 개별 선택된 행들 데이터 삭제
    clearIndividualRowsData({ commit }, { rowIndices }) {
      commit('CLEAR_INDIVIDUAL_ROWS_DATA', { rowIndices });
    }
  }
});

export default store;
