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
// --- 새로운 저장 시스템 ---
import { useStoreBridge } from '../../store/storeBridge.js';
import { useCellInputState } from '../../store/cellInputState.js';
import ToastContainer from './parts/ToastContainer.vue';
import AddRowsControls from './parts/AddRowsControls.vue';
import { useContextMenu } from './logic/useContextMenu.js';
import { handleContextMenu } from './handlers/contextMenuHandlers.js';
import { useVirtualScroll } from './logic/useVirtualScroll.js';
import { useVirtualSelectionSystem, setColumnsMeta } from './logic/virtualSelectionSystem.js';
import { 
  handleVirtualCellMouseDown, 
  handleVirtualDocumentMouseMove,
  handleVirtualDocumentMouseUp,
  handleVirtualCellDoubleClick
} from './handlers/virtualCellHandlers.js';
import { handleVirtualKeyDown } from './handlers/virtualKeyboardHandlers.js';
import { processExcelFile } from './logic/excelProcessor.js';
import { useDataExport } from './logic/useDataExport.js';
import { useDragDrop } from './logic/dragDrop.js';
import { showToast, showConfirmToast } from './logic/toast.js';
import { useUndoRedo } from '../../hooks/useUndoRedo.js';
// Validation
import ValidationManager from '../../validation/ValidationManager.js';
import { createProcessingOptions } from '../../utils/environmentUtils.js';
import ValidationProgress from './parts/ValidationProgress.vue';
// Logger
import { createComponentLogger } from '../../utils/logger.js';

// --- 상수 (기존 컴포넌트에서 가져옴) ---
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
  COLUMN_STYLES
} from './constants/index.js';

// --- Logger 초기화 ---
const logger = createComponentLogger('DataInputVirtual');

const COL_TYPE_INDIVIDUAL_EXPOSURE = 'individualExposureTime';

// --- 스토어 및 상태 ---
const store = useStore();
const getters = store.getters;

// ValidationManager 인스턴스 (환경에 따른 자동 최적화)
const validationOptions = createProcessingOptions({
  chunkSize: 500,
  debug: true  // 강제로 디버그 모드 활성화
});

const validationManager = new ValidationManager(store, validationOptions);

// --- 새로운 저장 시스템 ---
const storeBridge = useStoreBridge(store, validationManager, { 
  debug: import.meta.env?.MODE === 'development' || false
});

// 필터 상태를 reactive하게 만들기
const filterState = ref(storeBridge.filterState);

// 필터 상태 변화 감지 - 단일 watch로 통합
watch(() => storeBridge.filterState, (newState) => {
  // 새로운 상태와 현재 상태가 다른 경우에만 업데이트
  if (JSON.stringify(newState) !== JSON.stringify(filterState.value)) {
    filterState.value = { ...newState };
    
    // UI 강제 업데이트도 트리거
    nextTick(() => {
      const gridBody = gridBodyRef.value;
      const gridHeader = gridHeaderRef.value;
      
      if (gridBody) {
        gridBody.$forceUpdate();
      }
      
      if (gridHeader) {
        gridHeader.$forceUpdate();
      }
    });
  }
}, { 
  deep: true, 
  immediate: true,
  flush: 'sync' // 동기적으로 즉시 실행
});

// StoreBridge에 ValidationManager 설정 (이미 생성자에서 전달했으므로 제거)
// storeBridge.validationManager = validationManager;

// 전역 Undo/Redo 키보드 단축키 활성화
useUndoRedo(storeBridge);
const cellInputState = useCellInputState();

// === 필터 상태 포함한 스냅샷 캡처 헬퍼 ===
function captureSnapshotWithFilter(actionType, metadata = {}) {
  try {
    // StoreBridge의 _captureSnapshot이 이제 자동으로 필터 상태를 포함하므로
    // 단순히 _captureSnapshot을 호출하면 됩니다.
    storeBridge._captureSnapshot(actionType, metadata);
  } catch (error) {
    logger.error(`스냅샷 캡처 실패: ${actionType}`, error);
  }
}

// === 히스토리 변경 후 동기화 함수 ===
function syncFilterStateAfterHistoryChange() {
  // StoreBridge에서 복원된 필터 상태를 로컬 상태와 동기화
  const newFilterState = { ...storeBridge.filterState };
  
  // 필터 상태 강제 업데이트
  filterState.value = newFilterState;
  
  // StoreBridge의 내부 필터 상태도 강제로 동기화
  if (storeBridge.setFilterState) {
    storeBridge.setFilterState(newFilterState);
  }
  
  // 필터 상태 변경으로 인한 UI 업데이트
  nextTick(() => {
    // 필터링된 행 재계산 강제 실행 - 더 강력한 방법 사용
    try {
      // 1. VirtualGridBody 강제 업데이트
      const gridBody = gridBodyRef.value;
      if (gridBody) {
        gridBody.$forceUpdate();
      }
      
      // 2. VirtualGridHeader 강제 업데이트 (필터 아이콘 표시용)
      const gridHeader = gridHeaderRef.value;
      if (gridHeader) {
        gridHeader.$forceUpdate();
      }
      
      // 3. 메인 컴포넌트의 filteredRows computed 재계산 트리거
      // filterState 값을 미세하게 변경하여 reactivity 트리거
      const triggerValue = { ...newFilterState, _trigger: Date.now() };
      filterState.value = triggerValue;
      
      // 4. 다시 정상 값으로 복원
      setTimeout(() => {
        filterState.value = newFilterState;
      }, 10);
      
    } catch (error) {
      logger.error('UI 업데이트 중 오류:', error);
    }
  });
}

// ValidationManager에서 사용할 수 있도록 전역 함수 등록
if (typeof window !== 'undefined') {
  window.showToast = showToast;
  window.updateValidationProgress = (progress, processed, total, errors) => {
    isValidationProgressVisible.value = true;
    validationProgress.value = progress;
    validationProcessed.value = processed;
    validationTotal.value = total;
    validationErrorCount.value = errors;
  };
  window.hideValidationProgress = () => {
    isValidationProgressVisible.value = false;
  };
}

// --- Undo/Redo 상태 ---
const canUndo = computed(() => storeBridge.canUndo);
const canRedo = computed(() => storeBridge.canRedo);

// 필터 상태를 반응성 있게 전달하기 위한 computed
const computedActiveFilters = computed(() => {
  const currentFilterState = filterState.value;
  return new Map(currentFilterState.activeFilters || []);
});

// 개별 노출시간 열 토글 시 백업 데이터 저장용
const individualExposureBackupData = ref([]);
// 확진자 여부 열 토글 시 백업 데이터 저장용
const confirmedCaseBackupData = ref([]);

const dataContainerRef = ref(null);
const gridContainerRef = ref(null);
const gridHeaderRef = ref(null);
const gridBodyRef = ref(null);
const dateTimePickerRef = ref(null);
const lastScrollLeft = ref(0);
const viewportHeight = ref(0);
const scrollbarWidth = ref(0);

// --- DateTimePicker 상태 ---
const dateTimePickerState = reactive({
  visible: false,
  position: { top: 0, left: 0 },
  initialValue: null
});

const focusGrid = () => dataContainerRef.value?.focus();

const onDocumentMouseMoveBound = ref(null);
const onDocumentMouseUpBound = ref(null);

// --- Selection System ---
const selectionSystem = useVirtualSelectionSystem();

// --- Computed 속성 (기존 로직 재사용) ---
const headers = computed(() => getters.headers);
const rows = computed(() => getters.rows);

// 컬럼 메타데이터
const allColumnsMeta = computed(() => {
  const meta = [];
  let currentColIndex = 0;
  let currentOffsetLeft = 0;

  const pushMeta = (columnData) => {
    const width = parseInt(columnData.style?.width || '80px', 10);
    meta.push({
      ...columnData,
      colIndex: currentColIndex,
      offsetLeft: currentOffsetLeft
    });
    currentOffsetLeft += width;
    currentColIndex++;
  };

  // 연번 컬럼
  pushMeta({
    type: COL_TYPE_SERIAL,
    headerText: '연번',
    headerRow: 1,
    isEditable: false,
    style: COLUMN_STYLES[COL_TYPE_SERIAL],
    dataKey: null,
    cellIndex: null
  });
  
  // 환자여부 컬럼
  pushMeta({
    type: COL_TYPE_IS_PATIENT,
    headerText: '환자여부 <br />(환자 O - 1, 정상 - 0)',
    headerRow: 1,
    isEditable: true,
    style: COLUMN_STYLES[COL_TYPE_IS_PATIENT],
    dataKey: 'isPatient',
    cellIndex: null
  });
  
  // AI-TODO: '확진자 여부' 열을 조건부로 추가
  if (storeBridge.state.isConfirmedCaseColumnVisible) {
    pushMeta({
      type: COL_TYPE_CONFIRMED_CASE,
      headerText: '확진여부 <br />(확진 O - 1, X - 0)',
      headerRow: 1,
      isEditable: true,
      style: COLUMN_STYLES[COL_TYPE_CONFIRMED_CASE],
      dataKey: 'isConfirmedCase',
      cellIndex: null,
      isCustom: true
    });
  }
  
  // 기본정보 컬럼들
  const basicHeaders = headers.value.basic || [];
  basicHeaders.forEach((header, index) => {
    pushMeta({
      type: COL_TYPE_BASIC,
      headerText: header,
      headerRow: 2,
      isEditable: true,
      style: COLUMN_STYLES.default,
      dataKey: 'basicInfo',
      cellIndex: index
    });
  });
  
  // 임상증상 컬럼들
  const clinicalHeaders = headers.value.clinical || [];
  clinicalHeaders.forEach((header, index) => {
    pushMeta({
      type: 'clinicalSymptoms',
      headerText: header,
      headerRow: 2,
      isEditable: true,
      style: COLUMN_STYLES.default,
      dataKey: 'clinicalSymptoms',
      cellIndex: index
    });
  });
  
  // AI-TODO: '개별 노출시간' 열을 조건부로 추가
  if (storeBridge.state.isIndividualExposureColumnVisible) {
    pushMeta({
      type: COL_TYPE_INDIVIDUAL_EXPOSURE,
      headerText: '의심원 노출시간',
      headerRow: 1,
      isEditable: true,
      style: COLUMN_STYLES[COL_TYPE_ONSET],
      dataKey: 'individualExposureTime',
      cellIndex: null,
      isCustom: true
    });
  }
  
  // 증상발현시간 컬럼
  pushMeta({
    type: COL_TYPE_ONSET,
    headerText: '증상발현시간',
    headerRow: 1,
    isEditable: true,
    style: COLUMN_STYLES[COL_TYPE_ONSET],
    dataKey: 'symptomOnset',
    cellIndex: null
  });
  
  // 식단 컬럼들
  const dietHeaders = headers.value.diet || [];
  dietHeaders.forEach((header, index) => {
    pushMeta({
      type: 'dietInfo',
      headerText: header,
      headerRow: 2,
      isEditable: true,
      style: COLUMN_STYLES.default,
      dataKey: 'dietInfo',
      cellIndex: index
    });
  });
  
  return meta;
});

// 컴포넌트 마운트 시 기존 에러를 고유 식별자 기반으로 마이그레이션
onMounted(() => {
  // ValidationManager에 열 메타데이터 업데이트
  if (validationManager && allColumnsMeta.value.length > 0) {
    validationManager.updateColumnMetas(allColumnsMeta.value);
    validationManager.migrateErrorsToUniqueKeys(allColumnsMeta.value);
    validationManager.printUniqueKeyMapping(allColumnsMeta.value);
  }
});

