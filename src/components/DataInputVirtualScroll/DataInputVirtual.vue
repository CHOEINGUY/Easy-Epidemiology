<template>
  <div 
    class="data-input-virtual-container"
    tabindex="0"
    @keydown="onKeyDown"
    ref="dataContainerRef"
  >
    <VirtualAppHeader 
      :errorCount="validationErrors.size"
      @focusFirstError="handleFocusFirstError"
    />
    <VirtualFunctionBar 
      :cell-address="selectedCellInfo.address"
      :cell-value="selectedCellInfo.value"
      :is-uploading-excel="isUploadingExcel"
      :upload-progress="excelUploadProgress"
      :can-undo="canUndo"
      :can-redo="canRedo"
      @update-cell-value="onUpdateCellValueFromBar"
      @enter-pressed="onEnterPressedFromBar"
      @excel-file-selected="onExcelFileSelected"
      @download-template="onDownloadTemplate"
      @export-data="onExportData"
      @copy-entire-data="onCopyEntireData"
      @delete-empty-cols="onDeleteEmptyCols"
      @reset-sheet="onResetSheet"
      @toggle-exposure-col="onToggleExposureColumn"
      @undo="onUndo"
      @redo="onRedo"
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
        @cell-mousedown="onCellMouseDown"
        @cell-dblclick="onCellDoubleClick"
        @cell-input="onCellInput"
        @cell-contextmenu="onContextMenu"
        @add-column="onAddColumn"
        @delete-column="onDeleteColumn"
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
        :validation-errors="validationErrors"
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
    <ValidationProgress 
      :is-processing="isValidationProcessing"
      :progress="validationProgress"
    />
    <AddRowsControls 
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
import ValidationProgress from './parts/ValidationProgress.vue';
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

// --- 상수 (기존 컴포넌트에서 가져옴) ---
import {
  COL_IDX_SERIAL,
  COL_IDX_IS_PATIENT,
  COL_TYPE_SERIAL,
  COL_TYPE_IS_PATIENT,
  COL_TYPE_BASIC,
  COL_TYPE_CLINICAL,
  COL_TYPE_ONSET,
  COL_TYPE_DIET,
  COLUMN_STYLES
} from './constants/index.js';

const COL_TYPE_INDIVIDUAL_EXPOSURE = 'individualExposureTime';

// --- 스토어 및 상태 ---
const store = useStore();
const getters = store.getters;

// ValidationManager 인스턴스 (개발 환경에서만 디버그 로그 활성화)
const validationManager = new ValidationManager(store, { 
  useWorker: import.meta.env?.MODE === 'production' || false, // 프로덕션에서만 Worker 사용
  chunkSize: 500,
  debug: import.meta.env?.MODE === 'development' || false, // 개발 환경에서만 디버그 로그
  onProgress: (progress) => {
    isValidationProcessing.value = progress < 100;
    validationProgress.value = progress;
  }
});

// --- 새로운 저장 시스템 ---
const storeBridge = useStoreBridge(store, validationManager, { 
  debug: import.meta.env?.MODE === 'development' || false
});
// 전역 Undo/Redo 키보드 단축키 활성화
useUndoRedo(storeBridge);
const cellInputState = useCellInputState();

// --- Undo/Redo 상태 ---
const canUndo = computed(() => storeBridge.canUndo);
const canRedo = computed(() => storeBridge.canRedo);

// 개별 노출시간 열 토글 시 백업 데이터 저장용
const individualExposureBackupData = ref([]);

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

// --- 가상 스크롤 시스템 ---
const {
  visibleRows,
  totalHeight,
  paddingTop,
  onScroll,
  getOriginalIndex
} = useVirtualScroll(rows, {
  rowHeight: 35, // 기존 행 높이
  bufferSize: 1,
  viewportHeight
});

// --- Context Menu System ---
const { contextMenuState, showContextMenu, hideContextMenu } = useContextMenu();

// --- Excel Upload/Export ---
const isUploadingExcel = ref(false);
const excelUploadProgress = ref(0);
const { downloadXLSX, downloadTemplate } = useDataExport();

// --- Drag & Drop ---
const { isDragOver, setupDragDropListeners } = useDragDrop();
let cleanupDragDrop = null;

// --- Validation Progress ---
const isValidationProcessing = ref(false);
const validationProgress = ref(0);

