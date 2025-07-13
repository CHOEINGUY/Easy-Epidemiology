<template>
  <div 
    class="grid-body-virtual" 
    :class="{ 'filtered': isFiltered }"
    ref="bodyContainer" 
    @scroll.passive="handleScroll"
  >
          <div :style="{ height: containerHeight + 'px', position: 'relative', width: tableWidth }">
        <table 
          class="data-table" 
          :style="{ 
            transform: `translateY(${paddingTop}px)`,
            width: tableWidth
          }"
        >
        <colgroup>
          <col 
            v-for="column in allColumnsMeta" 
            :key="column.colIndex" 
            :style="column.style"
          >
        </colgroup>
        <tbody>
          <tr 
            v-for="(item, index) in visibleRows" 
            :key="item.originalIndex"
            :data-row="item.originalIndex"
          >
            <td 
              v-for="column in allColumnsMeta" 
              :key="column.colIndex"
              :data-row="item.originalIndex"
              :data-col="column.colIndex"
              :class="getCellClasses(item.originalIndex, column.colIndex)"
              :data-validation-message="getValidationMessage(item.originalIndex, column.colIndex)"
              :contenteditable="isCellEditing(item.originalIndex, column.colIndex)"
              @input="handleCellInput($event, item, column.colIndex)"
              @dblclick="handleCellDoubleClick(index, column.colIndex, $event)"
              @mousedown="handleCellMouseDown(index, column.colIndex, $event)"
              @mousemove="handleCellMouseMove(index, column.colIndex, $event)"
              @contextmenu.prevent="handleCellContextMenu($event, index, column.colIndex)"
              @mouseenter="handleCellMouseEnter($event, item.originalIndex, column.colIndex)"
              @mouseleave="handleCellMouseLeave"
            >
              {{ getCellValue(item, column, item.originalIndex) }}
            </td>
          </tr>
        </tbody>
        <!-- AddRowsControls removed from table footer to avoid flicker; now handled externally -->
      </table>
      <!-- AddRowsControls positioned just below last data row -->
      <div 
        class="add-rows-wrapper" 
        :style="{ position: 'absolute', top: addRowsTop + 'px', left: 0, width: '100%' }"
      >
        <AddRowsControls 
          @add-rows="$emit('add-rows', $event)" 
          @delete-empty-rows="$emit('delete-empty-rows')" 
          @clear-selection="$emit('clear-selection')" 
        />
      </div>
    </div>
    
    <!-- Validation Tooltip -->
    <div 
      v-if="tooltipVisible" 
      class="validation-tooltip"
      :style="tooltipStyle"
    >
      {{ tooltipMessage }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed, defineProps, defineEmits, defineExpose } from 'vue';
import AddRowsControls from '../parts/AddRowsControls.vue';
import { hasValidationError } from '../utils/validationUtils.js';
import { FilterRowValidationManager } from '../utils/FilterRowValidationManager.js';

const props = defineProps({
  visibleRows: { type: Array, required: true },
  allColumnsMeta: { type: Array, required: true },
  tableWidth: { type: String, required: true },
  totalHeight: { type: Number, required: true },
  paddingTop: { type: Number, required: true },
  getCellValue: { type: Function, required: true },
  selectedCell: { type: Object, default: () => ({ rowIndex: null, colIndex: null }) },
  selectedRange: {
    type: Object,
    default: () => ({
      start: { rowIndex: null, colIndex: null },
      end: { rowIndex: null, colIndex: null }
    })
  },
  isEditing: { type: Boolean, default: false },
  editingCell: { type: Object, default: () => ({ rowIndex: null, colIndex: null }) },
  individualSelectedCells: { type: Object, default: null },
  individualSelectedRows: { type: Object, default: null },
  bufferSize: { type: Number, default: 4 },
  validationErrors: { type: Object, default: null },
  isFiltered: { type: Boolean, default: false }
});

const emit = defineEmits(['scroll', 'cell-mousedown', 'cell-mousemove', 'cell-dblclick', 'cell-input', 'cell-contextmenu', 'add-rows', 'delete-empty-rows', 'clear-selection']);

const bodyContainer = ref(null);

// 필터 + 행 변경 통합 매니저 인스턴스
const filterRowValidationManager = new FilterRowValidationManager();

