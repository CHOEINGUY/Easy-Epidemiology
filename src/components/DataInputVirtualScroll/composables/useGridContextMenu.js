import { nextTick } from 'vue';
import {
  COL_TYPE_BASIC,
  COL_TYPE_IS_PATIENT,
  COL_TYPE_CONFIRMED_CASE,
  COL_TYPE_ONSET,
  COL_TYPE_INDIVIDUAL_EXPOSURE
} from '../constants/index.js';
// useContextMenu is used in the parent component
import { handleContextMenu } from '../handlers/contextMenuHandlers.js';
import { devLog } from '../../../utils/logger.js';

export function useGridContextMenu(
  storeBridge,
  selectionSystem,
  allColumnsMeta, // Ref
  contextMenuState, // From useContextMenu
  showContextMenu, // passed from logic/useContextMenu
  hideContextMenu, // passed from logic/useContextMenu
  getOriginalIndex,
  validationManager,
  tryStartOperation, // eslint-disable-line no-unused-vars
  endOperation, // eslint-disable-line no-unused-vars
  focusGrid, // eslint-disable-line no-unused-vars
  captureSnapshotWithFilter,
  filterState, // Ref
  rows, // Ref
  filteredRows // Ref
) {

  // Helper to create context for handlers
  function createHandlerContext() {
    return {
      storeBridge, // Renamed from 'store' to Match contextMenuFilterUtils expectation
      selectionSystem,
      allColumnsMeta: allColumnsMeta.value,
      contextMenuState,
      showContextMenu,
      getOriginalIndex,
      rows,
      filteredRows
    };
  }

  function onContextMenu(event, virtualRowIndex, colIndex) {
    devLog('[DataInputVirtual] 컨텍스트 메뉴 이벤트:', {
      virtualRowIndex,
      colIndex,
      clientX: event.clientX,
      clientY: event.clientY
    });

    const context = createHandlerContext();
    handleContextMenu(event, virtualRowIndex, colIndex, context);
  }

  async function onContextMenuSelect(action) {
    const { target } = contextMenuState; // `target` holds { rowIndex, colIndex }
    const { selectedRange, selectedRowsIndividual, selectedCellsIndividual } = selectionSystem.state;

    devLog('[DataInputVirtual] 컨텍스트 메뉴 선택:', {
      action,
      target,
      selectedRange,
      selectedRowsIndividual: Array.from(selectedRowsIndividual),
      selectedCellsIndividual: Array.from(selectedCellsIndividual)
    });

    hideContextMenu();

    // 개별 선택이 있는 경우 우선 처리, 없으면 범위 선택 처리
    const getEffectiveRowSelection = () => {
      if (selectedRowsIndividual.size > 0) {
        const rows = Array.from(selectedRowsIndividual).sort((a, b) => a - b);

        // 빈 배열 체크
        if (rows.length === 0) {
          return { type: 'none', startRow: target.rowIndex, endRow: target.rowIndex, count: 0 };
        }

        return {
          type: 'individual',
          rows,
          startRow: Math.min(...rows),
          endRow: Math.max(...rows),
          count: rows.length
        };
      } else if (selectedRange.start.rowIndex !== null) {
        return {
          type: 'range',
          startRow: selectedRange.start.rowIndex,
          endRow: selectedRange.end.rowIndex,
          count: selectedRange.end.rowIndex - selectedRange.start.rowIndex + 1
        };
      }
      return { type: 'none', startRow: target.rowIndex, endRow: target.rowIndex, count: 1 };
    };

    const getEffectiveColumnSelection = () => {
      if (selectedCellsIndividual.size > 0) {
        const columns = new Set();
        selectedCellsIndividual.forEach(cellKey => {
          const [, colStr] = cellKey.split('_');
          columns.add(parseInt(colStr, 10));
        });
        const colArray = Array.from(columns).sort((a, b) => a - b);

        // 빈 배열 체크
        if (colArray.length === 0) {
          return { type: 'none', startCol: target.colIndex, endCol: target.colIndex, count: 0 };
        }

        return {
          type: 'individual',
          columns: colArray,
          startCol: Math.min(...colArray),
          endCol: Math.max(...colArray),
          count: colArray.length
        };
      } else if (selectedRange.start.colIndex !== null) {
        return {
          type: 'range',
          startCol: selectedRange.start.colIndex,
          endCol: selectedRange.end.colIndex,
          count: selectedRange.end.colIndex - selectedRange.start.colIndex + 1
        };
      }
      return { type: 'none', startCol: target.colIndex, endCol: target.colIndex, count: 1 };
    };

    switch (action) {
    case 'clear-cell-data': {
      // 개별 셀 선택이 있는 경우 선택된 모든 셀의 데이터 삭제
      if (selectedCellsIndividual.size > 0) {
        for (const cellKey of selectedCellsIndividual) {
          const [rowStr, colStr] = cellKey.split('_');
          const rowIndex = parseInt(rowStr, 10);
          const colIndex = parseInt(colStr, 10);
          const columnMeta = allColumnsMeta.value.find(c => c.colIndex === colIndex);

          if (columnMeta) {
            await storeBridge.dispatch('clearCellData', {
              rowIndex,
              colIndex,
              type: columnMeta.type
            });
          }
        }
      } else {
        // 개별 선택이 없는 경우 우클릭한 셀의 데이터만 삭제
        const columnMeta = allColumnsMeta.value.find(c => c.colIndex === target.colIndex);
        if (columnMeta) {
          await storeBridge.dispatch('clearCellData', {
            rowIndex: target.rowIndex,
            colIndex: target.colIndex,
            type: columnMeta.type
          });
        }
      }
      break;
    }
    case 'add-row-above': {
      const rowSelection = getEffectiveRowSelection();
      await storeBridge.dispatch('insertRowAt', {
        index: rowSelection.startRow,
        count: rowSelection.count
      });
      break;
    }
    case 'add-row-below': {
      const rowSelection = getEffectiveRowSelection();
      await storeBridge.dispatch('insertRowAt', {
        index: rowSelection.endRow + 1,
        count: rowSelection.count
      });
      break;
    }
    case 'delete-rows': {
      const rowSelection = getEffectiveRowSelection();
      if (rowSelection.type === 'individual') {
        // 개별 선택된 행들을 역순으로 삭제 (인덱스 변화 방지)
        const sortedRows = rowSelection.rows.sort((a, b) => b - a);
        for (const rowIndex of sortedRows) {
          await storeBridge.dispatch('deleteMultipleRows', {
            startRow: rowIndex,
            endRow: rowIndex
          });
        }
      } else {
        await storeBridge.dispatch('deleteMultipleRows', {
          startRow: rowSelection.startRow,
          endRow: rowSelection.endRow
        });
      }
      break;
    }
    case 'add-col-left':
    case 'add-col-right': {
      // 변경 전 상태 저장
      const oldColumnsMeta = [...allColumnsMeta.value];
      const colSelection = getEffectiveColumnSelection();
      const targetColumn = allColumnsMeta.value.find(c => c.colIndex === target.colIndex);

      if (!targetColumn || !targetColumn.type || ![COL_TYPE_BASIC, 'clinicalSymptoms', 'dietInfo'].includes(targetColumn.type)) break;

      let insertAtIndex;
      if (action === 'add-col-right') {
        const rightmostColumn = allColumnsMeta.value.find(c => c.colIndex === colSelection.endCol);
        insertAtIndex = rightmostColumn ? rightmostColumn.cellIndex + 1 : 0;
      } else {
        const leftmostColumn = allColumnsMeta.value.find(c => c.colIndex === colSelection.startCol);
        insertAtIndex = leftmostColumn ? leftmostColumn.cellIndex : 0;
      }

      devLog(`[ContextMenu] 열 추가 시작: ${action}, 타입: ${targetColumn.type}, 개수: ${colSelection.count}, 위치: ${insertAtIndex}`);

      // 데이터 변경 수행
      await storeBridge.dispatch('insertMultipleColumnsAt', {
        type: targetColumn.type,
        count: colSelection.count,
        index: insertAtIndex
      });

      // 변경 후 검증 오류 재매핑
      nextTick(() => {
        const newColumnsMeta = allColumnsMeta.value;

        devLog('[ContextMenu] 에러 재매핑 조건 확인:', {
          hasValidationManager: !!validationManager,
          oldColumnsLength: oldColumnsMeta.length,
          newColumnsLength: newColumnsMeta.length,
          lengthChanged: oldColumnsMeta.length !== newColumnsMeta.length
        });

        if (validationManager && oldColumnsMeta.length !== newColumnsMeta.length) {
          devLog(`[ContextMenu] 열 구조 변경 감지: ${oldColumnsMeta.length} -> ${newColumnsMeta.length}, 에러 재매핑 시작`);

          // ValidationManager의 columnMetas 업데이트
          validationManager.updateColumnMetas(newColumnsMeta);

          // 에러 재매핑 수행
          validationManager.remapValidationErrorsByColumnIdentity(oldColumnsMeta, newColumnsMeta);

          devLog('[ContextMenu] 에러 재매핑 완료');

          // 추가: dietInfo / clinicalSymptoms 등 배열 기반 열은 cellIndex 이동 시
          // 일부 오류가 누락될 수 있으므로 전체 타입 열을 다시 검증한다.
          if (validationManager) {
            const affectedType = targetColumn.type;
            if (['clinicalSymptoms', 'dietInfo'].includes(affectedType)) {
              const colIndices = newColumnsMeta
                .filter(meta => meta.type === affectedType)
                .map(meta => meta.colIndex);
              const rowsData = storeBridge.state.rows;
              validationManager.revalidateColumns(colIndices, rowsData, newColumnsMeta);
              devLog(`[ContextMenu] ${affectedType} 열 재검증 완료`);
            }
          }
        } else {
          devLog('[ContextMenu] 에러 재매핑 건너뜀 - 조건 미충족');
        }
      });
      break;
    }
    case 'delete-cols': {
      const colSelection = getEffectiveColumnSelection();
      // 변경 전 상태 저장 (사용하지 않으므로 제거)
      // const oldColumnsMeta = [...allColumnsMeta.value];

      // 1. 각 그룹별 전체 열의 개수를 계산합니다.
      const totalCounts = allColumnsMeta.value.reduce((acc, col) => {
        if ([COL_TYPE_BASIC, 'clinicalSymptoms', 'dietInfo'].includes(col.type)) {
          if (!acc[col.type]) acc[col.type] = 0;
          acc[col.type]++;
        }
        return acc;
      }, {});

      // 2. 선택된 열들의 개수를 그룹별로 계산합니다.
      const selectedCounts = {};
      const columnsToCheck = colSelection.type === 'individual' ? colSelection.columns :
        Array.from({ length: colSelection.endCol - colSelection.startCol + 1 }, (_, i) => colSelection.startCol + i);

      for (const colIndex of columnsToCheck) {
        const meta = allColumnsMeta.value.find(c => c.colIndex === colIndex);
        if (meta && [COL_TYPE_BASIC, 'clinicalSymptoms', 'dietInfo'].includes(meta.type)) {
          if (!selectedCounts[meta.type]) selectedCounts[meta.type] = 0;
          selectedCounts[meta.type]++;
        }
      }

      // 3. "최소 1개 열 남기기" 규칙을 위반하지 않는 열만 필터링합니다.
      const columnsToDelete = [];
      for (const colIndex of columnsToCheck) {
        const meta = allColumnsMeta.value.find(c => c.colIndex === colIndex);
        if (meta && [COL_TYPE_BASIC, 'clinicalSymptoms', 'dietInfo'].includes(meta.type)) {
          // 해당 그룹의 전체 열 개수에서 선택된 열 개수를 뺐을 때 1개 이상 남는 경우에만 삭제 목록에 추가합니다.
          if (totalCounts[meta.type] - selectedCounts[meta.type] >= 1) {
            columnsToDelete.push({ type: meta.type, index: meta.cellIndex });
          }
        }
      }

      if (columnsToDelete.length > 0) {
        devLog(`[ContextMenu] 열 삭제 시작: ${columnsToDelete.length}개 열 삭제`);
        devLog('[ContextMenu] 삭제할 열들:', columnsToDelete.map(c => `${c.type}[${c.index}]`).join(', '));

        // 데이터 변경 수행
        await storeBridge.dispatch('deleteMultipleColumnsByIndex', { columns: columnsToDelete });

        // StoreBridge에서 이미 에러 재매핑을 처리하므로 여기서는 건너뜀
        devLog('[ContextMenu] 열 삭제 완료 - StoreBridge에서 에러 재매핑 처리됨');
      } else {
        devLog('[ContextMenu] 삭제할 수 있는 열이 없음 (최소 1개 열 유지 규칙)');
      }
      break;
    }
    case 'delete-empty-rows':
      await storeBridge.dispatch('deleteEmptyRows');
      break;
    case 'clear-rows-data': {
      const rowSelection = getEffectiveRowSelection();
      if (rowSelection.type === 'individual') {
        // 개별 선택된 행들의 데이터 삭제
        for (const rowIndex of rowSelection.rows) {
          await storeBridge.dispatch('clearMultipleRowsData', {
            startRow: rowIndex,
            endRow: rowIndex
          });
        }
      } else {
        await storeBridge.dispatch('clearMultipleRowsData', {
          startRow: rowSelection.startRow,
          endRow: rowSelection.endRow
        });
      }
      break;
    }
    case 'clear-cols-data': {
      const colSelection = getEffectiveColumnSelection();
      const columnsToCheck = colSelection.type === 'individual' ? colSelection.columns :
        Array.from({ length: colSelection.endCol - colSelection.startCol + 1 }, (_, i) => colSelection.startCol + i);

      const columnsToClear = [];
      for (const colIndex of columnsToCheck) {
        const meta = allColumnsMeta.value.find(c => c.colIndex === colIndex);
        if (meta) columnsToClear.push(meta);
      }

      const fixedColumnTypes = [COL_TYPE_IS_PATIENT, COL_TYPE_CONFIRMED_CASE, COL_TYPE_ONSET, COL_TYPE_INDIVIDUAL_EXPOSURE];

      for (const col of columnsToClear) {
        if (fixedColumnTypes.includes(col.type)) {
          await storeBridge.dispatch('clearFixedColumnData', { type: col.type });
        } else if (col.type && col.cellIndex !== null && col.cellIndex !== undefined) {
          // 올바른 파라미터로 clearColumnData 호출
          await storeBridge.dispatch('clearColumnData', {
            type: col.type,
            index: col.cellIndex
          });
        }
      }
      break;
    }
    case 'filter-patient-1':
    case 'filter-patient-0':
    case 'filter-patient-empty': {
      let value;
      if (action === 'filter-patient-1') value = '1';
      else if (action === 'filter-patient-0') value = '0';
      else value = 'empty';

      devLog('[Filter] 필터 토글 전 상태:', {
        action,
        value,
        currentFilterState: storeBridge.filterState,
        activeFilters: Array.from(storeBridge.filterState.activeFilters.entries())
      });

      // 필터 변경 전 상태 백업
      const oldFilterState = JSON.stringify(storeBridge.filterState);

      await storeBridge.togglePatientFilter(value);

      // 필터 상태가 실제로 변경된 경우에만 스냅샷 캡처
      if (oldFilterState !== JSON.stringify(storeBridge.filterState)) {
        captureSnapshotWithFilter('filter_change', {
          action,
          filterType: 'patient',
          value,
          oldFilterState: JSON.parse(oldFilterState),
          newFilterState: { ...storeBridge.filterState }
        });
      }

      devLog('[Filter] 필터 토글 후 상태:', {
        action,
        value,
        currentFilterState: storeBridge.filterState,
        activeFilters: Array.from(storeBridge.filterState.activeFilters.entries())
      });

      // 강제로 filterState 업데이트하여 filteredRows computed가 재실행되도록 함
      filterState.value = { ...storeBridge.filterState };

      devLog('[Filter] filterState.value 강제 업데이트 완료');
      devLog(`[Filter] 환자여부 필터 토글: ${value}`);
      break;
    }
    case 'filter-confirmed-1':
    case 'filter-confirmed-0':
    case 'filter-confirmed-empty': {
      let value;
      if (action === 'filter-confirmed-1') value = '1';
      else if (action === 'filter-confirmed-0') value = '0';
      else value = 'empty';

      devLog('[Filter] 확진여부 필터 토글 전 상태:', {
        action,
        value,
        colIndex: target.colIndex,
        currentFilterState: storeBridge.filterState
      });

      // 필터 변경 전 상태 백업
      const oldFilterState = JSON.stringify(storeBridge.filterState);

      await storeBridge.toggleConfirmedFilter(target.colIndex, value);

      // 필터 상태가 실제로 변경된 경우에만 스냅샷 캡처
      if (oldFilterState !== JSON.stringify(storeBridge.filterState)) {
        captureSnapshotWithFilter('filter_change', {
          action,
          filterType: 'confirmed',
          colIndex: target.colIndex,
          value,
          oldFilterState: JSON.parse(oldFilterState),
          newFilterState: { ...storeBridge.filterState }
        });
      }

      devLog('[Filter] 확진여부 필터 토글 후 상태:', {
        action,
        value,
        colIndex: target.colIndex,
        currentFilterState: storeBridge.filterState
      });

      // 강제로 filterState 업데이트하여 filteredRows computed가 재실행되도록 함
      filterState.value = { ...storeBridge.filterState };

      devLog('[Filter] filterState.value 강제 업데이트 완료');
      devLog(`[Filter] 확진여부 필터 토글: ${value}`);
      break;
    }
    case 'filter-clinical-1':
    case 'filter-clinical-0':
    case 'filter-clinical-empty': {
      let value;
      if (action === 'filter-clinical-1') value = '1';
      else if (action === 'filter-clinical-0') value = '0';
      else value = 'empty';

      devLog('[Filter] 임상증상 필터 토글 전 상태:', {
        action,
        value,
        colIndex: target.colIndex,
        currentFilterState: storeBridge.filterState
      });

      // 필터 변경 전 상태 백업
      const oldFilterState = JSON.stringify(storeBridge.filterState);

      await storeBridge.toggleClinicalFilter(target.colIndex, value);

      // 필터 상태가 실제로 변경된 경우에만 스냅샷 캡처
      if (oldFilterState !== JSON.stringify(storeBridge.filterState)) {
        captureSnapshotWithFilter('filter_change', {
          action,
          filterType: 'clinical',
          colIndex: target.colIndex,
          value,
          oldFilterState: JSON.parse(oldFilterState),
          newFilterState: { ...storeBridge.filterState }
        });
      }

      devLog('[Filter] 임상증상 필터 토글 후 상태:', {
        action,
        value,
        colIndex: target.colIndex,
        currentFilterState: storeBridge.filterState
      });

      // 강제로 filterState 업데이트하여 filteredRows computed가 재실행되도록 함
      filterState.value = { ...storeBridge.filterState };

      devLog('[Filter] filterState.value 강제 업데이트 완료');
      devLog(`[Filter] 임상증상 필터 토글: ${value}`);
      break;
    }
    case 'filter-diet-1':
    case 'filter-diet-0':
    case 'filter-diet-empty': {
      let value;
      if (action === 'filter-diet-1') value = '1';
      else if (action === 'filter-diet-0') value = '0';
      else value = 'empty';

      devLog('[Filter] 식단 필터 토글 전 상태:', {
        action,
        value,
        colIndex: target.colIndex,
        currentFilterState: storeBridge.filterState
      });

      // 필터 변경 전 상태 백업
      const oldFilterState = JSON.stringify(storeBridge.filterState);

      await storeBridge.toggleDietFilter(target.colIndex, value);

      // 필터 상태가 실제로 변경된 경우에만 스냅샷 캡처
      if (oldFilterState !== JSON.stringify(storeBridge.filterState)) {
        captureSnapshotWithFilter('filter_change', {
          action,
          filterType: 'diet',
          colIndex: target.colIndex,
          value,
          oldFilterState: JSON.parse(oldFilterState),
          newFilterState: { ...storeBridge.filterState }
        });
      }

      devLog('[Filter] 식단 필터 토글 후 상태:', {
        action,
        value,
        colIndex: target.colIndex,
        currentFilterState: storeBridge.filterState
      });

      // 강제로 filterState 업데이트하여 filteredRows computed가 재실행되도록 함
      filterState.value = { ...storeBridge.filterState };

      devLog('[Filter] filterState.value 강제 업데이트 완료');
      devLog(`[Filter] 식단 필터 토글: ${value}`);
      break;
    }
    case 'filter-basic-empty': {
      devLog('[Filter] 기본정보 빈 셀 필터:', {
        action,
        colIndex: target.colIndex,
        currentFilterState: storeBridge.filterState
      });

      // 필터 변경 전 상태 백업
      const oldFilterState = JSON.stringify(storeBridge.filterState);

      await storeBridge.toggleBasicFilter(target.colIndex, 'empty');

      // 필터 상태가 실제로 변경된 경우에만 스냅샷 캡처
      if (oldFilterState !== JSON.stringify(storeBridge.filterState)) {
        captureSnapshotWithFilter('filter_change', {
          action,
          filterType: 'basic',
          colIndex: target.colIndex,
          value: 'empty',
          oldFilterState: JSON.parse(oldFilterState),
          newFilterState: { ...storeBridge.filterState }
        });
      }

      // 강제로 filterState 업데이트하여 filteredRows computed가 재실행되도록 함
      filterState.value = { ...storeBridge.filterState };

      devLog('[Filter] 기본정보 빈 셀 필터 적용');
      break;
    }
    default: {
      // 기본정보 값 필터 (동적 액션 처리)
      if (action.startsWith('filter-basic-')) {
        const value = action.replace('filter-basic-', '');
        devLog('[Filter] 기본정보 값 필터:', {
          action,
          value,
          colIndex: target.colIndex,
          currentFilterState: storeBridge.filterState
        });

        // 필터 변경 전 상태 백업
        const oldFilterState = JSON.stringify(storeBridge.filterState);

        await storeBridge.toggleBasicFilter(target.colIndex, value);

        // 필터 상태가 실제로 변경된 경우에만 스냅샷 캡처
        if (oldFilterState !== JSON.stringify(storeBridge.filterState)) {
          captureSnapshotWithFilter('filter_change', {
            action,
            filterType: 'basic',
            colIndex: target.colIndex,
            value,
            oldFilterState: JSON.parse(oldFilterState),
            newFilterState: { ...storeBridge.filterState }
          });
        }

        // 강제로 filterState 업데이트하여 filteredRows computed가 재실행되도록 함
        filterState.value = { ...storeBridge.filterState };

        devLog('[Filter] 기본정보 값 필터 적용:', value);
      }
      // 날짜/시간 필터 (동적 액션 처리)
      else if (action.startsWith('filter-datetime-')) {
        const dateValue = action.replace('filter-datetime-', '');
        devLog('[Filter] 날짜/시간 필터:', {
          action,
          dateValue,
          colIndex: target.colIndex,
          currentFilterState: storeBridge.filterState
        });

        // 필터 변경 전 상태 백업
        const oldFilterState = JSON.stringify(storeBridge.filterState);

        await storeBridge.toggleDateTimeFilter(target.colIndex, dateValue);

        // 필터 상태가 실제로 변경된 경우에만 스냅샷 캡처
        if (oldFilterState !== JSON.stringify(storeBridge.filterState)) {
          captureSnapshotWithFilter('filter_change', {
            action,
            filterType: 'datetime',
            colIndex: target.colIndex,
            value: dateValue,
            oldFilterState: JSON.parse(oldFilterState),
            newFilterState: { ...storeBridge.filterState }
          });
        }

        // 강제로 filterState 업데이트하여 filteredRows computed가 재실행되도록 함
        filterState.value = { ...storeBridge.filterState };

        devLog('[Filter] 날짜/시간 필터 적용:', dateValue);
      }
      break;
    }
    case 'clear-all-filters': {
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

      devLog('[Filter] 모든 필터 해제됨');
      break;
    }
    }

    // 작업 완료 후 개별 선택 상태 초기화
    selectionSystem.clearIndividualSelections();
  }

  return {
    onContextMenu,
    onContextMenuSelect
  };
}
