
import { ref } from 'vue';
import { devLog } from '../../../utils/logger.js';
import {
  handleVirtualCellMouseDown as handleVirtualCellMouseDownImpl,
  handleVirtualDocumentMouseMove as handleVirtualDocumentMouseMoveImpl,
  handleVirtualDocumentMouseUp as handleVirtualDocumentMouseUpImpl
} from '../handlers/virtualMouseHandlers.js';
import { handleVirtualCellDoubleClick as handleVirtualCellDoubleClickImpl } from '../handlers/virtualEditHandlers.js';
import { handleVirtualKeyDown as handleVirtualKeyDownImpl } from '../handlers/virtualKeyboardHandlers.js';

export function useGridInteraction(
  storeBridge,
  selectionSystem,
  cellInputState,
  allColumnsMeta,
  rows,
  focusGrid,
  ensureCellIsVisible,
  validationManager,
  dateTimePickerState,
  dateTimePickerRef,
  gridBodyRef,
  closeDateTimePicker,
  onDateTimeCancel
) {
  const onDocumentMouseMoveBound = ref(null);
  const onDocumentMouseUpBound = ref(null);

  // --- Helper Functions ---
  // Moved getCellValue here as it's used for rendering/interaction
  function getCellValue(row, columnMeta, rowIndex = null) {
    if (!columnMeta) return '';

    if (rowIndex < 0) { // Header cell
      // HTML 태그 제거하여 순수 텍스트만 반환
      const headerText = columnMeta.headerText || '';
      return headerText.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]*>/g, '').trim();
    }

    if (columnMeta.type === 'serial') {
      // 필터링된 행의 경우 원본 인덱스를 사용하여 연번 표시
      if (row && row._originalIndex !== undefined) {
        return row._originalIndex + 1;
      }
      return rowIndex + 1;
    }

    if (!row || !columnMeta.dataKey) return '';

    if (columnMeta.cellIndex !== null && columnMeta.cellIndex !== undefined) {
      if (!row[columnMeta.dataKey] || !Array.isArray(row[columnMeta.dataKey])) {
        return '';
      }
      return row[columnMeta.dataKey][columnMeta.cellIndex] ?? '';
    } else {
      return row[columnMeta.dataKey] ?? '';
    }
  }

  const getOriginalIndex = (virtualIndex) => {
    if (virtualIndex < 0) return virtualIndex;
    return rows.value[virtualIndex]?._originalIndex ?? virtualIndex;
  };

  function createHandlerContext() {
    return {
      allColumnsMeta: allColumnsMeta.value,
      rows,
      selectionSystem,
      storeBridge,
      focusGrid,
      cellInputState,
      getOriginalIndex,
      getCellValue,
      isEditing: selectionSystem.state.isEditing,
      startEditing: selectionSystem.startEditing,
      stopEditing: selectionSystem.stopEditing,
      gridBodyContainer: gridBodyRef.value?.bodyContainer || gridBodyRef.value?.$el || gridBodyRef.value,
      dateTimePickerState,
      dateTimePickerRef,
      validationManager,
      ensureCellIsVisible
    };
  }

  // --- Cell Interaction Handlers (Now calling standalone handlers) ---

  function handleVirtualCellMouseDown(virtualRowIndex, colIndex, event, context) {
    handleVirtualCellMouseDownImpl(virtualRowIndex, colIndex, event, context);
  }

  function handleVirtualDocumentMouseMove(event, context) {
    handleVirtualDocumentMouseMoveImpl(event, context);
  }

  function handleVirtualDocumentMouseUp(event, context) {
    handleVirtualDocumentMouseUpImpl(event, context);
  }

  function onCellMouseDown(rowIndex, colIndex, event) {
    // 데이트피커가 열려있으면 닫기
    if (dateTimePickerState.visible) {
      closeDateTimePicker();
    }

    // 마우스 오른쪽 버튼 클릭 시 컨텍스트 메뉴 처리는 별도로 함 (onContextMenu)
    if (event.button === 2) {
      return;
    }

    const virtualRowIndex = rowIndex;
    const originalRowIndex = rowIndex >= 0 ? (rows.value[rowIndex]?._originalIndex ?? rowIndex) : -1;

    // 편집 중인 셀 클릭 시 처리 로직
    if (
      selectionSystem.state.isEditing &&
            selectionSystem.state.editingCell.rowIndex === originalRowIndex &&
            selectionSystem.state.editingCell.colIndex === colIndex
    ) {
      devLog('[UseGridInteraction] 편집 모드에서 같은 셀 클릭 - 텍스트 커서 이동만 허용');
      return;
    }

    if (
      selectionSystem.state.isEditing &&
            (selectionSystem.state.editingCell.rowIndex !== originalRowIndex ||
                selectionSystem.state.editingCell.colIndex !== colIndex) &&
            event.detail !== 2 // 더블클릭 제외
    ) {
      const { rowIndex: editRow, colIndex: editCol } = selectionSystem.state.editingCell;
      const tempValue = cellInputState.getTempValue(editRow, editCol);
      const columnMeta = allColumnsMeta.value.find(c => c.colIndex === editCol);

      if (tempValue !== null && columnMeta) {
        storeBridge.saveCellValue(editRow, editCol, tempValue, columnMeta);
        devLog(`[UseGridInteraction] 다른 셀 클릭으로 편집 완료: ${editRow}, ${editCol} = ${tempValue}`);
        if (validationManager) {
          validationManager.validateCell(editRow, editCol, tempValue, columnMeta.type);
        }
      }

      cellInputState.confirmEditing();
      selectionSystem.stopEditing(true);
    }

    focusGrid();

    const context = createHandlerContext();
    handleVirtualCellMouseDown(virtualRowIndex, colIndex, event, context);

    // Global mouse listeners
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

  function onCellDoubleClick(rowIndex, colIndex, event) {
    const context = createHandlerContext();
    handleVirtualCellDoubleClickImpl(rowIndex, colIndex, event, context);
  }

  // --- Input Handlers ---

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
    } else if (rowIndex < rows.value.length - 1) {
      nextRow = rowIndex + 1;
    }

    selectionSystem.selectCell(nextRow, colIndex);
    ensureCellIsVisible(nextRow, colIndex);
    focusGrid();
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
    handleVirtualKeyDownImpl(event, context);
  }

  function onCellEditComplete(rowIndex, colIndex, shouldSave = true) {
    if (!shouldSave) {
      // 편집 취소: 임시 값 제거
      cellInputState.cancelEditing();
      return;
    }

    // 편집 완료: 임시 값을 실제 저장
    const tempValue = cellInputState.getTempValue(rowIndex, colIndex);
    if (tempValue !== null) {
      const columnMeta = allColumnsMeta.value.find(c => c.colIndex === colIndex);
      if (columnMeta) {
        // 헤더 셀과 바디 셀 모두 동일한 방식으로 처리
        storeBridge.saveCellValue(rowIndex, colIndex, tempValue, columnMeta);
        devLog(`[DataInputVirtual] Validation 호출: row=${rowIndex}, col=${colIndex}, value="${tempValue}", type="${columnMeta.type}"`);

        if (validationManager) {
          validationManager.validateCell(rowIndex, colIndex, tempValue, columnMeta.type);
        }
      }
    }
  }

  // --- Lifecycle Cleanup helper ---
  function cleanupInteractionListeners() {
    if (onDocumentMouseMoveBound.value) {
      document.removeEventListener('mousemove', onDocumentMouseMoveBound.value);
    }
    if (onDocumentMouseUpBound.value) {
      document.removeEventListener('mouseup', onDocumentMouseUpBound.value);
    }
  }

  return {
    onCellMouseDown,
    onCellDoubleClick,
    onKeyDown,
    onUpdateCellValueFromBar,
    onEnterPressedFromBar,
    onCellEditComplete,
    getCellValue,
    cleanupInteractionListeners,

    // Expose bound refs if needed externally, but mostly internal
    onDocumentMouseMoveBound,
    onDocumentMouseUpBound
  };
}
