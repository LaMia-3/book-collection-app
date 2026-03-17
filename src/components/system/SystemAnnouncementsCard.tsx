import { useEffect, useState } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { ApiClientError, authApi, SystemAnnouncementRecord } from "@/lib/apiClient";

const severityClassNames: Record<SystemAnnouncementRecord["severity"], string> = {
  info: "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-100",
  success: "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100",
  warning: "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100",
  critical: "border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-100",
};

export const SystemAnnouncementsCard = () => {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [announcements, setAnnouncements] = useState<SystemAnnouncementRecord[]>([]);
  const [isLoadingAnnouncements, setIsLoadingAnnouncements] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      setAnnouncements([]);
      setIsLoadingAnnouncements(false);
      return;
    }

    const loadAnnouncements = async () => {
      try {
        setIsLoadingAnnouncements(true);
        const nextAnnouncements = await authApi.getSystemAnnouncements();
        setAnnouncements(nextAnnouncements);
      } catch (error) {
        console.error("Error loading system announcements:", error);
        setAnnouncements([]);
      } finally {
        setIsLoadingAnnouncements(false);
      }
    };

    void loadAnnouncements();
  }, [isAuthenticated]);

  const handleMarkSeen = async (announcementId: string) => {
    try {
      await authApi.markSystemAnnouncementSeen(announcementId);
      setAnnouncements((currentAnnouncements) =>
        currentAnnouncements.map((announcement) =>
          announcement.id === announcementId
            ? { ...announcement, isSeen: true }
            : announcement,
        ),
      );
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Unable to mark announcement as read",
        description:
          error instanceof ApiClientError
            ? error.message
            : "System announcement state could not be updated.",
      });
    }
  };

  const handleDismiss = async (announcementId: string) => {
    try {
      await authApi.dismissSystemAnnouncement(announcementId);
      setAnnouncements((currentAnnouncements) =>
        currentAnnouncements.filter(
          (announcement) => announcement.id !== announcementId,
        ),
      );
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Unable to dismiss announcement",
        description:
          error instanceof ApiClientError
            ? error.message
            : "System announcement could not be dismissed.",
      });
    }
  };

  if (!isAuthenticated || (!isLoadingAnnouncements && announcements.length === 0)) {
    return null;
  }

  return (
    <Card className="mb-8 mx-4 shadow-elegant">
      <CardHeader>
        <CardTitle>What&apos;s New</CardTitle>
        <CardDescription>
          Product updates, maintenance notes, and other app-level announcements.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoadingAnnouncements ? (
          <p className="text-sm text-muted-foreground">Loading system announcements…</p>
        ) : (
          announcements.map((announcement) => (
            <div
              key={announcement.id}
              className={`rounded-lg border p-4 ${severityClassNames[announcement.severity]}`}
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{announcement.title}</h3>
                    {!announcement.isSeen ? (
                      <span className="rounded-full border px-2 py-0.5 text-xs font-medium">
                        New
                      </span>
                    ) : null}
                  </div>
                  <p className="text-sm">{announcement.body}</p>
                  {announcement.ctaLabel && announcement.ctaUrl ? (
                    <a
                      href={announcement.ctaUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-block text-sm font-medium underline"
                    >
                      {announcement.ctaLabel}
                    </a>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-2">
                  {!announcement.isSeen ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void handleMarkSeen(announcement.id)}
                    >
                      Mark Read
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => void handleDismiss(announcement.id)}
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};
