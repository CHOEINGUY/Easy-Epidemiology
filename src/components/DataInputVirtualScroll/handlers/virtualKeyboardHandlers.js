import { nextTick } from 'vue';

/**
 * 가상 스크롤용 키보드 이벤트 핸들러
 */

/**
 * 셀이 네비게이션 가능한지 확인합니다.
 * @param {number} rowIndex 
 * @param {number} colIndex 
 * @param {Array} allColumnsMeta 
 * @returns {boolean}
 */
function isCellNavigable(rowIndex, colIndex, allColumnsMeta) {
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
function findNextNavigableCell(currentRow, currentCol, direction, allColumnsMeta, totalRows, totalCols) {
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

function isTypingKey(key) {
  // 한 자리 문자이거나, 숫자이거나, 일부 특수문자 등.
  // Ctrl, Alt, Meta 키가 눌리지 않은 상태여야 함.
  return key.length === 1 && !/[`~]/.test(key);
}

/**
 * 선택된 셀에서 타이핑을 시작하면 편집 모드로 전환합니다.
 * @param {KeyboardEvent} event 
 * @param {object} context 
 */
async function handleTypeToEdit(event, context) {
  const { selectionSystem, rows, allColumnsMeta, startEditing, getCellValue } = context;
  const { state } = selectionSystem;
  
  // 이미 편집 중이면 처리하지 않음
  if (state.isEditing) return;
  
  const { rowIndex, colIndex } = state.selectedCell;
  if (rowIndex === null || colIndex === null) return;
  
  const column = allColumnsMeta.find(c => c.colIndex === colIndex);
  if (!column || !column.isEditable) return;
  
  try {
    if (rowIndex < 0) {
      // 헤더 셀 편집
      startEditing(rowIndex, colIndex, getCellValue, null);
    } else {
      // 바디 셀 편집
      const row = rows.value[rowIndex];
      if (row) {
        startEditing(rowIndex, colIndex, getCellValue, row);
      }
    }
    
    await nextTick();
    
    // 편집 모드로 전환 후 해당 셀에 포커스 설정
    const cellSelector = rowIndex < 0 
      ? `[data-col="${colIndex}"]` 
      : `[data-row="${rowIndex}"][data-col="${colIndex}"]`;
    
    const cellElement = document.querySelector(cellSelector);
    if (cellElement) {
      cellElement.focus();
      
      // 기존 내용을 지우고 새로운 문자로 교체
      cellElement.textContent = event.key;
      
      // 커서를 맨 끝으로 이동
      const range = document.createRange();
      const selection = window.getSelection();
      range.selectNodeContents(cellElement);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
      
      // input 이벤트를 발생시켜 값 업데이트
      const inputEvent = new Event('input', { bubbles: true });
      cellElement.dispatchEvent(inputEvent);
    }
  } catch (error) {
    console.error('Error in handleTypeToEdit:', error);
  }
}

async function handleCopy(context) {
  const { selectionSystem, rows, allColumnsMeta, getCellValue } = context;
  const { selectedRange } = selectionSystem.state;
  
  if (selectedRange.start.rowIndex === null) return;

  const { start, end } = selectedRange;
  let clipboardData = '';

  for (let r = start.rowIndex; r <= end.rowIndex; r++) {
    let rowData = [];
    for (let c = start.colIndex; c <= end.colIndex; c++) {
      const columnMeta = allColumnsMeta.find(meta => meta.colIndex === c);
      if (!columnMeta) continue;

      if (r < 0) { // Header
        rowData.push(getCellValue(null, columnMeta, r));
      } else { // Body
        const row = rows.value[r];
        rowData.push(getCellValue(row, columnMeta, r));
      }
    }
    clipboardData += rowData.join('\t');
    if (r < end.rowIndex) {
      clipboardData += '\n';
    }
  }

  try {
    await navigator.clipboard.writeText(clipboardData);
  } catch (err) {
    console.error('Failed to copy text: ', err);
  }
}

async function handlePaste(context) {
  const { selectionSystem, ensureCellIsVisible } = context;
  const { selectedCell } = selectionSystem.state;

  if (selectedCell.rowIndex === null || selectedCell.colIndex === null || selectedCell.rowIndex < 0) {
    // 헤더에는 붙여넣기 방지
    return;
  }

  try {
    const clipboardText = await navigator.clipboard.readText();
    if (!clipboardText) return;

    const parsedData = clipboardText
      .split('\n')
      .map(row => row.split('\t'));

    const startRow = selectedCell.rowIndex;
    const startCol = selectedCell.colIndex;

    // 스토어 액션에서 기대하는 파라미터 이름에 맞춰 전달
    await context.storeBridge.dispatch('pasteData', {
      startRowIndex: startRow,
      startColIndex: startCol,
      data: parsedData,
    });

    // UX 개선: 붙여넣기된 영역을 시각적으로 선택하고 첫 번째 셀 활성화
    const endRow = startRow + parsedData.length - 1;
    const maxRowLength = parsedData.reduce((max, row) => Math.max(max, row.length), 0);
    const endCol = startCol + maxRowLength - 1;
    
    selectionSystem.setSelectionRange(startRow, startCol, endRow, endCol);
    await ensureCellIsVisible(startRow, startCol);

  } catch (err) {
    console.error('Failed to paste text: ', err);
  }
}

/**
 * 그리드 컨테이너의 키보드 다운 이벤트를 처리합니다.
 * @param {KeyboardEvent} event
 * @param {object} context
 */
export async function handleVirtualKeyDown(event, context) {
  const { selectionSystem, rows, allColumnsMeta, ensureCellIsVisible, isEditing, startEditing, stopEditing, getCellValue, focusGrid } = context;
  const { state } = selectionSystem;
  
  const { key, ctrlKey, shiftKey, metaKey } = event;
  const isCtrlOrCmd = ctrlKey || metaKey;
  const totalRows = rows.value.length;
  const totalCols = allColumnsMeta.length;

  // --- 편집 모드 처리 ---
  if (isEditing) {
    const { rowIndex: editRow, colIndex: editCol } = state.editingCell;

    if (key === 'Escape') {
      event.preventDefault();
      // cellInputState 상태 정리 (편집 취소)
      context.cellInputState.cancelEditing();
      stopEditing(false); // UI 상태와 데이터 상태 모두 정리
      await nextTick();
      focusGrid();
    } 
    else if (key === 'Enter') {
      event.preventDefault();
      const tempValue = context.cellInputState.getTempValue(editRow, editCol);
      const column = allColumnsMeta.find(c => c.colIndex === editCol);
      if (tempValue !== null && column) {
        context.storeBridge.saveCellValue(editRow, editCol, tempValue, column);
      }
      // cellInputState 상태 정리
      context.cellInputState.confirmEditing();
      stopEditing(true);
      const nextRow = editRow < totalRows - 1 ? editRow + 1 : editRow;
      selectionSystem.selectCell(nextRow, editCol);
      await ensureCellIsVisible(nextRow, editCol);
      focusGrid();
    }
    else if (key === 'Tab') {
      event.preventDefault();
      const tempValue = context.cellInputState.getTempValue(editRow, editCol);
      const column = allColumnsMeta.find(c => c.colIndex === editCol);
      if (tempValue !== null && column) {
        context.storeBridge.saveCellValue(editRow, editCol, tempValue, column);
      }
      // cellInputState 상태 정리
      context.cellInputState.confirmEditing();
      stopEditing(true);
      
      if (editRow < 0) {
        // 헤더에서 편집 중일 때의 Tab 처리
        const tabTarget = findNextNavigableCell(editRow, editCol, 'right', allColumnsMeta, totalRows, totalCols);
        selectionSystem.selectCell(tabTarget.rowIndex, tabTarget.colIndex);
        await ensureCellIsVisible(tabTarget.rowIndex, tabTarget.colIndex);
      } else {
        // 바디에서 편집 중일 때의 기존 Tab 처리
        const nextCol = editCol < totalCols - 1 ? editCol + 1 : editCol;
        selectionSystem.selectCell(editRow, nextCol);
        await ensureCellIsVisible(editRow, nextCol);
      }
      focusGrid();
    }
    return; // 편집 모드에서는 네비게이션 로직을 실행하지 않음
  }

  // --- 일반 모드 처리 ---
  if (state.selectedCell.rowIndex === null) return;

  // --- 복사/붙여넣기 처리 ---
  if (isCtrlOrCmd) {
    if (key.toLowerCase() === 'c') {
      event.preventDefault();
      await handleCopy(context);
      return;
    }
    if (key.toLowerCase() === 'v') {
      event.preventDefault();
      await handlePaste(context);
      return;
    }
  }

  const { rowIndex: currentRow, colIndex: currentCol } = state.selectedCell;

  let nextRow = currentRow;
  let nextCol = currentCol;
  let navigationHandled = false;
  let isNavigationOnly = false; // Tab 키 네비게이션 전용 플래그

  // --- Ctrl 키 조합 (고속 이동/선택) ---
  if (ctrlKey) {
    let direction = null;
    if (key === 'ArrowUp') direction = 'up';
    if (key === 'ArrowDown') direction = 'down';
    if (key === 'ArrowLeft') direction = 'left';
    if (key === 'ArrowRight') direction = 'right';

    if (direction) {
      event.preventDefault();

      // '환자여부'(1) 열에서 왼쪽으로의 이동을 원천적으로 차단합니다.
      if (direction === 'left' && currentCol === 1) {
        return;
      }
      
      const targetCell = findNextCellForFastNavigation(currentRow, currentCol, direction, rows.value, allColumnsMeta);
      nextRow = targetCell.rowIndex;
      nextCol = targetCell.colIndex;
      
      // 왼쪽 이동 시 연번(0) 열로 가지 않도록 최종적으로 보정합니다.
      if (direction === 'left') {
        nextCol = Math.max(1, nextCol);
      }

      if (shiftKey) {
        selectionSystem.extendSelection(nextRow, nextCol);
      } else {
        selectionSystem.selectCell(nextRow, nextCol);
      }
      if (ensureCellIsVisible) {
        await ensureCellIsVisible(nextRow, nextCol);
      }
      return; // 고속 이동/선택 처리 후 종료
    }
  }

  // --- 일반 네비게이션 ---
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
    if (!shiftKey && !ctrlKey && !metaKey) {
      selectionSystem.clearIndividualSelections();
    }

    if (nextRow !== currentRow || nextCol !== currentCol) {
      if (shiftKey && !isNavigationOnly) {
        selectionSystem.extendSelection(nextRow, nextCol);
      } else {
        selectionSystem.selectCell(nextRow, nextCol);
      }
      
      if (ensureCellIsVisible) {
        await ensureCellIsVisible(nextRow, nextCol);
      }
    }
  }

  // --- F2 키 편집 시작 ---
  if (key === 'F2') {
    event.preventDefault();
    if (currentRow < 0) {
      // 헤더 셀 편집
      startEditing(currentRow, currentCol, getCellValue, null);
      await nextTick();
      const cellElement = document.querySelector(`[data-col="${currentCol}"]`);
      if (cellElement) cellElement.focus();
    } else {
      // 바디 셀 편집
      const row = rows.value[currentRow];
      if (row) {
        startEditing(currentRow, currentCol, getCellValue, row);
        await nextTick();
        const cellElement = document.querySelector(`[data-row="${currentRow}"][data-col="${currentCol}"]`);
        if (cellElement) cellElement.focus();
      }
    }
  }
  // --- 타이핑으로 편집 시작 ---
  else if (isTypingKey(key) && !ctrlKey && !event.metaKey) {
    event.preventDefault();
    handleTypeToEdit(event, context);
  }

  // --- Delete / Backspace : clear selected data ---------------------
  if (key === 'Delete' || key === 'Backspace') {
    event.preventDefault();
    const result = await handleClearSelectedData(context);
    
    // 편집 모드가 아닌 경우에만 즉시 스냅샷 캡처
    if (result.changed && !context.storeBridge.isEditing()) {
      // 이미 handleClearSelectedData 내에서 스냅샷이 캡처되었으므로 추가 작업 불필요
    }
    return;
  }
}

// === Fast Navigation Helper (Ctrl+Arrow) ============================
function findNextCellForFastNavigation(currentRow, currentCol, direction, rows, allColumnsMeta) {
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

  let r = currentRow;
  let c = currentCol;
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

// === Clear Selected Data ============================================
async function handleClearSelectedData(context) {
  const { selectionSystem, allColumnsMeta } = context;
  const { selectedRange, selectedCellsIndividual, selectedRowsIndividual } = selectionSystem.state;

  const updates = [];
  const headerUpdates = []; // {headerType,index,text}
  const singleHeaderUpdates = []; // {headerType,text}
  const changedCells = []; // 스냅샷용 변경 정보

  const queueHeaderClear = (colIdx) => {
    const meta = allColumnsMeta.find(c => c.colIndex === colIdx);
    if (!meta || !meta.isEditable) return;
    if (meta.cellIndex !== null && meta.cellIndex !== undefined) {
      headerUpdates.push({ headerType: meta.type, index: meta.cellIndex, text: '' });
      changedCells.push({ type: 'header', headerType: meta.type, index: meta.cellIndex, before: context.storeBridge.state.headers[meta.type]?.[meta.cellIndex] || '', after: '' });
    } else {
      singleHeaderUpdates.push({ headerType: meta.type, text: '' });
      changedCells.push({ type: 'singleHeader', headerType: meta.type, before: context.storeBridge.state.headers[meta.type] || '', after: '' });
    }
  };

  const queueCellClear = (rowIdx, colIdx) => {
    if (rowIdx < 0) {
      queueHeaderClear(colIdx);
      return;
    }
    const meta = allColumnsMeta.find(c => c.colIndex === colIdx);
    if (!meta || !meta.dataKey) return;

    // Serial 컬럼은 편집 불가
    if (meta.type === 'serial') return;

    // 변경 전 값 확인
    const beforeValue = (() => {
      const row = context.storeBridge.state.rows[rowIdx];
      if (!row) return '';
      if (meta.cellIndex !== null && meta.cellIndex !== undefined) {
        return row[meta.dataKey]?.[meta.cellIndex] || '';
      }
      return row[meta.dataKey] || '';
    })();

    // 값이 실제로 변경되는 경우만 추가
    if (beforeValue !== '') {
      changedCells.push({ type: 'cell', rowIndex: rowIdx, colIndex: colIdx, before: beforeValue, after: '' });
    }

    updates.push({
      rowIndex: rowIdx,
      key: meta.dataKey,
      value: '',
      cellIndex: meta.cellIndex,
    });
  };

  if (selectedRowsIndividual.size > 0) {
    // 개별 행 선택 – 각 행의 모든 편집 가능한 셀을 비웁니다.
    selectedRowsIndividual.forEach(rowIdx => {
      allColumnsMeta.forEach(col => {
        queueCellClear(rowIdx, col.colIndex);
      });
    });
  }

  if (selectedCellsIndividual.size > 0) {
    selectedCellsIndividual.forEach(key => {
      const [rStr, cStr] = key.split('_');
      queueCellClear(parseInt(rStr, 10), parseInt(cStr, 10));
    });
  }

  if (selectedRange.start.rowIndex !== null && selectedRowsIndividual.size === 0 && selectedCellsIndividual.size === 0) {
    for (let r = selectedRange.start.rowIndex; r <= selectedRange.end.rowIndex; r++) {
      for (let c = selectedRange.start.colIndex; c <= selectedRange.end.colIndex; c++) {
        queueCellClear(r, c);
      }
    }
  }

  // ensure anchor cell is cleared as well
  const { rowIndex: anchorRow, colIndex: anchorCol } = selectionSystem.state.selectedCell;
  if (anchorRow !== null && anchorCol !== null) {
    queueCellClear(anchorRow, anchorCol);
  }

  if (updates.length === 0 && headerUpdates.length === 0 && singleHeaderUpdates.length === 0) return;

  // 변경사항이 있는 경우에만 스냅샷 캡처
  if (changedCells.length > 0 && !context.storeBridge.isEditing()) {
    context.storeBridge._captureSnapshot('delete_clear', { changedCells });
  }

  try {
    if (updates.length > 0) await context.storeBridge.dispatch('updateCellsBatch', updates);
    // header array cells
    for (const h of headerUpdates) {
      await context.storeBridge.dispatch('updateHeader', h);
    }
    for (const sh of singleHeaderUpdates) {
      // updateSingleHeader 메서드가 있으면 사용, 없으면 updateHeader로 fallback
      if (context.storeBridge.updateSingleHeader) {
        await context.storeBridge.updateSingleHeader(sh);
      } else {
        await context.storeBridge.dispatch('updateHeader', { headerType: sh.headerType, index: null, text: '' });
      }
    }
    
    // 변경사항이 있었으면 localStorage 최신화
    if (changedCells.length > 0) {
      context.storeBridge.saveCurrentState();
    }
  } catch (err) {
    console.error('Failed to clear cells:', err);
  }

  return { changed: changedCells.length > 0, changedCells };
} 