import { Series } from '@/types/series';

/**
 * Service for fetching series data from external APIs
 */
export class SeriesApiService {
  private baseUrl = 'https://www.googleapis.com/books/v1';
  private openLibraryBaseUrl = 'https://openlibrary.org/api';
  
  /**
   * Get enhanced series information by searching APIs with book info
   */
  async getEnhancedSeriesInfo(bookId: string, title: string, author: string): Promise<Partial<Series> | null> {
    try {
      // First try to identify series from Google Books API
      const query = encodeURIComponent(`${title} ${author} series`);
      const response = await fetch(`${this.baseUrl}/volumes?q=${query}&maxResults=5`);
      
      if (!response.ok) {
        throw new Error(`Google Books API error: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.items || data.items.length === 0) {
        return null;
      }
      
      // Look for books that mention "series" in the title or description
      const seriesBook = data.items.find((item: any) => {
        const volumeInfo = item.volumeInfo || {};
        const seriesInfo = volumeInfo.seriesInfo;
        const description = volumeInfo.description || '';
        const bookTitle = volumeInfo.title || '';
        
        return seriesInfo || 
               description.toLowerCase().includes('series') || 
               bookTitle.toLowerCase().includes('series');
      });
      
      if (!seriesBook) {
        return null;
      }
      
      const volumeInfo = seriesBook.volumeInfo;
      const seriesName = this.extractSeriesName(volumeInfo.title, title);
      
      return {
        name: seriesName || title.split(':')[0],
        description: volumeInfo.description,
        author: volumeInfo.authors ? volumeInfo.authors[0] : author,
        coverImage: volumeInfo.imageLinks?.thumbnail,
        status: 'unknown', // API doesn't provide series status
        totalBooks: undefined, // API doesn't provide total books count
        genre: volumeInfo.categories
      };
    } catch (error) {
      console.error('Error fetching series info:', error);
      return null;
    }
  }
  
  /**
   * Try to extract series name from book title
   */
  private extractSeriesName(fullTitle: string, bookTitle: string): string | null {
    // Common series patterns
    const patterns = [
      /(.+?)(?: Series)(?:: | - | )(.+)/i, // "Harry Potter Series: Book 1"
      /(.+?)(?: #\d+)/i,                    // "Harry Potter #1"
      /(.+?)(?:: Book \d+)/i,               // "Harry Potter: Book 1"
      /(.+?)(?:: Volume \d+)/i,             // "Harry Potter: Volume 1"
      /(.+?)(?:, Book \d+)/i,               // "Harry Potter, Book 1"
      /(.+?)(?:\((?:Book|Vol\.?) \d+\))/i   // "Harry Potter (Book 1)"
    ];
    
    for (const pattern of patterns) {
      const match = fullTitle.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    // If book title has a colon, first part might be series name
    if (bookTitle.includes(':')) {
      return bookTitle.split(':')[0].trim();
    }
    
    return null;
  }
}

// Export a singleton instance
export const seriesApiService = new SeriesApiService();
