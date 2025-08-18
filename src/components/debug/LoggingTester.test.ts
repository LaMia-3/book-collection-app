import { LogLevel, configureLogging, createLogger, resetLoggingConfig } from '@/utils/loggingUtils';

describe('Logging Utility', () => {
  let originalConsole: any;
  let mockConsole: any;
  
  beforeEach(() => {
    // Save original console methods
    originalConsole = {
      error: console.error,
      warn: console.warn,
      info: console.info,
      debug: console.debug
    };
    
    // Create mock console methods
    mockConsole = {
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      debug: jest.fn()
    };
    
    // Replace console methods with mocks
    console.error = mockConsole.error;
    console.warn = mockConsole.warn;
    console.info = mockConsole.info;
    console.debug = mockConsole.debug;
    
    // Reset logging config before each test
    resetLoggingConfig();
  });
  
  afterEach(() => {
    // Restore original console methods
    console.error = originalConsole.error;
    console.warn = originalConsole.warn;
    console.info = originalConsole.info;
    console.debug = originalConsole.debug;
  });
  
  test('should log at ERROR level when configured for ERROR', () => {
    configureLogging({ level: LogLevel.ERROR });
    
    const logger = createLogger('TestContext');
    logger.error('Error message');
    logger.warn('Warning message');
    logger.info('Info message');
    logger.debug('Debug message');
    logger.trace('Trace message');
    
    expect(mockConsole.error).toHaveBeenCalledTimes(1);
    expect(mockConsole.warn).not.toHaveBeenCalled();
    expect(mockConsole.info).not.toHaveBeenCalled();
    expect(mockConsole.debug).not.toHaveBeenCalled();
  });
  
  test('should log at INFO level when configured for INFO', () => {
    configureLogging({ level: LogLevel.INFO });
    
    const logger = createLogger('TestContext');
    logger.error('Error message');
    logger.warn('Warning message');
    logger.info('Info message');
    logger.debug('Debug message');
    logger.trace('Trace message');
    
    expect(mockConsole.error).toHaveBeenCalledTimes(1);
    expect(mockConsole.warn).toHaveBeenCalledTimes(1);
    expect(mockConsole.info).toHaveBeenCalledTimes(1);
    expect(mockConsole.debug).not.toHaveBeenCalled();
  });
  
  test('should log at DEBUG level when configured for DEBUG', () => {
    configureLogging({ level: LogLevel.DEBUG });
    
    const logger = createLogger('TestContext');
    logger.error('Error message');
    logger.warn('Warning message');
    logger.info('Info message');
    logger.debug('Debug message');
    logger.trace('Trace message');
    
    expect(mockConsole.error).toHaveBeenCalledTimes(1);
    expect(mockConsole.warn).toHaveBeenCalledTimes(1);
    expect(mockConsole.info).toHaveBeenCalledTimes(1);
    expect(mockConsole.debug).toHaveBeenCalledTimes(1); // DEBUG level
  });
  
  test('should log at TRACE level when configured for TRACE', () => {
    configureLogging({ level: LogLevel.TRACE });
    
    const logger = createLogger('TestContext');
    logger.error('Error message');
    logger.warn('Warning message');
    logger.info('Info message');
    logger.debug('Debug message');
    logger.trace('Trace message');
    
    expect(mockConsole.error).toHaveBeenCalledTimes(1);
    expect(mockConsole.warn).toHaveBeenCalledTimes(1);
    expect(mockConsole.info).toHaveBeenCalledTimes(1);
    expect(mockConsole.debug).toHaveBeenCalledTimes(2); // Both DEBUG and TRACE use console.debug
  });
  
  test('should respect enableConsole configuration', () => {
    configureLogging({ level: LogLevel.TRACE, enableConsole: false });
    
    const logger = createLogger('TestContext');
    logger.error('Error message');
    logger.warn('Warning message');
    logger.info('Info message');
    logger.debug('Debug message');
    logger.trace('Trace message');
    
    expect(mockConsole.error).not.toHaveBeenCalled();
    expect(mockConsole.warn).not.toHaveBeenCalled();
    expect(mockConsole.info).not.toHaveBeenCalled();
    expect(mockConsole.debug).not.toHaveBeenCalled();
  });
  
  test('should include context in log messages', () => {
    configureLogging({ level: LogLevel.INFO });
    
    const logger = createLogger('GenreDisplay');
    logger.info('Processing genres');
    
    // Context should be included in the message
    expect(mockConsole.info).toHaveBeenCalled();
    expect(mockConsole.info.mock.calls[0][0]).toContain('GenreDisplay');
  });
  
  test('genre-specific logs contain appropriate context', () => {
    configureLogging({ level: LogLevel.DEBUG });
    
    const logger = createLogger('BookCard');
    logger.debug('Rendering genre in BookCard', { bookId: '123', genre: ['Fiction', 'Mystery'] });
    
    // Verify genre context is passed correctly
    expect(mockConsole.debug).toHaveBeenCalled();
    expect(mockConsole.debug.mock.calls[0][0]).toContain('BookCard');
    expect(mockConsole.debug.mock.calls[0][1]).toEqual({ bookId: '123', genre: ['Fiction', 'Mystery'] });
  });
});
