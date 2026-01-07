/**
 * Cell editing handlers for DataInputVirtualScroll
 */

import { calculatePickerPosition } from '../utils/uiUtils.js';

// 컬럼 타입 상수
const COL_TYPE_IS_PATIENT = 'isPatient';
const COL_TYPE_BASIC = 'basic';
const COL_TYPE_ONSET = 'symptomOnset';
const COL_TYPE_INDIVIDUAL_EXPOSURE = 'individualExposureTime';

/**
 * 네비게이션 함수 (virtualKeyboardHandlers.js에서 복사하거나 import해야 하지만, 
 * 여기서는 순환 참조를 피하기 위해 로컬 헬퍼로 재정의하거나 필요한 만큼만 가져옵니다.
 * 이 파일에서는 직접적인 네비게이션 로직보다 편집 완료 후 포커스 이동을 위해 사용됩니다.)
 */
function findNextNavigableCellLocal(currentRow, currentCol, direction, allColumnsMeta, totalRows, totalCols) {
  // 간단한 구현 - 실제 로직은 virtualKeyboardHandlers.js의 것을 사용하는 것이 좋지만
  // 순환 참조 문제 가능성이 있으므로 필요한 로직만 여기서 처리하거나,
  // keyboardNavigation.js 같은 공통 모듈로 분리하는 것이 이상적입니다.
  // 일단 기존 로직을 복제하여 안전하게 처리합니다.
  
  const isCellNavigable = (r, c) => {
    const col = allColumnsMeta.find(m => m.colIndex === c);
    if (!col) return false;
    if (r < 0) return col.headerRow === 2 && col.isEditable;
    return true;
  };

  if (direction === 'right') {
    if (currentRow < 0) {
      for (let c = currentCol + 1; c < totalCols; c++) {
        if (isCellNavigable(currentRow, c)) return { rowIndex: currentRow, colIndex: c };
      }
      return { rowIndex: 0, colIndex: 0 };
    }
    return { rowIndex: currentRow, colIndex: Math.min(totalCols - 1, currentCol + 1) };
  }
  
  // Default fallback
  return { rowIndex: currentRow, colIndex: currentCol };
}

/**
 * 가상 셀 더블클릭 핸들러 - 조건부 텍스트 선택 기능 포함
 * @param {number} rowIndex - 행 인덱스 (가상 인덱스)
 * @param {number} colIndex - 열 인덱스
 * @param {Event} event - 더블클릭 이벤트
 * @param {object} context - 핸들러 컨텍스트
 */
export async function handleVirtualCellDoubleClick(rowIndex, colIndex, event, context) {
  const { getOriginalIndex, allColumnsMeta, selectionSystem } = context;

  let originalRowIndex;
  if (rowIndex >= 0) {
    originalRowIndex = getOriginalIndex(rowIndex);
  } else {
    originalRowIndex = rowIndex;
  }

  if (originalRowIndex === null || originalRowIndex === undefined) {
    console.error('Could not determine original row index.');
    return;
  }

  // 편집 가능한 셀인지 확인
  const columnMeta = allColumnsMeta.find(col => col.colIndex === colIndex);
  if (!columnMeta || !columnMeta.isEditable) return;

  console.log(`[DoubleClick] Starting edit for cell: ${originalRowIndex}, ${colIndex}`);

  // 먼저 해당 셀을 선택
  selectionSystem.selectCell(originalRowIndex, colIndex);

  // 날짜/시간 컬럼인지 확인
  const isDateTimeColumn = columnMeta.type === COL_TYPE_ONSET || 
                           columnMeta.type === COL_TYPE_INDIVIDUAL_EXPOSURE;

  if (isDateTimeColumn) {
    // 데이트피커 모드로 처리
    await handleDateTimePickerEdit(originalRowIndex, colIndex, event, context);
  } else {
    // 기존 contentEditable 모드로 처리
    await handleInlineEdit(originalRowIndex, colIndex, event, context);
  }
}

/**
 * 날짜/시간 컬럼에 대한 데이트피커 편집 처리
 */
