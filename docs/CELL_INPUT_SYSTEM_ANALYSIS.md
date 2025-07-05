# 셀 입력 시스템 분석 및 개선 설계

## 현재 시스템 분석

### 🔍 **현재 셀 입력 흐름**

#### 1. **셀 편집 시작**
```javascript
// virtualCellHandlers.js - 더블클릭으로 편집 시작
export async function handleVirtualCellDoubleClick(rowIndex, colIndex, event, context) {
  // 1. 셀 선택
  selectionSystem.selectCell(originalRowIndex, colIndex);
  
  // 2. 편집 모드 시작
  selectionSystem.startEditing(originalRowIndex, colIndex, getCellValue, row);
}
```

#### 2. **편집 중 입력 처리**
```javascript
// DataInputVirtual.vue - onCellInput 함수
function onCellInput(event, rowIndex, colIndex) {
  if (!selectionSystem.state.isEditing) return;
  
  const newValue = event.target.textContent;
  
  // ⚠️ 문제: 글자 하나 입력할 때마다 즉시 저장!
  store.dispatch("updateCell", {
    rowIndex,
    key: columnMeta.dataKey,
    value: newValue,
    cellIndex: columnMeta.cellIndex,
  });
}
```

#### 3. **편집 종료 처리**
```javascript
// virtualKeyboardHandlers.js - 키보드 이벤트 처리
if (key === 'Escape') {
  event.preventDefault();
  stopEditing(false); // 저장하지 않고 종료
  // 원래 값으로 복원
  store.dispatch("updateCell", { ...originalValue });
}

else if (key === 'Enter' || key === 'Tab') {
  event.preventDefault();
  stopEditing(true); // 저장하고 종료
  // 다음 셀로 이동
}
```

### ⚠️ **현재 시스템의 문제점**

1. **즉시 저장**: `onCellInput`에서 글자 하나 입력할 때마다 `store.dispatch("updateCell")` 호출
2. **성능 이슈**: 대용량 데이터 시 느려질 수 있음
3. **불필요한 저장**: 편집 중 실수로 입력한 내용도 저장됨
4. **ESC 복원 복잡성**: 이미 저장된 값을 다시 원래 값으로 되돌리는 복잡한 로직

## 개선된 셀 단위 저장 시스템 설계

### 🎯 **핵심 아이디어**

- **편집 중**: 임시 값만 메모리에 저장 (localStorage 저장 안함)
- **ESC**: 편집 취소 → 원래 값으로 복원
- **셀 이동**: 편집 완료 → 실제 저장

### 📁 **새로운 store 폴더 구조**

```
src/
├── store/
│   ├── index.js                    # 메인 스토어 설정
│   ├── cellInputState.js           # 셀 입력 상태 관리
│   ├── enhancedStorageManager.js   # 개선된 저장 매니저
│   ├── keyboardHandlers.js         # 키보드 이벤트 처리
│   └── utils/
│       ├── validation.js           # 데이터 검증
│       └── recovery.js             # 데이터 복구
```

### 🔧 **핵심 컴포넌트 설계**

#### 1. **CellInputState 클래스**
```javascript
// store/cellInputState.js
class CellInputState {
  constructor() {
    this.isEditing = false;
    this.currentCell = null;        // { rowIndex, colIndex, dataKey, cellIndex }
    this.originalValue = null;      // 편집 시작 전 원래 값
    this.tempValue = null;          // 편집 중인 임시 값
    this.columnMeta = null;         // 컬럼 메타 정보
  }
  
  startEditing(cellInfo, originalValue, columnMeta) {
    this.isEditing = true;
    this.currentCell = cellInfo;
    this.originalValue = originalValue;
    this.tempValue = originalValue;
    this.columnMeta = columnMeta;
  }
  
  updateTempValue(value) {
    this.tempValue = value;
  }
  
  cancelEditing() {
    // ESC: 원래 값으로 복원
    this.isEditing = false;
    this.currentCell = null;
    this.originalValue = null;
    this.tempValue = null;
    this.columnMeta = null;
  }
  
  confirmEditing() {
    // 셀 이동: 실제 저장
    this.isEditing = false;
    const result = {
      cell: this.currentCell,
      value: this.tempValue,
      columnMeta: this.columnMeta
    };
    this.currentCell = null;
    this.originalValue = null;
    this.tempValue = null;
    this.columnMeta = null;
    return result;
  }
}
```

