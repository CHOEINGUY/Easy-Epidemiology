# 웹 애플리케이션 차트 표준 가이드 (최종 업데이트: 2024-12-20)

이 문서는 프로젝트 내 모든 ECharts 기반 차트의 시각적 및 기능적 일관성을 유지하기 위한 표준 가이드를 정의합니다. 모든 신규 차트 개발 시 이 가이드를 준수해야 합니다.

## 1. 핵심 원칙

- **통일성 (Consistency)**: 모든 차트는 동일한 색상, 폰트, 인터랙션 스타일을 공유하여 사용자에게 일관된 경험을 제공합니다.
- **정보 중심 (Information-centric)**: 툴팁, 라벨 등을 최적화하여 데이터를 명확하고 효과적으로 전달합니다.
- **사용자 친화적 (User-friendly)**: 동적 컨트롤과 직관적인 인터랙션을 통해 사용자가 쉽게 차트를 탐색하고 활용할 수 있도록 합니다.

## 2. 시각적 스타일 표준

### 2.1. 폰트 시스템

- **기본 폰트**: 차트의 모든 텍스트 요소(제목, 축 라벨, 범례, 데이터 라벨 등)는 **`Noto Sans KR`**을 기본으로 사용합니다.
  ```javascript
  // 예시: ECharts 전역 텍스트 스타일 설정
  textStyle: {
    fontFamily: 'Noto Sans KR, sans-serif'
  }
  ```
- **동적 폰트 크기**: 사용자가 직접 폰트 크기를 조절할 수 있는 컨트롤을 제공해야 합니다. 데이터 라벨의 크기는 `Math.max(10, (기본 폰트 크기 - 4))` 공식을 따라 가독성을 확보합니다.

### 2.2. 색상 시스템

#### 2.2.1. 동적 그라디언트 막대

모든 막대 차트는 단색이 아닌 동적 그라디언트를 사용합니다. `generateGradientColors` 함수를 통해 기본 색상(하단)과 30% 밝은 색상(상단)을 조합하여 입체감을 부여합니다.

```javascript
// 표준 그라디언트 생성 함수
const generateGradientColors = (baseColor) => {
  // ... (16진수 색상을 밝게 조절하는 로직)
  const lightColor = adjustBrightness(baseColor, 30);
  const darkColor = baseColor;
  return { lightColor, darkColor };
};

// ECharts 시리즈 아이템 스타일 적용
itemStyle: {
  color: function(params) {
    const baseColor = getBarColor(params.dataIndex); // 데이터에 따른 기본 색상 결정
    const colors = generateGradientColors(baseColor);
    // 차트 방향(가로/세로)에 따라 그라데이션 방향 조절
    return new echarts.graphic.LinearGradient(0, 0, 0, 1, [
      { offset: 0, color: colors.lightColor },
      { offset: 1, color: colors.darkColor }
    ]);
  }
}
```

#### 2.2.2. 강조 및 호버 효과

- **호버 (마우스 오버)**: 모든 차트의 막대에 마우스를 올리면 **주황색 계열 그라데이션**(`#FDB813` ~ `#F9A825`)이 적용되어야 합니다.
  ```javascript
  // 표준 호버 효과
  emphasis: {
    focus: "series",
    itemStyle: {
      color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
        { offset: 0, color: '#FDB813' }, 
        { offset: 1, color: '#F9A825' }
      ])
    }
  }
  ```
- **데이터 강조**: 최댓값/최솟값 강조 기능 사용 시 다음 색상을 표준으로 합니다.
  - **최댓값**: 빨강 계열 (`#ff6b6b`)
  - **최솟값**: 청록 계열 (`#4ecdc4`)
  - 강조된 막대에도 그라디언트 효과를 동일하게 적용합니다.

#### 2.2.3. 기본 색상 팔레트

사용자가 선택할 수 있는 기본 막대 색상 팔레트는 아래와 같습니다.

```javascript
const barColors = [
  "#5470c6", "#91cc75", "#fac858", "#ee6666", "#73c0de",
  "#3ba272", "#fc8452", "#9a60b4", "#ea7ccc",
];
```
- **차트별 기본 색상**:
  - `EpidemicCurve.vue` (유행곡선): `#1E88E5` (파랑 계열)
  - `EpidemicCurve.vue` (잠복기): `#91cc75` (녹색 계열)
  - `PatientCharacteristics.vue`: `#5470c6` (파랑 계열)
  - `ClinicalSymptoms.vue`: `#5470c6` (파랑 계열)

## 3. 인터랙션 표준

### 3.1. 툴팁 (Tooltip)

모든 차트의 툴팁은 다음 형식을 준수하여 명확한 정보를 제공해야 합니다.

- **표준 형식**: `<strong>카테고리명</strong><br/>시리즈명: <strong>값</strong>단위 (보조정보)`
- **예시**:
  - `<strong>서울</strong><br/>환자 수: <strong>15</strong>명 (25.4%)`
  - `<strong>12~24시간</strong><br/>환자 수: <strong>5</strong>명`

```javascript
// 표준 툴팁 포맷터 예시
tooltip: {
  trigger: "axis",
  axisPointer: { type: "shadow" },
  formatter: function(params) {
    const param = params[0];
    const category = param.name;
    const seriesName = param.seriesName;
    const value = param.value;
    // ... 보조 정보 계산 로직 ...
    return `<strong>${category}</strong><br/>${seriesName}: <strong>${value}</strong>명 (${percentage}%)`;
  }
}
```

### 3.2. 데이터 하이라이트

- `PatientCharacteristics`, `ClinicalSymptoms`와 같이 값의 분포를 비교하는 차트에서는 '최대/최소/모두 강조' 기능을 제공하는 것을 표준으로 합니다.
- **중복 값 처리**: 최댓값 또는 최솟값이 여러 개일 경우, 해당하는 모든 막대를 동시에 강조해야 합니다.

## 4. 기능 표준

### 4.1. 공통 컨트롤

모든 차트는 사용자가 차트의 주요 속성을 변경할 수 있도록 아래의 컨트롤을 기본적으로 제공해야 합니다.

- **폰트 크기 조절**
- **차트 너비 조절**
- **막대 색상 변경**

### 4.2. 내보내기 및 복사

- **차트 복사/저장**: 모든 차트는 고화질(pixelRatio: 3) PNG 이미지로 클립보드에 복사하거나 파일로 저장하는 기능을 제공해야 합니다.
- **테이블 데이터 복사**: 차트와 관련된 테이블 데이터는 서식이 적용된 HTML과 순수 텍스트(Plain Text) 두 가지 형식으로 클립보드에 복사하는 기능을 제공해야 합니다.

## 5. 특수 구현 사례

### 5.1. 계층형 X축 (유행곡선 차트)

- `EpidemicCurve.vue`의 유행곡선 차트는 ECharts의 보조 X축(`xAxis`)과 `axisTick`을 활용하여 날짜와 시간을 그룹화하는 계층형 축을 구현했습니다. 이는 시간의 흐름에 따른 데이터 변화를 시각화하는 복잡한 요구사항에 대한 표준 해결책으로 참조할 수 있습니다.

### 5.2. 막대 방향 전환 (임상증상 차트)

- `ClinicalSymptoms.vue`는 가로 막대 차트와 세로 막대 차트를 전환하는 기능을 제공합니다. 이는 카테고리 라벨의 길이나 데이터의 특성에 따라 최적의 시각화 방식을 선택할 수 있도록 하는 좋은 예시입니다. 