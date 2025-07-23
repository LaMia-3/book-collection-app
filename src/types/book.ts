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
  
  // User tracking fields
  status?: 'reading' | 'completed' | 'want-to-read'; // Track reading status
  completedDate?: string;
  rating?: number; // 1-5 stars
  notes?: string;
  isPartOfSeries?: boolean;
  seriesName?: string;
  nextBookTitle?: string;
  nextBookExpectedYear?: number;
  
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