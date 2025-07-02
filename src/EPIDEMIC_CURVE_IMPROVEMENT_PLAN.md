# 유행곡선 차트 개선 계획: 그룹별 누적 막대 및 전체 추세선 구현

이 문서는 `EpidemicCurve.vue`의 현재 유행곡선 차트를 이미지 예시와 같이 그룹별 누적 막대 그래프와 전체 사례 수 추이를 나타내는 선 그래프가 조합된 혼합 차트(Mixed Chart)로 개선하기 위한 개발 계획을 정의합니다.

## 1. 목표 (Objective)

기존의 시간대별 전체 환자 수만을 표시하던 단순 막대 차트를 아래와 같은 기능을 갖춘 고도화된 차트로 개선하는 것을 목표로 합니다.

-   **누적 막대 차트 (Stacked Bar Chart)**: 각 시간 간격 내에서, 환자를 특정 '그룹' (예: 반, 학년, 직업) 기준으로 나누어 각 그룹의 인원을 다른 색상으로 쌓아 표시합니다.
-   **선 차트 (Line Chart)**: 누적 막대 차트 위에 해당 시간 간격의 '전체 환자 수'를 선으로 연결하여 전체적인 발생 추세를 명확하게 보여줍니다.
-   **범례 (Legend)**: 각 색상의 막대와 선이 어떤 그룹을 의미하는지 나타내는 범례를 추가합니다.

## 2. 핵심 개발 원칙 (Based on `AI_PROJECT_GUIDE.md`)

본 개발은 프로젝트의 안정성과 일관성을 위해 `AI_PROJECT_GUIDE.md`에 명시된 핵심 원칙을 철저히 준수합니다.

1.  **단일 데이터 소스 (Single Source of Truth)**: 모든 원시 데이터는 `src/components/store.js`의 Vuex 스토어에서만 가져옵니다.
2.  **계산은 Computed 속성에서**: 모든 데이터 집계 및 변환 로직은 `EpidemicCurve.vue` 내의 `computed` 속성에서 처리합니다. 이를 통해 원본 데이터가 변경될 때 차트가 반응적으로 자동 업데이트되도록 보장합니다.
3.  **단방향 데이터 흐름**: 뷰(컴포넌트)는 Vuex 액션을 통해서만 상태 변경을 요청할 수 있으며, 상태 변경만이 뷰를 업데이트합니다. (본 계획에서는 데이터 조회만 하므로 이 원칙을 직접 수정하진 않지만, 구조를 이해하는 데 필수적입니다.)

## 3. 개발 단계 (Development Steps)

### Step 1: 데이터 구조 분석 및 그룹 변수 식별

-   **현재 상황**: 현재 유행곡선은 `isPatient`와 `symptomOnset` 열만 사용하여 전체 환자 수를 계산합니다.
-   **필요 작업**:
    1.  Vuex 스토어의 `rows` 데이터 구조를 확인하여, 이미지의 '1-A반', '1학년' 등과 같이 환자를 그룹화할 수 있는 **범주형 변수(Categorical Variable)가 포함된 열**을 식별해야 합니다.
    2.  이 계획에서는 해당 열의 `key`가 `group`이라고 가정합니다. (예: `row.group`에 '1-A' 등의 값이 저장됨)
    3.  또한 `headers`에 이 그룹들의 전체 목록이 정의되어 있다고 가정합니다. (예: `headers.value.groups`는 `['1-A', '1-B', ...]` 배열)

### Step 2: 그룹별 데이터 집계 로직 재작성

가장 핵심적인 단계로, `symptomOnsetTableData` computed 속성을 대체할 새로운 데이터 집계 로직이 필요합니다.

-   **신규 `computed` 속성 제안**: `groupedSymptomData`
-   **구현 로직**:
    1.  기존 로직과 같이 `selectedSymptomInterval`에 따라 시간 간격(Intervals)을 생성합니다. (앞뒤 패딩 구간 포함)
    2.  분석에 사용될 모든 그룹의 목록을 가져옵니다. (예: `const groups = headers.value.groups;`)
    3.  생성된 각 시간 간격에 대해, 모든 그룹의 환자 수를 0으로 초기화하는 객체를 만듭니다.
        ```javascript
        // 예시 구조
        {
          intervalLabel: "05-29 15:00 ~ 05-29 18:00",
          counts: { '1-A': 0, '1-B': 0, '2-A': 0, ... }, // 모든 그룹을 0으로 초기화
          total: 0
        }
        ```
    4.  전체 환자 데이터(`patientOnsetTimes`)를 순회하면서 각 환자의 증상 발현 시간이 어느 시간 간격에 속하는지, 그리고 어떤 그룹(`row.group`)에 속하는지 확인합니다.
    5.  해당 시간 간격의 `counts` 객체에서 해당 그룹의 카운트를 1 증가시키고, `total`도 1 증가시킵니다.
    6.  최종적으로 모든 시간 간격에 대한 그룹별/전체 환자 수가 집계된 배열을 반환합니다.