// AddRowsControls 위치 및 컨테이너 높이 계산
const ADD_ROWS_HEIGHT = 20; // px (controls 자체 높이)
const ROW_HEIGHT = 5;      // Must match useVirtualScroll rowHeight

// 테이블이 렌더링하는 버퍼 행까지 고려하여 AddRowsControls를 충분히 아래로 내려 배치
const addRowsTop = computed(() => props.totalHeight + props.bufferSize * ROW_HEIGHT);

// 스크롤 컨테이너 높이 = 데이터 전체 높이 + 버퍼 영역 + AddRowsControls 높이
const containerHeight = computed(() => props.totalHeight + props.bufferSize * ROW_HEIGHT + ADD_ROWS_HEIGHT);

// Validation Tooltip 상태
const tooltipVisible = ref(false);
const tooltipMessage = ref('');
const tooltipStyle = ref({});

function handleScroll(event) {
  emit('scroll', event);
}

function isCellInRange(rowIndex, colIndex) {
  const { start, end } = props.selectedRange;
  if (start.rowIndex === null || end.rowIndex === null) return false;

  return (
    rowIndex >= start.rowIndex &&
    rowIndex <= end.rowIndex &&
    colIndex >= start.colIndex &&
    colIndex <= end.colIndex
  );
}

function isCellEditing(rowIndex, colIndex) {
  return props.isEditing && props.editingCell.rowIndex === rowIndex && props.editingCell.colIndex === colIndex;
}

function isMultiCellSelection(range) {
  if (!range || range.start.rowIndex === null) return false;
  return range.start.rowIndex !== range.end.rowIndex || range.start.colIndex !== range.end.colIndex;
}

function getCellClasses(rowIndex, colIndex) {
  const classes = [];
  
  if (colIndex === 0) {
    classes.push('serial-cell');
  }

  const lastColIndex = props.allColumnsMeta.length - 1;

  // --- Editing ---
  if (isCellEditing(rowIndex, colIndex)) {
    classes.push('cell-editing');
    return classes;
  }

  // --- Individual row selection (Ctrl+Row) -------------------------
  const isRowIndividuallySelected = props.individualSelectedRows && props.individualSelectedRows.has(rowIndex);
  if (isRowIndividuallySelected) {
    classes.push('row-individual-selected');

    const isFirstSelectedRow = !props.individualSelectedRows.has(rowIndex - 1);
    const isLastSelectedRow = !props.individualSelectedRows.has(rowIndex + 1);

    if (isFirstSelectedRow) classes.push('border-top');
    if (isLastSelectedRow) classes.push('border-bottom');
    if (colIndex === 0) classes.push('border-left');
    if (colIndex === lastColIndex) classes.push('border-right');
  }

  // --- Individual cell selection -----------------------------------
  if (props.individualSelectedCells && props.individualSelectedCells.has(`${rowIndex}_${colIndex}`)) {
    classes.push('cell-multi-selected');
  }

  // --- Range selection ---------------------------------------------
  if (!isRowIndividuallySelected) {
    if (isCellInRange(rowIndex, colIndex)) {
      if (isMultiCellSelection(props.selectedRange)) {
        classes.push('cell-range-selected');
      }
      const { start, end } = props.selectedRange;
      if (rowIndex === start.rowIndex) classes.push('border-top');
      if (rowIndex === end.rowIndex) classes.push('border-bottom');
      if (colIndex === start.colIndex) classes.push('border-left');
      if (colIndex === end.colIndex) classes.push('border-right');
    }
  }

  // --- Active cell highlight ---------------------------------------
  if (
    props.selectedCell &&
    props.selectedCell.rowIndex === rowIndex &&
    props.selectedCell.colIndex === colIndex
  ) {
    classes.push('cell-selected');
  }

  // --- Validation error (통합 시스템 사용) ---
  const columnMeta = props.allColumnsMeta[colIndex];
  
  // 1. 열 변경 시스템: 고유키 기반 에러 확인 (기존 로직)
  const hasColumnError = hasValidationError(rowIndex, colIndex, columnMeta, props.validationErrors);
  
  // 2. 필터 + 행 변경 시스템: 가시성 확인
  filterRowValidationManager.updateFilterState(
    props.isFiltered, 
    props.visibleRows, 
    props.validationErrors
  );
  const isVisible = filterRowValidationManager.isErrorVisible(rowIndex, colIndex);
  
  // 두 시스템 모두 통과해야 에러 표시
  if (hasColumnError && isVisible) {
    classes.push('validation-error');
  }
  
  return classes;
}

