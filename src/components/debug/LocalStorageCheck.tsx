import React, { useEffect, useState } from 'react';
import { Button } from '../ui/button';
import { enhancedStorageService } from '../../services/storage/EnhancedStorageService';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../ui/card';

export default function LocalStorageCheck() {
  const [localStorage, setLocalStorage] = useState<Record<string, any>>({});
  const [hasSeriesInLocalStorage, setHasSeriesInLocalStorage] = useState(false);
  
  // Function to check localStorage for series data
  const checkLocalStorage = () => {
    const items: Record<string, any> = {};
    let seriesFound = false;
    
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key) {
        try {
          const value = window.localStorage.getItem(key);
          items[key] = value;
          
          // Check if any key contains 'series'
          if (key.toLowerCase().includes('series')) {
            seriesFound = true;
          }
        } catch (e) {
          console.error(`Error reading localStorage key ${key}:`, e);
        }
      }
    }
    
    setLocalStorage(items);
    setHasSeriesInLocalStorage(seriesFound);
  };

  // Add a series to test if it appears in localStorage
  const addTestSeries = async () => {
    try {
      await enhancedStorageService.saveSeries({
        id: `test-series-${Date.now()}`,
        name: 'Test Series ' + new Date().toLocaleTimeString(),
        author: 'Test Author',
        status: 'ongoing',
        isTracked: true,
        books: [],
        totalBooks: 0,
        completedBooks: 0,
        readingProgress: 0,
        dateAdded: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        readingOrder: 'publication',
      });
      alert('Test series added. Check localStorage to see if it was stored there.');
      
      // Check localStorage after a short delay
      setTimeout(checkLocalStorage, 500);
    } catch (error) {
      console.error('Failed to add test series:', error);
      alert('Failed to add test series: ' + (error as Error).message);
    }
  };

  useEffect(() => {
    checkLocalStorage();
  }, []);

  return (
    <Card className="max-w-xl mx-auto mt-8">
      <CardHeader>
        <CardTitle>Series localStorage Check</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-lg font-medium mb-2">
              Series data in localStorage: 
              <span className={hasSeriesInLocalStorage ? "text-red-500 ml-2" : "text-green-500 ml-2"}>
                {hasSeriesInLocalStorage ? 'YES ❌' : 'NO ✅'}
              </span>
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={addTestSeries}>
              Add Test Series
            </Button>
            <Button variant="outline" onClick={checkLocalStorage}>
              Refresh Check
            </Button>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <details className="w-full">
          <summary className="cursor-pointer">View localStorage contents</summary>
          <pre className="text-xs mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded overflow-auto max-h-96">
            {JSON.stringify(localStorage, null, 2)}
          </pre>
        </details>
      </CardFooter>
    </Card>
  );
}
