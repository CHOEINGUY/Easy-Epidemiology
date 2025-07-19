/**
 * 통합 로깅 시스템
 * 개발/프로덕션 환경에 따른 로깅 레벨 관리
 */

const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

// 환경별 로그 레벨 결정
function getLogLevel() {
  const envLevel = import.meta.env?.VITE_LOG_LEVEL || import.meta.env?.VUE_APP_LOG_LEVEL;
  const isDev = import.meta.env?.MODE === 'development' || import.meta.env?.NODE_ENV === 'development';
  
  if (envLevel && LOG_LEVELS[envLevel] !== undefined) {
    return LOG_LEVELS[envLevel];
  }
  
  return isDev ? LOG_LEVELS.DEBUG : LOG_LEVELS.ERROR;
}

class Logger {
  constructor(prefix = '[App]', options = {}) {
    this.prefix = prefix;
    this.level = options.level || getLogLevel();
    this.enabled = options.enabled !== false;
  }

  error(message, ...args) {
    if (this.enabled && this.level >= LOG_LEVELS.ERROR) {
      console.error(`${this.prefix} [ERROR]`, message, ...args);
    }
  }

  warn(message, ...args) {
    if (this.enabled && this.level >= LOG_LEVELS.WARN) {
      console.warn(`${this.prefix} [WARN]`, message, ...args);
    }
  }

  info(message, ...args) {
    if (this.enabled && this.level >= LOG_LEVELS.INFO) {
      console.info(`${this.prefix} [INFO]`, message, ...args);
    }
  }

  debug(message, ...args) {
    if (this.enabled && this.level >= LOG_LEVELS.DEBUG) {
      console.log(`${this.prefix} [DEBUG]`, message, ...args);
    }
  }

  // 컴포넌트별 로거 생성
  createLogger(component) {
    return new Logger(`[${component}]`, {
      level: this.level,
      enabled: this.enabled
    });
  }

  // 로깅 비활성화
  disable() {
    this.enabled = false;
  }

  // 로깅 활성화
  enable() {
    this.enabled = true;
  }

  // 로그 레벨 설정
  setLevel(level) {
    if (LOG_LEVELS[level] !== undefined) {
      this.level = LOG_LEVELS[level];
    }
  }
}

// 전역 로거 인스턴스
export const logger = new Logger();

// 컴포넌트별 로거 팩토리
export function createComponentLogger(componentName) {
  return logger.createLogger(componentName);
}

// 개발 모드에서만 로그 레벨 정보 출력
if (import.meta.env?.MODE === 'development') {
  logger.info(`Logger initialized with level: ${getLogLevel()}`);
}

export default logger; 