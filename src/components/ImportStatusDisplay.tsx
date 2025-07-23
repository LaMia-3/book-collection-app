import React from 'react';
import { useImport } from '@/contexts/ImportContext';
import { ImportStatus } from '@/components/ui/ImportStatus';

/**
 * Global component that displays import status
 * This should be added once at the application root level
 */
export const ImportStatusDisplay: React.FC = () => {
  const { importState, resetImport } = useImport();
  
  const { status, progress, summary, details, cancelImport } = importState;
  
  return (
    <ImportStatus
      status={status}
      progress={progress}
      summary={summary}
      details={details}
      onCancel={cancelImport}
      onClose={resetImport}
    />
  );
};

export default ImportStatusDisplay;
