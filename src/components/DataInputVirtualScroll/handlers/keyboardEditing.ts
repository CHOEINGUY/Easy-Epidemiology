
import { nextTick } from 'vue';
import { setupDateTimeInputHandling } from './keyboardDateTime';
import { findNextNavigableCell } from './keyboardNavigation';
import type { GridHeader } from '@/types/grid';
import type { GridContext } from '@/types/virtualGridContext';
import { useHistoryStore } from '@/stores/historyStore';
import { CellInputState } from '@/components/DataInputVirtualScroll/logic/virtualSelectionSystem';
import { GridDomManager } from '../utils/domManager';

// Extend HTMLElement to include custom properties used by DateTimePicker
interface DateTimeCellElement extends HTMLElement {
    __dtSaveValue?: () => Promise<void>;
    __dtKeyHandler?: (event: KeyboardEvent) => void;
}

export function isTypingKey(key: string): boolean {
    return key.length === 1 && !/[`~]/.test(key);
}

/**
 * 선택된 셀에서 타이핑을 시작하면 편집 모드로 전환합니다.
 */
export async function handleTypeToEdit(event: KeyboardEvent, context: GridContext) {
    const { selectionSystem, rows, allColumnsMeta, startEditing, getCellValue, gridStore, storageManager, focusGrid, ensureCellIsVisible } = context;
    const { state } = selectionSystem;

    if (state.isEditing) return;

    const { rowIndex, colIndex } = state.selectedCell;

    if (rowIndex === null || colIndex === null) return;

    const column = allColumnsMeta.find((c) => c.colIndex === colIndex);
    if (!column || !column.isEditable) return;

    const isDateTimeColumn = column.type === 'symptomOnset' || column.type === 'individualExposureTime';

    try {
        // 오버레이 시스템 사용 (Dependency Injection)
        if (context.overlayController) {
            const cellElement = GridDomManager.getCellElement(rowIndex, colIndex);
            
            if (cellElement) {
                // 초기 키 값과 함께 오버레이 시작
                context.overlayController.open(rowIndex, colIndex, cellElement, event.key);
                return;
            }
        }

        // Fallback: 기존 contenteditable 방식
        if (rowIndex < 0) {
            // 헤더 셀 편집
            startEditing(rowIndex, colIndex, getCellValue, null, context.gridStore as unknown as CellInputState, allColumnsMeta);
        } else {
            // 바디 셀 편집
            const row = rows.value[rowIndex];
            if (row) {
                startEditing(rowIndex, colIndex, getCellValue, row, context.gridStore as unknown as CellInputState, allColumnsMeta);
            }
        }

        await nextTick();

        const cellElement = GridDomManager.getCellElementByAttribute(rowIndex, colIndex);

        if (cellElement) {
            cellElement.focus();

            if (isDateTimeColumn) {
                setupDateTimeInputHandling(cellElement, event.key, null, context);
            } else {
                const handleInput = (e: Event) => {
                    const newValue = (e.target as HTMLElement).textContent || '';
                    gridStore.updateTempValue(newValue);
                };

                const handleEditComplete = () => {
                    cellElement.removeEventListener('blur', handleEditComplete);
                    cellElement.removeEventListener('focusout', handleEditComplete);
                    cellElement.removeEventListener('input', handleInput);
                    cellElement.removeEventListener('keydown', handleKeyDown);

                    const tempValue = gridStore.tempValue;
                    if (tempValue !== null) {
                         const editData = {
                            cell: { rowIndex, colIndex, dataKey: column.dataKey || '', cellIndex: column.cellIndex },
                            originalValue: '',
                            value: tempValue,
                            columnMeta: column,
                            editDuration: 0,
                            hasChanged: true
                         };
                        storageManager.executeSave(editData);

                        try {
                            if (context.validationManager) {
                                context.validationManager.validateCell(rowIndex, colIndex, tempValue, column.type, true);
                            }
                        } catch (error) {
                            console.error('[TypeToEdit] Validation failed:', error);
                        }
                    }
                    gridStore.confirmEditing();
                    context.selectionSystem.stopEditing(true);
                };

                const handleKeyDown = (e: KeyboardEvent) => {
                    const totalRows = rows.value.length;
                    const totalCols = allColumnsMeta.length;

                    if (e.key === 'Enter') {
                        e.preventDefault();
                        e.stopPropagation(); // Bubbling prevention to avoid Double Save
                        handleEditComplete();
                        
                        // Manual Navigation (Enter -> Next Row)
                        const nextRow = rowIndex < totalRows - 1 ? rowIndex + 1 : rowIndex;
                        const targetRow = rowIndex < 0 ? 0 : nextRow;
                        
                        selectionSystem.selectCell(targetRow, colIndex);
                        if (ensureCellIsVisible) ensureCellIsVisible(targetRow, colIndex);

                        nextTick(() => {
                            focusGrid();
                        });
                    } else if (e.key === 'Tab') {
                        e.preventDefault();
                        e.stopPropagation(); // Bubbling prevention
                        handleEditComplete();

                        // Manual Navigation (Tab -> Next Cell)
                        const tabTarget = findNextNavigableCell(rowIndex, colIndex, 'right', allColumnsMeta, totalRows, totalCols);
                        
                        selectionSystem.selectCell(tabTarget.rowIndex, tabTarget.colIndex);
                        if (ensureCellIsVisible) ensureCellIsVisible(tabTarget.rowIndex, tabTarget.colIndex);

                        nextTick(() => {
                            focusGrid();
                        });
                    }
                };

                cellElement.addEventListener('input', handleInput);
                cellElement.addEventListener('blur', handleEditComplete);
                cellElement.addEventListener('focusout', handleEditComplete);
                cellElement.addEventListener('keydown', handleKeyDown);

                if (!cellElement.getAttribute('contenteditable')) {
                    cellElement.setAttribute('contenteditable', 'true');
                }

                cellElement.textContent = event.key;

                GridDomManager.selectContent(cellElement);

                const inputEvent = new Event('input', { bubbles: true });
                cellElement.dispatchEvent(inputEvent);
                
                // 초기값 업데이트
                gridStore.updateTempValue(event.key);
            }
        }
    } catch (error) {
        console.error('Error in handleTypeToEdit:', error);
    }
}

// === Clear Selected Data ============================================
export async function handleClearSelectedData(context: GridContext) {
    const { selectionSystem, allColumnsMeta, epidemicStore } = context;
    const { selectedRange, selectedCellsIndividual, selectedRowsIndividual } = selectionSystem.state;
    const historyStore = useHistoryStore();

    historyStore.captureSnapshot('clear_selection');

    if (selectedRowsIndividual.size > 0) {
        const rowIndices = Array.from(selectedRowsIndividual);
        epidemicStore.clearIndividualRowsData({ rowIndices });
    }

    if (selectedCellsIndividual.size > 0) {
        // Individual cells
        for (const key of selectedCellsIndividual) {
             const [rStr, cStr] = key.split('_');
             const r = parseInt(rStr, 10);
             const c = parseInt(cStr, 10);
             const meta = allColumnsMeta.find(col => col.colIndex === c);
             if (meta && meta.dataKey) {
                 epidemicStore.updateCell({ rowIndex: r, key: meta.dataKey, value: '', cellIndex: meta.cellIndex ?? undefined });
             }
        }
    }

    if (selectedRange.start.rowIndex !== null && selectedRange.start.colIndex !== null &&
        selectedRange.end.rowIndex !== null && selectedRange.end.colIndex !== null &&
        selectedRowsIndividual.size === 0 && selectedCellsIndividual.size === 0) {
            
        const updates: any[] = [];
        for (let r = selectedRange.start.rowIndex!; r <= selectedRange.end.rowIndex!; r++) {
            for (let c = selectedRange.start.colIndex!; c <= selectedRange.end.colIndex!; c++) {
                const meta = allColumnsMeta.find((col: GridHeader) => col.colIndex === c);
                if (meta && meta.dataKey && meta.isEditable) {
                    updates.push({
                        rowIndex: r,
                        key: meta.dataKey,
                        value: '',
                        cellIndex: meta.cellIndex ?? undefined
                    });
                }
            }
        }
        if (updates.length > 0) {
            epidemicStore.updateCellsBatch(updates);
        }
    }
    
    // --- Update Validation State ---
    const clearedCells: { rowIndex: number, colIndex: number }[] = [];
    
    if (selectedRowsIndividual.size > 0) {
        if (context.validationManager) {
             selectedRowsIndividual.forEach(r => context.validationManager?.clearErrorsForRow(r));
        }
    }

    if (selectedCellsIndividual.size > 0) {
        selectedCellsIndividual.forEach(key => {
             const [r, c] = key.split('_').map(Number);
             clearedCells.push({ rowIndex: r, colIndex: c });
        });
    }

    if (selectedRange.start.rowIndex !== null && selectedRange.start.colIndex !== null &&
        selectedRange.end.rowIndex !== null && selectedRange.end.colIndex !== null &&
        selectedRowsIndividual.size === 0 && selectedCellsIndividual.size === 0) {
            
        for (let r = selectedRange.start.rowIndex!; r <= selectedRange.end.rowIndex!; r++) {
            for (let c = selectedRange.start.colIndex!; c <= selectedRange.end.colIndex!; c++) {
                 clearedCells.push({ rowIndex: r, colIndex: c });
            }
        }
    }
    
    if (clearedCells.length > 0 && context.validationManager) {
        context.validationManager.handleDataClear(clearedCells.map(c => ({ rowIndex: c.rowIndex, colIndex: c.colIndex })));
    }

    return { changed: true };
}

export async function handleEditModeKeyDown(event: KeyboardEvent, context: GridContext) {
    const { selectionSystem, rows, allColumnsMeta, ensureCellIsVisible, stopEditing, focusGrid, gridStore, storageManager } = context;
    const { state } = selectionSystem;
    const { rowIndex: editRow, colIndex: editCol } = state.editingCell;
    const { key } = event;

    if (editRow === null || editCol === null) return false;

    // --- 오버레이 시스템 처리 ---
    if (context.overlayController?.isVisible()) {
        if (key === 'Enter') {
            event.preventDefault();
            event.stopPropagation();
            context.overlayController.confirm(String(gridStore.tempValue ?? ''));
            
            await nextTick();
            const nextRow = editRow < rows.value.length - 1 ? (editRow) + 1 : editRow;
            const targetRow = editRow < 0 ? 0 : nextRow;
            
            selectionSystem.selectCell(targetRow, editCol);
            if (ensureCellIsVisible) await ensureCellIsVisible(targetRow, editCol);
            focusGrid();
            return true;
        } else if (key === 'Tab') {
            event.preventDefault();
            event.stopPropagation();
            context.overlayController.confirm(String(gridStore.tempValue ?? ''));
            
            await nextTick();
            const totalRows = rows.value.length;
            const totalCols = allColumnsMeta.length;
            const tabTarget = findNextNavigableCell(editRow, editCol, 'right', allColumnsMeta, totalRows, totalCols);
            
            selectionSystem.selectCell(tabTarget.rowIndex, tabTarget.colIndex);
            if (ensureCellIsVisible) await ensureCellIsVisible(tabTarget.rowIndex, tabTarget.colIndex);
            focusGrid();
            return true;
        } else if (key === 'Escape') {
             event.preventDefault();
             event.stopPropagation();
             context.overlayController.close(); // Cancel/Close
             gridStore.cancelEditing();
             stopEditing(false);
             focusGrid();
             return true;
        }
        
        const { ctrlKey, metaKey, altKey } = event;
        if (isTypingKey(key) && !ctrlKey && !metaKey && !altKey && key.length === 1) {
             event.preventDefault();
             event.stopPropagation();
             context.overlayController.append(key);
             return true;
        }
    }

    // ... (기존 fallback 로직)
    const totalRows = rows.value.length;

    if (key === 'Escape') {
        event.preventDefault();
        gridStore.cancelEditing();
        stopEditing(false);
        await nextTick();
        focusGrid();
        return true;
    } else if (key === 'Enter') {
        event.preventDefault();
        const tempValue = gridStore.tempValue;
        const column = allColumnsMeta.find((c) => c.colIndex === editCol);
        
        if (tempValue !== null && column) {
             const editData = {
                cell: { rowIndex: editRow, colIndex: editCol, dataKey: column.dataKey || '', cellIndex: column.cellIndex },
                originalValue: '',
                value: tempValue,
                columnMeta: column,
                editDuration: 0,
                hasChanged: true 
             };
            storageManager.executeSave(editData);
            
            if (context.validationManager) {
                context.validationManager.validateCell(editRow, editCol, tempValue, column.type, true);
            }
        }

        gridStore.confirmEditing();
        stopEditing(true);

        const nextRow = editRow < totalRows - 1 ? editRow + 1 : editRow;
        const targetRow = editRow < 0 ? 0 : nextRow;

        selectionSystem.selectCell(targetRow, editCol);
        if (ensureCellIsVisible) await ensureCellIsVisible(targetRow, editCol);

        await nextTick();
        focusGrid();
        return true;
    } else if (key === 'Tab') {
        event.preventDefault();
        const tempValue = gridStore.tempValue;
        const column = allColumnsMeta.find((c) => c.colIndex === editCol);

        if (tempValue !== null && column) {
             const editData = {
                cell: { rowIndex: editRow, colIndex: editCol, dataKey: column.dataKey || '', cellIndex: column.cellIndex },
                originalValue: '',
                value: tempValue,
                columnMeta: column,
                editDuration: 0,
                hasChanged: true 
             };
            storageManager.executeSave(editData);

            if (context.validationManager) {
                context.validationManager.validateCell(editRow, editCol, tempValue, column.type, true);
            }
        }
        gridStore.confirmEditing();
        stopEditing(true);

        const currentRow = editRow;
        const currentCol = editCol;

        const totalCols = allColumnsMeta.length;
        const tabTarget = findNextNavigableCell(currentRow, currentCol, 'right', allColumnsMeta, totalRows, totalCols);
        
        selectionSystem.selectCell(tabTarget.rowIndex, tabTarget.colIndex);
        if (ensureCellIsVisible) await ensureCellIsVisible(tabTarget.rowIndex, tabTarget.colIndex);

        await nextTick();
        focusGrid();
        return true;
    }

    // ... 기존 DateTime 핸들링 로직 유지 ...
    const columnMeta = allColumnsMeta.find((col) => col.colIndex === editCol);
    const isDateTimeColumn = columnMeta && (
        columnMeta.type === 'symptomOnset' || 
        columnMeta.type === 'individualExposureTime'
    );

    if (isDateTimeColumn) {
        const cellElement = GridDomManager.getCellElementByAttribute(editRow, editCol) as DateTimeCellElement;

        if (/\d/.test(key)) {
            event.preventDefault();
            if (cellElement && cellElement.__dtKeyHandler) {
                const keyEvent = new KeyboardEvent('keydown', { key });
                cellElement.__dtKeyHandler(keyEvent);
            }
            return true;
        }

        if (key === 'Backspace') {
            event.preventDefault();
            if (cellElement && cellElement.__dtKeyHandler) {
                const keyEvent = new KeyboardEvent('keydown', { key });
                cellElement.__dtKeyHandler(keyEvent);
            }
            return true;
        }

        if (key === 'Tab' || key === 'Enter') {
            event.preventDefault();
            
            if (cellElement && cellElement.__dtSaveValue) {
                await cellElement.__dtSaveValue();
            }
            return true;
        }
    }

    return false;
}
