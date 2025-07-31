/**
 * Enhanced StorageService - Central access point for data storage operations
 * This service now uses IndexedDB as the ONLY source of truth for all data
 *
 * (Previously used localStorage as primary source of truth, now fully migrated to IndexedDB)
 * 
 * Note: All localStorage usage has been removed - IndexedDB is the exclusive data store
 */
import { indexedDBService } from './IndexedDBService';
import { Book as IndexedDBBook, BookSummary, BookDetail } from '@/types/indexeddb/Book';
import { Series as IndexedDBSeries, SeriesMetadata, SeriesWithBooks } from '@/types/indexeddb/Series';
import { UpcomingBook, UpcomingBookSummary } from '@/types/indexeddb/UpcomingBook';
import { Notification, NotificationSummary } from '@/types/indexeddb/Notification';
import { StoreNames } from '@/types/indexeddb';
import { ReadingStatus } from '@/types/models/Book';
// Remove useToast import as it's a React hook and can't be used in service classes
import { Book as UIBook } from '@/types/book';
import { Series as UISeries } from '@/types/series';
import { convertDbBookToUiBook, convertUiBookToDbBook, DBBook } from '@/adapters/BookTypeAdapter';
import { convertDbSeriesToUiSeries, convertUiSeriesToDbSeries, DBSeries } from '@/adapters/SeriesTypeAdapter';

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
    upcomingReleases: { data: null, timestamp: 0, invalidated: true },
    notifications: { data: null, timestamp: 0, invalidated: true },
    settings: { data: null, timestamp: 0, invalidated: true }
  };
  
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
    if (this.isInitialized) {
      return Promise.resolve();
    }
    
    if (this.initPromise) {
      return this.initPromise;
    }
    
    this.initPromise = this.db.initDb()
      .then(() => {
        this.isInitialized = true;
        console.log('Enhanced storage system initialized successfully');
      })
      .catch((error) => {
        console.error('Failed to initialize enhanced storage system:', error);
        this.showUserNotification('Database initialization failed. Some features may not work correctly.');
        throw error;
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
   * Get all books from storage with caching
   */
  public async getBooks(): Promise<UIBook[]> {
    await this.ensureInitialized();
    
    // Try cache first
    if (this.isCacheValid('books')) {
      return this.cache.books.data as UIBook[];
    }
    
    try {
      // IndexedDB is the exclusive source of truth
      const dbBooks = await this.db.getBooks();
      
      // Convert IndexedDB books to UI books using adapter
      // Type assertion to DBBook[] since IndexedDBService returns Book[] from its own import
      const uiBooks = (dbBooks as unknown as DBBook[]).map(convertDbBookToUiBook);
      
      // Update the cache
      this.updateCache('books', uiBooks);
      
      return uiBooks;
    } catch (error) {
      console.error('Error getting books from IndexedDB:', error);
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
   * Get all series from storage with caching
   */
  public async getSeries(): Promise<UISeries[]> {
    await this.ensureInitialized();
    
    // Try cache first
    if (this.isCacheValid('series')) {
      return this.cache.series.data as UISeries[];
    }
    
    try {
      // IndexedDB is the exclusive source of truth
      const dbSeries = await this.db.getSeries();
      
      // Convert IndexedDB series to UI series using adapter
      const uiSeries = (dbSeries as unknown as DBSeries[]).map(convertDbSeriesToUiSeries);
      
      // Update the cache
      this.updateCache('series', uiSeries);
      
      return uiSeries;
    } catch (error) {
      console.error('Error getting series from IndexedDB:', error);
      return [];
    }
  }

  /**
   * Save a book to storage
   */
  public async saveBook(book: UIBook): Promise<string> {
    await this.ensureInitialized();
    
    try {
      // Convert UI Book to DB Book format using adapter
      const dbBook = convertUiBookToDbBook(book);
      
      // IndexedDB is the exclusive source of truth
      const id = await this.db.saveBook(dbBook as any); // Type assertion needed for compatibility with IndexedDBService
      
      // Invalidate the books cache
      this.invalidateCache('books');
      
      // If this book is part of a series, invalidate the series cache too
      if (book.seriesId) {
        this.invalidateCache('series');
      }
      
      return id;
    } catch (error) {
      console.error('Error saving book:', error);
      this.showUserNotification('Failed to save book. Please try again.');
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
      // Start an IndexedDB transaction to update books and delete the series atomically
      const db = await this.db.initDb();
      const tx = db.transaction([StoreNames.BOOKS, StoreNames.SERIES], 'readwrite');
      const booksStore = tx.objectStore(StoreNames.BOOKS);
      const seriesStore = tx.objectStore(StoreNames.SERIES);
      
      // Get the series to be deleted
      const seriesIndex = booksStore.index('seriesId');
      const booksInSeries = await seriesIndex.getAll(seriesId);
      
      // Remove series association from books
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
    } catch (error) {
      console.error(`Failed to delete series ${seriesId}:`, error);
      this.showUserNotification('Failed to delete series. Please try again.');
      throw error;
    }
  }
  
  /**
   * Add a book to a series
   */
  public async addBookToSeries(bookId: string, seriesId: string, position?: number): Promise<void> {
    await this.ensureInitialized();
    
    try {
      // Get the book and series
      const book = await this.getBookById(bookId);
      const series = await this.getSeriesById(seriesId);
      
      if (!book || !series) {
        throw new Error(`Book ${bookId} or series ${seriesId} not found`);
      }
      
      // Update book with series info
      const updatedBook: Book = {
        ...book,
        isPartOfSeries: true,
        seriesId: seriesId,
        seriesPosition: position,
        lastModified: new Date().toISOString()
      };
      
      // Update series with book reference if not already present
      if (!series.books.includes(bookId)) {
        const updatedSeries: Series = {
          ...series,
          books: [...series.books, bookId],
          totalBooks: series.totalBooks ? series.totalBooks + 1 : series.books.length + 1,
          lastModified: new Date().toISOString()
        };
        
        // Start transaction to update both entities
        const db = await this.db.initDb();
        const tx = db.transaction(['books', 'series'], 'readwrite');
        
        await tx.objectStore('books').put(updatedBook);
        await tx.objectStore('series').put(updatedSeries);
        
        await tx.done;
      } else {
        // Just update the book
        await this.saveBook(updatedBook);
      }
      
      // Invalidate caches
      this.invalidateCache('books');
      this.invalidateCache('series');
      
    } catch (error) {
      console.error(`Error adding book ${bookId} to series ${seriesId}:`, error);
      this.showUserNotification('Failed to add book to series. Please try again.');
      throw error;
    }
  }
  
  /**
   * Remove a book from a series
   */
  public async removeBookFromSeries(bookId: string, seriesId: string): Promise<void> {
    await this.ensureInitialized();
    
    try {
      // Get the book and series
      const book = await this.getBookById(bookId);
      const series = await this.getSeriesById(seriesId);
      
      if (!book || !series) {
        throw new Error(`Book ${bookId} or series ${seriesId} not found`);
      }
      
      // Update book to remove series info
      const updatedBook: Book = {
        ...book,
        isPartOfSeries: false,
        seriesId: undefined,
        seriesPosition: undefined,
        lastModified: new Date().toISOString()
      };
      
      // Update series to remove book reference
      const updatedSeries: Series = {
        ...series,
        books: series.books.filter(id => id !== bookId),
        totalBooks: series.totalBooks ? series.totalBooks - 1 : series.books.length - 1,
        lastModified: new Date().toISOString()
      };
      
      // Start transaction to update both entities
      const db = await this.db.initDb();
      const tx = db.transaction(['books', 'series'], 'readwrite');
      
      await tx.objectStore('books').put(updatedBook);
      await tx.objectStore('series').put(updatedSeries);
      
      await tx.done;
      
      // Invalidate caches
      this.invalidateCache('books');
      this.invalidateCache('series');
      
    } catch (error) {
      console.error(`Error removing book ${bookId} from series ${seriesId}:`, error);
      this.showUserNotification('Failed to remove book from series. Please try again.');
      throw error;
    }
  }
  
  /**
   * Calculate and update series reading progress
   */
  public async updateSeriesProgress(seriesId: string): Promise<number> {
    await this.ensureInitialized();
    
    try {
      const series = await this.getSeriesById(seriesId);
      if (!series) {
        throw new Error(`Series ${seriesId} not found`);
      }
      
      // Get all books in the series
      const books = await this.getBooksBySeries(seriesId);
      
      // Count completed books
      const completedBooks = books.filter(book => 
        book.status === 'completed' || book.progress === 1
      ).length;
      
      // Calculate progress
      const totalBooks = books.length;
      const progress = totalBooks > 0 ? completedBooks / totalBooks : 0;
      
      // Update series
      const updatedSeries: Series = {
        ...series,
        completedBooks,
        totalBooks,
        readingProgress: progress,
        lastModified: new Date().toISOString()
      };
      
      await this.saveSeries(updatedSeries);
      return progress;
      
    } catch (error) {
      console.error(`Error updating progress for series ${seriesId}:`, error);
      this.showUserNotification('Failed to update series progress. Please try again.');
      throw error;
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
