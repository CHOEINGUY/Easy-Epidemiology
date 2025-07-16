import {
  COL_TYPE_BASIC,
  COL_TYPE_SERIAL,
  COL_TYPE_ONSET,
  COL_TYPE_IS_PATIENT,
  COL_IDX_SERIAL
} from '../constants/index.js';

/**
 * 우클릭 이벤트를 처리하고 컨텍스트 메뉴를 표시합니다.
 * @param {MouseEvent} event
 * @param {number} virtualRowIndex - 우클릭된 행의 가상 인덱스 (-1은 헤더)
 * @param {number} colIndex - 우클릭된 열 인덱스
 * @param {object} context - 핸들러 컨텍스트
 */
export function handleContextMenu(event, virtualRowIndex, colIndex, context) {
  event.preventDefault();

  const { getOriginalIndex, selectionSystem, showContextMenu, allColumnsMeta } = context;
  const originalRowIndex = virtualRowIndex >= 0 ? getOriginalIndex(virtualRowIndex) : virtualRowIndex;

  // 우클릭 시 해당 셀/행을 먼저 선택 (단, 드래그 중이 아닐 때)
  if (!selectionSystem.state.isDragging) {
    // 개별 선택 상태 확인
    const isRowIndividuallySelected = selectionSystem.state.selectedRowsIndividual.has(originalRowIndex);
    const isCellIndividuallySelected = selectionSystem.state.selectedCellsIndividual.has(`${originalRowIndex}_${colIndex}`);
    
    // 범위 선택 상태 확인
    const { selectedRange } = selectionSystem.state;
    const isClickInsideSelection = 
      selectedRange.start.rowIndex !== null &&
      originalRowIndex >= selectedRange.start.rowIndex &&
      originalRowIndex <= selectedRange.end.rowIndex &&
      colIndex >= selectedRange.start.colIndex &&
      colIndex <= selectedRange.end.colIndex;

    // 클릭이 기존 선택(개별 또는 범위) 밖에서 발생한 경우에만 선택을 업데이트합니다.
    if (!isClickInsideSelection && !isRowIndividuallySelected && !isCellIndividuallySelected) {
      // 개별 선택 상태 초기화
      selectionSystem.clearIndividualSelections();
      
      if (colIndex === COL_IDX_SERIAL && originalRowIndex >= 0) {
        // 연번(serial) 컬럼을 우클릭하면 행 전체를 선택합니다.
        selectionSystem.selectRow(originalRowIndex, allColumnsMeta);
      } else {
        // 그 외의 셀은 해당 셀만 선택합니다.
        selectionSystem.selectCell(originalRowIndex, colIndex);
      }
    }
  }

  const menuItems = getMenuItemsForContext(originalRowIndex, colIndex, selectionSystem.state, allColumnsMeta, context);
  const targetInfo = { rowIndex: originalRowIndex, colIndex };

  console.log('[ContextMenu] 메뉴 아이템 생성:', {
    originalRowIndex,
    colIndex,
    menuItems: menuItems.map(item => ({ label: item.label, action: item.action })),
    targetInfo
  });

  if (menuItems.length > 0) {
    showContextMenu(event.clientX, event.clientY, menuItems, targetInfo);
  }
}

/**
 * 현재 컨텍스트에 맞는 메뉴 아이템 배열을 반환합니다.
 * 개별 선택(Ctrl+Click) 상태를 고려하여 메뉴 아이템을 생성합니다.
 */
