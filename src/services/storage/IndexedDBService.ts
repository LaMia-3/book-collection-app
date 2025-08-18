/**
 * Enhanced IndexedDB service with improved schema and indices
 */
import { openDB, IDBPDatabase, StoreNames as IDBStoreNames } from 'idb';
import { Book, BookSummary } from '@/types/indexeddb/Book';
import { Series, SeriesMetadata } from '@/types/indexeddb/Series';
import { UpcomingBook } from '@/types/indexeddb/UpcomingBook';
import { Notification } from '@/types/indexeddb/Notification';
import { StoreNames, DB_CONFIG } from '@/types/indexeddb';
import { createLogger } from '@/utils/loggingUtils';

// Create a logger for database operations
const log = createLogger('IndexedDB');

// Import error handling utilities
import { 
  withRetry, 
  DatabaseConnectionError,
  EntityNotFoundError,
  TransactionError,
  StorageQuotaError,
  classifyIndexedDBError,
  RecoveryStrategies,
  ErrorTelemetry 
} from './IndexedDBErrorHandling';

/**
 * Service for enhanced IndexedDB operations with proper schema design and indices
 */
export class IndexedDBService {
  private db: IDBPDatabase | null = null;
  private isInitializing = false;
  private initPromise: Promise<IDBPDatabase> | null = null;
  private toastService: any = null;

  constructor() {
    // Note: We no longer try to use React hooks directly in services
    // Toast notifications are now handled through the custom event system
    this.toastService = null;
  }

  /**
   * Initialize the database connection with enhanced schema, indices, and error handling
   * 
   * Features:
   * - Connection retry with exponential backoff
   * - Error classification and recovery
   * - Telemetry for tracking connection issues
   */
  async initDb(): Promise<IDBPDatabase> {
    log.debug('Initializing IndexedDB connection');
    // Return existing DB if already initialized
    if (this.db) return this.db;
    
    // Prevent multiple concurrent initializations
    if (this.isInitializing) {
      if (this.initPromise) return this.initPromise;
      throw new DatabaseConnectionError('Database initialization in progress, but no promise available');
    }
    
    this.isInitializing = true;
    
    try {
      // Use retry mechanism for database initialization
      this.initPromise = withRetry(
        async () => {
          const db = await openDB(DB_CONFIG.NAME, DB_CONFIG.VERSION, {
            upgrade: (db, oldVersion, newVersion) => {
              log.info(`Upgrading database`, { fromVersion: oldVersion, toVersion: newVersion });
              try {
                this.applyMigrations(db, oldVersion, newVersion || DB_CONFIG.VERSION);
              } catch (upgradeError) {
                log.error('Database upgrade failed', { error: String(upgradeError) });
                // Log error for telemetry but don't throw (would block upgrade)
                ErrorTelemetry.logError(
                  classifyIndexedDBError(upgradeError),
                  false,
                  { oldVersion, newVersion, operation: 'upgrade' }
                );
              }
            },
            blocking: () => {
              // Handle blocking connections (e.g., older versions of the database open in other tabs)
              log.warn('Database blocking detected - newer version requested. Closing connection.');
              if (this.db) {
                this.db.close();
                this.db = null;
              }
            },
            terminated: () => {
              // Handle abnormal connection termination
              log.warn('Database connection was abnormally terminated');
              this.db = null;
              // Invalidate the promise so next attempt creates a fresh connection
              this.initPromise = null;
              this.isInitializing = false;
            }
          });
          
          return db;
        },
        { 
          maxRetries: 3,
          initialDelay: 200,
          retryableErrors: ['DatabaseConnectionError', 'TransactionError', 'IndexedDBError']
        }
      );
      
      this.db = await this.initPromise;
      this.isInitializing = false;
      return this.db;
    } catch (error) {
      this.isInitializing = false;
      
      // Classify and log the error
      const classifiedError = classifyIndexedDBError(error);
      ErrorTelemetry.logError(classifiedError, false, { operation: 'initDb' });
      
      log.error('Failed to initialize IndexedDB', { error: String(classifiedError) });
      this.showUserNotification('Database initialization failed. Some features may not work correctly.');
      
      // Rethrow the classified error
      throw classifiedError;
    }
  }

