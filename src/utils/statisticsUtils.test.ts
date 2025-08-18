import { calculateGenreStatistics, getTopGenresWithOthers, calculateReadingStatusStatistics, getReadingStatusChartData, GenreCount } from './statisticsUtils';
import type { Book } from '@/types/models/Book';
import { ReadingStatus } from '@/types/models/Book';

// Mock the logging utility
jest.mock('./loggingUtils', () => ({
  createLogger: () => ({
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    trace: jest.fn(),
  }),
}));

describe('statisticsUtils', () => {
  describe('calculateGenreStatistics', () => {
    it('should count books with single genres correctly', () => {
      // Arrange
      const books: Book[] = [
        { 
          id: '1', 
          title: 'Book 1', 
          author: 'Author 1', 
          genre: 'Fiction',
          spineColor: 1,
          addedDate: '2023-01-01'
        },
        { 
          id: '2', 
          title: 'Book 2', 
          author: 'Author 2', 
          genre: 'Fantasy',
          spineColor: 2,
          addedDate: '2023-01-02'
        },
        { 
          id: '3', 
          title: 'Book 3', 
          author: 'Author 3', 
          genre: 'Fiction',
          spineColor: 3,
          addedDate: '2023-01-03'
        },
      ];

      // Act
      const result = calculateGenreStatistics(books);

      // Assert
      expect(result).toHaveLength(2);
      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'Fiction',
            value: 2,
            percentage: 2 / 3 * 100
          }),
          expect.objectContaining({
            name: 'Fantasy',
            value: 1,
            percentage: 1 / 3 * 100
          })
        ])
      );
      // Check sorting - should be ordered by count (descending)
      expect(result[0].name).toBe('Fiction');
      expect(result[1].name).toBe('Fantasy');
    });

    it('should handle books with multiple genres correctly', () => {
      // Arrange
      const books: Book[] = [
        { 
          id: '1', 
          title: 'Book 1', 
          author: 'Author 1', 
          genre: ['Fiction', 'Fantasy'],
          spineColor: 1,
          addedDate: '2023-01-01'
        },
        { 
          id: '2', 
          title: 'Book 2', 
          author: 'Author 2', 
          genre: ['Mystery', 'Thriller'],
          spineColor: 2,
          addedDate: '2023-01-02'
        },
        { 
          id: '3', 
          title: 'Book 3', 
          author: 'Author 3', 
          genre: ['Fiction', 'Thriller'],
          spineColor: 3,
          addedDate: '2023-01-03'
        },
      ];

      // Act
      const result = calculateGenreStatistics(books);

      // Assert
      expect(result).toHaveLength(4);
      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'Fiction',
            value: 2,
          }),
          expect.objectContaining({
            name: 'Thriller',
            value: 2,
          }),
          expect.objectContaining({
            name: 'Fantasy',
            value: 1,
          }),
          expect.objectContaining({
            name: 'Mystery',
            value: 1,
          })
        ])
      );
      
      // Check that the total percentage adds up to 100%
      const totalPercentage = result.reduce((sum, genre) => sum + genre.percentage!, 0);
      expect(Math.round(totalPercentage)).toBe(100);
    });

    it('should handle books with no genres as "Uncategorized"', () => {
      // Arrange
      const books: Book[] = [
        { 
          id: '1', 
          title: 'Book 1', 
          author: 'Author 1', 
          genre: '',
          spineColor: 1,
          addedDate: '2023-01-01'
        },
        { 
          id: '2', 
          title: 'Book 2', 
          author: 'Author 2', 
          genre: [],
          spineColor: 2,
          addedDate: '2023-01-02'
        },
        { 
          id: '3', 
          title: 'Book 3', 
          author: 'Author 3', 
          genre: 'Fiction',
          spineColor: 3,
          addedDate: '2023-01-03'
        },
      ];

      // Act
      const result = calculateGenreStatistics(books);

      // Assert
      expect(result).toHaveLength(2);
      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'Uncategorized',
            value: 2,
          }),
          expect.objectContaining({
            name: 'Fiction',
            value: 1,
          })
        ])
      );
      
      // The "Uncategorized" should be first due to higher count
      expect(result[0].name).toBe('Uncategorized');
    });

    it('should handle empty book array', () => {
      // Act
      const result = calculateGenreStatistics([]);

      // Assert
      expect(result).toEqual([]);
    });

    it('should handle undefined or null genres', () => {
      // Arrange
      const books: Book[] = [
        { 
          id: '1', 
          title: 'Book 1', 
          author: 'Author 1', 
          genre: undefined,
          spineColor: 1,
          addedDate: '2023-01-01'
        },
        { 
          id: '2', 
          title: 'Book 2', 
          author: 'Author 2', 
          spineColor: 2,
          addedDate: '2023-01-02'
        },
      ];

      // Act
      const result = calculateGenreStatistics(books);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(
        expect.objectContaining({
          name: 'Uncategorized',
          value: 2,
          percentage: 100
        })
      );
    });
  });

  describe('getTopGenresWithOthers', () => {
    it('should return top N genres and group the rest as "Other"', () => {
      // Arrange
      const genreCounts: GenreCount[] = [
        { name: 'Fiction', value: 10, percentage: 30 },
        { name: 'Fantasy', value: 8, percentage: 25 },
        { name: 'Romance', value: 5, percentage: 15 },
        { name: 'Mystery', value: 4, percentage: 12 },
        { name: 'Thriller', value: 3, percentage: 9 },
        { name: 'Horror', value: 2, percentage: 6 },
        { name: 'Biography', value: 1, percentage: 3 },
      ];

      // Act
      const result = getTopGenresWithOthers(genreCounts, 3);

      // Assert
      expect(result).toHaveLength(4); // Top 3 + "Other"
      expect(result[0].name).toBe('Fiction');
      expect(result[1].name).toBe('Fantasy');
      expect(result[2].name).toBe('Romance');
      expect(result[3].name).toBe('Other');
      expect(result[3].value).toBe(10); // 4+3+2+1
      expect(result[3].percentage).toBe(30); // 12+9+6+3
    });

    it('should return all genres if count is less than or equal to topCount', () => {
      // Arrange
      const genreCounts: GenreCount[] = [
        { name: 'Fiction', value: 10, percentage: 50 },
        { name: 'Fantasy', value: 8, percentage: 40 },
        { name: 'Romance', value: 2, percentage: 10 },
      ];

      // Act
      const result = getTopGenresWithOthers(genreCounts, 5);

      // Assert
      expect(result).toHaveLength(3);
      expect(result).toEqual(genreCounts);
    });

    it('should handle empty array', () => {
      // Act
      const result = getTopGenresWithOthers([]);

      // Assert
      expect(result).toEqual([]);
    });

    it('should use default topCount of 10 when not specified', () => {
      // Arrange
      const genreCounts: GenreCount[] = [];
      for (let i = 1; i <= 15; i++) {
        genreCounts.push({
          name: `Genre ${i}`,
          value: 20 - i,
          percentage: (20 - i) * 2
        });
      }

      // Act
      const result = getTopGenresWithOthers(genreCounts);

      // Assert
      expect(result).toHaveLength(11); // Top 10 + "Other"
      expect(result[10].name).toBe('Other');
      expect(result[10].value).toBe(5 + 6 + 7 + 8 + 9); // Sum of values for genres 11-15
    });
  });

  describe('calculateReadingStatusStatistics', () => {
    it('should count books by reading status correctly', () => {
      // Arrange
      const books: Book[] = [
        { 
          id: '1', 
          title: 'Book 1', 
          author: 'Author 1',
          status: ReadingStatus.READING,
          spineColor: 1,
          addedDate: '2023-01-01'
        },
        { 
          id: '2', 
          title: 'Book 2', 
          author: 'Author 2',
          status: ReadingStatus.COMPLETED,
          spineColor: 2,
          addedDate: '2023-01-02'
        },
        { 
          id: '3', 
          title: 'Book 3', 
          author: 'Author 3',
          status: ReadingStatus.TO_READ,
          spineColor: 3,
          addedDate: '2023-01-03'
        },
        { 
          id: '4', 
          title: 'Book 4', 
          author: 'Author 4',
          status: ReadingStatus.DNF,
          spineColor: 4,
          addedDate: '2023-01-04'
        },
        { 
          id: '5', 
          title: 'Book 5', 
          author: 'Author 5',
          status: ReadingStatus.ON_HOLD,
          spineColor: 5,
          addedDate: '2023-01-05'
        },
      ];

      // Act
      const result = calculateReadingStatusStatistics(books);

      // Assert
      expect(result).toEqual({
        reading: 1,
        completed: 1,
        wantToRead: 1,
        dnf: 1,
        onHold: 1,
        total: 5
      });
    });

    it('should handle enum values for reading status', () => {
      // Arrange
      const books: Book[] = [
        { 
          id: '1', 
          title: 'Book 1', 
          author: 'Author 1',
          status: ReadingStatus.READING,
          spineColor: 1,
          addedDate: '2023-01-01'
        },
        { 
          id: '2', 
          title: 'Book 2', 
          author: 'Author 2',
          status: ReadingStatus.ON_HOLD,
          spineColor: 2,
          addedDate: '2023-01-02'
        },
      ];

      // Act
      const result = calculateReadingStatusStatistics(books);

      // Assert
      expect(result.reading).toBe(1);
      expect(result.onHold).toBe(1);
      expect(result.total).toBe(2);
    });

    it('should handle DB format reading statuses', () => {
      // Arrange
      const books: Book[] = [
        { 
          id: '1', 
          title: 'Book 1', 
          author: 'Author 1',
          status: ReadingStatus.ON_HOLD,
          spineColor: 1,
          addedDate: '2023-01-01'
        },
      ];

      // Act
      const result = calculateReadingStatusStatistics(books);

      // Assert
      expect(result.onHold).toBe(1);
      expect(result.total).toBe(1);
    });
  });

  describe('getReadingStatusChartData', () => {
    it('should convert reading status statistics to chart data format', () => {
      // Arrange
      const stats = {
        reading: 5,
        completed: 10,
        wantToRead: 3,
        dnf: 2,
        onHold: 4,
        total: 24
      };

      // Act
      const result = getReadingStatusChartData(stats);

      // Assert
      expect(result).toEqual([
        { name: 'Currently Reading', value: 5 },
        { name: 'Completed', value: 10 },
        { name: 'Want to Read', value: 3 },
        { name: 'Did Not Finish', value: 2 },
        { name: 'On Hold', value: 4 }
      ]);
    });

    it('should filter out statuses with no books', () => {
      // Arrange
      const stats = {
        reading: 0,
        completed: 10,
        wantToRead: 0,
        dnf: 2,
        onHold: 4,
        total: 16
      };

      // Act
      const result = getReadingStatusChartData(stats);

      // Assert
      expect(result).toEqual([
        { name: 'Completed', value: 10 },
        { name: 'Did Not Finish', value: 2 },
        { name: 'On Hold', value: 4 }
      ]);
    });
  });
});
