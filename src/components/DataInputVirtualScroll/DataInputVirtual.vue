<template>
  <div 
    class="data-input-virtual-container"
    tabindex="0"
    @keydown="onKeyDown"
    ref="dataContainerRef"
  >
    <VirtualAppHeader 
      :errorCount="visibleValidationErrors.size"
      @focusFirstError="handleFocusFirstError"
    />
    <VirtualFunctionBar 
      :cell-address="selectedCellInfo.address"
      :cell-value="selectedCellInfo.value"
      :is-uploading-excel="isUploadingExcel"
      :upload-progress="excelUploadProgress"
      :can-undo="canUndo"
      :can-redo="canRedo"
      :is-filtered="storeBridge.filterState.isFiltered"
      :filtered-row-count="storeBridge.filterState.filteredRowCount"
      :original-row-count="storeBridge.filterState.originalRowCount"
      @update-cell-value="onUpdateCellValueFromBar"
      @enter-pressed="onEnterPressedFromBar"
      @excel-file-selected="onExcelFileSelected"
      @download-template="onDownloadTemplate"
      @export-data="onExportData"
      @copy-entire-data="onCopyEntireData"
      @delete-empty-cols="onDeleteEmptyCols"
      @reset-sheet="onResetSheet"
      @toggle-exposure-col="onToggleExposureColumn"
      @toggle-confirmed-case-col="onToggleConfirmedCaseColumn"
      @undo="onUndo"
      @redo="onRedo"
      @clear-all-filters="onClearAllFilters"
    />
    <div class="grid-container" ref="gridContainerRef">
      <VirtualGridHeader 
        ref="gridHeaderRef"
        :headerGroups="headerGroups"
        :allColumnsMeta="allColumnsMeta"
        :tableWidth="tableWidth"
        :selectedCell="selectionSystem.state.selectedCell"
        :selectedRange="selectionSystem.state.selectedRange"
        :individualSelectedCells="selectionSystem.state.selectedCellsIndividual"
        :isEditing="selectionSystem.state.isEditing"
        :editingCell="selectionSystem.state.editingCell"
        :scrollbarWidth="scrollbarWidth"
        :is-filtered="storeBridge.filterState.isFiltered"
        :activeFilters="computedActiveFilters"
        @cell-mousedown="onCellMouseDown"
        @cell-dblclick="onCellDoubleClick"
        @cell-input="onCellInput"
        @cell-contextmenu="onContextMenu"
        @add-column="onAddColumn"
        @delete-column="onDeleteColumn"
        @update:activeFilters="onUpdateActiveFilters"
      />
      <VirtualGridBody 
        ref="gridBodyRef"
        :visibleRows="visibleRows"
        :allColumnsMeta="allColumnsMeta"
        :tableWidth="tableWidth"
        :totalHeight="totalHeight"
        :paddingTop="paddingTop"
        :bufferSize="4"
        :getCellValue="getCellValue"
        :selectedCell="selectionSystem.state.selectedCell"
        :selectedRange="selectionSystem.state.selectedRange"
        :individualSelectedCells="selectionSystem.state.selectedCellsIndividual"
        :isEditing="selectionSystem.state.isEditing"
        :editingCell="selectionSystem.state.editingCell"
        :individualSelectedRows="selectionSystem.state.selectedRowsIndividual"
        :validation-errors="visibleValidationErrors"
        :column-metas="allColumnsMeta"
        :is-filtered="storeBridge.filterState.isFiltered"
        @scroll="handleGridScroll"
        @cell-mousedown="onCellMouseDown"
        @cell-dblclick="onCellDoubleClick"
        @cell-input="onCellInput"
        @cell-contextmenu="onContextMenu"
        @add-rows="onAddRows"
        @delete-empty-rows="onDeleteEmptyRows"
        @clear-selection="onClearSelection"
      />
    </div>
    <ContextMenu 
      :visible="contextMenuState.visible"
      :x="contextMenuState.x"
      :y="contextMenuState.y"
      :items="contextMenuState.items"
      @select="onContextMenuSelect"
    />
    <DragOverlay :visible="isDragOver" :progress="excelUploadProgress" />
    <ToastContainer />
    <AddRowsControls 
      :is-filtered="storeBridge.filterState.isFiltered"
      @add-rows="onAddRows" 
      @delete-empty-rows="onDeleteEmptyRows" 
      @clear-selection="onClearSelection"
    />
    
    <!-- DateTimePicker 추가 -->
    <DateTimePicker 
      ref="dateTimePickerRef"
      :visible="dateTimePickerState.visible"
      :position="dateTimePickerState.position"
      :initialValue="dateTimePickerState.initialValue"
      @confirm="onDateTimeConfirm"
      @cancel="onDateTimeCancel"
    />

    <!-- Validation Progress -->
    <ValidationProgress
      :is-visible="isValidationProgressVisible"
      :progress="validationProgress"
      :processed="validationProcessed"
      :total="validationTotal"
      :error-count="validationErrorCount"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue';
