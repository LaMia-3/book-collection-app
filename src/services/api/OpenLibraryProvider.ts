import { Book, ReadingStatus } from '@/types/models/Book';
import { 
  BookApiProvider, 
  SearchParams, 
  SearchResult, 
  BookSearchItem 
} from '@/types/api/BookApiProvider';
import { createLogger } from '@/utils/loggingUtils';

/**
 * Provider implementation for the Open Library API
 */
export class OpenLibraryProvider implements BookApiProvider {
  readonly id = 'openlib';
  readonly name = 'Open Library';

  private readonly searchBaseUrl = 'https://openlibrary.org/search.json';
  private readonly detailsBaseUrl = 'https://openlibrary.org/works';
  private readonly coverBaseUrl = 'https://covers.openlibrary.org/b';
  private readonly log = createLogger('OpenLibraryProvider');
  
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
            throw new Error(`Open Library API rate limit exceeded after ${retries} retries`);
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
   * Search for books using the Open Library API
   * @param params Search parameters
   * @returns Search result
   */
  async searchBooks(params: SearchParams): Promise<SearchResult> {
    const { query, type = 'all', page = 1, limit = 10 } = params;
    
    // Calculate start index (Open Library uses 0-based pagination)
    const offset = (page - 1) * limit;
    
    // Construct search query based on type
    let searchQuery = query;
    let searchField = '';
    
    if (type !== 'all') {
      // Map our search type to Open Library API field
      const fieldMapping: Record<string, string> = {
        'title': 'title',
        'author': 'author',
        'isbn': 'isbn'
      };
      searchField = `&${fieldMapping[type]}=${encodeURIComponent(query)}`;
      searchQuery = ''; // Use empty query with field search
    }
    
    // Make API request with retry logic
    const url = `${this.searchBaseUrl}?q=${encodeURIComponent(searchQuery)}${searchField}&offset=${offset}&limit=${limit}`;
    const response = await this.makeRequest(url);
    
    if (!response.ok) {
      throw new Error(`Open Library API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Transform to our common format
    const books: BookSearchItem[] = (data.docs || []).map((item: any) => {
      // Extract cover ID for thumbnail URL
      const coverId = item.cover_i;
      const thumbnailUrl = coverId 
        ? `${this.coverBaseUrl}/id/${coverId}-M.jpg` 
        : undefined;

      return {
        id: item.key.replace('/works/', ''),
        title: item.title || 'Unknown Title',
        author: item.author_name?.[0] || 'Unknown Author',
        thumbnail: thumbnailUrl,
        publishedDate: item.first_publish_year?.toString(),
        provider: this.id
      };
    });
    
    return {
      books,
      totalItems: data.numFound || books.length,
      page,
      hasMore: offset + books.length < (data.numFound || 0)
    };
  }

  /**
   * Get detailed information for a specific book
   * @param id Book ID from Open Library (work ID)
   * @returns Book details
   */
  async getBookDetails(id: string): Promise<Book> {
    // First, get the work details with retry logic
    const workResponse = await this.makeRequest(`${this.detailsBaseUrl}/${id}.json`);
    
    if (!workResponse.ok) {
      throw new Error(`Open Library API error: ${workResponse.status} ${workResponse.statusText}`);
    }
    
    const workData = await workResponse.json();
    
    // Get the first edition if available for more details
    let editionData: any = {};
    if (workData.editions_key && workData.editions_key.length > 0) {
      try {
        const editionResponse = await this.makeRequest(`https://openlibrary.org/books/${workData.editions_key[0]}.json`);
        if (editionResponse.ok) {
          editionData = await editionResponse.json();
        }
      } catch (error) {
        this.log.warn('Could not fetch edition details', error);
      }
    }
    
    // Extract cover ID for thumbnail
    const coverId = workData.covers?.[0] || editionData.covers?.[0];
    const thumbnailUrl = coverId 
      ? `${this.coverBaseUrl}/id/${coverId}-M.jpg` 
      : undefined;
    
    // Extract ISBNs if available
    const isbn10: string[] = [];
    const isbn13: string[] = [];

    // Extract ISBNs from edition data
    if (editionData.isbn_10) {
      if (Array.isArray(editionData.isbn_10)) {
        isbn10.push(...editionData.isbn_10);
      } else if (typeof editionData.isbn_10 === 'string') {
        isbn10.push(editionData.isbn_10);
      }
    }

    if (editionData.isbn_13) {
      if (Array.isArray(editionData.isbn_13)) {
        isbn13.push(...editionData.isbn_13);
      } else if (typeof editionData.isbn_13 === 'string') {
        isbn13.push(editionData.isbn_13);
      }
    }

    // Transform to our Book format
    return {
      id: crypto.randomUUID(), // Generate a unique ID for our system
      title: workData.title || 'Unknown Title',
      author: workData.author_name?.[0] || editionData.authors?.[0]?.name || 'Unknown Author',
      genre: workData.subjects?.[0],
      description: workData.description?.value || workData.description,
      publishedDate: workData.first_publish_date || editionData.publish_date,
      pageCount: editionData.number_of_pages || undefined,
      thumbnail: thumbnailUrl,
      sourceId: id,
      sourceType: 'openlib',
      spineColor: Math.floor(Math.random() * 8) + 1, // Random spine color
      addedDate: new Date().toISOString(),
      status: ReadingStatus.TO_READ, // Default status for newly added books
      isbn10: isbn10.length > 0 ? isbn10 : undefined,
      isbn13: isbn13.length > 0 ? isbn13 : undefined
    };
  }

  /**
   * Check if the Open Library API is available
   * @returns True if available, false otherwise
   */
  async isAvailable(): Promise<boolean> {
    try {
      // Make a simple query to check if the API is responding
      // We don't use makeRequest here to avoid retry loops when checking availability
      await this.enforceRateLimit();
      const response = await fetch(`${this.searchBaseUrl}?q=test&limit=1`);
      return response.ok;
    } catch {
      return false;
    }
  }
}

// Create a singleton instance
export const openLibraryProvider = new OpenLibraryProvider();

export default openLibraryProvider;
