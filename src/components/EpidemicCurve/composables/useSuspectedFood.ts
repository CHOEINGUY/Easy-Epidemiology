// useSuspectedFood.ts - 추정 감염원 드롭다운 로직
import { ref, computed, type Ref, type ComputedRef, type CSSProperties } from 'vue';
import { useSettingsStore } from '../../../stores/settingsStore';
import type { AnalysisResultItem } from '@/types/analysis';

export interface AnalysisStatus {
  type: 'success' | 'warning' | 'error';
  message: string;
}

export interface UseSuspectedFoodReturn {
  suspectedFood: Ref<string>;
  isDropdownOpen: Ref<boolean>;
  selectedFoods: Ref<Set<string>>;
  showAnalysisTooltip: Ref<boolean>;
  analysisTooltipRef: Ref<HTMLElement | null>;
  analysisResults: ComputedRef<AnalysisResultItem[]>;
  hasAnalysisResults: ComputedRef<boolean>;
  sortedFoodItems: ComputedRef<AnalysisResultItem[]>;
  backgroundAnalysisFoods: ComputedRef<AnalysisResultItem[]>;
  analysisStatus: ComputedRef<AnalysisStatus>;
  analysisTooltipStyle: ComputedRef<CSSProperties>;
  getAnalysisStatusTooltip: (status: AnalysisStatus) => string;
  toggleDropdown: () => void;
  closeDropdown: () => void;
  isFoodSelected: (foodItem: string) => boolean;
  toggleFoodSelection: (foodItem: string) => void;
  applySelectedFoods: () => void;
  onSuspectedFoodChange: () => void;
}