  /**
   * Apply database migrations based on version changes
   */
  private applyMigrations(db: IDBPDatabase, oldVersion: number, newVersion: number): void {
    // Migrations are cumulative, so each case falls through to the next one
    switch (oldVersion) {
      case 0:
        // Initial database creation
        this.createInitialSchema(db);
        break;
    }
  }

  /**
   * Create the initial database schema with optimized indices
   */
  private createInitialSchema(db: IDBPDatabase): void {
    // Books store with indices
    if (!db.objectStoreNames.contains(StoreNames.BOOKS)) {
      const bookStore = db.createObjectStore(StoreNames.BOOKS, { keyPath: 'id' });
      bookStore.createIndex('title', 'title', { unique: false });
      bookStore.createIndex('author', 'author', { unique: false });
      bookStore.createIndex('status', 'status', { unique: false });
      bookStore.createIndex('seriesId', 'seriesId', { unique: false });
      bookStore.createIndex('dateAdded', 'dateAdded', { unique: false });
      bookStore.createIndex('tags', 'tags', { unique: false, multiEntry: true });
      bookStore.createIndex('seriesId_seriesPosition', ['seriesId', 'seriesPosition'], { unique: false });
      bookStore.createIndex('lastModified', 'lastModified', { unique: false });
    }

    // Series store with indices
    if (!db.objectStoreNames.contains(StoreNames.SERIES)) {
      const seriesStore = db.createObjectStore(StoreNames.SERIES, { keyPath: 'id' });
      seriesStore.createIndex('name', 'name', { unique: false });
      seriesStore.createIndex('author', 'author', { unique: false });
      seriesStore.createIndex('isTracked', 'isTracked', { unique: false });
      seriesStore.createIndex('readingProgress', 'readingProgress', { unique: false });
      seriesStore.createIndex('lastModified', 'lastModified', { unique: false });
    }

    // UpcomingBooks store with indices
    if (!db.objectStoreNames.contains(StoreNames.UPCOMING_BOOKS)) {
      const upcomingBooksStore = db.createObjectStore(StoreNames.UPCOMING_BOOKS, { keyPath: 'id' });
      upcomingBooksStore.createIndex('seriesId', 'seriesId', { unique: false });
      upcomingBooksStore.createIndex('expectedReleaseDate', 'expectedReleaseDate', { unique: false });
      upcomingBooksStore.createIndex('notifyOnRelease', 'notifyOnRelease', { unique: false });
      upcomingBooksStore.createIndex('author', 'author', { unique: false });
    }

    // Notifications store with indices
    if (!db.objectStoreNames.contains(StoreNames.NOTIFICATIONS)) {
      const notificationsStore = db.createObjectStore(StoreNames.NOTIFICATIONS, { keyPath: 'id' });
      notificationsStore.createIndex('status', 'status', { unique: false });
      notificationsStore.createIndex('createdAt', 'createdAt', { unique: false });
      notificationsStore.createIndex('priority', 'priority', { unique: false });
      notificationsStore.createIndex('type', 'type', { unique: false });
      notificationsStore.createIndex('relatedItemId', 'relatedItemId', { unique: false });
      notificationsStore.createIndex('expiresAt', 'expiresAt', { unique: false });
    }

    // Settings store (minimal, as most UI settings will remain in localStorage)
    if (!db.objectStoreNames.contains(StoreNames.SETTINGS)) {
      db.createObjectStore(StoreNames.SETTINGS, { keyPath: 'id' });
    }
  }

