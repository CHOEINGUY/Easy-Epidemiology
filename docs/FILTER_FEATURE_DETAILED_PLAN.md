# 필터 기능 상세 개발 계획서

## 📋 개요

데이터 입력 탭에 Excel/Google Sheets와 유사한 컬럼 기반 필터 기능을 추가하여 사용자가 대용량 데이터를 효율적으로 탐색할 수 있도록 합니다. 기존의 가상 스크롤, Undo/Redo, 유효성 검사, 선택 시스템과 완벽하게 호환되도록 설계합니다.

## 🎯 목표 및 요구사항

### 핵심 목표
- **자연스러운 통합**: Excel과 같은 직관적인 필터 UI
- **호환성 보장**: 기존 기능과의 완벽한 호환성
- **성능 최적화**: 10k 행에서도 부드러운 동작
- **비파괴적 필터링**: 데이터는 변경하지 않고 뷰만 필터링

### 기능 요구사항
- 컬럼별 개별 필터 (헤더 드롭다운)
- 다중 컬럼 필터 조합 (AND 로직)
- 필터 상태 표시 및 관리
- 필터 해제 기능
- 세션별 필터 상태 저장 (localStorage)

## 🏗️ 1단계: 요구사항 분석 및 설계 (2-3시간)

### 1.1 컬럼 타입별 필터 전략 (Phase 1: 환자여부만)

```javascript
// Phase 1: 환자여부 컬럼 필터만 구현
const FILTER_STRATEGIES_PHASE1 = {
  [COL_TYPE_IS_PATIENT]: 'binary'  // 환자여부만
};

// 향후 확장 예정
const FILTER_STRATEGIES_FUTURE = {
  // 이진 컬럼 (0/1 값)
  [COL_TYPE_CONFIRMED_CASE]: 'binary',    // 확진여부  
  'clinicalSymptoms': 'binary',           // 임상증상 (각 셀)
  'dietInfo': 'binary',                   // 식단 (각 셀)
  
  // 텍스트 컬럼
  [COL_TYPE_BASIC]: 'text',               // 기본정보
  
  // 날짜/시간 컬럼
  [COL_TYPE_ONSET]: 'datetime',           // 증상발현시간
  [COL_TYPE_INDIVIDUAL_EXPOSURE]: 'datetime' // 개별노출시간
};
```

### 1.2 필터 상태 구조 설계

```javascript
// StoreBridge에 추가할 필터 상태
const filterState = {
  activeFilters: new Map(), // colIndex -> FilterConfig
  globalSearch: '',         // 전체 검색 (Phase 2)
  isFiltered: false,        // 필터 적용 여부
  filteredRowCount: 0,      // 필터된 행 수
  originalRowCount: 0,      // 원본 행 수
  lastAppliedAt: null       // 마지막 필터 적용 시간
};

// 필터 설정 타입
const FilterConfig = {
  type: 'binary' | 'text' | 'datetime',
  values: [],              // 선택된 값들
  operator: 'contains' | 'exact' | 'range',
  dateRange: { start: Date, end: Date }, // datetime용
  isActive: true
};
```

### 1.3 성공 기준 (Phase 1)
- [ ] 환자여부 컬럼 필터 정상 동작
- [ ] 컨텍스트 메뉴에서 1/0 토글 필터 동작
- [ ] 필터 적용 시 가상 스크롤 깨지지 않음
- [ ] 10k 행에서 필터 적용 시간 < 100ms
- [ ] 기존 Undo/Redo 기능 정상 동작
- [ ] 유효성 검사 오류 표시 정상 동작
- [ ] 선택 시스템 정상 동작
- [ ] 필터된 상태에서 행 추가 비활성화
- [ ] 원본 행 번호 유지 (1, 3, 5, 7...)

## 🎨 2단계: UI 컴포넌트 개발 (3-4시간)

### 2.1 컨텍스트 메뉴 기반 필터 UI

**변경 사항:**
- 헤더 아이콘 제거, 컨텍스트 메뉴에 필터 기능 통합
- 이진 컬럼(환자여부, 확진여부, 임상증상, 식단)은 1/0 토글 방식
- 환자여부 컬럼부터 단계적 구현

### 2.2 contextMenuHandlers.js 수정

**환자여부 컬럼 필터 메뉴 추가:**

```javascript
function getMenuItemsForContext(rowIndex, colIndex, selectionState, allColumnsMeta) {
  const menuItems = [];
  
  // 헤더 클릭 시 필터 메뉴 추가
  if (rowIndex < 0) {
    const column = allColumnsMeta.find(c => c.colIndex === colIndex);
    
    // 환자여부 컬럼 필터 메뉴
    if (column && column.type === COL_TYPE_IS_PATIENT) {
      menuItems.push(
        { type: 'separator' },
        { label: '필터', type: 'submenu', items: [
          { label: '1 (환자)', action: 'filter-patient-1', type: 'checkbox', checked: isFilterActive(colIndex, '1') },
          { label: '0 (정상)', action: 'filter-patient-0', type: 'checkbox', checked: isFilterActive(colIndex, '0') }
        ]}
      );
    }
    
    // 기존 메뉴 아이템들...
  }
  
  return menuItems;
}

// 필터 활성 상태 확인
function isFilterActive(colIndex, value) {
  const activeFilters = storeBridge.filterState.activeFilters;
  const filter = activeFilters.get(colIndex);
  return filter && filter.values.includes(value);
}
```

### 2.3 ContextMenu.vue 수정

**체크박스 메뉴 아이템 지원:**

