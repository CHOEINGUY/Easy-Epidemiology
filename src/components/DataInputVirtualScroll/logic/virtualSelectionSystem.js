import { readonly, reactive } from 'vue';

/**
 * 가상 스크롤 환경에 최적화된 경량 선택 시스템입니다.
 */
export function useVirtualSelectionSystem() {
  const state = reactive({
    /** 단일 선택된 셀 */
    selectedCell: { rowIndex: null, colIndex: null },
    /** 드래그 시작점 (고정점) */
    selectionAnchor: { rowIndex: null, colIndex: null },
    /** 드래그 중인 범위 */
    selectedRange: {
      start: { rowIndex: null, colIndex: null },
      end: { rowIndex: null, colIndex: null }
    },
    /** 드래그 중인지 여부 */
    isDragging: false,
    dragContext: null, // 'header', 'body', or null

    /** 편집 중인지 여부 */
    isEditing: false,
    /** 편집 중인 셀 정보 */
    editingCell: { rowIndex: null, colIndex: null },
    /** 편집 시작 시 원본 값 (ESC 키로 복원용) */
    originalCellValue: null,

    /** Ctrl+Click 등으로 개별 선택된 셀 집합 */
    selectedCellsIndividual: new Set(), // key: `${r}_${c}`

    /** Ctrl+Click 등으로 개별 선택된 행 집합 (serial 열 클릭) */
    selectedRowsIndividual: new Set() // value: rowIndex
  });

  /**
   * 특정 셀을 선택합니다. (단일 클릭 시)
   * @param {number} rowIndex - 실제 데이터의 행 인덱스
   * @param {number} colIndex - 열 인덱스
   */
  function selectCell(rowIndex, colIndex) {
    state.selectedCell = { rowIndex, colIndex };
    state.selectionAnchor = { rowIndex, colIndex };
    state.selectedRange = {
      start: { rowIndex, colIndex },
      end: { rowIndex, colIndex }
    };
    console.log(`[VirtualSelection] Cell selected: ${rowIndex}, ${colIndex}`);
  }

  /**
   * 행 전체를 선택합니다.
   * @param {number} rowIndex 
   * @param {object} allColumnsMeta 
   */
  function selectRow(rowIndex, allColumnsMeta) {
    const lastCol = allColumnsMeta.length > 0 ? allColumnsMeta.length - 1 : 0;
    state.selectedCell = { rowIndex, colIndex: 0 };
    state.selectionAnchor = { rowIndex, colIndex: 0 };
    state.selectedRange.start = { rowIndex, colIndex: 0 };
    state.selectedRange.end = { rowIndex, colIndex: lastCol };
    console.log(`[VirtualSelection] Row selected: ${rowIndex}`);
  }

  /**
   * 드래그를 시작할 준비를 합니다.
   */
  function startDrag(colIndex) {
    state.isDragging = true;
    const { rowIndex } = state.selectionAnchor;
    if (colIndex === 0) {
      state.dragContext = 'row';
    } else {
      state.dragContext = rowIndex < 0 ? 'header' : 'body';
    }
  }

  /**
   * 드래그 중 선택 범위를 업데이트합니다.
   * @param {number} rowIndex 
   * @param {number} colIndex 
   * @param {Array} allColumnsMeta - 전체 컬럼 메타 정보
   */
  function updateDragSelection(rowIndex, colIndex, allColumnsMeta) {
    if (!state.isDragging) return;

    // 헤더/바디 경계 로직
    if (state.dragContext === 'header' && rowIndex >= 0) {
      rowIndex = -1;
    } else if (state.dragContext === 'body' && rowIndex < 0) {
      rowIndex = 0;
    }

    let startRow, endRow, startCol, endCol;

    if (state.dragContext === 'row') {
      startRow = Math.min(state.selectionAnchor.rowIndex, rowIndex);
      endRow = Math.max(state.selectionAnchor.rowIndex, rowIndex);
      startCol = 0;
      endCol = allColumnsMeta.length - 1;
    } else { // 'header' or 'body'
      startRow = Math.min(state.selectionAnchor.rowIndex, rowIndex);
      endRow = Math.max(state.selectionAnchor.rowIndex, rowIndex);
      startCol = Math.min(state.selectionAnchor.colIndex, colIndex);
      endCol = Math.max(state.selectionAnchor.colIndex, colIndex);
    }

    state.selectedRange.start = { rowIndex: startRow, colIndex: startCol };
    state.selectedRange.end = { rowIndex: endRow, colIndex: endCol };
    state.selectedCell = { rowIndex, colIndex };
  }

  /**
   * 드래그 선택을 종료합니다.
   */
  function endDragSelection() {
    // 드래그 종료 시 첫 번째 셀을 선택 (구글 시트/엑셀과 동일한 동작)
    if (state.selectedRange.start.rowIndex !== null && 
        state.selectedRange.start.colIndex !== null) {
      state.selectedCell = {
        rowIndex: state.selectedRange.start.rowIndex,
        colIndex: state.selectedRange.start.colIndex
      };
    }
    
    state.isDragging = false;
    state.dragContext = null; // Reset drag context
    console.log('[VirtualSelection] Drag ended. First cell selected.');
  }

  /**
   * 모든 선택을 해제합니다.
   */
  function clearSelection() {
    state.selectedCell = { rowIndex: null, colIndex: null };
    state.selectionAnchor = { rowIndex: null, colIndex: null };
    state.selectedRange = {
      start: { rowIndex: null, colIndex: null },
      end: { rowIndex: null, colIndex: null }
    };
    state.selectedCellsIndividual.clear();
    state.selectedRowsIndividual.clear();
  }

  function extendSelection(targetRow, targetCol) {
    if (state.selectionAnchor.rowIndex === null) {
      selectCell(targetRow, targetCol);
      return;
    }

    // selectionAnchor를 기준으로 범위를 계산하고, 항상 start가 end보다 작거나 같도록 정규화합니다.
    const anchor = state.selectionAnchor;
    const startRow = Math.min(anchor.rowIndex, targetRow);
    const endRow = Math.max(anchor.rowIndex, targetRow);
    const startCol = Math.min(anchor.colIndex, targetCol);
    const endCol = Math.max(anchor.colIndex, targetCol);

    state.selectedRange.start = { rowIndex: startRow, colIndex: startCol };
    state.selectedRange.end = { rowIndex: endRow, colIndex: endCol };

    // 현재 활성화된(움직이는) 셀의 위치도 업데이트합니다.
    state.selectedCell = { rowIndex: targetRow, colIndex: targetCol };
  }

  /**
   * 특정 범위를 선택하고 첫 번째 셀을 활성화합니다.
   * 붙여넣기 후 시각적 선택 영역 표시용
   * @param {number} startRow - 시작 행
   * @param {number} startCol - 시작 열
   * @param {number} endRow - 끝 행
   * @param {number} endCol - 끝 열
   */
  function setSelectionRange(startRow, startCol, endRow, endCol) {
    state.selectedRange.start = { rowIndex: startRow, colIndex: startCol };
    state.selectedRange.end = { rowIndex: endRow, colIndex: endCol };
    state.selectedCell = { rowIndex: startRow, colIndex: startCol };
    state.selectionAnchor = { rowIndex: startRow, colIndex: startCol };
    console.log(`[VirtualSelection] Range selected: ${startRow},${startCol} to ${endRow},${endCol}`);
  }

  /**
   * 특정 셀의 편집을 시작합니다.
   * @param {number} rowIndex 
   * @param {number} colIndex 
   * @param {function} getCellValue - 셀 값을 가져오는 함수
   * @param {object} row - 현재 행 데이터
   * @param {object} cellInputState - 셀 입력 상태 관리자 (선택적)
   * @param {array} allColumnsMeta - 모든 컬럼 메타 정보 (선택적)
   */
  function startEditing(rowIndex, colIndex, getCellValue, row, cellInputState = null, allColumnsMeta = null) {
    // 이미 같은 셀을 편집하고 있다면 아무것도 하지 않음
    if (state.isEditing && state.editingCell.rowIndex === rowIndex && state.editingCell.colIndex === colIndex) {
      return;
    }

    // 다른 셀을 편집하고 있었다면, 안전을 위해 기존 편집을 종료
    if (state.isEditing) {
      stopEditing(true); // 변경사항 저장을 시도
    }
    
    // 컬럼 메타 정보 가져오기
    let column;
    if (allColumnsMeta) {
      column = allColumnsMeta.find(c => c.colIndex === colIndex);
    } else {
      column = getColumnMeta(colIndex);
    }
    
    if (!column || !column.isEditable) return;

    // 원본 값 저장
    const originalValue = getCellValue(row, column, rowIndex);
    state.originalCellValue = originalValue;

    // CellInputState 편집 상태 설정
    if (cellInputState) {
      cellInputState.startEditing(rowIndex, colIndex, originalValue, column);
    }

    state.isEditing = true;
    state.editingCell = { rowIndex, colIndex };
    console.log(`[VirtualSelection] Start editing: ${rowIndex}, ${colIndex}`);
  }

  /**
   * 셀 편집을 종료합니다.
   * @param {boolean} shouldSaveChanges - 변경사항 저장 여부
   * @param {object} cellInputState - 셀 입력 상태 관리자 (선택적)
   */
  function stopEditing(shouldSaveChanges = true, cellInputState = null) {
    if (!state.isEditing) return;

    // Preserve the cell being edited for DOM cleanup later
    const { rowIndex: prevRow, colIndex: prevCol } = state.editingCell;
    const originalValue = state.originalCellValue;

    // CellInputState 편집 상태 정리
    if (cellInputState) {
      if (shouldSaveChanges) {
        cellInputState.stopEditing(true);
      } else {
        cellInputState.cancelEditing();
      }
    }

    state.isEditing = false;
    state.editingCell = { rowIndex: null, colIndex: null };
    state.originalCellValue = null;
    console.log(`[VirtualSelection] Stop editing. Save changes: ${shouldSaveChanges}`);

    // --- DOM Cleanup -------------------------------------------------------
    try {
      // 1) Remove contentEditable attribute & blur the previously edited cell
      let selector = null;
      if (prevRow !== null && prevCol !== null) {
        selector = prevRow < 0
          ? `[data-col="${prevCol}"]`
          : `[data-row="${prevRow}"][data-col="${prevCol}"]`;
      }
      if (selector) {
        const cellElem = document.querySelector(selector);
        if (cellElem) {
          cellElem.removeAttribute('contenteditable');
          cellElem.blur();
          
          // ESC 키를 눌렀을 때 원래 값으로 복원
          if (!shouldSaveChanges && originalValue !== null) {
            cellElem.textContent = originalValue;
            console.log(`[VirtualSelection] 원래 값으로 복원: ${originalValue}`);
          }
        }
      }
      // 2) Clear any leftover text selection highlight in the document
      const sel = window.getSelection();
      if (sel && sel.removeAllRanges) {
        sel.removeAllRanges();
      }
    } catch (err) {
      console.warn('[VirtualSelection] stopEditing DOM cleanup failed:', err);
    }
  }

  /**
   * 개별 셀 선택 토글 (Ctrl+Click)
   */
  function toggleIndividualCell(rowIndex, colIndex) {
    const key = `${rowIndex}_${colIndex}`;
    if (state.selectedCellsIndividual.has(key)) {
      state.selectedCellsIndividual.delete(key);
    } else {
      state.selectedCellsIndividual.add(key);
    }
    // 단일 선택 셀 갱신은 하지 않음 – UI 표시용 set 이용
  }

  /**
   * 개별 행 선택 토글 (Ctrl+Serial 클릭)
   */
  function toggleIndividualRow(rowIndex) {
    if (state.selectedRowsIndividual.has(rowIndex)) {
      state.selectedRowsIndividual.delete(rowIndex);
    } else {
      state.selectedRowsIndividual.add(rowIndex);
    }
  }

  /**
   * Ctrl 다중 선택으로 쌓여 있는 개별 셀·행 선택을 모두 해제합니다.
   * 일반 클릭이나 범위 선택을 시작할 때 호출합니다.
   */
  function clearIndividualSelections() {
    state.selectedCellsIndividual.clear();
    state.selectedRowsIndividual.clear();
  }

  /**
   * 연속 행 범위 선택 (Ctrl+Shift+Serial 클릭)
   */
  function selectRowRange(startRow, endRow) {
    state.selectedRowsIndividual.clear();
    const [s, e] = startRow <= endRow ? [startRow, endRow] : [endRow, startRow];
    for (let i = s; i <= e; i++) {
      state.selectedRowsIndividual.add(i);
    }
  }

  return {
    state: readonly(state),
    selectCell,
    selectRow,
    startDrag,
    updateDragSelection,
    endDragSelection,
    clearSelection,
    extendSelection,
    setSelectionRange,
    startEditing,
    stopEditing,
    toggleIndividualCell,
    toggleIndividualRow,
    selectRowRange,
    clearIndividualSelections
  };
}

// 이 파일은 외부 컨텍스트(allColumnsMeta)에 대한 접근 권한이 없으므로,
// 임시로 getColumnMeta를 정의합니다. 실제 구현에서는
// DataInputVirtual.vue에서 이 함수를 제공받아 사용해야 합니다.
let allColumnsMetaCache = [];
function getColumnMeta(colIndex) {
  if (allColumnsMetaCache.length === 0) {
    console.warn('allColumnsMeta is not set. Please ensure it is passed correctly.');
    return null;
  }
  return allColumnsMetaCache.find(c => c.colIndex === colIndex);
}
export function setColumnsMeta(columns) {
  allColumnsMetaCache = columns;
} 