  /**
   * Show user notification for database errors
   * Uses custom event system to dispatch notifications that can be picked up by React components
   * 
   * @param message The error message to display
   * @param type The type of notification (error or info)
   */
  private showUserNotification(message: string, type: 'error' | 'info' = 'error'): void {
    // Log using our logging utility
    type === 'error' 
      ? log.error(`User notification`, { message }) 
      : log.info(`User notification`, { message });
    
    // Dispatch a custom event that React components can listen for
    try {
      const event = new CustomEvent('book-collection:notification', {
        detail: {
          title: type === 'error' ? 'Database Error' : 'Database Information',
          description: message,
          variant: type === 'error' ? 'destructive' : 'default',
          timestamp: new Date().toISOString(),
          source: 'IndexedDB'
        }
      });
      document.dispatchEvent(event);
    } catch (e) {
      log.error('Failed to dispatch notification event', { error: String(e) });
      // If we can't dispatch the event, at least we've logged to console
    }
  }

  /**
   * Get all books from the database
   */
  async getBooks(): Promise<Book[]> {
    log.debug('Getting all books from IndexedDB');
    try {
      const db = await this.initDb();
      return db.getAll(StoreNames.BOOKS);
    } catch (error) {
      log.error('Failed to get books from IndexedDB', { error: String(error) });
      return [];
    }
  }

  /**
   * Get a book by its ID
   */
  async getBookById(id: string): Promise<Book | undefined> {
    log.debug('Getting book by ID', { bookId: id });
    try {
      const db = await this.initDb();
      return db.get(StoreNames.BOOKS, id);
    } catch (error) {
      log.error(`Failed to get book from IndexedDB`, { bookId: id, error: String(error) });
      return undefined;
    }
  }

  /**
   * Save a book (create or update)
   */
  async saveBook(book: Book): Promise<string> {
    log.debug('Saving book to IndexedDB', { bookId: book.id, title: book.title });
    try {
      // Set last modified timestamp
      const bookToSave: Book = {
        ...book,
        lastModified: new Date().toISOString(),
        syncStatus: 'synced'
      };
      
      const db = await this.initDb();
      await db.put(StoreNames.BOOKS, bookToSave);
      log.info('Book saved successfully', { bookId: book.id });
      return book.id;
    } catch (error) {
      log.error(`Failed to save book to IndexedDB`, { bookId: book.id, error: String(error) });
      this.showUserNotification('Failed to save book. Please try again.');
      throw error;
    }
  }

  /**
   * Get all series from the database
   */
  async getSeries(): Promise<Series[]> {
    log.debug('Getting all series from IndexedDB');
    try {
      const db = await this.initDb();
      return db.getAll(StoreNames.SERIES);
    } catch (error) {
      log.error('Failed to get series from IndexedDB', { error: String(error) });
      // No longer fallback to localStorage
      return [];
    }
  }

  /**
   * Get a series by its ID with enhanced error handling
   * 
   * Uses IndexedDB as the sole source of truth for series data.
   */
  async getSeriesById(id: string): Promise<Series | undefined> {
    log.debug('Getting series by ID', { seriesId: id });
    try {
      return await withRetry(
        async () => {
          const db = await this.initDb();
          const series = await db.get(StoreNames.SERIES, id);
          
          if (!series) {
            // Log the not found case but don't throw an error
            log.info(`Series not found in IndexedDB`, { seriesId: id });
            return undefined;
          }
          
          return series;
        },
        { maxRetries: 2, initialDelay: 100 }
      );
    } catch (error) {
      // Classify and log the error
      const classifiedError = classifyIndexedDBError(error);
      ErrorTelemetry.logError(classifiedError, true, { operation: 'getSeriesById', seriesId: id });
      
      log.error(`Failed to get series from IndexedDB`, { seriesId: id, error: String(classifiedError) });
      return undefined;
    }
  }

