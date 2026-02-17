import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useSettings } from '@/contexts/SettingsContext';
import { Book } from '@/types/book';

/**
 * Helper function to clear an IndexedDB object store.
 */
const clearIndexedDBStore = (dbName: string, storeName: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      const openRequest = indexedDB.open(dbName);
      
      openRequest.onerror = (event) => {
        const error = (event.target as any).error;
        reject(new Error(`Failed to open database: ${error?.message || 'Unknown error'}`));
      };
      
      openRequest.onsuccess = (event) => {
        const db = openRequest.result;
        
        // Check if the store exists
        if (!Array.from(db.objectStoreNames).includes(storeName)) {
          db.close();
          reject(new Error(`Store "${storeName}" does not exist in database`));
          return;
        }
        
        try {
          // Create a transaction
          const transaction = db.transaction(storeName, 'readwrite');
          const objectStore = transaction.objectStore(storeName);
          
          // Request to clear the store
          const clearRequest = objectStore.clear();
          
          // Handle success case
          clearRequest.onsuccess = () => {
            console.log(`Clear operation for ${storeName} successful`);
          };
          
          // Handle clear request error
          clearRequest.onerror = (event) => {
            const error = (event.target as any).error;
            transaction.abort();
            db.close();
            reject(new Error(`Failed to clear ${storeName} store: ${error?.message || 'Unknown error'}`));
          };
          
          // Handle transaction completion (success)
          transaction.oncomplete = () => {
            db.close();
            console.log(`Transaction for clearing ${storeName} completed successfully`);
            resolve();
          };
          
          // Handle transaction error
          transaction.onerror = (event) => {
            const error = (event.target as any).error;
            db.close();
            reject(new Error(`Transaction failed: ${error?.message || 'Unknown error'}`));
          };
          
          // Handle transaction abort
          transaction.onabort = (event) => {
            const error = (event.target as any).error;
            db.close();
            reject(new Error(`Transaction aborted: ${error?.message || 'Unknown error'}`));
          };
          
        } catch (txError) {
          db.close();
          reject(new Error(`Error setting up transaction: ${txError instanceof Error ? txError.message : String(txError)}`));
        }
      };
      
    } catch (outerError) {
      reject(new Error(`Unexpected error during clear operation: ${outerError instanceof Error ? outerError.message : String(outerError)}`));
    }
  });
};

interface UseLibrarySettingsOptions {
  /** Pass external books state if the page manages its own books array */
  externalBooks?: Book[];
  /** Pass external setBooks if the page manages its own books array */
  externalSetBooks?: (books: Book[]) => void;
  /** Additional callback after delete/reset for page-specific UI cleanup */
  onLibraryCleared?: () => void;
}

/**
 * Shared hook that provides all Settings modal props (delete, reset, import, export, backup).
 * Use this from any page to get consistent behavior.
 *
 * Two modes:
 * 1. Internal state (default): the hook owns the books state.
 * 2. External state: pass externalBooks + externalSetBooks and the hook delegates to them.
 */
