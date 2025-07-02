<template>
  <div class="grid-header-virtual" ref="headerContainer">
    <table class="data-table" :style="{ width: tableWidth }">
      <colgroup>
        <col 
          v-for="column in allColumnsMeta" 
          :key="column.colIndex" 
          :style="column.style"
        >
      </colgroup>
      <thead>
        <!-- 첫 번째 헤더 행 (그룹 헤더) -->
        <tr role="row">
          <template v-for="(group, groupIndex) in headerGroups" :key="'header-group-' + groupIndex">
            <th
              v-if="group.rowspan === 2"
              rowspan="2"
              :style="group.style"
              role="columnheader"
              :class="{ 
                'allow-wrap': group.startColIndex === 1,
                'serial-header': group.startColIndex === 0 
              }"
              @contextmenu.prevent="$emit('cell-contextmenu', $event, -1, group.startColIndex)"
            >
              <span v-html="getHeaderText(group)"></span>
            </th>
            <th
              v-else
              :colspan="group.colspan"
              class="group-header"
              role="columnheader"
            >
              {{ getHeaderText(group) }}
              <div v-if="group.addable || group.deletable" class="header-actions">
                <button
                  v-if="group.addable"
                  @click.stop="$emit('add-column', group.type)"
                  @mouseenter="showTooltip('add', '열을 추가합니다', $event)"
                  @mouseleave="hideTooltip"
                  :title="'열 추가'"
                  class="add-column-button"
                  aria-label="`${group.text} 열 추가`"
                >
                  +
                </button>
                <button
                  v-if="group.deletable"
                  @click.stop="$emit('delete-column', group.type)"
                  :disabled="group.columnCount <= 1"
                  :title="group.columnCount <= 1 ? '최소 1개 열이 필요합니다' : '열 삭제'"
                  @mouseenter="showTooltip('delete', group.columnCount <= 1 ? '최소 1개 열이 필요합니다' : '열을 삭제합니다', $event)"
                  @mouseleave="hideTooltip"
                  class="delete-column-button"
                  aria-label="`${group.text} 열 삭제`"
                >
                  -
                </button>
              </div>
            </th>
          </template>
        </tr>
        <!-- 두 번째 헤더 행 (개별 헤더) -->
        <tr role="row">
          <template v-for="column in allColumnsMeta" :key="'header-th-' + column.colIndex">
            <th
              v-if="column.headerRow === 2"
              class="column-header"
              role="columnheader"
              :data-col="column.colIndex"
              :class="getCellClasses(-1, column.colIndex)"
              :contenteditable="isCellEditing(-1, column.colIndex)"
              @input="$emit('cell-input', $event, -1, column.colIndex)"
              @dblclick="$emit('cell-dblclick', -1, column.colIndex, $event)"
              @mousedown="$emit('cell-mousedown', -1, column.colIndex, $event)"
              @mousemove="$emit('cell-mousemove', -1, column.colIndex, $event)"
              @contextmenu.prevent="$emit('cell-contextmenu', $event, -1, column.colIndex)"
            >
              {{ column.headerText }}
            </th>
          </template>
        </tr>
      </thead>
    </table>
  </div>

  <!-- 툴팁 -->
  <Teleport to="body">
    <div 
      v-if="activeTooltip" 
      class="header-button-tooltip"
      :style="tooltipStyle"
    >
      {{ tooltipText }}
    </div>
  </Teleport>
</template>

<script setup>
import { ref, defineProps, defineExpose, defineEmits, reactive } from 'vue';

const props = defineProps({
  headerGroups: {
    type: Array,
    required: true
  },
  allColumnsMeta: {
    type: Array,
    required: true
  },
  tableWidth: {
    type: String,
    required: true
  },
  selectedCell: {
    type: Object,
    default: () => ({ rowIndex: null, colIndex: null })
  },
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
});

defineEmits(['cell-mousedown', 'cell-mousemove', 'cell-dblclick', 'cell-input', 'cell-contextmenu', 'add-column', 'delete-column']);

const headerContainer = ref(null);

// 툴팁 상태
const activeTooltip = ref(null);
const tooltipText = ref('');
const tooltipStyle = reactive({});

