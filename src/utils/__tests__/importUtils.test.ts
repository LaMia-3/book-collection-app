import { validateImportedBook } from '../importUtils';
import { createLogger } from '@/utils/loggingUtils';

// Mock the logger
jest.mock('@/utils/loggingUtils', () => ({
  createLogger: jest.fn(() => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    trace: jest.fn()
  }))
}));

describe('importUtils', () => {
  describe('validateImportedBook', () => {
    test('should validate a valid book', () => {
      const validBook = {
        title: 'Test Book',
        author: 'Test Author',
        status: 'read',
        completedDate: '2020-05-21'
      };
      const result = validateImportedBook(validBook);
      expect(result.valid).toBe(true);
    });

    test('should reject book without title', () => {
      const invalidBook = {
        title: '',  // Empty title will fail validation
        author: 'Test Author',
        status: 'read'
      };
      const result = validateImportedBook(invalidBook);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Missing required field: title');
    });

    test('should reject book without author', () => {
      const invalidBook = {
        title: 'Test Book',
        author: '',  // Empty author will fail validation
        status: 'read'
      };
      const result = validateImportedBook(invalidBook);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Missing required field: either author or ISBN is required');
    });

    test('should validate completedDate in YYYY-MM-DD format', () => {
      const validBook = {
        title: 'Test Book',
        author: 'Test Author',
        status: 'read',
        completedDate: '2020-05-21'
      };
      const result = validateImportedBook(validBook);
      expect(result.valid).toBe(true);
    });

    test('should reject invalid completedDate format', () => {
      const invalidBook = {
        title: 'Test Book',
        author: 'Test Author',
        status: 'read',
        completedDate: '05/21/2020' // Not in YYYY-MM-DD format
      };
      const result = validateImportedBook(invalidBook);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Invalid completedDate');
    });

    test('should validate valid rating', () => {
      const validBook = {
        title: 'Test Book',
        author: 'Test Author',
        rating: '4'
      };
      const result = validateImportedBook(validBook);
      expect(result.valid).toBe(true);
    });

    test('should reject invalid rating', () => {
      const invalidBook = {
        title: 'Test Book',
        author: 'Test Author',
        rating: '6' // Rating must be between 1 and 5
      };
      const result = validateImportedBook(invalidBook);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Invalid rating');
    });
  });

  // Note: We're not testing convertRawToBook since it's a private function
});
