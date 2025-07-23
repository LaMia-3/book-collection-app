import { 
  StorageInterface, 
  Book, 
  Collection, 
  UserSettings, 
  BackupRecord,
  StorageError,
  StorageErrorType
} from './types';

/**
 * LocalStorageFallback provides a fallback implementation of the StorageInterface
 * for browsers that don't support IndexedDB.
 */
export class LocalStorageFallback implements StorageInterface {
  // Storage keys
  private readonly BOOKS_KEY = 'mira_books';
  private readonly COLLECTIONS_KEY = 'mira_collections';
  private readonly SETTINGS_KEY = 'mira_settings';
  private readonly BACKUPS_KEY = 'mira_backups';
  
  /**
   * Initialize the localStorage-based storage
   */
  async initialize(): Promise<void> {
    try {
      // Check if localStorage is available and working
      localStorage.setItem('mira_storage_test', 'test');
      localStorage.removeItem('mira_storage_test');
      
      // Initialize storage structure if not exists
      if (!localStorage.getItem(this.BOOKS_KEY)) {
        localStorage.setItem(this.BOOKS_KEY, JSON.stringify([]));
      }
      
      if (!localStorage.getItem(this.COLLECTIONS_KEY)) {
        localStorage.setItem(this.COLLECTIONS_KEY, JSON.stringify([]));
      }
      
      // Default settings
      if (!localStorage.getItem(this.SETTINGS_KEY)) {
        const defaultSettings: UserSettings = {
          id: 1,
          theme: 'system',
          defaultView: 'shelf',
          defaultSort: 'title',
          apiProvider: 'google',
          syncEnabled: false,
          updatedAt: new Date().toISOString()
        };
        localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(defaultSettings));
      }
      
      if (!localStorage.getItem(this.BACKUPS_KEY)) {
        localStorage.setItem(this.BACKUPS_KEY, JSON.stringify([]));
      }
      
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(
        new StorageError(
          'Failed to initialize localStorage storage',
          StorageErrorType.CONNECTION_FAILED,
          error instanceof Error ? error : undefined
        )
      );
    }
  }
  
  /**
   * Helper to load array data from localStorage
   */
  private loadArray<T>(key: string): T[] {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error(`Error loading data from ${key}:`, error);
      return [];
    }
  }
  
  /**
   * Helper to save array data to localStorage
   */
  private saveArray<T>(key: string, data: T[]): void {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        throw new StorageError(
          'Storage quota exceeded. Try deleting some items or using a different browser.',
          StorageErrorType.QUOTA_EXCEEDED,
          error
        );
      } else {
        throw new StorageError(
          `Failed to save data to ${key}`,
          StorageErrorType.UNKNOWN_ERROR,
          error instanceof Error ? error : undefined
        );
      }
    }
  }
  
  /**
   * Get all books
   */
  async getBooks(): Promise<Book[]> {
    const books = this.loadArray<Book>(this.BOOKS_KEY)
      .filter(book => !book.deleted); // Filter out deleted books
    return books;
  }
  
  /**
   * Get a book by its ID
   */
  async getBookById(id: string): Promise<Book | undefined> {
    const books = this.loadArray<Book>(this.BOOKS_KEY);
    const book = books.find(book => book.id === id && !book.deleted);
    return book;
  }
  
  /**
   * Save a book
   */
  async saveBook(book: Book): Promise<string> {
    const books = this.loadArray<Book>(this.BOOKS_KEY);
    
    // Ensure the book has an ID
    if (!book.id) {
      book.id = crypto.randomUUID();
    }
    
    // Add metadata
    const bookWithMeta = {
      ...book,
      lastUpdated: new Date().toISOString(),
    };
    
    // Update or add
    const existingIndex = books.findIndex(b => b.id === book.id);
    if (existingIndex >= 0) {
      books[existingIndex] = bookWithMeta;
    } else {
      books.push(bookWithMeta);
    }
    
    this.saveArray(this.BOOKS_KEY, books);
    return book.id;
  }
  
  /**
   * Save multiple books at once
   */
  async saveBooks(books: Book[]): Promise<string[]> {
    const existingBooks = this.loadArray<Book>(this.BOOKS_KEY);
    const ids: string[] = [];
    const timestamp = new Date().toISOString();
    
    // Process each book
    books.forEach(book => {
      // Ensure the book has an ID
      if (!book.id) {
        book.id = crypto.randomUUID();
      }
      ids.push(book.id);
      
      // Add metadata
      const bookWithMeta = {
        ...book,
        lastUpdated: timestamp,
      };
      
      // Update or add
      const existingIndex = existingBooks.findIndex(b => b.id === book.id);
      if (existingIndex >= 0) {
        existingBooks[existingIndex] = bookWithMeta;
      } else {
        existingBooks.push(bookWithMeta);
      }
    });
    
    this.saveArray(this.BOOKS_KEY, existingBooks);
    return ids;
  }
  
  /**
   * Delete a book (soft delete)
   */
  async deleteBook(id: string): Promise<void> {
    const books = this.loadArray<Book>(this.BOOKS_KEY);
    const bookIndex = books.findIndex(book => book.id === id);
    
    if (bookIndex >= 0) {
      // Soft delete
      books[bookIndex] = {
        ...books[bookIndex],
        deleted: true,
        lastUpdated: new Date().toISOString()
      };
      
      this.saveArray(this.BOOKS_KEY, books);
    }
    
    return Promise.resolve();
  }
  
  /**
   * Delete multiple books
   */
  async deleteBooks(ids: string[]): Promise<void> {
    if (ids.length === 0) {
      return Promise.resolve();
    }
    
    const books = this.loadArray<Book>(this.BOOKS_KEY);
    const timestamp = new Date().toISOString();
    
    // Mark each book as deleted
    ids.forEach(id => {
      const bookIndex = books.findIndex(book => book.id === id);
      if (bookIndex >= 0) {
        books[bookIndex] = {
          ...books[bookIndex],
          deleted: true,
          lastUpdated: timestamp
        };
      }
    });
    
    this.saveArray(this.BOOKS_KEY, books);
    return Promise.resolve();
  }
  
  /**
   * Get all collections
   */
  async getCollections(): Promise<Collection[]> {
    return this.loadArray<Collection>(this.COLLECTIONS_KEY);
  }
  
  /**
   * Get a collection by ID
   */
  async getCollection(id: string): Promise<Collection | undefined> {
    const collections = this.loadArray<Collection>(this.COLLECTIONS_KEY);
    return collections.find(collection => collection.id === id);
  }
  
  /**
   * Save a collection
   */
  async saveCollection(collection: Collection): Promise<string> {
    const collections = this.loadArray<Collection>(this.COLLECTIONS_KEY);
    
    // Ensure the collection has an ID and timestamps
    if (!collection.id) {
      collection.id = crypto.randomUUID();
    }
    
    const now = new Date().toISOString();
    if (!collection.createdAt) {
      collection.createdAt = now;
    }
    collection.updatedAt = now;
    
    // Update or add
    const existingIndex = collections.findIndex(c => c.id === collection.id);
    if (existingIndex >= 0) {
      collections[existingIndex] = collection;
    } else {
      collections.push(collection);
    }
    
    this.saveArray(this.COLLECTIONS_KEY, collections);
    return collection.id;
  }
  
  /**
   * Delete a collection
   */
  async deleteCollection(id: string): Promise<void> {
    const collections = this.loadArray<Collection>(this.COLLECTIONS_KEY);
    const filteredCollections = collections.filter(collection => collection.id !== id);
    this.saveArray(this.COLLECTIONS_KEY, filteredCollections);
    return Promise.resolve();
  }
  
  /**
   * Get user settings
   */
  async getSettings(): Promise<UserSettings> {
    try {
      const data = localStorage.getItem(this.SETTINGS_KEY);
      if (data) {
        return JSON.parse(data);
      } else {
        // Return default settings if none exist
        const defaultSettings: UserSettings = {
          id: 1,
          theme: 'system',
          defaultView: 'shelf',
          defaultSort: 'title',
          apiProvider: 'google',
          syncEnabled: false,
          updatedAt: new Date().toISOString()
        };
        
        localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(defaultSettings));
        return defaultSettings;
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      
      // Return default settings on error
      return {
        id: 1,
        theme: 'system',
        defaultView: 'shelf',
        defaultSort: 'title',
        apiProvider: 'google',
        syncEnabled: false,
        updatedAt: new Date().toISOString()
      };
    }
  }
  
  /**
   * Save user settings
   */
  async saveSettings(settings: UserSettings): Promise<void> {
    try {
      // Ensure settings has ID=1 and updatedAt timestamp
      settings.id = 1;
      settings.updatedAt = new Date().toISOString();
      
      localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
      throw new StorageError(
        'Failed to save settings',
        StorageErrorType.UNKNOWN_ERROR,
        error instanceof Error ? error : undefined
      );
    }
  }
  
  /**
   * Create a backup
   */
  async createBackup(name: string): Promise<number> {
    // Get all books to include in the backup
    const books = await this.getBooks();
    
    // Get existing backups
    const backups = this.loadArray<BackupRecord>(this.BACKUPS_KEY);
    
    // Create the backup data
    const backupData = JSON.stringify(books);
    const backupRecord: BackupRecord = {
      id: Date.now(), // Use timestamp as ID
      name,
      data: backupData,
      timestamp: new Date().toISOString(),
      bookCount: books.length,
      size: new TextEncoder().encode(backupData).length, // Size in bytes
    };
    
    // Add the backup
    backups.push(backupRecord);
    this.saveArray(this.BACKUPS_KEY, backups);
    
    // Update settings
    const settings = await this.getSettings();
    settings.lastBackup = backupRecord.timestamp;
    await this.saveSettings(settings);
    
    return backupRecord.id as number;
  }
  
  /**
   * Get all backups
   */
  async getBackups(): Promise<BackupRecord[]> {
    const backups = this.loadArray<BackupRecord>(this.BACKUPS_KEY);
    
    // Return metadata only (not the actual data)
    return backups.map(backup => {
      const { data, ...metadata } = backup;
      return {
        ...metadata,
        data: ''  // Empty string to maintain type compatibility
      };
    });
  }
  
  /**
   * Restore from a backup
   */
  async restoreBackup(id: number): Promise<void> {
    const backups = this.loadArray<BackupRecord>(this.BACKUPS_KEY);
    const backup = backups.find(b => b.id === id);
    
    if (!backup) {
      throw new StorageError(
        `Backup with ID ${id} not found`,
        StorageErrorType.NOT_FOUND
      );
    }
    
    try {
      // Parse the backup data
      const books = JSON.parse(backup.data) as Book[];
      
      // Replace all books with the backup data
      this.saveArray(this.BOOKS_KEY, books.map(book => ({
        ...book,
        lastUpdated: new Date().toISOString()
      })));
      
      return Promise.resolve();
    } catch (error) {
      throw new StorageError(
        `Failed to restore backup: ${error}`,
        StorageErrorType.VALIDATION_ERROR,
        error instanceof Error ? error : undefined
      );
    }
  }
  
  /**
   * Delete a backup
   */
  async deleteBackup(id: number): Promise<void> {
    const backups = this.loadArray<BackupRecord>(this.BACKUPS_KEY);
    const filteredBackups = backups.filter(backup => backup.id !== id);
    this.saveArray(this.BACKUPS_KEY, filteredBackups);
    return Promise.resolve();
  }
  
  /**
   * Clear all data
   */
  async clearAllData(): Promise<void> {
    try {
      // Create a backup first for safety
      await this.createBackup('Auto-backup before clear');
      
      // Clear books and collections
      localStorage.setItem(this.BOOKS_KEY, JSON.stringify([]));
      localStorage.setItem(this.COLLECTIONS_KEY, JSON.stringify([]));
      
      // Don't clear settings or backups
      
      return Promise.resolve();
    } catch (error) {
      throw new StorageError(
        'Failed to clear data',
        StorageErrorType.UNKNOWN_ERROR,
        error instanceof Error ? error : undefined
      );
    }
  }
  
  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<{ books: number; collections: number; backups: number; totalSize: number; }> {
    const books = this.loadArray<Book>(this.BOOKS_KEY).filter(book => !book.deleted);
    const collections = this.loadArray<Collection>(this.COLLECTIONS_KEY);
    const backups = this.loadArray<BackupRecord>(this.BACKUPS_KEY);
    
    // Calculate sizes
    const booksJson = JSON.stringify(books);
    const collectionsJson = JSON.stringify(collections);
    const backupsJson = JSON.stringify(backups);
    
    const booksSize = new TextEncoder().encode(booksJson).length;
    const collectionsSize = new TextEncoder().encode(collectionsJson).length;
    const backupsSize = new TextEncoder().encode(backupsJson).length;
    
    return {
      books: books.length,
      collections: collections.length,
      backups: backups.length,
      totalSize: booksSize + collectionsSize + backupsSize
    };
  }
}