### Step 3: ECharts 옵션 재구성 (`generateEpiCurveChartOptions`)

새로운 데이터 구조(`groupedSymptomData`)를 사용하도록 ECharts 옵션 생성 로직을 완전히 수정해야 합니다.

-   **`series` 옵션 수정**:
    1.  `series` 배열을 동적으로 생성합니다.
    2.  먼저, **그룹 목록** (`groups`)을 순회하며 각 그룹에 대한 `bar` 타입 시리즈를 생성합니다.
        -   `name`: 그룹명 (예: '1-A')
        -   `type`: `'bar'`
        -   **`stack`: `'total'`** (← 모든 막대 시리즈에 동일한 스택 ID를 부여하여 누적 차트로 만드는 핵심 속성)
        -   `data`: `groupedSymptomData`에서 해당 그룹의 카운트만 추출한 배열
    3.  그 다음, **전체 사례 수**에 대한 `line` 타입 시리즈를 하나 추가합니다.
        -   `name`: '사례 수(명)'
        -   `type`: `'line'`
        -   `data`: `groupedSymptomData`에서 `total` 값만 추출한 배열
        -   `color`: 이미지에 맞춰 붉은색 계열로 지정 (예: `'#ee6666'`)
-   **`legend` 옵션 추가**:
    -   차트 하단에 범례를 표시하도록 `legend` 객체를 추가합니다.
    -   `data` 속성에는 모든 그룹명과 '사례 수(명)'을 포함하는 배열을 지정합니다. `['1-A', '1-B', ..., '사례 수(명)']`

### Step 4: UI/UX 최종 검토

-   **색상 매핑**: 각 그룹에 일관된 색상을 할당하는 로직을 추가합니다. `barColors` 배열을 재활용하거나 그룹별로 고정 색상을 지정할 수 있습니다.
-   **툴팁 포맷터 수정**: 툴팁에 마우스를 올렸을 때, 해당 시간대의 그룹별 수치와 전체 합계를 모두 보여주도록 `tooltip.formatter`를 수정합니다.

## 4. 예상 코드 구조 (Vue Component)

```javascript
// src/components/EpidemicCurve.vue (개선 후 예상 구조)

import { computed, ... } from "vue";
import { useStore } from "vuex";
import * as echarts from "echarts";

// ...

const store = useStore();
const headers = computed(() => store.getters.headers);
const rows = computed(() => store.getters.rows);
// ... 기타 기존 상태값 ...

// Step 1: 그룹 목록 정의 (가정)
const uniqueGroups = computed(() => {
  // 예시: headers.value.groupDefs 또는 데이터에서 직접 추출
  // 결과: ['1-A', '1-B', '2-A', '2-B', '3-A', '3-B', '1학년', '2학년', '3학년', '조교', '조리 종사자']
  return headers.value.groups || []; 
});

// Step 2: 새로운 데이터 집계 로직
const groupedSymptomData = computed(() => {
  // 위 'Step 2'에서 설명한 로직 구현
  // ...
  return [/* { intervalLabel, counts: { group: count, ... }, total } */];
});

// Step 3 & 4: 새로운 차트 옵션 생성 로직
const generateEpiCurveChartOptions = () => {
  const data = groupedSymptomData.value;
  const groups = uniqueGroups.value;
  const colors = ["#4e79a7", "#f28e2c", "#e15759", ...]; // 그룹별 색상 팔레트

  // 누적 막대 시리즈 생성
  const barSeries = groups.map((group, index) => ({
    name: group,
    type: 'bar',
    stack: 'total', // 누적의 핵심
    emphasis: { focus: 'series' },
    itemStyle: { color: colors[index % colors.length] },
    data: data.map(item => item.counts[group] || 0)
  }));

  // 전체 추세선 시리즈 생성
  const lineSeries = {
    name: '사례 수(명)',
    type: 'line',
    symbol: 'circle',
    itemStyle: { color: '#c23531' },
    data: data.map(item => item.total)
  };

  return {
    // ... title, grid, xAxis, yAxis 설정 ...
    tooltip: { 
      trigger: 'axis',
      // ... 그룹별/전체 데이터 표시하도록 formatter 수정 ...
    },
    legend: {
      type: 'scroll',
      bottom: 10,
      data: [...groups, '사례 수(명)']
    },
    series: [...barSeries, lineSeries]
  };
};

// ... 기존 updateCharts, onMounted 등의 로직은 generateEpiCurveChartOptions를 호출하도록 유지 ...
``` 

