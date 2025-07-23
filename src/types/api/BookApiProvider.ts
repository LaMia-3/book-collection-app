import { Book } from '../models/Book';

/**
 * Common search parameters across API providers
 */
export interface SearchParams {
  query: string;
  type?: 'title' | 'author' | 'isbn' | 'all';
  page?: number;
  limit?: number;
}

/**
 * Common search result across API providers
 */
export interface SearchResult {
  books: BookSearchItem[];
  totalItems: number;
  page: number;
  hasMore: boolean;
}

/**
 * Book search item from external API
 */
export interface BookSearchItem {
  id: string;
  title: string;
  author: string | string[];
  thumbnail?: string;
  publishedDate?: string;
  provider: string;  // 'google', 'openlib', etc.
}

/**
 * Interface for API providers
 * This allows us to swap different book API implementations
 */
export interface BookApiProvider {
  /**
   * Provider identifier
   */
  readonly id: string;
  
  /**
   * Provider display name
   */
  readonly name: string;
  
  /**
   * Search for books using the provider's API
   */
  searchBooks(params: SearchParams): Promise<SearchResult>;
  
  /**
   * Get detailed information for a specific book
   */
  getBookDetails(id: string): Promise<Book>;
  
  /**
   * Check if the provider is available
   * (e.g., API is accessible, rate limits are not exceeded, etc.)
   */
  isAvailable(): Promise<boolean>;
}
