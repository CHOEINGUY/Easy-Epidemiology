# [AI Protocol V7] 확진자 여부 열 관리 기능 개발 프로토콜

이 문서는 AI 개발 에이전트가 '확진자 여부 열 관리' 기능을 개발하기 위한 정밀하고 안전한 단계별 실행 프로토콜을 정의합니다. 모든 단계는 프로젝트의 안정성과 확장성을 보장하도록 설계되었습니다.

---

## 1. 최종 목표 (End Goal)

- 사용자가 기능 바의 토글 버튼을 통해 '확진자 여부' 열을 동적으로 표시/숨김하고, 해당 열에 각 환자의 확진 여부를 직접 입력하여, 분석 탭에서 확진자와 의심환자를 구분하여 분석할 수 있도록 구현한다.

## 2. 핵심 원칙: 비파괴적 확장 (Non-Destructive Extension)

- 본 개발은 `AI_PROJECT_GUIDE.md`에 명시된 **단일 진실 공급원(SSoT)** 원칙을 준수하며, 기존 데이터 구조를 변경하는 대신 새로운 상태(`isConfirmedCaseColumnVisible`)와 속성(`isConfirmedCase`)을 **추가**하는 방식으로 진행한다. 이는 기존 분석 탭의 작동에 어떠한 영향도 주지 않는 **안전한 확장(Safe Extension)**임을 보장한다.

---

## 3. 현재 상태 분석 (Current State Analysis)

### 3.1. 기존 개별 노출시간 열 구현 참고사항

현재 `individualExposureTime` 열이 성공적으로 구현되어 있으며, 다음 구조를 참고해야 합니다:

#### 상태 관리 (Vuex Store)
- `isIndividualExposureColumnVisible: false` - 열 가시성 상태
- `individualExposureTime: ''` - 각 행의 개별 노출시간 값

#### UI 컨트롤 (Function Bar)
- 토글 버튼: `access_time` 아이콘과 "개별 노출시간" 텍스트
- 활성 상태 표시: `active` 클래스로 시각적 피드백
- 툴팁: "개별 노출시간 열을 표시하거나 숨깁니다"

#### 열 위치 및 메타데이터
- **삽입 위치**: 임상증상 열 다음, 증상발현시간 열 이전
- **열 타입**: `COL_TYPE_INDIVIDUAL_EXPOSURE = 'individualExposureTime'`
- **스타일**: `COLUMN_STYLES[COL_TYPE_ONSET]` (150px 너비)
- **편집 가능**: `isEditable: true`

### 3.2. 확진자 여부 열의 특수성

확진자 여부 열은 기존 개별 노출시간 열과 다른 특성을 가집니다:

#### 데이터 특성
- **입력 값**: `'1'` (확진자), `'0'` (의심환자), `''` (빈 값)
- **검증 규칙**: 환자여부(`isPatient`)와 유사한 이진 분류
- **분석 활용**: 확진자/의심환자 구분 분석에 활용

#### UI 특성
- **헤더 텍스트**: "확진자여부 <br />(확진자 O - 1, 의심환자 - 0)"
- **아이콘**: `verified_user` (Material Icons)
- **버튼 텍스트**: "확진자 여부"

---

## 4. AI 단계별 실행 프로토콜 (AI Step-by-Step Implementation Protocol)

### Step 1: 상수 및 타입 정의 (`src/components/DataInputVirtualScroll/constants/index.js`)

#### 1.1. 열 인덱스 상수 추가
```javascript
// Column index constants
export const COL_IDX_SERIAL = 0;
export const COL_IDX_IS_PATIENT = 1;
export const COL_IDX_CONFIRMED_CASE = 2; // <-- 추가
```

#### 1.2. 열 타입 상수 추가
```javascript
// Column type constants
export const COL_TYPE_SERIAL = 'serial';
export const COL_TYPE_IS_PATIENT = 'isPatient';
export const COL_TYPE_CONFIRMED_CASE = 'isConfirmedCase'; // <-- 추가
export const COL_TYPE_BASIC = 'basic';
// ... 기존 상수들
```

