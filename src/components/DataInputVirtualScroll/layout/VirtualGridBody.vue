<template>
  <div class="grid-body-virtual" ref="bodyContainer" @scroll.passive="handleScroll">
    <div :style="{ height: containerHeight + 'px', position: 'relative', width: tableWidth, minWidth: '100%' }">
      <table 
        class="data-table" 
        :style="{ 
          transform: `translateY(${paddingTop}px)`,
          width: tableWidth,
          minWidth: '100%'
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
              :contenteditable="isCellEditing(item.originalIndex, column.colIndex)"
              @input="$emit('cell-input', $event, item.originalIndex, column.colIndex)"
              @dblclick="$emit('cell-dblclick', index, column.colIndex, $event)"
              @mousedown="$emit('cell-mousedown', index, column.colIndex, $event)"
              @mousemove="$emit('cell-mousemove', index, column.colIndex, $event)"
              @contextmenu.prevent="$emit('cell-contextmenu', $event, index, column.colIndex)"
            >
              {{ getCellValue(item.data, column, item.originalIndex) }}
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
  </div>
</template>

<script setup>
import { ref, computed, defineProps, defineEmits, defineExpose } from 'vue';
import AddRowsControls from '../parts/AddRowsControls.vue';

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
      end: { rowIndex: null, colIndex: null },
    }),
  },
  isEditing: { type: Boolean, default: false },
  editingCell: { type: Object, default: () => ({ rowIndex: null, colIndex: null }) },
  individualSelectedCells: { type: Object, default: null },
  individualSelectedRows: { type: Object, default: null },
  bufferSize: { type: Number, default: 4 },
});

const emit = defineEmits(['scroll', 'cell-mousedown', 'cell-mousemove', 'cell-dblclick', 'cell-input', 'cell-contextmenu', 'add-rows', 'delete-empty-rows', 'clear-selection']);

const bodyContainer = ref(null);

// AddRowsControls 위치 및 컨테이너 높이 계산
const ADD_ROWS_HEIGHT = 35; // px (controls 자체 높이)
const ROW_HEIGHT = 5;      // Must match useVirtualScroll rowHeight

// 테이블이 렌더링하는 버퍼 행까지 고려하여 AddRowsControls를 충분히 아래로 내려 배치
const addRowsTop = computed(() => props.totalHeight + props.bufferSize * ROW_HEIGHT);

// 스크롤 컨테이너 높이 = 데이터 전체 높이 + 버퍼 영역 + AddRowsControls 높이
const containerHeight = computed(() => props.totalHeight + props.bufferSize * ROW_HEIGHT + ADD_ROWS_HEIGHT);

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
  return classes;
}

defineExpose({ bodyContainer });
</script>

<style scoped>
.grid-body-virtual {
  overflow: auto;
  position: relative;
  height: 100%;
  will-change: scroll-position;
}

.data-table {
  border-collapse: collapse;
  table-layout: fixed;
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
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
  border-bottom: 1px solid #ced4da; /* 셀과 동일한 하단 테두리 */
  z-index: 0;
}
</style> 