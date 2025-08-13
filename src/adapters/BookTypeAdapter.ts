/**
 * BookTypeAdapter.ts
 * 
 * This file contains adapter functions to convert between UI Book types and
 * IndexedDB Book types, resolving type mismatches and inconsistencies.
 */

import { Book as UIBook } from '@/types/book';
import { Book as ModelBook, ReadingStatus } from '@/types/models/Book';

export interface DBBook {
  id: string;
  title: string;
  author: string;
  genre?: string;
  description?: string;
  publishedDate?: string;
  pageCount?: number;
  thumbnail?: string;
  googleBooksId?: string;
  openLibraryId?: string;
  
  // Status is a string in DB, not an enum
  status?: string;
  completedDate?: string;
  rating?: number;
  notes?: string;
  
  // Series fields
  isPartOfSeries?: boolean;
  seriesId?: string;
  volumeNumber?: number;
  seriesPosition?: number;
  _legacySeriesName?: string;
  _legacyNextBookTitle?: string;
  _legacyNextBookExpectedYear?: number;
  
  // Display properties
  spineColor: number;
  addedDate: string;
  
  // IndexedDB specific fields
  dateAdded: string;
  dateCompleted?: string;
  lastModified: string;
  syncStatus: string;
  progress: number;
}

/**
 * Converts a Book from IndexedDB format to UI format
 * Resolves status string to enum values and handles date conversions
 */
export function convertDbBookToUiBook(dbBook: DBBook): UIBook {
  return {
    ...dbBook,
    // Convert string status to appropriate format for UI
    status: mapDbStatusToUiStatus(dbBook.status),
    // Ensure isPartOfSeries is defined (required in UIBook)
    isPartOfSeries: dbBook.isPartOfSeries || false,
    // Use addedDate if present, otherwise use dateAdded
    addedDate: dbBook.addedDate || dbBook.dateAdded
  };
}

/**
 * Converts a Book from UI format to IndexedDB format
 * Resolves enum values to string statuses and handles date conversions
 */
export function convertUiBookToDbBook(uiBook: UIBook): DBBook {
  const now = new Date().toISOString();
  
  return {
    ...uiBook,
    // Convert status to string format for DB
    status: mapUiStatusToDbStatus(uiBook.status),
    // Add required DB fields
    dateAdded: uiBook.addedDate || now,
    dateCompleted: uiBook.completedDate || undefined,
    lastModified: now,
    syncStatus: 'local',
    progress: 0, // Default progress value
  };
}

/**
 * Maps IndexedDB string status to UI status format
 */
function mapDbStatusToUiStatus(status?: string): UIBook['status'] {
  if (!status) return undefined;
  
  // Convert DB status to UI status
  switch (status.toLowerCase()) {
    case 'reading':
    case 'reading':
      return 'reading';
    case 'completed':
    case 'completed':
      return 'completed';
    case 'to_read':
    case 'want-to-read':
      return 'want-to-read';
    default:
      return 'want-to-read'; // Default status
  }
}

/**
 * Maps UI status format to IndexedDB string status
 */
function mapUiStatusToDbStatus(status?: UIBook['status']): string {
  if (!status) return 'want-to-read';
  
  // Convert UI status to DB status
  return status;
}

/**
 * Converts a Book from IndexedDB format to Model Book format
 * Used for components that expect the Model Book type with ReadingStatus enum
 */
export function convertDbBookToModelBook(dbBook: DBBook): ModelBook {
  return {
    ...dbBook,
    // Convert string status to ReadingStatus enum
    status: mapDbStatusToEnumStatus(dbBook.status),
    // Handle other conversions if needed
  } as ModelBook;
}

/**
 * Converts a Model Book to IndexedDB format
 */
export function convertModelBookToDbBook(modelBook: ModelBook): DBBook {
  const now = new Date().toISOString();
  
  return {
    ...modelBook,
    // Convert ReadingStatus enum to string
    status: mapEnumStatusToDbStatus(modelBook.status),
    // Ensure required DB fields
    dateAdded: modelBook.addedDate || now,
    dateCompleted: modelBook.completedDate || undefined,
    lastModified: now,
    syncStatus: 'local',
    progress: 0,
  };
}

/**
 * Maps IndexedDB string status to ReadingStatus enum
 */
function mapDbStatusToEnumStatus(status?: string): ReadingStatus | undefined {
  if (!status) return undefined;
  
  switch (status.toLowerCase()) {
    case 'reading':
      return ReadingStatus.READING;
    case 'completed':
      return ReadingStatus.COMPLETED;
    case 'want-to-read':
    case 'to_read':
      return ReadingStatus.TO_READ;
    case 'dnf':
      return ReadingStatus.DNF;
    case 'on-hold':
    case 'on_hold':
      return ReadingStatus.ON_HOLD;
    default:
      return ReadingStatus.TO_READ;
  }
}

/**
 * Maps ReadingStatus enum to IndexedDB string status
 */
function mapEnumStatusToDbStatus(status?: ReadingStatus): string {
  if (!status) return 'want-to-read';
  
  switch (status) {
    case ReadingStatus.READING:
      return 'reading';
    case ReadingStatus.COMPLETED:
      return 'completed';
    case ReadingStatus.TO_READ:
      return 'want-to-read';
    case ReadingStatus.DNF:
      return 'dnf';
    case ReadingStatus.ON_HOLD:
      return 'on-hold';
    default:
      return 'want-to-read';
  }
}
