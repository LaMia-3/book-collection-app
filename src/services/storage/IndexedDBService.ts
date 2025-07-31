/**
 * Enhanced IndexedDB service with improved schema and indices
 */
import { openDB, IDBPDatabase, StoreNames as IDBStoreNames } from 'idb';
import { Book, BookSummary } from '@/types/indexeddb/Book';
import { Series, SeriesMetadata } from '@/types/indexeddb/Series';
import { UpcomingBook } from '@/types/indexeddb/UpcomingBook';
import { Notification } from '@/types/indexeddb/Notification';
import { StoreNames, DB_CONFIG } from '@/types/indexeddb';
import { useToast } from '@/hooks/use-toast';

/**
 * Service for enhanced IndexedDB operations with proper schema design and indices
 */
export class IndexedDBService {
  private db: IDBPDatabase | null = null;
  private isInitializing = false;
  private initPromise: Promise<IDBPDatabase> | null = null;
  private toastService: any = null;

  constructor() {
    // Try to get toast service (will be available in React components)
    try {
      this.toastService = useToast();
    } catch (error) {
      // Toast service not available (outside React context)
    }
  }

  /**
   * Initialize the database connection with enhanced schema and indices
   */
  async initDb(): Promise<IDBPDatabase> {
    // Return existing DB if already initialized
    if (this.db) return this.db;
    
    // Prevent multiple concurrent initializations
    if (this.isInitializing) {
      if (this.initPromise) return this.initPromise;
      throw new Error('Database initialization in progress, but no promise available');
    }
    
    this.isInitializing = true;
    
    try {
      this.initPromise = openDB(DB_CONFIG.NAME, DB_CONFIG.VERSION, {
        upgrade: (db, oldVersion, newVersion) => {
          console.log(`Upgrading database from version ${oldVersion} to ${newVersion}`);
          this.applyMigrations(db, oldVersion, newVersion || DB_CONFIG.VERSION);
        },
        blocking: () => {
          // Handle blocking connections (e.g., older versions of the database open in other tabs)
          console.warn('A newer version of the application wants to upgrade the database. Closing connection.');
          if (this.db) {
            this.db.close();
            this.db = null;
          }
        },
      });
      
      this.db = await this.initPromise;
      this.isInitializing = false;
      return this.db;
    } catch (error) {
      this.isInitializing = false;
      console.error('Failed to initialize IndexedDB:', error);
      this.showUserNotification('Database initialization failed. Some features may not work correctly.');
      throw error;
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
   */
  private showUserNotification(message: string): void {
    console.warn(`IndexedDB notification: ${message}`);
    if (this.toastService) {
      this.toastService.toast({
        title: "Storage Error",
        description: message,
        variant: "destructive"
      });
    }
  }

  /**
   * Get all books from the database
   */
  async getBooks(): Promise<Book[]> {
    try {
      const db = await this.initDb();
      return db.getAll(StoreNames.BOOKS);
    } catch (error) {
      console.error('Failed to get books from IndexedDB:', error);
      this.silentFallbackToLocalStorage<Book[]>('bookLibrary', []);
      return [];
    }
  }

  /**
   * Get a book by its ID
   */
  async getBookById(id: string): Promise<Book | undefined> {
    try {
      const db = await this.initDb();
      return db.get(StoreNames.BOOKS, id);
    } catch (error) {
      console.error(`Failed to get book ${id} from IndexedDB:`, error);
      const books = this.silentFallbackToLocalStorage<Book[]>('bookLibrary', []);
      return books.find(book => book.id === id);
    }
  }

  /**
   * Save a book (create or update)
   */
  async saveBook(book: Book): Promise<string> {
    try {
      // Set last modified timestamp
      const bookToSave: Book = {
        ...book,
        lastModified: new Date().toISOString(),
        syncStatus: 'synced'
      };
      
      const db = await this.initDb();
      await db.put(StoreNames.BOOKS, bookToSave);
      return book.id;
    } catch (error) {
      console.error(`Failed to save book ${book.id} to IndexedDB:`, error);
      this.showUserNotification('Failed to save book. Please try again.');
      throw error;
    }
  }

  /**
   * Get all series from the database
   */
  async getSeries(): Promise<Series[]> {
    try {
      const db = await this.initDb();
      return db.getAll(StoreNames.SERIES);
    } catch (error) {
      console.error('Failed to get series from IndexedDB:', error);
      return this.silentFallbackToLocalStorage<Series[]>('seriesLibrary', []);
    }
  }

  /**
   * Get a series by its ID
   */
  async getSeriesById(id: string): Promise<Series | undefined> {
    try {
      const db = await this.initDb();
      return db.get(StoreNames.SERIES, id);
    } catch (error) {
      console.error(`Failed to get series ${id} from IndexedDB:`, error);
      const series = this.silentFallbackToLocalStorage<Series[]>('seriesLibrary', []);
      return series.find(s => s.id === id);
    }
  }

  /**
   * Save a series (create or update)
   */
  async saveSeries(series: Series): Promise<string> {
    try {
      // Set last modified timestamp
      const seriesToSave: Series = {
        ...series,
        lastModified: new Date().toISOString()
      };
      
      const db = await this.initDb();
      await db.put(StoreNames.SERIES, seriesToSave);
      return series.id;
    } catch (error) {
      console.error(`Failed to save series ${series.id} to IndexedDB:`, error);
      this.showUserNotification('Failed to save series. Please try again.');
      throw error;
    }
  }

  /**
   * Delete a series and update any associated books
   */
  async deleteSeries(seriesId: string): Promise<void> {
    try {
      const db = await this.initDb();
      
      // Start a transaction that spans both series and books stores
      const tx = db.transaction([StoreNames.SERIES, StoreNames.BOOKS], 'readwrite');
      const seriesStore = tx.objectStore(StoreNames.SERIES);
      const bookStore = tx.objectStore(StoreNames.BOOKS);
      
      // Get books in this series using the seriesId index
      const seriesIndex = bookStore.index('seriesId');
      const booksInSeries = await seriesIndex.getAll(seriesId);
      
      // Update books to remove series association
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
    } catch (error) {
      console.error(`Failed to delete series ${seriesId} from IndexedDB:`, error);
      this.showUserNotification('Failed to delete series. Please try again.');
      throw error;
    }
  }

  /**
   * Silent fallback to localStorage for read operations
   * Used when IndexedDB operations fail
   */
  private silentFallbackToLocalStorage<T>(key: string, defaultValue: T): T {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : defaultValue;
    } catch (e) {
      return defaultValue;
    }
  }

  /**
   * Close the database connection
   */
  async closeConnection(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

// Export a singleton instance
export const indexedDBService = new IndexedDBService();
