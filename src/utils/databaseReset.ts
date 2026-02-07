import { deleteDB, openDB } from 'idb';
import { DB_CONFIG, StoreNames } from '@/types/indexeddb';
import { createLogger } from './loggingUtils';

const log = createLogger('DatabaseReset');

/**
 * Utility to completely reset the database and recreate it with the correct schema
 * This is useful when there are version conflicts or schema issues
 */
export async function resetAndRecreateDatabase(): Promise<boolean> {
  try {
    log.info('Starting database reset and recreation');
    
    // Step 1: Delete the existing database
    log.info('Deleting existing database');
    await deleteDB(DB_CONFIG.NAME);
    
    // Step 2: Create a new database with the current version
    log.info(`Creating new database with version ${DB_CONFIG.VERSION}`);
    const db = await openDB(DB_CONFIG.NAME, DB_CONFIG.VERSION, {
      upgrade(db, oldVersion, newVersion) {
        log.info(`Upgrading database from version ${oldVersion} to ${newVersion}`);
        
        // Create books store
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
          log.info('Created books store');
        }
        
        // Create series store
        if (!db.objectStoreNames.contains(StoreNames.SERIES)) {
          const seriesStore = db.createObjectStore(StoreNames.SERIES, { keyPath: 'id' });
          seriesStore.createIndex('name', 'name', { unique: false });
          seriesStore.createIndex('author', 'author', { unique: false });
          seriesStore.createIndex('isTracked', 'isTracked', { unique: false });
          seriesStore.createIndex('readingProgress', 'readingProgress', { unique: false });
          seriesStore.createIndex('lastModified', 'lastModified', { unique: false });
          log.info('Created series store');
        }
        
        // Create upcoming books store
        if (!db.objectStoreNames.contains(StoreNames.UPCOMING_BOOKS)) {
          const upcomingBooksStore = db.createObjectStore(StoreNames.UPCOMING_BOOKS, { keyPath: 'id' });
          upcomingBooksStore.createIndex('seriesId', 'seriesId', { unique: false });
          upcomingBooksStore.createIndex('expectedReleaseDate', 'expectedReleaseDate', { unique: false });
          upcomingBooksStore.createIndex('notifyOnRelease', 'notifyOnRelease', { unique: false });
          upcomingBooksStore.createIndex('author', 'author', { unique: false });
          log.info('Created upcoming books store');
        }
        
        // Create notifications store
        if (!db.objectStoreNames.contains(StoreNames.NOTIFICATIONS)) {
          const notificationsStore = db.createObjectStore(StoreNames.NOTIFICATIONS, { keyPath: 'id' });
          notificationsStore.createIndex('status', 'status', { unique: false });
          notificationsStore.createIndex('createdAt', 'createdAt', { unique: false });
          notificationsStore.createIndex('priority', 'priority', { unique: false });
          notificationsStore.createIndex('type', 'type', { unique: false });
          notificationsStore.createIndex('relatedItemId', 'relatedItemId', { unique: false });
          notificationsStore.createIndex('expiresAt', 'expiresAt', { unique: false });
          log.info('Created notifications store');
        }
        
        // Create settings store
        if (!db.objectStoreNames.contains(StoreNames.SETTINGS)) {
          db.createObjectStore(StoreNames.SETTINGS, { keyPath: 'id' });
          log.info('Created settings store');
        }
        
        // Create collections store
        if (!db.objectStoreNames.contains(StoreNames.COLLECTIONS)) {
          const collectionsStore = db.createObjectStore(StoreNames.COLLECTIONS, { keyPath: 'id' });
          collectionsStore.createIndex('name', 'name', { unique: false });
          collectionsStore.createIndex('dateAdded', 'dateAdded', { unique: false });
          collectionsStore.createIndex('lastModified', 'lastModified', { unique: false });
          log.info('Created collections store');
        }
      }
    });
    
    // Close the database connection
    db.close();
    
    log.info('Database reset and recreation completed successfully');
    return true;
  } catch (error) {
    log.error('Failed to reset and recreate database', { error: String(error) });
    return false;
  }
}

/**
 * Add a button to the UI that allows the user to reset the database
 * This is useful for development and testing
 */
export function addDatabaseResetButton(): void {
  try {
    // Only add in development mode
    if (process.env.NODE_ENV !== 'development') return;
    
    // Create the reset button
    const resetButton = document.createElement('button');
    resetButton.textContent = 'Reset Database';
    resetButton.style.position = 'fixed';
    resetButton.style.bottom = '10px';
    resetButton.style.right = '10px';
    resetButton.style.zIndex = '9999';
    resetButton.style.padding = '8px 16px';
    resetButton.style.backgroundColor = '#f44336';
    resetButton.style.color = 'white';
    resetButton.style.border = 'none';
    resetButton.style.borderRadius = '4px';
    resetButton.style.cursor = 'pointer';
    
    // Add click handler
    resetButton.addEventListener('click', async () => {
      if (confirm('Are you sure you want to reset the database? All data will be lost.')) {
        const success = await resetAndRecreateDatabase();
        if (success) {
          alert('Database reset successfully. The page will now reload.');
          window.location.reload();
        } else {
          alert('Failed to reset database. Check console for details.');
        }
      }
    });
    
    // Add to document
    document.body.appendChild(resetButton);
    log.info('Database reset button added to UI');
  } catch (error) {
    log.error('Failed to add database reset button', { error: String(error) });
  }
}
