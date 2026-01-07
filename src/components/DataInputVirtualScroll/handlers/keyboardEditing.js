
import { nextTick } from 'vue';
import { setupDateTimeInputHandling } from './keyboardDateTime.js';
import { findNextNavigableCell } from './keyboardNavigation.js';

export function isTypingKey(key) {
  // 한 자리 문자이거나, 숫자이거나, 일부 특수문자 등.
  // Ctrl, Alt, Meta 키가 눌리지 않은 상태여야 함.
  return key.length === 1 && !/[`~]/.test(key);
}

/**
 * 선택된 셀에서 타이핑을 시작하면 편집 모드로 전환합니다.
 * @param {KeyboardEvent} event 
 * @param {object} context 
 */
export async function handleTypeToEdit(event, context) {
  const { selectionSystem, rows, allColumnsMeta, startEditing, getCellValue } = context;
  const { state } = selectionSystem;
  
  // 이미 편집 중이면 처리하지 않음
  if (state.isEditing) return;
  
  const { rowIndex, colIndex } = state.selectedCell;
  if (rowIndex === null || colIndex === null) return;
  
  const column = allColumnsMeta.find(c => c.colIndex === colIndex);
  if (!column || !column.isEditable) return;
  
  // 날짜/시간 컬럼인지 확인
  const isDateTimeColumn = column.type === 'symptomOnset' || column.type === 'individualExposureTime';
  
  try {
    if (rowIndex < 0) {
      // 헤더 셀 편집
      startEditing(rowIndex, colIndex, getCellValue, null, context.cellInputState, allColumnsMeta);
    } else {
      // 바디 셀 편집
      const row = rows.value[rowIndex];
      if (row) {
        startEditing(rowIndex, colIndex, getCellValue, row, context.cellInputState, allColumnsMeta);
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
      
      // 날짜/시간 컬럼인 경우 특별한 처리
      if (isDateTimeColumn) {
        // 날짜/시간 컬럼에서는 자동 구분자 삽입 기능 추가
        setupDateTimeInputHandling(cellElement, event.key, null, context);
      } else {
        // --- 저장 및 유효성 검사를 위한 이벤트 리스너 정의 ---
        const handleInput = (e) => {
          const newValue = e.target.textContent;
          context.cellInputState.updateTempValue(rowIndex, colIndex, newValue, column);
        };
        
        const handleEditComplete = () => {
          // 리스너 제거
          cellElement.removeEventListener('blur', handleEditComplete);
          cellElement.removeEventListener('focusout', handleEditComplete);
          cellElement.removeEventListener('input', handleInput);
          cellElement.removeEventListener('keydown', handleKeyDown);
          
          const tempValue = context.cellInputState.getTempValue(rowIndex, colIndex);
          if (tempValue !== null) {
            context.storeBridge.saveCellValue(rowIndex, colIndex, tempValue, column);
            
            try {
              if (context.validationManager) {
                context.validationManager.validateCell(rowIndex, colIndex, tempValue, column.type);
              }
            } catch (error) {
              console.error('[TypeToEdit] Validation failed:', error);
            }
          }
          context.cellInputState.confirmEditing();
          context.selectionSystem.stopEditing(true);
        };
        
        const handleKeyDown = (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleEditComplete();
            // Enter 이동 로직은 handleVirtualKeyDown 등에서 처리하거나 여기서 직접 호출
          }
        };

        // 리스너 먼저 등록
        cellElement.addEventListener('input', handleInput);
        cellElement.addEventListener('blur', handleEditComplete);
        cellElement.addEventListener('focusout', handleEditComplete);
        cellElement.addEventListener('keydown', handleKeyDown);
        
        // contentEditable 확실히 설정
        if (!cellElement.getAttribute('contenteditable')) {
          cellElement.setAttribute('contenteditable', 'true');
        }

        // 값 설정 및 이벤트 발생 (리스너 등록 후 실행해야 함)
        cellElement.textContent = event.key;
        
        // 커서를 맨 끝으로 이동
        const range = document.createRange();
        const selection = window.getSelection();
        range.selectNodeContents(cellElement);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
        
        // input 이벤트를 발생시켜 값 업데이트 (이제 리스너가 잡을 수 있음)
        const inputEvent = new Event('input', { bubbles: true });
        cellElement.dispatchEvent(inputEvent);
      }
    }
  } catch (error) {
    console.error('Error in handleTypeToEdit:', error);
  }
}

// === Clear Selected Data ============================================
export async function handleClearSelectedData(context) {
  const { selectionSystem, allColumnsMeta } = context;
  const { selectedRange, selectedCellsIndividual, selectedRowsIndividual } = selectionSystem.state;

  const updates = [];
  const headerUpdates = []; // {headerType,index,text}
  const singleHeaderUpdates = []; // {headerType,text}
  const changedCells = []; // 스냅샷용 변경 정보

  const queueHeaderClear = (colIdx) => {
    const meta = allColumnsMeta.find(c => c.colIndex === colIdx);
    if (!meta) return;
    
    // 헤더 셀의 경우 isEditable 조건을 제거하여 모든 헤더 셀에서 delete/backspace 동작
    
    // 타입 매핑 (saveHeaderValue와 동일한 매핑 적용)
    const typeMap = {
      basic: 'basic',
      clinical: 'clinical',
      clinicalSymptoms: 'clinical',
      diet: 'diet',
      dietInfo: 'diet'
    };
    const headerType = typeMap[meta.type] || meta.type;
    
    if (meta.cellIndex !== null && meta.cellIndex !== undefined) {
      headerUpdates.push({ headerType, index: meta.cellIndex, text: '' });
      changedCells.push({ type: 'header', headerType, index: meta.cellIndex, before: context.storeBridge.state.headers[headerType]?.[meta.cellIndex] || '', after: '' });
    } else {
      singleHeaderUpdates.push({ headerType, text: '' });
      changedCells.push({ type: 'singleHeader', headerType, before: context.storeBridge.state.headers[headerType] || '', after: '' });
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
      cellIndex: meta.cellIndex
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
    // 필터 상태 포함한 스냅샷 캡처 함수가 있으면 사용, 없으면 기본 방식 사용
    if (context.captureSnapshotWithFilter) {
      context.captureSnapshotWithFilter('delete_clear', { changedCells });
    } else {
      context.storeBridge._captureSnapshot('delete_clear', { changedCells });
    }
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

// === Edit Mode Key Handler ==========================================
export async function handleEditModeKeyDown(event, context) {
  const { 
    selectionSystem, 
    rows, 
    allColumnsMeta, 
    ensureCellIsVisible, 
    stopEditing, 
    focusGrid 
  } = context;
  const { state } = selectionSystem;
  const { rowIndex: editRow, colIndex: editCol } = state.editingCell;
  const { key } = event;
  const totalRows = rows.value.length;
  const totalCols = allColumnsMeta.length;

  if (key === 'Escape') {
    event.preventDefault();
    // cellInputState 상태 정리 (편집 취소)
    context.cellInputState.cancelEditing();
    stopEditing(false); // UI 상태와 데이터 상태 모두 정리
    await nextTick();
    focusGrid();
    return true; // handled
  }
  else if (key === 'Enter') {
    event.preventDefault();
    const tempValue = context.cellInputState.getTempValue(editRow, editCol);
    const column = allColumnsMeta.find(c => c.colIndex === editCol);
    if (tempValue !== null && column) {
      context.storeBridge.saveCellValue(editRow, editCol, tempValue, column);
      // ValidationManager 호출 추가
      if (context.validationManager) {
        console.log(`[EditMode] Validation 호출: row=${editRow}, col=${editCol}, value="${tempValue}", type="${column.type}"`);
        context.validationManager.validateCell(editRow, editCol, tempValue, column.type);
      }
    }
    // cellInputState 상태 정리
    context.cellInputState.confirmEditing();
    stopEditing(true);
    const nextRow = editRow < totalRows - 1 ? editRow + 1 : editRow;
    selectionSystem.selectCell(nextRow, editCol);
    await ensureCellIsVisible(nextRow, editCol);
    
    // 포커스 설정을 다음 틱에서 실행하여 안정적인 이벤트 처리 보장
    await nextTick();
    focusGrid();
    return true;
  }
  else if (key === 'Tab') {
    event.preventDefault();
    const tempValue = context.cellInputState.getTempValue(editRow, editCol);
    const column = allColumnsMeta.find(c => c.colIndex === editCol);
    if (tempValue !== null && column) {
      context.storeBridge.saveCellValue(editRow, editCol, tempValue, column);
      // ValidationManager 호출 추가
      if (context.validationManager) {
        console.log(`[EditMode] Validation 호출: row=${editRow}, col=${editCol}, value="${tempValue}", type="${column.type}"`);
        context.validationManager.validateCell(editRow, editCol, tempValue, column.type);
      }
    }
    // cellInputState 상태 정리
    context.cellInputState.confirmEditing();
    stopEditing(true);
    
    // 편집 모드에서 Tab 처리 후 일반 모드 Tab 처리로 넘어감
    // 현재 편집 중인 셀을 기준으로 다음 셀 찾기
    const currentRow = editRow;
    const currentCol = editCol;
    
    // 일반 모드의 Tab 처리 로직 재사용
    const tabTarget = findNextNavigableCell(currentRow, currentCol, 'right', allColumnsMeta, totalRows, totalCols);
    selectionSystem.selectCell(tabTarget.rowIndex, tabTarget.colIndex);
    await ensureCellIsVisible(tabTarget.rowIndex, tabTarget.colIndex);
    
    // 포커스 설정을 다음 틱에서 실행하여 안정적인 이벤트 처리 보장
    await nextTick();
    focusGrid();
    return true;
  }
  
  // 편집 모드에서 날짜/시간 컬럼인지 확인
  const columnMeta = allColumnsMeta.find(col => col.colIndex === editCol);
  const isDateTimeColumn = columnMeta && (
    columnMeta.type === 'symptomOnset' || 
    columnMeta.type === 'individualExposureTime'
  );
  
  // 날짜/시간 컬럼 처리
  if (isDateTimeColumn) {
    const cellSelector = editRow < 0 
      ? `[data-col="${editCol}"]` 
      : `[data-row="${editRow}"][data-col="${editCol}"]`;
    const cellElement = document.querySelector(cellSelector);
    
    // 숫자 입력 처리
    if (/\d/.test(key)) {
      event.preventDefault();
      if (cellElement && cellElement.__dtKeyHandler) {
        const keyEvent = new KeyboardEvent('keydown', { key });
        cellElement.__dtKeyHandler(keyEvent);
      }
      return true;
    }
    
    // 백스페이스 처리
    if (key === 'Backspace') {
      event.preventDefault();
      if (cellElement && cellElement.__dtKeyHandler) {
        const keyEvent = new KeyboardEvent('keydown', { key });
        cellElement.__dtKeyHandler(keyEvent);
      }
      return true;
    }
    
    // Tab/Enter 처리 - 날짜/시간 컬럼에서는 통합 처리
    if (key === 'Tab' || key === 'Enter') {
      event.preventDefault();
      
      // 현재 날짜/시간 값 저장
      if (cellElement && cellElement.__dtSaveValue) {
        await cellElement.__dtSaveValue();
      }
      
      // 편집 상태 종료
      const tempValue = context.cellInputState.getTempValue(editRow, editCol);
      const column = allColumnsMeta.find(c => c.colIndex === editCol);
      if (tempValue !== null && column) {
        context.storeBridge.saveCellValue(editRow, editCol, tempValue, column);
        
        // 유효성 검사 추가 (안전하게 처리)
        try {
          if (context.validationManager) {
            context.validationManager.validateCell(editRow, editCol, tempValue, column.type);
          }
        } catch (error) {
          console.error('[KeyPress] Validation failed:', error);
        }
      }
      context.cellInputState.confirmEditing();
      stopEditing(true);
      
      // 네비게이션 처리
      if (key === 'Tab') {
        const tabTarget = findNextNavigableCell(editRow, editCol, 'right', allColumnsMeta, totalRows, totalCols);
        selectionSystem.selectCell(tabTarget.rowIndex, tabTarget.colIndex);
        await ensureCellIsVisible(tabTarget.rowIndex, tabTarget.colIndex);
      } else if (key === 'Enter') {
        const enterTarget = findNextNavigableCell(editRow, editCol, 'down', allColumnsMeta, totalRows, totalCols);
        selectionSystem.selectCell(enterTarget.rowIndex, enterTarget.colIndex);
        await ensureCellIsVisible(enterTarget.rowIndex, enterTarget.colIndex);
      }
      
      // 포커스 설정을 다음 틱에서 실행하여 안정적인 이벤트 처리 보장
      await nextTick();
      focusGrid();
      return true;
    }
  }
  
  return false; // 다른 키는 처리하지 않음
}