function getMenuItemsForContext(rowIndex, colIndex, selectionState, allColumnsMeta, context) {
  const { selectedRange, selectedRowsIndividual, selectedCellsIndividual } = selectionState;
  const column = allColumnsMeta.find(c => c.colIndex === colIndex);

  // 개별 선택 개수 계산
  const individualRowCount = selectedRowsIndividual.size;
  const individualCellCount = selectedCellsIndividual.size;

  // 범위 선택 개수 계산
  const rangeRowCount = selectedRange.start.rowIndex !== null ? Math.abs(selectedRange.end.rowIndex - selectedRange.start.rowIndex) + 1 : 0;
  const rangeColCount = selectedRange.start.colIndex !== null ? Math.abs(selectedRange.end.colIndex - selectedRange.start.colIndex) + 1 : 0;

  // 우선순위: 개별 선택 > 범위 선택
  const effectiveRowCount = individualRowCount > 0 ? individualRowCount : rangeRowCount;
  const effectiveColCount = individualCellCount > 0 ? getUniqueColumnCount(selectedCellsIndividual) : rangeColCount;
  
  const isMultiRow = effectiveRowCount > 1;
  const isMultiCol = effectiveColCount > 1;

  const menuItems = [];

  // --- 셀 데이터 삭제 메뉴 (맨 위에 추가) ---
  // 데이터 영역 셀을 클릭했을 때만 셀 데이터 삭제 메뉴를 추가합니다.
  if (rowIndex >= 0 && colIndex > COL_IDX_SERIAL) {
    // 개별 셀 선택이 있는 경우 선택된 셀 개수 표시
    const cellCount = individualCellCount > 0 ? individualCellCount : 1;
    const label = cellCount > 1 ? `셀 데이터 삭제 (${cellCount}개)` : '셀 데이터 삭제';
    
    menuItems.push(
      { label, action: 'clear-cell-data', icon: '×' }
    );
    menuItems.push({ type: 'separator' });
  }

  // --- 행 관련 메뉴 ---
  // 연번 열을 클릭했거나, 개별 행 선택이 있거나, 데이터 영역을 클릭했을 때 행 메뉴를 추가합니다.
  if (colIndex === COL_IDX_SERIAL || individualRowCount > 0 || rowIndex >= 0) {
    menuItems.push(
      { label: `위에 행 삽입${isMultiRow ? ` (${effectiveRowCount}개)` : ''}`, action: 'add-row-above', icon: '↑' },
      { label: `아래에 행 삽입${isMultiRow ? ` (${effectiveRowCount}개)` : ''}`, action: 'add-row-below', icon: '↓' },
      { type: 'separator' },
      { label: `행 데이터 지우기${isMultiRow ? ` (${effectiveRowCount}개)` : ''}`, action: 'clear-rows-data', icon: '×' },
      { label: `행 삭제${isMultiRow ? ` (${effectiveRowCount}개)` : ''}`, action: 'delete-rows', icon: '−', danger: true }
    );
  }
  
  // --- 열 관련 메뉴 ---
  // 헤더를 클릭했거나, 개별 셀 선택이 있거나, 데이터 영역(연번 제외)을 클릭했을 때 열 메뉴를 추가합니다.
  if (rowIndex < 0 || individualCellCount > 0 || (rowIndex >= 0 && colIndex > COL_IDX_SERIAL)) {
    // 이전에 행 메뉴가 추가되었다면 구분선을 추가합니다.
    if (menuItems.length > 0) {
      menuItems.push({ type: 'separator' });
    }

    // 개별 셀 선택이 있는 경우 해당 셀들의 열 타입을 확인
    const targetColumnTypes = new Set();
    if (individualCellCount > 0) {
      selectedCellsIndividual.forEach(cellKey => {
        const [, colStr] = cellKey.split('_');
        const col = allColumnsMeta.find(c => c.colIndex === parseInt(colStr, 10));
        if (col) targetColumnTypes.add(col.type);
      });
    } else if (column) {
      targetColumnTypes.add(column.type);
    }

    // 1. 삭제 가능한 열 (기본, 임상, 식단)
    const hasDeletableColumns = Array.from(targetColumnTypes).some(type => 
      [COL_TYPE_BASIC, 'clinicalSymptoms', 'dietInfo'].includes(type)
    );

    if (hasDeletableColumns) {
      menuItems.push(
        { label: `왼쪽에 열 삽입${isMultiCol ? ` (${effectiveColCount}개)` : ''}`, action: 'add-col-left', icon: '←' },
        { label: `오른쪽에 열 삽입${isMultiCol ? ` (${effectiveColCount}개)` : ''}`, action: 'add-col-right', icon: '→' },
        { type: 'separator' },
        { label: `열 데이터 삭제${isMultiCol ? ` (${effectiveColCount}개)` : ''}`, action: 'clear-cols-data', icon: '×' }
      );
      
      // 열 삭제가 가능한 경우에만 메뉴 아이템을 추가합니다.
      if (areSelectedColumnsDeletable(selectionState, allColumnsMeta)) {
        menuItems.push({ 
          label: `열 삭제${isMultiCol ? ` (${effectiveColCount}개)` : ''}`, 
          action: 'delete-cols', 
          icon: '−', 
          danger: true 
        });
      }
    } 
    // 2. 고정 열 (환자여부, 확진자여부, 증상발현시간 등) - 데이터 지우기만 가능
    else if (Array.from(targetColumnTypes).some(type => 
      [COL_TYPE_IS_PATIENT, 'isConfirmedCase', COL_TYPE_ONSET, 'individualExposureTime'].includes(type)
    )) {
      menuItems.push(
        { label: `열 데이터 삭제${isMultiCol ? ` (${effectiveColCount}개)` : ''}`, action: 'clear-cols-data', icon: '×' }
      );
    }
    // 3. 연번 헤더
    else if (Array.from(targetColumnTypes).includes(COL_TYPE_SERIAL)) {
      menuItems.push(
        { label: '빈 행 삭제', action: 'delete-empty-rows', icon: '×' }
      );
    }
  }

  // --- 필터 메뉴 (헤더 클릭 시) ---
  if (rowIndex < 0) {
    // 환자여부 컬럼 필터 메뉴
    if (column && column.type === COL_TYPE_IS_PATIENT) {
      const uniqueValuesWithCounts = getUniqueValuesForColumn(colIndex, context);
      
      menuItems.push({ type: 'separator' });
      
      // 고유한 값들에 대한 체크박스 추가 (개수 포함)
      uniqueValuesWithCounts.forEach(({ value, count }) => {
        const displayValue = value === '' ? '빈 셀' : value;
        const action = `filter-patient-${value === '' ? 'empty' : value}`;
        menuItems.push({
          label: `${displayValue} (${count})`,
          action,
          type: 'checkbox',
          checked: isFilterActive(colIndex, value === '' ? 'empty' : value, context)
        });
      });
    }
    
    // 확진여부 컬럼 필터 메뉴
    if (column && column.type === 'isConfirmedCase') {
      const uniqueValuesWithCounts = getUniqueValuesForColumn(colIndex, context);
      
      menuItems.push({ type: 'separator' });
      
      // 고유한 값들에 대한 체크박스 추가 (개수 포함)
      uniqueValuesWithCounts.forEach(({ value, count }) => {
        const displayValue = value === '' ? '빈 셀' : value;
        const action = `filter-confirmed-${value === '' ? 'empty' : value}`;
        menuItems.push({
          label: `${displayValue} (${count})`,
          action,
          type: 'checkbox',
          checked: isFilterActive(colIndex, value === '' ? 'empty' : value, context)
        });
      });
    }
    
    // 임상증상 컬럼 필터 메뉴
    if (column && column.type === 'clinicalSymptoms') {
      const uniqueValuesWithCounts = getUniqueValuesForColumn(colIndex, context);
      
      menuItems.push({ type: 'separator' });
      
      // 고유한 값들에 대한 체크박스 추가 (개수 포함)
      uniqueValuesWithCounts.forEach(({ value, count }) => {
        const displayValue = value === '' ? '빈 셀' : value;
        const action = `filter-clinical-${value === '' ? 'empty' : value}`;
        menuItems.push({
          label: `${displayValue} (${count})`,
          action,
          type: 'checkbox',
          checked: isFilterActive(colIndex, value === '' ? 'empty' : value, context)
        });
      });
    }
    
    // 식단 컬럼 필터 메뉴
    if (column && column.type === 'dietInfo') {
      const uniqueValuesWithCounts = getUniqueValuesForColumn(colIndex, context);
      
      menuItems.push({ type: 'separator' });
      
      // 고유한 값들에 대한 체크박스 추가 (개수 포함)
      uniqueValuesWithCounts.forEach(({ value, count }) => {
        const displayValue = value === '' ? '빈 셀' : value;
        const action = `filter-diet-${value === '' ? 'empty' : value}`;
        menuItems.push({
          label: `${displayValue} (${count})`,
          action,
          type: 'checkbox',
          checked: isFilterActive(colIndex, value === '' ? 'empty' : value, context)
        });
      });
    }
    
    // 기본정보 컬럼 필터 메뉴
    if (column && column.type === COL_TYPE_BASIC) {
      // 해당 컬럼의 고유한 값들과 개수를 찾아서 메뉴 아이템으로 추가
      const uniqueValuesWithCounts = getUniqueValuesForColumn(colIndex, context);
      
      menuItems.push({ type: 'separator' });
      
      // 고유한 값들에 대한 체크박스 추가 (개수 포함)
      uniqueValuesWithCounts.forEach(({ value, count }) => {
        const displayValue = value === '' ? '빈 셀' : value;
        const action = `filter-basic-${value === '' ? 'empty' : value}`;
        menuItems.push({
          label: `${displayValue} (${count})`,
          action,
          type: 'checkbox',
          checked: isFilterActive(colIndex, value === '' ? 'empty' : value, context)
        });
      });
    }
    
    // 날짜/시간 컬럼 필터 메뉴 (증상발현시간, 개별노출시간)
    if (column && (column.type === 'symptomOnset' || column.type === 'individualExposureTime')) {
      const uniqueDatesWithCounts = getUniqueDatesForColumn(colIndex, context);
      
      menuItems.push({ type: 'separator' });
      
      // 고유한 날짜들에 대한 체크박스 추가 (개수 포함)
      uniqueDatesWithCounts.forEach(({ date, count }) => {
        const displayDate = date === '' ? '빈 셀' : date;
        const action = `filter-datetime-${date === '' ? 'empty' : date}`;
        menuItems.push({
          label: `${displayDate} (${count})`,
          action,
          type: 'checkbox',
          checked: isFilterActive(colIndex, date === '' ? 'empty' : date, context)
        });
      });
    }
    
    // 필터가 적용된 상태에서만 "모든 필터 해제" 옵션 추가
    if (context.storeBridge && context.storeBridge.filterState.isFiltered) {
      menuItems.push(
        { type: 'separator' },
        { label: '모든 필터 해제', action: 'clear-all-filters', icon: '×' }
      );
    }
  }

  return menuItems;
}

