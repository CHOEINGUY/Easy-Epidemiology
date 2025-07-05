# localStorage 시스템 마이그레이션 계획

## 📋 현재 상황 분석

### ✅ 완료된 부분
1. **새로운 저장 시스템 구조**
   - `StoreBridge` 클래스 구현
   - `CellInputState` 클래스 구현
   - `EnhancedStorageManager` 클래스 구현
   - 헤더/바디 셀 편집 처리 완료

2. **기존 시스템**
   - `store.js`의 기본 localStorage 시스템
   - 모든 액션에서 `storage.save(state)` 호출
   - 기존 Undo/Redo 시스템 (`undoStack`, `redoStack`)

### ❌ 마이그레이션 필요 부분
1. **기존 액션들이 여전히 `storage.save()` 사용**
2. **새로운 시스템과 기존 시스템 병렬 동작**
3. **기존 Undo/Redo 시스템이 새로운 시스템과 충돌 가능성**

## 🎯 마이그레이션 목표

### 최종 목표
- **모든 데이터 저장/로드가 새로운 시스템으로 통합**
- **기존 localStorage 데이터와 완전 호환**
- **성능 향상 및 안정성 개선**
- **Undo/Redo 시스템 개발 준비 완료**

### 성공 기준
- [ ] 모든 액션이 새로운 시스템 사용
- [ ] 기존 데이터 손실 없음
- [ ] 성능 개선 확인
- [ ] 에러 없이 정상 동작

## 📅 단계별 마이그레이션 계획

### Phase 1: 기존 시스템 분석 및 백업 (15분)

#### 1.1 현재 데이터 구조 분석
- [ ] 기존 localStorage 키 구조 확인
  ```javascript
  // 현재 구조
  localStorage.setItem("headers", JSON.stringify(state.headers));
  localStorage.setItem("rows", JSON.stringify(state.rows));
  localStorage.setItem("isIndividualExposureColumnVisible", JSON.stringify(state.isIndividualExposureColumnVisible));
  ```

#### 1.2 새로운 시스템 데이터 구조 확인
- [ ] `EnhancedStorageManager`의 저장 구조 확인
- [ ] 데이터 호환성 검증

#### 1.3 백업 전략 수립
- [ ] 기존 데이터 백업 방법 결정
- [ ] 롤백 계획 수립

### Phase 2: 데이터 호환성 보장 (30분)

#### 2.1 기존 데이터 마이그레이션 함수 구현
```javascript
// src/store/utils/migration.js
export function migrateLegacyData() {
  try {
    // 기존 데이터 로드
    const legacyHeaders = localStorage.getItem("headers");
    const legacyRows = localStorage.getItem("rows");
    const legacyVisibility = localStorage.getItem("isIndividualExposureColumnVisible");
    
    if (!legacyHeaders && !legacyRows) {
      return null; // 기존 데이터 없음
    }
    
    // 새로운 형식으로 변환
    const migratedData = {
      version: '1.0',
      timestamp: Date.now(),
      headers: legacyHeaders ? JSON.parse(legacyHeaders) : null,
      rows: legacyRows ? JSON.parse(legacyRows) : null,
      settings: {
        isIndividualExposureColumnVisible: legacyVisibility ? JSON.parse(legacyVisibility) : false
      }
    };
    
    return migratedData;
  } catch (error) {
    console.error('데이터 마이그레이션 실패:', error);
    return null;
  }
}
```

#### 2.2 데이터 검증 함수 구현
```javascript
export function validateMigratedData(data) {
  if (!data) return false;
  
  // 필수 필드 확인
  if (!data.headers || !data.rows) return false;
  
  // 데이터 구조 검증
  const requiredHeaderTypes = ['basic', 'clinical', 'diet'];
  for (const type of requiredHeaderTypes) {
    if (!Array.isArray(data.headers[type])) return false;
  }
  
  // 행 데이터 검증
  if (!Array.isArray(data.rows)) return false;
  
  return true;
}
```

