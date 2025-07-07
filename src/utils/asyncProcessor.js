/**
 * asyncProcessor.js
 * 웹 워커 대신 requestIdleCallback과 청크 처리를 사용하는 비동기 처리 유틸리티
 * file:/// 환경에서도 완벽하게 작동
 */

// requestIdleCallback 폴백 (구형 브라우저 지원)
const requestIdleCallback = window.requestIdleCallback || 
  ((callback) => setTimeout(() => callback({ didTimeout: false }), 1));

const cancelIdleCallback = window.cancelIdleCallback || 
  ((id) => clearTimeout(id));

/**
 * 청크 단위로 데이터를 처리하는 함수
 * @param {Array} data - 처리할 데이터 배열
 * @param {Function} processor - 각 아이템을 처리하는 함수
 * @param {Object} options - 옵션
 * @param {number} options.chunkSize - 청크 크기 (기본값: 100)
 * @param {number} options.timeout - 각 청크의 최대 처리 시간 (기본값: 16ms)
 * @param {Function} options.onProgress - 진행률 콜백
 * @param {Function} options.onComplete - 완료 콜백
 * @param {Function} options.onError - 오류 콜백
 */
export function processInChunks(data, processor, options = {}) {
  const {
    chunkSize = 100,
    timeout = 16,
    onProgress = () => {},
    onComplete = () => {},
    onError = () => {}
  } = options;

  let currentIndex = 0;
  let isCancelled = false;
  let idleCallbackId = null;

  const processChunk = (deadline) => {
    if (isCancelled) return;

    const startTime = performance.now();

    try {
      // deadline이 있으면 그 시간까지, 없으면 timeout까지 처리
      const timeLimit = deadline ? deadline.timeRemaining() : timeout;

      while (currentIndex < data.length && 
             (performance.now() - startTime) < timeLimit) {
        
        const chunk = data.slice(currentIndex, currentIndex + chunkSize);
        
        // 청크 처리
        for (let i = 0; i < chunk.length; i++) {
          const item = chunk[i];
          const globalIndex = currentIndex + i;
          
          try {
            processor(item, globalIndex, data);
          } catch (error) {
            onError(error, globalIndex);
          }
        }

        currentIndex += chunk.length;
        
        // 진행률 업데이트
        const progress = Math.min((currentIndex / data.length) * 100, 100);
        onProgress(progress, currentIndex, data.length);

        // 청크 크기만큼만 처리하고 다음 idle에 넘김
        if (currentIndex % chunkSize === 0) {
          break;
        }
      }

      // 아직 처리할 데이터가 있으면 다음 idle에 예약
      if (currentIndex < data.length) {
        idleCallbackId = requestIdleCallback(processChunk, { timeout });
      } else {
        // 완료
        onComplete(data);
      }

    } catch (error) {
      onError(error);
    }
  };

  // 처리 시작
  idleCallbackId = requestIdleCallback(processChunk, { timeout });

  // 취소 함수 반환
  return {
    cancel: () => {
      isCancelled = true;
      if (idleCallbackId) {
        cancelIdleCallback(idleCallbackId);
        idleCallbackId = null;
      }
    },
    getProgress: () => ({
      current: currentIndex,
      total: data.length,
      percentage: (currentIndex / data.length) * 100
    })
  };
}

/**
 * 대용량 배열을 비동기적으로 검증하는 함수
 * @param {Array} rows - 검증할 행 데이터
 * @param {Array} columnMetas - 컬럼 메타데이터
 * @param {Function} validator - 검증 함수
 * @param {Object} options - 옵션
 */
export function validateDataAsync(rows, columnMetas, validator, options = {}) {
  const {
    chunkSize = 50,
    onProgress = () => {},
    onComplete = () => {},
    onError = () => {}
  } = options;

  const invalidCells = [];
  const totalCells = rows.length * columnMetas.filter(meta => meta.isEditable).length;
  let processedCells = 0;

  // 검증할 셀들을 평면화
  const cellsToValidate = [];
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

      cellsToValidate.push({
        rowIndex,
        colIndex: meta.colIndex,
        value,
        type: meta.type
      });
    });
  });

  const processor = (cell) => {
    const result = validator(cell.value, cell.type);
    if (!result.valid) {
      invalidCells.push({
        row: cell.rowIndex,
        col: cell.colIndex,
        message: result.message
      });
    }
    processedCells++;
  };

  const progressHandler = (progress) => {
    onProgress(progress, processedCells, totalCells);
  };

  const completeHandler = () => {
    onComplete(invalidCells);
  };

  return processInChunks(cellsToValidate, processor, {
    chunkSize,
    onProgress: progressHandler,
    onComplete: completeHandler,
    onError
  });
}

/**
 * Excel 파일을 비동기적으로 처리하는 함수
 * @param {ArrayBuffer} buffer - Excel 파일 버퍼
 * @param {Function} parser - 파싱 함수
 * @param {Object} options - 옵션
 */
export function processExcelAsync(buffer, parser, options = {}) {
  const {
    chunkSize = 1000,
    onProgress = () => {},
    onComplete = () => {},
    onError = () => {}
  } = options;

  return new Promise((resolve, reject) => {
    try {
      // 초기 진행률
      onProgress(10);

      // 파싱 작업을 청크로 나누어 처리
      const processData = (data) => {
        const processor = (item, index) => {
          // 각 행 처리
          parser(item, index);
        };

        const progressHandler = (progress) => {
          // 10% ~ 90% 범위에서 진행률 표시
          const adjustedProgress = 10 + (progress * 0.8);
          onProgress(adjustedProgress);
        };

        const completeHandler = (result) => {
          onProgress(100);
          onComplete(result);
          resolve(result);
        };

        return processInChunks(data, processor, {
          chunkSize,
          onProgress: progressHandler,
          onComplete: completeHandler,
          onError: (error) => {
            onError(error);
            reject(error);
          }
        });
      };

      // Excel 파싱 로직을 여기에 구현
      // (기존 excelWorker.js의 로직을 동기적으로 실행)
      const result = parser(buffer);
      processData(result);

    } catch (error) {
      onError(error);
      reject(error);
    }
  });
} 