/**
 * Series data type definitions
 */

export interface Series {
  id: string;
  name: string;
  description?: string;
  author?: string;
  coverImage?: string;
  books: string[]; // Array of book IDs in the series
  totalBooks?: number; // Total books in the series (may be more than user owns)
  readingOrder: 'publication' | 'chronological' | 'custom';
  customOrder?: string[]; // Book IDs in custom order
  status?: 'ongoing' | 'completed' | 'cancelled';
  genre?: string[];
  isTracked: boolean; // Whether the user is tracking this series for notifications
  hasUpcoming?: boolean; // Whether the series has upcoming releases
  apiEnriched?: boolean; // Whether the series data has been enriched with API data
  createdAt: Date;
  updatedAt: Date;
}

export interface SeriesWithBooks extends Series {
  books: string[];
  booksRead: number; // Count of read books in the series
}

export interface UpcomingBook {
  id: string;
  title: string;
  seriesId: string;
  seriesName: string;
  volumeNumber?: number;
  author?: string;
  expectedReleaseDate?: Date;
  coverImageUrl?: string;
  preOrderLink?: string;
  synopsis?: string;
  isUserContributed: boolean;
  amazonProductId?: string;
}

export interface ReleaseNotification {
  id: string;
  upcomingBookId: string;
  seriesId: string;
  title: string;
  message: string;
  releaseDate: Date;
  isRead: boolean;
  createdAt: Date;
}

export interface SeriesProgress {
  seriesId: string;
  totalBooks: number;
  booksRead: number;
  percentage: number;
  status: 'not-started' | 'in-progress' | 'completed';
}

export interface SeriesCreationData {
  name: string;
  author?: string;
  description?: string;
  bookIds?: string[];
  isTracked?: boolean;
}
