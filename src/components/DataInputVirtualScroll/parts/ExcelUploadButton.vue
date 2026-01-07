<template>
  <div class="excel-upload-container">
    <!-- 숨겨진 파일 입력 -->
    <input
      ref="fileInput"
      type="file"
      accept=".xlsx,.xls"
      tabindex="-1"
      @change="handleFileSelect"
      style="display: none;"
    />
    <!-- 엑셀 업로드 버튼 -->
    <button
      @click="triggerFileSelect"
      :disabled="isUploading"
      :class="['function-button', { uploading: isUploading }]"
      tabindex="-1"
    >
      <span v-if="!isUploading" class="material-icons-outlined function-button-icon">
        file_upload
      </span>
      <span v-else class="material-icons-outlined function-button-icon loading-spinner">
        hourglass_empty
      </span>
      <span class="upload-text">
        {{ isUploading ? `처리 중... ${uploadProgress}%` : '데이터 가져오기' }}
      </span>
    </button>
  </div>
</template>

<script setup>
import { ref, defineProps, defineEmits } from 'vue';

const props = defineProps({
  isUploading: { type: Boolean, default: false },
  uploadProgress: { type: Number, default: 0 } // 0-100
});
const emit = defineEmits(['file-selected']);
const fileInput = ref(null);
function triggerFileSelect() {
  if (!props.isUploading) {
    fileInput.value.click();
  }
}
function handleFileSelect(event) {
  const file = event.target.files[0];
  if (file) {
    emit('file-selected', file);
  }
  event.target.value = '';
}
</script>

<style scoped>
.excel-upload-container {
  position: relative;
  display: inline-block;
}
/* Button styles identical to other function buttons */
.function-button {
  background: transparent;
  border: none;
  color: #3c4043;
  cursor: pointer;
  padding: 8px 8px;
  text-align: center;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: "Google Sans", Roboto, Arial, sans-serif;
  font-size: 14px;
  border-radius: 4px;
  height: 32px;
  transition: all 0.15s ease;
  gap: 6px;
}
.function-button:hover:not(:disabled) {
  background: #f1f3f4;
  color: #1a73e8;
}
.function-button:disabled {
  color: #9aa0a6 !important;
  cursor: not-allowed;
}
.uploading {
  background: #e3f2fd !important;
  color: #1976d2 !important;
}
.function-button-icon {
  font-family: 'Material Icons Outlined';
  font-size: 18px;
}
.loading-spinner {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
.upload-text { font-size: 14px; }

/* 반응형: 화면이 좁아지면 텍스트 숨김 */
@media (max-width: 1300px) {
  .upload-text {
    display: none;
  }
  
  .function-button {
    padding: 8px 6px;
  }
}
</style>