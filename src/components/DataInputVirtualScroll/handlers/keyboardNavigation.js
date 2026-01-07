import { nextTick } from 'vue';

/**
 * 가상 스크롤용 키보드 네비게이션 핸들러
 */

/**
 * 셀이 네비게이션 가능한지 확인합니다.
 * @param {number} rowIndex 
 * @param {number} colIndex 
 * @param {Array} allColumnsMeta 
 * @returns {boolean}
 */
export function isCellNavigable(rowIndex, colIndex, allColumnsMeta) {
  const column = allColumnsMeta.find(c => c.colIndex === colIndex);
  if (!column) return false;
  
  // 헤더 셀인 경우
  if (rowIndex < 0) {
    // headerRow === 2이고 편집 가능한 셀만 네비게이션 허용
    return column.headerRow === 2 && column.isEditable;
  }
  
  // 바디 셀은 모두 네비게이션 가능 (기존 로직 유지)
  return true;
}

/**
 * 다음 네비게이션 가능한 셀을 찾습니다.
 * @param {number} currentRow 
 * @param {number} currentCol 
 * @param {string} direction - 'left', 'right', 'up', 'down'
 * @param {Array} allColumnsMeta 
 * @param {number} totalRows 
 * @param {number} totalCols 
 * @returns {{rowIndex: number, colIndex: number}}
 */
export function findNextNavigableCell(currentRow, currentCol, direction, allColumnsMeta, totalRows, totalCols) {
  switch (direction) {
  case 'left':
    // 헤더에서 왼쪽으로 이동
    if (currentRow < 0) {
      for (let col = currentCol - 1; col >= 0; col--) {
        if (isCellNavigable(currentRow, col, allColumnsMeta)) {
          return { rowIndex: currentRow, colIndex: col };
        }
      }
      // 더 이상 네비게이션 가능한 헤더 셀이 없으면 현재 위치 유지
      return { rowIndex: currentRow, colIndex: currentCol };
    } else {
      // 바디에서는 기존 로직 (환자여부(1) 열까지만)
      return { rowIndex: currentRow, colIndex: Math.max(1, currentCol - 1) };
    }
      
  case 'right':
    // 헤더에서 오른쪽으로 이동
    if (currentRow < 0) {
      for (let col = currentCol + 1; col < totalCols; col++) {
        if (isCellNavigable(currentRow, col, allColumnsMeta)) {
          return { rowIndex: currentRow, colIndex: col };
        }
      }
      // 더 이상 네비게이션 가능한 헤더 셀이 없으면 바디로 이동
      return { rowIndex: 0, colIndex: 0 };
    } else {
      // 바디에서는 기존 로직
      return { rowIndex: currentRow, colIndex: Math.min(totalCols - 1, currentCol + 1) };
    }
      
  case 'up':
    if (currentRow > 0) {
      return { rowIndex: currentRow - 1, colIndex: currentCol };
    } else if (currentRow === 0) {
      // 바디에서 헤더로 이동 시, 네비게이션 가능한 헤더 셀 찾기
      if (isCellNavigable(-1, currentCol, allColumnsMeta)) {
        return { rowIndex: -1, colIndex: currentCol };
      } else {
        // 현재 열이 네비게이션 불가능하면 가장 가까운 네비게이션 가능한 헤더 셀 찾기
        for (let col = currentCol; col >= 0; col--) {
          if (isCellNavigable(-1, col, allColumnsMeta)) {
            return { rowIndex: -1, colIndex: col };
          }
        }
        for (let col = currentCol + 1; col < totalCols; col++) {
          if (isCellNavigable(-1, col, allColumnsMeta)) {
            return { rowIndex: -1, colIndex: col };
          }
        }
        // 네비게이션 가능한 헤더 셀이 없으면 현재 위치 유지
        return { rowIndex: currentRow, colIndex: currentCol };
      }
    }
    return { rowIndex: currentRow, colIndex: currentCol };
      
  case 'down':
    if (currentRow === -1) {
      return { rowIndex: 0, colIndex: currentCol };
    } else if (currentRow < totalRows - 1) {
      return { rowIndex: currentRow + 1, colIndex: currentCol };
    }
    return { rowIndex: currentRow, colIndex: currentCol };
  }
  
  return { rowIndex: currentRow, colIndex: currentCol };
}

