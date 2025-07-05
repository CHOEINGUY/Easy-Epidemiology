# ValidationManager 기존 기능 통합 계획

## 📋 현재 상황 분석

### 🔴 발견된 문제점
1. **기존 기능 미통합**: 행/열 추가/삭제, 데이터 클리어, 데이터 임포트 등에서 검증 오류 처리가 누락됨
2. **복잡한 상태 동기화**: 각 기능마다 다른 방식으로 데이터를 변경하므로 검증 상태 동기화가 어려움
3. **성능 이슈**: 대량 데이터 처리 시 검증이 UI를 블로킹할 수 있음
4. **일관성 부족**: 각 기능별로 검증 처리가 다르게 구현될 위험

### 📊 영향받는 기능들
```
DataInputVirtual.vue
├── 행/열 관리
│   ├── addRow() - 새 행 추가
│   ├── deleteRow() - 행 삭제
│   ├── addColumn() - 새 열 추가
│   └── deleteColumn() - 열 삭제
├── 데이터 관리
│   ├── clearSelectedData() - 선택 데이터 클리어
│   ├── clearAllData() - 전체 데이터 클리어
│   └── importExcelData() - 엑셀 데이터 임포트
├── 편집 기능
│   ├── pasteData() - 붙여넣기
│   ├── copyData() - 복사
│   └── cutData() - 잘라내기
└── 시스템 기능
    ├── undo() - 실행 취소
    ├── redo() - 다시 실행
    └── resetData() - 데이터 초기화
```

## 🎯 통합 설계 원칙

### 1. **일관성 (Consistency)**
- 모든 데이터 변경 작업에서 동일한 검증 패턴 적용
- 검증 오류 상태의 일관된 관리

### 2. **성능 (Performance)**
- 대량 작업 시 청크 단위 검증
- 비동기 처리로 UI 블로킹 방지
- 스마트한 재검증 (변경된 부분만)

### 3. **안정성 (Reliability)**
- 각 작업의 원자성 보장
- 실패 시 롤백 가능
- 검증 상태의 무결성 유지

## 🏗️ 단계별 구현 계획

### Phase 1: ValidationManager 확장 (1일)

#### 1.1 대량 작업 지원 메서드 추가
**파일**: `src/validation/ValidationManager.js`

