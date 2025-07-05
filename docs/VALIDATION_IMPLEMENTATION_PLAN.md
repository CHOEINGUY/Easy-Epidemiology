# 유효성 검사 시스템 재설계 계획

## 📋 현재 상황 분석

### 🔴 현재 문제점들
1. **복잡한 구조**: StoreBridge + ValidationSystem + Vuex + HistoryManager가 얽혀있음
2. **중복 로직**: 검증 상태가 여러 곳에서 관리됨 (ValidationState + Vuex validationState)
3. **버그 발생**: Undo/Redo, 배치 삭제 등에서 검증 CSS가 남는 문제
4. **성능 이슈**: 불필요한 재렌더링과 복잡한 상태 동기화
5. **유지보수 어려움**: 코드가 너무 복잡해서 버그 수정이 어려움

### 📊 현재 구조의 복잡성
```
DataInputVirtual.vue
├── StoreBridge
│   ├── ValidationSystem
│   │   ├── ValidationState (Map 기반)
│   │   └── validationTimers (Map 기반)
│   ├── HistoryManager
│   └── EnhancedStorageManager
└── Vuex Store
    └── validationState (Map 기반 + version)
```

## 🎯 새로운 설계 원칙

### 1. **단순성 (Simplicity)**
- 단일 책임 원칙: 각 클래스는 하나의 역할만
- 최소한의 상태 관리
- 명확한 데이터 흐름

### 2. **성능 (Performance)**
- 불필요한 재렌더링 최소화
- 효율적인 캐싱
- 지연 검증으로 UI 블로킹 방지

### 3. **유지보수성 (Maintainability)**
- 읽기 쉬운 코드
- 명확한 인터페이스
- 테스트 가능한 구조

## 🏗️ 새로운 아키텍처

### Phase 1: 핵심 검증 시스템 (1일)

#### 1.1 단순한 ValidationManager 생성
**파일**: `src/validation/ValidationManager.js`

```javascript
/**
 * 단순하고 명확한 검증 관리자
 * Vuex store와 직접 연동하여 상태 관리
 */
export class ValidationManager {
  constructor(store) {
    this.store = store;
    this.validationTimers = new Map();
    this.DEBOUNCE_DELAY = 300;
  }
  
  /**
   * 셀 검증 (지연 또는 즉시)
   */
  validateCell(rowIndex, colIndex, value, columnType, immediate = false) {
    const cellKey = `${rowIndex}_${colIndex}`;
    
    // 기존 타이머 취소
    if (this.validationTimers.has(cellKey)) {
      clearTimeout(this.validationTimers.get(cellKey));
    }
    
    if (immediate || this.shouldValidateImmediately(value)) {
      this.performValidation(rowIndex, colIndex, value, columnType);
    } else {
      // 지연 검증
      const timer = setTimeout(() => {
        this.performValidation(rowIndex, colIndex, value, columnType);
        this.validationTimers.delete(cellKey);
      }, this.DEBOUNCE_DELAY);
      
      this.validationTimers.set(cellKey, timer);
    }
  }
  
  /**
   * 실제 검증 수행
   */
  performValidation(rowIndex, colIndex, value, columnType) {
    const result = this.validateValue(value, columnType);
    
    if (!result.valid) {
      this.store.commit('ADD_VALIDATION_ERROR', {
        rowIndex,
        colIndex,
        message: result.message
      });
    } else {
      this.store.commit('REMOVE_VALIDATION_ERROR', {
        rowIndex,
        colIndex
      });
    }
  }
  
  /**
   * 값 검증 로직
   */
  validateValue(value, columnType) {
    // 기존 validation.js 로직 재사용
    return validateCell(value, columnType);
  }
  
  /**
   * 즉시 검증이 필요한 경우
   */
  shouldValidateImmediately(value) {
    return value === '' || value === null || value === undefined;
  }
  
  /**
   * 특정 셀들의 오류 제거
   */
  clearErrorsForCells(cells) {
    cells.forEach(({ row, col }) => {
      this.store.commit('REMOVE_VALIDATION_ERROR', { rowIndex: row, colIndex: col });
    });
  }
  
  /**
   * 모든 오류 제거
   */
  clearAllErrors() {
    this.validationTimers.forEach(timer => clearTimeout(timer));
    this.validationTimers.clear();
    this.store.commit('CLEAR_VALIDATION_ERRORS');
  }
  
  /**
   * 전체 데이터 재검증
   */
  revalidateAll(rows, columnMetas) {
    this.clearAllErrors();
    
    rows.forEach((row, rowIndex) => {
      columnMetas.forEach(columnMeta => {
        if (!columnMeta.isEditable) return;
        
        const value = this.getCellValue(row, columnMeta);
        if (value !== '' && value !== null && value !== undefined) {
          this.validateCell(rowIndex, columnMeta.colIndex, value, columnMeta.type, true);
        }
      });
    });
  }
  
  /**
   * 셀 값 추출 헬퍼
   */
  getCellValue(row, columnMeta) {
    if (!row || !columnMeta.dataKey) return '';
    
    if (columnMeta.cellIndex !== null && columnMeta.cellIndex !== undefined) {
      const arr = row[columnMeta.dataKey];
      return Array.isArray(arr) ? arr[columnMeta.cellIndex] || '' : '';
    } else {
      return row[columnMeta.dataKey] || '';
    }
  }
}
```