// allColumnsMeta 변경 시 ValidationManager 업데이트
watch(allColumnsMeta, (newColumnMetas) => {
  if (validationManager && newColumnMetas.length > 0) {
    validationManager.updateColumnMetas(newColumnMetas);
  }
}, { deep: true });

// 필터 상태 변경 시 필터된 행 재계산 (위의 watch로 대체됨)

// 컬럼 메타데이터를 StoreBridge에 설정
watch(allColumnsMeta, (newColumnMetas) => {
  if (storeBridge.bridge) {
    storeBridge.bridge.setColumnMetas(newColumnMetas);
  }
  // 스크롤바 너비 재계산
  nextTick(() => {
    updateHeaderPadding();
  });
}, { immediate: true });

// 헤더 그룹
const headerGroups = computed(() => {
  const groups = [];
  const basicLength = headers.value.basic?.length || 0;
  const clinicalLength = headers.value.clinical?.length || 0;
  const dietLength = headers.value.diet?.length || 0;
  let currentCol = 0;
  
  // 연번
  groups.push({
    text: '연번',
    rowspan: 2,
    startColIndex: COL_IDX_SERIAL,
    style: COLUMN_STYLES[COL_TYPE_SERIAL]
  });
  currentCol++;
  
  // 환자여부
  groups.push({
    text: '환자여부 <br />(환자 O - 1, 정상 - 0)',
    rowspan: 2,
    startColIndex: COL_IDX_IS_PATIENT,
    style: COLUMN_STYLES[COL_TYPE_IS_PATIENT]
  });
  currentCol++;
  
  // '확진자 여부' 열이 있다면, 여기에 그룹 추가
  if (storeBridge.state.isConfirmedCaseColumnVisible) {
    groups.push({
      text: '확진여부 <br />(확진 O - 1, X - 0)',
      rowspan: 2,
      startColIndex: currentCol,
      style: COLUMN_STYLES[COL_TYPE_CONFIRMED_CASE]
    });
    currentCol++;
  }
  
  // 기본정보
  const basicStartCol = currentCol;
  if (basicLength > 0) {
    groups.push({
      text: '기본정보',
      colspan: basicLength,
      startColIndex: basicStartCol,
      type: COL_TYPE_BASIC,
      addable: true,
      deletable: true,
      columnCount: basicLength
    });
    currentCol += basicLength;
  } else {
    groups.push({
      text: '기본정보',
      colspan: 1,
      startColIndex: basicStartCol,
      type: COL_TYPE_BASIC,
      addable: true,
      deletable: false,
      columnCount: 0,
      style: { minWidth: '60px' }
    });
    currentCol++;
  }
  
  // 임상증상
  const clinicalStartCol = currentCol;
  if (clinicalLength > 0) {
    groups.push({
      text: '임상증상 (증상 O - 1, 증상 X - 0)',
      colspan: clinicalLength,
      startColIndex: clinicalStartCol,
      type: COL_TYPE_CLINICAL,
      addable: true,
      deletable: true,
      columnCount: clinicalLength
    });
    currentCol += clinicalLength;
  } else {
    groups.push({
      text: '임상증상 (증상 O - 1, 증상 X - 0)',
      colspan: 1,
      startColIndex: clinicalStartCol,
      type: COL_TYPE_CLINICAL,
      addable: true,
      deletable: false,
      columnCount: 0,
      style: { minWidth: '60px' }
    });
    currentCol++;
  }
  
  // '개별 노출시간' 열이 있다면, 여기에 그룹 추가
  if (storeBridge.state.isIndividualExposureColumnVisible) {
    const exposureStartCol = currentCol;
    groups.push({
      text: '의심원 노출시간',
      rowspan: 2,
      startColIndex: exposureStartCol,
      style: COLUMN_STYLES[COL_TYPE_ONSET]
    });
    currentCol++;
  }
  
  // 증상발현시간
  const onsetStartCol = currentCol;
  groups.push({
    text: '증상발현시간',
    rowspan: 2,
    startColIndex: onsetStartCol,
    style: COLUMN_STYLES[COL_TYPE_ONSET]
  });
  currentCol++;
  
  // 식단
  const dietStartCol = currentCol;
  if (dietLength > 0) {
    groups.push({
      text: '식단 (섭취 O - 1, 섭취 X - 0)',
      colspan: dietLength,
      startColIndex: dietStartCol,
      type: COL_TYPE_DIET,
      addable: true,
      deletable: true,
      columnCount: dietLength
    });
  } else {
    groups.push({
      text: '식단 (섭취 O - 1, 섭취 X - 0)',
      colspan: 1,
      startColIndex: dietStartCol,
      type: COL_TYPE_DIET,
      addable: true,
      deletable: false,
      columnCount: 0,
      style: { minWidth: '60px' }
    });
  }
  
  return groups;
});