  /**
   * Save a series (create or update) with enhanced error handling
   * 
   * This method ensures that series data is properly saved to IndexedDB
   * with retries and proper error classification.
   */
  async saveSeries(series: Series): Promise<string> {
    log.debug('Saving series to IndexedDB', { seriesId: series.id, name: series.name });
    // Set last modified timestamp
    const seriesToSave: Series = {
      ...series,
      lastModified: new Date().toISOString()
    };
    
    // Save to IndexedDB with retry logic
    try {
      await withRetry(
        async () => {
          const db = await this.initDb();
          await db.put(StoreNames.SERIES, seriesToSave);
          log.info('Series saved successfully', { seriesId: series.id });
        },
        { 
          maxRetries: 3,
          initialDelay: 100,
          retryableErrors: ['TransactionError', 'DatabaseConnectionError'] 
        }
      );
      
      return series.id;
    } catch (error) {
      // Classify and log the error
      const classifiedError = classifyIndexedDBError(error);
      ErrorTelemetry.logError(classifiedError, false, { operation: 'saveSeries', seriesId: series.id });
      
      log.error(`Failed to save series to IndexedDB`, { seriesId: series.id, error: String(classifiedError) });
      
      // Show notification with more specific error info
      let errorMessage = 'Failed to save series.';
      
      if (classifiedError instanceof DatabaseConnectionError) {
        errorMessage = 'Cannot connect to database. Unable to save series.';
      } else if (classifiedError instanceof TransactionError) {
        errorMessage = 'Database transaction failed. Please try again.';
      } else if (classifiedError instanceof StorageQuotaError) {
        errorMessage = 'Storage quota exceeded. Please free up space and try again.';
      }
      
      this.showUserNotification(errorMessage);
      throw classifiedError;
    }
  }

  /**
   * Delete a series and update any associated books
   * 
   * Uses IndexedDB as the sole source of truth for series data.
   */
  async deleteSeries(seriesId: string): Promise<void> {
    log.debug('Deleting series from IndexedDB', { seriesId });
    try {
      // Handle IndexedDB deletion with retry mechanism
      await withRetry(async () => {
        const db = await this.initDb();
        
        // Start a transaction that spans both series and books stores
        const tx = db.transaction([StoreNames.SERIES, StoreNames.BOOKS], 'readwrite');
        const seriesStore = tx.objectStore(StoreNames.SERIES);
        const bookStore = tx.objectStore(StoreNames.BOOKS);
        
        // Get books in this series using the seriesId index
        const seriesIdIndex = bookStore.index('seriesId');
        const booksInSeries = await seriesIdIndex.getAll(seriesId);
        
        // Update books to remove series references
        for (const book of booksInSeries) {
          book.seriesId = undefined;
          book.isPartOfSeries = false;
          book.seriesPosition = undefined;
          book.lastModified = new Date().toISOString();
          await bookStore.put(book);
        }
        
        // Delete the series
        await seriesStore.delete(seriesId);
        
        // Complete the transaction
        await tx.done;
        log.info('Series deleted successfully', { seriesId });
      }, { maxRetries: 2, initialDelay: 100 });
      
      // Notify success with custom event
      this.showUserNotification(`Series deleted successfully.`, 'info');
    } catch (error) {
      // Classify and log the error
      const classifiedError = classifyIndexedDBError(error);
      ErrorTelemetry.logError(classifiedError, false, { operation: 'deleteSeries', seriesId });
      
      log.error(`Failed to delete series`, { seriesId, error: String(classifiedError) });
      this.showUserNotification('Failed to delete series. Please try again.');
      throw classifiedError;
    }
  }

  // This method was removed as part of migration away from localStorage

  /**
   * Close the database connection
   */
  async closeConnection(): Promise<void> {
    log.debug('Closing IndexedDB connection');
    if (this.db) {
      this.db.close();
      this.db = null;
      log.info('IndexedDB connection closed');
    }
  }
}

// Export a singleton instance
export const indexedDBService = new IndexedDBService();
