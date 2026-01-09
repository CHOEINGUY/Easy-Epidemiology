// useEpiCurveChartOptions.js - 유행곡선 차트 옵션 생성
import * as echarts from 'echarts';

/**
 * 선택된 색상을 기반으로 그라디언트 생성
 */
export function generateGradientColors(baseColor) {
  const hex2rgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };

  const rgb2hex = (r, g, b) => {
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  };

  const adjustBrightness = (color, percent) => {
    const rgb = hex2rgb(color);
    if (!rgb) return color;
    const factor = percent / 100;
    const r = Math.min(255, Math.max(0, Math.round(rgb.r + (255 - rgb.r) * factor)));
    const g = Math.min(255, Math.max(0, Math.round(rgb.g + (255 - rgb.g) * factor)));
    const b = Math.min(255, Math.max(0, Math.round(rgb.b + (255 - rgb.b) * factor)));
    return rgb2hex(r, g, b);
  };

  const lightColor = adjustBrightness(baseColor, 40);
  const darkColor = baseColor;
  return { lightColor, darkColor };
}

/**
 * Y축 최대값과 간격 계산
 */
export function getNiceYAxisMaxAndStep(maxValue) {
  let yMax;
  if (maxValue < 10) {
    yMax = Math.max(maxValue + 1, Math.ceil(maxValue * 1.1));
  } else if (maxValue < 20) {
    yMax = Math.ceil(maxValue / 5) * 5;
  } else {
    yMax = Math.ceil((maxValue * 1.1) / 10) * 10;
  }

  let step = 1;
  if (yMax > 100) step = 20;
  else if (yMax > 50) step = 10;
  else if (yMax > 20) step = 5;
  else if (yMax > 10) step = 2;

  yMax = Math.ceil(yMax / step) * step;
  return { yMax, step };
}

/**
 * 동적 왼쪽 여백 계산
 */
export function getDynamicLeftMargin(displayMode, fontSize) {
  if (displayMode !== 'datetime') return '3%';
  
  const baseMargin = 80;
  let fontSizeAdjustment;
  
  if (fontSize <= 15) fontSizeAdjustment = 0;
  else if (fontSize <= 18) fontSizeAdjustment = (fontSize - 15) * 8;
  else if (fontSize <= 21) fontSizeAdjustment = (fontSize - 15) * 9;
  else fontSizeAdjustment = (fontSize - 15) * 15;

  const minMargin = 80;
  const calculatedMargin = Math.max(minMargin, baseMargin + fontSizeAdjustment);
  return `${calculatedMargin}px`;
}

/**
 * 유행곡선 차트 옵션 생성
 */