// === Validation Errors Computed ===
const validationErrors = computed(() => {
  const errors = store.state.validationState?.errors;
  return errors instanceof Map ? errors : new Map();
});

async function onExcelFileSelected(file) {
  if (isUploadingExcel.value) return;
  isUploadingExcel.value = true;
  excelUploadProgress.value = 0;
  try {
    // 기존 유효성 검사 오류 초기화
    validationManager.clearAllErrors();
    
    const parsed = await processExcelFile(file, (p) => {
      excelUploadProgress.value = Math.round(p);
    });
    // update store headers/rows
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
    
    // 데이터 가져온 후 전체 유효성 검사 실행
    await nextTick();
    const columnMetas = storeBridge.bridge.getColumnMetas();
    await validationManager.revalidateAll(storeBridge.state.rows, columnMetas);
    
    // focus first cell
    selectionSystem.selectCell(0, 1);
    await ensureCellIsVisible(0, 1);
  } catch (e) {
    console.error(e);
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
  // build worksheet data (header rows + data rows)
  const headerRow1 = [];
  const headerRow2 = [];
  // Build based on allColumnsMeta
  allColumnsMeta.value.forEach(col => {
    headerRow1.push(col.headerRow === 1 ? col.headerText.replace(/<br\s*\/?>/g, ' ') : '');
    headerRow2.push(col.headerRow === 2 ? col.headerText : '');
  });
  const dataRows = rows.value.map((row, rIdx) => {
    return allColumnsMeta.value.map(col => getCellValue(row, col, rIdx));
  });
  const worksheetData = [headerRow1, headerRow2, ...dataRows];
  downloadXLSX(worksheetData, [], 'exported_data.xlsx');
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
    console.error('copy entire data failed', err);
    showToast('전체 데이터 복사 중 오류가 발생했습니다.', 'error');
  }
}

function onDeleteEmptyCols() {
  const beforeColCount = allColumnsMeta.value.length;
  const beforeColumnsMeta = [...allColumnsMeta.value]; // 삭제 전 열 메타 정보 백업
  
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
        console.error('reset sheet failed', err);
        showToast('시트 초기화 중 오류가 발생했습니다.', 'error');
      }
    }
  );
}

function onToggleExposureColumn() {
  const current = storeBridge.state.isIndividualExposureColumnVisible;
  const isAdding = !current; // 열을 추가하는지 여부
  
  console.log('onToggleExposureColumn 호출됨');
  console.log('현재 상태:', current);
  console.log('isAdding:', isAdding);
  
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
    console.log('백업된 개별 노출시간 데이터:', individualExposureBackupData.value);
  }
  
  // StoreBridge에서 유효성 검사 오류 인덱스 재조정도 함께 처리됨
  storeBridge.setIndividualExposureColumnVisibility(!current);
  
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
        console.error('새로운 개별 노출시간 열 인덱스를 찾을 수 없습니다!');
        
        // 대안: exposureInsertIndex 사용
        console.log('대안으로 exposureInsertIndex 사용:', exposureInsertIndex);
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
  const context = createHandlerContext();
  handleContextMenu(event, virtualRowIndex, colIndex, context);
}

function onContextMenuSelect(action) {
  const { target } = contextMenuState; // `target` holds { rowIndex, colIndex }
  const { selectedRange, selectedRowsIndividual, selectedCellsIndividual } = selectionSystem.state;
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

    storeBridge.dispatch('insertMultipleColumnsAt', {
      type: targetColumn.type,
      count: colSelection.count,
      index: insertAtIndex
    });
    break;
  }
  case 'delete-cols': {
    const colSelection = getEffectiveColumnSelection();
      
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
      storeBridge.dispatch('deleteMultipleColumnsByIndex', { columns: columnsToDelete });
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
      
    const fixedColumnTypes = [COL_TYPE_IS_PATIENT, COL_TYPE_ONSET, COL_TYPE_INDIVIDUAL_EXPOSURE];

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
    getOriginalIndex,
    selectionSystem,
    rows,
    allColumnsMeta: allColumnsMeta.value,
    gridBodyContainer: gridBodyRef.value?.bodyContainer,
    ensureCellIsVisible,
    getCellValue,
    store: storeBridge, // StoreBridge 사용
    storeBridge, // StoreBridge 직접 접근용
    cellInputState, // 새로운 셀 입력 상태 관리
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
    dateTimePickerState
  };
}

