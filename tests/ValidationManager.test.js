import { createStore } from 'vuex';
import ValidationManager from '../src/validation/ValidationManager.js';

function createDummyStore() {
  return createStore({
    state: {
      validationState: {
        errors: new Map(),
        version: 0
      }
    },
    mutations: {
      ADD_VALIDATION_ERROR(state, payload) {
        const key = `${payload.rowIndex}_${payload.colIndex}`;
        const newMap = new Map(state.validationState.errors);
        newMap.set(key, { message: payload.message, timestamp: Date.now() });
        state.validationState.errors = newMap;
        state.validationState.version++;
      },
      REMOVE_VALIDATION_ERROR(state, payload) {
        const key = `${payload.rowIndex}_${payload.colIndex}`;
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
}

describe('ValidationManager', () => {
  let store;
  let vm;

  beforeEach(() => {
    jest.useFakeTimers();
    store = createDummyStore();
    vm = new ValidationManager(store, { 
      debounceDelay: 300,
      debug: false 
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    if (vm) {
      vm.destroy();
    }
  });

  describe('Constructor', () => {
    it('should initialize with default options', () => {
      expect(vm.DEBOUNCE_DELAY).toBe(300);
      expect(vm.validationTimers).toBeInstanceOf(Map);
      expect(vm._destroyed).toBe(false);
    });

    it('should throw error when store is not provided', () => {
      expect(() => new ValidationManager(null)).toThrow('ValidationManager: Vuex store instance required');
    });
  });

  describe('validateCell', () => {
    it('should debounce validation calls', () => {
      const validateSpy = jest.spyOn(vm, 'performValidation');

      vm.validateCell(0, 1, 'abc', 'string');
      vm.validateCell(0, 1, 'abc', 'string');

      // Should not run immediately
      expect(validateSpy).not.toHaveBeenCalled();

      jest.advanceTimersByTime(300);
      expect(validateSpy).toHaveBeenCalledTimes(1);
      expect(validateSpy).toHaveBeenCalledWith(0, 1, 'abc', 'string');
    });

    it('should validate immediately when immediate flag is true', () => {
      const validateSpy = jest.spyOn(vm, 'performValidation');
      
      vm.validateCell(1, 2, '', 'string', true);
      
      expect(validateSpy).toHaveBeenCalledWith(1, 2, '', 'string');
    });

    it('should validate immediately for empty values', () => {
      const validateSpy = jest.spyOn(vm, 'performValidation');
      
      vm.validateCell(1, 2, '', 'string');
      
      expect(validateSpy).toHaveBeenCalledWith(1, 2, '', 'string');
    });

    it('should cancel existing timer for same cell', () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      
      vm.validateCell(0, 1, 'abc', 'string');
      vm.validateCell(0, 1, 'def', 'string');
      
      expect(clearTimeoutSpy).toHaveBeenCalled();
    });

    it('should not validate if destroyed', () => {
      vm.destroy();
      const validateSpy = jest.spyOn(vm, 'performValidation');
      
      vm.validateCell(0, 1, 'abc', 'string');
      
      expect(validateSpy).not.toHaveBeenCalled();
    });
  });

  describe('revalidateAll', () => {
    const mockRows = [
      { basicInfo: ['test1'], clinicalSymptoms: ['symptom1'], isPatient: '1' },
      { basicInfo: ['test2'], clinicalSymptoms: ['symptom2'], isPatient: '0' }
    ];

    const mockColumnMetas = [
      { colIndex: 0, type: 'basic', isEditable: true, dataKey: 'basicInfo', cellIndex: 0 },
      { colIndex: 1, type: 'clinical', isEditable: true, dataKey: 'clinicalSymptoms', cellIndex: 0 },
      { colIndex: 2, type: 'isPatient', isEditable: true, dataKey: 'isPatient', cellIndex: null }
    ];

    it('should clear all errors before revalidation', () => {
      const clearSpy = jest.spyOn(vm, 'clearAllErrors');
      
      vm.revalidateAll(mockRows, mockColumnMetas);
      
      expect(clearSpy).toHaveBeenCalled();
    });

    it('should handle empty data gracefully', () => {
      expect(() => vm.revalidateAll([], [])).not.toThrow();
      expect(() => vm.revalidateAll(mockRows, [])).not.toThrow();
      expect(() => vm.revalidateAll([], mockColumnMetas)).not.toThrow();
    });

    it('should validate all editable cells synchronously when no chunk size', () => {
      const validateSpy = jest.spyOn(vm, 'validateCell');
      
      vm.revalidateAll(mockRows, mockColumnMetas, { chunkSize: null });
      
      // 2 rows * 3 editable columns = 6 validations
      expect(validateSpy).toHaveBeenCalledTimes(6);
    });

    it('should validate in chunks when chunk size is specified', () => {
      const validateSpy = jest.spyOn(vm, 'validateCell');
      
      vm.revalidateAll(mockRows, mockColumnMetas, { chunkSize: 1 });
      
      // First chunk should be processed immediately
      expect(validateSpy).toHaveBeenCalledTimes(3); // 1 row * 3 columns
      
      // Process next chunk
      jest.runAllTimers();
      expect(validateSpy).toHaveBeenCalledTimes(6); // 2 rows * 3 columns
    });
  });

  describe('clearErrorsForCells', () => {
    beforeEach(() => {
      // Add some test errors
      store.commit('ADD_VALIDATION_ERROR', { rowIndex: 0, colIndex: 0, message: 'Error 1' });
      store.commit('ADD_VALIDATION_ERROR', { rowIndex: 1, colIndex: 1, message: 'Error 2' });
    });

    it('should remove errors for specified cells', () => {
      expect(store.state.validationState.errors.size).toBe(2);
      
      vm.clearErrorsForCells([{ row: 0, col: 0 }]);
      
      expect(store.state.validationState.errors.size).toBe(1);
      expect(store.state.validationState.errors.has('1_1')).toBe(true);
    });
  });

  describe('clearErrorsForRow', () => {
    beforeEach(() => {
      // Add test errors
      store.commit('ADD_VALIDATION_ERROR', { rowIndex: 0, colIndex: 0, message: 'Error 1' });
      store.commit('ADD_VALIDATION_ERROR', { rowIndex: 0, colIndex: 1, message: 'Error 2' });
      store.commit('ADD_VALIDATION_ERROR', { rowIndex: 1, colIndex: 0, message: 'Error 3' });
    });

    it('should remove all errors for specified row', () => {
      expect(store.state.validationState.errors.size).toBe(3);
      
      vm.clearErrorsForRow(0);
      
      expect(store.state.validationState.errors.size).toBe(1);
      expect(store.state.validationState.errors.has('1_0')).toBe(true);
    });
  });

  describe('clearErrorsForColumn', () => {
    beforeEach(() => {
      // Add test errors
      store.commit('ADD_VALIDATION_ERROR', { rowIndex: 0, colIndex: 0, message: 'Error 1' });
      store.commit('ADD_VALIDATION_ERROR', { rowIndex: 1, colIndex: 0, message: 'Error 2' });
      store.commit('ADD_VALIDATION_ERROR', { rowIndex: 0, colIndex: 1, message: 'Error 3' });
    });

    it('should remove all errors for specified column', () => {
      expect(store.state.validationState.errors.size).toBe(3);
      
      vm.clearErrorsForColumn(0);
      
      expect(store.state.validationState.errors.size).toBe(1);
      expect(store.state.validationState.errors.has('0_1')).toBe(true);
    });
  });

  describe('clearAllErrors', () => {
    beforeEach(() => {
      // Add test errors and timers
      store.commit('ADD_VALIDATION_ERROR', { rowIndex: 0, colIndex: 0, message: 'Error 1' });
      vm.validateCell(0, 0, 'test', 'string');
    });

    it('should clear all errors and timers', () => {
      expect(store.state.validationState.errors.size).toBe(1);
      expect(vm.validationTimers.size).toBe(1);
      
      vm.clearAllErrors();
      
      expect(store.state.validationState.errors.size).toBe(0);
      expect(vm.validationTimers.size).toBe(0);
    });
  });

  describe('clearTimers', () => {
    beforeEach(() => {
      vm.validateCell(0, 0, 'test', 'string');
    });

    it('should clear only timers, not errors', () => {
      expect(vm.validationTimers.size).toBe(1);
      
      vm.clearTimers();
      
      expect(vm.validationTimers.size).toBe(0);
    });
  });

  describe('onDataReset', () => {
    beforeEach(() => {
      vm.validateCell(0, 0, 'test', 'string');
    });

    it('should clear timers but not errors', () => {
      expect(vm.validationTimers.size).toBe(1);
      
      vm.onDataReset();
      
      expect(vm.validationTimers.size).toBe(0);
    });
  });

  describe('destroy', () => {
    beforeEach(() => {
      vm.validateCell(0, 0, 'test', 'string');
      store.commit('ADD_VALIDATION_ERROR', { rowIndex: 0, colIndex: 0, message: 'Error 1' });
    });

    it('should clean up all resources', () => {
      expect(vm.validationTimers.size).toBe(1);
      expect(store.state.validationState.errors.size).toBe(1);
      
      vm.destroy();
      
      expect(vm.validationTimers.size).toBe(0);
      expect(store.state.validationState.errors.size).toBe(0);
      expect(vm._destroyed).toBe(true);
      expect(vm.store).toBe(null);
    });
  });

  describe('performValidation', () => {
    it('should add error when validation fails', () => {
      vm.performValidation(0, 0, 'invalid', 'number');
      
      expect(store.state.validationState.errors.size).toBe(1);
      expect(store.state.validationState.errors.has('0_0')).toBe(true);
    });

    it('should remove error when validation passes', () => {
      // First add an error
      store.commit('ADD_VALIDATION_ERROR', { rowIndex: 0, colIndex: 0, message: 'Error' });
      expect(store.state.validationState.errors.size).toBe(1);
      
      // Then validate with valid data
      vm.performValidation(0, 0, '123', 'number');
      
      expect(store.state.validationState.errors.size).toBe(0);
    });
  });

  describe('_shouldValidateImmediately', () => {
    it('should return true for empty values', () => {
      expect(vm._shouldValidateImmediately('')).toBe(true);
      expect(vm._shouldValidateImmediately(null)).toBe(true);
      expect(vm._shouldValidateImmediately(undefined)).toBe(true);
    });

    it('should return false for non-empty values', () => {
      expect(vm._shouldValidateImmediately('test')).toBe(false);
      expect(vm._shouldValidateImmediately(0)).toBe(false);
      expect(vm._shouldValidateImmediately(false)).toBe(false);
    });
  });

  describe('_getCellValue', () => {
    const mockRow = {
      basicInfo: ['value1', 'value2'],
      isPatient: '1'
    };

    it('should return array value when cellIndex is specified', () => {
      const columnMeta = { dataKey: 'basicInfo', cellIndex: 0 };
      expect(vm._getCellValue(mockRow, columnMeta)).toBe('value1');
    });

    it('should return single value when cellIndex is null', () => {
      const columnMeta = { dataKey: 'isPatient', cellIndex: null };
      expect(vm._getCellValue(mockRow, columnMeta)).toBe('1');
    });

    it('should return empty string for missing data', () => {
      const columnMeta = { dataKey: 'nonexistent', cellIndex: null };
      expect(vm._getCellValue(mockRow, columnMeta)).toBe('');
    });

    it('should handle null row', () => {
      const columnMeta = { dataKey: 'basicInfo', cellIndex: 0 };
      expect(vm._getCellValue(null, columnMeta)).toBe('');
    });
  });

  describe('validateIndividualExposureColumn', () => {
    const mockExposureData = [
      { rowIndex: 0, value: '2023-01-01T10:00' },
      { rowIndex: 1, value: '2023-01-02T15:30' },
      { rowIndex: 2, value: 'invalid-date' },
      { rowIndex: 3, value: '' },
      { rowIndex: 4, value: null }
    ];

    it('should validate individual exposure column data', () => {
      const validateSpy = jest.spyOn(vm, 'validateCell');
      
      vm.validateIndividualExposureColumn(mockExposureData, 5);
      
      // 유효한 데이터만 검증됨 (빈 값, null 제외)
      expect(validateSpy).toHaveBeenCalledTimes(3);
      expect(validateSpy).toHaveBeenCalledWith(0, 5, '2023-01-01T10:00', 'individualExposureTime', true);
      expect(validateSpy).toHaveBeenCalledWith(1, 5, '2023-01-02T15:30', 'individualExposureTime', true);
      expect(validateSpy).toHaveBeenCalledWith(2, 5, 'invalid-date', 'individualExposureTime', true);
    });

    it('should handle empty data array', () => {
      const validateSpy = jest.spyOn(vm, 'validateCell');
      
      vm.validateIndividualExposureColumn([], 5);
      
      expect(validateSpy).not.toHaveBeenCalled();
    });

    it('should call progress callback when provided', () => {
      const progressCallback = jest.fn();
      const validateSpy = jest.spyOn(vm, 'validateCell');
      
      vm.validateIndividualExposureColumn(mockExposureData, 5, progressCallback);
      
      expect(validateSpy).toHaveBeenCalled();
      expect(progressCallback).toHaveBeenCalledWith(100);
    });

    it('should handle null data', () => {
      const validateSpy = jest.spyOn(vm, 'validateCell');
      
      vm.validateIndividualExposureColumn(null, 5);
      
      expect(validateSpy).not.toHaveBeenCalled();
    });
  });
}); 