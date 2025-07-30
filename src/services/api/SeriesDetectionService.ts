import { Book } from '@/types/book';
import { Series } from '@/types/series';
import { generateMockSeries } from '@/utils/mockApiData';

/**
 * Service for detecting series from existing books
 * Simplified mock implementation for development
 */
export class SeriesDetectionService {
  /**
   * Scan the user's book collection for potential series
   * Uses a simplified detection for development purposes
   */
  async detectSeriesFromCollection(books: Book[]): Promise<Map<string, Book[]>> {
    console.log('Detecting series from collection', books.length);
    const potentialSeries = new Map<string, Book[]>();
    
    // Basic implementation - group by legacy series name
    for (const book of books) {
      if (book._legacySeriesName) {
        const seriesName = book._legacySeriesName.trim();
        if (!potentialSeries.has(seriesName)) {
          potentialSeries.set(seriesName, []);
        }
        potentialSeries.get(seriesName)?.push(book);
      }
    }
    
    // If we don't have any series from legacy names, return some mock series
    if (potentialSeries.size === 0) {
      // Group a few books together by author
      const booksByAuthor = books.reduce<Record<string, Book[]>>((acc, book) => {
        if (!book.author) return acc;
        if (!acc[book.author]) acc[book.author] = [];
        acc[book.author].push(book);
        return acc;
      }, {});
      
      // Find authors with multiple books
      for (const [author, authorBooks] of Object.entries(booksByAuthor)) {
        if (authorBooks.length >= 2) {
          potentialSeries.set(`${author}'s Series`, authorBooks.slice(0, 3));
          break;
        }
      }
    }
    
    return potentialSeries;
  }
  
  /**
   * For a group of books that might be a series, generate series info
   * Simplified implementation returning mock data
   */
  async enrichSeriesData(seriesName: string, books: Book[]): Promise<Partial<Series>> {
    console.log('Enriching series data for', seriesName);
    
    // Use mock data for development
    const mockSeries = generateMockSeries();
    const matchingSeries = mockSeries.find(s => 
      s.name.toLowerCase().includes(seriesName.toLowerCase())
    );
    
    if (matchingSeries) {
      return {
        ...matchingSeries,
        name: seriesName,
        books: books.map(book => book.id)
      };
    }
    
    // Return basic series info
    return {
      name: seriesName,
      description: `A captivating series featuring ${books.length} books.`,
      author: books[0]?.author,
      books: books.map(book => book.id),
      readingOrder: 'publication',
      status: 'ongoing',
      totalBooks: books.length + Math.floor(Math.random() * 3) + 1 // Add a few more for total
    };
  }
}

// Export a singleton instance
export const seriesDetectionService = new SeriesDetectionService();
