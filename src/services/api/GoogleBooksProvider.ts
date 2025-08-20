import { Book, ReadingStatus } from '@/types/models/Book';
import { 
  BookApiProvider, 
  SearchParams, 
  SearchResult, 
  BookSearchItem 
} from '@/types/api/BookApiProvider';
import { createLogger } from '@/utils/loggingUtils';

/**
 * Provider implementation for the Google Books API
 */
export class GoogleBooksProvider implements BookApiProvider {
  readonly id = 'google';
  readonly name = 'Google Books';

  private readonly baseUrl = 'https://www.googleapis.com/books/v1';
  private readonly log = createLogger('GoogleBooksProvider');
  
  // Rate limiting configuration
  private lastRequestTime = 0;
  private readonly minRequestInterval = 1000; // Minimum 1 second between requests
  private readonly maxRetries = 3;
  private readonly initialBackoffDelay = 2000; // Start with 2 seconds
  
  /**
   * Sleep/delay function
   * @param ms Milliseconds to delay
   */
  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Ensures we don't send requests too quickly
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    
    if (elapsed < this.minRequestInterval) {
      const delayTime = this.minRequestInterval - elapsed;
      this.log.debug(`Rate limiting: Waiting ${delayTime}ms before next request`);
      await this.delay(delayTime);
    }
    
    this.lastRequestTime = Date.now();
  }
  
  /**
   * Makes an API request with retry logic for rate limits
   * @param url The URL to request
   * @returns Response
   */
  private async makeRequest(url: string): Promise<Response> {
    let retries = 0;
    let backoffDelay = this.initialBackoffDelay;
    
    while (true) {
      try {
        // Enforce rate limiting before each request
        await this.enforceRateLimit();
        
        const response = await fetch(url);
        
        // Handle rate limiting with exponential backoff
        if (response.status === 429) {
          if (retries >= this.maxRetries) {
            this.log.error(`Rate limit exceeded after ${retries} retries`);
            throw new Error(`Google Books API rate limit exceeded after ${retries} retries`);
          }
          
          retries++;
          this.log.warn(`Rate limited (429). Retry ${retries}/${this.maxRetries} after ${backoffDelay}ms`);
          await this.delay(backoffDelay);
          backoffDelay *= 2; // Exponential backoff
          continue;
        }
        
        return response;
      } catch (error) {
        if (retries >= this.maxRetries) {
          throw error;
        }
        
        retries++;
        this.log.warn(`Request failed. Retry ${retries}/${this.maxRetries} after ${backoffDelay}ms`, error);
        await this.delay(backoffDelay);
        backoffDelay *= 2; // Exponential backoff
      }
    }
  }

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
    
    // Make API request with retry logic
    const url = `${this.baseUrl}/volumes?q=${encodeURIComponent(searchQuery)}&startIndex=${startIndex}&maxResults=${limit}`;
    const response = await this.makeRequest(url);
    
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
    // Make API request with retry logic
    const response = await this.makeRequest(`${this.baseUrl}/volumes/${id}`);
    
    if (!response.ok) {
      throw new Error(`Google Books API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Extract ISBNs if available
    const isbn10: string[] = [];
    const isbn13: string[] = [];
    
    // Google Books API provides industry identifiers which include ISBNs
    if (data.volumeInfo?.industryIdentifiers) {
      data.volumeInfo.industryIdentifiers.forEach((identifier: any) => {
        if (identifier.type === 'ISBN_10') {
          isbn10.push(identifier.identifier);
        }
        if (identifier.type === 'ISBN_13') {
          isbn13.push(identifier.identifier);
        }
      });
    }

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
      status: ReadingStatus.TO_READ, // Default status for newly added books
      isbn10: isbn10.length > 0 ? isbn10 : undefined,
      isbn13: isbn13.length > 0 ? isbn13 : undefined
    };
  }

  /**
   * Check if the Google Books API is available
   * @returns True if available, false otherwise
   */
  async isAvailable(): Promise<boolean> {
    try {
      // Make a simple query to check if the API is responding
      // We don't use makeRequest here to avoid retry loops when checking availability
      await this.enforceRateLimit();
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
