import { IndexedDBStorage } from './IndexedDBStorage';
import { LocalStorageFallback } from './LocalStorageFallback';
import { StorageInterface, StorageError, StorageErrorType } from './types';

/**
 * StorageService is the main entry point for data storage operations.
 * It uses IndexedDB when available and falls back to localStorage when necessary.
 */
class StorageService {
  private static instance: StorageService;
  private storage: StorageInterface;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;
  
  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    // Try to use IndexedDB first, fall back to localStorage if not available
    if (window.indexedDB) {
      this.storage = new IndexedDBStorage();
    } else {
      console.warn('IndexedDB is not supported in this browser. Using localStorage fallback.');
      this.storage = new LocalStorageFallback();
    }
  }
  
  /**
   * Get the singleton instance of StorageService
   */
  public static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    
    return StorageService.instance;
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
    
    this.initPromise = this.storage.initialize()
      .then(() => {
        this.isInitialized = true;
        console.log('Storage system initialized successfully');
      })
      .catch((error) => {
        console.error('Failed to initialize storage system:', error);
        throw new StorageError(
          'Failed to initialize storage system',
          StorageErrorType.CONNECTION_FAILED,
          error
        );
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
   * Get all books from storage
   */
  public async getBooks() {
    await this.ensureInitialized();
    return this.storage.getBooks();
  }
  
  /**
   * Get a book by its ID
   */
  public async getBookById(id: string) {
    await this.ensureInitialized();
    return this.storage.getBookById(id);
  }
  
  /**
   * Save a book to storage
   */
  public async saveBook(book: any) {
    await this.ensureInitialized();
    return this.storage.saveBook(book);
  }
  
  /**
   * Save multiple books at once
   */
  public async saveBooks(books: any[]) {
    await this.ensureInitialized();
    return this.storage.saveBooks(books);
  }
  
  /**
   * Delete a book from storage
   */
  public async deleteBook(id: string) {
    await this.ensureInitialized();
    return this.storage.deleteBook(id);
  }
  
  /**
   * Delete multiple books at once
   */
  public async deleteBooks(ids: string[]) {
    await this.ensureInitialized();
    return this.storage.deleteBooks(ids);
  }
  
  /**
   * Get all collections
   */
  public async getCollections() {
    await this.ensureInitialized();
    return this.storage.getCollections();
  }
  
  /**
   * Get a collection by ID
   */
  public async getCollection(id: string) {
    await this.ensureInitialized();
    return this.storage.getCollection(id);
  }
  
  /**
   * Save a collection
   */
  public async saveCollection(collection: any) {
    await this.ensureInitialized();
    return this.storage.saveCollection(collection);
  }
  
  /**
   * Delete a collection
   */
  public async deleteCollection(id: string) {
    await this.ensureInitialized();
    return this.storage.deleteCollection(id);
  }
  
  /**
   * Get user settings
   */
  public async getSettings() {
    await this.ensureInitialized();
    return this.storage.getSettings();
  }
  
  /**
   * Save user settings
   */
  public async saveSettings(settings: any) {
    await this.ensureInitialized();
    return this.storage.saveSettings(settings);
  }
  
  /**
   * Create a backup of the current data
   */
  public async createBackup(name: string) {
    await this.ensureInitialized();
    return this.storage.createBackup(name);
  }
  
  /**
   * Get all backup records (without the actual data)
   */
  public async getBackups() {
    await this.ensureInitialized();
    return this.storage.getBackups();
  }
  
  /**
   * Restore data from a backup
   */
  public async restoreBackup(id: number) {
    await this.ensureInitialized();
    return this.storage.restoreBackup(id);
  }
  
  /**
   * Delete a backup record
   */
  public async deleteBackup(id: number) {
    await this.ensureInitialized();
    return this.storage.deleteBackup(id);
  }
  
  /**
   * Clear all data from storage
   */
  public async clearAllData() {
    await this.ensureInitialized();
    return this.storage.clearAllData();
  }
  
  /**
   * Get storage statistics
   */
  public async getStorageStats() {
    await this.ensureInitialized();
    return this.storage.getStorageStats();
  }
}

// Create and export the singleton instance
export const storageService = StorageService.getInstance();

// Default export
export default storageService;
