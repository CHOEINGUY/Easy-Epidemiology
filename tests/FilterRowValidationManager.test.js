import { FilterRowValidationManager } from '../src/components/DataInputVirtualScroll/utils/FilterRowValidationManager.js';

describe('FilterRowValidationManager', () => {
  let manager;
  
  beforeEach(() => {
    manager = new FilterRowValidationManager();
    manager.setDebugMode(true);
  });
  
  afterEach(() => {
    manager = null;
  });
  
  describe('기본 초기화', () => {
    test('매니저가 올바르게 초기화되어야 함', () => {
      expect(manager.isFiltered).toBe(false);
      expect(manager.filteredRows).toEqual([]);
      expect(manager.deletedRowIndices).toEqual([]);
      expect(manager.addedRowIndices).toEqual([]);
      expect(manager.validationErrors).toBeInstanceOf(Map);
    });
  });
  
  describe('필터 상태 업데이트', () => {
    test('필터 상태가 올바르게 업데이트되어야 함', () => {
      const filteredRows = [
        { _originalIndex: 0, data: 'row1' },
        { _originalIndex: 2, data: 'row3' }
      ];
      const validationErrors = new Map([
        ['0_isPatient', '환자여부는 0 또는 1이어야 합니다'],
        ['2_basicInfo_0', '기본정보는 필수입니다']
      ]);
      
      manager.updateFilterState(true, filteredRows, validationErrors);
      
      expect(manager.isFiltered).toBe(true);
      expect(manager.filteredRows).toEqual(filteredRows);
      expect(manager.validationErrors).toBe(validationErrors);
    });
    
    test('빈 필터 상태도 처리되어야 함', () => {
      manager.updateFilterState(false, [], new Map());
      
      expect(manager.isFiltered).toBe(false);
      expect(manager.filteredRows).toEqual([]);
      expect(manager.validationErrors.size).toBe(0);
    });
  });
  
  describe('행 변경 처리', () => {
    test('행 삭제가 올바르게 처리되어야 함', () => {
      const deletedRowIndices = [1, 3];
      const addedRowIndices = [];
      
      manager.handleRowChanges(deletedRowIndices, addedRowIndices);
      
      expect(manager.deletedRowIndices).toEqual(deletedRowIndices);
      expect(manager.addedRowIndices).toEqual(addedRowIndices);
    });
    
    test('빈 행 변경도 처리되어야 함', () => {
      manager.handleRowChanges([], []);
      
      expect(manager.deletedRowIndices).toEqual([]);
      expect(manager.addedRowIndices).toEqual([]);
    });
  });
  
  describe('에러 가시성 확인', () => {
    test('필터가 없을 때는 행 변경만 고려해야 함', () => {
      // 행 1번이 삭제된 상태
      manager.handleRowChanges([1], []);
      
      // 행 0번은 보여야 함
      expect(manager.isErrorVisible(0, 0)).toBe(true);
      
      // 행 1번은 삭제되어 보이지 않아야 함
      expect(manager.isErrorVisible(1, 0)).toBe(false);
      
      // 행 2번은 보여야 함 (인덱스가 1로 조정됨)
      expect(manager.isErrorVisible(2, 0)).toBe(true);
    });
    
    test('필터가 있을 때는 필터와 행 변경 모두 고려해야 함', () => {
      const filteredRows = [
        { _originalIndex: 0, data: 'row1' },
        { _originalIndex: 2, data: 'row3' }
      ];
      const validationErrors = new Map([
        ['0_isPatient', '환자여부는 0 또는 1이어야 합니다'],
        ['2_basicInfo_0', '기본정보는 필수입니다']
      ]);
      
      // 필터 적용
      manager.updateFilterState(true, filteredRows, validationErrors);
      
      // 행 1번 삭제
      manager.handleRowChanges([1], []);
      
      // 필터된 행 0번 (가상 인덱스)은 보여야 함
      expect(manager.isErrorVisible(0, 0)).toBe(true);
      
      // 필터에서 제외된 행은 보이지 않아야 함 (가상 인덱스 1번은 존재하지 않음)
      expect(manager.isErrorVisible(1, 0)).toBe(false);
      
      // 필터된 행 1번 (가상 인덱스, 원본 인덱스 2번)은 보여야 함
      expect(manager.isErrorVisible(1, 0)).toBe(true);
    });
  });
  
  describe('보이는 에러 반환', () => {
    test('필터와 행 변경이 없을 때는 전체 에러를 반환해야 함', () => {
      const validationErrors = new Map([
        ['0_isPatient', '환자여부는 0 또는 1이어야 합니다'],
        ['1_basicInfo_0', '기본정보는 필수입니다'],
        ['2_basicInfo_0', '기본정보는 필수입니다']
      ]);
      
      manager.updateFilterState(false, [], validationErrors);
      
      const visibleErrors = manager.getVisibleErrors();
      expect(visibleErrors.size).toBe(3);
      expect(visibleErrors.get('0_isPatient')).toBe('환자여부는 0 또는 1이어야 합니다');
    });
    
    test('행 삭제 후 에러가 올바르게 재매핑되어야 함', () => {
      const validationErrors = new Map([
        ['0_isPatient', '환자여부는 0 또는 1이어야 합니다'],
        ['1_basicInfo_0', '기본정보는 필수입니다'],
        ['2_basicInfo_0', '기본정보는 필수입니다']
      ]);
      
      manager.updateFilterState(false, [], validationErrors);
      manager.handleRowChanges([1], []); // 행 1번 삭제
      
      const visibleErrors = manager.getVisibleErrors();
      
      // 행 0번 에러는 그대로 유지
      expect(visibleErrors.get('0_isPatient')).toBe('환자여부는 0 또는 1이어야 합니다');
      
      // 행 1번 에러는 삭제됨
      expect(visibleErrors.has('1_basicInfo_0')).toBe(false);
      
      // 행 2번 에러는 행 1번으로 재매핑됨
      expect(visibleErrors.get('1_basicInfo_0')).toBe('기본정보는 필수입니다');
    });
    
    test('필터 적용 후 보이는 에러만 반환되어야 함', () => {
      const validationErrors = new Map([
        ['0_isPatient', '환자여부는 0 또는 1이어야 합니다'],
        ['1_basicInfo_0', '기본정보는 필수입니다'],
        ['2_basicInfo_0', '기본정보는 필수입니다']
      ]);
      
      const filteredRows = [
        { _originalIndex: 0, data: 'row1' },
        { _originalIndex: 2, data: 'row3' }
      ];
      
      manager.updateFilterState(true, filteredRows, validationErrors);
      
      const visibleErrors = manager.getVisibleErrors();
      
      // 필터된 행 0번과 2번의 에러만 보여야 함
      expect(visibleErrors.size).toBe(2);
      expect(visibleErrors.get('0_isPatient')).toBe('환자여부는 0 또는 1이어야 합니다');
      expect(visibleErrors.get('2_basicInfo_0')).toBe('기본정보는 필수입니다');
      
      // 필터에서 제외된 행 1번의 에러는 보이지 않아야 함
      expect(visibleErrors.has('1_basicInfo_0')).toBe(false);
    });
  });
  
  describe('에러 메시지 조회', () => {
    test('특정 셀의 에러 메시지를 올바르게 조회해야 함', () => {
      const validationErrors = new Map([
        ['0_isPatient', '환자여부는 0 또는 1이어야 합니다']
      ]);
      
      manager.updateFilterState(false, [], validationErrors);
      
      const columnMeta = { type: 'isPatient' };
      const message = manager.getErrorMessage(0, 0, columnMeta);
      
      expect(message).toBe('환자여부는 0 또는 1이어야 합니다');
    });
    
    test('에러가 없는 셀은 null을 반환해야 함', () => {
      const validationErrors = new Map();
      manager.updateFilterState(false, [], validationErrors);
      
      const columnMeta = { type: 'isPatient' };
      const message = manager.getErrorMessage(0, 0, columnMeta);
      
      expect(message).toBeNull();
    });
  });
  
  describe('에러 재매핑', () => {
    test('행 삭제 후 에러가 올바르게 재매핑되어야 함', () => {
      const currentErrors = new Map([
        ['0_isPatient', '환자여부는 0 또는 1이어야 합니다'],
        ['1_basicInfo_0', '기본정보는 필수입니다'],
        ['2_basicInfo_0', '기본정보는 필수입니다']
      ]);
      
      manager.handleRowChanges([1], []); // 행 1번 삭제
      
      const remappedErrors = manager.getRemappedErrors(currentErrors);
      
      // 행 0번 에러는 그대로 유지
      expect(remappedErrors.get('0_isPatient')).toBe('환자여부는 0 또는 1이어야 합니다');
      
      // 행 1번 에러는 삭제됨
      expect(remappedErrors.has('1_basicInfo_0')).toBe(false);
      
      // 행 2번 에러는 행 1번으로 재매핑됨
      expect(remappedErrors.get('1_basicInfo_0')).toBe('기본정보는 필수입니다');
    });
    
    test('빈 에러 맵은 그대로 반환되어야 함', () => {
      const currentErrors = new Map();
      manager.handleRowChanges([1], []);
      
      const remappedErrors = manager.getRemappedErrors(currentErrors);
      
      expect(remappedErrors.size).toBe(0);
    });
  });
  
  describe('복합 시나리오', () => {
    test('필터 + 행 삭제 복합 시나리오', () => {
      // 초기 에러 설정
      const validationErrors = new Map([
        ['0_isPatient', '환자여부는 0 또는 1이어야 합니다'],
        ['1_basicInfo_0', '기본정보는 필수입니다'],
        ['2_basicInfo_0', '기본정보는 필수입니다'],
        ['3_basicInfo_0', '기본정보는 필수입니다']
      ]);
      
      // 필터 적용 (행 0, 2, 3만 보임)
      const filteredRows = [
        { _originalIndex: 0, data: 'row1' },
        { _originalIndex: 2, data: 'row3' },
        { _originalIndex: 3, data: 'row4' }
      ];
      manager.updateFilterState(true, filteredRows, validationErrors);
      
      // 행 1번 삭제
      manager.handleRowChanges([1], []);
      
      const visibleErrors = manager.getVisibleErrors();
      
      // 필터된 행들 중에서 삭제된 행을 고려한 결과
      expect(visibleErrors.size).toBe(3);
      expect(visibleErrors.get('0_isPatient')).toBe('환자여부는 0 또는 1이어야 합니다');
      expect(visibleErrors.get('1_basicInfo_0')).toBe('기본정보는 필수입니다'); // 원래 행 2번
      expect(visibleErrors.get('2_basicInfo_0')).toBe('기본정보는 필수입니다'); // 원래 행 3번
    });
  });
  
  describe('디버그 기능', () => {
    test('상태 정보가 올바르게 반환되어야 함', () => {
      const filteredRows = [{ _originalIndex: 0, data: 'row1' }];
      const validationErrors = new Map([['0_isPatient', '에러']]);
      
      manager.updateFilterState(true, filteredRows, validationErrors);
      manager.handleRowChanges([1], []);
      
      const stateInfo = manager.getStateInfo();
      
      expect(stateInfo.isFiltered).toBe(true);
      expect(stateInfo.filteredRowsCount).toBe(1);
      expect(stateInfo.deletedRowIndices).toEqual([1]);
      expect(stateInfo.validationErrorsCount).toBe(1);
    });
  });
}); 