#### 1.2 Vuex Store 단순화
**파일**: `src/components/store.js` (기존 mutations 유지, 새로운 ValidationManager 사용)

```javascript
// 기존 validationState 구조 유지하되, ValidationManager가 직접 관리
const store = createStore({
  state: {
    // ... 기존 state
    validationState: {
      errors: new Map(),
      version: 0  // UI 리렌더링용
    }
  },
  
  mutations: {
    // 기존 mutations 유지
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
    }
  }
});
```

### Phase 2: StoreBridge 단순화 (0.5일)

#### 2.1 StoreBridge에서 ValidationSystem 제거
**파일**: `src/store/storeBridge.js`

```javascript
export class StoreBridge {
  constructor(legacyStore = null) {
    this.legacyStore = legacyStore;
    this.enhancedManager = new EnhancedStorageManager(legacyStore);
    this.history = new HistoryManager();
    // ValidationSystem 제거 - ValidationManager로 대체
    this.isInitialized = false;
  }
  
  // ValidationSystem 관련 메서드들 제거
  // 대신 ValidationManager를 외부에서 주입받아 사용
  
  /**
   * 셀 저장 시 검증 호출 (단순화)
   */
  saveCellValue(rowIndex, colIndex, value, columnMeta) {
    // 기존 저장 로직
    const payload = {
      rowIndex,
      key: columnMeta.dataKey,
      value,
      cellIndex: columnMeta.cellIndex
    };
    
    this.legacyStore.dispatch('updateCell', payload);
    this.saveCurrentState();
    
    // 검증은 외부 ValidationManager에서 처리
    // this.validationManager.validateCell(rowIndex, colIndex, value, columnMeta.type);
  }
  
  /**
   * Undo/Redo 시 검증 처리 단순화
   */
  undo() {
    const prevSnapshot = this.history.undo();
    if (!prevSnapshot) return false;
    
    const { data: prevState } = prevSnapshot;
    
    // Vuex 상태 복원
    this.legacyStore.commit('SET_INITIAL_DATA', prevState);
    this.enhancedManager.saveData(prevState);
    
    // 검증은 외부에서 처리
    return true;
  }
  
  redo() {
    const nextSnapshot = this.history.redo();
    if (!nextSnapshot) return false;
    
    const { data: nextState } = nextSnapshot;
    
    this.legacyStore.commit('SET_INITIAL_DATA', nextState);
    this.enhancedManager.saveData(nextState);
    
    return true;
  }
}
```