#### 1.3. 열 스타일 정의 추가
```javascript
// Column default styles
export const COLUMN_STYLES = {
  [COL_TYPE_SERIAL]: { width: '50px' },
  [COL_TYPE_IS_PATIENT]: { width: '143px' },
  [COL_TYPE_CONFIRMED_CASE]: { width: '143px' }, // <-- 추가 (환자여부와 동일)
  [COL_TYPE_ONSET]: { width: '150px' },
  default: { width: `${DEFAULT_COLUMN_WIDTH}px` }
};
```

### Step 2: 상태 관리 확장 (`src/components/store.js`)

#### 2.1. 상태(State) 정의
```javascript
state: {
  // ... 기존 상태들
  isIndividualExposureColumnVisible: false,
  isConfirmedCaseColumnVisible: false, // <-- 추가
  // ... 기존 상태들
}
```

#### 2.2. 초기 상태 생성 함수 수정
```javascript
function createInitialState() {
  const initialHeaders = {
    basic: ['', ''],
    clinical: ['', '', '', '', ''],
    diet: ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '']
  };
  const initialRows = Array.from({ length: 10 }, () => ({
    isPatient: '',
    isConfirmedCase: '', // <-- 추가
    basicInfo: Array(initialHeaders.basic.length).fill(''),
    clinicalSymptoms: Array(initialHeaders.clinical.length).fill(''),
    symptomOnset: '',
    individualExposureTime: '',
    dietInfo: Array(initialHeaders.diet.length).fill('')
  }));
  return { headers: initialHeaders, rows: initialRows };
}
```

#### 2.3. 변이(Mutations) 정의
```javascript
mutations: {
  // ... 기존 변이들
  TOGGLE_CONFIRMED_CASE_COLUMN(state) {
    state.isConfirmedCaseColumnVisible = !state.isConfirmedCaseColumnVisible;
  },
  UPDATE_CONFIRMED_CASE(state, { rowIndex, value }) {
    if (state.rows[rowIndex]) {
      state.rows[rowIndex].isConfirmedCase = value;
    }
  },
  // ... 기존 변이들
}
```

#### 2.4. 행동(Actions) 정의
```javascript
actions: {
  // ... 기존 행동들
  toggleConfirmedCaseColumn({ commit }) {
    commit('TOGGLE_CONFIRMED_CASE_COLUMN');
  },
  updateConfirmedCase({ commit, state }, { rowIndex, value }) {
    commit('SAVE_HISTORY'); // 상태 변경 전 히스토리 저장
    commit('UPDATE_CONFIRMED_CASE', { rowIndex, value });
  },
  // ... 기존 행동들
}
```

### Step 3: StoreBridge 확장 (`src/store/storeBridge.js`)

#### 3.1. 확진자 여부 열 가시성 설정 메서드 추가
```javascript
/**
 * 확진자 여부 열 가시성 설정
 * @param {boolean} isVisible - 가시성 여부
 */
setConfirmedCaseColumnVisibility(isVisible) {
  const wasVisible = this.legacyStore.state.isConfirmedCaseColumnVisible;
  const isAdding = isVisible && !wasVisible;
  const isRemoving = !isVisible && wasVisible;
  
  if (isVisible === wasVisible) return;
  
  let confirmedCaseColumnIndex = null;
  
  if (isAdding) {
    // 추가할 때는 환자여부 열 다음에 삽입됨
    confirmedCaseColumnIndex = 2; // COL_IDX_CONFIRMED_CASE
  } else if (isRemoving) {
    // 제거할 때는 현재 확진자 여부 열의 위치를 찾아야 함
    const columnMetas = this.getColumnMetas();
    const confirmedCaseCol = columnMetas.find(col => 
      col.type === 'isConfirmedCase' || 
      col.dataKey === 'isConfirmedCase'
    );
    confirmedCaseColumnIndex = confirmedCaseCol ? confirmedCaseCol.colIndex : null;
  }
  
  // 유효성 검사 오류 인덱스 재조정
  if (this.validationManager && confirmedCaseColumnIndex !== null) {
    if (isAdding) {
      this.validationManager.reindexErrorsAfterColumnAddition(confirmedCaseColumnIndex);
    } else if (isRemoving) {
      this.validationManager.reindexErrorsAfterColumnDeletion([confirmedCaseColumnIndex]);
    }
  }
  
  // Vuex state 변경
  const result = this.legacyStore.dispatch('setConfirmedCaseColumnVisibility', isVisible);
  this.saveCurrentState();
  return result;
}
```

