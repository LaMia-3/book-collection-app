import React, { useState, useEffect } from 'react';
import { Notification } from '@/types/notification';
import { NotificationCard } from './NotificationCard';
import { AppUpdateCard } from './AppUpdateCard';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { CheckSquare, Bell, Settings, Trash } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { notificationService } from '@/services/NotificationService';
import { ApiClientError, authApi, SystemAnnouncementRecord } from '@/lib/apiClient';
import { useAuth } from '@/hooks/useAuth';

interface NotificationFeedProps {
  onClose: () => void;
}

/**
 * Component for displaying notification feed
 */
export const NotificationFeed = ({ onClose }: NotificationFeedProps) => {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'app-updates' | 'book-alerts'>('book-alerts');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [announcements, setAnnouncements] = useState<SystemAnnouncementRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const unreadBookAlertsCount = notifications.filter(n => !n.isRead).length;
  const unreadAppUpdatesCount = announcements.filter(a => !a.isSeen).length;
  
  useEffect(() => {
    const loadNotificationData = async () => {
      setIsLoading(true);
      
      try {
        const [allNotifications, activeAnnouncements] = await Promise.all([
          notificationService.getAllNotifications(),
          isAuthenticated ? authApi.getSystemAnnouncements() : Promise.resolve([]),
        ]);

        setNotifications(allNotifications);
        setAnnouncements(activeAnnouncements);
        
        if (allNotifications.length === 0) {
          await notificationService.checkForUpcomingReleases();
          const updatedNotifications = await notificationService.getAllNotifications();
          setNotifications(updatedNotifications);
        }

        if (activeAnnouncements.some((announcement) => !announcement.isSeen)) {
          setActiveTab('app-updates');
        } else {
          setActiveTab('book-alerts');
        }
      } catch (error) {
        console.error("Error loading notifications:", error);
        setNotifications([]);
        setAnnouncements([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    void loadNotificationData();
  }, [isAuthenticated]);
  
  // Mark notification as read
  const handleMarkAsRead = async (id: string) => {
    try {
      const updatedNotification = await notificationService.markAsRead(id);
      if (updatedNotification) {
        // Update local state
        setNotifications(prevNotifications => 
          prevNotifications.map(notification => 
            notification.id === id ? { ...notification, isRead: true } : notification
          )
        );
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };
  
  // Mark all as read
  const handleMarkAllAsRead = async () => {
    if (unreadBookAlertsCount === 0) return;
    
    try {
      const markedCount = await notificationService.markAllAsRead();
      
      // Update local state
      setNotifications(prevNotifications => 
        prevNotifications.map(notification => ({
          ...notification,
          isRead: true
        }))
      );
      
      toast({
        title: "All notifications marked as read",
        description: `${markedCount} notifications marked as read`
      });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  const handleMarkAnnouncementAsRead = async (id: string) => {
    try {
      await authApi.markSystemAnnouncementSeen(id);
      setAnnouncements((currentAnnouncements) =>
        currentAnnouncements.map((announcement) =>
          announcement.id === id
            ? { ...announcement, isSeen: true }
            : announcement,
        ),
      );
    } catch (error) {
      console.error("Error marking announcement as read:", error);
      toast({
        variant: 'destructive',
        title: 'Unable to mark app update as read',
        description:
          error instanceof ApiClientError
            ? error.message
            : 'The app update could not be updated.',
      });
    }
  };

  const handleDismissAnnouncement = async (id: string) => {
    try {
      await authApi.dismissSystemAnnouncement(id);
      setAnnouncements((currentAnnouncements) =>
        currentAnnouncements.filter((announcement) => announcement.id !== id),
      );
    } catch (error) {
      console.error("Error dismissing announcement:", error);
      toast({
        variant: 'destructive',
        title: 'Unable to dismiss app update',
        description:
          error instanceof ApiClientError
            ? error.message
            : 'The app update could not be dismissed.',
      });
    }
  };

  const handleMarkAllAnnouncementsAsRead = async () => {
    if (unreadAppUpdatesCount === 0) return;

    try {
      await Promise.all(
        announcements
          .filter((announcement) => !announcement.isSeen)
          .map((announcement) => authApi.markSystemAnnouncementSeen(announcement.id)),
      );

      setAnnouncements((currentAnnouncements) =>
        currentAnnouncements.map((announcement) => ({
          ...announcement,
          isSeen: true,
        })),
      );

      toast({
        title: 'All app updates marked as read',
        description: `${unreadAppUpdatesCount} updates marked as read`,
      });
    } catch (error) {
      console.error("Error marking all announcements as read:", error);
      toast({
        variant: 'destructive',
        title: 'Unable to update app updates',
        description:
          error instanceof ApiClientError
            ? error.message
            : 'App update state could not be updated.',
      });
    }
  };
  
  // Dismiss notification
  const handleDismiss = async (id: string) => {
    try {
      const dismissed = await notificationService.dismissNotification(id);
      if (dismissed) {
        // Update local state
        setNotifications(prevNotifications => 
          prevNotifications.map(notification => 
            notification.id === id ? { ...notification, isDismissed: true } : notification
          )
        );
      }
    } catch (error) {
      console.error("Error dismissing notification:", error);
    }
  };
  
  // Clear all notifications
  const handleClearAll = async () => {
    if (notifications.length === 0) return;
    
    try {
      const clearedCount = await notificationService.clearAllNotifications();
      
      // Update local state
      setNotifications([]);
      
      toast({
        title: "Notifications cleared",
        description: `${clearedCount} notifications removed`
      });
    } catch (error) {
      console.error("Error clearing notifications:", error);
    }
  };
  
  return (
    <div className="w-[26rem] max-w-[calc(100vw-1.5rem)] bg-background border rounded-lg shadow-lg overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          <h2 className="font-medium">Notifications</h2>
          {unreadBookAlertsCount + unreadAppUpdatesCount > 0 && (
            <span className="bg-primary text-primary-foreground text-xs rounded-full px-2 py-0.5">
              {unreadBookAlertsCount + unreadAppUpdatesCount}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" asChild>
            <a href="#" title="Settings" onClick={(e) => {
              e.preventDefault();
              toast({
                title: "Settings",
                description: "Notification settings will be implemented in the next phase."
              });
            }}>
              <Settings className="h-4 w-4" />
            </a>
          </Button>
          
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onClose} title="Close">
            <Trash className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'app-updates' | 'book-alerts')} className="w-full">
        <div className="px-2 pt-2">
          <TabsList className="grid h-auto w-full grid-cols-2 gap-1">
            <TabsTrigger
              value="app-updates"
              className="min-w-0 whitespace-normal px-3 py-2 text-center text-sm leading-tight"
            >
              App Updates ({announcements.length})
            </TabsTrigger>
            <TabsTrigger
              value="book-alerts"
              className="min-w-0 whitespace-normal px-3 py-2 text-center text-sm leading-tight"
            >
              Book Alerts ({notifications.length})
            </TabsTrigger>
          </TabsList>
        </div>
        
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-muted"></div>
                  <div className="flex-grow space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                    <div className="h-8 bg-muted rounded w-1/3 mt-2"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <TabsContent value="app-updates" className="mt-0">
              {announcements.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-muted-foreground">No app updates</p>
                </div>
              ) : (
                <>
                  <div className="p-2 border-b">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full flex justify-center gap-2 h-8 text-xs"
                      onClick={handleMarkAllAnnouncementsAsRead}
                    >
                      <CheckSquare className="h-3.5 w-3.5" />
                      Mark all as read
                    </Button>
                  </div>
                  <div className="h-[300px] overflow-hidden">
                    <ScrollArea className="h-full pr-2">
                      <div className="p-2 space-y-2">
                        {announcements.map((announcement) => (
                          <AppUpdateCard
                            key={announcement.id}
                            announcement={announcement}
                            onMarkAsRead={handleMarkAnnouncementAsRead}
                            onDismiss={handleDismissAnnouncement}
                          />
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </>
              )}
            </TabsContent>
            
            <TabsContent value="book-alerts" className="mt-0">
              {notifications.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-muted-foreground">No book alerts yet</p>
                  <p className="mt-2 text-xs text-muted-foreground/80">
                    Book alerts will be expanded in a later phase.
                  </p>
                </div>
              ) : (
                <>
                  <div className="p-2 border-b">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full flex justify-center gap-2 h-8 text-xs"
                      onClick={handleClearAll}
                    >
                      <Trash className="h-3.5 w-3.5" />
                      Clear all notifications
                    </Button>
                  </div>
                  <div className="border-b px-4 py-2 text-xs text-muted-foreground/80">
                    Book alerts will be expanded in a later phase.
                  </div>
                  <div className="h-[300px] overflow-hidden">
                    <ScrollArea className="h-full pr-2">
                      <div className="p-2 space-y-2">
                        {notifications.map(notification => (
                          <NotificationCard
                            key={notification.id}
                            notification={notification}
                            onMarkAsRead={handleMarkAsRead}
                            onDismiss={handleDismiss}
                          />
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </>
              )}
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
};
