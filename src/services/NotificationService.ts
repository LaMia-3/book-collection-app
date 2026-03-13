import { Notification, NotificationType } from '@/types/notification';
import { notificationRepository } from '@/repositories/NotificationRepository';
import { upcomingReleasesService } from '@/services/UpcomingReleasesService';

/**
 * Service for managing notifications
 */
export class NotificationService {
  /**
   * Get all notifications
   */
  async getAllNotifications(): Promise<Notification[]> {
    return notificationRepository.getAll();
  }
  
  /**
   * Get all unread notifications
   */
  async getUnreadNotifications(): Promise<Notification[]> {
    return notificationRepository.getUnread();
  }
  
  /**
   * Get notifications by type
   */
  async getNotificationsByType(type: NotificationType): Promise<Notification[]> {
    return notificationRepository.getByType(type);
  }
  
  /**
   * Add a new notification
   */
  async addNotification(notification: Omit<Notification, 'id' | 'createdAt' | 'isRead' | 'isDismissed'>): Promise<Notification> {
    return notificationRepository.add(notification);
  }
  
  /**
   * Mark a notification as read
   */
  async markAsRead(id: string): Promise<Notification | null> {
    return notificationRepository.markAsRead(id);
  }
  
  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<number> {
    return notificationRepository.markAllAsRead();
  }
  
  /**
   * Dismiss a notification
   */
  async dismissNotification(id: string): Promise<Notification | null> {
    return notificationRepository.dismiss(id);
  }
  
  /**
   * Delete a notification
   */
  async deleteNotification(id: string): Promise<boolean> {
    return notificationRepository.delete(id);
  }
  
  /**
   * Clear all notifications
   */
  async clearAllNotifications(): Promise<number> {
    return notificationRepository.clearAll();
  }
  
  /**
   * Clean up old notifications
   */
  async cleanupOldNotifications(daysToKeep: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    return notificationRepository.clearOlderThan(cutoffDate);
  }

  async checkForUpcomingReleases(): Promise<number> {
    return upcomingReleasesService.checkAllTrackedSeries();
  }
  
}

// Export a singleton instance
export const notificationService = new NotificationService();
