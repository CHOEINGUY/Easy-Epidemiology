/**
 * Cell editing handlers for virtual scroll grid.
 * Includes DateTimePicker integration and inline editing logic.
 */
import { calculatePickerPosition } from '../utils/uiUtils.js';
// import { setupDateTimeInputHandling } from './keyboardDateTime.js';
import { findNextNavigableCell } from './keyboardNavigation.js';

// Constants for column types
const COL_TYPE_IS_PATIENT = 'isPatient';
const COL_TYPE_BASIC = 'basic';
const COL_TYPE_ONSET = 'symptomOnset';
const COL_TYPE_INDIVIDUAL_EXPOSURE = 'individualExposureTime';

/**
 * Handles double clicks on a virtualized cell.
 */
export async function handleVirtualCellDoubleClick(rowIndex, colIndex, event, context) {
  const { getOriginalIndex, allColumnsMeta, selectionSystem } = context;

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

  const columnMeta = allColumnsMeta.find(col => col.colIndex === colIndex);
  if (!columnMeta || !columnMeta.isEditable) return;

  console.log(`[DoubleClick] Starting edit for cell: ${originalRowIndex}, ${colIndex}`);

  // Select logic
  selectionSystem.selectCell(originalRowIndex, colIndex);

  const isDateTimeColumn = columnMeta.type === COL_TYPE_ONSET || 
                           columnMeta.type === COL_TYPE_INDIVIDUAL_EXPOSURE;

  if (isDateTimeColumn) {
    await handleDateTimePickerEdit(originalRowIndex, colIndex, event, context);
  } else {
    await handleInlineEdit(originalRowIndex, colIndex, event, context);
  }
}

/**
 * Handles DateTimePicker edit initiation.
 */
export async function handleDateTimePickerEdit(rowIndex, colIndex, event, context) {
  const { allColumnsMeta } = context;
  
  if (!context.dateTimePickerRef || !context.dateTimePickerRef.value) {
    console.warn('[DateTimePicker] DateTimePicker reference not found, falling back to date-aware inline edit');
    await handleDateTimeInlineEdit(rowIndex, colIndex, event, context);
    return;
  }

  console.log(`[DateTimePicker] Starting date picker edit for cell: ${rowIndex}, ${colIndex}`);
  
  const columnMeta = allColumnsMeta.find(col => col.colIndex === colIndex);
  const row = rowIndex >= 0 ? context.rows.value[rowIndex] : null;
  const currentValue = context.getCellValue(row, columnMeta, rowIndex);
  
  const { parseDateTime } = await import('../utils/dateTimeUtils.js');
  const parsedDateTime = parseDateTime(currentValue);
  
  const cellRect = event.target.getBoundingClientRect();
  const pickerPosition = calculatePickerPosition(cellRect);
  
  if (context.dateTimePickerState) {
    context.dateTimePickerState.visible = true;
    context.dateTimePickerState.position = pickerPosition;
    context.dateTimePickerState.initialValue = parsedDateTime;
    context.dateTimePickerState.currentEdit = {
      rowIndex,
      colIndex,
      columnMeta
    };
  } else {
    console.warn('[DateTimePicker] dateTimePickerState not found in context');
    await handleDateTimeInlineEdit(rowIndex, colIndex, event, context);
  }
}

/**
 * Handles date-time aligned inline editing (fallback).
 */
export async function handleDateTimeInlineEdit(rowIndex, colIndex, event, context) {
  await handleInlineEdit(rowIndex, colIndex, event, context);
  
  const cellElement = event.target.closest('td, th');
  if (cellElement) {
    const originalHandleInput = cellElement._handleInput;
    
    cellElement._handleInput = (e) => {
      const newValue = e.target.textContent;
      const dateTimeRegex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/;
      
      if (newValue && newValue.length >= 16 && !dateTimeRegex.test(newValue)) {
        cellElement.style.backgroundColor = '#ffebee';
        cellElement.title = 'YYYY-MM-DD HH:mm 형식으로 입력하세요';
      } else {
        cellElement.style.backgroundColor = '';
        cellElement.title = '';
      }
      
      if (originalHandleInput) {
        originalHandleInput(e);
      }
    };
  }
}

/**
 * Standard inline editing handler.
 */
