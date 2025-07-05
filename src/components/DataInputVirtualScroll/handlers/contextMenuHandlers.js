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

  const menuItems = getMenuItemsForContext(originalRowIndex, colIndex, selectionSystem.state, allColumnsMeta);
  const targetInfo = { rowIndex: originalRowIndex, colIndex };

  if (menuItems.length > 0) {
    showContextMenu(event.clientX, event.clientY, menuItems, targetInfo);
  }
}

/**
 * 현재 컨텍스트에 맞는 메뉴 아이템 배열을 반환합니다.
 * 개별 선택(Ctrl+Click) 상태를 고려하여 메뉴 아이템을 생성합니다.
 */
function getMenuItemsForContext(rowIndex, colIndex, selectionState, allColumnsMeta) {
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
    // 2. 고정 열 (환자여부, 증상발현시간 등) - 데이터 지우기만 가능
    else if (Array.from(targetColumnTypes).some(type => 
      [COL_TYPE_IS_PATIENT, COL_TYPE_ONSET, 'individualExposureTime'].includes(type)
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