import { useStore } from 'vuex';
import VirtualAppHeader from './layout/VirtualAppHeader.vue';
import VirtualFunctionBar from './layout/VirtualFunctionBar.vue';
import VirtualGridHeader from './layout/VirtualGridHeader.vue';
import VirtualGridBody from './layout/VirtualGridBody.vue';
import ContextMenu from './parts/ContextMenu.vue';
import DragOverlay from './parts/DragOverlay.vue';
import DateTimePicker from './parts/DateTimePicker.vue';
import ToastContainer from './parts/ToastContainer.vue';
import AddRowsControls from './parts/AddRowsControls.vue';
import ValidationProgress from './parts/ValidationProgress.vue';

// --- Composables / Hooks ---
import { useStoreBridge } from '../../store/storeBridge.js';
import { useCellInputState } from '../../store/cellInputState.js';
import { useContextMenu } from './logic/useContextMenu.js';
import { useVirtualScroll } from './logic/useVirtualScroll.js';
import { useVirtualSelectionSystem, setColumnsMeta } from './logic/virtualSelectionSystem.js';
import { useDragDrop } from './logic/dragDrop.js';
import { useUndoRedo } from '../../hooks/useUndoRedo.js';
import { useOperationGuard } from '../../hooks/useOperationGuard.js';
import { useGlobalFunctions } from '../../hooks/useGlobalFunctions.js';
import { useGridDataOperations } from './logic/useGridDataOperations.js';
import { useGridEventHandlers } from './logic/useGridEventHandlers.js';

// --- Utilities & Managers ---
import ValidationManager from '../../validation/ValidationManager.js';
import { createProcessingOptions } from '../../utils/environmentUtils.js';
import { logger, devLog } from '../../utils/logger.js';
import { FilterRowValidationManager } from './utils/FilterRowValidationManager.js';
import { showToast } from './logic/toast.js';

// --- Constants ---
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
} from './constants/index.js';

// --- Base Setup ---
const store = useStore();
const getters = store.getters;
const validationOptions = createProcessingOptions({ chunkSize: 500, debug: true });
const validationManager = new ValidationManager(store, validationOptions);
const storeBridge = useStoreBridge(store, validationManager, { debug: import.meta.env?.MODE === 'development' || false });
const cellInputState = useCellInputState();
const selectionSystem = useVirtualSelectionSystem();
const { tryStartOperation, endOperation } = useOperationGuard();
const { registerFunction } = useGlobalFunctions();
useUndoRedo(storeBridge);

// --- DOM Refs ---
const dataContainerRef = ref(null);
const gridContainerRef = ref(null);
const gridHeaderRef = ref(null);
const gridBodyRef = ref(null);
const dateTimePickerRef = ref(null);

