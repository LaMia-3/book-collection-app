/**
 * SeriesTypeAdapter.ts
 * 
 * This file contains adapter functions to convert between UI Series types and
 * IndexedDB Series types, resolving type mismatches and inconsistencies.
 */

import { Series as UISeries } from '@/types/series';
import { Series as IndexedDBSeries } from '@/types/indexeddb/Series';

// Define the interface for Series in the database
export interface DBSeries {
  id: string;
  name: string;
  description?: string;
  author?: string;
  books: string[];
  coverImage?: string;
  genre?: string | string[];
  status?: string;
  totalBooks?: number;
  readingOrder: 'publication' | 'chronological' | 'custom';
  customOrder?: string[];
  isTracked: boolean;
  hasUpcoming?: boolean;
  
  // IndexedDB specific fields
  dateAdded: string;
  lastModified: string;
  readingProgress?: number;
  completedBooks?: number;
}

/**
 * Converts a Series from IndexedDB format to UI format
 */
export function convertDbSeriesToUiSeries(dbSeries: DBSeries): UISeries {
  return {
    ...dbSeries,
    // Convert dates to Date objects
    createdAt: new Date(dbSeries.dateAdded),
    updatedAt: new Date(dbSeries.lastModified)
  } as UISeries;
}

/**
 * Converts a Series from UI format to IndexedDB format
 */
export function convertUiSeriesToDbSeries(uiSeries: UISeries): DBSeries {
  const now = new Date().toISOString();
  
  return {
    ...uiSeries,
    // Convert Date objects to strings
    dateAdded: uiSeries.createdAt ? uiSeries.createdAt.toISOString() : now,
    lastModified: uiSeries.updatedAt ? uiSeries.updatedAt.toISOString() : now,
    readingProgress: 0,
    completedBooks: 0,
    // Ensure required fields
    readingOrder: uiSeries.readingOrder || 'publication',
    isTracked: uiSeries.isTracked || false,
    books: uiSeries.books || []
  } as DBSeries;
}
