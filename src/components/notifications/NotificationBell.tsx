import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { NotificationFeed } from './NotificationFeed';
import { Bell } from 'lucide-react';
import { notificationService } from '@/services/NotificationService';
import { authApi } from '@/lib/apiClient';
import { useAuth } from '@/hooks/useAuth';

/**
 * Notification bell with count badge for the header
 */
export const NotificationBell = () => {
  const { isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const bellRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const countUnreadNotifications = async () => {
      try {
        const [unreadNotifications, announcements] = await Promise.all([
          notificationService.getUnreadNotifications(),
          isAuthenticated ? authApi.getSystemAnnouncements() : Promise.resolve([]),
        ]);

        setUnreadCount(
          unreadNotifications.length +
            announcements.filter((announcement) => !announcement.isSeen).length,
        );
      } catch (error) {
        console.error("Error counting notifications:", error);
        setUnreadCount(0);
      }
    };
    
    // Initial count
    countUnreadNotifications();
    
    // Set up interval to check periodically (e.g., every 60 seconds)
    const intervalId = setInterval(countUnreadNotifications, 60000);
    
    // Clean up
    return () => {
      clearInterval(intervalId);
    };
  }, [isAuthenticated]);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Toggle notification feed
  const handleToggle = () => {
    setIsOpen(!isOpen);
  };
  
  // Handle closing the notification feed
  const handleClose = () => {
    setIsOpen(false);
  };
  
  return (
    <div className="relative" ref={bellRef}>
      <Button
        variant="ghost"
        size="sm"
        className="relative inline-flex items-center gap-2 rounded-md px-3"
        onClick={handleToggle}
        title="Notifications"
      >
        <Bell className="h-5 w-5" />
        <span className="hidden md:inline">Notifications</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 z-50">
          <NotificationFeed onClose={handleClose} />
        </div>
      )}
    </div>
  );
};