// --- Component State ---
const lastScrollLeft = ref(0);
const viewportHeight = ref(0);
const scrollbarWidth = ref(0);
const filterState = ref(storeBridge.filterState);
const { contextMenuState, showContextMenu, hideContextMenu } = useContextMenu();
const dateTimePickerState = reactive({
  visible: false,
  position: { top: 0, left: 0 },
  initialValue: null,
  currentEdit: null,
});
const isValidationProgressVisible = ref(false);
const validationProgress = ref(0);
const validationProcessed = ref(0);
const validationTotal = ref(0);
const validationErrorCount = ref(0);

// --- Computed Properties ---
const headers = computed(() => getters.headers);
const rows = computed(() => getters.rows);
const canUndo = computed(() => storeBridge.canUndo);
const canRedo = computed(() => storeBridge.canRedo);

const allColumnsMeta = computed(() => {
  // ... (This complex computed property remains here for now)
  const meta = [];
  let currentColIndex = 0;
  let currentOffsetLeft = 0;
  const pushMeta = (columnData) => {
    const width = parseInt(columnData.style?.width || '80px', 10);
    meta.push({ ...columnData, colIndex: currentColIndex, offsetLeft: currentOffsetLeft });
    currentOffsetLeft += width;
    currentColIndex++;
  };
  pushMeta({ type: COL_TYPE_SERIAL, headerText: '연번', headerRow: 1, isEditable: false, style: COLUMN_STYLES[COL_TYPE_SERIAL], dataKey: null, cellIndex: null });
  pushMeta({ type: COL_TYPE_IS_PATIENT, headerText: '환자여부 <br />(환자 O - 1, 정상 - 0)', headerRow: 1, isEditable: true, style: COLUMN_STYLES[COL_TYPE_IS_PATIENT], dataKey: 'isPatient', cellIndex: null });
  if (storeBridge.state.isConfirmedCaseColumnVisible) {
    pushMeta({ type: COL_TYPE_CONFIRMED_CASE, headerText: '확진여부 <br />(확진 O - 1, X - 0)', headerRow: 1, isEditable: true, style: COLUMN_STYLES[COL_TYPE_CONFIRMED_CASE], dataKey: 'isConfirmedCase', cellIndex: null, isCustom: true });
  }
  (headers.value.basic || []).forEach((header, index) => pushMeta({ type: COL_TYPE_BASIC, headerText: header, headerRow: 2, isEditable: true, style: COLUMN_STYLES.default, dataKey: 'basicInfo', cellIndex: index }));
  (headers.value.clinical || []).forEach((header, index) => pushMeta({ type: 'clinicalSymptoms', headerText: header, headerRow: 2, isEditable: true, style: COLUMN_STYLES.default, dataKey: 'clinicalSymptoms', cellIndex: index }));
  if (storeBridge.state.isIndividualExposureColumnVisible) {
    pushMeta({ type: COL_TYPE_INDIVIDUAL_EXPOSURE, headerText: '의심원 노출시간', headerRow: 1, isEditable: true, style: COLUMN_STYLES[COL_TYPE_ONSET], dataKey: 'individualExposureTime', cellIndex: null, isCustom: true });
  }
  pushMeta({ type: COL_TYPE_ONSET, headerText: '증상발현시간', headerRow: 1, isEditable: true, style: COLUMN_STYLES[COL_TYPE_ONSET], dataKey: 'symptomOnset', cellIndex: null });
  (headers.value.diet || []).forEach((header, index) => pushMeta({ type: 'dietInfo', headerText: header, headerRow: 2, isEditable: true, style: COLUMN_STYLES.default, dataKey: 'dietInfo', cellIndex: index }));
  return meta;
});

