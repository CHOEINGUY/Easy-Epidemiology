/**
 * Placeholder for virtual scroll-aware cell event handlers.
 * To be implemented in later steps.
 */

// 컬럼 타입 상수 import
const COL_TYPE_IS_PATIENT = 'isPatient';
const COL_TYPE_BASIC = 'basic';
const COL_TYPE_ONSET = 'symptomOnset';
const COL_TYPE_INDIVIDUAL_EXPOSURE = 'individualExposureTime';

// 네비게이션 함수 (virtualKeyboardHandlers.js에서 복사)
function isCellNavigable(rowIndex, colIndex, allColumnsMeta) {
  const column = allColumnsMeta.find(c => c.colIndex === colIndex);
  if (!column) return false;
  
  // 헤더 셀인 경우
  if (rowIndex < 0) {
    // headerRow === 2이고 편집 가능한 셀만 네비게이션 허용
    return column.headerRow === 2 && column.isEditable;
  }
  
  // 바디 셀은 모두 네비게이션 가능 (기존 로직 유지)
  return true;
}

function findNextNavigableCell(currentRow, currentCol, direction, allColumnsMeta, totalRows, totalCols) {
  switch (direction) {
  case 'left':
    // 헤더에서 왼쪽으로 이동
    if (currentRow < 0) {
      for (let col = currentCol - 1; col >= 0; col--) {
        if (isCellNavigable(currentRow, col, allColumnsMeta)) {
          return { rowIndex: currentRow, colIndex: col };
        }
      }
      // 더 이상 네비게이션 가능한 헤더 셀이 없으면 현재 위치 유지
      return { rowIndex: currentRow, colIndex: currentCol };
    } else {
      // 바디에서는 기존 로직 (환자여부(1) 열까지만)
      return { rowIndex: currentRow, colIndex: Math.max(1, currentCol - 1) };
    }
      
  case 'right':
    // 헤더에서 오른쪽으로 이동
    if (currentRow < 0) {
      for (let col = currentCol + 1; col < totalCols; col++) {
        if (isCellNavigable(currentRow, col, allColumnsMeta)) {
          return { rowIndex: currentRow, colIndex: col };
        }
      }
      // 더 이상 네비게이션 가능한 헤더 셀이 없으면 바디로 이동
      return { rowIndex: 0, colIndex: 0 };
    } else {
      // 바디에서는 기존 로직
      return { rowIndex: currentRow, colIndex: Math.min(totalCols - 1, currentCol + 1) };
    }
      
  case 'up':
    if (currentRow > 0) {
      return { rowIndex: currentRow - 1, colIndex: currentCol };
    } else if (currentRow === 0) {
      // 바디에서 헤더로 이동 시, 네비게이션 가능한 헤더 셀 찾기
      if (isCellNavigable(-1, currentCol, allColumnsMeta)) {
        return { rowIndex: -1, colIndex: currentCol };
      } else {
        // 현재 열이 네비게이션 불가능하면 가장 가까운 네비게이션 가능한 헤더 셀 찾기
        for (let col = currentCol; col >= 0; col--) {
          if (isCellNavigable(-1, col, allColumnsMeta)) {
            return { rowIndex: -1, colIndex: col };
          }
        }
        for (let col = currentCol + 1; col < totalCols; col++) {
          if (isCellNavigable(-1, col, allColumnsMeta)) {
            return { rowIndex: -1, colIndex: col };
          }
        }
        // 네비게이션 가능한 헤더 셀이 없으면 현재 위치 유지
        return { rowIndex: currentRow, colIndex: currentCol };
      }
    }
    return { rowIndex: currentRow, colIndex: currentCol };
      
  case 'down':
    if (currentRow === -1) {
      return { rowIndex: 0, colIndex: currentCol };
    } else if (currentRow < totalRows - 1) {
      return { rowIndex: currentRow + 1, colIndex: currentCol };
    }
    return { rowIndex: currentRow, colIndex: currentCol };
  }
  
  return { rowIndex: currentRow, colIndex: currentCol };
}

let autoScrollInterval = null;

function stopAutoScroll() {
  if (autoScrollInterval) {
    clearInterval(autoScrollInterval);
    autoScrollInterval = null;
  }
}

/**
 * Handles clicks on a virtualized cell.
 * Note: It receives the virtual (visible) row index, which needs to be
 * translated to the original data index.
 * 
 * @param {number} rowIndex - The index of the row within the visible portion.
 * @param {number} colIndex - The column index.
 * @param {Event} event - The DOM event.
 * @param {object} context - The handler context, containing necessary systems.
 */
