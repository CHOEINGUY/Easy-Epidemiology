/**
 * Mouse interaction handlers for virtual scroll grid.
 * Handles selection, drag, and auto-scroll.
 */
// import { COL_IDX_SERIAL } from '../constants/index.js';
// Actually, COL_IDX_SERIAL is not directly used in the snippet I'm copying, but good to check. 
// The snippet uses it via context or literals. Let's stick to the code from virtualCellHandlers.js

let autoScrollInterval = null;

export function stopAutoScroll() {
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
  if (event.button === 2) {
    const { selectedRange, selectedRowsIndividual, selectedCellsIndividual } = selectionSystem.state;
    
    // Check if click is inside range selection
    const isClickInsideRangeSelection =
      selectedRange.start.rowIndex !== null &&
      originalRowIndex >= selectedRange.start.rowIndex &&
      originalRowIndex <= selectedRange.end.rowIndex &&
      colIndex >= selectedRange.start.colIndex &&
      colIndex <= selectedRange.end.colIndex;

    // Check if click is inside individual selection
    const isRowIndividuallySelected = selectedRowsIndividual.has(originalRowIndex);
    const isCellIndividuallySelected = selectedCellsIndividual.has(`${originalRowIndex}_${colIndex}`);

    // Maintain existing selection on right click if inside
    if (isClickInsideRangeSelection || isRowIndividuallySelected || isCellIndividuallySelected) {
      return;
    }
  }

  // Block selection if clicking inside the currently edited cell
  const { isEditing, editingCell } = selectionSystem.state;
  if (isEditing && 
      editingCell.rowIndex === originalRowIndex && 
      editingCell.colIndex === colIndex) {
    console.log('[CellClick] Click inside editing cell - blocking selection, allowing cursor move');
    event.stopPropagation();
    event.stopImmediatePropagation();
    return;
  }

  // Ctrl / Shift handling
  const isCtrl = event.ctrlKey || event.metaKey;
  const isShift = event.shiftKey;

  if (isCtrl) {
    // First Ctrl interaction: include anchor in individual set
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

    // Ctrl + Shift + Serial: Range of rows
    event.preventDefault();

    if (colIndex === 0 && isShift) {
      const anchorRow = selectionSystem.state.selectionAnchor.rowIndex ?? originalRowIndex;
      selectionSystem.selectRowRange(anchorRow, originalRowIndex);
      return;
    }

    // Ctrl + Serial: Toggle row
    if (colIndex === 0) {
      selectionSystem.toggleIndividualRow(originalRowIndex);
      return;
    }

    // Ctrl + Cell: Toggle cell
    selectionSystem.toggleIndividualCell(originalRowIndex, colIndex);
    return;
  }

  // Shift handling
  if (isShift) {
    event.preventDefault();
    selectionSystem.clearIndividualSelections();
    const anchorRow = selectionSystem.state.selectionAnchor.rowIndex ?? originalRowIndex;
    if (colIndex === 0) {
      selectionSystem.selectRowRange(anchorRow, originalRowIndex);
    } else {
      selectionSystem.extendSelection(originalRowIndex, colIndex);
    }
    return;
  }

  // Default click: Single selection
  if (!isEditing) {
    event.preventDefault();
  }

  if (!isEditing) {
    selectionSystem.clearIndividualSelections();

    if (colIndex === 0) {
      selectionSystem.selectRow(originalRowIndex, allColumnsMeta);
    } else {
      selectionSystem.selectCell(originalRowIndex, colIndex);
    }

    // Start drag
    selectionSystem.startDrag(colIndex);
  }
}

/**
 * Handles mouse move across document for drag selection and auto-scroll.
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

    if (cell.dataset.row !== undefined) {
      rowIndex = parseInt(cell.dataset.row, 10);
    } else if (cell.tagName === 'TH') {
      rowIndex = -1;
    } else {
      return;
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
      updateSelection(event.clientX, event.clientY);
    }, 50);
  }

  // Standard drag update
  updateSelection(event.clientX, event.clientY);
}

/**
 * Handles mouse up across document.
 * @param {Event} event 
 * @param {object} context 
 */
export function handleVirtualDocumentMouseUp(event, context) {
  stopAutoScroll();
  context.selectionSystem.endDragSelection();
}
