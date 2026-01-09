const template: string = `<div class="report-wrapper">
  <style>
  .placeholder-value {
    background-color: #e3f2fd;
    padding: 1px 3px;
    border-radius: 3px;
    font-weight: 500;
  }
  .placeholder-chart {
    background-color: #e3f2fd;
    padding: 20px;
    border-radius: 8px;
    border: 2px dashed #90caf9;
    text-align: center;
    margin: 20px 0;
  }
  .placeholder-table {
    background-color: #e3f2fd;
    padding: 15px;
    border-radius: 6px;
    border: 2px dashed #90caf9;
    text-align: center;
    margin: 15px 0;
  }
  .report-preview {
    background: #f8f9fa;
    min-height: 100vh;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    padding: 40px 0;
  }
  .report-wrapper {
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 2px 12px rgba(60,64,67,0.06);
    border: 1px solid #e0e0e0;
    padding: 40px 32px 32px 32px;
    margin-top: 0;
    max-width: 900px;
    width: 100%;
  }
  .report-title {
    margin-top: 40px;
    margin-bottom: 32px;
    text-align: center;
    font-size: 2rem;
    font-weight: 700;
  }
  </style>
  <h1 class="report-title">수인성 식품매개 집단발생<br/>역학조사 보고서</h1>

  <h2 id="section-overview" class="section-heading">Ⅰ. 발생 개요</h2>
  <table class="summary-table">
    <tr>
      <th class="label">발생신고 일시</th><td>%reportDate%</td>
      <th class="label">추정위험 노출일시</th><td>%exposureDate%</td>
    </tr>
    <tr>
      <th class="label">현장 역학조사 일시</th><td>%fieldInvestDate%</td>
      <th class="label">최초사례 발생일시</th><td>%firstCaseDate%</td>
    </tr>
    <tr>
      <th class="label">발생지역</th><td>%region%</td>
      <th class="label">평균잠복기</th><td>%meanIncubation%</td>
    </tr>
    <tr>
      <th class="label">발생장소 또는 기관</th><td>%place%</td>
      <th class="label">추정 원인병원체</th><td>%suspectedPathogen%</td>
    </tr>
    <tr>
      <th class="label">조사디자인</th><td>%studyDesign%</td>
      <th class="label">추정 감염원</th><td>%suspectedSource%</td>
    </tr>
    <tr>
      <th class="label">사례발병률 (발병규모)</th><td>%caseAttackRate%</td>
      <th class="label">유행종료 일자</th><td>%epiCurveDate%</td>
    </tr>
    <tr>
      <th class="label">환자발병률 (최종확진자 발병규모)</th><td>%patientAttackRate%</td>
      <th class="label">최종검사결과 통보일</th><td>%finalLabDate%</td>
    </tr>
  </table>

  <h2 id="section-team" class="section-heading">Ⅱ. 역학조사반 구성 및 역할</h2>
  <table class="summary-table">
    <tr>
      <td colspan="4" style="height:120px; text-align:center;">생략</td>
    </tr>
  </table>

  <h3 style="margin-top:24px;">2. 조사디자인 선택 및 조사 대상자 선정</h3>
  <p style="margin-left:18px;">조사디자인 : %studyDesign%</p>

  <h3 style="margin-top:24px;">3. 채취한 검체 종류 및 검사항목</h3>

  <p style="height:120px;">생략</p>

  <h3 style="margin-top:24px;">4. 환례 정의</h3>
  <p style="height:70px;">생략</p>

  <h3 style="margin-top:24px;">5. 현장 조치 사항</h3>
  <p style="height:70px;">생략</p>

  <h3 style="margin-top:24px;">6. 통계분석에 사용한 분석기법</h3>
  <p>%statAnalysis%</p>

  <!-- IV. 결과 -->
  <h2 id="section-results" class="section-heading" style="page-break-before:always;">Ⅳ. 결과</h2>

  <h3 style="margin-top:24px;">1. 최초 환자 발생일시</h3>
  <p>사례정의에 부합하는 최초 사례는 %firstCaseDateTime%경에 %symptomList% 증상이 발생하였다. 이후 %lastCaseDateTime%까지 총 %patientCount%명의 환례가 있었다.</p>

  <h3 style="margin-top:24px;">2. 발병률</h3>
  <p>조사에 포함된 대상자 %totalParticipants%명 중 사례 수는 %patientCount%명으로 사례 발병률은 %caseAttackRate%이다. 이 중, 인체 검사 결과 검출된 확진환자 수는 %confirmedCount%명으로 확진환자 발병률은 %confirmedAttackRate%이다.</p>

  <h3 style="margin-top:24px;">3. 공동노출원 조사</h3>
  <p style="height:80px;">생략</p>

  <h3 style="margin-top:24px;">4. 유행곡선</h3>
  %epidemicChart%
  <p style="text-align:center; margin-top:10px; font-size:12px;">[그림1] 증상 발생 시점에 따른 유행 곡선</p>

  <h3 style="margin-top:24px;">5. 주요증상</h3>
  <h3 style="margin-top:28px;">[표3] 주요증상별 환례수 및 백분율</h3>
  <table class="summary-table">
    <tr>
      <th rowspan="2">증상</th>
      <th colspan="2">환례(N=%patientCount%)</th>
    </tr>
    <tr>
      <th>환례(명)</th>
      <th>%</th>
    </tr>
    %mainSymptomsTable%
  </table>

  <h3 style="margin-top:24px;">6. 식품 섭취력 분석</h3>
  %foodIntakeAnalysisHtml%

  <h3 style="margin-top:24px;">7. 조리, 식자재 공급 환경 조사 결과</h3>
  <p style="height:70px;">생략</p>

  <h3 style="margin-top:24px;">8. 물 조사 결과</h3>
  <p style="height:70px;">생략</p>

  <h2 id="section-incubation" class="section-heading">Ⅴ. 잠복기 및 노출 시기</h2>
  <div style="margin-bottom: 12px;">%incubationExposureText%</div>
  %incubationChart%
  <p style="text-align:center; margin-top:10px; font-size:12px;">[그림2] 추정 노출 시점을 기준으로 한 잠복기 분포</p>

</div>`;
export default template;
