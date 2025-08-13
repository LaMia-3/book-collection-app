/**
 * TypeAdapters.test.ts
 * 
 * Unit tests for Book and Series type adapters
 */
import { 
  convertDbBookToUiBook, 
  convertUiBookToDbBook 
} from '../BookTypeAdapter';

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
        status: 'reading',
        dateAdded: new Date('2025-01-01'),
        lastModified: new Date('2025-01-02'),
        isPartOfSeries: true,
        seriesId: 'series-456',
        seriesPosition: 2
      };

      // Act
      const dbBook = convertUiBookToDbBook(uiBook);

      // Assert
      expect(dbBook.id).toEqual(uiBook.id);
      expect(dbBook.title).toEqual(uiBook.title);
      expect(dbBook.author).toEqual(uiBook.author);
      expect(dbBook.status).toEqual(ReadingStatus.Reading);
      expect(dbBook.dateAdded).toEqual(uiBook.dateAdded.toISOString());
      expect(dbBook.lastModified).toEqual(uiBook.lastModified.toISOString());
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
        status: 'completed'
      };

      // Act
      const dbBook = convertUiBookToDbBook(uiBook);

      // Assert
      expect(dbBook.id).toEqual(uiBook.id);
      expect(dbBook.title).toEqual(uiBook.title);
      expect(dbBook.author).toEqual(uiBook.author);
      expect(dbBook.status).toEqual(ReadingStatus.Completed);
      expect(dbBook.dateAdded).toBeDefined(); // Should default to now
      expect(dbBook.lastModified).toBeDefined();
      expect(dbBook.isPartOfSeries).toEqual(false);
      expect(dbBook.seriesId).toBeUndefined();
      expect(dbBook.seriesPosition).toBeUndefined();
    });

    it('should handle all reading status values correctly', () => {
      // Test each status conversion
      expect(convertUiBookToDbBook({ status: 'to-read' } as any).status).toEqual(ReadingStatus.ToRead);
      expect(convertUiBookToDbBook({ status: 'reading' } as any).status).toEqual(ReadingStatus.Reading);
      expect(convertUiBookToDbBook({ status: 'completed' } as any).status).toEqual(ReadingStatus.Completed);
      expect(convertUiBookToDbBook({ status: 'on-hold' } as any).status).toEqual(ReadingStatus.OnHold);
      expect(convertUiBookToDbBook({ status: 'dropped' } as any).status).toEqual(ReadingStatus.Dropped);
    });
  });

  describe('convertDbBookToUiBook', () => {
    it('should correctly convert a DB book to UI book format', () => {
      // Arrange
      const dbBook = {
        id: 'book-123',
        title: 'Test Book',
        author: 'Test Author',
        status: ReadingStatus.Reading,
        dateAdded: '2025-01-01T00:00:00.000Z',
        lastModified: '2025-01-02T00:00:00.000Z',
        isPartOfSeries: true,
        seriesId: 'series-456',
        seriesPosition: 2
      };

      // Act
      const uiBook = convertDbBookToUiBook(dbBook);

      // Assert
      expect(uiBook.id).toEqual(dbBook.id);
      expect(uiBook.title).toEqual(dbBook.title);
      expect(uiBook.author).toEqual(dbBook.author);
      expect(uiBook.status).toEqual('reading');
      expect(uiBook.dateAdded).toBeInstanceOf(Date);
      expect(uiBook.dateAdded.toISOString()).toEqual(dbBook.dateAdded);
      expect(uiBook.lastModified).toBeInstanceOf(Date);
      expect(uiBook.lastModified.toISOString()).toEqual(dbBook.lastModified);
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
        status: ReadingStatus.Reading,
        dateAdded: 'not-a-date',
        lastModified: 'also-not-a-date'
      };

      // Act
      const uiBook = convertDbBookToUiBook(dbBook as any);

      // Assert
      expect(uiBook.id).toEqual(dbBook.id);
      expect(uiBook.dateAdded).toBeInstanceOf(Date); // Should default to now
      expect(uiBook.lastModified).toBeInstanceOf(Date);
    });

    it('should handle all reading status enum values correctly', () => {
      // Test each status conversion
      expect(convertDbBookToUiBook({ status: ReadingStatus.ToRead } as any).status).toEqual('to-read');
      expect(convertDbBookToUiBook({ status: ReadingStatus.Reading } as any).status).toEqual('reading');
      expect(convertDbBookToUiBook({ status: ReadingStatus.Completed } as any).status).toEqual('completed');
      expect(convertDbBookToUiBook({ status: ReadingStatus.OnHold } as any).status).toEqual('on-hold');
      expect(convertDbBookToUiBook({ status: ReadingStatus.Dropped } as any).status).toEqual('dropped');
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
        completedBooks: 2,
        readingProgress: 0.4,
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
      expect(dbSeries.completedBooks).toEqual(uiSeries.completedBooks);
      expect(dbSeries.readingProgress).toEqual(uiSeries.readingProgress);
      expect(dbSeries.createdAt).toEqual(uiSeries.createdAt.toISOString());
      expect(dbSeries.updatedAt).toEqual(uiSeries.updatedAt.toISOString());
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
      expect(dbSeries.createdAt).toBeDefined(); // Should default to now
      expect(dbSeries.updatedAt).toBeDefined();
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
        completedBooks: 2,
        readingProgress: 0.4,
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-02T00:00:00.000Z',
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
      expect(uiSeries.completedBooks).toEqual(dbSeries.completedBooks);
      expect(uiSeries.readingProgress).toEqual(dbSeries.readingProgress);
      expect(uiSeries.createdAt).toBeInstanceOf(Date);
      expect(uiSeries.createdAt.toISOString()).toEqual(dbSeries.createdAt);
      expect(uiSeries.updatedAt).toBeInstanceOf(Date);
      expect(uiSeries.updatedAt.toISOString()).toEqual(dbSeries.updatedAt);
    });

    it('should handle invalid date formats gracefully', () => {
      // Arrange
      const dbSeries = {
        id: 'series-123',
        name: 'Test Series',
        books: [],
        createdAt: 'not-a-date',
        updatedAt: 'also-not-a-date'
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
