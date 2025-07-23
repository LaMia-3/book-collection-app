import { Book, ReadingStatus } from '@/types/models/Book';
import { 
  BookApiProvider, 
  SearchParams, 
  SearchResult, 
  BookSearchItem 
} from '@/types/api/BookApiProvider';

/**
 * Provider implementation for the Google Books API
 */
export class GoogleBooksProvider implements BookApiProvider {
  readonly id = 'google';
  readonly name = 'Google Books';

  private readonly baseUrl = 'https://www.googleapis.com/books/v1';
  
  /**
   * Search for books using the Google Books API
   * @param params Search parameters
   * @returns Search result
   */
  async searchBooks(params: SearchParams): Promise<SearchResult> {
    const { query, type = 'all', page = 1, limit = 10 } = params;
    
    // Calculate start index (0-based)
    const startIndex = (page - 1) * limit;
    
    // Construct search query
    let searchQuery = query;
    if (type !== 'all') {
      // Map our search type to Google Books API syntax
      const fieldMapping: Record<string, string> = {
        'title': 'intitle:',
        'author': 'inauthor:',
        'isbn': 'isbn:'
      };
      searchQuery = `${fieldMapping[type]}${query}`;
    }
    
    // Make API request
    const response = await fetch(
      `${this.baseUrl}/volumes?q=${encodeURIComponent(searchQuery)}&startIndex=${startIndex}&maxResults=${limit}`
    );
    
    if (!response.ok) {
      throw new Error(`Google Books API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Transform to our common format
    const books: BookSearchItem[] = (data.items || []).map((item: any) => ({
      id: item.id,
      title: item.volumeInfo.title || 'Unknown Title',
      author: item.volumeInfo.authors?.[0] || 'Unknown Author',
      thumbnail: item.volumeInfo.imageLinks?.thumbnail,
      publishedDate: item.volumeInfo.publishedDate,
      provider: this.id
    }));
    
    return {
      books,
      totalItems: data.totalItems || books.length,
      page,
      hasMore: startIndex + books.length < (data.totalItems || 0)
    };
  }

  /**
   * Get detailed information for a specific book
   * @param id Book ID from Google Books
   * @returns Book details
   */
  async getBookDetails(id: string): Promise<Book> {
    const response = await fetch(`${this.baseUrl}/volumes/${id}`);
    
    if (!response.ok) {
      throw new Error(`Google Books API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Transform to our Book format
    return {
      id: crypto.randomUUID(), // Generate a unique ID for our system
      title: data.volumeInfo.title || 'Unknown Title',
      author: data.volumeInfo.authors?.[0] || 'Unknown Author',
      genre: data.volumeInfo.categories?.[0],
      description: data.volumeInfo.description,
      publishedDate: data.volumeInfo.publishedDate,
      pageCount: data.volumeInfo.pageCount,
      thumbnail: data.volumeInfo.imageLinks?.thumbnail,
      sourceId: data.id,
      sourceType: 'google',
      spineColor: Math.floor(Math.random() * 8) + 1, // Random spine color
      addedDate: new Date().toISOString(),
      status: ReadingStatus.TO_READ // Default status for newly added books
    };
  }

  /**
   * Check if the Google Books API is available
   * @returns True if available, false otherwise
   */
  async isAvailable(): Promise<boolean> {
    try {
      // Make a simple query to check if the API is responding
      const response = await fetch(`${this.baseUrl}/volumes?q=test&maxResults=1`);
      return response.ok;
    } catch {
      return false;
    }
  }
}

// Create a singleton instance
export const googleBooksProvider = new GoogleBooksProvider();

export default googleBooksProvider;
