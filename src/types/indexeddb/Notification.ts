/**
 * Enhanced Notification model for IndexedDB storage
 */

export type NotificationType = 
  | 'upcoming_release' 
  | 'series_update' 
  | 'reading_reminder'
  | 'system';

export type NotificationPriority = 'low' | 'medium' | 'high';

export type NotificationStatus = 'unread' | 'read' | 'dismissed';

export type RelatedItemType = 'book' | 'series' | 'upcomingBook';

/**
 * Enhanced Notification model with improved categorization and status tracking
 */
export interface Notification {
  // Primary key
  id: string;
  
  // Notification metadata (indexed for queries)
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  
  // Timing information
  createdAt: string; // ISO date string
  expiresAt?: string; // ISO date string
  actionDate?: string; // ISO date string: when action should be taken
  
  // Related entity references
  relatedItemId?: string;
  relatedItemType?: RelatedItemType;
  
  // Status tracking
  status: NotificationStatus;
  readAt?: string; // ISO date string
  actionTaken: boolean;
  
  // UI presentation
  icon?: string; // Icon name (e.g., 'calendar', 'book')
  actionText?: string; // Text for action button
  actionUrl?: string; // URL or deep link for action
}

/**
 * Notification summary for list views
 */
export interface NotificationSummary {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  createdAt: string;
  status: NotificationStatus;
  icon?: string;
  relatedItemType?: RelatedItemType;
}