const headerGroups = computed(() => {
    // ... (This complex computed property also remains here)
    const groups = [];
    const basicLength = headers.value.basic?.length || 0;
    const clinicalLength = headers.value.clinical?.length || 0;
    const dietLength = headers.value.diet?.length || 0;
    let currentCol = 0;
    groups.push({ text: '연번', rowspan: 2, startColIndex: COL_IDX_SERIAL, style: COLUMN_STYLES[COL_TYPE_SERIAL] });
    currentCol++;
    groups.push({ text: '환자여부 <br />(환자 O - 1, 정상 - 0)', rowspan: 2, startColIndex: COL_IDX_IS_PATIENT, style: COLUMN_STYLES[COL_TYPE_IS_PATIENT] });
    currentCol++;
    if (storeBridge.state.isConfirmedCaseColumnVisible) {
        groups.push({ text: '확진여부 <br />(확진 O - 1, X - 0)', rowspan: 2, startColIndex: currentCol, style: COLUMN_STYLES[COL_TYPE_CONFIRMED_CASE] });
        currentCol++;
    }
    if (basicLength > 0) {
        groups.push({ text: '기본정보', colspan: basicLength, startColIndex: currentCol, type: COL_TYPE_BASIC, addable: true, deletable: true, columnCount: basicLength });
        currentCol += basicLength;
    } else {
        groups.push({ text: '기본정보', colspan: 1, startColIndex: currentCol, type: COL_TYPE_BASIC, addable: true, deletable: false, columnCount: 0, style: { minWidth: '60px' } });
        currentCol++;
    }
    if (clinicalLength > 0) {
        groups.push({ text: '임상증상 (증상 O - 1, 증상 X - 0)', colspan: clinicalLength, startColIndex: currentCol, type: COL_TYPE_CLINICAL, addable: true, deletable: true, columnCount: clinicalLength });
        currentCol += clinicalLength;
    } else {
        groups.push({ text: '임상증상 (증상 O - 1, 증상 X - 0)', colspan: 1, startColIndex: currentCol, type: COL_TYPE_CLINICAL, addable: true, deletable: false, columnCount: 0, style: { minWidth: '60px' } });
        currentCol++;
    }
    if (storeBridge.state.isIndividualExposureColumnVisible) {
        groups.push({ text: '의심원 노출시간', rowspan: 2, startColIndex: currentCol, style: COLUMN_STYLES[COL_TYPE_ONSET] });
        currentCol++;
    }
    groups.push({ text: '증상발현시간', rowspan: 2, startColIndex: currentCol, style: COLUMN_STYLES[COL_TYPE_ONSET] });
    currentCol++;
    if (dietLength > 0) {
        groups.push({ text: '식단 (섭취 O - 1, 섭취 X - 0)', colspan: dietLength, startColIndex: currentCol, type: COL_TYPE_DIET, addable: true, deletable: true, columnCount: dietLength });
    } else {
        groups.push({ text: '식단 (섭취 O - 1, 섭취 X - 0)', colspan: 1, startColIndex: currentCol, type: COL_TYPE_DIET, addable: true, deletable: false, columnCount: 0, style: { minWidth: '60px' } });
    }
    return groups;
});

const tableWidth = computed(() => `${allColumnsMeta.value.reduce((total, column) => total + parseInt(column.style?.width || '80px', 10), 0)}px`);

const selectedCellInfo = computed(() => {
    const { rowIndex, colIndex } = selectionSystem.state.selectedCell;
    if (rowIndex === null || colIndex === null) return { address: '', value: '' };
    const columnMeta = allColumnsMeta.value.find(c => c.colIndex === colIndex);
    if (!columnMeta) return { address: '', value: '' };
    if (colIndex === 0 && rowIndex >= 0) return { address: '', value: String(rows.value[rowIndex] ? rowIndex + 1 : '') };

    let headerLabel = (columnMeta.headerText || '').replace(/<br\s*\/?>/gi, ' ').trim();
    if (columnMeta.type === COL_TYPE_IS_PATIENT) headerLabel = headerLabel.split('(')[0].trim();

    const groupedTypes = [COL_TYPE_BASIC, COL_TYPE_CLINICAL, COL_TYPE_DIET];
    if (rowIndex < 0 && groupedTypes.includes(columnMeta.type)) {
        const grp = headerGroups.value.find(g => colIndex >= g.startColIndex && colIndex < g.startColIndex + (g.colspan || 1));
        headerLabel = grp && grp.text ? String(grp.text).split('(')[0].trim() : '';
    }

    const address = rowIndex >= 0 ? `${headerLabel} / ${rowIndex + 1}` : headerLabel;
    const value = rowIndex < 0 ? getCellValue(null, columnMeta, -1) : getCellValue(rows.value[rowIndex], columnMeta, rowIndex);
    return { address, value };
});

