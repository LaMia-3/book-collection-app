/**
 * Enhanced StorageService - Central access point for data storage operations
 * This service uses IndexedDB as the ONLY source of truth for all data
 *
 * All localStorage usage has been completely removed - IndexedDB is the exclusive data store
 */
/**
 * Enhanced StorageService imports with performance optimizations
 */
import { indexedDBService } from './IndexedDBService';
import { Book as IndexedDBBook, BookSummary, BookDetail } from '@/types/indexeddb/Book';
import { Series as IndexedDBSeries, SeriesMetadata, SeriesWithBooks } from '@/types/indexeddb/Series';
import { UpcomingBook, UpcomingBookSummary } from '@/types/indexeddb/UpcomingBook';
import { Notification, NotificationSummary } from '@/types/indexeddb/Notification';
import { StoreNames } from '@/types/indexeddb';
import { ReadingStatus } from '@/types/models/Book';
// Types for UI components
import { Book as UIBook } from '@/types/book';
import { Series as UISeries } from '@/types/series';
import { Collection as UICollection } from '@/types/collection';
// Type adapter imports for conversion between UI and DB types
import { convertDbBookToUiBook, convertUiBookToDbBook, DBBook } from '@/adapters/BookTypeAdapter';
import { convertDbSeriesToUiSeries, convertUiSeriesToDbSeries, DBSeries } from '@/adapters/SeriesTypeAdapter';
// Performance optimization imports
import { 
  BatchOperations, 
  LazyLoading, 
  QueryOptimization, 
  CacheManagement, 
  PerformanceMonitoring 
} from './IndexedDBOptimizations';

// Cache configuration
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

// Define settings type
export interface UserSettings {
  id?: string;
  theme?: string;
  notifications?: Record<string, boolean>;
  preferences?: Record<string, any>;
  [key: string]: any;
}

/**
 * Enhanced StorageService with caching, robust error handling, and type safety
 */
export class EnhancedStorageService {
  private static instance: EnhancedStorageService;
  private db = indexedDBService;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;
  private toastService: any = null;

  // Memory cache for frequently accessed data
  private cache: {
    books: {
      data: UIBook[] | null;
      timestamp: number;
      invalidated: boolean;
    };
    series: {
      data: UISeries[] | null;
      timestamp: number;
      invalidated: boolean;
    };
    collections: {
      data: UICollection[] | null;
      timestamp: number;
      invalidated: boolean;
    };
    upcomingReleases: {
      data: Record<string, UpcomingBook[]> | null;
      timestamp: number;
      invalidated: boolean;
    };
    notifications: {
      data: Notification[] | null;
      timestamp: number;
      invalidated: boolean;
    };
    settings: {
      data: UserSettings | null;
      timestamp: number;
      invalidated: boolean;
    };
  } = {
    books: { data: null, timestamp: 0, invalidated: true },
    series: { data: null, timestamp: 0, invalidated: true },
    collections: { data: null, timestamp: 0, invalidated: true },
    upcomingReleases: { data: null, timestamp: 0, invalidated: true },
    notifications: { data: null, timestamp: 0, invalidated: true },
    settings: { data: null, timestamp: 0, invalidated: true }
  };
  
  // No migrations needed as backward compatibility isn't required
  
  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    // Don't initialize toast service here - hooks can only be used in React components
    // We'll show console messages instead for service-level notifications
    this.toastService = null;
    
