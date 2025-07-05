/*
 * validationWorker.js
 * -------------------
 * Web Worker (ES module): bulk cell validation off the main thread.
 * Receives: { rows, columnMetas }
 * Replies:  { type:'done', invalidCells:[{ row,col,message }] }
 */

import { validateCell } from '../../store/utils/validation.js';

self.onmessage = (e) => {
  const { rows, columnMetas } = e.data || {};

  if (!Array.isArray(rows) || !Array.isArray(columnMetas)) {
    self.postMessage({ type: 'error', error: 'Invalid payload' });
    return;
  }

  const invalidCells = [];

  rows.forEach((row, rowIndex) => {
    columnMetas.forEach((meta) => {
      if (!meta.isEditable) return;
      let value = '';
      if (meta.cellIndex !== null && meta.cellIndex !== undefined) {
        const arr = row[meta.dataKey] || [];
        value = Array.isArray(arr) ? arr[meta.cellIndex] ?? '' : '';
      } else {
        value = row[meta.dataKey] ?? '';
      }

      const res = validateCell(value, meta.type);
      if (!res.valid) {
        invalidCells.push({ row: rowIndex, col: meta.colIndex, message: res.message });
      }
    });
  });

  self.postMessage({ type: 'done', invalidCells });
}; 