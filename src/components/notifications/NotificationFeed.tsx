import React, { useState, useEffect } from 'react';
import { Notification } from '@/types/notification';
import { NotificationCard } from './NotificationCard';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { CheckSquare, Bell, Settings, Trash } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { notificationService } from '@/services/NotificationService';

interface NotificationFeedProps {
  onClose: () => void;
}

/**
 * Component for displaying notification feed
 */
export const NotificationFeed = ({ onClose }: NotificationFeedProps) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('unread');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Count unread notifications
  const unreadCount = notifications.filter(n => !n.isRead).length;
  
  // Load notifications from the real notification service
  useEffect(() => {
    const loadNotifications = async () => {
      setIsLoading(true);
      
      try {
        // Use the notification service to get all notifications
        const allNotifications = await notificationService.getAllNotifications();
        setNotifications(allNotifications);
        
        // If we have no notifications, trigger a check for upcoming releases
        // This will populate notifications if there are upcoming book releases
        if (allNotifications.length === 0) {
          console.log('No notifications found, checking for upcoming releases');
          await notificationService.checkForUpcomingReleases();
          
          // Fetch notifications again after the check
          const updatedNotifications = await notificationService.getAllNotifications();
          setNotifications(updatedNotifications);
        }
      } catch (error) {
        console.error("Error loading notifications:", error);
        setNotifications([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadNotifications();
  }, []);
  
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
    if (unreadCount === 0) return;
    
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
  
  // Filter notifications based on active tab
  const filteredNotifications = notifications.filter(notification => 
    activeTab === 'all' || !notification.isRead
  );
  
  return (
    <div className="w-full max-w-sm bg-background border rounded-lg shadow-lg overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          <h2 className="font-medium">Notifications</h2>
          {unreadCount > 0 && (
            <span className="bg-primary text-primary-foreground text-xs rounded-full px-2 py-0.5">
              {unreadCount}
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
      
      <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)} className="w-full">
        <div className="px-2 pt-2">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="unread" className="text-sm">
              Unread ({unreadCount})
            </TabsTrigger>
            <TabsTrigger value="all" className="text-sm">
              All ({notifications.length})
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
            <TabsContent value="unread" className="mt-0">
              {filteredNotifications.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-muted-foreground">No unread notifications</p>
                </div>
              ) : (
                <>
                  <div className="p-2 border-b">
                    <Button variant="ghost" size="sm" className="w-full flex justify-center gap-2 h-8 text-xs" onClick={handleMarkAllAsRead}>
                      <CheckSquare className="h-3.5 w-3.5" />
                      Mark all as read
                    </Button>
                  </div>
                  <div className="h-[300px] overflow-hidden">
                    <ScrollArea className="h-full pr-2">
                      <div className="p-2 space-y-2">
                        {filteredNotifications.map(notification => (
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
            
            <TabsContent value="all" className="mt-0">
              {notifications.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-muted-foreground">No notifications</p>
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
