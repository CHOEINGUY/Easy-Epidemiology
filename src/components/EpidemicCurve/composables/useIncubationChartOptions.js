// useIncubationChartOptions.js - 잠복기 차트 옵션 생성
import * as echarts from 'echarts';
import { generateGradientColors, getNiceYAxisMaxAndStep } from './useEpiCurveChartOptions';

/**
 * 잠복기 시간 라벨을 "N~M시간" 형식으로 변환
 */
export function formatIncubationLabel(intervalLabel) {
  try {
    const parts = intervalLabel.split(' ~ ');
    if (parts.length !== 2) return intervalLabel;

    const startTime = parts[0].trim();
    const endTime = parts[1].trim();

    const startHour = parseInt(startTime.split(':')[0], 10);
    let endHour = parseInt(endTime.split(':')[0], 10);

    if (endHour === 0 && startHour > 0) endHour = 24;

    return `${startHour}~${endHour}시간`;
  } catch {
    return intervalLabel;
  }
}

/**
 * 잠복기 차트 옵션 생성
 */
export function generateIncubationChartOptions({
  incubationPeriodTableData,
  incubationChartDisplayMode,
  incubationChartFontSize,
  incubationBarColor,
  suspectedFood
}) {
  const data = incubationPeriodTableData;

  if (!Array.isArray(data) || data.length === 0) {
    return {
      title: {
        text: '잠복기 분석 데이터가 필요합니다',
        subtext: '의심원 노출시간과 증상발현시간을 설정하면 잠복기 분석이 시작됩니다',
        left: 'center',
        textStyle: { fontSize: 18, fontFamily: 'Noto Sans KR, sans-serif', color: '#666' },
        subtextStyle: { fontSize: 14, color: '#999' }
      },
      graphic: {
        type: 'text',
        left: 'center',
        top: '60%',
        style: {
          text: '⏰ 노출시간 설정 → 잠복기 분석',
          fontSize: 16,
          fill: '#1a73e8',
          fontFamily: 'Noto Sans KR, sans-serif'
        }
      }
    };
  }

  const hasValidLabels = data.every(item => item && typeof item.intervalLabel === 'string');
  if (!hasValidLabels) {
    return { title: { text: '데이터 라벨 오류' } };
  }

  const seriesData = data.map(item => item.count);
  const maxValue = Math.max(...seriesData);
  const { yMax, step } = getNiceYAxisMaxAndStep(maxValue);

  const labelData = data.map(item => {
    if (incubationChartDisplayMode === 'hhmm') {
      return item.intervalLabel;
    } else {
      return formatIncubationLabel(item.intervalLabel);
    }
  });

  return {
    textStyle: { fontFamily: 'Noto Sans KR, sans-serif' },
    title: {
      text: '잠복기별 환자 수',
      left: 'center',
      textStyle: { fontSize: (incubationChartFontSize || 15) + 4, fontWeight: 'bold' },
      top: 15
    },
    ...(suspectedFood && suspectedFood.trim() && {
      graphic: [{
        type: 'text',
        left: '5%',
        bottom: '8%',
        style: {
          text: `추정 감염원: ${suspectedFood}`,
          fontSize: incubationChartFontSize || 15,
          fill: '#333',
          fontWeight: 'normal'
        }
      }]
    }),
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params) => {
        if (!params || params.length === 0) return '';
        const param = params[0];
        return `<strong>${param.name}</strong><br/>${param.seriesName}: <strong>${param.value}</strong> 명`;
      }
    },
    grid: {
      left: incubationChartDisplayMode === 'hhmm' ? 60 : '3%',
      right: incubationChartDisplayMode === 'hhmm' ? 60 : '4%',
      bottom: suspectedFood && suspectedFood.trim() ? '15%' : '5%',
      top: 80,
      containLabel: true
    },
    xAxis: [{
      type: 'category',
      data: labelData,
      axisLine: { show: true, onZero: false },
      axisTick: { show: false },
      axisLabel: {
        rotate: incubationChartDisplayMode === 'hhmm' ? 45 : 0,
        interval: 0,
        fontSize: incubationChartFontSize || 15,
        color: '#333',
        margin: 10
      },
      splitLine: { show: false },
      boundaryGap: incubationChartDisplayMode === 'hhmm' ? [0.18, 0.18] : true
    }],
    yAxis: {
      type: 'value',
      name: '환자 수 (명)',
      nameTextStyle: { padding: [0, 0, 0, 60], fontSize: incubationChartFontSize || 15 },
      axisLabel: { fontSize: incubationChartFontSize || 15 },
      splitLine: { show: true, lineStyle: { type: 'dashed' } },
      max: yMax,
      interval: step
    },
    series: [{
      name: '환자 수',
      type: 'bar',
      data: data.map(item => Number(item.count) || 0),
      barWidth: '100%',
      itemStyle: {
        color: (() => {
          const colors = generateGradientColors(incubationBarColor || '#91cc75');
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
        fontSize: Math.max(10, (incubationChartFontSize || 15) - 1)
      }
    }]
  };
}
