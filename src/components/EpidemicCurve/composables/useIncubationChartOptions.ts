import * as echarts from 'echarts';
import { generateGradientColors, getNiceYAxisMaxAndStep } from './useEpiCurveChartOptions';

export interface IncubationDataPoint {
    intervalLabel: string;
    count: number | string;
}

interface IncubationChartOptionsParams {
    incubationPeriodTableData: IncubationDataPoint[];
    incubationChartDisplayMode: string;
    incubationChartFontSize: number;
    incubationBarColor: string;
    suspectedFood: string;
}

/**
 * 잠복기 시간 라벨을 "N~M시간" 형식으로 변환
 */
export function formatIncubationLabel(intervalLabel: string): string {
    try {
        const parts = intervalLabel.split(' ~ ');
        if (parts.length !== 2)
            return intervalLabel;
        const startTime = parts[0].trim();
        const endTime = parts[1].trim();
        const startHour = parseInt(startTime.split(':')[0], 10);
        let endHour = parseInt(endTime.split(':')[0], 10);
        if (endHour === 0 && startHour > 0)
            endHour = 24;
        return `${startHour}~${endHour}시간`;
    }
    catch {
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
}: IncubationChartOptionsParams): any {
    const data = incubationPeriodTableData;
    if (!Array.isArray(data) || data.length === 0) {
        return {
            title: {
                text: '',
                subtext: '',
                left: 'center'
            }
        } as any;
    }

    const hasValidLabels = data.every(item => item && typeof item.intervalLabel === 'string');
    if (!hasValidLabels) {
        return { title: { text: '데이터 라벨 오류' } } as any;
    }

    const seriesData = data.map(item => Number(item.count) || 0);
    const maxValue = Math.max(...seriesData);
    const { yMax, step } = getNiceYAxisMaxAndStep(maxValue);

    const labelData = data.map(item => {
        if (incubationChartDisplayMode === 'hhmm') {
            return item.intervalLabel;
        }
        else {
            return formatIncubationLabel(item.intervalLabel);
        }
    });

    const gradientColors = generateGradientColors(incubationBarColor || '#91cc75');

    const options: any = {
        textStyle: { fontFamily: 'Noto Sans KR, sans-serif' },
        title: {
            text: '잠복기별 환자 수',
            left: 'center',
            textStyle: { fontSize: (incubationChartFontSize || 15) + 4, fontWeight: 'bold' },
            top: 15
        },
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' },
            formatter: (params: any) => {
                if (!Array.isArray(params) || params.length === 0)
                    return '';
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
                type: 'category' as const,
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
                boundaryGap: true
            }],
        yAxis: {
            type: 'value' as const,
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
                data: seriesData,
                barWidth: '100%',
                itemStyle: {
                    color: new (echarts as any).graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: gradientColors.lightColor },
                        { offset: 1, color: gradientColors.darkColor }
                    ])
                },
                emphasis: {
                    focus: 'series',
                    itemStyle: {
                        color: new (echarts as any).graphic.LinearGradient(0, 0, 0, 1, [
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

    // Add graphic for suspected food if present
    if (suspectedFood && suspectedFood.trim()) {
        options.graphic = [{
                type: 'text',
                left: '5%',
                bottom: '8%',
                style: {
                    text: `추정 감염원: ${suspectedFood}`,
                    fontSize: incubationChartFontSize || 15,
                    fill: '#333',
                    fontWeight: 'normal'
                }
            }];
    }

    return options;
}
