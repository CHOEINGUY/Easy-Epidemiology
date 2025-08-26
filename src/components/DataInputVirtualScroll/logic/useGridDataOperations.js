import { ref, nextTick } from 'vue';
import { processExcelFile } from './excelProcessor.js';
import { useDataExport } from './useDataExport.js';
import { showToast, showConfirmToast } from './toast.js';
import { devLog, logger } from '../../../utils/logger.js';
import {
    COL_TYPE_BASIC,
    COL_TYPE_CLINICAL,
    COL_TYPE_DIET,
} from '../constants/index.js';

export function useGridDataOperations(
    {
        storeBridge,
        validationManager,
        selectionSystem,
        allColumnsMeta,
        getCellValue,
        tryStartOperation,
        endOperation,
        captureSnapshotWithFilter,
        syncFilterStateAfterHistoryChange,
        focusGrid,
    }
) {
    const isUploadingExcel = ref(false);
    const excelUploadProgress = ref(0);
    const individualExposureBackupData = ref([]);
    const confirmedCaseBackupData = ref([]);

    const { downloadXLSXSmart, downloadTemplate } = useDataExport();

    async function onExcelFileSelected(file) {
        if (!tryStartOperation('excel_upload', { blocking: true, timeout: 60000 })) {
            return;
        }

        isUploadingExcel.value = true;
        excelUploadProgress.value = 0;
        try {
            validationManager.clearAllErrors();

            const wasFiltered = storeBridge.filterState.isFiltered;
            const oldFilterState = wasFiltered ? { ...storeBridge.filterState } : null;
            storeBridge.clearAllFilters();

            if (wasFiltered && oldFilterState) {
                showToast('새로운 데이터 가져오기로 필터가 초기화되었습니다.', 'info');
                captureSnapshotWithFilter('excel_import_filter_reset', {
                    action: 'excel_import_filter_reset',
                    oldFilterState,
                    newFilterState: { ...storeBridge.filterState }
                });
            }

            const parsed = await processExcelFile(file, (p) => {
                excelUploadProgress.value = Math.round(p * 0.6);
            });

            if (parsed.emptyColumnCount > 0) {
                showToast(`빈 열 ${parsed.emptyColumnCount}개가 감지되어 자동으로 제거되었습니다.`, 'info');
            }

            excelUploadProgress.value = 60;

            captureSnapshotWithFilter('excel_import', {
                action: 'excel_import',
                fileName: file.name,
                hasIndividualExposureTime: parsed.hasIndividualExposureTime,
                hasConfirmedCase: parsed.hasConfirmedCase,
                rowCount: parsed.rows.length,
                columnCount: Object.keys(parsed.headers).reduce((sum, key) => sum + (parsed.headers[key]?.length || 0), 0)
            });

            await storeBridge.dispatch('updateHeadersFromExcel', parsed.headers);
            await storeBridge.dispatch('addRowsFromExcel', parsed.rows);

            if (parsed.hasIndividualExposureTime) {
                if (!storeBridge.state.isIndividualExposureColumnVisible) {
                    await storeBridge.dispatch('setIndividualExposureColumnVisibility', true);
                }
            } else {
                if (storeBridge.state.isIndividualExposureColumnVisible) {
                    await storeBridge.dispatch('setIndividualExposureColumnVisibility', false);
                }
            }

            if (parsed.hasConfirmedCase) {
                if (!storeBridge.state.isConfirmedCaseColumnVisible) {
                    await storeBridge.dispatch('setConfirmedCaseColumnVisibility', true);
                }
            } else {
                if (storeBridge.state.isConfirmedCaseColumnVisible) {
                    await storeBridge.dispatch('setConfirmedCaseColumnVisibility', false);
                }
            }

            excelUploadProgress.value = 70;
            await nextTick();
            const columnMetas = storeBridge.bridge.getColumnMetas();

            await validationManager.revalidateAll(storeBridge.getRows(), columnMetas, {
                onProgress: (progress) => {
                    excelUploadProgress.value = 70 + Math.round(progress * 0.3);
                }
            });

            excelUploadProgress.value = 100;
            selectionSystem.selectCell(0, 1);
            // ensureCellIsVisible is not available here, but the main component can call it.
        } catch (e) {
            logger.error('Excel 업로드 실패:', e);
            alert(e.message || '엑셀 처리 실패');
        } finally {
            isUploadingExcel.value = false;
            excelUploadProgress.value = 0;
            endOperation('excel_upload');
        }
    }

    function onDownloadTemplate(type = 'basic') {
        downloadTemplate(type);
    }

    function onExportData() {
        try {
            const hasIndividualExposure = storeBridge.state.isIndividualExposureColumnVisible;
            const hasConfirmedCase = storeBridge.state.isConfirmedCaseColumnVisible;
            downloadXLSXSmart(allColumnsMeta.value, storeBridge.getRows(), getCellValue, hasIndividualExposure, hasConfirmedCase);
            showToast('데이터가 성공적으로 내보내졌습니다. 파일을 다시 가져오기할 수 있습니다.', 'success');
        } catch (error) {
            logger.error('Export failed:', error);
            showToast(`데이터 내보내기 중 오류가 발생했습니다: ${error.message}`, 'error');
        }
    }

    async function onCopyEntireData() {
        try {
            const headerRow1 = [];
            const headerRow2 = [];

            allColumnsMeta.value.forEach(col => {
                headerRow1.push(col.headerRow === 1 ? col.headerText.replace(/<br\s*\/?>/g, ' ') : '');
                headerRow2.push(col.headerRow === 2 ? col.headerText : '');
            });

            const dataRows = storeBridge.getRows().map((row, rIdx) => {
                return allColumnsMeta.value.map(col => getCellValue(row, col, rIdx));
            });

            const tsvLines = [headerRow1, headerRow2, ...dataRows]
                .map(arr => arr.join('\t'))
                .join('\n');

            await navigator.clipboard.writeText(tsvLines);
            showToast('전체 데이터가 클립보드에 복사되었습니다.', 'success');
        } catch (err) {
            logger.error('copy entire data failed', err);
            showToast('전체 데이터 복사 중 오류가 발생했습니다.', 'error');
        }
    }

    async function onDeleteEmptyCols() {
        if (!tryStartOperation('delete_empty_columns', { blocking: true, timeout: 10000 })) return;

        const beforeColCount = allColumnsMeta.value.length;
        const beforeColumnsMeta = [...allColumnsMeta.value];

        captureSnapshotWithFilter('delete_empty_columns', { action: 'delete_empty_columns', beforeColumnCount: beforeColCount, beforeColumnsMeta });

        await storeBridge.dispatch('deleteEmptyColumns');

        nextTick(() => {
            const afterColCount = allColumnsMeta.value.length;
            const deletedCount = beforeColCount - afterColCount;

            if (deletedCount > 0) {
                const deletedColumnIndices = [];
                const afterColumnsMeta = allColumnsMeta.value;
                for (let i = 0; i < beforeColumnsMeta.length; i++) {
                    const beforeCol = beforeColumnsMeta[i];
                    const afterCol = afterColumnsMeta.find(c => c.dataKey === beforeCol.dataKey && c.cellIndex === beforeCol.cellIndex && c.type === beforeCol.type);
                    if (!afterCol) {
                        deletedColumnIndices.push(beforeCol.colIndex);
                    }
                }
                if (deletedColumnIndices.length > 0) {
                    validationManager.handleColumnDeletion(deletedColumnIndices);
                }
                showToast(`빈 열 ${deletedCount}개가 삭제되었습니다.`, 'success');
            } else {
                showToast('삭제할 빈 열이 없습니다.', 'info');
            }
            selectionSystem.clearSelection();
            focusGrid();
            endOperation('delete_empty_columns');
        });
    }

    async function onResetSheet() {
        if (!tryStartOperation('reset_sheet', { blocking: true, timeout: 10000 })) return;

        showConfirmToast(
            '모든 데이터를 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.',
            async () => {
                try {
                    validationManager.clearAllErrors();
                    const wasFiltered = storeBridge.filterState.isFiltered;
                    const oldFilterState = wasFiltered ? { ...storeBridge.filterState } : null;
                    storeBridge.clearAllFilters();
                    if (wasFiltered) {
                        showToast('시트 초기화로 필터가 해제되었습니다.', 'info');
                    }
                    captureSnapshotWithFilter('sheet_reset', { action: 'sheet_reset', oldFilterState, newFilterState: { ...storeBridge.filterState } });
                    await storeBridge.dispatch('resetSheet');
                    selectionSystem.clearSelection();
                    await nextTick();
                    if (storeBridge.getRows().length > 0) {
                        selectionSystem.selectCell(0, 1);
                        // ensureCellIsVisible(0, 1);
                    }
                    showToast('데이터가 초기화되었습니다.', 'success');
                } catch (err) {
                    logger.error('reset sheet failed', err);
                    showToast('시트 초기화 중 오류가 발생했습니다.', 'error');
                } finally {
                    endOperation('reset_sheet');
                }
            }
        );
    }

    async function onToggleExposureColumn() {
        const current = storeBridge.state.isIndividualExposureColumnVisible;
        const isAdding = !current;
        const exposureInsertIndex = storeBridge.symptomOnsetStartIndex;
        const individualExposureColumnIndex = allColumnsMeta.value.findIndex(col => col.type === 'individualExposureTime');

        if (!isAdding && individualExposureColumnIndex >= 0) {
            const currentData = storeBridge.getRows() || [];
            individualExposureBackupData.value = currentData.map((row, rowIndex) => ({ rowIndex, value: row.individualExposureTime || '' }))
                .filter(item => item.value !== '' && item.value !== null && item.value !== undefined);
        }

        const oldColumnsMeta = [...allColumnsMeta.value];
        await storeBridge.setIndividualExposureColumnVisibility(!current);

        nextTick(() => {
            const newColumnsMeta = allColumnsMeta.value;
            if (validationManager && oldColumnsMeta.length !== newColumnsMeta.length) {
                validationManager.remapValidationErrorsByColumnIdentity(oldColumnsMeta, newColumnsMeta);
            }
        });

        if (isAdding && individualExposureBackupData.value.length > 0) {
            nextTick(() => {
                const newIndividualExposureColumnIndex = allColumnsMeta.value.findIndex(col => col.type === 'individualExposureTime');
                if (newIndividualExposureColumnIndex >= 0) {
                    validationManager.validateIndividualExposureColumn(individualExposureBackupData.value, newIndividualExposureColumnIndex);
                } else {
                    validationManager.validateIndividualExposureColumn(individualExposureBackupData.value, exposureInsertIndex);
                }
                individualExposureBackupData.value = [];
            });
        }
        selectionSystem.clearSelection();
        nextTick(() => focusGrid());
    }

    async function onToggleConfirmedCaseColumn() {
        const current = storeBridge.state.isConfirmedCaseColumnVisible;
        const isAdding = !current;
        const confirmedCaseColumnIndex = allColumnsMeta.value.findIndex(col => col.type === 'isConfirmedCase');

        if (!isAdding && confirmedCaseColumnIndex >= 0) {
            const currentData = storeBridge.getRows() || [];
            confirmedCaseBackupData.value = currentData.map((row, rowIndex) => ({ rowIndex, value: row.isConfirmedCase || '' }))
                .filter(item => item.value !== '' && item.value !== null && item.value !== undefined);
        }

        const oldColumnsMeta = [...allColumnsMeta.value];
        await storeBridge.setConfirmedCaseColumnVisibility(!current);

        nextTick(() => {
            const newColumnsMeta = allColumnsMeta.value;
            if (validationManager && oldColumnsMeta.length !== newColumnsMeta.length) {
                validationManager.updateColumnMetas(newColumnsMeta);
                validationManager.remapValidationErrorsByColumnIdentity(oldColumnsMeta, newColumnsMeta);
            }
        });

        if (isAdding && confirmedCaseBackupData.value.length > 0) {
            nextTick(() => {
                const newConfirmedCaseColumnIndex = allColumnsMeta.value.findIndex(col => col.type === 'isConfirmedCase');
                if (newConfirmedCaseColumnIndex >= 0) {
                    validationManager.validateConfirmedCaseColumn(confirmedCaseBackupData.value, newConfirmedCaseColumnIndex);
                }
                confirmedCaseBackupData.value = [];
            });
        }
        selectionSystem.clearSelection();
        nextTick(() => focusGrid());
    }

    function onUndo() {
        const success = storeBridge.undo();
        if (success) {
            if (validationManager && typeof validationManager.onDataReset === 'function') {
                validationManager.onDataReset();
            }
            syncFilterStateAfterHistoryChange();
        }
    }

    function onRedo() {
        const success = storeBridge.redo();
        if (success) {
            if (validationManager && typeof validationManager.onDataReset === 'function') {
                validationManager.onDataReset();
            }
            syncFilterStateAfterHistoryChange();
        }
    }

    function onClearAllFilters() {
        const oldFilterState = JSON.stringify(storeBridge.filterState);
        storeBridge.clearAllFilters();
        if (oldFilterState !== JSON.stringify(storeBridge.filterState)) {
            captureSnapshotWithFilter('filter_clear_all', { action: 'clear-all-filters', oldFilterState: JSON.parse(oldFilterState), newFilterState: { ...storeBridge.filterState } });
        }
    }

    function onUpdateActiveFilters(activeFilters) {
        storeBridge.filterState.activeFilters = new Map(activeFilters);
    }

    function getHeaderArrayByType(type) {
        const headers = storeBridge.getHeaders();
        switch (type) {
            case COL_TYPE_BASIC: return headers.basic || [];
            case COL_TYPE_CLINICAL: return headers.clinical || [];
            case COL_TYPE_DIET: return headers.diet || [];
            default: return [];
        }
    }

    function onAddColumn(groupType) {
        if (!tryStartOperation('add_column', { blocking: true, timeout: 5000 })) return;

        const oldColumnsMeta = [...allColumnsMeta.value];
        const arr = getHeaderArrayByType(groupType);
        const insertIndex = arr.length;
        const metaType = groupType === COL_TYPE_CLINICAL ? 'clinicalSymptoms' : groupType === COL_TYPE_DIET ? 'dietInfo' : groupType;

        storeBridge.dispatch('insertMultipleColumnsAt', { type: metaType, count: 1, index: insertIndex });

        nextTick(() => {
            const newColumnsMeta = allColumnsMeta.value;
            if (validationManager && oldColumnsMeta.length !== newColumnsMeta.length) {
                validationManager.updateColumnMetas(newColumnsMeta);
                validationManager.remapValidationErrorsByColumnIdentity(oldColumnsMeta, newColumnsMeta);
            }
        });

        selectionSystem.clearSelection();
        nextTick(() => focusGrid());
        endOperation('add_column');
    }

    function onDeleteColumn(groupType) {
        if (!tryStartOperation('delete_column', { blocking: true, timeout: 5000 })) return;

        const arr = getHeaderArrayByType(groupType);
        if (arr.length <= 1) return;

        const deleteIndex = arr.length - 1;
        const metaType = groupType === COL_TYPE_CLINICAL ? 'clinicalSymptoms' : groupType === COL_TYPE_DIET ? 'dietInfo' : groupType;

        storeBridge.dispatch('deleteMultipleColumnsByIndex', { columns: [{ type: metaType, index: deleteIndex }] });

        selectionSystem.clearSelection();
        nextTick(() => focusGrid());
        endOperation('delete_column');
    }

    function onDeleteEmptyRows() {
        if (!tryStartOperation('delete_empty_rows', { blocking: true, timeout: 10000 })) return;
        storeBridge.dispatch('deleteEmptyRows');
        selectionSystem.clearSelection();
        showToast('빈 행이 삭제되었습니다.', 'success');
        endOperation('delete_empty_rows');
    }

    function onAddRows(count) {
        const insertIndex = storeBridge.getRows().length;
        storeBridge.dispatch('insertRowAt', { index: insertIndex, count });
        nextTick(() => {
            selectionSystem.clearSelection();
            showToast(`${count}개 행이 추가되었습니다.`, 'success');
        });
    }

    function onClearSelection() {
        selectionSystem.clearSelection();
    }

    return {
        isUploadingExcel,
        excelUploadProgress,
        onExcelFileSelected,
        onDownloadTemplate,
        onExportData,
        onCopyEntireData,
        onDeleteEmptyCols,
        onResetSheet,
        onToggleExposureColumn,
        onToggleConfirmedCaseColumn,
        onUndo,
        onRedo,
        onClearAllFilters,
        onUpdateActiveFilters,
        onAddColumn,
        onDeleteColumn,
        onDeleteEmptyRows,
        onAddRows,
        onClearSelection,
    };
}
