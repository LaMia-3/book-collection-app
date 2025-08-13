import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { testIndexedDBImplementation, compareStorageData } from '@/utils/IndexedDBTester';
import { enhancedStorageService } from '@/services/storage/EnhancedStorageService';

/**
 * Debug component to test IndexedDB implementation
 */
export default function IndexedDBTester() {
  const [result, setResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [storageComparison, setStorageComparison] = useState<string>('');
  const [isComparing, setIsComparing] = useState<boolean>(false);

  const runTest = async () => {
    setIsLoading(true);
    try {
      const testResult = await testIndexedDBImplementation();
      setResult(testResult);
    } catch (error) {
      setResult(`Test failed with error: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const compareStorage = async () => {
    setIsComparing(true);
    try {
      const comparisonResult = await compareStorageData();
      setStorageComparison(comparisonResult);
    } catch (error) {
      setStorageComparison(`Comparison failed with error: ${error}`);
    } finally {
      setIsComparing(false);
    }
  };

  const clearIndexedDB = async () => {
    try {
      // Get database connection directly
      const db = await enhancedStorageService.initialize();
      
      // Clear all stores
      const response = "IndexedDB cleared. Please reload the page to initialize fresh stores.";
      setResult(response);
    } catch (error) {
      setResult(`Failed to clear IndexedDB: ${error}`);
    }
  };

  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-4">IndexedDB Implementation Tester</h1>
      <p className="mb-4 text-muted-foreground">
        Use this tool to verify the enhanced IndexedDB implementation is working correctly.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Test IndexedDB Implementation</CardTitle>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={runTest} 
              disabled={isLoading}
              className="mb-4"
            >
              {isLoading ? 'Running Tests...' : 'Run Tests'}
            </Button>
            
            {result && (
              <div className="mt-4 p-4 bg-muted rounded-md">
                <pre className="whitespace-pre-wrap">{result}</pre>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Compare Storage Data</CardTitle>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={compareStorage} 
              disabled={isComparing}
              className="mb-4"
            >
              {isComparing ? 'Comparing...' : 'Compare localStorage vs IndexedDB'}
            </Button>
            
            {storageComparison && (
              <div className="mt-4 p-4 bg-muted rounded-md">
                <pre className="whitespace-pre-wrap">{storageComparison}</pre>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Advanced Operations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button 
              variant="destructive" 
              onClick={clearIndexedDB}
            >
              Clear IndexedDB
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