```vue
<template>
  <div v-if="visible" ref="menuRef" class="context-menu" :style="menuStyle">
    <template v-for="(item, index) in items" :key="index">
      <div v-if="item.type === 'separator'" class="context-menu-separator"></div>
      
      <!-- 서브메뉴 -->
      <div v-else-if="item.type === 'submenu'" class="context-submenu">
        <div class="submenu-header">{{ item.label }}</div>
        <div class="submenu-items">
          <div 
            v-for="(subItem, subIndex) in item.items" 
            :key="subIndex"
            class="context-menu-item submenu-item"
            :class="{ 'is-disabled': subItem.disabled, 'is-checked': subItem.checked }"
            @click="onSubItemClick(item, subItem)"
          >
            <span v-if="subItem.type === 'checkbox'" class="checkbox-icon">
              {{ subItem.checked ? '☑' : '☐' }}
            </span>
            <span class="context-menu-text">{{ subItem.label }}</span>
          </div>
        </div>
      </div>
      
      <!-- 일반 메뉴 아이템 -->
      <div
        v-else
        class="context-menu-item"
        :class="{ 'is-disabled': item.disabled, 'is-danger': item.danger }"
        @click="onItemClick(item)"
      >
        <span v-if="item.icon" class="context-menu-icon">{{ item.icon }}</span>
        <span class="context-menu-text">{{ item.label }}</span>
        <span v-if="item.shortcut" class="context-menu-shortcut">{{ item.shortcut }}</span>
      </div>
    </template>
  </div>
</template>
```

### 2.4 VirtualFunctionBar.vue 수정

**통합 필터 버튼 (상태 표시 + 제어):**

```vue
<!-- 통합 필터 버튼 -->
<div class="button-group filter-controls">
  <button 
    class="function-button filter-button"
    :class="{ 'has-filters': hasActiveFilters }"
    @click="toggleFilterMenu"
    @mouseenter="showTooltip('filter', getFilterTooltip(), $event)"
    @mouseleave="hideTooltip"
  >
    <span class="material-icons-outlined">
      {{ hasActiveFilters ? 'filter_alt' : 'filter_alt_off' }}
    </span>
    <span class="button-text">
      {{ hasActiveFilters ? `필터 (${filteredRowCount}/${originalRowCount})` : '필터' }}
    </span>
    <!-- 필터 적용 배지 -->
    <span v-if="hasActiveFilters" class="filter-badge">적용됨</span>
  </button>
</div>

<!-- 필터 드롭다운 메뉴 -->
<div v-if="showFilterDropdown" class="filter-dropdown" ref="filterDropdownRef">
  <div class="filter-dropdown-header">
    <h4>필터 관리</h4>
    <button @click="closeFilterDropdown" class="close-btn">×</button>
  </div>
  
  <div class="filter-dropdown-content">
    <!-- 활성 필터 목록 -->
    <div v-if="hasActiveFilters" class="active-filters">
      <h5>활성 필터</h5>
      <div v-for="[colIndex, filter] in activeFilters" :key="colIndex" class="filter-item">
        <span class="filter-label">{{ getColumnName(colIndex) }}</span>
        <span class="filter-values">{{ formatFilterValues(filter) }}</span>
        <button @click="removeFilter(colIndex)" class="remove-filter-btn">×</button>
      </div>
    </div>
    
    <!-- 액션 버튼들 -->
    <div class="filter-actions">
      <button 
        v-if="hasActiveFilters"
        @click="clearAllFilters" 
        class="clear-all-btn"
      >
        모든 필터 지우기
      </button>
      <button @click="closeFilterDropdown" class="close-btn">닫기</button>
    </div>
  </div>
</div>
```

**스타일링:**

```css
.filter-button {
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
}

.filter-button.has-filters {
  background-color: #e8f0fe;
  color: #1a73e8;
  border-color: #1a73e8;
}

.filter-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  background-color: #ea4335;
  color: white;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 10px;
  font-weight: 600;
}

.filter-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  min-width: 280px;
  max-width: 400px;
}

.active-filters {
  padding: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.filter-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #f8f8f8;
}

.filter-item:last-child {
  border-bottom: none;
}

.remove-filter-btn {
  background: none;
  border: none;
  color: #ea4335;
  cursor: pointer;
  font-size: 16px;
  padding: 2px 6px;
  border-radius: 4px;
}

.remove-filter-btn:hover {
  background-color: #fce8e6;
}
```

### 2.5 스타일링 가이드라인

**컨텍스트 메뉴 필터 스타일:**

```css
.context-submenu {
  border-top: 1px solid #e0e0e0;
  margin-top: 4px;
  padding-top: 4px;
}

.submenu-header {
  font-weight: 600;
  color: #666;
  padding: 4px 12px;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.submenu-item {
  padding-left: 24px;
  font-size: 13px;
}

.checkbox-icon {
  margin-right: 8px;
  font-size: 14px;
  color: #1a73e8;
}

.is-checked {
  background-color: #e8f0fe;
  color: #1a73e8;
}
```

### 2.3 VirtualFunctionBar.vue 수정

**추가 기능:**
- 필터 상태 표시
- 모든 필터 해제 버튼
- 필터된 행 수 표시

```vue
<!-- 필터 관련 버튼 추가 -->
<div class="button-group filter-controls">
  <button 
    class="function-button"
    :disabled="!hasActiveFilters"
    @click="clearAllFilters"
    @mouseenter="showTooltip('clearFilters', '모든 필터를 해제합니다', $event)"
    @mouseleave="hideTooltip"
  >
    <span class="material-icons-outlined">filter_alt_off</span>
    필터 지우기
  </button>
  
  <!-- 필터 상태 표시 -->
  <div v-if="isFiltered" class="filter-status">
    <span class="filter-count">{{ filteredRowCount }}/{{ originalRowCount }}</span>
    <span class="filter-label">행 표시</span>
  </div>
</div>
```

### 2.4 스타일링 가이드라인

**디자인 원칙:**
- 기존 그리드 스타일과 일관성 유지
- 필터 아이콘은 헤더 우측 상단에 배치
- 드롭다운은 z-index 1000 이상으로 설정
- 반응형 디자인 적용