/**
 * 개별 선택된 셀들에서 고유한 열의 개수를 계산합니다.
 * @param {Set} selectedCellsIndividual - 개별 선택된 셀들
 * @returns {number}
 */
function getUniqueColumnCount(selectedCellsIndividual) {
  const uniqueColumns = new Set();
  selectedCellsIndividual.forEach(cellKey => {
    const [, colStr] = cellKey.split('_');
    uniqueColumns.add(parseInt(colStr, 10));
  });
  return uniqueColumns.size;
}

/**
 * 선택된 열들(개별 또는 범위)이 삭제 가능한지 확인합니다.
 * @param {object} selectionState - 선택 상태
 * @param {Array} allColumnsMeta - 전체 열 메타데이터
 * @returns {boolean}
 */
function areSelectedColumnsDeletable(selectionState, allColumnsMeta) {
  const { selectedRange, selectedCellsIndividual } = selectionState;
  
  // 1. 각 그룹별 전체 열의 개수를 미리 계산합니다.
  const totalCounts = allColumnsMeta.reduce((acc, col) => {
    if ([COL_TYPE_BASIC, 'clinicalSymptoms', 'dietInfo'].includes(col.type)) {
      if (!acc[col.type]) acc[col.type] = 0;
      acc[col.type]++;
    }
    return acc;
  }, {});

  // 2. 선택된 열들의 개수를 그룹별로 계산합니다.
  const selectedCounts = {};
  
  if (selectedCellsIndividual.size > 0) {
    // 개별 선택된 셀들의 열 타입별 개수 계산
    selectedCellsIndividual.forEach(cellKey => {
      const [, colStr] = cellKey.split('_');
      const colIndex = parseInt(colStr, 10);
      const meta = allColumnsMeta.find(c => c.colIndex === colIndex);
      if (meta && [COL_TYPE_BASIC, 'clinicalSymptoms', 'dietInfo'].includes(meta.type)) {
        if (!selectedCounts[meta.type]) selectedCounts[meta.type] = 0;
        selectedCounts[meta.type]++;
      }
    });
  } else if (selectedRange.start.colIndex !== null) {
    // 범위 선택된 열들의 타입별 개수 계산
    for (let i = selectedRange.start.colIndex; i <= selectedRange.end.colIndex; i++) {
      const meta = allColumnsMeta.find(c => c.colIndex === i);
      if (meta && [COL_TYPE_BASIC, 'clinicalSymptoms', 'dietInfo'].includes(meta.type)) {
        if (!selectedCounts[meta.type]) selectedCounts[meta.type] = 0;
        selectedCounts[meta.type]++;
      }
    }
  }

  // 3. 선택된 그룹들 중, 삭제를 수행해도 최소 1개의 열이 남는 그룹이 하나라도 있는지 확인합니다.
  for (const type in selectedCounts) {
    if (totalCounts[type] - selectedCounts[type] >= 1) {
      // 이 그룹은 삭제 가능한 열이 있으므로, 메뉴를 표시해도 됩니다.
      return true;
    }
  }

  // 삭제 가능한 열이 하나도 없는 경우
  return false;
}

