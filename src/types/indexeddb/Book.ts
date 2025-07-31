/**
 * Enhanced Book model for IndexedDB storage
 */
import { ReadingStatus } from '../models/Book';

export interface Book {
  // Core identifiers
  id: string;
  title: string;
  author: string;
  
  // Basic book information
  genre?: string;
  description?: string;
  publishedDate?: string;
  pageCount?: number;
  thumbnail?: string;
  
  // API source information
  sourceId?: string;  // ID from external API (Google Books, Open Library)
  sourceType?: 'google' | 'openlib' | 'manual'; // Source of the book data
  
  // Enhanced reading tracking
  status?: ReadingStatus;
  progress: number;  // New field: reading progress as decimal 0-1
  startedDate?: string;
  dateCompleted?: string; // Renamed from completedDate for consistency
  rating?: number; // 1-5 stars
  notes?: string;
  highlights?: Array<{  // New field: for storing text highlights/quotes
    text: string;
    page?: number;
    chapter?: string;
    createdAt: string;
  }>;
  
  // Enhanced series information
  isPartOfSeries?: boolean;
  seriesId?: string; // Explicit link to series
  seriesName?: string;
  seriesPosition?: number; // Explicit position in series
  
  // Display properties
  spineColor: number; // 1-8 for different colors
  customSpineColor?: string; // Optional custom color
  dateAdded: string; // Renamed from addedDate for consistency
  
  // Tags and custom organization
  tags?: string[];
  shelf?: string;
  favorite?: boolean;
  
  // Enhanced metadata
  isbn?: string;
  language?: string;
  publisher?: string;
  format?: string; // hardcover, paperback, ebook, etc.
  
  // Sync metadata
  lastModified: string; // New field: timestamp of last modification
  syncStatus: 'synced' | 'pending' | 'error'; // New field for tracking sync state
}

/**
 * Book summary data for list views (lighter weight)
 */
export interface BookSummary {
  id: string;
  title: string;
  author: string;
  genre?: string;
  thumbnail?: string;
  rating?: number;
  status?: ReadingStatus;
  progress?: number; // New field
  spineColor: number;
  dateAdded: string;
  dateCompleted?: string;
  favorite?: boolean;
  isPartOfSeries?: boolean;
  seriesId?: string;
  seriesPosition?: number;
}

/**
 * Extended book detail with additional information
 */
export interface BookDetail extends Book {
  similarBooks?: BookSummary[];
  seriesBooks?: BookSummary[];
}
