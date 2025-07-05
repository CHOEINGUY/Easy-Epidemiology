import { ValidationManager } from '../src/validation/ValidationManager.js';
import { createStore } from 'vuex';

describe('ValidationManager Integration Tests', () => {
  let store;
  let validationManager;
  
  beforeEach(() => {
    store = createStore({
      state: {
        validationState: {
          errors: new Map(),
          version: 0
        }
      },
      mutations: {
        ADD_VALIDATION_ERROR(state, { rowIndex, colIndex, message }) {
          const key = `${rowIndex}_${colIndex}`;
          const newMap = new Map(state.validationState.errors);
          newMap.set(key, { message, timestamp: Date.now() });
          state.validationState.errors = newMap;
          state.validationState.version++;
        },
        REMOVE_VALIDATION_ERROR(state, { rowIndex, colIndex }) {
          const key = `${rowIndex}_${colIndex}`;
          if (!state.validationState.errors.has(key)) return;
          const newMap = new Map(state.validationState.errors);
          newMap.delete(key);
          state.validationState.errors = newMap;
          state.validationState.version++;
        },
        CLEAR_VALIDATION_ERRORS(state) {
          state.validationState.errors = new Map();
          state.validationState.version++;
        },
        SET_VALIDATION_ERRORS(state, errors) {
          state.validationState.errors = errors;
          state.validationState.version++;
        }
      }
    });
    
    validationManager = new ValidationManager(store);
  });
  
  test('행 추가 시 검증 처리', () => {
    const newRow = { name: 'test', age: '25' };
    const columnMetas = [
      { colIndex: 0, dataKey: 'name', type: 'text', isEditable: true },
      { colIndex: 1, dataKey: 'age', type: 'number', isEditable: true }
    ];
    
    validationManager.handleRowAddition(0, newRow, columnMetas);
    
    // 검증 오류가 있는지 확인
    expect(store.state.validationState.errors.size).toBeGreaterThan(0);
  });
  
  test('행 삭제 시 오류 인덱스 재조정', () => {
    // 초기 오류 설정
    store.commit('ADD_VALIDATION_ERROR', { rowIndex: 2, colIndex: 0, message: 'Error' });
    store.commit('ADD_VALIDATION_ERROR', { rowIndex: 3, colIndex: 0, message: 'Error' });
    
    // 행 1 삭제
    validationManager.handleRowDeletion([1]);
    
    // 오류 인덱스가 올바르게 조정되었는지 확인
    expect(store.state.validationState.errors.has('1_0')).toBe(true); // 기존 2번 행
    expect(store.state.validationState.errors.has('2_0')).toBe(true); // 기존 3번 행
  });
  
  test('열 삭제 시 오류 인덱스 재조정', () => {
    // 초기 오류 설정
    store.commit('ADD_VALIDATION_ERROR', { rowIndex: 0, colIndex: 2, message: 'Error' });
    store.commit('ADD_VALIDATION_ERROR', { rowIndex: 0, colIndex: 3, message: 'Error' });
    
    // 열 1 삭제
    validationManager.handleColumnDeletion([1]);
    
    // 오류 인덱스가 올바르게 조정되었는지 확인
    expect(store.state.validationState.errors.has('0_1')).toBe(true); // 기존 2번 열
    expect(store.state.validationState.errors.has('0_2')).toBe(true); // 기존 3번 열
  });
  
  test('데이터 클리어 시 오류 제거', () => {
    // 초기 오류 설정
    store.commit('ADD_VALIDATION_ERROR', { rowIndex: 0, colIndex: 0, message: 'Error' });
    store.commit('ADD_VALIDATION_ERROR', { rowIndex: 1, colIndex: 1, message: 'Error' });
    
    const clearedCells = [
      { rowIndex: 0, colIndex: 0 },
      { rowIndex: 1, colIndex: 1 }
    ];
    
    validationManager.handleDataClear(clearedCells);
    
    // 오류가 제거되었는지 확인
    expect(store.state.validationState.errors.size).toBe(0);
  });
  
  test('붙여넣기 시 검증 처리', () => {
    const pasteData = [
      ['test1', '25'],
      ['test2', '30']
    ];
    const columnMetas = [
      { colIndex: 0, dataKey: 'name', type: 'text', isEditable: true },
      { colIndex: 1, dataKey: 'age', type: 'number', isEditable: true }
    ];
    
    validationManager.handlePasteData(pasteData, 0, 0, columnMetas);
    
    // 검증 오류가 있는지 확인
    expect(store.state.validationState.errors.size).toBeGreaterThan(0);
  });
  
  test('대량 데이터 임포트 성능', async () => {
    const largeData = Array.from({ length: 10000 }, (_, i) => ({
      name: `User ${i}`,
      age: '25'
    }));
    
    const columnMetas = [
      { colIndex: 0, dataKey: 'name', type: 'text', isEditable: true },
      { colIndex: 1, dataKey: 'age', type: 'number', isEditable: true }
    ];
    
    const startTime = Date.now();
    await validationManager.handleDataImport(largeData, columnMetas);
    const endTime = Date.now();
    
    // 10초 이내에 완료되어야 함
    expect(endTime - startTime).toBeLessThan(10000);
  });
  
  test('진행률 콜백 테스트', async () => {
    const progressCallback = jest.fn();
    const validationManagerWithProgress = new ValidationManager(store, {
      onProgress: progressCallback
    });
    
    const testData = Array.from({ length: 100 }, (_, i) => ({
      name: `User ${i}`,
      age: '25'
    }));
    
    const columnMetas = [
      { colIndex: 0, dataKey: 'name', type: 'text', isEditable: true },
      { colIndex: 1, dataKey: 'age', type: 'number', isEditable: true }
    ];
    
    await validationManagerWithProgress.handleDataImport(testData, columnMetas);
    
    // 진행률 콜백이 호출되었는지 확인
    expect(progressCallback).toHaveBeenCalled();
    expect(progressCallback).toHaveBeenCalledWith(100); // 완료 시 100%
  });
  
  test('특정 행의 오류 제거', () => {
    // 초기 오류 설정
    store.commit('ADD_VALIDATION_ERROR', { rowIndex: 0, colIndex: 0, message: 'Error1' });
    store.commit('ADD_VALIDATION_ERROR', { rowIndex: 0, colIndex: 1, message: 'Error2' });
    store.commit('ADD_VALIDATION_ERROR', { rowIndex: 1, colIndex: 0, message: 'Error3' });
    
    validationManager.clearErrorsForRow(0);
    
    // 0번 행의 오류만 제거되었는지 확인
    expect(store.state.validationState.errors.has('0_0')).toBe(false);
    expect(store.state.validationState.errors.has('0_1')).toBe(false);
    expect(store.state.validationState.errors.has('1_0')).toBe(true); // 1번 행은 유지
  });
  
  test('특정 열의 오류 제거', () => {
    // 초기 오류 설정
    store.commit('ADD_VALIDATION_ERROR', { rowIndex: 0, colIndex: 0, message: 'Error1' });
    store.commit('ADD_VALIDATION_ERROR', { rowIndex: 1, colIndex: 0, message: 'Error2' });
    store.commit('ADD_VALIDATION_ERROR', { rowIndex: 0, colIndex: 1, message: 'Error3' });
    
    validationManager.clearErrorsForColumn(0);
    
    // 0번 열의 오류만 제거되었는지 확인
    expect(store.state.validationState.errors.has('0_0')).toBe(false);
    expect(store.state.validationState.errors.has('1_0')).toBe(false);
    expect(store.state.validationState.errors.has('0_1')).toBe(true); // 1번 열은 유지
  });
}); 