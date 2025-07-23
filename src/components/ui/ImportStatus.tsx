import React, { useState, useEffect } from 'react';
import { X, AlertCircle, CheckCircle, Clock, BookOpen } from 'lucide-react';
import { Button } from './button';
import { Progress } from './progress';

export interface ImportStatusProps {
  /**
   * Current status of the import
   */
  status: 'idle' | 'processing' | 'completed' | 'error';
  
  /**
   * Progress percentage (0-100)
   */
  progress?: number;
  
  /**
   * Summary of the import (e.g., "3 of 10 books imported")
   */
  summary?: string;
  
  /**
   * More detailed information about the import
   */
  details?: string;
  
  /**
   * Function to call when the cancel button is clicked
   */
  onCancel?: () => void;
  
  /**
   * Function to call when the close button is clicked
   */
  onClose?: () => void;
}

export const ImportStatus: React.FC<ImportStatusProps> = ({
  status,
  progress = 0,
  summary,
  details,
  onCancel,
  onClose,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  
  // Show with animation when status changes
  useEffect(() => {
    if (status !== 'idle') {
      setIsVisible(true);
    }
  }, [status]);
  
  // Hide the component when idle after a delay
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    if (status === 'completed' || status === 'error') {
      timeoutId = setTimeout(() => {
        // Auto-hide after 10 seconds
        if (onClose) {
          onClose();
        }
      }, 10000);
    }
    
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [status, onClose]);
  
  if (status === 'idle') {
    return null;
  }
  
  // Determine the appropriate icon and color
  let statusIcon;
  let statusColor;
  let statusText;
  
  switch (status) {
    case 'processing':
      statusIcon = <Clock className="h-5 w-5 text-white" />;
      statusColor = 'bg-amber-600 border-amber-700 text-white';
      statusText = 'Importing...';
      break;
    case 'completed':
      statusIcon = <CheckCircle className="h-5 w-5 text-white" />;
      statusColor = 'bg-green-600 border-green-700 text-white';
      statusText = 'Import Complete';
      break;
    case 'error':
      statusIcon = <AlertCircle className="h-5 w-5 text-white" />;
      statusColor = 'bg-red-600 border-red-700 text-white';
      statusText = 'Import Error';
      break;
    default:
      statusIcon = <BookOpen className="h-5 w-5 text-white" />;
      statusColor = 'bg-blue-600 border-blue-700 text-white';
      statusText = 'Importing Books';
  }
  
  return (
    <div
      className={`fixed bottom-4 right-4 w-80 p-4 rounded-lg shadow-lg border ${statusColor} 
                 transition-all duration-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'} z-50`}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          {statusIcon}
          <h3 className="font-medium">{statusText}</h3>
        </div>
        <button
          onClick={() => {
            setIsVisible(false);
            setTimeout(() => {
              if (onClose) {
                onClose();
              }
            }, 300); // Wait for fade out animation
          }}
          className="text-gray-500 hover:text-gray-700"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      
      {status === 'processing' && progress !== undefined && (
        <div className="mb-2">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-right mt-1">{progress.toFixed(0)}%</p>
        </div>
      )}
      
      {summary && <p className="text-sm mb-1">{summary}</p>}
      {details && <p className="text-xs text-gray-600">{details}</p>}
      
      {status === 'processing' && onCancel && (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onCancel}
          className="mt-2 w-full"
        >
          Cancel Import
        </Button>
      )}
    </div>
  );
};

export default ImportStatus;
