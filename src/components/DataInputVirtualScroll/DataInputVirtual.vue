<template>
  <div 
    class="h-full grid grid-rows-[auto_auto_1fr] bg-white overflow-hidden outline-none pb-[37px]"
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
    <div class="flex flex-col overflow-hidden bg-white min-h-0 relative z-10" ref="gridContainerRef">
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
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue';
import VirtualAppHeader from './layout/VirtualAppHeader.vue';
import VirtualFunctionBar from './layout/VirtualFunctionBar.vue';
import VirtualGridHeader from './layout/VirtualGridHeader.vue';
import VirtualGridBody from './layout/VirtualGridBody.vue';
import ContextMenu from './parts/ContextMenu.vue';
import DragOverlay from './parts/DragOverlay.vue';
import DateTimePicker from './parts/DateTimePicker.vue';
// --- 새로운 저장 시스템 ---
import { useStoreBridge } from '../../store/storeBridge.js';
import { useCellInputState } from '../../store/cellInputState.js';
import ToastContainer from './parts/ToastContainer.vue';
import { useContextMenu } from './logic/useContextMenu.js';
import { useVirtualSelectionSystem, setColumnsMeta } from './logic/virtualSelectionSystem.js';
import { showToast } from './logic/toast.js';
import { useDragDrop } from './logic/dragDrop.js';
import {
  COL_TYPE_BASIC,
  COL_TYPE_IS_PATIENT,
  COL_TYPE_CLINICAL,
  COL_TYPE_DIET
} from './constants/index.js';
import { useUndoRedo } from '../../hooks/useUndoRedo.js';
import { useOperationGuard } from '../../hooks/useOperationGuard.js';
// Validation
import ValidationManager from '../../validation/ValidationManager.js';
import { createProcessingOptions } from '../../utils/environmentUtils.js';
import ValidationProgress from './parts/ValidationProgress.vue';
// Logger
import { logger, devLog } from '../../utils/logger.js';

// --- 상수 (기존 컴포넌트에서 가져옴) ---
import { useGridColumns } from './composables/useGridColumns.js';
import { useGridScrolling } from './composables/useGridScrolling.js';
import { useGridFilter } from './composables/useGridFilter.js';
import { useGridInteraction } from './composables/useGridInteraction.js';
import { useExcelOperations } from './composables/useExcelOperations.js';
import { useGridContextMenu } from './composables/useGridContextMenu.js';
import { useGridRowOperations } from './composables/useGridRowOperations.js';
import { useUndoRedoHandlers } from './composables/useUndoRedoHandlers.js';
import { useDateTimePicker } from './composables/useDateTimePicker.js';

// --- 스토어 및 상태 ---
// --- 스토어 및 상태 ---
// --- Template Refs (Must be defined at the top to avoid TDZ in composables) ---
const dataContainerRef = ref(null);
const gridContainerRef = ref(null);
const gridHeaderRef = ref(null);
const gridBodyRef = ref(null);
const dateTimePickerRef = ref(null);

const focusGrid = () => dataContainerRef.value?.focus();

// --- Core Reactive State ---
// --- Core Reactive State ---
// rows computed replaced by direct storeBridge access or below
const rows = computed(() => storeBridge.rows);

// --- DateTimePicker State (Moved to useDateTimePicker) ---

// --- Validation Status Refs ---
const isValidationProgressVisible = ref(false);
const validationProgress = ref(0);
const validationProcessed = ref(0);
const validationTotal = ref(0);
const validationErrorCount = ref(0);



// ValidationManager 인스턴스 (환경에 따른 자동 최적화)
const validationOptions = createProcessingOptions({
  chunkSize: 500,
  debug: true  // 강제로 디버그 모드 활성화
});

// --- 새로운 저장 시스템 (Initialization Order Fix for Pinia Migration) ---
// 1. 먼저 StoreBridge를 초기화 (Shim 생성)
const storeBridge = useStoreBridge(null, null, { 
  debug: import.meta.env?.MODE === 'development' || false
});

// 2. ValidationManager에 StoreBridge의 Legacy Shim 전달
const validationManager = new ValidationManager(storeBridge.bridge.legacyStore, validationOptions);

// 3. StoreBridge에 ValidationManager 연결 (Circular reference handling)
storeBridge.bridge.validationManager = validationManager;

