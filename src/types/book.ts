export interface Book {
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
  
  // User tracking fields
  status?: 'reading' | 'completed' | 'want-to-read'; // Track reading status
  completedDate?: string;
  rating?: number; // 1-5 stars
  notes?: string;
  
  // Series fields - enhanced for new series feature
  isPartOfSeries: boolean;
  seriesId?: string; // Link to Series object
  volumeNumber?: number; // Position in the series (legacy)
  seriesPosition?: number; // Position in the series (used by enhanced storage)
  
  // Legacy series fields - maintained for data migration
  _legacySeriesName?: string; // Renamed from seriesName
  _legacyNextBookTitle?: string; // Renamed from nextBookTitle
  _legacyNextBookExpectedYear?: number; // Renamed from nextBookExpectedYear
  
  // Display properties
  spineColor: number; // 1-8 for different colors
  addedDate: string;
}

export interface GoogleBooksResponse {
  items?: GoogleBookItem[];
  totalItems: number;
}

export interface GoogleBookItem {
  id: string;
  volumeInfo: {
    title: string;
    authors?: string[];
    categories?: string[];
    description?: string;
    publishedDate?: string;
    pageCount?: number;
    imageLinks?: {
      thumbnail?: string;
      smallThumbnail?: string;
    };
  };
}