
import { nextTick } from 'vue';
import { logger, devLog } from '../../../utils/logger.js';

/**
 * Composable for Undo/Redo handlers
 */
export function useUndoRedoHandlers(
  storeBridge,
  validationManager,
  filterState, // Ref
  syncFilterStateAfterHistoryChange,
  dateTimePickerState,
  closeDateTimePicker,
  gridBodyRef, // Ref
  gridHeaderRef // Ref
) {

  function onUndo() {
    // 데이트피커가 열려있으면 닫기
    if (dateTimePickerState.visible) {
      closeDateTimePicker();
    }

    const success = storeBridge.undo();

    if (success) {

      // ValidationManager 타이머만 정리 (오류는 StoreBridge에서 복원됨)
      if (validationManager && typeof validationManager.onDataReset === 'function') {
        validationManager.onDataReset();
      }

      // 필터 상태 동기화
      syncFilterStateAfterHistoryChange();

      // 추가적인 필터 상태 확인 및 동기화
      nextTick(() => {
        // 필터 상태가 여전히 불일치하면 동기화
        if (JSON.stringify(filterState.value) !== JSON.stringify(storeBridge.filterState)) {
          filterState.value = { ...storeBridge.filterState };

          // 자연스러운 반응성 시스템 활용
          // 필요한 경우에만 최소한의 강제 업데이트 수행
          const gridBody = gridBodyRef.value;
          const gridHeader = gridHeaderRef.value;
          if (gridBody && gridHeader) {
            gridBody.$forceUpdate();
            gridHeader.$forceUpdate();
          }
        }
      });

      // Undo/Redo는 사용자가 의도적으로 수행하는 작업이므로 토스트 메시지 제거
      // 필터 상태는 UI에서 자동으로 반영됨
    }
  }

  function onRedo() {
    devLog('[Redo] ===== Redo 시작 =====');
    devLog('[Redo] 현재 필터 상태:', filterState.value);
    devLog('[Redo] StoreBridge 필터 상태:', storeBridge.filterState);

    // 데이트피커가 열려있으면 닫기
    if (dateTimePickerState.visible) {
      devLog('[Redo] 데이트피커 닫기');
      closeDateTimePicker();
    }

    const success = storeBridge.redo();
    devLog('[Redo] StoreBridge.redo() 결과:', success);

    if (success) {
      devLog('[Redo] Redo 성공 - 후처리 시작');
      devLog('[Redo] Redo 후 StoreBridge 필터 상태:', storeBridge.filterState);

      // ValidationManager 타이머만 정리 (오류는 StoreBridge에서 복원됨)
      if (validationManager && typeof validationManager.onDataReset === 'function') {
        validationManager.onDataReset();
      }

      // 필터 상태 동기화
      syncFilterStateAfterHistoryChange();

      // 추가적인 필터 상태 확인 및 동기화
      nextTick(() => {
        devLog('[Redo] 최종 필터 상태 확인:', {
          filterStateValue: filterState.value,
          storeBridgeFilterState: storeBridge.filterState,
          isFiltered: storeBridge.filterState.isFiltered,
          activeFiltersSize: storeBridge.filterState.activeFilters?.size || 0
        });

        // 필터 상태가 여전히 불일치하면 동기화
        if (JSON.stringify(filterState.value) !== JSON.stringify(storeBridge.filterState)) {
          logger.warn('[Redo] 필터 상태 불일치 감지 - 동기화 실행');
          filterState.value = { ...storeBridge.filterState };

          // 자연스러운 반응성 시스템 활용
          // 필요한 경우에만 최소한의 강제 업데이트 수행
          const gridBody = gridBodyRef.value;
          const gridHeader = gridHeaderRef.value;
          if (gridBody && gridHeader) {
            gridBody.$forceUpdate();
            gridHeader.$forceUpdate();
          }
        }
      });

      // Undo/Redo는 사용자가 의도적으로 수행하는 작업이므로 토스트 메시지 제거
      // 필터 상태는 UI에서 자동으로 반영됨
    } else {
      devLog('[Redo] Redo 실패 또는 불가능');
    }

    devLog('[Redo] ===== Redo 완료 =====');
  }

  return {
    onUndo,
    onRedo
  };
}