```javascript
export class ValidationManager {
  // ... 기존 코드 ...
  
  /**
   * 행 추가 시 검증 처리
   */
  handleRowAddition(rowIndex, newRow, columnMetas) {
    // 새 행의 검증 오류 초기화
    this.clearErrorsForRow(rowIndex);
    
    // 새 행의 데이터 검증
    columnMetas.forEach(columnMeta => {
      if (!columnMeta.isEditable) return;
      
      const value = this.getCellValue(newRow, columnMeta);
      if (value !== '' && value !== null && value !== undefined) {
        this.validateCell(rowIndex, columnMeta.colIndex, value, columnMeta.type, true);
      }
    });
  }
  
  /**
   * 행 삭제 시 검증 처리
   */
  handleRowDeletion(deletedRowIndices) {
    // 삭제된 행들의 검증 오류 제거
    deletedRowIndices.forEach(rowIndex => {
      this.clearErrorsForRow(rowIndex);
    });
    
    // 남은 행들의 인덱스 재조정
    this.reindexErrorsAfterRowDeletion(deletedRowIndices);
  }
  
  /**
   * 열 추가 시 검증 처리
   */
  handleColumnAddition(colIndex, columnMeta) {
    // 새 열의 검증 오류 초기화
    this.clearErrorsForColumn(colIndex);
    
    // 기존 데이터가 있다면 검증
    if (this.rows && this.rows.length > 0) {
      this.rows.forEach((row, rowIndex) => {
        const value = this.getCellValue(row, columnMeta);
        if (value !== '' && value !== null && value !== undefined) {
          this.validateCell(rowIndex, colIndex, value, columnMeta.type, true);
        }
      });
    }
  }
  
  /**
   * 열 삭제 시 검증 처리
   */
  handleColumnDeletion(deletedColIndices) {
    // 삭제된 열들의 검증 오류 제거
    deletedColIndices.forEach(colIndex => {
      this.clearErrorsForColumn(colIndex);
    });
    
    // 남은 열들의 인덱스 재조정
    this.reindexErrorsAfterColumnDeletion(deletedColIndices);
  }
  
  /**
   * 데이터 클리어 시 검증 처리
   */
  handleDataClear(clearedCells) {
    // 클리어된 셀들의 검증 오류 제거
    const cellsForErrorClear = clearedCells.map(cell => ({
      row: cell.rowIndex,
      col: cell.colIndex
    }));
    
    this.clearErrorsForCells(cellsForErrorClear);
  }
  
  /**
   * 엑셀 데이터 임포트 시 검증 처리
   */
  async handleDataImport(importedData, columnMetas) {
    // 기존 검증 오류 모두 제거
    this.clearAllErrors();
    
    // 청크 단위로 검증 수행
    const chunkSize = 1000;
    const totalRows = importedData.length;
    
    for (let i = 0; i < totalRows; i += chunkSize) {
      const chunk = importedData.slice(i, i + chunkSize);
      
      // 청크 검증
      chunk.forEach((row, chunkIndex) => {
        const rowIndex = i + chunkIndex;
        columnMetas.forEach(columnMeta => {
          if (!columnMeta.isEditable) return;
          
          const value = this.getCellValue(row, columnMeta);
          if (value !== '' && value !== null && value !== undefined) {
            this.validateCell(rowIndex, columnMeta.colIndex, value, columnMeta.type, true);
          }
        });
      });
      
      // UI 업데이트를 위한 지연
      if (i + chunkSize < totalRows) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }
  }
  
  /**
   * 붙여넣기 시 검증 처리
   */
  handlePasteData(pasteData, startRow, startCol, columnMetas) {
    pasteData.forEach((row, rowOffset) => {
      const rowIndex = startRow + rowOffset;
      
      row.forEach((value, colOffset) => {
        const colIndex = startCol + colOffset;
        const columnMeta = columnMetas.find(c => c.colIndex === colIndex);
        
        if (columnMeta && columnMeta.isEditable) {
          // 기존 오류 제거
          this.store.commit('REMOVE_VALIDATION_ERROR', { rowIndex, colIndex });
          
          // 새 값 검증
          if (value !== '' && value !== null && value !== undefined) {
            this.validateCell(rowIndex, colIndex, value, columnMeta.type, true);
          }
        }
      });
    });
  }
  
  /**
   * 특정 행의 모든 오류 제거
   */
  clearErrorsForRow(rowIndex) {
    const errorsToRemove = [];
    
    this.store.state.validationState.errors.forEach((error, key) => {
      const [errorRow] = key.split('_').map(Number);
      if (errorRow === rowIndex) {
        errorsToRemove.push(key);
      }
    });
    
    errorsToRemove.forEach(key => {
      const [row, col] = key.split('_').map(Number);
      this.store.commit('REMOVE_VALIDATION_ERROR', { rowIndex: row, colIndex: col });
    });
  }
  
  /**
   * 특정 열의 모든 오류 제거
   */
  clearErrorsForColumn(colIndex) {
    const errorsToRemove = [];
    
    this.store.state.validationState.errors.forEach((error, key) => {
      const [, errorCol] = key.split('_').map(Number);
      if (errorCol === colIndex) {
        errorsToRemove.push(key);
      }
    });
    
    errorsToRemove.forEach(key => {
      const [row, col] = key.split('_').map(Number);
      this.store.commit('REMOVE_VALIDATION_ERROR', { rowIndex: row, colIndex: col });
    });
  }
  
  /**
   * 행 삭제 후 오류 인덱스 재조정
   */
  reindexErrorsAfterRowDeletion(deletedRowIndices) {
    const newErrors = new Map();
    const deletedSet = new Set(deletedRowIndices);
    
    this.store.state.validationState.errors.forEach((error, key) => {
      const [row, col] = key.split('_').map(Number);
      
      if (!deletedSet.has(row)) {
        // 삭제된 행보다 뒤에 있는 행들의 인덱스 조정
        let newRowIndex = row;
        deletedRowIndices.forEach(deletedRow => {
          if (row > deletedRow) {
            newRowIndex--;
          }
        });
        
        const newKey = `${newRowIndex}_${col}`;
        newErrors.set(newKey, error);
      }
    });
    
    // Vuex 상태 업데이트
    this.store.commit('SET_VALIDATION_ERRORS', newErrors);
  }
  
  /**
   * 열 삭제 후 오류 인덱스 재조정
   */
  reindexErrorsAfterColumnDeletion(deletedColIndices) {
    const newErrors = new Map();
    const deletedSet = new Set(deletedColIndices);
    
    this.store.state.validationState.errors.forEach((error, key) => {
      const [row, col] = key.split('_').map(Number);
      
      if (!deletedSet.has(col)) {
        // 삭제된 열보다 뒤에 있는 열들의 인덱스 조정
        let newColIndex = col;
        deletedColIndices.forEach(deletedCol => {
          if (col > deletedCol) {
            newColIndex--;
          }
        });
        
        const newKey = `${row}_${newColIndex}`;
        newErrors.set(newKey, error);
      }
    });
    
    // Vuex 상태 업데이트
    this.store.commit('SET_VALIDATION_ERRORS', newErrors);
  }
}
```