// (Filter logic moved to useGridFilter)



// 전역 Undo/Redo 키보드 단축키 활성화
useUndoRedo(storeBridge);
const cellInputState = useCellInputState();

// --- DateTimePicker System ---
const {
  dateTimePickerState,
  onDateTimeConfirm,
  onDateTimeCancel,
  closeDateTimePicker
} = useDateTimePicker(storeBridge, validationManager, focusGrid);



// --- 작업 가드 시스템 ---
const { tryStartOperation, endOperation } = useOperationGuard();

// --- Selection System ---
const selectionSystem = useVirtualSelectionSystem();

// --- Column Logic (Extracted to useGridColumns) ---
const { 
  allColumnsMeta, 
  headerGroups, 
  tableWidth, 
  onToggleExposureColumn, 
  onToggleConfirmedCaseColumn,
  onAddColumn,
  onDeleteColumn,
  onDeleteEmptyCols,
  onResetSheet
} = useGridColumns(storeBridge, validationManager, selectionSystem, focusGrid, tryStartOperation, endOperation);

function onCellInput(event, rowIndex, colIndex) {
  const newValue = event.target.textContent;
  const columnMeta = allColumnsMeta.value.find(c => c.colIndex === colIndex);
  if (columnMeta) {
    cellInputState.updateTempValue(rowIndex, colIndex, newValue, columnMeta);
  }
}

// --- Filter System (useGridFilter) ---
const {
  filterState,
  filteredRows,
  captureSnapshotWithFilter,
  syncFilterStateAfterHistoryChange,
  onClearAllFilters,
  onUpdateActiveFilters
} = useGridFilter(storeBridge, rows, gridBodyRef, gridHeaderRef);

// --- 가상 스크롤 및 그리드 DOM 관리 (useGridScrolling) ---
const {
  visibleRows,
  totalHeight,
  paddingTop,
  scrollbarWidth,
  getOriginalIndex,
  handleGridScroll,
  ensureCellIsVisible
} = useGridScrolling(filteredRows, allColumnsMeta, {
  rowHeight: 35,
  bufferSize: 1,
  gridContainerRef,
  gridHeaderRef,
  gridBodyRef
});


// 전역 함수 관리 시스템 사용
import { useGlobalFunctions } from '../../hooks/useGlobalFunctions.js';

// 전역 함수 관리 훅 사용
const { registerFunction } = useGlobalFunctions();

// ValidationManager에서 사용할 수 있도록 전역 함수 등록
if (typeof window !== 'undefined') {
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
}



// --- Interaction System (useGridInteraction) ---
const {
  onCellMouseDown,
  onCellDoubleClick,
  onUpdateCellValueFromBar,
  onEnterPressedFromBar,
  onKeyDown: onGridKeyDown,
  getCellValue,
  cleanupInteractionListeners
  // onDocumentMouseMoveBound and onDocumentMouseUpBound unused
} = useGridInteraction(
  storeBridge,
  selectionSystem,
  cellInputState,
  allColumnsMeta,
  filteredRows, // Use filteredRows for safe interaction
  focusGrid,
  ensureCellIsVisible,
  validationManager,
  dateTimePickerState,
  dateTimePickerRef,
  gridBodyRef,
  closeDateTimePicker,
  onDateTimeCancel
);



// 컴포넌트 마운트 시 기존 에러를 고유 식별자 기반으로 마이그레이션
onMounted(() => {
  // ValidationManager에 열 메타데이터 업데이트
  if (validationManager && allColumnsMeta.value.length > 0) {
    validationManager.updateColumnMetas(allColumnsMeta.value);
    validationManager.migrateErrorsToUniqueKeys(allColumnsMeta.value);
    validationManager.printUniqueKeyMapping(allColumnsMeta.value);
  }
});