#### 2. **EnhancedStorageManager 클래스**
```javascript
// store/enhancedStorageManager.js
class EnhancedStorageManager {
  constructor() {
    this.cellInputState = new CellInputState();
    this.saveTimeout = null;
    this.SAVE_DELAY = 300; // 셀 이동 후 300ms 디바운싱
  }
  
  // 셀 편집 시작
  startCellEdit(cellInfo, originalValue, columnMeta) {
    this.cellInputState.startEditing(cellInfo, originalValue, columnMeta);
  }
  
  // 편집 중 임시 값 업데이트 (저장 안함)
  updateTempValue(value) {
    this.cellInputState.updateTempValue(value);
  }
  
  // ESC: 편집 취소
  cancelCellEdit() {
    this.cellInputState.cancelEditing();
    // 원래 값으로 복원하는 로직
  }
  
  // 셀 이동: 편집 완료 및 저장
  completeCellEdit() {
    const result = this.cellInputState.confirmEditing();
    if (result) {
      this.debounceSave(result);
    }
  }
  
  // 디바운싱 저장
  debounceSave(cellData) {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    
    this.saveTimeout = setTimeout(() => {
      this.actualSave(cellData);
    }, this.SAVE_DELAY);
  }
  
  // 실제 저장 (기존 store.js 활용)
  actualSave(cellData) {
    const { cell, value, columnMeta } = cellData;
    
    // 기존 store.js의 updateCell action 호출
    store.dispatch('updateCell', {
      rowIndex: cell.rowIndex,
      key: cell.dataKey,
      value: value,
      cellIndex: cell.cellIndex
    });
  }
}
```

#### 3. **개선된 키보드 핸들러**
```javascript
// store/keyboardHandlers.js
class CellKeyboardHandler {
  constructor(storageManager) {
    this.storageManager = storageManager;
  }
  
  handleKeyDown(event, cellInfo, currentValue, columnMeta) {
    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        this.storageManager.cancelCellEdit();
        return { action: 'cancel', value: null };
        
      case 'Enter':
      case 'Tab':
        event.preventDefault();
        this.storageManager.completeCellEdit();
        return { action: 'complete', value: currentValue };
        
      case 'ArrowUp':
      case 'ArrowDown':
      case 'ArrowLeft':
      case 'ArrowRight':
        this.storageManager.completeCellEdit();
        return { action: 'move', value: currentValue };
        
      default:
        // 일반 텍스트 입력은 임시 값만 업데이트
        this.storageManager.updateTempValue(currentValue);
        return { action: 'typing', value: currentValue };
    }
  }
}
```

### 🔄 **기존 컴포넌트 수정 계획**

#### 1. **DataInputVirtual.vue 수정**
```javascript
// 기존 onCellInput 함수 수정
function onCellInput(event, rowIndex, colIndex) {
  if (!selectionSystem.state.isEditing) return;
  
  const newValue = event.target.textContent;
  const columnMeta = allColumnsMeta.value.find(c => c.colIndex === colIndex);
  
  // ⚡ 개선: 임시 값만 업데이트 (저장 안함)
  enhancedStorageManager.updateTempValue(newValue);
  
  // UI 업데이트는 그대로 유지
  // store.dispatch 호출 제거!
}
```

#### 2. **virtualKeyboardHandlers.js 수정**
```javascript
// ESC 키 처리 수정
if (key === 'Escape') {
  event.preventDefault();
  
  // ⚡ 개선: 간단한 취소 처리
  enhancedStorageManager.cancelCellEdit();
  
  // UI에서 원래 값으로 복원
  const cellElement = document.querySelector(cellSelector);
  if (cellElement) {
    cellElement.textContent = originalCellValue;
  }
  
  stopEditing(false);
  focusGrid();
}

// Enter/Tab 키 처리 수정
else if (key === 'Enter' || key === 'Tab') {
  event.preventDefault();
  
  // ⚡ 개선: 실제 저장 후 이동
  enhancedStorageManager.completeCellEdit();
  
  stopEditing(true);
  // 다음 셀로 이동
}
```

### 📊 **성능 비교**

| 항목 | 현재 시스템 | 개선된 시스템 |
|------|-------------|---------------|
| **저장 빈도** | 글자 단위 | 셀 단위 |
| **localStorage 호출** | 매 글자마다 | 셀 이동 시에만 |
| **ESC 처리** | 복잡한 복원 로직 | 간단한 취소 |
| **성능** | 느림 (대용량 시) | 빠름 |
| **사용자 경험** | 실수 입력도 저장 | 편집 완료 시에만 저장 |

### 🚀 **세부 구현 계획**

#### Phase 1: 새로운 store 폴더 및 기본 구조 생성 (2시간)

**1.1 폴더 구조 생성 (30분)**
```bash
src/
├── store/
│   ├── index.js                    # 메인 스토어 설정
│   ├── cellInputState.js           # 셀 입력 상태 관리
│   ├── enhancedStorageManager.js   # 개선된 저장 매니저
│   ├── keyboardHandlers.js         # 키보드 이벤트 처리
│   ├── storeBridge.js              # 기존 store.js와의 브리지
│   └── utils/
│       ├── validation.js           # 데이터 검증
│       └── recovery.js             # 데이터 복구
```