#### 3.2. 컬럼 메타데이터 헬퍼 업데이트
```javascript
getColumnMetas() {
  if (!this.legacyStore) return [];
  
  const columnMetas = [];
  let colIndex = 0;
  
  // 연번 컬럼 (colIndex 0)
  columnMetas.push({
    colIndex: colIndex++,
    dataKey: null,
    cellIndex: null,
    type: 'serial',
    isEditable: false
  });
  
  // 환자여부 컬럼 (colIndex 1)
  columnMetas.push({
    colIndex: colIndex++,
    dataKey: 'isPatient',
    cellIndex: null,
    type: 'isPatient',
    isEditable: true
  });
  
  // 확진자 여부 컬럼 (가시성이 활성화된 경우)
  if (this.legacyStore.state.isConfirmedCaseColumnVisible) {
    columnMetas.push({
      colIndex: colIndex++,
      dataKey: 'isConfirmedCase',
      cellIndex: null,
      type: 'isConfirmedCase',
      isEditable: true
    });
  }
  
  // ... 기존 컬럼들
  return columnMetas;
}
```

### Step 4: UI 컨트롤 구현 (`src/components/DataInputVirtualScroll/layout/VirtualFunctionBar.vue`)

#### 4.1. 토글 버튼 추가
```vue
<!-- 그룹 1: 확진자 여부 -->
<div class="button-group confirmed-case">
  <div class="control-button-wrapper">
    <button
      :class="['function-button', { active: isConfirmedCaseColumnVisible }]"
      aria-label="확진자 여부 토글"
      tabindex="-1"
      @click="onToggleConfirmedCaseColumn"
      @mouseenter="showTooltip('toggleConfirmedCase', '확진자 여부 열을 표시하거나 숨깁니다', $event)"
      @mouseleave="hideTooltip"
    >
      <span class="material-icons-outlined function-button-icon">
        verified_user
      </span>
      확진자 여부
    </button>
  </div>
</div>

<!-- 구분선 -->
<div class="button-group-divider"></div>

<!-- 그룹 2: 개별 노출시간 -->
<div class="button-group individual-exposure">
  <!-- ... 기존 개별 노출시간 버튼
```

#### 4.2. 스크립트 로직 추가
```javascript
// 확진자 여부 컬럼 가시성 상태
const isConfirmedCaseColumnVisible = computed(
  () => store.state.isConfirmedCaseColumnVisible
);

// 이벤트 핸들러 추가
function onToggleConfirmedCaseColumn() {
  emit('toggle-confirmed-case-col');
}
```

### Step 5: 메인 컴포넌트 통합 (`src/components/DataInputVirtualScroll/DataInputVirtual.vue`)

