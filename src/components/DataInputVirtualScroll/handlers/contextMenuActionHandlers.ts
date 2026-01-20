import { nextTick } from 'vue';
import { COL_TYPE_BASIC, COL_TYPE_IS_PATIENT, COL_TYPE_CONFIRMED_CASE, COL_TYPE_ONSET, COL_TYPE_INDIVIDUAL_EXPOSURE } from '../constants/index';
import { devLog } from '../../../utils/logger';
import { handleCopy, handlePaste } from './keyboardClipboard';
import { GridContextMenuContext } from '@/types/virtualGridContext';
import { GridHeader } from '@/types/grid';

// Row/Column Selection Helpers (Internal)
function getEffectiveRowSelection(context: GridContextMenuContext) {
    const { selectionSystem } = context;
    // targetInfo is in GridContextMenuContext
    const target = (context as any).targetInfo || { rowIndex: -1, colIndex: -1 }; 
    const { selectedRange, selectedRowsIndividual } = selectionSystem.state;

    if (selectedRowsIndividual.size > 0) {
        const rowsArr = Array.from(selectedRowsIndividual).sort((a, b) => a - b);
        if (rowsArr.length === 0) {
            return { type: 'none', startRow: target.rowIndex, endRow: target.rowIndex, count: 0, rows: [] as number[] };
        }
        return {
            type: 'individual',
            rows: rowsArr,
            startRow: Math.min(...rowsArr),
            endRow: Math.max(...rowsArr),
            count: rowsArr.length
        };
    } else if (selectedRange.start.rowIndex !== null && selectedRange.end.rowIndex !== null) {
        return {
            type: 'range',
            startRow: selectedRange.start.rowIndex,
            endRow: selectedRange.end.rowIndex,
            count: selectedRange.end.rowIndex - selectedRange.start.rowIndex + 1,
            rows: [] as number[]
        };
    }
    return { type: 'none', startRow: target.rowIndex, endRow: target.rowIndex, count: 1, rows: [] as number[] };
}

function getEffectiveColumnSelection(context: GridContextMenuContext) {
    const { selectionSystem } = context;
    const target = (context as any).targetInfo || { rowIndex: -1, colIndex: -1 };
    const { selectedRange, selectedCellsIndividual } = selectionSystem.state;

    if (selectedCellsIndividual.size > 0) {
        const columns = new Set<number>();
        selectedCellsIndividual.forEach(cellKey => {
            const [, colStr] = cellKey.split('_');
            columns.add(parseInt(colStr, 10));
        });
        const colArray = Array.from(columns).sort((a, b) => a - b);
        if (colArray.length === 0) {
            return { type: 'none', startCol: target.colIndex, endCol: target.colIndex, count: 0, columns: [] as number[] };
        }
        return {
            type: 'individual',
            columns: colArray,
            startCol: Math.min(...colArray),
            endCol: Math.max(...colArray),
            count: colArray.length
        };
    } else if (selectedRange.start.colIndex !== null && selectedRange.end.colIndex !== null) {
        return {
            type: 'range',
            startCol: selectedRange.start.colIndex,
            endCol: selectedRange.end.colIndex,
            count: selectedRange.end.colIndex - selectedRange.start.colIndex + 1,
            columns: [] as number[]
        };
    }
    return { type: 'none', startCol: target.colIndex, endCol: target.colIndex, count: 1, columns: [] as number[] };
}


// --- Action Handlers ---

export function handleClearCellData(context: GridContextMenuContext) {
    const { selectionSystem, allColumnsMeta, epidemicStore, validationManager } = context; 
    const target = (context as any).targetInfo || { rowIndex: -1, colIndex: -1 };
    const { selectedCellsIndividual } = selectionSystem.state;
    
    const cellsToClear: {rowIndex: number; colIndex: number}[] = [];
    if (selectedCellsIndividual.size > 0) {
        for (const cellKey of selectedCellsIndividual) {
            const [rowStr, colStr] = cellKey.split('_');
            const rowIndex = parseInt(rowStr, 10);
            const colIndex = parseInt(colStr, 10);

            const columnMeta = allColumnsMeta.find((c) => c.colIndex === colIndex);
            if (columnMeta) {
                epidemicStore.updateCell({
                    rowIndex,
                    cellIndex: columnMeta.cellIndex,
                    key: columnMeta.dataKey || '',
                    value: ''
                });
                cellsToClear.push({ rowIndex, colIndex });
            }
        }
    } else {
        const columnMeta = allColumnsMeta.find((c) => c.colIndex === target.colIndex);
        if (columnMeta) {
            epidemicStore.updateCell({
                rowIndex: target.rowIndex,
                cellIndex: columnMeta.cellIndex,
                key: columnMeta.dataKey || '',
                value: ''
            });
            cellsToClear.push({ rowIndex: target.rowIndex, colIndex: target.colIndex });
        }
    }

    if (validationManager && cellsToClear.length > 0) {
            validationManager.handleDataClear(cellsToClear);
    }
}

