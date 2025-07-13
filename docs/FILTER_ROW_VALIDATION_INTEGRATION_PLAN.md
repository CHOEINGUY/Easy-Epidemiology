npm# Filter + Row Validation Integration Plan

## 1. 목표 및 핵심 원칙

### 1.1 목표
- **필터 기능과 행 삭제/추가에 따른 CSS 위치 변경 로직을 통합**하여 관리 복잡성 감소
- **열 변경 관련 로직은 전혀 건드리지 않음** (이미 복잡하고 잘 작동하는 시스템 보호)
- 필터가 적용된 상태에서 행 변경 시 CSS 위치가 정확하게 동기화되도록 보장

### 1.2 핵심 원칙
- **열 변경 시스템**: 기존 `ValidationManager.remapValidationErrorsByColumnIdentity()` 등 그대로 유지
- **필터 + 행 변경 시스템**: 새로운 통합 매니저로 관리
- **점진적 마이그레이션**: 기존 코드 최소한으로 수정
- **안정성 우선**: 이미 검증된 로직은 보호

## 2. 현재 상황 분석

### 2.1 기존 시스템들 (독립적으로 작동)
```javascript
// 1. 열 변경 시스템 (건드리지 않음)
- ValidationManager.remapValidationErrorsByColumnIdentity()
- ValidationManager._analyzeStructuralChanges()
- ValidationManager._calculateNewErrorKey()
- StoreBridge의 열 관련 액션들

// 2. 행 변경 시스템 (통합 대상)
- ValidationManager.remapValidationErrorsByRowDeletion()
- StoreBridge의 행 관련 액션들

// 3. 필터 시스템 (통합 대상)
- FilteredValidationManager (개발 중)
- 필터 상태에서의 인덱스 매핑
```

### 2.2 문제점
- **세 개의 독립적인 시스템**이 각각 CSS 위치를 관리
- **필터 + 행 변경**이 동시에 발생할 때 인덱스 매핑 불일치 가능성
- **중복된 로직**: 비슷한 인덱스 변환 로직이 여러 곳에 분산

## 3. 제안하는 통합 구조

### 3.1 시스템 분리
```javascript
// A. 열 변경 시스템 (기존 유지)
class ValidationManager {
  // 기존 열 관련 메서드들 그대로 유지
  remapValidationErrorsByColumnIdentity() { /* 기존 로직 */ }
  _analyzeStructuralChanges() { /* 기존 로직 */ }
  _calculateNewErrorKey() { /* 기존 로직 */ }
}

// B. 필터 + 행 변경 통합 시스템 (새로 개발)
class FilterRowValidationManager {
  constructor() {
    this.filterMappings = new Map(); // 필터 인덱스 매핑
    this.rowMappings = new Map();    // 행 변경 인덱스 매핑
    this.combinedMappings = new Map(); // 통합 매핑
  }
  
  // 필터 상태 업데이트
  updateFilterState(isFiltered, filteredRows, validationErrors) { /* ... */ }
  
  // 행 변경 처리
  handleRowChanges(deletedRowIndices, addedRowIndices) { /* ... */ }
  
  // 통합된 가시성 확인
  isErrorVisible(rowIndex, colIndex) { /* ... */ }
  
  // 통합된 에러 반환
  getVisibleErrors() { /* ... */ }
}
```

### 3.2 CSS 렌더링 통합
```javascript
// VirtualGridBody.vue에서
function getCellClasses(rowIndex, colIndex) {
  // 1. 열 변경 시스템: 고유키 기반 에러 확인 (기존 로직)
  const hasColumnError = hasValidationError(rowIndex, colIndex, columnMeta, validationErrors);
  
  // 2. 필터 + 행 변경 시스템: 가시성 확인
  const isVisible = filterRowValidationManager.isErrorVisible(rowIndex, colIndex);
  
  if (hasColumnError && isVisible) {
    classes.push('validation-error');
  }
}
```

## 4. 구현 계획 (Phase by Phase)

### Phase 1: FilterRowValidationManager 개발 (1일)

#### 1.1 새로운 매니저 클래스 생성
**파일**: `src/components/DataInputVirtualScroll/utils/FilterRowValidationManager.js`

