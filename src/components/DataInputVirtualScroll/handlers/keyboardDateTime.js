
import { nextTick } from 'vue';
import { handleInlineEdit } from './cellEditHandlers.js';
import { calculatePickerPosition } from '../utils/uiUtils.js';

/**
 * 날짜/시간 컬럼에서 타이핑을 시작하면 데이트피커를 활성화합니다.
 * @param {KeyboardEvent} event 
 * @param {object} context 
 * @param {number} rowIndex 
 * @param {number} colIndex 
 */
export async function handleDateTimeTypeToEdit(event, context, rowIndex, colIndex) {
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
        
        // 유효성 검사 추가
        if (context.validationManager) {
          context.validationManager.validateCell(rowIndex, colIndex, formattedValue, columnMeta.type);
        }
        
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
    // 데이트피커가 열려있어도 blur 시 자동 저장 시도
    // (사용자가 피커를 사용하지 않고 직접 입력 후 다른 셀로 이동하는 경우를 위해)
    /*
    if (context && context.dateTimePickerState && context.dateTimePickerState.visible) {
      console.log('[DateTimeInput] DateTimePicker is open, skipping auto-save on blur');
      return;
    }
    */
    
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
