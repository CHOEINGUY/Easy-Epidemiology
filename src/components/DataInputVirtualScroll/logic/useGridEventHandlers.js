import { ref, nextTick } from 'vue';
import { handleContextMenu as handleContextMenuAction } from '../handlers/contextMenuHandlers.js';
import {
  handleVirtualCellMouseDown,
  handleVirtualDocumentMouseMove,
  handleVirtualDocumentMouseUp,
  handleVirtualCellDoubleClick,
} from '../handlers/virtualCellHandlers.js';
import { handleVirtualKeyDown } from '../handlers/virtualKeyboardHandlers.js';
import { devLog, logger } from '../../../utils/logger.js';
import {
  COL_IDX_SERIAL,
  COL_IDX_IS_PATIENT,
  COL_TYPE_SERIAL,
  COL_TYPE_IS_PATIENT,
  COL_TYPE_CONFIRMED_CASE,
  COL_TYPE_BASIC,
  COL_TYPE_CLINICAL,
  COL_TYPE_ONSET,
  COL_TYPE_DIET,
  COLUMN_STYLES,
  COL_TYPE_INDIVIDUAL_EXPOSURE
} from '../constants/index.js';


export function useGridEventHandlers(
  {
    selectionSystem,
    storeBridge,
    cellInputState,
    validationManager,
    allColumnsMeta,
    contextMenuState,
    dateTimePickerRef,
    dateTimePickerState,
    gridBodyRef
  },
  {
    showContextMenu,
    hideContextMenu,
    focusGrid,
    ensureCellIsVisible,
    getCellValue,
    captureSnapshotWithFilter,
  }
) {
  const onDocumentMouseMoveBound = ref(null);
  const onDocumentMouseUpBound = ref(null);

  function createHandlerContext() {
    return {
      selectionSystem,
      allColumnsMeta: allColumnsMeta.value,
      gridBodyContainer: gridBodyRef.value?.bodyContainer,
      ensureCellIsVisible,
      getCellValue,
      storeBridge,
      cellInputState,
      validationManager,
      isEditing: selectionSystem.state.isEditing,
      editingCell: selectionSystem.state.editingCell,
      startEditing: (rowIndex, colIndex, getCellValue, row) =>
        selectionSystem.startEditing(rowIndex, colIndex, getCellValue, row, cellInputState, allColumnsMeta.value),
      stopEditing: (shouldSaveChanges = true) =>
        selectionSystem.stopEditing(shouldSaveChanges, cellInputState),
      originalCellValue: selectionSystem.state.originalCellValue,
      focusGrid,
      onCellEditComplete,
      showContextMenu,
      hideContextMenu,
      dateTimePickerRef,
      dateTimePickerState,
      captureSnapshotWithFilter,
    };
  }

  function onCellEditComplete(rowIndex, colIndex, shouldSave = true) {
    if (!shouldSave) {
      cellInputState.cancelEditing();
      return;
    }

    const tempValue = cellInputState.getTempValue(rowIndex, colIndex);
    if (tempValue !== null) {
      const columnMeta = allColumnsMeta.value.find(c => c.colIndex === colIndex);
      if (columnMeta) {
        storeBridge.saveCellValue(rowIndex, colIndex, tempValue, columnMeta);
        validationManager.validateCell(rowIndex, colIndex, tempValue, columnMeta.type);
      }
    }
  }

  function onContextMenu(event, virtualRowIndex, colIndex) {
    const context = createHandlerContext();
    handleContextMenuAction(event, virtualRowIndex, colIndex, context);
  }

  function closeDateTimePicker() {
    devLog('[DateTimePicker] Closing date picker');
    dateTimePickerState.visible = false;
    dateTimePickerState.currentEdit = null;
    nextTick(() => {
      focusGrid();
    });
  }

  function onCellMouseDown(virtualRowIndex, colIndex, event) {
    const originalRowIndex = virtualRowIndex;

    if (dateTimePickerState.visible) {
      const currentEdit = dateTimePickerState.currentEdit;
      if (currentEdit && (currentEdit.rowIndex !== originalRowIndex || currentEdit.colIndex !== colIndex)) {
        closeDateTimePicker();
      } else if (currentEdit && currentEdit.rowIndex === originalRowIndex && currentEdit.colIndex === colIndex) {
        return;
      }
    }

    if (
      selectionSystem.state.isEditing &&
      selectionSystem.state.editingCell.rowIndex === originalRowIndex &&
      selectionSystem.state.editingCell.colIndex === colIndex
    ) {
      return;
    }

    if (
      selectionSystem.state.isEditing &&
      (selectionSystem.state.editingCell.rowIndex !== originalRowIndex ||
        selectionSystem.state.editingCell.colIndex !== colIndex) &&
      event.detail !== 2
    ) {
      const { rowIndex: editRow, colIndex: editCol } = selectionSystem.state.editingCell;
      const tempValue = cellInputState.getTempValue(editRow, editCol);
      const columnMeta = allColumnsMeta.value.find(c => c.colIndex === editCol);

      if (tempValue !== null && columnMeta) {
        storeBridge.saveCellValue(editRow, editCol, tempValue, columnMeta);
        validationManager.validateCell(editRow, editCol, tempValue, columnMeta.type);
      }

      cellInputState.confirmEditing();
      selectionSystem.stopEditing(true);
    }

    focusGrid();

    const context = createHandlerContext();
    handleVirtualCellMouseDown(virtualRowIndex, colIndex, event, context);

    onDocumentMouseMoveBound.value = (e) => onDocumentMouseMove(e);
    onDocumentMouseUpBound.value = (e) => onDocumentMouseUp(e);

    document.addEventListener('mousemove', onDocumentMouseMoveBound.value);
    document.addEventListener('mouseup', onDocumentMouseUpBound.value, { once: true });
  }

  function onDocumentMouseMove(event) {
    const context = createHandlerContext();
    handleVirtualDocumentMouseMove(event, context);
  }

  function onDocumentMouseUp(event) {
    if (onDocumentMouseMoveBound.value) {
      document.removeEventListener('mousemove', onDocumentMouseMoveBound.value);
      onDocumentMouseMoveBound.value = null;
    }

    const context = createHandlerContext();
    handleVirtualDocumentMouseUp(event, context);
  }

  function onKeyDown(event) {
    if (dateTimePickerState.visible) {
      switch (event.key) {
        case 'Escape':
          event.preventDefault();
          event.stopPropagation();
          onDateTimeCancel();
          return;
        case 'Enter':
          event.preventDefault();
          event.stopPropagation();
          if (dateTimePickerRef.value?.confirm) {
            dateTimePickerRef.value.confirm();
          }
          return;
        case 'Tab':
          event.preventDefault();
          event.stopPropagation();
          if (dateTimePickerRef.value?.confirm) {
            dateTimePickerRef.value.confirm();
          }
          return;
        default:
          return;
      }
    }

    const context = createHandlerContext();
    handleVirtualKeyDown(event, context);
  }

  async function onCellDoubleClick(virtualRowIndex, colIndex, event) {
    const context = createHandlerContext();
    await handleVirtualCellDoubleClick(virtualRowIndex, colIndex, event, context);
  }

  function onCellInput(event, rowIndex, colIndex) {
    if (!selectionSystem.state.isEditing) return;

    const columnMeta = allColumnsMeta.value.find(c => c.colIndex === colIndex);
    if (!columnMeta || !columnMeta.isEditable) return;

    const newValue = event.target.textContent;
    cellInputState.updateTempValue(rowIndex, colIndex, newValue, columnMeta);
  }

  function onUpdateCellValueFromBar(newValue) {
    const { rowIndex, colIndex } = selectionSystem.state.selectedCell;
    if (rowIndex === null || colIndex === null) return;

    const columnMeta = allColumnsMeta.value.find(c => c.colIndex === colIndex);
    if (!columnMeta || !columnMeta.isEditable) return;

    cellInputState.updateTempValue(rowIndex, colIndex, newValue, columnMeta);
  }

  function onEnterPressedFromBar() {
    const { rowIndex, colIndex } = selectionSystem.state.selectedCell;
    if (rowIndex === null || colIndex === null) return;

    let nextRow = rowIndex;
    if (rowIndex < 0) {
      nextRow = 0;
    } else if (rowIndex < storeBridge.getRows().length - 1) {
      nextRow = rowIndex + 1;
    }

    selectionSystem.selectCell(nextRow, colIndex);
    ensureCellIsVisible(nextRow, colIndex);
    focusGrid();
  }

  async function onDateTimeConfirm(dateTimeObject) {
    const editInfo = dateTimePickerState.currentEdit;
    if (!editInfo) {
      dateTimePickerState.visible = false;
      return;
    }

    const { rowIndex, colIndex, columnMeta } = editInfo;

    try {
      const { formatDateTime } = await import('../utils/dateTimeUtils.js');
      const formattedValue = formatDateTime(dateTimeObject);

      storeBridge.saveCellValue(rowIndex, colIndex, formattedValue, columnMeta);
      validationManager.validateCell(rowIndex, colIndex, formattedValue, columnMeta.type);

    } catch (error) {
      logger.error('[DateTimePicker] Error saving date:', error);
    }

    dateTimePickerState.visible = false;
    dateTimePickerState.currentEdit = null;

    nextTick(() => {
      focusGrid();
    });
  }

  function onDateTimeCancel() {
    closeDateTimePicker();
  }

  function handleGlobalClick(event) {
    if (dateTimePickerState.visible) {
      const dateTimePickerElement = dateTimePickerRef.value?.$el;
      if (dateTimePickerElement) {
        let isInsidePicker = false;
        let currentElement = event.target;

        while (currentElement && currentElement !== document.body) {
          if (currentElement === dateTimePickerElement) {
            isInsidePicker = true;
            break;
          }
          currentElement = currentElement.parentElement;
        }

        if (!isInsidePicker) {
          closeDateTimePicker();
        }
      }
    }
  }

  // --- Context Menu Action Handlers ---

  async function handleClearCellData(target) {
    const { selectedCellsIndividual } = selectionSystem.state;
    if (selectedCellsIndividual.size > 0) {
      for (const cellKey of selectedCellsIndividual) {
        const [rowStr, colStr] = cellKey.split('_');
        const rowIndex = parseInt(rowStr, 10);
        const colIndex = parseInt(colStr, 10);
        const columnMeta = allColumnsMeta.value.find(c => c.colIndex === colIndex);
        if (columnMeta) {
          await storeBridge.dispatch('clearCellData', { rowIndex, colIndex, type: columnMeta.type });
        }
      }
    } else {
      const columnMeta = allColumnsMeta.value.find(c => c.colIndex === target.colIndex);
      if (columnMeta) {
        await storeBridge.dispatch('clearCellData', { rowIndex: target.rowIndex, colIndex: target.colIndex, type: columnMeta.type });
      }
    }
  }

  async function handleAddRow(action, rowSelection) {
    const index = action === 'add-row-above' ? rowSelection.startRow : rowSelection.endRow + 1;
    await storeBridge.dispatch('insertRowAt', { index, count: rowSelection.count });
  }

  async function handleDeleteRows(rowSelection) {
    if (rowSelection.type === 'individual') {
      const sortedRows = rowSelection.rows.sort((a, b) => b - a);
      for (const rowIndex of sortedRows) {
        await storeBridge.dispatch('deleteMultipleRows', { startRow: rowIndex, endRow: rowIndex });
      }
    } else {
      await storeBridge.dispatch('deleteMultipleRows', { startRow: rowSelection.startRow, endRow: rowSelection.endRow });
    }
  }

  async function handleAddColumn(action, colSelection, target) {
    const oldColumnsMeta = [...allColumnsMeta.value];
    const targetColumn = allColumnsMeta.value.find(c => c.colIndex === target.colIndex);

    if (!targetColumn || !targetColumn.type || ![COL_TYPE_BASIC, 'clinicalSymptoms', 'dietInfo'].includes(targetColumn.type)) return;

    let insertAtIndex;
    if (action === 'add-col-right') {
      const rightmostColumn = allColumnsMeta.value.find(c => c.colIndex === colSelection.endCol);
      insertAtIndex = rightmostColumn ? rightmostColumn.cellIndex + 1 : 0;
    } else {
      const leftmostColumn = allColumnsMeta.value.find(c => c.colIndex === colSelection.startCol);
      insertAtIndex = leftmostColumn ? leftmostColumn.cellIndex : 0;
    }

    await storeBridge.dispatch('insertMultipleColumnsAt', {
      type: targetColumn.type,
      count: colSelection.count,
      index: insertAtIndex
    });

    nextTick(() => {
      const newColumnsMeta = allColumnsMeta.value;
      if (validationManager && oldColumnsMeta.length !== newColumnsMeta.length) {
        validationManager.updateColumnMetas(newColumnsMeta);
        validationManager.remapValidationErrorsByColumnIdentity(oldColumnsMeta, newColumnsMeta);
        if (['clinicalSymptoms', 'dietInfo'].includes(targetColumn.type)) {
          const colIndices = newColumnsMeta.filter(meta => meta.type === targetColumn.type).map(meta => meta.colIndex);
          validationManager.revalidateColumns(colIndices, storeBridge.getRows(), newColumnsMeta);
        }
      }
    });
  }

  async function handleDeleteCols(colSelection) {
    const totalCounts = allColumnsMeta.value.reduce((acc, col) => {
      if ([COL_TYPE_BASIC, 'clinicalSymptoms', 'dietInfo'].includes(col.type)) {
        if (!acc[col.type]) acc[col.type] = 0;
        acc[col.type]++;
      }
      return acc;
    }, {});

    const selectedCounts = {};
    const columnsToCheck = colSelection.type === 'individual' ? colSelection.columns :
      Array.from({length: colSelection.endCol - colSelection.startCol + 1}, (_, i) => colSelection.startCol + i);

    for (const colIndex of columnsToCheck) {
      const meta = allColumnsMeta.value.find(c => c.colIndex === colIndex);
      if (meta && [COL_TYPE_BASIC, 'clinicalSymptoms', 'dietInfo'].includes(meta.type)) {
        if (!selectedCounts[meta.type]) selectedCounts[meta.type] = 0;
        selectedCounts[meta.type]++;
      }
    }

    const columnsToDelete = [];
    for (const colIndex of columnsToCheck) {
      const meta = allColumnsMeta.value.find(c => c.colIndex === colIndex);
      if (meta && [COL_TYPE_BASIC, 'clinicalSymptoms', 'dietInfo'].includes(meta.type)) {
        if (totalCounts[meta.type] - selectedCounts[meta.type] >= 1) {
          columnsToDelete.push({ type: meta.type, index: meta.cellIndex });
        }
      }
    }

    if (columnsToDelete.length > 0) {
      await storeBridge.dispatch('deleteMultipleColumnsByIndex', { columns: columnsToDelete });
    }
  }

  async function handleClearRowsData(rowSelection) {
    if (rowSelection.type === 'individual') {
      for (const rowIndex of rowSelection.rows) {
        await storeBridge.dispatch('clearMultipleRowsData', { startRow: rowIndex, endRow: rowIndex });
      }
    } else {
      await storeBridge.dispatch('clearMultipleRowsData', { startRow: rowSelection.startRow, endRow: rowSelection.endRow });
    }
  }

  async function handleClearColsData(colSelection) {
    const columnsToCheck = colSelection.type === 'individual' ? colSelection.columns :
      Array.from({length: colSelection.endCol - colSelection.startCol + 1}, (_, i) => colSelection.startCol + i);

    const columnsToClear = [];
    for (const colIndex of columnsToCheck) {
      const meta = allColumnsMeta.value.find(c => c.colIndex === colIndex);
      if(meta) columnsToClear.push(meta);
    }

    const fixedColumnTypes = [COL_TYPE_IS_PATIENT, COL_TYPE_CONFIRMED_CASE, COL_TYPE_ONSET, COL_TYPE_INDIVIDUAL_EXPOSURE];

    for (const col of columnsToClear) {
      if (fixedColumnTypes.includes(col.type)) {
        await storeBridge.dispatch('clearFixedColumnData', { type: col.type });
      } else if (col.type && col.cellIndex !== null && col.cellIndex !== undefined) {
        await storeBridge.dispatch('clearColumnData', { type: col.type, index: col.cellIndex });
      }
    }
  }

  async function handleFilterToggle(action, target) {
    const oldFilterState = JSON.stringify(storeBridge.filterState);
    let filterDetails = {};

    if (action.startsWith('filter-patient-')) {
      const value = action.replace('filter-patient-', '');
      await storeBridge.togglePatientFilter(value);
      filterDetails = { filterType: 'patient', value };
    } else if (action.startsWith('filter-confirmed-')) {
        const value = action.replace('filter-confirmed-', '');
        await storeBridge.toggleConfirmedFilter(target.colIndex, value);
        filterDetails = { filterType: 'confirmed', colIndex: target.colIndex, value };
    } else if (action.startsWith('filter-clinical-')) {
        const value = action.replace('filter-clinical-', '');
        await storeBridge.toggleClinicalFilter(target.colIndex, value);
        filterDetails = { filterType: 'clinical', colIndex: target.colIndex, value };
    } else if (action.startsWith('filter-diet-')) {
        const value = action.replace('filter-diet-', '');
        await storeBridge.toggleDietFilter(target.colIndex, value);
        filterDetails = { filterType: 'diet', colIndex: target.colIndex, value };
    } else if (action.startsWith('filter-basic-')) {
        const value = action.replace('filter-basic-', '');
        await storeBridge.toggleBasicFilter(target.colIndex, value);
        filterDetails = { filterType: 'basic', colIndex: target.colIndex, value };
    } else if (action.startsWith('filter-datetime-')) {
        const value = action.replace('filter-datetime-', '');
        await storeBridge.toggleDateTimeFilter(target.colIndex, value);
        filterDetails = { filterType: 'datetime', colIndex: target.colIndex, value };
    } else if (action === 'clear-all-filters') {
        storeBridge.clearAllFilters();
        filterDetails = { filterType: 'clear_all' };
    }

    if (oldFilterState !== JSON.stringify(storeBridge.filterState)) {
      captureSnapshotWithFilter('filter_change', {
        action,
        ...filterDetails,
        oldFilterState: JSON.parse(oldFilterState),
        newFilterState: { ...storeBridge.filterState }
      });
    }
  }

  async function onContextMenuSelect(action) {
    const { target } = contextMenuState;
    const { selectedRange, selectedRowsIndividual, selectedCellsIndividual } = selectionSystem.state;
    hideContextMenu();

    const getEffectiveRowSelection = () => {
      if (selectedRowsIndividual.size > 0) {
        const rows = Array.from(selectedRowsIndividual).sort((a, b) => a - b);
        if (rows.length === 0) return { type: 'none', startRow: target.rowIndex, endRow: target.rowIndex, count: 0 };
        return { type: 'individual', rows, startRow: Math.min(...rows), endRow: Math.max(...rows), count: rows.length };
      } else if (selectedRange.start.rowIndex !== null) {
        return { type: 'range', startRow: selectedRange.start.rowIndex, endRow: selectedRange.end.rowIndex, count: selectedRange.end.rowIndex - selectedRange.start.rowIndex + 1 };
      }
      return { type: 'none', startRow: target.rowIndex, endRow: target.rowIndex, count: 1 };
    };

    const getEffectiveColumnSelection = () => {
      if (selectedCellsIndividual.size > 0) {
        const columns = new Set();
        selectedCellsIndividual.forEach(cellKey => {
          const [, colStr] = cellKey.split('_');
          columns.add(parseInt(colStr, 10));
        });
        const colArray = Array.from(columns).sort((a, b) => a - b);
        if (colArray.length === 0) return { type: 'none', startCol: target.colIndex, endCol: target.colIndex, count: 0 };
        return { type: 'individual', columns: colArray, startCol: Math.min(...colArray), endCol: Math.max(...colArray), count: colArray.length };
      } else if (selectedRange.start.colIndex !== null) {
        return { type: 'range', startCol: selectedRange.start.colIndex, endCol: selectedRange.end.colIndex, count: selectedRange.end.colIndex - selectedRange.start.colIndex + 1 };
      }
      return { type: 'none', startCol: target.colIndex, endCol: target.colIndex, count: 1 };
    };

    const rowSelection = getEffectiveRowSelection();
    const colSelection = getEffectiveColumnSelection();

    switch (action) {
      case 'clear-cell-data':
        await handleClearCellData(target);
        break;
      case 'add-row-above':
      case 'add-row-below':
        await handleAddRow(action, rowSelection);
        break;
      case 'delete-rows':
        await handleDeleteRows(rowSelection);
        break;
      case 'add-col-left':
      case 'add-col-right':
        await handleAddColumn(action, colSelection, target);
        break;
      case 'delete-cols':
        await handleDeleteCols(colSelection);
        break;
      case 'delete-empty-rows':
        await storeBridge.dispatch('deleteEmptyRows');
        break;
      case 'clear-rows-data':
        await handleClearRowsData(rowSelection);
        break;
      case 'clear-cols-data':
        await handleClearColsData(colSelection);
        break;
      default:
        if (action.startsWith('filter-')) {
          await handleFilterToggle(action, target);
        }
        break;
    }
    selectionSystem.clearIndividualSelections();
  }

  return {
    onKeyDown,
    onCellMouseDown,
    onDocumentMouseMoveBound,
    onDocumentMouseUpBound,
    onCellDoubleClick,
    onCellInput,
    onContextMenu,
    onContextMenuSelect,
    onUpdateCellValueFromBar,
    onEnterPressedFromBar,
    onDateTimeConfirm,
    onDateTimeCancel,
    handleGlobalClick
  };
}
