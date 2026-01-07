
import { ref, computed, nextTick, watch } from 'vue';
import {
  COL_TYPE_SERIAL,
  COL_TYPE_IS_PATIENT,
  COL_TYPE_CONFIRMED_CASE,
  COL_TYPE_BASIC,
  COL_TYPE_CLINICAL,
  COL_TYPE_ONSET,
  COL_TYPE_DIET,
  COL_TYPE_INDIVIDUAL_EXPOSURE,
  COLUMN_STYLES,
  COL_IDX_SERIAL,
  COL_IDX_IS_PATIENT
} from '../constants/index.js';
import { logger, devLog } from '../../../utils/logger.js';
import { showToast } from '../logic/toast.js';

export function useGridColumns(storeBridge, validationManager, selectionSystem, focusGrid, tryStartOperation, endOperation) {
  // --- State ---
  // 개별 노출시간 열 토글 시 백업 데이터 저장용
  const individualExposureBackupData = ref([]);
  // 확진자 여부 열 토글 시 백업 데이터 저장용
  const confirmedCaseBackupData = ref([]);

  // --- Computed Properties ---
  const headers = computed(() => storeBridge.headers || { basic: [], clinical: [], diet: [] });
  const rows = computed(() => storeBridge.rows || []);

  const allColumnsMeta = computed(() => {
    const meta = [];
    let currentColIndex = 0;
    let currentOffsetLeft = 0;

    const pushMeta = (columnData) => {
      const width = parseInt(columnData.style?.width || '80px', 10);
      meta.push({
        ...columnData,
        colIndex: currentColIndex,
        offsetLeft: currentOffsetLeft
      });
      currentOffsetLeft += width;
      currentColIndex++;
    };

    // 연번 컬럼
    pushMeta({
      type: COL_TYPE_SERIAL,
      headerText: '연번',
      headerRow: 1,
      isEditable: false,
      style: COLUMN_STYLES[COL_TYPE_SERIAL],
      dataKey: null,
      cellIndex: null
    });

    // 환자여부 컬럼
    pushMeta({
      type: COL_TYPE_IS_PATIENT,
      headerText: '환자여부 <br />(환자 O - 1, 정상 - 0)',
      headerRow: 1,
      isEditable: true,
      style: COLUMN_STYLES[COL_TYPE_IS_PATIENT],
      dataKey: 'isPatient',
      cellIndex: null
    });

    // '확진자 여부' 열을 조건부로 추가
    if (storeBridge.state.settings.isConfirmedCaseColumnVisible) {
      pushMeta({
        type: COL_TYPE_CONFIRMED_CASE,
        headerText: '확진여부 <br />(확진 O - 1, X - 0)',
        headerRow: 1,
        isEditable: true,
        style: COLUMN_STYLES[COL_TYPE_CONFIRMED_CASE],
        dataKey: 'isConfirmedCase',
        cellIndex: null,
        isCustom: true
      });
    }

    // 기본정보 컬럼들
    const basicHeaders = headers.value.basic || [];
    basicHeaders.forEach((header, index) => {
      pushMeta({
        type: COL_TYPE_BASIC,
        headerText: header,
        headerRow: 2,
        isEditable: true,
        style: COLUMN_STYLES.default,
        dataKey: 'basicInfo',
        cellIndex: index
      });
    });

    // 임상증상 컬럼들
    const clinicalHeaders = headers.value.clinical || [];
    clinicalHeaders.forEach((header, index) => {
      pushMeta({
        type: 'clinicalSymptoms',
        headerText: header,
        headerRow: 2,
        isEditable: true,
        style: COLUMN_STYLES.default,
        dataKey: 'clinicalSymptoms',
        cellIndex: index
      });
    });

    // '개별 노출시간' 열을 조건부로 추가
    if (storeBridge.state.settings.isIndividualExposureColumnVisible) {
      pushMeta({
        type: COL_TYPE_INDIVIDUAL_EXPOSURE,
        headerText: '의심원 노출시간',
        headerRow: 1,
        isEditable: true,
        style: COLUMN_STYLES[COL_TYPE_ONSET],
        dataKey: 'individualExposureTime',
        cellIndex: null,
        isCustom: true
      });
    }

    // 증상발현시간 컬럼
    pushMeta({
      type: COL_TYPE_ONSET,
      headerText: '증상발현시간',
      headerRow: 1,
      isEditable: true,
      style: COLUMN_STYLES[COL_TYPE_ONSET],
      dataKey: 'symptomOnset',
      cellIndex: null
    });

    // 식단 컬럼들
    const dietHeaders = headers.value.diet || [];
    dietHeaders.forEach((header, index) => {
      pushMeta({
        type: 'dietInfo',
        headerText: header,
        headerRow: 2,
        isEditable: true,
        style: COLUMN_STYLES.default,
        dataKey: 'dietInfo',
        cellIndex: index
      });
    });

    return meta;
  });

  const headerGroups = computed(() => {
    const groups = [];
    const basicLength = headers.value.basic?.length || 0;
    const clinicalLength = headers.value.clinical?.length || 0;
    const dietLength = headers.value.diet?.length || 0;
    let currentCol = 0;

    // 연번
    groups.push({
      text: '연번',
      rowspan: 2,
      startColIndex: COL_IDX_SERIAL,
      style: COLUMN_STYLES[COL_TYPE_SERIAL]
    });
    currentCol++;

    // 환자여부
    groups.push({
      text: '환자여부 <br />(환자 O - 1, 정상 - 0)',
      rowspan: 2,
      startColIndex: COL_IDX_IS_PATIENT,
      style: COLUMN_STYLES[COL_TYPE_IS_PATIENT]
    });
    currentCol++;

    // '확진자 여부' 열이 있다면, 여기에 그룹 추가
    if (storeBridge.state.settings.isConfirmedCaseColumnVisible) {
      groups.push({
        text: '확진여부 <br />(확진 O - 1, X - 0)',
        rowspan: 2,
        startColIndex: currentCol,
        style: COLUMN_STYLES[COL_TYPE_CONFIRMED_CASE]
      });
      currentCol++;
    }

    // 기본정보
    const basicStartCol = currentCol;
    if (basicLength > 0) {
      groups.push({
        text: '기본정보',
        colspan: basicLength,
        startColIndex: basicStartCol,
        type: COL_TYPE_BASIC,
        addable: true,
        deletable: true,
        columnCount: basicLength
      });
      currentCol += basicLength;
    } else {
      groups.push({
        text: '기본정보',
        colspan: 1,
        startColIndex: basicStartCol,
        type: COL_TYPE_BASIC,
        addable: true,
        deletable: false,
        columnCount: 0,
        style: { minWidth: '60px' }
      });
      currentCol++;
    }

    // 임상증상
    const clinicalStartCol = currentCol;
    if (clinicalLength > 0) {
      groups.push({
        text: '임상증상 (증상 O - 1, 증상 X - 0)',
        colspan: clinicalLength,
        startColIndex: clinicalStartCol,
        type: COL_TYPE_CLINICAL,
        addable: true,
        deletable: true,
        columnCount: clinicalLength
      });
      currentCol += clinicalLength;
    } else {
      groups.push({
        text: '임상증상 (증상 O - 1, 증상 X - 0)',
        colspan: 1,
        startColIndex: clinicalStartCol,
        type: COL_TYPE_CLINICAL,
        addable: true,
        deletable: false,
        columnCount: 0,
        style: { minWidth: '60px' }
      });
      currentCol++;
    }

    // '개별 노출시간' 열이 있다면, 여기에 그룹 추가
    if (storeBridge.state.settings.isIndividualExposureColumnVisible) {
      const exposureStartCol = currentCol;
      groups.push({
        text: '의심원 노출시간',
        rowspan: 2,
        startColIndex: exposureStartCol,
        style: COLUMN_STYLES[COL_TYPE_ONSET]
      });
      currentCol++;
    }

    // 증상발현시간
    const onsetStartCol = currentCol;
    groups.push({
      text: '증상발현시간',
      rowspan: 2,
      startColIndex: onsetStartCol,
      style: COLUMN_STYLES[COL_TYPE_ONSET]
    });
    currentCol++;

    // 식단
    const dietStartCol = currentCol;
    if (dietLength > 0) {
      groups.push({
        text: '식단 (섭취 O - 1, 섭취 X - 0)',
        colspan: dietLength,
        startColIndex: dietStartCol,
        type: COL_TYPE_DIET,
        addable: true,
        deletable: true,
        columnCount: dietLength
      });
    } else {
      groups.push({
        text: '식단 (섭취 O - 1, 섭취 X - 0)',
        colspan: 1,
        startColIndex: dietStartCol,
        type: COL_TYPE_DIET,
        addable: true,
        deletable: false,
        columnCount: 0,
        style: { minWidth: '60px' }
      });
    }

    return groups;
  });

  const tableWidth = computed(() => {
    return (
      `${allColumnsMeta.value.reduce((total, column) => {
        const widthString = column.style?.width || '80px';
        return total + parseInt(widthString, 10);
      }, 0)}px`
    );
  });

  // --- Handlers ---

  function mapGroupTypeToMetaType(groupType) {
    if (groupType === COL_TYPE_CLINICAL) return 'clinicalSymptoms';
    if (groupType === COL_TYPE_DIET) return 'dietInfo';
    return groupType;
  }

  function getHeaderArrayByType(type) {
    switch (type) {
    case COL_TYPE_BASIC:
      return headers.value.basic || [];
    case COL_TYPE_CLINICAL:
      return headers.value.clinical || [];
    case COL_TYPE_DIET:
      return headers.value.diet || [];
    default:
      return [];
    }
  }

  async function onToggleExposureColumn() {
    const current = storeBridge.state.settings.isIndividualExposureColumnVisible;
    const isAdding = !current;

    logger.debug('onToggleExposureColumn 호출됨', { current, isAdding });

    const exposureInsertIndex = storeBridge.symptomOnsetStartIndex;

    const individualExposureColumnIndex = allColumnsMeta.value.findIndex(col =>
      col.type === 'individualExposureTime' ||
            (col.dataKey === 'individualExposureTime' && col.cellIndex === 0)
    );

    if (!isAdding && individualExposureColumnIndex >= 0) {
      const currentData = rows.value || [];
      individualExposureBackupData.value = currentData.map((row, rowIndex) => {
        const value = row.individualExposureTime || '';
        return { rowIndex, value };
      }).filter(item => item.value !== '' && item.value !== null && item.value !== undefined);

      logger.debug('백업된 개별 노출시간 데이터:', individualExposureBackupData.value);
    }

    const oldColumnsMeta = [...allColumnsMeta.value];

    try {
      await storeBridge.dispatch('settings/setIndividualExposureColumnVisibility', !current);
    } catch (error) {
      logger.error('개별 노출시간 열 가시성 변경 실패:', error);
      showToast('개별 노출시간 열 가시성 변경 중 오류가 발생했습니다.', 'error');
      return;
    }

    nextTick(() => {
      const newColumnsMeta = allColumnsMeta.value;
      if (validationManager && oldColumnsMeta.length !== newColumnsMeta.length) {
        logger.debug('컬럼 구조 변경 감지 - 에러 재매핑 시작');
        validationManager.remapValidationErrorsByColumnIdentity(oldColumnsMeta, newColumnsMeta);
      }
    });

    if (isAdding && individualExposureBackupData.value.length > 0) {
      devLog('백업된 데이터가 있음 - 검증 실행');

      nextTick(() => {
        const newIndividualExposureColumnIndex = allColumnsMeta.value.findIndex(col =>
          col.type === 'individualExposureTime' ||
                    (col.dataKey === 'individualExposureTime' && col.cellIndex === 0)
        );

        devLog('찾은 새 열 인덱스:', newIndividualExposureColumnIndex);

        if (newIndividualExposureColumnIndex >= 0) {
          validationManager.validateIndividualExposureColumn(
            individualExposureBackupData.value,
            newIndividualExposureColumnIndex,
            (progress) => {
              if (individualExposureBackupData.value.length > 100 && progress === 100) {
                showToast(`개별 노출시간 열 ${individualExposureBackupData.value.length}개 셀의 유효성검사를 완료했습니다.`, 'success');
              }
            }
          );
        } else {
          logger.error('새로운 개별 노출시간 열 인덱스를 찾을 수 없습니다!');
          logger.debug('대안으로 exposureInsertIndex 사용:', exposureInsertIndex);
          // (Legacy logic retained): validationManager.validateIndividualExposureColumn(...)
        }

        individualExposureBackupData.value = [];
      });
    }

    selectionSystem.clearSelection();
    nextTick(() => {
      if (focusGrid) focusGrid();
    });
  }

  async function onToggleConfirmedCaseColumn() {
    const current = storeBridge.state.settings.isConfirmedCaseColumnVisible;
    const isAdding = !current;

    logger.debug(`확진여부 열 토글 시작: 현재 상태 ${current} -> ${!current} (${isAdding ? '추가' : '제거'})`);

    const confirmedCaseColumnIndex = allColumnsMeta.value.findIndex(col =>
      col.type === 'isConfirmedCase' ||
            (col.dataKey === 'isConfirmedCase' && col.cellIndex === null)
    );

    if (!isAdding && confirmedCaseColumnIndex >= 0) {
      const currentData = rows.value || [];
      confirmedCaseBackupData.value = currentData.map((row, rowIndex) => {
        const value = row.isConfirmedCase || '';
        return { rowIndex, value };
      }).filter(item => item.value !== '' && item.value !== null && item.value !== undefined);

      devLog(`[SpecialColumn] 확진여부 데이터 백업 완료: ${confirmedCaseBackupData.value.length}개 항목`);
    }

    const oldColumnsMeta = [...allColumnsMeta.value];

    try {
      await storeBridge.dispatch('settings/setConfirmedCaseColumnVisibility', !current);
    } catch (error) {
      logger.error('확진자 여부 열 가시성 변경 실패:', error);
      showToast('확진자 여부 열 가시성 변경 중 오류가 발생했습니다.', 'error');
      return;
    }

    nextTick(() => {
      const newColumnsMeta = allColumnsMeta.value;
      if (validationManager && oldColumnsMeta.length !== newColumnsMeta.length) {
        validationManager.updateColumnMetas(newColumnsMeta);
        validationManager.remapValidationErrorsByColumnIdentity(oldColumnsMeta, newColumnsMeta);
      }
    });

    if (isAdding && confirmedCaseBackupData.value.length > 0) {
      devLog(`[SpecialColumn] 백업 데이터 기반 검증 시작: ${confirmedCaseBackupData.value.length}개 셀`);

      nextTick(() => {
        const newConfirmedCaseColumnIndex = allColumnsMeta.value.findIndex(col =>
          col.type === 'isConfirmedCase' ||
                    (col.dataKey === 'isConfirmedCase' && col.cellIndex === null)
        );

        if (newConfirmedCaseColumnIndex >= 0) {
          validationManager.validateConfirmedCaseColumn(
            confirmedCaseBackupData.value,
            newConfirmedCaseColumnIndex,
            (progress) => {
              if (confirmedCaseBackupData.value.length > 100 && progress === 100) {
                showToast(`확진자 여부 열 ${confirmedCaseBackupData.value.length}개 셀의 유효성검사를 완료했습니다.`, 'success');
              }
            }
          );
        } else {
          logger.error('새로운 확진자 여부 열 인덱스를 찾을 수 없습니다!');
        }
        confirmedCaseBackupData.value = [];
      });
    }

    selectionSystem.clearSelection();
    nextTick(() => {
      if (focusGrid) focusGrid();
    });
  }

  function onAddColumn(groupType) {
    if (!tryStartOperation('add_column', { blocking: true, timeout: 5000 })) {
      return;
    }

    // Note: DateTimePicker closing logic should be handled by the caller or global click handler

    const oldColumnsMeta = [...allColumnsMeta.value];
    const arr = getHeaderArrayByType(groupType);
    const insertIndex = arr.length;
    const metaType = mapGroupTypeToMetaType(groupType);

    devLog(`[HeaderButton] 열 추가 시작: 그룹타입 ${groupType}, 메타타입 ${metaType}, 위치 ${insertIndex}`);

    storeBridge.dispatch('insertMultipleColumnsAt', {
      type: metaType,
      count: 1,
      index: insertIndex
    });

    nextTick(() => {
      const newColumnsMeta = allColumnsMeta.value;

      if (validationManager && oldColumnsMeta.length !== newColumnsMeta.length) {
        devLog(`[HeaderButton] 열 구조 변경 감지: ${oldColumnsMeta.length} -> ${newColumnsMeta.length}, 에러 재매핑 시작`);

        validationManager.updateColumnMetas(newColumnsMeta);
        validationManager.remapValidationErrorsByColumnIdentity(oldColumnsMeta, newColumnsMeta);

        devLog('[HeaderButton] 에러 재매핑 완료');
      }
    });

    selectionSystem.clearSelection();
    nextTick(() => {
      if (focusGrid) focusGrid();
    });

    endOperation('add_column');
  }

  function onDeleteColumn(groupType) {
    if (!tryStartOperation('delete_column', { blocking: true, timeout: 5000 })) {
      return;
    }

    const arr = getHeaderArrayByType(groupType);

    if (arr.length <= 1) {
      devLog(`[HeaderButton] 열 삭제 불가: 최소 1개 열 유지 규칙 (현재 ${arr.length}개)`);
      return;
    }

    const deleteIndex = arr.length - 1;
    const metaType = mapGroupTypeToMetaType(groupType);

    devLog(`[HeaderButton] 열 삭제 시작: 그룹타입 ${groupType}, 메타타입 ${metaType}, 위치 ${deleteIndex}`);

    storeBridge.dispatch('deleteMultipleColumnsByIndex', {
      columns: [{ type: metaType, index: deleteIndex }]
    });

    devLog('[HeaderButton] 열 삭제 완료 - StoreBridge에서 에러 재매핑 처리됨');

    selectionSystem.clearSelection();
    nextTick(() => {
      if (focusGrid) focusGrid();
    });

    endOperation('delete_column');
  }

  function onDeleteEmptyCols() {
    storeBridge.dispatch('epidemic/deleteEmptyColumns');
    showToast('비어있는 열이 삭제되었습니다.', 'info');
  }

  function onResetSheet() {
    if (confirm('모든 데이터를 초기화하시겠습니까?')) {
      storeBridge.dispatch('epidemic/resetSheet');
      selectionSystem.clearSelection();
      showToast('시트가 초기화되었습니다.', 'success');
      nextTick(() => {
        if (focusGrid) focusGrid();
      });
    }
  }

  // --- Watchers ---
  // allColumnsMeta 변경 시 ValidationManager 업데이트
  watch(allColumnsMeta, (newColumnMetas) => {
    if (validationManager && newColumnMetas.length > 0) {
      validationManager.updateColumnMetas(newColumnMetas);
    }

    // StoreBridge에도 업데이트 (for backend sync)
    if (storeBridge.bridge) {
      storeBridge.bridge.setColumnMetas(newColumnMetas);
    }
  }, { deep: true });


  return {
    allColumnsMeta,
    headerGroups,
    tableWidth,
    individualExposureBackupData,
    confirmedCaseBackupData,
    onToggleExposureColumn,
    onToggleConfirmedCaseColumn,
    onAddColumn,
    onDeleteColumn,
    onDeleteEmptyCols,
    onResetSheet
  };
}
