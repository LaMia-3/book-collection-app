/**
 * TypeAdapters.test.ts
 * 
 * Unit tests for Book and Series type adapters
 */
import { 
  convertDbBookToUiBook, 
  convertUiBookToDbBook,
  isGenreArray 
} from '../BookTypeAdapter';

import { normalizeGenreData } from '@/utils/genreUtils';

import { 
  convertDbSeriesToUiSeries,
  convertUiSeriesToDbSeries 
} from '../SeriesTypeAdapter';

import { ReadingStatus } from '@/types/models/Book';

describe('BookTypeAdapter', () => {
  describe('convertUiBookToDbBook', () => {
    it('should correctly convert a UI book to DB book format', () => {
      // Arrange
      const uiBook = {
        id: 'book-123',
        title: 'Test Book',
        author: 'Test Author',
        status: 'reading' as 'reading' | 'completed' | 'want-to-read',
        isPartOfSeries: true,
        seriesId: 'series-456',
        seriesPosition: 2,
        spineColor: 3,
        addedDate: '2025-01-01T00:00:00.000Z',
        timestamps: {
          created: '2025-01-01T00:00:00.000Z',
          updated: '2025-01-02T00:00:00.000Z'
        }
      };

      // Act
      const dbBook = convertUiBookToDbBook(uiBook);

      // Assert
      expect(dbBook.id).toEqual(uiBook.id);
      expect(dbBook.title).toEqual(uiBook.title);
      expect(dbBook.author).toEqual(uiBook.author);
      // Check if the status is correctly mapped
      expect(dbBook.status).toEqual('reading');
      expect(dbBook.dateAdded).toEqual(uiBook.addedDate);
      expect(dbBook.lastModified).toBeDefined();
      expect(dbBook.isPartOfSeries).toEqual(uiBook.isPartOfSeries);
      expect(dbBook.seriesId).toEqual(uiBook.seriesId);
      expect(dbBook.seriesPosition).toEqual(uiBook.seriesPosition);
    });

    it('should handle missing optional fields', () => {
      // Arrange
      const uiBook = {
        id: 'book-123',
        title: 'Test Book',
        author: 'Test Author',
        status: 'completed' as 'reading' | 'completed' | 'want-to-read',
        spineColor: 2,
        addedDate: '2025-01-01T00:00:00.000Z',
        isPartOfSeries: false,
        timestamps: {
          created: '2025-01-01T00:00:00.000Z',
          updated: '2025-01-01T00:00:00.000Z'
        }
      };

      // Act
      const dbBook = convertUiBookToDbBook(uiBook);

      // Assert
      expect(dbBook.id).toEqual(uiBook.id);
      expect(dbBook.title).toEqual(uiBook.title);
      expect(dbBook.author).toEqual(uiBook.author);
      // Check if the status is correctly mapped
      expect(dbBook.status).toEqual('completed');
      expect(dbBook.dateAdded).toBeDefined(); // Should default to now
      expect(dbBook.lastModified).toBeDefined();
      expect(dbBook.isPartOfSeries).toEqual(false);
      expect(dbBook.seriesId).toBeUndefined();
      expect(dbBook.seriesPosition).toBeUndefined();
    });

    it('should handle all reading status values correctly', () => {
      // Test each status conversion
      // Using strings for DB status fields instead of enums
      expect(convertUiBookToDbBook({ status: 'want-to-read' } as any).status).toEqual('want-to-read');
      expect(convertUiBookToDbBook({ status: 'reading' } as any).status).toEqual('reading');
      expect(convertUiBookToDbBook({ status: 'completed' } as any).status).toEqual('completed');
      expect(convertUiBookToDbBook({ status: 'on-hold' } as any).status).toEqual('on_hold');
      expect(convertUiBookToDbBook({ status: 'dnf' } as any).status).toEqual('dnf');
    });
  });

  describe('convertDbBookToUiBook', () => {
    it('should correctly convert a DB book to UI book format', () => {
      // Arrange
      const dbBook = {
        id: 'book-123',
        title: 'Test Book',
        author: 'Test Author',
        status: ReadingStatus.READING,
        dateAdded: '2025-01-01T00:00:00.000Z',
        lastModified: '2025-01-02T00:00:00.000Z',
        isPartOfSeries: true,
        seriesId: 'series-456',
        seriesPosition: 2,
        spineColor: 4,
        addedDate: '2025-01-01T00:00:00.000Z',
        syncStatus: 'synced',
        progress: 0
      };

      // Act
      const uiBook = convertDbBookToUiBook(dbBook);

      // Assert
      expect(uiBook.id).toEqual(dbBook.id);
      expect(uiBook.title).toEqual(dbBook.title);
      expect(uiBook.author).toEqual(dbBook.author);
      expect(uiBook.status).toEqual('reading');
      expect(uiBook.addedDate).toEqual(dbBook.addedDate);
      // Using the timestamps for date fields now
      // UI Book doesn't have timestamps
      // Just checking conversion works properly
      expect(uiBook.isPartOfSeries).toEqual(dbBook.isPartOfSeries);
      expect(uiBook.seriesId).toEqual(dbBook.seriesId);
      expect(uiBook.seriesPosition).toEqual(dbBook.seriesPosition);
    });

    it('should handle invalid date formats gracefully', () => {
      // Arrange
      const dbBook = {
        id: 'book-123',
        title: 'Test Book',
        author: 'Test Author',
        status: ReadingStatus.READING,
        dateAdded: 'not-a-date',
        lastModified: 'also-not-a-date',
        spineColor: 4,
        addedDate: '2025-01-01T00:00:00.000Z',
        syncStatus: 'synced',
        progress: 0
      };

      // Act
      const uiBook = convertDbBookToUiBook(dbBook as any);

      // Assert
      expect(uiBook.id).toEqual(dbBook.id);
      // UI Book doesn't have timestamps
      // Just checking conversion works properly
    });

    it('should handle all reading status enum values correctly', () => {
      // Test each status conversion
      // The adapter maps ReadingStatus.TO_READ to 'want-to-read' instead of 'to-read'
      expect(convertDbBookToUiBook({ status: ReadingStatus.TO_READ } as any).status).toEqual('want-to-read');
      expect(convertDbBookToUiBook({ status: ReadingStatus.READING } as any).status).toEqual('reading');
      expect(convertDbBookToUiBook({ status: ReadingStatus.COMPLETED } as any).status).toEqual('completed');
      // ON_HOLD status maps to 'on-hold'
      expect(convertDbBookToUiBook({ status: ReadingStatus.ON_HOLD } as any).status).toEqual('on-hold');
      // DNF status maps to 'dnf'
      expect(convertDbBookToUiBook({ status: ReadingStatus.DNF } as any).status).toEqual('dnf');
    });

    it('should handle genre as a string', () => {
      // Arrange
      const dbBook = {
        id: 'book-123',
        title: 'Test Book',
        author: 'Test Author',
        genre: 'Fiction / Fantasy / Young Adult',
        spineColor: 4,
        addedDate: '2025-01-01T00:00:00.000Z',
        syncStatus: 'synced',
        progress: 0,
        dateAdded: '2025-01-01T00:00:00.000Z',
        lastModified: '2025-01-01T00:00:00.000Z'
      };

      // Act
      const uiBook = convertDbBookToUiBook(dbBook);

      // Assert
      expect(Array.isArray(uiBook.genre)).toBe(true);
      expect(uiBook.genre).toEqual(['Fiction', 'Fantasy', 'Young Adult']);
    });

    it('should handle genre as an array', () => {
      // Arrange
      const dbBook = {
        id: 'book-123',
        title: 'Test Book',
        author: 'Test Author',
        genre: ['Science Fiction', 'Dystopian'],
        spineColor: 4,
        addedDate: '2025-01-01T00:00:00.000Z',
        syncStatus: 'synced',
        progress: 0,
        dateAdded: '2025-01-01T00:00:00.000Z',
        lastModified: '2025-01-01T00:00:00.000Z'
      };

      // Act
      const uiBook = convertDbBookToUiBook(dbBook);

      // Assert
      expect(Array.isArray(uiBook.genre)).toBe(true);
      expect(uiBook.genre).toEqual(['Science Fiction', 'Dystopian']);
    });
  });
});

