import { createComponentLogger, devLog, logger, perfLog } from '../utils/logger';

describe('logger utilities', () => {
  const originalLogLevel = process.env.VUE_APP_LOG_LEVEL;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    jest.restoreAllMocks();
    process.env.VUE_APP_LOG_LEVEL = 'INFO';
    process.env.NODE_ENV = 'test';
  });

  afterAll(() => {
    if (originalLogLevel === undefined) {
      delete process.env.VUE_APP_LOG_LEVEL;
    } else {
      process.env.VUE_APP_LOG_LEVEL = originalLogLevel;
    }

    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnv;
    }
  });

  test('respects the configured log level', () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

    process.env.VUE_APP_LOG_LEVEL = 'WARN';
    logger.info('hidden');
    logger.warn('visible');

    expect(logSpy).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith('[WARN]', 'visible');
  });

  test('component logger includes its component name', () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const componentLogger = createComponentLogger('CaseControl');

    componentLogger.error('failed');

    expect(errorSpy).toHaveBeenCalledWith('[CaseControl] [ERROR]', 'failed');
  });

  test('devLog only logs in development', () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

    process.env.NODE_ENV = 'test';
    devLog('hidden');
    expect(logSpy).not.toHaveBeenCalled();

    process.env.NODE_ENV = 'development';
    devLog('visible');
    expect(logSpy).toHaveBeenCalledWith('[DEV]', 'visible');
  });

  test('perfLog always returns the wrapped result', () => {
    process.env.NODE_ENV = 'test';

    expect(perfLog('calculation', () => 42)).toBe(42);
  });
});
