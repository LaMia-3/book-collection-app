import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle, Database, RefreshCw, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { IndexedDBService } from '@/services/storage/IndexedDBService';

// Create an instance of the service
const indexedDBService = new IndexedDBService();

/**
 * A utility component for database repair and maintenance
 * This should only be used in development or admin contexts
 */
export const DatabaseRepairUtility: React.FC = () => {
  const { toast } = useToast();
  const [isRepairing, setIsRepairing] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [repairStatus, setRepairStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [resetStatus, setResetStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('');

  // Handle database repair
  const handleRepairDatabase = async () => {
    setIsRepairing(true);
    setRepairStatus('idle');
    setStatusMessage('Checking database health...');
    
    try {
      const repaired = await indexedDBService.checkAndRepairDatabase();
      
      if (repaired) {
        setRepairStatus('success');
        setStatusMessage('Local cache repair completed successfully. Refresh the page to reload browser data.');
        toast({
          title: 'Local Cache Repair Successful',
          description: 'The browser cache has been repaired. Refresh the page to reload data.',
        });
      } else {
        setRepairStatus('error');
        setStatusMessage('Local cache repair failed. Try resetting the browser cache instead.');
        toast({
          title: 'Local Cache Repair Failed',
          description: 'Could not repair the browser cache. Try resetting the local cache instead.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      setRepairStatus('error');
      setStatusMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      toast({
        title: 'Local Cache Repair Error',
        description: `An error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive'
      });
    } finally {
      setIsRepairing(false);
    }
  };

  // Handle database reset
  const handleResetDatabase = async () => {
    if (!window.confirm('WARNING: This will clear browser-local IndexedDB data on this device. Remote account data in MongoDB will not be deleted. Continue?')) {
      return;
    }
    
    setIsResetting(true);
    setResetStatus('idle');
    setStatusMessage('Resetting database...');
    
    try {
      await indexedDBService.resetDatabase();
      setResetStatus('success');
      setStatusMessage('Local browser cache reset successful. Refresh the page to reload from the current source of truth.');
      toast({
        title: 'Local Cache Reset Successful',
        description: 'The browser cache has been reset. Refresh the page to reload data.',
      });
    } catch (error) {
      setResetStatus('error');
      setStatusMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      toast({
        title: 'Local Cache Reset Error',
        description: `An error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive'
      });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Local Cache Repair Utility
        </CardTitle>
        <CardDescription>
          Repair or reset browser-local IndexedDB stores on this device. These actions do not delete MongoDB account records.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {statusMessage && (
          <Alert variant={repairStatus === 'error' || resetStatus === 'error' ? 'destructive' : 'default'}>
            {repairStatus === 'success' || resetStatus === 'success' ? (
              <CheckCircle className="h-4 w-4" />
            ) : repairStatus === 'error' || resetStatus === 'error' ? (
              <AlertCircle className="h-4 w-4" />
            ) : null}
            <AlertTitle>Status</AlertTitle>
            <AlertDescription>{statusMessage}</AlertDescription>
          </Alert>
        )}
        
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Browser Cache Options</h3>
          <p className="text-sm text-muted-foreground">
            Try repair first. If that fails, reset the browser-local cache as a last resort.
          </p>
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <Button
          variant="outline"
          onClick={handleRepairDatabase}
          disabled={isRepairing || isResetting}
          className="flex items-center gap-2"
        >
          {isRepairing ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Repair Local Cache
        </Button>
        
        <Button
          variant="destructive"
          onClick={handleResetDatabase}
          disabled={isRepairing || isResetting}
          className="flex items-center gap-2"
        >
          {isResetting ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
          Reset Local Cache
        </Button>
      </CardFooter>
    </Card>
  );
};

export default DatabaseRepairUtility;