const filteredRows = computed(() => {
  if (!storeBridge.filterState.isFiltered || (storeBridge.filterState.activeFilters?.size || 0) === 0) {
    return rows.value;
  }
  return rows.value.map((row, originalIndex) => ({ ...row, _originalIndex: originalIndex }))
    .filter(row => Array.from(storeBridge.filterState.activeFilters).every(([colIndex, filterConfig]) => storeBridge.matchesFilter(row, colIndex, filterConfig)));
});

const validationErrors = computed(() => store.state.validationState?.errors instanceof Map ? store.state.validationState.errors : new Map());
const filterRowValidationManager = new FilterRowValidationManager();
const visibleValidationErrors = computed(() => {
    filterRowValidationManager.updateFilterState(storeBridge.filterState.isFiltered, filteredRows.value, validationErrors.value);
    return filterRowValidationManager.getVisibleErrors();
});

const computedActiveFilters = computed(() => new Map(filterState.value.activeFilters || []));

// --- Virtual Scroll ---
const { visibleRows, totalHeight, paddingTop, onScroll } = useVirtualScroll(filteredRows, { rowHeight: 35, bufferSize: 1, viewportHeight });

// --- Helper Functions ---
const focusGrid = () => dataContainerRef.value?.focus();

function getCellValue(row, columnMeta, rowIndex = null) {
    if (!columnMeta) return '';
    if (rowIndex < 0) return (columnMeta.headerText || '').replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]*>/g, '').trim();
    if (columnMeta.type === COL_TYPE_SERIAL) return (row && row._originalIndex !== undefined) ? row._originalIndex + 1 : (rowIndex + 1);
    if (!row || !columnMeta.dataKey) return '';
    if (columnMeta.cellIndex !== null && columnMeta.cellIndex !== undefined) {
        return (row[columnMeta.dataKey] && Array.isArray(row[columnMeta.dataKey])) ? (row[columnMeta.dataKey][columnMeta.cellIndex] ?? '') : '';
    }
    return row[columnMeta.dataKey] ?? '';
}

async function ensureCellIsVisible(rowIndex, colIndex) {
    // ... (This helper function remains)
    if (!gridBodyRef.value?.bodyContainer) return;
    const container = gridBodyRef.value.bodyContainer;
    let hasScrolled = false;
    if (rowIndex >= 0) {
        const rowHeight = 35;
        const { scrollTop, clientHeight } = container;
        const rowTop = rowIndex * rowHeight;
        const rowBottom = rowTop + rowHeight;
        let newScrollTop = scrollTop;
        if (rowTop < scrollTop) newScrollTop = rowTop;
        else if (rowBottom > scrollTop + clientHeight) newScrollTop = rowBottom - clientHeight + 40;
        if (newScrollTop !== scrollTop) {
            container.scrollTop = Math.min(newScrollTop, totalHeight.value - clientHeight);
            hasScrolled = true;
        }
    }
    if (colIndex >= 0) {
        const column = allColumnsMeta.value.find(c => c.colIndex === colIndex);
        if (!column) return;
        const { scrollLeft, clientWidth } = container;
        const colLeft = column.offsetLeft;
        const colRight = colLeft + parseInt(column.style.width, 10);
        let newScrollLeft = scrollLeft;
        if (colLeft < scrollLeft) newScrollLeft = colIndex === 1 ? 0 : colLeft;
        else if (colRight > scrollLeft + clientWidth) newScrollLeft = colRight - clientWidth;
        if (newScrollLeft !== scrollLeft) {
            container.scrollLeft = newScrollLeft;
            hasScrolled = true;
        }
    }
    if (hasScrolled) await nextTick();
}

