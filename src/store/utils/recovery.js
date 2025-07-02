/**
 * 데이터 복구 유틸리티
 * 손상된 데이터를 복구하고 기본값을 제공합니다.
 */

/**
 * 기본 헤더 구조를 생성합니다.
 * @returns {Object} 기본 헤더 구조
 */
export function createDefaultHeaders() {
  return {
    basic: ["", ""],
    clinical: ["", "", "", "", ""],
    diet: Array(30).fill("")
  };
}

/**
 * 기본 행 구조를 생성합니다.
 * @param {Object} headers - 헤더 정보
 * @returns {Object} 기본 행 구조
 */
export function createDefaultRow(headers) {
  return {
    isPatient: "",
    basicInfo: Array(headers?.basic?.length || 2).fill(""),
    clinicalSymptoms: Array(headers?.clinical?.length || 5).fill(""),
    symptomOnset: "",
    individualExposureTime: "",
    dietInfo: Array(headers?.diet?.length || 30).fill("")
  };
}

/**
 * 기본 데이터 구조를 생성합니다.
 * @returns {Object} 기본 데이터 구조
 */
export function createDefaultData() {
  const headers = createDefaultHeaders();
  const rows = Array.from({ length: 10 }, () => createDefaultRow(headers));
  
  return {
    version: '1.0',
    timestamp: Date.now(),
    headers: headers,
    rows: rows,
    settings: { 
      isIndividualExposureColumnVisible: false 
    }
  };
}

/**
 * 헤더 데이터를 복구합니다.
 * @param {Object} headers - 복구할 헤더 데이터
 * @returns {Object} 복구된 헤더 데이터
 */
export function repairHeaders(headers) {
  if (!headers || typeof headers !== 'object') {
    console.warn('[Recovery] 헤더 데이터가 유효하지 않아 기본값으로 복구합니다.');
    return createDefaultHeaders();
  }
  
  const repaired = {
    basic: Array.isArray(headers.basic) ? headers.basic : ["", ""],
    clinical: Array.isArray(headers.clinical) ? headers.clinical : ["", "", "", "", ""],
    diet: Array.isArray(headers.diet) ? headers.diet : Array(30).fill("")
  };
  
  // 빈 배열이거나 null/undefined 값들을 빈 문자열로 정규화
  repaired.basic = repaired.basic.map(item => item || "");
  repaired.clinical = repaired.clinical.map(item => item || "");
  repaired.diet = repaired.diet.map(item => item || "");
  
  return repaired;
}

/**
 * 행 데이터를 복구합니다.
 * @param {Array} rows - 복구할 행 데이터
 * @param {Object} headers - 헤더 정보
 * @returns {Array} 복구된 행 데이터
 */
export function repairRows(rows, headers) {
  if (!Array.isArray(rows)) {
    console.warn('[Recovery] 행 데이터가 유효하지 않아 기본값으로 복구합니다.');
    return Array.from({ length: 10 }, () => createDefaultRow(headers));
  }
  
  return rows.map((row, index) => {
    if (!row || typeof row !== 'object') {
      console.warn(`[Recovery] 행 ${index}가 유효하지 않아 기본값으로 복구합니다.`);
      return createDefaultRow(headers);
    }
    
    const repairedRow = {
      isPatient: row.isPatient || "",
      basicInfo: Array.isArray(row.basicInfo) ? 
        row.basicInfo : Array(headers?.basic?.length || 2).fill(""),
      clinicalSymptoms: Array.isArray(row.clinicalSymptoms) ? 
        row.clinicalSymptoms : Array(headers?.clinical?.length || 5).fill(""),
      symptomOnset: row.symptomOnset || "",
      individualExposureTime: row.individualExposureTime || "",
      dietInfo: Array.isArray(row.dietInfo) ? 
        row.dietInfo : Array(headers?.diet?.length || 30).fill("")
    };
    
    // 배열 길이를 헤더에 맞게 조정
    repairedRow.basicInfo = adjustArrayLength(
      repairedRow.basicInfo, 
      headers?.basic?.length || 2
    );
    repairedRow.clinicalSymptoms = adjustArrayLength(
      repairedRow.clinicalSymptoms, 
      headers?.clinical?.length || 5
    );
    repairedRow.dietInfo = adjustArrayLength(
      repairedRow.dietInfo, 
      headers?.diet?.length || 30
    );
    
    return repairedRow;
  });
}

/**
 * 배열 길이를 조정합니다.
 * @param {Array} array - 조정할 배열
 * @param {number} targetLength - 목표 길이
 * @returns {Array} 조정된 배열
 */
function adjustArrayLength(array, targetLength) {
  if (!Array.isArray(array)) {
    return Array(targetLength).fill("");
  }
  
  const adjusted = [...array];
  
  // 길이가 부족하면 빈 문자열로 채움
  while (adjusted.length < targetLength) {
    adjusted.push("");
  }
  
  // 길이가 초과하면 자름
  if (adjusted.length > targetLength) {
    adjusted.splice(targetLength);
  }
  
  // null/undefined 값을 빈 문자열로 변환
  return adjusted.map(item => item || "");
}

