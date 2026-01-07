import { computed, ref, watch } from 'vue';
import { useEpidemicStore } from '../../../stores/epidemicStore';
import { useSettingsStore } from '../../../stores/settingsStore';
import { jStat } from 'jstat';

export function useCaseControlStatistics() {
  const epidemicStore = useEpidemicStore();
  const settingsStore = useSettingsStore();

  // Yates 보정 토글 변수 (store에서 관리)
  const yatesSettings = computed(() => settingsStore.yatesCorrectionSettings);
  const useYatesCorrection = computed({
    get: () => yatesSettings.value?.caseControl ?? false,
    set: (value) => settingsStore.setYatesCorrectionSettings({ type: 'caseControl', enabled: value })
  });

  // Vuex 스토어에서 headers와 rows 데이터 가져오기
  const headers = computed(() => epidemicStore.headers || { diet: [] });
  const rows = computed(() => epidemicStore.rows || []);

  // 오즈비 필터링 상태
  const isOrFilterActive = ref(false);
  const orThresholds = [2, 3, 4]; // 2 → 3 → 4 → 2
  const currentOrThreshold = ref(2);

  // 오즈비 필터 토글 함수
  const toggleOrFilter = () => {
    isOrFilterActive.value = !isOrFilterActive.value;
  };

  // 오즈비 임계값 순환 함수
  const cycleOrThreshold = () => {
    const currentIndex = orThresholds.indexOf(currentOrThreshold.value);
    const nextIndex = (currentIndex + 1) % orThresholds.length;
    currentOrThreshold.value = orThresholds[nextIndex];
  };

  // Yates 보정 토글 함수
  const toggleYatesCorrection = () => {
    useYatesCorrection.value = !useYatesCorrection.value;
  };

  // --- 팩토리얼 계산 함수 ---
  const factorial = (n) => {
    if (n < 0) return NaN;
    if (n === 0 || n === 1) return 1;
    let result = 1;
    for (let i = 2; i <= n; i++) {
      result *= i;
    }
    return result;
  };

  // --- Fisher의 정확검정 계산 함수 (양측 검정) ---
  const calculateFisherExactTest = (a, b, c, d) => {
    // 2x2 분할표에서 Fisher의 정확검정 계산 (양측 검정)
    const n = a + b + c + d;
    const row1 = a + b;
    const row2 = c + d;
    const col1 = a + c;
    const col2 = b + d;
    
    // 관측된 분할표의 확률 계산
    const observedProb = (factorial(row1) * factorial(row2) * factorial(col1) * factorial(col2)) /
                        (factorial(n) * factorial(a) * factorial(b) * factorial(c) * factorial(d));
    
    let pValue = 0;
    
    // 모든 가능한 분할표에 대해 확률 계산
    for (let x = 0; x <= Math.min(row1, col1); x++) {
      const y = row1 - x;
      const z = col1 - x;
      const w = row2 - z;
      
      if (y >= 0 && z >= 0 && w >= 0) {
        // 현재 분할표의 확률
        const currentProb = (factorial(row1) * factorial(row2) * factorial(col1) * factorial(col2)) /
                           (factorial(n) * factorial(x) * factorial(y) * factorial(z) * factorial(w));
        
        // 관측된 분할표보다 극단적인 경우의 확률만 합산 (양측 검정)
        if (currentProb <= observedProb) {
          pValue += currentProb;
        }
      }
    }
    
    return pValue;
  };

  // --- 카이제곱 항 계산 함수 (Yates' 보정 포함) ---
  const calculateChiTerm = (observed, expected) => {
    // 기대빈도가 0이면 카이제곱 검정 적용 불가
    if (expected === 0) {
      console.warn(`기대빈도가 0입니다. observed: ${observed}, expected: ${expected}`);
      return 0; // 이 경우는 상위에서 canApplyChiSquare로 미리 걸러짐
    }
    
    const diff = Math.abs(observed - expected);
    // Yates' 보정: 절대값 차이에서 0.5를 빼줌 (최소 0)
    const correctedDiff = Math.max(0, diff - 0.5);
    return (correctedDiff * correctedDiff) / expected;
  };

  // --- 통계 계산 검증 함수 ---
  const validateStatistics = (result, factorName) => {
    const issues = [];
    
    // P-value 검증
    if (result.pValue !== null) {
      if (result.pValue < 0 || result.pValue > 1) {
        issues.push(`P-value 범위 오류: ${result.pValue}`);
      }
    }
    
    // Odds Ratio 검증
    if (result.oddsRatio !== 'N/A' && result.oddsRatio !== 'Inf' && result.oddsRatio !== 'Error') {
      const or = parseFloat(result.oddsRatio);
      if (isNaN(or) || or < 0) {
        issues.push(`Odds Ratio 값 오류: ${result.oddsRatio}`);
      }
    }
    
    // 신뢰구간 검증
    if (result.ci_lower !== 'N/A' && result.ci_upper !== 'N/A') {
      const lower = parseFloat(result.ci_lower);
      const upper = parseFloat(result.ci_upper);
      if (!isNaN(lower) && !isNaN(upper) && lower > upper) {
        issues.push(`신뢰구간 순서 오류: ${result.ci_lower} > ${result.ci_upper}`);
      }
    }
    
    if (issues.length > 0) {
      console.warn(`통계 검증 오류 - ${factorName}:`, issues);
    }
    
    return issues.length === 0;
  };

  // --- 분석 결과 계산 (Computed Property) ---
  const analysisResults = computed(() => {
    // 조건 완화: 식단 헤더가 없어도 기본 분석 가능하도록 수정
    if (!rows.value || rows.value.length === 0) {
      console.warn('분석을 위한 rows 데이터가 없습니다.');
      return [];
    }

    // 식단 헤더가 없으면 기본 헤더 생성
    const dietHeaders = headers.value?.diet || [];
    if (dietHeaders.length === 0) {
      console.log('식단 헤더가 없어 기본 분석을 수행합니다.');
      // 기본 식단 항목들 생성 (실제 데이터에서 추출)
      const defaultDietItems = [];
      for (let i = 0; i < 10; i++) {
        defaultDietItems.push(`식단${i + 1}`);
      }
      dietHeaders.push(...defaultDietItems);
    }

    // 95% CI를 위한 Z-score (양측 검정, 표준정규분포에서 0.975에 해당하는 값)
    const z_crit = jStat.normal.inv(0.975, 0, 1); // 약 1.96

    return dietHeaders.map((dietItem, index) => {
      const factorName = dietItem;
      let b_obs = 0, // 환자군 + 요인 노출
        c_obs = 0, // 환자군 + 요인 비노출
        e_obs = 0, // 대조군 + 요인 노출
        f_obs = 0; // 대조군 + 요인 비노출

      // 데이터 순회하며 각 셀 관측값 계산
      rows.value.forEach((row) => {
        const isPatient = row.isPatient;
        const dietValue =
          row.dietInfo && row.dietInfo.length > index
            ? row.dietInfo[index]
            : null;

        if (isPatient === '1') {
          // 환자군
          if (dietValue === '1') b_obs++;
          else if (dietValue === '0') c_obs++;
        } else if (isPatient === '0') {
          // 대조군
          if (dietValue === '1') e_obs++;
          else if (dietValue === '0') f_obs++;
        }
      });

      // 각 행/열 합계 계산
      const rowTotal_Case = b_obs + c_obs;
      const rowTotal_Control = e_obs + f_obs;
      const colTotal_Exposed = b_obs + e_obs;
      const colTotal_Unexposed = c_obs + f_obs;
      const grandTotal = rowTotal_Case + rowTotal_Control;

      // 결과 변수 초기화
      let b_exp = NaN,
        c_exp = NaN,
        e_exp = NaN,
        f_exp = NaN;
      let adj_chi = null; // Yates' 보정 카이제곱 값
      let pValue = null; // P-value
      let oddsRatio = 'N/A'; // Odds Ratio 추정치
      let ci_lower = 'N/A'; // 95% CI 하한
      let ci_upper = 'N/A'; // 95% CI 상한
      let hasCorrection = false; // 0.5 보정 적용 여부

      // --- 카이제곱 및 P-value 계산 ---
      if (grandTotal > 0) {
        // 기대 빈도 계산
        b_exp = (rowTotal_Case * colTotal_Exposed) / grandTotal;
        c_exp = (rowTotal_Case * colTotal_Unexposed) / grandTotal;
        e_exp = (rowTotal_Control * colTotal_Exposed) / grandTotal;
        f_exp = (rowTotal_Control * colTotal_Unexposed) / grandTotal;

        // 카이제곱 검정 적용 가능성 검사
        // 1. 모든 기대빈도가 0보다 커야 함
        // 2. 특정 식단의 값이 모두 같으면 (colTotal_Exposed = 0 또는 colTotal_Unexposed = 0) 검정 불가
        const canApplyChiSquare = colTotal_Exposed > 0 && colTotal_Unexposed > 0 && 
                                  rowTotal_Case > 0 && rowTotal_Control > 0 &&
                                  b_exp > 0 && c_exp > 0 && e_exp > 0 && f_exp > 0;

        if (canApplyChiSquare) {
          // 기대빈도 5미만 체크
          const hasSmallExpected = b_exp < 5 || c_exp < 5 || e_exp < 5 || f_exp < 5;
          
          if (hasSmallExpected) {
            // 기대빈도 5미만: Fisher의 정확검정 사용
            try {
              pValue = calculateFisherExactTest(b_obs, c_obs, e_obs, f_obs);
              adj_chi = null; // Fisher 검정에서는 카이제곱 값 계산 안함
              console.log(`Fisher의 정확검정 적용 - ${factorName}: 기대빈도 5미만`);
            } catch (e) {
              console.error(`Fisher's exact test calculation error for item ${factorName}:`, e);
              pValue = null;
              adj_chi = null;
            }
          } else {
            // 기대빈도 5이상: 일반 카이제곱 또는 Yates' 보정 카이제곱 검정 사용
            if (useYatesCorrection.value) {
              // Yates' 보정 카이제곱 검정 사용
              const term1 = calculateChiTerm(b_obs, b_exp);
              const term2 = calculateChiTerm(c_obs, c_exp);
              const term3 = calculateChiTerm(e_obs, e_exp);
              const term4 = calculateChiTerm(f_obs, f_exp);
              adj_chi = term1 + term2 + term3 + term4;
            } else {
              // 일반 카이제곱 검정 사용 (보정 없음)
              const term1 = ((b_obs - b_exp) * (b_obs - b_exp)) / b_exp;
              const term2 = ((c_obs - c_exp) * (c_obs - c_exp)) / c_exp;
              const term3 = ((e_obs - e_exp) * (e_obs - e_exp)) / e_exp;
              const term4 = ((f_obs - f_exp) * (f_obs - f_exp)) / f_exp;
              adj_chi = term1 + term2 + term3 + term4;
            }

            // P-value 계산 (자유도=1)
            if (isFinite(adj_chi) && adj_chi >= 0) {
              try {
                pValue = 1 - jStat.chisquare.cdf(adj_chi, 1);
                if (isNaN(pValue)) pValue = null; // 계산 불가 시 null 처리
              } catch (e) {
                console.error(`P-value calculation error for item ${factorName}:`, e);
                pValue = null;
              }
            } else {
              adj_chi = null; // 카이제곱 계산 불가 시 null 처리
            }
          }
        } else {
          // 카이제곱 검정 적용 불가 (모든 값이 동일하거나 한 그룹이 비어있음)
          adj_chi = null;
          pValue = null;
          console.log(`카이제곱 검정 적용 불가 - ${factorName}: colTotal_Exposed=${colTotal_Exposed}, colTotal_Unexposed=${colTotal_Unexposed}`);
        }
      }

      // --- Odds Ratio 및 95% CI 계산 ---
      // 카이제곱 검정이 불가능한 경우 OR 계산도 의미가 없음
      if (colTotal_Exposed > 0 && colTotal_Unexposed > 0 && 
          rowTotal_Case > 0 && rowTotal_Control > 0) {
        // 0인 셀이 있는지 확인
        const hasZeroCell = b_obs === 0 || c_obs === 0 || e_obs === 0 || f_obs === 0;

        if (hasZeroCell) {
          // 0이 있는 행에만 모든 셀에 0.5 보정 적용
          hasCorrection = true;
          const b_corrected = b_obs + 0.5;
          const c_corrected = c_obs + 0.5;
          const e_corrected = e_obs + 0.5;
          const f_corrected = f_obs + 0.5;

          // Odds Ratio 계산: OR = (b*f)/(c*e)
          const or_calc = (b_corrected * f_corrected) / (c_corrected * e_corrected);

          if (isFinite(or_calc) && or_calc > 0) {
            // OR 값 포맷팅
            oddsRatio = or_calc.toFixed(3);

            // Log Odds Ratio 계산
            const logOR = Math.log(or_calc);

            // Standard Error of Log Odds Ratio 계산: sqrt(1/b + 1/c + 1/e + 1/f)
            const se_logOR = Math.sqrt(
              1 / b_corrected + 1 / c_corrected + 1 / e_corrected + 1 / f_corrected
            );

            // 신뢰구간 계산 가능 여부 확인
            if (isFinite(se_logOR)) {
              // Log Scale에서 CI 계산
              const logCI_lower = logOR - z_crit * se_logOR;
              const logCI_upper = logOR + z_crit * se_logOR;

              // 원래 스케일(OR)로 변환 (지수 함수 적용) 및 포맷팅
              ci_lower = Math.exp(logCI_lower).toFixed(3);
              ci_upper = Math.exp(logCI_upper).toFixed(3);
            }
          } else if (or_calc === 0) {
            // OR이 0인 경우: 분모가 0이 아닌데 분자가 0인 경우
            oddsRatio = '0.000';
            ci_lower = '0.000';
            ci_upper = '0.000';

          } else {
            // OR이 무한대(Inf) 또는 계산 불가(NaN)인 경우
            if (c_corrected * e_corrected === 0 && b_corrected * f_corrected > 0) {
              oddsRatio = 'Inf';
              ci_lower = 'Inf';
              ci_upper = 'Inf';

            } else {
              oddsRatio = 'N/A';
              ci_lower = 'N/A';
              ci_upper = 'N/A';
            }
          }
        } else {
          // 0인 셀이 없는 경우 그냥 계산
          const b_corrected = b_obs;
          const c_corrected = c_obs;
          const e_corrected = e_obs;
          const f_corrected = f_obs;

          // Odds Ratio 계산: OR = (b*f)/(c*e)
          const or_calc = (b_corrected * f_corrected) / (c_corrected * e_corrected);

          if (isFinite(or_calc) && or_calc > 0) {
            // OR 값 포맷팅
            oddsRatio = or_calc.toFixed(3);

            // Log Odds Ratio 계산
            const logOR = Math.log(or_calc);

            // Standard Error of Log Odds Ratio 계산: sqrt(1/b + 1/c + 1/e + 1/f)
            const se_logOR = Math.sqrt(
              1 / b_corrected + 1 / c_corrected + 1 / e_corrected + 1 / f_corrected
            );

            // 신뢰구간 계산 가능 여부 확인
            if (isFinite(se_logOR)) {
              // Log Scale에서 CI 계산
              const logCI_lower = logOR - z_crit * se_logOR;
              const logCI_upper = logOR + z_crit * se_logOR;

              // 원래 스케일(OR)로 변환 (지수 함수 적용) 및 포맷팅
              ci_lower = Math.exp(logCI_lower).toFixed(3);
              ci_upper = Math.exp(logCI_upper).toFixed(3);
            }
          } else if (or_calc === 0) {
            // OR이 0인 경우: 분모가 0이 아닌데 분자가 0인 경우
            oddsRatio = '0.000';
            ci_lower = '0.000';
            ci_upper = '0.000';

          } else {
            // OR이 무한대(Inf) 또는 계산 불가(NaN)인 경우
            if (c_corrected * e_corrected === 0 && b_corrected * f_corrected > 0) {
              oddsRatio = 'Inf';
              ci_lower = 'Inf';
              ci_upper = 'Inf';

            } else {
              oddsRatio = 'N/A';
              ci_lower = 'N/A';
              ci_upper = 'N/A';
            }
          }
        }
      } else {
        // 환자군/대조군 또는 노출/비노출군이 없는 경우 OR 계산 불가
        oddsRatio = 'N/A';
        ci_lower = 'N/A';
        ci_upper = 'N/A';
        console.log(`OR 계산 불가 - ${factorName}: 환자군/대조군 또는 노출/비노출군이 없음`);
      }

      // --- 최종 결과 객체 반환 ---
      const result = {
        item: factorName,
        b_obs,
        c_obs,
        rowTotal_Case,
        e_obs,
        f_obs,
        rowTotal_Control,
        adj_chi,
        pValue,
        oddsRatio, // 계산된 OR 값
        ci_lower, // 계산된 CI 하한
        ci_upper, // 계산된 CI 상한
        hasCorrection // 0.5 보정 적용 여부
      };
      
      // 통계 검증 실행
      validateStatistics(result, factorName);
      
      return result;
    });
  });

  // --- 필터링된 분석 결과 (오즈비 임계값 이상) ---
  const filteredAnalysisResults = computed(() => {
    if (!isOrFilterActive.value) {
      return analysisResults.value;
    }
    
    return analysisResults.value.filter(result => {
      // 오즈비가 숫자인지 확인하고 임계값 이상인지 체크
      const orValue = parseFloat(result.oddsRatio);
      return !isNaN(orValue) && orValue >= currentOrThreshold.value;
    });
  });

  // --- Vuex: 분석 요약 업데이트 ---
  // watch를 사용하여 분석 결과가 변경될 때 store 업데이트
  watch([analysisResults, useYatesCorrection], () => {
    const fisherUsed = analysisResults.value.some(r => r.adj_chi === null && r.pValue !== null);
    const yatesUsed = useYatesCorrection.value;
    let statMethod = 'chi-square';
    if (fisherUsed && yatesUsed) statMethod = 'yates-fisher';
    else if (fisherUsed && !yatesUsed) statMethod = 'chi-fisher';
    else if (!fisherUsed && yatesUsed) statMethod = 'yates';

    const haldaneCorrectionUsed = analysisResults.value.some(r => r.hasCorrection);
    settingsStore.setAnalysisOptions({ statMethod, haldaneCorrection: haldaneCorrectionUsed });
    
    // 분석 결과를 store에 저장 (의심식단 드롭다운용)
    settingsStore.setAnalysisResults({ 
      type: 'caseControl', 
      results: analysisResults.value 
    });
  }, { immediate: true });

  return {
    headers,
    rows,
    useYatesCorrection,
    toggleYatesCorrection,
    isOrFilterActive,
    toggleOrFilter,
    currentOrThreshold,
    cycleOrThreshold,
    analysisResults,
    filteredAnalysisResults
  };
}
