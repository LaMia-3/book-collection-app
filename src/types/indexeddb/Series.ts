/**
 * Enhanced Series model for IndexedDB storage
 */

export interface Series {
  // Core identifiers
  id: string;
  name: string;
  
  // Enhanced metadata
  description?: string;
  author?: string;
  coverImage?: string;
  categories?: string[]; // New field: renamed from genre for clarity
  startYear?: number; // New field: start year of the series
  endYear?: number; // New field: end year of the series (if completed)
  
  // Books relationship (optimized for queries)
  books: string[]; // Array of book IDs in the series
  totalBooks: number; // Total books in the series (may be more than user owns)
  completedBooks: number; // New field: number of books the user has read
  orderedBooks?: Array<{ // New field: explicit ordering with titles
    id: string;
    position: number;
    title: string;
  }>;
  
  // Reading order and status
  readingOrder: 'publication' | 'chronological' | 'custom';
  customOrder?: string[]; // Book IDs in custom order
  status?: 'ongoing' | 'completed' | 'cancelled';
  readingProgress: number; // New field: completion ratio (0-1)
  
  // Tracking information
  isTracked: boolean; // Whether the user is tracking this series for notifications
  hasUpcoming?: boolean; // Whether the series has upcoming releases
  apiEnriched?: boolean; // Whether the series data has been enriched with API data
  
  // Timestamps
  dateAdded: string; // New field: when the series was added
  lastModified: string; // New field: when the series was last updated
}

/**
 * Series with extended book information
 */
export interface SeriesWithBooks extends Series {
  booksData: Array<{
    id: string;
    title: string;
    author: string;
    status?: string;
    progress: number;
    seriesPosition?: number;
  }>;
}

/**
 * Series metadata for lightweight responses
 */
export interface SeriesMetadata {
  id: string;
  name: string;
  author?: string;
  totalBooks: number;
  completedBooks: number;
  readingProgress: number;
  isTracked: boolean;
  status?: 'ongoing' | 'completed' | 'cancelled';
  hasUpcoming?: boolean;
}

/**
 * Data required for creating a new series
 */
export interface SeriesCreationData {
  name: string;
  author?: string;
  description?: string;
  bookIds?: string[];
  isTracked?: boolean;
  categories?: string[];
}