/**
 * 필터가 활성화되어 있는지 확인합니다.
 * @param {number} colIndex - 컬럼 인덱스
 * @param {string} value - 필터 값
 * @param {object} context - 핸들러 컨텍스트
 * @returns {boolean}
 */
function isFilterActive(colIndex, value, context) {
  if (!context.storeBridge || !context.storeBridge.filterState) {
    // 필터 상태가 없으면 모든 값이 기본적으로 체크 해제됨 (포함 방식)
    return false;
  }
  
  const filter = context.storeBridge.filterState.activeFilters.get(colIndex);
  if (!filter) {
    // 필터가 없으면 모든 값이 기본적으로 체크 해제됨 (포함 방식)
    return false;
  }
  
  // 모든 열이 포함 방식으로 동작: 체크된 값들만 보이도록
  // 체크박스가 체크되어 있으면 true, 해제되어 있으면 false
  return filter.values.includes(value);
}

/**
 * 특정 컬럼의 고유한 값들과 각 값의 개수를 반환합니다.
 * 필터가 적용된 경우 필터링된 데이터를 기준으로 계산합니다.
 * @param {number} colIndex - 컬럼 인덱스
 * @param {object} context - 핸들러 컨텍스트
 * @returns {Array} 고유한 값들과 개수의 배열 [{value, count}, ...]
 */