#### 5.1. 컬럼 메타데이터 계산 로직 수정
```javascript
// 컬럼 메타데이터
const allColumnsMeta = computed(() => {
  const meta = [];
  let currentColIndex = 0;
  let currentOffsetLeft = 0;

  const pushMeta = (columnData) => {
    const width = parseInt(columnData.style?.width || '80px', 10);
    meta.push({
      ...columnData,
      colIndex: currentColIndex,
      offsetLeft: currentOffsetLeft
    });
    currentOffsetLeft += width;
    currentColIndex++;
  };

  // 연번 컬럼
  pushMeta({
    type: COL_TYPE_SERIAL,
    headerText: '연번',
    headerRow: 1,
    isEditable: false,
    style: COLUMN_STYLES[COL_TYPE_SERIAL],
    dataKey: null,
    cellIndex: null
  });
  
  // 환자여부 컬럼
  pushMeta({
    type: COL_TYPE_IS_PATIENT,
    headerText: '환자여부 <br />(환자 O - 1, 정상 - 0)',
    headerRow: 1,
    isEditable: true,
    style: COLUMN_STYLES[COL_TYPE_IS_PATIENT],
    dataKey: 'isPatient',
    cellIndex: null
  });
  
  // AI-TODO: '확진자 여부' 열을 조건부로 추가
  if (storeBridge.state.isConfirmedCaseColumnVisible) {
    pushMeta({
      type: COL_TYPE_CONFIRMED_CASE,
      headerText: '확진자여부 <br />(확진자 O - 1, 의심환자 - 0)',
      headerRow: 1,
      isEditable: true,
      style: COLUMN_STYLES[COL_TYPE_CONFIRMED_CASE],
      dataKey: 'isConfirmedCase',
      cellIndex: null,
      isCustom: true
    });
  }
  
  // ... 기존 컬럼들
  return meta;
});
```

#### 5.2. 헤더 그룹 계산 로직 수정
```javascript
// 헤더 그룹
const headerGroups = computed(() => {
  const groups = [];
  const basicLength = headers.value.basic?.length || 0;
  const clinicalLength = headers.value.clinical?.length || 0;
  const dietLength = headers.value.diet?.length || 0;
  let currentCol = 0;
  
  // 연번
  groups.push({
    text: '연번',
    rowspan: 2,
    startColIndex: COL_IDX_SERIAL,
    style: COLUMN_STYLES[COL_TYPE_SERIAL]
  });
  currentCol++;
  
  // 환자여부
  groups.push({
    text: '환자여부 <br />(환자 O - 1, 정상 - 0)',
    rowspan: 2,
    startColIndex: COL_IDX_IS_PATIENT,
    style: COLUMN_STYLES[COL_TYPE_IS_PATIENT]
  });
  currentCol++;
  
  // '확진자 여부' 열이 있다면, 여기에 그룹 추가
  if (storeBridge.state.isConfirmedCaseColumnVisible) {
    const confirmedCaseStartCol = currentCol;
    groups.push({
      text: '확진자여부 <br />(확진자 O - 1, 의심환자 - 0)',
      rowspan: 2,
      startColIndex: confirmedCaseStartCol,
      style: COLUMN_STYLES[COL_TYPE_CONFIRMED_CASE]
    });
    currentCol++;
  }
  
  // ... 기존 그룹들
  return groups;
});
```

#### 5.3. 토글 핸들러 구현
```javascript
function onToggleConfirmedCaseColumn() {
  const current = storeBridge.state.isConfirmedCaseColumnVisible;
  const isAdding = !current;
  
  console.log('onToggleConfirmedCaseColumn 호출됨');
  console.log('현재 상태:', current);
  console.log('isAdding:', isAdding);
  
  // 확진자 여부 열의 정확한 인덱스 찾기
  const confirmedCaseColumnIndex = allColumnsMeta.value.findIndex(col => 
    col.type === 'isConfirmedCase' || 
    (col.dataKey === 'isConfirmedCase' && col.cellIndex === null)
  );
  
  // 비활성화 전에 해당 열의 데이터 백업 (재활성화 시 검증용)
  if (!isAdding && confirmedCaseColumnIndex >= 0) {
    const currentData = rows.value || [];
    confirmedCaseBackupData.value = currentData.map((row, rowIndex) => {
      const value = row.isConfirmedCase || '';
      return { rowIndex, value };
    }).filter(item => item.value !== '' && item.value !== null && item.value !== undefined);
    
    console.log('백업된 확진자 여부 데이터:', confirmedCaseBackupData.value);
  }
  
  // StoreBridge에서 유효성 검사 오류 인덱스 재조정도 함께 처리됨
  storeBridge.setConfirmedCaseColumnVisibility(!current);
  
  // 재활성화 시: 백업된 데이터에 대해서만 유효성검사 수행
  if (isAdding && confirmedCaseBackupData.value.length > 0) {
    nextTick(() => {
      const newConfirmedCaseColumnIndex = allColumnsMeta.value.findIndex(col => 
        col.type === 'isConfirmedCase' || 
        (col.dataKey === 'isConfirmedCase' && col.cellIndex === null)
      );
      
      if (newConfirmedCaseColumnIndex >= 0) {
        validationManager.validateConfirmedCaseColumn(
          confirmedCaseBackupData.value, 
          newConfirmedCaseColumnIndex,
          (progress) => {
            if (confirmedCaseBackupData.value.length > 100 && progress === 100) {
              showToast(`확진자 여부 열 ${confirmedCaseBackupData.value.length}개 셀의 유효성검사를 완료했습니다.`, 'success');
            }
          }
        );
      }
      
      // 검증 완료 후 백업 데이터 초기화
      confirmedCaseBackupData.value = [];
    });
  }
  
  // selection & meta refresh handled by reactive state; clear selection for safety
  selectionSystem.clearSelection();
  nextTick(() => {
    focusGrid();
  });
}
```

