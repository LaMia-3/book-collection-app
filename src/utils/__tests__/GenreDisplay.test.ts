import { genresToDisplayString, normalizeGenreData } from '../genreUtils';
import { createLogger } from '../loggingUtils';

// Mock the logging utils
jest.mock('../loggingUtils', () => ({
  createLogger: jest.fn().mockReturnValue({
    debug: jest.fn(),
    trace: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }),
  LogLevel: { TRACE: 0, DEBUG: 1, INFO: 2, WARN: 3, ERROR: 4, SILENT: 5 }
}));

describe('Genre Display Functions', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('genresToDisplayString', () => {
    test('displays forward slash separated genres', () => {
      expect(genresToDisplayString(['Fiction', 'Fantasy', 'Adventure'])).toBe('Fiction / Fantasy / Adventure');
    });

    test('handles single genre', () => {
      expect(genresToDisplayString(['Fiction'])).toBe('Fiction');
    });

    test('handles string input format with slashes', () => {
      expect(genresToDisplayString('Fiction/Fantasy')).toBe('Fiction / Fantasy');
    });

    test('handles string input format with commas', () => {
      expect(genresToDisplayString('Fiction, Fantasy')).toBe('Fiction / Fantasy');
    });
    
    test('shows "Uncategorized" for empty genres array', () => {
      expect(genresToDisplayString([])).toBe('Uncategorized');
    });
    
    test('shows "Uncategorized" for null genres', () => {
      expect(genresToDisplayString(null as unknown as string[])).toBe('Uncategorized');
    });

    test('shows "Uncategorized" for undefined genres', () => {
      expect(genresToDisplayString(undefined)).toBe('Uncategorized');
    });
    
    test('shows "Uncategorized" for empty string', () => {
      expect(genresToDisplayString('')).toBe('Uncategorized');
    });
  });

  describe('normalizeGenreData', () => {
    test('returns empty array for null/undefined input', () => {
      expect(normalizeGenreData(null as unknown as string[])).toEqual([]);
      expect(normalizeGenreData(undefined)).toEqual([]);
    });

    test('handles array input correctly', () => {
      expect(normalizeGenreData(['Fiction', 'Fantasy'])).toEqual(['Fiction', 'Fantasy']);
    });

    test('filters empty items from arrays', () => {
      expect(normalizeGenreData(['Fiction', '', 'Fantasy'])).toEqual(['Fiction', 'Fantasy']);
    });

    test('splits slash-separated string', () => {
      expect(normalizeGenreData('Fiction/Fantasy/Adventure')).toEqual(['Fiction', 'Fantasy', 'Adventure']);
    });

    test('splits comma-separated string', () => {
      expect(normalizeGenreData('Fiction, Fantasy, Adventure')).toEqual(['Fiction', 'Fantasy', 'Adventure']);
    });

    test('handles single string genre', () => {
      expect(normalizeGenreData('Fiction')).toEqual(['Fiction']);
    });
  });
});
