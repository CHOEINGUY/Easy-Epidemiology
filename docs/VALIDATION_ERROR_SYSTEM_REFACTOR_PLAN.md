# Validation Error System Refactor Plan

## 1. 목표
- 열 추가/삭제/토글/순서변경 등 모든 상황에서 유효성 에러 표시가 데이터와 100% 동기화되도록 한다.
- 확진자 여부, 개별 노출시간 등 특수 열의 동적 토글에도 에러 표시가 항상 정확하게 동작하도록 한다.
- CSS는 Map의 키만 정확하면 항상 정상 동작하도록 단순화한다.

## 2. 문제의 본질
- validationErrors Map의 키(row_col)와 실제 allColumnsMeta의 colIndex가 불일치할 때 에러 표시가 꼬임
- 열 구조 변경(추가/삭제/토글/순서변경) 시 인덱스 재조정이 완벽히 일치해야 함

## 3. 개선 방향 및 설계 원칙

### 3.1 유효성 인덱스 재조정 로직 완전 통합
- StoreBridge/ValidationManager에서 열 구조가 바뀌는 모든 액션(추가/삭제/토글/순서변경)에 반드시 reindexErrorsAfterColumnAddition, reindexErrorsAfterColumnDeletion 등 호출 일원화
- 특수 열(확진자 여부, 개별 노출시간 등) 토글 시에도 정확한 위치 계산 후 인덱스 재조정

### 3.2 validationErrors Map의 키와 실제 colIndex 동기화
- allColumnsMeta를 기준으로 항상 colIndex를 재계산
- 열 순서가 바뀌면 validationErrors도 순서에 맞게 재매핑
- 열 추가/삭제/토글 시, 해당 위치 이후의 모든 colIndex를 한 칸씩 이동

### 3.3 에러 표시 로직의 단순화
- VirtualGridBody.vue 등 렌더링 컴포넌트는 validationErrors.has(`${rowIndex}_${colIndex}`)로만 에러 표시 결정
- Map의 키만 정확하면 CSS는 항상 정상 동작

### 3.4 통합 유효성 관리 유틸 함수 도입
- 열 구조가 바뀔 때마다 validationErrors Map을 allColumnsMeta 기준으로 재매핑하는 함수 도입
- StoreBridge/ValidationManager에서 일원화하여 호출

## 4. 실제 개선 플랜 (Step by Step)

### Step 1. StoreBridge/ValidationManager에서 열 구조 변경 시점 일원화
- 열 추가/삭제/토글/순서변경 액션마다 반드시 인덱스 재조정 함수 호출
- 기존 분산된 호출을 한 곳으로 통합

### Step 2. validationErrors Map의 키를 항상 최신 colIndex로 유지
- allColumnsMeta와 동기화하는 재매핑 함수 구현 및 적용
- 열 구조 변경 전후의 allColumnsMeta와 validationErrors Map의 키를 요약 로그로 출력(디버깅 지원)

### Step 3. VirtualGridBody.vue 등 렌더링 컴포넌트 단순화
- 오직 Map의 키만 보고 validation-error 클래스 적용
- 추가적인 조건/예외 없이 단순화

### Step 4. 테스트 및 검증
- 확진자 여부/개별 노출시간 등 특수 열 토글 시 반드시 인덱스 재조정 함수가 호출되는지 점검
- 다양한 열 추가/삭제/순서변경 시나리오에서 에러 표시가 항상 정확한지 검증

## 5. 추가적으로 할 수 있는 것
- 테스트/디버깅을 위해 열 구조 변경 전후의 allColumnsMeta와 validationErrors Map의 키를 요약해서 로그로 출력(앞서 만든 printErrorKeys 등 활용)
- 자동화 테스트 케이스 작성(대량 열/행/토글/순서변경 등)

## 6. 기대 효과
- 확진자 여부 등 특수 열 추가/삭제와 상관없이 유효성 에러 CSS가 항상 직관적으로 잘 동작
- 유지보수성, 확장성, 디버깅 편의성 대폭 향상

---

(이 문서는 리팩토링 진행 및 코드 리뷰의 기준 문서로 활용할 수 있습니다.) 