## 🔧 3단계: 상태 관리 및 데이터 레이어 (2-3시간)

### 3.1 StoreBridge 확장 (환자여부 필터만)

**새로운 메서드들:**

```javascript
class StoreBridge {
  constructor() {
    // 기존 코드...
    this.filterState = reactive({
      activeFilters: new Map(), // colIndex -> FilterConfig
      isFiltered: false,
      filteredRowCount: 0,
      originalRowCount: 0,
      lastAppliedAt: null
    });
    
    // 필터된 행 인덱스 매핑
    this._filteredRowMapping = new Map();
    this._originalToFilteredMapping = new Map();
  }
  
  // 환자여부 필터 토글 (1 또는 0)
  togglePatientFilter(value) {
    const colIndex = 1; // 환자여부 컬럼 인덱스
    const currentFilter = this.filterState.activeFilters.get(colIndex);
    
    if (!currentFilter) {
      // 필터가 없으면 새로 생성 (1과 0 모두 선택된 상태)
      this.applyFilter(colIndex, {
        type: 'binary',
        values: ['1', '0'],
        columnType: COL_TYPE_IS_PATIENT
      });
    }
    
    // 현재 필터에서 해당 값 토글
    const newValues = [...(currentFilter?.values || ['1', '0'])];
    const valueIndex = newValues.indexOf(value);
    
    if (valueIndex > -1) {
      // 값이 있으면 제거
      newValues.splice(valueIndex, 1);
    } else {
      // 값이 없으면 추가
      newValues.push(value);
    }
    
    // 최소 하나는 선택되어야 함
    if (newValues.length === 0) {
      newValues.push('1', '0'); // 모두 선택
    }
    
    this.applyFilter(colIndex, {
      type: 'binary',
      values: newValues,
      columnType: COL_TYPE_IS_PATIENT
    });
  }
  
  // 필터 적용
  applyFilter(colIndex, filterConfig) {
    console.log('[Filter] 필터 적용:', { colIndex, filterConfig });
    
    this.filterState.activeFilters.set(colIndex, {
      ...filterConfig,
      appliedAt: Date.now()
    });
    
    this._updateFilteredRows();
    this._saveFilterState();
  }
  
  // 필터 제거
  clearFilter(colIndex) {
    console.log('[Filter] 필터 제거:', colIndex);
    
    this.filterState.activeFilters.delete(colIndex);
    this._updateFilteredRows();
    this._saveFilterState();
  }
  
  // 모든 필터 제거
  clearAllFilters() {
    console.log('[Filter] 모든 필터 제거');
    
    this.filterState.activeFilters.clear();
    this.filterState.isFiltered = false;
    this.filterState.filteredRowCount = 0;
    this.filterState.originalRowCount = 0;
    
    this._clearMappings();
    this._saveFilterState();
  }
  
  // 필터된 행 계산
  _updateFilteredRows() {
    const originalRows = this.legacyStore.state.rows;
    const filteredRows = originalRows.filter(row => this._applyFilters(row));
    
    this.filterState.filteredRowCount = filteredRows.length;
    this.filterState.originalRowCount = originalRows.length;
    this.filterState.isFiltered = this.filterState.activeFilters.size > 0;
    this.filterState.lastAppliedAt = Date.now();
    
    // 매핑 업데이트
    this._updateMappings(filteredRows, originalRows);
  }
  
  // 필터 적용 로직 (환자여부만)
  _applyFilters(row) {
    for (const [colIndex, filterConfig] of this.filterState.activeFilters) {
      if (!this._matchesFilter(row, colIndex, filterConfig)) {
        return false;
      }
    }
    return true;
  }
  
  // 개별 필터 매칭 (환자여부만)
  _matchesFilter(row, colIndex, filterConfig) {
    // 환자여부 컬럼만 처리
    if (colIndex === 1 && filterConfig.columnType === COL_TYPE_IS_PATIENT) {
      const cellValue = String(row.isPatient || '');
      return filterConfig.values.includes(cellValue);
    }
    
    return true; // 다른 컬럼은 필터링하지 않음
  }
  
  // 향후 확장용 (Phase 2에서 구현)
  // _matchesTextFilter(value, filterConfig) { ... }
  // _matchesDateTimeFilter(value, filterConfig) { ... }
  
  // 매핑 업데이트
  _updateMappings(filteredRows, originalRows) {
    this._filteredRowMapping.clear();
    this._originalToFilteredMapping.clear();
    
    filteredRows.forEach((row, filteredIndex) => {
      const originalIndex = originalRows.indexOf(row);
      this._filteredRowMapping.set(filteredIndex, originalIndex);
      this._originalToFilteredMapping.set(originalIndex, filteredIndex);
    });
  }
  
  // 필터 상태 저장 (localStorage)
  _saveFilterState() {
    try {
      const filterData = {
        activeFilters: Array.from(this.filterState.activeFilters.entries()),
        isFiltered: this.filterState.isFiltered,
        lastAppliedAt: this.filterState.lastAppliedAt
      };
      
      localStorage.setItem('dataInputFilters', JSON.stringify(filterData));
      console.log('[Filter] 필터 상태 저장 완료');
    } catch (error) {
      console.error('[Filter] 필터 상태 저장 실패:', error);
    }
  }
  
  // 필터 상태 복원 (페이지 새로고침 후에도 유지)
  loadFilterState() {
    try {
      const savedData = localStorage.getItem('dataInputFilters');
      if (!savedData) return;
      
      const filterData = JSON.parse(savedData);
      
      // 활성 필터 복원
      this.filterState.activeFilters = new Map(filterData.activeFilters || []);
      this.filterState.isFiltered = filterData.isFiltered || false;
      this.filterState.lastAppliedAt = filterData.lastAppliedAt || null;
      
      // 필터된 행 재계산
      if (this.filterState.isFiltered) {
        this._updateFilteredRows();
      }
      
      console.log('[Filter] 필터 상태 복원 완료');
    } catch (error) {
      console.error('[Filter] 필터 상태 복원 실패:', error);
      // 오류 시 필터 초기화
      this.clearAllFilters();
    }
  }
  
  // 컴포넌트 마운트 시 필터 상태 자동 복원
  onMounted() {
    // 기존 마운트 로직...
    
    // 필터 상태 복원
    this.loadFilterState();
  }
}
```

