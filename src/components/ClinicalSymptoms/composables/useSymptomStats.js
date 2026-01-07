import { computed } from 'vue';
import { useEpidemicStore } from '../../../stores/epidemicStore';

/**
 * 증상 통계 계산 composable
 * @param {Object} options - 정렬 옵션
 * @param {import('vue').Ref<string>} options.currentSort - 현재 정렬 상태
 * @returns {Object} 증상 통계 관련 computed 속성들
 */
export function useSymptomStats(options = {}) {
  const epidemicStore = useEpidemicStore();
  const { currentSort } = options;

  // Store에서 데이터 가져오기
  const headers = computed(() => epidemicStore.headers || { clinical: [] });
  const rows = computed(() => epidemicStore.rows || []);

  // 데이터 유효성 검증
  const hasValidData = computed(() => {
    try {
      return Array.isArray(rows.value) && rows.value.length > 0;
    } catch (error) {
      console.error('hasValidData 계산 오류:', error);
      return false;
    }
  });

  const hasValidClinicalHeaders = computed(() => {
    try {
      const clinicalHeaders = headers.value.clinical;
      return Array.isArray(clinicalHeaders) && clinicalHeaders.length > 0;
    } catch (error) {
      console.error('hasValidClinicalHeaders 계산 오류:', error);
      return false;
    }
  });

  // 환자 행 필터링
  const patientRows = computed(() => {
    try {
      if (!hasValidData.value) return [];
      return rows.value.filter(row => row && row.isPatient === '1');
    } catch (error) {
      console.error('patientRows 계산 오류:', error);
      return [];
    }
  });

  const totalPatients = computed(() => {
    try {
      return patientRows.value.length;
    } catch (error) {
      console.error('totalPatients 계산 오류:', error);
      return 0;
    }
  });

  const hasValidPatientData = computed(() => {
    try {
      if (!hasValidData.value) return false;
      return rows.value.some(row => row.isPatient === '1' && row.clinicalSymptoms);
    } catch (error) {
      console.error('hasValidPatientData 계산 오류:', error);
      return false;
    }
  });

  // 증상별 통계 계산
  const symptomStats = computed(() => {
    try {
      if (!hasValidClinicalHeaders.value || !hasValidPatientData.value) {
        console.warn('symptomStats: 유효하지 않은 데이터 상태');
        return [];
      }
      
      const clinicalHeaders = headers.value.clinical || [];
      const patients = patientRows.value;
      
      const stats = clinicalHeaders.map((name, idx) => {
        try {
          let count = 0;
          
          for (const row of patients) {
            if (row && 
                row.clinicalSymptoms && 
                Array.isArray(row.clinicalSymptoms) && 
                row.clinicalSymptoms[idx] === '1') {
              count++;
            }
          }
          
          const total = totalPatients.value;
          const percent = total > 0 ? ((count / total) * 100).toFixed(1) : '0.0';
          
          return { 
            name: name || `증상${idx + 1}`, 
            count, 
            percent: parseFloat(percent)
          };
        } catch (itemError) {
          console.error(`증상 ${name} 처리 오류:`, itemError);
          return { name: name || `증상${idx + 1}`, count: 0, percent: 0 };
        }
      });
      
      console.log('증상 통계 계산 완료:', stats.length, '개 증상');
      return stats;
    } catch (error) {
      console.error('symptomStats 계산 오류:', error);
      return [];
    }
  });

  // 정렬된 증상 통계
  const sortedSymptomStats = computed(() => {
    const stats = symptomStats.value;
    if (!Array.isArray(stats) || stats.length === 0) return [];
    
    const sorted = [...stats];
    const sortValue = currentSort?.value || 'none';
    
    switch (sortValue) {
    case 'percent-asc':
      return sorted.sort((a, b) => a.percent - b.percent);
    case 'percent-desc':
      return sorted.sort((a, b) => b.percent - a.percent);
    default:
      return stats;
    }
  });

  // 차트 상태 관리
  const chartStates = computed(() => {
    return {
      hasData: hasValidData.value,
      hasHeaders: hasValidClinicalHeaders.value,
      hasPatients: hasValidPatientData.value,
      isReady: hasValidData.value && hasValidClinicalHeaders.value && hasValidPatientData.value,
      symptomCount: sortedSymptomStats.value.length
    };
  });

  // 차트 업데이트 가능 여부
  const canUpdateChart = () => {
    try {
      const states = chartStates.value;
      return states.isReady && states.symptomCount > 0;
    } catch (error) {
      console.error('canUpdateChart 검증 오류:', error);
      return false;
    }
  };

  return {
    headers,
    rows,
    hasValidData,
    hasValidClinicalHeaders,
    hasValidPatientData,
    patientRows,
    totalPatients,
    symptomStats,
    sortedSymptomStats,
    chartStates,
    canUpdateChart
  };
}