```javascript
export class FilterRowValidationManager {
  constructor() {
    this.filterMappings = new Map(); // 원본 인덱스 → 가상 인덱스
    this.rowMappings = new Map();    // 행 변경 매핑
    this.combinedMappings = new Map(); // 통합 매핑
    this.isFiltered = false;
    this.filteredRows = [];
    this.validationErrors = new Map();
  }
  
  // 필터 상태 업데이트
  updateFilterState(isFiltered, filteredRows, validationErrors) {
    this.isFiltered = isFiltered;
    this.filteredRows = filteredRows;
    this.validationErrors = validationErrors;
    this._updateFilterMappings();
  }
  
  // 행 변경 처리
  handleRowChanges(deletedRowIndices, addedRowIndices) {
    this._updateRowMappings(deletedRowIndices, addedRowIndices);
    this._updateCombinedMappings();
  }
  
  // 가시성 확인
  isErrorVisible(rowIndex, colIndex) {
    if (!this.isFiltered) return true;
    
    // 필터된 상태에서는 원본 인덱스로 변환 후 확인
    const originalRowIndex = this._getOriginalRowIndex(rowIndex);
    return this.filteredRows.some(row => row._originalIndex === originalRowIndex);
  }
  
  // 보이는 에러만 반환
  getVisibleErrors() {
    if (!this.isFiltered) return this.validationErrors;
    
    const visibleErrors = new Map();
    this.validationErrors.forEach((error, key) => {
      const [rowIndex, uniqueKey] = key.split('_');
      const originalRowIndex = parseInt(rowIndex, 10);
      
      // 필터된 행에 포함되는지 확인
      const isVisible = this.filteredRows.some(row => 
        row._originalIndex === originalRowIndex
      );
      
      if (isVisible) {
        visibleErrors.set(key, error);
      }
    });
    
    return visibleErrors;
  }
  
  // 내부 메서드들
  _updateFilterMappings() { /* 필터 매핑 업데이트 */ }
  _updateRowMappings() { /* 행 변경 매핑 업데이트 */ }
  _updateCombinedMappings() { /* 통합 매핑 업데이트 */ }
  _getOriginalRowIndex(virtualIndex) { /* 가상 인덱스 → 원본 인덱스 */ }
}
```

#### 1.2 기존 FilteredValidationManager 통합
- 기존 `FilteredValidationManager`의 로직을 새로운 `FilterRowValidationManager`로 이전
- 필터 관련 인덱스 매핑 로직 통합

### Phase 2: ValidationManager 수정 (0.5일)

#### 2.1 행 관련 메서드 수정
**파일**: `src/validation/ValidationManager.js`

```javascript
export class ValidationManager {
  constructor(store, options = {}) {
    // ... 기존 코드 ...
    this.filterRowManager = new FilterRowValidationManager();
  }
  
  // 기존 열 관련 메서드들 그대로 유지
  remapValidationErrorsByColumnIdentity() { /* 기존 로직 유지 */ }
  _analyzeStructuralChanges() { /* 기존 로직 유지 */ }
  _calculateNewErrorKey() { /* 기존 로직 유지 */ }
  
  // 행 관련 메서드만 새로운 매니저 사용
  remapValidationErrorsByRowDeletion(deletedRowIndices, columnMetas) {
    // 새로운 FilterRowValidationManager 사용
    this.filterRowManager.handleRowChanges(deletedRowIndices, []);
    
    // 기존 로직은 유지하되 새로운 매니저와 연동
    const currentErrors = this.store.state.validationState.errors;
    if (!currentErrors || currentErrors.size === 0) return;
    
    // ... 기존 로직 유지 ...
    
    // 새로운 매니저의 매핑 정보 활용
    const newErrors = this.filterRowManager.getRemappedErrors(currentErrors);
    this.store.commit('SET_VALIDATION_ERRORS', newErrors);
  }
}
```

### Phase 3: StoreBridge 수정 (0.5일)

#### 3.1 행 관련 액션들 수정
**파일**: `src/store/storeBridge.js`