function isCellEditing(rowIndex, colIndex) {
  return props.isEditing && props.editingCell.rowIndex === rowIndex && props.editingCell.colIndex === colIndex;
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

function isMultiCellSelection(range) {
  if (!range || range.start.rowIndex === null) return false;
  return range.start.rowIndex !== range.end.rowIndex || range.start.colIndex !== range.end.colIndex;
}

function getCellClasses(rowIndex, colIndex) {
  const classes = [];

  if (isCellEditing(rowIndex, colIndex)) {
    classes.push('cell-editing');
    return classes;
  }

  // 개별 셀 선택 (헤더 포함)
  if (props.individualSelectedCells && props.individualSelectedCells.has(`${rowIndex}_${colIndex}`)) {
    classes.push('cell-multi-selected');
  }

  // 선택 범위에 없으면 아무 클래스도 적용하지 않음
  if (!isCellInRange(rowIndex, colIndex)) {
    return classes;
  }

  // 여러 셀이 선택된 경우에만 배경색 적용
  if (isMultiCellSelection(props.selectedRange)) {
    classes.push('cell-range-selected');
  }

  // 전체 선택 범위의 바깥쪽 테두리 적용
  const { start, end } = props.selectedRange;
  if (rowIndex === start.rowIndex) classes.push('border-top');
  if (rowIndex === end.rowIndex) classes.push('border-bottom');
  if (colIndex === start.colIndex) classes.push('border-left');
  if (colIndex === end.colIndex) classes.push('border-right');

  // 현재 활성 셀에 'cell-selected' 클래스 적용 (진한 테두리)
  if (
    props.selectedCell &&
    props.selectedCell.rowIndex === rowIndex &&
    props.selectedCell.colIndex === colIndex
  ) {
    classes.push('cell-selected');
  }
  
  return classes;
}

const getHeaderText = (group) => {
  // COL_IDX_IS_PATIENT === 1
  if (group.startColIndex === 1) {
    return group.text;
  }
  return String(group.text).replace(/<br\s*\/?>/gi, ' ');
};

function showTooltip(type, text, event) {
  const rect = event.currentTarget.getBoundingClientRect();
  tooltipText.value = text;
  tooltipStyle.left = rect.left + rect.width / 2 + 'px';
  tooltipStyle.top = rect.bottom + 5 + 'px';
  tooltipStyle.transform = 'translateX(-50%)';
  activeTooltip.value = type;
}

function hideTooltip() {
  activeTooltip.value = null;
}

// Expose the container for parent access
defineExpose({ headerContainer });
</script>

<style scoped>
.grid-header-virtual {
  overflow-x: hidden;
  background-color: #f8f9fa;
  border-bottom: 1px solid #dee2e6;
  position: relative;
  z-index: 2;
}

.data-table {
  border-collapse: collapse;
  table-layout: fixed;
  width: 100%;
}

th {
  position: relative;
  border: 1px solid #adb5bd;
  padding: 8px;
  text-align: center;
  font-weight: 500;
  font-size: 14px;
  background-clip: padding-box;
  box-sizing: border-box;
  vertical-align: middle;
  line-height: 1.4;
  white-space: nowrap;
  /* Prevent text selection when dragging across header cells */
  user-select: none;
}

/* '환자여부' 헤더에만 줄바꿈을 허용하는 스타일 */
th.allow-wrap {
  white-space: normal;
}

.serial-header {
  background-color: #f1f3f4;
  font-weight: 600;
}

.group-header {
  background-color: #f1f3f4;
  position: relative;
}

.column-header {
  background-color: #f8f9fa;
  cursor: default;
  height: 35px; /* 고정 높이: 첫 번째 헤더 행과 동일 */
}

.column-header:hover {
  background-color: #e9ecef;
}

/* .column-header.cell-selected {
  background-color: #d2e3fc !important;
  box-shadow: 0 0 0 2px #1a73e8 inset !important;
  z-index: 10;
} */

.cell-range-selected {
  background-color: #e8f0fe !important;
}

.cell-editing {
  background-color: #fff !important;
  box-shadow: 0 0 0 2px #1a73e8 inset !important;
  z-index: 10;
  outline: none;
  cursor: text;
}

.header-actions {
  position: absolute;
  top: 50%;
  left: 5px;
  transform: translateY(-50%);
  display: flex;
  gap: 3px;
  align-items: center;
  z-index: 2;
}

.add-column-button,
.delete-column-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  min-width: 22px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid #dadce0;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 600;
  color: #5f6368;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0.0, 0.2, 1);
  user-select: none;
  padding: 0;
  line-height: 1;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.add-column-button:hover {
  background: #e8f0fe;
  border-color: #1a73e8;
  color: #1a73e8;
  transform: scale(1.05);
  box-shadow: 0 2px 4px rgba(26, 115, 232, 0.2);
}

.add-column-button:active {
  background: #d2e3fc;
  transform: scale(0.98);
  box-shadow: 0 1px 2px rgba(26, 115, 232, 0.3);
}

.delete-column-button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.delete-column-button:hover:not(:disabled) {
  background: #fce8e6;
  border-color: #d93025;
  color: #d93025;
  transform: scale(1.05);
  box-shadow: 0 2px 4px rgba(217, 48, 37, 0.2);
}

.delete-column-button:active:not(:disabled) {
  background: #f4c7c3;
  transform: scale(0.98);
  box-shadow: 0 1px 2px rgba(217, 48, 37, 0.3);
}

.add-column-button:focus,
.delete-column-button:focus {
  outline: 2px solid #1a73e8;
  outline-offset: 1px;
}

/* 툴팁 스타일 */
.header-button-tooltip {
  position: fixed;
  background: #333;
  color: white;
  padding: 6px 8px;
  border-radius: 4px;
  font-size: 12px;
  white-space: nowrap;
  z-index: 10000;
  pointer-events: none;
  opacity: 0;
  animation: tooltipFadeIn 0.2s ease forwards;
}

@keyframes tooltipFadeIn {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}
</style> 