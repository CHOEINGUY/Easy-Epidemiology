/**
 * Placeholder for virtual scroll-aware cell event handlers.
 * To be implemented in later steps.
 */

// 컬럼 타입 상수 import
const COL_TYPE_IS_PATIENT = "isPatient";
const COL_TYPE_BASIC = "basic";
const COL_TYPE_CLINICAL = "clinical";
const COL_TYPE_DIET = "diet";

let autoScrollInterval = null;

function stopAutoScroll() {
  if (autoScrollInterval) {
    clearInterval(autoScrollInterval);
    autoScrollInterval = null;
  }
}

/**
 * Handles clicks on a virtualized cell.
 * Note: It receives the virtual (visible) row index, which needs to be
 * translated to the original data index.
 * 
 * @param {number} rowIndex - The index of the row within the visible portion.
 * @param {number} colIndex - The column index.
 * @param {Event} event - The DOM event.
 * @param {object} context - The handler context, containing necessary systems.
 */
export function handleVirtualCellMouseDown(rowIndex, colIndex, event, context) {
  const { getOriginalIndex, selectionSystem, allColumnsMeta } = context;

  let originalRowIndex;

  if (rowIndex >= 0) {
    // Body cell: rowIndex is a virtual index, convert it
    originalRowIndex = getOriginalIndex(rowIndex);
  } else {
    // Header cell: rowIndex is already the correct negative index
    originalRowIndex = rowIndex;
  }

  if (originalRowIndex === null || originalRowIndex === undefined) {
    console.error('Could not determine original row index.');
    return;
  }

  // --- Right-click selection handling ---
  // 마우스 우클릭(event.button === 2) 시,
  // 클릭한 지점이 이미 선택된 범위 또는 개별 선택에 포함되어 있다면 선택을 변경하지 않습니다.
  if (event.button === 2) {
    const { selectedRange, selectedRowsIndividual, selectedCellsIndividual } = selectionSystem.state;
    
    // 범위 선택 내에서 우클릭 확인
    const isClickInsideRangeSelection =
      selectedRange.start.rowIndex !== null &&
      originalRowIndex >= selectedRange.start.rowIndex &&
      originalRowIndex <= selectedRange.end.rowIndex &&
      colIndex >= selectedRange.start.colIndex &&
      colIndex <= selectedRange.end.colIndex;

    // 개별 선택 내에서 우클릭 확인
    const isRowIndividuallySelected = selectedRowsIndividual.has(originalRowIndex);
    const isCellIndividuallySelected = selectedCellsIndividual.has(`${originalRowIndex}_${colIndex}`);

    // 기존 선택(범위 또는 개별) 내에서 우클릭한 경우, 선택을 유지하고 핸들러를 종료합니다.
    // 이렇게 해야 contextmenu 이벤트 핸들러가 기존 선택을 사용할 수 있습니다.
    if (isClickInsideRangeSelection || isRowIndividuallySelected || isCellIndividuallySelected) {
      return;
    }
  }

  // 편집 모드에서 같은 셀을 클릭한 경우, 텍스트 커서 이동을 허용
  const { isEditing, editingCell } = selectionSystem.state;
  if (isEditing && 
      editingCell.rowIndex === originalRowIndex && 
      editingCell.colIndex === colIndex) {
    // 편집 중인 같은 셀 내부를 클릭한 경우 이벤트를 방지하지 않음
    // 브라우저의 기본 동작(텍스트 커서 이동)을 허용
    return;
  }

  // Ctrl(또는 Cmd) / Shift 조합 처리 ---------------------------
  const isCtrl = event.ctrlKey || event.metaKey;
  const isShift = event.shiftKey;

  if (isCtrl) {
    // If this is the *first* Ctrl interaction, include the anchor cell/row in individual set
    if (selectionSystem.state.selectedCellsIndividual.size === 0 && selectionSystem.state.selectedRowsIndividual.size === 0) {
      const anchor = selectionSystem.state.selectedCell;
      if (anchor.rowIndex !== null && anchor.colIndex !== null) {
        if (anchor.colIndex === 0) {
          selectionSystem.toggleIndividualRow(anchor.rowIndex);
        } else {
          selectionSystem.toggleIndividualCell(anchor.rowIndex, anchor.colIndex);
        }
      }
    }

    // --- Ctrl + Shift + Serial 클릭 : 연속 행 범위 선택 ---
    event.preventDefault();

    if (colIndex === 0 && isShift) {
      const anchorRow = selectionSystem.state.selectionAnchor.rowIndex ?? originalRowIndex;
      selectionSystem.selectRowRange(anchorRow, originalRowIndex);
      return; // 범위 선택 후 드래그 비활성
    }

    // --- Ctrl + Serial 클릭 : 행 토글 선택 ---
    if (colIndex === 0) {
      selectionSystem.toggleIndividualRow(originalRowIndex);
      return;
    }

    // --- Ctrl + 일반 셀 클릭 : 셀 토글 선택 ---
    selectionSystem.toggleIndividualCell(originalRowIndex, colIndex);
    return; // 개별 토글 후 드래그 비활성
  }

  // Shift 범위 확장 (행/셀이 anchor 기반) ---------------------
  if (isShift) {
    event.preventDefault();
    // Shift 범위 선택을 시작하면 기존 개별 선택을 모두 해제합니다.
    selectionSystem.clearIndividualSelections();
    const anchorRow = selectionSystem.state.selectionAnchor.rowIndex ?? originalRowIndex;
    if (colIndex === 0) {
      // Serial 열에서 Shift 클릭 → 연속 행 범위 선택
      selectionSystem.selectRowRange(anchorRow, originalRowIndex);
      // 열 전체까지 선택 범위 확장 (selectRowRange 내부에서 처리)
    } else {
      // 일반 셀 Shift 확장
      selectionSystem.extendSelection(originalRowIndex, colIndex);
    }
    return;
  }

  // 기본 클릭: 단일 선택 처리 -------------------------------

  // 기본 텍스트 선택 및 드래그 동작 방지
  event.preventDefault();

  // Ctrl/Shift 없이 클릭한 경우 개별 셀/행 선택을 모두 초기화합니다.
  selectionSystem.clearIndividualSelections();

  if (colIndex === 0) {
    selectionSystem.selectRow(originalRowIndex, allColumnsMeta);
  } else {
    selectionSystem.selectCell(originalRowIndex, colIndex);
  }

  // 드래그 상태 활성화
  selectionSystem.startDrag(colIndex);

  // The document listeners are now handled in DataInputVirtual.vue
}

