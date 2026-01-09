import { ref, computed, Ref, ComputedRef } from 'vue';
import { useEpidemicStore } from '../../../stores/epidemicStore';
import { useSettingsStore } from '../../../stores/settingsStore';
import reportTemplate from '../../../templates/reportTemplate';
import { createComponentLogger } from '../../../utils/logger';
import { 
  loadTemplateSection0, 
  replacePlaceholders,
  createHwpxFromTemplate,
  downloadHwpxFile
} from '../../../utils/hwpxProcessor';
import { ReportData, StudyDesign, AnalysisResultItem, SymptomStat, StatAnalysisText } from '../../../types/report';

const logger = createComponentLogger('ReportWriter');

export function useReportData(): ReportData {
  const epidemicStore = useEpidemicStore();
  const settingsStore = useSettingsStore();
  
  // --- Local State ---
  const studyDesign: Ref<StudyDesign> = ref(null);
  
  // --- Modals State ---
  const showAnalysisModal: Ref<boolean> = ref(false);
  const analysisModalMessage: Ref<string> = ref('');
  const pendingStudyDesign: Ref<string> = ref('');

  // --- Helper Functions ---
  function formatKoreanDate(dateObj: Date | null): string | null {
    if (!dateObj || isNaN(dateObj.getTime())) return null;
    const days = ['일','월','화','수','목','금','토'];
    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth()+1).padStart(2,'0');
    const dd = String(dateObj.getDate()).padStart(2,'0');
    const day = days[dateObj.getDay()];
    const hh = String(dateObj.getHours()).padStart(2,'0');
    return `${yyyy}년 ${mm}월 ${dd}일 (${day}요일) ${hh}시`;
  }

  function formatKoreanDateTime(dateObj: Date | null): string | null {
    if (!dateObj || isNaN(dateObj.getTime())) return null;
    const days = ['일','월','화','수','목','금','토'];
    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth()+1).padStart(2,'0');
    const dd = String(dateObj.getDate()).padStart(2,'0');
    const day = days[dateObj.getDay()];
    const hh = String(dateObj.getHours()).padStart(2,'0');
    const mi = String(dateObj.getMinutes()).padStart(2,'0');
    return `${yyyy}년 ${mm}월 ${dd}일 (${day}요일) ${hh}시 ${mi}분`;
  }

  // --- Basic Data getters ---
  const rows = computed(() => epidemicStore.rows || []);
  const totalParticipants: ComputedRef<number> = computed(() => rows.value.length);
  const patientRows = computed(() => rows.value.filter((r: any) => r && String(r.isPatient) === '1'));
  const patientCount: ComputedRef<number> = computed(() => patientRows.value.length);
  const confirmedRows = computed(() => rows.value.filter((r: any) => r && String(r.isConfirmedCase) === '1'));
  const confirmedCount: ComputedRef<number | null> = computed(() => {
    if (!settingsStore.isConfirmedCaseColumnVisible) return null;
    return confirmedRows.value.length;
  });

  const caseAttackRate: ComputedRef<string | null> = computed(() => epidemicStore.getCaseAttackRate);
  const patientAttackRate: ComputedRef<string | null> = computed(() => epidemicStore.getPatientAttackRate);
  const confirmedAttackRate: ComputedRef<string | null> = computed(() => {
    if (!settingsStore.isConfirmedCaseColumnVisible || totalParticipants.value === 0) return null;
    if (confirmedCount.value === null) return null;
    return ((confirmedCount.value / totalParticipants.value) * 100).toFixed(1);
  });

  const exposureDate: ComputedRef<string | null> = computed(() => {
    // @ts-ignore
    const raw = settingsStore.exposureDate || settingsStore.getExposureDate; 
    if (!raw) return null;
    if (typeof raw === 'string' && raw.includes('~')) {
      const [start, end] = raw.split('~').map(s => new Date(s.trim()));
      return `${formatKoreanDate(start)} ~ ${formatKoreanDate(end)}`;
    }
    const dt = new Date(raw);
    return formatKoreanDate(dt);
  });

  const firstCaseDate: ComputedRef<string | null> = computed(() => {
    const dt = epidemicStore.getFirstCaseDate;
    if (!dt) return null;
    return formatKoreanDate(new Date(dt));
  });

  const meanIncubation: ComputedRef<string | null> = computed(() => {
    const pRows = rows.value.filter((r: any) => r && String(r.isPatient) === '1');
    const isIndividual = settingsStore.isIndividualExposureColumnVisible;
    
    let durations: number[] = [];
    
    if (isIndividual) {
      durations = pRows.map((row: any) => {
        if (!row.symptomOnset || !row.individualExposureTime) return null;
        const onset = new Date(row.symptomOnset);
        const exposure = new Date(row.individualExposureTime);
        if (isNaN(onset.getTime()) || isNaN(exposure.getTime()) || onset < exposure) return null;
        return onset.getTime() - exposure.getTime();
      }).filter((duration: number | null): duration is number => duration !== null);
    } else {
      const exposureDateTime = settingsStore.exposureDateTime; 
      if (!exposureDateTime) return null;
      
      const exposureDate = new Date(exposureDateTime);
      if (isNaN(exposureDate.getTime())) return null;
      
      durations = pRows.map((row: any) => {
        if (!row.symptomOnset) return null;
        const onset = new Date(row.symptomOnset);
        if (isNaN(onset.getTime()) || onset < exposureDate) return null;
        return onset.getTime() - exposureDate.getTime();
      }).filter((duration: number | null): duration is number => duration !== null);
    }
    
    if (durations.length === 0) return null;
    
    const sum = durations.reduce((acc, val) => acc + val, 0);
    const avgDuration = sum / durations.length;
    return (avgDuration / 3600000).toFixed(1);
  });

  const suspectedSource = computed(() => {
    const selectedFoods = settingsStore.selectedSuspectedFoods;
    console.log('[useReportData] getSelectedSuspectedFoods:', selectedFoods);
    if (selectedFoods && selectedFoods.trim()) {
      return selectedFoods;
    }
    return settingsStore.suspectedSource;
  });

  // --- Analysis Status ---
  const analysisResultsAll = computed(() => settingsStore.analysisResults || {});
  
  const analysisStatus = computed(() => {
    const results = analysisResultsAll.value;
    if (!results || (!results.caseControl && !results.cohort)) {
      return 'no-analysis';
    }
    
    const caseControlResults: AnalysisResultItem[] = results.caseControl || [];
    const hasCaseControlData = caseControlResults.some(r => {
      return (r.pValue !== null && r.pValue !== undefined) || 
             (r.item && r.item !== 'N/A') ||
             (r.oddsRatio && r.oddsRatio !== 'N/A');
    });
    
    const cohortResults: AnalysisResultItem[] = results.cohort || [];
    const hasCohortData = cohortResults.some(r => {
      return (r.pValue !== null && r.pValue !== undefined) || 
             (r.item && r.item !== 'N/A') ||
             (r.relativeRisk && r.relativeRisk !== 'N/A');
    });
    
    if (hasCaseControlData && hasCohortData) {
      return 'both-available';
    } else if (hasCaseControlData) {
      return 'case-control-only';
    } else if (hasCohortData) {
      return 'cohort-only';
    } else {
      return 'no-valid-data';
    }
  });

  // --- Methods ---
  function handleStudyDesignChange(newDesign: StudyDesign) {
    if (studyDesign.value === newDesign) return;
    
    const results = analysisResultsAll.value;
    const designResults: AnalysisResultItem[] = newDesign === 'case-control' ? (results?.caseControl || []) : (results?.cohort || []);
    
    const hasValidData = designResults.some(r => {
      return (r.pValue !== null && r.pValue !== undefined) || 
             (r.item && r.item !== 'N/A') ||
             (newDesign === 'case-control' ? 
               (r.oddsRatio && r.oddsRatio !== 'N/A') : 
               (r.relativeRisk && r.relativeRisk !== 'N/A'));
    });
    
    if (!hasValidData) {
      const designText = newDesign === 'case-control' ? '환자-대조군' : '후향적 코호트';
      analysisModalMessage.value = `${designText} 연구 분석이 완료되지 않았습니다.`;
      pendingStudyDesign.value = newDesign || '';
      showAnalysisModal.value = true;
      return;
    }
    
    studyDesign.value = newDesign;
  }

  function closeAnalysisModal() {
    showAnalysisModal.value = false;
    analysisModalMessage.value = '';
    pendingStudyDesign.value = '';
  }

  // --- Render Helpers AND Data Access ---

  function getDesignResults(): AnalysisResultItem[] {
    return studyDesign.value === 'case-control' ? (analysisResultsAll.value.caseControl || []) : (analysisResultsAll.value.cohort || []);
  }

  const suspectedFoodsStr = computed(() => settingsStore.selectedSuspectedFoods || '');
  function parseSuspectedFoods(): string[] {
    return suspectedFoodsStr.value.split(',').map((f: string) => f.trim()).filter((f: string) => f);
  }

  const foodItemCount = computed(() => getDesignResults().length);
  const hasTooManyFoodItems = computed(() => foodItemCount.value > 34);

  function generateFoodIntakeText(): string {
    const results = getDesignResults();
    if (!results || !results.length) return '';
    
    const filtered = results.filter(r => r.pValue !== null && r.pValue !== undefined && r.pValue < 0.05);
    if (!filtered.length) return '';
    
    const metric = studyDesign.value==='case-control' ? 'OR' : 'RR';
    const parts = filtered.map(r => {
      const pVal = (typeof r.pValue === 'number') ? r.pValue : parseFloat(String(r.pValue));
      const pValueText = pVal < 0.001 ? '<0.001' : pVal.toFixed(3);
      const metricValue = studyDesign.value === 'case-control' ? (r.oddsRatio || 'N/A') : (r.relativeRisk || 'N/A');
      const lowerCI = studyDesign.value === 'case-control' ? (r.ci_lower || 'N/A') : (r.rr_ci_lower || 'N/A');
      const upperCI = studyDesign.value === 'case-control' ? (r.ci_upper || 'N/A') : (r.rr_ci_upper || 'N/A');
      return `${r.item || 'N/A'} (p = ${pValueText}, ${metric} = ${metricValue} (${lowerCI} - ${upperCI}))`;
    });
    
    return `식품 섭취력에 따른 환례 연관성 분석 결과, ${parts.join(', ')}이 통계적으로 유의한 연관성을 보였다.`;
  }

  const foodIntakeAnalysis = computed(() => {
    if (!studyDesign.value) {
      return '<div class="placeholder-table"><strong>식품 섭취력 분석</strong><br/><small>조사 디자인을 먼저 선택해주세요.</small></div>';
    }
    
    const results = analysisResultsAll.value;
    if (!results) {
      const designText = studyDesign.value === 'case-control' ? '환자-대조군' : '후향적 코호트';
      return `<div class="placeholder-table"><strong>식품 섭취력 분석</strong><br/><small>${designText} 연구 분석 결과가 없습니다.<br/>${designText === '환자-대조군' ? 'CaseControl' : 'CohortStudy'} 탭에서 통계 분석을 실행한 후 확인하세요.</small></div>`;
    }
    
    const designResults = getDesignResults();
    if(!designResults.length) {
      const designText = studyDesign.value === 'case-control' ? '환자-대조군' : '후향적 코호트';
      return `<div class="placeholder-table"><strong>식품 섭취력 분석</strong><br/><small>${designText} 연구 분석 결과가 없습니다.<br/>${designText === '환자-대조군' ? 'CaseControl' : 'CohortStudy'} 탭에서 통계 분석을 실행한 후 확인하세요.</small></div>`;
    }

    const hasValidData = designResults.some(r => {
      return (r.pValue !== null && r.pValue !== undefined) || 
             (r.item && r.item !== 'N/A') ||
             (studyDesign.value === 'case-control' ? 
               (r.oddsRatio && r.oddsRatio !== 'N/A') : 
               (r.relativeRisk && r.relativeRisk !== 'N/A'));
    });
  
    if (!hasValidData) {
      const designText = studyDesign.value === 'case-control' ? '환자-대조군' : '후향적 코호트';
      return `<div class="placeholder-table"><strong>식품 섭취력 분석</strong><br/><small>${designText} 연구 분석 결과가 없습니다.<br/>${designText === '환자-대조군' ? 'CaseControl' : 'CohortStudy'} 탭에서 통계 분석을 실행한 후 확인하세요.</small></div>`;
    }
  
    return generateFoodIntakeText();
  });

  // --- Statistics Text Building ---
  const analysisOptions = computed(() => settingsStore.analysisOptions || { statMethod: 'chi-square', haldaneCorrection: false });
  const yatesSettings = computed(() => settingsStore.yatesCorrectionSettings || { caseControl: false, cohort: false });

  function getStatMethodText(method: string) {
    switch (method) {
    case 'chi-square': return '카이제곱검정을 통해';
    case 'chi-fisher': return '카이제곱검정 및 피셔의 정확검정을 통해';
    case 'yates': return 'Yates의 연속성 보정을 적용한 카이제곱검정을 통해';
    case 'yates-fisher': return 'Yates의 연속성 보정을 적용한 카이제곱검정과 피셔의 정확검정을 통해';
    default: return '';
    }
  }

  function buildStatAnalysisText(): StatAnalysisText {
    const base = '통계분석은 전남대학교 의과대학 예방의학교실 및 광주, 전남 감염병관리지원단에서 제공하는 역학조사 자료 전문 분석 프로그램(Easy-Epidemiology Web)을 이용하여 진행되었다.';
    if (!studyDesign.value) {
      return { base, method: '조사 디자인을 선택한 후 통계 분석을 진행하세요.' };
    }
    const currentYatesSetting = studyDesign.value === 'case-control' ? yatesSettings.value.caseControl : yatesSettings.value.cohort;
    const statMethod = currentYatesSetting ? 'yates' : 'chi-square';
    
    const methodText = getStatMethodText(statMethod);
    let secondSentence = '';
    if (studyDesign.value === 'case-control') {
      secondSentence = `교차비(OR) 및 95% 신뢰 구간을 계산하였으며, ${methodText} 노출요인과 질병 연관성의 통계적 유의성을 확인하였다.`;
    } else {
      secondSentence = `상대위험도(RR) 및 95% 신뢰 구간을 계산하였으며, ${methodText} 노출요인과 질병 연관성의 통계적 유의성을 확인하였다.`;
    }
    let corrSentence = '';
    if (analysisOptions.value.haldaneCorrection) {
      const metric = studyDesign.value === 'case-control' ? '오즈비' : '상대위험도';
      corrSentence = ` 교차표의 특정 셀 빈도가 0인 경우, ${metric} 및 신뢰구간 계산 시 Haldane - Anscombe correction을 적용하였다.`;
    }
    return { base, method: `${secondSentence}${corrSentence}` };
  }

  // --- Chart & Incubation logic ---
  const epidemicChartSettings = computed(() => settingsStore.epidemicCurveSettings);
  const hasEpidemicChart = computed(() => epidemicChartSettings.value?.reportChartDataUrl);
  const hasIncubationChart = computed(() => epidemicChartSettings.value?.reportIncubationChartDataUrl);
  
  const hasMainSymptomsTable = computed(() => {
    const pRows = rows.value.filter((r: any) => r && String(r.isPatient) === '1');
    const clinicalHeaders = epidemicStore.headers?.clinical || [];
    if (!pRows.length || !clinicalHeaders.length) return false;
    
    const symptomStats = clinicalHeaders.map((symptom: any, index: number) => {
      const count = pRows.filter((row: any) => row.clinicalSymptoms && row.clinicalSymptoms[index] === '1').length;
      return count;
    }).filter((count: number) => count > 0);
    
    return symptomStats.length > 0;
  });

  const getChartImagePath = () => (epidemicChartSettings.value && epidemicChartSettings.value.reportChartDataUrl) ? epidemicChartSettings.value.reportChartDataUrl : null;
  const getIncubationChartImagePath = () => (epidemicChartSettings.value && epidemicChartSettings.value.reportIncubationChartDataUrl) ? epidemicChartSettings.value.reportIncubationChartDataUrl : null;

  function generateIncubationExposureText(): string {
    const selectedList = parseSuspectedFoods();
    const suspected = selectedList.length ? selectedList.join(', ') : (suspectedSource.value || '--');
    const isIndividual = settingsStore.isIndividualExposureColumnVisible;
    const patientRowsArr = patientRows.value;
    const fmt = (num: any) => (num === null || num === undefined || isNaN(num) ? '--' : Number(num).toFixed(1));
    const durations: number[] = [];
    
    const exposureSingleStr = settingsStore.exposureDateTime;
    let exposureSingleDate: Date | null = null;
    if (!isIndividual && exposureSingleStr && !exposureSingleStr.includes('~')) {
      const normalized = exposureSingleStr.includes('T') ? exposureSingleStr : exposureSingleStr.replace(' ', 'T');
      const d = new Date(normalized);
      if (!isNaN(d.getTime())) exposureSingleDate = d;
    }
    let exposureRangeStart: Date | null = null;
    let exposureRangeEnd: Date | null = null;
    patientRowsArr.forEach((row: any) => {
      if (!row || !row.symptomOnset) return;
      const onset = new Date(row.symptomOnset.includes('T') ? row.symptomOnset : row.symptomOnset.replace(' ', 'T'));
      if (isNaN(onset.getTime())) return;
      let expDate: Date | null = null;
      if (isIndividual) {
        if (!row.individualExposureTime) return;
        expDate = new Date(row.individualExposureTime.includes('T') ? row.individualExposureTime : row.individualExposureTime.replace(' ', 'T'));
      } else {
        expDate = exposureSingleDate;
      }
      if (!expDate || isNaN(expDate.getTime()) || onset < expDate) return;
      const diffHours = (onset.getTime() - expDate.getTime()) / 3600000;
      durations.push(diffHours);
      if (isIndividual) {
        if (!exposureRangeStart || expDate < exposureRangeStart) exposureRangeStart = expDate;
        if (!exposureRangeEnd || expDate > exposureRangeEnd) exposureRangeEnd = expDate;
      }
    });

    if (!durations.length) return '<div class="placeholder-table">잠복기/노출 데이터가 부족합니다.</div>';

    durations.sort((a,b) => a-b);
    const minH = durations[0];
    const maxH = durations[durations.length-1];
    const meanH = durations.reduce((a,b) => a+b,0)/durations.length;
    const medianH = durations.length%2===1 ? durations[(durations.length-1)/2] : (durations[durations.length/2 -1]+durations[durations.length/2])/2;

    if (!isIndividual) {
      const expTxt = exposureSingleDate ? formatKoreanDateTime(exposureSingleDate) : '--';
      return `역학조사 결과, 감염원은 ${suspected}으로 추정되었으며, 노출 시점은 ${expTxt}으로 추정되었다. 이 시점을 기준으로 증상 발생까지의 평균 잠복기는 ${fmt(meanH)}시간으로, 최소 ${fmt(minH)}시간, 최대 ${fmt(maxH)}시간, 중앙값 ${fmt(medianH)}시간으로 나타났다.`;
    } else {
      const startTxt = exposureRangeStart ? formatKoreanDateTime(exposureRangeStart) : '--';
      const endTxt = exposureRangeEnd ? formatKoreanDateTime(exposureRangeEnd) : '--';
      return `역학조사 결과, 감염원은 ${suspected}으로 추정되었으며, 노출 시점은 ${startTxt}부터 ${endTxt}까지의 범위로 파악되었다. 이 기간 내 노출된 환례의 증상 발생까지의 평균 잠복기는 ${fmt(meanH)}시간이었으며, 최소 ${fmt(minH)}시간, 최대 ${fmt(maxH)}시간, 중앙값 ${fmt(medianH)}시간으로 나타났다.`;
    }
  }

  const incubationExposureText = computed(() => generateIncubationExposureText());

  // --- Rendered HTML ---
  const firstCaseDateTime: ComputedRef<string | null> = computed(() => {
    const onsets = rows.value.map((r: any) => r?.symptomOnset).filter(Boolean).map((ts: string) => new Date(ts));
    if (!onsets.length) return null;
    const earliest = new Date(Math.min(...onsets.map((d: Date) => d.getTime())));
    return formatKoreanDateTime(earliest);
  });
  
  const lastCaseDateTime: ComputedRef<string | null> = computed(() => {
    const onsets = rows.value.map((r: any) => r?.symptomOnset).filter(Boolean).map((ts: string) => new Date(ts));
    if (!onsets.length) return null;
    const latest = new Date(Math.max(...onsets.map((d: Date) => d.getTime())));
    return formatKoreanDateTime(latest);
  });

  const symptomList: ComputedRef<string | null> = computed(() => {
    if (!rows.value.length) return null;
    const onsetsWithIndex = rows.value.map((row: any, idx: number) => ({ idx, onset: row?.symptomOnset }));
    const valid = onsetsWithIndex.filter((o: any) => o.onset);
    if (!valid.length) return null;
    const earliestIdx = valid.reduce((prev: any, curr: any) => new Date(prev.onset) < new Date(curr.onset) ? prev : curr).idx;
    const earliestRow = rows.value[earliestIdx];
    if (!earliestRow?.clinicalSymptoms) return null;
    const clinicalHeaders = epidemicStore.headers?.clinical || [];
    const clinicalSymptoms = earliestRow.clinicalSymptoms;
    if (!Array.isArray(clinicalSymptoms)) return null;
    const list = clinicalSymptoms
      .map((val: any, idx: number) => String(val) === '1' ? (clinicalHeaders[idx] || `증상${idx+1}`) : null)
      .filter(Boolean);
    return list.join(', ');
  });

  const getSymptomStats = (): SymptomStat[] | null => {
    if (!rows.value.length || !patientCount.value) return null;
    const pRows = rows.value.filter((r: any) => r && String(r.isPatient) === '1');
    const clinicalHeaders = epidemicStore.headers?.clinical || [];
    if (!clinicalHeaders.length) return null;
    const symptomStats = clinicalHeaders.map((symptom: string, index: number) => {
      const count = pRows.filter((row: any) => row.clinicalSymptoms && row.clinicalSymptoms[index] === '1').length;
      const percentage = patientCount.value > 0 ? ((count / patientCount.value) * 100).toFixed(1) : '0.0';
      return { symptom, count, percentage };
    }).filter((stat: SymptomStat) => stat.count > 0).sort((a: SymptomStat, b: SymptomStat) => b.count - a.count);
    return symptomStats.length > 0 ? symptomStats : null;
  };

  const generateMainSymptomsTable = (): string => {
    const symptomStats = getSymptomStats();
    if (!symptomStats) return '<div class="placeholder-table">증상 데이터가 없습니다.</div>';
    return symptomStats.map(stat => 
      `<tr>
        <td>${stat.symptom}</td>
        <td style="text-align: center;">${stat.count}</td>
        <td style="text-align: center;">${stat.percentage}%</td>
      </tr>`
    ).join('');
  };

  // --- HWPX Generation Logic ---

  function generateCaseControlTableData(): Record<string, string> {
    const results = getDesignResults();
    const tableData: Record<string, string> = {};
    const MAX_ROWS = 34;
    // 만약 34개 초과면 모든 플레이스홀더를 빈 문자열로 채움
    if (results.length > MAX_ROWS) {
      for (let i = 1; i <= MAX_ROWS; i++) {
        tableData[`%F${i}`] = ''; tableData[`%C${i}`] = ''; tableData[`%CN${i}`] = ''; tableData[`%CT${i}`] = '';
        tableData[`%O${i}`] = ''; tableData[`%ON${i}`] = ''; tableData[`%OT${i}`] = ''; tableData[`%P${i}`] = '';
        tableData[`%OR${i}`] = ''; tableData[`%L${i}`] = ''; tableData[`%U${i}`] = '';
      }
      return tableData;
    }
    for (let i = 1; i <= MAX_ROWS; i++) {
      const result = results[i - 1];
      if (result) {
        tableData[`%F${i}`] = result.item || '';
        tableData[`%C${i}`] = String(result.b_obs || '0');
        tableData[`%CN${i}`] = String(result.c_obs || '0');
        tableData[`%CT${i}`] = String(result.rowTotal_Case || '0');
        tableData[`%O${i}`] = String(result.e_obs || '0');
        tableData[`%ON${i}`] = String(result.f_obs || '0');
        tableData[`%OT${i}`] = String(result.rowTotal_Control || '0');
        
        let pValText = 'N/A';
        if (result.pValue !== null && result.pValue !== undefined) {
             const v = typeof result.pValue === 'number' ? result.pValue : parseFloat(String(result.pValue));
             pValText = v < 0.01 ? '<0.001' : v.toFixed(3);
        }
        tableData[`%P${i}`] = pValText;
        
        tableData[`%OR${i}`] = String(result.oddsRatio || 'N/A');
        tableData[`%L${i}`] = String(result.ci_lower || 'N/A');
        tableData[`%U${i}`] = String(result.ci_upper || 'N/A');
      } else {
        tableData[`%F${i}`] = ''; tableData[`%C${i}`] = ''; tableData[`%CN${i}`] = ''; tableData[`%CT${i}`] = '';
        tableData[`%O${i}`] = ''; tableData[`%ON${i}`] = ''; tableData[`%OT${i}`] = ''; tableData[`%P${i}`] = '';
        tableData[`%OR${i}`] = ''; tableData[`%L${i}`] = ''; tableData[`%U${i}`] = '';
      }
    }
    return tableData;
  }

  function generateCohortTableData(): Record<string, string> {
    const results = getDesignResults();
    const tableData: Record<string, string> = {};
    const MAX_ROWS = 34;
    if (results.length > MAX_ROWS) {
      for (let i = 1; i <= MAX_ROWS; i++) {
        tableData[`%F${i}`] = ''; tableData[`%E${i}`] = ''; tableData[`%EP${i}`] = ''; tableData[`%ER${i}`] = '';
        tableData[`%U${i}`] = ''; tableData[`%UP${i}`] = ''; tableData[`%UR${i}`] = ''; tableData[`%P${i}`] = '';
        tableData[`%RR${i}`] = ''; tableData[`%L${i}`] = ''; tableData[`%U${i}`] = '';
      }
      return tableData;
    }
    for (let i = 1; i <= MAX_ROWS; i++) {
      const result = results[i - 1];
      if (result) {
        tableData[`%F${i}`] = result.item || '';
        tableData[`%E${i}`] = String(result.rowTotal_Exposed || '0');
        tableData[`%EP${i}`] = String(result.a_obs || '0');
        tableData[`%ER${i}`] = String(result.incidence_exposed_formatted || '0.0');
        tableData[`%U${i}`] = String(result.rowTotal_Unexposed || '0');
        tableData[`%UP${i}`] = String(result.c_obs || '0');
        tableData[`%UR${i}`] = String(result.incidence_unexposed_formatted || '0.0');
        
        let pValText = 'N/A';
        if (result.pValue !== null && result.pValue !== undefined) {
             const v = typeof result.pValue === 'number' ? result.pValue : parseFloat(String(result.pValue));
             pValText = v < 0.001 ? '<0.001' : v.toFixed(3);
        }
        tableData[`%P${i}`] = pValText;
        
        tableData[`%RR${i}`] = String(result.relativeRisk || 'N/A');
        tableData[`%L${i}`] = String(result.rr_ci_lower || 'N/A');
        tableData[`%U${i}`] = String(result.rr_ci_upper || 'N/A');
      } else {
        tableData[`%F${i}`] = ''; tableData[`%E${i}`] = ''; tableData[`%EP${i}`] = ''; tableData[`%ER${i}`] = '';
        tableData[`%U${i}`] = ''; tableData[`%UP${i}`] = ''; tableData[`%UR${i}`] = ''; tableData[`%P${i}`] = '';
        tableData[`%RR${i}`] = ''; tableData[`%L${i}`] = ''; tableData[`%U${i}`] = '';
      }
    }
    return tableData;
  }

  async function downloadHwpxReport() {
    try {
      logger.info('HWPX 파일 생성 시작...');
      const section0Text = await loadTemplateSection0(studyDesign.value ?? undefined);
      const statAnalysisText = buildStatAnalysisText();
      const designText = studyDesign.value === 'case-control' ? '환자-대조군 연구' : '후향적 코호트 연구';
      const foodIntakeText = foodIntakeAnalysis.value || generateFoodIntakeText() || '식품 섭취력 분석 내용을 입력하세요.';
      const incubationText = generateIncubationExposureText() || '미상';
      const symptomStats = getSymptomStats();
      const replacements: Record<string, string> = {
        '%사례발병률%': caseAttackRate.value ? `${caseAttackRate.value}%` : '미상',
        '%추정감염원%': suspectedSource.value || '미상',
        '%평균잠복기%': meanIncubation.value ? `${meanIncubation.value}시간` : '미상',
        '%환자발병률%': patientAttackRate.value ? `${patientAttackRate.value}%` : '미상',
        '%%%추정위험노출일시%%%': exposureDate.value || '미상',
        '%%%최초사례발생일시%%%': firstCaseDate.value || '미상',
        '%조사디자인%': designText,
        '% % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % %식품섭취력분석% % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % %': foodIntakeText,
        '% % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % %잠복기및추정위험노출시기% % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % %': incubationText,
        '% % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % %최초환자발생일시% % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % %': `사례정의에 부합하는 최초 사례는 ${firstCaseDateTime.value || '미상'}경에 ${symptomList.value || '미상'} 증상이 발생하였다. 이후 ${lastCaseDateTime.value || '미상'}까지 총 ${patientCount.value || '미상'}명의 환례가 있었다.`,
        '% % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % %통계분석에사용한분석기법% % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % %': statAnalysisText.method,
        '%TOTAL_COUNT%': String(patientCount.value || '0')
      };
      // 발병률결과 키 추가
      replacements['% % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % %발병률결과% % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % %'] = `조사에 포함된 대상자 ${totalParticipants.value || '미상'}명 중 사례 수는 ${patientCount.value || '미상'}명으로 사례 발병률은 ${caseAttackRate.value ? `${caseAttackRate.value}%` : '미상'}이다. 이 중, 인체 검사 결과 검출된 확진환자 수는 ${confirmedCount.value || '미상'}명으로 확진환자 발병률은 ${confirmedAttackRate.value ? `${confirmedAttackRate.value}%` : '미상'}이다.`;

      if (studyDesign.value === 'case-control') {
        Object.assign(replacements, generateCaseControlTableData());
      } else if (studyDesign.value === 'cohort') {
        Object.assign(replacements, generateCohortTableData());
      }
      
      if (symptomStats) {
        for (let i = 0; i < Math.min(symptomStats.length, 10); i++) {
          const stat = symptomStats[i];
          replacements[`%SYMPTOM_${i + 1}%`] = stat.symptom;
          replacements[`%COUNT_${i + 1}%`] = stat.count.toString();
          replacements[`%PERCENT_${i + 1}%`] = `${stat.percentage}%`;
        }
      }
      for (let i = (symptomStats ? symptomStats.length : 0) + 1; i <= 10; i++) {
        replacements[`%SYMPTOM_${i}%`] = ''; replacements[`%COUNT_${i}%`] = ''; replacements[`%PERCENT_${i}%`] = '';
      }
      
      const modifiedXmlText = replacePlaceholders(section0Text, replacements);
      const settings = settingsStore.epidemicCurveSettings;
      const chartImages: any = {};
      
      if (settings.reportIncubationChartDataUrl) {
        chartImages.incubationChart = {
          dataUrl: settings.reportIncubationChartDataUrl,
          width: settings.incubationChartWidth || 1100
        };
      }
      if (settings.reportChartDataUrl) {
        chartImages.epidemicChart = {
          dataUrl: settings.reportChartDataUrl,
          width: settings.chartWidth || 1100
        };
      }
      
      const hwpxBlob = await createHwpxFromTemplate(modifiedXmlText, chartImages, studyDesign.value ?? undefined);
      const filename = `역학조사보고서_${new Date().toISOString().slice(0, 10)}.hwpx`;
      downloadHwpxFile(hwpxBlob, filename);
      logger.info('HWPX 파일 생성 완료!');
    } catch (error: any) {
      logger.error('HWPX 파일 생성 오류:', error);
      alert(`보고서 생성 중 오류가 발생했습니다: ${error.message}`);
    }
  }

  function generateFoodIntakeTable(): string {
    const results = getDesignResults();
    if (!results || results.length === 0) {
      const designText = studyDesign.value === 'case-control' ? '환자-대조군' : '후향적 코호트';
      return `<div class="placeholder-table"><strong>식품 섭취력 분석 테이블</strong><br/><small>${designText} 연구 분석 결과가 없습니다.<br/>${designText === '환자-대조군' ? 'CaseControl' : 'CohortStudy'} 탭에서 통계 분석을 실행한 후 확인하세요.</small></div>`;
    }
    const hasValidData = results.some(r => {
      return (r.pValue !== null && r.pValue !== undefined) || (r.item && r.item !== 'N/A') ||
           (studyDesign.value === 'case-control' ? (r.oddsRatio && r.oddsRatio !== 'N/A') : (r.relativeRisk && r.relativeRisk !== 'N/A'));
    });
    if (!hasValidData) {
      const designText = studyDesign.value === 'case-control' ? '환자-대조군' : '후향적 코호트';
      return `<div class="placeholder-table"><strong>식품 섭취력 분석 테이블</strong><br/><small>${designText} 연구 분석 결과가 없습니다.<br/>${designText === '환자-대조군' ? 'CaseControl' : 'CohortStudy'} 탭에서 통계 분석을 실행한 후 확인하세요.</small></div>`;
    }

    const filtered = results;
    const isCase = studyDesign.value === 'case-control';
    let tableHtml = '';
    if(isCase){
      tableHtml += '<table class="summary-table"><tr><th rowspan="2">요인(식단)</th><th colspan="3">환자군</th><th colspan="3">대조군</th><th rowspan="2">카이제곱<br/>P-value</th><th rowspan="2">오즈비<br/>(OR)</th><th colspan="2">95% 신뢰구간</th></tr><tr><th>섭취자</th><th>비섭취자</th><th>합계</th><th>섭취자</th><th>비섭취자</th><th>합계</th><th>하한</th><th>상한</th></tr>';
      filtered.forEach(r => {
        let pValueText = 'N/A';
        if (r.pValue !== null && r.pValue !== undefined) {
          const v = typeof r.pValue === 'number' ? r.pValue : parseFloat(String(r.pValue));
          pValueText = v < 0.001 ? '&lt;0.001' : v.toFixed(3);
        }
        tableHtml += `<tr><td>${r.item || 'N/A'}</td><td class="cell-count">${r.b_obs || 0}</td><td class="cell-count">${r.c_obs || 0}</td><td class="cell-total">${r.rowTotal_Case || 0}</td><td class="cell-count">${r.e_obs || 0}</td><td class="cell-count">${r.f_obs || 0}</td><td class="cell-total">${r.rowTotal_Control || 0}</td><td class="cell-stat">${pValueText}</td><td class="cell-stat">${r.oddsRatio || 'N/A'}</td><td class="cell-stat">${r.ci_lower || 'N/A'}</td><td class="cell-stat">${r.ci_upper || 'N/A'}</td></tr>`;
      });
      tableHtml += '</table>';
    } else {
      tableHtml += '<table class="summary-table"><tr><th rowspan="2">요인(식단)</th><th colspan="3">섭취자(노출군)</th><th colspan="3">비섭취자(비노출군)</th><th rowspan="2">카이제곱<br/>P-value</th><th rowspan="2">상대위험비<br/>(RR)</th><th colspan="2">95% 신뢰구간</th></tr><tr><th>대상자수</th><th>환자수</th><th>발병률(%)</th><th>대상자수</th><th>환자수</th><th>발병률(%)</th><th>하한</th><th>상한</th></tr>';
      filtered.forEach(r => {
        let pValueText = 'N/A';
        if (r.pValue !== null && r.pValue !== undefined) {
          const v = typeof r.pValue === 'number' ? r.pValue : parseFloat(String(r.pValue));
          pValueText = v < 0.001 ? '&lt;0.001' : v.toFixed(3);
        }
        tableHtml += `<tr><td>${r.item || 'N/A'}</td><td class="cell-total">${r.rowTotal_Exposed || 0}</td><td class="cell-count">${r.a_obs || 0}</td><td class="cell-stat">${r.incidence_exposed_formatted || 'N/A'}</td><td class="cell-total">${r.rowTotal_Unexposed || 0}</td><td class="cell-count">${r.c_obs || 0}</td><td class="cell-stat">${r.incidence_unexposed_formatted || 'N/A'}</td><td class="cell-stat">${pValueText}</td><td class="cell-stat">${r.relativeRisk || 'N/A'}</td><td class="cell-stat">${r.rr_ci_lower || 'N/A'}</td><td class="cell-stat">${r.rr_ci_upper || 'N/A'}</td></tr>`;
      });
      tableHtml += '</table>';
    }
    return tableHtml;
  }

  const renderedHtml = computed(() => {
    let html = reportTemplate;
    const designText = studyDesign.value === 'case-control' ? '환자-대조군 연구' : '후향적 코호트 연구';
    const statAnalysisObj = buildStatAnalysisText();
    
    const wrapPlaceholder = (value: any) => {
      if (value === '--') return value;
      return `<span class="placeholder-value">${value}</span>`;
    };
    
    const chartImagePath = getChartImagePath();
    const chartImageHtml = chartImagePath 
      ? `<img src="${chartImagePath}" alt="유행곡선 차트" style="max-width: 100%; height: auto; margin: 20px 0; border: 1px solid #ddd;" />`
      : '<div class="placeholder-chart"><strong>유행곡선 차트</strong><br/><small>EpidemicCurve 탭에서 "보고서 저장" 버튼을 클릭하여<br/>차트 이미지를 저장한 후 확인하세요.</small></div>';
      
    const incubationChartImagePath = getIncubationChartImagePath();
    const incubationChartImageHtml = incubationChartImagePath 
      ? `<img src="${incubationChartImagePath}" alt="잠복기 차트" style="max-width: 100%; height: auto; margin: 20px 0; border: 1px solid #ddd;" />`
      : '<div class="placeholder-chart"><strong>잠복기 차트</strong><br/><small>EpidemicCurve 탭에서 잠복기 차트 "보고서 저장" 버튼을 클릭하여<br/>차트 이미지를 저장한 후 확인하세요.</small></div>';
    
    const foodIntakeAnalysisHtml = `${generateFoodIntakeTable()}<p>${generateFoodIntakeText()}</p>`;

    const replacements: Record<string, string> = {
      caseAttackRate: wrapPlaceholder(caseAttackRate.value ? `${caseAttackRate.value}%` : '--'),
      patientAttackRate: wrapPlaceholder(patientAttackRate.value ? `${patientAttackRate.value}%` : '--'),
      exposureDate: wrapPlaceholder(exposureDate.value || '--'),
      firstCaseDate: wrapPlaceholder(firstCaseDate.value || '--'),
      meanIncubation: wrapPlaceholder(meanIncubation.value ? `${meanIncubation.value}시간` : '--'),
      suspectedSource: wrapPlaceholder(suspectedSource.value || (parseSuspectedFoods().join(', ') || '--')),
      studyDesign: wrapPlaceholder(designText),
      statAnalysis: `${statAnalysisObj.base} <span class="placeholder-value">${statAnalysisObj.method}</span>`,
      firstCaseDateTime: wrapPlaceholder(firstCaseDateTime.value || '--'),
      lastCaseDateTime: wrapPlaceholder(lastCaseDateTime.value || '--'),
      patientCount: wrapPlaceholder(patientCount.value || '--'),
      totalParticipants: wrapPlaceholder(totalParticipants.value || '--'),
      confirmedCount: wrapPlaceholder(confirmedCount.value || '--'),
      confirmedAttackRate: wrapPlaceholder(confirmedAttackRate.value ? `${confirmedAttackRate.value}%` : '--'),
      symptomList: wrapPlaceholder(symptomList.value || '--'),
      caseAttackRateNumeric: wrapPlaceholder(caseAttackRate.value || '--'),
      epidemicChart: chartImageHtml,
      incubationChart: incubationChartImageHtml,
      mainSymptomsTable: generateMainSymptomsTable(),
      foodIntakeAnalysis: foodIntakeAnalysis.value,
      foodIntakeAnalysisHtml,
      incubationExposureText: wrapPlaceholder(incubationExposureText.value),
      foodIntakeTable: generateFoodIntakeTable(),
      '% % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % %식품섭취력분석% % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % %': foodIntakeAnalysis.value || generateFoodIntakeText() || '식품 섭취력 분석 내용을 입력하세요.',
      '% % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % %최초환자발생일시% % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % %': `사례정의에 부합하는 최초 사례는 ${firstCaseDateTime.value || '--'}경에 ${symptomList.value || '--'} 증상이 발생하였다. 이후 ${lastCaseDateTime.value || '--'}까지 총 ${patientCount.value || '--'}명의 환례가 있었다.`,
      '% % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % %발병률결과% % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % %': `조사에 포함된 대상자 ${totalParticipants.value || '--'}명 중 사례 수는 ${patientCount.value || '--'}명으로 사례 발병률은 ${caseAttackRate.value ? `${caseAttackRate.value}%` : '--'}이다. 이 중, 인체 검사 결과 검출된 확진환자 수는 ${confirmedCount.value || '--'}명으로 확진환자 발병률은 ${confirmedAttackRate.value ? `${confirmedAttackRate.value}%` : '--'}이다.`
    };
    Object.entries(replacements).forEach(([key, val]) => {
      html = html.replace(new RegExp(`%${key}%`, 'g'), String(val ?? ''));
    });
    
    [
      'reportDate', 'fieldInvestDate', 'region', 'place', 'suspectedPathogen', 'epiCurveDate', 'finalLabDate'
    ].forEach((key) => {
      html = html.replace(new RegExp(`%${key}%`, 'g'), '');
    });
    return html;
  });

  return {
    studyDesign,
    showAnalysisModal,
    analysisModalMessage,
    pendingStudyDesign,
    analysisStatus,
    caseAttackRate,
    patientAttackRate,
    exposureDate,
    firstCaseDate,
    meanIncubation,
    suspectedSource,
    foodIntakeAnalysis,
    hasEpidemicChart,
    hasIncubationChart,
    hasMainSymptomsTable,
    foodItemCount,
    hasTooManyFoodItems,
    renderedHtml,
    
    // Actions / Methods
    handleStudyDesignChange,
    closeAnalysisModal,
    downloadHwpxReport,
    
    // Data exports for HWPX generation if needed later
    getDesignResults,
    getSymptomStats,
    parseSuspectedFoods,
    generateFoodIntakeText,
    generateIncubationExposureText,
    buildStatAnalysisText,
    generateMainSymptomsTable,
    generateCaseControlTableData,
    generateCohortTableData,
    
    // Raw Values for export
    confirmedCount,
    confirmedAttackRate,
    firstCaseDateTime,
    lastCaseDateTime,
    symptomList,
    patientCount,
    totalParticipants
  };
}