function captureSnapshotWithFilter(actionType, metadata = {}) {
    try {
        storeBridge._captureSnapshot(actionType, metadata);
    } catch (error) {
        logger.error(`스냅샷 캡처 실패: ${actionType}`, error);
    }
}

function syncFilterStateAfterHistoryChange() {
    const newFilterState = { ...storeBridge.filterState };
    filterState.value = newFilterState;
    if (storeBridge.setFilterState) {
        storeBridge.setFilterState(newFilterState);
    }
    nextTick(() => {
        const gridBody = gridBodyRef.value;
        const gridHeader = gridHeaderRef.value;
        if (gridBody && gridHeader) {
            if (newFilterState.isFiltered !== filterState.value.isFiltered || newFilterState.activeFilters?.size !== filterState.value.activeFilters?.size) {
                gridBody.$forceUpdate();
                gridHeader.$forceUpdate();
            }
        }
    });
}

// --- Composables Instantiation ---
const dataOpContext = { storeBridge, validationManager, selectionSystem, allColumnsMeta, getCellValue, tryStartOperation, endOperation, captureSnapshotWithFilter, syncFilterStateAfterHistoryChange, focusGrid };
const { isUploadingExcel, excelUploadProgress, ...dataOperations } = useGridDataOperations(dataOpContext);

const eventHandlerContext = { selectionSystem, storeBridge, cellInputState, validationManager, allColumnsMeta, contextMenuState, dateTimePickerRef, dateTimePickerState, gridBodyRef };
const eventHandlerHelpers = { showContextMenu, hideContextMenu, focusGrid, ensureCellIsVisible, getCellValue, captureSnapshotWithFilter };
const { onDocumentMouseMoveBound, onDocumentMouseUpBound, ...eventHandlers } = useGridEventHandlers(eventHandlerContext, eventHandlerHelpers);

const { onFileDropped } = useDragDrop(dataOperations.onExcelFileSelected);

// --- Pass event handlers to the template ---
const {
  onKeyDown, onCellMouseDown, onCellDoubleClick, onCellInput, onContextMenu, onContextMenuSelect,
  onUpdateCellValueFromBar, onEnterPressedFromBar, onDateTimeConfirm, onDateTimeCancel, handleGlobalClick
} = eventHandlers;

const {
  onExcelFileSelected, onDownloadTemplate, onExportData, onCopyEntireData, onDeleteEmptyCols,
  onResetSheet, onToggleExposureColumn, onToggleConfirmedCaseColumn, onUndo, onRedo,
  onClearAllFilters, onUpdateActiveFilters, onAddColumn, onDeleteColumn, onDeleteEmptyRows,
  onAddRows, onClearSelection
} = dataOperations;


// --- Lifecycle and Watchers ---
watch(allColumnsMeta, (newMeta) => {
    setColumnsMeta(newMeta);
    nextTick(() => updateHeaderPadding());
}, { immediate: true });

watch(() => storeBridge.filterState, (newState) => {
    if (JSON.stringify(newState) !== JSON.stringify(filterState.value)) {
        filterState.value = { ...newState };
        nextTick(() => {
            if (gridBodyRef.value && gridHeaderRef.value) {
                gridBodyRef.value.$forceUpdate();
                gridHeaderRef.value.$forceUpdate();
            }
        });
    }
}, { deep: true, immediate: true });

