<template>
  <nav class="function-bar">
    <div class="cell-info-section">
      <span class="cell-id">{{ cellAddress }}</span>
      <span class="dropdown-arrow">▾</span>
      <span class="pipe-separator"></span>
      <span class="value-label">Value</span>
      <input
        type="text"
        v-model="inputValue"
        class="current-cell-input"
        aria-label="현재 셀 값"
        tabindex="-1"
        @input="onInput"
        @keydown.enter.prevent="onEnterKeyDown"
      />
      <!-- Undo/Redo 버튼 -->
      <div class="undo-redo-buttons">
        <button 
          class="undo-redo-button" 
          :disabled="!canUndo"
          aria-label="실행 취소"
          tabindex="-1"
          @click="onUndo"
          @mouseenter="showTooltip('undo', '실행 취소 (Ctrl+Z)', $event)"
          @mouseleave="hideTooltip"
        >
          <span class="material-icons-outlined">
            undo
          </span>
        </button>
        <button 
          class="undo-redo-button" 
          :disabled="!canRedo"
          aria-label="다시 실행"
          tabindex="-1"
          @click="onRedo"
          @mouseenter="showTooltip('redo', '다시 실행 (Ctrl+Y)', $event)"
          @mouseleave="hideTooltip"
        >
          <span class="material-icons-outlined">
            redo
          </span>
        </button>
      </div>
    </div>
    <div class="action-buttons">
      <!-- 그룹 1: 열 토글 -->
      <div class="button-group column-toggles">
        <div class="control-button-wrapper">
          <button
            :class="['function-button', { active: isConfirmedCaseColumnVisible }]"
            aria-label="확진자 여부 토글"
            tabindex="-1"
            @click="onToggleConfirmedCaseColumn"
            @mouseenter="showTooltip('toggleConfirmedCase', '확진자 여부 열을 표시하거나 숨깁니다', $event)"
            @mouseleave="hideTooltip"
          >
            <span class="material-icons-outlined function-button-icon">
              verified_user
            </span>
            확진여부
          </button>
        </div>
        <div class="control-button-wrapper" style="margin-left: 2px;">
          <button
            :class="['function-button', { active: isIndividualExposureColumnVisible }]"
            aria-label="개별 노출시간 토글"
            tabindex="-1"
            @click="onToggleExposureColumn"
            @mouseenter="showTooltip('toggleExposure', '개별 노출시간 열을 표시하거나 숨깁니다', $event)"
            @mouseleave="hideTooltip"
          >
            <span class="material-icons-outlined function-button-icon">
              access_time
            </span>
            개별 노출시간
          </button>
        </div>
      </div>
      
      <!-- 구분선 -->
      <div class="button-group-divider"></div>

      <!-- 그룹 2: 데이터 입출력 -->
      <div class="button-group data-io">
        <div class="control-button-wrapper">
          <!-- Excel Upload Button -->
          <div @mouseenter="showTooltip('excelUpload', 'Excel 파일에서 데이터를 가져와 현재 시트를 대체합니다', $event)" @mouseleave="hideTooltip">
          <ExcelUploadButton
            :is-uploading="isUploadingExcel"
            :upload-progress="uploadProgress"
            @file-selected="onFileSelected"
          />
          </div>
        </div>
        <div 
          class="control-button-wrapper"
          style="position: relative;"
          @mouseenter="showTemplateMenuHover"
          @mouseleave="hideTemplateMenuHover"
        >
          <button 
            class="function-button" 
            aria-label="양식 다운로드"
            tabindex="-1"
          >
            <span class="material-icons-outlined function-button-icon">
              description
            </span>
            양식 다운로드
          </button>
          <div v-if="showTemplateMenu" class="template-menu" @mouseenter="showTemplateMenuHover" @mouseleave="hideTemplateMenuHover" @click.stop>
            <button class="template-menu-button" tabindex="-1" @click="onSelectTemplate('basic')">기본 양식</button>
            <button class="template-menu-button" tabindex="-1" @click="onSelectTemplate('individual')">개별 노출시간 양식</button>
          </div>
        </div>
        <div class="control-button-wrapper">
          <button 
            class="function-button" 
            aria-label="데이터 내보내기"
            tabindex="-1"
            @click="onExportData"
            @mouseenter="showTooltip('exportData', '현재 입력된 모든 데이터를 Excel 파일로 다운로드합니다', $event)"
            @mouseleave="hideTooltip"
          >
            <span class="material-icons-outlined function-button-icon">
              file_download
            </span>
            데이터 내보내기
          </button>
        </div>
      </div>
      
      <!-- 구분선 -->
      <div class="button-group-divider"></div>
      
      <!-- 그룹 3: 시트 편집 -->
      <div class="button-group sheet-editing">
        <div class="control-button-wrapper">
          <button 
            class="function-button" 
            aria-label="전체 데이터 복사"
            tabindex="-1"
            @click="onCopyEntireData"
            @mouseenter="showTooltip('copyData', '모든 데이터를 클립보드에 복사합니다', $event)"
            @mouseleave="hideTooltip"
          >
            <span class="material-icons-outlined function-button-icon">
              content_copy
            </span>
            전체 복사
          </button>
        </div>
        <div class="control-button-wrapper">
          <button 
            class="function-button" 
            aria-label="빈 열 삭제"
            tabindex="-1"
            @click="onDeleteEmptyCols"
            @mouseenter="showTooltip('deleteEmptyCols', '데이터가 없는 빈 열들을 모두 삭제합니다', $event)"
            @mouseleave="hideTooltip"
          >
            <span class="material-icons-outlined function-button-icon">
              delete_outline
            </span>
            빈 열 삭제
          </button>
        </div>
        <div class="control-button-wrapper">
          <button 
            class="function-button" 
            aria-label="전체 초기화"
            tabindex="-1"
            @click="onResetSheet"
            @mouseenter="showTooltip('resetSheet', '모든 데이터와 설정을 초기화하여 빈 시트로 되돌립니다', $event)"
            @mouseleave="hideTooltip"
          >
            <span class="material-icons-outlined function-button-icon">
              refresh
            </span>
            전체 초기화
          </button>
        </div>
      </div>
      
      <!-- 구분선 -->
      <div class="button-group-divider"></div>
      
      <!-- 그룹 4: Undo/Redo -->
      <div class="button-group undo-redo">

      </div>
    </div>
  </nav>

  <!-- 글로벌 툴팁 -->
  <Teleport to="body">
    <div v-if="activeTooltip" :class="['function-bar-tooltip', {visible: tooltipVisible}]" :style="tooltipStyle">
      {{ tooltipText }}
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch, defineProps, defineEmits, computed, nextTick } from 'vue';
import { useStore } from 'vuex';
import ExcelUploadButton from '../parts/ExcelUploadButton.vue';

