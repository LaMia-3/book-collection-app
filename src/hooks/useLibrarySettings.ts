import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useSettings } from '@/contexts/SettingsContext';
import { useAuth } from '@/hooks/useAuth';
import { Book } from '@/types/book';
import { notifyStorageReset } from '@/services/storage/CacheResetListener';
import type { Collection } from '@/types/collection';
import type { Series } from '@/types/series';

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

const LEGACY_LOCAL_STORAGE_KEYS = [
  'bookLibrary',
  'seriesLibrary',
  'upcomingBooks',
  'releaseNotifications',
  'seriesCache',
  'seriesMapping',
  'seriesAssignments',
  'seriesMetadata',
  'collections',
  'mira_books',
  'mira_collections',
] as const;

const clearLegacyLocalStorage = () => {
  for (const key of LEGACY_LOCAL_STORAGE_KEYS) {
    localStorage.removeItem(key);
  }
};

const clearIndexedDBStoreIfExists = async (dbName: string, storeName: string) => {
  try {
    await clearIndexedDBStore(dbName, storeName);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (
      message.includes('does not exist') ||
      message.includes('Failed to open database')
    ) {
      return;
    }

    throw error;
  }
};

const clearAllClientLibraryData = async () => {
  const storesByDatabase = {
    'book-collection-db': ['books', 'series', 'collections', 'upcomingReleases', 'notifications'],
    bookCollectionDb: ['books', 'series', 'collections', 'upcomingReleases', 'notifications'],
  } as const;

  for (const [dbName, stores] of Object.entries(storesByDatabase)) {
    for (const storeName of stores) {
      await clearIndexedDBStoreIfExists(dbName, storeName);
    }
  }

  clearLegacyLocalStorage();
  notifyStorageReset();
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
  const { deleteAccount, isAuthenticated, logout } = useAuth();
  const [showSettings, setShowSettings] = useState(false);
  const [internalBooks, setInternalBooks] = useState<Book[]>([]);
  const onLibraryCleared = options.onLibraryCleared;

  // Decide which books state to use
  const books = options.externalBooks ?? internalBooks;
  const rawSetBooks = options.externalSetBooks ?? setInternalBooks;

  const updateBooks = useCallback((newBooks: Book[]) => {
    rawSetBooks(newBooks);
  }, [rawSetBooks]);

  const reloadBooksFromRepository = useCallback(async () => {
    const { bookRepository } = await import('@/repositories/BookRepository');
    const currentBooks = await bookRepository.getAll();
    updateBooks(currentBooks);
    return currentBooks;
  }, [updateBooks]);

  const upsertBooks = useCallback(async (importedBooks: Book[]) => {
    const { bookRepository } = await import('@/repositories/BookRepository');

    for (const book of importedBooks) {
      const existingBook = await bookRepository.getById(book.id);

      if (existingBook) {
        await bookRepository.update(book.id, book);
      } else {
        await bookRepository.create(book);
      }
    }
  }, []);

  const upsertSeries = useCallback(async (seriesItems: Series[]) => {
    const { seriesRepository } = await import('@/repositories/SeriesRepository');

    for (const series of seriesItems) {
      const existingSeries = await seriesRepository.getById(series.id);

      if (existingSeries) {
        await seriesRepository.update(series.id, series);
      } else {
        await seriesRepository.add(series);
      }
    }
  }, []);

  const upsertCollections = useCallback(async (collectionItems: Collection[]) => {
    const { collectionRepository } = await import('@/repositories/CollectionRepository');

    for (const collection of collectionItems) {
      const existingCollection = await collectionRepository.getById(collection.id);

      if (existingCollection) {
        await collectionRepository.update(collection.id, {
          name: collection.name,
          description: collection.description,
          bookIds: collection.bookIds,
          color: collection.color,
          imageUrl: collection.imageUrl,
        });
      } else {
        await collectionRepository.add(collection);
      }
    }
  }, []);

  const onDeleteLibrary = useCallback(async () => {
    try {
      const [
        { bookRepository },
        { seriesRepository },
        { collectionRepository },
        { notificationRepository },
      ] = await Promise.all([
        import('@/repositories/BookRepository'),
        import('@/repositories/SeriesRepository'),
        import('@/repositories/CollectionRepository'),
        import('@/repositories/NotificationRepository'),
      ]);

      const [booksToDelete, collections, seriesList, notifications] = await Promise.all([
        bookRepository.getAll(),
        collectionRepository.getAll(),
        seriesRepository.getAll(),
        notificationRepository.getAll(),
      ]);

      const deletedBookIds = new Set(booksToDelete.map((book) => book.id));

      for (const collection of collections) {
        await collectionRepository.update(collection.id, {
          bookIds: [],
        });
      }

      for (const series of seriesList) {
        await seriesRepository.update(series.id, {
          books: [],
          customOrder: [],
        });
      }

      for (const notification of notifications) {
        if (notification.bookId && deletedBookIds.has(notification.bookId)) {
          await notificationRepository.delete(notification.id);
        }
      }

      for (const book of booksToDelete) {
        await bookRepository.delete(book.id);
      }

      if (isAuthenticated) {
        await clearAllClientLibraryData();
      } else {
        clearLegacyLocalStorage();
      }

      // Update UI state
      updateBooks([]);
      onLibraryCleared?.();

      toast({
        title: "Library Deleted",
        description: isAuthenticated
          ? "All books were deleted from this account library. Series and collections were preserved, and this device cache was cleared."
          : "All local books were deleted. Series and collections were preserved."
      });

      // Force page refresh so all views reflect the cleared state
      setTimeout(() => window.location.reload(), 1000);

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
  }, [isAuthenticated, onLibraryCleared, toast, updateBooks]);

  const onResetLibrary = useCallback(async () => {
    try {
      const [
        { bookRepository },
        { seriesRepository },
        { collectionRepository },
        { upcomingReleasesRepository },
        { notificationRepository },
      ] = await Promise.all([
        import('@/repositories/BookRepository'),
        import('@/repositories/SeriesRepository'),
        import('@/repositories/CollectionRepository'),
        import('@/repositories/UpcomingReleasesRepository'),
        import('@/repositories/NotificationRepository'),
      ]);

      const [booksToDelete, seriesList, collections, upcomingReleases] = await Promise.all([
        bookRepository.getAll(),
        seriesRepository.getAll(),
        collectionRepository.getAll(),
        upcomingReleasesRepository.getAll(),
      ]);

      for (const notification of await notificationRepository.getAll()) {
        await notificationRepository.delete(notification.id);
      }

      for (const upcomingRelease of upcomingReleases) {
        await upcomingReleasesRepository.delete(upcomingRelease.id);
      }

      for (const collection of collections) {
        await collectionRepository.delete(collection.id);
      }

      for (const series of seriesList) {
        await seriesRepository.delete(series.id);
      }

      for (const book of booksToDelete) {
        await bookRepository.delete(book.id);
      }

      await clearAllClientLibraryData();

      // Update UI state
      updateBooks([]);
      onLibraryCleared?.();

      toast({
        title: "Library Reset Complete",
        description: isAuthenticated
          ? "This account library was reset. Books, series, collections, upcoming releases, and notifications were removed."
          : "Your local library was reset. Books, series, collections, upcoming releases, and notifications were removed."
      });

      // Force page refresh so all views reflect the cleared state
      setTimeout(() => window.location.reload(), 1000);

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
  }, [isAuthenticated, onLibraryCleared, toast, updateBooks]);

  const onDeleteAccount = useCallback(async () => {
    try {
      if (isAuthenticated) {
        await deleteAccount();
      }

      await clearAllClientLibraryData();
      updateBooks([]);
      onLibraryCleared?.();
      logout();

      toast({
        title: "Account Deleted",
        description: "Your account and all associated data were permanently deleted.",
      });

      setTimeout(() => {
        window.location.assign('/login');
      }, 250);

      return Promise.resolve();
    } catch (error) {
      console.error('Error deleting account:', error);
      toast({
        title: "Error",
        description: `Failed to delete account: ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive",
      });
      return Promise.reject(error);
    }
  }, [deleteAccount, isAuthenticated, logout, onLibraryCleared, toast, updateBooks]);

  const onImportCSV = useCallback(async (file: File) => {
    try {
      const { importFromCSV } = await import('@/utils/importUtils');
      const importResult = await importFromCSV(file);

      if (importResult.successful.length > 0) {
        try {
          await upsertBooks(importResult.successful);
          await reloadBooksFromRepository();

          toast({
            title: "Import Successful",
            description: `${importResult.successful.length} books were imported into your ${isAuthenticated ? 'account library' : 'local library'}. ${importResult.failed.length > 0 ? `${importResult.failed.length} failed.` : ''}`
          });

          // Force page refresh so all views reflect the imported data
          setTimeout(() => window.location.reload(), 1000);
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
  }, [isAuthenticated, reloadBooksFromRepository, toast, upsertBooks]);

  const onImportJSON = useCallback(async (file: File) => {
    try {
      const { importFromJSON } = await import('@/utils/importUtils');
      const importResult = await importFromJSON(file);

      if (importResult.successful.length > 0) {
        try {
          await upsertBooks(importResult.successful);
          await reloadBooksFromRepository();

          toast({
            title: "Import Successful",
            description: `${importResult.successful.length} books were imported into your ${isAuthenticated ? 'account library' : 'local library'}. ${importResult.failed.length > 0 ? `${importResult.failed.length} failed.` : ''}`
          });

          // Force page refresh so all views reflect the imported data
          setTimeout(() => window.location.reload(), 1000);
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
  }, [isAuthenticated, reloadBooksFromRepository, toast, upsertBooks]);

  const onCreateBackup = useCallback(async () => {
    try {
      const { createBackup } = await import('@/utils/backupUtils');
      const [
        { bookRepository },
        { seriesRepository },
        { collectionRepository },
      ] = await Promise.all([
        import('@/repositories/BookRepository'),
        import('@/repositories/SeriesRepository'),
        import('@/repositories/CollectionRepository'),
      ]);

      const [exportBooks, exportSeries, exportCollections] = await Promise.all([
        bookRepository.getAll(),
        seriesRepository.getAll(),
        collectionRepository.getAll(),
      ]);

      const preferredName = settings?.preferredName;
      await createBackup(exportBooks, preferredName, {
        series: exportSeries,
        collections: exportCollections,
        appVersion: '2.0.0',
        storageScope: isAuthenticated ? 'remote-account' : 'local-browser',
      });

      toast({
        title: "Backup Created",
        description: `Successfully created a backup from your ${isAuthenticated ? 'account library' : 'local library'} with ${exportBooks.length} books.`
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
  }, [isAuthenticated, settings?.preferredName, toast]);

  const onRestoreBackup = useCallback(async (file: File) => {
    try {
      const { restoreFromBackup } = await import('@/utils/backupUtils');
      const restoreResult = await restoreFromBackup(file);

      if (restoreResult.success && restoreResult.books.length > 0) {
        try {
          await upsertBooks(restoreResult.books);

          if (restoreResult.isEnhancedFormat && restoreResult.series && restoreResult.series.length > 0) {
            const normalizedSeries = restoreResult.series.map((series) => ({
              ...series,
              createdAt: new Date(series.timestamps?.created || new Date().toISOString()),
              updatedAt: new Date(series.timestamps?.updated || new Date().toISOString()),
            }));
            await upsertSeries(normalizedSeries as Series[]);
          }

          if (restoreResult.isEnhancedFormat && restoreResult.collections && restoreResult.collections.length > 0) {
            const normalizedCollections = restoreResult.collections.map((collection) => ({
              ...collection,
              createdAt: new Date(collection.createdAt || new Date().toISOString()),
              updatedAt: new Date(collection.updatedAt || new Date().toISOString()),
            }));
            await upsertCollections(normalizedCollections as Collection[]);
          }

          await reloadBooksFromRepository();

          toast({
            title: "Restore Successful",
            description: `${restoreResult.message} Data was restored into your ${isAuthenticated ? 'account library' : 'local library'}.`
          });

          // Force page refresh so all views reflect the restored data
          setTimeout(() => window.location.reload(), 1000);
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
  }, [isAuthenticated, reloadBooksFromRepository, toast, upsertBooks, upsertCollections, upsertSeries]);

  /** All the props needed by the <Settings /> component */
  const settingsProps = {
    isOpen: showSettings,
    onClose: () => setShowSettings(false),
    books,
    onDeleteAccount,
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
    onDeleteAccount,
    onResetLibrary,
    onImportCSV,
    onImportJSON,
    onCreateBackup,
    onRestoreBackup,
  };
}
