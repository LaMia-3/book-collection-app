import { Migration, StoreNames } from './types';

/**
 * Migration for version 1 - Initial schema setup
 * Creates the initial object stores for the database
 */
export const migrationV1: Migration = {
  version: 1,
  execute: (db: IDBDatabase) => {
    // Books store
    if (!db.objectStoreNames.contains(StoreNames.BOOKS)) {
      const bookStore = db.createObjectStore(StoreNames.BOOKS, { keyPath: 'id' });
      
      // Create indexes for common query patterns
      bookStore.createIndex('status', 'status', { unique: false });
      bookStore.createIndex('author', 'author', { unique: false });
      bookStore.createIndex('addedDate', 'addedDate', { unique: false });
      bookStore.createIndex('completedDate', 'completedDate', { unique: false });
      bookStore.createIndex('rating', 'rating', { unique: false });
      bookStore.createIndex('syncStatus', 'syncStatus', { unique: false });
    }
    
    // Settings store
    if (!db.objectStoreNames.contains(StoreNames.SETTINGS)) {
      db.createObjectStore(StoreNames.SETTINGS, { keyPath: 'id' });
    }
    
    // Collections store
    if (!db.objectStoreNames.contains(StoreNames.COLLECTIONS)) {
      const collectionsStore = db.createObjectStore(StoreNames.COLLECTIONS, { keyPath: 'id' });
      collectionsStore.createIndex('name', 'name', { unique: false });
    }
    
    // Backups store
    if (!db.objectStoreNames.contains(StoreNames.BACKUP)) {
      const backupStore = db.createObjectStore(StoreNames.BACKUP, { 
        keyPath: 'id', 
        autoIncrement: true 
      });
      backupStore.createIndex('timestamp', 'timestamp', { unique: false });
    }
  }
};

/**
 * All available migrations in order
 */
export const migrations: Migration[] = [
  migrationV1,
  // Add future migrations here as the schema evolves
];

/**
 * Helper function to perform a database migration
 * @param oldVersion Previous version number
 * @param newVersion Target version number
 * @param db Database instance
 */
export function migrateDatabase(
  oldVersion: number, 
  newVersion: number, 
  db: IDBDatabase
): void {
  console.log(`Migrating database from v${oldVersion} to v${newVersion}`);
  
  // Run all migrations between oldVersion and newVersion
  for (const migration of migrations) {
    if (migration.version > oldVersion && migration.version <= newVersion) {
      console.log(`Applying migration v${migration.version}`);
      migration.execute(db);
    }
  }
}
