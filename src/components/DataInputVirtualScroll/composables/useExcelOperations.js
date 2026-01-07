
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { logger } from '../../../utils/logger.js';
import { processExcelFile } from '../logic/excelProcessor.js';
import { useDataExport } from '../logic/useDataExport.js';
import { showToast, showConfirmToast } from '../logic/toast.js';

export function useExcelOperations(storeBridge, validationManager, selectionSystem, tryStartOperation, endOperation, allColumnsMeta, getCellValue, flags = {}) {
  const isUploadingExcel = ref(false);
  const excelUploadProgress = ref(0);
  const { downloadXLSXSmart, downloadTemplate } = useDataExport();

  // [Critical Fix] Async Race Condition Prevention
  const isMounted = ref(false);
  onMounted(() => { isMounted.value = true; });
  onBeforeUnmount(() => { isMounted.value = false; });

  async function onExcelFileSelected(file) {
    if (!tryStartOperation('excel_upload', { blocking: true, timeout: 60000 })) {
      return;
    }

    isUploadingExcel.value = true;
    excelUploadProgress.value = 0;
    try {
      if (validationManager) {
        validationManager.clearAllErrors();
      }

      logger.debug('[Excel] 필터 초기화 시작');
      storeBridge.clearAllFilters();

      logger.debug(`[Excel] 파일 처리 시작: ${file.name}`);

      const { headers, rows } = await processExcelFile(file, (progress) => {
        if (!isMounted.value) return; // Unmount check
        excelUploadProgress.value = Math.round(progress);
      });

      if (!isMounted.value) {
        logger.warn('[Excel] 컴포넌트 언마운트로 업로드 중단');
        return;
      }

      logger.debug('[Excel] 헤더 분석 결과:', headers);

      await storeBridge.setGridData(headers, rows);

      if (isMounted.value) {
        showToast('엑셀 파일이 성공적으로 업로드되었습니다.', 'success');
      }
    } catch (error) {
      if (!isMounted.value) return;
      logger.error('[Excel] 업로드 중 오류:', error);
      showToast(`엑셀 업로드 실패: ${error.message}`, 'error');
    } finally {
      if (isMounted.value) {
        isUploadingExcel.value = false;
        endOperation('excel_upload');
      }
    }
  }

  async function onExportData() {
    if (!tryStartOperation('excel_export', { blocking: true, timeout: 30000 })) {
      return;
    }

    try {
      const now = new Date();
      const timestamp = now.toISOString().replace(/[-:T]/g, '').slice(0, 12);
      const fileName = `data_${timestamp}.xlsx`;

      const hasIndividualExposure = flags.hasIndividualExposure?.value ?? flags.hasIndividualExposure ?? false;
      const hasConfirmedCase = flags.hasConfirmedCase?.value ?? flags.hasConfirmedCase ?? false;

      await downloadXLSXSmart(
        allColumnsMeta.value, 
        storeBridge.rows, 
        getCellValue, 
        hasIndividualExposure, 
        hasConfirmedCase, 
        fileName
      );
      showToast('엑셀 다운로드가 완료되었습니다.', 'success');
    } catch (error) {
      logger.error('[Excel] 내보내기 중 오류:', error);
      showToast(`내보내기 실패: ${error.message}`, 'error');
    } finally {
      endOperation('excel_export');
    }
  }

  function onDownloadTemplate(type) {
    if (!tryStartOperation('download_template')) return;

    try {
      downloadTemplate(type);
      showToast('템플릿 다운로드가 완료되었습니다.', 'success');
    } catch (error) {
      logger.error('[Excel] 템플릿 다운로드 중 오류:', error);
      showToast('템플릿 다운로드 실패', 'error');
    } finally {
      endOperation('download_template');
    }
  }

  async function onCopyEntireData() {
    if (!tryStartOperation('copy_data')) return;

    try {
      const confirmed = await showConfirmToast('전체 데이터를 클립보드에 복사하시겠습니까? (데이터 양에 따라 시간이 걸릴 수 있습니다)');
      if (!confirmed) {
        endOperation('copy_data');
        return;
      }

      const rows = storeBridge.rows;
      const columns = allColumnsMeta.value;

      // [Critical Fix] UI Freeze Prevention
      // 대용량 데이터 처리 시 UI 차단 방지를 위해 청크 단위로 처리
      const CHUNK_SIZE = 500;
      const clipboardParts = [];

      // 헤더 처리
      const headerText = columns.map(col => {
        return (col.headerText || '')
          .replace(/<br\s*\/?>/gi, ' ')
          .replace(/<[^>]*>/g, '')
          .trim();
      }).join('\t');
      clipboardParts.push(headerText);

      // 데이터 처리 (청크 분할)
      for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
        if (!isMounted.value) return; // 작업 중 언마운트 시 중단

        const chunk = rows.slice(i, i + CHUNK_SIZE);
        const chunkText = chunk.map((row, idx) => {
          const rowIndex = i + idx;
          return columns.map(col => {
            return getCellValue(row, col, rowIndex) ?? '';
          }).join('\t');
        }).join('\n');
        
        clipboardParts.push(chunkText);

        // 메인 스레드 양보
        await new Promise(resolve => setTimeout(resolve, 0));
      }

      const clipboardText = clipboardParts.join('\n');

      if (!isMounted.value) return;

      await navigator.clipboard.writeText(clipboardText);
      showToast('전체 데이터가 클립보드에 복사되었습니다.', 'success');
    } catch (error) {
      logger.error('[Excel] 복사 중 오류:', error);
      showToast('데이터 복사 실패', 'error');
    } finally {
      endOperation('copy_data');
    }
  }

  // Drag & Drop handler linkage
  function onFileDropped(file) {
    onExcelFileSelected(file);
  }

  return {
    isUploadingExcel,
    excelUploadProgress,
    onExcelFileSelected,
    onExportData,
    onDownloadTemplate,
    onCopyEntireData,
    onFileDropped
  };
}
