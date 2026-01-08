<template>
  <div 
    class="grid-body-virtual overflow-auto relative h-full bg-slate-50 will-change-scroll" 
    :class="{ 'relative': isFiltered }"
    ref="bodyContainer" 
    @scroll.passive="handleScroll"
  >
          <div :style="{ height: containerHeight + 'px', position: 'relative', width: tableWidth }">
        <table 
          class="border-collapse table-fixed absolute top-0 left-0 z-[1] w-full" 
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
            class="h-[35px] max-h-[35px] min-h-[35px]"
          >
            <td 
              v-for="column in allColumnsMeta" 
              :key="column.colIndex"
              :data-row="item.originalIndex"
              :data-col="column.colIndex"
              :class="[
                'border border-gray-300 px-2 text-sm whitespace-nowrap overflow-hidden text-ellipsis box-border bg-clip-padding text-center align-middle cursor-default h-[35px] !p-0',
                getCellClasses(item.originalIndex, column.colIndex),
                { '!bg-white': !isCellEditing(item.originalIndex, column.colIndex) }
              ]"
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
        class="py-1.5 bg-transparent z-[2]" 
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
      class="fixed bg-[#333] text-white px-2.5 py-1.5 rounded text-xs whitespace-nowrap z-[1000] pointer-events-none shadow-lg after:content-[''] after:absolute after:top-full after:left-1/2 after:-translate-x-1/2 after:border-[6px] after:border-t-[#333] after:border-transparent"
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

const ADD_ROWS_HEIGHT = 40;  
const CONTROL_SPACING = 6;   // 마지막 행에서 6px 띄움 (기존 5)

// 테이블이 렌더링하는 버퍼 행을 무시하고 마지막 데이터 행 바로 뒤에 약간의 간격을 두고 배치
const addRowsTop = computed(() => props.totalHeight + CONTROL_SPACING);

// 스크롤 컨테이너 높이 = 데이터 전체 높이 + 간격 + AddRowsControls 높이
const containerHeight = computed(() => props.totalHeight + CONTROL_SPACING + ADD_ROWS_HEIGHT);

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

  const minRow = Math.min(start.rowIndex, end.rowIndex);
  const maxRow = Math.max(start.rowIndex, end.rowIndex);
  const minCol = Math.min(start.colIndex, end.colIndex);
  const maxCol = Math.max(start.colIndex, end.colIndex);

  return (
    rowIndex >= minRow &&
    rowIndex <= maxRow &&
    colIndex >= minCol &&
    colIndex <= maxCol
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
    if (props.isFiltered) {
      classes.push('!bg-blue-500/20 !text-blue-700 !font-medium !border-gray-300 z-[2]');
    } else {
      classes.push('!bg-slate-100 !font-medium !border-gray-300 z-[2]');
    }
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
      const minRow = Math.min(start.rowIndex, end.rowIndex);
      const maxRow = Math.max(start.rowIndex, end.rowIndex);
      const minCol = Math.min(start.colIndex, end.colIndex);
      const maxCol = Math.max(start.colIndex, end.colIndex);

      if (rowIndex === minRow) classes.push('border-top');
      if (rowIndex === maxRow) classes.push('border-bottom');
      if (colIndex === minCol) classes.push('border-left');
      if (colIndex === maxCol) classes.push('border-right');
    }
  }

  // --- Active cell highlight ---------------------------------------
  if (
    props.selectedCell &&
    props.selectedCell.rowIndex === rowIndex &&
    props.selectedCell.colIndex === colIndex
  ) {
    if (isMultiCellSelection(props.selectedRange)) {
      classes.push('cell-active-in-range');
    } else {
      classes.push('cell-selected');
    }
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
/* Validation Error Styles - kept customized for clarity */
.validation-error {
  box-shadow: 0 0 0 2px #ff4444 inset !important;
  background-color: rgba(255, 68, 68, 0.1) !important;
  position: relative;
  z-index: 5;
}

/* Scrollbar Customization */
div::-webkit-scrollbar {
  width: 12px;
  height: 12px;
  background-color: transparent;
}

div::-webkit-scrollbar-track {
  background-color: transparent;
}

div::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  border: 3px solid transparent;
  background-clip: content-box;
  transition: background-color 0.3s cubic-bezier(0.25, 0.8, 0.25, 1), 
              border-width 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

div::-webkit-scrollbar-thumb:hover {
  background-color: rgba(95, 99, 104, 0.7);
  border-width: 1px;
}

div::-webkit-scrollbar-corner {
  background-color: transparent;
}
</style>


 