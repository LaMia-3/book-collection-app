import React from 'react';
import { ExternalLink, Megaphone, Check, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SystemAnnouncementRecord } from '@/lib/apiClient';
import { cn } from '@/lib/utils';

interface AppUpdateCardProps {
  announcement: SystemAnnouncementRecord;
  onMarkAsRead: (id: string) => void;
  onDismiss: (id: string) => void;
}

const severityAccentClassNames: Record<SystemAnnouncementRecord['severity'], string> = {
  info: 'bg-sky-500/15 text-sky-300',
  success: 'bg-emerald-500/15 text-emerald-300',
  warning: 'bg-amber-500/15 text-amber-300',
  critical: 'bg-rose-500/15 text-rose-300',
};

const timeAgo = (date: string) => {
  const now = new Date();
  const createdDate = new Date(date);
  const seconds = Math.floor((now.getTime() - createdDate.getTime()) / 1000);

  let interval = seconds / 31536000;
  if (interval > 1) return `${Math.floor(interval)} years ago`;

  interval = seconds / 2592000;
  if (interval > 1) return `${Math.floor(interval)} months ago`;

  interval = seconds / 86400;
  if (interval > 1) return `${Math.floor(interval)} days ago`;

  interval = seconds / 3600;
  if (interval > 1) return `${Math.floor(interval)} hours ago`;

  interval = seconds / 60;
  if (interval > 1) return `${Math.floor(interval)} minutes ago`;

  return 'just now';
};

export const AppUpdateCard = ({
  announcement,
  onMarkAsRead,
  onDismiss,
}: AppUpdateCardProps) => {
  return (
    <Card
      className={cn(
        'transition-colors duration-200 hover:bg-accent/5',
        announcement.isSeen && 'opacity-75 bg-background',
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="mt-1 flex-shrink-0">
            <span
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full',
                severityAccentClassNames[announcement.severity],
              )}
            >
              <Megaphone className="h-4 w-4" />
            </span>
          </div>

          <div className="flex-grow">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <h3
                    className={cn(
                      'font-medium',
                      announcement.isSeen ? 'text-foreground/80' : 'text-foreground',
                    )}
                  >
                    {announcement.title}
                  </h3>
                  {!announcement.isSeen ? (
                    <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                      New
                    </Badge>
                  ) : null}
                </div>
                <p
                  className={cn(
                    'text-sm mb-3',
                    announcement.isSeen
                      ? 'text-muted-foreground/80'
                      : 'text-muted-foreground',
                  )}
                >
                  {announcement.body}
                </p>
              </div>

              <div className="flex flex-shrink-0">
                {!announcement.isSeen ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => onMarkAsRead(announcement.id)}
                    title="Mark as read"
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                ) : null}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => onDismiss(announcement.id)}
                  title="Dismiss"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="mt-2 flex items-center gap-3">
              <Badge variant="secondary" className="whitespace-nowrap text-xs">
                App Update
              </Badge>
              <span className="text-xs text-muted-foreground">
                {timeAgo(announcement.createdAt)}
              </span>
            </div>

            {announcement.ctaLabel && announcement.ctaUrl ? (
              <div className="mt-3">
                <Button variant="outline" size="sm" asChild>
                  <a
                    href={announcement.ctaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    {announcement.ctaLabel}
                  </a>
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
