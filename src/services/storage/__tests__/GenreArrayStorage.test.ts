import { IndexedDBService } from '../IndexedDBService';
import { Book } from '@/types/indexeddb/Book';
import { createLogger, LogLevel, configureLogging } from '@/utils/loggingUtils';
import { normalizeGenreData } from '@/utils/genreUtils';

// Mock the idb library
jest.mock('idb', () => {
  // Mock database structure
  let mockDb: any = {
    books: {} as Record<string, Book>
  };

  // Mock transaction and object store
  const mockObjectStore = {
    put: jest.fn((item: Book) => {
      mockDb.books[item.id] = { ...item };
      return Promise.resolve(item.id);
    }),
    get: jest.fn((id: string) => {
      return Promise.resolve(mockDb.books[id] || undefined);
    })
  };

  // Mock transaction
  const mockTransaction = {
    objectStore: jest.fn(() => mockObjectStore),
    done: Promise.resolve()
  };

  // Mock IDBPDatabase
  const mockIDBPDatabase = {
    transaction: jest.fn(() => mockTransaction),
    put: jest.fn((storeName: string, item: Book) => {
      mockDb.books[item.id] = { ...item };
      return Promise.resolve(item.id);
    }),
    get: jest.fn((storeName: string, id: string) => {
      return Promise.resolve(mockDb.books[id] || undefined);
    }),
    close: jest.fn()
  };

  return {
    openDB: jest.fn().mockResolvedValue(mockIDBPDatabase),
    _resetMockDb: () => {
      mockDb = { books: {} };
    }
  };
});

// Mock error handling module
jest.mock('../IndexedDBErrorHandling', () => ({
  withRetry: jest.fn((fn) => fn()),
  classifyIndexedDBError: jest.fn((error) => error),
  ErrorTelemetry: {
    logError: jest.fn()
  },
  DatabaseConnectionError: class DatabaseConnectionError extends Error {},
  EntityNotFoundError: class EntityNotFoundError extends Error {},
  TransactionError: class TransactionError extends Error {},
  StorageQuotaError: class StorageQuotaError extends Error {},
  RecoveryStrategies: {}
}));

// Mock loggingUtils
jest.mock('@/utils/loggingUtils', () => ({
  createLogger: jest.fn(() => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    trace: jest.fn()
  })),
  LogLevel: { TRACE: 0, DEBUG: 1, INFO: 2, WARN: 3, ERROR: 4, SILENT: 5 },
  configureLogging: jest.fn()
}));

describe('Genre Array Storage Integration Tests', () => {
  let dbService: IndexedDBService;
  const idb = require('idb');

  beforeEach(() => {
    jest.clearAllMocks();
    idb._resetMockDb();
    dbService = new IndexedDBService();
  });

  test('should save and retrieve a book with genre array', async () => {
    // Create a test book with genre as array
    const testBook: Book = {
      id: 'test-book-1',
      title: 'Test Book 1',
      author: 'Test Author',
      genre: ['Fiction', 'Fantasy', 'Adventure'],
      spineColor: 1,
      dateAdded: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      syncStatus: 'synced',
      progress: 0
    };

    // Save the book
    await dbService.saveBook(testBook);

    // Retrieve the book
    const retrievedBook = await dbService.getBookById('test-book-1');

    // Assert the book was saved and retrieved with genre array intact
    expect(retrievedBook).toBeDefined();
    expect(retrievedBook?.genre).toBeInstanceOf(Array);
    expect(retrievedBook?.genre).toEqual(['Fiction', 'Fantasy', 'Adventure']);
  });

  test('should handle normalizing string genre to array format', async () => {
    // Create a test book with genre as string
    const testBook: Book = {
      id: 'test-book-2',
      title: 'Test Book 2',
      author: 'Test Author',
      genre: 'Fiction/Fantasy',
      spineColor: 1,
      dateAdded: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      syncStatus: 'synced',
      progress: 0
    };

    // Convert string genre to array using normalizeGenreData before saving
    testBook.genre = normalizeGenreData(testBook.genre);

    // Save the book
    await dbService.saveBook(testBook);

    // Retrieve the book
    const retrievedBook = await dbService.getBookById('test-book-2');

    // Assert the book was saved with normalized genre array
    expect(retrievedBook).toBeDefined();
    expect(retrievedBook?.genre).toBeInstanceOf(Array);
    expect(retrievedBook?.genre).toEqual(['Fiction', 'Fantasy']);
  });

  test('should handle updating a book with genre array', async () => {
    // Create and save initial book with genre array
    const initialBook: Book = {
      id: 'test-book-3',
      title: 'Test Book 3',
      author: 'Test Author',
      genre: ['Fiction', 'Fantasy'],
      spineColor: 1,
      dateAdded: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      syncStatus: 'synced',
      progress: 0
    };

    await dbService.saveBook(initialBook);

    // Update the book with a modified genre array
    const updatedBook: Book = {
      ...initialBook,
      genre: ['Fiction', 'Fantasy', 'Science Fiction'],
      lastModified: new Date().toISOString()
    };

    await dbService.saveBook(updatedBook);

    // Retrieve the updated book
    const retrievedBook = await dbService.getBookById('test-book-3');

    // Assert the book was updated with the new genre array
    expect(retrievedBook).toBeDefined();
    expect(retrievedBook?.genre).toBeInstanceOf(Array);
    expect(retrievedBook?.genre).toEqual(['Fiction', 'Fantasy', 'Science Fiction']);
  });

  test('should handle book with undefined genre', async () => {
    // Create a test book with undefined genre
    const testBook: Book = {
      id: 'test-book-4',
      title: 'Test Book 4',
      author: 'Test Author',
      spineColor: 1,
      dateAdded: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      syncStatus: 'synced',
      progress: 0
    };

    // Save the book
    await dbService.saveBook(testBook);

    // Retrieve the book
    const retrievedBook = await dbService.getBookById('test-book-4');

    // Assert the book was saved and retrieved with undefined genre
    expect(retrievedBook).toBeDefined();
    expect(retrievedBook?.genre).toBeUndefined();
  });

  test('should handle backward compatibility with string genres', async () => {
    // Create a test book with string genre (legacy format)
    const testBook: Book = {
      id: 'test-book-5',
      title: 'Test Book 5',
      author: 'Test Author',
      genre: 'Fiction',  // Legacy string format
      spineColor: 1,
      dateAdded: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      syncStatus: 'synced',
      progress: 0
    };

    // Save the book
    await dbService.saveBook(testBook);

    // Retrieve the book
    const retrievedBook = await dbService.getBookById('test-book-5');

    // Assert the book was saved and retrieved with string genre intact
    expect(retrievedBook).toBeDefined();
    expect(retrievedBook?.genre).toBe('Fiction');
  });
});