#### 1.2 Vuex Store에 새로운 mutation 추가
**파일**: `src/components/store.js`

```javascript
mutations: {
  // ... 기존 mutations ...
  
  SET_VALIDATION_ERRORS(state, errors) {
    state.validationState.errors = errors;
    state.validationState.version++;
  }
}
```

### Phase 2: StoreBridge 통합 (1일)

#### 2.1 StoreBridge에 ValidationManager 주입
**파일**: `src/store/storeBridge.js`

```javascript
export class StoreBridge {
  constructor(legacyStore = null, validationManager = null) {
    this.legacyStore = legacyStore;
    this.enhancedManager = new EnhancedStorageManager(legacyStore);
    this.history = new HistoryManager();
    this.validationManager = validationManager;
    this.isInitialized = false;
  }
  
  /**
   * 행 추가
   */
  addRow(rowIndex, newRow) {
    // 기존 로직
    this.legacyStore.dispatch('addRow', { rowIndex, row: newRow });
    this.saveCurrentState();
    
    // 검증 처리
    if (this.validationManager) {
      const columnMetas = this.getColumnMetas();
      this.validationManager.handleRowAddition(rowIndex, newRow, columnMetas);
    }
  }
  
  /**
   * 행 삭제
   */
  deleteRows(rowIndices) {
    // 기존 로직
    this.legacyStore.dispatch('deleteRows', { rowIndices });
    this.saveCurrentState();
    
    // 검증 처리
    if (this.validationManager) {
      this.validationManager.handleRowDeletion(rowIndices);
    }
  }
  
  /**
   * 열 추가
   */
  addColumn(colIndex, columnMeta) {
    // 기존 로직
    this.legacyStore.dispatch('addColumn', { colIndex, columnMeta });
    this.saveCurrentState();
    
    // 검증 처리
    if (this.validationManager) {
      this.validationManager.handleColumnAddition(colIndex, columnMeta);
    }
  }
  
  /**
   * 열 삭제
   */
  deleteColumns(colIndices) {
    // 기존 로직
    this.legacyStore.dispatch('deleteColumns', { colIndices });
    this.saveCurrentState();
    
    // 검증 처리
    if (this.validationManager) {
      this.validationManager.handleColumnDeletion(colIndices);
    }
  }
  
  /**
   * 데이터 클리어
   */
  clearSelectedData(clearedCells) {
    // 기존 로직
    this.legacyStore.dispatch('clearSelectedData', { clearedCells });
    this.saveCurrentState();
    
    // 검증 처리
    if (this.validationManager) {
      this.validationManager.handleDataClear(clearedCells);
    }
  }
  
  /**
   * 엑셀 데이터 임포트
   */
  async importExcelData(importedData) {
    // 기존 로직
    this.legacyStore.dispatch('importExcelData', { data: importedData });
    this.saveCurrentState();
    
    // 검증 처리
    if (this.validationManager) {
      const columnMetas = this.getColumnMetas();
      await this.validationManager.handleDataImport(importedData, columnMetas);
    }
  }
  
  /**
   * 붙여넣기
   */
  pasteData(pasteData, startRow, startCol) {
    // 기존 로직
    this.legacyStore.dispatch('pasteData', { pasteData, startRow, startCol });
    this.saveCurrentState();
    
    // 검증 처리
    if (this.validationManager) {
      const columnMetas = this.getColumnMetas();
      this.validationManager.handlePasteData(pasteData, startRow, startCol, columnMetas);
    }
  }
  
  /**
   * 컬럼 메타데이터 가져오기 헬퍼
   */
  getColumnMetas() {
    return this.legacyStore.state.columnMetas || [];
  }
}
```

