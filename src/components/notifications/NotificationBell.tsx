import React, { useState, useEffect, useRef } from 'react';
import { ReleaseNotification } from '@/types/series';
import { Button } from '@/components/ui/button';
import { NotificationFeed } from './NotificationFeed';
import { Bell } from 'lucide-react';

/**
 * Notification bell with count badge for the header
 */
export const NotificationBell = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const bellRef = useRef<HTMLDivElement>(null);
  
  // Load and count unread notifications
  useEffect(() => {
    const countUnreadNotifications = () => {
      try {
        // In a real app, this might be an API call
        // For now, we'll check localStorage
        const savedNotifications = localStorage.getItem("releaseNotifications");
        if (savedNotifications) {
          const parsedNotifications = JSON.parse(savedNotifications) as ReleaseNotification[];
          const count = parsedNotifications.filter(n => !n.isRead).length;
          setUnreadCount(count);
        } else {
          setUnreadCount(0);
        }
      } catch (error) {
        console.error("Error counting notifications:", error);
        setUnreadCount(0);
      }
    };
    
    // Initial count
    countUnreadNotifications();
    
    // Set up interval to check periodically (e.g., every 60 seconds)
    const intervalId = setInterval(countUnreadNotifications, 60000);
    
    // Set up event listener for storage changes (in case notifications are updated in another tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "releaseNotifications") {
        countUnreadNotifications();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Clean up
    return () => {
      clearInterval(intervalId);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);
  
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
        size="icon"
        className="relative rounded-full"
        onClick={handleToggle}
        title="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
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