**1.2 CellInputState 클래스 구현 (45분)**
- 편집 상태 관리 로직
- 임시 값 저장/복원 기능
- 컬럼 메타 정보 캐싱

**1.3 EnhancedStorageManager 클래스 구현 (45분)**
- 디바운싱 저장 로직
- 기존 store.js 연동 브리지
- 에러 처리 및 복구 기능

#### Phase 2: DataInputVirtual 컴포넌트 점진적 수정 (4시간)

**2.1 기존 코드 분석 및 의존성 파악 (1시간)**
```javascript
// DataInputVirtual.vue에서 store.js 사용 부분 분석
- store.dispatch("updateCell") 호출 위치
- store.dispatch("updateHeader") 호출 위치  
- store.dispatch("updateIndividualExposureTime") 호출 위치
- store.getters 사용 부분
- store.state 사용 부분
```

**2.2 StoreBridge 클래스 구현 (1시간)**
```javascript
// store/storeBridge.js
class StoreBridge {
  constructor(legacyStore) {
    this.legacyStore = legacyStore; // 기존 store.js 인스턴스
    this.enhancedManager = new EnhancedStorageManager();
  }
  
  // 기존 store.js의 updateCell을 래핑
  updateCell(payload) {
    if (this.enhancedManager.isEditing()) {
      // 편집 중이면 임시 저장
      this.enhancedManager.updateTempValue(payload.value);
    } else {
      // 편집 중이 아니면 기존 로직 사용
      this.legacyStore.dispatch('updateCell', payload);
    }
  }
  
  // 기존 store.js의 다른 actions도 래핑
  updateHeader(payload) { /* ... */ }
  updateIndividualExposureTime(payload) { /* ... */ }
}
```

**2.3 DataInputVirtual.vue 수정 - 1단계 (1시간)**
```javascript
// 기존 store 사용 부분을 StoreBridge로 교체
// import { useStore } from 'vuex';
import { useStoreBridge } from '@/store/storeBridge';

// const store = useStore();
const storeBridge = useStoreBridge();

// onCellInput 함수 수정
function onCellInput(event, rowIndex, colIndex) {
  if (!selectionSystem.state.isEditing) return;
  
  const newValue = event.target.textContent;
  const columnMeta = allColumnsMeta.value.find(c => c.colIndex === colIndex);
  
  // ⚡ 개선: StoreBridge를 통한 처리
  storeBridge.updateCell({
    rowIndex,
    key: columnMeta.dataKey,
    value: newValue,
    cellIndex: columnMeta.cellIndex,
  });
}
```

**2.4 DataInputVirtual.vue 수정 - 2단계 (1시간)**
```javascript
// 편집 시작/종료 로직 수정
// virtualCellHandlers.js와 연동

// 편집 시작 시
function startCellEditing(rowIndex, colIndex) {
  const columnMeta = allColumnsMeta.value.find(c => c.colIndex === colIndex);
  const originalValue = getCellValue(rows.value[rowIndex], columnMeta, rowIndex);
  
  storeBridge.startCellEdit({
    rowIndex,
    colIndex,
    dataKey: columnMeta.dataKey,
    cellIndex: columnMeta.cellIndex
  }, originalValue, columnMeta);
}

// 편집 종료 시
function completeCellEditing() {
  storeBridge.completeCellEdit();
}
```

#### Phase 3: 키보드 핸들러 수정 (2시간)

**3.1 virtualKeyboardHandlers.js 수정 (1시간)**
```javascript
// ESC 키 처리 수정
if (key === 'Escape') {
  event.preventDefault();
  
  // ⚡ 개선: StoreBridge를 통한 취소 처리
  storeBridge.cancelCellEdit();
  
  // UI에서 원래 값으로 복원
  const cellElement = document.querySelector(cellSelector);
  if (cellElement) {
    cellElement.textContent = storeBridge.getOriginalValue();
  }
  
  stopEditing(false);
  focusGrid();
}

// Enter/Tab 키 처리 수정
else if (key === 'Enter' || key === 'Tab') {
  event.preventDefault();
  
  // ⚡ 개선: StoreBridge를 통한 완료 처리
  storeBridge.completeCellEdit();
  
  stopEditing(true);
  // 다음 셀로 이동
}
```

**3.2 virtualCellHandlers.js 수정 (1시간)**
```javascript
// 더블클릭 편집 시작 수정
export async function handleVirtualCellDoubleClick(rowIndex, colIndex, event, context) {
  // ... 기존 로직 ...
  
  // 편집 모드 시작 시 StoreBridge 연동
  storeBridge.startCellEdit(cellInfo, originalValue, columnMeta);
  
  // ... 나머지 로직 ...
}
```

#### Phase 4: 기존 store.js와의 호환성 보장 (2시간)