export async function handleInlineEdit(rowIndex, colIndex, event, context) {
  const { allColumnsMeta, selectionSystem, getCellValue, rows, cellInputState, storeBridge } = context;
  
  if (rowIndex < 0) {
    selectionSystem.startEditing(rowIndex, colIndex, getCellValue, null, cellInputState, allColumnsMeta);
  } else {
    const row = rows.value[rowIndex];
    if (row) {
      selectionSystem.startEditing(rowIndex, colIndex, getCellValue, row, cellInputState, allColumnsMeta);
    }
  }

  await new Promise(resolve => requestAnimationFrame(resolve));

  const cellElement = event.target.closest('td, th');
  if (cellElement) {
    console.log('[DoubleClick] Setting up DOM for editing');
    
    cellElement.contentEditable = 'true';
    cellElement.focus();
    
    const columnMeta = allColumnsMeta.find(col => col.colIndex === colIndex);
    
    const handleEditComplete = () => {
      console.log(`[DoubleClick] Edit complete event triggered for cell: ${rowIndex}, ${colIndex}`);
      
      cellElement.removeEventListener('blur', handleEditComplete);
      cellElement.removeEventListener('focusout', handleEditComplete);
      cellElement.removeEventListener('input', handleInput);
      cellElement.removeEventListener('keydown', handleKeyDown);
      
      const tempValue = cellInputState.getTempValue(rowIndex, colIndex);
      if (tempValue !== null) {
        storeBridge.saveCellValue(rowIndex, colIndex, tempValue, columnMeta);
        console.log(`[DoubleClick] Saved value: ${tempValue} for cell: ${rowIndex}, ${colIndex}`);

        try {
          if (context.validationManager) {
            context.validationManager.validateCell(rowIndex, colIndex, tempValue, columnMeta.type);
          }
        } catch (error) {
          console.error('[DoubleClick] Validation failed:', error);
        }
      }
      
      cellInputState.confirmEditing();
      selectionSystem.stopEditing(true);
    };
    
    const handleInput = (e) => {
      const newValue = e.target.textContent;
      cellInputState.updateTempValue(rowIndex, colIndex, newValue, columnMeta);
      console.log(`[DoubleClick] Input event: ${newValue} for cell: ${rowIndex}, ${colIndex}`);
    };
    
    const handleKeyDown = async (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        handleEditComplete();
        
        const nextRow = rowIndex < rows.value.length - 1 ? rowIndex + 1 : rowIndex;
        selectionSystem.selectCell(nextRow, colIndex);
        await context.ensureCellIsVisible(nextRow, colIndex);
        context.focusGrid();
      } else if (e.key === 'Tab') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        handleEditComplete();
        
        const tabTarget = findNextNavigableCell(rowIndex, colIndex, 'right', allColumnsMeta, rows.value.length, allColumnsMeta.length);
        selectionSystem.selectCell(tabTarget.rowIndex, tabTarget.colIndex);
        await context.ensureCellIsVisible(tabTarget.rowIndex, tabTarget.colIndex);
        context.focusGrid();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        cellElement.removeEventListener('blur', handleEditComplete);
        cellElement.removeEventListener('focusout', handleEditComplete);
        cellElement.removeEventListener('input', handleInput);
        cellElement.removeEventListener('keydown', handleKeyDown);
        
        cellInputState.cancelEditing();
        selectionSystem.stopEditing(false);
      }
    };
    
    cellElement.addEventListener('blur', handleEditComplete);
    cellElement.addEventListener('focusout', handleEditComplete);
    cellElement.addEventListener('input', handleInput);
    cellElement.addEventListener('keydown', handleKeyDown);
    
    // Conditional text selection logic
    const selection = window.getSelection();
    selection.removeAllRanges();
    const range = document.createRange();

    const selectAllTypes = [
      COL_TYPE_IS_PATIENT,
      COL_TYPE_BASIC,
      'clinicalSymptoms',
      'dietInfo'
    ];

    if (rowIndex >= 0 && selectAllTypes.includes(columnMeta.type)) {
      range.selectNodeContents(cellElement);
    } else {
      let cursorPosition = 0;
      try {
        if (document.caretRangeFromPoint) {
          const range = document.caretRangeFromPoint(event.clientX, event.clientY);
          if (range && range.startContainer === cellElement.firstChild) {
            cursorPosition = range.startOffset;
          } else if (range && cellElement.contains(range.startContainer)) {
            const textContent = cellElement.textContent;
            const clickX = event.clientX - cellElement.getBoundingClientRect().left;
            const cellWidth = cellElement.getBoundingClientRect().width;
            cursorPosition = Math.round((clickX / cellWidth) * textContent.length);
          }
        } 
        else if (document.caretPositionFromPoint) {
          const caretPos = document.caretPositionFromPoint(event.clientX, event.clientY);
          if (caretPos && caretPos.offsetNode === cellElement.firstChild) {
            cursorPosition = caretPos.offset;
          }
        } 
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
    console.log(`[DoubleClick] Editing setup complete for cell: ${rowIndex}, ${colIndex}`);
  }
}
