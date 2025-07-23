import { 
  DB_NAME, 
  DB_VERSION, 
  StoreNames,
  BookRecord,
  UserSettings,
  Collection,
  BackupRecord,
  StorageInterface,
  StorageError,
  StorageErrorType,
  Migration
} from './types';
import { Book } from '@/types/models/Book';
import { migrations } from './migrations';

/**
 * IndexedDB implementation of the StorageInterface
 */
export class IndexedDBStorage implements StorageInterface {
  private db: IDBDatabase | null = null;
  private isInitializing = false;
  private initPromise: Promise<void> | null = null;
  
  /**
   * Initialize the database connection
   * Creates the database if it doesn't exist and applies migrations if needed
   */
  async initialize(): Promise<void> {
    // Prevent multiple concurrent initializations
    if (this.isInitializing) {
      return this.initPromise;
    }
    
    if (this.db) {
      return Promise.resolve();
    }
    
    this.isInitializing = true;
    this.initPromise = new Promise<void>((resolve, reject) => {
      try {
        // Check if IndexedDB is supported
        if (!window.indexedDB) {
          throw new StorageError(
            'Your browser doesn\'t support IndexedDB. Using fallback storage.',
            StorageErrorType.CONNECTION_FAILED
          );
        }
        
        // Open the database connection
        const request = window.indexedDB.open(DB_NAME, DB_VERSION);
        
        // Handle database upgrade (migrations)
        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          const oldVersion = event.oldVersion;
          
          // Apply migrations for each version upgrade
          this.applyMigrations(db, oldVersion, DB_VERSION);
        };
        
        // Handle successful connection
        request.onsuccess = (event) => {
          this.db = (event.target as IDBOpenDBRequest).result;
          
          // Listen for connection errors
          this.db.onerror = (event) => {
            console.error('IndexedDB error:', event);
          };
          
          this.isInitializing = false;
          resolve();
        };
        
        // Handle connection errors
        request.onerror = (event) => {
          this.isInitializing = false;
          const error = new StorageError(
            `Failed to connect to IndexedDB: ${(event.target as IDBOpenDBRequest).error}`,
            StorageErrorType.CONNECTION_FAILED,
            (event.target as IDBOpenDBRequest).error as Error
          );
          console.error(error);
          reject(error);
        };
      } catch (error) {
        this.isInitializing = false;
        const storageError = error instanceof StorageError 
          ? error 
          : new StorageError(
              `Unexpected error initializing database: ${error}`,
              StorageErrorType.UNKNOWN_ERROR,
              error instanceof Error ? error : undefined
            );
        reject(storageError);
      }
    });
    
