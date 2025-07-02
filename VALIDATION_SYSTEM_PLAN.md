# 데이터 유효성 검사 시스템 개발 계획

## 1. 목표

"Easy-Epidemiology Web"의 데이터 입력 그리드에 실시간 유효성 검사 기능을 도입하여 데이터의 정합성을 확보하고 사용자의 입력 오류를 최소화한다. 이 시스템은 대용량 데이터 처리 시에도 높은 성능을 유지해야 한다.

## 2. 핵심 기능

- **실시간 개별 셀 유효성 검사:** 사용자가 셀 편집을 완료하는 시점에 즉시 유효성을 검사한다.
- **전체 데이터 유효성 검사:** 사용자가 원할 때 (예: 버튼 클릭) 전체 데이터에 대한 종합적인 유효성 검사를 실행한다.
- **시각적 피드백:** 유효성 검사를 통과하지 못한 셀은 명확하게 시각적으로 표시한다 (예: 빨간색 테두리, 배경색 변경).
- **오류 상세 정보 제공:** 유효하지 않은 셀에 마우스를 올리면(hover) 어떤 규칙을 위반했는지 상세한 오류 메시지를 툴팁으로 보여준다.
- **성능 최적화:** Web Worker를 활용하여 대용량 데이터 검사 시 UI 스레드가 차단되지 않도록 한다.

## 3. 유효성 검사 규칙 정의

각 열(Column)의 타입에 따라 다음과 같은 규칙을 적용한다.

| 열 타입 | 규칙 이름 | 상세 내용 | 오류 메시지 예시 |
| --- | --- | --- | --- |
| **환자여부** | `isBinary` | `0` 또는 `1`만 허용 | "'0' 또는 '1'만 입력할 수 있습니다." |
| **기본정보** | `isNotEmpty` | (선택적) 빈 값을 허용하지 않음 | "필수 입력 항목입니다." |
| **임상증상** | `isBinary` | `0` 또는 `1`만 허용 | "'0' 또는 '1'만 입력할 수 있습니다." |
| **의심원 노출시간** | `isDateTime` | `YYYY-MM-DD HH:MM` 형식 준수 | "올바른 날짜/시간 형식(YYYY-MM-DD HH:MM)이 아닙니다." |
| **증상발현시간** | `isDateTime` | `YYYY-MM-DD HH:MM` 형식 준수 | "올바른 날짜/시간 형식(YYYY-MM-DD HH:MM)이 아닙니다." |
| **식단** | `isBinary` | `0` 또는 `1`만 허용 | "'0' 또는 '1'만 입력할 수 있습니다." |
| **행 전체 (논리)** | `onsetAfterExposure` | `증상발현시간`은 `의심원 노출시간`보다 이후여야 함 | "증상발현시간은 노출시간보다 이후여야 합니다." |

## 4. 기술 구현 계획

### 4.1. 유효성 검사 로직 모듈화

- **`src/components/DataInputVirtualScroll/validation/rules.js`**:
    - 각 유효성 검사 규칙(예: `isBinary`, `isDateTime`)을 순수 함수 형태로 정의한다.
    - 각 함수는 `(value) => ({ isValid: boolean, message: string })` 형태의 객체를 반환한다.

- **`src/components/DataInputVirtualScroll/validation/validator.js`**:
    - 특정 셀의 값과 메타데이터(`columnMeta`)를 받아 어떤 규칙을 적용해야 할지 결정하고, `rules.js`의 함수를 호출하여 검사를 수행하는 `validateCell(value, columnMeta)` 함수를 구현한다.
    - 행 전체의 데이터를 받아 논리적 관계(예: `onsetAfterExposure`)를 검사하는 `validateRow(rowData)` 함수를 구현한다.

### 4.2. 실시간 검사 통합

- `DataInputVirtual.vue`의 `onCellEditComplete` 또는 `selectionSystem.stopEditing` 함수 내에서 `validator.validateCell`을 호출한다.
- 사용자가 셀 편집을 완료하면, 해당 셀의 값이 유효한지 즉시 검사한다.
- 검사 결과(유효 여부, 오류 메시지)는 중앙 상태 관리 객체에 저장한다.