export function handleVirtualCellMouseDown(rowIndex, colIndex, event, context) {
  const { getOriginalIndex, selectionSystem, allColumnsMeta } = context;

  let originalRowIndex;

  if (rowIndex >= 0) {
    // Body cell: rowIndex is a virtual index, convert it
    originalRowIndex = getOriginalIndex(rowIndex);
  } else {
    // Header cell: rowIndex is already the correct negative index
    originalRowIndex = rowIndex;
  }

  if (originalRowIndex === null || originalRowIndex === undefined) {
    console.error('Could not determine original row index.');
    return;
  }

  // --- Right-click selection handling ---
  // 마우스 우클릭(event.button === 2) 시,
  // 클릭한 지점이 이미 선택된 범위 또는 개별 선택에 포함되어 있다면 선택을 변경하지 않습니다.
  if (event.button === 2) {
    const { selectedRange, selectedRowsIndividual, selectedCellsIndividual } = selectionSystem.state;
    
    // 범위 선택 내에서 우클릭 확인
    const isClickInsideRangeSelection =
      selectedRange.start.rowIndex !== null &&
      originalRowIndex >= selectedRange.start.rowIndex &&
      originalRowIndex <= selectedRange.end.rowIndex &&
      colIndex >= selectedRange.start.colIndex &&
      colIndex <= selectedRange.end.colIndex;

    // 개별 선택 내에서 우클릭 확인
    const isRowIndividuallySelected = selectedRowsIndividual.has(originalRowIndex);
    const isCellIndividuallySelected = selectedCellsIndividual.has(`${originalRowIndex}_${colIndex}`);

    // 기존 선택(범위 또는 개별) 내에서 우클릭한 경우, 선택을 유지하고 핸들러를 종료합니다.
    // 이렇게 해야 contextmenu 이벤트 핸들러가 기존 선택을 사용할 수 있습니다.
    if (isClickInsideRangeSelection || isRowIndividuallySelected || isCellIndividuallySelected) {
      return;
    }
  }

  // 편집 모드에서 같은 셀을 클릭한 경우, 모든 선택 관련 동작을 차단하고 텍스트 커서 이동만 허용
  const { isEditing, editingCell } = selectionSystem.state;
  if (isEditing && 
      editingCell.rowIndex === originalRowIndex && 
      editingCell.colIndex === colIndex) {
    // 편집 중인 같은 셀 내부를 클릭한 경우 모든 선택 관련 동작을 차단
    // 브라우저의 기본 동작(텍스트 커서 이동)만 허용
    console.log('[CellClick] 편집 모드에서 같은 셀 클릭 - 모든 선택 동작 차단, 텍스트 커서 이동만 허용');
    event.stopPropagation(); // 이벤트 전파 중단
    event.stopImmediatePropagation(); // 즉시 이벤트 전파 중단
    return;
  }

  // Ctrl(또는 Cmd) / Shift 조합 처리 ---------------------------
  const isCtrl = event.ctrlKey || event.metaKey;
  const isShift = event.shiftKey;

  if (isCtrl) {
    // If this is the *first* Ctrl interaction, include the anchor cell/row in individual set
    if (selectionSystem.state.selectedCellsIndividual.size === 0 && selectionSystem.state.selectedRowsIndividual.size === 0) {
      const anchor = selectionSystem.state.selectedCell;
      if (anchor.rowIndex !== null && anchor.colIndex !== null) {
        if (anchor.colIndex === 0) {
          selectionSystem.toggleIndividualRow(anchor.rowIndex);
        } else {
          selectionSystem.toggleIndividualCell(anchor.rowIndex, anchor.colIndex);
        }
      }
    }

    // --- Ctrl + Shift + Serial 클릭 : 연속 행 범위 선택 ---
    event.preventDefault();

    if (colIndex === 0 && isShift) {
      const anchorRow = selectionSystem.state.selectionAnchor.rowIndex ?? originalRowIndex;
      selectionSystem.selectRowRange(anchorRow, originalRowIndex);
      return; // 범위 선택 후 드래그 비활성
    }

    // --- Ctrl + Serial 클릭 : 행 토글 선택 ---
    if (colIndex === 0) {
      selectionSystem.toggleIndividualRow(originalRowIndex);
      return;
    }

    // --- Ctrl + 일반 셀 클릭 : 셀 토글 선택 ---
    selectionSystem.toggleIndividualCell(originalRowIndex, colIndex);
    return; // 개별 토글 후 드래그 비활성
  }

  // Shift 범위 확장 (행/셀이 anchor 기반) ---------------------
  if (isShift) {
    event.preventDefault();
    // Shift 범위 선택을 시작하면 기존 개별 선택을 모두 해제합니다.
    selectionSystem.clearIndividualSelections();
    const anchorRow = selectionSystem.state.selectionAnchor.rowIndex ?? originalRowIndex;
    if (colIndex === 0) {
      // Serial 열에서 Shift 클릭 → 연속 행 범위 선택
      selectionSystem.selectRowRange(anchorRow, originalRowIndex);
      // 열 전체까지 선택 범위 확장 (selectRowRange 내부에서 처리)
    } else {
      // 일반 셀 Shift 확장
      selectionSystem.extendSelection(originalRowIndex, colIndex);
    }
    return;
  }

  // 기본 클릭: 단일 선택 처리 -------------------------------

  // 편집 모드가 아닌 경우에만 기본 동작 방지
  if (!isEditing) {
    // 기본 텍스트 선택 및 드래그 동작 방지
    event.preventDefault();
  }

  // 편집 모드가 아닌 경우에만 선택 상태 변경
  if (!isEditing) {
    // Ctrl/Shift 없이 클릭한 경우 개별 셀/행 선택을 모두 초기화합니다.
    selectionSystem.clearIndividualSelections();

    if (colIndex === 0) {
      selectionSystem.selectRow(originalRowIndex, allColumnsMeta);
    } else {
      selectionSystem.selectCell(originalRowIndex, colIndex);
    }

    // 드래그 상태 활성화
    selectionSystem.startDrag(colIndex);
  }

  // The document listeners are now handled in DataInputVirtual.vue
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
  const { allColumnsMeta, selectionSystem } = context;
  
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
  
  // 편집 상태 설정
  selectionSystem.startEditing(rowIndex, colIndex, context.getCellValue, 
    rowIndex >= 0 ? context.rows.value[rowIndex] : null, 
    context.cellInputState, allColumnsMeta);
  
  // 메인 컴포넌트의 상태 업데이트 (반응형 방식)
  if (context.dateTimePickerState) {
    context.dateTimePickerState.visible = true;
    context.dateTimePickerState.position = pickerPosition;
    context.dateTimePickerState.initialValue = parsedDateTime;
    
    // 셀 직접 입력 핸들러 부착 (더블클릭 시에도 숫자 입력 가능)
    try {
      const { setupDateTimeInputHandling } = await import('./virtualKeyboardHandlers.js');
      const cellElement = event.target.closest('td, th');
      if (cellElement && typeof setupDateTimeInputHandling === 'function') {
        // 날짜/시간 컬럼에서는 마우스 클릭 위치 기반 캐럿 설정이 필요 없음
        // 항상 맨 앞에서부터 입력 시작, context 전달하여 DateTimePicker 동기화
        setupDateTimeInputHandling(cellElement, '', null, context);
      }
    } catch (err) {
      console.warn('setupDateTimeInputHandling import failed', err);
    }
    
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
  const { allColumnsMeta, selectionSystem, getCellValue, rows, cellInputState, storeBridge } = context;
  
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
async function handleInlineEdit(rowIndex, colIndex, event, context) {
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
        
        // Tab 키: 오른쪽 셀로 이동 (일반 모드 Tab 처리와 동일)
        const tabTarget = findNextNavigableCell(rowIndex, colIndex, 'right', allColumnsMeta, rows.value.length, allColumnsMeta.length);
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

/**
 * 가상 스크롤 환경에서 데이트피커 위치 계산
 * @param {DOMRect} cellRect - 셀의 getBoundingClientRect() 결과
 * @returns {object} - {top, left} 위치 객체
 */
function calculatePickerPosition(cellRect) {
  // 데이트피커 예상 크기
  const pickerWidth = 450;
  const pickerHeight = 400;
  const margin = 10; // 화면 경계와의 여백
  
  // 화면 크기 정보
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  // 기본 위치: 셀 하단 중앙
  let top = cellRect.bottom + 4; // 4px 여백
  let left = cellRect.left + (cellRect.width / 2) - (pickerWidth / 2); // 셀 중앙 정렬
  
  // 좌측 경계 체크
  if (left < margin) {
    left = margin;
  }
  
  // 우측 경계 체크
  if (left + pickerWidth > viewportWidth - margin) {
    left = viewportWidth - pickerWidth - margin;
  }
  
  // 여전히 화면을 벗어나면 셀 좌측에 맞춤
  if (left < margin) {
    left = cellRect.left;
    // 셀 좌측도 화면을 벗어나면 최소 여백 유지
    if (left < margin) {
      left = margin;
    }
  }
  
  // 하단 경계 체크 - 공간이 부족하면 셀 상단에 표시
  if (top + pickerHeight > viewportHeight - margin) {
    top = cellRect.top - pickerHeight - 4; // 셀 상단에 표시
    
    // 상단에도 공간이 부족하면 화면 내부로 조정
    if (top < margin) {
      // 화면 내부에서 최적 위치 찾기
      const availableTopSpace = cellRect.top - margin;
      const availableBottomSpace = viewportHeight - cellRect.bottom - margin;
      
      if (availableTopSpace > availableBottomSpace) {
        // 상단 공간이 더 크면 상단에 최대한 표시
        top = Math.max(margin, cellRect.top - pickerHeight);
      } else {
        // 하단 공간이 더 크거나 같으면 하단에 표시
        top = cellRect.bottom + 4;
        // 필요하면 높이 제한 (여기서는 위치만 조정)
        if (top + pickerHeight > viewportHeight - margin) {
          top = viewportHeight - pickerHeight - margin;
        }
      }
    }
  }
  
  // 스크롤 컨테이너 고려 (추가 보정)
  const scrollContainer = document.querySelector('.grid-container');
  if (scrollContainer) {
    const containerRect = scrollContainer.getBoundingClientRect();
    
    // 컨테이너 영역 내부로 제한
    if (top < containerRect.top + margin) {
      top = containerRect.top + margin;
    }
    
    if (left < containerRect.left + margin) {
      left = containerRect.left + margin;
    }
    
    if (left + pickerWidth > containerRect.right - margin) {
      left = containerRect.right - pickerWidth - margin;
    }
  }
  
  console.log(`[PickerPosition] Cell: ${cellRect.left}, ${cellRect.top}, ${cellRect.width}x${cellRect.height}`);
  console.log(`[PickerPosition] Calculated: ${left}, ${top}`);
  
  return { top, left };
}

/**
 * document 전체에서 마우스가 움직일 때 이벤트를 처리합니다.
 * 드래그 선택을 업데이트하고, 필요 시 자동 스크롤을 트리거합니다.
 * @param {Event} event 
 * @param {object} context 
 */
export function handleVirtualDocumentMouseMove(event, context) {
  const { selectionSystem, allColumnsMeta, gridBodyContainer } = context;
  if (!selectionSystem.state.isDragging || !gridBodyContainer) return;

  const updateSelection = (clientX, clientY) => {
    const element = document.elementFromPoint(clientX, clientY);
    if (!element) return;

    const cell = element.closest('td, th');
    if (!cell) return;

    const colIndexAttr = cell.dataset.col;
    if (colIndexAttr === undefined) return;

    const colIndex = parseInt(colIndexAttr, 10);
    let rowIndex;

    // data-row 속성이 있으면 body 셀, 없으면 header 셀로 간주
    if (cell.dataset.row !== undefined) {
      rowIndex = parseInt(cell.dataset.row, 10);
    } else if (cell.tagName === 'TH') {
      rowIndex = -1; // 헤더 행은 -1
    } else {
      return; // 처리할 수 없는 셀
    }

    if (!isNaN(rowIndex) && !isNaN(colIndex)) {
      selectionSystem.updateDragSelection(rowIndex, colIndex, allColumnsMeta);
    }
  };

  // --- Auto-scroll logic ---
  stopAutoScroll();

  const rect = gridBodyContainer.getBoundingClientRect();
  const buffer = 40;
  let scrollX = 0;
  let scrollY = 0;

  if (event.clientY < rect.top + buffer) scrollY = -20;
  if (event.clientY > rect.bottom - buffer) scrollY = 20;
  if (event.clientX < rect.left + buffer) scrollX = -20;
  if (event.clientX > rect.right - buffer) scrollX = 20;
  
  if (scrollX !== 0 || scrollY !== 0) {
    autoScrollInterval = setInterval(() => {
      gridBodyContainer.scrollTop += scrollY;
      gridBodyContainer.scrollLeft += scrollX;
      // 스크롤 중에도 커서 위치의 셀을 계속 선택하도록 업데이트
      updateSelection(event.clientX, event.clientY);
    }, 50);
  }

  // --- Standard drag selection update ---
  updateSelection(event.clientX, event.clientY);
}

/**
 * document 전체에서 마우스 버튼을 뗐을 때 이벤트를 처리합니다.
 * 드래그 선택을 종료하고 자동 스크롤을 중지합니다.
 * @param {Event} event 
 * @param {object} context 
 */
export function handleVirtualDocumentMouseUp(event, context) {
  stopAutoScroll();
  context.selectionSystem.endDragSelection();
}

export { calculatePickerPosition, handleInlineEdit }; 