function onCellMouseDown(virtualRowIndex, colIndex, event) {
  const originalRowIndex = getOriginalIndex(virtualRowIndex);

  // 데이트피커가 열려있고 다른 셀을 클릭한 경우 데이트피커 닫기
  if (dateTimePickerState.visible) {
    const currentEdit = dateTimePickerState.currentEdit;
    if (currentEdit && (currentEdit.rowIndex !== originalRowIndex || currentEdit.colIndex !== colIndex)) {
      console.log('[DataInputVirtual] 다른 셀 클릭으로 데이트피커 닫기');
      closeDateTimePicker();
      // return 제거: 데이트피커를 닫고 계속해서 셀 클릭 동작 수행
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
  const context = createHandlerContext();
  await handleVirtualCellDoubleClick(virtualRowIndex, colIndex, event, context);
}

function onCellInput(event, rowIndex, colIndex) {
  if (!selectionSystem.state.isEditing) return;

  const columnMeta = allColumnsMeta.value.find(c => c.colIndex === colIndex);
  if (!columnMeta || !columnMeta.isEditable) return;

  const newValue = event.target.textContent;

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

  const arr = getHeaderArrayByType(groupType);
  const insertIndex = arr.length; // append to end
  const metaType = mapGroupTypeToMetaType(groupType);
  storeBridge.dispatch('insertMultipleColumnsAt', {
    type: metaType,
    count: 1,
    index: insertIndex
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

  const arr = getHeaderArrayByType(groupType);
  if (arr.length <= 1) return; // 최소 1개 유지
  const deleteIndex = arr.length - 1; // last column
  const metaType = mapGroupTypeToMetaType(groupType);
  storeBridge.dispatch('deleteMultipleColumnsByIndex', {
    columns: [{ type: metaType, index: deleteIndex }]
  });
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
    console.log('[DataInputVirtual] Undo로 데이트피커 닫기');
    closeDateTimePicker();
  }

  const success = storeBridge.undo();
  if (success) {
    // ValidationManager 타이머만 정리 (오류는 StoreBridge에서 복원됨)
    if (validationManager && typeof validationManager.onDataReset === 'function') {
      validationManager.onDataReset();
    }
  }
}

function onRedo() {
  // 데이트피커가 열려있으면 닫기
  if (dateTimePickerState.visible) {
    console.log('[DataInputVirtual] Redo로 데이트피커 닫기');
    closeDateTimePicker();
  }

  const success = storeBridge.redo();
  if (success) {
    // ValidationManager 타이머만 정리 (오류는 StoreBridge에서 복원됨)
    if (validationManager && typeof validationManager.onDataReset === 'function') {
      validationManager.onDataReset();
    }
  }
}

function handleFocusFirstError() {
  const errors = Array.from(validationErrors.value.entries());
  if (errors.length === 0) return;
  const [key] = errors[0];
  const [rowIndex, colIndex] = key.split('_').map(Number);
  // 가상 스크롤/그리드에 셀 이동 및 포커스
  ensureCellIsVisible(rowIndex, colIndex);
  selectionSystem.selectCell(rowIndex, colIndex);
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
    
    // 편집 완료
    cellInputState.confirmEditing();
    selectionSystem.stopEditing(true);
    
    // 유효성 검사 실행
    validationManager.validateCell(rowIndex, colIndex, formattedValue, columnMeta.type);
    
    console.log(`[DateTimePicker] Successfully saved date: ${formattedValue}`);
  } catch (error) {
    console.error('[DateTimePicker] Error saving date:', error);
    // 오류 발생 시 편집 취소
    cellInputState.cancelEditing();
    selectionSystem.stopEditing(false);
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
  
  // 편집 취소
  if (dateTimePickerState.currentEdit) {
    cellInputState.cancelEditing();
    selectionSystem.stopEditing(false);
  }
  
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
    // 데이트피커 요소인지 확인
    const dateTimePickerElement = dateTimePickerRef.value?.$el;
    if (dateTimePickerElement && !dateTimePickerElement.contains(event.target)) {
      console.log('[DataInputVirtual] 외부 클릭으로 데이트피커 닫기');
      closeDateTimePicker();
    }
  }
}

// 윈도우 리사이즈 핸들러 - 스크롤바 너비 재계산
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