function getValidationMessage(rowIndex, colIndex) {
  const columnMeta = props.allColumnsMeta[colIndex];
  
  // 새로운 시스템으로 에러 메시지 조회
  return filterRowValidationManager.getErrorMessage(rowIndex, colIndex, columnMeta);
}

function handleCellMouseEnter(event, rowIndex, colIndex) {
  const message = getValidationMessage(rowIndex, colIndex);
  if (message) {
    const rect = event.target.getBoundingClientRect();
    
    tooltipMessage.value = message;
    tooltipStyle.value = {
      position: 'fixed',
      top: `${rect.top - 40}px`,
      left: `${rect.left + (rect.width / 2)}px`,
      transform: 'translateX(-50%)',
      background: '#333333',
      color: 'white',
      padding: '6px 10px',
      borderRadius: '4px',
      fontSize: '12px',
      whiteSpace: 'nowrap',
      zIndex: '1000',
      pointerEvents: 'none',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
    };
    tooltipVisible.value = true;
  }
}

function handleCellMouseLeave() {
  tooltipVisible.value = false;
}

// 필터된 상태에서 올바른 원본 인덱스를 전달하는 이벤트 핸들러들
function handleCellInput(event, item, colIndex) {
  // 필터된 상태에서는 원본 인덱스를 전달
  let originalRowIndex;
  
  if (props.isFiltered) {
    // 필터된 상태에서는 _originalIndex를 우선 사용
    if (item._originalIndex !== undefined) {
      originalRowIndex = item._originalIndex;
    } else if (item._filteredOriginalIndex !== undefined) {
      originalRowIndex = item._filteredOriginalIndex;
    } else if (item.originalIndex !== undefined) {
      originalRowIndex = item.originalIndex;
    } else {
      // 둘 다 없는 경우 fallback
      originalRowIndex = 0;
    }
  } else {
    // 필터되지 않은 상태에서는 originalIndex 사용
    originalRowIndex = item.originalIndex || 0;
  }
  
  console.log('[VirtualGridBody] handleCellInput:', {
    isFiltered: props.isFiltered,
    item,
    item_originalIndex: item._originalIndex,
    item_filteredOriginalIndex: item._filteredOriginalIndex,
    item_originalIndex_alt: item.originalIndex,
    calculatedOriginalRowIndex: originalRowIndex,
    colIndex
  });
  
  emit('cell-input', event, originalRowIndex, colIndex);
}

function handleCellDoubleClick(index, colIndex, event) {
  // 필터된 상태에서는 원본 인덱스를 전달
  const item = props.visibleRows[index];
  let originalRowIndex;
  
  if (props.isFiltered) {
    if (item._originalIndex !== undefined) {
      originalRowIndex = item._originalIndex;
    } else if (item._filteredOriginalIndex !== undefined) {
      originalRowIndex = item._filteredOriginalIndex;
    } else {
      originalRowIndex = item.originalIndex;
    }
  } else {
    originalRowIndex = item.originalIndex;
  }
  
  emit('cell-dblclick', originalRowIndex, colIndex, event);
}

function handleCellMouseDown(index, colIndex, event) {
  // 필터된 상태에서는 원본 인덱스를 전달
  const item = props.visibleRows[index];
  let originalRowIndex;
  
  if (props.isFiltered) {
    if (item._originalIndex !== undefined) {
      originalRowIndex = item._originalIndex;
    } else if (item._filteredOriginalIndex !== undefined) {
      originalRowIndex = item._filteredOriginalIndex;
    } else {
      originalRowIndex = item.originalIndex;
    }
  } else {
    originalRowIndex = item.originalIndex;
  }
  
  emit('cell-mousedown', originalRowIndex, colIndex, event);
}

function handleCellMouseMove(index, colIndex, event) {
  // 필터된 상태에서는 원본 인덱스를 전달
  const item = props.visibleRows[index];
  let originalRowIndex;
  
  if (props.isFiltered) {
    if (item._originalIndex !== undefined) {
      originalRowIndex = item._originalIndex;
    } else if (item._filteredOriginalIndex !== undefined) {
      originalRowIndex = item._filteredOriginalIndex;
    } else {
      originalRowIndex = item.originalIndex;
    }
  } else {
    originalRowIndex = item.originalIndex;
  }
  
  emit('cell-mousemove', originalRowIndex, colIndex, event);
}

