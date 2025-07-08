// excelProcessorSync.js - 동기적 Excel 처리 (file:/// 환경 호환)

import * as XLSX from 'xlsx';
import { processInChunks } from '../../../utils/asyncProcessor.js';

// --- Utility functions copied from excelWorker.js ---

function findColumnRanges(headerRow1, headerRow2) {
  console.log('=== findColumnRanges 디버깅 ===');
  console.log('headerRow1:', headerRow1);
  console.log('headerRow2:', headerRow2);
  
  const ranges = {};

  // 연번 컬럼 (고정) - Excel template 에서 첫 열
  ranges.serial = 0;

  // 환자여부 컬럼 위치 탐색 (행 1 우선, 실패 시 기본 1)
  const isPatientIndex = headerRow1.findIndex(cell =>
    cell?.toString().includes('환자여부') || cell?.toString().includes('환자 여부')
  );
  ranges.isPatient = isPatientIndex !== -1 ? isPatientIndex : 1;
  console.log('isPatient 범위:', ranges.isPatient);

  // 기본정보 범위
  const basicStart = headerRow1.findIndex(cell => cell?.toString().includes('기본정보'));
  if (basicStart === -1) throw new Error('기본정보 카테고리 없음');
  let basicEnd = basicStart + 1;
  while (basicEnd < headerRow1.length && (!headerRow1[basicEnd] || headerRow1[basicEnd].toString().trim()==='')) {
    basicEnd++;
  }
  ranges.basic = { start: basicStart, end: basicEnd };
  console.log('basic 범위:', ranges.basic);

  // 임상증상 범위
  const clinicalStart = headerRow1.findIndex(cell => cell?.toString().includes('임상증상'));
  if (clinicalStart === -1) throw new Error('임상증상 카테고리 없음');
  let clinicalEnd = clinicalStart + 1;
  while (clinicalEnd < headerRow1.length && (!headerRow1[clinicalEnd] || headerRow1[clinicalEnd].toString().trim()==='')) {
    clinicalEnd++;
  }
  ranges.clinical = { start: clinicalStart, end: clinicalEnd };
  console.log('clinical 범위:', ranges.clinical);

  // 증상발현시간 컬럼 (2행 검색)
  const onsetIdx = headerRow2.findIndex(cell =>
    cell?.toString().includes('증상발현시간') || cell?.toString().includes('발현시간')
  );
  if (onsetIdx === -1) throw new Error('증상발현시간 컬럼 없음');
  ranges.symptomOnset = onsetIdx;
  console.log('symptomOnset 인덱스:', ranges.symptomOnset);

  // 의심원 노출시간 (2행 검색, 있을 수도 있음)
  const exposureIdx = headerRow2.findIndex(cell =>
    typeof cell === 'string' && (cell.includes('의심원노출시간') || cell.includes('의심원 노출시간'))
  );
  ranges.individualExposureTime = exposureIdx; // -1 if not present
  console.log('individualExposureTime 인덱스:', ranges.individualExposureTime);

  // 식단 범위
  const dietStart = headerRow1.findIndex(cell => cell?.toString().includes('식단'));
  if (dietStart === -1) throw new Error('식단 카테고리 없음');
  ranges.diet = { start: dietStart, end: headerRow2.length };
  console.log('diet 범위:', ranges.diet);

  console.log('최종 ranges:', ranges);
  return ranges;
}

function convertExcelDate(cellValue) {
  if (cellValue === null || cellValue === undefined || String(cellValue).trim() === '') return '';
  const str = String(cellValue).trim();
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(str)) return str;
  const num = Number(cellValue);
  if (!isNaN(num) && num > 1) {
    const date = XLSX.SSF.parse_date_code(num);
    if (date && date.y) {
      const y = date.y;
      const m = String(date.m).padStart(2,'0');
      const d = String(date.d).padStart(2,'0');
      const hh = String(date.H||0).padStart(2,'0');
      const mm = String(date.M||0).padStart(2,'0');
      return `${y}-${m}-${d} ${hh}:${mm}`;
    }
  }
  const js = new Date(str);
  if (!isNaN(js.getTime())) {
    const y = js.getFullYear();
    const m = String(js.getMonth()+1).padStart(2,'0');
    const d = String(js.getDate()).padStart(2,'0');
    const hh = String(js.getHours()).padStart(2,'0');
    const mm = String(js.getMinutes()).padStart(2,'0');
    return `${y}-${m}-${d} ${hh}:${mm}`;
  }
  return str;
}

function parseAOAData(aoa) {
  const [headerRow1 = [], headerRow2 = []] = aoa;
  const dataRows = aoa.slice(2);

  const ranges = findColumnRanges(headerRow1, headerRow2);
  const hasIndividualExposureTime = ranges.individualExposureTime !== -1;

  const headers = {
    basic: headerRow2.slice(ranges.basic.start, ranges.basic.end).filter(h => h?.trim()),
    clinical: headerRow2.slice(ranges.clinical.start, ranges.clinical.end).filter(h => h?.trim()),
    diet: headerRow2.slice(ranges.diet.start, ranges.diet.end).filter(h => h?.trim())
  };

  const rows = dataRows
    .filter(row => {
      // A열(연번) 제외하고 데이터 유무 확인 (연번은 필수 아님)
      const dataCells = row.slice(1);
      return dataCells.some(cell => cell !== null && cell !== undefined && cell.toString().trim() !== '');
    })
    .map(row => ({
      isPatient: (row[ranges.isPatient] ?? '').toString().trim(),
      basicInfo: row.slice(ranges.basic.start, ranges.basic.end).map(c => (c ?? '').toString().trim()),
      clinicalSymptoms: row.slice(ranges.clinical.start, ranges.clinical.end).map(c => (c ?? '').toString().trim()),
      symptomOnset: convertExcelDate(row[ranges.symptomOnset]),
      individualExposureTime: hasIndividualExposureTime ? convertExcelDate(row[ranges.individualExposureTime]) : '',
      dietInfo: row.slice(ranges.diet.start, ranges.diet.end).map(c => (c ?? '').toString().trim())
    }));

  return { headers, rows, hasIndividualExposureTime };
}

