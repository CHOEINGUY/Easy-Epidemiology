# `EpidemicCurve.vue` 차트 개발 완료 가이드 (최종 업데이트: 2024-12-19)

이 문서는 `EpidemicCurve.vue` 컴포넌트의 완전한 차트 개발 과정과 최종 구현된 모든 기능을 기록합니다. 유행곡선과 잠복기 차트의 모든 기능이 완성되었으며, 각 차트별 독립적인 컨트롤 시스템이 구축되었습니다.

## 1. 프로젝트 개요

`EpidemicCurve.vue`는 역학 조사를 위한 두 가지 핵심 차트를 제공합니다:
- **유행곡선 차트**: 시간별 환자 발생 현황을 계층형 X축으로 시각화
- **잠복기 차트**: 노출 시점 대비 잠복기별 환자 분포 시각화

## 2. 완성된 핵심 기능

### 2.1. 계층형 X축 구현 (유행곡선 차트)

**기술적 해결책**: 보조 X축과 `axisTick`을 활용한 계층형 구조
- **하위 축**: 시간대별 라벨 (`0~3시`, `3~6시` 등)
- **상위 축**: 날짜별 그룹 라벨 (`4. 8.(월)`, `4. 9.(화)` 등)
- **구분선**: `axisTick`을 재해석하여 날짜 그룹 구분선으로 활용

```javascript
// 핵심 구현 로직
xAxis: [
    { type: 'category', data: timeData }, // 시간 축
    {
        type: 'category',
        position: 'bottom',
        offset: 45,
        axisTick: {
            show: true,
            inside: false,
            length: 80,
            interval: (index, value) => value !== '' // 그룹 시작점에만 구분선
        },
        data: dateGroups.flatMap(group => {
            const groupData = Array(group.count).fill('');
            if (groupData.length > 0) groupData[0] = group.name;
            return groupData;
        })
    }
]
```

### 2.2. 잠복기 차트 개선

**라벨 형식 개선**: `"00:00~12:00"` → `"0~12시간"` 형식으로 변환
```javascript
const formatIncubationLabel = (intervalLabel) => {
    const parts = intervalLabel.split(' ~ ');
    const startHour = parseInt(parts[0].split(':')[0], 10);
    let endHour = parseInt(parts[1].split(':')[0], 10);
    if (endHour === 0 && startHour > 0) endHour = 24;
    return `${startHour}~${endHour}시간`;
};
```

**차트 스타일 통일**: 유행곡선과 동일한 디자인 적용
- X축 라벨 수평 배치 (`rotate: 0`)
- 동일한 그라디언트 색상 시스템
- 통일된 Y축 스타일 및 격자

## 3. 독립적인 차트 컨트롤 시스템

### 3.1. 상태 분리

각 차트별로 완전히 독립된 상태 관리:

```javascript
// 유행곡선 차트 상태
const epiChartFontSize = ref(15);
const epiChartWidth = ref(1100);
const epiBarColor = ref("#1E88E5");

// 잠복기 차트 상태  
const incubationChartFontSize = ref(15);
const incubationChartWidth = ref(1100);
const incubationBarColor = ref("#1E88E5");
```

### 3.2. 컨트롤 기능

