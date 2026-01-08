// useSuspectedFood.js - 추정 감염원 드롭다운 로직
import { ref, computed } from 'vue';
import { useSettingsStore } from '../../../stores/settingsStore';

export function useSuspectedFood() {
  const settingsStore = useSettingsStore();

  // 상태
  const suspectedFood = ref(settingsStore.selectedSuspectedFoods || '');
  const isDropdownOpen = ref(false);
  const selectedFoods = ref(new Set());
  const showAnalysisTooltip = ref(false);
  const analysisTooltipRef = ref(null);

  // 분석 결과
  const analysisResults = computed(() => {
    const results = settingsStore.analysisResults;
    return results.caseControl || results.cohort || [];
  });

  // 분석 결과 존재 여부
  const hasAnalysisResults = computed(() => {
    const analysisResults = settingsStore.analysisResults;
    if (analysisResults && (analysisResults.caseControl?.length > 0 || analysisResults.cohort?.length > 0)) {
      return true;
    }
    return sortedFoodItems.value.length > 0;
  });

  // 정렬된 식단 목록
  const sortedFoodItems = computed(() => {
    if (!analysisResults.value || analysisResults.value.length === 0) return [];
    return analysisResults.value
      .filter(item => item.pValue !== null)
      .sort((a, b) => {
        if (a.pValue === null && b.pValue === null) return 0;
        if (a.pValue === null) return 1;
        if (b.pValue === null) return -1;
        return a.pValue - b.pValue;
      });
  });

  // 백그라운드 분석 결과
  const backgroundAnalysisFoods = computed(() => {
    const analysisResults = settingsStore.analysisResults;
    if (!analysisResults) return [];

    if (analysisResults.caseControl && analysisResults.caseControl.length > 0) {
      return analysisResults.caseControl.map(item => ({
        item: item.item,
        pValue: item.pValue,
        oddsRatio: item.oddsRatio,
        type: 'caseControl'
      }));
    }

    if (analysisResults.cohort && analysisResults.cohort.length > 0) {
      return analysisResults.cohort.map(item => ({
        item: item.item,
        pValue: null,
        relativeRisk: item.relativeRisk,
        type: 'cohort'
      }));
    }

    return [];
  });

  // 분석 상태
  const analysisStatus = computed(() => {
    const analysisResults = settingsStore.analysisResults;

    if (hasAnalysisResults.value || backgroundAnalysisFoods.value.length > 0 || analysisResults) {
      const caseControlCount = analysisResults?.caseControl?.length || 0;
      const cohortCount = analysisResults?.cohort?.length || 0;

      if (caseControlCount > 0) {
        return { type: 'success', message: `환자대조군 분석 완료 (${caseControlCount}개 항목)` };
      } else if (cohortCount > 0) {
        return { type: 'success', message: `코호트 분석 완료 (${cohortCount}개 항목)` };
      } else {
        return { type: 'success', message: '분석 완료 (데이터 준비됨)' };
      }
    } else {
      return { type: 'warning', message: '분석 대기 중...' };
    }
  });

  // 분석 상태 툴팁 함수
  const getAnalysisStatusTooltip = (status) => {
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
  const analysisTooltipStyle = computed(() => {
    if (!showAnalysisTooltip.value || !analysisTooltipRef.value) {
      return {};
    }
    const rect = analysisTooltipRef.value.getBoundingClientRect();
    const left = rect.left + (rect.width / 2);
    const top = rect.bottom + 5;
    return {
      left: `${left}px`,
      top: `${top}px`,
      transform: 'translateX(-50%)'
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

  const isFoodSelected = (foodItem) => {
    return selectedFoods.value.has(foodItem);
  };

  const toggleFoodSelection = (foodItem) => {
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
