import { computed, watch } from 'vue';
import { useSettingsStore } from '../../../stores/settingsStore';
import { jStat } from 'jstat';

export function useCohortAnalysis(rows, headers, useYatesCorrection) {
  const settingsStore = useSettingsStore();

  // --- Helper Functions ---

  // 팩토리얼 계산 함수
  const factorial = (n) => {
    if (n < 0) return NaN;
    if (n === 0 || n === 1) return 1;
    let result = 1;
    for (let i = 2; i <= n; i++) {
      result *= i;
    }
    return result;
  };

  // Fisher의 정확검정 계산 함수 (양측 검정)
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

  // 카이제곱 항 계산 함수 (Yates' 보정 포함)
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

  // 통계 계산 검증 함수
  const validateCohortStatistics = (result, factorName) => {
    const issues = [];
    
    // P-value 검증
    if (result.pValue !== null) {
      if (result.pValue < 0 || result.pValue > 1) {
        issues.push(`P-value 범위 오류: ${result.pValue}`);
      }
    }
    
    // Relative Risk 검증
    if (result.relativeRisk !== 'N/A' && result.relativeRisk !== 'Inf' && result.relativeRisk !== 'Error') {
      const rr = parseFloat(result.relativeRisk);
      if (isNaN(rr) || rr < 0) {
        issues.push(`Relative Risk 값 오류: ${result.relativeRisk}`);
      }
    }
    
    // 발병률 검증
    if (result.incidence_exposed_formatted !== 'N/A') {
      const exposed = parseFloat(result.incidence_exposed_formatted);
      if (!isNaN(exposed) && (exposed < 0 || exposed > 100)) {
        issues.push(`노출군 발병률 범위 오류: ${result.incidence_exposed_formatted}`);
      }
    }
    
    if (result.incidence_unexposed_formatted !== 'N/A') {
      const unexposed = parseFloat(result.incidence_unexposed_formatted);
      if (!isNaN(unexposed) && (unexposed < 0 || unexposed > 100)) {
        issues.push(`비노출군 발병률 범위 오류: ${result.incidence_unexposed_formatted}`);
      }
    }
    
    if (issues.length > 0) {
      console.warn(`코호트 통계 검증 오류 - ${factorName}:`, issues);
    }
    
    return issues.length === 0;
  };

  // --- Main Calculation Logic ---

  const cohortAnalysisResults = computed(() => {
    // 조건 완화: 식단 헤더가 없어도 기본 분석 가능하도록 수정
    if (!rows.value || rows.value.length === 0) {
      console.warn('코호트 분석을 위한 rows 데이터가 없습니다.');
      return [];
    }
  
    // 식단 헤더가 없으면 기본 헤더 생성
    const dietHeaders = headers.value?.diet || [];
    if (dietHeaders.length === 0) {
      console.log('식단 헤더가 없어 기본 코호트 분석을 수행합니다.');
      // 기본 식단 항목들 생성 (실제 데이터에서 추출)
      const defaultDietItems = [];
      for (let i = 0; i < 10; i++) {
        defaultDietItems.push(`식단${i + 1}`);
      }
      dietHeaders.push(...defaultDietItems);
    }
  
    const z_crit = jStat.normal.inv(0.975, 0, 1);
  
    return dietHeaders.map((dietItem, index) => {
      const factorName = dietItem;
  
      let a_obs = 0,
        b_obs = 0,
        c_obs = 0,
        d_obs = 0;
  
      rows.value.forEach((row) => {
        const isPatient = row.isPatient;
        const dietValue =
          row.dietInfo && row.dietInfo.length > index
            ? row.dietInfo[index]
            : null;
  
        if (dietValue === '1') {
          if (isPatient === '1') a_obs++;
          else if (isPatient === '0') b_obs++;
        } else if (dietValue === '0') {
          if (isPatient === '1') c_obs++;
          else if (isPatient === '0') d_obs++;
        }
      });
  
      const rowTotal_Exposed = a_obs + b_obs;
      const rowTotal_Unexposed = c_obs + d_obs;
      const colTotal_Disease = a_obs + c_obs;
      const colTotal_NoDisease = b_obs + d_obs;
      const grandTotal = rowTotal_Exposed + rowTotal_Unexposed;
  
      let a_exp = NaN,
        b_exp = NaN,
        c_exp = NaN,
        d_exp = NaN;
      let adj_chi = null;
      let pValue = null;
      let relativeRisk = 'N/A';
      let rr_ci_lower = 'N/A';
      let rr_ci_upper = 'N/A';
      let hasCorrection = false; // 0.5 보정 적용 여부
  
      // --- 발병률 계산 및 포맷팅 ---
      let incidence_exposed_formatted = 'N/A';
      let incidence_unexposed_formatted = 'N/A';
  
      if (rowTotal_Exposed > 0) {
        const incidence_exposed = (a_obs / rowTotal_Exposed) * 100;
        incidence_exposed_formatted = `${incidence_exposed.toFixed(1)}%`; // 소수점 첫째자리 + %
      }
      if (rowTotal_Unexposed > 0) {
        const incidence_unexposed = (c_obs / rowTotal_Unexposed) * 100;
        incidence_unexposed_formatted = `${incidence_unexposed.toFixed(1)}%`; // 소수점 첫째자리 + %
      }
  
      // --- 카이제곱 및 P-value 계산 ---
      if (grandTotal > 0) {
        // 기대 빈도 계산
        a_exp = (rowTotal_Exposed * colTotal_Disease) / grandTotal;
        b_exp = (rowTotal_Exposed * colTotal_NoDisease) / grandTotal;
        c_exp = (rowTotal_Unexposed * colTotal_Disease) / grandTotal;
        d_exp = (rowTotal_Unexposed * colTotal_NoDisease) / grandTotal;
  
        // 카이제곱 검정 적용 가능성 검사
        // 1. 모든 기대빈도가 0보다 커야 함
        // 2. 특정 식단의 값이 모두 같으면 (rowTotal_Exposed = 0 또는 rowTotal_Unexposed = 0) 검정 불가
        // 3. 모든 사람이 환자이거나 모든 사람이 정상이면 (colTotal_Disease = 0 또는 colTotal_NoDisease = 0) 검정 불가
        const canApplyChiSquare = rowTotal_Exposed > 0 && rowTotal_Unexposed > 0 && 
                                  colTotal_Disease > 0 && colTotal_NoDisease > 0 &&
                                  a_exp > 0 && b_exp > 0 && c_exp > 0 && d_exp > 0;
  
        if (canApplyChiSquare) {
          // 기대빈도 5미만 체크
          const hasSmallExpected = a_exp < 5 || b_exp < 5 || c_exp < 5 || d_exp < 5;
          
          if (hasSmallExpected) {
            // 기대빈도 5미만: Fisher의 정확검정 사용
            try {
              pValue = calculateFisherExactTest(a_obs, b_obs, c_obs, d_obs);
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
              const term1 = calculateChiTerm(a_obs, a_exp);
              const term2 = calculateChiTerm(b_obs, b_exp);
              const term3 = calculateChiTerm(c_obs, c_exp);
              const term4 = calculateChiTerm(d_obs, d_exp);
              adj_chi = term1 + term2 + term3 + term4;
            } else {
              // 일반 카이제곱 검정 사용 (보정 없음)
              const term1 = ((a_obs - a_exp) * (a_obs - a_exp)) / a_exp;
              const term2 = ((b_obs - b_exp) * (b_obs - b_exp)) / b_exp;
              const term3 = ((c_obs - c_exp) * (c_obs - c_exp)) / c_exp;
              const term4 = ((d_obs - d_exp) * (d_obs - d_exp)) / d_exp;
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
          // 카이제곱 검정 적용 불가
          adj_chi = null;
          pValue = null;
          console.log(`카이제곱 검정 적용 불가 - ${factorName}: rowTotal_Exposed=${rowTotal_Exposed}, rowTotal_Unexposed=${rowTotal_Unexposed}, colTotal_Disease=${colTotal_Disease}, colTotal_NoDisease=${colTotal_NoDisease}`);
        }
      }
  
      // --- RR 및 95% CI 계산 ---
      // 카이제곱 검정이 불가능한 경우 RR 계산도 의미가 없음
      if (rowTotal_Exposed > 0 && rowTotal_Unexposed > 0) {
        const hasZeroCell =
        a_obs === 0 || b_obs === 0 || c_obs === 0 || d_obs === 0;
        
        // 0인 셀이 있으면 모든 셀에 0.5 보정 적용
        if (hasZeroCell) {
          // 0이 있는 행에만 모든 셀에 0.5 보정 적용
          hasCorrection = true;
          const a_corrected = a_obs + 0.5;
          const b_corrected = b_obs + 0.5;
          const c_corrected = c_obs + 0.5;
          const d_corrected = d_obs + 0.5;
          
          const total_exposed = a_corrected + b_corrected;
          const total_unexposed = c_corrected + d_corrected;
  
          try {
            const risk_exposed = total_exposed > 0 ? a_corrected / total_exposed : 0;
            const risk_unexposed = total_unexposed > 0 ? c_corrected / total_unexposed : 0;
  
            let rr_calc = NaN;
            if (risk_unexposed > 0) {
              rr_calc = risk_exposed / risk_unexposed;
            } else if (risk_exposed > 0 && risk_unexposed === 0) {
              rr_calc = Infinity;
            } else {
              rr_calc = NaN;
            }
  
            if (isFinite(rr_calc) && rr_calc >= 0) {
              relativeRisk = rr_calc.toFixed(3);
              const logRR = Math.log(rr_calc <= 0 ? Number.EPSILON : rr_calc);
              let se_logRR = NaN;
              const term_se1 = a_corrected * total_exposed;
              const term_se2 = c_corrected * total_unexposed;
  
              if (term_se1 > 0 && term_se2 > 0) {
                se_logRR = Math.sqrt(b_corrected / term_se1 + d_corrected / term_se2);
              }
  
              if (isFinite(se_logRR)) {
                const logCI_lower = logRR - z_crit * se_logRR;
                const logCI_upper = logRR + z_crit * se_logRR;
                rr_ci_lower = Math.exp(logCI_lower).toFixed(3);
                rr_ci_upper = Math.exp(logCI_upper).toFixed(3);
                if (rr_calc === 0) rr_ci_lower = '0.000';
                if (parseFloat(rr_ci_upper) === 0) rr_ci_upper = '0.000';
              } else {
                rr_ci_lower = 'N/A';
                rr_ci_upper = 'N/A';
              }
            } else if (rr_calc === Infinity) {
              relativeRisk = 'Inf';
              // 무한대인 경우 신뢰구간 계산은 의미가 없음
              rr_ci_lower = 'Inf';
              rr_ci_upper = 'Inf';
            } else {
              relativeRisk = 'N/A';
              rr_ci_lower = 'N/A';
              rr_ci_upper = 'N/A';
            }
          } catch (e) {
            console.error(`RR/CI calculation error for item ${factorName}:`, e);
            relativeRisk = 'Error';
            rr_ci_lower = 'Error';
            rr_ci_upper = 'Error';
          }
        } else {
          // 0인 셀이 없을 때는 그냥 계산
          const total_exposed = a_obs + b_obs;
          const total_unexposed = c_obs + d_obs;
  
          try {
            const risk_exposed = total_exposed > 0 ? a_obs / total_exposed : 0;
            const risk_unexposed = total_unexposed > 0 ? c_obs / total_unexposed : 0;
  
            let rr_calc = NaN;
            if (risk_unexposed > 0) {
              rr_calc = risk_exposed / risk_unexposed;
            } else if (risk_exposed > 0 && risk_unexposed === 0) {
              rr_calc = Infinity;
            } else {
              rr_calc = NaN;
            }
  
            if (isFinite(rr_calc) && rr_calc >= 0) {
              relativeRisk = rr_calc.toFixed(3);
              const logRR = Math.log(rr_calc <= 0 ? Number.EPSILON : rr_calc);
              let se_logRR = NaN;
              const term_se1 = a_obs * total_exposed;
              const term_se2 = c_obs * total_unexposed;
  
              if (term_se1 > 0 && term_se2 > 0) {
                se_logRR = Math.sqrt(b_obs / term_se1 + d_obs / term_se2);
              }
  
              if (isFinite(se_logRR)) {
                const logCI_lower = logRR - z_crit * se_logRR;
                const logCI_upper = logRR + z_crit * se_logRR;
                rr_ci_lower = Math.exp(logCI_lower).toFixed(3);
                rr_ci_upper = Math.exp(logCI_upper).toFixed(3);
                if (rr_calc === 0) rr_ci_lower = '0.000';
                if (parseFloat(rr_ci_upper) === 0) rr_ci_upper = '0.000';
              } else {
                rr_ci_lower = 'N/A';
                rr_ci_upper = 'N/A';
              }
            } else if (rr_calc === Infinity) {
              relativeRisk = 'Inf';
              // 무한대인 경우 신뢰구간 계산은 의미가 없음
              rr_ci_lower = 'Inf';
              rr_ci_upper = 'Inf';
            } else {
              relativeRisk = 'N/A';
              rr_ci_lower = 'N/A';
              rr_ci_upper = 'N/A';
            }
          } catch (e) {
            console.error(`RR/CI calculation error for item ${factorName}:`, e);
            relativeRisk = 'Error';
            rr_ci_lower = 'Error';
            rr_ci_upper = 'Error';
          }
        }
      } else {
        // 노출군 또는 비노출군이 없는 경우 RR 계산 불가
        relativeRisk = 'N/A';
        rr_ci_lower = 'N/A';
        rr_ci_upper = 'N/A';
        console.log(`RR 계산 불가 - ${factorName}: 노출군 또는 비노출군이 없음`);
      }
  
      // --- 최종 결과 객체 반환 (발병률 추가) ---
      const result = {
        item: factorName,
        a_obs, // 노출군 환자수 (a)
        rowTotal_Exposed, // 노출군 대상자수 (a+b)
        incidence_exposed_formatted, // 노출군 발병률 (%)
        c_obs, // 비노출군 환자수 (c)
        rowTotal_Unexposed, // 비노출군 대상자수 (c+d)
        incidence_unexposed_formatted, // 비노출군 발병률 (%)
        adj_chi,
        pValue,
        relativeRisk,
        rr_ci_lower,
        rr_ci_upper,
        hasCorrection // 0.5 보정 적용 여부
      };
      
      // 통계 검증 실행
      validateCohortStatistics(result, factorName);
      
      return result;
    });
  });

  // --- Watcher to update Vuex store ---
  watch([cohortAnalysisResults, useYatesCorrection], () => {
    const fisherUsed = cohortAnalysisResults.value.some(r => r.adj_chi === null && r.pValue !== null);
    const yatesUsed = useYatesCorrection.value;
    let statMethod = 'chi-square';
    if (fisherUsed && yatesUsed) statMethod = 'yates-fisher';
    else if (fisherUsed && !yatesUsed) statMethod = 'chi-fisher';
    else if (!fisherUsed && yatesUsed) statMethod = 'yates';
  
    const haldaneCorrectionUsed = cohortAnalysisResults.value.some(r => r.hasCorrection);
    settingsStore.setAnalysisOptions({ statMethod, haldaneCorrection: haldaneCorrectionUsed });
    
    // 분석 결과를 store에 저장 (의심식단 드롭다운용)
    settingsStore.setAnalysisResults({ 
      type: 'cohort', 
      results: cohortAnalysisResults.value 
    });
  }, { immediate: true });

  return {
    cohortAnalysisResults
  };
}
