// useClipboardOperations.js - 클립보드 및 내보내기 작업
import { ref } from 'vue';
import * as echarts from 'echarts';

export function useClipboardOperations() {
  const isTableCopied = ref(false);
  const isChartCopied = ref(false);

  // 테이블 클립보드 복사
  const copyTableToClipboard = async () => {
    const tableEl = document.querySelector('.table-container .frequency-table') ||
                   document.querySelector('.frequency-table');
    
    if (!tableEl) {
      isTableCopied.value = false;
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
      
      const cellStyles = {
        border: '1px solid #888',
        padding: '8px 4px',
        textAlign: 'center'
      };
      
      const headerStyles = {
        ...cellStyles,
        background: '#f2f2f2',
        fontWeight: 'bold'
      };
      
      tempTable.querySelectorAll('th').forEach(th => {
        Object.assign(th.style, headerStyles);
      });
      
      tempTable.querySelectorAll('td').forEach(td => {
        Object.assign(td.style, cellStyles);
      });
      
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
      
      isTableCopied.value = true;
      setTimeout(() => (isTableCopied.value = false), 1500);
    } catch (e) {
      console.error('테이블 복사 오류:', e);
      isTableCopied.value = false;
    }
  };

  // 차트 클립보드 복사
  const copyChartToClipboard = async (chartInstance, chartWidth) => {
    const instance = chartInstance;
    if (!instance || typeof instance.getDataURL !== 'function') {
      isChartCopied.value = false;
      return;
    }
    if (!navigator.clipboard || !navigator.clipboard.write) {
      isChartCopied.value = false;
      return;
    }
    if (typeof ClipboardItem === 'undefined') {
      isChartCopied.value = false;
      return;
    }
    
    try {
      const tempContainer = document.createElement('div');
      tempContainer.style.width = `${chartWidth}px`;
      tempContainer.style.height = '500px';
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '-9999px';
      document.body.appendChild(tempContainer);
      
      const tempChart = echarts.init(tempContainer);
      
      const currentOption = instance.getOption();
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
      if (!response.ok) {
        throw new Error(`이미지 로드 실패: ${response.statusText}`);
      }
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob })
      ]);
      
      tempChart.dispose();
      document.body.removeChild(tempContainer);
      
      isChartCopied.value = true;
      setTimeout(() => (isChartCopied.value = false), 1500);
      console.log('차트 복사 완료');
    } catch (error) {
      console.error('차트 복사 오류:', error);
      isChartCopied.value = false;
    }
  };

  // 차트 내보내기 (다운로드)
  const exportChart = async (chartInstance, chartWidth, header, selectedChartType) => {
    const instance = chartInstance;
    if (!instance || typeof instance.getDataURL !== 'function') {
      alert('차트 내보내기 불가');
      return;
    }
    const chartKind = selectedChartType === 'total' ? '전체' : '환자';
    const filename = `${header}_${chartKind}_분포_고화질.png`;
    
    try {
      const tempContainer = document.createElement('div');
      tempContainer.style.width = `${chartWidth}px`;
      tempContainer.style.height = '500px';
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '-9999px';
      document.body.appendChild(tempContainer);
      
      const tempChart = echarts.init(tempContainer);
      
      const currentOption = instance.getOption();
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
      const message = `차트 내보내기 오류: ${error.message}`;
      console.error(message);
      alert(message);
    }
  };

  return {
    isTableCopied,
    isChartCopied,
    copyTableToClipboard,
    copyChartToClipboard,
    exportChart
  };
}