export function handleRowActions(action: string, context: GridContextMenuContext) {
    const { epidemicStore, validationManager, allColumnsMeta } = context;
    const rowSelection = getEffectiveRowSelection(context);

    if (action === 'add-row-above') {
        epidemicStore.insertRowAt({
            index: rowSelection.startRow,
            count: rowSelection.count
        });
        if (validationManager) {
            validationManager.handleRowAddition(rowSelection.startRow, [], allColumnsMeta, rowSelection.count);
        }
    } else if (action === 'add-row-below') {
        epidemicStore.insertRowAt({
            index: rowSelection.endRow + 1,
            count: rowSelection.count
        });
        if (validationManager) {
            validationManager.handleRowAddition(rowSelection.endRow + 1, [], allColumnsMeta, rowSelection.count);
        }
    } else if (action === 'delete-rows') {
        let deletedIndices: number[] = [];
        
        if (rowSelection.type === 'individual') {
            epidemicStore.deleteIndividualRows({ rows: rowSelection.rows });
            deletedIndices = rowSelection.rows;
        } else {
            epidemicStore.deleteMultipleRows({ startRow: rowSelection.startRow, endRow: rowSelection.endRow });
            deletedIndices = Array.from({ length: rowSelection.endRow - rowSelection.startRow + 1 }, (_, k) => rowSelection.startRow + k);
        }
        
        if (validationManager) {
            validationManager.handleRowDeletion(deletedIndices, allColumnsMeta);
        }
    } else if (action === 'clear-rows-data') {
        if (rowSelection.type === 'individual') {
            epidemicStore.clearIndividualRowsData({ rowIndices: rowSelection.rows });
        } else {
            epidemicStore.clearMultipleRowsData({ startRow: rowSelection.startRow, endRow: rowSelection.endRow });
        }
    } else if (action === 'delete-empty-rows') {
        epidemicStore.deleteEmptyRows();
    }
}

export function handleColumnActions(action: string, context: GridContextMenuContext) {
    const { epidemicStore, validationManager, allColumnsMeta } = context;
    const target = (context as any).targetInfo || { rowIndex: -1, colIndex: -1 };

    if (action === 'clear-cols-data') {
        const colSelection = getEffectiveColumnSelection(context);
        const columnsToCheck = colSelection.type === 'individual' ? colSelection.columns : 
            Array.from({ length: colSelection.endCol - colSelection.startCol + 1 }, (_, i) => colSelection.startCol + i);

        const clearedColumns: number[] = [];
        for (const colIndex of columnsToCheck) {
            const meta = allColumnsMeta.find((c) => c.colIndex === colIndex);
            if (!meta || !meta.type) continue;

            if ([COL_TYPE_IS_PATIENT, COL_TYPE_CONFIRMED_CASE, COL_TYPE_ONSET, COL_TYPE_INDIVIDUAL_EXPOSURE].includes(meta.type)) {
                    epidemicStore.clearFixedColumnData({ type: meta.type });
            } else if (meta.cellIndex !== undefined) {
                    epidemicStore.clearColumnData({ type: meta.type as any, index: meta.cellIndex });
            }
            clearedColumns.push(colIndex);
        }

        if (validationManager && clearedColumns.length > 0) {
            clearedColumns.forEach(colIndex => {
                validationManager.clearErrorsForColumn(colIndex);
            });
        }
        return;
    }

    if (action === 'add-col-left' || action === 'add-col-right') {
        const colSelection = getEffectiveColumnSelection(context);
        const targetColumn = allColumnsMeta.find((c) => c.colIndex === target.colIndex);

        if (!targetColumn || !targetColumn.type || ![COL_TYPE_BASIC, 'clinicalSymptoms', 'dietInfo'].includes(targetColumn.type)) return;

        let insertAtIndex;
        if (action === 'add-col-right') {
            const rightmostColumn = allColumnsMeta.find((c) => c.colIndex === colSelection.endCol);
            insertAtIndex = rightmostColumn ? (rightmostColumn.cellIndex ?? 0) + 1 : 0;
        } else {
            const leftmostColumn = allColumnsMeta.find((c) => c.colIndex === colSelection.startCol);
            insertAtIndex = leftmostColumn ? (leftmostColumn.cellIndex ?? 0) : 0;
        }

        devLog(`[ContextMenu] 열 추가 시작: ${action}, 타입: ${targetColumn.type}, 개수: ${colSelection.count}, 위치: ${insertAtIndex}`);

        epidemicStore.insertMultipleColumnsAt({
            type: targetColumn.type,
            count: colSelection.count,
            index: insertAtIndex
        });

        nextTick(() => {
            // Logic to handle post-update reactivity if needed.
        });
        return;
    }
    
    // ... delete-cols logic similar ...
}