**4.1 기존 actions 래핑 (1시간)**
```javascript
// store/storeBridge.js에 추가
class StoreBridge {
  // 기존 store.js의 모든 actions를 래핑
  addRows(count) {
    return this.legacyStore.dispatch('addRows', count);
  }
  
  addColumn(type) {
    return this.legacyStore.dispatch('addColumn', type);
  }
  
  deleteRow(rowIndex) {
    return this.legacyStore.dispatch('deleteRow', rowIndex);
  }
  
  // ... 모든 기존 actions 래핑
}
```

**4.2 getters 및 state 호환성 (1시간)**
```javascript
// store/storeBridge.js에 추가
class StoreBridge {
  // 기존 store.js의 getters를 그대로 노출
  get headers() {
    return this.legacyStore.getters.headers;
  }
  
  get rows() {
    return this.legacyStore.getters.rows;
  }
  
  // ... 모든 기존 getters 노출
}
```

#### Phase 5: 테스트 및 디버깅 (2시간)

**5.1 단위 테스트 (1시간)**
- StoreBridge 클래스 테스트
- EnhancedStorageManager 테스트
- CellInputState 테스트

**5.2 통합 테스트 (1시간)**
- DataInputVirtual 컴포넌트 전체 테스트
- 키보드 이벤트 테스트
- 저장/복원 기능 테스트

#### Phase 6: 성능 최적화 및 안정성 강화 (1시간)

**6.1 성능 최적화 (30분)**
- 메모리 사용량 최적화
- 불필요한 리렌더링 방지
- 디바운싱 타이밍 조정

**6.2 에러 처리 강화 (30분)**
- 네트워크 오류 처리
- localStorage 용량 부족 처리
- 데이터 손상 복구 로직

**총 예상 개발 시간: 13시간**

### 🔧 **위험 요소 및 대응 방안**

#### 1. **기존 코드 의존성 문제**
**위험**: DataInputVirtual이 store.js에 강하게 결합되어 있어 수정 시 예상치 못한 버그 발생 가능

**대응 방안**:
- StoreBridge 패턴으로 점진적 마이그레이션
- 각 단계별 철저한 테스트
- 롤백 계획 수립

#### 2. **상태 동기화 문제**
**위험**: 새로운 시스템과 기존 store.js 간 상태 불일치

**대응 방안**:
- 단일 진실 소스(Single Source of Truth) 원칙 적용
- 모든 상태 변경을 기존 store.js를 통해 처리
- 상태 검증 로직 추가

#### 3. **성능 저하 가능성**
**위험**: 새로운 레이어 추가로 인한 성능 저하

**대응 방안**:
- 성능 모니터링 도구 추가
- 불필요한 래핑 최소화
- 메모리 누수 방지

### 📋 **개발 체크리스트**

#### Phase 1 체크리스트
- [ ] `src/store/` 폴더 생성
- [ ] `CellInputState` 클래스 구현 및 테스트
- [ ] `EnhancedStorageManager` 클래스 구현 및 테스트
- [ ] 기본 StoreBridge 구조 구현

#### Phase 2 체크리스트
- [ ] DataInputVirtual.vue의 store 사용 부분 분석 완료
- [ ] StoreBridge 클래스 완성
- [ ] `onCellInput` 함수 수정 및 테스트
- [ ] 편집 시작/종료 로직 수정 및 테스트

#### Phase 3 체크리스트
- [ ] `virtualKeyboardHandlers.js` 수정 및 테스트
- [ ] `virtualCellHandlers.js` 수정 및 테스트
- [ ] ESC/Enter/Tab 키 동작 확인
- [ ] 화살표 키 동작 확인

#### Phase 4 체크리스트
- [ ] 모든 기존 actions 래핑 완료
- [ ] 모든 기존 getters 노출 완료
- [ ] 기존 기능 동작 확인
- [ ] 호환성 테스트 완료

#### Phase 5 체크리스트
- [ ] 단위 테스트 통과
- [ ] 통합 테스트 통과
- [ ] 성능 테스트 통과
- [ ] 에러 케이스 테스트 통과

#### Phase 6 체크리스트
- [ ] 성능 최적화 완료
- [ ] 에러 처리 강화 완료
- [ ] 최종 테스트 완료
- [ ] 문서화 완료

### 🎯 **핵심 장점**

✅ **성능 향상**: 글자 단위 → 셀 단위 저장  
✅ **사용자 경험**: ESC로 입력 취소 가능  
✅ **안정성**: 편집 중 실수로 데이터 손실 방지  
✅ **호환성**: 기존 store.js와 완전 호환  
✅ **확장성**: 새로운 기능 추가 용이  
✅ **메모리 효율성**: 불필요한 저장 제거  

이 설계는 현재 시스템의 문제점을 해결하면서도 기존 코드와의 호환성을 유지하는 실용적인 솔루션입니다. 