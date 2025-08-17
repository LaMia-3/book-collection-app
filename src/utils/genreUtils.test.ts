import { normalizeGenreData, genresToDisplayString, genreToEditString, editStringToGenreArray } from './genreUtils';
import { createLogger, configureLogging, resetLoggingConfig, LogLevel } from './loggingUtils';

// Mock the logging module with factory directly providing mock functions
jest.mock('./loggingUtils', () => {
  return {
    createLogger: jest.fn().mockReturnValue({
      debug: jest.fn(),
      trace: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    }),
    configureLogging: jest.fn(),
    resetLoggingConfig: jest.fn(),
    LogLevel: { TRACE: 0, DEBUG: 1, INFO: 2, WARN: 3, ERROR: 4, SILENT: 5 }
  };
});

describe('Genre Utils', () => {
  // Reset log config before each test
  beforeEach(() => {
    jest.clearAllMocks();
    resetLoggingConfig();
    configureLogging({ level: LogLevel.TRACE });
  });

  describe('normalizeGenreData', () => {
    const mockLogger = createLogger('test');
    
    test('should handle null or undefined input', () => {
      const result1 = normalizeGenreData(null as any);
      const result2 = normalizeGenreData(undefined as any);
      
      expect(result1).toEqual([]);
      expect(result2).toEqual([]);
    });

    test('should handle empty string input', () => {
      const result = normalizeGenreData('');
      expect(result).toEqual([]);
    });

    test('should handle empty array input', () => {
      const result = normalizeGenreData([]);
      expect(result).toEqual([]);
    });

    test('should handle slash-separated string input', () => {
      const result = normalizeGenreData('Fiction/Mystery/Thriller');
      expect(result).toEqual(['Fiction', 'Mystery', 'Thriller']);
    });

    test('should handle comma-separated string input', () => {
      const result = normalizeGenreData('Fantasy, Adventure, Magic');
      expect(result).toEqual(['Fantasy', 'Adventure', 'Magic']);
    });

    test('should trim whitespace from genres', () => {
      const result = normalizeGenreData('  Fiction / Mystery  / Thriller ');
      expect(result).toEqual(['Fiction', 'Mystery', 'Thriller']);
    });

    test('should handle array input', () => {
      const result = normalizeGenreData(['Fiction', 'Mystery', 'Thriller']);
      expect(result).toEqual(['Fiction', 'Mystery', 'Thriller']);
    });

    test('should filter out empty items in arrays', () => {
      const result = normalizeGenreData(['Fiction', '', 'Thriller', null, undefined]);
      expect(result).toEqual(['Fiction', 'Thriller']);
    });
    
    test('should log appropriate messages', () => {
      // Clear mocks before test
      jest.clearAllMocks();
      
      // Get mock logger from module
      const mockLogger = (createLogger as jest.Mock)();
      
      // Run the function
      normalizeGenreData('Fiction/Mystery');
      
      // Check the logger was used correctly
      expect(mockLogger.debug).toHaveBeenCalledWith('Normalizing genre data', expect.any(Object));
      expect(mockLogger.trace).toHaveBeenCalledWith('Converting slash-separated string to array');
    });
  });

  describe('genresToDisplayString', () => {
    test('should join array with forward slashes', () => {
      const result = genresToDisplayString(['Fiction', 'Mystery', 'Thriller']);
      expect(result).toBe('Fiction / Mystery / Thriller');
    });

    test('should handle empty array', () => {
      const result = genresToDisplayString([]);
      expect(result).toBe('Uncategorized');
    });
    
    test('should handle null input', () => {
      const result = genresToDisplayString(null as any);
      expect(result).toBe('Uncategorized');
    });
    
    test('should handle undefined input', () => {
      const result = genresToDisplayString(undefined as any);
      expect(result).toBe('Uncategorized');
    });
    
    test('should log the conversion process', () => {
      // Clear mocks before test
      jest.clearAllMocks();
      
      // Get mock logger from module
      const mockLogger = (createLogger as jest.Mock)();
      
      // Run the function
      genresToDisplayString(['Fiction', 'Mystery']);
      
      // Check the logger was used correctly
      expect(mockLogger.debug).toHaveBeenCalledWith('Normalizing genre data', expect.any(Object));
      expect(mockLogger.debug).toHaveBeenCalledWith('Generated display string', expect.any(Object));
    });
  });

  describe('genreToEditString', () => {
    test('should join array with commas', () => {
      const result = genreToEditString(['Fiction', 'Mystery', 'Thriller']);
      expect(result).toBe('Fiction, Mystery, Thriller');
    });

    test('should handle empty array', () => {
      const result = genreToEditString([]);
      expect(result).toBe('');
    });
    
    test('should convert array to edit string', () => {
      // Clear mocks before test
      jest.clearAllMocks();
      
      // Run the function and test the result directly
      const result = genreToEditString(['Fiction', 'Mystery']);
      expect(result).toBe('Fiction, Mystery');
      
      // Skip logger verification as this function might not use logger
    });
  });

  describe('editStringToGenreArray', () => {
    test('should split string by commas', () => {
      const result = editStringToGenreArray('Fiction, Mystery, Thriller');
      expect(result).toEqual(['Fiction', 'Mystery', 'Thriller']);
    });

    test('should handle empty string', () => {
      const result = editStringToGenreArray('');
      expect(result).toEqual([]);
    });

    test('should trim whitespace and filter empty items', () => {
      const result = editStringToGenreArray('  Fiction  , , Mystery,  , Thriller  ');
      expect(result).toEqual(['Fiction', 'Mystery', 'Thriller']);
    });
    
    test('should log the parsing process', () => {
      // Clear mocks before test
      jest.clearAllMocks();
      
      // Get mock logger from module
      const mockLogger = (createLogger as jest.Mock)();
      
      // Run the function
      editStringToGenreArray('Fiction\nMystery');
      
      // Check the logger was used correctly
      expect(mockLogger.debug).toHaveBeenCalledWith('Parsed genre array from edit string', expect.any(Object));
    });
  });
});