const selectedCellInfo = computed(() => {
  const { rowIndex, colIndex } = selectionSystem.state.selectedCell;
  if (rowIndex === null || colIndex === null) {
    return { address: '', value: '' };
  }

  const columnMeta = allColumnsMeta.value.find(c => c.colIndex === colIndex);
  
  // columnMeta가 없는 경우 처리
  if (!columnMeta) {
    return { address: '', value: '' };
  }

  // If a whole row (serial column) is selected, show empty id
  if (colIndex === 0 && rowIndex >= 0) {
    const value = rows.value[rowIndex] ? rowIndex + 1 : '';
    return { address: '', value: String(value) };
  }

  // Determine header / group label
  let headerLabel = (columnMeta.headerText || '').replace(/<br\s*\/?>/gi, ' ').trim();

  // 환자여부 컬럼은 괄호 설명을 제거합니다.
  if (columnMeta.type === COL_TYPE_IS_PATIENT) {
    headerLabel = headerLabel.split('(')[0].trim();
  }

  const groupedTypes = [COL_TYPE_BASIC, COL_TYPE_CLINICAL, COL_TYPE_DIET];

  // Header row (-1) 선택 시에는 그룹 이름을 사용,
  // 바디 셀 선택 시에는 개별 변수명을 그대로 표시합니다.
  if (rowIndex < 0 && groupedTypes.includes(columnMeta.type)) {
    const grp = headerGroups.value.find(g => colIndex >= g.startColIndex && colIndex < g.startColIndex + (g.colspan || 1));
    const groupName = grp && grp.text ? String(grp.text).split('(')[0].trim() : '';
    headerLabel = groupName;
  }

  // Build display id
  let address = '';
  if (rowIndex >= 0) {
    address = `${headerLabel} / ${rowIndex + 1}`;
  } else { // header row selected
    address = headerLabel;
  }

  // value
  let value = '';
  if (rowIndex < 0) {
    value = getCellValue(null, columnMeta, -1);
  } else {
    const row = rows.value[rowIndex];
    value = getCellValue(row, columnMeta, rowIndex);
  }

  return { address, value };
});

// --- 필터된 행 계산 ---


// --- Context Menu System ---
const { contextMenuState, showContextMenu, hideContextMenu } = useContextMenu();

// --- Context Menu Logic (useGridContextMenu) ---
const {
  onContextMenu,
  onContextMenuSelect
} = useGridContextMenu(
  storeBridge,
  selectionSystem,
  allColumnsMeta,
  contextMenuState,
  showContextMenu,
  hideContextMenu,
  getOriginalIndex,
  validationManager,
  tryStartOperation,
  endOperation,
  focusGrid,
  captureSnapshotWithFilter,
  filterState,
  rows,
  filteredRows
);

// --- Excel Upload/Export (useExcelOperations) ---
const {
  isUploadingExcel,
  excelUploadProgress,
  onExcelFileSelected,
  onExportData,
  onDownloadTemplate,
  onCopyEntireData,
  onFileDropped
} = useExcelOperations(
  storeBridge, 
  validationManager, 
  selectionSystem, 
  tryStartOperation, 
  endOperation,
  allColumnsMeta,
  getCellValue,
  {
    hasIndividualExposure: computed(() => storeBridge.state.settings.isIndividualExposureColumnVisible),
    hasConfirmedCase: computed(() => storeBridge.state.settings.isConfirmedCaseColumnVisible)
  }
);

// --- Row Operations (useGridRowOperations) ---
const {
  onDeleteEmptyRows,
  onAddRows,
  onClearSelection
} = useGridRowOperations(
  storeBridge,
  selectionSystem,
  rows,
  dateTimePickerState,
  closeDateTimePicker,
  tryStartOperation,
  endOperation
);

// --- Undo/Redo Handlers (useUndoRedoHandlers) ---
const {
  onUndo,
  onRedo
} = useUndoRedoHandlers(
  storeBridge,
  validationManager,
  filterState,
  syncFilterStateAfterHistoryChange,
  dateTimePickerState,
  closeDateTimePicker,
  gridBodyRef,
  gridHeaderRef
);

// --- Drag & Drop ---
// Drag operations only handle UI state; the actual dropped file handling is passed to onFileDropped from useExcelOperations
const { isDragOver, setupDragDropListeners } = useDragDrop();
let cleanupDragDrop = null;

// === 새로운 필터 유효성 검사 통합 시스템 ===
import { FilterRowValidationManager } from './utils/FilterRowValidationManager.js';

// 필터 + 행 변경 통합 매니저 인스턴스
const filterRowValidationManager = new FilterRowValidationManager();

// === Validation Errors Computed ===
const validationErrors = computed(() => {
  const errors = storeBridge.state.epidemic.validationState?.errors;
  return errors instanceof Map ? errors : new Map();
});

