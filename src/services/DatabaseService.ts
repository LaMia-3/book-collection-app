import { openDB, IDBPDatabase } from 'idb';

/**
 * Service for database operations using IndexedDB
 */
export class DatabaseService {
  private readonly dbName = 'bookCollectionDb';
  private readonly version = 1;
  private db: IDBPDatabase | null = null;
  
  /**
   * Initialize the database connection
   */
  async initDb(): Promise<IDBPDatabase> {
    if (this.db) return this.db;
    
    this.db = await openDB(this.dbName, this.version, {
      upgrade(db) {
        // Create object stores if they don't exist
        if (!db.objectStoreNames.contains('books')) {
          db.createObjectStore('books', { keyPath: 'id' });
        }
        
        if (!db.objectStoreNames.contains('series')) {
          db.createObjectStore('series', { keyPath: 'id' });
        }
        
        if (!db.objectStoreNames.contains('upcomingReleases')) {
          db.createObjectStore('upcomingReleases', { keyPath: 'id' });
        }
        
        if (!db.objectStoreNames.contains('notifications')) {
          db.createObjectStore('notifications', { keyPath: 'id' });
        }
        
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'id' });
        }
      },
    });
    
    return this.db;
  }
  
  /**
   * Get all items from an object store
   */
  async getAll<T>(storeName: string): Promise<T[]> {
    const db = await this.initDb();
    return db.getAll(storeName);
  }
  
  /**
   * Get a single item by ID
   */
  async getById<T>(storeName: string, id: string): Promise<T | null> {
    const db = await this.initDb();
    return db.get(storeName, id);
  }
  
  /**
   * Add an item to the store
   */
  async add<T extends { id: string }>(storeName: string, item: T): Promise<string> {
    const db = await this.initDb();
    await db.put(storeName, item);
    return item.id;
  }
  
  /**
   * Update an item in the store
   */
  async update<T extends { id: string }>(storeName: string, id: string, item: T): Promise<string> {
    const db = await this.initDb();
    await db.put(storeName, item);
    return id;
  }
  
  /**
   * Delete an item from the store
   */
  async delete(storeName: string, id: string): Promise<boolean> {
    const db = await this.initDb();
    await db.delete(storeName, id);
    return true;
  }
  
  /**
   * Clear an entire object store
   */
  async clearStore(storeName: string): Promise<void> {
    const db = await this.initDb();
    await db.clear(storeName);
  }
  
  /**
   * Migrate data from localStorage to IndexedDB
   */
  async migrateFromLocalStorage(): Promise<void> {
    // Migration implementation for books
    const savedBooks = localStorage.getItem('bookLibrary');
    if (savedBooks) {
      try {
        const books = JSON.parse(savedBooks);
        for (const book of books) {
          await this.add('books', book);
        }
        console.log('Migrated books from localStorage');
      } catch (error) {
        console.error('Error migrating books from localStorage:', error);
      }
    }
    
    // Migration implementation for series
    const savedSeries = localStorage.getItem('seriesLibrary');
    if (savedSeries) {
      try {
        const series = JSON.parse(savedSeries);
        for (const item of series) {
          await this.add('series', item);
        }
        console.log('Migrated series from localStorage');
      } catch (error) {
        console.error('Error migrating series from localStorage:', error);
      }
    }
    
    // Migration implementation for upcoming releases
    const savedUpcoming = localStorage.getItem('upcomingBooks');
    if (savedUpcoming) {
      try {
        const upcomingBooks = JSON.parse(savedUpcoming);
        for (const book of upcomingBooks) {
          await this.add('upcomingReleases', book);
        }
        console.log('Migrated upcoming releases from localStorage');
      } catch (error) {
        console.error('Error migrating upcoming releases from localStorage:', error);
      }
    }
    
    // Migration implementation for notifications
    const savedNotifications = localStorage.getItem('releaseNotifications');
    if (savedNotifications) {
      try {
        const notifications = JSON.parse(savedNotifications);
        for (const notification of notifications) {
          await this.add('notifications', notification);
        }
        console.log('Migrated notifications from localStorage');
      } catch (error) {
        console.error('Error migrating notifications from localStorage:', error);
      }
    }
  }
  
  /**
   * Check if migration from localStorage is needed
   */
  async checkMigrationNeeded(): Promise<boolean> {
    const db = await this.initDb();
    
    // Check if the books store is empty
    const booksCount = await db.count('books');
    
    // Check if localStorage has books
    const hasLocalStorageBooks = !!localStorage.getItem('bookLibrary');
    
    return booksCount === 0 && hasLocalStorageBooks;
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

// Export a singleton instance that can be used throughout the app
export const databaseService = new DatabaseService();