```javascript
export class StoreBridge {
  // 기존 열 관련 메서드들 그대로 유지
  insertMultipleColumnsAt() { /* 기존 로직 유지 */ }
  deleteMultipleColumnsByIndex() { /* 기존 로직 유지 */ }
  setIndividualExposureColumnVisibility() { /* 기존 로직 유지 */ }
  setConfirmedCaseColumnVisibility() { /* 기존 로직 유지 */ }
  
  // 행 관련 메서드들만 새로운 매니저 사용
  deleteRow(rowIndex) {
    // 기존 로직 실행
    this.legacyStore.dispatch('deleteRow', rowIndex);
    this.saveCurrentState();
    
    // 새로운 FilterRowValidationManager 사용
    if (this.validationManager) {
      const columnMetas = this.getColumnMetas();
      this.validationManager.filterRowManager.handleRowChanges([rowIndex], []);
      this.validationManager.remapValidationErrorsByRowDeletion([rowIndex], columnMetas);
    }
  }
  
  deleteMultipleRows(payload) {
    // 기존 로직 실행
    this.legacyStore.dispatch('deleteMultipleRows', payload);
    this.saveCurrentState();
    
    // 새로운 FilterRowValidationManager 사용
    if (this.validationManager) {
      let deletedRowIndices = [];
      // ... 기존 로직으로 deletedRowIndices 계산 ...
      
      if (deletedRowIndices.length > 0) {
        const columnMetas = this.getColumnMetas();
        this.validationManager.filterRowManager.handleRowChanges(deletedRowIndices, []);
        this.validationManager.remapValidationErrorsByRowDeletion(deletedRowIndices, columnMetas);
      }
    }
  }
  
  // 다른 행 관련 메서드들도 동일하게 수정
}
```

### Phase 4: DataInputVirtual.vue 수정 (0.5일)

#### 4.1 필터 상태 관리 수정
**파일**: `src/components/DataInputVirtualScroll/DataInputVirtual.vue`

```javascript
// 기존 FilteredValidationManager 대신 새로운 매니저 사용
import { FilterRowValidationManager } from './utils/FilterRowValidationManager.js';

// 필터 + 행 변경 통합 매니저 인스턴스
const filterRowValidationManager = new FilterRowValidationManager();

// 필터된 상태에서 보이는 유효성 에러만 계산 (새로운 시스템 사용)
const visibleValidationErrors = computed(() => {
  const errors = validationErrors.value;
  const isFiltered = storeBridge.filterState.isFiltered;
  const filteredRowsData = filteredRows.value;
  
  // FilterRowValidationManager 업데이트
  filterRowValidationManager.updateFilterState(isFiltered, filteredRowsData, errors);
  
  // 보이는 에러만 반환
  return filterRowValidationManager.getVisibleErrors();
});

// 필터 상태 변경 감지 및 CSS 업데이트
watch(() => storeBridge.filterState.isFiltered, (newIsFiltered, oldIsFiltered) => {
  if (newIsFiltered !== oldIsFiltered) {
    // 새로운 매니저로 CSS 업데이트
    nextTick(() => {
      // 강제로 CSS 재계산
      const gridBody = gridBodyRef.value;
      if (gridBody) {
        gridBody.$forceUpdate();
      }
    });
  }
}, { immediate: false });
```

### Phase 5: VirtualGridBody.vue 수정 (0.5일)

#### 5.1 CSS 렌더링 통합
**파일**: `src/components/DataInputVirtualScroll/layout/VirtualGridBody.vue`

```javascript
// 새로운 매니저 사용
import { FilterRowValidationManager } from '../utils/FilterRowValidationManager.js';

// 필터 + 행 변경 매니저 인스턴스
const filterRowValidationManager = new FilterRowValidationManager();

function getCellClasses(rowIndex, colIndex) {
  const classes = [];
  
  // ... 기존 선택 관련 클래스들 ...
  
  // --- Validation error (통합 시스템 사용) ---
  const columnMeta = props.allColumnsMeta[colIndex];
  
  // 1. 열 변경 시스템: 고유키 기반 에러 확인 (기존 로직)
  const hasColumnError = hasValidationError(rowIndex, colIndex, columnMeta, props.validationErrors);
  
  // 2. 필터 + 행 변경 시스템: 가시성 확인
  filterRowValidationManager.updateFilterState(
    props.isFiltered, 
    props.visibleRows, 
    props.validationErrors
  );
  const isVisible = filterRowValidationManager.isErrorVisible(rowIndex, colIndex);
  
  // 두 시스템 모두 통과해야 에러 표시
  if (hasColumnError && isVisible) {
    classes.push('validation-error');
  }
  
  return classes;
}

function getValidationMessage(rowIndex, colIndex) {
  const columnMeta = props.allColumnsMeta[colIndex];
  
  // 새로운 시스템으로 에러 메시지 조회
  return filterRowValidationManager.getErrorMessage(rowIndex, colIndex, columnMeta);
}
```

