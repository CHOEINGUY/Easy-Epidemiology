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

class Logger {
  constructor(options = {}) {
    this.level = options.level || (process.env.NODE_ENV === 'development' ? LOG_LEVELS.DEBUG : LOG_LEVELS.ERROR);
    this.prefix = options.prefix || '[App]';
  }

  error(message, ...args) {
    if (this.level >= LOG_LEVELS.ERROR) {
      console.error(`${this.prefix} [ERROR]`, message, ...args);
    }
  }

  warn(message, ...args) {
    if (this.level >= LOG_LEVELS.WARN) {
      console.warn(`${this.prefix} [WARN]`, message, ...args);
    }
  }

  info(message, ...args) {
    if (this.level >= LOG_LEVELS.INFO) {
      console.info(`${this.prefix} [INFO]`, message, ...args);
    }
  }

  debug(message, ...args) {
    if (this.level >= LOG_LEVELS.DEBUG) {
      console.log(`${this.prefix} [DEBUG]`, message, ...args);
    }
  }

  // 컴포넌트별 로거 생성
  createLogger(component) {
    return new Logger({
      level: this.level,
      prefix: `[${component}]`
    });
  }
}

// 전역 로거 인스턴스
export const logger = new Logger();

// 컴포넌트별 로거 팩토리
export function createComponentLogger(componentName) {
  return logger.createLogger(componentName);
}

export default logger; 