#### 2.3 EnhancedStorageManager에 마이그레이션 로직 추가
- [ ] 초기 로드 시 기존 데이터 확인
- [ ] 자동 마이그레이션 실행
- [ ] 마이그레이션 결과 로깅

### Phase 3: 기존 액션들을 StoreBridge로 마이그레이션 (45분)

#### 3.1 StoreBridge에 누락된 메서드 추가
```javascript
// src/store/storeBridge.js에 추가할 메서드들
class StoreBridge {
  // 기존 메서드들...
  
  // 누락된 메서드들 추가
  addRows(count) {
    this.legacyStore.dispatch('addRows', count);
  }
  
  addColumn(type) {
    this.legacyStore.dispatch('addColumn', type);
  }
  
  deleteRow(rowIndex) {
    this.legacyStore.dispatch('deleteRow', rowIndex);
  }
  
  // ... 기타 모든 액션들
}
```

#### 3.2 기존 액션들을 새로운 시스템으로 변경
```javascript
// store.js의 actions 수정
actions: {
  // 기존 방식 (제거 예정)
  // addRows({ commit, state }, count) {
  //   commit("SAVE_HISTORY");
  //   commit("ADD_ROWS", count);
  //   storage.save(state);
  // }
  
  // 새로운 방식
  addRows({ commit, state }, count) {
    // 기존 mutation은 유지 (상태 변경용)
    commit("ADD_ROWS", count);
    // 저장은 새로운 시스템 사용
    this.storeBridge.addRows(count);
  }
}
```

#### 3.3 단계별 액션 마이그레이션
1. **우선순위 1 (15분)**
   - [ ] `addRows`, `deleteRow`, `deleteMultipleRows`
   - [ ] `addColumn`, `deleteColumn`, `deleteMultipleColumns`
   - [ ] `updateCell`, `updateHeader`

2. **우선순위 2 (15분)**
   - [ ] `pasteData`, `pasteHeaderData`
   - [ ] `deleteEmptyRows`, `deleteEmptyColumns`
   - [ ] `resetSheet`

3. **우선순위 3 (15분)**
   - [ ] `updateHeadersFromExcel`, `addRowsFromExcel`
   - [ ] `clearRowData`, `clearMultipleRowsData`
   - [ ] 기타 유틸리티 액션들

### Phase 4: 기존 Undo/Redo 시스템 제거 (20분)

#### 4.1 기존 Undo/Redo 관련 코드 제거
```javascript
// store.js에서 제거할 부분들
state: {
  // 제거할 상태들
  undoStack: [], // 제거
  redoStack: [], // 제거
  isRestoring: false, // 제거
},

mutations: {
  // 제거할 mutations
  SAVE_HISTORY(state) { /* 제거 */ },
  UNDO(state) { /* 제거 */ },
  REDO(state) { /* 제거 */ },
  CLEAR_HISTORY(state) { /* 제거 */ },
},

actions: {
  // 제거할 actions
  undo({ commit, state }) { /* 제거 */ },
  redo({ commit, state }) { /* 제거 */ },
}
```

#### 4.2 기존 storage 객체 제거
```javascript
// store.js에서 제거
const storage = {
  save: (state) => { /* 제거 */ },
  load: () => { /* 제거 */ },
  clear: () => { /* 제거 */ },
};
```

#### 4.3 loadInitialData 액션 수정
```javascript
loadInitialData({ commit }) {
  // 새로운 시스템 사용
  const data = this.storeBridge.loadData();
  commit("SET_INITIAL_DATA", data);
}
```

### Phase 5: 통합 테스트 및 검증 (30분)

#### 5.1 기능별 테스트
- [ ] **데이터 로드 테스트**
  - 기존 데이터가 정상적으로 로드되는지 확인
  - 마이그레이션된 데이터가 올바른지 확인

- [ ] **셀 편집 테스트**
  - 헤더/바디 셀 편집이 정상 동작하는지 확인
  - 저장이 올바르게 되는지 확인

