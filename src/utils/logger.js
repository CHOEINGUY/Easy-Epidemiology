/**
 * 환경별 로깅 유틸리티
 * 배포 환경에서는 불필요한 로그를 제거하여 성능 최적화
 */

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

// 현재 환경의 로그 레벨 가져오기
const getCurrentLogLevel = () => {
  const envLogLevel = process.env.VUE_APP_LOG_LEVEL || 'INFO';
  return LOG_LEVELS[envLogLevel.toUpperCase()] || LOG_LEVELS.INFO;
};

// 로그 레벨 확인
const shouldLog = (level) => {
  const currentLevel = getCurrentLogLevel();
  return level >= currentLevel;
};

// 로깅 함수들
export const logger = {
  debug: (...args) => {
    if (shouldLog(LOG_LEVELS.DEBUG)) {
      console.log('[DEBUG]', ...args);
    }
  },
  
  info: (...args) => {
    if (shouldLog(LOG_LEVELS.INFO)) {
      console.log('[INFO]', ...args);
    }
  },
  
  warn: (...args) => {
    if (shouldLog(LOG_LEVELS.WARN)) {
      console.warn('[WARN]', ...args);
    }
  },
  
  error: (...args) => {
    if (shouldLog(LOG_LEVELS.ERROR)) {
      console.error('[ERROR]', ...args);
    }
  }
};

// 개발 환경에서만 실행되는 로그
export const devLog = (...args) => {
  if (process.env.NODE_ENV === 'development') {
    console.log('[DEV]', ...args);
  }
};

// 성능 측정용 로그 (배포 환경에서 제거)
export const perfLog = (label, fn) => {
  if (process.env.NODE_ENV === 'development') {
    console.time(`[PERF] ${label}`);
    const result = fn();
    console.timeEnd(`[PERF] ${label}`);
    return result;
  }
  return fn();
};

// 컴포넌트별 로거 생성 (기존 호환성 유지)
export const createComponentLogger = (componentName) => {
  return {
    debug: (...args) => {
      if (shouldLog(LOG_LEVELS.DEBUG)) {
        console.log(`[${componentName}] [DEBUG]`, ...args);
      }
    },
    
    info: (...args) => {
      if (shouldLog(LOG_LEVELS.INFO)) {
        console.log(`[${componentName}] [INFO]`, ...args);
      }
    },
    
    warn: (...args) => {
      if (shouldLog(LOG_LEVELS.WARN)) {
        console.warn(`[${componentName}] [WARN]`, ...args);
      }
    },
    
    error: (...args) => {
      if (shouldLog(LOG_LEVELS.ERROR)) {
        console.error(`[${componentName}] [ERROR]`, ...args);
      }
    }
  };
};

export default logger; 