describe('SeriesTypeAdapter', () => {
  describe('convertUiSeriesToDbSeries', () => {
    it('should correctly convert a UI series to DB series format', () => {
      // Arrange
      const uiSeries = {
        id: 'series-123',
        name: 'Test Series',
        author: 'Test Author',
        books: ['book-1', 'book-2'],
        totalBooks: 5,
        readingOrder: 'publication' as const,
        isTracked: false,
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-02')
      };

      // Act
      const dbSeries = convertUiSeriesToDbSeries(uiSeries);

      // Assert
      expect(dbSeries.id).toEqual(uiSeries.id);
      expect(dbSeries.name).toEqual(uiSeries.name);
      expect(dbSeries.author).toEqual(uiSeries.author);
      expect(dbSeries.books).toEqual(uiSeries.books);
      expect(dbSeries.totalBooks).toEqual(uiSeries.totalBooks);
      // Removed assertions for completedBooks and readingProgress as they're not in the model
      expect(dbSeries.dateAdded).toBeDefined();
      expect(dbSeries.lastModified).toBeDefined();
    });

    it('should handle missing optional fields', () => {
      // Arrange
      const uiSeries = {
        id: 'series-123',
        name: 'Test Series',
        books: []
      };

      // Act
      const dbSeries = convertUiSeriesToDbSeries(uiSeries as any);

      // Assert
      expect(dbSeries.id).toEqual(uiSeries.id);
      expect(dbSeries.name).toEqual(uiSeries.name);
      expect(dbSeries.books).toEqual([]);
      expect(dbSeries.dateAdded).toBeDefined(); // Should default to now
      expect(dbSeries.lastModified).toBeDefined();
    });
  });

  describe('convertDbSeriesToUiSeries', () => {
    it('should correctly convert a DB series to UI series format', () => {
      // Arrange
      const dbSeries = {
        id: 'series-123',
        name: 'Test Series',
        author: 'Test Author',
        books: ['book-1', 'book-2'],
        totalBooks: 5,
        readingOrder: 'publication' as const,
        isTracked: true,
        dateAdded: '2025-01-01T00:00:00.000Z',
        lastModified: '2025-01-02T00:00:00.000Z'
      };

      // Act
      const uiSeries = convertDbSeriesToUiSeries(dbSeries);

      // Assert
      expect(uiSeries.id).toEqual(dbSeries.id);
      expect(uiSeries.name).toEqual(dbSeries.name);
      expect(uiSeries.author).toEqual(dbSeries.author);
      expect(uiSeries.books).toEqual(dbSeries.books);
      expect(uiSeries.totalBooks).toEqual(dbSeries.totalBooks);
      // Series properties now match the model
      expect(uiSeries.createdAt).toBeInstanceOf(Date);
      expect(uiSeries.updatedAt).toBeInstanceOf(Date);
    });

    it('should handle invalid date formats gracefully', () => {
      // Arrange
      const dbSeries = {
        id: 'series-123',
        name: 'Test Series',
        books: [],
        readingOrder: 'publication' as const,
        isTracked: false,
        dateAdded: '2025-01-01T00:00:00.000Z',
        lastModified: 'also-not-a-date'
      };

      // Act
      const uiSeries = convertDbSeriesToUiSeries(dbSeries as any);

      // Assert
      expect(uiSeries.id).toEqual(dbSeries.id);
      expect(uiSeries.name).toEqual(dbSeries.name);
      expect(uiSeries.createdAt).toBeInstanceOf(Date); // Should default to now
      expect(uiSeries.updatedAt).toBeInstanceOf(Date);
    });
  });
});
