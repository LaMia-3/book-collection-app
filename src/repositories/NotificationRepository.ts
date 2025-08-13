import { Notification, NotificationType } from '@/types/notification';
import { DatabaseService } from '@/services/DatabaseService';
import { v4 as uuidv4 } from 'uuid';

/**
 * Repository for managing notifications in the database
 */
export class NotificationRepository {
  private readonly dbService: DatabaseService;
  private readonly storeName = 'notifications';
  
  constructor(dbService: DatabaseService) {
    this.dbService = dbService;
  }
  
  /**
   * Get all notifications
   */
  async getAll(): Promise<Notification[]> {
    return this.dbService.getAll<Notification>(this.storeName);
  }
  
  /**
   * Get a notification by ID
   */
  async getById(id: string): Promise<Notification | null> {
    return this.dbService.getById<Notification>(this.storeName, id);
  }
  
  /**
   * Get all unread notifications
   */
  async getUnread(): Promise<Notification[]> {
    const allNotifications = await this.getAll();
    return allNotifications.filter(notification => !notification.isRead);
  }
  
  /**
   * Get notifications by type
   */
  async getByType(type: NotificationType): Promise<Notification[]> {
    const allNotifications = await this.getAll();
    return allNotifications.filter(notification => notification.type === type);
  }
  
  /**
   * Get notifications related to a specific series
   */
  async getBySeriesId(seriesId: string): Promise<Notification[]> {
    const allNotifications = await this.getAll();
    return allNotifications.filter(notification => 
      notification.seriesId === seriesId
    );
  }
  
  /**
   * Add a new notification
   */
  async add(notification: Omit<Notification, 'id' | 'createdAt' | 'isRead' | 'isDismissed'>): Promise<Notification> {
    const now = new Date();
    
    const newNotification: Notification = {
      id: `notification-${uuidv4()}`,
      ...notification,
      createdAt: now,
      isRead: false,
      isDismissed: false
    };
    
    await this.dbService.add(this.storeName, newNotification);
    return newNotification;
  }
  
  /**
   * Mark a notification as read
   */
  async markAsRead(id: string): Promise<Notification | null> {
    const notification = await this.getById(id);
    if (!notification) return null;
    
    const updatedNotification: Notification = {
      ...notification,
      isRead: true
    };
    
    await this.dbService.update(this.storeName, id, updatedNotification);
    return updatedNotification;
  }
  
  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<number> {
    const unreadNotifications = await this.getUnread();
    
    for (const notification of unreadNotifications) {
      await this.markAsRead(notification.id);
    }
    
    return unreadNotifications.length;
  }
  
  /**
   * Dismiss a notification (hide without deleting)
   */
  async dismiss(id: string): Promise<Notification | null> {
    const notification = await this.getById(id);
    if (!notification) return null;
    
    const updatedNotification: Notification = {
      ...notification,
      isDismissed: true
    };
    
    await this.dbService.update(this.storeName, id, updatedNotification);
    return updatedNotification;
  }
  
  /**
   * Delete a notification
   */
  async delete(id: string): Promise<boolean> {
    return this.dbService.delete(this.storeName, id);
  }
  
  /**
   * Clear all notifications
   */
  async clearAll(): Promise<number> {
    const allNotifications = await this.getAll();
    
    for (const notification of allNotifications) {
      await this.delete(notification.id);
    }
    
    return allNotifications.length;
  }
  
  /**
   * Clear notifications older than a specific date
   */
  async clearOlderThan(date: Date): Promise<number> {
    const allNotifications = await this.getAll();
    const oldNotifications = allNotifications.filter(notification => 
      notification.createdAt < date
    );
    
    for (const notification of oldNotifications) {
      await this.delete(notification.id);
    }
    
    return oldNotifications.length;
  }
}

// Export a singleton instance
export const notificationRepository = new NotificationRepository(new DatabaseService());