// 필터된 상태에서 보이는 유효성 에러만 계산 (새로운 시스템 사용)
const visibleValidationErrors = computed(() => {
  const errors = validationErrors.value;
  const isFiltered = storeBridge.filterState.isFiltered;
  const filteredRowsData = filteredRows.value;
  
  // FilterRowValidationManager 업데이트
  filterRowValidationManager.updateFilterState(isFiltered, filteredRowsData, errors);
  
  // 보이는 에러만 반환
  return filterRowValidationManager.getVisibleErrors();
});

// 필터 상태 변경 감지 및 CSS 업데이트 (새로운 시스템 사용)
watch(() => storeBridge.filterState.isFiltered, (newIsFiltered, oldIsFiltered) => {
  if (newIsFiltered !== oldIsFiltered) {
    // 새로운 매니저로 CSS 업데이트
    nextTick(() => {
      // 강제로 CSS 재계산
      const gridBody = gridBodyRef.value;
      if (gridBody) {
        gridBody.$forceUpdate();
      }
    });
  }
}, { immediate: false });

function onKeyDown(event) {
  // 데이트피커가 열려 있을 때 키보드 이벤트 우선 처리
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

  // 데이트피커가 열려 있지 않을 때는 useGridInteraction에서 제공하는 핸들러 호출
  onGridKeyDown(event);
}





// --- 라이프사이클 훅 ---
const handleGlobalClick = () => {
  if (contextMenuState.visible) {
    hideContextMenu();
  }
};

onMounted(() => {
  // storeBridge를 전역으로 설정하여 유효성 검사 오류 자동 저장
  registerFunction('storeBridge', storeBridge);
  
  // 필터 상태 초기화 (임시)
  devLog('[Filter] 컴포넌트 마운트 시 필터 초기화');
  storeBridge.clearAllFilters();
  
  cleanupDragDrop = setupDragDropListeners(onFileDropped);
  
  // 컨텍스트 메뉴 닫기를 위한 전역 리스너
  document.addEventListener('mousedown', handleGlobalClick);
});

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleGlobalClick);
  if (cleanupDragDrop) cleanupDragDrop();
  if (cleanupInteractionListeners) cleanupInteractionListeners();

  // ValidationManager 타이머 정리
  if (validationManager && typeof validationManager.clearTimers === 'function') {
    try {
      validationManager.clearTimers();
    } catch (error) {
      // 정리 중 오류가 발생해도 무시
    }
  }

  // [Critical Fix] Memory Leak Prevention
  // 컴포넌트 언마운트 시 전역 참조 해제
  if (storeBridge && storeBridge.bridge) {
    storeBridge.bridge.validationManager = null;
  }
});

watch(allColumnsMeta, (newMeta) => {
  setColumnsMeta(newMeta);
}, { immediate: true });




// --- Missing Template Refs/Props Fixes ---
const canUndo = computed(() => storeBridge.canUndo);
const canRedo = computed(() => storeBridge.canRedo);
const computedActiveFilters = computed(() => storeBridge.filterState.activeFilters);

function handleFocusFirstError() {
  // 필터된 상태에서는 보이는 에러만 고려
  const errors = Array.from(visibleValidationErrors.value.entries());
  if (errors.length === 0) return;
  
  const [key] = errors[0];
  const [rowIndex, uniqueKey] = key.split('_');
  const originalRowIndex = parseInt(rowIndex, 10);
  
  // 고유 키를 사용하여 열 인덱스 찾기
  const columnMeta = allColumnsMeta.value.find(col => {
    const colUniqueKey = validationManager.getColumnUniqueKey(col);
    return colUniqueKey === uniqueKey;
  });
  
  if (!columnMeta) {
    logger.warn('[FocusFirstError] Column meta not found for unique key:', uniqueKey);
    return;
  }
  
  const colIndex = columnMeta.colIndex;
  
  // 필터된 상태에서는 필터된 인덱스로 변환
  let targetRowIndex = originalRowIndex;
  if (storeBridge.filterState.isFiltered) {
    const filteredIndex = filteredRows.value.findIndex(row => 
      row._originalIndex === originalRowIndex
    );
    if (filteredIndex !== -1) {
      targetRowIndex = filteredIndex;
    }
  }
  
  devLog('[FocusFirstError] Focusing error cell:', {
    originalRowIndex,
    targetRowIndex,
    colIndex,
    uniqueKey
  });
  
  // 가상 스크롤/그리드에 셀 이동 및 포커스
  ensureCellIsVisible(targetRowIndex, colIndex);
  selectionSystem.selectCell(targetRowIndex, colIndex);
  focusGrid();
}