### Phase 3: DataInputVirtual 통합 (1일)

#### 3.1 기존 메서드들에 검증 로직 통합
**파일**: `src/components/DataInputVirtualScroll/DataInputVirtual.vue`

```javascript
// ValidationManager 인스턴스 생성
const validationManager = new ValidationManager(store);

// StoreBridge에 ValidationManager 주입
const storeBridge = new StoreBridge(store, validationManager);

// 행 추가
function addRow() {
  const newRow = createEmptyRow();
  const rowIndex = rows.value.length;
  
  storeBridge.addRow(rowIndex, newRow);
}

// 행 삭제
function deleteSelectedRows() {
  const selectedRows = getSelectedRows();
  if (selectedRows.length === 0) return;
  
  storeBridge.deleteRows(selectedRows);
}

// 열 추가
function addColumn() {
  const newColumnMeta = createNewColumnMeta();
  const colIndex = allColumnsMeta.value.length;
  
  storeBridge.addColumn(colIndex, newColumnMeta);
}

// 열 삭제
function deleteSelectedColumns() {
  const selectedColumns = getSelectedColumns();
  if (selectedColumns.length === 0) return;
  
  storeBridge.deleteColumns(selectedColumns);
}

// 데이터 클리어
function handleClearSelectedData(context) {
  const clearedCells = getClearedCells(context);
  
  storeBridge.clearSelectedData(clearedCells);
}

// 엑셀 데이터 임포트
async function handleExcelImport(importedData) {
  await storeBridge.importExcelData(importedData);
}

// 붙여넣기
function handlePaste(pasteData, startRow, startCol) {
  storeBridge.pasteData(pasteData, startRow, startCol);
}

// Undo/Redo 개선
function onUndo() {
  const success = storeBridge.undo();
  if (success) {
    // 전체 재검증 (기존 로직 유지)
    validationManager.revalidateAll(rows.value, allColumnsMeta.value);
  }
}

function onRedo() {
  const success = storeBridge.redo();
  if (success) {
    validationManager.revalidateAll(rows.value, allColumnsMeta.value);
  }
}
```

### Phase 4: 성능 최적화 (0.5일)

#### 4.1 비동기 처리 개선
**파일**: `src/validation/ValidationManager.js`