### 3.2 DataInputVirtual.vue 수정

```javascript
// 기존 rows 대신 filteredRows 사용
const filteredRows = computed(() => {
  if (!storeBridge.filterState.isFiltered) {
    return rows.value;
  }
  
  return rows.value.filter(row => {
    return storeBridge._applyFilters(row);
  });
});

// useVirtualScroll에 filteredRows 전달
const {
  visibleRows,
  totalHeight,
  paddingTop,
  onScroll,
  getOriginalIndex
} = useVirtualScroll(filteredRows, {
  rowHeight: 35,
  bufferSize: 1,
  viewportHeight
});

// 원본 인덱스 매핑 함수 수정
function getOriginalIndexFromFiltered(filteredIndex) {
  if (!storeBridge.filterState.isFiltered) {
    return filteredIndex;
  }
  
  const originalIndex = storeBridge._filteredRowMapping.get(filteredIndex);
  return originalIndex !== undefined ? originalIndex : filteredIndex;
}

// 필터 상태 감시
watch(() => storeBridge.filterState.isFiltered, (isFiltered) => {
  if (isFiltered) {
    // 필터 적용 시 선택 영역 초기화
    selectionSystem.clearSelection();
    
    // 첫 번째 보이는 행으로 스크롤
    nextTick(() => {
      if (filteredRows.value.length > 0) {
        ensureCellIsVisible(0, 1);
        selectionSystem.selectCell(0, 1);
      }
    });
  }
});
```

## 🔗 4단계: 기존 기능과의 통합 (4-5시간)

### 4.1 가상 스크롤 통합

**useVirtualScroll.js 수정:**

```javascript
export function useVirtualScroll(allRows, options) {
  const { rowHeight = 35, bufferSize = 10, viewportHeight } = options;
  const scrollTop = ref(0);
  
  // 필터 변경 시 스크롤 위치 보존
  const preserveScrollPosition = () => {
    const currentScrollTop = scrollTop.value;
    const currentVisibleIndex = Math.floor(currentScrollTop / rowHeight);
    
    // 현재 보이는 행이 필터 후에도 보이는지 확인
    if (currentVisibleIndex < allRows.value.length) {
      // 스크롤 위치 유지
      return;
    }
    
    // 첫 번째 보이는 행으로 스크롤
    scrollTop.value = 0;
  };
  
  // allRows 변경 감지 (필터 적용 시)
  watch(allRows, () => {
    preserveScrollPosition();
  });
  
  // 기존 코드...
}
```

### 4.2 선택 시스템 통합

**virtualSelectionSystem.js 수정:**

```javascript
function selectCell(rowIndex, colIndex) {
  // rowIndex는 항상 원본 인덱스로 저장
  let originalRowIndex = rowIndex;
  
  // 필터된 뷰에서 선택 시 원본 인덱스로 변환
  if (storeBridge.filterState.isFiltered) {
    originalRowIndex = storeBridge.getOriginalIndexFromFiltered(rowIndex);
  }
  
  state.selectedCell = { rowIndex: originalRowIndex, colIndex };
  state.selectionAnchor = { rowIndex: originalRowIndex, colIndex };
  state.selectedRange = {
    start: { rowIndex: originalRowIndex, colIndex },
    end: { rowIndex: originalRowIndex, colIndex }
  };
  
  console.log(`[VirtualSelection] Cell selected: ${originalRowIndex}, ${colIndex}`);
}

// 범위 선택 시에도 원본 인덱스 사용
function setSelectionRange(startRow, startCol, endRow, endCol) {
  let originalStartRow = startRow;
  let originalEndRow = endRow;
  
  if (storeBridge.filterState.isFiltered) {
    originalStartRow = storeBridge.getOriginalIndexFromFiltered(startRow);
    originalEndRow = storeBridge.getOriginalIndexFromFiltered(endRow);
  }
  
  state.selectedRange = {
    start: { rowIndex: originalStartRow, colIndex: startCol },
    end: { rowIndex: originalEndRow, colIndex: endCol }
  };
}
```

### 4.3 유효성 검사 통합

**ValidationManager.js 수정:**

```javascript
class ValidationManager {
  // 필터된 뷰에서 오류 표시 시 원본 인덱스 사용
  displayValidationErrors() {
    const errors = this.getErrors();
    const visibleErrors = new Map();
    
    errors.forEach((error, key) => {
      const [originalRowIndex, colIndex] = key.split('_').map(Number);
      
      // 필터된 뷰에서 해당 행이 보이는지 확인
      if (storeBridge.filterState.isFiltered) {
        const row = storeBridge.legacyStore.state.rows[originalRowIndex];
        const isVisible = storeBridge._applyFilters(row);
        
        if (!isVisible) {
          // 오류는 유지하되 UI에는 표시하지 않음
          return;
        }
        
        // 필터된 인덱스로 키 변환
        const filteredIndex = storeBridge._originalToFilteredMapping.get(originalRowIndex);
        if (filteredIndex !== undefined) {
          const filteredKey = `${filteredIndex}_${colIndex}`;
          visibleErrors.set(filteredKey, error);
        }
      } else {
        visibleErrors.set(key, error);
      }
    });
    
    // UI에 표시할 오류만 설정
    this.legacyStore.commit('SET_VISIBLE_VALIDATION_ERRORS', visibleErrors);
  }
  
  // 셀 검증 시 원본 인덱스 사용
  validateCell(rowIndex, colIndex, value, columnType) {
    // rowIndex가 필터된 인덱스인 경우 원본 인덱스로 변환
    let originalRowIndex = rowIndex;
    
    if (storeBridge.filterState.isFiltered) {
      originalRowIndex = storeBridge.getOriginalIndexFromFiltered(rowIndex);
    }
    
    // 기존 검증 로직 실행
    this._validateCellInternal(originalRowIndex, colIndex, value, columnType);
  }
}
```