</script>

<style scoped>
/* Grid Selection & Border Styles */
/* These use specific box-shadows for pixel-perfect grid borders which are difficult to replicate with standard border utilities */

/* Deep selectors to apply styles to child grid components */
:deep(.cell-selected) {
  @apply z-10;
  box-shadow: 0 0 0 1.5px theme('colors.blue.600') inset !important;
}

/* Range Selection Borders */
:deep(.border-top) {
  box-shadow: inset 0 1.5px 0 0 theme('colors.blue.600') !important;
}

:deep(.border-bottom) {
  box-shadow: inset 0 -1.5px 0 0 theme('colors.blue.600') !important;
}

:deep(.border-left) {
  box-shadow: inset 1.5px 0 0 0 theme('colors.blue.600') !important;
}

:deep(.border-right) {
  box-shadow: inset -1.5px 0 0 0 theme('colors.blue.600') !important;
}

/* Border Combinations */
:deep(.border-top.border-left) {
  box-shadow: inset 1.5px 1.5px 0 0 theme('colors.blue.600') !important;
}

:deep(.border-top.border-right) {
  box-shadow: inset -1.5px 1.5px 0 0 theme('colors.blue.600') !important;
}

:deep(.border-bottom.border-left) {
  box-shadow: inset 1.5px -1.5px 0 0 theme('colors.blue.600') !important;
}

:deep(.border-bottom.border-right) {
  box-shadow: inset -1.5px -1.5px 0 0 theme('colors.blue.600') !important;
}

:deep(.border-top.border-bottom) {
  box-shadow: inset 0 1.5px 0 0 theme('colors.blue.600'), inset 0 -1.5px 0 0 theme('colors.blue.600') !important;
}

:deep(.border-left.border-right) {
  box-shadow: inset 1.5px 0 0 0 theme('colors.blue.600'), inset -1.5px 0 0 0 theme('colors.blue.600') !important;
}

:deep(.border-top.border-left.border-right) {
  box-shadow: inset 1.5px 1.5px 0 0 theme('colors.blue.600'), inset -1.5px 1.5px 0 0 theme('colors.blue.600') !important;
}

:deep(.border-bottom.border-left.border-right) {
  box-shadow: inset 1.5px -1.5px 0 0 theme('colors.blue.600'), inset -1.5px -1.5px 0 0 theme('colors.blue.600') !important;
}

:deep(.border-top.border-bottom.border-left) {
  box-shadow: inset 1.5px 1.5px 0 0 theme('colors.blue.600'), inset 1.5px -1.5px 0 0 theme('colors.blue.600') !important;
}

:deep(.border-top.border-bottom.border-right) {
  box-shadow: inset -1.5px 1.5px 0 0 theme('colors.blue.600'), inset -1.5px -1.5px 0 0 theme('colors.blue.600') !important;
}

:deep(.border-top.border-bottom.border-left.border-right) {
  box-shadow: inset 1.5px 1.5px 0 0 theme('colors.blue.600'), inset -1.5px 1.5px 0 0 theme('colors.blue.600'), inset 1.5px -1.5px 0 0 theme('colors.blue.600'), inset -1.5px -1.5px 0 0 theme('colors.blue.600') !important;
}

/* Multi-select Background */
:deep(.cell-multi-selected) {
  background-color: rgba(37, 99, 235, 0.1) !important; /* blue-600 with opacity */
  box-shadow: 0 0 0 1.5px theme('colors.blue.600') inset !important;
  @apply z-[9];
}

/* Row Selection */
:deep(.row-individual-selected) {
  background-color: rgba(37, 99, 235, 0.05) !important;
}

/* Range Active Cell */
:deep(.cell-active-in-range) {
  @apply bg-white z-[15];
}

/* Header & Body Layout Fixes */
:deep(.grid-header-virtual) {
  @apply flex-none relative z-10 shadow-sm border-b border-gray-200;
  padding-bottom: 2px;
}

:deep(.grid-body-virtual) {
  @apply flex-1 min-h-0 z-[1] h-auto;
}
</style>
 