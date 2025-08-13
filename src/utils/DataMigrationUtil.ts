/**
 * DataMigrationUtil.ts
 * 
 * Utility to migrate data from localStorage to IndexedDB.
 * This is used as a one-time migration to ensure all existing data is properly stored in IndexedDB
 * as the app transitions to using IndexedDB as the exclusive source of truth.
 */

import { enhancedStorageService } from '@/services/storage/EnhancedStorageService';
import { Book } from '@/types/indexeddb/Book';
import { Series } from '@/types/indexeddb/Series';

interface MigrationReport {
  booksFound: number;
  booksMigrated: number;
  seriesFound: number;
  seriesMigrated: number;
  errors: string[];
}

/**
 * Migrates all data from localStorage to IndexedDB
 * @returns A report of the migration process
 */
export async function migrateDataToIndexedDB(): Promise<MigrationReport> {
  console.log('Starting migration from localStorage to IndexedDB...');
  const report: MigrationReport = {
    booksFound: 0,
    booksMigrated: 0,
    seriesFound: 0,
    seriesMigrated: 0,
    errors: []
  };

  try {
    // Initialize the storage service
    await enhancedStorageService.initialize();

    // Migrate books
    await migrateBooks(report);

    // Migrate series
    await migrateSeries(report);

    console.log('Migration complete!', report);
    return report;
  } catch (error) {
    const errorMessage = `Migration failed: ${error instanceof Error ? error.message : String(error)}`;
    console.error(errorMessage);
    report.errors.push(errorMessage);
    return report;
  }
}

/**
 * Migrates books from localStorage to IndexedDB
 */
async function migrateBooks(report: MigrationReport): Promise<void> {
  try {
    // Check if there are books in localStorage
    const localStorageBooks = localStorage.getItem('bookLibrary');
    if (!localStorageBooks) {
      console.log('No books found in localStorage');
      return;
    }

    // Parse books from localStorage
    const books = JSON.parse(localStorageBooks);
    if (!Array.isArray(books) || books.length === 0) {
      console.log('No valid books array in localStorage');
      return;
    }

    report.booksFound = books.length;
    console.log(`Found ${books.length} books in localStorage`);

    // Get existing books from IndexedDB to avoid duplicates
    const existingBooks = await enhancedStorageService.getBooks();
    const existingBookIds = new Set(existingBooks.map(book => book.id));

    // Save books to IndexedDB
    for (const book of books) {
      try {
        // Skip if book already exists in IndexedDB
        if (existingBookIds.has(book.id)) {
          console.log(`Book ${book.id} already exists in IndexedDB, skipping...`);
          continue;
        }

        // Convert from localStorage format to IndexedDB format
        const indexedDBBook: Book = {
          ...book,
          // Ensure required fields are present
          dateAdded: book.addedDate || book.dateAdded || new Date().toISOString(),
          dateCompleted: book.completedDate || book.dateCompleted,
          lastModified: new Date().toISOString()
        };

        await enhancedStorageService.saveBook(indexedDBBook);
        report.booksMigrated++;
      } catch (error) {
        const errorMessage = `Failed to migrate book ${book.id}: ${error instanceof Error ? error.message : String(error)}`;
        console.error(errorMessage);
        report.errors.push(errorMessage);
      }
    }

    console.log(`Successfully migrated ${report.booksMigrated} books to IndexedDB`);
  } catch (error) {
    const errorMessage = `Error migrating books: ${error instanceof Error ? error.message : String(error)}`;
    console.error(errorMessage);
    report.errors.push(errorMessage);
  }
}

/**
 * Migrates series from localStorage to IndexedDB
 */
async function migrateSeries(report: MigrationReport): Promise<void> {
  try {
    // Check if there are series in localStorage
    const localStorageSeries = localStorage.getItem('seriesLibrary');
    if (!localStorageSeries) {
      console.log('No series found in localStorage');
      return;
    }

    // Parse series from localStorage
    const series = JSON.parse(localStorageSeries);
    if (!Array.isArray(series) || series.length === 0) {
      console.log('No valid series array in localStorage');
      return;
    }

    report.seriesFound = series.length;
    console.log(`Found ${series.length} series in localStorage`);

    // Get existing series from IndexedDB to avoid duplicates
    const existingSeries = await enhancedStorageService.getSeries();
    const existingSeriesIds = new Set(existingSeries.map(s => s.id));

    // Save series to IndexedDB
    for (const s of series) {
      try {
        // Skip if series already exists in IndexedDB
        if (existingSeriesIds.has(s.id)) {
          console.log(`Series ${s.id} already exists in IndexedDB, skipping...`);
          continue;
        }

        // Convert from localStorage format to IndexedDB format
        const indexedDBSeries: Series = {
          ...s,
          // Ensure required fields are present
          dateAdded: s.dateAdded || (s.createdAt ? new Date(s.createdAt).toISOString() : new Date().toISOString()),
          lastModified: s.lastModified || (s.updatedAt ? new Date(s.updatedAt).toISOString() : new Date().toISOString()),
          readingProgress: s.readingProgress ?? 0,
          completedBooks: s.completedBooks ?? 0,
          totalBooks: s.totalBooks ?? s.books?.length ?? 0
        };

        await enhancedStorageService.saveSeries(indexedDBSeries);
        report.seriesMigrated++;
      } catch (error) {
        const errorMessage = `Failed to migrate series ${s.id}: ${error instanceof Error ? error.message : String(error)}`;
        console.error(errorMessage);
        report.errors.push(errorMessage);
      }
    }

    console.log(`Successfully migrated ${report.seriesMigrated} series to IndexedDB`);
  } catch (error) {
    const errorMessage = `Error migrating series: ${error instanceof Error ? error.message : String(error)}`;
    console.error(errorMessage);
    report.errors.push(errorMessage);
  }
}

/**
 * Checks if migration is needed by comparing book counts in IndexedDB and localStorage
 */
export async function isMigrationNeeded(): Promise<boolean> {
  try {
    await enhancedStorageService.initialize();
    
    // Get count of books in IndexedDB
    const indexedDBBooks = await enhancedStorageService.getBooks();
    const indexedDBBooksCount = indexedDBBooks.length;
    
    // Get count of books in localStorage
    const localStorageBooks = localStorage.getItem('bookLibrary');
    if (!localStorageBooks) return false;
    
    const parsedBooks = JSON.parse(localStorageBooks);
    if (!Array.isArray(parsedBooks)) return false;
    
    const localStorageBooksCount = parsedBooks.length;
    
    // If there are books in localStorage but not in IndexedDB, migration is needed
    return localStorageBooksCount > 0 && indexedDBBooksCount === 0;
  } catch (error) {
    console.error('Error checking if migration is needed:', error);
    return false;
  }
}
