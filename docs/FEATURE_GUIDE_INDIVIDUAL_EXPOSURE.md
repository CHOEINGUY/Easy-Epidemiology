# [AI Protocol V6] 개별 노출 시간 관리 기능 개발 프로토콜

이 문서는 AI 개발 에이전트가 '개별 노출 시간 관리' 기능을 개발하기 위한 정밀하고 안전한 단계별 실행 프로토콜을 정의합니다. 모든 단계는 프로젝트의 안정성과 확장성을 보장하도록 설계되었습니다.

---

## 1. 최종 목표 (End Goal)

- 사용자가 기능 바의 토글 버튼을 통해 '의심원 노출시간' 열을 동적으로 표시/숨김하고, 해당 열에 각 환자의 개별 노출 시간을 직접 입력하여, '유행곡선' 차트에서 정밀한 잠복기 분석을 수행할 수 있도록 구현한다.

## 2. 핵심 원칙: 비파괴적 확장 (Non-Destructive Extension)

- 본 개발은 `AI_PROJECT_GUIDE.md`에 명시된 **단일 진실 공급원(SSoT)** 원칙을 준수하며, 기존 데이터 구조를 변경하는 대신 새로운 상태(`isIndividualExposureColumnVisible`)와 속성(`individualExposureTime`)을 **추가**하는 방식으로 진행한다. 이는 기존 분석 탭(`CaseControl`, `ClinicalSymptoms` 등)의 작동에 어떠한 영향도 주지 않는 **안전한 확장(Safe Extension)**임을 보장한다.

---

## 3. AI 단계별 실행 프로토콜 (AI Step-by-Step Implementation Protocol)

### Step 1: Foundational State Management (`src/components/store.js`)

#### 1.1. 상태(State) 정의
- **지시**: `src/components/store.js` 파일을 열고, `state` 객체에 '의심원 노출시간' 열의 표시 여부를 제어하는 `isIndividualExposureColumnVisible` 상태를 추가한다.
  ```javascript
  // ... state: {
      history: [],
      future: [],
      // ... 기존 상태들
      isIndividualExposureColumnVisible: false, // <-- 이 줄을 추가
  // ... }
  ```
- **지시**: `createInitialState` 함수 내에서 `rows`를 생성하는 부분에 `individualExposureTime: ''` 속성을 추가하여, 모든 행이 해당 속성을 기본적으로 갖도록 한다.
  ```javascript
  // ... createInitialState() 내에서
        symptomOnset: "", // 증상발현시간
        individualExposureTime: "", // <-- 이 줄을 추가
        dietInfo: Array(headers.diet.length).fill(""),
  // ...
  ```

#### 1.2. 변이(Mutations) 정의
- **지시**: `mutations` 객체에 다음 변이들을 추가한다.
  ```javascript
  // ... mutations: {
      // ...
      TOGGLE_INDIVIDUAL_EXPOSURE_COLUMN(state) {
        state.isIndividualExposureColumnVisible = !state.isIndividualExposureColumnVisible;
      },
      UPDATE_INDIVIDUAL_EXPOSURE_TIME(state, { rowIndex, value }) {
        if (state.rows[rowIndex]) {
          state.rows[rowIndex].individualExposureTime = value;
        }
      },
  // ...
  ```

#### 1.3. 행동(Actions) 정의
- **지시**: `actions` 객체에 다음 행동들을 추가한다. 이 행동들은 반드시 `SAVE_HISTORY`를 호출하여 Undo/Redo 기능을 보장해야 한다.
  ```javascript
  // ... actions: {
      // ...
      toggleIndividualExposureColumn({ commit }) {
        commit('TOGGLE_INDIVIDUAL_EXPOSURE_COLUMN');
        // 참고: 이 액션은 UI 표시 여부만 바꾸므로 히스토리 저장 불필요
      },
      updateIndividualExposureTime({ commit, state }, { rowIndex, value }) {
        commit('SAVE_HISTORY'); // <-- [안전성] 상태 변경 전 히스토리 저장
        commit('UPDATE_INDIVIDUAL_EXPOSURE_TIME', { rowIndex, value });
      },
  // ...
  ```

### Step 2: UI Control Implementation (`src/components/DataInputRefactor/layout/FunctionBar.vue`)

- **지시**: `FunctionBar.vue`의 템플릿 영역에 "개별 노출시간" 토글 버튼을 추가한다. 버튼의 활성 상태는 `store`의 `isIndividualExposureColumnVisible`와 연동한다.
- **지시**: 버튼 클릭 시 `toggleIndividualExposureColumn` 액션을 디스패치하는 메소드를 추가한다.

