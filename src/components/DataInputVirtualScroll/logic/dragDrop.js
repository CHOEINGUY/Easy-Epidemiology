/**
 * Drag & Drop logic for DataInputVirtualScroll
 * Reused from DataInputRefactor with minimal dependencies.
 */

import { ref } from 'vue';

const isDragOver = ref(false);
let dragCounter = 0;

function handleDragEnter(event) {
  event.preventDefault();
  event.stopPropagation();
  dragCounter++;
  if (event.dataTransfer?.items) {
    const hasFiles = Array.from(event.dataTransfer.items).some((i) => i.kind === 'file');
    if (hasFiles) isDragOver.value = true;
  }
}

function handleDragOver(event) {
  event.preventDefault();
  event.stopPropagation();
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
}

function handleDragLeave(event) {
  event.preventDefault();
  event.stopPropagation();
  dragCounter--;
  if (dragCounter === 0) isDragOver.value = false;
}

function isExcelFile(file) {
  const allowedTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
  ];
  const exts = ['.xlsx', '.xls'];
  const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
  return allowedTypes.includes(file.type) || exts.includes(ext);
}

function handleDrop(event, onFileDropped) {
  event.preventDefault();
  event.stopPropagation();
  isDragOver.value = false;
  dragCounter = 0;
  if (event.dataTransfer?.files?.length) {
    const file = event.dataTransfer.files[0];
    if (isExcelFile(file)) {
      onFileDropped(file);
    } else {
      // eslint-disable-next-line no-console
      console.warn('엑셀 파일만 업로드 가능합니다.');
    }
  }
}

export function useDragDrop() {
  function setupDragDropListeners(onFileDropped) {
    const enter = (e) => handleDragEnter(e);
    const over = (e) => handleDragOver(e);
    const leave = (e) => handleDragLeave(e);
    const drop = (e) => handleDrop(e, onFileDropped);

    document.addEventListener('dragenter', enter);
    document.addEventListener('dragover', over);
    document.addEventListener('dragleave', leave);
    document.addEventListener('drop', drop);

    return () => {
      document.removeEventListener('dragenter', enter);
      document.removeEventListener('dragover', over);
      document.removeEventListener('dragleave', leave);
      document.removeEventListener('drop', drop);
    };
  }

  return { isDragOver, setupDragDropListeners };
} 