function getUniqueValuesForColumn(colIndex, context) {
  const { rows, filteredRows, allColumnsMeta } = context;
  const columnMeta = allColumnsMeta.find(c => c.colIndex === colIndex);
  
  console.log('[Filter] getUniqueValuesForColumn 호출:', {
    colIndex,
    columnMeta,
    rowsType: typeof rows,
    rowsValueType: typeof rows?.value,
    rowsLength: rows?.value?.length || rows?.length,
    filteredRowsType: typeof filteredRows,
    filteredRowsValueType: typeof filteredRows?.value,
    filteredRowsLength: filteredRows?.value?.length || filteredRows?.length,
    isFiltered: context.storeBridge?.filterState?.isFiltered
  });
  
  if (!columnMeta || !columnMeta.dataKey) {
    console.log('[Filter] 컬럼 메타데이터 조건 불충족:', {
      hasColumnMeta: !!columnMeta,
      dataKey: columnMeta?.dataKey
    });
    return [];
  }

  // 컨텍스트 메뉴 로직:
  // 1. 현재 컬럼의 필터가 있는 경우: 전체 데이터 기준으로 모든 값 표시
  // 2. 현재 컬럼의 필터가 없는 경우: 다른 컬럼의 필터로 인해 보이는 행들 기준으로 표시
  const allData = rows?.value || rows;
  const filteredData = filteredRows?.value || filteredRows;
  const isFiltered = context.storeBridge?.filterState?.isFiltered;
  const currentColumnFilter = context.storeBridge?.filterState?.activeFilters?.get(colIndex);
  
  console.log('[Filter] 컨텍스트 메뉴 데이터 결정:', {
    isFiltered,
    allDataLength: allData?.length,
    filteredDataLength: filteredData?.length,
    currentColIndex: colIndex,
    hasCurrentColumnFilter: !!currentColumnFilter
  });

  if (!allData || !Array.isArray(allData)) {
    console.log('[Filter] 전체 데이터가 없거나 배열이 아님:', allData);
    return [];
  }

  // 데이터 소스 결정
  const dataToUse = currentColumnFilter ? allData : (isFiltered ? filteredData : allData);
  
  console.log('[Filter] 사용할 데이터 소스:', {
    currentColumnFilter: !!currentColumnFilter,
    dataSource: currentColumnFilter ? 'allData' : (isFiltered ? 'filteredData' : 'allData'),
    dataLength: dataToUse?.length
  });

  if (!dataToUse || !Array.isArray(dataToUse)) {
    console.log('[Filter] 사용할 데이터가 없거나 배열이 아님:', dataToUse);
    return [];
  }

  // 선택된 데이터 소스에서 고유한 값들과 개수 계산
  const valueCounts = new Map();

  dataToUse.forEach((row) => {
    let cellValue = '';
    
    if (columnMeta.cellIndex !== null && columnMeta.cellIndex !== undefined) {
      // 배열 기반 컬럼 (기본정보, 임상증상, 식단)
      if (row[columnMeta.dataKey] && Array.isArray(row[columnMeta.dataKey])) {
        cellValue = String(row[columnMeta.dataKey][columnMeta.cellIndex] ?? '');
      }
    } else {
      // 단일 값 컬럼 (환자여부, 확진여부, 증상발현시간, 개별노출시간)
      cellValue = String(row[columnMeta.dataKey] ?? '');
    }

    // 빈 값 정규화
    if (cellValue === 'null' || cellValue === 'undefined' || cellValue === '') {
      cellValue = '';
    }

    valueCounts.set(cellValue, (valueCounts.get(cellValue) || 0) + 1);
  });

  // 결과 배열 생성
  const result = Array.from(valueCounts.entries())
    .map(([value, count]) => ({ 
      value, 
      count  // 선택된 데이터 소스에서의 개수
    }));

  // 오름차순으로 정렬
  result.sort((a, b) => {
    // 빈 값은 맨 뒤로
    if (a.value === '' && b.value !== '') return 1;
    if (a.value !== '' && b.value === '') return -1;
    
    // 숫자인 경우 숫자 비교
    const aNum = parseFloat(a.value);
    const bNum = parseFloat(b.value);
    if (!isNaN(aNum) && !isNaN(bNum)) {
      return aNum - bNum;
    }
    
    // 문자열인 경우 문자열 비교 (오름차순)
    return a.value.localeCompare(b.value);
  });

  console.log('[Filter] 고유한 값들 계산 완료:', {
    colIndex,
    columnType: columnMeta.type,
    result: result.map(r => `${r.value}(${r.count})`).join(', ')
  });

  return result;
}

