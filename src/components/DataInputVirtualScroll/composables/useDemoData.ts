/**
 * Demo Data Loading Composable
 * 포트폴리오 데모용 샘플 데이터 로드 기능
 * 
 * 이 파일은 noauth 빌드에서는 사용되지 않음 (VirtualFunctionBar에서 버튼 자체가 숨겨짐)
 */

import { ref } from 'vue';
import { useEpidemicStore } from '@/stores/epidemicStore';
import { useHistoryStore } from '@/stores/historyStore';
import { useGridStore } from '@/stores/gridStore';
import { showToast } from '../logic/toast';
import { processExcelFile } from '../logic/excelProcessor';

const DEMO_DATA_URL = './demo/sample_epidemic_data.xlsx';

export function useDemoData() {
  const epidemicStore = useEpidemicStore();
  const gridStore = useGridStore();
  const historyStore = useHistoryStore();
  
  const isLoadingDemo = ref(false);

  /**
   * 샘플 데이터 파일을 fetch하여 그리드에 로드
   */
  async function loadDemoData(): Promise<boolean> {
    if (isLoadingDemo.value) return false;
    
    isLoadingDemo.value = true;

    try {
      // Clear existing filters
      gridStore.clearAllFilters();
      
      // Fetch the sample Excel file as a blob
      const response = await fetch(DEMO_DATA_URL);
      
      if (!response.ok) {
        throw new Error(`데모 데이터 로드 실패: ${response.statusText}`);
      }

      const blob = await response.blob();
      const file = new File([blob], 'sample_epidemic_data.xlsx', { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      // Use the existing Excel processor (same as normal file upload)
      const { headers, rows } = await processExcelFile(file);

      // Capture history before replacing data
      historyStore.captureSnapshot('demo_data_load');
      
      epidemicStore.setInitialData({ headers, rows });

      showToast('데모 데이터 로드 완료! 하단 탭(환자 특성, 임상 증상 등)을 눌러 분석 결과를 확인해보세요.', 'success');
      
      isLoadingDemo.value = false;
      return true;
    } catch (error) {
      console.error('Failed to load demo data:', error);
      showToast(error instanceof Error ? error.message : '데모 데이터 로드 실패', 'error');
      isLoadingDemo.value = false;
      return false;
    }
  }

  return {
    isLoadingDemo,
    loadDemoData
  };
}
