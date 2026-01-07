// usePatientStats.js - 환자 통계 계산 로직
import { computed } from 'vue';
import { useEpidemicStore } from '../../../stores/epidemicStore';
import { useSettingsStore } from '../../../stores/settingsStore';

export function usePatientStats() {
  const epidemicStore = useEpidemicStore();
  const settingsStore = useSettingsStore();
  
  const headers = computed(() => epidemicStore.headers || { basic: [] });
  const rows = computed(() => epidemicStore.rows || []);
  const isConfirmedCaseColumnVisible = computed(() => settingsStore.isConfirmedCaseColumnVisible);

  // 유효한 데이터가 있는 행만 필터링
  const filteredRows = computed(() => {
    const currentRows = rows.value || [];
    return currentRows.filter((row) => {
      if (!row) return false;
      return (
        (row.isPatient !== undefined && row.isPatient !== '') ||
        (row.basicInfo && row.basicInfo.some(cell => cell !== '' && cell !== null && cell !== undefined)) ||
        (row.clinicalSymptoms && row.clinicalSymptoms.some(cell => cell !== '' && cell !== null && cell !== undefined)) ||
        (row.symptomOnset !== undefined && row.symptomOnset !== '') ||
        (row.dietInfo && row.dietInfo.some(cell => cell !== '' && cell !== null && cell !== undefined))
      );
    });
  });

  // 총 대상자 수
  const totalParticipants = computed(() => filteredRows.value.length);

  // 환자 수
  const totalPatients = computed(() => {
    const currentRows = filteredRows.value;
    if (currentRows.length === 0) return 0;
    
    let count = 0;
    for (const row of currentRows) {
      if (row && String(row.isPatient) === '1') {
        count++;
      }
    }
    return count;
  });

  // 발병률
  const attackRate = computed(() => {
    const participants = totalParticipants.value;
    const patients = totalPatients.value;
    if (participants === 0) return '0.0';
    return ((patients / participants) * 100).toFixed(1);
  });

  // 확진 환자 수
  const totalConfirmedCases = computed(() => {
    const currentRows = filteredRows.value;
    if (currentRows.length === 0) return 0;
    
    let count = 0;
    for (const row of currentRows) {
      if (row && String(row.isConfirmedCase) === '1') {
        count++;
      }
    }
    return count;
  });

  // 확진율
  const confirmedRate = computed(() => {
    const participants = totalParticipants.value;
    const confirmed = totalConfirmedCases.value;
    if (participants === 0) return '0.0';
    return ((confirmed / participants) * 100).toFixed(1);
  });

  // 빈도 데이터
  const frequencyData = computed(() => {
    if (!headers.value?.basic || !Array.isArray(headers.value.basic)) return [];
    const currentFilteredRows = filteredRows.value;
    const currentTotalParticipants = totalParticipants.value;
    
    return headers.value.basic.map((header, headerIndex) => {
      const categories = {};
      currentFilteredRows.forEach((row) => {
        if (!row?.basicInfo || headerIndex >= row.basicInfo.length) return;
        const value = row.basicInfo[headerIndex];
        if (value === '' || value === null || value === undefined) return;
        const categoryKey = String(value);
        if (!categories[categoryKey]) {
          categories[categoryKey] = { count: 0, patientCount: 0 };
        }
        categories[categoryKey].count++;
        if (String(row.isPatient) === '1') {
          categories[categoryKey].patientCount++;
        }
      });
      
      for (const category in categories) {
        const data = categories[category];
        data.totalPercentage = currentTotalParticipants > 0 ? (data.count / currentTotalParticipants) * 100 : 0;
        data.patientPercentage = data.count > 0 ? (data.patientCount / data.count) * 100 : 0;
      }
      
      const sortedCategories = {};
      Object.keys(categories)
        .sort((a, b) => {
          const numA = Number(a);
          const numB = Number(b);
          if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
          if (!isNaN(numA) && isNaN(numB)) return -1;
          if (isNaN(numA) && !isNaN(numB)) return 1;
          return String(a).localeCompare(String(b), undefined, { numeric: true });
        })
        .forEach((key) => {
          sortedCategories[key] = categories[key];
        });
      return sortedCategories;
    });
  });

  // 특정 변수에 대한 빈도 데이터 계산 (온디맨드 최적화)
  const getFrequencyForVariable = (headerIndex) => {
    if (!headers.value?.basic || headerIndex < 0 || headerIndex >= headers.value.basic.length) {
      return {};
    }
    
    const currentFilteredRows = filteredRows.value;
    const currentTotalParticipants = totalParticipants.value;
    const categories = {};
    
    currentFilteredRows.forEach((row) => {
      if (!row?.basicInfo || headerIndex >= row.basicInfo.length) return;
      const value = row.basicInfo[headerIndex];
      if (value === '' || value === null || value === undefined) return;
      const categoryKey = String(value);
      if (!categories[categoryKey]) {
        categories[categoryKey] = { count: 0, patientCount: 0 };
      }
      categories[categoryKey].count++;
      if (String(row.isPatient) === '1') {
        categories[categoryKey].patientCount++;
      }
    });
    
    for (const category in categories) {
      const data = categories[category];
      data.totalPercentage = currentTotalParticipants > 0 ? (data.count / currentTotalParticipants) * 100 : 0;
      data.patientPercentage = data.count > 0 ? (data.patientCount / data.count) * 100 : 0;
    }
    
    const sortedCategories = {};
    Object.keys(categories)
      .sort((a, b) => {
        const numA = Number(a);
        const numB = Number(b);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        if (!isNaN(numA) && isNaN(numB)) return -1;
        if (isNaN(numA) && !isNaN(numB)) return 1;
        return String(a).localeCompare(String(b), undefined, { numeric: true });
      })
      .forEach((key) => {
        sortedCategories[key] = categories[key];
      });
    
    return sortedCategories;
  };

  return {
    headers,
    rows,
    isConfirmedCaseColumnVisible,
    filteredRows,
    totalParticipants,
    totalPatients,
    attackRate,
    totalConfirmedCases,
    confirmedRate,
    frequencyData,
    getFrequencyForVariable
  };
}
