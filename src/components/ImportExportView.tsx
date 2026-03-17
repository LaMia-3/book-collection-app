import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Download, Upload, FileJson, FileSpreadsheet, Archive, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ImportFormatHelp } from './ImportFormatHelp';

import { Book } from '@/types/book';
import { useImport } from '@/contexts/ImportContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useAuth } from '@/hooks/useAuth';
import { booksToCSV, booksToJSON, downloadFile } from '@/utils/exportUtils';
import { importFromCSV, importFromJSON } from '@/utils/importUtils';
import {
  getLegacyImportSummary,
  importLegacyLibrary,
  LEGACY_IMPORT_ORDER,
  type LegacyImportExecutionResult,
} from '@/services/migration/legacyLibraryImport';
import type { LegacyLibrarySnapshot, LegacyMigrationEntity } from '@/services/migration/legacyLibraryMigration';

const LEGACY_ENTITY_LABELS: Record<LegacyMigrationEntity, string> = {
  settings: 'Settings',
  series: 'Series',
  books: 'Books',
  collections: 'Collections',
  upcomingReleases: 'Upcoming Releases',
  notifications: 'Notifications',
};

type ImportExportViewProps = {
  books: Book[];
  onImportCSV?: (file: File) => Promise<void>;
  onImportJSON?: (file: File) => Promise<void>;
  onCreateBackup?: () => Promise<void>;
  onRestoreBackup?: (file: File) => Promise<void>;
};

