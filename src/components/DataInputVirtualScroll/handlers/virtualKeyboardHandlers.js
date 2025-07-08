import { nextTick } from 'vue';
import { calculatePickerPosition, handleInlineEdit } from './virtualCellHandlers.js';

/**
 * 가상 스크롤용 키보드 이벤트 핸들러
 */

/**
 * 셀이 네비게이션 가능한지 확인합니다.
 * @param {number} rowIndex 
 * @param {number} colIndex 
 * @param {Array} allColumnsMeta 
 * @returns {boolean}
 */
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

/**
 * 다음 네비게이션 가능한 셀을 찾습니다.
 * @param {number} currentRow 
 * @param {number} currentCol 
 * @param {string} direction - 'left', 'right', 'up', 'down'
 * @param {Array} allColumnsMeta 
 * @param {number} totalRows 
 * @param {number} totalCols 
 * @returns {{rowIndex: number, colIndex: number}}
 */
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

function isTypingKey(key) {
  // 한 자리 문자이거나, 숫자이거나, 일부 특수문자 등.
  // Ctrl, Alt, Meta 키가 눌리지 않은 상태여야 함.
  return key.length === 1 && !/[`~]/.test(key);
}

/**
 * 날짜/시간 컬럼에서 타이핑을 시작하면 데이트피커를 활성화합니다.
 * @param {KeyboardEvent} event 
 * @param {object} context 
 * @param {number} rowIndex 
 * @param {number} colIndex 
 */
async function handleDateTimeTypeToEdit(event, context, rowIndex, colIndex) {
  const { selectionSystem, allColumnsMeta, startEditing, getCellValue, rows } = context;
  const { state } = selectionSystem;
  
  // 이미 편집 중이면 처리하지 않음
  if (state.isEditing) return;
  
  const column = allColumnsMeta.find(c => c.colIndex === colIndex);
  if (!column || !column.isEditable) return;
  
  console.log(`[DateTimeTypeToEdit] 날짜/시간 컬럼 타이핑 시작: ${rowIndex}, ${colIndex}, 입력: ${event.key}`);
  
  // 편집 모드 시작
  const row = rowIndex >= 0 ? rows.value[rowIndex] : null;
  startEditing(rowIndex, colIndex, getCellValue, row);
  
  await nextTick();
  
  // 현재 셀 값 가져오기
  const currentValue = context.getCellValue(row, column, rowIndex);
  
  // 날짜/시간 파싱
  const { parseDateTime } = await import('../utils/dateTimeUtils.js');
  const parsedDateTime = parseDateTime(currentValue);
  
  // 셀 위치 계산
  let cellRect;
  const cellSelector = rowIndex < 0 
    ? `[data-col="${colIndex}"]` 
    : `[data-row="${rowIndex}"][data-col="${colIndex}"]`;
  const cellElement = document.querySelector(cellSelector);
  if (cellElement) {
    cellRect = cellElement.getBoundingClientRect();
  } else {
    cellRect = event.target.getBoundingClientRect(); // 폴백
  }
  const pickerPosition = calculatePickerPosition(cellRect);
  
  // 편집 모드 중 입력 셀 요소 가져오기
  if (cellElement) {
    setupDateTimeInputHandling(cellElement, event.key, null, context);
  }
  
  // 편집 상태 설정
  selectionSystem.startEditing(rowIndex, colIndex, context.getCellValue, 
    rowIndex >= 0 ? context.rows.value[rowIndex] : null, 
    context.cellInputState, allColumnsMeta);
  
  // 메인 컴포넌트의 상태 업데이트 (반응형 방식)
  if (context.dateTimePickerState) {
    context.dateTimePickerState.visible = true;
    context.dateTimePickerState.position = pickerPosition;
    context.dateTimePickerState.initialValue = parsedDateTime;
    
    // 현재 편집 중인 셀 정보 저장 (나중에 값 저장 시 사용)
    context.dateTimePickerState.currentEdit = {
      rowIndex,
      colIndex,
      columnMeta: column
    };
    
    console.log('[DateTimePicker] Position set to:', pickerPosition);
  } else {
    console.warn('[DateTimePicker] dateTimePickerState not found in context');
    // 폴백: 인라인 편집으로 전환
    await handleInlineEdit(rowIndex, colIndex, event, context);
  }
}

/**
 * 선택된 셀에서 타이핑을 시작하면 편집 모드로 전환합니다.
 * @param {KeyboardEvent} event 
 * @param {object} context 
 */
async function handleTypeToEdit(event, context) {
  const { selectionSystem, rows, allColumnsMeta, startEditing, getCellValue } = context;
  const { state } = selectionSystem;
  
  // 이미 편집 중이면 처리하지 않음
  if (state.isEditing) return;
  
  const { rowIndex, colIndex } = state.selectedCell;
  if (rowIndex === null || colIndex === null) return;
  
  const column = allColumnsMeta.find(c => c.colIndex === colIndex);
  if (!column || !column.isEditable) return;
  
  // 날짜/시간 컬럼인지 확인
  const isDateTimeColumn = column.type === 'symptomOnset' || column.type === 'individualExposureTime';
  
  try {
    if (rowIndex < 0) {
      // 헤더 셀 편집
      startEditing(rowIndex, colIndex, getCellValue, null);
    } else {
      // 바디 셀 편집
      const row = rows.value[rowIndex];
      if (row) {
        startEditing(rowIndex, colIndex, getCellValue, row);
      }
    }
    
    await nextTick();
    
    // 편집 모드로 전환 후 해당 셀에 포커스 설정
    const cellSelector = rowIndex < 0 
      ? `[data-col="${colIndex}"]` 
      : `[data-row="${rowIndex}"][data-col="${colIndex}"]`;
    
    const cellElement = document.querySelector(cellSelector);
    if (cellElement) {
      cellElement.focus();
      
      // 날짜/시간 컬럼인 경우 특별한 처리
      if (isDateTimeColumn) {
        // 날짜/시간 컬럼에서는 자동 구분자 삽입 기능 추가
        setupDateTimeInputHandling(cellElement, event.key, null, context);
      } else {
        // 일반 컬럼은 기존 방식
        cellElement.textContent = event.key;
        
        // 커서를 맨 끝으로 이동
        const range = document.createRange();
        const selection = window.getSelection();
        range.selectNodeContents(cellElement);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
        
        // input 이벤트를 발생시켜 값 업데이트
        const inputEvent = new Event('input', { bubbles: true });
        cellElement.dispatchEvent(inputEvent);
      }
    }
  } catch (error) {
    console.error('Error in handleTypeToEdit:', error);
  }
}

/**
 * 날짜/시간 컬럼에서 자동 구분자 삽입 기능을 설정합니다.
 * @param {HTMLElement} cellElement - 셀 요소
 * @param {string} initialKey - 초기 입력 키
 */
export function setupDateTimeInputHandling(cellElement, initialKey, clickX = null, context = null) {
  // Clean up 기존 리스너가 있으면 제거
  if (cellElement.__dtKeyHandler) {
    cellElement.removeEventListener('keydown', cellElement.__dtKeyHandler);
  }

  // 현재 입력된 내용을 digits 로 저장 (구분자 제거)
  let digits = '';
  let originalDigitsCopied = false;

  // 셀에 이미 YYYY-MM-DD HH:MM 형식의 값이 들어 있다면 digits를 미리 채워 넣어
  // 더블클릭 직후 기존 값이 사라져 보이는 현상을 방지합니다.
  const existingText = cellElement.textContent.trim();
  const existingMatch = existingText.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})$/);
  if (existingMatch) {
    // existingMatch[1]..[5] = YYYY MM DD HH mm
    digits = existingMatch.slice(1).join('');
    originalDigitsCopied = true; // 아직 사용자가 수정하지 않음
  }

  const DIGIT_RE = /\d/;

  // 전역 스타일 한 번만 주입
  const ensureSepStyle = () => {
    if (!document.getElementById('sep-style')) {
      const styleEl = document.createElement('style');
      styleEl.id = 'sep-style';
      styleEl.textContent = '.sep.dim{color:#bbb;}.sep.on{color:#000;}';
      document.head.appendChild(styleEl);
    }
  };
  ensureSepStyle();

  const buildHTML = () => {
    const parts = [];

    const pushDigit = (idx) => {
      parts.push(idx < digits.length ? digits[idx] : '&nbsp;');
    };

    // 연, 월, 일, 시, 분
    for (let i = 0; i < 4; i++) pushDigit(i); // YYYY
    parts.push(`<span class="sep ${digits.length >= 4 ? 'on' : 'dim'}">-</span>`);
    for (let i = 4; i < 6; i++) pushDigit(i); // MM
    parts.push(`<span class="sep ${digits.length >= 6 ? 'on' : 'dim'}">-</span>`);
    for (let i = 6; i < 8; i++) pushDigit(i); // DD
    parts.push(`<span class="sep ${digits.length >= 8 ? 'on' : 'dim'}">&nbsp;</span>`);
    for (let i = 8; i < 10; i++) pushDigit(i); // HH
    parts.push(`<span class="sep ${digits.length >= 10 ? 'on' : 'dim'}">:</span>`);
    for (let i = 10; i < 12; i++) pushDigit(i); // mm

    return parts.join('');
  };

  const setCaretByDigitPosition = (digitPosition) => {
    // 현재 digits 길이를 기준으로 캐럿 위치 결정
    const maxPosition = Math.min(digitPosition, 12); // 최대 12자리
    
    // YYYY-MM-DD HH:MM 형식에서 실제 문자 위치 계산
    // digits의 각 위치가 최종 문자열의 어느 위치에 해당하는지 매핑
    const getTextPosition = (pos) => {
      if (pos <= 4) return pos; // YYYY: 0,1,2,3
      if (pos <= 6) return pos + 1; // MM: 5,6 (- 구분자 1개 추가)
      if (pos <= 8) return pos + 2; // DD: 7,8 (- 구분자 2개 추가)  
      if (pos <= 10) return pos + 3; // HH: 9,10 (공백 구분자 3개 추가)
      return pos + 4; // MM: 11,12 (: 구분자 4개 추가)
    };
    
    const targetTextPosition = getTextPosition(maxPosition);
    
    // DOM에서 실제 텍스트 위치 찾기
    let currentPosition = 0;
    const walker = document.createTreeWalker(
      cellElement,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );
    
    let textNode;
    while ((textNode = walker.nextNode())) {
      const nodeLength = textNode.textContent.length;
      if (currentPosition + nodeLength >= targetTextPosition) {
        // 이 텍스트 노드 내에서 위치 설정
        const offsetInNode = targetTextPosition - currentPosition;
        const range = document.createRange();
        const sel = window.getSelection();
        range.setStart(textNode, Math.min(offsetInNode, nodeLength));
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
        return;
      }
      currentPosition += nodeLength;
    }
    
    // fallback: 맨 끝으로
    const range = document.createRange();
    range.selectNodeContents(cellElement);
    range.collapse(false);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  };

  const applyFormattedText = (useClick = false) => {
    cellElement.innerHTML = buildHTML();

    if (useClick && clickX !== null) {
      // 클릭 위치 기반 caret
      for (const node of cellElement.childNodes) {
        const rect = node.getBoundingClientRect();
        if (clickX <= rect.left + rect.width / 2) {
          const range = document.createRange();
          const sel = window.getSelection();
          range.setStartBefore(node);
          range.collapse(true);
          sel.removeAllRanges();
          sel.addRange(range);
          return;
        }
      }
    } else {
      // 디폴트: digits 뒤
      setCaretByDigitPosition(digits.length);
    }

    // input 이벤트 트리거
    cellElement.dispatchEvent(new Event('input', { bubbles: true }));
    
    // DateTimePicker와 동기화
    if (context && context.dateTimePickerState) {
      updateDateTimePickerValue();
    }
  };

  // DateTimePicker 값 업데이트 함수
  const updateDateTimePickerValue = () => {
    if (!context || !context.dateTimePickerState) return;
    
    // digits를 YYYY-MM-DD HH:MM 형식으로 변환
    const formattedValue = formatDigitsToDateTime(digits);
    
    // DateTimePicker의 initialValue 업데이트
    if (formattedValue) {
      import('../utils/dateTimeUtils.js').then(({ parseDateTime }) => {
        const parsedDateTime = parseDateTime(formattedValue);
        context.dateTimePickerState.initialValue = parsedDateTime;
      });
    }
  };
  
  // digits를 날짜시간 문자열로 변환하는 함수
  const formatDigitsToDateTime = (digits) => {
    if (digits.length === 0) return '';
    
    const padded = digits.padEnd(12, '0'); // 12자리로 패딩
    const year = padded.slice(0, 4);
    const month = padded.slice(4, 6);
    const day = padded.slice(6, 8);
    const hour = padded.slice(8, 10);
    const minute = padded.slice(10, 12);
    
    // 유효한 날짜인지 확인
    const date = new Date(year, month - 1, day, hour, minute);
    if (isNaN(date.getTime())) return '';
    
    return `${year}-${month}-${day} ${hour}:${minute}`;
  };

  // 현재 값을 저장하는 함수
  const saveCurrentValue = async () => {
    if (!context || !context.dateTimePickerState || !context.dateTimePickerState.currentEdit) {
      console.warn('[DateTimeInput] No context or edit info for saving');
      return;
    }
    
    const { rowIndex, colIndex, columnMeta } = context.dateTimePickerState.currentEdit;
    
    try {
      // digits를 날짜/시간 형식으로 변환
      const formattedValue = formatDigitsToDateTime(digits);
      
      if (formattedValue) {
        // 값 저장
        context.storeBridge.saveCellValue(rowIndex, colIndex, formattedValue, columnMeta);
        console.log(`[DateTimeInput] Auto-saved value: ${formattedValue} for cell: ${rowIndex}, ${colIndex}`);
        
        // 편집 완료
        context.cellInputState.confirmEditing();
        context.selectionSystem.stopEditing(true);
        
        // DateTimePicker 닫기
        if (context.dateTimePickerState.visible) {
          context.dateTimePickerState.visible = false;
          context.dateTimePickerState.currentEdit = null;
        }
      } else {
        console.warn('[DateTimeInput] Invalid date format, cannot save');
      }
    } catch (error) {
      console.error('[DateTimeInput] Error saving value:', error);
    }
  };

  // 최초 렌더링 (clickX 여부 적용)
  if (digits.length > 0) {
    // 기존 값이 있는 경우 그대로 표시
    applyFormattedText(true);
  } else if (existingText === '') {
    // 빈 셀인 경우 placeholder 즉시 표시
    applyFormattedText(true);
  }

  // 초기 키 반영
  if (DIGIT_RE.test(initialKey)) {
    digits += initialKey;
    applyFormattedText();
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (originalDigitsCopied) {
        // 기존 값 전체 선택 상태에서 Backspace 눌렀다면 전체 삭제로 간주
        digits = '';
        originalDigitsCopied = false;
      } else {
        digits = digits.slice(0, -1);
      }
      applyFormattedText();
      return;
    }
    // Tab/Enter 처리는 handleVirtualKeyDown에서 통합 처리
    if (DIGIT_RE.test(e.key)) {
      e.preventDefault();
      if (originalDigitsCopied) {
        // 첫 입력 → 기존 값 덮어쓰기 모드
        digits = e.key;
        originalDigitsCopied = false;
      } else if (digits.length < 12) {
        digits += e.key;
      }
      applyFormattedText();
      return;
    }
  };

  cellElement.__dtKeyHandler = handleKeyDown;
  cellElement.__dtSaveValue = saveCurrentValue; // 외부에서 저장 함수 호출 가능하게 함
  cellElement.addEventListener('keydown', handleKeyDown);

  const handleMouse = (e) => {
    // 사용자가 셀 내부를 클릭해 캐럿을 옮긴 경우, 전체 덮어쓰기 모드를 해제
    if (originalDigitsCopied) {
      originalDigitsCopied = false;
    }
    e.stopPropagation();
  };
  cellElement.addEventListener('mousedown', handleMouse);
  cellElement.addEventListener('click', handleMouse);

  cellElement.__dtStopProp = handleMouse;

  // cleanup on blur
  const cleanup = async () => {
    // blur 시 자동 저장 (다른 셀로 이동할 때)
    await saveCurrentValue();
    
    cellElement.removeEventListener('keydown', handleKeyDown);
    cellElement.removeEventListener('mousedown', handleMouse);
    cellElement.removeEventListener('click', handleMouse);
    cellElement.removeEventListener('blur', cleanup);
    delete cellElement.__dtKeyHandler;
    delete cellElement.__dtSaveValue;
    delete cellElement.__dtStopProp;
  };
  cellElement.addEventListener('blur', cleanup);

  if (!cellElement.getAttribute('contenteditable')) {
    cellElement.setAttribute('contenteditable', 'true');
  }
  cellElement.focus();

  // 옵션 2: 기존 값이 있는 경우 전체 선택 상태로 만들어 첫 키 입력 시 바로 덮어쓰기가 되도록 함
  if (digits.length > 0) {
    const sel = window.getSelection();
    if (sel) {
      const range = document.createRange();
      range.selectNodeContents(cellElement);
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }
}

async function handleCopy(context) {
  const { selectionSystem, rows, allColumnsMeta, getCellValue } = context;
  const { selectedRange } = selectionSystem.state;
  
  if (selectedRange.start.rowIndex === null) return;

  const { start, end } = selectedRange;
  let clipboardData = '';

  for (let r = start.rowIndex; r <= end.rowIndex; r++) {
    const rowData = [];
    for (let c = start.colIndex; c <= end.colIndex; c++) {
      const columnMeta = allColumnsMeta.find(meta => meta.colIndex === c);
      if (!columnMeta) continue;

      if (r < 0) { // Header
        rowData.push(getCellValue(null, columnMeta, r));
      } else { // Body
        const row = rows.value[r];
        rowData.push(getCellValue(row, columnMeta, r));
      }
    }
    clipboardData += rowData.join('\t');
    if (r < end.rowIndex) {
      clipboardData += '\n';
    }
  }

  try {
    await navigator.clipboard.writeText(clipboardData);
  } catch (err) {
    console.error('Failed to copy text: ', err);
  }
}

async function handlePaste(context) {
  const { selectionSystem, ensureCellIsVisible } = context;
  const { selectedCell } = selectionSystem.state;

  if (selectedCell.rowIndex === null || selectedCell.colIndex === null || selectedCell.rowIndex < 0) {
    // 헤더에는 붙여넣기 방지
    return;
  }

  try {
    const clipboardText = await navigator.clipboard.readText();
    if (!clipboardText) return;

    const parsedData = clipboardText
      .split(/\r?\n/) // Windows(\r\n)와 Unix(\n) 모두 처리
      .filter(row => row.trim() !== '') // 빈 행 제거
      .map(row => row.split('\t').map(cell => cell.replace(/\r/g, '').trim()));

    const startRow = selectedCell.rowIndex;
    const startCol = selectedCell.colIndex;

    // 스토어 액션에서 기대하는 파라미터 이름에 맞춰 전달
    await context.storeBridge.dispatch('pasteData', {
      startRowIndex: startRow,
      startColIndex: startCol,
      data: parsedData
    });

    // UX 개선: 붙여넣기된 영역을 시각적으로 선택하고 첫 번째 셀 활성화
    const endRow = startRow + parsedData.length - 1;
    const maxRowLength = parsedData.reduce((max, row) => Math.max(max, row.length), 0);
    const endCol = startCol + maxRowLength - 1;
    
    selectionSystem.setSelectionRange(startRow, startCol, endRow, endCol);
    await ensureCellIsVisible(startRow, startCol);

  } catch (err) {
    console.error('Failed to paste text: ', err);
  }
}

/**
 * 그리드 컨테이너의 키보드 다운 이벤트를 처리합니다.
 * @param {KeyboardEvent} event
 * @param {object} context
 */
export async function handleVirtualKeyDown(event, context) {
  const { selectionSystem, rows, allColumnsMeta, ensureCellIsVisible, isEditing, startEditing, stopEditing, getCellValue, focusGrid } = context;
  const { state } = selectionSystem;
  
  const { key, ctrlKey, shiftKey, metaKey } = event;
  const isCtrlOrCmd = ctrlKey || metaKey;
  const totalRows = rows.value.length;
  const totalCols = allColumnsMeta.length;

  // --- 편집 모드 처리 ---
  if (isEditing) {
    const { rowIndex: editRow, colIndex: editCol } = state.editingCell;

    if (key === 'Escape') {
      event.preventDefault();
      // cellInputState 상태 정리 (편집 취소)
      context.cellInputState.cancelEditing();
      stopEditing(false); // UI 상태와 데이터 상태 모두 정리
      await nextTick();
      focusGrid();
      return;
    }
    else if (key === 'Enter') {
      event.preventDefault();
      const tempValue = context.cellInputState.getTempValue(editRow, editCol);
      const column = allColumnsMeta.find(c => c.colIndex === editCol);
      if (tempValue !== null && column) {
        context.storeBridge.saveCellValue(editRow, editCol, tempValue, column);
      }
      // cellInputState 상태 정리
      context.cellInputState.confirmEditing();
      stopEditing(true);
      const nextRow = editRow < totalRows - 1 ? editRow + 1 : editRow;
      selectionSystem.selectCell(nextRow, editCol);
      await ensureCellIsVisible(nextRow, editCol);
      
      // 포커스 설정을 다음 틱에서 실행하여 안정적인 이벤트 처리 보장
      await nextTick();
      focusGrid();
      return;
    }
    else if (key === 'Tab') {
      event.preventDefault();
      const tempValue = context.cellInputState.getTempValue(editRow, editCol);
      const column = allColumnsMeta.find(c => c.colIndex === editCol);
      if (tempValue !== null && column) {
        context.storeBridge.saveCellValue(editRow, editCol, tempValue, column);
      }
      // cellInputState 상태 정리
      context.cellInputState.confirmEditing();
      stopEditing(true);
      
      // 편집 모드에서 Tab 처리 후 일반 모드 Tab 처리로 넘어감
      // 현재 편집 중인 셀을 기준으로 다음 셀 찾기
      const currentRow = editRow;
      const currentCol = editCol;
      
      // 일반 모드의 Tab 처리 로직 재사용
      const tabTarget = findNextNavigableCell(currentRow, currentCol, 'right', allColumnsMeta, totalRows, totalCols);
      selectionSystem.selectCell(tabTarget.rowIndex, tabTarget.colIndex);
      await ensureCellIsVisible(tabTarget.rowIndex, tabTarget.colIndex);
      
      // 포커스 설정을 다음 틱에서 실행하여 안정적인 이벤트 처리 보장
      await nextTick();
      focusGrid();
      return;
    }
    
    // 편집 모드에서 날짜/시간 컬럼인지 확인
    const columnMeta = allColumnsMeta.find(col => col.colIndex === editCol);
    const isDateTimeColumn = columnMeta && (
      columnMeta.type === 'symptomOnset' || 
      columnMeta.type === 'individualExposureTime'
    );
    
    // 날짜/시간 컬럼 처리
    if (isDateTimeColumn) {
      const cellSelector = editRow < 0 
        ? `[data-col="${editCol}"]` 
        : `[data-row="${editRow}"][data-col="${editCol}"]`;
      const cellElement = document.querySelector(cellSelector);
      
      // 숫자 입력 처리
      if (/\d/.test(key)) {
        event.preventDefault();
        if (cellElement && cellElement.__dtKeyHandler) {
          const keyEvent = new KeyboardEvent('keydown', { key });
          cellElement.__dtKeyHandler(keyEvent);
        }
        return;
      }
      
      // 백스페이스 처리
      if (key === 'Backspace') {
        event.preventDefault();
        if (cellElement && cellElement.__dtKeyHandler) {
          const keyEvent = new KeyboardEvent('keydown', { key });
          cellElement.__dtKeyHandler(keyEvent);
        }
        return;
      }
      
      // Tab/Enter 처리 - 날짜/시간 컬럼에서는 통합 처리
      if (key === 'Tab' || key === 'Enter') {
        event.preventDefault();
        
        // 현재 날짜/시간 값 저장
        if (cellElement && cellElement.__dtSaveValue) {
          await cellElement.__dtSaveValue();
        }
        
        // 편집 상태 종료
        const tempValue = context.cellInputState.getTempValue(editRow, editCol);
        const column = allColumnsMeta.find(c => c.colIndex === editCol);
        if (tempValue !== null && column) {
          context.storeBridge.saveCellValue(editRow, editCol, tempValue, column);
        }
        context.cellInputState.confirmEditing();
        stopEditing(true);
        
        // 네비게이션 처리
        if (key === 'Tab') {
          const tabTarget = findNextNavigableCell(editRow, editCol, 'right', allColumnsMeta, totalRows, totalCols);
          selectionSystem.selectCell(tabTarget.rowIndex, tabTarget.colIndex);
          await ensureCellIsVisible(tabTarget.rowIndex, tabTarget.colIndex);
        } else if (key === 'Enter') {
          const enterTarget = findNextNavigableCell(editRow, editCol, 'down', allColumnsMeta, totalRows, totalCols);
          selectionSystem.selectCell(enterTarget.rowIndex, enterTarget.colIndex);
          await ensureCellIsVisible(enterTarget.rowIndex, enterTarget.colIndex);
        }
        
        // 포커스 설정을 다음 틱에서 실행하여 안정적인 이벤트 처리 보장
        await nextTick();
        focusGrid();
        return;
      }
    }
    
    return; // 편집 모드에서는 다른 키 처리하지 않음
  }

  // --- 일반 모드 처리 ---
  if (state.selectedCell.rowIndex === null) return;

  // --- 복사/붙여넣기 처리 ---
  if (isCtrlOrCmd) {
    if (key.toLowerCase() === 'c') {
      event.preventDefault();
      await handleCopy(context);
      return;
    }
    if (key.toLowerCase() === 'v') {
      event.preventDefault();
      await handlePaste(context);
      return;
    }
  }

  const { rowIndex: currentRow, colIndex: currentCol } = state.selectedCell;

  let nextRow = currentRow;
  let nextCol = currentCol;
  let navigationHandled = false;
  let isNavigationOnly = false; // Tab 키 네비게이션 전용 플래그

  // --- Ctrl 키 조합 (고속 이동/선택) ---
  if (ctrlKey) {
    let direction = null;
    if (key === 'ArrowUp') direction = 'up';
    if (key === 'ArrowDown') direction = 'down';
    if (key === 'ArrowLeft') direction = 'left';
    if (key === 'ArrowRight') direction = 'right';

    if (direction) {
      event.preventDefault();

      // '환자여부'(1) 열에서 왼쪽으로의 이동을 원천적으로 차단합니다.
      if (direction === 'left' && currentCol === 1) {
        return;
      }
      
      const targetCell = findNextCellForFastNavigation(currentRow, currentCol, direction, rows.value, allColumnsMeta);
      nextRow = targetCell.rowIndex;
      nextCol = targetCell.colIndex;
      
      // 왼쪽 이동 시 연번(0) 열로 가지 않도록 최종적으로 보정합니다.
      if (direction === 'left') {
        nextCol = Math.max(1, nextCol);
      }

      if (shiftKey) {
        selectionSystem.extendSelection(nextRow, nextCol);
      } else {
        selectionSystem.selectCell(nextRow, nextCol);
      }
      if (ensureCellIsVisible) {
        await ensureCellIsVisible(nextRow, nextCol);
      }
      return; // 고속 이동/선택 처리 후 종료
    }
  }

  // --- 일반 네비게이션 ---
  switch (key) {
  case 'ArrowUp': {
    const upTarget = findNextNavigableCell(currentRow, currentCol, 'up', allColumnsMeta, totalRows, totalCols);
    nextRow = upTarget.rowIndex;
    nextCol = upTarget.colIndex;
    navigationHandled = true;
    break;
  }

  case 'ArrowDown':
  case 'Enter': { // Enter 키를 ArrowDown과 동일하게 처리
    const downTarget = findNextNavigableCell(currentRow, currentCol, 'down', allColumnsMeta, totalRows, totalCols);
    nextRow = downTarget.rowIndex;
    nextCol = downTarget.colIndex;
    navigationHandled = true;
    break;
  }

  case 'ArrowLeft': {
    const leftTarget = findNextNavigableCell(currentRow, currentCol, 'left', allColumnsMeta, totalRows, totalCols);
    nextRow = leftTarget.rowIndex;
    nextCol = leftTarget.colIndex;
    navigationHandled = true;
    break;
  }

  case 'ArrowRight': {
    const rightTarget = findNextNavigableCell(currentRow, currentCol, 'right', allColumnsMeta, totalRows, totalCols);
    nextRow = rightTarget.rowIndex;
    nextCol = rightTarget.colIndex;
    navigationHandled = true;
    break;
  }
    
  case 'Tab': {
    isNavigationOnly = true; // Tab은 순수 네비게이션으로 처리
    navigationHandled = true;
    if (event.shiftKey) { // Shift + Tab
      const shiftTabTarget = findNextNavigableCell(currentRow, currentCol, 'left', allColumnsMeta, totalRows, totalCols);
      nextRow = shiftTabTarget.rowIndex;
      nextCol = shiftTabTarget.colIndex;
    } else { // Tab
      const tabTarget = findNextNavigableCell(currentRow, currentCol, 'right', allColumnsMeta, totalRows, totalCols);
      nextRow = tabTarget.rowIndex;
      nextCol = tabTarget.colIndex;
    }
    break;
  }
  }

  if (navigationHandled) {
    event.preventDefault(); // 페이지 스크롤 등 기본 동작 방지

    // 새 네비게이션이 시작되면 기존 Ctrl 기반 개별 선택을 초기화
    if (!shiftKey && !ctrlKey && !metaKey) {
      selectionSystem.clearIndividualSelections();
    }

    if (nextRow !== currentRow || nextCol !== currentCol) {
      if (shiftKey && !isNavigationOnly) {
        selectionSystem.extendSelection(nextRow, nextCol);
      } else {
        selectionSystem.selectCell(nextRow, nextCol);
      }
      
      if (ensureCellIsVisible) {
        await ensureCellIsVisible(nextRow, nextCol);
      }
      
      // 포커스 설정을 다음 틱에서 실행하여 안정적인 이벤트 처리 보장
      await nextTick();
      focusGrid();
    }
  }

  // --- F2 키 편집 시작 ---
  if (key === 'F2') {
    event.preventDefault();
    if (currentRow < 0) {
      // 헤더 셀 편집
      startEditing(currentRow, currentCol, getCellValue, null);
      await nextTick();
      const cellElement = document.querySelector(`[data-col="${currentCol}"]`);
      if (cellElement) cellElement.focus();
    } else {
      // 바디 셀 편집
      const row = rows.value[currentRow];
      if (row) {
        startEditing(currentRow, currentCol, getCellValue, row);
        await nextTick();
        const cellElement = document.querySelector(`[data-row="${currentRow}"][data-col="${currentCol}"]`);
        if (cellElement) cellElement.focus();
      }
    }
  }
  // --- 타이핑으로 편집 시작 ---
  else if (isTypingKey(key) && !ctrlKey && !event.metaKey) {
    event.preventDefault();
    
    // 날짜/시간 컬럼인지 확인
    const columnMeta = allColumnsMeta.find(col => col.colIndex === currentCol);
    const isDateTimeColumn = columnMeta && (
      columnMeta.type === 'symptomOnset' || 
      columnMeta.type === 'individualExposureTime'
    );
    
    if (isDateTimeColumn) {
      // 날짜/시간 컬럼에서는 데이트피커로 처리
      handleDateTimeTypeToEdit(event, context, currentRow, currentCol);
    } else {
      // 일반 컬럼에서는 기존 방식으로 처리
      handleTypeToEdit(event, context);
    }
  }

  // --- Delete / Backspace : clear selected data ---------------------
  if (key === 'Delete' || key === 'Backspace') {
    event.preventDefault();
    const result = await handleClearSelectedData(context);
    
    // 편집 모드가 아닌 경우에만 즉시 스냅샷 캡처
    if (result.changed && !context.storeBridge.isEditing()) {
      // 이미 handleClearSelectedData 내에서 스냅샷이 캡처되었으므로 추가 작업 불필요
    }
    return;
  }
}

// === Fast Navigation Helper (Ctrl+Arrow) ============================
function findNextCellForFastNavigation(currentRow, currentCol, direction, rows, allColumnsMeta) {
  const totalRows = rows.length;
  const totalCols = allColumnsMeta.length;

  const isCellEmpty = (rowIdx, colIdx) => {
    if (colIdx < 1 || colIdx >= totalCols || rowIdx < -1 || rowIdx >= totalRows) return true;
    if (rowIdx === -1) return false; // header never empty for nav purposes
    const columnMeta = allColumnsMeta.find(c => c.colIndex === colIdx);
    if (!columnMeta) return true;
    const row = rows[rowIdx];
    if (!row) return true;
    const value = getCellContent(row, columnMeta, rowIdx);
    return value === undefined || value === null || String(value).trim() === '';
  };

  // Helper to get cell content (fallback if not available via global)
  function getCellContent(row, columnMeta, rowIdx) {
    if (rowIdx < 0) return '';
    if (columnMeta.type === 'serial') return rowIdx + 1;
    if (!columnMeta.dataKey) return '';
    if (columnMeta.cellIndex !== null && columnMeta.cellIndex !== undefined) {
      const arr = row[columnMeta.dataKey];
      return Array.isArray(arr) ? arr[columnMeta.cellIndex] : '';
    }
    return row[columnMeta.dataKey];
  }

  const r = currentRow;
  const c = currentCol;
  const dr = direction === 'up' ? -1 : direction === 'down' ? 1 : 0;
  const dc = direction === 'left' ? -1 : direction === 'right' ? 1 : 0;

  // Header row special case
  if (r === -1) {
    if (direction === 'down') return { rowIndex: 0, colIndex: c };
    if (direction === 'up') return { rowIndex: -1, colIndex: c };
    if (dc !== 0) {
      let tempC = c;
      while (tempC + dc >= 1 && tempC + dc < totalCols) {
        tempC += dc;
      }
      return { rowIndex: -1, colIndex: tempC };
    }
    return { rowIndex: -1, colIndex: c };
  }

  const currentEmpty = isCellEmpty(r, c);
  let nextR = r + dr;
  let nextC = c + dc;

  // Mode 1: starting inside data block
  if (!currentEmpty) {
    if (isCellEmpty(nextR, nextC)) {
      // Fall to Mode 2
    } else {
      let lastDataR = r;
      let lastDataC = c;
      while (!isCellEmpty(nextR, nextC)) {
        // prevent going into header when moving up
        if (direction === 'up' && nextR < 0) {
          return { rowIndex: lastDataR, colIndex: lastDataC };
        }
        lastDataR = nextR;
        lastDataC = nextC;
        nextR += dr;
        nextC += dc;
      }
      return { rowIndex: lastDataR, colIndex: lastDataC };
    }
  }

  // Mode 2: starting from empty or at edge of block
  let curR = r;
  let curC = c;
  if (!currentEmpty) {
    curR += dr;
    curC += dc;
  }
  while (isCellEmpty(curR, curC)) {
    const peekR = curR + dr;
    const peekC = curC + dc;
    if (direction === 'up' && peekR < 0) {
      return { rowIndex: Math.max(0, curR), colIndex: curC };
    }
    if (peekR < -1 || peekR >= totalRows || peekC < 1 || peekC >= totalCols) {
      return { rowIndex: curR, colIndex: curC };
    }
    curR = peekR;
    curC = peekC;
  }
  return { rowIndex: curR, colIndex: curC };
}

// === Clear Selected Data ============================================
async function handleClearSelectedData(context) {
  const { selectionSystem, allColumnsMeta } = context;
  const { selectedRange, selectedCellsIndividual, selectedRowsIndividual } = selectionSystem.state;

  const updates = [];
  const headerUpdates = []; // {headerType,index,text}
  const singleHeaderUpdates = []; // {headerType,text}
  const changedCells = []; // 스냅샷용 변경 정보

  const queueHeaderClear = (colIdx) => {
    const meta = allColumnsMeta.find(c => c.colIndex === colIdx);
    if (!meta || !meta.isEditable) return;
    if (meta.cellIndex !== null && meta.cellIndex !== undefined) {
      headerUpdates.push({ headerType: meta.type, index: meta.cellIndex, text: '' });
      changedCells.push({ type: 'header', headerType: meta.type, index: meta.cellIndex, before: context.storeBridge.state.headers[meta.type]?.[meta.cellIndex] || '', after: '' });
    } else {
      singleHeaderUpdates.push({ headerType: meta.type, text: '' });
      changedCells.push({ type: 'singleHeader', headerType: meta.type, before: context.storeBridge.state.headers[meta.type] || '', after: '' });
    }
  };

  const queueCellClear = (rowIdx, colIdx) => {
    if (rowIdx < 0) {
      queueHeaderClear(colIdx);
      return;
    }
    const meta = allColumnsMeta.find(c => c.colIndex === colIdx);
    if (!meta || !meta.dataKey) return;

    // Serial 컬럼은 편집 불가
    if (meta.type === 'serial') return;

    // 변경 전 값 확인
    const beforeValue = (() => {
      const row = context.storeBridge.state.rows[rowIdx];
      if (!row) return '';
      if (meta.cellIndex !== null && meta.cellIndex !== undefined) {
        return row[meta.dataKey]?.[meta.cellIndex] || '';
      }
      return row[meta.dataKey] || '';
    })();

    // 값이 실제로 변경되는 경우만 추가
    if (beforeValue !== '') {
      changedCells.push({ type: 'cell', rowIndex: rowIdx, colIndex: colIdx, before: beforeValue, after: '' });
    }

    updates.push({
      rowIndex: rowIdx,
      key: meta.dataKey,
      value: '',
      cellIndex: meta.cellIndex
    });
  };

  if (selectedRowsIndividual.size > 0) {
    // 개별 행 선택 – 각 행의 모든 편집 가능한 셀을 비웁니다.
    selectedRowsIndividual.forEach(rowIdx => {
      allColumnsMeta.forEach(col => {
        queueCellClear(rowIdx, col.colIndex);
      });
    });
  }

  if (selectedCellsIndividual.size > 0) {
    selectedCellsIndividual.forEach(key => {
      const [rStr, cStr] = key.split('_');
      queueCellClear(parseInt(rStr, 10), parseInt(cStr, 10));
    });
  }

  if (selectedRange.start.rowIndex !== null && selectedRowsIndividual.size === 0 && selectedCellsIndividual.size === 0) {
    for (let r = selectedRange.start.rowIndex; r <= selectedRange.end.rowIndex; r++) {
      for (let c = selectedRange.start.colIndex; c <= selectedRange.end.colIndex; c++) {
        queueCellClear(r, c);
      }
    }
  }

  // ensure anchor cell is cleared as well
  const { rowIndex: anchorRow, colIndex: anchorCol } = selectionSystem.state.selectedCell;
  if (anchorRow !== null && anchorCol !== null) {
    queueCellClear(anchorRow, anchorCol);
  }

  if (updates.length === 0 && headerUpdates.length === 0 && singleHeaderUpdates.length === 0) return;

  // 변경사항이 있는 경우에만 스냅샷 캡처
  if (changedCells.length > 0 && !context.storeBridge.isEditing()) {
    context.storeBridge._captureSnapshot('delete_clear', { changedCells });
  }

  try {
    if (updates.length > 0) await context.storeBridge.dispatch('updateCellsBatch', updates);
    // header array cells
    for (const h of headerUpdates) {
      await context.storeBridge.dispatch('updateHeader', h);
    }
    for (const sh of singleHeaderUpdates) {
      // updateSingleHeader 메서드가 있으면 사용, 없으면 updateHeader로 fallback
      if (context.storeBridge.updateSingleHeader) {
        await context.storeBridge.updateSingleHeader(sh);
      } else {
        await context.storeBridge.dispatch('updateHeader', { headerType: sh.headerType, index: null, text: '' });
      }
    }
    
    // 변경사항이 있었으면 localStorage 최신화
    if (changedCells.length > 0) {
      context.storeBridge.saveCurrentState();
    }
  } catch (err) {
    console.error('Failed to clear cells:', err);
  }

  return { changed: changedCells.length > 0, changedCells };
} 