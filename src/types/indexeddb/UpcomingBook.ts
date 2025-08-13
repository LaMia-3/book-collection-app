/**
 * Enhanced UpcomingBook model for IndexedDB storage
 */

export interface UpcomingBook {
  // Primary key
  id: string;
  
  // Core metadata
  title: string;
  author?: string;
  
  // Series relationship (indexed for queries)
  seriesId: string;
  seriesName: string;
  volumeNumber?: number;
  
  // Release information (optimized for date filtering)
  expectedReleaseDate?: string; // ISO date string
  releaseDateConfidence: 'confirmed' | 'estimated' | 'tentative'; // New field
  
  // Pre-order information
  preOrderAvailable: boolean; // New field
  preOrderLink?: string;
  
  // Enhanced metadata
  synopsis?: string;
  coverImageUrl?: string;
  publisher?: string; // New field
  
  // Notification settings
  notifyOnRelease: boolean; // New field
  reminderDaysBeforeRelease: number; // New field: default 7
  
  // Tracking
  dateAdded: string; // When the upcoming book was added
  lastChecked: string; // New field: when release info was last checked
  source: 'publisher-announcement' | 'api' | 'user-contributed' | 'other'; // New field
  
  // Legacy field
  isUserContributed: boolean;
  amazonProductId?: string;
}

/**
 * Upcoming book summary for list views
 */
export interface UpcomingBookSummary {
  id: string;
  title: string;
  author?: string;
  seriesId: string;
  seriesName: string;
  expectedReleaseDate?: string;
  daysUntilRelease?: number;
  preOrderAvailable: boolean;
  coverImageUrl?: string;
}