async function handleDateTimePickerEdit(rowIndex, colIndex, event, context) {
  const { allColumnsMeta } = context;
  
  // 데이트피커 참조가 없으면 경고하고 날짜 전용 인라인 편집으로 폴백
  if (!context.dateTimePickerRef || !context.dateTimePickerRef.value) {
    console.warn('[DateTimePicker] DateTimePicker reference not found, falling back to date-aware inline edit');
    
    // 날짜/시간 형식을 위한 특수 인라인 편집
    await handleDateTimeInlineEdit(rowIndex, colIndex, event, context);
    return;
  }

  console.log(`[DateTimePicker] Starting date picker edit for cell: ${rowIndex}, ${colIndex}`);
  
  // 현재 셀 값 가져오기 (올바른 파라미터로 호출)
  const columnMeta = allColumnsMeta.find(col => col.colIndex === colIndex);
  const row = rowIndex >= 0 ? context.rows.value[rowIndex] : null;
  const currentValue = context.getCellValue(row, columnMeta, rowIndex);
  
  // 날짜/시간 파싱 (utils에서 import 필요)
  const { parseDateTime } = await import('../utils/dateTimeUtils.js');
  const parsedDateTime = parseDateTime(currentValue);
  
  // 셀 위치 계산
  const cellRect = event.target.getBoundingClientRect();
  const pickerPosition = calculatePickerPosition(cellRect);
  
  // 메인 컴포넌트의 상태 업데이트 (반응형 방식)
  if (context.dateTimePickerState) {
    context.dateTimePickerState.visible = true;
    context.dateTimePickerState.position = pickerPosition;
    context.dateTimePickerState.initialValue = parsedDateTime;
    
    // 데이트피커 모드에서는 셀 직접 입력 핸들러를 부착하지 않음
    // (편집 모드가 아니므로 blur 이벤트 핸들러가 없음)
    
    // 현재 편집 중인 셀 정보 저장 (나중에 값 저장 시 사용)
    context.dateTimePickerState.currentEdit = {
      rowIndex,
      colIndex,
      columnMeta
    };
  } else {
    console.warn('[DateTimePicker] dateTimePickerState not found in context');
    // 폴백: 날짜 전용 인라인 편집으로 전환
    await handleDateTimeInlineEdit(rowIndex, colIndex, event, context);
  }
}

/**
 * 날짜/시간 전용 인라인 편집 처리 (데이트피커 없을 때 폴백)
 */
async function handleDateTimeInlineEdit(rowIndex, colIndex, event, context) {
  // 기본 인라인 편집 시작
  await handleInlineEdit(rowIndex, colIndex, event, context);
  
  // 날짜/시간 형식 검증 추가
  const cellElement = event.target.closest('td, th');
  if (cellElement) {
    const originalHandleInput = cellElement._handleInput;
    
    // 날짜/시간 형식 검증을 추가한 input 핸들러
    cellElement._handleInput = (e) => {
      const newValue = e.target.textContent;
      const dateTimeRegex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/;
      
      // 입력 중인 값이 형식에 맞지 않으면 경고 표시
      if (newValue && newValue.length >= 16 && !dateTimeRegex.test(newValue)) {
        cellElement.style.backgroundColor = '#ffebee';
        cellElement.title = 'YYYY-MM-DD HH:mm 형식으로 입력하세요';
      } else {
        cellElement.style.backgroundColor = '';
        cellElement.title = '';
      }
      
      // 기본 핸들러 호출
      if (originalHandleInput) {
        originalHandleInput(e);
      }
    };
  }
}

/**
 * 기존 contentEditable 방식의 인라인 편집 처리
 */
