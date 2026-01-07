
import { showToast } from '../logic/toast.js';

/**
 * 가상 스크롤용 클립보드 이벤트 핸들러
 */

export async function handleCopy(context) {
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
    showToast('복사 실패: 클립보드 권한을 확인해주세요.', 'error');
  }
}

export async function handlePaste(context) {
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

    // storeBridge.pasteData를 직접 호출
    await context.storeBridge.pasteData({
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
    // [Critical Fix] Silent Failure Prevention
    showToast('붙여넣기 실패: 클립보드 권한을 허용해주세요.', 'error');
  }
}