onMounted(() => {
    registerFunction('storeBridge', storeBridge);
    registerFunction('showToast', showToast);
    registerFunction('updateValidationProgress', (progress, processed, total, errors) => {
        isValidationProgressVisible.value = true;
        validationProgress.value = progress;
        validationProcessed.value = processed;
        validationTotal.value = total;
        validationErrorCount.value = errors;
    });
    registerFunction('hideValidationProgress', () => {
        isValidationProgressVisible.value = false;
    });

    storeBridge.clearAllFilters();
    if (gridContainerRef.value) {
        const bodyElement = gridContainerRef.value.querySelector('.grid-body-virtual');
        if (bodyElement) viewportHeight.value = bodyElement.clientHeight - 5;
    }
    setColumnsMeta(allColumnsMeta.value);

    document.addEventListener('click', hideContextMenu);
    document.addEventListener('click', handleGlobalClick);
    const cleanupDragDrop = setupDragDropListeners(onFileDropped);
    window.addEventListener('resize', handleWindowResize);

    onBeforeUnmount(() => {
        document.removeEventListener('click', hideContextMenu);
        document.removeEventListener('click', handleGlobalClick);
        window.removeEventListener('resize', handleWindowResize);
        if (onDocumentMouseMoveBound.value) document.removeEventListener('mousemove', onDocumentMouseMoveBound.value);
        if (onDocumentMouseUpBound.value) document.removeEventListener('mouseup', onDocumentMouseUpBound.value);
        if (cleanupDragDrop) cleanupDragDrop();
        if (validationManager?.clearTimers) validationManager.clearTimers();
    });
});

function handleFocusFirstError() {
    const errors = Array.from(visibleValidationErrors.value.entries());
    if (errors.length === 0) return;
    const [key] = errors[0];
    const [rowIndex, uniqueKey] = key.split('_');
    const originalRowIndex = parseInt(rowIndex, 10);
    const columnMeta = allColumnsMeta.value.find(col => validationManager.getColumnUniqueKey(col) === uniqueKey);
    if (!columnMeta) return;
    const colIndex = columnMeta.colIndex;
    let targetRowIndex = originalRowIndex;
    if (storeBridge.filterState.isFiltered) {
        const filteredIndex = filteredRows.value.findIndex(row => row._originalIndex === originalRowIndex);
        if (filteredIndex !== -1) targetRowIndex = filteredIndex;
    }
    ensureCellIsVisible(targetRowIndex, colIndex);
    selectionSystem.selectCell(targetRowIndex, colIndex);
    focusGrid();
}

function updateHeaderPadding() {
    const newScrollbarWidth = calculateScrollbarWidth();
    if (newScrollbarWidth !== scrollbarWidth.value) {
        scrollbarWidth.value = newScrollbarWidth;
        nextTick(() => {
            if (gridHeaderRef.value?.headerContainer) {
                gridHeaderRef.value.headerContainer.style.paddingRight = `${scrollbarWidth.value}px`;
            }
        });
    }
}

function calculateScrollbarWidth() {
    const bodyElement = gridBodyRef.value?.bodyContainer;
    if (!bodyElement) return 0;
    return bodyElement.scrollHeight > bodyElement.clientHeight ? bodyElement.offsetWidth - bodyElement.clientWidth : 0;
}

function handleGridScroll(event) {
    const { scrollLeft } = event.target;
    if (scrollLeft !== lastScrollLeft.value) {
        lastScrollLeft.value = scrollLeft;
        if (gridHeaderRef.value?.headerContainer) {
            gridHeaderRef.value.headerContainer.scrollLeft = scrollLeft;
        }
    }
    updateHeaderPadding();
    onScroll(event);
}

function handleWindowResize() {
  nextTick(() => {
    updateHeaderPadding();
  });
}
</script>

<style scoped>
.data-input-virtual-container {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  height: 100%;
  display: grid;
  grid-template-rows: auto auto 1fr;
  background-color: #fff;
  overflow: hidden;
  /* padding-bottom removed because AddRowsControls now inside table */
  box-sizing: border-box;
  outline: none; /* 포커스 시 외곽선 제거 */
}