**유행곡선 차트 컨트롤**:
- ✅ 증상발현 시간간격: 3/6/12/24/48시간 (기본값: 6시간)
- ✅ 폰트 크기: 12/15/18/21/24px (독립)
- ✅ 차트 너비: 700/900/1100px (독립, 3시간 간격 시 자동 1100px 조정)
- ✅ 막대 색상: 11가지 색상 팔레트 (독립, 기본값: 파란색 #1E88E5)

**잠복기 차트 컨트롤**:
- ✅ 의심원 노출시간: datetime-local 입력 (Noto Sans KR 폰트 적용)
- ✅ 잠복기 간격: 3/6/12/24/48시간 (기본값: 6시간)
- ✅ 폰트 크기: 12/15/18/21/24px (독립)
- ✅ 차트 너비: 700/900/1100px (독립, 3시간 간격 시 자동 1100px 조정)
- ✅ 막대 색상: 11가지 색상 팔레트 (독립, 기본값: 녹색 #91cc75)

### 3.3. 이벤트 핸들러 분리

```javascript
// 유행곡선 전용 핸들러
const cycleEpiFontSize = () => { /* ... */ };
const cycleEpiChartWidth = () => { /* ... */ };
const cycleEpiBarColor = () => { /* ... */ };

// 잠복기 전용 핸들러
const cycleIncubationFontSize = () => { /* ... */ };
const cycleIncubationChartWidth = () => { /* ... */ };
const cycleIncubationBarColor = () => { /* ... */ };
```

## 4. 고급 시각화 기능

### 4.1. 동적 그라디언트 색상 시스템

선택된 기본 색상을 기반으로 자동 그라디언트 생성:
```javascript
const generateGradientColors = (baseColor) => {
    // RGB 변환 및 밝기 조절
    const lightColor = adjustBrightness(baseColor, 30); // 30% 밝게
    const darkColor = baseColor; // 기본 색상
    return { lightColor, darkColor };
};
```

### 4.2. 향상된 툴팁 시스템

**유행곡선**: 날짜, 시간, 환자 수 통합 표시
```javascript
formatter: (params) => {
    const dataIndex = params[0].dataIndex;
    const item = processedData[dataIndex];
    return `<strong>${item.formattedDate}</strong><br/>${item.formattedTime} : <strong>${item.value}</strong> 명`;
}
```

**잠복기**: 시간 형식과 환자 수 표시
```javascript
formatter: (params) => {
    return `<strong>${param.name}</strong><br/>${param.seriesName}: <strong>${param.value}</strong> 명`;
}
```

### 4.3. 데이터 라벨 최적화

막대 위 데이터 라벨 크기 조정: `fontSize: Math.max(10, (폰트크기 - 1))`
- 기존 `-4`에서 `-1`로 변경하여 가독성 대폭 향상
- 유행곡선과 잠복기 차트 모두 동일한 최적화 적용

## 5. 사용자 경험 개선

### 5.1. 복사 및 내보내기 기능

**테이블 복사**: HTML과 텍스트 형식 동시 지원
```javascript
await navigator.clipboard.write([
    new window.ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([text], { type: 'text/plain' })
    })
]);
```

**차트 복사**: 고해상도 PNG 형식 클립보드 복사
**차트 저장**: 3배 픽셀 비율 고화질 PNG 다운로드

### 5.2. UI 컨트롤 개선

**PatientCharacteristics 스타일 통일**:
- 컨트롤 라벨: 13px 폰트
- 버튼 스타일: `#f8f9fa` 배경, 호버 시 `#1a73e8`
- 색상 버튼: 둥근 원형 디자인 (32px × 32px)
- 박스 쉐도우 및 트랜지션 효과

**차트 버튼 위치 조정**:
```css
.chart-buttons {
    margin-top: 5px;
    margin-bottom: 10px;
}
```

**의심원 노출시간 입력 폰트**:
```css
.control-input-datetime {
    font-family: "Noto Sans KR", sans-serif;
}
```

## 6. 성능 최적화

### 6.1. Debounced 업데이트

```javascript
const debouncedUpdateCharts = debounce(() => {
    updateCharts();
}, 200);
```

### 6.2. 독립적인 차트 재생성

각 차트의 너비 변경 시 해당 차트만 재생성:
```javascript
watch(epiChartWidth, (newWidth, oldWidth) => {
    // 유행곡선 차트만 재생성
});

watch(incubationChartWidth, (newWidth, oldWidth) => {
    // 잠복기 차트만 재생성
});
```

### 6.3. 스마트 자동 조정

3시간 간격 설정 시 자동 너비 최적화:
```javascript
// 유행곡선 차트 자동 너비 조정
watch(selectedSymptomInterval, (newInterval) => {
    if (newInterval === 3) {
        epiChartWidth.value = 1100;
        console.log("유행곡선 차트: 3시간 간격으로 너비 자동 조정");
    }
});

// 잠복기 차트 자동 너비 조정  
watch(selectedIncubationInterval, (newInterval) => {
    if (newInterval === 3) {
        incubationChartWidth.value = 1100;
        console.log("잠복기 차트: 3시간 간격으로 너비 자동 조정");
    }
});
```

### 6.4. 메모리 관리

컴포넌트 언마운트 시 완전한 정리:
- 차트 인스턴스 dispose
- 이벤트 리스너 제거
- debounced 함수 취소
- 참조 정리

## 7. 데이터 처리 파이프라인

### 7.1. 유행곡선 데이터

```
Vuex Store (rows) 
→ patientOnsetTimes (computed)
→ symptomOnsetTableData (computed) 
→ processedData (차트 옵션 생성시)
→ ECharts 렌더링
```

### 7.2. 잠복기 데이터

```
Vuex Store (rows + exposureDateTime)
→ incubationDurations (computed)
→ incubationPeriodTableData (computed)
→ formatIncubationLabel 적용
→ ECharts 렌더링
```

## 8. 요약 정보 자동 계산

**유행곡선 요약**:
- 최초 발생일시
- 최종 발생일시

**잠복기 요약**:
- 최소 잠복기 (`HH:MM` 형식)
- 최대 잠복기 (`HH:MM` 형식)  
- 평균 잠복기 (`HH:MM` 형식)
- 중앙 잠복기 (`HH:MM` 형식)

## 9. 최종 개발 상태

### ✅ **완료된 모든 기능**

1. **계층형 X축 완벽 구현** - 유행곡선 차트의 날짜/시간 이중 축
2. **독립적인 차트 컨트롤** - 각 차트별 폰트/너비/색상 독립 조절
3. **잠복기 차트 개선** - 라벨 형식 개선 및 스타일 통일
4. **동적 그라디언트 색상** - 선택 색상 기반 자동 그라디언트 생성
5. **향상된 사용자 경험** - 복사/저장, 툴팁, 데이터 라벨 최적화
6. **성능 최적화** - debounce, 독립적 재생성, 스마트 자동 조정
7. **요약 정보 계산** - 자동 통계 계산 및 표시
8. **UI 일관성** - PatientCharacteristics와 동일한 컨트롤 스타일
9. **차트별 색상 구분** - 유행곡선(파란색), 잠복기(녹색) 기본 색상
10. **자동 너비 최적화** - 3시간 간격 설정 시 1100px 자동 조정

### 🎯 **기술적 성과**

- **ECharts 고급 활용**: 공식 지원하지 않는 계층형 X축을 창의적으로 구현
- **Vue 3 Composition API**: 반응형 상태 관리 및 생명주기 최적화
- **성능 최적화**: debounce, 메모이제이션, 조건부 업데이트, 스마트 자동 조정
- **타입 안전성**: 에러 처리 및 데이터 검증 강화
- **사용자 경험**: 직관적인 컨트롤, 시각적 피드백, 자동 최적화
- **독립적 차트 시스템**: 완전히 분리된 상태 관리 및 컨트롤

## 10. 결론

`EpidemicCurve.vue`의 차트 개발이 완전히 완료되었습니다. 두 차트 모두 독립적이면서도 일관된 사용자 경험을 제공하며, 역학 조사에 필요한 모든 시각화 요구사항을 충족합니다. 특히 계층형 X축 구현은 ECharts의 한계를 창의적으로 극복한 기술적 성과로 평가됩니다.

### 최종 개발 성과

- **완전히 독립적인 차트 시스템**: 유행곡선과 잠복기 차트의 모든 컨트롤이 독립적으로 작동
- **스마트 자동 최적화**: 3시간 간격 설정 시 자동 너비 조정으로 사용자 편의성 극대화
- **차트별 색상 구분**: 유행곡선(파란색), 잠복기(녹색)으로 직관적 구분
- **향상된 가독성**: 데이터 라벨 폰트 크기 최적화로 정보 가독성 대폭 향상
- **일관된 UI/UX**: PatientCharacteristics와 동일한 디자인 시스템 적용

**개발 완료일**: 2024년 12월 19일  
**최종 상태**: 모든 기능 구현 완료 ✅  
**추가 개선사항**: 스마트 자동 조정, 차트별 색상 구분, UI 통일성 완성 ✅

## 11. `PatientCharacteristics.vue` 차트 시각적 통일성 강화 (2024-12-20)

`EpidemicCurve.vue`에서 구현된 고급 시각화 기술을 `PatientCharacteristics.vue`에도 적용하여 프로젝트 전반의 차트 디자인 통일성을 확보했습니다.

### ✅ **주요 개선 사항**

1.  **동적 그라디언트 색상 시스템 적용**
    - `EpidemicCurve.vue`와 동일한 `generateGradientColors` 함수를 활용하여 모든 막대 차트에 세로 그라디언트를 적용했습니다.
    - 기본 색상과 30% 밝은 색상을 조합하여 입체감과 시각적 품질을 높였습니다.

2.  **막대 강조 기능 대폭 개선**
    - **중복 값 처리**: 최솟값 또는 최댓값이 여러 개일 경우, 모든 해당 막대를 동시에 강조하도록 로직을 수정했습니다.
    - **그라디언트와 통합**: 강조되는 막대(최대: 빨강, 최소: 청록)에도 그라디언트 효과가 적용되어 시각적 일관성을 유지합니다.
    - **호버 효과 개선**: 마우스를 올렸을 때 나타나는 강조 색상(`FDB813`)에도 그라디언트를 적용했습니다.

3.  **범례-막대 색상 일치**
    - 기존에 범례 색상과 실제 막대 색상이 일치하지 않던 문제를 해결했습니다.
    - 범례의 아이콘 색상이 현재 선택된 기본 막대 색상을 반영하도록 수정하여 직관성을 높였습니다.

4.  **폰트 시스템 통일**
    - 차트의 모든 텍스트 요소(제목, 축 라벨, 범례, 데이터 라벨 등)에 `Noto Sans KR` 폰트를 일괄 적용하여 가독성과 디자인 통일성을 확보했습니다.

### 🎯 **기술적 성과**

- **컴포넌트 간 스타일 재사용**: 공통 함수(`generateGradientColors`)를 재사용하여 코드 중복을 줄이고 일관성을 확보했습니다.
- **ECharts 고급 렌더링**: `itemStyle`의 `color` 속성에 함수를 지정하여 각 막대별로 동적인 그라디언트와 색상을 적용하는 고급 기법을 활용했습니다.
- **사용자 경험 향상**: 시각적으로 더 아름답고 직관적인 차트를 제공하여 데이터 해석의 몰입도를 높였습니다.
- **디버깅 및 안정성**: ESLint 에러를 해결하고, 중복된 값 처리 로직을 개선하여 코드의 안정성을 강화했습니다.