import { ref } from 'vue';
import * as echarts from 'echarts';

/**
 * 클립보드/내보내기 기능 composable
 * @param {Object} options - 옵션
 * @param {import('vue').Ref<Object>} options.chartInstance - ECharts 인스턴스
 * @param {import('vue').Ref<number>} options.chartWidth - 차트 너비
 * @returns {Object} 복사/내보내기 관련 상태와 함수들
 */
export function useClipboardOperations(options) {
  const { chartInstance, chartWidth } = options;

  const isTableCopied = ref(false);
  const isChartCopied = ref(false);

  /**
   * 테이블을 클립보드에 복사
   * @returns {Promise<void>}
   */
  const copyTableToClipboard = async () => {
    let tableEl = null;
    
    try {
      const tableContainer = document.querySelector('.analysis-table-container');
      if (tableContainer) {
        tableEl = tableContainer.querySelector('.frequency-table');
      }
      if (!tableEl) {
        tableEl = document.querySelector('.frequency-table');
      }
      if (!tableEl) {
        console.warn('copyTableToClipboard: 테이블 요소를 찾을 수 없음');
        isTableCopied.value = false;
        return;
      }
      
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
      console.log('테이블 복사 완료');
    } catch (e) {
      console.error('테이블 복사 오류:', e);
      isTableCopied.value = false;
    }
  };

  /**
   * 차트를 클립보드에 복사
   * @returns {Promise<void>}
   */
  const copyChartToClipboard = async () => {
    const instance = chartInstance.value;
    if (!instance || typeof instance.getDataURL !== 'function') {
      console.warn('copyChartToClipboard: 차트 인스턴스가 없거나 getDataURL 함수가 없음');
      isChartCopied.value = false;
      return;
    }
    if (!navigator.clipboard || !navigator.clipboard.write) {
      console.warn('copyChartToClipboard: 클립보드 API를 사용할 수 없음');
      isChartCopied.value = false;
      return;
    }
    if (typeof ClipboardItem === 'undefined') {
      console.warn('copyChartToClipboard: ClipboardItem을 사용할 수 없음');
      isChartCopied.value = false;
      return;
    }
    
    try {
      const tempContainer = document.createElement('div');
      tempContainer.style.width = `${chartWidth.value}px`;
      tempContainer.style.height = '600px';
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
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
      
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

  /**
   * 차트를 파일로 저장
   * @returns {Promise<void>}
   */
  const exportChart = async () => {
    const instance = chartInstance.value;
    if (!instance || typeof instance.getDataURL !== 'function') {
      alert('차트 내보내기 불가');
      return;
    }
    const filename = `임상증상_분석_${new Date().toISOString().split('T')[0]}.png`;
    
    try {
      const tempContainer = document.createElement('div');
      tempContainer.style.width = `${chartWidth.value}px`;
      tempContainer.style.height = '600px';
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
