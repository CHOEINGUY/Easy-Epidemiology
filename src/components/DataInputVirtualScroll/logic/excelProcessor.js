// Excel processor for VirtualScroll version using Web Worker offloading.

// Public API: processExcelFile(file: File, onProgress?: (percent:number)=>void)
// Returns Promise resolving to { headers, rows, hasIndividualExposureTime }

export function processExcelFile(file, onProgress = () => {}) {
  if (!(file instanceof File)) {
    return Promise.reject(new Error('유효한 파일이 아닙니다.'));
  }

  // Use regular Promise executor (not async) to satisfy ESLint
  return new Promise((resolve, reject) => {
    file
      .arrayBuffer()
      .then((buffer) => {
        // Dynamically create worker
        const worker = new Worker(new URL('../workers/excelWorker.js', import.meta.url), {
          type: 'module'
        });

        worker.onmessage = (e) => {
          const { type, data, progress, error } = e.data || {};
          switch (type) {
          case 'progress':
            onProgress(progress);
            break;
          case 'complete':
            onProgress(100);
            worker.terminate();
            resolve(data);
            break;
          case 'error':
            worker.terminate();
            reject(new Error(error || 'Excel 파싱 실패'));
            break;
          default:
            break;
          }
        };

        worker.onerror = (err) => {
          worker.terminate();
          reject(err);
        };

        // Transfer ArrayBuffer to worker
        worker.postMessage({ buffer }, [buffer]);
        // Initial small progress
        onProgress(5);
      })
      .catch((err) => reject(err));
  });
}

// Fallback direct processing (synchronous) can be imported from refactor version if really needed. 