import { useEffect, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import { getStoredAuthToken } from '@/lib/auth-storage';
import { bookRepository } from '@/repositories/BookRepository';
import { collectionRepository } from '@/repositories/CollectionRepository';
import { notificationRepository } from '@/repositories/NotificationRepository';
import { seriesRepository } from '@/repositories/SeriesRepository';
import { upcomingReleasesRepository } from '@/repositories/UpcomingReleasesRepository';

type EntityCounts = {
  books: number;
  series: number;
  collections: number;
  upcomingReleases: number;
  notifications: number;
};

const DEFAULT_COUNTS: EntityCounts = {
  books: 0,
  series: 0,
  collections: 0,
  upcomingReleases: 0,
  notifications: 0,
};

export function SessionDiagnostics() {
  const { isAuthenticated, isLoadingAuth, user } = useAuth();
  const [counts, setCounts] = useState<EntityCounts>(DEFAULT_COUNTS);
  const [isLoadingCounts, setIsLoadingCounts] = useState(true);
  const [countsError, setCountsError] = useState<string | null>(null);

  const authToken = getStoredAuthToken();
  const activeDataSource = isAuthenticated ? 'MongoDB-backed account data' : 'browser-local cache';

  const totalRecords = useMemo(() => {
    return Object.values(counts).reduce((sum, count) => sum + count, 0);
  }, [counts]);

  const loadCounts = async () => {
    try {
      setIsLoadingCounts(true);
      setCountsError(null);

      const [
        books,
        series,
        collections,
        upcomingReleases,
        notifications,
      ] = await Promise.all([
        bookRepository.getAll(),
        seriesRepository.getAll(),
        collectionRepository.getAll(),
        upcomingReleasesRepository.getAll(),
        notificationRepository.getAll(),
      ]);

      setCounts({
        books: books.length,
        series: series.length,
        collections: collections.length,
        upcomingReleases: upcomingReleases.length,
        notifications: notifications.length,
      });
    } catch (error) {
      setCountsError(
        error instanceof Error
          ? error.message
          : 'Unable to load current data counts.',
      );
    } finally {
      setIsLoadingCounts(false);
    }
  };

  useEffect(() => {
    void loadCounts();
  }, [isAuthenticated]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Session & Account Diagnostics</CardTitle>
          <CardDescription>
            Confirm which storage path is active, which account is loaded, and how much data is currently visible in that scope.
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            void loadCounts();
          }}
          disabled={isLoadingCounts}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4${isLoadingCounts ? ' animate-spin' : ''}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {countsError && (
          <Alert variant="destructive">
            <AlertTitle>Diagnostics Error</AlertTitle>
            <AlertDescription>{countsError}</AlertDescription>
          </Alert>
        )}

        <div className="flex flex-wrap gap-2">
          <Badge variant={isAuthenticated ? 'default' : 'secondary'}>
            {isAuthenticated ? 'Authenticated Session' : 'Local Session'}
          </Badge>
          <Badge variant={authToken ? 'outline' : 'secondary'}>
            {authToken ? 'Token Present' : 'No Stored Token'}
          </Badge>
          <Badge variant="outline">{activeDataSource}</Badge>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Account</p>
            <div className="space-y-1 text-sm">
              <p><span className="font-medium">Email:</span> {user?.email || 'Not signed in'}</p>
              <p><span className="font-medium">User ID:</span> {user?.id || 'Not signed in'}</p>
              <p><span className="font-medium">Preferred Name:</span> {user?.preferredName || 'Not set'}</p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Session State</p>
            <div className="space-y-1 text-sm">
              <p><span className="font-medium">Bootstrap State:</span> {isLoadingAuth ? 'Loading' : 'Ready'}</p>
              <p><span className="font-medium">Data Source:</span> {activeDataSource}</p>
              <p><span className="font-medium">Visible Records:</span> {isLoadingCounts ? 'Loading…' : totalRecords}</p>
            </div>
          </div>
        </div>

        <Separator />

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Books</p>
            <p className="mt-2 text-2xl font-semibold">{isLoadingCounts ? '…' : counts.books}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Series</p>
            <p className="mt-2 text-2xl font-semibold">{isLoadingCounts ? '…' : counts.series}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Collections</p>
            <p className="mt-2 text-2xl font-semibold">{isLoadingCounts ? '…' : counts.collections}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Upcoming Releases</p>
            <p className="mt-2 text-2xl font-semibold">{isLoadingCounts ? '…' : counts.upcomingReleases}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Notifications</p>
            <p className="mt-2 text-2xl font-semibold">{isLoadingCounts ? '…' : counts.notifications}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default SessionDiagnostics;
