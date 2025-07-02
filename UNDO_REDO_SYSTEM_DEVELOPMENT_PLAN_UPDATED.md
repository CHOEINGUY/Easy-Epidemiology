# Undo/Redo 시스템 개발 계획 (2025-07-02 업데이트)

> 이 문서는 **EnhancedStorageManager + StoreBridge** 구조로 마이그레이션이 완료된 현 시점(Phase 3 이후)에 맞춰 **최신 Undo/Redo 시스템** 구현 절차를 정의합니다. 이전 버전(`UNDO_REDO_SYSTEM_DEVELOPMENT_PLAN.md`)의 개념을 계승하되, 변경된 저장 방식과 데이터 흐름을 반영했습니다.

---

## 1. 목표 & 핵심 요구사항

| 번호 | 요구사항 | 비고 |
| ---- | -------- | ---- |
| 1 | **셀 편집 완료 기준**으로 스냅샷 저장 (글자 입력 중에는 저장 X) | `cellInputState.confirmEditing()` → `HistoryManager.saveSnapshot()` |
| 2 | **행/열 추가·삭제, 데이터 붙여넣기, Excel 가져오기, 초기화, 데이터/헤더 일괄 수정** 등 대량 액션 직후 스냅샷 저장 | StoreBridge 내부 래퍼 메서드에서 호출 |
| 3 | `Ctrl+Z`(Undo) / `Ctrl+Y` 또는 `Ctrl+Shift+Z`(Redo) 단축키 및 UI 버튼 지원 | VirtualScroll 화면 공통 |
| 4 | 최대 15 스냅샷, 중복 상태 필터링, 손상 데이터 복구 로직 포함 | 메모리·용량 최적화 |
| 5 | Undo/Redo 수행 후 **localStorage(메인+히스토리)** 동기화 | 데이터 무결성 유지 |

---

## 2. 저장 구조

```text
localStorage keys
────────────────────────────────────────────
• epidemiology_data     → 최신 스냅샷 (EnhancedStorageManager가 관리)
• epidemiology_history  → {
    undoStack: Snapshot[],   // 최신이 맨 뒤
    redoStack: Snapshot[],
    version: '1.0',
    lastSaved: <timestamp>
  }
```

```typescript
// Snapshot 타입 (최소화)
interface Snapshot {
  timestamp: number;
  action: string;          // 'cell_edit' | 'row_add' | ...
  data: {
    headers: Headers;      // deep-cloned
    rows: Row[];
    settings: Settings;
  };
  meta?: Record<string, any>; // 선택: 설명, 영향 셀 등
}
```

---

## 3. 모듈 설계

### 3.1 HistoryManager (새 파일: `src/store/historyManager.js`)

| 메서드 | 설명 |
| ------ | ---- |
| `constructor(max = 15)` | 스택 크기 설정, localStorage 로드 |
| `saveSnapshot(currentState, action, meta?)` | 1) deep-clone → 2) undoStack push → 3) redoStack clear → 4) 용량/중복 관리 |
| `undo()` | undoStack pop → redoStack push → 반환 Snapshot.data |
| `redo()` | redoStack pop → undoStack push → 반환 Snapshot.data |
| `canUndo()` / `canRedo()` | stack 상태 bool |
| `persist()` | `epidemiology_history` 에 쓰기 |
| `load()` | 초기화 시 localStorage → 메모리 |

특징
1. **isRestoring 플래그**로 Undo/Redo 과정 중 saveSnapshot 호출 차단.  
2. **중복 필터**: 직전 Snapshot 데이터(JSON.stringify)와 동일하면 저장 건너뜀.  
3. **용량 초과 관리**: undoStack 길이 > MAX → shift() 로드 최적화.

### 3.2 StoreBridge 연동

- `constructor` 단계에서 `this.history = new HistoryManager()`
- **스냅샷 저장 지점**
  1. `completeCellEdit()` 내부 (변경 유효할 때만)
  2. 모든 대량 액션 래퍼 메서드(`addRows`, `deleteColumn`, …) 호출 직후
- **Undo/Redo API**
  ```js
  undo() {
    const snapshot = this.history.undo();
    if (!snapshot) return false;
    this.replaceState(snapshot);           // headers·rows·settings 교체
    this.enhancedManager.saveData(snapshot); // 메인 저장
    return true;
  }
  ```
- `replaceState()` 는 Vuex 제거 여부에 따라
  - (현 단계) `this.legacyStore.commit('SET_INITIAL_DATA', snapshot)`
  - 최종 Vuex 제거 후에는 reactive 객체 직접 덮어쓰기

### 3.3 Keyboard & UI

- 공통 훅 `useUndoRedo()` 추가 → 단축키·버튼 클릭을 StoreBridge.undo/redo 로 위임.
- 버튼 활성화는 `canUndo`, `canRedo` 반응형 값.

---

## 4. 단계별 구현 로드맵

| 단계 | 세부 작업 | 예상 시간 |
| ---- | -------- | -------- |
| **Step 1** | `historyManager.js` 파일 생성 & 기본 로직 | 40 min |
| **Step 2** | StoreBridge에 HistoryManager 주입, `saveSnapshot` / `undo` / `redo` 통합 | 30 min |
| **Step 3** | Cell 편집 완료 지점·대량 액션 래퍼에서 `saveSnapshot` 호출 추가 | 20 min |
| **Step 4** | 단축키 리스너 (`DataInputVirtual.vue`) 구현 | 15 min |
| **Step 5** | VirtualFunctionBar.vue 버튼 ‑ 상태 바인딩 | 15 min |
| **Step 6** | 통합 테스트 (기능 + 대용량) | 30 min |
| **Step 7** | 코드/주석 정리 & 문서화 | 10 min |
| **총합** | | **≈ 2 h 30 min** |

---

## 5. 테스트 시나리오

1. **셀 편집**: A1 → 값 변경 후 Undo/Redo 순환 (데이터·헤더 모두)
2. **행 작업**: 10 행 추가 → Undo → Redo → 데이터 복원 검증
3. **열 삭제**: Clinical 3열 삭제 → Undo → Redo
4. **Excel 가져오기**: 샘플 파일 업로드 → Undo → 상태 복원
5. **Reset Sheet**: 초기화 후 Undo 로 원본 복원
6. **용량 초과**: 20번 넘게 작업 수행 → 스택 사이즈 15 유지 확인
7. **데이터 손상**: localStorage 값 임의 파괴 → 앱 재로드 시 HistoryManager 복구 확인

---

## 6. 주의사항 & 개선 여지

- **structuredClone** 지원이 없는 브라우저 대비 폴리필 필요할 수 있음.
- 대용량 데이터(>5 MB) 스냅샷 시 성능 저하 가능 → 이후 diff-patch 방식 검토.
- Redux DevTools 유사 Time-travel 기능을 원할 경우 History stack 노출 API 설계 고려.
- 추후 사용자 설정으로 스택 크기(MAX_HISTORY) 조정 옵션 제공.

---

> 작성자: AI 코파일럿 (2025-07-02)
> 문의: 슬랙 #epidemiology-app 