export function useLibrarySettings(options: UseLibrarySettingsOptions = {}) {
  const { toast } = useToast();
  const { settings } = useSettings();
  const [showSettings, setShowSettings] = useState(false);
  const [internalBooks, setInternalBooks] = useState<Book[]>([]);

  // Decide which books state to use
  const books = options.externalBooks ?? internalBooks;
  const rawSetBooks = options.externalSetBooks ?? setInternalBooks;

  const updateBooks = useCallback((newBooks: Book[]) => {
    rawSetBooks(newBooks);
  }, [rawSetBooks]);

  const onDeleteLibrary = useCallback(async () => {
    try {
      const { collectionRepository } = await import('@/repositories/CollectionRepository');

      // Get all collections before clearing books to preserve them
      const collections = await collectionRepository.getAll();
      console.log('Retrieved collections to preserve:', collections.length);

      // Clear all books in IndexedDB
      try {
        await clearIndexedDBStore('book-collection-db', 'books');
        console.log('Successfully cleared books from IndexedDB');

        // Clear all series in IndexedDB
        await clearIndexedDBStore('book-collection-db', 'series');
        console.log('Successfully cleared series from IndexedDB');

        // Explicitly preserve each collection but remove their books
        for (const collection of collections) {
          try {
            const updatedCollection = {
              id: collection.id,
              name: collection.name,
              description: collection.description || '',
              imageUrl: collection.imageUrl,
              color: collection.color,
              bookIds: [],
              createdAt: collection.createdAt,
              updatedAt: new Date()
            };
            await collectionRepository.update(collection.id, updatedCollection);
            console.log(`Preserved collection: ${collection.name} (${collection.id})`);
          } catch (collectionError) {
            console.error(`Error preserving collection ${collection.id}:`, collectionError);
          }
        }
        console.log('Successfully preserved collections while removing books and series');
      } catch (error) {
        console.error('Error clearing books and series:', error);
      }

      // Clear localStorage for compatibility with old implementation
      localStorage.removeItem('bookLibrary');
      localStorage.removeItem('seriesLibrary');
      localStorage.removeItem('upcomingBooks');
      localStorage.removeItem('releaseNotifications');
      localStorage.removeItem('seriesCache');
      localStorage.removeItem('seriesMapping');
      console.log('localStorage items removed');

      // Update UI state
      updateBooks([]);
      options.onLibraryCleared?.();

      toast({
        title: "Library Deleted",
        description: "All books and series have been removed from your library while preserving your collections."
      });

      // Force page refresh so all views reflect the cleared state
      setTimeout(() => window.location.reload(), 500);

      return Promise.resolve();
    } catch (error) {
      console.error('Error deleting library:', error);
      toast({
        title: "Error",
        description: `Failed to delete library: ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive"
      });
      return Promise.reject(error);
    }
  }, [toast, updateBooks, options.onLibraryCleared]);

  const onResetLibrary = useCallback(async () => {
    try {
      const { notificationService } = await import('@/services/NotificationService');

      // Clear all books in IndexedDB
      try {
        await clearIndexedDBStore('book-collection-db', 'books');
        console.log('Successfully cleared books from IndexedDB');
      } catch (error) {
        console.error('Error clearing books:', error);
      }

      // Clear all series
      try {
        await clearIndexedDBStore('book-collection-db', 'series');
        console.log('Successfully cleared series from IndexedDB');
      } catch (error) {
        console.error('Error clearing series:', error);
      }

      // Clear all collections
      try {
        await clearIndexedDBStore('book-collection-db', 'collections');
        console.log('Successfully cleared collections from IndexedDB');
      } catch (error) {
        console.error('Error clearing collections:', error);
      }

      // Clear notifications
      try {
        await notificationService.clearAllNotifications();
        console.log('Notifications cleared successfully');
      } catch (error) {
        console.error('Error clearing notifications:', error);
      }

      // Clear localStorage for compatibility with old implementation
      localStorage.removeItem('bookLibrary');
      localStorage.removeItem('seriesLibrary');
      localStorage.removeItem('upcomingBooks');
      localStorage.removeItem('releaseNotifications');
      localStorage.removeItem('seriesCache');
      localStorage.removeItem('seriesMapping');
      localStorage.removeItem('seriesAssignments');
      localStorage.removeItem('seriesMetadata');
      localStorage.removeItem('collections');
      console.log('localStorage items removed');

      // Update UI state
      updateBooks([]);
      options.onLibraryCleared?.();

      toast({
        title: "Library Reset Complete",
        description: "Your library has been completely reset. All books, series, and collections have been removed."
      });

      // Force page refresh so all views reflect the cleared state
      setTimeout(() => window.location.reload(), 500);

      return Promise.resolve();
    } catch (error) {
      console.error('Error resetting library:', error);
      toast({
        title: "Error",
        description: `Failed to reset library: ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive"
      });
      return Promise.reject(error);
    }
  }, [toast, updateBooks, options.onLibraryCleared]);

  const onImportCSV = useCallback(async (file: File) => {
    try {
      const { importFromCSV } = await import('@/utils/importUtils');
      const importResult = await importFromCSV(file);

      if (importResult.successful.length > 0) {
        try {
          const { enhancedStorageService } = await import('@/services/storage/EnhancedStorageService');

          const savedBooks: Book[] = [];
          for (const book of importResult.successful) {
            const indexedDBBook = {
              ...book,
              dateAdded: book.addedDate || new Date().toISOString(),
              dateCompleted: book.completedDate,
              lastModified: new Date().toISOString(),
              syncStatus: 'synced',
              progress: typeof book.progress === 'number' ? book.progress : 0
            };
            await enhancedStorageService.saveBook(indexedDBBook);
            savedBooks.push(book);
          }

          updateBooks([...books, ...savedBooks]);

          toast({
            title: "Import Successful",
            description: `${importResult.successful.length} books were imported successfully. ${importResult.failed.length > 0 ? `${importResult.failed.length} failed.` : ''}`
          });

          // Force page refresh so all views reflect the imported data
          setTimeout(() => window.location.reload(), 500);
        } catch (saveError) {
          console.error('Error saving imported books to IndexedDB:', saveError);
          toast({
            title: "Import Partial Success",
            description: `Books imported but may not appear in all views. Please refresh the page. Error: ${saveError instanceof Error ? saveError.message : String(saveError)}`,
            variant: "default"
          });
        }
      } else {
        toast({
          title: "Import Failed",
          description: `No books were imported. Please check your file format.`,
          variant: "destructive"
        });
      }

      return Promise.resolve();
    } catch (error) {
      console.error('CSV import error:', error);
      toast({
        title: "Import Error",
        description: `Error importing CSV: ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive"
      });
      return Promise.reject(error);
    }
  }, [toast, books, updateBooks]);

  const onImportJSON = useCallback(async (file: File) => {
    try {
      const { importFromJSON } = await import('@/utils/importUtils');
      const importResult = await importFromJSON(file);

      if (importResult.successful.length > 0) {
        try {
          const { enhancedStorageService } = await import('@/services/storage/EnhancedStorageService');

          const savedBooks: Book[] = [];
          for (const book of importResult.successful) {
            const indexedDBBook = {
              ...book,
              dateAdded: book.addedDate || new Date().toISOString(),
              dateCompleted: book.completedDate,
              lastModified: new Date().toISOString(),
              syncStatus: 'synced',
              progress: typeof book.progress === 'number' ? book.progress : 0
            };
            await enhancedStorageService.saveBook(indexedDBBook);
            savedBooks.push(book);
          }

          updateBooks([...books, ...savedBooks]);

          toast({
            title: "Import Successful",
            description: `${importResult.successful.length} books were imported successfully. ${importResult.failed.length > 0 ? `${importResult.failed.length} failed.` : ''}`
          });

          // Force page refresh so all views reflect the imported data
          setTimeout(() => window.location.reload(), 500);
        } catch (saveError) {
          console.error('Error saving imported books to IndexedDB:', saveError);
          toast({
            title: "Import Partial Success",
            description: `Books imported but may not appear in all views. Please refresh the page. Error: ${saveError instanceof Error ? saveError.message : String(saveError)}`,
            variant: "default"
          });
        }
      } else {
        toast({
          title: "Import Failed",
          description: `No books were imported. Please check your file format.`,
          variant: "destructive"
        });
      }

      return Promise.resolve();
    } catch (error) {
      console.error('JSON import error:', error);
      toast({
        title: "Import Error",
        description: `Error importing JSON: ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive"
      });
      return Promise.reject(error);
    }
  }, [toast, books, updateBooks]);

  const onCreateBackup = useCallback(async () => {
    try {
      const { createBackup } = await import('@/utils/backupUtils');
      const preferredName = settings?.preferredName;
      await createBackup(books, preferredName);

      toast({
        title: "Backup Created",
        description: `Successfully created a backup with ${books.length} books.`
      });

      return Promise.resolve();
    } catch (error) {
      console.error('Backup creation error:', error);
      toast({
        title: "Backup Error",
        description: `Error creating backup: ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive"
      });
      return Promise.reject(error);
    }
  }, [toast, books, settings?.preferredName]);

  const onRestoreBackup = useCallback(async (file: File) => {
    try {
      const { restoreFromBackup } = await import('@/utils/backupUtils');
      const restoreResult = await restoreFromBackup(file);

      if (restoreResult.success && restoreResult.books.length > 0) {
        try {
          const { enhancedStorageService } = await import('@/services/storage/EnhancedStorageService');

          // Save each book to IndexedDB
          for (const book of restoreResult.books) {
            const indexedDBBook = {
              ...book,
              dateAdded: book.addedDate || new Date().toISOString(),
              dateCompleted: book.completedDate,
              lastModified: new Date().toISOString(),
              syncStatus: 'synced',
              progress: typeof book.progress === 'number' ? book.progress : 0
            };
            await enhancedStorageService.saveBook(indexedDBBook);
          }

          // Process series data from the backup
          if (restoreResult.isEnhancedFormat && restoreResult.series && restoreResult.series.length > 0) {
            console.log(`Restoring ${restoreResult.series.length} series from backup`);
            for (const series of restoreResult.series) {
              const uiSeries = {
                ...series,
                createdAt: new Date(series.timestamps?.created || new Date().toISOString()),
                updatedAt: new Date(series.timestamps?.updated || new Date().toISOString())
              };
              await enhancedStorageService.saveSeries(uiSeries);
            }
          } else {
            // For older backup format, extract series from book references
            console.log('Extracting series from book references');
            const seriesMap = new Map();
            for (const book of restoreResult.books) {
              if (book.isPartOfSeries && book.seriesId) {
                if (!seriesMap.has(book.seriesId)) {
                  seriesMap.set(book.seriesId, {
                    id: book.seriesId,
                    name: book._legacySeriesName || `Series ${seriesMap.size + 1}`,
                    author: book.author || '',
                    description: '',
                    books: [],
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    genre: book.genre || [],
                    status: 'ongoing',
                    readingOrder: 'publication'
                  });
                }
                const series = seriesMap.get(book.seriesId);
                if (!series.books.includes(book.id)) {
                  series.books.push(book.id);
                }
              }
            }
            console.log(`Extracted ${seriesMap.size} series from book references`);
            for (const series of seriesMap.values()) {
              await enhancedStorageService.saveSeries(series);
            }
          }

          // If this is an enhanced backup with collections, restore them
          if (restoreResult.isEnhancedFormat && restoreResult.collections && restoreResult.collections.length > 0) {
            console.log(`Restoring ${restoreResult.collections.length} collections from backup`);
            for (const collection of restoreResult.collections) {
              const uiCollection = {
                ...collection,
                createdAt: new Date(collection.createdAt || new Date().toISOString()),
                updatedAt: new Date(collection.updatedAt || new Date().toISOString())
              };
              await enhancedStorageService.saveCollection(uiCollection);
            }
          }

          // Replace the current book collection with the restored books
          updateBooks(restoreResult.books);

          toast({
            title: "Restore Successful",
            description: restoreResult.message
          });

          // Force page refresh so all views reflect the restored data
          setTimeout(() => window.location.reload(), 500);
        } catch (saveError) {
          console.error('Error saving restored data to IndexedDB:', saveError);
          toast({
            title: "Restore Partial Success",
            description: `Data restored but may not appear in all views. Please refresh the page. Error: ${saveError instanceof Error ? saveError.message : String(saveError)}`,
            variant: "destructive"
          });
        }
      } else {
        toast({
          title: "Restore Failed",
          description: "The backup file doesn't contain any valid books.",
          variant: "destructive"
        });
      }

      return Promise.resolve();
    } catch (error) {
      console.error('Backup restore error:', error);
      toast({
        title: "Restore Error",
        description: `Error restoring backup: ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive"
      });
      return Promise.reject(error);
    }
  }, [toast, updateBooks]);

  /** All the props needed by the <Settings /> component */
  const settingsProps = {
    isOpen: showSettings,
    onClose: () => setShowSettings(false),
    books,
    onDeleteLibrary,
    onResetLibrary,
    onImportCSV,
    onImportJSON,
    onCreateBackup,
    onRestoreBackup,
  };

  return {
    showSettings,
    setShowSettings,
    books,
    setBooks: updateBooks,
    settingsProps,
    // Expose individual actions if pages need them directly
    onDeleteLibrary,
    onResetLibrary,
    onImportCSV,
    onImportJSON,
    onCreateBackup,
    onRestoreBackup,
  };
}