// === Fast Navigation Helper (Ctrl+Arrow) ============================
export function findNextCellForFastNavigation(currentRow, currentCol, direction, rows, allColumnsMeta) {
  const totalRows = rows.length;
  const totalCols = allColumnsMeta.length;

  const isCellEmpty = (rowIdx, colIdx) => {
    if (colIdx < 1 || colIdx >= totalCols || rowIdx < -1 || rowIdx >= totalRows) return true;
    if (rowIdx === -1) return false; // header never empty for nav purposes
    const columnMeta = allColumnsMeta.find(c => c.colIndex === colIdx);
    if (!columnMeta) return true;
    const row = rows[rowIdx];
    if (!row) return true;
    const value = getCellContent(row, columnMeta, rowIdx);
    return value === undefined || value === null || String(value).trim() === '';
  };

  // Helper to get cell content (fallback if not available via global)
  function getCellContent(row, columnMeta, rowIdx) {
    if (rowIdx < 0) return '';
    if (columnMeta.type === 'serial') return rowIdx + 1;
    if (!columnMeta.dataKey) return '';
    if (columnMeta.cellIndex !== null && columnMeta.cellIndex !== undefined) {
      const arr = row[columnMeta.dataKey];
      return Array.isArray(arr) ? arr[columnMeta.cellIndex] : '';
    }
    return row[columnMeta.dataKey];
  }

  const r = currentRow;
  const c = currentCol;
  const dr = direction === 'up' ? -1 : direction === 'down' ? 1 : 0;
  const dc = direction === 'left' ? -1 : direction === 'right' ? 1 : 0;

  // Header row special case
  if (r === -1) {
    if (direction === 'down') return { rowIndex: 0, colIndex: c };
    if (direction === 'up') return { rowIndex: -1, colIndex: c };
    if (dc !== 0) {
      let tempC = c;
      while (tempC + dc >= 1 && tempC + dc < totalCols) {
        tempC += dc;
      }
      return { rowIndex: -1, colIndex: tempC };
    }
    return { rowIndex: -1, colIndex: c };
  }

  const currentEmpty = isCellEmpty(r, c);
  let nextR = r + dr;
  let nextC = c + dc;

  // Mode 1: starting inside data block
  if (!currentEmpty) {
    if (isCellEmpty(nextR, nextC)) {
      // Fall to Mode 2
    } else {
      let lastDataR = r;
      let lastDataC = c;
      while (!isCellEmpty(nextR, nextC)) {
        // prevent going into header when moving up
        if (direction === 'up' && nextR < 0) {
          return { rowIndex: lastDataR, colIndex: lastDataC };
        }
        lastDataR = nextR;
        lastDataC = nextC;
        nextR += dr;
        nextC += dc;
      }
      return { rowIndex: lastDataR, colIndex: lastDataC };
    }
  }

  // Mode 2: starting from empty or at edge of block
  let curR = r;
  let curC = c;
  if (!currentEmpty) {
    curR += dr;
    curC += dc;
  }
  while (isCellEmpty(curR, curC)) {
    const peekR = curR + dr;
    const peekC = curC + dc;
    if (direction === 'up' && peekR < 0) {
      return { rowIndex: Math.max(0, curR), colIndex: curC };
    }
    if (peekR < -1 || peekR >= totalRows || peekC < 1 || peekC >= totalCols) {
      return { rowIndex: curR, colIndex: curC };
    }
    curR = peekR;
    curC = peekC;
  }
  return { rowIndex: curR, colIndex: curC };
}

// === Normal Navigation Handler ======================================
export async function handleNavigationKeyDown(event, context) {
  const { 
    selectionSystem, 
    rows, 
    allColumnsMeta, 
    ensureCellIsVisible, 
    focusGrid 
  } = context;
  const { state } = selectionSystem;
  const { rowIndex: currentRow, colIndex: currentCol } = state.selectedCell;
  const { key, shiftKey } = event;
  
  if (currentRow === null) return false;

  const totalRows = rows.value.length;
  const totalCols = allColumnsMeta.length;
  let nextRow = currentRow;
  let nextCol = currentCol;
  let navigationHandled = false;
  let isNavigationOnly = false; // Tab 키 네비게이션 전용 플래그

  switch (key) {
  case 'ArrowUp': {
    const upTarget = findNextNavigableCell(currentRow, currentCol, 'up', allColumnsMeta, totalRows, totalCols);
    nextRow = upTarget.rowIndex;
    nextCol = upTarget.colIndex;
    navigationHandled = true;
    break;
  }

  case 'ArrowDown':
  case 'Enter': { // Enter 키를 ArrowDown과 동일하게 처리
    const downTarget = findNextNavigableCell(currentRow, currentCol, 'down', allColumnsMeta, totalRows, totalCols);
    nextRow = downTarget.rowIndex;
    nextCol = downTarget.colIndex;
    navigationHandled = true;
    break;
  }

  case 'ArrowLeft': {
    const leftTarget = findNextNavigableCell(currentRow, currentCol, 'left', allColumnsMeta, totalRows, totalCols);
    nextRow = leftTarget.rowIndex;
    nextCol = leftTarget.colIndex;
    navigationHandled = true;
    break;
  }

  case 'ArrowRight': {
    const rightTarget = findNextNavigableCell(currentRow, currentCol, 'right', allColumnsMeta, totalRows, totalCols);
    nextRow = rightTarget.rowIndex;
    nextCol = rightTarget.colIndex;
    navigationHandled = true;
    break;
  }
    
  case 'Tab': {
    isNavigationOnly = true; // Tab은 순수 네비게이션으로 처리
    navigationHandled = true;
    if (event.shiftKey) { // Shift + Tab
      const shiftTabTarget = findNextNavigableCell(currentRow, currentCol, 'left', allColumnsMeta, totalRows, totalCols);
      nextRow = shiftTabTarget.rowIndex;
      nextCol = shiftTabTarget.colIndex;
    } else { // Tab
      const tabTarget = findNextNavigableCell(currentRow, currentCol, 'right', allColumnsMeta, totalRows, totalCols);
      nextRow = tabTarget.rowIndex;
      nextCol = tabTarget.colIndex;
    }
    break;
  }
  }

  if (navigationHandled) {
    event.preventDefault(); // 페이지 스크롤 등 기본 동작 방지

    // 새 네비게이션이 시작되면 기존 Ctrl 기반 개별 선택을 초기화
    // (여기서는 Ctrl 키가 안 눌린 상태임을 전제로 호출됨)
    selectionSystem.clearIndividualSelections();

    if (nextRow !== currentRow || nextCol !== currentCol) {
      if (shiftKey && !isNavigationOnly) {
        selectionSystem.extendSelection(nextRow, nextCol);
      } else {
        selectionSystem.selectCell(nextRow, nextCol);
      }
      
      if (ensureCellIsVisible) {
        await ensureCellIsVisible(nextRow, nextCol);
      }
      
      // 포커스 설정을 다음 틱에서 실행하여 안정적인 이벤트 처리 보장
      await nextTick();
      focusGrid();
    }
    return true; // handled
  }

  return false; // not handled
}
