import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Megaphone, X } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { ApiClientError, authApi, SystemAnnouncementRecord } from "@/lib/apiClient";

const severityBannerClassNames: Record<
  SystemAnnouncementRecord["severity"],
  string
> = {
  info: "border-sky-500/50 bg-slate-900/95",
  success: "border-emerald-500/50 bg-slate-900/95",
  warning: "border-amber-500/50 bg-slate-900/95",
  critical: "border-rose-500/60 bg-slate-950/95",
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

  const featuredAnnouncement = useMemo(
    () => announcements[0] ?? null,
    [announcements],
  );

  if (
    !isAuthenticated ||
    isLoadingAnnouncements ||
    !featuredAnnouncement
  ) {
    return null;
  }

  return (
    <div
      className={`fixed left-1/2 top-24 z-40 w-[calc(100%-2rem)] max-w-4xl -translate-x-1/2 rounded-xl border px-6 py-4 text-white shadow-lg backdrop-blur-sm md:top-20 ${severityBannerClassNames[featuredAnnouncement.severity]}`}
    >
      <div className="flex items-start gap-3">
        <Megaphone className="mt-1 h-6 w-6 shrink-0 text-white" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/70">
              What&apos;s New
            </p>
            {!featuredAnnouncement.isSeen ? (
              <span className="rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-xs font-medium text-white">
                New
              </span>
            ) : null}
            {announcements.length > 1 ? (
              <span className="rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-xs font-medium text-white">
                +{announcements.length - 1} more
              </span>
            ) : null}
          </div>

          <div>
            <h3 className="text-lg font-semibold">{featuredAnnouncement.title}</h3>
            <p className="text-sm text-white/90">{featuredAnnouncement.body}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {featuredAnnouncement.ctaLabel && featuredAnnouncement.ctaUrl ? (
              <a
                href={featuredAnnouncement.ctaUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-md border border-white/15 bg-white/10 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-white/15"
              >
                {featuredAnnouncement.ctaLabel}
                <ExternalLink className="h-4 w-4" />
              </a>
            ) : null}

            {!featuredAnnouncement.isSeen ? (
              <button
                type="button"
                onClick={() => void handleMarkSeen(featuredAnnouncement.id)}
                className="rounded-md bg-white px-3 py-1.5 text-sm font-medium text-slate-900 transition-colors hover:bg-white/90"
              >
                Mark Read
              </button>
            ) : null}
          </div>
        </div>

        <button
          type="button"
          onClick={() => void handleDismiss(featuredAnnouncement.id)}
          className="rounded-full p-1 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Dismiss announcement"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};