### Step 6: 유효성 검사 확장 (`src/validation/ValidationManager.js`)

#### 6.1. 확진자 여부 열 전용 검증 메서드 추가
```javascript
/**
 * 확진자 여부 열 전용 검증 처리
 * @param {Array<{rowIndex: number, value: string}>} confirmedCaseData - 검증할 데이터 배열
 * @param {number} colIndex - 확진자 여부 열의 인덱스
 * @param {Function} onProgress - 진행률 콜백 (선택사항)
 */
validateConfirmedCaseColumn(confirmedCaseData, colIndex, onProgress = null) {
  if (!confirmedCaseData || confirmedCaseData.length === 0) return;
  
  console.log('ValidationManager.validateConfirmedCaseColumn 호출됨');
  console.log('입력 데이터:', confirmedCaseData);
  console.log('열 인덱스:', colIndex);
  
  const totalCells = confirmedCaseData.length;
  const chunkSize = 50;
  
  // 청크 단위로 검증 수행
  for (let i = 0; i < totalCells; i += chunkSize) {
    const chunk = confirmedCaseData.slice(i, i + chunkSize);
    
    // 청크 검증
    chunk.forEach(({ rowIndex, value }) => {
      if (value !== '' && value !== null && value !== undefined) {
        console.log(`검증 중: 행 ${rowIndex}, 열 ${colIndex}, 값 "${value}"`);
        this.validateCell(rowIndex, colIndex, value, 'isConfirmedCase', true);
      }
    });
    
    // 진행률 보고
    if (onProgress) {
      const progress = Math.round(((i + chunkSize) / totalCells) * 100);
      onProgress(Math.min(progress, 100));
    }
    
    // UI 블로킹 방지를 위한 지연 (필요시)
    if (i + chunkSize < totalCells && totalCells > 200) {
      setTimeout(() => {}, 0);
    }
  }
  
  // 완료 시 100% 보고
  if (onProgress) {
    onProgress(100);
  }
  
  console.log('ValidationManager.validateConfirmedCaseColumn 완료');
}
```

### Step 7: 검증 규칙 확장 (`src/store/utils/validation.js`)

#### 7.1. 확진자 여부 셀 검증 함수 추가
```javascript
/**
 * 확진자 여부 셀 검증
 * @param {string} value - 검증할 값
 * @returns {Object} 검증 결과
 */
export function validateConfirmedCaseCell(value) {
  if (value === '' || value === null || value === undefined) {
    return { valid: true, message: '' };
  }
  
  const stringValue = String(value).trim();
  
  if (stringValue === '0' || stringValue === '1') {
    return { valid: true, message: '' };
  }
  
  return {
    valid: false,
    message: '확진자 여부는 0(의심환자) 또는 1(확진자)만 입력 가능합니다.'
  };
}
```