```javascript
export class ValidationManager {
  constructor(store, options = {}) {
    this.store = store;
    this.validationTimers = new Map();
    this.DEBOUNCE_DELAY = options.debounceDelay || 300;
    this.CHUNK_SIZE = options.chunkSize || 1000;
    this.ASYNC_DELAY = options.asyncDelay || 10;
    this.isProcessing = false;
  }
  
  /**
   * 비동기 청크 처리
   */
  async processInChunks(items, processor, chunkSize = this.CHUNK_SIZE) {
    const totalItems = items.length;
    
    for (let i = 0; i < totalItems; i += chunkSize) {
      const chunk = items.slice(i, i + chunkSize);
      
      // 청크 처리
      chunk.forEach(processor);
      
      // UI 블로킹 방지
      if (i + chunkSize < totalItems) {
        await new Promise(resolve => setTimeout(resolve, this.ASYNC_DELAY));
      }
    }
  }
  
  /**
   * 대량 데이터 임포트 최적화
   */
  async handleDataImport(importedData, columnMetas) {
    this.isProcessing = true;
    this.clearAllErrors();
    
    try {
      await this.processInChunks(importedData, (row, rowIndex) => {
        columnMetas.forEach(columnMeta => {
          if (!columnMeta.isEditable) return;
          
          const value = this.getCellValue(row, columnMeta);
          if (value !== '' && value !== null && value !== undefined) {
            this.validateCell(rowIndex, columnMeta.colIndex, value, columnMeta.type, true);
          }
        });
      });
    } finally {
      this.isProcessing = false;
    }
  }
  
  /**
   * 처리 상태 확인
   */
  isValidationProcessing() {
    return this.isProcessing;
  }
}
```

#### 4.2 진행률 표시 컴포넌트
**파일**: `src/components/DataInputVirtualScroll/parts/ValidationProgress.vue`

```vue
<template>
  <div v-if="isProcessing" class="validation-progress">
    <div class="progress-bar">
      <div class="progress-fill" :style="{ width: progress + '%' }"></div>
    </div>
    <span class="progress-text">검증 중... {{ progress }}%</span>
  </div>
</template>

<script>
export default {
  name: 'ValidationProgress',
  props: {
    isProcessing: {
      type: Boolean,
      default: false
    },
    progress: {
      type: Number,
      default: 0
    }
  }
}
</script>

<style scoped>
.validation-progress {
  position: fixed;
  top: 20px;
  right: 20px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 10px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  z-index: 1000;
}

.progress-bar {
  width: 200px;
  height: 8px;
  background: #f0f0f0;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #4CAF50;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 12px;
  color: #666;
  margin-top: 5px;
  display: block;
}
</style>
```

### Phase 5: 테스트 및 검증 (0.5일)

#### 5.1 단위 테스트 작성
**파일**: `tests/ValidationManager.integration.test.js`

```javascript
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
});
```

## 📊 기대 효과

### 1. **기능 완성도**
- ✅ 모든 데이터 변경 작업에서 검증 처리
- ✅ 일관된 오류 상태 관리
- ✅ 인덱스 재조정 자동화

### 2. **성능 개선**
- ✅ 대량 데이터 처리 시 청크 단위 검증
- ✅ 비동기 처리로 UI 블로킹 방지
- ✅ 진행률 표시로 사용자 경험 향상

### 3. **유지보수성**
- ✅ 명확한 책임 분리
- ✅ 테스트 가능한 구조
- ✅ 확장 가능한 설계

## 🔄 구현 우선순위

### High Priority (필수)
1. **Phase 1**: ValidationManager 확장
2. **Phase 2**: StoreBridge 통합
3. **Phase 3**: DataInputVirtual 통합

### Medium Priority (권장)
4. **Phase 4**: 성능 최적화
5. **Phase 5**: 테스트 및 검증

## 📝 결론

이 계획을 통해 기존의 모든 기능들이 ValidationManager와 완전히 통합되어 일관된 검증 처리가 가능해집니다. 

**주요 장점:**
- ✅ 모든 데이터 변경 작업에서 검증 처리
- ✅ 성능 최적화로 대용량 데이터 처리 가능
- ✅ 안정적인 오류 상태 관리
- ✅ 확장 가능한 구조

**구현 시간:**
- 총 4일 (각 Phase별로 점진적 구현 가능)

이 방향으로 진행하시겠습니까? 