## 5. Phase 2: 고급 기능 및 사용자 컨트롤 추가

1단계 구현이 완료된 후, 사용자 경험과 분석 능력을 향상시키기 위해 다음 고급 기능들을 추가하는 2단계 개발을 계획합니다.

### 5.1. 차트 모드 전환 기능 (단순/그룹)

**목표**: 사용자가 '단순 집계' 막대 차트와 '그룹별 누적' 혼합 차트 사이를 자유롭게 전환할 수 있는 UI 컨트롤을 제공합니다.

-   **상태 관리**:
    -   `EpidemicCurve.vue` 내부에 현재 차트 모드를 저장할 `ref`를 추가합니다.
      ```javascript
      const chartMode = ref('simple'); // 'simple' 또는 'grouped'
      ```
-   **UI 구현**:
    -   `controls-area`에 '차트 모드'를 선택할 수 있는 버튼 그룹 또는 토글 스위치를 추가합니다. 이 컨트롤을 통해 `chartMode`의 값을 변경합니다.

### 5.2. 조건부 데이터 처리 및 렌더링

**목표**: `chartMode`의 값에 따라 데이터 집계 방식, 테이블 구조, 차트 옵션을 모두 동적으로 변경합니다.

-   **데이터 집계**:
    -   기존 `symptomOnsetTableData` (단순 모드용)와 `groupedSymptomData` (그룹 모드용) 두 개의 `computed` 속성을 모두 유지합니다.
-   **테이블 동적 렌더링**:
    -   가장 복잡하고 중요한 부분입니다. `v-if`와 `v-else`를 사용하여 두 개의 다른 `<template>` 또는 `<table>` 구조를 렌더링합니다.
    -   **단순 모드 (`chartMode === 'simple'`)**:
        -   기존과 동일하게 `증상 발현 시간 | 수` 컬럼을 가진 테이블을 표시합니다.
    -   **그룹 모드 (`chartMode === 'grouped'`)**:
        -   새로운 구조의 테이블을 렌더링합니다.
        -   `<thead>`: `<th>`를 동적으로 생성합니다. `시간`, `그룹1`, `그룹2`, ..., `합계` 순서로 표시됩니다.
        -   `<tbody>`: `groupedSymptomData`를 기반으로 각 시간대별 그룹의 환자 수를 해당 셀에 표시합니다.
-   **차트 옵션 조건부 생성**:
    -   `generateEpiCurveChartOptions` 함수 내부에 `chartMode.value`에 따른 분기 처리를 추가합니다.
      ```javascript
      if (chartMode.value === 'simple') {
        // 기존의 단순 막대 차트 옵션 반환
      } else { // 'grouped'
        // Phase 1에서 계획한 누적 막대 + 선 차트 옵션 반환
      }
      ```

### 5.3. 범례 라벨링 및 필터링 기능

**목표**: 그룹의 수가 많을 경우, 사용자가 범례를 통해 특정 그룹만 보거나 라벨을 수정하여 가독성을 높일 수 있도록 합니다.

-   **1단계 (기본)**: ECharts의 내장 범례 클릭 기능을 활용합니다. 사용자가 범례 항목을 클릭하면 해당 시리즈(그룹)가 차트에서 토글(show/hide)됩니다. 이는 추가 개발 없이 즉시 사용 가능합니다.
-   **2단계 (고급 - 라벨링)**:
    -   **UI**: "범례 편집" 버튼과 같은 컨트롤을 추가하고, 클릭 시 모달(Modal) 창을 엽니다.
    -   **기능**: 모달 창 안에서 각 그룹의 기본 이름(예: `group_a`)과 사용자가 원하는 표시 이름(예: `1학년 A반`)을 매핑하는 입력 필드를 제공합니다.
    -   **상태 관리**: 이 매핑 정보를 컴포넌트 내의 `ref` 객체에 저장합니다. (예: `const groupLabelMap = ref({ 'group_a': '1학년 A반' })`)
    -   **적용**: `generateEpiCurveChartOptions` 함수가 이 `groupLabelMap`을 참조하여 `legend.data`와 `series.name`을 설정하도록 수정합니다.

이러한 단계적 접근을 통해, 기본 기능부터 완성하고 점진적으로 복잡한 사용자 맞춤 기능을 추가하여 개발의 안정성과 효율성을 높일 수 있습니다. 