#### 7.2. 검증 함수 매핑 업데이트
```javascript
export function validateCell(value, type) {
  switch (type) {
    case 'isPatient':
      return validatePatientCell(value);
    case 'isConfirmedCase':
      return validateConfirmedCaseCell(value); // <-- 추가
    case 'symptomOnset':
      return validateSymptomOnsetCell(value);
    case 'individualExposureTime':
      return validateIndividualExposureTimeCell(value);
    // ... 기존 케이스들
    default:
      return { valid: true, message: '' };
  }
}
```

### Step 8: 엑셀 처리 확장 (`src/components/DataInputVirtualScroll/logic/excelProcessorSync.js`)

#### 8.1. 컬럼 범위 탐색 함수 수정
```javascript
function findColumnRanges(headerRow1, headerRow2) {
  const ranges = {};

  // 연번 컬럼 (고정)
  ranges.serial = 0;

  // 환자여부 컬럼 위치 탐색
  const isPatientIndex = headerRow1.findIndex(cell =>
    cell?.toString().includes('환자여부') || cell?.toString().includes('환자 여부')
  );
  ranges.isPatient = isPatientIndex !== -1 ? isPatientIndex : 1;

  // 확진자 여부 컬럼 위치 탐색 (환자여부 다음)
  const isConfirmedCaseIndex = headerRow1.findIndex(cell =>
    cell?.toString().includes('확진자여부') || cell?.toString().includes('확진자 여부')
  );
  ranges.isConfirmedCase = isConfirmedCaseIndex !== -1 ? isConfirmedCaseIndex : -1;

  // ... 기존 범위 탐색 로직
  return ranges;
}
```

#### 8.2. 데이터 파싱 함수 수정
```javascript
function parseAOAData(aoa) {
  const [headerRow1 = [], headerRow2 = []] = aoa;
  const dataRows = aoa.slice(2);

  const ranges = findColumnRanges(headerRow1, headerRow2);
  const hasIndividualExposureTime = ranges.individualExposureTime !== -1;
  const hasConfirmedCase = ranges.isConfirmedCase !== -1; // <-- 추가

  // ... 기존 스마트 매칭 로직

  const rows = dataRows
    .filter(row => {
      const dataCells = row.slice(1);
      return dataCells.some(cell => cell !== null && cell !== undefined && cell.toString().trim() !== '');
    })
    .map((row, index) => ({
      isPatient: (row[ranges.isPatient] ?? '').toString().trim(),
      isConfirmedCase: hasConfirmedCase ? (row[ranges.isConfirmedCase] ?? '').toString().trim() : '', // <-- 추가
      basicInfo: basicResult.rows[index] || [],
      clinicalSymptoms: clinicalResult.rows[index] || [],
      symptomOnset: convertExcelDate(row[ranges.symptomOnset]),
      individualExposureTime: hasIndividualExposureTime ? convertExcelDate(row[ranges.individualExposureTime]) : '',
      dietInfo: dietResult.rows[index] || []
    }));

  return { 
    headers, 
    rows, 
    hasIndividualExposureTime,
    hasConfirmedCase, // <-- 추가
    emptyColumnCount: totalEmptyColumns
  };
}
```

### Step 9: 툴팁 가이드 업데이트 (`src/components/DataInputVirtualScroll/BUTTON_TOOLTIP_GUIDE.md`)

#### 9.1. 툴팁 메시지 추가
```markdown
| 버튼 | 툴팁 메시지 | 비고 |
|------|-------------|------|
| 확진자 여부 (`verified_user`) | 확진자 여부 열을 표시하거나 숨깁니다 | 토글 버튼 *(active 상태 지원)* |
| 개별 노출시간 (`access_time`) | 개별 노출시간 열을 표시하거나 숨깁니다 | 토글 버튼 *(active 상태 지원)* |
| ... 기존 버튼들
```

---

## 5. 구현 전 점검사항 (Pre-Implementation Checklist)