const tableWidth = computed(() => {
  return (
    `${allColumnsMeta.value.reduce((total, column) => {
      const widthString = column.style?.width || '80px';
      return total + parseInt(widthString, 10);
    }, 0)}px`
  );
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
const filteredRows = computed(() => {
  // filterState ref와 storeBridge.filterState 모두 감시
  const currentFilterState = filterState.value;
  const bridgeFilterState = storeBridge.filterState;
  
  // 필터 상태 동기화는 watch 함수에서 처리하므로 computed에서는 제거
  // side effect 방지를 위해 computed는 순수하게 계산만 수행
  // currentFilterState를 참조하여 filterState.value 변경에 대한 반응성 유지
  const activeFiltersSize = bridgeFilterState.activeFilters?.size || 0;
  
  // 개발 모드에서 두 상태의 동기화 여부 확인 (currentFilterState 사용)
  if (import.meta.env?.MODE === 'development') {
    const isStateSynced = JSON.stringify(currentFilterState) === JSON.stringify(bridgeFilterState);
    logger.debug('filteredRows computed 실행:', {
      isFiltered: bridgeFilterState.isFiltered,
      activeFiltersSize,
      totalRowsLength: rows.value.length,
      isStateSynced
    });
  }
  
  // 실제 필터링은 bridgeFilterState 기준으로 수행
  if (!bridgeFilterState.isFiltered || activeFiltersSize === 0) {
    return rows.value;
  }
  
  // 직접 필터링 로직 사용 - 원본 인덱스 정보 포함
  const filteredWithOriginalIndex = [];
  rows.value.forEach((row, originalIndex) => {
    // activeFilters를 배열로 변환하여 반응성 보장
    const activeFiltersArray = Array.from(bridgeFilterState.activeFilters || []);
    
    let shouldInclude = true;
    for (const [colIndex, filterConfig] of activeFiltersArray) {
      // StoreBridge의 public 메서드 사용
      if (!storeBridge.matchesFilter(row, colIndex, filterConfig)) {
        shouldInclude = false;
        break;
      }
    }
    
    if (shouldInclude) {
      // 원본 인덱스 정보를 포함하여 반환
      filteredWithOriginalIndex.push({
        ...row,
        _originalIndex: originalIndex, // 원본 인덱스 저장
        _filteredOriginalIndex: originalIndex // 필터링된 상태에서의 원본 인덱스
      });
    }
  });
  
  // Debug log removed for performance
  
  return filteredWithOriginalIndex;
});

// --- 가상 스크롤 시스템 ---
const {
  visibleRows,
  totalHeight,
  paddingTop,
  onScroll
} = useVirtualScroll(filteredRows, {
  rowHeight: 35, // 기존 행 높이
  bufferSize: 1,
  viewportHeight
});

// --- Context Menu System ---
const { contextMenuState, showContextMenu, hideContextMenu } = useContextMenu();

// --- Excel Upload/Export ---
const isUploadingExcel = ref(false);
const excelUploadProgress = ref(0);
const { downloadXLSXSmart, downloadTemplate } = useDataExport();

// --- Drag & Drop ---
const { isDragOver, setupDragDropListeners } = useDragDrop();
let cleanupDragDrop = null;

// === 새로운 필터 유효성 검사 통합 시스템 ===
import { FilterRowValidationManager } from './utils/FilterRowValidationManager.js';

// 필터 + 행 변경 통합 매니저 인스턴스
const filterRowValidationManager = new FilterRowValidationManager();

// === Validation Errors Computed ===
const validationErrors = computed(() => {
  const errors = store.state.validationState?.errors;
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

async function onExcelFileSelected(file) {
  if (isUploadingExcel.value) return;
  isUploadingExcel.value = true;
  excelUploadProgress.value = 0;
  try {
    // 기존 유효성 검사 오류 초기화
    validationManager.clearAllErrors();
    
    // 필터 초기화 (새로운 데이터 가져오기 시 필터 상태 리셋)
    logger.debug('필터 초기화 시작');
    const wasFiltered = storeBridge.filterState.isFiltered;
    const oldFilterState = wasFiltered ? { ...storeBridge.filterState } : null;
    
    storeBridge.clearAllFilters();
    
    // 필터가 활성화되어 있었다면 사용자에게 알림 및 스냅샷 캡처
    if (wasFiltered && oldFilterState) {
      showToast('새로운 데이터 가져오기로 필터가 초기화되었습니다.', 'info');
      captureSnapshotWithFilter('excel_import_filter_reset', {
        action: 'excel_import_filter_reset',
        oldFilterState,
        newFilterState: { ...storeBridge.filterState }
      });
    }
    
    // 1단계: 엑셀 파일 파싱 (0% ~ 60%)
    const parsed = await processExcelFile(file, (p) => {
      excelUploadProgress.value = Math.round(p * 0.6); // 파싱은 전체의 60%
    });
    
    // 빈 열 감지 시 toast 메시지 표시
    if (parsed.emptyColumnCount > 0) {
      showToast(
        `빈 열 ${parsed.emptyColumnCount}개가 감지되어 자동으로 제거되었습니다.`, 
        'info'
      );
    }
    
    // 2단계: 데이터 저장 및 설정 (60% ~ 70%)
    excelUploadProgress.value = 60;
    
    // 데이트피커가 열려있으면 닫기
    if (dateTimePickerState.visible) {
      logger.debug('Excel 업로드로 데이트피커 닫기');
      closeDateTimePicker();
    }
    
    // 데이트피커 모드에서는 편집 모드가 활성화되지 않았으므로 cellInputState 정리 불필요
    // cellInputState.confirmEditing();
    // selectionSystem.stopEditing(true);
    
    // 데이터 변경 전 스냅샷 캡처
    captureSnapshotWithFilter('excel_import', {
      action: 'excel_import',
      fileName: file.name,
      hasIndividualExposureTime: parsed.hasIndividualExposureTime,
      hasConfirmedCase: parsed.hasConfirmedCase,
      rowCount: parsed.rows.length,
      columnCount: Object.keys(parsed.headers).reduce((sum, key) => sum + (parsed.headers[key]?.length || 0), 0)
    });
    
    storeBridge.dispatch('updateHeadersFromExcel', parsed.headers);
    storeBridge.dispatch('addRowsFromExcel', parsed.rows);
    
    // '의심원 노출시간' 열 가시성 토글
    if (parsed.hasIndividualExposureTime) {
      if (!storeBridge.state.isIndividualExposureColumnVisible) {
        storeBridge.dispatch('setIndividualExposureColumnVisibility', true);
      }
    } else {
      if (storeBridge.state.isIndividualExposureColumnVisible) {
        storeBridge.dispatch('setIndividualExposureColumnVisibility', false);
      }
    }
    
    // '확진자 여부' 열 가시성 토글
    if (parsed.hasConfirmedCase) {
      if (!storeBridge.state.isConfirmedCaseColumnVisible) {
        storeBridge.dispatch('setConfirmedCaseColumnVisibility', true);
      }
    } else {
      if (storeBridge.state.isConfirmedCaseColumnVisible) {
        storeBridge.dispatch('setConfirmedCaseColumnVisibility', false);
      }
    }
    
    // 3단계: 데이터 검증 (70% ~ 100%)
    excelUploadProgress.value = 70;
    await nextTick();
    const columnMetas = storeBridge.bridge.getColumnMetas();
    
    // 검증 진행률을 엑셀 업로드 진행률에 통합
    await validationManager.revalidateAll(storeBridge.state.rows, columnMetas, {
      onProgress: (progress) => {
        // 검증 진행률을 70% ~ 100% 범위로 매핑
        excelUploadProgress.value = 70 + Math.round(progress * 0.3);
      }
    });
    
    // 완료
    excelUploadProgress.value = 100;
    
    // 필터 상태 강제 업데이트 (UI 동기화)
    filterState.value = { ...storeBridge.filterState };
    logger.debug('필터 초기화 완료 및 UI 동기화');
    
    // focus first cell
    selectionSystem.selectCell(0, 1);
    await ensureCellIsVisible(0, 1);
  } catch (e) {
    logger.error('Excel 업로드 실패:', e);
    alert(e.message || '엑셀 처리 실패');
  } finally {
    isUploadingExcel.value = false;
    excelUploadProgress.value = 0;
  }
}

function onDownloadTemplate(type = 'basic') {
  downloadTemplate(type);
}

function onExportData() {
  try {
    // 스마트 내보내기 사용 - 가져오기와 완전 호환
    const hasIndividualExposure = storeBridge.state.isIndividualExposureColumnVisible;
    const hasConfirmedCase = storeBridge.state.isConfirmedCaseColumnVisible;
    
    downloadXLSXSmart(
      allColumnsMeta.value,
      rows.value,
      getCellValue,
      hasIndividualExposure,
      hasConfirmedCase
    );
    
    // 성공 토스트 메시지
    showToast('데이터가 성공적으로 내보내졌습니다. 파일을 다시 가져오기할 수 있습니다.', 'success');
    
  } catch (error) {
    logger.error('Export failed:', error);
    showToast(`데이터 내보내기 중 오류가 발생했습니다: ${error.message}`, 'error');
  }
}

async function onCopyEntireData() {
  try {
    // Build TSV similar to export but write to clipboard
    const headerRow1 = [];
    const headerRow2 = [];

    allColumnsMeta.value.forEach(col => {
      headerRow1.push(col.headerRow === 1 ? col.headerText.replace(/<br\s*\/?>/g, ' ') : '');
      headerRow2.push(col.headerRow === 2 ? col.headerText : '');
    });

    const dataRows = rows.value.map((row, rIdx) => {
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

function onDeleteEmptyCols() {
  const beforeColCount = allColumnsMeta.value.length;
  const beforeColumnsMeta = [...allColumnsMeta.value]; // 삭제 전 열 메타 정보 백업
  
  // 삭제 전 스냅샷 캡처
  captureSnapshotWithFilter('delete_empty_columns', {
    action: 'delete_empty_columns',
    beforeColumnCount: beforeColCount,
    beforeColumnsMeta
  });
  
  storeBridge.dispatch('deleteEmptyColumns');
  
  // 삭제된 열 개수 계산 (nextTick 후에 계산)
  nextTick(() => {
    const afterColCount = allColumnsMeta.value.length;
    const deletedCount = beforeColCount - afterColCount;
    
    if (deletedCount > 0) {
      // 삭제된 열들의 인덱스 찾기
      const deletedColumnIndices = [];
      const afterColumnsMeta = allColumnsMeta.value;
      
      // 삭제된 열들의 인덱스를 찾기 위해 beforeColumnsMeta와 afterColumnsMeta 비교
      for (let i = 0; i < beforeColumnsMeta.length; i++) {
        const beforeCol = beforeColumnsMeta[i];
        const afterCol = afterColumnsMeta.find(c => 
          c.dataKey === beforeCol.dataKey && 
          c.cellIndex === beforeCol.cellIndex &&
          c.type === beforeCol.type
        );
        
        if (!afterCol) {
          // 이 열이 삭제됨
          deletedColumnIndices.push(beforeCol.colIndex);
        }
      }
      
      // 유효성 검사 오류 인덱스 재조정
      if (deletedColumnIndices.length > 0) {
        validationManager.handleColumnDeletion(deletedColumnIndices);
      }
      
      showToast(`빈 열 ${deletedCount}개가 삭제되었습니다.`, 'success');
    } else {
      showToast('삭제할 빈 열이 없습니다.', 'info');
    }
    
    // 메타 / 선택 영역 리프레시
    selectionSystem.clearSelection();
    focusGrid();
  });
}

async function onResetSheet() {
  showConfirmToast(
    '모든 데이터를 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.',
    async () => {
      try {
        // 유효성 검사 오류 초기화
        validationManager.clearAllErrors();
        
        // 필터 초기화
        const wasFiltered = storeBridge.filterState.isFiltered;
        const oldFilterState = wasFiltered ? { ...storeBridge.filterState } : null;
        
        storeBridge.clearAllFilters();
        
        // 필터가 활성화되어 있었다면 사용자에게 알림
        if (wasFiltered) {
          showToast('시트 초기화로 필터가 해제되었습니다.', 'info');
        }
        
        // 데이터 리셋 전 스냅샷 캡처
        captureSnapshotWithFilter('sheet_reset', {
          action: 'sheet_reset',
          oldFilterState,
          newFilterState: { ...storeBridge.filterState }
        });
        
        storeBridge.dispatch('resetSheet');
        // selection / scroll reset
        selectionSystem.clearSelection();
        await nextTick();
        // headers / rows updated; select first editable cell if exists
        if (rows.value.length > 0) {
          selectionSystem.selectCell(0, 1);
          ensureCellIsVisible(0, 1);
        }
        showToast('데이터가 초기화되었습니다.', 'success');
      } catch (err) {
        logger.error('reset sheet failed', err);
        showToast('시트 초기화 중 오류가 발생했습니다.', 'error');
      }
    }
  );
}

function onToggleExposureColumn() {
  const current = storeBridge.state.isIndividualExposureColumnVisible;
  const isAdding = !current; // 열을 추가하는지 여부
  
  logger.debug('onToggleExposureColumn 호출됨', { current, isAdding });
  
  // === 개별 노출시간 열 삽입 위치 ===
  // "증상발현시간" 열의 현재 위치가 바로 개별-노출시간 열의 삽입 위치가 되므로,
  // 토글 직전에 계산되는 symptomOnsetStartIndex 를 그대로 사용합니다.
  // (isIndividualExposureColumnVisible 가 false 인 상태이므로 정확히 임상증상 끝 다음 인덱스)

  const exposureInsertIndex = storeBridge.symptomOnsetStartIndex;
  
  // 개별 노출시간 열의 정확한 인덱스 찾기
  const individualExposureColumnIndex = allColumnsMeta.value.findIndex(col => 
    col.type === 'individualExposureTime' || 
    (col.dataKey === 'individualExposureTime' && col.cellIndex === 0)
  );
  
  // 비활성화 전에 해당 열의 데이터 백업 (재활성화 시 검증용)
  if (!isAdding && individualExposureColumnIndex >= 0) {
    // 현재 활성화된 데이터에서 개별 노출시간 값 가져오기
    const currentData = rows.value || [];
    individualExposureBackupData.value = currentData.map((row, rowIndex) => {
      // individualExposureTime은 단일 값이므로 배열 접근 제거
      const value = row.individualExposureTime || '';
      return { rowIndex, value };
    }).filter(item => item.value !== '' && item.value !== null && item.value !== undefined);
    
    // 디버깅: 백업된 데이터 확인
    logger.debug('백업된 개별 노출시간 데이터:', individualExposureBackupData.value);
  }
  
  // 변경 전 컬럼 메타 저장
  const oldColumnsMeta = [...allColumnsMeta.value];
  
  // StoreBridge에서 유효성 검사 오류 인덱스 재조정도 함께 처리됨
  storeBridge.setIndividualExposureColumnVisibility(!current);
  
  // 변경 후 컬럼 메타와 비교하여 에러 재매핑
  nextTick(() => {
    const newColumnsMeta = allColumnsMeta.value;
    if (validationManager && oldColumnsMeta.length !== newColumnsMeta.length) {
      logger.debug('컬럼 구조 변경 감지 - 에러 재매핑 시작');
      validationManager.remapValidationErrorsByColumnIdentity(oldColumnsMeta, newColumnsMeta);
    }
  });
  
  // 재활성화 시: 백업된 데이터에 대해서만 유효성검사 수행
  if (isAdding && individualExposureBackupData.value.length > 0) {
    console.log('백업된 데이터가 있음 - 검증 실행');
    console.log('백업된 데이터:', individualExposureBackupData.value);
    
    // 새로 추가된 개별 노출시간 열의 실제 인덱스 찾기
    nextTick(() => {
      const newIndividualExposureColumnIndex = allColumnsMeta.value.findIndex(col => 
        col.type === 'individualExposureTime' || 
        (col.dataKey === 'individualExposureTime' && col.cellIndex === 0)
      );
      
      console.log('찾은 새 열 인덱스:', newIndividualExposureColumnIndex);
      
      if (newIndividualExposureColumnIndex >= 0) {
        // 개별 노출시간 열 전용 검증 메서드 사용
        validationManager.validateIndividualExposureColumn(
          individualExposureBackupData.value, 
          newIndividualExposureColumnIndex,
          (progress) => {
            // 진행률 표시 (대용량 데이터의 경우)
            if (individualExposureBackupData.value.length > 100 && progress === 100) {
              showToast(`개별 노출시간 열 ${individualExposureBackupData.value.length}개 셀의 유효성검사를 완료했습니다.`, 'success');
            }
          }
        );
      } else {
        logger.error('새로운 개별 노출시간 열 인덱스를 찾을 수 없습니다!');
        
        // 대안: exposureInsertIndex 사용
        logger.debug('대안으로 exposureInsertIndex 사용:', exposureInsertIndex);
        validationManager.validateIndividualExposureColumn(
          individualExposureBackupData.value, 
          exposureInsertIndex,
          (progress) => {
            // 진행률 표시 (대용량 데이터의 경우)
            if (individualExposureBackupData.value.length > 100 && progress === 100) {
              showToast(`개별 노출시간 열 ${individualExposureBackupData.value.length}개 셀의 유효성검사를 완료했습니다.`, 'success');
            }
          }
        );
      }
      
      // 검증 완료 후 백업 데이터 초기화
      individualExposureBackupData.value = [];
    });
  }
  
  // selection & meta refresh handled by reactive state; clear selection for safety
  selectionSystem.clearSelection();
  nextTick(() => {
    focusGrid();
  });
}

function onToggleConfirmedCaseColumn() {
  const current = storeBridge.state.isConfirmedCaseColumnVisible;
  const isAdding = !current;
  
  logger.debug(`확진여부 열 토글 시작: 현재 상태 ${current} -> ${!current} (${isAdding ? '추가' : '제거'})`);
  
  // 확진자 여부 열의 정확한 인덱스 찾기
  const confirmedCaseColumnIndex = allColumnsMeta.value.findIndex(col => 
    col.type === 'isConfirmedCase' || 
    (col.dataKey === 'isConfirmedCase' && col.cellIndex === null)
  );
  
  // 비활성화 전에 해당 열의 데이터 백업 (재활성화 시 검증용)
  if (!isAdding && confirmedCaseColumnIndex >= 0) {
    // 현재 활성화된 데이터에서 확진자 여부 값 가져오기
    const currentData = rows.value || [];
    confirmedCaseBackupData.value = currentData.map((row, rowIndex) => {
      const value = row.isConfirmedCase || '';
      return { rowIndex, value };
    }).filter(item => item.value !== '' && item.value !== null && item.value !== undefined);
    
    console.log(`[SpecialColumn] 확진여부 데이터 백업 완료: ${confirmedCaseBackupData.value.length}개 항목`);
  }
  
  // 변경 전 컬럼 메타 저장
  const oldColumnsMeta = [...allColumnsMeta.value];
  
  // StoreBridge에서 유효성 검사 오류 인덱스 재조정도 함께 처리됨
  storeBridge.setConfirmedCaseColumnVisibility(!current);
  
  // 변경 후 컬럼 메타와 비교하여 에러 재매핑
  nextTick(() => {
    try {
      console.log('[ContextMenu] nextTick 콜백 시작');
      
      const newColumnsMeta = allColumnsMeta.value;
      console.log('[ContextMenu] allColumnsMeta.value 가져옴:', newColumnsMeta?.length);
      
      console.log('[ContextMenu] 에러 재매핑 조건 확인:', {
        hasValidationManager: !!validationManager,
        oldColumnsLength: oldColumnsMeta.length,
        newColumnsLength: newColumnsMeta.length,
        lengthChanged: oldColumnsMeta.length !== newColumnsMeta.length
      });
      
      console.log('[ContextMenu] 조건 상세 체크 준비 중...');
      
      console.log('[ContextMenu] 조건 상세 체크:', {
        validationManager,
        validationManagerType: typeof validationManager,
        condition1: !!validationManager,
        condition2: oldColumnsMeta.length !== newColumnsMeta.length,
        bothConditions: validationManager && oldColumnsMeta.length !== newColumnsMeta.length
      });
      
      if (validationManager && oldColumnsMeta.length !== newColumnsMeta.length) {
        console.log(`[ContextMenu] 열 구조 변경 감지: ${oldColumnsMeta.length} -> ${newColumnsMeta.length}, 에러 재매핑 시작`);
        
        try {
          console.log('[ContextMenu] ValidationManager columnMetas 업데이트 시작');
          // ValidationManager의 columnMetas 업데이트
          validationManager.updateColumnMetas(newColumnsMeta);
          console.log('[ContextMenu] ValidationManager columnMetas 업데이트 완료');
          
          console.log('[ContextMenu] 에러 재매핑 함수 호출 시작');
          // 에러 재매핑 수행
          validationManager.remapValidationErrorsByColumnIdentity(oldColumnsMeta, newColumnsMeta);
          console.log('[ContextMenu] 에러 재매핑 함수 호출 완료');
          
          console.log('[ContextMenu] 에러 재매핑 완료');
        } catch (error) {
          console.error('[ContextMenu] 에러 재매핑 중 오류 발생:', error);
        }
      } else {
        console.log('[ContextMenu] 에러 재매핑 건너뜀 - 조건 미충족');
      }
      
      console.log('[ContextMenu] nextTick 콜백 완료');
    } catch (error) {
      console.error('[ContextMenu] nextTick 콜백에서 오류 발생:', error);
      console.error('[ContextMenu] 오류 스택:', error.stack);
    }
  });
  
  // 재활성화 시: 백업된 데이터에 대해서만 유효성검사 수행
  if (isAdding && confirmedCaseBackupData.value.length > 0) {
    console.log(`[SpecialColumn] 백업 데이터 기반 검증 시작: ${confirmedCaseBackupData.value.length}개 셀`);
    
    // 새로 추가된 확진자 여부 열의 실제 인덱스 찾기
    nextTick(() => {
      const newConfirmedCaseColumnIndex = allColumnsMeta.value.findIndex(col => 
        col.type === 'isConfirmedCase' || 
        (col.dataKey === 'isConfirmedCase' && col.cellIndex === null)
      );
      
      console.log(`[SpecialColumn] 새로운 확진여부 열 인덱스: ${newConfirmedCaseColumnIndex}`);
      
      if (newConfirmedCaseColumnIndex >= 0) {
        // 확진자 여부 열 전용 검증 메서드 사용
        validationManager.validateConfirmedCaseColumn(
          confirmedCaseBackupData.value, 
          newConfirmedCaseColumnIndex,
          (progress) => {
            // 진행률 표시 (대용량 데이터의 경우)
            if (confirmedCaseBackupData.value.length > 100 && progress === 100) {
              showToast(`확진자 여부 열 ${confirmedCaseBackupData.value.length}개 셀의 유효성검사를 완료했습니다.`, 'success');
            }
          }
        );
        
        console.log('[SpecialColumn] 확진여부 열 검증 완료');
      } else {
        logger.error('새로운 확진자 여부 열 인덱스를 찾을 수 없습니다!');
      }
      
      // 검증 완료 후 백업 데이터 초기화
      confirmedCaseBackupData.value = [];
    });
  }
  
  // selection & meta refresh handled by reactive state; clear selection for safety
  selectionSystem.clearSelection();
  nextTick(() => {
    focusGrid();
  });
}

// 스크롤바 너비 계산 함수 추가
function calculateScrollbarWidth() {
  const bodyElement = gridBodyRef.value?.bodyContainer;
  if (!bodyElement) return 0;
  
  // 스크롤바가 있는지 확인
  const hasVerticalScrollbar = bodyElement.scrollHeight > bodyElement.clientHeight;
  
  if (hasVerticalScrollbar) {
    // 스크롤바 너비 계산 (컨테이너 너비 - 실제 콘텐츠 너비)
    return bodyElement.offsetWidth - bodyElement.clientWidth;
  }
  
  return 0;
}

// 스크롤바 너비 감지 및 헤더 패딩 업데이트
function updateHeaderPadding() {
  const newScrollbarWidth = calculateScrollbarWidth();
  
  if (newScrollbarWidth !== scrollbarWidth.value) {
    scrollbarWidth.value = newScrollbarWidth;
    console.log(`[Scrollbar] Width updated: ${scrollbarWidth.value}px`);
    
    // 헤더 컨테이너에 패딩 적용
    nextTick(() => {
      const headerContainer = gridHeaderRef.value?.headerContainer;
      if (headerContainer) {
        headerContainer.style.paddingRight = `${scrollbarWidth.value}px`;
      }
    });
  }
}

// handleGridScroll 함수 수정
function handleGridScroll(event) {
  const { scrollLeft } = event.target;
  
  // 수평 스크롤 동기화 (기존 로직)
  if (scrollLeft !== lastScrollLeft.value) {
    lastScrollLeft.value = scrollLeft;
    const headerContainer = gridHeaderRef.value?.headerContainer;
    if (headerContainer) {
      headerContainer.scrollLeft = scrollLeft;
    }
  }
  
  // 스크롤바 너비 업데이트
  updateHeaderPadding();
  
  // 기존 가상 스크롤 로직 (scrollTop은 onScroll 내부에서 처리됨)
  onScroll(event);
}

// --- 핸들러 래퍼 및 컨텍스트 ---

function onContextMenu(event, virtualRowIndex, colIndex) {
  console.log('[DataInputVirtual] 컨텍스트 메뉴 이벤트:', {
    virtualRowIndex,
    colIndex,
    clientX: event.clientX,
    clientY: event.clientY
  });
  
  const context = createHandlerContext();
  handleContextMenu(event, virtualRowIndex, colIndex, context);
}

function onContextMenuSelect(action) {
  const { target } = contextMenuState; // `target` holds { rowIndex, colIndex }
  const { selectedRange, selectedRowsIndividual, selectedCellsIndividual } = selectionSystem.state;
  
  console.log('[DataInputVirtual] 컨텍스트 메뉴 선택:', {
    action,
    target,
    selectedRange,
    selectedRowsIndividual: Array.from(selectedRowsIndividual),
    selectedCellsIndividual: Array.from(selectedCellsIndividual)
  });
  
  hideContextMenu();

  // 개별 선택이 있는 경우 우선 처리, 없으면 범위 선택 처리
  const getEffectiveRowSelection = () => {
    if (selectedRowsIndividual.size > 0) {
      const rows = Array.from(selectedRowsIndividual).sort((a, b) => a - b);
      
      // 빈 배열 체크
      if (rows.length === 0) {
        return { type: 'none', startRow: target.rowIndex, endRow: target.rowIndex, count: 0 };
      }
      
      return { 
        type: 'individual', 
        rows, 
        startRow: Math.min(...rows), 
        endRow: Math.max(...rows),
        count: rows.length 
      };
    } else if (selectedRange.start.rowIndex !== null) {
      return { 
        type: 'range', 
        startRow: selectedRange.start.rowIndex, 
        endRow: selectedRange.end.rowIndex,
        count: selectedRange.end.rowIndex - selectedRange.start.rowIndex + 1
      };
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
      
      // 빈 배열 체크
      if (colArray.length === 0) {
        return { type: 'none', startCol: target.colIndex, endCol: target.colIndex, count: 0 };
      }
      
      return { 
        type: 'individual', 
        columns: colArray,
        startCol: Math.min(...colArray), 
        endCol: Math.max(...colArray),
        count: colArray.length 
      };
    } else if (selectedRange.start.colIndex !== null) {
      return { 
        type: 'range', 
        startCol: selectedRange.start.colIndex, 
        endCol: selectedRange.end.colIndex,
        count: selectedRange.end.colIndex - selectedRange.start.colIndex + 1
      };
    }
    return { type: 'none', startCol: target.colIndex, endCol: target.colIndex, count: 1 };
  };

  switch (action) {
  case 'clear-cell-data': {
    // 개별 셀 선택이 있는 경우 선택된 모든 셀의 데이터 삭제
    if (selectedCellsIndividual.size > 0) {
      selectedCellsIndividual.forEach(cellKey => {
        const [rowStr, colStr] = cellKey.split('_');
        const rowIndex = parseInt(rowStr, 10);
        const colIndex = parseInt(colStr, 10);
        const columnMeta = allColumnsMeta.value.find(c => c.colIndex === colIndex);
        
        if (columnMeta) {
          storeBridge.dispatch('clearCellData', {
            rowIndex,
            colIndex,
            type: columnMeta.type
          });
        }
      });
    } else {
      // 개별 선택이 없는 경우 우클릭한 셀의 데이터만 삭제
      const columnMeta = allColumnsMeta.value.find(c => c.colIndex === target.colIndex);
      if (columnMeta) {
        storeBridge.dispatch('clearCellData', {
          rowIndex: target.rowIndex,
          colIndex: target.colIndex,
          type: columnMeta.type
        });
      }
    }
    break;
  }
  case 'add-row-above': {
    const rowSelection = getEffectiveRowSelection();
    storeBridge.dispatch('insertRowAt', {
      index: rowSelection.startRow,
      count: rowSelection.count
    });
    break;
  }
  case 'add-row-below': {
    const rowSelection = getEffectiveRowSelection();
    storeBridge.dispatch('insertRowAt', {
      index: rowSelection.endRow + 1,
      count: rowSelection.count
    });
    break;
  }
  case 'delete-rows': {
    const rowSelection = getEffectiveRowSelection();
    if (rowSelection.type === 'individual') {
      // 개별 선택된 행들을 역순으로 삭제 (인덱스 변화 방지)
      const sortedRows = rowSelection.rows.sort((a, b) => b - a);
      for (const rowIndex of sortedRows) {
        storeBridge.dispatch('deleteMultipleRows', {
          startRow: rowIndex,
          endRow: rowIndex
        });
      }
    } else {
      storeBridge.dispatch('deleteMultipleRows', {
        startRow: rowSelection.startRow,
        endRow: rowSelection.endRow
      });
    }
    break;
  }
  case 'add-col-left':
  case 'add-col-right': {
    // 변경 전 상태 저장
    const oldColumnsMeta = [...allColumnsMeta.value];
    const colSelection = getEffectiveColumnSelection();
    const targetColumn = allColumnsMeta.value.find(c => c.colIndex === target.colIndex);
    
    if (!targetColumn || !targetColumn.type || ![COL_TYPE_BASIC, 'clinicalSymptoms', 'dietInfo'].includes(targetColumn.type)) break;

    let insertAtIndex;
    if (action === 'add-col-right') {
      const rightmostColumn = allColumnsMeta.value.find(c => c.colIndex === colSelection.endCol);
      insertAtIndex = rightmostColumn ? rightmostColumn.cellIndex + 1 : 0;
    } else {
      const leftmostColumn = allColumnsMeta.value.find(c => c.colIndex === colSelection.startCol);
      insertAtIndex = leftmostColumn ? leftmostColumn.cellIndex : 0;
    }

    console.log(`[ContextMenu] 열 추가 시작: ${action}, 타입: ${targetColumn.type}, 개수: ${colSelection.count}, 위치: ${insertAtIndex}`);
    
    // 데이터 변경 수행
    storeBridge.dispatch('insertMultipleColumnsAt', {
      type: targetColumn.type,
      count: colSelection.count,
      index: insertAtIndex
    });
    
    // 변경 후 검증 오류 재매핑
    nextTick(() => {
      const newColumnsMeta = allColumnsMeta.value;
      
      console.log('[ContextMenu] 에러 재매핑 조건 확인:', {
        hasValidationManager: !!validationManager,
        oldColumnsLength: oldColumnsMeta.length,
        newColumnsLength: newColumnsMeta.length,
        lengthChanged: oldColumnsMeta.length !== newColumnsMeta.length
      });
      
      if (validationManager && oldColumnsMeta.length !== newColumnsMeta.length) {
        console.log(`[ContextMenu] 열 구조 변경 감지: ${oldColumnsMeta.length} -> ${newColumnsMeta.length}, 에러 재매핑 시작`);
        
        // ValidationManager의 columnMetas 업데이트
        validationManager.updateColumnMetas(newColumnsMeta);
        
        // 에러 재매핑 수행
        validationManager.remapValidationErrorsByColumnIdentity(oldColumnsMeta, newColumnsMeta);
        
        console.log('[ContextMenu] 에러 재매핑 완료');

        // 추가: dietInfo / clinicalSymptoms 등 배열 기반 열은 cellIndex 이동 시
        // 일부 오류가 누락될 수 있으므로 전체 타입 열을 다시 검증한다.
        if (validationManager) {
          const affectedType = targetColumn.type;
          if (['clinicalSymptoms', 'dietInfo'].includes(affectedType)) {
            const colIndices = newColumnsMeta
              .filter(meta => meta.type === affectedType)
              .map(meta => meta.colIndex);
            const rowsData = storeBridge.state.rows;
            validationManager.revalidateColumns(colIndices, rowsData, newColumnsMeta);
            console.log(`[ContextMenu] ${affectedType} 열 재검증 완료`);
          }
        }
      } else {
        console.log('[ContextMenu] 에러 재매핑 건너뜀 - 조건 미충족');
      }
    });
    break;
  }
  case 'delete-cols': {
    const colSelection = getEffectiveColumnSelection();
    // 변경 전 상태 저장 (사용하지 않으므로 제거)
    // const oldColumnsMeta = [...allColumnsMeta.value];
      
    // 1. 각 그룹별 전체 열의 개수를 계산합니다.
    const totalCounts = allColumnsMeta.value.reduce((acc, col) => {
      if ([COL_TYPE_BASIC, 'clinicalSymptoms', 'dietInfo'].includes(col.type)) {
        if (!acc[col.type]) acc[col.type] = 0;
        acc[col.type]++;
      }
      return acc;
    }, {});

    // 2. 선택된 열들의 개수를 그룹별로 계산합니다.
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

    // 3. "최소 1개 열 남기기" 규칙을 위반하지 않는 열만 필터링합니다.
    const columnsToDelete = [];
    for (const colIndex of columnsToCheck) {
      const meta = allColumnsMeta.value.find(c => c.colIndex === colIndex);
      if (meta && [COL_TYPE_BASIC, 'clinicalSymptoms', 'dietInfo'].includes(meta.type)) {
        // 해당 그룹의 전체 열 개수에서 선택된 열 개수를 뺐을 때 1개 이상 남는 경우에만 삭제 목록에 추가합니다.
        if (totalCounts[meta.type] - selectedCounts[meta.type] >= 1) {
          columnsToDelete.push({ type: meta.type, index: meta.cellIndex });
        }
      }
    }

    if (columnsToDelete.length > 0) {
      console.log(`[ContextMenu] 열 삭제 시작: ${columnsToDelete.length}개 열 삭제`);
      console.log('[ContextMenu] 삭제할 열들:', columnsToDelete.map(c => `${c.type}[${c.index}]`).join(', '));
      
      // 데이터 변경 수행
      storeBridge.dispatch('deleteMultipleColumnsByIndex', { columns: columnsToDelete });
      
      // StoreBridge에서 이미 에러 재매핑을 처리하므로 여기서는 건너뜀
      console.log('[ContextMenu] 열 삭제 완료 - StoreBridge에서 에러 재매핑 처리됨');
    } else {
      console.log('[ContextMenu] 삭제할 수 있는 열이 없음 (최소 1개 열 유지 규칙)');
    }
    break;
  }
  case 'delete-empty-rows':
    storeBridge.dispatch('deleteEmptyRows');
    break;
  case 'clear-rows-data': {
    const rowSelection = getEffectiveRowSelection();
    if (rowSelection.type === 'individual') {
      // 개별 선택된 행들의 데이터 삭제
      for (const rowIndex of rowSelection.rows) {
        storeBridge.dispatch('clearMultipleRowsData', {
          startRow: rowIndex,
          endRow: rowIndex
        });
      }
    } else {
      storeBridge.dispatch('clearMultipleRowsData', {
        startRow: rowSelection.startRow,
        endRow: rowSelection.endRow
      });
    }
    break;
  }
  case 'clear-cols-data': {
    const colSelection = getEffectiveColumnSelection();
    const columnsToCheck = colSelection.type === 'individual' ? colSelection.columns : 
      Array.from({length: colSelection.endCol - colSelection.startCol + 1}, (_, i) => colSelection.startCol + i);
      
    const columnsToClear = [];
    for (const colIndex of columnsToCheck) {
      const meta = allColumnsMeta.value.find(c => c.colIndex === colIndex);
      if(meta) columnsToClear.push(meta);
    }
      
    const fixedColumnTypes = [COL_TYPE_IS_PATIENT, COL_TYPE_CONFIRMED_CASE, COL_TYPE_ONSET, COL_TYPE_INDIVIDUAL_EXPOSURE];

    columnsToClear.forEach(col => {
      if (fixedColumnTypes.includes(col.type)) {
        storeBridge.dispatch('clearFixedColumnData', { type: col.type });
      } else if (col.type && col.cellIndex !== null && col.cellIndex !== undefined) {
        // 올바른 파라미터로 clearColumnData 호출
        storeBridge.dispatch('clearColumnData', {
          type: col.type,
          index: col.cellIndex
        });
      }
    });
    break;
  }
  case 'filter-patient-1':
  case 'filter-patient-0':
  case 'filter-patient-empty': {
    let value;
    if (action === 'filter-patient-1') value = '1';
    else if (action === 'filter-patient-0') value = '0';
    else value = 'empty';
    
    console.log('[Filter] 필터 토글 전 상태:', {
      action,
      value,
      currentFilterState: storeBridge.filterState,
      activeFilters: Array.from(storeBridge.filterState.activeFilters.entries())
    });
    
    // 필터 변경 전 상태 백업
    const oldFilterState = JSON.stringify(storeBridge.filterState);
    
    storeBridge.togglePatientFilter(value);
    
    // 필터 상태가 실제로 변경된 경우에만 스냅샷 캡처
    if (oldFilterState !== JSON.stringify(storeBridge.filterState)) {
      captureSnapshotWithFilter('filter_change', {
        action,
        filterType: 'patient',
        value,
        oldFilterState: JSON.parse(oldFilterState),
        newFilterState: { ...storeBridge.filterState }
      });
    }
    
    console.log('[Filter] 필터 토글 후 상태:', {
      action,
      value,
      currentFilterState: storeBridge.filterState,
      activeFilters: Array.from(storeBridge.filterState.activeFilters.entries())
    });
    
    // 강제로 filterState 업데이트하여 filteredRows computed가 재실행되도록 함
    filterState.value = { ...storeBridge.filterState };
    
    console.log('[Filter] filterState.value 강제 업데이트 완료');
    console.log(`[Filter] 환자여부 필터 토글: ${value}`);
    break;
  }
  case 'filter-confirmed-1':
  case 'filter-confirmed-0':
  case 'filter-confirmed-empty': {
    let value;
    if (action === 'filter-confirmed-1') value = '1';
    else if (action === 'filter-confirmed-0') value = '0';
    else value = 'empty';
    
    console.log('[Filter] 확진여부 필터 토글 전 상태:', {
      action,
      value,
      colIndex: target.colIndex,
      currentFilterState: storeBridge.filterState
    });
    
    // 필터 변경 전 상태 백업
    const oldFilterState = JSON.stringify(storeBridge.filterState);
    
    storeBridge.toggleConfirmedFilter(target.colIndex, value);
    
    // 필터 상태가 실제로 변경된 경우에만 스냅샷 캡처
    if (oldFilterState !== JSON.stringify(storeBridge.filterState)) {
      captureSnapshotWithFilter('filter_change', {
        action,
        filterType: 'confirmed',
        colIndex: target.colIndex,
        value,
        oldFilterState: JSON.parse(oldFilterState),
        newFilterState: { ...storeBridge.filterState }
      });
    }
    
    console.log('[Filter] 확진여부 필터 토글 후 상태:', {
      action,
      value,
      colIndex: target.colIndex,
      currentFilterState: storeBridge.filterState
    });
    
    // 강제로 filterState 업데이트하여 filteredRows computed가 재실행되도록 함
    filterState.value = { ...storeBridge.filterState };
    
    console.log('[Filter] filterState.value 강제 업데이트 완료');
    console.log(`[Filter] 확진여부 필터 토글: ${value}`);
    break;
  }
  case 'filter-clinical-1':
  case 'filter-clinical-0':
  case 'filter-clinical-empty': {
    let value;
    if (action === 'filter-clinical-1') value = '1';
    else if (action === 'filter-clinical-0') value = '0';
    else value = 'empty';
    
    console.log('[Filter] 임상증상 필터 토글 전 상태:', {
      action,
      value,
      colIndex: target.colIndex,
      currentFilterState: storeBridge.filterState
    });
    
    // 필터 변경 전 상태 백업
    const oldFilterState = JSON.stringify(storeBridge.filterState);
    
    storeBridge.toggleClinicalFilter(target.colIndex, value);
    
    // 필터 상태가 실제로 변경된 경우에만 스냅샷 캡처
    if (oldFilterState !== JSON.stringify(storeBridge.filterState)) {
      captureSnapshotWithFilter('filter_change', {
        action,
        filterType: 'clinical',
        colIndex: target.colIndex,
        value,
        oldFilterState: JSON.parse(oldFilterState),
        newFilterState: { ...storeBridge.filterState }
      });
    }
    
    console.log('[Filter] 임상증상 필터 토글 후 상태:', {
      action,
      value,
      colIndex: target.colIndex,
      currentFilterState: storeBridge.filterState
    });
    
    // 강제로 filterState 업데이트하여 filteredRows computed가 재실행되도록 함
    filterState.value = { ...storeBridge.filterState };
    
    console.log('[Filter] filterState.value 강제 업데이트 완료');
    console.log(`[Filter] 임상증상 필터 토글: ${value}`);
    break;
  }
  case 'filter-diet-1':
  case 'filter-diet-0':
  case 'filter-diet-empty': {
    let value;
    if (action === 'filter-diet-1') value = '1';
    else if (action === 'filter-diet-0') value = '0';
    else value = 'empty';
    
    console.log('[Filter] 식단 필터 토글 전 상태:', {
      action,
      value,
      colIndex: target.colIndex,
      currentFilterState: storeBridge.filterState
    });
    
    // 필터 변경 전 상태 백업
    const oldFilterState = JSON.stringify(storeBridge.filterState);
    
    storeBridge.toggleDietFilter(target.colIndex, value);
    
    // 필터 상태가 실제로 변경된 경우에만 스냅샷 캡처
    if (oldFilterState !== JSON.stringify(storeBridge.filterState)) {
      captureSnapshotWithFilter('filter_change', {
        action,
        filterType: 'diet',
        colIndex: target.colIndex,
        value,
        oldFilterState: JSON.parse(oldFilterState),
        newFilterState: { ...storeBridge.filterState }
      });
    }
    
    console.log('[Filter] 식단 필터 토글 후 상태:', {
      action,
      value,
      colIndex: target.colIndex,
      currentFilterState: storeBridge.filterState
    });
    
    // 강제로 filterState 업데이트하여 filteredRows computed가 재실행되도록 함
    filterState.value = { ...storeBridge.filterState };
    
    console.log('[Filter] filterState.value 강제 업데이트 완료');
    console.log(`[Filter] 식단 필터 토글: ${value}`);
    break;
  }
  case 'filter-basic-empty': {
    console.log('[Filter] 기본정보 빈 셀 필터:', {
      action,
      colIndex: target.colIndex,
      currentFilterState: storeBridge.filterState
    });
    
    // 필터 변경 전 상태 백업
    const oldFilterState = JSON.stringify(storeBridge.filterState);
    
    storeBridge.toggleBasicFilter(target.colIndex, 'empty');
    
    // 필터 상태가 실제로 변경된 경우에만 스냅샷 캡처
    if (oldFilterState !== JSON.stringify(storeBridge.filterState)) {
      captureSnapshotWithFilter('filter_change', {
        action,
        filterType: 'basic',
        colIndex: target.colIndex,
        value: 'empty',
        oldFilterState: JSON.parse(oldFilterState),
        newFilterState: { ...storeBridge.filterState }
      });
    }
    
    // 강제로 filterState 업데이트하여 filteredRows computed가 재실행되도록 함
    filterState.value = { ...storeBridge.filterState };
    
    console.log('[Filter] 기본정보 빈 셀 필터 적용');
    break;
  }
  default: {
    // 기본정보 값 필터 (동적 액션 처리)
    if (action.startsWith('filter-basic-')) {
      const value = action.replace('filter-basic-', '');
      console.log('[Filter] 기본정보 값 필터:', {
        action,
        value,
        colIndex: target.colIndex,
        currentFilterState: storeBridge.filterState
      });
      
      // 필터 변경 전 상태 백업
      const oldFilterState = JSON.stringify(storeBridge.filterState);
      
      storeBridge.toggleBasicFilter(target.colIndex, value);
      
      // 필터 상태가 실제로 변경된 경우에만 스냅샷 캡처
      if (oldFilterState !== JSON.stringify(storeBridge.filterState)) {
        captureSnapshotWithFilter('filter_change', {
          action,
          filterType: 'basic',
          colIndex: target.colIndex,
          value,
          oldFilterState: JSON.parse(oldFilterState),
          newFilterState: { ...storeBridge.filterState }
        });
      }
      
      // 강제로 filterState 업데이트하여 filteredRows computed가 재실행되도록 함
      filterState.value = { ...storeBridge.filterState };
      
      console.log('[Filter] 기본정보 값 필터 적용:', value);
    }
    // 날짜/시간 필터 (동적 액션 처리)
    else if (action.startsWith('filter-datetime-')) {
      const dateValue = action.replace('filter-datetime-', '');
      console.log('[Filter] 날짜/시간 필터:', {
        action,
        dateValue,
        colIndex: target.colIndex,
        currentFilterState: storeBridge.filterState
      });
      
      // 필터 변경 전 상태 백업
      const oldFilterState = JSON.stringify(storeBridge.filterState);
      
      storeBridge.toggleDateTimeFilter(target.colIndex, dateValue);
      
      // 필터 상태가 실제로 변경된 경우에만 스냅샷 캡처
      if (oldFilterState !== JSON.stringify(storeBridge.filterState)) {
        captureSnapshotWithFilter('filter_change', {
          action,
          filterType: 'datetime',
          colIndex: target.colIndex,
          value: dateValue,
          oldFilterState: JSON.parse(oldFilterState),
          newFilterState: { ...storeBridge.filterState }
        });
      }
      
      // 강제로 filterState 업데이트하여 filteredRows computed가 재실행되도록 함
      filterState.value = { ...storeBridge.filterState };
      
      console.log('[Filter] 날짜/시간 필터 적용:', dateValue);
    }
    break;
  }
  case 'clear-all-filters': {
    // 필터 변경 전 상태 백업
    const oldFilterState = JSON.stringify(storeBridge.filterState);
    
    storeBridge.clearAllFilters();
    
    // 필터 상태가 실제로 변경된 경우에만 스냅샷 캡처
    if (oldFilterState !== JSON.stringify(storeBridge.filterState)) {
      captureSnapshotWithFilter('filter_clear_all', {
        action: 'clear-all-filters',
        oldFilterState: JSON.parse(oldFilterState),
        newFilterState: { ...storeBridge.filterState }
      });
    }
    
    // 강제로 filterState 업데이트하여 filteredRows computed가 재실행되도록 함
    filterState.value = { ...storeBridge.filterState };
    
    console.log('[Filter] 모든 필터 해제됨');
    break;
  }
  }
  
  // 작업 완료 후 개별 선택 상태 초기화
  selectionSystem.clearIndividualSelections();
}

async function ensureCellIsVisible(rowIndex, colIndex) {
  if (!gridBodyRef.value?.bodyContainer) return;
  const container = gridBodyRef.value.bodyContainer;
  let hasScrolled = false;

  // --- Vertical Scroll ---
  if (rowIndex >= 0) {
    const rowHeight = 35;
    const SCROLL_DOWN_BUFFER = 40; // 하단 UI에 가려지지 않도록 추가 여백
    const { scrollTop, clientHeight } = container;
    const rowTop = rowIndex * rowHeight;
    const rowBottom = rowTop + rowHeight;
    let newScrollTop = scrollTop;

    if (rowTop < scrollTop) {
      newScrollTop = rowTop;
    } else if (rowBottom > scrollTop + clientHeight) {
      newScrollTop = rowBottom - clientHeight + SCROLL_DOWN_BUFFER;
    }

    if (newScrollTop !== scrollTop) {
      // 최대 스크롤 높이를 초과하지 않도록 보정
      const maxScrollTop = totalHeight.value - clientHeight;
      container.scrollTop = Math.min(newScrollTop, maxScrollTop);
      hasScrolled = true;
    }
  }

  // --- Horizontal Scroll ---
  if (colIndex >= 0) {
    const column = allColumnsMeta.value.find(c => c.colIndex === colIndex);
    if (!column) return;

    const { scrollLeft, clientWidth } = container;
    const colLeft = column.offsetLeft;
    const colWidth = parseInt(column.style.width, 10);
    const colRight = colLeft + colWidth;
    let newScrollLeft = scrollLeft;

    if (colLeft < scrollLeft) {
      // 만약 두 번째 열(index: 1)로 이동하는 경우라면, 첫 번째 열도 보이도록 스크롤을 맨 왼쪽으로 보냅니다.
      if (colIndex === 1) {
        newScrollLeft = 0;
      } else {
        newScrollLeft = colLeft;
      }
    } else if (colRight > scrollLeft + clientWidth) {
      newScrollLeft = colRight - clientWidth;
    }
    
    if (newScrollLeft !== scrollLeft) {
      container.scrollLeft = newScrollLeft;
      hasScrolled = true;
    }
  }

  if (hasScrolled) {
    await nextTick();
  }
}



function createHandlerContext() {
  return {
    getOriginalIndex: (index) => index, // 이미 원본 인덱스로 전달되므로 그대로 반환
    selectionSystem,
    rows,
    filteredRows, // 필터된 행도 전달
    allColumnsMeta: allColumnsMeta.value,
    gridBodyContainer: gridBodyRef.value?.bodyContainer,
    ensureCellIsVisible,
    getCellValue,
    store: storeBridge, // StoreBridge 사용
    storeBridge, // StoreBridge 직접 접근용
    cellInputState, // 새로운 셀 입력 상태 관리
    validationManager, // ValidationManager 추가
    isEditing: selectionSystem.state.isEditing,
    editingCell: selectionSystem.state.editingCell,
    startEditing: (rowIndex, colIndex, getCellValue, row) => 
      selectionSystem.startEditing(rowIndex, colIndex, getCellValue, row, cellInputState, allColumnsMeta.value),
    stopEditing: (shouldSaveChanges = true) => 
      selectionSystem.stopEditing(shouldSaveChanges, cellInputState),
    originalCellValue: selectionSystem.state.originalCellValue,
    focusGrid,
    // 편집 완료 처리 함수 추가
    onCellEditComplete,
    // 컨텍스트 메뉴 제어 함수 추가
    showContextMenu,
    hideContextMenu,
    // 데이트피커 참조 및 상태 추가
    dateTimePickerRef,
    dateTimePickerState,
    // 필터 상태 포함한 스냅샷 캡처 함수 추가
    captureSnapshotWithFilter
  };
}

function onCellMouseDown(virtualRowIndex, colIndex, event) {
  // virtualRowIndex는 이미 원본 인덱스로 전달됨 (VirtualGridBody에서 변환됨)
  const originalRowIndex = virtualRowIndex;

  // 데이트피커가 열려있고 다른 셀을 클릭한 경우 데이트피커 닫기
  if (dateTimePickerState.visible) {
    const currentEdit = dateTimePickerState.currentEdit;
    if (currentEdit && (currentEdit.rowIndex !== originalRowIndex || currentEdit.colIndex !== colIndex)) {
      console.log('[DataInputVirtual] 다른 셀 클릭으로 데이트피커 닫기');
      closeDateTimePicker();
      // return 제거: 데이트피커를 닫고 계속해서 셀 클릭 동작 수행
    } else if (currentEdit && currentEdit.rowIndex === originalRowIndex && currentEdit.colIndex === colIndex) {
      // 같은 셀을 클릭한 경우 데이트피커는 그대로 유지
      console.log('[DataInputVirtual] 같은 셀 클릭 - 데이트피커 유지');
      return; // 다른 동작 중단
    }
  }

  // 편집 모드에서 같은 셀을 클릭한 경우, 텍스트 커서 이동만 허용하고 다른 동작 차단
  if (
    selectionSystem.state.isEditing &&
    selectionSystem.state.editingCell.rowIndex === originalRowIndex &&
    selectionSystem.state.editingCell.colIndex === colIndex
  ) {
    console.log('[DataInputVirtual] 편집 모드에서 같은 셀 클릭 - 텍스트 커서 이동만 허용');
    return; // 아무것도 하지 않고 함수 종료
  }

  // BUG FIX: 편집 중일 때 다른 셀 클릭하면 편집 완료 (더블클릭 제외)
  if (
    selectionSystem.state.isEditing &&
    (selectionSystem.state.editingCell.rowIndex !== originalRowIndex ||
      selectionSystem.state.editingCell.colIndex !== colIndex) &&
    event.detail !== 2 // 더블클릭이 아닌 경우에만
  ) {
    // 기존 편집 중인 셀의 데이터를 저장
    const { rowIndex: editRow, colIndex: editCol } = selectionSystem.state.editingCell;
    const tempValue = cellInputState.getTempValue(editRow, editCol);
    const columnMeta = allColumnsMeta.value.find(c => c.colIndex === editCol);
    
    if (tempValue !== null && columnMeta) {
      storeBridge.saveCellValue(editRow, editCol, tempValue, columnMeta);
      console.log(`[DataInputVirtual] 다른 셀 클릭으로 편집 완료: ${editRow}, ${editCol} = ${tempValue}`);
      // 검증 호출
      validationManager.validateCell(editRow, editCol, tempValue, columnMeta.type);
    }
    
    // cellInputState 상태 정리
    cellInputState.confirmEditing();
    selectionSystem.stopEditing(true);
  }

  focusGrid();

  const context = createHandlerContext();
  handleVirtualCellMouseDown(virtualRowIndex, colIndex, event, context);

  // 전역 마우스 이벤트 리스너 설정
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
  // 마우스 이동 리스너 정리
  if (onDocumentMouseMoveBound.value) {
    document.removeEventListener('mousemove', onDocumentMouseMoveBound.value);
    onDocumentMouseMoveBound.value = null;
  }

  const context = createHandlerContext();
  handleVirtualDocumentMouseUp(event, context);
}

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
      // 데이트피커 내부에서 Enter 키 처리는 DateTimePicker 컴포넌트에서 담당
      // 하지만 입력 포커스가 그리드(혹은 외부)일 때도 Enter 누르면 완료되도록 처리
      event.preventDefault();
      event.stopPropagation();
      if (dateTimePickerRef.value?.confirm) {
        dateTimePickerRef.value.confirm();
      }
      return;

    case 'Tab':
      // Tab 키 입력 시에도 날짜 선택을 확정하고 데이트피커를 닫음
      // (DateTimePicker는 focus 관리 목적으로 Tab 을 기본 동작으로 두었으나
      //  그리드 편집 UX에서는 Tab = 완료 & 다음 셀 이동이 자연스러움)
      event.preventDefault();
      event.stopPropagation();
      if (dateTimePickerRef.value?.confirm) {
        dateTimePickerRef.value.confirm();
      }
      return;

    default:
      // 다른 키는 데이트피커 컴포넌트가 처리하도록 전파 허용
      return;
    }
  }

  // 데이트피커가 열려 있지 않을 때는 기존 로직 수행
  const context = createHandlerContext();
  handleVirtualKeyDown(event, context);
}

async function onCellDoubleClick(virtualRowIndex, colIndex, event) {
  // virtualRowIndex는 이미 원본 인덱스로 전달됨 (VirtualGridBody에서 변환됨)
  const context = createHandlerContext();
  await handleVirtualCellDoubleClick(virtualRowIndex, colIndex, event, context);
}

function onCellInput(event, rowIndex, colIndex) {
  if (!selectionSystem.state.isEditing) return;

  const columnMeta = allColumnsMeta.value.find(c => c.colIndex === colIndex);
  if (!columnMeta || !columnMeta.isEditable) return;

  const newValue = event.target.textContent;

  // rowIndex는 이미 원본 인덱스로 전달됨 (VirtualGridBody에서 변환됨)
  console.log(`[CellInput] 셀 입력: 원본 행 ${rowIndex}, 열 ${colIndex}, 값 "${newValue}"`);
  console.log('[CellInput] 필터 상태:', {
    isFiltered: storeBridge.filterState.isFiltered,
    filteredRowsCount: filteredRows.value.length,
    originalRowsCount: rows.value.length
  });

  // 헤더 셀과 바디 셀 모두 동일한 방식으로 처리
  // 새로운 시스템: 임시 값 업데이트 (즉시 저장하지 않음)
  cellInputState.updateTempValue(rowIndex, colIndex, newValue, columnMeta);
}

// 편집 완료 시 저장 처리
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
      console.log(`[DataInputVirtual] Validation 호출: row=${rowIndex}, col=${colIndex}, value="${tempValue}", type="${columnMeta.type}"`);
      console.log('[DataInputVirtual] validationManager:', validationManager);
      console.log('[DataInputVirtual] validationManager.validateCell:', validationManager.validateCell);
      validationManager.validateCell(rowIndex, colIndex, tempValue, columnMeta.type);
    }
  }
}

function onUpdateCellValueFromBar(newValue) {
  const { rowIndex, colIndex } = selectionSystem.state.selectedCell;
  if (rowIndex === null || colIndex === null) return;
  
  const columnMeta = allColumnsMeta.value.find(c => c.colIndex === colIndex);
  if (!columnMeta || !columnMeta.isEditable) return;

  // 헤더 셀과 바디 셀 모두 동일한 방식으로 처리
  // 새로운 시스템: 임시 값 업데이트 (즉시 저장하지 않음)
  cellInputState.updateTempValue(rowIndex, colIndex, newValue, columnMeta);
}

function onEnterPressedFromBar() {
  const { rowIndex, colIndex } = selectionSystem.state.selectedCell;
  if (rowIndex === null || colIndex === null) return;

  // UX Improvement: Move to next cell down and focus grid
  let nextRow = rowIndex;
  if (rowIndex < 0) {
    nextRow = 0; // From header to first row
  } else if (rowIndex < rows.value.length - 1) {
    nextRow = rowIndex + 1; // From body to next body row
  }
  
  selectionSystem.selectCell(nextRow, colIndex);
  ensureCellIsVisible(nextRow, colIndex);
  focusGrid();
}

// --- 헬퍼 함수 ---
function getCellValue(row, columnMeta, rowIndex = null) {
  if (!columnMeta) return '';
  
  if (rowIndex < 0) { // Header cell
    // HTML 태그 제거하여 순수 텍스트만 반환
    const headerText = columnMeta.headerText || '';
    return headerText.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]*>/g, '').trim();
  }
  
  if (columnMeta.type === COL_TYPE_SERIAL) {
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

// --- 라이프사이클 훅 ---
onMounted(() => {
  // storeBridge를 전역으로 설정하여 유효성 검사 오류 자동 저장
  window.storeBridge = storeBridge;
  
  // 필터 상태 초기화 (임시)
  console.log('[Filter] 컴포넌트 마운트 시 필터 초기화');
  storeBridge.clearAllFilters();
  
  if (gridContainerRef.value) {
    // We only need the body's height for viewport calculation.
    const bodyElement = gridContainerRef.value.querySelector('.grid-body-virtual');
    if(bodyElement) {
      const ADD_ROWS_CONTROLS_HEIGHT = 5; // reduced offset height
      viewportHeight.value = bodyElement.clientHeight - ADD_ROWS_CONTROLS_HEIGHT;
    }
  }
  setColumnsMeta(allColumnsMeta.value);
  // 외부 클릭 시 컨텍스트 메뉴 닫기
  document.addEventListener('click', hideContextMenu);
  // 외부 클릭 시 데이트피커 닫기
  document.addEventListener('click', handleGlobalClick);

  cleanupDragDrop = setupDragDropListeners(onFileDropped);
  
  // 초기 스크롤바 너비 계산
  nextTick(() => {
    updateHeaderPadding();
  });
  
  // 윈도우 리사이즈 리스너 추가
  window.addEventListener('resize', handleWindowResize);
});

// keep-alive로 인해 컴포넌트가 다시 활성화될 때
// onActivated는 keep-alive와 함께 사용되지만, 현재 구조에서는 불필요하므로 제거

onBeforeUnmount(() => {
  // 전역 리스너 정리
  document.removeEventListener('click', hideContextMenu);
  document.removeEventListener('click', handleGlobalClick);
  window.removeEventListener('resize', handleWindowResize);
  if (onDocumentMouseMoveBound.value) {
    document.removeEventListener('mousemove', onDocumentMouseMoveBound.value);
  }
  if (onDocumentMouseUpBound.value) {
    document.removeEventListener('mouseup', onDocumentMouseUpBound.value);
  }
  if (cleanupDragDrop) cleanupDragDrop();

  // ValidationManager 타이머만 정리 (유효성 검사 오류는 유지)
  if (validationManager && typeof validationManager.clearTimers === 'function') {
    try {
      validationManager.clearTimers();
    } catch (error) {
      // 정리 중 오류가 발생해도 무시
    }
  }
});

watch(allColumnsMeta, (newMeta) => {
  setColumnsMeta(newMeta);
  // 스크롤바 너비 재계산
  nextTick(() => {
    updateHeaderPadding();
  });
}, { immediate: true });

function onFileDropped(file) {
  onExcelFileSelected(file);
}

// --- Column Add/Delete Handlers from Group Header ---
function mapGroupTypeToMetaType(groupType) {
  if (groupType === COL_TYPE_CLINICAL) return 'clinicalSymptoms';
  if (groupType === COL_TYPE_DIET) return 'dietInfo';
  return groupType; // default mapping for 'basic', etc.
}

function onAddColumn(groupType) {
  // 데이트피커가 열려있으면 닫기
  if (dateTimePickerState.visible) {
    console.log('[DataInputVirtual] 열 추가로 데이트피커 닫기');
    closeDateTimePicker();
  }

  // 변경 전 컬럼 메타 저장
  const oldColumnsMeta = [...allColumnsMeta.value];
  const arr = getHeaderArrayByType(groupType);
  const insertIndex = arr.length; // append to end
  const metaType = mapGroupTypeToMetaType(groupType);
  
  console.log(`[HeaderButton] 열 추가 시작: 그룹타입 ${groupType}, 메타타입 ${metaType}, 위치 ${insertIndex}`);
  
  // 데이터 변경 수행
  storeBridge.dispatch('insertMultipleColumnsAt', {
    type: metaType,
    count: 1,
    index: insertIndex
  });

  // 변경 후 컬럼 메타와 비교하여 에러 재매핑
  nextTick(() => {
    const newColumnsMeta = allColumnsMeta.value;
    
    if (validationManager && oldColumnsMeta.length !== newColumnsMeta.length) {
      console.log(`[HeaderButton] 열 구조 변경 감지: ${oldColumnsMeta.length} -> ${newColumnsMeta.length}, 에러 재매핑 시작`);
      
      // ValidationManager의 columnMetas 업데이트
      validationManager.updateColumnMetas(newColumnsMeta);
      
      // 에러 재매핑 수행
      validationManager.remapValidationErrorsByColumnIdentity(oldColumnsMeta, newColumnsMeta);
      
      console.log('[HeaderButton] 에러 재매핑 완료');
    } else {
      console.log('[HeaderButton] 열 구조 변경 없음 또는 ValidationManager 없음');
    }
  });

  // 선택 영역 초기화 및 포커스 유지
  selectionSystem.clearSelection();
  nextTick(() => {
    focusGrid();
  });
}

function onDeleteColumn(groupType) {
  // 데이트피커가 열려있으면 닫기
  if (dateTimePickerState.visible) {
    console.log('[DataInputVirtual] 열 삭제로 데이트피커 닫기');
    closeDateTimePicker();
  }

  // 변경 전 컬럼 메타 저장 (사용하지 않으므로 제거)
  // const oldColumnsMeta = [...allColumnsMeta.value];
  const arr = getHeaderArrayByType(groupType);
  
  if (arr.length <= 1) {
    console.log(`[HeaderButton] 열 삭제 불가: 최소 1개 열 유지 규칙 (현재 ${arr.length}개)`);
    return;
  }
  
  const deleteIndex = arr.length - 1; // last column
  const metaType = mapGroupTypeToMetaType(groupType);
  
  console.log(`[HeaderButton] 열 삭제 시작: 그룹타입 ${groupType}, 메타타입 ${metaType}, 위치 ${deleteIndex}`);
  
  // 데이터 변경 수행
  storeBridge.dispatch('deleteMultipleColumnsByIndex', {
    columns: [{ type: metaType, index: deleteIndex }]
  });

  // StoreBridge에서 이미 에러 재매핑을 처리하므로 여기서는 건너뜀
  console.log('[HeaderButton] 열 삭제 완료 - StoreBridge에서 에러 재매핑 처리됨');

  selectionSystem.clearSelection();
  nextTick(() => focusGrid());
}

// Helper to map group type to header array
function getHeaderArrayByType(type) {
  switch (type) {
  case COL_TYPE_BASIC:
    return headers.value.basic || [];
  case COL_TYPE_CLINICAL:
    return headers.value.clinical || [];
  case COL_TYPE_DIET:
    return headers.value.diet || [];
  default:
    return [];
  }
}

function onDeleteEmptyRows() {
  // 데이트피커가 열려있으면 닫기
  if (dateTimePickerState.visible) {
    console.log('[DataInputVirtual] 빈 행 삭제로 데이트피커 닫기');
    closeDateTimePicker();
  }

  storeBridge.dispatch('deleteEmptyRows');
  selectionSystem.clearSelection();
  showToast('빈 행이 삭제되었습니다.', 'success');
}

function onAddRows(count) {
  // 데이트피커가 열려있으면 닫기
  if (dateTimePickerState.visible) {
    console.log('[DataInputVirtual] 행 추가로 데이트피커 닫기');
    closeDateTimePicker();
  }

  const insertIndex = rows.value.length;
  storeBridge.dispatch('insertRowAt', { index: insertIndex, count });
  nextTick(() => {
    selectionSystem.clearSelection();
    showToast(`${count}개 행이 추가되었습니다.`, 'success');
  });
}

function onClearSelection() {
  // 데이트피커가 열려있으면 닫기
  if (dateTimePickerState.visible) {
    console.log('[DataInputVirtual] 선택 영역 초기화로 데이트피커 닫기');
    closeDateTimePicker();
  }

  selectionSystem.clearSelection();
}

// --- Undo/Redo 핸들러 ---
function onUndo() {
  // 데이트피커가 열려있으면 닫기
  if (dateTimePickerState.visible) {
    closeDateTimePicker();
  }

  const success = storeBridge.undo();
  
  if (success) {
    
    // ValidationManager 타이머만 정리 (오류는 StoreBridge에서 복원됨)
    if (validationManager && typeof validationManager.onDataReset === 'function') {
      validationManager.onDataReset();
    }
    
    // 필터 상태 동기화
    syncFilterStateAfterHistoryChange();
    
    // 추가적인 필터 상태 확인 및 강제 동기화
    nextTick(() => {
      // 필터 상태가 여전히 불일치하면 강제 동기화
      if (JSON.stringify(filterState.value) !== JSON.stringify(storeBridge.filterState)) {
        filterState.value = { ...storeBridge.filterState };
        
        // 한번 더 UI 업데이트
        setTimeout(() => {
          const gridBody = gridBodyRef.value;
          const gridHeader = gridHeaderRef.value;
          if (gridBody) gridBody.$forceUpdate();
          if (gridHeader) gridHeader.$forceUpdate();
        }, 50);
      }
    });
    
    // 사용자에게 알림 (필터가 적용된 경우)
    if (storeBridge.filterState.isFiltered) {
      showToast('데이터와 필터 상태가 복원되었습니다.', 'info');
    } else {
      showToast('필터가 해제되었습니다.', 'info');
    }
  }
}

function onRedo() {
  console.log('[Redo] ===== Redo 시작 =====');
  console.log('[Redo] 현재 필터 상태:', filterState.value);
  console.log('[Redo] StoreBridge 필터 상태:', storeBridge.filterState);
  
  // 데이트피커가 열려있으면 닫기
  if (dateTimePickerState.visible) {
    console.log('[Redo] 데이트피커 닫기');
    closeDateTimePicker();
  }

  const success = storeBridge.redo();
  console.log('[Redo] StoreBridge.redo() 결과:', success);
  
  if (success) {
    console.log('[Redo] Redo 성공 - 후처리 시작');
    console.log('[Redo] Redo 후 StoreBridge 필터 상태:', storeBridge.filterState);
    
    // ValidationManager 타이머만 정리 (오류는 StoreBridge에서 복원됨)
    if (validationManager && typeof validationManager.onDataReset === 'function') {
      validationManager.onDataReset();
    }
    
    // 필터 상태 동기화
    syncFilterStateAfterHistoryChange();
    
    // 추가적인 필터 상태 확인 및 강제 동기화
    nextTick(() => {
      console.log('[Redo] 최종 필터 상태 확인:', {
        filterStateValue: filterState.value,
        storeBridgeFilterState: storeBridge.filterState,
        isFiltered: storeBridge.filterState.isFiltered,
        activeFiltersSize: storeBridge.filterState.activeFilters?.size || 0
      });
      
      // 필터 상태가 여전히 불일치하면 강제 동기화
      if (JSON.stringify(filterState.value) !== JSON.stringify(storeBridge.filterState)) {
        console.warn('[Redo] 필터 상태 불일치 감지 - 강제 동기화 실행');
        filterState.value = { ...storeBridge.filterState };
        
        // 한번 더 UI 업데이트
        setTimeout(() => {
          const gridBody = gridBodyRef.value;
          const gridHeader = gridHeaderRef.value;
          if (gridBody) gridBody.$forceUpdate();
          if (gridHeader) gridHeader.$forceUpdate();
        }, 50);
      }
    });
    
    // 사용자에게 알림 (필터가 적용된 경우)
    if (storeBridge.filterState.isFiltered) {
      showToast('데이터와 필터 상태가 복원되었습니다.', 'info');
    } else {
      showToast('필터가 해제되었습니다.', 'info');
    }
  } else {
    console.log('[Redo] Redo 실패 또는 불가능');
  }
  
  console.log('[Redo] ===== Redo 완료 =====');
}

function onClearAllFilters() {
  // 필터 변경 전 상태 백업
  const oldFilterState = JSON.stringify(storeBridge.filterState);
  
  storeBridge.clearAllFilters();
  
  // 필터 상태가 실제로 변경된 경우에만 스냅샷 캡처
  if (oldFilterState !== JSON.stringify(storeBridge.filterState)) {
    captureSnapshotWithFilter('filter_clear_all', {
      action: 'clear-all-filters',
      oldFilterState: JSON.parse(oldFilterState),
      newFilterState: { ...storeBridge.filterState }
    });
  }
  
  // 강제로 filterState 업데이트하여 filteredRows computed가 재실행되도록 함
  filterState.value = { ...storeBridge.filterState };
  
  console.log('[Filter] 모든 필터 해제됨');
}

function onUpdateActiveFilters(activeFilters) {
  // 개별 필터 제거 처리
  console.log('[Filter] 개별 필터 제거:', activeFilters);
  
  // StoreBridge의 필터 상태와 동기화
  storeBridge.filterState.activeFilters = new Map(activeFilters);
  
  // watch가 자동으로 감지하여 업데이트하므로 별도 호출 불필요
}

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
    console.warn('[FocusFirstError] Column meta not found for unique key:', uniqueKey);
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
  
  console.log('[FocusFirstError] Focusing error cell:', {
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

// --- DateTimePicker 이벤트 핸들러 ---
async function onDateTimeConfirm(dateTimeObject) {
  console.log('[DateTimePicker] Date confirmed:', dateTimeObject);
  
  // 현재 편집 중인 셀 정보 가져오기
  const editInfo = dateTimePickerState.currentEdit;
  if (!editInfo) {
    console.warn('[DateTimePicker] No edit info found');
    dateTimePickerState.visible = false;
    return;
  }
  
  const { rowIndex, colIndex, columnMeta } = editInfo;
  
  try {
    // 날짜/시간 포맷팅
    const { formatDateTime } = await import('./utils/dateTimeUtils.js');
    const formattedValue = formatDateTime(dateTimeObject);
    console.log(`[DateTimePicker] Formatted value: ${formattedValue} for cell: ${rowIndex}, ${colIndex}`);
    
    // 값 저장
    storeBridge.saveCellValue(rowIndex, colIndex, formattedValue, columnMeta);
    
    // 데이트피커 모드에서는 편집 모드가 활성화되지 않았으므로 cellInputState 정리 불필요
    // cellInputState.confirmEditing();
    // selectionSystem.stopEditing(true);
    
    // 유효성 검사 실행
    validationManager.validateCell(rowIndex, colIndex, formattedValue, columnMeta.type);
    
    console.log(`[DateTimePicker] Successfully saved date: ${formattedValue}`);
  } catch (error) {
    console.error('[DateTimePicker] Error saving date:', error);
    // 오류 발생 시 편집 취소
    // cellInputState.cancelEditing();
    // selectionSystem.stopEditing(false);
  }
  
  // 데이트피커 숨김 및 상태 정리
  dateTimePickerState.visible = false;
  dateTimePickerState.currentEdit = null;
  
  // 포커스 복원
  nextTick(() => {
    focusGrid();
  });
}

// 데이트피커를 닫는 공통 함수
function closeDateTimePicker() {
  console.log('[DateTimePicker] Closing date picker');
  
  // 데이트피커 모드에서는 편집 모드가 활성화되지 않았으므로 정리 불필요
  // if (dateTimePickerState.currentEdit) {
  //   cellInputState.cancelEditing();
  //   selectionSystem.stopEditing(false);
  // }
  
  // 데이트피커 숨김 및 상태 정리
  dateTimePickerState.visible = false;
  dateTimePickerState.currentEdit = null;
  
  // 포커스 복원
  nextTick(() => {
    focusGrid();
  });
}

function onDateTimeCancel() {
  console.log('[DateTimePicker] Date selection cancelled');
  closeDateTimePicker();
}

// 전역 클릭 핸들러 - 데이트피커 외부 클릭 시 닫기
function handleGlobalClick(event) {
  if (dateTimePickerState.visible) {
    // 데이트피커 요소인지 확인 (더 정확한 체크)
    const dateTimePickerElement = dateTimePickerRef.value?.$el;
    if (dateTimePickerElement) {
      // 클릭된 요소가 데이트피커 내부인지 확인
      let isInsidePicker = false;
      let currentElement = event.target;
      
      // DOM 트리를 올라가면서 데이트피커 요소를 찾음
      while (currentElement && currentElement !== document.body) {
        if (currentElement === dateTimePickerElement) {
          isInsidePicker = true;
          break;
        }
        currentElement = currentElement.parentElement;
      }
      
      if (!isInsidePicker) {
        console.log('[DataInputVirtual] 외부 클릭으로 데이트피커 닫기');
        closeDateTimePicker();
      }
    }
  }
}

// 윈도우 리사이즈 핸들러 - 스크롤바 너비 재계산
function handleWindowResize() {
  nextTick(() => {
    updateHeaderPadding();
  });
}

// --- 상태 변수들 ---
const isValidationProgressVisible = ref(false);
const validationProgress = ref(0);
const validationProcessed = ref(0);
const validationTotal = ref(0);
const validationErrorCount = ref(0);

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