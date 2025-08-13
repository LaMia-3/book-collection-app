import { Book } from '@/types/book';
import { Series } from '@/types/series';

/**
 * Service for detecting series from existing books using pattern matching and external APIs
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
    
    if (potentialSeries.size === 0) {
      // Group books together by author and look for patterns
      const booksByAuthor = books.reduce<Record<string, Book[]>>((acc, book) => {
        if (!book.author) return acc;
        if (!acc[book.author]) acc[book.author] = [];
        acc[book.author].push(book);
        return acc;
      }, {});
      
      // Look for similar titles or volumes across an author's books
      for (const [author, authorBooks] of Object.entries(booksByAuthor)) {
        if (authorBooks.length < 2) continue;
        
        // Group by title patterns
        const titlePatterns = new Map<string, Book[]>();
        
        // Common patterns: "Book X", "Volume X", "Part X"
        for (const book of authorBooks) {
          const title = book.title || '';
          
          // Check for volume numbers in title
          const volumeMatch = title.match(/(?:Book|Volume|Part)\s+(\d+)/i);
          
          // Check for common prefixes (e.g., "Harry Potter and the...")
          const words = title.split(' ');
          let prefix = words.slice(0, Math.min(3, words.length)).join(' ');
          
          // If we found a volume number, use the text before it as a potential series title
          if (volumeMatch) {
            const volumeIndex = title.indexOf(volumeMatch[0]);
            if (volumeIndex > 0) {
              prefix = title.substring(0, volumeIndex).trim();
            }
          }
          
          if (prefix) {
            if (!titlePatterns.has(prefix)) {
              titlePatterns.set(prefix, []);
            }
            titlePatterns.get(prefix)?.push(book);
          }
        }
        
        // Add any groups that have multiple books as potential series
        for (const [prefix, seriesBooks] of titlePatterns.entries()) {
          if (seriesBooks.length >= 2) {
            potentialSeries.set(`${prefix} Series`, seriesBooks);
          }
        }
      }
    }
    
    return potentialSeries;
  }
  
  /**
   * For a group of books that might be a series, generate series info
   * Uses Google Books API to find additional information
   */
  async enrichSeriesData(seriesName: string, books: Book[]): Promise<Partial<Series>> {
    console.log('Enriching series data for', seriesName);
    
    try {
      // Use Google Books API to get more info about the series
      const author = books[0]?.author || '';
      const query = encodeURIComponent(`${seriesName} ${author} series`);
      const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=10`);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.items || data.items.length === 0) {
        // Fallback if no API results
        return this.createBasicSeriesInfo(seriesName, books);
      }
      
      // Find the best matching item
      const bestMatch = data.items.find((item: any) => {
        const info = item.volumeInfo || {};
        const title = info.title || '';
        const bookAuthor = info.authors?.[0] || '';
        
        return (
          title.toLowerCase().includes(seriesName.toLowerCase()) || 
          (author && bookAuthor.toLowerCase().includes(author.toLowerCase()))
        );
      }) || data.items[0];
      
      const volumeInfo = bestMatch.volumeInfo || {};
      
      return {
        name: seriesName,
        description: volumeInfo.description || `A series of books by ${author || 'the author'}.`,
        author: volumeInfo.authors?.[0] || author,
        books: books.map(book => book.id),
        readingOrder: 'publication',
        status: this.determineSeriesStatus(books),
        totalBooks: this.estimateTotalBooksInSeries(books),
        genre: volumeInfo.categories || [],
        coverImage: volumeInfo.imageLinks?.thumbnail || books[0]?.thumbnail
      };
    } catch (error) {
      console.error('Error enriching series data:', error);
      return this.createBasicSeriesInfo(seriesName, books);
    }
  }
  
  /**
   * Create basic series info when API data isn't available
   */
  private createBasicSeriesInfo(seriesName: string, books: Book[]): Partial<Series> {
    return {
      name: seriesName,
      description: `A series featuring ${books.length} books.`,
      author: books[0]?.author,
      books: books.map(book => book.id),
      readingOrder: 'publication',
      status: this.determineSeriesStatus(books),
      totalBooks: this.estimateTotalBooksInSeries(books),
      coverImage: books[0]?.thumbnail
    };
  }
  
  /**
   * Determine series status based on book publication dates
   */
  private determineSeriesStatus(books: Book[]): 'ongoing' | 'completed' | 'cancelled' {
    // If we have publication years, try to determine if series is likely ongoing
    const publishedYears = books
      .map(book => {
        if (book.publishedDate) {
          const year = parseInt(book.publishedDate.substring(0, 4));
          return isNaN(year) ? null : year;
        }
        return null;
      })
      .filter(year => year !== null) as number[];
    
    if (publishedYears.length === 0) return 'cancelled'; // No publication dates available
    
    // If most recent publication is from the last 3 years, likely ongoing
    const currentYear = new Date().getFullYear();
    const maxYear = Math.max(...publishedYears);
    
    if (currentYear - maxYear <= 3) return 'ongoing';
    if (currentYear - maxYear >= 7) return 'completed';
    
    return 'cancelled'; // Default to cancelled when status is uncertain
  }
  
  /**
   * Estimate total books in series based on available books
   */
  private estimateTotalBooksInSeries(books: Book[]): number | undefined {
    // Extract volume numbers from titles
    const volumeNumbers = books.map(book => {
      const title = book.title || '';
      const match = title.match(/(?:Book|Volume|Part)\s+(\d+)/i);
      return match ? parseInt(match[1]) : null;
    }).filter(num => num !== null) as number[];
    
    // If we found volume numbers, use the highest as a lower bound
    if (volumeNumbers.length > 0) {
      return Math.max(...volumeNumbers);
    }
    
    // Otherwise, just use the number of books we have
    return books.length;
  }
}

// Export a singleton instance
export const seriesDetectionService = new SeriesDetectionService();
