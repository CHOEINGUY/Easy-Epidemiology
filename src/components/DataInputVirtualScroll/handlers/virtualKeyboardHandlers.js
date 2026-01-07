import { nextTick } from 'vue';
// import { calculatePickerPosition } from '../utils/uiUtils.js';
// import { handleInlineEdit } from './cellEditHandlers.js';
import { 
  findNextCellForFastNavigation,
  handleNavigationKeyDown 
} from './keyboardNavigation.js';
import { 
  handleDateTimeTypeToEdit, 
  setupDateTimeInputHandling 
} from './keyboardDateTime.js';
import { 
  handleCopy, 
  handlePaste 
} from './keyboardClipboard.js';
import { 
  handleTypeToEdit, 
  handleClearSelectedData, 
  handleEditModeKeyDown,
  isTypingKey 
} from './keyboardEditing.js';

/**
 * 가상 스크롤용 키보드 이벤트 핸들러
 * 
 * 이제 이 파일은 메인 디스패처 역할만 수행하며,
 * 구체적인 로직은 다음 파일들로 분리되었습니다:
 * - keyboardNavigation.js: 네비게이션 (화살표 키, Tab 등)
 * - keyboardDateTime.js: 날짜/시간 입력 관련
 * - keyboardClipboard.js: 복사/붙여넣기
 * - keyboardEditing.js: 편집 모드 전환 및 데이터 삭제
 */

export { setupDateTimeInputHandling }; // 다른 컴포넌트에서 사용할 수 있도록 re-export

/**
 * 그리드 컨테이너의 키보드 다운 이벤트를 처리합니다.
 * @param {KeyboardEvent} event
 * @param {object} context
 */
export async function handleVirtualKeyDown(event, context) {
  const { selectionSystem, rows, allColumnsMeta, ensureCellIsVisible, isEditing, startEditing, getCellValue } = context;
  const { state } = selectionSystem;
  
  const { key, ctrlKey, shiftKey, metaKey } = event;
  const isCtrlOrCmd = ctrlKey || metaKey;

  // --- 편집 모드 처리 ---
  if (isEditing) {
    await handleEditModeKeyDown(event, context);
    return;
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
  
  // Fast Navigation에 필요한 변수
  let nextRow = currentRow;
  let nextCol = currentCol;

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
  // Arrow keys, Tab, Enter (in navigation mode)
  if (await handleNavigationKeyDown(event, context)) {
    return;
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