export async function handleInlineEdit(rowIndex, colIndex, event, context) {
  const { allColumnsMeta, selectionSystem, getCellValue, rows, cellInputState, storeBridge } = context;
  
  // 편집 모드 시작 (selectionSystem을 통해)
  if (rowIndex < 0) {
    // 헤더 셀 편집
    selectionSystem.startEditing(rowIndex, colIndex, getCellValue, null, cellInputState, allColumnsMeta);
  } else {
    // 바디 셀 편집
    const row = rows.value[rowIndex];
    if (row) {
      selectionSystem.startEditing(rowIndex, colIndex, getCellValue, row, cellInputState, allColumnsMeta);
    }
  }

  // 다음 프레임에서 DOM 업데이트 후 실행
  await new Promise(resolve => requestAnimationFrame(resolve));

  // DOM 요소 찾기 및 편집 설정
  const cellElement = event.target.closest('td, th');
  if (cellElement) {
    console.log('[DoubleClick] Setting up DOM for editing');
    
    // contentEditable 강제 설정
    cellElement.contentEditable = 'true';
    cellElement.focus();
    
    const columnMeta = allColumnsMeta.find(col => col.colIndex === colIndex);
    
    // --- 편집 완료 이벤트 리스너 추가 ---
    const handleEditComplete = () => {
      console.log(`[DoubleClick] Edit complete event triggered for cell: ${rowIndex}, ${colIndex}`);
      
      // 이벤트 리스너 제거 (한 번만 실행되도록)
      cellElement.removeEventListener('blur', handleEditComplete);
      cellElement.removeEventListener('focusout', handleEditComplete);
      cellElement.removeEventListener('input', handleInput);
      cellElement.removeEventListener('keydown', handleKeyDown);
      
      // 편집 완료 처리
      const tempValue = cellInputState.getTempValue(rowIndex, colIndex);
      if (tempValue !== null) {
        storeBridge.saveCellValue(rowIndex, colIndex, tempValue, columnMeta);
        console.log(`[DoubleClick] Saved value: ${tempValue} for cell: ${rowIndex}, ${colIndex}`);

        // 유효성 검사 추가 (안전하게 처리)
        try {
          if (context.validationManager) {
            context.validationManager.validateCell(rowIndex, colIndex, tempValue, columnMeta.type);
          }
        } catch (error) {
          console.error('[DoubleClick] Validation failed:', error);
        }
      }
      
      // cellInputState 상태 정리
      cellInputState.confirmEditing();
      selectionSystem.stopEditing(true);
    };
    
    // input 이벤트 핸들러 추가
    const handleInput = (e) => {
      const newValue = e.target.textContent;
      cellInputState.updateTempValue(rowIndex, colIndex, newValue, columnMeta);
      console.log(`[DoubleClick] Input event: ${newValue} for cell: ${rowIndex}, ${colIndex}`);
    };
    
    // 키보드 이벤트 핸들러 추가
    const handleKeyDown = async (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        handleEditComplete();
        
        // Enter 키: 아래 셀로 이동
        const nextRow = rowIndex < rows.value.length - 1 ? rowIndex + 1 : rowIndex;
        selectionSystem.selectCell(nextRow, colIndex);
        await context.ensureCellIsVisible(nextRow, colIndex);
        context.focusGrid();
      } else if (e.key === 'Tab') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        handleEditComplete();
        
        // Tab 키: 오른쪽 셀로 이동
        // findNextNavigableCellLocal을 로컬 정의 또는 import해서 사용
        const totalRows = rows.value.length;
        const totalCols = allColumnsMeta.length;
        const tabTarget = findNextNavigableCellLocal(rowIndex, colIndex, 'right', allColumnsMeta, totalRows, totalCols);
        
        selectionSystem.selectCell(tabTarget.rowIndex, tabTarget.colIndex);
        await context.ensureCellIsVisible(tabTarget.rowIndex, tabTarget.colIndex);
        context.focusGrid();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        // 편집 취소
        cellElement.removeEventListener('blur', handleEditComplete);
        cellElement.removeEventListener('focusout', handleEditComplete);
        cellElement.removeEventListener('input', handleInput);
        cellElement.removeEventListener('keydown', handleKeyDown);
        
        cellInputState.cancelEditing();
        selectionSystem.stopEditing(false);
      }
    };
    
    // 편집 완료 이벤트 리스너 등록
    cellElement.addEventListener('blur', handleEditComplete);
    cellElement.addEventListener('focusout', handleEditComplete);
    cellElement.addEventListener('input', handleInput);
    cellElement.addEventListener('keydown', handleKeyDown);
    
    // --- 조건부 텍스트 선택 로직 시작 ---
    const selection = window.getSelection();
    selection.removeAllRanges();
    const range = document.createRange();

    // 전체 선택이 필요한 타입들 정의 (실제 컬럼 메타데이터의 type과 일치)
    const selectAllTypes = [
      COL_TYPE_IS_PATIENT,
      COL_TYPE_BASIC,
      'clinicalSymptoms',  // 실제 컬럼 메타데이터의 type
      'dietInfo'           // 실제 컬럼 메타데이터의 type
    ];

    // '전체 선택' 타입에 해당하고, 바디 셀인 경우에만 전체 선택 동작
    if (rowIndex >= 0 && selectAllTypes.includes(columnMeta.type)) {
      // 방식 1: 내부 텍스트 전체 선택
      range.selectNodeContents(cellElement);
    } else {
      // 방식 2: 클릭한 위치에 커서 놓기 (헤더 및 '증상발현시간' 등)
      
      // 더 정확한 커서 위치 계산을 위해 caretRangeFromPoint 사용
      let cursorPosition = 0;
      
      try {
        // 브라우저가 caretRangeFromPoint를 지원하는 경우
        if (document.caretRangeFromPoint) {
          const range = document.caretRangeFromPoint(event.clientX, event.clientY);
          if (range && range.startContainer === cellElement.firstChild) {
            cursorPosition = range.startOffset;
          } else if (range && cellElement.contains(range.startContainer)) {
            // 텍스트 노드가 아닌 경우의 처리
            const textContent = cellElement.textContent;
            const clickX = event.clientX - cellElement.getBoundingClientRect().left;
            const cellWidth = cellElement.getBoundingClientRect().width;
            cursorPosition = Math.round((clickX / cellWidth) * textContent.length);
          }
        } 
        // caretPositionFromPoint 지원하는 경우 (Firefox)
        else if (document.caretPositionFromPoint) {
          const caretPos = document.caretPositionFromPoint(event.clientX, event.clientY);
          if (caretPos && caretPos.offsetNode === cellElement.firstChild) {
            cursorPosition = caretPos.offset;
          }
        } 
        // 지원하지 않는 경우 기존 방식 사용
        else {
          const textNode = cellElement.firstChild;
          if (textNode && textNode.nodeType === Node.TEXT_NODE) {
            const rect = cellElement.getBoundingClientRect();
            const clickX = event.clientX - rect.left;
            const cellWidth = rect.width;
            const textLength = textNode.textContent.length;
            const estimatedPosition = Math.round((clickX / cellWidth) * textLength);
            cursorPosition = Math.max(0, Math.min(estimatedPosition, textLength));
          }
        }
      } catch (error) {
        console.warn('Failed to calculate precise cursor position, using fallback:', error);
        // 폴백: 기존 방식
        const textNode = cellElement.firstChild;
        if (textNode && textNode.nodeType === Node.TEXT_NODE) {
          const rect = cellElement.getBoundingClientRect();
          const clickX = event.clientX - rect.left;
          const cellWidth = rect.width;
          const textLength = textNode.textContent.length;
          const estimatedPosition = Math.round((clickX / cellWidth) * textLength);
          cursorPosition = Math.max(0, Math.min(estimatedPosition, textLength));
        }
      }
      
      // 커서 위치를 설정
      const textNode = cellElement.firstChild;
      if (textNode && textNode.nodeType === Node.TEXT_NODE) {
        const safePosition = Math.max(0, Math.min(cursorPosition, textNode.textContent.length));
        range.setStart(textNode, safePosition);
        range.setEnd(textNode, safePosition);
      } else {
        range.setStart(cellElement, 0);
        range.setEnd(cellElement, 0);
      }
    }
    
    selection.addRange(range);
    console.log(`[DoubleClick] Editing setup complete for cell: ${rowIndex}, ${colIndex}`);
    // --- 조건부 텍스트 선택 로직 종료 ---
  }
}