### Phase 3: DataInputVirtual 통합 (0.5일)

#### 3.1 ValidationManager 통합
**파일**: `src/components/DataInputVirtualScroll/DataInputVirtual.vue`

```javascript
import { ValidationManager } from '../../../validation/ValidationManager.js';

// 컴포넌트 내부
const validationManager = new ValidationManager(store);

// 셀 편집 완료 시
function onCellEditComplete(rowIndex, colIndex, shouldSave = true) {
  if (!shouldSave) {
    cellInputState.cancelEditing();
    return;
  }
  
  const tempValue = cellInputState.getTempValue(rowIndex, colIndex);
  if (tempValue !== null) {
    const columnMeta = allColumnsMeta.value.find(c => c.colIndex === colIndex);
    if (columnMeta) {
      // 저장
      storeBridge.saveCellValue(rowIndex, colIndex, tempValue, columnMeta);
      
      // 검증 (단순화)
      validationManager.validateCell(rowIndex, colIndex, tempValue, columnMeta.type);
    }
  }
}

// Undo/Redo 후 검증 재실행
function onUndo() {
  const success = storeBridge.undo();
  if (success) {
    // 전체 재검증
    validationManager.revalidateAll(rows.value, allColumnsMeta.value);
  }
}

function onRedo() {
  const success = storeBridge.redo();
  if (success) {
    validationManager.revalidateAll(rows.value, allColumnsMeta.value);
  }
}

// 배치 삭제 시 오류 제거
function handleClearSelectedData(context) {
  // ... 기존 로직
  
  // 변경사항이 있는 경우에만 오류 제거
  if (changedCells.length > 0) {
    const cellsForErrorClear = changedCells
      .filter(c => c.type === 'cell')
      .map(c => ({ row: c.rowIndex, col: c.colIndex }));
    
    if (cellsForErrorClear.length > 0) {
      validationManager.clearErrorsForCells(cellsForErrorClear);
    }
  }
}
```

### Phase 4: 기존 코드 정리 (0.5일)

#### 4.1 불필요한 파일 제거
- `src/store/validationSystem.js` → 삭제
- `src/store/validationState.js` → 삭제
- `src/store/utils/validation.js` → 유지 (검증 로직만)

#### 4.2 import 정리
- StoreBridge에서 ValidationSystem import 제거
- DataInputVirtual에서 기존 validation 관련 import 제거

## 📊 기대 효과

### 1. **코드 복잡도 감소**
- 기존: 5개 클래스, 1000+ 라인
- 새로운: 1개 클래스, 200+ 라인

### 2. **버그 감소**
- 단순한 구조로 인한 예측 가능성 향상
- 명확한 데이터 흐름

### 3. **성능 향상**
- 불필요한 상태 동기화 제거
- 효율적인 타이머 관리

### 4. **유지보수성 향상**
- 읽기 쉬운 코드
- 명확한 책임 분리

## 🔄 마이그레이션 전략

### 1. **점진적 전환**
1. 새로운 ValidationManager 구현
2. DataInputVirtual에서 테스트
3. 기존 코드 제거

### 2. **기능 보존**
- 모든 기존 검증 기능 유지
- UI 변경 없음
- 사용자 경험 동일

### 3. **롤백 계획**
- 기존 코드 백업
- 필요시 즉시 복원 가능

## 📝 결론

현재 복잡한 검증 시스템을 단순하고 명확한 구조로 재설계하는 것이 장기적으로 가장 좋은 선택입니다. 

**새로운 접근 방식의 장점:**
- ✅ 코드 복잡도 80% 감소
- ✅ 버그 발생 가능성 대폭 감소
- ✅ 성능 향상
- ✅ 유지보수 용이성

**구현 시간:**
- 총 2.5일 (기존 복잡한 구조 수정보다 빠름)

이 방향으로 진행하시겠습니까? 

## 🚀 상세 개발 단계 & AI 작업 지시 (v2)

