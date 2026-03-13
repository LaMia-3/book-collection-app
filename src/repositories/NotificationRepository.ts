import { Notification, NotificationType } from '@/types/notification';
import { DatabaseService } from '@/services/DatabaseService';
import { v4 as uuidv4 } from 'uuid';
import { getStoredAuthToken } from '@/lib/auth-storage';
import { ApiClientError, notificationsApi, NotificationRecord } from '@/lib/apiClient';

const isAuthenticatedSession = (): boolean => Boolean(getStoredAuthToken());

const normalizeRemoteNotification = (
  notification: NotificationRecord,
): Notification => ({
  id: notification.id,
  title: notification.title,
  message: notification.message,
  type: notification.type,
  createdAt: new Date(notification.createdAt),
  isRead: notification.isRead,
  isDismissed: notification.isDismissed,
  seriesId: notification.seriesId,
  bookId: notification.bookId,
  actionUrl: notification.actionUrl,
});

const serializeNotification = (
  notification: Notification,
): NotificationRecord => ({
  id: notification.id,
  title: notification.title,
  message: notification.message,
  type: notification.type,
  createdAt: notification.createdAt.toISOString(),
  isRead: notification.isRead,
  isDismissed: notification.isDismissed,
  seriesId: notification.seriesId,
  bookId: notification.bookId,
  actionUrl: notification.actionUrl,
});

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
    if (isAuthenticatedSession()) {
      const notifications = await notificationsApi.getAll();
      return notifications.map(normalizeRemoteNotification);
    }

    return this.dbService.getAll<Notification>(this.storeName);
  }
  
  /**
   * Get a notification by ID
   */
  async getById(id: string): Promise<Notification | null> {
    if (isAuthenticatedSession()) {
      try {
        const notification = await notificationsApi.getById(id);
        return normalizeRemoteNotification(notification);
      } catch (error) {
        if (error instanceof ApiClientError && error.status === 404) {
          return null;
        }

        throw error;
      }
    }

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
  async add(
    notification: Omit<Notification, 'id' | 'createdAt' | 'isRead' | 'isDismissed'> & {
      id?: string;
      createdAt?: Date;
      isRead?: boolean;
      isDismissed?: boolean;
    },
  ): Promise<Notification> {
    const now = notification.createdAt || new Date();
    
    const newNotification: Notification = {
      id: notification.id || `notification-${uuidv4()}`,
      ...notification,
      createdAt: now,
      isRead: notification.isRead ?? false,
      isDismissed: notification.isDismissed ?? false
    };

    if (isAuthenticatedSession()) {
      const createdNotification = await notificationsApi.create(
        serializeNotification(newNotification),
      );
      return normalizeRemoteNotification(createdNotification);
    }
    
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

    if (isAuthenticatedSession()) {
      const remoteNotification = await notificationsApi.update(
        id,
        serializeNotification(updatedNotification),
      );
      return normalizeRemoteNotification(remoteNotification);
    }
    
    await this.dbService.update(this.storeName, id, updatedNotification);
    return updatedNotification;
  }

  async update(id: string, updates: Partial<Notification>): Promise<Notification | null> {
    const notification = await this.getById(id);
    if (!notification) return null;

    const updatedNotification: Notification = {
      ...notification,
      ...updates,
      id,
    };

    if (isAuthenticatedSession()) {
      const remoteNotification = await notificationsApi.update(
        id,
        serializeNotification(updatedNotification),
      );
      return normalizeRemoteNotification(remoteNotification);
    }

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

    if (isAuthenticatedSession()) {
      const remoteNotification = await notificationsApi.update(
        id,
        serializeNotification(updatedNotification),
      );
      return normalizeRemoteNotification(remoteNotification);
    }
    
    await this.dbService.update(this.storeName, id, updatedNotification);
    return updatedNotification;
  }
  
  /**
   * Delete a notification
   */
  async delete(id: string): Promise<boolean> {
    if (isAuthenticatedSession()) {
      const result = await notificationsApi.delete(id);
      return result.success;
    }

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