### 4.4 컨텍스트 메뉴 통합

**contextMenuHandlers.js 수정:**

```javascript
function getMenuItemsForContext(rowIndex, colIndex, selectionState, allColumnsMeta) {
  const menuItems = [];
  
  // 헤더 클릭 시 필터 메뉴 추가
  if (rowIndex < 0) {
    const column = allColumnsMeta.find(c => c.colIndex === colIndex);
    
    // 환자여부 컬럼 필터 메뉴
    if (column && column.type === COL_TYPE_IS_PATIENT) {
      menuItems.push(
        { type: 'separator' },
        { label: '필터', type: 'submenu', items: [
          { label: '1 (환자)', action: 'filter-patient-1', type: 'checkbox', checked: isFilterActive(colIndex, '1') },
          { label: '0 (정상)', action: 'filter-patient-0', type: 'checkbox', checked: isFilterActive(colIndex, '0') }
        ]}
      );
    }
    
    // 기존 메뉴 아이템들...
  }
  
  // 필터가 적용된 상태에서 "모든 필터 해제" 옵션 추가
  if (storeBridge.filterState.isFiltered) {
    menuItems.push(
      { type: 'separator' },
      { label: '모든 필터 해제', action: 'clear-all-filters', icon: '🗑️' }
    );
  }
  
  return menuItems;
}

// 필터 활성 상태 확인
function isFilterActive(colIndex, value) {
  const activeFilters = storeBridge.filterState.activeFilters;
  const filter = activeFilters.get(colIndex);
  return filter && filter.values.includes(value);
}

// 컨텍스트 메뉴 액션 처리
function handleContextMenuAction(action, target, context) {
  switch (action) {
    case 'filter-patient-1':
      storeBridge.togglePatientFilter('1');
      break;
    case 'filter-patient-0':
      storeBridge.togglePatientFilter('0');
      break;
    case 'clear-all-filters':
      storeBridge.clearAllFilters();
      showToast('모든 필터가 해제되었습니다.', 'info');
      break;
    // 기존 액션들...
  }
}
```

### 4.5 편집 시스템 통합

**편집 시 원본 인덱스 사용:**

```javascript
function onCellInput(event, rowIndex, colIndex) {
  if (!selectionSystem.state.isEditing) return;
  
  // 필터된 인덱스를 원본 인덱스로 변환
  const originalRowIndex = storeBridge.getOriginalIndexFromFiltered(rowIndex);
  
  const columnMeta = allColumnsMeta.value.find(c => c.colIndex === colIndex);
  if (!columnMeta || !columnMeta.isEditable) return;
  
  const newValue = event.target.textContent;
  
  // 원본 인덱스로 임시 값 업데이트
  cellInputState.updateTempValue(originalRowIndex, colIndex, newValue, columnMeta);
}

// 편집 완료 시에도 원본 인덱스 사용
function onCellEditComplete(rowIndex, colIndex, shouldSave = true) {
  const originalRowIndex = storeBridge.getOriginalIndexFromFiltered(rowIndex);
  
  if (!shouldSave) {
    cellInputState.cancelEditing();
    return;
  }
  
  const tempValue = cellInputState.getTempValue(originalRowIndex, colIndex);
  if (tempValue !== null) {
    const columnMeta = allColumnsMeta.value.find(c => c.colIndex === colIndex);
    if (columnMeta) {
      storeBridge.saveCellValue(originalRowIndex, colIndex, tempValue, columnMeta);
      validationManager.validateCell(originalRowIndex, colIndex, tempValue, columnMeta.type);
    }
  }
}

// 필터된 상태에서 행 추가 비활성화
function onAddRows(count) {
  if (storeBridge.filterState.isFiltered) {
    showToast('필터가 적용된 상태에서는 행을 추가할 수 없습니다. 필터를 해제해주세요.', 'warning');
    return;
  }
  
  // 기존 행 추가 로직...
  const insertIndex = rows.value.length;
  storeBridge.dispatch('insertRowAt', { index: insertIndex, count });
  nextTick(() => {
    selectionSystem.clearSelection();
    showToast(`${count}개 행이 추가되었습니다.`, 'success');
  });
}
```

## ⚡ 5단계: 성능 최적화 (1-2시간)

### 5.1 필터 계산 최적화 (Phase 1: 기본 최적화)

**FilterOptimizer 클래스 (Web Worker 없이):**

```javascript
class FilterOptimizer {
  constructor() {
    this.cache = new Map();
    this.debounceTimer = null;
    this.lastFilterHash = null;
  }
  
  // 디바운스된 필터 적용
  applyFiltersDebounced(filters, rows) {
    clearTimeout(this.debounceTimer);
    
    return new Promise((resolve) => {
      this.debounceTimer = setTimeout(() => {
        const result = this.applyFilters(filters, rows);
        resolve(result);
      }, 300);
    });
  }
  
  // 캐시된 필터 결과 (환자여부 필터만)
  applyFilters(filters, rows) {
    const filterHash = this._generateFilterHash(filters, rows);
    
    if (this.cache.has(filterHash)) {
      return this.cache.get(filterHash);
    }
    
    const result = rows.filter(row => this._matchesAllFilters(row, filters));
    this.cache.set(filterHash, result);
    
    // 캐시 크기 제한 (메모리 누수 방지)
    if (this.cache.size > 50) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    return result;
  }
  
  // 필터 해시 생성 (환자여부 필터만)
  _generateFilterHash(filters, rows) {
    const patientFilter = filters.get(1); // 환자여부 컬럼 인덱스
    const filterStr = patientFilter ? JSON.stringify(patientFilter.values) : 'none';
    const rowsHash = this._hashRows(rows);
    return `${filterStr}_${rowsHash}`;
  }
  
  // 행 데이터 해시 (간단한 해시)
  _hashRows(rows) {
    let hash = 0;
    for (let i = 0; i < Math.min(rows.length, 100); i++) { // 처음 100개만 해시
      const row = rows[i];
      hash = ((hash << 5) - hash) + (row.isPatient || '').length;
      hash = hash & hash; // 32bit 정수로 변환
    }
    return hash;
  }
  
  // 캐시 클리어
  clearCache() {
    this.cache.clear();
  }
}
```