/**
 * 설정 데이터를 복구합니다.
 * @param {Object} settings - 복구할 설정 데이터
 * @returns {Object} 복구된 설정 데이터
 */
export function repairSettings(settings) {
  if (!settings || typeof settings !== 'object') {
    return { isIndividualExposureColumnVisible: false };
  }
  
  return {
    isIndividualExposureColumnVisible: Boolean(settings.isIndividualExposureColumnVisible)
  };
}

/**
 * 전체 데이터를 복구합니다.
 * @param {Object} rawData - 복구할 원본 데이터
 * @returns {Object} 복구된 데이터
 */
export function repairData(rawData) {
  try {
    if (!rawData || typeof rawData !== 'object') {
      console.warn('[Recovery] 데이터가 유효하지 않아 기본값으로 복구합니다.');
      return createDefaultData();
    }
    
    const repaired = {
      version: rawData.version || '1.0',
      timestamp: rawData.timestamp || Date.now(),
      headers: repairHeaders(rawData.headers),
      rows: repairRows(rawData.rows, rawData.headers),
      settings: repairSettings(rawData.settings)
    };
    
    console.log('[Recovery] 데이터 복구가 완료되었습니다.');
    return repaired;
    
  } catch (error) {
    console.error('[Recovery] 데이터 복구 중 오류 발생:', error);
    return createDefaultData();
  }
}

/**
 * localStorage에서 데이터를 안전하게 로드합니다.
 * @returns {Object} 로드된 데이터
 */
export function safeLoadFromStorage() {
  try {
    const headersData = localStorage.getItem("headers");
    const rowsData = localStorage.getItem("rows");
    const visibilityData = localStorage.getItem("isIndividualExposureColumnVisible");
    
    if (!headersData || !rowsData) {
      console.warn('[Recovery] localStorage에 데이터가 없어 기본값을 사용합니다.');
      return createDefaultData();
    }
    
    const headers = JSON.parse(headersData);
    const rows = JSON.parse(rowsData);
    const isIndividualExposureColumnVisible = visibilityData ? 
      JSON.parse(visibilityData) : false;
    
    const rawData = {
      headers: headers,
      rows: rows,
      settings: { isIndividualExposureColumnVisible }
    };
    
    return repairData(rawData);
    
  } catch (error) {
    console.error('[Recovery] localStorage 로드 중 오류 발생:', error);
    return createDefaultData();
  }
}

/**
 * 데이터 무결성을 검사합니다.
 * @param {Object} data - 검사할 데이터
 * @returns {Object} 검사 결과
 */
export function validateDataIntegrity(data) {
  const issues = [];
  
  if (!data) {
    issues.push('데이터가 없습니다.');
    return { valid: false, issues };
  }
  
  if (!data.headers) {
    issues.push('헤더 데이터가 없습니다.');
  } else {
    if (!Array.isArray(data.headers.basic)) {
      issues.push('기본정보 헤더가 배열이 아닙니다.');
    }
    if (!Array.isArray(data.headers.clinical)) {
      issues.push('임상증상 헤더가 배열이 아닙니다.');
    }
    if (!Array.isArray(data.headers.diet)) {
      issues.push('식단정보 헤더가 배열이 아닙니다.');
    }
  }
  
  if (!Array.isArray(data.rows)) {
    issues.push('행 데이터가 배열이 아닙니다.');
  } else {
    data.rows.forEach((row, index) => {
      if (!row || typeof row !== 'object') {
        issues.push(`행 ${index}가 유효하지 않습니다.`);
      } else {
        if (!Array.isArray(row.basicInfo)) {
          issues.push(`행 ${index}의 기본정보가 배열이 아닙니다.`);
        }
        if (!Array.isArray(row.clinicalSymptoms)) {
          issues.push(`행 ${index}의 임상증상이 배열이 아닙니다.`);
        }
        if (!Array.isArray(row.dietInfo)) {
          issues.push(`행 ${index}의 식단정보가 배열이 아닙니다.`);
        }
      }
    });
  }
  
  return {
    valid: issues.length === 0,
    issues: issues
  };
}

/**
 * 데이터 백업을 생성합니다.
 * @param {Object} data - 백업할 데이터
 * @returns {Object} 백업 데이터
 */
export function createBackup(data) {
  return {
    timestamp: Date.now(),
    data: JSON.parse(JSON.stringify(data)), // 깊은 복사
    version: '1.0'
  };
}

/**
 * 백업에서 데이터를 복원합니다.
 * @param {Object} backup - 백업 데이터
 * @returns {Object} 복원된 데이터
 */
export function restoreFromBackup(backup) {
  if (!backup || !backup.data) {
    console.error('[Recovery] 백업 데이터가 유효하지 않습니다.');
    return null;
  }
  
  try {
    const restored = repairData(backup.data);
    console.log('[Recovery] 백업에서 데이터가 복원되었습니다.');
    return restored;
  } catch (error) {
    console.error('[Recovery] 백업 복원 중 오류 발생:', error);
    return null;
  }
} 