/**
 * 특정 날짜/시간 컬럼의 고유한 날짜들과 각 날짜의 개수를 반환합니다.
 * 날짜 부분만 추출하여 그룹화합니다 (시간 제거).
 * @param {number} colIndex - 컬럼 인덱스
 * @param {object} context - 핸들러 컨텍스트
 * @returns {Array} 고유한 날짜들과 개수의 배열 [{date, count}, ...]
 */
function getUniqueDatesForColumn(colIndex, context) {
  const { rows, filteredRows, allColumnsMeta } = context;
  const columnMeta = allColumnsMeta.find(c => c.colIndex === colIndex);
  
  console.log('[Filter] getUniqueDatesForColumn 호출:', {
    colIndex,
    columnMeta,
    rowsType: typeof rows,
    rowsValueType: typeof rows?.value,
    rowsLength: rows?.value?.length || rows?.length,
    filteredRowsType: typeof filteredRows,
    filteredRowsValueType: typeof filteredRows?.value,
    filteredRowsLength: filteredRows?.value?.length || filteredRows?.length,
    isFiltered: context.storeBridge?.filterState?.isFiltered
  });
  
  if (!columnMeta || !columnMeta.dataKey) {
    console.log('[Filter] 날짜 컬럼 메타데이터 조건 불충족:', {
      hasColumnMeta: !!columnMeta,
      dataKey: columnMeta?.dataKey
    });
    return [];
  }

  // 컨텍스트 메뉴 로직:
  // 1. 현재 컬럼의 필터가 있는 경우: 전체 데이터 기준으로 모든 날짜 표시
  // 2. 현재 컬럼의 필터가 없는 경우: 다른 컬럼의 필터로 인해 보이는 행들 기준으로 표시
  const allData = rows?.value || rows;
  const filteredData = filteredRows?.value || filteredRows;
  const isFiltered = context.storeBridge?.filterState?.isFiltered;
  const currentColumnFilter = context.storeBridge?.filterState?.activeFilters?.get(colIndex);
  
  console.log('[Filter] 날짜 컨텍스트 메뉴 데이터 결정:', {
    isFiltered,
    allDataLength: allData?.length,
    filteredDataLength: filteredData?.length,
    currentColIndex: colIndex,
    hasCurrentColumnFilter: !!currentColumnFilter
  });

  if (!allData || !Array.isArray(allData)) {
    console.log('[Filter] 전체 데이터가 없거나 배열이 아님:', allData);
    return [];
  }

  // 데이터 소스 결정
  const dataToUse = currentColumnFilter ? allData : (isFiltered ? filteredData : allData);
  
  console.log('[Filter] 사용할 날짜 데이터 소스:', {
    currentColumnFilter: !!currentColumnFilter,
    dataSource: currentColumnFilter ? 'allData' : (isFiltered ? 'filteredData' : 'allData'),
    dataLength: dataToUse?.length
  });

  if (!dataToUse || !Array.isArray(dataToUse)) {
    console.log('[Filter] 사용할 날짜 데이터가 없거나 배열이 아님:', dataToUse);
    return [];
  }

  // 날짜 부분 추출 함수
  const extractDatePart = (dateTimeString) => {
    if (!dateTimeString || dateTimeString === '') return '';
    
    // yyyy-mm-dd hh:mm 형식에서 날짜 부분만 추출
    const dateMatch = dateTimeString.match(/^(\d{4}-\d{2}-\d{2})/);
    if (dateMatch) {
      return dateMatch[1]; // yyyy-mm-dd 부분만 반환
    }
    
    // 다른 형식도 시도 (yyyy/mm/dd 등)
    const altDateMatch = dateTimeString.match(/^(\d{4}[/-]\d{2}[/-]\d{2})/);
    if (altDateMatch) {
      // yyyy/mm/dd를 yyyy-mm-dd로 변환
      return altDateMatch[1].replace(/[/]/g, '-');
    }
    
    return dateTimeString; // 매칭되지 않으면 원본 반환
  };

  // 선택된 데이터 소스에서 고유한 날짜들과 개수 계산
  const dateCounts = new Map();

  dataToUse.forEach((row) => {
    const cellValue = String(row[columnMeta.dataKey] ?? '');
    
    // 빈 값 정규화
    if (cellValue === 'null' || cellValue === 'undefined' || cellValue === '') {
      dateCounts.set('', (dateCounts.get('') || 0) + 1);
      return;
    }

    // 날짜 부분만 추출
    const datePart = extractDatePart(cellValue);
    dateCounts.set(datePart, (dateCounts.get(datePart) || 0) + 1);
  });

  // 결과 배열 생성
  const result = Array.from(dateCounts.entries())
    .map(([date, count]) => ({ 
      date, 
      count  // 선택된 데이터 소스에서의 개수
    }));

  // 날짜 순으로 정렬 (빈 값은 맨 뒤로)
  result.sort((a, b) => {
    // 빈 값은 맨 뒤로
    if (a.date === '' && b.date !== '') return 1;
    if (a.date !== '' && b.date === '') return -1;
    
    // 날짜 비교 (yyyy-mm-dd 형식이므로 문자열 비교로도 정렬됨)
    return a.date.localeCompare(b.date);
  });

  console.log('[Filter] 고유한 날짜들 계산 완료:', {
    colIndex,
    columnType: columnMeta.type,
    result: result.map(r => `${r.date}(${r.count})`).join(', ')
  });

  return result;
} 