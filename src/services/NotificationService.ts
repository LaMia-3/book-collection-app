import { Notification, NotificationType } from '@/types/notification';
import { notificationRepository } from '@/repositories/NotificationRepository';
import { upcomingReleasesService } from '@/services/UpcomingReleasesService';

/**
 * Service for managing notifications and scheduled checks
 */
export class NotificationService {
  private checkInterval: number | null = null;
  
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
  
  /**
   * Start periodic checking for upcoming releases
   */
  startPeriodicChecks(intervalMinutes: number = 60): void {
    if (this.checkInterval !== null) {
      this.stopPeriodicChecks();
    }
    
    // Convert minutes to milliseconds
    const intervalMs = intervalMinutes * 60 * 1000;
    
    this.checkInterval = window.setInterval(() => {
      this.checkForUpcomingReleases();
    }, intervalMs);
    
    // Initial check
    this.checkForUpcomingReleases();
    
    console.log(`Started periodic checks every ${intervalMinutes} minutes`);
  }
  
  /**
   * Stop periodic checking
   */
  stopPeriodicChecks(): void {
    if (this.checkInterval !== null) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log('Stopped periodic checks');
    }
  }
  
  /**
   * Check for upcoming releases and create notifications
   */
  async checkForUpcomingReleases(): Promise<void> {
    try {
      console.log('Checking for upcoming releases...');
      
      // Check for releases coming in the next 30 days
      const upcomingReleases = await upcomingReleasesService.getUpcomingReleasesInDays(30);
      
      // Create notifications for releases that are coming soon
      for (const release of upcomingReleases) {
        if (!release.expectedReleaseDate) continue;
        
        const releaseDate = new Date(release.expectedReleaseDate);
        const now = new Date();
        const daysUntilRelease = Math.ceil((releaseDate.getTime() - now.getTime()) / (1000 * 3600 * 24));
        
        // Create notifications for specific milestones
        if (daysUntilRelease === 30 || daysUntilRelease === 14 || daysUntilRelease === 7 || daysUntilRelease === 1) {
          // Check if we already have a notification for this milestone
          const existingNotifications = await notificationRepository.getAll();
          const alreadyNotified = existingNotifications.some(n => 
            n.bookId === release.id && 
            n.message.includes(`${daysUntilRelease} day`)
          );
          
          if (!alreadyNotified) {
            // Create new notification
            await notificationRepository.add({
              title: `Upcoming Release: ${release.title}`,
              message: daysUntilRelease === 1 
                ? `${release.title} by ${release.author} will be released tomorrow!` 
                : `${release.title} by ${release.author} will be released in ${daysUntilRelease} days.`,
              type: 'release',
              seriesId: release.seriesId,
              bookId: release.id,
              actionUrl: release.preOrderLink
            });
            
            console.log(`Created notification for ${release.title} releasing in ${daysUntilRelease} days`);
          }
        }
        
        // For releases that have just passed
        if (daysUntilRelease === 0 || (daysUntilRelease < 0 && daysUntilRelease > -7)) {
          // Check if we already have a release day notification
          const existingNotifications = await notificationRepository.getAll();
          const alreadyNotified = existingNotifications.some(n => 
            n.bookId === release.id && 
            (n.message.includes('released today') || n.message.includes('now available'))
          );
          
          if (!alreadyNotified) {
            // Create release day notification
            await notificationRepository.add({
              title: `New Release: ${release.title}`,
              message: daysUntilRelease === 0 
                ? `${release.title} by ${release.author} is released today!` 
                : `${release.title} by ${release.author} is now available!`,
              type: 'release',
              seriesId: release.seriesId,
              bookId: release.id,
              actionUrl: release.preOrderLink
            });
            
            console.log(`Created release day notification for ${release.title}`);
          }
        }
      }
      
      console.log('Finished checking for upcoming releases');
    } catch (error) {
      console.error('Error checking for upcoming releases:', error);
    }
  }
  
  /**
   * Force a refresh of all tracked series
   */
  async refreshAllTrackedSeries(): Promise<number> {
    try {
      return await upcomingReleasesService.checkAllTrackedSeries();
    } catch (error) {
      console.error('Error refreshing tracked series:', error);
      return 0;
    }
  }
}

// Export a singleton instance
export const notificationService = new NotificationService();
