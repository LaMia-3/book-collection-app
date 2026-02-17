/**
 * BookTypeAdapter.ts
 * 
 * This file contains adapter functions to convert between UI Book types and
 * IndexedDB Book types, resolving type mismatches and inconsistencies.
 */

import { Book as UIBook } from '@/types/book';
import { Book as ModelBook, ReadingStatus } from '@/types/models/Book';
import { normalizeGenreData } from '@/utils/genreUtils';

export interface DBBook {
  id: string;
  title: string;
  author: string;
  genre?: string | string[];
  description?: string;
  publishedDate?: string;
  pageCount?: number;
  thumbnail?: string;
  googleBooksId?: string;
  openLibraryId?: string;
  
  // API source tracking fields
  sourceId?: string;
  sourceType?: 'google' | 'openlib' | 'manual';
  
  // ISBN fields - stored as arrays
  isbn10?: string[];
  isbn13?: string[];
  
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
 * Type guard to check if a genre value is an array
 * @param genre The genre value to check
 * @returns true if the genre is an array, false otherwise
 */
export function isGenreArray(genre: string | string[] | null | undefined): genre is string[] {
  return Array.isArray(genre);
}

/**
 * Converts a Book from IndexedDB format to UI format
 * Resolves status string to enum values and handles date conversions
 */
export function convertDbBookToUiBook(dbBook: DBBook): UIBook {
  // Process genre to ensure it's in array format
  let genreArray: string[] = [];
  if (typeof dbBook.genre === 'string') {
    genreArray = normalizeGenreData(dbBook.genre);
  } else if (Array.isArray(dbBook.genre)) {
    genreArray = dbBook.genre;
  }
  
  // Explicitly map fields instead of spreading to prevent DB-only fields
  // (dateAdded, lastModified, syncStatus, etc.) leaking into UI objects
  return {
    id: dbBook.id,
    title: dbBook.title,
    author: dbBook.author,
    genre: genreArray,
    description: dbBook.description,
    publishedDate: dbBook.publishedDate,
    pageCount: dbBook.pageCount,
    thumbnail: dbBook.thumbnail,
    googleBooksId: dbBook.googleBooksId,
    openLibraryId: dbBook.openLibraryId,
    sourceId: dbBook.sourceId,
    sourceType: dbBook.sourceType,
    isbn10: dbBook.isbn10,
    isbn13: dbBook.isbn13,
    status: mapDbStatusToUiStatus(dbBook.status),
    completedDate: dbBook.dateCompleted || dbBook.completedDate,
    rating: dbBook.rating,
    notes: dbBook.notes,
    progress: dbBook.progress,
    isPartOfSeries: dbBook.isPartOfSeries || false,
    seriesId: dbBook.seriesId,
    volumeNumber: dbBook.volumeNumber,
    seriesPosition: dbBook.seriesPosition,
    collectionIds: (dbBook as any).collectionIds,
    _legacySeriesName: dbBook._legacySeriesName,
    _legacyNextBookTitle: dbBook._legacyNextBookTitle,
    _legacyNextBookExpectedYear: dbBook._legacyNextBookExpectedYear,
    spineColor: dbBook.spineColor,
    addedDate: dbBook.addedDate || dbBook.dateAdded,
  };
}

/**
 * Converts a Book from UI format to IndexedDB format
 * Resolves enum values to string statuses and handles date conversions
 */
export function convertUiBookToDbBook(uiBook: UIBook): DBBook {
  const now = new Date().toISOString();
  
  // Process genre to ensure it's in array format for DB storage
  let genre: string[] = [];
  if (typeof uiBook.genre === 'string') {
    genre = normalizeGenreData(uiBook.genre);
  } else if (Array.isArray(uiBook.genre)) {
    genre = uiBook.genre;
  } else if (uiBook.genre === undefined || uiBook.genre === null) {
    genre = [];
  }
  
  // Explicitly map fields instead of spreading to prevent property accumulation
  // across UI/DB conversion cycles that can cause OOM errors
  return {
    id: uiBook.id,
    title: uiBook.title,
    author: uiBook.author,
    genre,
    description: uiBook.description,
    publishedDate: uiBook.publishedDate,
    pageCount: uiBook.pageCount,
    thumbnail: uiBook.thumbnail,
    googleBooksId: uiBook.googleBooksId,
    openLibraryId: uiBook.openLibraryId,
    sourceId: uiBook.sourceId,
    sourceType: uiBook.sourceType,
    isbn10: uiBook.isbn10,
    isbn13: uiBook.isbn13,
    status: mapUiStatusToDbStatus(uiBook.status),
    completedDate: uiBook.completedDate,
    rating: uiBook.rating,
    notes: uiBook.notes,
    isPartOfSeries: uiBook.isPartOfSeries,
    seriesId: uiBook.seriesId,
    volumeNumber: uiBook.volumeNumber,
    seriesPosition: uiBook.seriesPosition,
    _legacySeriesName: uiBook._legacySeriesName,
    _legacyNextBookTitle: uiBook._legacyNextBookTitle,
    _legacyNextBookExpectedYear: uiBook._legacyNextBookExpectedYear,
    spineColor: uiBook.spineColor,
    addedDate: uiBook.addedDate,
    // DB-specific fields
    dateAdded: uiBook.addedDate || now,
    dateCompleted: uiBook.completedDate || undefined,
    lastModified: now,
    syncStatus: 'local',
    progress: uiBook.progress || 0,
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
      return 'reading';
    case 'completed':
      return 'completed';
    case 'to_read':
    case 'want-to-read':
      return 'want-to-read';
    case 'dnf':
      return 'dnf';
    case 'on_hold':
    case 'on-hold':
      return 'on-hold';
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
  switch (status) {
    case 'on-hold':
      return 'on_hold';
    default:
      return status;
  }
}

/**
 * Converts a Book from IndexedDB format to Model Book format
 * Used for components that expect the Model Book type with ReadingStatus enum
 */
export function convertDbBookToModelBook(dbBook: DBBook): ModelBook {
  // Process genre to ensure it's in array format
  let genreArray: string[] = [];
  if (typeof dbBook.genre === 'string') {
    genreArray = normalizeGenreData(dbBook.genre);
  } else if (Array.isArray(dbBook.genre)) {
    genreArray = dbBook.genre;
  }
  
  return {
    ...dbBook,
    // Convert string status to ReadingStatus enum
    status: mapDbStatusToEnumStatus(dbBook.status),
    // Ensure genre is always in array format
    genre: genreArray,
  } as ModelBook;
}

/**
 * Converts a Model Book to IndexedDB format
 */
export function convertModelBookToDbBook(modelBook: ModelBook): DBBook {
  const now = new Date().toISOString();
  
  // Process genre to ensure it's in array format
  let genre: string[] = [];
  if (typeof modelBook.genre === 'string') {
    genre = normalizeGenreData(modelBook.genre);
  } else if (Array.isArray(modelBook.genre)) {
    genre = modelBook.genre;
  }
  
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
    // Store genre as array
    genre,
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
