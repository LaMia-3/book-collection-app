import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import { userSettingsRepository } from '@/repositories/UserSettingsRepository';
import {
  getLegacyImportSummary,
  importLegacyLibrary,
  type LegacyImportExecutionResult,
} from '@/services/migration/legacyLibraryImport';
import type { LegacyLibrarySnapshot } from '@/services/migration/legacyLibraryMigration';
import type { LegacyImportStatus, LegacyMigrationEntity } from '@/types/user-settings';

const ENTITY_LABELS: Record<LegacyMigrationEntity, string> = {
  settings: 'Settings',
  series: 'Series',
  books: 'Books',
  collections: 'Collections',
  upcomingReleases: 'Upcoming Releases',
  notifications: 'Notifications',
};

export function MigrationDiagnostics() {
  const { isAuthenticated } = useAuth();
  const [summary, setSummary] = useState<LegacyLibrarySnapshot | null>(null);
  const [migrationStatus, setMigrationStatus] = useState<LegacyImportStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LegacyImportExecutionResult | null>(null);
  const [progress, setProgress] = useState({
    progress: 0,
    summary: '',
    details: '',
  });

  const summaryRows = useMemo(() => {
    if (!summary) {
      return [];
    }

    return Object.entries(summary.totalCounts)
      .filter(([, count]) => (count || 0) > 0)
      .map(([entity, count]) => ({
        entity: entity as LegacyMigrationEntity,
        label: ENTITY_LABELS[entity as LegacyMigrationEntity],
        count: count || 0,
      }));
  }, [summary]);

  const loadDiagnostics = useCallback(async () => {
    if (!isAuthenticated) {
      setSummary(null);
      setMigrationStatus(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const [legacySummary, storedSettings] = await Promise.all([
        getLegacyImportSummary(),
        userSettingsRepository.get(),
      ]);

      setSummary(legacySummary);
      setMigrationStatus(storedSettings?.migration?.legacyImport || null);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Unable to load migration diagnostics.',
      );
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    void loadDiagnostics();
  }, [loadDiagnostics]);

  const handleRunImport = async () => {
    try {
      setIsImporting(true);
      setError(null);
      setResult(null);
      setProgress({
        progress: 0,
        summary: 'Preparing legacy import',
        details: 'Loading browser snapshot',
      });

      const importResult = await importLegacyLibrary({
        force: migrationStatus?.status === 'failed',
        onProgress: (nextProgress, nextSummary, nextDetails) => {
          setProgress({
            progress: nextProgress,
            summary: nextSummary,
            details: nextDetails || '',
          });
        },
      });

      setResult(importResult);
      await loadDiagnostics();
    } catch (importError) {
      setError(
        importError instanceof Error
          ? importError.message
          : 'Legacy import failed to start.',
      );
    } finally {
      setIsImporting(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Migration Diagnostics</CardTitle>
          <CardDescription>
            Legacy browser migration only applies to authenticated accounts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTitle>Sign In Required</AlertTitle>
            <AlertDescription>
              This tool inspects legacy browser data and account migration metadata. There is no account-scoped migration state in a local-only session.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Migration Diagnostics</CardTitle>
          <CardDescription>
            Inspect legacy browser data, confirm migration metadata, and retry import if a previous attempt failed.
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            void loadDiagnostics();
          }}
          disabled={isLoading || isImporting}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4${isLoading ? ' animate-spin' : ''}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Migration Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex flex-wrap gap-2">
          <Badge variant={summary?.hasLegacyData ? 'default' : 'secondary'}>
            {summary?.hasLegacyData ? 'Legacy Data Detected' : 'No Legacy Data Detected'}
          </Badge>
          <Badge variant="outline">
            Migration Status: {migrationStatus?.status || 'not-started'}
          </Badge>
          <Badge variant="outline">
            Cache Policy: {migrationStatus?.postMigrationLocalCacheState || 'retained'}
          </Badge>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 rounded-lg border p-4 text-sm">
            <p><span className="font-medium">Sources:</span> {migrationStatus?.sourceDatabases?.join(', ') || summary?.sourceDatabases.join(', ') || 'None detected'}</p>
            <p><span className="font-medium">Last Detected:</span> {migrationStatus?.lastDetectedAt || summary?.collectedAt || 'Never'}</p>
            <p><span className="font-medium">Last Attempt:</span> {migrationStatus?.lastAttemptAt || 'Never'}</p>
            <p><span className="font-medium">Completed At:</span> {migrationStatus?.completedAt || 'Not completed'}</p>
          </div>

          <div className="space-y-2 rounded-lg border p-4 text-sm">
            <p><span className="font-medium">Duplicate Strategy:</span> {migrationStatus?.duplicateStrategy || summary?.duplicateStrategy || 'Not available'}</p>
            <p><span className="font-medium">LocalStorage Keys:</span> {summary?.localStorage.keys.length || 0}</p>
            <p><span className="font-medium">Last Error:</span> {migrationStatus?.lastError || 'None recorded'}</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {summaryRows.length > 0 ? (
            summaryRows.map((row) => (
              <div key={row.entity} className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">{row.label}</p>
                <p className="mt-2 text-2xl font-semibold">{row.count}</p>
              </div>
            ))
          ) : (
            <div className="rounded-lg border p-4 text-sm text-muted-foreground sm:col-span-2 xl:col-span-3">
              No legacy browser records were detected for this device.
            </div>
          )}
        </div>

        {(isImporting || result) && (
          <div className="space-y-3 rounded-lg border p-4">
            {isImporting && (
              <>
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span>{progress.summary || 'Importing legacy data'}</span>
                  <span>{progress.progress}%</span>
                </div>
                <Progress value={progress.progress} />
                {progress.details && (
                  <p className="text-sm text-muted-foreground">{progress.details}</p>
                )}
              </>
            )}

            {result && (
              <div className="space-y-2 text-sm">
                <p><span className="font-medium">Last Admin Run:</span> {result.status}</p>
                <p>
                  <span className="font-medium">Imported:</span>{' '}
                  {Object.values(result.importedCounts).reduce((sum, count) => sum + (count || 0), 0)}
                  {' '}| <span className="font-medium">Updated:</span>{' '}
                  {Object.values(result.updatedCounts).reduce((sum, count) => sum + (count || 0), 0)}
                </p>
                <p>
                  <span className="font-medium">Failures:</span>{' '}
                  {result.failures.length}
                </p>
                {result.failures.length > 0 && (
                  <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                    {result.failures.slice(0, 5).map((failure) => (
                      <li key={`${failure.entity}-${failure.id || failure.reason}`}>
                        {ENTITY_LABELS[failure.entity]} {failure.id ? `(${failure.id})` : ''}: {failure.reason}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() => {
              void handleRunImport();
            }}
            disabled={isLoading || isImporting || !summary?.hasLegacyData}
            className="flex items-center gap-2"
          >
            {isImporting && <RefreshCw className="h-4 w-4 animate-spin" />}
            {migrationStatus?.status === 'failed' ? 'Retry Legacy Import' : 'Run Legacy Import'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default MigrationDiagnostics;
