/**
 * ResetDatabaseUtil.ts
 * 
 * Utility for completely resetting the IndexedDB database and localStorage.
 * This is useful for testing, resetting to a clean state, or clearing all app data.
 * 
 * Important: This utility ensures that both IndexedDB and localStorage (including series data)
 * are properly cleared and all components are notified about the reset.
 */
import { notifyStorageReset } from '../services/storage/CacheResetListener';

/**
 * Completely deletes the IndexedDB database.
 * @param dbName The name of the database to delete
 * @returns A promise that resolves when the database is deleted
 */
export const resetIndexedDB = (dbName: string = 'book-collection-db'): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Make sure all connections are closed before deleting
    try {
      // Close any open connections to the database
      const closeRequest = indexedDB.open(dbName);
      closeRequest.onsuccess = () => {
        const db = closeRequest.result;
        db.close();
        
        // Delete the database
        console.log(`Attempting to delete IndexedDB database: ${dbName}`);
        const deleteRequest = indexedDB.deleteDatabase(dbName);
        
        deleteRequest.onsuccess = () => {
          console.log(`Successfully deleted IndexedDB database: ${dbName}`);
          resolve();
        };
        
        deleteRequest.onerror = (event) => {
          const error = (event.target as any).error;
          console.error(`Error deleting database: ${error?.message || 'Unknown error'}`);
          reject(new Error(`Failed to delete database: ${error?.message || 'Unknown error'}`));
        };
        
        deleteRequest.onblocked = () => {
          console.error('Database deletion was blocked. Please close all other tabs with this app open.');
          reject(new Error('Database deletion was blocked. Please close all other tabs with this app open.'));
        };
      };
      
      closeRequest.onerror = (event) => {
        const error = (event.target as any).error;
        console.error(`Error opening database for closing: ${error?.message || 'Unknown error'}`);
        reject(new Error(`Failed to open database for closing: ${error?.message || 'Unknown error'}`));
      };
    } catch (error) {
      console.error('Unexpected error during database deletion:', error);
      reject(error);
    }
  });
};

/**
 * Clears localStorage as well for a complete reset
 */
export const resetLocalStorage = (): void => {
  try {
    localStorage.clear();
    console.log('localStorage cleared successfully');
  } catch (error) {
    console.error('Failed to clear localStorage:', error);
    throw error;
  }
};

/**
 * Resets both IndexedDB and localStorage for a complete clean slate
 */
export const resetAllStorage = async (): Promise<void> => {
  try {
    // Reset localStorage first - this will clear series data from localStorage
    resetLocalStorage();
    
    // Then reset IndexedDB
    await resetIndexedDB();
    
    // Force reload any cached data by adding a timestamp to invalidate any internal caches
    window.localStorage.setItem('reset_timestamp', Date.now().toString());
    
    // Explicitly clear series-related data from localStorage to ensure it's gone
    // These are the specific keys used in the hybrid storage model where localStorage
    // is the source of truth for series data in UI components
    window.localStorage.removeItem('seriesLibrary');
    window.localStorage.removeItem('seriesCache');
    window.localStorage.removeItem('seriesMapping');
    window.localStorage.removeItem('seriesAssignments');
    window.localStorage.removeItem('seriesMetadata');
    
    // Notify all services and components that storage has been reset
    notifyStorageReset();
    
    console.log('All storage systems have been reset successfully');
  } catch (error) {
    console.error('Error during complete storage reset:', error);
    throw error;
  }
};