/**
 * Excel 파일을 동기적으로 처리하는 함수
 * @param {File} file - Excel 파일
 * @param {Function} onProgress - 진행률 콜백
 * @returns {Promise} 파싱된 데이터
 */
export function processExcelFileSync(file, onProgress = () => {}) {
  if (!(file instanceof File)) {
    return Promise.reject(new Error('유효한 파일이 아닙니다.'));
  }

  return new Promise((resolve, reject) => {
    file
      .arrayBuffer()
      .then((buffer) => {
        try {
          onProgress(10);

          // Step 1: read workbook
          const wb = XLSX.read(new Uint8Array(buffer), { type: 'array' });
          onProgress(30);

          const firstSheetName = wb.SheetNames[0];
          const sheet = wb.Sheets[firstSheetName];

          // Convert to AOA
          const aoa = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });
          onProgress(80);

          const parsed = parseAOAData(aoa);
          onProgress(100);

          resolve(parsed);
        } catch (error) {
          reject(new Error(error.message || 'Excel 파싱 실패'));
        }
      })
      .catch((err) => reject(err));
  });
}

/**
 * Excel 파일을 비동기적으로 처리하는 함수 (requestIdleCallback 사용)
 * @param {File} file - Excel 파일
 * @param {Function} onProgress - 진행률 콜백
 * @returns {Promise} 파싱된 데이터
 */
export function processExcelFileAsync(file, onProgress = () => {}) {
  if (!(file instanceof File)) {
    return Promise.reject(new Error('유효한 파일이 아닙니다.'));
  }

  return new Promise((resolve, reject) => {
    file
      .arrayBuffer()
      .then((buffer) => {
        try {
          onProgress(5);

          // Step 1: read workbook (동기)
          const wb = XLSX.read(new Uint8Array(buffer), { type: 'array' });
          onProgress(20);

          const firstSheetName = wb.SheetNames[0];
          const sheet = wb.Sheets[firstSheetName];

          // Convert to AOA (동기)
          const aoa = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });
          onProgress(40);

          // Step 2: 비동기적으로 데이터 파싱
          const [headerRow1 = [], headerRow2 = []] = aoa;
          const dataRows = aoa.slice(2);

          // 헤더 파싱 (동기)
          const ranges = findColumnRanges(headerRow1, headerRow2);
          const hasIndividualExposureTime = ranges.individualExposureTime !== -1;

          const headers = {
            basic: headerRow2.slice(ranges.basic.start, ranges.basic.end).filter(h => h?.trim()),
            clinical: headerRow2.slice(ranges.clinical.start, ranges.clinical.end).filter(h => h?.trim()),
            diet: headerRow2.slice(ranges.diet.start, ranges.diet.end).filter(h => h?.trim())
          };

          onProgress(50);

          // 데이터 행을 비동기적으로 처리
          const filteredRows = dataRows.filter(row => {
            const dataCells = row.slice(1);
            return dataCells.some(cell => cell !== null && cell !== undefined && cell.toString().trim() !== '');
          });

          const rows = [];

          const processor = (row) => {
            const processedRow = {
              isPatient: (row[ranges.isPatient] ?? '').toString().trim(),
              basicInfo: row.slice(ranges.basic.start, ranges.basic.end).map(c => (c ?? '').toString().trim()),
              clinicalSymptoms: row.slice(ranges.clinical.start, ranges.clinical.end).map(c => (c ?? '').toString().trim()),
              symptomOnset: convertExcelDate(row[ranges.symptomOnset]),
              individualExposureTime: hasIndividualExposureTime ? convertExcelDate(row[ranges.individualExposureTime]) : '',
              dietInfo: row.slice(ranges.diet.start, ranges.diet.end).map(c => (c ?? '').toString().trim())
            };
            rows.push(processedRow);
          };

          const progressHandler = (progress) => {
            // 50% ~ 95% 범위에서 진행률 표시
            const adjustedProgress = 50 + (progress * 0.45);
            onProgress(adjustedProgress);
          };

          const completeHandler = () => {
            onProgress(100);
            resolve({ headers, rows, hasIndividualExposureTime });
          };

          const errorHandler = (error) => {
            reject(new Error(error.message || 'Excel 파싱 실패'));
          };

          processInChunks(filteredRows, processor, {
            chunkSize: 100,
            onProgress: progressHandler,
            onComplete: completeHandler,
            onError: errorHandler
          });

        } catch (error) {
          reject(new Error(error.message || 'Excel 파싱 실패'));
        }
      })
      .catch((err) => reject(err));
  });
} 