- [ ] **행/열 작업 테스트**
  - 행 추가/삭제가 정상 동작하는지 확인
  - 열 추가/삭제가 정상 동작하는지 확인

- [ ] **Excel 가져오기 테스트**
  - Excel 데이터 가져오기가 정상 동작하는지 확인

#### 5.2 성능 테스트
- [ ] **저장 성능 측정**
  - 기존 vs 새로운 시스템 저장 속도 비교
  - 메모리 사용량 측정

- [ ] **로드 성능 측정**
  - 대용량 데이터 로드 시간 측정
  - 마이그레이션 시간 측정

#### 5.3 에러 처리 테스트
- [ ] **localStorage 용량 부족 시나리오**
- [ ] **데이터 손상 시나리오**
- [ ] **네트워크 오류 시나리오**

### Phase 6: 정리 및 최적화 (15분)

#### 6.1 코드 정리
- [ ] 사용하지 않는 import 제거
- [ ] 주석 정리
- [ ] 코드 포맷팅

#### 6.2 성능 최적화
- [ ] 불필요한 저장 호출 제거
- [ ] 메모리 누수 확인
- [ ] 디바운싱 최적화

#### 6.3 문서화
- [ ] 마이그레이션 완료 문서 작성
- [ ] 새로운 시스템 사용법 문서 작성

## 🔧 기술적 구현 세부사항

### 1. 데이터 마이그레이션 전략
```javascript
// 단계별 마이그레이션
1. 기존 데이터 백업
2. 새로운 형식으로 변환
3. 검증 및 저장
4. 기존 데이터 정리 (선택적)
```

### 2. 롤백 전략
```javascript
// 문제 발생 시 롤백 방법
1. 기존 데이터 복원
2. 새로운 시스템 비활성화
3. 기존 시스템으로 복귀
```

### 3. 호환성 보장
```javascript
// 기존 데이터와의 호환성
1. 데이터 구조 유지
2. 필수 필드 보존
3. 기본값 설정
```

## ⚠️ 주의사항

### 1. 데이터 안전성
- **백업 필수**: 마이그레이션 전 기존 데이터 백업
- **단계별 테스트**: 각 단계마다 테스트 수행
- **롤백 준비**: 문제 발생 시 즉시 롤백 가능

### 2. 성능 고려사항
- **점진적 마이그레이션**: 한 번에 모든 것을 변경하지 않음
- **메모리 관리**: 대용량 데이터 처리 시 메모리 사용량 모니터링
- **저장 최적화**: 불필요한 저장 호출 최소화

### 3. 사용자 경험
- **무중단 마이그레이션**: 사용자가 인지하지 못하도록 진행
- **진행 상황 표시**: 긴 마이그레이션 시 진행률 표시
- **에러 메시지**: 명확한 에러 메시지 제공

## 📈 성공 지표

### 기능적 지표
- [ ] 모든 기존 기능이 정상 동작
- [ ] 기존 데이터 손실 없음
- [ ] 새로운 기능이 정상 동작

### 성능 지표
- [ ] 저장 속도 20% 이상 개선
- [ ] 메모리 사용량 10% 이상 감소
- [ ] 로드 시간 30% 이상 단축

### 안정성 지표
- [ ] 에러 발생률 0%
- [ ] 데이터 무결성 100% 보장
- [ ] 롤백 성공률 100%

## 🚀 마이그레이션 실행 순서

1. **Phase 1**: 기존 시스템 분석 및 백업
2. **Phase 2**: 데이터 호환성 보장
3. **Phase 3**: 기존 액션들을 StoreBridge로 마이그레이션
4. **Phase 4**: 기존 Undo/Redo 시스템 제거
5. **Phase 5**: 통합 테스트 및 검증
6. **Phase 6**: 정리 및 최적화

---

**총 예상 시간**: 2시간 35분
**위험도**: 중간 (데이터 손실 가능성)
**우선순위**: 높음 (Undo/Redo 개발 전 필수) 