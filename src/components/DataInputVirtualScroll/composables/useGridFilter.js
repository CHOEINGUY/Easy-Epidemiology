
import { ref, computed, watch, nextTick } from 'vue';
import { logger } from '../../../utils/logger.js';

export function useGridFilter(storeBridge, rows, gridBodyRef, gridHeaderRef) {
  // 필터 상태를 reactive하게 만들기
  const filterState = ref(storeBridge.filterState);

  // 필터 상태 변화 감지 - 안전한 방식으로 개선
  watch(() => storeBridge.filterState, (newState) => {
    // 새로운 상태와 현재 상태가 다른 경우에만 업데이트
    if (JSON.stringify(newState) !== JSON.stringify(filterState.value)) {
      filterState.value = { ...newState };

      // UI 업데이트는 nextTick을 통해 안전하게 처리
      nextTick(() => {
        // 강제 업데이트 대신 자연스러운 반응성 활용
        // 필요한 경우에만 최소한의 강제 업데이트 수행
        if (gridBodyRef.value && gridHeaderRef.value) {
          // 필터 상태가 실제로 변경된 경우에만 업데이트
          if (newState.isFiltered !== filterState.value.isFiltered ||
              newState.activeFilters?.size !== filterState.value.activeFilters?.size) {
            // 최소한의 강제 업데이트만 수행
            gridBodyRef.value.$forceUpdate();
            gridHeaderRef.value.$forceUpdate();
          }
        }
      });
    }
  }, {
    deep: true,
    immediate: true
    // flush: 'sync' 제거 - 기본값인 'pre' 사용으로 안전성 확보
  });

  // --- 필터된 행 계산 ---
  const filteredRows = computed(() => {
    // filterState ref와 storeBridge.filterState 모두 감시
    // storeState가 이제 reactive이므로 직접 접근 가능
    const bridgeFilterState = storeBridge.filterState;
    const activeFiltersSize = bridgeFilterState.activeFilters?.size || 0;

    // 개발 모드에서 상태 확인
    if (import.meta.env?.MODE === 'development') {
      logger.debug('filteredRows computed 실행:', {
        isFiltered: bridgeFilterState.isFiltered,
        activeFiltersSize,
        totalRowsLength: rows.value.length
      });
    }

    // 실제 필터링은 bridgeFilterState 기준으로 수행
    if (!bridgeFilterState.isFiltered || activeFiltersSize === 0) {
      return rows.value;
    }

    // 직접 필터링 로직 사용 - 원본 인덱스 정보 포함
    const filteredWithOriginalIndex = [];
    rows.value.forEach((row, originalIndex) => {
      // activeFilters를 배열로 변환하여 반응성 보장
      const activeFiltersArray = Array.from(bridgeFilterState.activeFilters || []);

      let shouldInclude = true;
      for (const [colIndex, filterConfig] of activeFiltersArray) {
        // StoreBridge의 public 메서드 사용
        if (!storeBridge.matchesFilter(row, colIndex, filterConfig)) {
          shouldInclude = false;
          break;
        }
      }

      if (shouldInclude) {
        // 원본 인덱스 정보를 포함하여 반환
        filteredWithOriginalIndex.push({
          ...row,
          _originalIndex: originalIndex, // 원본 인덱스 저장
          _filteredOriginalIndex: originalIndex // 필터링된 상태에서의 원본 인덱스
        });
      }
    });

    return filteredWithOriginalIndex;
  });

  // === 필터 상태 포함한 스냅샷 캡처 헬퍼 ===
  function captureSnapshotWithFilter(actionType, metadata = {}) {
    try {
      // StoreBridge의 _captureSnapshot이 이제 자동으로 필터 상태를 포함하므로
      // 단순히 _captureSnapshot을 호출하면 됩니다.
      storeBridge._captureSnapshot(actionType, metadata);
    } catch (error) {
      logger.error(`스냅샷 캡처 실패: ${actionType}`, error);
    }
  }

  // === 히스토리 변경 후 동기화 함수 ===
  function syncFilterStateAfterHistoryChange() {
    // StoreBridge에서 복원된 필터 상태를 로컬 상태와 동기화
    const newFilterState = { ...storeBridge.filterState };

    // 필터 상태 업데이트 - 자연스러운 반응성 활용
    filterState.value = newFilterState;

    // StoreBridge의 내부 필터 상태도 동기화 (필요한 경우에만)
    if (typeof storeBridge.setFilterState === 'function') {
      storeBridge.setFilterState(newFilterState);
    }

    // UI 업데이트는 자연스러운 반응성 시스템에 맡김
    // 필요한 경우에만 최소한의 강제 업데이트 수행
    nextTick(() => {
      try {
        // 필터 상태가 실제로 변경된 경우에만 UI 업데이트
        const gridBody = gridBodyRef.value;
        const gridHeader = gridHeaderRef.value;

        if (gridBody && gridHeader) {
          // 필터 상태 변화가 있을 때만 강제 업데이트
          if (newFilterState.isFiltered !== filterState.value.isFiltered ||
              newFilterState.activeFilters?.size !== filterState.value.activeFilters?.size) {
            gridBody.$forceUpdate();
            gridHeader.$forceUpdate();
          }
        }
      } catch (error) {
        logger.warn('UI update failed during sync', error);
      }
    });
  }

  function onClearAllFilters() {
    // 필터 변경 전 상태 백업
    const oldFilterState = JSON.stringify(storeBridge.filterState);

    storeBridge.clearAllFilters();

    // 필터 상태가 실제로 변경된 경우에만 스냅샷 캡처
    if (oldFilterState !== JSON.stringify(storeBridge.filterState)) {
      captureSnapshotWithFilter('filter_clear_all', {
        action: 'clear-all-filters',
        oldFilterState: JSON.parse(oldFilterState),
        newFilterState: { ...storeBridge.filterState }
      });
    }

    // 강제로 filterState 업데이트하여 filteredRows computed가 재실행되도록 함
    filterState.value = { ...storeBridge.filterState };

    logger.debug('[Filter] 모든 필터 해제됨');
  }

  function onUpdateActiveFilters(activeFilters) {
    // 개별 필터 제거 처리
    logger.debug('[Filter] 개별 필터 제거:', activeFilters);

    // StoreBridge의 필터 상태와 동기화
    storeBridge.filterState.activeFilters = new Map(activeFilters);

    // watch가 자동으로 감지하여 업데이트하므로 별도 호출 불필요
  }

  return {
    filterState,
    filteredRows,
    captureSnapshotWithFilter,
    syncFilterStateAfterHistoryChange,
    onClearAllFilters,
    onUpdateActiveFilters
  };
}
