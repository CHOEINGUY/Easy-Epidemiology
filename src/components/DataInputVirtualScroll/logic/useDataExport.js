import * as XLSX from 'xlsx';

/**
 * 가상 스크롤 버전 전용: 데이터 내보내기/템플릿 다운로드 유틸리티
 * (Refactor 버전의 useDataExport 를 복사하여 의존성 제거)
 */
export function useDataExport() {
  /**
   * XLSX 파일 다운로드
   * @param {Array<Array<any>>} worksheetData - 헤더를 포함한 2차원 배열 데이터
   * @param {Array<Object>} merges - 셀 병합 정보 (옵션)
   * @param {string} fileName - 저장 파일명 (기본 exported_data.xlsx)
   */
  const downloadXLSX = (
    worksheetData,
    merges = [],
    fileName = 'exported_data.xlsx',
  ) => {
    try {
      if (!worksheetData) throw new Error('워크시트 데이터가 제공되지 않았습니다.');

      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      if (merges.length) worksheet['!merges'] = merges;
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
      XLSX.writeFile(workbook, fileName);
    } catch (err) {
      console.error('XLSX 다운로드 실패:', err);
      // TODO: toast 시스템 도입 시 사용자 알림 추가
    }
  };

  /**
   * 템플릿 XLSX 다운로드 (basic | individual)
   * @param {'basic'|'individual'} type
   */
  const downloadTemplate = (type = 'basic') => {
    const link = document.createElement('a');
    if (type === 'individual') {
      link.href = '/Easy-Epidemiology_Individual_Exposure_Time_Template.xlsx';
      link.setAttribute(
        'download',
        'Easy-Epidemiology_Individual_Exposure_Time_Template.xlsx',
      );
    } else {
      link.href = '/Easy-Epidemiology_Template.xlsx';
      link.setAttribute('download', 'Easy-Epidemiology_Template.xlsx');
    }
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return { downloadXLSX, downloadTemplate };
} 