export function generateEpiCurveChartOptions({
  symptomOnsetTableData,
  confirmedCaseOnsetTableData,
  selectedSymptomInterval,
  chartDisplayMode,
  epiChartFontSize,
  epiBarColor,
  suspectedFood,
  isConfirmedCaseColumnVisible,
  showConfirmedCaseLine
}) {
  const data = symptomOnsetTableData;

  if (!Array.isArray(data) || data.length === 0) {
    return {
      title: {
        text: '유행곡선 데이터가 필요합니다',
        subtext: '증상발현시간 데이터를 입력하면 유행곡선이 자동으로 생성됩니다',
        left: 'center',
        textStyle: { fontSize: 18, fontFamily: 'Noto Sans KR, sans-serif', color: '#666' },
        subtextStyle: { fontSize: 14, color: '#999' }
      },
      graphic: {
        type: 'text',
        left: 'center',
        top: '60%',
        style: {
          text: '📊 증상발현시간 입력 → 유행곡선 생성',
          fontSize: 16,
          fill: '#1a73e8',
          fontFamily: 'Noto Sans KR, sans-serif'
        }
      }
    };
  }

  // 데이터 가공
  const processedData = data.map(item => {
    const intervalLabel = item.intervalLabel;
    const parts = intervalLabel.split(' ~ ');
    const startDateStr = parts[0];
    const datePart = startDateStr.split(' ')[0];
    const timePart = startDateStr.split(' ')[1];
    const [month, day] = datePart.split('-').map(p => parseInt(p, 10));
    const year = new Date().getFullYear();
    const dateObj = new Date(year, month - 1, day);
    const dayOfWeekMap = ['일', '월', '화', '수', '목', '금', '토'];
    const dayOfWeek = dayOfWeekMap[dateObj.getDay()];
    const formattedDate = `${month}. ${day}.(${dayOfWeek})`;
    const startTime = timePart.split(':')[0];

    let formattedTime;
    if (chartDisplayMode === 'datetime') {
      formattedTime = item.intervalLabel;
    } else {
      const startHour = parseInt(startTime, 10);
      const intervalHours = selectedSymptomInterval || 3;
      const endHour = (startHour + intervalHours) % 24;
      formattedTime = `${startHour}~${endHour === 0 ? 24 : endHour}시`;
    }

    return { formattedDate, formattedTime, value: Number(item.count) || 0 };
  });

  const timeData = processedData.map(item => item.formattedTime);
  const seriesData = processedData.map(item => item.value);
  const confirmedCaseSeriesData = confirmedCaseOnsetTableData.map(item => item.count);

  // 날짜 그룹 생성
  const dateGroups = [];
  const dateMap = new Map();
  processedData.forEach((item, index) => {
    if (!dateMap.has(item.formattedDate)) {
      dateMap.set(item.formattedDate, { startIndex: index, count: 0 });
    }
    dateMap.get(item.formattedDate).count++;
  });
  dateMap.forEach((value, key) => {
    dateGroups.push({ name: key, ...value });
  });

  const allValues = [...seriesData, ...confirmedCaseSeriesData];
  const maxValue = Math.max(...allValues);
  const { yMax, step } = getNiceYAxisMaxAndStep(maxValue);

  return {
    textStyle: { fontFamily: 'Noto Sans KR, sans-serif' },
    title: {
      text: '시간별 발생자 수',
      left: 'center',
      textStyle: { fontSize: (epiChartFontSize || 15) + 4, fontWeight: 'bold' },
      top: 15
    },
    ...(suspectedFood && suspectedFood.trim() && {
      graphic: [{
        type: 'text',
        left: '5%',
        bottom: '5%',
        style: {
          text: `추정 감염원 : ${suspectedFood}`,
          fontSize: epiChartFontSize || 15,
          fill: '#333',
          fontWeight: 'normal'
        }
      }]
    }),
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params) => {
        const dataIndex = params[0].dataIndex;
        const item = processedData[dataIndex];
        const confirmedCaseCount = confirmedCaseSeriesData[dataIndex] || 0;

        let tooltipContent = chartDisplayMode === 'datetime'
          ? `<strong>${item.formattedTime}</strong><br/>환자 수: <strong>${item.value}</strong> 명`
          : `<strong>${item.formattedDate}</strong><br/>${item.formattedTime} : <strong>${item.value}</strong> 명`;

        if (isConfirmedCaseColumnVisible && showConfirmedCaseLine && confirmedCaseCount > 0) {
          tooltipContent += `<br/>확진자 수: <strong style="color: #e74c3c;">${confirmedCaseCount}</strong> 명`;
        }

        return tooltipContent;
      }
    },
    grid: {
      left: getDynamicLeftMargin(chartDisplayMode, epiChartFontSize),
      right: chartDisplayMode === 'datetime' ? 60 : '4%',
      bottom: suspectedFood && suspectedFood.trim() ? '15%' : '7%',
      top: 80,
      containLabel: true
    },
    xAxis: chartDisplayMode === 'datetime'
      ? [{
        type: 'category',
        data: timeData,
        axisLine: { show: true, onZero: false },
        axisTick: { show: false },
        axisLabel: {
          interval: 0,
          color: '#333',
          fontSize: epiChartFontSize || 15,
          margin: 10,
          rotate: 45
        },
        splitLine: { show: false },
        boundaryGap: [0.18, 0.18]
      }]
      : [
        {
          type: 'category',
          data: timeData,
          axisLine: { show: true, onZero: false },
          axisTick: { show: false },
          axisLabel: {
            interval: 0,
            color: '#333',
            fontSize: epiChartFontSize || 15,
            margin: 10,
            rotate: 0
          },
          splitLine: { show: false },
          boundaryGap: true
        },
        {
          type: 'category',
          position: 'bottom',
          offset: 35,
          axisLine: { show: true, lineStyle: { color: '#cccccc', width: 2 } },
          axisTick: {
            show: true,
            inside: false,
            length: 70,
            lineStyle: { color: '#cccccc', width: 2 },
            interval: (index, value) => value !== ''
          },
          axisLabel: {
            show: true,
            interval: (index, value) => value !== '',
            color: '#333',
            fontSize: epiChartFontSize || 15
          },
          splitLine: { show: false },
          data: dateGroups.flatMap(group => {
            const groupData = Array(group.count).fill('');
            if (groupData.length > 0) groupData[0] = group.name;
            return groupData;
          })
        }
      ],
    yAxis: {
      type: 'value',
      name: '환자 수 (명)',
      nameTextStyle: { padding: [0, 0, 0, 60], fontSize: epiChartFontSize || 15 },
      axisLabel: { fontSize: epiChartFontSize || 15 },
      splitLine: { show: true, lineStyle: { type: 'dashed' } },
      max: yMax,
      interval: step
    },
    legend: {
      show: isConfirmedCaseColumnVisible && showConfirmedCaseLine && confirmedCaseSeriesData.length > 0,
      data: ['환자 수', '확진자 수'],
      top: 50,
      right: 20,
      textStyle: { fontSize: epiChartFontSize || 15 }
    },
    series: [
      {
        name: '환자 수',
        type: 'bar',
        xAxisIndex: 0,
        data: seriesData,
        barWidth: '100%',
        itemStyle: {
          color: (() => {
            const colors = generateGradientColors(epiBarColor || '#1E88E5');
            return new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: colors.lightColor },
              { offset: 1, color: colors.darkColor }
            ]);
          })()
        },
        emphasis: {
          focus: 'series',
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#FDB813' },
              { offset: 1, color: '#F9A825' }
            ])
          }
        },
        label: {
          show: true,
          position: 'top',
          fontSize: Math.max(10, (epiChartFontSize || 15) - 1)
        }
      },
      ...(isConfirmedCaseColumnVisible && showConfirmedCaseLine && confirmedCaseSeriesData.length > 0 ? [{
        name: '확진자 수',
        type: 'line',
        xAxisIndex: 0,
        data: confirmedCaseSeriesData,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { color: '#e74c3c', width: 3 },
        itemStyle: { color: '#e74c3c', borderColor: '#fff', borderWidth: 2 },
        emphasis: {
          focus: 'series',
          itemStyle: { color: '#c0392b', borderColor: '#fff', borderWidth: 2 }
        },
        label: {
          show: true,
          position: 'top',
          fontSize: Math.max(10, (epiChartFontSize || 15) - 1),
          color: '#e74c3c',
          formatter: (params) => {
            const barValue = seriesData[params.dataIndex] || 0;
            const lineValue = params.value || 0;
            return barValue !== lineValue ? lineValue : '';
          }
        }
      }] : [])
    ]
  };
}
