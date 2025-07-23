import React, { useState, useCallback } from 'react';
import { Download, Upload, FileJson, FileSpreadsheet, Archive, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ImportFormatHelp } from './ImportFormatHelp';

import { Book } from '@/types/book';
import { useImport } from '@/contexts/ImportContext';
import { booksToCSV, booksToJSON, downloadFile } from '@/utils/exportUtils';
import { importFromCSV, importFromJSON, ImportResult } from '@/utils/importUtils';
import { createBackup, restoreFromBackup } from '@/utils/backupUtils';

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
  
  // State for file inputs and operation status
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [jsonFile, setJsonFile] = useState<File | null>(null);
  const [backupFile, setBackupFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  // Input references
  const csvInputRef = React.useRef<HTMLInputElement>(null);
  const jsonInputRef = React.useRef<HTMLInputElement>(null);
  const backupInputRef = React.useRef<HTMLInputElement>(null);

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
      
      // Generate CSV content
      const csvContent = booksToCSV(books);
      
      // Create filename with current date
      const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      const filename = `mira-books-${date}.csv`;
      
      // Download the file
      downloadFile(csvContent, filename, 'text/csv;charset=utf-8');
      
      setStatusMessage({
        type: 'success',
        message: 'CSV exported successfully!'
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
      
      // Generate JSON content
      const jsonContent = booksToJSON(books);
      
      // Create filename with current date
      const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      const filename = `mira-books-${date}.json`;
      
      // Download the file
      downloadFile(jsonContent, filename, 'application/json');
      
      setStatusMessage({
        type: 'success',
        message: 'JSON exported successfully!'
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
            message: `Import completed: ${importResult.successful.length} books imported successfully, ${importResult.failed.length} failed.`
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
            message: `Import completed: ${importResult.successful.length} books imported successfully, ${importResult.failed.length} failed.`
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
      
      // Create and download the backup
      createBackup(books);
      
      // Call the onCreateBackup prop if provided
      if (onCreateBackup) {
        await onCreateBackup();
      }
      
      setStatusMessage({
        type: 'success',
        message: 'Backup created and downloaded successfully!'
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
      
      // Attempt to restore from the backup file
      const result = await restoreFromBackup(backupFile);
      
      if (result.success && onRestoreBackup) {
        await onRestoreBackup(backupFile);
        
        setStatusMessage({
          type: 'success',
          message: result.message || 'Backup restored successfully!'
        });
        
        // Clear the file input
        setBackupFile(null);
        if (backupInputRef.current) {
          backupInputRef.current.value = '';
        }
      } else {
        setStatusMessage({
          type: 'error',
          message: result.message || 'Failed to restore backup.'
        });
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

  return (
    <div>
      <h2 className="text-xl font-semibold mb-6">Import & Export</h2>
      <p className="text-gray-600 mb-6">
        Import books from CSV/JSON files or export your collection for backup or sharing.
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
            Export your book collection to CSV or JSON format.
          </p>
          
          <div className="flex flex-col gap-6">
            <div className="space-y-4 flex flex-col">
              <div>
                <h3 className="text-lg font-medium">CSV Export</h3>
                <p className="text-gray-600 text-sm">
                  Export your collection to CSV format for use in spreadsheet applications.
                </p>
              </div>
              <div className="mt-auto pt-4">
                <Button 
                  onClick={handleExportCSV}
                  disabled={isLoading !== null || books.length === 0}
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
                  Export your collection to JSON format for use in other applications.
                </p>
              </div>
              <div className="mt-auto pt-4">
                <Button 
                  onClick={handleExportJSON}
                  disabled={isLoading !== null || books.length === 0}
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
            Import books from CSV or JSON files.
          </p>
          
          <div className="flex flex-col gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">CSV Import</h3>
              <p className="text-gray-600 text-sm">
                Import books from a CSV file.
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
                Import books from a JSON file.
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
            Create backups of your entire collection or restore from a previous backup.
          </p>
          
          <div className="flex flex-col gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Create Backup</h3>
              <p className="text-gray-600 text-sm">
                Download a complete backup file of your book collection that you can restore later.
              </p>
              <Button 
                onClick={handleCreateBackup}
                disabled={isLoading !== null || books.length === 0}
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
                Restore your collection from a previously created backup file.
                <strong className="block text-red-600 mt-1">Warning:</strong> This will replace your current collection.
              </p>
              <div>
                <input 
                  type="file" 
                  ref={backupInputRef}
                  accept=".mira" 
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
