
import { reactive, nextTick } from 'vue';
import { logger, devLog } from '../../../utils/logger.js';

/**
 * Composable for DateTimePicker state and event handlers
 */
export function useDateTimePicker(
  storeBridge,
  validationManager,
  focusGrid
) {
  // DateTimePicker 상태
  const dateTimePickerState = reactive({
    visible: false,
    position: { top: 0, left: 0 },
    initialValue: null,
    currentEdit: null
  });

  async function onDateTimeConfirm(dateTimeObject) {
    devLog('[DateTimePicker] Date confirmed:', dateTimeObject);

    // 현재 편집 중인 셀 정보 가져오기
    const editInfo = dateTimePickerState.currentEdit;
    if (!editInfo) {
      logger.warn('[DateTimePicker] No edit info found');
      dateTimePickerState.visible = false;
      return;
    }

    const { rowIndex, colIndex, columnMeta } = editInfo;

    try {
      // 날짜/시간 포맷팅
      const { formatDateTime } = await import('../utils/dateTimeUtils.js');
      const formattedValue = formatDateTime(dateTimeObject);
      devLog(`[DateTimePicker] Formatted value: ${formattedValue} for cell: ${rowIndex}, ${colIndex}`);

      // 값 저장
      storeBridge.saveCellValue(rowIndex, colIndex, formattedValue, columnMeta);

      // 유효성 검사 실행
      validationManager.validateCell(rowIndex, colIndex, formattedValue, columnMeta.type);

      devLog(`[DateTimePicker] Successfully saved date: ${formattedValue}`);
    } catch (error) {
      logger.error('[DateTimePicker] Error saving date:', error);
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
    devLog('[DateTimePicker] Date selection cancelled');
    closeDateTimePicker();
  }

  // 데이트피커를 닫는 공통 함수
  function closeDateTimePicker() {
    devLog('[DateTimePicker] Closing date picker');

    // 데이트피커 숨김 및 상태 정리
    dateTimePickerState.visible = false;
    dateTimePickerState.currentEdit = null;

    // 포커스 복원
    nextTick(() => {
      focusGrid();
    });
  }

  return {
    dateTimePickerState,
    onDateTimeConfirm,
    onDateTimeCancel,
    closeDateTimePicker
  };
}