### Step 3: Grid Integration (`src/components/DataInputRefactor/DataInputNew.vue`)

- **지시**: `DataInputNew.vue`에서 `allColumnsMeta` computed 속성을 찾는다.
- **지시**: `symptomOnset` (증상발현시간) 열의 정의를 찾고, 그 **앞에** '의심원 노출시간' 열의 정의를 조건부로 삽입하는 로직을 추가한다. `store.state.isIndividualExposureColumnVisible`이 `true`일 때만 열이 추가되어야 한다.
  ```javascript
  // allColumnsMeta computed 속성 내 로직 예시
  // ...
  // 증상발현시간, 성별, 나이 등 고정 칼럼
  const fixedColumns = [
    // ... 기존 고정 칼럼들
  ];

  // AI-TODO: '개별 노출시간' 열을 조건부로 추가
  if (store.state.isIndividualExposureColumnVisible) {
    const exposureTimeColumnIndex = fixedColumns.findIndex(c => c.key === 'symptomOnset');
    if (exposureTimeColumnIndex > -1) {
      fixedColumns.splice(exposureTimeColumnIndex, 0, {
        key: 'individualExposureTime',
        label: '의심원 노출시간',
        type: 'fixed',
        width: 160,
        isCustom: true // 이 열이 동적으로 추가되었음을 식별
      });
    }
  }
  // ...
  ```
- **지시**: 셀 입력 이벤트를 처리하는 핸들러(`handleCellInput` 등)에서, 새로 추가된 'individualExposureTime' 열의 입력이 `updateIndividualExposureTime` 액션을 통해 저장되도록 로직을 연결한다. (기존 `updateCell` 액션 로직을 재활용하거나 분기 처리)

### Step 4: Analysis Logic Update (`src/components/EpidemicCurve.vue`)

- **지시**: `EpidemicCurve.vue` 컴포넌트에 분석 모드를 선택할 수 있는 UI 요소(예: 버튼 그룹)를 추가한다. (모드: '기본 잠복기 분석', '개별 노출시간 기반 분석')
- **지시**: `incubationDurations` computed 속성을 찾아 로직을 수정한다.
- **지시**: 현재 선택된 분석 모드에 따라 분기 처리 로직을 추가한다.
  - **'개별 노출시간 기반 분석' 모드일 경우**: 각 `row`의 `individualExposureTime` 값을 사용해 잠복기를 계산한다.
  - **그 외 모드일 경우**: 기존의 단일 `exposureDateTime`을 사용하는 로직을 그대로 유지한다.
- **검증 프로토콜**: `individualExposureTime` 값이 유효한 날짜/시간 형식이 아닐 경우(`new Date()` 결과가 `Invalid Date`), 해당 데이터를 계산에서 제외하여 `NaN` 오류가 발생하지 않도록 방어 로직을 반드시 포함한다.

  ```javascript
  // incubationDurations computed 속성 내 로직 예시
  // if (analysisMode.value === 'individual') {
      return patientRows.value.map(row => {
        const onset = new Date(row.symptomOnset);
        const exposureTimeStr = row.individualExposureTime;

        if (exposureTimeStr) {
          const exposure = new Date(exposureTimeStr);
          // [안전성] 날짜 유효성 검사
          if (!isNaN(onset) && !isNaN(exposure) && onset > exposure) {
            return onset.getTime() - exposure.getTime();
          }
        }
        return null;
      }).filter(duration => duration !== null);
  // } else { ... 기존 로직 ... }
  ```

---

## 4. 최종 검증 프로토콜

- [ ] **기능 검증**: '개별 노출시간' 버튼이 정상적으로 열을 토글하는가?
- [ ] **데이터 입력 검증**: '의심원 노출시간' 열에 입력한 시간이 `store`에 올바르게 저장되는가?
- [ ] **Undo/Redo 검증**: 시간 입력 후 'Ctrl+Z' / 'Ctrl+Y'가 정상적으로 작동하는가?
- [ ] **분석 검증**: '유행곡선' 탭에서 새 분석 모드를 선택했을 때, 입력된 개별 시간을 기반으로 차트가 올바르게 그려지는가?
- [ ] **퇴행 검증**: '개별 노출시간' 기능을 사용하지 않을 때, 다른 모든 탭(환자대조군, 코호트 등)과 기존 유행곡선 분석이 이전과 완벽히 동일하게 작동하는가? 