.data-input-virtual-container:focus-within {
    /* Optionally add a focus indicator for the whole grid */
}

.grid-container {
  display: grid;
  grid-template-rows: auto 1fr;
  overflow: hidden;
  background-color: white;
  min-height: 0;
}

/* 딥 셀렉터를 사용하여 자식 컴포넌트의 클래스에 스타일 적용 */
:deep(.cell-selected) {
  box-shadow: 0 0 0 1.5px #1a73e8 inset !important;
  z-index: 10;
}

/* 범위 선택 테두리 스타일 */
:deep(.border-top) {
  box-shadow: inset 0 1.5px 0 0 #1a73e8 !important;
}

:deep(.border-bottom) {
  box-shadow: inset 0 -1.5px 0 0 #1a73e8 !important;
}

:deep(.border-left) {
  box-shadow: inset 1.5px 0 0 0 #1a73e8 !important;
}

:deep(.border-right) {
  box-shadow: inset -1.5px 0 0 0 #1a73e8 !important;
}

/* 테두리 조합 스타일 */
:deep(.border-top.border-left) {
  box-shadow: inset 1.5px 1.5px 0 0 #1a73e8 !important;
}

:deep(.border-top.border-right) {
  box-shadow: inset -1.5px 1.5px 0 0 #1a73e8 !important;
}

:deep(.border-bottom.border-left) {
  box-shadow: inset 1.5px -1.5px 0 0 #1a73e8 !important;
}

:deep(.border-bottom.border-right) {
  box-shadow: inset -1.5px -1.5px 0 0 #1a73e8 !important;
}

:deep(.border-top.border-bottom) {
  box-shadow: inset 0 1.5px 0 0 #1a73e8, inset 0 -1.5px 0 0 #1a73e8 !important;
}

:deep(.border-left.border-right) {
  box-shadow: inset 1.5px 0 0 0 #1a73e8, inset -1.5px 0 0 0 #1a73e8 !important;
}

:deep(.border-top.border-left.border-right) {
  box-shadow: inset 1.5px 1.5px 0 0 #1a73e8, inset -1.5px 1.5px 0 0 #1a73e8 !important;
}

:deep(.border-bottom.border-left.border-right) {
  box-shadow: inset 1.5px -1.5px 0 0 #1a73e8, inset -1.5px -1.5px 0 0 #1a73e8 !important;
}

:deep(.border-top.border-bottom.border-left) {
  box-shadow: inset 1.5px 1.5px 0 0 #1a73e8, inset 1.5px -1.5px 0 0 #1a73e8 !important;
}

:deep(.border-top.border-bottom.border-right) {
  box-shadow: inset -1.5px 1.5px 0 0 #1a73e8, inset -1.5px -1.5px 0 0 #1a73e8 !important;
}

:deep(.border-top.border-bottom.border-left.border-right) {
  box-shadow: inset 1.5px 1.5px 0 0 #1a73e8, inset -1.5px 1.5px 0 0 #1a73e8, inset 1.5px -1.5px 0 0 #1a73e8, inset -1.5px -1.5px 0 0 #1a73e8 !important;
}

/* 개별 셀 선택(다중) 배경 및 테두리 */
:deep(.cell-multi-selected) {
  background-color: rgba(26, 115, 232, 0.18) !important;
  box-shadow: 0 0 0 1.5px #1a73e8 inset !important;
  z-index: 9;
}

/* 개별 행 선택 배경 */
:deep(.row-individual-selected) {
  background-color: rgba(26, 115, 232, 0.08) !important;
}

/* Body 영역에서 AddRowsControls(5px) 여백만 제외하여 스크롤 영역 설정 */
:deep(.grid-body-virtual) {
  height: calc(100% - 6px);
}
</style> 