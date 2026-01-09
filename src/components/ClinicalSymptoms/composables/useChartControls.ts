import { ref, type Ref } from 'vue';

export interface ChartControlOption {
  key: string;
  label: string;
  tooltip: string;
}

export type HighlightOption = ChartControlOption;
export type SortOption = ChartControlOption;

export type BarDirection = 'vertical' | 'horizontal';
export type DetailHighlight = 'none' | 'max' | 'min' | 'both';

export interface UseChartControlsReturn {
  fontSizes: number[];
  fontSizeLabels: string[];
  chartWidths: number[];
  barWidthPercents: number[];
  barColors: string[];
  highlightOptions: ChartControlOption[];
  sortOptions: ChartControlOption[];
  chartFontSize: Ref<number>;
  chartWidth: Ref<number>;
  barWidthPercent: Ref<number>;
  selectedBarColor: Ref<string>;
  barDirection: Ref<BarDirection>;
  currentHighlight: Ref<DetailHighlight>;
  currentSort: Ref<string>;
}

/**
 * 차트 컨트롤 상태 관리 composable
 * @returns {UseChartControlsReturn} 차트 컨트롤 관련 상태와 함수들
 */
export function useChartControls(): UseChartControlsReturn {
  // 옵션 상수
  const fontSizes: number[] = [14, 16, 18, 20, 24];
  const fontSizeLabels: string[] = ['매우 작게', '작게', '보통', '크게', '매우 크게'];
  const chartWidths: number[] = [500, 700, 900, 1100];
  const barWidthPercents: number[] = [30, 50, 70];
  const barColors: string[] = [
    '#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de',
    '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc'
  ];

  // 강조 옵션
  const highlightOptions: ChartControlOption[] = [
    { key: 'none', label: '강조 없음', tooltip: '모든 막대를 같은 색상으로 표시합니다' },
    { key: 'max', label: '최대값 강조', tooltip: '가장 큰 값의 막대를 다른 색상으로 강조합니다' },
    { key: 'min', label: '최소값 강조', tooltip: '가장 작은 값의 막대를 다른 색상으로 강조합니다' },
    { key: 'both', label: '최대/최소값 강조', tooltip: '가장 큰 값과 가장 작은 값의 막대를 강조합니다' }
  ];

  // 정렬 옵션
  const sortOptions: ChartControlOption[] = [
    { key: 'none', label: '정렬 없음', tooltip: '원본 순서대로 표시합니다' },
    { key: 'percent-asc', label: '오름차순', tooltip: '백분율이 낮은 순으로 정렬합니다' },
    { key: 'percent-desc', label: '내림차순', tooltip: '백분율이 높은 순으로 정렬합니다' }
  ];

  // 상태
  const chartFontSize = ref<number>(16);
  const chartWidth = ref<number>(700);
  const barWidthPercent = ref<number>(50);
  const selectedBarColor = ref<string>(barColors[0]);
  const barDirection = ref<BarDirection>('vertical');
  const currentHighlight = ref<DetailHighlight>('none');
  const currentSort = ref<string>('none');

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
    currentSort
  };
}