    // Add listener for storage reset events
    this.setupStorageResetListener();
  }
  
  /**
   * Setup listener for storage reset events
   * This ensures that when storage is reset, all caches are invalidated
   */
  private setupStorageResetListener(): void {
    import('./CacheResetListener')
      .then(({ addStorageResetListener }) => {
        addStorageResetListener(() => {
          // Invalidate all caches when storage is reset
          console.log('EnhancedStorageService: Storage reset detected, invalidating all caches');
          this.invalidateAllCaches();
        });
      })
      .catch(error => {
        console.error('Failed to setup storage reset listener:', error);
      });
  }
  
  /**
   * Invalidate all caches immediately
   */
  private invalidateAllCaches(): void {
    Object.keys(this.cache).forEach(key => {
      this.invalidateCache(key as keyof typeof this.cache);
    });
  }

  /**
   * Get the singleton instance of EnhancedStorageService
   */
  public static getInstance(): EnhancedStorageService {
    if (!EnhancedStorageService.instance) {
      EnhancedStorageService.instance = new EnhancedStorageService();
    }
    
    return EnhancedStorageService.instance;
  }
  
  /**
   * Initialize the storage system
   */
  public async initialize(): Promise<void> {
    // Return existing promise if initialization is in progress
    if (this.initPromise) {
      return this.initPromise;
    }
    
    // Create a new initialization promise
    this.initPromise = new Promise<void>(async (resolve) => {
      try {
        // Initialize the IndexedDB service
        await this.db.initDb();
        
        // Set initialization flag
        this.isInitialized = true;
        console.log('Enhanced Storage Service initialized successfully');
        resolve();
      } catch (error) {
        console.error('Failed to initialize Enhanced Storage Service:', error);
        this.showUserNotification('Failed to initialize storage. Some features may not work correctly.');
        // Even on error, consider the service initialized to prevent endless retries
        this.isInitialized = true;
        resolve();
      }
    });
    
    return this.initPromise;
  }
  
  /**
   * Ensure the storage is initialized before any operation
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }
  
  /**
   * Show a user notification
   * Note: No longer uses toast service directly since hooks can't be used in non-React contexts
   * Instead logs to console and dispatches a custom event that components can listen for
   */
  private showUserNotification(message: string, type: 'info' | 'error' = 'error'): void {
    // Always log to console
    type === 'error' 
      ? console.error(message) 
      : console.info(message);
    
    // Dispatch a custom event that React components can listen for
    try {
      const event = new CustomEvent('book-collection:notification', {
        detail: {
          title: type === 'error' ? 'Error' : 'Information',
          description: message,
          variant: type === 'error' ? 'destructive' : 'default',
          timestamp: new Date().toISOString(),
        }
      });
      document.dispatchEvent(event);
    } catch (e) {
      console.error('Failed to dispatch notification event:', e);
    }
  }
  
  /**
   * Check if cache is valid for a given entity type
   */
  private isCacheValid<T>(entityType: keyof typeof this.cache): boolean {
    const cache = this.cache[entityType];
    return (
      cache.data !== null && 
      !cache.invalidated &&
      (Date.now() - cache.timestamp) < CACHE_TTL
    );
  }
  
  /**
   * Invalidate cache for a specific entity type
   */
  private invalidateCache(entityType: keyof typeof this.cache): void {
    this.cache[entityType].invalidated = true;
  }
  
  /**
   * Update cache for a specific entity type
   */
  private updateCache<T>(entityType: keyof typeof this.cache, data: T): void {
    this.cache[entityType] = {
      data: data as any,
      timestamp: Date.now(),
      invalidated: false
    };
  }
  
  /**
   * Get all books from storage with caching and performance optimizations
   * 
   * Performance features:
   * - Memory caching with TTL
   * - Performance monitoring
   * - Optimized type conversions
   */
  public async getBooks(): Promise<UIBook[]> {
    await this.ensureInitialized();
    
    // Start performance monitoring
    const endTiming = PerformanceMonitoring.startTiming('getBooks');
    
    // Try cache first for immediate response
    if (this.isCacheValid('books')) {
      endTiming(); // End timing if we hit cache
      return this.cache.books.data as UIBook[];
    }
    
    try {
      // Get database instance
      const db = await this.db.initDb();
      
      // CRITICAL FIX: Get ALL books from IndexedDB - it's the primary source of truth
      // Use -1 to ensure we get absolutely all books with no limit
      console.log('EnhancedStorageService: Retrieving ALL books from IndexedDB');
      const dbBooks = await QueryOptimization.getRecentlyUpdatedBooks(db, -1);
      
      if (dbBooks.length === 0) {
        // Fallback to regular method if optimization didn't return results
        // This could happen if the database schema is not properly initialized
        console.warn('No books found using optimized query, falling back to regular method');
        const regularBooks = await this.db.getBooks();
        const uiBooks = (regularBooks as unknown as DBBook[]).map(convertDbBookToUiBook);
        this.updateCache('books', uiBooks);
        
        console.log(`EnhancedStorageService: Retrieved ${uiBooks.length} books using fallback method`);
        endTiming(); // End timing before returning
        return uiBooks;
      }
      
      console.log(`EnhancedStorageService: Retrieved ${dbBooks.length} books from IndexedDB`);
      
      // Convert IndexedDB books to UI books using adapter with improved batching
      // Process in chunks to avoid blocking the main thread for too long
      const chunkSize = 50;
      let uiBooks: UIBook[] = [];
      
      for (let i = 0; i < dbBooks.length; i += chunkSize) {
        const chunk = dbBooks.slice(i, i + chunkSize);
        // Convert chunk and add to results
        const convertedChunk = (chunk as unknown as DBBook[]).map(convertDbBookToUiBook);
        uiBooks = [...uiBooks, ...convertedChunk];
        
        // If processing a large dataset, yield to main thread occasionally
        if (dbBooks.length > 200 && i % 200 === 0 && i > 0) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }
      
      // Update the cache
      this.updateCache('books', uiBooks);
      
      // End timing before returning
      endTiming();
      return uiBooks;
    } catch (error) {
      console.error('Error getting books from IndexedDB:', error);
      endTiming(); // Still end timing on error
      return [];
    }
  }

  /**
   * Get a book by its ID
   */
  public async getBookById(id: string): Promise<UIBook | undefined> {
    await this.ensureInitialized();

    // Try to find in cache first
    if (this.isCacheValid('books') && this.cache.books.data) {
      const cachedBook = this.cache.books.data.find(book => book.id === id);
      if (cachedBook) return cachedBook;
    }

    try {
      // IndexedDB is the primary source of truth
      const dbBook = await this.db.getBookById(id);
      
      // Convert from DB format to UI format
      if (dbBook) {
        return convertDbBookToUiBook(dbBook as unknown as DBBook);
      }
      
      return undefined;
    } catch (error) {
      console.error(`Error getting book ${id}:`, error);
      return undefined;
    }
  }
  
  /**
   * Get a series by its ID
   */
  public async getSeriesById(id: string): Promise<UISeries | null> {
    await this.ensureInitialized();
    
    try {
      // IndexedDB is the exclusive source of truth
      const dbSeries = await this.db.getSeriesById(id);
      
      // Convert from DB format to UI format
      if (dbSeries) {
        return convertDbSeriesToUiSeries(dbSeries as unknown as DBSeries);
      }
      
      return null;
    } catch (error) {
      console.error(`Error getting series ${id}:`, error);
      return null;
    }
  }
  
  /**
   * Get books that belong to a specific series
   */
  public async getBooksBySeries(seriesId: string): Promise<UIBook[]> {
    await this.ensureInitialized();
    
    try {
      // First get all books - this already uses the adapter to return UIBook[]
      const allBooks = await this.getBooks();
      
      // Filter books by series ID
      return allBooks.filter(book => book.seriesId === seriesId);
    } catch (error) {
      console.error(`Error getting books for series ${seriesId}:`, error);
      return [];
    }
  }
  
  /**
   * Get all series data with UI optimized format
   * 
   * Performance features:
   * - Memory caching with TTL
   * - Performance monitoring
   * - Optimized type conversions
   */
  public async getSeries(): Promise<UISeries[]> {
    await this.ensureInitialized();
    
    // Use cache if available
    if (this.isCacheValid('series')) {
      return this.cache.series.data || [];
    }
    
    // Start performance monitoring
    const endTiming = PerformanceMonitoring.startTiming('getSeries');
    
    try {
      // Get database instance
      const db = await this.db.initDb();
      
      // Use proper indices for faster retrieval
      const dbSeries = await db.getAll(StoreNames.SERIES);
      
      if (dbSeries.length === 0) {
        endTiming();
        return [];
      }
      
      // Convert IndexedDB series to UI series using adapter with chunking for large datasets
      const chunkSize = 20; // Series are typically complex objects, use smaller chunk size
      let uiSeries: UISeries[] = [];
      
      for (let i = 0; i < dbSeries.length; i += chunkSize) {
        const chunk = dbSeries.slice(i, i + chunkSize);
        // Convert chunk and add to results
        const convertedChunk = (chunk as unknown as DBSeries[]).map(convertDbSeriesToUiSeries);
        uiSeries = [...uiSeries, ...convertedChunk];
      }
      
      // Update cache only - no more localStorage usage
      this.updateCache('series', uiSeries);
      
      endTiming();
      return uiSeries;
    } catch (error) {
      console.error('Error getting series from IndexedDB:', error);
      endTiming();
      return [];
    }
  }

  /**
   * Save a book to storage with performance optimizations
   * 
   * Performance features:
   * - Selective cache invalidation
   * - Performance monitoring
   * - Type-safe conversions
   */
  public async saveBook(book: UIBook): Promise<string> {
    await this.ensureInitialized();
    
    // Start performance monitoring
    const endTiming = PerformanceMonitoring.startTiming('saveBook');
    
    try {
      // Get database instance
      const db = await this.db.initDb();
      
      // Convert UI Book to DB Book format using adapter
      const dbBook = convertUiBookToDbBook(book);
      
      // Use selective cache invalidation to determine what to update
      const cacheKeysToInvalidate = CacheManagement.determineCacheInvalidation(
        'book', 
        book.id, 
        { seriesId: book.seriesId }
      );
      
      // IndexedDB is the exclusive source of truth for book data
      await db.put(StoreNames.BOOKS, dbBook as any); // Type assertion needed for compatibility with IndexedDBService
      
      // Update cache selectively instead of invalidating it completely
      if (this.cache.books.data) {
        // Update the book in cache instead of invalidating the entire cache
        const updatedBooks = CacheManagement.updateEntityInCache(
          this.cache.books.data,
          book
        );
        this.updateCache('books', updatedBooks);
      } else {
        // If no cache exists, just invalidate it
        this.invalidateCache('books');
      }
      
      // If this book is part of a series, update series data as needed
      if (book.seriesId) {
        try {
          // Update the cache if it exists
          if (this.isCacheValid('series') && this.cache.series.data) {
            // Find the series and update its metadata if needed
            const series = this.cache.series.data.find(s => s.id === book.seriesId);
            if (series) {
              // Update lastModified timestamp on series
              const updatedSeries = {
                ...series,
                lastModified: new Date().toISOString() // Use lastModified for consistency
              };
              
              const updatedSeriesList = this.cache.series.data.map(s => 
                s.id === book.seriesId ? updatedSeries : s
              );
              this.updateCache('series', updatedSeriesList);
              
              // Update the series in IndexedDB
              const dbSeries = convertUiSeriesToDbSeries(updatedSeries);
              await db.put(StoreNames.SERIES, dbSeries);
            }
          } else {
            // Cache is not valid, but we don't need to do anything here
            // Just invalidate the cache without trying to update the series
            this.invalidateCache('series');
          }
        } catch (seriesError) {
          // Log the series update error but don't fail the book save operation
          console.warn(`Warning: Could not update series ${book.seriesId} for book ${book.id}:`, seriesError);
          // Continue with book save operation
        }
      }
      
      endTiming();
      return book.id;
    } catch (error) {
      console.error('Error saving book:', error);
      this.showUserNotification('Failed to save book. Please try again.');
      endTiming();
      throw error;
    }
  }
  
  /**
   * Delete a book from storage
   */
  public async deleteBook(bookId: string): Promise<void> {
    await this.ensureInitialized();
    
    try {
      // Get the book first to check if it's part of a series
      const book = await this.getBookById(bookId);
      
      // Use IndexedDB transaction for deletion
      const db = await this.db.initDb();
      const tx = db.transaction([StoreNames.BOOKS], 'readwrite');
      const bookStore = tx.objectStore(StoreNames.BOOKS);
      
      // Delete the book
      await bookStore.delete(bookId);
      
      // Complete transaction
      await tx.done;
      
      // Invalidate the books cache
      this.invalidateCache('books');
      
      // If this book was part of a series, invalidate the series cache too
      if (book && book.seriesId) {
        this.invalidateCache('series');
      }
    } catch (error) {
      console.error(`Error deleting book ${bookId}:`, error);
      this.showUserNotification('Failed to delete book. Please try again.');
      throw error;
    }
  }
  
  /**
   * Delete a series and update any associated books
   */
  public async deleteSeries(seriesId: string): Promise<void> {
    await this.ensureInitialized();

    try {
      // No longer using localStorage, IndexedDB is the exclusive source of truth
      
      // Start an IndexedDB transaction to update books and delete the series atomically
      const db = await this.db.initDb();
      const tx = db.transaction([StoreNames.BOOKS, StoreNames.SERIES], 'readwrite');
      const booksStore = tx.objectStore(StoreNames.BOOKS);
      const seriesStore = tx.objectStore(StoreNames.SERIES);
      
      // First get the books in this series using the seriesId index
      const seriesIdIndex = booksStore.index('seriesId');
      const booksInSeries = await seriesIdIndex.getAll(seriesId);
      
      // Update books to remove series association
      for (const book of booksInSeries) {
        book.seriesId = undefined;
        book.isPartOfSeries = false;
        book.seriesPosition = undefined;
        book.lastModified = new Date().toISOString();
        await booksStore.put(book);
      }
      
      // Delete the series
      await seriesStore.delete(seriesId);
      
      // Complete the transaction
      await tx.done;
      
      // Invalidate both series and books caches
      this.invalidateCache('series');
      this.invalidateCache('books'); // Books were modified too
      
      // Show success notification
      this.showUserNotification(`Series deleted successfully`, 'info');
    } catch (error) {
      console.error(`Failed to delete series ${seriesId}:`, error);
      this.showUserNotification('Failed to delete series. Please try again.');
      throw error;
    }
  }
  
  /**
   * Add a book to a series with optimized updating
   * 
   * Performance features:
   * - Transaction batching for related operations
   * - Performance monitoring
   * - Type-safe conversions
   */
  public async addBookToSeries(bookId: string, seriesId: string, position?: number): Promise<void> {
    await this.ensureInitialized();
    
    // Start performance monitoring
    const endTiming = PerformanceMonitoring.startTiming('addBookToSeries');
    
    try {
      // Get the book and series
      const book = await this.getBookById(bookId);
      const series = await this.getSeriesById(seriesId);
      
      if (!book || !series) {
        endTiming();
        throw new Error(`Book ${bookId} or series ${seriesId} not found`);
      }
      
      // Update book with series info
      const updatedBook: UIBook = {
        ...book,
        isPartOfSeries: true,
        seriesId,
        seriesPosition: position || series.books.length + 1
      };
      
      // Check if we need to add book to the series's books array
      const updatedSeries: UISeries = {...series};
      if (!series.books.includes(bookId)) {
        updatedSeries.books = [...series.books, bookId];
      }

      // IndexedDB is now the exclusive source of truth - no localStorage updates needed

      if (updatedSeries.books.length !== series.books.length) {
        // If the series was modified, update both in a transaction for atomicity
        const db = await this.db.initDb();
        const tx = db.transaction([StoreNames.BOOKS, StoreNames.SERIES], 'readwrite');
        
        // Update the book
        await tx.objectStore(StoreNames.BOOKS).put(convertUiBookToDbBook(updatedBook) as any);
        
        // Update the series
        await tx.objectStore(StoreNames.SERIES).put(convertUiSeriesToDbSeries(updatedSeries) as any);
        
        await tx.done;
      } else {
        // Just update the book if series books array didn't change
        await this.saveBook(updatedBook);
      }
      
      // Selectively update caches instead of invalidating them completely
      if (this.cache.books.data) {
        const updatedBooks = CacheManagement.updateEntityInCache(
          this.cache.books.data,
          updatedBook
        );
        this.updateCache('books', updatedBooks);
      } else {
        this.invalidateCache('books');
      }
      
      if (this.cache.series.data) {
        const updatedSeriesList = CacheManagement.updateEntityInCache(
          this.cache.series.data,
          updatedSeries
        );
        this.updateCache('series', updatedSeriesList);
      } else {
        this.invalidateCache('series');
      }
      
      endTiming();
    } catch (error) {
      console.error(`Error adding book ${bookId} to series ${seriesId}:`, error);
      this.showUserNotification('Failed to add book to series. Please try again.');
      endTiming();
      throw error;
    }
  }
  
  /**
   * Remove a book from a series with performance optimizations
   * 
   * Performance features:
   * - Transaction batching for related operations
   * - Performance monitoring
   * - Type-safe conversions
   */
  public async removeBookFromSeries(bookId: string, seriesId: string): Promise<void> {
    await this.ensureInitialized();
    
    // Start performance monitoring
    const endTiming = PerformanceMonitoring.startTiming('removeBookFromSeries');
    
    try {
      // Get the book and series
      const book = await this.getBookById(bookId);
      const series = await this.getSeriesById(seriesId);
      
      if (!book || !series) {
        endTiming();
        throw new Error(`Book ${bookId} or series ${seriesId} not found`);
      }
      
      // Update book to remove series info
      const updatedBook: UIBook = {
        ...book,
        isPartOfSeries: false,
        seriesId: undefined,
        seriesPosition: undefined
      };
      
      // Update series to remove book reference
      if (series.books.includes(bookId)) {
        const updatedSeries: UISeries = {
          ...series,
          books: series.books.filter(id => id !== bookId),
          updatedAt: new Date()
        };
        
        // IndexedDB is now the exclusive source of truth - no localStorage updates needed
        
        // Start transaction to update both entities in IndexedDB
        const db = await this.db.initDb();
        const tx = db.transaction([StoreNames.BOOKS, StoreNames.SERIES], 'readwrite');
        
        await tx.objectStore(StoreNames.BOOKS).put(convertUiBookToDbBook(updatedBook) as any);
        await tx.objectStore(StoreNames.SERIES).put(convertUiSeriesToDbSeries(updatedSeries) as any);
        
        await tx.done;
        
        // Selectively update caches
        if (this.cache.books.data) {
          const updatedBooks = CacheManagement.updateEntityInCache(
            this.cache.books.data,
            updatedBook
          );
          this.updateCache('books', updatedBooks);
        } else {
          this.invalidateCache('books');
        }
        
        if (this.cache.series.data) {
          const updatedSeriesList = CacheManagement.updateEntityInCache(
            this.cache.series.data,
            updatedSeries
          );
          this.updateCache('series', updatedSeriesList);
        } else {
          this.invalidateCache('series');
        }
      } else {
        // Just update the book if not in series
        await this.saveBook(updatedBook);
      }
      
      endTiming();
    } catch (error) {
      console.error(`Error removing book ${bookId} from series ${seriesId}:`, error);
      this.showUserNotification('Failed to remove book from series. Please try again.');
      endTiming();
      throw error;
    }
  }
  
  /**
   * Calculate and update series reading progress with performance optimizations
   * 
   * Performance features:
   * - Smart query optimization
   * - Performance monitoring
   * - Support for hybrid storage model
   */
  public async updateSeriesProgress(seriesId: string): Promise<number> {
    await this.ensureInitialized();
    
    // Start performance monitoring
    const endTiming = PerformanceMonitoring.startTiming('updateSeriesProgress');
    
    try {
      const series = await this.getSeriesById(seriesId);
      if (!series) {
        endTiming();
        throw new Error(`Series ${seriesId} not found`);
      }
      
      // Get all books in the series - already uses optimized query via getBooksBySeries
      const books = await this.getBooksBySeries(seriesId);
      
      // Count completed books
      const completedBooks = books.filter(book => 
        book.status === 'completed' || (book as any).progress === 1
      ).length;
      
      // Calculate progress
      const totalBooks = books.length;
      const progress = totalBooks > 0 ? completedBooks / totalBooks : 0;
      
      // Update series - be careful with type properties
      // First make a copy and then add the properties we need
      const updatedSeries = {
        ...series,
        // These properties might not be in the UISeries type but are needed for display
        // Using a type assertion to avoid TypeScript errors
        updatedAt: new Date()
      } as UISeries;
      
      // Add these properties to the series object but respect the original type
      (updatedSeries as any).completedBooks = completedBooks;
      (updatedSeries as any).totalBooks = totalBooks;
      (updatedSeries as any).readingProgress = progress;
      
      // IndexedDB is now the exclusive source of truth - no localStorage updates needed
      
      // Save series with updated progress
      await this.saveSeries(updatedSeries);
      
      // Update cache selectively
      if (this.cache.series.data) {
        const updatedSeriesList = CacheManagement.updateEntityInCache(
          this.cache.series.data,
          updatedSeries
        );
        this.updateCache('series', updatedSeriesList);
      }
      
      endTiming();
      return progress;
    } catch (error) {
      console.error(`Error updating series progress for ${seriesId}:`, error);
      this.showUserNotification('Failed to update series progress. Please try again.');
      endTiming();
      return 0;
    }
  }

  /**
   * Get user settings from IndexedDB
   */
  public async getSettings(): Promise<UserSettings | null> {
    await this.ensureInitialized();
    
    // Try cache first
    if (this.isCacheValid('settings')) {
      return this.cache.settings.data;
    }
    
    try {
      const db = await this.db.initDb();
      const settings = await db.get(StoreNames.SETTINGS, 'userSettings');
      
      // Update cache if we got settings
      if (settings) {
        this.updateCache('settings', settings);
      }
      
      return settings || { id: 'userSettings' };
    } catch (error) {
      console.error('Error getting settings:', error);
      // Silent fallback - return empty settings object
      return { id: 'userSettings' };
    }
  }
  
  /**
   * Save user settings to IndexedDB
   */
  public async saveSettings(settings: UserSettings): Promise<void> {
    await this.ensureInitialized();
    
    // Ensure settings has an ID
    const settingsToSave = {
      ...settings,
      id: 'userSettings',
      lastModified: new Date().toISOString()
    };
    
    try {
      const db = await this.db.initDb();
      await db.put(StoreNames.SETTINGS, settingsToSave);
      
      // Update cache
      this.updateCache('settings', settingsToSave);
    } catch (error) {
      console.error('Error saving settings:', error);
      this.showUserNotification('Failed to save settings. Some preferences may not persist.');
    }
  }

  /**
   * Save a series to storage
   */
  public async saveSeries(series: UISeries): Promise<string> {
    await this.ensureInitialized();
    
    try {
      // Convert UI Series to DB Series format using adapter
      const dbSeries = convertUiSeriesToDbSeries(series);
      
      // IndexedDB is the exclusive source of truth
      const id = await this.db.saveSeries(dbSeries as any); // Type assertion needed for compatibility
      
      // Invalidate the series cache
      this.invalidateCache('series');
      
      return id;
    } catch (error) {
      console.error('Error saving series:', error);
      this.showUserNotification('Failed to save series. Please try again.');
      throw error;
    }
  }

  /**
   * Get all collections from storage with caching and performance optimizations
   */
  public async getCollections(): Promise<UICollection[]> {
    await this.ensureInitialized();
    
    // Try cache first for immediate response
    if (this.isCacheValid('collections')) {
      return this.cache.collections.data as UICollection[];
    }
    
    // Start performance monitoring
    const endTiming = PerformanceMonitoring.startTiming('getCollections');
    
    try {
      // Ensure collections store exists
      await this.db.ensureCollectionsStore();
      
      // Get database instance
      const db = await this.db.initDb();
      
      // Get all collections from IndexedDB
      const collections = await db.getAll(StoreNames.COLLECTIONS);
      
      // Convert dates from strings to Date objects for UI
      const uiCollections = collections.map(collection => ({
        ...collection,
        createdAt: new Date(collection.dateAdded || new Date().toISOString()),
        updatedAt: new Date(collection.lastModified || new Date().toISOString())
      })) as UICollection[];
      
      // Update the cache
      this.updateCache('collections', uiCollections);
      
      // End timing before returning
      endTiming();
      return uiCollections;
    } catch (error) {
      console.error('Error getting collections from IndexedDB:', error);
      endTiming(); // Still end timing on error
      return [];
    }
  }
  
  /**
   * Get a collection by its ID
   */
  public async getCollectionById(id: string): Promise<UICollection | null> {
    await this.ensureInitialized();
    
    // Try to find in cache first
    if (this.isCacheValid('collections') && this.cache.collections.data) {
      const cachedCollection = this.cache.collections.data.find(collection => collection.id === id);
      if (cachedCollection) return cachedCollection;
    }
    
    try {
      // Ensure collections store exists
      await this.db.ensureCollectionsStore();
      
      // Get from IndexedDB
      const db = await this.db.initDb();
      const collection = await db.get(StoreNames.COLLECTIONS, id);
      
      if (collection) {
        // Convert dates for UI
        const uiCollection = {
          ...collection,
          createdAt: new Date(collection.dateAdded || new Date().toISOString()),
          updatedAt: new Date(collection.lastModified || new Date().toISOString())
        } as UICollection;
        
        return uiCollection;
      }
      
      return null;
    } catch (error) {
      console.error(`Error getting collection ${id}:`, error);
      return null;
    }
  }
  
  /**
   * Save a collection to storage
   */
  public async saveCollection(collection: UICollection): Promise<string> {
    await this.ensureInitialized();
    
    try {
      // Ensure collections store exists
      await this.db.ensureCollectionsStore();
      
      // Prepare collection for IndexedDB storage
      const dbCollection = {
        ...collection,
        dateAdded: collection.createdAt.toISOString(),
        lastModified: collection.updatedAt.toISOString()
      };
      
      // Save to IndexedDB
      const db = await this.db.initDb();
      await db.put(StoreNames.COLLECTIONS, dbCollection);
      
      // Invalidate the collections cache
      this.invalidateCache('collections');
      
      return collection.id;
    } catch (error) {
      console.error('Error saving collection:', error);
      this.showUserNotification('Failed to save collection. Please try again.');
      throw error;
    }
  }
  
  /**
   * Delete a collection from storage
   */
  public async deleteCollection(id: string): Promise<void> {
    await this.ensureInitialized();
    
    try {
      // Ensure collections store exists
      await this.db.ensureCollectionsStore();
      
      // Get the collection first to check if it exists
      const collection = await this.getCollectionById(id);
      if (!collection) {
        throw new Error(`Collection ${id} not found`);
      }
      
      // Start a transaction to delete the collection and update books
      const db = await this.db.initDb();
      const tx = db.transaction([StoreNames.COLLECTIONS, StoreNames.BOOKS], 'readwrite');
      
      // Delete the collection
      await tx.objectStore(StoreNames.COLLECTIONS).delete(id);
      
      // Update books that reference this collection
      const books = await this.getBooks();
      for (const book of books) {
        if (book.collectionIds && book.collectionIds.includes(id)) {
          // Remove this collection from the book's collections
          book.collectionIds = book.collectionIds.filter(collId => collId !== id);
          
          // Convert to DB format and save
          const dbBook = convertUiBookToDbBook(book);
          await tx.objectStore(StoreNames.BOOKS).put(dbBook);
        }
      }
      
      // Complete the transaction
      await tx.done;
      
      // Invalidate caches
      this.invalidateCache('collections');
      this.invalidateCache('books');
      
    } catch (error) {
      console.error(`Error deleting collection ${id}:`, error);
      this.showUserNotification('Failed to delete collection. Please try again.');
      throw error;
    }
  }

  /**
   * Get all upcoming releases for a specific series
   */
  public async getUpcomingReleasesBySeriesId(seriesId: string): Promise<UpcomingBook[]> {
    await this.ensureInitialized();
    
    try {
      // Get the database instance
      const db = await this.db.initDb();
      
      // Get all upcoming books from IndexedDB
      const allUpcomingBooks = await db.getAll(StoreNames.UPCOMING_BOOKS);
      
      // Filter for the specific series
      const seriesUpcomingBooks = allUpcomingBooks.filter(
        (book: UpcomingBook) => book.seriesId === seriesId
      );
      
      // Convert dates from string to Date objects if needed for UI
      return seriesUpcomingBooks.map(book => ({
        ...book,
        expectedReleaseDate: book.expectedReleaseDate ? new Date(book.expectedReleaseDate) : undefined
      })) as any as UpcomingBook[];
    } catch (error) {
      console.error(`Error getting upcoming releases for series ${seriesId}:`, error);
      return [];
    }
  }
  
  /**
   * Save an upcoming book release
   */
  public async saveUpcomingRelease(upcomingBook: any): Promise<string> {
    await this.ensureInitialized();
    
    try {
      // Get the database instance
      const db = await this.db.initDb();
      
      // Convert Date objects to ISO strings for storage
      const expectedReleaseDateString = upcomingBook.expectedReleaseDate instanceof Date 
        ? upcomingBook.expectedReleaseDate.toISOString() 
        : upcomingBook.expectedReleaseDate;
      
      // Ensure the book has required fields
      const bookToSave = {
        ...upcomingBook,
        id: upcomingBook.id || `upcoming-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        expectedReleaseDate: expectedReleaseDateString,
        dateAdded: upcomingBook.dateAdded || new Date().toISOString(),
        lastModified: new Date().toISOString(),
        // Add required fields for IndexedDB UpcomingBook if they don't exist
        releaseDateConfidence: upcomingBook.releaseDateConfidence || 'medium',
        preOrderAvailable: upcomingBook.preOrderAvailable || false,
        notifyOnRelease: upcomingBook.notifyOnRelease || false,
        reminderDaysBeforeRelease: upcomingBook.reminderDaysBeforeRelease || 7,
        formatType: upcomingBook.formatType || 'hardcover',
        price: upcomingBook.price || 0
      };
      
      // Save to IndexedDB
      await db.put(StoreNames.UPCOMING_BOOKS, bookToSave);
      
      // Invalidate cache
      this.invalidateCache('upcomingReleases');
      
      return bookToSave.id;
    } catch (error) {
      console.error('Error saving upcoming book release:', error);
      this.showUserNotification('Failed to save upcoming book. Please try again.');
      throw error;
    }
  }
  
  /**
   * Delete an upcoming book release
   */
  public async deleteUpcomingRelease(bookId: string): Promise<void> {
    await this.ensureInitialized();
    
    try {
      // Get the database instance
      const db = await this.db.initDb();
      
      // Delete from IndexedDB
      await db.delete(StoreNames.UPCOMING_BOOKS, bookId);
      
      // Invalidate cache
      this.invalidateCache('upcomingReleases');
      
      console.log(`Upcoming book ${bookId} deleted successfully`);
    } catch (error) {
      console.error(`Error deleting upcoming book ${bookId}:`, error);
      this.showUserNotification('Failed to delete upcoming book. Please try again.');
      throw error;
    }
  }
  
  /**
   * Close the database connection
   */
  async closeConnection(): Promise<void> {
    if (this.db) {
      await this.db.closeConnection();
      this.db = null;
    }
  }
}

// Export a singleton instance
export const enhancedStorageService = EnhancedStorageService.getInstance();