**참고: Web Worker는 오프라인 환경에서 사용할 수 없으므로 제외**

### 5.2 성능 최적화 전략 (Phase 1)

**메인 스레드 최적화:**

```javascript
class StoreBridge {
  // 대용량 데이터 필터링 최적화 (Web Worker 없이)
  applyFiltersOptimized(filters, rows) {
    if (rows.length < 1000) {
      // 작은 데이터는 즉시 처리
      return this._applyFilters(rows);
    }
    
    // 대용량 데이터는 청크 단위로 처리
    const CHUNK_SIZE = 500;
    const chunks = [];
    
    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
      const chunk = rows.slice(i, i + CHUNK_SIZE);
      chunks.push(chunk);
    }
    
    // 청크별로 비동기 처리
    return new Promise((resolve) => {
      let processedRows = [];
      let processedCount = 0;
      
      const processChunk = (chunkIndex) => {
        if (chunkIndex >= chunks.length) {
          resolve(processedRows);
          return;
        }
        
        const chunk = chunks[chunkIndex];
        const filteredChunk = chunk.filter(row => this._applyFilters(row));
        processedRows = processedRows.concat(filteredChunk);
        processedCount++;
        
        // 진행률 업데이트 (선택사항)
        if (processedCount % 5 === 0) {
          this._updateFilterProgress(processedCount, chunks.length);
        }
        
        // 다음 청크 처리 (setTimeout으로 메인 스레드 블로킹 방지)
        setTimeout(() => processChunk(chunkIndex + 1), 0);
      };
      
      processChunk(0);
    });
  }
  
  // 필터 진행률 업데이트
  _updateFilterProgress(processed, total) {
    const progress = Math.round((processed / total) * 100);
    console.log(`[Filter] 진행률: ${progress}%`);
  }
}
```

**참고: Web Worker는 오프라인 환경에서 사용할 수 없으므로 메인 스레드 최적화로 대체**

### 5.3 가상화 최적화

**필터된 뷰에서 가상 스크롤 최적화:**

```javascript
// useVirtualScroll.js 수정
export function useVirtualScroll(allRows, options) {
  // 필터 변경 시 스크롤 위치 보존
  const preserveScrollPosition = () => {
    const currentScrollTop = scrollTop.value;
    const currentVisibleIndex = Math.floor(currentScrollTop / rowHeight);
    
    // 현재 보이는 행이 필터 후에도 보이는지 확인
    if (currentVisibleIndex < allRows.value.length) {
      // 스크롤 위치 유지
      return;
    }
    
    // 첫 번째 보이는 행으로 스크롤
    scrollTop.value = 0;
  };
  
  // allRows 변경 감지 (필터 적용 시)
  watch(allRows, () => {
    preserveScrollPosition();
  });
  
  // 성능 최적화: 불필요한 재계산 방지
  const memoizedVisibleRows = computed(() => {
    const start = startIndex.value;
    const end = endIndex.value;
    
    return allRows.value.slice(start, end + 1).map((data, index) => ({
      data,
      originalIndex: start + index
    }));
  });
  
  return {
    visibleRows: memoizedVisibleRows,
    // ... 기존 반환값들
  };
}
```

## 🧪 6단계: 테스트 및 QA (2-3시간)

### 6.1 단위 테스트

**tests/PatientFilter.test.js:**

```javascript
import { describe, test, expect, beforeEach } from 'vitest';
import { StoreBridge } from '../src/store/storeBridge.js';

describe('Patient Filter (Phase 1)', () => {
  let storeBridge;
  let mockRows;
  
  beforeEach(() => {
    storeBridge = new StoreBridge();
    mockRows = [
      { isPatient: '1', basicInfo: ['남성', '30대'] },
      { isPatient: '0', basicInfo: ['여성', '20대'] },
      { isPatient: '1', basicInfo: ['남성', '40대'] },
      { isPatient: '0', basicInfo: ['여성', '50대'] }
    ];
  });
  
  test('환자여부 필터 토글 - 1만 선택', () => {
    storeBridge.togglePatientFilter('1');
    
    const filteredRows = mockRows.filter(row => storeBridge._applyFilters(row));
    expect(filteredRows).toHaveLength(2);
    expect(filteredRows[0].isPatient).toBe('1');
    expect(filteredRows[1].isPatient).toBe('1');
  });
  
  test('환자여부 필터 토글 - 0만 선택', () => {
    storeBridge.togglePatientFilter('0');
    
    const filteredRows = mockRows.filter(row => storeBridge._applyFilters(row));
    expect(filteredRows).toHaveLength(2);
    expect(filteredRows[0].isPatient).toBe('0');
    expect(filteredRows[1].isPatient).toBe('0');
  });
  
  test('환자여부 필터 토글 - 1 해제', () => {
    // 1과 0 모두 선택된 상태에서 시작
    storeBridge.togglePatientFilter('1');
    storeBridge.togglePatientFilter('0');
    
    // 1 해제
    storeBridge.togglePatientFilter('1');
    
    const filteredRows = mockRows.filter(row => storeBridge._applyFilters(row));
    expect(filteredRows).toHaveLength(2);
    expect(filteredRows[0].isPatient).toBe('0');
    expect(filteredRows[1].isPatient).toBe('0');
  });
  
  test('모든 필터 해제', () => {
    storeBridge.togglePatientFilter('1');
    storeBridge.clearAllFilters();
    
    const filteredRows = mockRows.filter(row => storeBridge._applyFilters(row));
    expect(filteredRows).toHaveLength(4); // 모든 행 표시
  });
  
  test('필터 상태 저장/복원', () => {
    storeBridge.togglePatientFilter('1');
    storeBridge._saveFilterState();
    
    // 새로운 StoreBridge 인스턴스로 상태 복원
    const newStoreBridge = new StoreBridge();
    newStoreBridge.loadFilterState();
    
    const filteredRows = mockRows.filter(row => newStoreBridge._applyFilters(row));
    expect(filteredRows).toHaveLength(2);
  });
});
```

