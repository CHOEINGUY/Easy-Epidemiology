/**
 * asyncProcessor.test.js
 * 비동기 처리 유틸리티 테스트
 */

import { processInChunks, validateDataAsync } from '../src/utils/asyncProcessor.js';

// requestIdleCallback 모킹
global.requestIdleCallback = jest.fn((callback) => {
  setTimeout(() => callback({ didTimeout: false }), 1);
  return 1;
});

global.cancelIdleCallback = jest.fn();

describe('asyncProcessor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('processInChunks', () => {
    it('should process data in chunks', (done) => {
      const data = Array.from({ length: 100 }, (_, i) => i);
      const processed = [];
      
      const processor = (item) => {
        processed.push(item);
      };

      processInChunks(data, processor, {
        chunkSize: 10,
        onComplete: () => {
          expect(processed).toHaveLength(100);
          expect(processed).toEqual(data);
          done();
        }
      });
    });

    it('should report progress', (done) => {
      const data = Array.from({ length: 50 }, (_, i) => i);
      const progressReports = [];
      
      const processor = () => {
        // 간단한 처리
      };

      processInChunks(data, processor, {
        chunkSize: 10,
        onProgress: (progress) => {
          progressReports.push(progress);
        },
        onComplete: () => {
          expect(progressReports.length).toBeGreaterThan(0);
          expect(progressReports[progressReports.length - 1]).toBe(100);
          done();
        }
      });
    });

    it('should handle errors gracefully', (done) => {
      const data = Array.from({ length: 10 }, (_, i) => i);
      const errors = [];
      
      const processor = (item) => {
        if (item === 5) {
          throw new Error('Test error');
        }
      };

      processInChunks(data, processor, {
        onError: (error) => {
          errors.push(error);
        },
        onComplete: () => {
          expect(errors.length).toBeGreaterThan(0);
          done();
        }
      });
    });

    it('should be cancellable', (done) => {
      const data = Array.from({ length: 1000 }, (_, i) => i);
      let processedCount = 0;
      
      const processor = () => {
        processedCount++;
      };

      const task = processInChunks(data, processor, {
        chunkSize: 10,
        onComplete: () => {
          // 취소되었으므로 완료되지 않아야 함
          expect(processedCount).toBeLessThan(1000);
          done();
        }
      });

      // 즉시 취소
      setTimeout(() => {
        task.cancel();
      }, 10);
    });
  });

  describe('validateDataAsync', () => {
    it('should validate data asynchronously', (done) => {
      const rows = [
        { basicInfo: ['test1'], clinicalSymptoms: ['symptom1'] },
        { basicInfo: ['test2'], clinicalSymptoms: ['symptom2'] }
      ];
      
      const columnMetas = [
        { isEditable: true, colIndex: 0, type: 'text', dataKey: 'basicInfo', cellIndex: 0 }
      ];

      const validator = (value) => {
        return { valid: value.length > 0, message: value.length === 0 ? 'Empty value' : '' };
      };

      validateDataAsync(rows, columnMetas, validator, {
        onComplete: (invalidCells) => {
          expect(Array.isArray(invalidCells)).toBe(true);
          done();
        }
      });
    });
  });
}); 