> 이 섹션은 **AI 개발 에이전트**가 바로 착수할 수 있도록 세부 작업 단계를 분해한 로드맵입니다. 각 Phase 완료 시점마다 자동 테스트와 PR 리뷰를 트리거하도록 설계했습니다.

### Phase 0 — 브랜치 준비 (0.5일)
1. `git checkout <stable_commit>` → `git checkout -b feat/validation-refactor`
2. `git tag backup-before-validation` 으로 현 Master 백업
3. Jest, Cypress 최신 버전으로 업그레이드 & CI 파이프라인 녹색 확인

### Phase 1 — ValidationManager Core (1일)
- **1.1 API 구현**
  - `validateCell`, `revalidateAll({chunkSize})`, `clearErrorsFor*`, `onDataReset`, `destroy`
- **1.2 단위 테스트** (Jest fake timers)
- **1.3 기본 성능 목표** 10 k rows < 100 ms (chunkSize = 500)

### Phase 2 — StoreBridge 통합 & Snapshot 확장 (0.5일)
- HistoryManager 스냅샷 구조에 `validationErrors`, `schemaVersion` 필드 추가
- StoreBridge 모든 **mutative** 메서드 후킹 → ValidationManager 호출
- Undo/Redo 실행 시 `revalidateAll` or snapshot restore 경로 AB 테스트

### Phase 3 — DataInputVirtual 연동 & 대량 작업 대응 (0.5일)
- Paste/행·열 삽입·삭제/데이터 클리어/시트 초기화 이벤트에 맞춰
  - 오류 추가·제거·재검증 호출 자동화
- `handleClearSelectedData` 등 기존 유틸에 오류 정리 로직 통합
- 빈 열/행 삭제 → `clearErrorsForRows|Columns` 연동

### Phase 4 — 퍼포먼스 & 비동기 검증 (0.5일)
- `requestIdleCallback` or Web Worker 모드 스위치 추가 (`useWorker: true` 옵션)
- UI 스피너 & 진행률 표시 컴포넌트
- 대용량(>50 k cells) 벤치마크 후 기본 chunkSize 조정

### Phase 5 — QA, 문서화 & 릴리즈 (0.5일)
- **5.1 Cypress 시나리오**
  - 셀 편집 → 오류 → Undo → 오류 복원 확인
  - Paste 수천 셀 → chunk 검증 동안 UI 프리징 없음을 확인
  - 행/열 삭제 후 오류 overlay가 사라지는지 확인
- **5.2 Developer Guide 업데이트** (`CHART_STANDARDS.md`, `PROJECT_STRUCTURE_ANALYSIS.md` 등)
- **5.3 SemVer minor 릴리즈 & CHANGELOG 작성**

---

### ✅ TODO Checklist (자동 생성)
| ID | 내용 | Phase | 상태 |
|----|------|-------|------|
| T-001 | ValidationManager 스켈레톤 파일 생성 | 1 | pending |
| T-002 | validateCell / shouldValidateImmediately 구현 | 1 | pending |
| T-003 | revalidateAll chunk 로직 & 테스트 작성 | 1 | pending |
| T-004 | HistoryManager 스냅샷 스키마 확장 | 2 | pending |
| T-005 | StoreBridge mutative 메서드 후킹 | 2 | pending |
| T-006 | Undo/Redo 경로 AB 테스트 | 2 | pending |
| T-007 | DataInputVirtual 이벤트별 오류 처리 통합 | 3 | pending |
| T-008 | Paste & Bulk 작업 성능 테스트 | 3 | pending |
| T-009 | Web Worker 모드 프로토타입 | 4 | pending |
| T-010 | Cypress 전체 시나리오 작성 | 5 | pending |

*이 표는 `todo_write` API로 자동 관리 예정입니다.*

---

**다음 액션** → Phase 0 실행 준비 완료 시 `T-001` 부터 순차 처리. 필요 변경·질문은 댓글 또는 이슈로 등록해주세요. 