### 6.2 통합 테스트

**tests/FilterIntegration.test.js:**

```javascript
import { describe, test, expect, beforeEach } from 'vitest';
import { createApp } from 'vue';
import DataInputVirtual from '../src/components/DataInputVirtualScroll/DataInputVirtual.vue';

describe('Filter Integration', () => {
  let app;
  let component;
  
  beforeEach(() => {
    app = createApp(DataInputVirtual);
    component = app.mount(document.createElement('div'));
  });
  
  test('필터 + 가상 스크롤', async () => {
    // 필터 적용
    await component.applyFilter(1, { type: 'binary', values: ['1'] });
    
    // 스크롤 동작 확인
    expect(component.filteredRows.length).toBeLessThan(component.rows.length);
    expect(component.totalHeight).toBe(component.filteredRows.length * 35);
  });
  
  test('필터 + 선택 시스템', async () => {
    // 필터 적용
    await component.applyFilter(1, { type: 'binary', values: ['1'] });
    
    // 필터된 뷰에서 셀 선택
    component.selectCell(0, 1);
    
    // 원본 인덱스 매핑 확인
    const selectedCell = component.selectionSystem.state.selectedCell;
    expect(selectedCell.rowIndex).toBeGreaterThanOrEqual(0);
  });
  
  test('필터 + 유효성 검사', async () => {
    // 필터 적용
    await component.applyFilter(1, { type: 'binary', values: ['1'] });
    
    // 오류가 있는 셀 편집
    await component.editCell(0, 1, 'invalid_value');
    
    // 오류 표시 확인
    const errors = component.validationErrors;
    expect(errors.size).toBeGreaterThan(0);
  });
  
  test('필터 + Undo/Redo', async () => {
    // 필터 적용
    await component.applyFilter(1, { type: 'binary', values: ['1'] });
    
    // 데이터 편집
    await component.editCell(0, 1, 'new_value');
    
    // Undo 실행
    await component.undo();
    
    // 필터 상태는 유지되어야 함
    expect(component.filterState.isFiltered).toBe(true);
    expect(component.filteredRows.length).toBeLessThan(component.rows.length);
  });
  
  test('필터 상태 저장/복원', async () => {
    // 필터 적용
    await component.applyFilter(1, { type: 'binary', values: ['1'] });
    
    // 상태 저장
    component.saveFilterState();
    
    // 컴포넌트 재생성
    app.unmount();
    app = createApp(DataInputVirtual);
    component = app.mount(document.createElement('div'));
    
    // 상태 복원
    component.loadFilterState();
    
    // 필터 상태 확인
    expect(component.filterState.isFiltered).toBe(true);
    expect(component.filterState.activeFilters.size).toBe(1);
  });
});
```

### 6.3 성능 테스트

**tests/FilterPerformance.test.js:**

```javascript
import { describe, test, expect } from 'vitest';
import { FilterManager } from '../src/logic/FilterManager.js';

describe('Filter Performance', () => {
  test('10k 행 필터링 성능', () => {
    const filterManager = new FilterManager();
    
    // 10k 행 생성
    const rows = Array.from({ length: 10000 }, (_, i) => ({
      isPatient: i % 2 === 0 ? '1' : '0',
      basicInfo: [`사용자${i}`, `${20 + (i % 50)}대`],
      clinicalSymptoms: Array.from({ length: 5 }, () => Math.random() > 0.5 ? '1' : '0')
    }));
    
    const filters = new Map([
      [1, { type: 'binary', values: ['1'] }]
    ]);
    
    const startTime = performance.now();
    const result = filterManager.applyFilters(filters, rows);
    const endTime = performance.now();
    
    const duration = endTime - startTime;
    
    expect(duration).toBeLessThan(100); // 100ms 이내
    expect(result.length).toBe(5000); // 절반이 필터링됨
  });
  
  test('복합 필터 성능', () => {
    const filterManager = new FilterManager();
    
    const rows = Array.from({ length: 5000 }, (_, i) => ({
      isPatient: i % 2 === 0 ? '1' : '0',
      basicInfo: [`사용자${i}`, `${20 + (i % 50)}대`],
      clinicalSymptoms: Array.from({ length: 5 }, () => Math.random() > 0.5 ? '1' : '0')
    }));
    
    const filters = new Map([
      [1, { type: 'binary', values: ['1'] }],
      [2, { type: 'text', searchText: '사용자', operator: 'contains' }],
      [3, { type: 'binary', values: ['1'] }]
    ]);
    
    const startTime = performance.now();
    const result = filterManager.applyFilters(filters, rows);
    const endTime = performance.now();
    
    const duration = endTime - startTime;
    
    expect(duration).toBeLessThan(50); // 50ms 이내
  });
});
```

### 6.4 수동 QA 체크리스트

