import React, { createContext, useContext, useState, useCallback } from 'react';
import { Book } from '@/types/book';
import { ImportResult } from '@/utils/importUtils';

export type ImportStatus = 'idle' | 'processing' | 'completed' | 'error';

export interface ImportState {
  status: ImportStatus;
  progress: number;
  summary: string;
  details: string;
  successful: Book[];
  failed: { reason: string }[];
  cancelImport: () => void;
}

const initialState: ImportState = {
  status: 'idle',
  progress: 0,
  summary: '',
  details: '',
  successful: [],
  failed: [],
  cancelImport: () => {}
};

// Create the context
const ImportContext = createContext<{
  importState: ImportState;
  startImport: () => void;
  updateImportProgress: (progress: number, summary: string, details?: string) => void;
  completeImport: (result: ImportResult) => void;
  errorImport: (error: Error) => void;
  resetImport: () => void;
  setCancelCallback: (callback: () => void) => void;
}>({
  importState: initialState,
  startImport: () => {},
  updateImportProgress: () => {},
  completeImport: () => {},
  errorImport: () => {},
  resetImport: () => {},
  setCancelCallback: () => {}
});

// Provider component
export const ImportProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [importState, setImportState] = useState<ImportState>({ ...initialState });

  // Set up handlers for import state
  const startImport = useCallback(() => {
    setImportState({
      ...initialState,
      status: 'processing',
      summary: 'Starting import...'
    });
  }, []);

  const updateImportProgress = useCallback((progress: number, summary: string, details?: string) => {
    setImportState(prev => ({
      ...prev,
      progress,
      summary,
      details: details || prev.details
    }));
  }, []);

  const completeImport = useCallback((result: ImportResult) => {
    const successful = result.successful || [];
    const failed = result.failed || [];
    
    setImportState(prev => ({
      ...prev,
      status: 'completed',
      progress: 100,
      summary: `Imported ${successful.length} of ${result.total} books`,
      details: failed.length > 0 
        ? `${failed.length} books failed to import` 
        : 'All books imported successfully',
      successful,
      failed: failed.map(f => ({ reason: f.reason }))
    }));
  }, []);

  const errorImport = useCallback((error: Error) => {
    setImportState(prev => ({
      ...prev,
      status: 'error',
      progress: 0,
      summary: 'Import failed',
      details: error.message
    }));
  }, []);

  const resetImport = useCallback(() => {
    setImportState({ ...initialState });
  }, []);

  const setCancelCallback = useCallback((callback: () => void) => {
    setImportState(prev => ({
      ...prev,
      cancelImport: callback
    }));
  }, []);

  return (
    <ImportContext.Provider
      value={{
        importState,
        startImport,
        updateImportProgress,
        completeImport,
        errorImport,
        resetImport,
        setCancelCallback
      }}
    >
      {children}
    </ImportContext.Provider>
  );
};

// Custom hook for using the context
export const useImport = () => useContext(ImportContext);

export default ImportProvider;