export function handleFilterActions(action: string, context: GridContextMenuContext) {
    const { gridStore, allColumnsMeta } = context;
    const captureSnapshotWithFilter = (context as any).captureSnapshotWithFilter;
    const filterState = (context as any).filterState; // Ref needed?
    const target = (context as any).targetInfo || { rowIndex: -1, colIndex: -1 };

    if (action === 'clear-all-filters') {
        const oldFilterState = JSON.stringify(gridStore.filterState);
        gridStore.clearAllFilters();
        if (captureSnapshotWithFilter && oldFilterState !== JSON.stringify(gridStore.filterState)) {
             captureSnapshotWithFilter('filter_clear_all', {
                action: 'clear-all-filters',
                oldFilterState: JSON.parse(oldFilterState),
                newFilterState: { ...gridStore.filterState }
            });
        }
        // Assuming filterState is a Ref passed in context which we want to sync?
        // If not available, we skip.
        // filterState.value = { ...gridStore.filterState };
        return;
    }

    let filterType = '';
    let prefix = '';

    if (action.startsWith('filter-patient-')) { filterType = 'patient'; prefix = 'filter-patient-'; }
    else if (action.startsWith('filter-confirmed-')) { filterType = 'confirmed'; prefix = 'filter-confirmed-'; }
    else if (action.startsWith('filter-basic-')) { filterType = 'basic'; prefix = 'filter-basic-'; }
    else if (action.startsWith('filter-clinical-')) { filterType = 'clinical'; prefix = 'filter-clinical-'; }
    else if (action.startsWith('filter-diet-')) { filterType = 'diet'; prefix = 'filter-diet-'; }
    else if (action.startsWith('filter-datetime-')) { filterType = 'datetime'; prefix = 'filter-datetime-'; }

    if (filterType && prefix) {
         let value = action.substring(prefix.length);
         if (value === 'empty') value = '';
         
         const keyPrefixMap: Record<string, string> = {
             'patient': 'isPatient',
             'confirmed': 'isConfirmedCase'
         };

         let key = keyPrefixMap[filterType];
         
         if (!key) {
             const column = allColumnsMeta.find((c) => c.colIndex === target.colIndex);
             if (column) {
                key = column.value || '';
                if (column.dataKey && (column.cellIndex !== undefined && column.cellIndex !== null)) {
                    key = `${column.dataKey}-${column.cellIndex}`;
                } else if (!key) {
                    key = column.dataKey || '';
                }
                if (!key && column.colIndex !== undefined) key = String(column.colIndex);
             }
         }

         if (key) {
            const oldFilterState = JSON.stringify(gridStore.filterState);
            gridStore.toggleFilterValue(key, value);

            if (captureSnapshotWithFilter && oldFilterState !== JSON.stringify(gridStore.filterState)) {
                 captureSnapshotWithFilter('filter_change', {
                    action,
                    filterType,
                    value,
                    oldFilterState: JSON.parse(oldFilterState),
                    newFilterState: { ...gridStore.filterState }
                });
            }
            // filterState.value = { ...gridStore.filterState };
         }
    }
}

export function handleClipboardActions(action: string, context: GridContextMenuContext) {
    if (action === 'copy-cell') {
        handleCopy(context);
    } else if (action === 'paste-cell') {
        handlePaste(context);
    }
}