**기능 테스트:**
- [ ] 환자여부 컬럼 헤더 우클릭 시 필터 메뉴 표시
- [ ] 1 (환자) 체크박스 토글 동작 확인
- [ ] 0 (정상) 체크박스 토글 동작 확인
- [ ] 필터 적용 시 올바른 행만 표시
- [ ] 필터 해제 시 모든 행 표시
- [ ] 필터 상태 저장/복원 확인

**성능 테스트:**
- [ ] 1k 행에서 필터 적용 시간 < 50ms
- [ ] 10k 행에서 필터 적용 시간 < 100ms
- [ ] 필터 적용 후 스크롤 부드러움 확인
- [ ] 메모리 사용량 증가 < 10MB

**호환성 테스트:**
- [ ] Undo/Redo 기능 정상 동작
- [ ] 유효성 검사 오류 표시 정상
- [ ] 선택 시스템 정상 동작
- [ ] 편집 기능 정상 동작
- [ ] 컨텍스트 메뉴 정상 동작
- [ ] 필터된 상태에서 행 추가 비활성화
- [ ] 필터된 상태에서 행 삭제 정상 동작

**UI/UX 테스트:**
- [ ] 컨텍스트 메뉴 필터 서브메뉴 표시 정상
- [ ] 체크박스 아이콘 표시 정상
- [ ] 필터 상태 표시 정상
- [ ] 원본 행 번호 유지 확인

## 🚀 7단계: 배포 및 반복 (1-2시간)

### 7.1 단계별 배포 계획

**Phase 1: 환자여부 필터 (1주차)**
- 환자여부 컬럼 1/0 토글 필터
- 컨텍스트 메뉴 기반 UI
- 필터 상태 localStorage 저장
- 통합 필터 버튼 (상태 표시 + 제어)

**Phase 2: 확장 필터 기능 (2주차)**
- 확진여부, 임상증상, 식단 컬럼 필터
- 텍스트 검색 필터 (기본정보)
- 필터 미리보기
- 필터 히스토리

**Phase 3: 고급 기능 (3주차)**
- 날짜/시간 필터 (증상발현시간, 개별노출시간)
- 고급 텍스트 연산자 (시작, 끝남)
- 필터 템플릿
- 성능 모니터링 (메인 스레드 최적화)

### 7.2 사용자 피드백 수집 (Phase 1)

**피드백 수집 항목:**
1. 컨텍스트 메뉴 필터 UI 직관성 (1-5점)
2. 1/0 토글 필터 방식 만족도 (1-5점)
3. 통합 필터 버튼 사용성 (1-5점)
4. 필터 상태 저장 기능 만족도 (1-5점)
5. 기존 기능과의 호환성 (1-5점)
6. 추가로 필요한 필터 기능
7. 개선이 필요한 부분

**피드백 수집 방법:**
- 개발자 도구 콘솔 로그
- 사용자 행동 분석 (필터 사용 빈도, 패턴)
- 직접 사용자 인터뷰
- 온라인 설문조사

**Phase 1 성공 기준:**
- 필터 UI 직관성 점수 > 4.0/5.0
- 필터 성능 만족도 > 4.0/5.0
- 사용자 오류율 < 5%

### 7.3 지속적 개선 (Phase 1)

**모니터링 지표:**
- 환자여부 필터 사용 빈도
- 1/0 토글 패턴 분석
- 필터 적용 시간
- 오류 발생률
- 사용자 만족도

**개선 계획:**
- 사용자 피드백 기반 UI/UX 개선
- 성능 최적화 (메인 스레드)
- Phase 2 확장 계획 수립
- 고급 기능 개발

**Phase 2 준비:**
- 확진여부, 임상증상, 식단 컬럼 필터 설계
- 텍스트 검색 필터 UI 설계
- 성능 최적화 방안 연구

---

## 📊 개발 일정 요약 (Phase 1: 환자여부 필터)

| 단계 | 소요시간 | 주요 산출물 | 완료 기준 |
|------|----------|-------------|-----------|
| 1단계 | 1-2시간 | 요구사항 문서, 기술 설계서 | 설계 검토 완료 |
| 2단계 | 3-4시간 | 컨텍스트 메뉴 필터 UI | UI 컴포넌트 동작 확인 |
| 3단계 | 2-3시간 | StoreBridge 환자여부 필터 로직 | 필터 로직 단위 테스트 통과 |
| 4단계 | 4-5시간 | 기존 기능 통합, 호환성 확보 | 통합 테스트 통과 |
| 5단계 | 1-2시간 | 성능 최적화, 캐싱 | 성능 테스트 통과 |
| 6단계 | 2-3시간 | 테스트 코드, QA 완료 | QA 체크리스트 완료 |
| 7단계 | 1-2시간 | 배포, 피드백 수집 | Phase 1 배포 완료 |

**총 예상 시간: 14-21시간 (약 2-3일)**

## 🎯 성공 지표 (Phase 1)

### 기술적 지표
- [ ] 환자여부 필터 적용 시간 < 100ms (10k 행 기준)
- [ ] 메모리 사용량 증가 < 10MB
- [ ] 테스트 커버리지 > 80%
- [ ] 기존 기능 호환성 100%

### 사용자 경험 지표
- [ ] 컨텍스트 메뉴 필터 UI 직관성 점수 > 4.0/5.0
- [ ] 1/0 토글 필터 성능 만족도 > 4.0/5.0
- [ ] 사용자 오류율 < 5%
- [ ] 원본 행 번호 유지 정확성 100%

### Phase 2 확장 계획
- 확진여부, 임상증상, 식단 컬럼 필터 추가
- 텍스트 검색 필터 (기본정보 컬럼)
- 날짜 범위 필터 (증상발현시간, 개별노출시간)
- 전역 검색 기능

이 계획은 기존 시스템의 안정성을 유지하면서 환자여부 필터 기능을 자연스럽게 통합하는 것을 목표로 합니다. 컨텍스트 메뉴 기반의 직관적인 UI와 1/0 토글 방식으로 사용자 경험을 최적화했습니다. 