const props = defineProps({
  cellAddress: {
    type: String,
    default: ''
  },
  cellValue: {
    type: [String, Number],
    default: ''
  },
  isUploadingExcel: {
    type: Boolean,
    default: false
  },
  uploadProgress: {
    type: Number,
    default: 0
  },
  canUndo: {
    type: Boolean,
    default: false
  },
  canRedo: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update-cell-value', 'enter-pressed', 'excel-file-selected', 'download-template', 'export-data', 'copy-entire-data', 'delete-empty-cols', 'reset-sheet', 'toggle-exposure-col', 'toggle-confirmed-case-col', 'undo', 'redo']);

const store = useStore();
const inputValue = ref(props.cellValue);
const showTemplateMenu = ref(false);

// 개별 노출시간 컬럼 가시성 상태
const isIndividualExposureColumnVisible = computed(
  () => store.state.isIndividualExposureColumnVisible
);

// 확진자 여부 컬럼 가시성 상태
const isConfirmedCaseColumnVisible = computed(
  () => store.state.isConfirmedCaseColumnVisible
);

// === Tooltip State ===
const activeTooltip = ref(null);
const tooltipVisible = ref(false);
const tooltipText = ref('');
const tooltipPos = ref({ x: 0, y: 0 });

const tooltipStyle = computed(() => ({
  position: 'fixed',
  left: `${tooltipPos.value.x}px`,
  top: `${tooltipPos.value.y}px`,
  transform: 'translateX(-50%)',
  zIndex: 10002
}));

function showTooltip(key, text, event) {
  if (key === 'template') return; // template no tooltip
  activeTooltip.value = key;
  tooltipVisible.value = false; // start hidden
  tooltipText.value = text;
  const rect = event.currentTarget.getBoundingClientRect();
  // 모든 버튼 툴팁을 버튼 아래쪽에 표시
  const y = rect.bottom + 5;
  const initial = { x: rect.left + rect.width/2, y, rect };
  tooltipPos.value = { x: initial.x, y: initial.y };

  nextTick(() => {
    const tip = document.querySelector('.function-bar-tooltip');
    if (!tip) return;
    const tipRect = tip.getBoundingClientRect();
    const pad = 10;
    let x = initial.x;
    if (x + tipRect.width/2 > window.innerWidth - pad) {
      x = window.innerWidth - tipRect.width/2 - pad;
    }
    if (x - tipRect.width/2 < pad) {
      x = tipRect.width/2 + pad;
    }
    tooltipPos.value = { x, y: initial.y };
    tooltipVisible.value = true; // show after final position set
  });
}

function hideTooltip() {
  activeTooltip.value = null;
  tooltipVisible.value = false;
}

// Sync external cellValue prop
watch(() => props.cellValue, (v) => { inputValue.value = v; });

// --- Template menu hover logic ---
let hideTimer = null;

function showTemplateMenuHover() {
  clearTimeout(hideTimer);
  showTemplateMenu.value = true;
}

function hideTemplateMenuHover() {
  hideTimer = setTimeout(() => {
    showTemplateMenu.value = false;
  }, 200);
}

function onInput() {
  emit('update-cell-value', inputValue.value);
}

function onEnterKeyDown() {
  emit('enter-pressed');
}

function onFileSelected(file) {
  emit('excel-file-selected', file);
}

function onExportData() {
  emit('export-data');
}

function onCopyEntireData() {
  emit('copy-entire-data');
}

function onDeleteEmptyCols() {
  emit('delete-empty-cols');
}

function onResetSheet() {
  emit('reset-sheet');
}

function onToggleExposureColumn() {
  emit('toggle-exposure-col');
}

function onToggleConfirmedCaseColumn() {
  emit('toggle-confirmed-case-col');
}

function onSelectTemplate(type) {
  showTemplateMenu.value = false;
  emit('download-template', type);
}

function onUndo() {
  emit('undo');
}

function onRedo() {
  emit('redo');
}
</script>

<style scoped>
.function-bar {
  display: flex;
  align-items: center;
  background-color: white;
  border-bottom: 1px solid #d3d3d3;
  padding: 0 8px;
  min-height: 40px;
  z-index: 3;
}

.cell-info-section {
  display: flex;
  align-items: center;
  flex-grow: 1;
  min-width: 0;
  border-right: 1px solid #d3d3d3;
  padding-right: 4px;
  margin-right: 4px;
}

.action-buttons {
  display: flex;
  align-items: center;
  gap: 0px;
  flex-shrink: 0;
}

.button-group {
  display: flex;
  align-items: center;
  gap: 0px;
}

.button-group-divider {
  width: 1px;
  height: 24px;
  background: #e0e0e0;
  margin: 0 2px;
}

.cell-id {
  font-family: "Nanum Gothic";
  font-size: 14px;
  font-weight: 400;
  color: black;
  padding: 0 4px 0 12px;
  height: 100%;
  display: flex;
  align-items: center;
  box-sizing: border-box;
  min-width: 80px;
  text-align: right;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dropdown-arrow {
  font-size: 15px;
  color: #5f6368;
  padding: 0 6px 0 4px;
  height: 100%;
  display: flex;
  align-items: center;
  box-sizing: border-box;
}

.pipe-separator {
  color: lightgray;
  margin: 0 8px;
  height: 60%;
  border-left: 1px solid lightgray;
}

.value-label {
  font-family: "Georgia", serif;
  font-size: 15px;
  font-weight: 500;
  font-style: italic;
  color: gray;
  padding: 6px 6px 4px 8px;
  height: 100%;
  display: flex;
  align-items: center;
  box-sizing: border-box;
  justify-content: center;
  min-width: 24px;
}

.current-cell-input {
  border: none;
  border-radius: 0;
  padding-left: 8px;
  font-size: 15px;
  font-family: "Nanum Gothic";
  flex-grow: 1;
  outline: none;
  height: 100%;
  box-sizing: border-box;
  background-color: transparent;
  cursor: text;
}

.current-cell-input:focus {
  box-shadow: 0 0 0 2px #1a73e8 inset;
  border-radius: 2px;
}

.function-button {
  background: transparent;
  border: none;
  color: #3c4043;
  cursor: pointer;
  padding: 8px 8px;
  text-align: center;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: "Google Sans", Roboto, Arial, sans-serif;
  font-size: 14px;
  font-weight: 400;
  border-radius: 4px;
  height: 32px;
  box-sizing: border-box;
  white-space: nowrap;
  transition: all 0.15s ease;
  gap: 6px;
  min-width: 0;
}

.function-button:hover {
  background: #f1f3f4;
  color: #1a73e8;
}

.function-button.active {
  background: #e8f0fe;
  color: #1967d2;
  font-weight: 500;
}

.function-button.active .function-button-icon {
  color: #1967d2;
}

.function-button-icon {
  font-family: 'Material Icons Outlined';
  font-weight: normal;
  font-style: normal;
  font-size: 18px;
  line-height: 1;
  letter-spacing: normal;
  text-transform: none;
  display: inline-block;
  white-space: nowrap;
  word-wrap: normal;
  direction: ltr;
  -webkit-font-feature-settings: 'liga';
  -webkit-font-smoothing: antialiased;
  flex-shrink: 0;
  color: #5f6368;
}

.function-button:hover .function-button-icon {
  color: #1a73e8;
}

.function-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  color: #9aa0a6;
}

.function-button:disabled:hover {
  background-color: transparent;
}

.function-button:disabled .function-button-icon {
  color: #9aa0a6;
}

/* Undo/Redo 버튼 스타일 */
.undo-redo-buttons {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: 8px;
}

.undo-redo-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #5f6368;
}

.undo-redo-button:hover:not(:disabled) {
  background-color: #f8f9fa;
  color: #1a73e8;
}

.undo-redo-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  color: #9aa0a6;
}

.undo-redo-button .material-icons-outlined {
  font-size: 16px;
}

.control-button-wrapper {
  position: relative;
}

/* Template menu (dark style) */
.template-menu {
  position: absolute;
  top: calc(100% + 5px);
  left: 50%;
  transform: translateX(-50%);
  background: #333;
  color: #fff;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  padding: 6px;
  z-index: 1000;
  min-width: 140px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.template-menu-button {
  background: transparent;
  border: none;
  color: #fff;
  cursor: pointer;
  padding: 8px 16px;
  text-align: left;
  width: 100%;
  font-family: "Google Sans", Roboto, Arial, sans-serif;
  font-size: 14px;
  border-radius: 4px;
  white-space: nowrap;
  transition: background-color 0.15s ease;
}

.template-menu-button:hover {
  background: #555;
}

/* Tooltip styles */
.function-bar-tooltip {
  background: #333;
  color: #fff;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 12px;
  white-space: nowrap;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  opacity: 0;
  transition: opacity 0.08s ease;
  pointer-events: none;
}

.function-bar-tooltip.visible {
  opacity: 1;
}
</style> 