import { ref, computed } from 'vue';

/**
 * 차트 컨트롤 상태 관리 composable
 * @returns {Object} 차트 컨트롤 관련 상태와 함수들
 */
export function useChartControls() {
  // 옵션 상수
  const fontSizes = [14, 16, 18, 20, 24];
  const fontSizeLabels = ['매우 작게', '작게', '보통', '크게', '매우 크게'];
  const chartWidths = [500, 700, 900, 1100];
  const barWidthPercents = [30, 50, 70];
  const barColors = [
    '#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de',
    '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc'
  ];

  // 강조 옵션
  const highlightOptions = [
    { key: 'none', label: '강조 없음', tooltip: '모든 막대를 같은 색상으로 표시합니다' },
    { key: 'max', label: '최대값 강조', tooltip: '가장 큰 값의 막대를 다른 색상으로 강조합니다' },
    { key: 'min', label: '최소값 강조', tooltip: '가장 작은 값의 막대를 다른 색상으로 강조합니다' },
    { key: 'both', label: '최대/최소값 강조', tooltip: '가장 큰 값과 가장 작은 값의 막대를 강조합니다' }
  ];

  // 정렬 옵션
  const sortOptions = [
    { key: 'none', label: '정렬 없음', tooltip: '원본 순서대로 표시합니다' },
    { key: 'percent-asc', label: '오름차순', tooltip: '백분율이 낮은 순으로 정렬합니다' },
    { key: 'percent-desc', label: '내림차순', tooltip: '백분율이 높은 순으로 정렬합니다' }
  ];

  // 상태
  const chartFontSize = ref(16);
  const chartWidth = ref(700);
  const barWidthPercent = ref(50);
  const selectedBarColor = ref(barColors[0]);
  const barDirection = ref('vertical');
  const currentHighlight = ref('none');
  const currentSort = ref('none');

  // 버튼 텍스트
  const fontSizeButtonText = ref('보통');
  const chartWidthButtonText = ref(`${chartWidth.value}px`);
  const barWidthButtonText = ref(`${barWidthPercent.value}%`);
  const barDirectionButtonText = ref('세로');
  const highlightButtonText = ref(highlightOptions[0].label);
  const sortButtonText = ref('정렬 없음');

  // 유틸리티 함수
  const getNextValue = (currentValue, valueArray) => {
    try {
      if (!Array.isArray(valueArray) || valueArray.length === 0) {
        console.warn('getNextValue: 유효하지 않은 배열:', valueArray);
        return currentValue;
      }
      const currentIndex = valueArray.indexOf(currentValue);
      if (currentIndex === -1) return valueArray[0];
      const nextIndex = (currentIndex + 1) % valueArray.length;
      return valueArray[nextIndex];
    } catch (error) {
      console.error('getNextValue 오류:', error);
      return currentValue;
    }
  };

  // 다음 강조 옵션
  const getNextHighlight = computed(() => {
    const currentIndex = highlightOptions.findIndex(opt => opt.key === currentHighlight.value);
    const nextIndex = (currentIndex + 1) % highlightOptions.length;
    return highlightOptions[nextIndex];
  });

  // Cycle 함수들
  const cycleFontSize = () => {
    try {
      chartFontSize.value = getNextValue(chartFontSize.value, fontSizes);
      const currentIndex = fontSizes.indexOf(chartFontSize.value);
      fontSizeButtonText.value = fontSizeLabels[currentIndex];
      console.log('폰트 크기 변경:', chartFontSize.value);
    } catch (error) {
      console.error('cycleFontSize 오류:', error);
    }
  };

  const cycleChartWidth = () => {
    try {
      chartWidth.value = getNextValue(chartWidth.value, chartWidths);
      chartWidthButtonText.value = `${chartWidth.value}px`;
      console.log('차트 너비 변경:', chartWidth.value);
    } catch (error) {
      console.error('cycleChartWidth 오류:', error);
    }
  };

  const cycleBarWidthPercent = () => {
    try {
      barWidthPercent.value = getNextValue(barWidthPercent.value, barWidthPercents);
      barWidthButtonText.value = `${barWidthPercent.value}%`;
      console.log('막대 너비 변경:', barWidthPercent.value);
    } catch (error) {
      console.error('cycleBarWidthPercent 오류:', error);
    }
  };

  const cycleBarColor = () => {
    try {
      selectedBarColor.value = getNextValue(selectedBarColor.value, barColors);
      console.log('막대 색상 변경:', selectedBarColor.value);
    } catch (error) {
      console.error('cycleBarColor 오류:', error);
    }
  };

  const toggleBarDirection = () => {
    try {
      barDirection.value = barDirection.value === 'vertical' ? 'horizontal' : 'vertical';
      const currentDirection = barDirection.value === 'vertical' ? '세로' : '가로';
      barDirectionButtonText.value = currentDirection;
      console.log('막대 방향 변경:', barDirection.value);
    } catch (error) {
      console.error('toggleBarDirection 오류:', error);
    }
  };

  const cycleHighlight = () => {
    const nextOption = getNextHighlight.value;
    currentHighlight.value = nextOption.key;
    highlightButtonText.value = nextOption.label;
  };

  const cycleSort = () => {
    try {
      const currentIndex = sortOptions.findIndex(option => option.key === currentSort.value);
      const nextIndex = (currentIndex + 1) % sortOptions.length;
      currentSort.value = sortOptions[nextIndex].key;
      const currentSortOption = sortOptions.find(option => option.key === currentSort.value);
      sortButtonText.value = currentSortOption.label;
      console.log('정렬 변경:', currentSort.value);
    } catch (error) {
      console.error('cycleSort 오류:', error);
    }
  };

  return {
    // 옵션 상수
    fontSizes,
    fontSizeLabels,
    chartWidths,
    barWidthPercents,
    barColors,
    highlightOptions,
    sortOptions,
    
    // 상태
    chartFontSize,
    chartWidth,
    barWidthPercent,
    selectedBarColor,
    barDirection,
    currentHighlight,
    currentSort,
    
    // 버튼 텍스트
    fontSizeButtonText,
    chartWidthButtonText,
    barWidthButtonText,
    barDirectionButtonText,
    highlightButtonText,
    sortButtonText,
    
    // 함수
    getNextValue,
    getNextHighlight,
    cycleFontSize,
    cycleChartWidth,
    cycleBarWidthPercent,
    cycleBarColor,
    toggleBarDirection,
    cycleHighlight,
    cycleSort
  };
}
