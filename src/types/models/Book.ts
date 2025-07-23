/**
 * Core Book model representing a book in the collection
 */
export interface Book {
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
  
  // User tracking fields
  status?: ReadingStatus;
  completedDate?: string;
  startedDate?: string;
  rating?: number; // 1-5 stars
  notes?: string;
  
  // Series information
  isPartOfSeries?: boolean;
  seriesName?: string;
  seriesPosition?: number;
  nextBookTitle?: string;
  nextBookId?: string;
  nextBookExpectedYear?: number;
  
  // Display properties
  spineColor: number; // 1-8 for different colors
  customSpineColor?: string; // Optional custom color
  addedDate: string;
  
  // Tags and custom organization
  tags?: string[];
  shelf?: string;
  favorite?: boolean;
  
  // Enhanced metadata
  isbn?: string;
  language?: string;
  publisher?: string;
  format?: string; // hardcover, paperback, ebook, etc.
}

/**
 * Reading status of a book
 */
export enum ReadingStatus {
  TO_READ = 'TO_READ',
  READING = 'READING',
  COMPLETED = 'COMPLETED',
  DNF = 'DNF',           // Did Not Finish
  ON_HOLD = 'ON_HOLD'
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
  spineColor: number;
  addedDate: string;
  completedDate?: string;
  favorite?: boolean;
}

/**
 * Extended book detail with additional information
 */
export interface BookDetail extends Book {
  similarBooks?: BookSummary[];
  seriesBooks?: BookSummary[];
}