    return this.initPromise;
  }
  
  /**
   * Apply migrations to upgrade the database
   * @param db The database to upgrade
   * @param oldVersion The previous version
   * @param newVersion The new version to upgrade to
   * @private
   */
  private applyMigrations(db: IDBDatabase, oldVersion: number, newVersion: number): void {
    console.log(`Upgrading database from version ${oldVersion} to ${newVersion}`);
    
    // Sort migrations by version
    const sortedMigrations = [...migrations].sort((a, b) => a.version - b.version);
    
    // Apply each migration in order if it's newer than the old version
    sortedMigrations.forEach((migration) => {
      if (migration.version > oldVersion && migration.version <= newVersion) {
        console.log(`Applying migration for version ${migration.version}`);
        try {
          migration.execute(db);
        } catch (error) {
          console.error(`Failed to apply migration for version ${migration.version}:`, error);
          throw new StorageError(
            `Migration ${migration.version} failed: ${error}`,
            StorageErrorType.MIGRATION_FAILED,
            error instanceof Error ? error : undefined
          );
        }
      }
    });
  }
  
  /**
   * Ensure the database is initialized before performing operations
   * @private
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.db) {
      await this.initialize();
    }
    
    if (!this.db) {
      throw new StorageError(
        'Database is not initialized',
        StorageErrorType.CONNECTION_FAILED
      );
    }
  }
  
  /**
   * Create a transaction for a specific store
   * @param storeName Name of the object store
   * @param mode Transaction mode (readonly or readwrite)
   * @returns The transaction and object store
   * @private
   */
  private createTransaction(
    storeName: StoreNames, 
    mode: IDBTransactionMode = 'readonly'
  ): { 
    transaction: IDBTransaction; 
    store: IDBObjectStore;
  } {
    if (!this.db) {
      throw new StorageError(
        'Cannot create transaction: Database is not initialized',
        StorageErrorType.CONNECTION_FAILED
      );
    }
    
    const transaction = this.db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    
    return { transaction, store };
  }
  
  /**
   * Get all books from the database
   */
  async getBooks(): Promise<Book[]> {
    await this.ensureInitialized();
    
    return new Promise<Book[]>((resolve, reject) => {
      try {
        const { store } = this.createTransaction(StoreNames.BOOKS);
        const books: Book[] = [];
        
        // Open a cursor to iterate through all books
        const request = store.openCursor();
        
        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
          
          if (cursor) {
            // Skip deleted books unless specifically requested
            const book = cursor.value as BookRecord;
            if (!book.deleted) {
              // Remove internal fields when returning to client
              const { syncStatus, deleted, lastUpdated, ...cleanBook } = book;
              books.push(cleanBook);
            }
            
            // Move to the next book
            cursor.continue();
          } else {
            // No more books, return the collected array
            resolve(books);
          }
        };
        
        request.onerror = (event) => {
          reject(
            new StorageError(
              `Failed to get books: ${(event.target as IDBRequest).error}`,
              StorageErrorType.TRANSACTION_FAILED,
              (event.target as IDBRequest).error as Error
            )
          );
        };
      } catch (error) {
        reject(
          new StorageError(
            `Unexpected error getting books: ${error}`,
            StorageErrorType.UNKNOWN_ERROR,
            error instanceof Error ? error : undefined
          )
        );
      }
    });
  }
  
  /**
   * Get a book by its ID
   * @param id The book ID
   */
  async getBookById(id: string): Promise<Book | undefined> {
    await this.ensureInitialized();
    
    return new Promise<Book | undefined>((resolve, reject) => {
      try {
        const { store } = this.createTransaction(StoreNames.BOOKS);
        const request = store.get(id);
        
        request.onsuccess = (event) => {
          const book = (event.target as IDBRequest<BookRecord>).result;
          
          // Check if book exists and is not marked as deleted
          if (book && !book.deleted) {
            // Remove internal fields when returning to client
            const { syncStatus, deleted, lastUpdated, ...cleanBook } = book;
            resolve(cleanBook);
          } else {
            resolve(undefined); // Book not found or marked as deleted
          }
        };
        
        request.onerror = (event) => {
          reject(
            new StorageError(
              `Failed to get book: ${(event.target as IDBRequest).error}`,
              StorageErrorType.TRANSACTION_FAILED,
              (event.target as IDBRequest).error as Error
            )
          );
        };
      } catch (error) {
        reject(
          new StorageError(
            `Unexpected error getting book: ${error}`,
            StorageErrorType.UNKNOWN_ERROR,
            error instanceof Error ? error : undefined
          )
        );
      }
    });
  }
  
  /**
   * Save a book to the database (create or update)
   * @param book The book to save
   */
  async saveBook(book: Book): Promise<string> {
    await this.ensureInitialized();
    
    return new Promise<string>((resolve, reject) => {
      try {
        const { transaction, store } = this.createTransaction(StoreNames.BOOKS, 'readwrite');
        
        // Prepare the book record with additional metadata
        const bookRecord: BookRecord = {
          ...book,
          lastUpdated: new Date().toISOString(),
          syncStatus: 'pending', // Mark for sync if syncing is enabled
        };
        
        // Ensure the book has an ID
        if (!bookRecord.id) {
          bookRecord.id = crypto.randomUUID();
        }
        
        // Save the book
        const request = store.put(bookRecord);
        
        request.onsuccess = () => {
          resolve(bookRecord.id);
        };
        
        request.onerror = (event) => {
          reject(
            new StorageError(
              `Failed to save book: ${(event.target as IDBRequest).error}`,
              StorageErrorType.TRANSACTION_FAILED,
              (event.target as IDBRequest).error as Error
            )
          );
        };
        
        transaction.onerror = (event) => {
          reject(
            new StorageError(
              `Transaction failed: ${transaction.error}`,
              StorageErrorType.TRANSACTION_FAILED,
              transaction.error as Error
            )
          );
        };
      } catch (error) {
        reject(
          new StorageError(
            `Unexpected error saving book: ${error}`,
            StorageErrorType.UNKNOWN_ERROR,
            error instanceof Error ? error : undefined
          )
        );
      }
    });
  }
  
  /**
   * Save multiple books in a batch operation
   * @param books Array of books to save
   */
  async saveBooks(books: Book[]): Promise<string[]> {
    await this.ensureInitialized();
    
    return new Promise<string[]>((resolve, reject) => {
      try {
        const { transaction, store } = this.createTransaction(StoreNames.BOOKS, 'readwrite');
        const ids: string[] = [];
        const timestamp = new Date().toISOString();
        
        books.forEach(book => {
          // Prepare the book record with additional metadata
          const bookRecord: BookRecord = {
            ...book,
            lastUpdated: timestamp,
            syncStatus: 'pending',
          };
          
          // Ensure the book has an ID
          if (!bookRecord.id) {
            bookRecord.id = crypto.randomUUID();
          }
          
          // Save the book
          const request = store.put(bookRecord);
          ids.push(bookRecord.id);
          
          request.onerror = (event) => {
            transaction.abort();
            reject(
              new StorageError(
                `Failed to save book: ${(event.target as IDBRequest).error}`,
                StorageErrorType.TRANSACTION_FAILED,
                (event.target as IDBRequest).error as Error
              )
            );
          };
        });
        
        transaction.oncomplete = () => {
          resolve(ids);
        };
        
        transaction.onerror = (event) => {
          reject(
            new StorageError(
              `Transaction failed: ${transaction.error}`,
              StorageErrorType.TRANSACTION_FAILED,
              transaction.error as Error
            )
          );
        };
      } catch (error) {
        reject(
          new StorageError(
            `Unexpected error saving books: ${error}`,
            StorageErrorType.UNKNOWN_ERROR,
            error instanceof Error ? error : undefined
          )
        );
      }
    });
  }
  
  /**
   * Delete a book (soft delete, marks as deleted)
   * @param id The book ID to delete
   */
  async deleteBook(id: string): Promise<void> {
    await this.ensureInitialized();
    
    return new Promise<void>((resolve, reject) => {
      try {
        const { transaction, store } = this.createTransaction(StoreNames.BOOKS, 'readwrite');
        
        // Get the book first to ensure it exists
        const getRequest = store.get(id);
        
        getRequest.onsuccess = () => {
          const book = getRequest.result as BookRecord | undefined;
          
          if (!book) {
            // Book not found, return success anyway
            resolve();
            return;
          }
          
          // Soft delete the book
          book.deleted = true;
          book.lastUpdated = new Date().toISOString();
          book.syncStatus = 'pending';
          
          // Update the record
          const updateRequest = store.put(book);
          
          updateRequest.onsuccess = () => {
            resolve();
          };
          
          updateRequest.onerror = (event) => {
            reject(
              new StorageError(
                `Failed to delete book: ${(event.target as IDBRequest).error}`,
                StorageErrorType.TRANSACTION_FAILED,
                (event.target as IDBRequest).error as Error
              )
            );
          };
        };
        
        getRequest.onerror = (event) => {
          reject(
            new StorageError(
              `Failed to get book for deletion: ${(event.target as IDBRequest).error}`,
              StorageErrorType.TRANSACTION_FAILED,
              (event.target as IDBRequest).error as Error
            )
          );
        };
        
        transaction.onerror = (event) => {
          reject(
            new StorageError(
              `Transaction failed: ${transaction.error}`,
              StorageErrorType.TRANSACTION_FAILED,
              transaction.error as Error
            )
          );
        };
      } catch (error) {
        reject(
          new StorageError(
            `Unexpected error deleting book: ${error}`,
            StorageErrorType.UNKNOWN_ERROR,
            error instanceof Error ? error : undefined
          )
        );
      }
    });
  }
  
  /**
   * Delete multiple books in a batch operation
   * @param ids Array of book IDs to delete
   */
  async deleteBooks(ids: string[]): Promise<void> {
    await this.ensureInitialized();
    
    // If no ids provided, do nothing
    if (ids.length === 0) {
      return;
    }
    
    return new Promise<void>((resolve, reject) => {
      try {
        const { transaction, store } = this.createTransaction(StoreNames.BOOKS, 'readwrite');
        const timestamp = new Date().toISOString();
        let completed = 0;
        let errors = 0;
        
        ids.forEach(id => {
          // Get the book first to ensure it exists
          const getRequest = store.get(id);
          
          getRequest.onsuccess = () => {
            const book = getRequest.result as BookRecord | undefined;
            
            if (!book) {
              // Book not found, count as completed
              completed++;
              if (completed + errors === ids.length) {
                // All done
                if (errors === 0) {
                  resolve();
                } else {
                  reject(
                    new StorageError(
                      `Failed to delete ${errors} books`,
                      StorageErrorType.TRANSACTION_FAILED
                    )
                  );
                }
              }
              return;
            }
            
            // Soft delete the book
            book.deleted = true;
            book.lastUpdated = timestamp;
            book.syncStatus = 'pending';
            
            // Update the record
            const updateRequest = store.put(book);
            
            updateRequest.onsuccess = () => {
              completed++;
              if (completed + errors === ids.length) {
                // All done
                if (errors === 0) {
                  resolve();
                } else {
                  reject(
                    new StorageError(
                      `Failed to delete ${errors} books`,
                      StorageErrorType.TRANSACTION_FAILED
                    )
                  );
                }
              }
            };
            
            updateRequest.onerror = () => {
              errors++;
              if (completed + errors === ids.length) {
                // All done, but with errors
                reject(
                  new StorageError(
                    `Failed to delete ${errors} books`,
                    StorageErrorType.TRANSACTION_FAILED
                  )
                );
              }
            };
          };
          
          getRequest.onerror = () => {
            errors++;
            if (completed + errors === ids.length) {
              // All done, but with errors
              reject(
                new StorageError(
                  `Failed to delete ${errors} books`,
                  StorageErrorType.TRANSACTION_FAILED
                )
              );
            }
          };
        });
        
        transaction.onerror = (event) => {
          reject(
            new StorageError(
              `Transaction failed: ${transaction.error}`,
              StorageErrorType.TRANSACTION_FAILED,
              transaction.error as Error
            )
          );
        };
      } catch (error) {
        reject(
          new StorageError(
            `Unexpected error deleting books: ${error}`,
            StorageErrorType.UNKNOWN_ERROR,
            error instanceof Error ? error : undefined
          )
        );
      }
    });
  }
  
  /**
   * Get all collections
   */
  async getCollections(): Promise<Collection[]> {
    await this.ensureInitialized();
    
    return new Promise<Collection[]>((resolve, reject) => {
      try {
        const { store } = this.createTransaction(StoreNames.COLLECTIONS);
        const collections: Collection[] = [];
        
        // Open a cursor to iterate through all collections
        const request = store.openCursor();
        
        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
          
          if (cursor) {
            collections.push(cursor.value as Collection);
            cursor.continue();
          } else {
            // No more collections, return the collected array
            resolve(collections);
          }
        };
        
        request.onerror = (event) => {
          reject(
            new StorageError(
              `Failed to get collections: ${(event.target as IDBRequest).error}`,
              StorageErrorType.TRANSACTION_FAILED,
              (event.target as IDBRequest).error as Error
            )
          );
        };
      } catch (error) {
        reject(
          new StorageError(
            `Unexpected error getting collections: ${error}`,
            StorageErrorType.UNKNOWN_ERROR,
            error instanceof Error ? error : undefined
          )
        );
      }
    });
  }
  
  /**
   * Get a collection by its ID
   * @param id The collection ID
   */
  async getCollection(id: string): Promise<Collection | undefined> {
    await this.ensureInitialized();
    
    return new Promise<Collection | undefined>((resolve, reject) => {
      try {
        const { store } = this.createTransaction(StoreNames.COLLECTIONS);
        const request = store.get(id);
        
        request.onsuccess = (event) => {
          const collection = (event.target as IDBRequest<Collection>).result;
          resolve(collection);
        };
        
        request.onerror = (event) => {
          reject(
            new StorageError(
              `Failed to get collection: ${(event.target as IDBRequest).error}`,
              StorageErrorType.TRANSACTION_FAILED,
              (event.target as IDBRequest).error as Error
            )
          );
        };
      } catch (error) {
        reject(
          new StorageError(
            `Unexpected error getting collection: ${error}`,
            StorageErrorType.UNKNOWN_ERROR,
            error instanceof Error ? error : undefined
          )
        );
      }
    });
  }
  
  /**
   * Save a collection
   * @param collection The collection to save
   */
  async saveCollection(collection: Collection): Promise<string> {
    await this.ensureInitialized();
    
    return new Promise<string>((resolve, reject) => {
      try {
        const { transaction, store } = this.createTransaction(StoreNames.COLLECTIONS, 'readwrite');
        
        // Ensure the collection has an ID and timestamps
        if (!collection.id) {
          collection.id = crypto.randomUUID();
        }
        
        const now = new Date().toISOString();
        if (!collection.createdAt) {
          collection.createdAt = now;
        }
        collection.updatedAt = now;
        
        // Save the collection
        const request = store.put(collection);
        
        request.onsuccess = () => {
          resolve(collection.id);
        };
        
        request.onerror = (event) => {
          reject(
            new StorageError(
              `Failed to save collection: ${(event.target as IDBRequest).error}`,
              StorageErrorType.TRANSACTION_FAILED,
              (event.target as IDBRequest).error as Error
            )
          );
        };
      } catch (error) {
        reject(
          new StorageError(
            `Unexpected error saving collection: ${error}`,
            StorageErrorType.UNKNOWN_ERROR,
            error instanceof Error ? error : undefined
          )
        );
      }
    });
  }
  
  /**
   * Delete a collection
   * @param id The collection ID to delete
   */
  async deleteCollection(id: string): Promise<void> {
    await this.ensureInitialized();
    
    return new Promise<void>((resolve, reject) => {
      try {
        const { transaction, store } = this.createTransaction(StoreNames.COLLECTIONS, 'readwrite');
        const request = store.delete(id);
        
        request.onsuccess = () => {
          resolve();
        };
        
        request.onerror = (event) => {
          reject(
            new StorageError(
              `Failed to delete collection: ${(event.target as IDBRequest).error}`,
              StorageErrorType.TRANSACTION_FAILED,
              (event.target as IDBRequest).error as Error
            )
          );
        };
      } catch (error) {
        reject(
          new StorageError(
            `Unexpected error deleting collection: ${error}`,
            StorageErrorType.UNKNOWN_ERROR,
            error instanceof Error ? error : undefined
          )
        );
      }
    });
  }
  
  /**
   * Get user settings
   */
  async getSettings(): Promise<UserSettings> {
    await this.ensureInitialized();
    
    return new Promise<UserSettings>((resolve, reject) => {
      try {
        const { store } = this.createTransaction(StoreNames.SETTINGS);
        // Settings are always stored with ID=1
        const request = store.get(1);
        
        request.onsuccess = (event) => {
          const settings = (event.target as IDBRequest<UserSettings>).result;
          // Return default settings if none exist
          resolve(settings || {
            id: 1,
            theme: 'system',
            defaultView: 'shelf',
            defaultSort: 'title',
            apiProvider: 'google',
            syncEnabled: false,
            updatedAt: new Date().toISOString()
          });
        };
        
        request.onerror = (event) => {
          reject(
            new StorageError(
              `Failed to get settings: ${(event.target as IDBRequest).error}`,
              StorageErrorType.TRANSACTION_FAILED,
              (event.target as IDBRequest).error as Error
            )
          );
        };
      } catch (error) {
        reject(
          new StorageError(
            `Unexpected error getting settings: ${error}`,
            StorageErrorType.UNKNOWN_ERROR,
            error instanceof Error ? error : undefined
          )
        );
      }
    });
  }
  
  /**
   * Save user settings
   * @param settings The settings to save
   */
  async saveSettings(settings: UserSettings): Promise<void> {
    await this.ensureInitialized();
    
    return new Promise<void>((resolve, reject) => {
      try {
        const { transaction, store } = this.createTransaction(StoreNames.SETTINGS, 'readwrite');
        
        // Ensure settings has ID=1 and updatedAt timestamp
        settings.id = 1;
        settings.updatedAt = new Date().toISOString();
        
        const request = store.put(settings);
        
        request.onsuccess = () => {
          resolve();
        };
        
        request.onerror = (event) => {
          reject(
            new StorageError(
              `Failed to save settings: ${(event.target as IDBRequest).error}`,
              StorageErrorType.TRANSACTION_FAILED,
              (event.target as IDBRequest).error as Error
            )
          );
        };
      } catch (error) {
        reject(
          new StorageError(
            `Unexpected error saving settings: ${error}`,
            StorageErrorType.UNKNOWN_ERROR,
            error instanceof Error ? error : undefined
          )
        );
      }
    });
  }
  
  /**
   * Create a backup of the current database state
   * @param name A descriptive name for the backup
   */
  async createBackup(name: string): Promise<number> {
    await this.ensureInitialized();
    
    // First, get all books to include in the backup
    const books = await this.getBooks();
    
    return new Promise<number>((resolve, reject) => {
      try {
        const { transaction, store } = this.createTransaction(StoreNames.BACKUP, 'readwrite');
        
        // Prepare the data for the backup
        const backupData = JSON.stringify(books);
        const backupRecord: BackupRecord = {
          name,
          data: backupData,
          timestamp: new Date().toISOString(),
          bookCount: books.length,
          size: new TextEncoder().encode(backupData).length, // Size in bytes
        };
        
        // Save the backup
        const request = store.add(backupRecord);
        
        request.onsuccess = (event) => {
          // Return the auto-generated backup ID
          const backupId = (event.target as IDBRequest).result as number;
          resolve(backupId);
          
          // Also update the lastBackup field in settings
          this.getSettings().then(settings => {
            settings.lastBackup = backupRecord.timestamp;
            this.saveSettings(settings).catch(console.error);
          }).catch(console.error);
        };
        
        request.onerror = (event) => {
          reject(
            new StorageError(
              `Failed to create backup: ${(event.target as IDBRequest).error}`,
              StorageErrorType.TRANSACTION_FAILED,
              (event.target as IDBRequest).error as Error
            )
          );
        };
      } catch (error) {
        reject(
          new StorageError(
            `Unexpected error creating backup: ${error}`,
            StorageErrorType.UNKNOWN_ERROR,
            error instanceof Error ? error : undefined
          )
        );
      }
    });
  }
  
  /**
   * Get all backups
   */
  async getBackups(): Promise<BackupRecord[]> {
    await this.ensureInitialized();
    
    return new Promise<BackupRecord[]>((resolve, reject) => {
      try {
        const { store } = this.createTransaction(StoreNames.BACKUP);
        const backups: BackupRecord[] = [];
        
        // Open a cursor to iterate through all backups
        const request = store.index('timestamp').openCursor(null, 'prev'); // Most recent first
        
        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
          
          if (cursor) {
            // Only return metadata, not the full data payload
            const backup = cursor.value as BackupRecord;
            const { data, ...metadata } = backup;
            backups.push({
              ...metadata,
              // Include empty data string to maintain type compatibility
              data: ''
            });
            
            cursor.continue();
          } else {
            // No more backups, return the collected array
            resolve(backups);
          }
        };
        
        request.onerror = (event) => {
          reject(
            new StorageError(
              `Failed to get backups: ${(event.target as IDBRequest).error}`,
              StorageErrorType.TRANSACTION_FAILED,
              (event.target as IDBRequest).error as Error
            )
          );
        };
      } catch (error) {
        reject(
          new StorageError(
            `Unexpected error getting backups: ${error}`,
            StorageErrorType.UNKNOWN_ERROR,
            error instanceof Error ? error : undefined
          )
        );
      }
    });
  }
  
  /**
   * Restore a backup
   * @param id The backup ID to restore
   */
  async restoreBackup(id: number): Promise<void> {
    await this.ensureInitialized();
    
    // First, get the backup data
    return new Promise<void>((resolve, reject) => {
      try {
        const { store: backupStore } = this.createTransaction(StoreNames.BACKUP);
        const request = backupStore.get(id);
        
        request.onsuccess = async (event) => {
          const backup = (event.target as IDBRequest<BackupRecord>).result;
          
          if (!backup) {
            reject(
              new StorageError(
                `Backup not found: ${id}`,
                StorageErrorType.NOT_FOUND
              )
            );
            return;
          }
          
          try {
            // Parse the backup data
            const books = JSON.parse(backup.data) as Book[];
            
            // Create a readwrite transaction for the books store
            const { transaction, store: bookStore } = this.createTransaction(StoreNames.BOOKS, 'readwrite');
            
            // Clear existing books
            const clearRequest = bookStore.clear();
            
            clearRequest.onsuccess = () => {
              // Add all books from the backup
              books.forEach(book => {
                bookStore.add({
                  ...book,
                  lastUpdated: new Date().toISOString(),
                  syncStatus: 'pending'
                });
              });
            };
            
            clearRequest.onerror = (clearEvent) => {
              reject(
                new StorageError(
                  `Failed to clear books: ${(clearEvent.target as IDBRequest).error}`,
                  StorageErrorType.TRANSACTION_FAILED,
                  (clearEvent.target as IDBRequest).error as Error
                )
              );
            };
            
            transaction.oncomplete = () => {
              resolve();
            };
            
            transaction.onerror = (transactionEvent) => {
              reject(
                new StorageError(
                  `Transaction failed: ${transaction.error}`,
                  StorageErrorType.TRANSACTION_FAILED,
                  transaction.error as Error
                )
              );
            };
          } catch (parseError) {
            reject(
              new StorageError(
                `Failed to parse backup data: ${parseError}`,
                StorageErrorType.VALIDATION_ERROR,
                parseError instanceof Error ? parseError : undefined
              )
            );
          }
        };
        
        request.onerror = (event) => {
          reject(
            new StorageError(
              `Failed to get backup: ${(event.target as IDBRequest).error}`,
              StorageErrorType.TRANSACTION_FAILED,
              (event.target as IDBRequest).error as Error
            )
          );
        };
      } catch (error) {
        reject(
          new StorageError(
            `Unexpected error restoring backup: ${error}`,
            StorageErrorType.UNKNOWN_ERROR,
            error instanceof Error ? error : undefined
          )
        );
      }
    });
  }
  
  /**
   * Delete a backup
   * @param id The backup ID to delete
   */
  async deleteBackup(id: number): Promise<void> {
    await this.ensureInitialized();
    
    return new Promise<void>((resolve, reject) => {
      try {
        const { transaction, store } = this.createTransaction(StoreNames.BACKUP, 'readwrite');
        const request = store.delete(id);
        
        request.onsuccess = () => {
          resolve();
        };
        
        request.onerror = (event) => {
          reject(
            new StorageError(
              `Failed to delete backup: ${(event.target as IDBRequest).error}`,
              StorageErrorType.TRANSACTION_FAILED,
              (event.target as IDBRequest).error as Error
            )
          );
        };
      } catch (error) {
        reject(
          new StorageError(
            `Unexpected error deleting backup: ${error}`,
            StorageErrorType.UNKNOWN_ERROR,
            error instanceof Error ? error : undefined
          )
        );
      }
    });
  }
  
  /**
   * Clear all data in the database
   */
  async clearAllData(): Promise<void> {
    await this.ensureInitialized();
    
    return new Promise<void>((resolve, reject) => {
      try {
        // Create a backup first for safety
        this.createBackup('Auto-backup before clear').catch(console.error);
        
        // Clear each store in sequence
        const storeNames = [StoreNames.BOOKS, StoreNames.COLLECTIONS];
        let completedStores = 0;
        
        storeNames.forEach(storeName => {
          const { transaction, store } = this.createTransaction(storeName, 'readwrite');
          const request = store.clear();
          
          request.onsuccess = () => {
            completedStores++;
            if (completedStores === storeNames.length) {
              resolve();
            }
          };
          
          request.onerror = (event) => {
            reject(
              new StorageError(
                `Failed to clear ${storeName}: ${(event.target as IDBRequest).error}`,
                StorageErrorType.TRANSACTION_FAILED,
                (event.target as IDBRequest).error as Error
              )
            );
          };
        });
      } catch (error) {
        reject(
          new StorageError(
            `Unexpected error clearing data: ${error}`,
            StorageErrorType.UNKNOWN_ERROR,
            error instanceof Error ? error : undefined
          )
        );
      }
    });
  }
  
  /**
   * Get database storage statistics
   */
  async getStorageStats(): Promise<{ books: number, collections: number, backups: number, totalSize: number }> {
    await this.ensureInitialized();
    
    // Get counts from each store
    const bookCount = await this.countItems(StoreNames.BOOKS);
    const collectionCount = await this.countItems(StoreNames.COLLECTIONS);
    const backupCount = await this.countItems(StoreNames.BACKUP);
    
    // Estimate total size (very rough approximation)
    const books = await this.getBooks();
    const booksSize = new TextEncoder().encode(JSON.stringify(books)).length;
    
    const collections = await this.getCollections();
    const collectionsSize = new TextEncoder().encode(JSON.stringify(collections)).length;
    
    // Get backup sizes from their metadata
    const backups = await this.getBackups();
    const backupsSize = backups.reduce((total, backup) => total + (backup.size || 0), 0);
    
    const totalSize = booksSize + collectionsSize + backupsSize;
    
    return {
      books: bookCount,
      collections: collectionCount,
      backups: backupCount,
      totalSize
    };
  }
  
  /**
   * Count the number of items in a store
   * @param storeName Name of the store
   * @private
   */
  private async countItems(storeName: StoreNames): Promise<number> {
    return new Promise<number>((resolve, reject) => {
      try {
        const { store } = this.createTransaction(storeName);
        const countRequest = store.count();
        
        countRequest.onsuccess = () => {
          resolve(countRequest.result);
        };
        
        countRequest.onerror = (event) => {
          reject(
            new StorageError(
              `Failed to count items: ${(event.target as IDBRequest).error}`,
              StorageErrorType.TRANSACTION_FAILED,
              (event.target as IDBRequest).error as Error
            )
          );
        };
      } catch (error) {
        reject(
          new StorageError(
            `Unexpected error counting items: ${error}`,
            StorageErrorType.UNKNOWN_ERROR,
            error instanceof Error ? error : undefined
          )
        );
      }
    });
  }
}
