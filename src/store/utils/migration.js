/**
 * localStorage 데이터 마이그레이션 유틸리티
 * 기존 데이터를 새로운 시스템으로 안전하게 마이그레이션합니다.
 */

// 기존 localStorage 키들
const LEGACY_KEYS = {
  HEADERS: 'headers',
  ROWS: 'rows',
  VISIBILITY: 'isIndividualExposureColumnVisible',
  CONFIRMED_CASE_VISIBILITY: 'isConfirmedCaseColumnVisible'
};

// 새로운 localStorage 키들
const NEW_KEYS = {
  MAIN_DATA: 'epidemiology_data',
  HISTORY: 'epidemiology_history'
};

/**
 * 기존 데이터를 백업합니다.
 * @returns {Object} 백업된 데이터
 */
export function backupLegacyData() {
  try {
    console.log('[Migration] 기존 데이터 백업을 시작합니다...');
    
    const backup = {
      timestamp: Date.now(),
      headers: null,
      rows: null,
      visibility: null,
      confirmedCaseVisibility: null,
      success: false
    };
    
    // 기존 데이터 로드
    const headers = localStorage.getItem(LEGACY_KEYS.HEADERS);
    const rows = localStorage.getItem(LEGACY_KEYS.ROWS);
    const visibility = localStorage.getItem(LEGACY_KEYS.VISIBILITY);
    const confirmedCaseVisibility = localStorage.getItem(LEGACY_KEYS.CONFIRMED_CASE_VISIBILITY);
    
    if (headers) {
      backup.headers = JSON.parse(headers);
      console.log('[Migration] 헤더 데이터 백업 완료');
    }
    
    if (rows) {
      backup.rows = JSON.parse(rows);
      console.log('[Migration] 행 데이터 백업 완료');
    }
    
    if (visibility) {
      backup.visibility = JSON.parse(visibility);
      console.log('[Migration] 개별 노출시간 열 가시성 설정 백업 완료');
    }
    
    if (confirmedCaseVisibility) {
      backup.confirmedCaseVisibility = JSON.parse(confirmedCaseVisibility);
      console.log('[Migration] 확진자 여부 열 가시성 설정 백업 완료');
    }
    
    // 백업 데이터를 localStorage에 저장
    const backupKey = `epidemiology_backup_${Date.now()}`;
    localStorage.setItem(backupKey, JSON.stringify(backup));
    
    backup.success = true;
    backup.backupKey = backupKey;
    
    console.log('[Migration] 백업 완료:', backupKey);
    return backup;
    
  } catch (error) {
    console.error('[Migration] 백업 중 오류 발생:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 기존 데이터를 새로운 형식으로 마이그레이션합니다.
 * @returns {Object|null} 마이그레이션된 데이터 또는 null
 */
export function migrateLegacyData() {
  try {
    console.log('[Migration] 데이터 마이그레이션을 시작합니다...');
    
    // 기존 데이터 로드
    const headers = localStorage.getItem(LEGACY_KEYS.HEADERS);
    const rows = localStorage.getItem(LEGACY_KEYS.ROWS);
    const visibility = localStorage.getItem(LEGACY_KEYS.VISIBILITY);
    const confirmedCaseVisibility = localStorage.getItem(LEGACY_KEYS.CONFIRMED_CASE_VISIBILITY);
    
    if (!headers && !rows) {
      console.log('[Migration] 마이그레이션할 기존 데이터가 없습니다.');
      return null;
    }
    
    // 새로운 형식으로 변환
    const migratedData = {
      version: '1.0',
      timestamp: Date.now(),
      headers: headers ? JSON.parse(headers) : null,
      rows: rows ? JSON.parse(rows) : null,
      settings: {
        isIndividualExposureColumnVisible: visibility ? JSON.parse(visibility) : false,
        isConfirmedCaseColumnVisible: confirmedCaseVisibility ? JSON.parse(confirmedCaseVisibility) : false
      }
    };
    
    console.log('[Migration] 데이터 마이그레이션 완료');
    return migratedData;
    
  } catch (error) {
    console.error('[Migration] 데이터 마이그레이션 실패:', error);
    return null;
  }
}

/**
 * 마이그레이션 상태를 확인합니다.
 * @returns {Object} 마이그레이션 상태 정보
 */
export function getMigrationStatus() {
  const status = {
    hasLegacyData: false,
    hasNewData: false,
    needsMigration: false,
    legacyKeys: [],
    newKeys: []
  };
  
  // 기존 데이터 확인
  const legacyHeaders = localStorage.getItem(LEGACY_KEYS.HEADERS);
  const legacyRows = localStorage.getItem(LEGACY_KEYS.ROWS);
  
  if (legacyHeaders || legacyRows) {
    status.hasLegacyData = true;
    status.legacyKeys = [LEGACY_KEYS.HEADERS, LEGACY_KEYS.ROWS, LEGACY_KEYS.VISIBILITY];
  }
  
  // 새로운 데이터 확인
  const newData = localStorage.getItem(NEW_KEYS.MAIN_DATA);
  if (newData) {
    status.hasNewData = true;
    status.newKeys = [NEW_KEYS.MAIN_DATA, NEW_KEYS.HISTORY];
  }
  
  // 마이그레이션 필요 여부
  status.needsMigration = status.hasLegacyData && !status.hasNewData;
  
  return status;
}

/**
 * 마이그레이션을 실행합니다.
 * @returns {Object} 마이그레이션 결과
 */
export function executeMigration() {
  const result = {
    success: false,
    backupCreated: false,
    dataMigrated: false,
    error: null
  };
  
  try {
    console.log('[Migration] 마이그레이션을 시작합니다...');
    
    // 1. 백업 생성
    const backup = backupLegacyData();
    if (backup.success) {
      result.backupCreated = true;
      console.log('[Migration] 백업 생성 완료');
    } else {
      throw new Error('백업 생성 실패');
    }
    
    // 2. 데이터 마이그레이션
    const migratedData = migrateLegacyData();
    if (migratedData) {
      // 새로운 형식으로 저장
      localStorage.setItem(NEW_KEYS.MAIN_DATA, JSON.stringify(migratedData));
      result.dataMigrated = true;
      console.log('[Migration] 데이터 마이그레이션 완료');
    } else {
      throw new Error('데이터 마이그레이션 실패');
    }
    
    result.success = true;
    console.log('[Migration] 마이그레이션 완료');
    
  } catch (error) {
    result.error = error.message;
    console.error('[Migration] 마이그레이션 실패:', error);
  }
  
  return result;
}

/**
 * 마이그레이션 상태를 콘솔에 출력합니다 (테스트용).
 */
export function logMigrationStatus() {
  console.log('=== 마이그레이션 상태 확인 ===');
  
  const status = getMigrationStatus();
  console.log('현재 상태:', status);
  
  if (status.hasLegacyData) {
    console.log('기존 데이터 발견:');
    status.legacyKeys.forEach(key => {
      const data = localStorage.getItem(key);
      if (data) {
        console.log(`  ${key}:`, JSON.parse(data));
      }
    });
  }
  
  if (status.hasNewData) {
    console.log('새로운 데이터 발견:');
    status.newKeys.forEach(key => {
      const data = localStorage.getItem(key);
      if (data) {
        console.log(`  ${key}:`, JSON.parse(data));
      }
    });
  }
  
  if (status.needsMigration) {
    console.log('⚠️  마이그레이션이 필요합니다!');
  } else {
    console.log('✅ 마이그레이션이 필요하지 않습니다.');
  }
  
  console.log('==============================');
} 