### 5.1. 필수 구현 사항
- [ ] **상수 정의**: `COL_IDX_CONFIRMED_CASE`, `COL_TYPE_CONFIRMED_CASE` 추가
- [ ] **스타일 정의**: `COLUMN_STYLES[COL_TYPE_CONFIRMED_CASE]` 추가
- [ ] **상태 관리**: `isConfirmedCaseColumnVisible`, `isConfirmedCase` 상태 추가
- [ ] **변이/액션**: `TOGGLE_CONFIRMED_CASE_COLUMN`, `UPDATE_CONFIRMED_CASE` 추가
- [ ] **StoreBridge**: `setConfirmedCaseColumnVisibility` 메서드 추가
- [ ] **UI 컨트롤**: Function Bar에 토글 버튼 추가
- [ ] **컬럼 메타데이터**: `allColumnsMeta` 계산 로직 수정
- [ ] **헤더 그룹**: `headerGroups` 계산 로직 수정
- [ ] **유효성 검사**: `validateConfirmedCaseCell` 함수 추가
- [ ] **엑셀 처리**: `findColumnRanges`, `parseAOAData` 함수 수정
- [ ] **툴팁 가이드**: `BUTTON_TOOLTIP_GUIDE.md` 업데이트

### 5.2. 고려사항
- [ ] **열 위치**: 환자여부 열 다음, 기본정보 열 이전에 삽입
- [ ] **데이터 타입**: 문자열 `'0'`, `'1'`, `''` 값 사용
- [ ] **검증 규칙**: 환자여부와 동일한 이진 분류 검증
- [ ] **UI 일관성**: 개별 노출시간 버튼과 동일한 스타일 적용
- [ ] **백업/복원**: 열 토글 시 데이터 백업 및 복원 로직
- [ ] **유효성 검사**: 열 추가/제거 시 오류 인덱스 재조정

### 5.3. 테스트 시나리오
- [ ] **토글 기능**: 버튼 클릭으로 열 표시/숨김 확인
- [ ] **데이터 입력**: 확진자 여부 열에 값 입력 및 저장 확인
- [ ] **유효성 검사**: 잘못된 값 입력 시 오류 표시 확인
- [ ] **엑셀 호환**: 확진자 여부 열이 포함된 엑셀 파일 업로드 확인
- [ ] **Undo/Redo**: 확진자 여부 값 변경 후 Ctrl+Z/Ctrl+Y 확인
- [ ] **데이터 내보내기**: 확진자 여부 열이 포함된 엑셀 파일 다운로드 확인

---

## 6. 최종 검증 프로토콜

- [ ] **기능 검증**: '확진자 여부' 버튼이 정상적으로 열을 토글하는가?
- [ ] **데이터 입력 검증**: '확진자 여부' 열에 입력한 값이 `store`에 올바르게 저장되는가?
- [ ] **유효성 검사 검증**: 잘못된 값 입력 시 적절한 오류 메시지가 표시되는가?
- [ ] **Undo/Redo 검증**: 값 입력 후 'Ctrl+Z' / 'Ctrl+Y'가 정상적으로 작동하는가?
- [ ] **엑셀 호환성 검증**: 확진자 여부 열이 포함된 엑셀 파일을 정상적으로 처리하는가?
- [ ] **UI 일관성 검증**: 개별 노출시간 버튼과 동일한 스타일과 동작을 보이는가?

---

## 7. 예상 영향도 분석

### 7.1. 긍정적 영향
- **분석 기능 확장**: 확진자/의심환자 구분 분석 가능
- **데이터 정확성 향상**: 확진 여부를 명확히 구분하여 분석
- **사용자 경험 개선**: 필요에 따라 열을 동적으로 표시/숨김

### 7.2. 주의사항
- **기존 데이터**: 기존 데이터에는 `isConfirmedCase` 필드가 없으므로 빈 값으로 초기화
- **분석 탭**: 확진자 여부를 활용한 새로운 분석 기능은 별도 구현 필요
- **성능**: 열 추가/제거 시 유효성 검사 오류 인덱스 재조정으로 인한 성능 영향 최소화

---

이 프로토콜을 따라 구현하면 안전하고 확장 가능한 확진자 여부 열 관리 기능을 성공적으로 개발할 수 있습니다. 