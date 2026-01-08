<template>
  <thead>
    <tr>
      <th rowspan="2" class="header-item">요인(식단)</th>
      <th colspan="3" class="header-group-case">환자군</th>
      <th colspan="3" class="header-group-control">대조군</th>
      <th rowspan="2" class="header-stat">카이제곱<br />P-value</th>
      <th rowspan="2" class="header-stat">오즈비<br />(Odds Ratio)</th>
      <th colspan="2" class="header-stat">95% 신뢰구간</th>
    </tr>
    <tr>
      <th class="header-sub">섭취자</th>
      <th class="header-sub">비섭취자</th>
      <th class="header-sub">합계</th>
      <th class="header-sub">섭취자</th>
      <th class="header-sub">비섭취자</th>
      <th class="header-sub">합계</th>
      <th class="header-sub">하한</th>
      <th class="header-sub">상한</th>
    </tr>
  </thead>
</template>

<style scoped>
th {
  border: 1px solid #e0e0e0;
  padding: 8px;
  text-align: center;
  vertical-align: middle;
  background-color: #f8f9fa;
  font-weight: 600;
  color: #495057;
  position: sticky;
  z-index: 1;
}

/* 첫 번째 헤더 행 */
tr:first-child th {
  top: 0;
  z-index: 2;
}

/* 두 번째 헤더 행 */
tr:nth-child(2) th {
  top: 33px; 
  z-index: 1;
}

/* 헤더 그룹 스타일 */
.header-item {
  width: 14%;
  background-color: #f1f3f4;
}
.header-group-case {
  width: 25%;
  background-color: #e8f0fe;
  color: #1967d2;
}
.header-group-control {
  width: 25%;
  background-color: #fce8e6;
  color: #c5221f;
}
.header-stat {
  width: 12%;
  background-color: #e6f4ea;
  color: #137333;
}
.header-sub {
  font-size: 0.9em;
  font-weight: normal;
  background-color: #f8f9fa;
  color: #5f6368;
}
</style>