/**
 * 가상 셀 더블클릭 핸들러 - 조건부 텍스트 선택 기능 포함
 * @param {number} rowIndex - 행 인덱스 (가상 인덱스)
 * @param {number} colIndex - 열 인덱스
 * @param {Event} event - 더블클릭 이벤트
 * @param {object} context - 핸들러 컨텍스트
 */
export async function handleVirtualCellDoubleClick(rowIndex, colIndex, event, context) {
  const { getOriginalIndex, allColumnsMeta, selectionSystem, getCellValue, rows, cellInputState, storeBridge } = context;

  let originalRowIndex;
  if (rowIndex >= 0) {
    originalRowIndex = getOriginalIndex(rowIndex);
  } else {
    originalRowIndex = rowIndex;
  }

  if (originalRowIndex === null || originalRowIndex === undefined) {
    console.error('Could not determine original row index.');
    return;
  }

  // 편집 가능한 셀인지 확인
  const columnMeta = allColumnsMeta.find(col => col.colIndex === colIndex);
  if (!columnMeta || !columnMeta.isEditable) return;

  console.log(`[DoubleClick] Starting edit for cell: ${originalRowIndex}, ${colIndex}`);

  // 먼저 해당 셀을 선택
  selectionSystem.selectCell(originalRowIndex, colIndex);

  // 편집 모드 시작 (selectionSystem을 통해)
  if (originalRowIndex < 0) {
    // 헤더 셀 편집
    selectionSystem.startEditing(originalRowIndex, colIndex, getCellValue, null, cellInputState, allColumnsMeta);
  } else {
    // 바디 셀 편집
    const row = rows.value[originalRowIndex];
    if (row) {
      selectionSystem.startEditing(originalRowIndex, colIndex, getCellValue, row, cellInputState, allColumnsMeta);
    }
  }

  // 다음 프레임에서 DOM 업데이트 후 실행
  await new Promise(resolve => requestAnimationFrame(resolve));

  // DOM 요소 찾기 및 편집 설정
  const cellElement = event.target.closest("td, th");
  if (cellElement) {
    console.log(`[DoubleClick] Setting up DOM for editing`);
    
    // contentEditable 강제 설정
    cellElement.contentEditable = "true";
    cellElement.focus();
    
    // --- 편집 완료 이벤트 리스너 추가 ---
    const handleEditComplete = () => {
      console.log(`[DoubleClick] Edit complete event triggered for cell: ${originalRowIndex}, ${colIndex}`);
      
      // 이벤트 리스너 제거 (한 번만 실행되도록)
      cellElement.removeEventListener('blur', handleEditComplete);
      cellElement.removeEventListener('focusout', handleEditComplete);
      cellElement.removeEventListener('input', handleInput);
      cellElement.removeEventListener('keydown', handleKeyDown);
      
      // 편집 완료 처리
      const tempValue = cellInputState.getTempValue(originalRowIndex, colIndex);
      if (tempValue !== null) {
        storeBridge.saveCellValue(originalRowIndex, colIndex, tempValue, columnMeta);
        console.log(`[DoubleClick] Saved value: ${tempValue} for cell: ${originalRowIndex}, ${colIndex}`);
      }
      
      // cellInputState 상태 정리
      cellInputState.confirmEditing();
      selectionSystem.stopEditing(true);
    };
    
    // input 이벤트 핸들러 추가
    const handleInput = (e) => {
      const newValue = e.target.textContent;
      cellInputState.updateTempValue(originalRowIndex, colIndex, newValue, columnMeta);
      console.log(`[DoubleClick] Input event: ${newValue} for cell: ${originalRowIndex}, ${colIndex}`);
    };
    
    // 키보드 이벤트 핸들러 추가
    const handleKeyDown = (e) => {
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        handleEditComplete();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        // 편집 취소
        cellElement.removeEventListener('blur', handleEditComplete);
        cellElement.removeEventListener('focusout', handleEditComplete);
        cellElement.removeEventListener('input', handleInput);
        cellElement.removeEventListener('keydown', handleKeyDown);
        
        cellInputState.cancelEditing();
        selectionSystem.stopEditing(false);
      }
    };
    
    // 편집 완료 이벤트 리스너 등록
    cellElement.addEventListener('blur', handleEditComplete);
    cellElement.addEventListener('focusout', handleEditComplete);
    cellElement.addEventListener('input', handleInput);
    cellElement.addEventListener('keydown', handleKeyDown);
    
    // --- 조건부 텍스트 선택 로직 시작 ---
    const selection = window.getSelection();
    selection.removeAllRanges();
    const range = document.createRange();

    // 전체 선택이 필요한 타입들 정의
    const selectAllTypes = [
      COL_TYPE_IS_PATIENT,
      COL_TYPE_BASIC,
      COL_TYPE_CLINICAL,
      COL_TYPE_DIET,
    ];

    // '전체 선택' 타입에 해당하고, 바디 셀인 경우에만 전체 선택 동작
    if (originalRowIndex >= 0 && selectAllTypes.includes(columnMeta.type)) {
      // 방식 1: 내부 텍스트 전체 선택
      range.selectNodeContents(cellElement);
    } else {
      // 방식 2: 클릭한 위치에 커서 놓기 (헤더 및 '증상발현시간' 등)
      
      // 더 정확한 커서 위치 계산을 위해 caretRangeFromPoint 사용
      let cursorPosition = 0;
      
      try {
        // 브라우저가 caretRangeFromPoint를 지원하는 경우
        if (document.caretRangeFromPoint) {
          const range = document.caretRangeFromPoint(event.clientX, event.clientY);
          if (range && range.startContainer === cellElement.firstChild) {
            cursorPosition = range.startOffset;
          } else if (range && cellElement.contains(range.startContainer)) {
            // 텍스트 노드가 아닌 경우의 처리
            const textContent = cellElement.textContent;
            const clickX = event.clientX - cellElement.getBoundingClientRect().left;
            const cellWidth = cellElement.getBoundingClientRect().width;
            cursorPosition = Math.round((clickX / cellWidth) * textContent.length);
          }
        } 
        // caretPositionFromPoint 지원하는 경우 (Firefox)
        else if (document.caretPositionFromPoint) {
          const caretPos = document.caretPositionFromPoint(event.clientX, event.clientY);
          if (caretPos && caretPos.offsetNode === cellElement.firstChild) {
            cursorPosition = caretPos.offset;
          }
        } 
        // 지원하지 않는 경우 기존 방식 사용
        else {
          const textNode = cellElement.firstChild;
          if (textNode && textNode.nodeType === Node.TEXT_NODE) {
            const rect = cellElement.getBoundingClientRect();
            const clickX = event.clientX - rect.left;
            const cellWidth = rect.width;
            const textLength = textNode.textContent.length;
            const estimatedPosition = Math.round((clickX / cellWidth) * textLength);
            cursorPosition = Math.max(0, Math.min(estimatedPosition, textLength));
          }
        }
      } catch (error) {
        console.warn('Failed to calculate precise cursor position, using fallback:', error);
        // 폴백: 기존 방식
        const textNode = cellElement.firstChild;
        if (textNode && textNode.nodeType === Node.TEXT_NODE) {
          const rect = cellElement.getBoundingClientRect();
          const clickX = event.clientX - rect.left;
          const cellWidth = rect.width;
          const textLength = textNode.textContent.length;
          const estimatedPosition = Math.round((clickX / cellWidth) * textLength);
          cursorPosition = Math.max(0, Math.min(estimatedPosition, textLength));
        }
      }
      
      // 커서 위치를 설정
      const textNode = cellElement.firstChild;
      if (textNode && textNode.nodeType === Node.TEXT_NODE) {
        const safePosition = Math.max(0, Math.min(cursorPosition, textNode.textContent.length));
        range.setStart(textNode, safePosition);
        range.setEnd(textNode, safePosition);
      } else {
        range.setStart(cellElement, 0);
        range.setEnd(cellElement, 0);
      }
    }
    
    selection.addRange(range);
    console.log(`[DoubleClick] Editing setup complete for cell: ${originalRowIndex}, ${colIndex}`);
    // --- 조건부 텍스트 선택 로직 종료 ---
  }
}