export const ImportExportView: React.FC<ImportExportViewProps> = ({
  books,
  onImportCSV,
  onImportJSON,
  onCreateBackup,
  onRestoreBackup
}) => {
  // Get import context functions for background processing
  const { startImport, updateImportProgress, completeImport, errorImport, setCancelCallback } = useImport();
  const { isAuthenticated, user } = useAuth();
  const { settings } = useSettings();
  const preferredName = user?.preferredName || settings.preferredName;
  
  // State for file inputs and operation status
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [jsonFile, setJsonFile] = useState<File | null>(null);
  const [backupFile, setBackupFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);
  const [legacySummary, setLegacySummary] = useState<LegacyLibrarySnapshot | null>(null);
  const [legacyImportResult, setLegacyImportResult] = useState<LegacyImportExecutionResult | null>(null);
  const [legacyProgress, setLegacyProgress] = useState({
    progress: 0,
    summary: '',
    details: '',
  });

  // Input references
  const csvInputRef = React.useRef<HTMLInputElement>(null);
  const jsonInputRef = React.useRef<HTMLInputElement>(null);
  const backupInputRef = React.useRef<HTMLInputElement>(null);

  const legacySummaryRows = useMemo(() => {
    if (!legacySummary) {
      return [];
    }

    return LEGACY_IMPORT_ORDER
      .map((entity) => ({
        entity,
        label: LEGACY_ENTITY_LABELS[entity],
        count: legacySummary.totalCounts[entity] || 0,
      }))
      .filter((row) => row.count > 0);
  }, [legacySummary]);

  const dataScopeLabel = isAuthenticated ? 'your authenticated account library' : "this browser's local library";

  useEffect(() => {
    let isMounted = true;

    const loadLegacySummary = async () => {
      if (!isAuthenticated) {
        if (isMounted) {
          setLegacySummary(null);
          setLegacyImportResult(null);
          setLegacyProgress({ progress: 0, summary: '', details: '' });
        }
        return;
      }

      try {
        const summary = await getLegacyImportSummary();

        if (isMounted) {
          setLegacySummary(summary);
        }
      } catch (error) {
        if (isMounted) {
          setStatusMessage({
            type: 'error',
            message: `Failed to inspect legacy browser data: ${error instanceof Error ? error.message : String(error)}`,
          });
        }
      }
    };

    loadLegacySummary();

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated]);

  // Handle file input changes
  const handleCsvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setCsvFile(files[0]);
    }
  };

  const handleJsonFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setJsonFile(files[0]);
    }
  };

  const handleBackupFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setBackupFile(files[0]);
    }
  };

  // File triggers
  const triggerCsvFileInput = () => {
    csvInputRef.current?.click();
  };

  const triggerJsonFileInput = () => {
    jsonInputRef.current?.click();
  };

  const triggerBackupFileInput = () => {
    backupInputRef.current?.click();
  };

  // Handle CSV export
  const handleExportCSV = async () => {
    try {
      setIsLoading('exportCSV');
      setStatusMessage({
        type: 'info',
        message: 'Preparing CSV export...'
      });
      
      const [
        { bookRepository },
        { collectionRepository },
      ] = await Promise.all([
        import('@/repositories/BookRepository'),
        import('@/repositories/CollectionRepository'),
      ]);

      const [exportBooks, exportCollections] = await Promise.all([
        bookRepository.getAll(),
        collectionRepository.getAll(),
      ]);

      // Generate CSV content
      const csvContent = booksToCSV(exportBooks, exportCollections);
      
      // Create filename with current date and time
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
      const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
      
      // Create filename with preferred name if available
      const prefix = preferredName ? `${preferredName.toLowerCase().replace(/\s+/g, '-')}-library` : 'library';
      const filename = `${prefix}-export-${dateStr}-${timeStr}.csv`;
      
      // Download the file
      downloadFile(csvContent, filename, 'text/csv;charset=utf-8');
      
      setStatusMessage({
        type: 'success',
        message: `CSV exported successfully from ${dataScopeLabel}.`
      });
    } catch (error) {
      setStatusMessage({
        type: 'error',
        message: `Failed to export CSV: ${error instanceof Error ? error.message : String(error)}`
      });
    } finally {
      setIsLoading(null);
    }
  };

  // Handle JSON export
  const handleExportJSON = async () => {
    try {
      setIsLoading('exportJSON');
      setStatusMessage({
        type: 'info',
        message: 'Preparing JSON export...'
      });
      
      const [
        { bookRepository },
        { collectionRepository },
      ] = await Promise.all([
        import('@/repositories/BookRepository'),
        import('@/repositories/CollectionRepository'),
      ]);

      const [exportBooks, exportCollections] = await Promise.all([
        bookRepository.getAll(),
        collectionRepository.getAll(),
      ]);

      // Generate JSON content
      const jsonContent = booksToJSON(exportBooks, exportCollections);
      
      // Create filename with current date and time
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
      const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
      
      // Create filename with preferred name if available
      const prefix = preferredName ? `${preferredName.toLowerCase().replace(/\s+/g, '-')}-library` : 'library';
      const filename = `${prefix}-export-${dateStr}-${timeStr}.json`;
      
      // Download the file
      downloadFile(jsonContent, filename, 'application/json');
      
      setStatusMessage({
        type: 'success',
        message: `JSON exported successfully from ${dataScopeLabel}.`
      });
    } catch (error) {
      setStatusMessage({
        type: 'error',
        message: `Failed to export JSON: ${error instanceof Error ? error.message : String(error)}`
      });
    } finally {
      setIsLoading(null);
    }
  };

  // Handle CSV import with background processing
  const handleImportCSV = async () => {
    if (!csvFile) {
      setStatusMessage({
        type: 'info',
        message: 'Please select a CSV file first.'
      });
      return;
    }

    try {
      setIsLoading('importCSV');
      setStatusMessage({
        type: 'info',
        message: `Importing from ${csvFile.name}...`
      });
      
      // Create an abort controller for cancellation
      const controller = new AbortController();
      const signal = controller.signal;
      
      // Start the import process in the background
      startImport();
      
      // Register cancel callback
      setCancelCallback(() => {
        controller.abort();
        setIsLoading(null);
        setStatusMessage({
          type: 'info',
          message: 'Import cancelled by user'
        });
      });
      
      // Process in background
      setTimeout(async () => {
        try {
          // Check if already cancelled
          if (signal.aborted) return;
          
          updateImportProgress(10, 'Reading CSV file', csvFile.name);
          
          // Process the CSV file using our utility
          const importResult = await importFromCSV(csvFile);
          
          // Update progress after parsing
          if (signal.aborted) return;
          updateImportProgress(
            50, 
            `Found ${importResult.total} books`, 
            `${importResult.successful.length} valid, ${importResult.failed.length} with issues`
          );
          
          // If we have an onImportCSV callback, call it with the successful imports
          if (!signal.aborted && onImportCSV && importResult.successful.length > 0) {
            updateImportProgress(75, 'Saving books to library...', '');
            await onImportCSV(csvFile);
          }
          
          // Final update and completion
          if (signal.aborted) return;
          updateImportProgress(
            100, 
            'Import completed', 
            `${importResult.successful.length} books imported, ${importResult.failed.length} failed`
          );
          
          // Complete the import in the status indicator
          completeImport(importResult);
          
          // Show a success message with summary
          setStatusMessage({
            type: importResult.failed.length > 0 ? 'info' : 'success',
            message: `Import completed into ${dataScopeLabel}: ${importResult.successful.length} books imported successfully, ${importResult.failed.length} failed.`
          });
          
          // Clear the file input
          setCsvFile(null);
          if (csvInputRef.current) csvInputRef.current.value = '';
          
        } catch (error) {
          if (signal.aborted) return;
          
          // Report error in the status indicator
          errorImport(error instanceof Error ? error : new Error(String(error)));
          
          setStatusMessage({
            type: 'error',
            message: `Failed to import CSV: ${error instanceof Error ? error.message : String(error)}`
          });
        } finally {
          if (!signal.aborted) {
            setIsLoading(null);
          }
        }
      }, 100); // Small delay to allow UI to update first
      
    } catch (error) {
      // Handle synchronous errors
      errorImport(error instanceof Error ? error : new Error(String(error)));
      
      setStatusMessage({
        type: 'error',
        message: `Failed to import CSV: ${error instanceof Error ? error.message : String(error)}`
      });
      setIsLoading(null);
    }
  };

  // Handle JSON import with background processing
  const handleImportJSON = async () => {
    if (!jsonFile) {
      setStatusMessage({
        type: 'info',
        message: 'Please select a JSON file first.'
      });
      return;
    }

    try {
      setIsLoading('importJSON');
      setStatusMessage({
        type: 'info',
        message: `Importing from ${jsonFile.name}...`
      });
      
      // Create an abort controller for cancellation
      const controller = new AbortController();
      const signal = controller.signal;
      
      // Start the import process in the background
      startImport();
      
      // Register cancel callback
      setCancelCallback(() => {
        controller.abort();
        setIsLoading(null);
        setStatusMessage({
          type: 'info',
          message: 'Import cancelled by user'
        });
      });
      
      // Process in background
      setTimeout(async () => {
        try {
          // Check if already cancelled
          if (signal.aborted) return;
          
          updateImportProgress(10, 'Reading JSON file', jsonFile.name);
          
          // Process the JSON file using our utility
          const importResult = await importFromJSON(jsonFile);
          
          // Update progress after parsing
          if (signal.aborted) return;
          updateImportProgress(
            50, 
            `Found ${importResult.total} books`, 
            `${importResult.successful.length} valid, ${importResult.failed.length} with issues`
          );

          if ('series' in importResult || 'collections' in importResult) {
            throw new Error('This JSON file includes full-library backup data. Use Restore Backup instead of JSON Import.');
          }
          
          // If we have an onImportJSON callback, call it with the successful imports
          if (!signal.aborted && onImportJSON && importResult.successful.length > 0) {
            updateImportProgress(75, 'Saving books to library...', '');
            await onImportJSON(jsonFile);
          }
          
          // Final update and completion
          if (signal.aborted) return;
          updateImportProgress(
            100, 
            'Import completed', 
            `${importResult.successful.length} books imported, ${importResult.failed.length} failed`
          );
          
          // Complete the import in the status indicator
          completeImport(importResult);
          
          // Show a success message with summary
          setStatusMessage({
            type: importResult.failed.length > 0 ? 'info' : 'success',
            message: `Import completed into ${dataScopeLabel}: ${importResult.successful.length} books imported successfully, ${importResult.failed.length} failed.`
          });
          
          // Clear the file input
          setJsonFile(null);
          if (jsonInputRef.current) jsonInputRef.current.value = '';
          
        } catch (error) {
          if (signal.aborted) return;
          
          // Report error in the status indicator
          errorImport(error instanceof Error ? error : new Error(String(error)));
          
          setStatusMessage({
            type: 'error',
            message: `Failed to import JSON: ${error instanceof Error ? error.message : String(error)}`
          });
        } finally {
          if (!signal.aborted) {
            setIsLoading(null);
          }
        }
      }, 100); // Small delay to allow UI to update first
      
    } catch (error) {
      // Handle synchronous errors
      errorImport(error instanceof Error ? error : new Error(String(error)));
      
      setStatusMessage({
        type: 'error',
        message: `Failed to import JSON: ${error instanceof Error ? error.message : String(error)}`
      });
      setIsLoading(null);
    }
  };

  // Handle backup creation
  const handleCreateBackup = async () => {
    try {
      setIsLoading('createBackup');
      setStatusMessage({
        type: 'info',
        message: 'Creating backup...'
      });
      
      if (onCreateBackup) {
        await onCreateBackup();
      } else {
        throw new Error('Backup creation is not configured.');
      }
      
      setStatusMessage({
        type: 'success',
        message: `Backup created and downloaded successfully from ${dataScopeLabel}.`
      });
    } catch (error) {
      setStatusMessage({
        type: 'error',
        message: `Failed to create backup: ${error instanceof Error ? error.message : String(error)}`
      });
    } finally {
      setIsLoading(null);
    }
  };

  // Handle backup restoration
  const handleRestoreBackup = async () => {
    if (!backupFile) {
      setStatusMessage({
        type: 'info',
        message: 'Please select a backup file first.'
      });
      return;
    }

    try {
      setIsLoading('restoreBackup');
      setStatusMessage({
        type: 'info',
        message: `Restoring from ${backupFile.name}...`
      });
      
      if (onRestoreBackup) {
        await onRestoreBackup(backupFile);
        
        setStatusMessage({
          type: 'success',
          message: `Backup restored successfully into ${dataScopeLabel}.`
        });
        
        // Clear the file input
        setBackupFile(null);
        if (backupInputRef.current) {
          backupInputRef.current.value = '';
        }
      } else {
        throw new Error('Backup restore is not configured.');
      }
    } catch (error) {
      setStatusMessage({
        type: 'error',
        message: `Failed to restore backup: ${error instanceof Error ? error.message : String(error)}`
      });
    } finally {
      setIsLoading(null);
    }
  };

  const handleImportLegacyBrowserData = async () => {
    if (!legacySummary?.hasLegacyData) {
      setStatusMessage({
        type: 'info',
        message: 'No legacy browser data was detected for this device.',
      });
      return;
    }

    try {
      setIsLoading('legacyImport');
      setLegacyImportResult(null);
      setLegacyProgress({
        progress: 0,
        summary: 'Preparing legacy import',
        details: 'Collecting browser data snapshot',
      });

      const result = await importLegacyLibrary({
        snapshot: legacySummary,
        onProgress: (progress, summary, details) => {
          setLegacyProgress({
            progress,
            summary,
            details: details || '',
          });
        },
      });

      setLegacyImportResult(result);
      setLegacySummary(await getLegacyImportSummary());
      setStatusMessage({
        type:
          result.status === 'completed'
            ? 'success'
            : result.status === 'failed'
              ? 'error'
              : 'info',
        message:
          result.status === 'completed'
            ? 'Legacy browser data imported successfully.'
            : result.status === 'failed'
              ? `Legacy import finished with ${result.failures.length} failed record(s).`
              : 'Legacy import was skipped.',
      });
    } catch (error) {
      setStatusMessage({
        type: 'error',
        message: `Failed to import legacy browser data: ${error instanceof Error ? error.message : String(error)}`,
      });
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-6">Import & Export</h2>
      <p className="text-gray-600 mb-6">
        Import, export, and restore data for {dataScopeLabel}. Legacy browser migration is separate from normal file import.
      </p>

      {/* Status Message */}
      {statusMessage && (
        <div 
          className={`mb-6 p-4 rounded-md flex items-center gap-2 ${
            statusMessage.type === 'success' ? 'bg-green-50 text-green-700 border border-green-300' :
            statusMessage.type === 'error' ? 'bg-red-50 text-red-700 border border-red-300' :
            'bg-blue-50 text-blue-700 border border-blue-300'
          }`}
        >
          {statusMessage.type === 'success' && <CheckCircle className="h-5 w-5" />}
          {statusMessage.type === 'error' && <AlertTriangle className="h-5 w-5" />}
          {statusMessage.type === 'info' && <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />}
          <p>{statusMessage.message}</p>
          <button 
            onClick={() => setStatusMessage(null)} 
            className="ml-auto text-gray-500 hover:text-gray-700"
            aria-label="Dismiss message"
          >
            &times;
          </button>
        </div>
      )}
      
      {/* Format help moved to Import section */}
      
      {/* Main Grid - Changed to vertical layout */}
      <div className="flex flex-col gap-6">
        {/* Export Section */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Export</h2>
          <p className="text-gray-600 mb-4">
            Export book data from {dataScopeLabel}. Use Backup if you want a full library snapshot with books, series, and collections.
          </p>
          
          <div className="flex flex-col gap-6">
            <div className="space-y-4 flex flex-col">
              <div>
                <h3 className="text-lg font-medium">CSV Export</h3>
                <p className="text-gray-600 text-sm">
                  Export books to CSV format for spreadsheets. This export includes book rows and collection-name references only.
                </p>
              </div>
              <div className="mt-auto pt-4">
                <Button 
                  onClick={handleExportCSV}
                  disabled={isLoading !== null}
                  className="w-full flex items-center justify-center gap-2"
                  variant="outline"
                >
                  <FileSpreadsheet size={18} />
                  <span>Export as CSV</span>
                  {isLoading === 'exportCSV' && <RefreshCw className="animate-spin" size={18} />}
                </Button>
              </div>
            </div>
            
            <div className="space-y-4 flex flex-col">
              <div>
                <h3 className="text-lg font-medium">JSON Export</h3>
                <p className="text-gray-600 text-sm">
                  Export books to JSON format with book metadata and collection-name references. This is not a full-library backup.
                </p>
              </div>
              <div className="mt-auto pt-4">
                <Button 
                  onClick={handleExportJSON}
                  disabled={isLoading !== null}
                  className="w-full flex items-center justify-center gap-2"
                  variant="outline"
                >
                  <FileJson size={18} />
                  <span>Export as JSON</span>
                  {isLoading === 'exportJSON' && <RefreshCw className="animate-spin" size={18} />}
                </Button>
              </div>
            </div>
          </div>
        </Card>
        
        {/* Import Section */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Import</h2>
            <ImportFormatHelp />
          </div>
          <p className="text-gray-600 mb-4">
            Import books from CSV or JSON files into {dataScopeLabel}. For full-library backups with series and collections, use Backup Restore instead.
          </p>
          
          <div className="flex flex-col gap-6">
            {isAuthenticated && (
              <div className="space-y-4 border rounded-lg p-4 bg-muted/20">
                <div>
                  <h3 className="text-lg font-medium">Legacy Browser Data</h3>
                  <p className="text-gray-600 text-sm">
                    Detect and import data from older IndexedDB and localStorage browser stores into your authenticated account library.
                  </p>
                </div>

                {legacySummary ? (
                  <>
                    <div className="text-sm text-gray-600">
                      <p>
                        Detection status:{' '}
                        <strong>{legacySummary.hasLegacyData ? 'legacy data found' : 'no legacy data found'}</strong>
                      </p>
                      {legacySummary.sourceDatabases.length > 0 && (
                        <p>Sources: {legacySummary.sourceDatabases.join(', ')}</p>
                      )}
                      <p>
                        Last migration status:{' '}
                        <strong>{settings.migration?.legacyImport?.status || 'not-started'}</strong>
                      </p>
                      <p>Post-migration local cache policy: retained</p>
                    </div>

                    {legacySummaryRows.length > 0 && (
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        {legacySummaryRows.map((row) => (
                          <div key={row.entity} className="rounded border px-3 py-2 bg-background">
                            <span className="font-medium">{row.label}</span>
                            <span className="ml-2 text-gray-600">{row.count}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="text-sm text-gray-600">
                      <p>Import order: {LEGACY_IMPORT_ORDER.map((entity) => LEGACY_ENTITY_LABELS[entity]).join(' -> ')}</p>
                      <p>Duplicate handling: upsert by stable ID, preferring the primary IndexedDB source first.</p>
                    </div>

                    {isLoading === 'legacyImport' && (
                      <div className="space-y-2">
                        <Progress value={legacyProgress.progress} className="h-2" />
                        <p className="text-sm font-medium">{legacyProgress.summary}</p>
                        {legacyProgress.details && (
                          <p className="text-sm text-gray-600">{legacyProgress.details}</p>
                        )}
                      </div>
                    )}

                    {legacyImportResult && (
                      <div className="space-y-2 text-sm">
                        <p>
                          Import result:{' '}
                          <strong>{legacyImportResult.status}</strong>
                        </p>
                        <p>
                          Imported: {Object.values(legacyImportResult.importedCounts).reduce((sum, count) => sum + (count || 0), 0)} records
                          {' '}| Updated: {Object.values(legacyImportResult.updatedCounts).reduce((sum, count) => sum + (count || 0), 0)} records
                        </p>
                        {legacyImportResult.failures.length > 0 && (
                          <div className="rounded border border-amber-300 bg-amber-50 p-3 text-amber-900">
                            <p className="font-medium">
                              {legacyImportResult.failures.length} record(s) failed during import
                            </p>
                            {legacyImportResult.failures.slice(0, 5).map((failure, index) => (
                              <p key={`${failure.entity}-${failure.id || index}`}>
                                {LEGACY_ENTITY_LABELS[failure.entity]}{failure.id ? ` (${failure.id})` : ''}: {failure.reason}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    <Button
                      onClick={handleImportLegacyBrowserData}
                      disabled={isLoading !== null || !legacySummary.hasLegacyData}
                      className="flex items-center gap-2"
                    >
                      <Download size={18} />
                      <span>
                        {settings.migration?.legacyImport?.status === 'failed'
                          ? 'Retry Legacy Import'
                          : 'Import Legacy Browser Data'}
                      </span>
                      {isLoading === 'legacyImport' && <RefreshCw className="animate-spin" size={18} />}
                    </Button>
                  </>
                ) : (
                  <p className="text-sm text-gray-600">Inspecting local browser data...</p>
                )}
              </div>
            )}

            <div className="space-y-4">
              <h3 className="text-lg font-medium">CSV Import</h3>
              <p className="text-gray-600 text-sm">
                Import books from a CSV file into {dataScopeLabel}.
              </p>
              <input 
                type="file" 
                ref={csvInputRef}
                accept=".csv" 
                className="hidden" 
                onChange={handleCsvFileChange}
              />
              <div className="mt-2">
                <div className="flex">
                  <Button 
                    onClick={triggerCsvFileInput}
                    disabled={isLoading !== null}
                    className="flex items-center gap-2 rounded-r-none"
                    variant="outline"
                  >
                    <Upload size={18} />
                    <span>Select CSV</span>
                  </Button>
                  <div className="flex-1 border rounded-r-md px-3 py-2 text-sm text-muted-foreground flex items-center bg-background truncate">
                    {csvFile ? csvFile.name : 'No file selected'}
                  </div>
                </div>
              </div>
              {csvFile && (
                <Button 
                  onClick={handleImportCSV}
                  disabled={isLoading !== null}
                  className="mt-2 flex items-center gap-2"
                >
                  <FileSpreadsheet size={18} />
                  <span>Import from CSV</span>
                  {isLoading === 'importCSV' && <RefreshCw className="animate-spin" size={18} />}
                </Button>
              )}
            </div>
            
            <div className="space-y-4">
              <h3 className="text-lg font-medium">JSON Import</h3>
              <p className="text-gray-600 text-sm">
                Import books from a JSON array or exported book JSON into {dataScopeLabel}. Full-library backup files should be restored from the Backup & Restore section instead.
              </p>
              <input 
                type="file" 
                ref={jsonInputRef}
                accept=".json" 
                className="hidden" 
                onChange={handleJsonFileChange}
              />
              <div className="mt-2">
                <div className="flex">
                  <Button 
                    onClick={triggerJsonFileInput}
                    disabled={isLoading !== null}
                    className="flex items-center gap-2 rounded-r-none"
                    variant="outline"
                  >
                    <Upload size={18} />
                    <span>Select JSON</span>
                  </Button>
                  <div className="flex-1 border rounded-r-md px-3 py-2 text-sm text-muted-foreground flex items-center bg-background truncate">
                    {jsonFile ? jsonFile.name : 'No file selected'}
                  </div>
                </div>
              </div>
              {jsonFile && (
                <Button 
                  onClick={handleImportJSON}
                  disabled={isLoading !== null}
                  className="mt-2 flex items-center gap-2"
                >
                  <FileJson size={18} />
                  <span>Import from JSON</span>
                  {isLoading === 'importJSON' && <RefreshCw className="animate-spin" size={18} />}
                </Button>
              )}
            </div>
          </div>
        </Card>
        
        {/* Backup & Restore Section */}
        <Card className="p-6 md:col-span-2">
          <h2 className="text-xl font-semibold mb-4">Backup & Restore</h2>
          <p className="text-gray-600 mb-4">
            Create or restore a full-library snapshot for {dataScopeLabel}.
          </p>
          
          <div className="flex flex-col gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Create Backup</h3>
              <p className="text-gray-600 text-sm">
                Download a complete backup file of your books, series, and collections from {dataScopeLabel}.
              </p>
              <Button 
                onClick={handleCreateBackup}
                disabled={isLoading !== null}
                className="flex items-center gap-2"
              >
                <Archive size={18} />
                <span>Create & Download Backup</span>
                {isLoading === 'createBackup' && <RefreshCw className="animate-spin" size={18} />}
              </Button>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Restore Backup</h3>
              <p className="text-gray-600 text-sm">
                Restore books, series, and collections from a previously created backup into {dataScopeLabel}.
                <strong className="block text-red-600 mt-1">Warning:</strong> This may overwrite records with matching IDs in your current library.
              </p>
              <div>
                <input 
                  type="file" 
                  ref={backupInputRef}
                  accept=".mira,.json" 
                  className="hidden" 
                  onChange={handleBackupFileChange}
                />
                <div className="flex items-center gap-4">
                  <Button 
                    onClick={triggerBackupFileInput}
                    disabled={isLoading !== null}
                    className="flex items-center gap-2"
                  >
                    <Upload size={18} />
                    <span>Select Backup File</span>
                  </Button>
                  <span className="text-sm">
                    {backupFile ? backupFile.name : 'No file selected'}
                  </span>
                </div>
                {backupFile && (
                  <Button 
                    onClick={handleRestoreBackup}
                    disabled={isLoading !== null}
                    className="mt-2 flex items-center gap-2"
                  >
                    <RefreshCw size={18} />
                    <span>Restore from Backup</span>
                    {isLoading === 'restoreBackup' && <RefreshCw className="animate-spin" size={18} />}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
