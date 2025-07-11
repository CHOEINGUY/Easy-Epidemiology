/**
 * 고유 식별자 관련 유틸리티 함수들
 * ValidationManager와 렌더링 컴포넌트에서 공통으로 사용
 */

/**
 * 열 메타데이터로부터 고유 식별자 생성
 * @param {Object} columnMeta - 열 메타데이터
 * @returns {string} 고유 식별자
 */
export function getColumnUniqueKey(columnMeta) {
  if (!columnMeta) return null;
  
  // 기본 속성들
  const dataKey = columnMeta.dataKey || '';
  const type = columnMeta.type || '';
  const cellIndex = columnMeta.cellIndex !== null && columnMeta.cellIndex !== undefined ? columnMeta.cellIndex : '';
  const group = columnMeta.group || '';
  
  // 특수 열들의 경우 추가 식별자 사용
  if (type === 'individualExposureTime') {
    return `exposure_${dataKey}_${cellIndex}`;
  }
  if (type === 'isConfirmedCase') {
    return 'confirmed_case';
  }
  if (type === 'patientId') {
    return 'patient_id';
  }
  if (type === 'patientName') {
    return 'patient_name';
  }
  
  // 일반적인 경우: dataKey + type + cellIndex + group 조합
  const parts = [dataKey, type, cellIndex, group].filter(Boolean);
  return parts.join('__');
}

/**
 * 행과 열 정보로부터 에러 키 생성
 * @param {number} rowIndex - 행 인덱스
 * @param {string} uniqueKey - 열의 고유 식별자
 * @returns {string} 에러 키
 */
export function getErrorKey(rowIndex, uniqueKey) {
  return `${rowIndex}_${uniqueKey}`;
}

/**
 * 에러 키에서 행 인덱스와 고유 식별자 분리
 * @param {string} errorKey - 에러 키
 * @returns {Object} {rowIndex, uniqueKey}
 */
export function parseErrorKey(errorKey) {
  const parts = errorKey.split('_');
  if (parts.length < 2) return null;
  
  const rowIndex = parseInt(parts[0]);
  const uniqueKey = parts.slice(1).join('_');
  
  return { rowIndex, uniqueKey };
}

/**
 * 고유 식별자 기반으로 에러 여부 확인
 * @param {number} rowIndex - 행 인덱스
 * @param {number} colIndex - 열 인덱스
 * @param {Object} columnMeta - 열 메타데이터
 * @param {Map} validationErrors - 에러 Map
 * @returns {boolean} 에러 여부
 */
export function hasValidationError(rowIndex, colIndex, columnMeta, validationErrors) {
  if (!validationErrors || !columnMeta) return false;
  
  const uniqueKey = getColumnUniqueKey(columnMeta);
  if (!uniqueKey) return false;
  
  const errorKey = getErrorKey(rowIndex, uniqueKey);
  return validationErrors.has(errorKey);
}

/**
 * 고유 식별자 기반으로 에러 메시지 조회
 * @param {number} rowIndex - 행 인덱스
 * @param {number} colIndex - 열 인덱스
 * @param {Object} columnMeta - 열 메타데이터
 * @param {Map} validationErrors - 에러 Map
 * @returns {string} 에러 메시지
 */
export function getValidationMessage(rowIndex, colIndex, columnMeta, validationErrors) {
  if (!validationErrors || !columnMeta) return '';
  
  const uniqueKey = getColumnUniqueKey(columnMeta);
  if (!uniqueKey) return '';
  
  const errorKey = getErrorKey(rowIndex, uniqueKey);
  if (validationErrors.has(errorKey)) {
    const error = validationErrors.get(errorKey);
    return error.message || '유효성 검사 오류';
  }
  
  return '';
} 