/**
 * document 전체에서 마우스가 움직일 때 이벤트를 처리합니다.
 * 드래그 선택을 업데이트하고, 필요 시 자동 스크롤을 트리거합니다.
 * @param {Event} event 
 * @param {object} context 
 */
export function handleVirtualDocumentMouseMove(event, context) {
  const { selectionSystem, allColumnsMeta, gridBodyContainer } = context;
  if (!selectionSystem.state.isDragging || !gridBodyContainer) return;

  const updateSelection = (clientX, clientY) => {
    const element = document.elementFromPoint(clientX, clientY);
    if (!element) return;

    const cell = element.closest('td, th');
    if (!cell) return;

    const colIndexAttr = cell.dataset.col;
    if (colIndexAttr === undefined) return;

    const colIndex = parseInt(colIndexAttr, 10);
    let rowIndex;

    // data-row 속성이 있으면 body 셀, 없으면 header 셀로 간주
    if (cell.dataset.row !== undefined) {
      rowIndex = parseInt(cell.dataset.row, 10);
    } else if (cell.tagName === 'TH') {
      rowIndex = -1; // 헤더 행은 -1
    } else {
      return; // 처리할 수 없는 셀
    }

    if (!isNaN(rowIndex) && !isNaN(colIndex)) {
      selectionSystem.updateDragSelection(rowIndex, colIndex, allColumnsMeta);
    }
  };

  // --- Auto-scroll logic ---
  stopAutoScroll();

  const rect = gridBodyContainer.getBoundingClientRect();
  const buffer = 40;
  let scrollX = 0;
  let scrollY = 0;

  if (event.clientY < rect.top + buffer) scrollY = -20;
  if (event.clientY > rect.bottom - buffer) scrollY = 20;
  if (event.clientX < rect.left + buffer) scrollX = -20;
  if (event.clientX > rect.right - buffer) scrollX = 20;
  
  if (scrollX !== 0 || scrollY !== 0) {
      autoScrollInterval = setInterval(() => {
          gridBodyContainer.scrollTop += scrollY;
          gridBodyContainer.scrollLeft += scrollX;
          // 스크롤 중에도 커서 위치의 셀을 계속 선택하도록 업데이트
          updateSelection(event.clientX, event.clientY);
      }, 50);
  }

  // --- Standard drag selection update ---
  updateSelection(event.clientX, event.clientY);
}

/**
 * document 전체에서 마우스 버튼을 뗐을 때 이벤트를 처리합니다.
 * 드래그 선택을 종료하고 자동 스크롤을 중지합니다.
 * @param {Event} event 
 * @param {object} context 
 */
export function handleVirtualDocumentMouseUp(event, context) {
  stopAutoScroll();
  context.selectionSystem.endDragSelection();
} 