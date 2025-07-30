import React from 'react';
import { Link } from 'react-router-dom';
import { Notification } from '@/types/notification';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarClock, X, Check, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NotificationCardProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onDismiss: (id: string) => void;
}

/**
 * Card component for displaying a notification in the notification feed
 */
export const NotificationCard = ({ 
  notification, 
  onMarkAsRead, 
  onDismiss 
}: NotificationCardProps) => {
  // Format the date
  const formatDate = (date: Date | string) => {
    if (!date) return "";
    
    const releaseDate = new Date(date);
    const now = new Date();
    
    // If the date is today
    if (releaseDate.toDateString() === now.toDateString()) {
      return "today";
    }
    
    // If the date is tomorrow
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    if (releaseDate.toDateString() === tomorrow.toDateString()) {
      return "tomorrow";
    }
    
    // If the date is within the next 7 days
    const oneWeek = new Date(now);
    oneWeek.setDate(now.getDate() + 7);
    if (releaseDate < oneWeek) {
      const days = Math.ceil((releaseDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return `in ${days} days`;
    }
    
    // Otherwise format as date
    return releaseDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: now.getFullYear() !== releaseDate.getFullYear() ? 'numeric' : undefined
    });
  };
  
  // Calculate time ago
  const timeAgo = (date: Date | string) => {
    if (!date) return "";
    
    const now = new Date();
    const createdDate = new Date(date);
    const seconds = Math.floor((now.getTime() - createdDate.getTime()) / 1000);
    
    let interval = seconds / 31536000; // years
    if (interval > 1) {
      return Math.floor(interval) + " years ago";
    }
    
    interval = seconds / 2592000; // months
    if (interval > 1) {
      return Math.floor(interval) + " months ago";
    }
    
    interval = seconds / 86400; // days
    if (interval > 1) {
      return Math.floor(interval) + " days ago";
    }
    
    interval = seconds / 3600; // hours
    if (interval > 1) {
      return Math.floor(interval) + " hours ago";
    }
    
    interval = seconds / 60; // minutes
    if (interval > 1) {
      return Math.floor(interval) + " minutes ago";
    }
    
    return "just now";
  };
  
  return (
    <Card className={cn(
      "transition-colors duration-200 hover:bg-accent/5",
      notification.isRead && "opacity-70 bg-background"
    )}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-1">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/15 text-accent">
              <CalendarClock className="h-4 w-4" />
            </span>
          </div>
          
          <div className="flex-grow">
            <div className="flex items-start justify-between">
              <div>
                <h3 className={cn(
                  "font-medium mb-1",
                  notification.isRead ? "text-foreground/80" : "text-foreground"
                )}>
                  {notification.title}
                </h3>
                <p className={cn(
                  "text-sm mb-3",
                  notification.isRead ? "text-muted-foreground/80" : "text-muted-foreground"
                )}>
                  {notification.message}
                </p>
              </div>
              
              <div className="flex-shrink-0 flex">
                {!notification.isRead && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => onMarkAsRead(notification.id)}
                    title="Mark as read"
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                )}
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => onDismiss(notification.id)}
                  title="Dismiss"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="flex items-center gap-3 mt-2">
              {notification.type === 'release' && (
                <Badge variant="secondary" className="whitespace-nowrap text-xs">
                  {notification.actionUrl && 'Available now'}
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">
                {timeAgo(notification.createdAt)}
              </span>
            </div>
            
            {notification.seriesId && (
              <div className="mt-3">
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/series/${notification.seriesId}`} className="flex items-center gap-1">
                    <BookOpen className="h-3.5 w-3.5" />
                    View Series
                  </Link>
                </Button>
              </div>
            )}
            {notification.actionUrl && !notification.seriesId && (
              <div className="mt-3">
                <Button variant="outline" size="sm" asChild>
                  <a href={notification.actionUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1">
                    <BookOpen className="h-3.5 w-3.5" />
                    View Book
                  </a>
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