### Phase 6: 테스트 및 검증 (1일)

#### 6.1 단위 테스트
**파일**: `tests/FilterRowValidationManager.test.js`

```javascript
import { FilterRowValidationManager } from '../src/components/DataInputVirtualScroll/utils/FilterRowValidationManager.js';

describe('FilterRowValidationManager', () => {
  let manager;
  
  beforeEach(() => {
    manager = new FilterRowValidationManager();
  });
  
  test('필터 상태 업데이트', () => {
    const filteredRows = [
      { _originalIndex: 0, data: 'row1' },
      { _originalIndex: 2, data: 'row3' }
    ];
    
    manager.updateFilterState(true, filteredRows, new Map());
    
    expect(manager.isFiltered).toBe(true);
    expect(manager.filteredRows).toEqual(filteredRows);
  });
  
  test('행 변경 처리', () => {
    // 행 삭제 시나리오 테스트
    manager.handleRowChanges([1], []);
    
    // 매핑이 올바르게 업데이트되었는지 확인
    expect(manager.rowMappings.size).toBeGreaterThan(0);
  });
  
  test('가시성 확인', () => {
    // 필터된 상태에서 특정 행이 보이는지 확인
    const isVisible = manager.isErrorVisible(0, 0);
    expect(typeof isVisible).toBe('boolean');
  });
});
```

#### 6.2 통합 테스트
- 필터 적용 후 행 삭제 시나리오
- 행 삭제 후 필터 적용 시나리오
- 열 변경 + 필터 + 행 변경 복합 시나리오

#### 6.3 수동 테스트
- 실제 UI에서 필터와 행 변경 동작 확인
- CSS 위치 정확성 검증
- 성능 영향 확인

## 5. 예상 효과

### 5.1 기술적 효과
- **관리 복잡성 감소**: 필터와 행 변경 로직이 하나의 매니저로 통합
- **안정성 향상**: 기존 열 변경 로직은 보호되면서 새로운 기능 추가
- **유지보수성 향상**: 명확한 책임 분리로 코드 이해도 증가

### 5.2 사용자 경험 효과
- **CSS 위치 정확성**: 필터 + 행 변경 시에도 에러 표시가 정확한 위치에 나타남
- **일관된 동작**: 모든 시나리오에서 예측 가능한 동작
- **성능 향상**: 불필요한 중복 계산 제거

## 6. 위험 요소 및 대응 방안

### 6.1 위험 요소
- **기존 열 변경 로직 영향**: 의도치 않은 수정으로 인한 버그
- **성능 저하**: 새로운 매니저로 인한 오버헤드
- **복잡한 시나리오**: 필터 + 행 변경 + 열 변경 동시 발생

### 6.2 대응 방안
- **기존 코드 보호**: 열 관련 메서드는 전혀 수정하지 않음
- **점진적 마이그레이션**: 한 번에 하나씩 단계별로 진행
- **충분한 테스트**: 각 단계마다 철저한 테스트 수행
- **롤백 계획**: 문제 발생 시 이전 버전으로 복원 가능하도록 준비

## 7. 구현 일정

| Phase | 작업 내용 | 예상 소요 시간 | 담당자 |
|-------|-----------|----------------|--------|
| 1 | FilterRowValidationManager 개발 | 1일 | 개발자 |
| 2 | ValidationManager 수정 | 0.5일 | 개발자 |
| 3 | StoreBridge 수정 | 0.5일 | 개발자 |
| 4 | DataInputVirtual.vue 수정 | 0.5일 | 개발자 |
| 5 | VirtualGridBody.vue 수정 | 0.5일 | 개발자 |
| 6 | 테스트 및 검증 | 1일 | 개발자 + QA |

**총 예상 소요 시간**: 4일

## 8. 다음 단계

1. **Phase 1 시작**: FilterRowValidationManager 클래스 개발
2. **코드 리뷰**: 각 Phase 완료 후 리뷰 진행
3. **테스트 자동화**: CI/CD 파이프라인에 테스트 추가
4. **문서 업데이트**: 개발 완료 후 관련 문서 업데이트

---

**핵심 원칙**: 열 변경 로직은 전혀 건드리지 않고, 필터와 행 변경만 통합하여 관리 복잡성을 줄이는 것이 목표입니다. 