// useClipboardOperations.js - 테이블/차트 복사 및 내보내기
import { ref } from 'vue';
import * as echarts from 'echarts';

export function useClipboardOperations() {
  // 복사 상태
  const isSymptomTableCopied = ref(false);
  const isIncubationTableCopied = ref(false);
  const isEpiChartCopied = ref(false);
  const isIncubationChartCopied = ref(false);

  // 증상 테이블 복사
  const copySymptomTableToClipboard = async () => {
    const tableEl = document.getElementById('symptom-onset-table');
    if (!tableEl) {
      console.warn('증상 테이블을 찾을 수 없습니다: #symptom-onset-table');
      isSymptomTableCopied.value = false;
      return;
    }

    try {
      const tempTable = tableEl.cloneNode(true);

      const tableStyles = {
        borderCollapse: 'collapse',
        border: '1px solid #888',
        fontSize: '14px',
        width: '100%'
      };
      Object.assign(tempTable.style, tableStyles);

      const cellStyles = { border: '1px solid #888', padding: '8px 4px', textAlign: 'center' };
      const headerStyles = { ...cellStyles, background: '#f2f2f2', fontWeight: 'bold' };

      tempTable.querySelectorAll('th').forEach(th => Object.assign(th.style, headerStyles));
      tempTable.querySelectorAll('td').forEach(td => Object.assign(td.style, cellStyles));
      tempTable.querySelectorAll('tbody tr').forEach(tr => {
        const firstTd = tr.querySelector('td');
        if (firstTd) firstTd.style.textAlign = 'left';
      });

      const html = tempTable.outerHTML;
      const text = tableEl.innerText;

      if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([
          new window.ClipboardItem({
            'text/html': new Blob([html], { type: 'text/html' }),
            'text/plain': new Blob([text], { type: 'text/plain' })
          })
        ]);
      } else {
        await navigator.clipboard.writeText(text);
      }

      isSymptomTableCopied.value = true;
      setTimeout(() => (isSymptomTableCopied.value = false), 1500);
    } catch (e) {
      console.error('증상 테이블 복사 오류:', e);
      isSymptomTableCopied.value = false;
    }
  };

  // 잠복기 테이블 복사
  const copyIncubationTableToClipboard = async () => {
    const tableEl = document.getElementById('incubation-table');
    if (!tableEl) {
      console.warn('잠복기 테이블을 찾을 수 없습니다: #incubation-table');
      isIncubationTableCopied.value = false;
      return;
    }

    try {
      const tempTable = tableEl.cloneNode(true);

      const tableStyles = {
        borderCollapse: 'collapse',
        border: '1px solid #888',
        fontSize: '14px',
        width: '100%'
      };
      Object.assign(tempTable.style, tableStyles);

      const cellStyles = { border: '1px solid #888', padding: '8px 4px', textAlign: 'center' };
      const headerStyles = { ...cellStyles, background: '#f2f2f2', fontWeight: 'bold' };

      tempTable.querySelectorAll('th').forEach(th => Object.assign(th.style, headerStyles));
      tempTable.querySelectorAll('td').forEach(td => Object.assign(td.style, cellStyles));
      tempTable.querySelectorAll('tbody tr').forEach(tr => {
        const firstTd = tr.querySelector('td');
        if (firstTd) firstTd.style.textAlign = 'left';
      });

      const html = tempTable.outerHTML;
      const text = tableEl.innerText;

      if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([
          new window.ClipboardItem({
            'text/html': new Blob([html], { type: 'text/html' }),
            'text/plain': new Blob([text], { type: 'text/plain' })
          })
        ]);
      } else {
        await navigator.clipboard.writeText(text);
      }

      isIncubationTableCopied.value = true;
      setTimeout(() => (isIncubationTableCopied.value = false), 1500);
    } catch (e) {
      console.error('잠복기 테이블 복사 오류:', e);
      isIncubationTableCopied.value = false;
    }
  };

  // 차트 복사 헬퍼
  const copyChartToClipboardHelper = async (chartInstance, chartWidth, copyStateRef) => {
    if (!chartInstance || typeof chartInstance.getDataURL !== 'function') {
      copyStateRef.value = false;
      return;
    }
    if (!navigator.clipboard || !navigator.clipboard.write) {
      copyStateRef.value = false;
      return;
    }
    if (typeof ClipboardItem === 'undefined') {
      copyStateRef.value = false;
      return;
    }

    try {
      const tempContainer = document.createElement('div');
      tempContainer.style.width = `${chartWidth}px`;
      tempContainer.style.height = '600px';
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '-9999px';
      document.body.appendChild(tempContainer);

      const tempChart = echarts.init(tempContainer);
      const currentOption = chartInstance.getOption();
      currentOption.animation = false;
      tempChart.setOption(currentOption, true);

      await new Promise(resolve => setTimeout(resolve, 100));

      const dataUrl = tempChart.getDataURL({
        type: 'png',
        pixelRatio: 3,
        backgroundColor: '#fff'
      });

      if (!dataUrl || !dataUrl.startsWith('data:image/png')) {
        throw new Error('유효하지 않은 이미지 데이터 URL');
      }

      const response = await fetch(dataUrl);
      const blob = await response.blob();

      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob })
      ]);

      tempChart.dispose();
      document.body.removeChild(tempContainer);

      copyStateRef.value = true;
      setTimeout(() => (copyStateRef.value = false), 1500);
    } catch (error) {
      console.error('차트 복사 오류:', error);
      copyStateRef.value = false;
    }
  };

  // 유행곡선 차트 복사
  const copyEpiChartToClipboard = async (chartInstance, chartWidth) => {
    await copyChartToClipboardHelper(chartInstance, chartWidth, isEpiChartCopied);
  };

  // 잠복기 차트 복사
  const copyIncubationChartToClipboard = async (chartInstance, chartWidth) => {
    await copyChartToClipboardHelper(chartInstance, chartWidth, isIncubationChartCopied);
  };

  // 차트 내보내기 헬퍼
  const exportChartHelper = async (chartInstance, chartWidth, filename) => {
    if (!chartInstance || typeof chartInstance.getDataURL !== 'function') {
      alert('차트 내보내기 불가');
      return;
    }

    try {
      const tempContainer = document.createElement('div');
      tempContainer.style.width = `${chartWidth}px`;
      tempContainer.style.height = '600px';
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '-9999px';
      document.body.appendChild(tempContainer);

      const tempChart = echarts.init(tempContainer);
      const currentOption = chartInstance.getOption();
      currentOption.animation = false;
      tempChart.setOption(currentOption, true);

      await new Promise(resolve => setTimeout(resolve, 100));

      const dataUrl = tempChart.getDataURL({
        type: 'png',
        pixelRatio: 3,
        backgroundColor: '#fff'
      });

      if (!dataUrl || !dataUrl.startsWith('data:image/png')) {
        throw new Error('유효하지 않은 이미지 데이터 URL');
      }

      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      tempChart.dispose();
      document.body.removeChild(tempContainer);
      console.log('차트 저장 완료:', filename);
    } catch (error) {
      console.error('차트 내보내기 오류:', error);
      alert(`차트 내보내기 오류: ${error.message}`);
    }
  };

  // 유행곡선 차트 내보내기
  const exportEpiChart = async (chartInstance, chartWidth, selectedSymptomInterval) => {
    const filename = `유행곡선_${selectedSymptomInterval}시간_${new Date().toISOString().split('T')[0]}.png`;
    await exportChartHelper(chartInstance, chartWidth, filename);
  };

  // 잠복기 차트 내보내기
  const exportIncubationChart = async (chartInstance, chartWidth, selectedIncubationInterval) => {
    const filename = `잠복기_${selectedIncubationInterval}시간_${new Date().toISOString().split('T')[0]}.png`;
    await exportChartHelper(chartInstance, chartWidth, filename);
  };

  return {
    // 상태
    isSymptomTableCopied,
    isIncubationTableCopied,
    isEpiChartCopied,
    isIncubationChartCopied,
    
    // 테이블 복사
    copySymptomTableToClipboard,
    copyIncubationTableToClipboard,
    
    // 차트 복사
    copyEpiChartToClipboard,
    copyIncubationChartToClipboard,
    
    // 차트 내보내기
    exportEpiChart,
    exportIncubationChart
  };
}