function handleCellContextMenu(event, index, colIndex) {
  // 필터된 상태에서는 원본 인덱스를 전달
  const item = props.visibleRows[index];
  let originalRowIndex;
  
  if (props.isFiltered) {
    if (item._originalIndex !== undefined) {
      originalRowIndex = item._originalIndex;
    } else if (item._filteredOriginalIndex !== undefined) {
      originalRowIndex = item._filteredOriginalIndex;
    } else {
      originalRowIndex = item.originalIndex;
    }
  } else {
    originalRowIndex = item.originalIndex;
  }
  
  emit('cell-contextmenu', event, originalRowIndex, colIndex);
}

defineExpose({ bodyContainer });
</script>

<style scoped>
.grid-body-virtual {
  overflow: auto;
  position: relative;
  height: 100%;
  will-change: scroll-position;
  background-color: #f8f9fa; /* 헤더와 동일한 배경색 */
}

/* 필터가 적용되었을 때는 전체 배경 변경 없음 */
.grid-body-virtual.filtered {
  position: relative;
}

/* 필터된 상태에서 유효성 에러 셀의 배경색 조정 */
.grid-body-virtual.filtered .validation-error {
  background-color: rgba(255, 68, 68, 0.15) !important; /* 필터 상태에서는 더 진한 빨간색 */
}



.data-table {
  border-collapse: collapse;
  table-layout: fixed;
  position: absolute;
  top: 0;
  left: 0;
  z-index: 1;
}

tr {
  height: 35px; /* Must be same as rowHeight in useVirtualScroll */
}

td {
  border: 1px solid #ced4da;
  padding: 8px;
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  box-sizing: border-box;
  background-clip: padding-box;
  text-align: center;
  vertical-align: middle;
  cursor: default;
  background-color: white; /* 명시적으로 흰색 배경 설정 */
}

.cell-selected {
  /* This style is now defined in the parent component with :deep */
}

.serial-cell {
  background-color: #f1f3f4;
}

.cell-range-selected {
  background-color: rgba(26, 115, 232, 0.1) !important;
}

.cell-editing {
  background-color: #fff !important;
  box-shadow: 0 0 0 2px #1a73e8 inset !important;
  z-index: 10;
  outline: none;
  cursor: text;
}

.add-rows-cell {
  text-align: left;
  padding: 6px 10px;
  background-color: transparent;
}

.add-rows-wrapper {
  padding: 6px 0;
  background-color: transparent;
  z-index: 0;
}

.validation-error {
  /* Show clear red border with light red background */
  box-shadow: 0 0 0 2px #ff4444 inset !important;
  background-color: rgba(255, 68, 68, 0.1) !important;
  position: relative;
  z-index: 5; /* 필터 배경보다 위에 표시 */
}

/* When the cell is also in editing state, layer red border inside blue border */
.cell-editing.validation-error {
  box-shadow: 0 0 0 2px #1a73e8 inset, 0 0 0 1px #ff4444 inset !important;
}

/* When the cell is selected or in range selection */
.cell-selected.validation-error,
.cell-range-selected.validation-error,
.cell-multi-selected.validation-error {
  box-shadow: 0 0 0 1.5px #1a73e8 inset, 0 0 0 1px #ff4444 inset !important;
}

/* Validation tooltip - JavaScript 기반으로 변경 */
.validation-tooltip {
  position: fixed;
  background: #333333;
  color: white;
  padding: 6px 10px;
  border-radius: 4px;
  font-size: 12px;
  white-space: nowrap;
  z-index: 1000;
  pointer-events: none;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.validation-tooltip::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-top: 6px solid #333333;
}

.grid-body-virtual.filtered td.serial-cell {
  background-color: rgba(26, 115, 232, 0.2) !important; /* 더 진한 파란색 */
  border-right: 1px solid #ced4da !important; /* 기존 테두리 */
  border-left: 1px solid #ced4da !important;
  color: #185abc;
  font-weight: 600;
  z-index: 2;
}
</style> 