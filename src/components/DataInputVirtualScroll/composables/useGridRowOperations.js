
import { nextTick } from 'vue';
import { showToast } from '../logic/toast.js';
import { devLog } from '../../../utils/logger.js';

/**
 * Composable for row operations (add, delete, clear selection)
 */
export function useGridRowOperations(
  storeBridge,
  selectionSystem,
  rows, // Ref
  dateTimePickerState,
  closeDateTimePicker,
  tryStartOperation,
  endOperation
) {

  function onDeleteEmptyRows() {
    if (!tryStartOperation('delete_empty_rows', { blocking: true, timeout: 10000 })) {
      return;
    }

    // 데이트피커가 열려있으면 닫기
    if (dateTimePickerState.visible) {
      devLog('[DataInputVirtual] 빈 행 삭제로 데이트피커 닫기');
      closeDateTimePicker();
    }

    storeBridge.dispatch('deleteEmptyRows');
    selectionSystem.clearSelection();
    showToast('빈 행이 삭제되었습니다.', 'success');

    endOperation('delete_empty_rows');
  }

  function onAddRows(count) {
    // 데이트피커가 열려있으면 닫기
    if (dateTimePickerState.visible) {
      devLog('[DataInputVirtual] 행 추가로 데이트피커 닫기');
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
      devLog('[DataInputVirtual] 선택 영역 초기화로 데이트피커 닫기');
      closeDateTimePicker();
    }

    selectionSystem.clearSelection();
  }

  return {
    onDeleteEmptyRows,
    onAddRows,
    onClearSelection
  };
}
