/**
 * Types of notifications in the system
 */
export type NotificationType = 'release' | 'system' | 'update' | 'alert';

/**
 * Notification interface
 */
export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  createdAt: Date;
  isRead: boolean;
  isDismissed: boolean;
  seriesId?: string;
  bookId?: string;
  actionUrl?: string;
}