### 4.3. 상태 관리

- **`src/store/validationState.js`** (신규 생성):
    - 유효성 검사 오류를 저장하기 위한 반응형 상태 관리 모듈을 `pinia` 또는 Vue의 `reactive`를 사용하여 구현한다.
    - 상태 구조 예시:
      ```javascript
      const validationErrors = reactive(new Map()); // key: 'row_col', value: '오류 메시지'
      ```
    - `setError(rowIndex, colIndex, message)`, `clearError(rowIndex, colIndex)`, `clearAllErrors()`와 같은 변이(mutation) 함수를 제공한다.

### 4.4. 시각적 피드백 구현

- `DataTable.vue` (또는 `VirtualGridBody.vue`의 셀 렌더링 부분):
    - 셀을 렌더링할 때, `validationState`를 참조하여 해당 셀에 오류가 있는지 확인한다.
    - 오류가 있는 경우, 셀의 `class`에 `cell-invalid`를 추가한다.
    - `cell-invalid` 클래스에 대한 CSS 스타일(예: `box-shadow: 0 0 0 2px red inset;`)을 `DataInputVirtual.vue`의 `<style>` 태그에 추가한다.

- **오류 툴팁:**
    - 셀에 `v-tooltip`과 같은 커스텀 디렉티브나, 간단하게는 `title` 속성을 바인딩하여 마우스 호버 시 `validationState`에 저장된 오류 메시지를 보여준다.

### 4.5. 대용량 데이터 검사를 위한 Web Worker 도입

- **`public/validation-worker.js`** (신규 생성):
    - `rules.js`와 `validator.js`의 핵심 로직을 포함하는 Web Worker 스크립트를 작성한다.
    - 이 Worker는 전체 데이터 배열을 메시지로 받아 유효성 검사를 수행하고, 오류 목록(`[{ rowIndex, colIndex, message }]`)을 메인 스레드로 다시 전송한다.

- **`src/components/DataInputVirtualScroll/logic/useBulkValidator.js`** (신규 생성):
    - Web Worker를 생성하고 관리하는 Composable 훅을 만든다.
    - `validateAll(rows, columnsMeta)` 함수를 제공한다. 이 함수는 Worker에게 데이터 검사를 요청하고, Worker로부터 결과를 받으면 `validationState`를 업데이트한다.
    - `VirtualFunctionBar.vue`에 "전체 유효성 검사" 버튼을 추가하고, 이 버튼 클릭 시 `useBulkValidator.validateAll`을 호출한다.

## 5. 개발 단계

1.  **1단계: 규칙 및 상태 관리 구현 (1일)**
    - `rules.js`, `validator.js`, `validationState.js` 파일 생성 및 기본 로직 작성.

2.  **2단계: 실시간 검사 및 시각적 피드백 연동 (1일)**
    - 셀 편집 완료 시점에 `validator` 호출 및 `validationState` 업데이트 로직 구현.
    - `cell-invalid` CSS 클래스 및 툴팁 기능 구현.

3.  **3단계: Web Worker를 이용한 전체 검사 기능 구현 (2일)**
    - `validation-worker.js` 작성 및 테스트.
    - `useBulkValidator.js` 훅 구현.
    - UI에 "전체 유효성 검사" 버튼 추가 및 기능 연동.

4.  **4단계: 테스트 및 안정화 (1일)**
    - 다양한 케이스(대용량 데이터 붙여넣기, 엣지 케이스 등)에 대한 테스트 및 디버깅.
    - 성능 프로파일링 및 최적화.

## 6. 기대 효과

- 데이터의 정확성과 신뢰도 향상.
- 사용자의 입력 실수를 줄여 작업 효율성 증대.
- 실시간 피드백을 통해 직관적이고 편리한 사용자 경험 제공.
- Web Worker를 통해 대용량 데이터에서도 부드러운 UI 반응성 유지.
