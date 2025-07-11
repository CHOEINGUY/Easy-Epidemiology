import { ValidationManager } from '../src/validation/ValidationManager.js';

// Mock store
const mockStore = {
  state: {
    validationState: {
      errors: new Map()
    }
  },
  commit: jest.fn()
};

describe('ValidationManager Paste Tests', () => {
  let validationManager;

  beforeEach(() => {
    validationManager = new ValidationManager(mockStore);
    mockStore.commit.mockClear();
  });

  test('붙여넣기 검증 - 기본 기능', async () => {
    const pasteData = [
      ['test1', '25'],
      ['test2', '30']
    ];
    const columnMetas = [
      { colIndex: 0, dataKey: 'name', type: 'text', isEditable: true },
      { colIndex: 1, dataKey: 'age', type: 'number', isEditable: true }
    ];

    const result = await validationManager.handlePasteData(
      pasteData, 
      0, 
      0, 
      columnMetas,
      { showSummary: false }
    );

    expect(result.totalCells).toBe(4);
    expect(result.errorCount).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(result.errors)).toBe(true);
  });

  test('붙여넣기 검증 - 진행률 콜백', async () => {
    const pasteData = Array.from({ length: 10 }, (_, i) => [`user${i}`, '25']);
    const columnMetas = [
      { colIndex: 0, dataKey: 'name', type: 'text', isEditable: true },
      { colIndex: 1, dataKey: 'age', type: 'number', isEditable: true }
    ];

    const progressCallback = jest.fn();

    await validationManager.handlePasteData(
      pasteData,
      0,
      0,
      columnMetas,
      {
        onProgress: progressCallback,
        batchSize: 5,
        showSummary: false
      }
    );

    expect(progressCallback).toHaveBeenCalled();
  });

  test('붙여넣기 검증 - 오류 집계', async () => {
    const pasteData = [
      ['invalid', 'not-a-number'],
      ['valid', '25']
    ];
    const columnMetas = [
      { colIndex: 0, dataKey: 'name', type: 'text', isEditable: true },
      { colIndex: 1, dataKey: 'age', type: 'number', isEditable: true }
    ];

    const result = await validationManager.handlePasteData(
      pasteData,
      0,
      0,
      columnMetas,
      { showSummary: false }
    );

    expect(result.errorCount).toBeGreaterThan(0);
    expect(result.errors.some(error => error.message.includes('숫자'))).toBe(true);
  });

  test('붙여넣기 검증 - 빈 값 처리', async () => {
    const pasteData = [
      ['', '25'],
      ['test', '']
    ];
    const columnMetas = [
      { colIndex: 0, dataKey: 'name', type: 'text', isEditable: true },
      { colIndex: 1, dataKey: 'age', type: 'number', isEditable: true }
    ];

    const result = await validationManager.handlePasteData(
      pasteData,
      0,
      0,
      columnMetas,
      { showSummary: false }
    );

    // 빈 값은 검증하지 않으므로 오류가 적어야 함
    expect(result.errorCount).toBeLessThanOrEqual(1);
  });

  test('붙여넣기 검증 - 대용량 데이터 성능', async () => {
    const pasteData = Array.from({ length: 1000 }, (_, i) => [`user${i}`, '25']);
    const columnMetas = [
      { colIndex: 0, dataKey: 'name', type: 'text', isEditable: true },
      { colIndex: 1, dataKey: 'age', type: 'number', isEditable: true }
    ];

    const startTime = Date.now();
    
    await validationManager.handlePasteData(
      pasteData,
      0,
      0,
      columnMetas,
      {
        batchSize: 50,
        showSummary: false
      }
    );

    const endTime = Date.now();
    const duration = endTime - startTime;

    // 5초 이내에 완료되어야 함
    expect(duration).toBeLessThan(5000);
  });
}); 