export function useSuspectedFood(): UseSuspectedFoodReturn {
  const settingsStore = useSettingsStore();

  // 상태
  const suspectedFood = ref<string>(settingsStore.selectedSuspectedFoods || '');
  const isDropdownOpen = ref<boolean>(false);
  const selectedFoods = ref<Set<string>>(new Set());
  const showAnalysisTooltip = ref<boolean>(false);
  const analysisTooltipRef = ref<HTMLElement | null>(null);

  // 분석 결과
  const analysisResults = computed<AnalysisResultItem[]>(() => {
    const results = settingsStore.analysisResults;
    if (!results) return [];
    
    const caseControl = (results.caseControl || []) as AnalysisResultItem[];
    const cohort = (results.cohort || []) as AnalysisResultItem[];
    
    return caseControl.length > 0 ? caseControl : cohort;
  });

  // 정렬된 식단 목록 (선언 순서 조정: hasAnalysisResults에서 사용하므로 먼저 선언하거나, Hoisting 고려. Vue Computed는 순서 중요)
  const sortedFoodItems = computed<AnalysisResultItem[]>(() => {
    if (!analysisResults.value || analysisResults.value.length === 0) return [];
    return [...analysisResults.value]
      .filter((item) => item.pValue !== null && item.pValue !== undefined)
      .sort((a, b) => {
        const pA = a.pValue ?? 1;
        const pB = b.pValue ?? 1;
        return pA - pB;
      });
  });

  // 분석 결과 존재 여부
  const hasAnalysisResults = computed<boolean>(() => {
    const results = settingsStore.analysisResults;
    const hasData = results && ((results.caseControl?.length ?? 0) > 0 || (results.cohort?.length ?? 0) > 0);
    return !!hasData || sortedFoodItems.value.length > 0;
  });

  // 백그라운드 분석 결과
  const backgroundAnalysisFoods = computed<AnalysisResultItem[]>(() => {
    const results = settingsStore.analysisResults;
    if (!results) return [];

    if (results.caseControl && results.caseControl.length > 0) {
      return results.caseControl.map((item) => ({
        ...item,
        type: 'caseControl'
      }));
    }

    if (results.cohort && results.cohort.length > 0) {
      return results.cohort.map((item) => ({
        ...item,
        type: 'cohort'
      }));
    }

    return [];
  });

  // 분석 상태
  const analysisStatus = computed<AnalysisStatus>(() => {
    const results = settingsStore.analysisResults;

    // Check if there are actual results
    const caseControlCount = results?.caseControl?.length || 0;
    const cohortCount = results?.cohort?.length || 0;
    const hasData = caseControlCount > 0 || cohortCount > 0;

    if (hasData) {
      if (caseControlCount > 0) {
        return { type: 'success', message: `환자대조군 분석 완료 (${caseControlCount}개 항목)` };
      } else {
        return { type: 'success', message: `코호트 분석 완료 (${cohortCount}개 항목)` };
      }
    } else {
      return { type: 'warning', message: '분석 대기 중 (환자대조군/코호트 탭 확인 필요)' };
    }
  });

  // 분석 상태 툴팁 함수
  const getAnalysisStatusTooltip = (status: AnalysisStatus): string => {
    switch (status.type) {
    case 'success':
      return '통계 분석이 완료되었습니다. 추정 감염원을 선택할 수 있습니다.';
    case 'warning':
      if (status.message.includes('분석 대기 중')) {
        return '환자대조군 연구 또는 코호트 연구 탭에서 먼저 통계 분석을 수행해주세요.';
      } else {
        return '분석 데이터가 없습니다. 환자대조군 연구 또는 코호트 연구 탭에서 분석을 수행해주세요.';
      }
    case 'error':
      return '분석 데이터가 없습니다. 데이터를 입력하고 분석을 수행해주세요.';
    default:
      return '분석 상태를 확인 중입니다.';
    }
  };

  // 툴팁 스타일 계산
  const analysisTooltipStyle = computed<CSSProperties>(() => {
    if (!showAnalysisTooltip.value || !analysisTooltipRef.value) {
      return {};
    }
    const rect = analysisTooltipRef.value.getBoundingClientRect();
    const left = rect.left + (rect.width / 2);
    const top = rect.bottom + 5;
    return {
      left: `${left}px`,
      top: `${top}px`,
      transform: 'translateX(-50%)',
      position: 'fixed',
      zIndex: 1000
    };
  });

  // 드롭다운 함수
  const toggleDropdown = () => {
    if (!hasAnalysisResults.value) return;
    
    // 드롭다운 열 때 현재 입력된 텍스트와 체크박스 상태 동기화
    if (!isDropdownOpen.value) {
      const currentString = suspectedFood.value || '';
      const currentItems = currentString.split(',').map(s => s.trim()).filter(s => s);
      selectedFoods.value = new Set(currentItems);
    }
    
    isDropdownOpen.value = !isDropdownOpen.value;
  };

  const closeDropdown = () => {
    isDropdownOpen.value = false;
  };

  const isFoodSelected = (foodItem: string): boolean => {
    return selectedFoods.value.has(foodItem);
  };

  const toggleFoodSelection = (foodItem: string) => {
    if (selectedFoods.value.has(foodItem)) {
      selectedFoods.value.delete(foodItem);
    } else {
      selectedFoods.value.add(foodItem);
    }
    selectedFoods.value = new Set(selectedFoods.value);
  };

  const applySelectedFoods = () => {
    const selectedArray = Array.from(selectedFoods.value);
    suspectedFood.value = selectedArray.join(', ');
    console.log('[useSuspectedFood] applySelectedFoods:', suspectedFood.value);
    settingsStore.setSelectedSuspectedFoods(suspectedFood.value);
    isDropdownOpen.value = false;
  };

  const onSuspectedFoodChange = () => {
    settingsStore.setSelectedSuspectedFoods(suspectedFood.value);
  };

  return {
    // 상태
    suspectedFood,
    isDropdownOpen,
    selectedFoods,
    showAnalysisTooltip,
    analysisTooltipRef,
    
    // 분석 데이터
    analysisResults,
    hasAnalysisResults,
    sortedFoodItems,
    backgroundAnalysisFoods,
    analysisStatus,
    analysisTooltipStyle,
    
    // 함수
    getAnalysisStatusTooltip,
    toggleDropdown,
    closeDropdown,
    isFoodSelected,
    toggleFoodSelection,
    applySelectedFoods,
    onSuspectedFoodChange
  };
}
