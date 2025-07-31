/**
 * IndexedDBViewer Component
 * 
 * A development tool for viewing the contents of IndexedDB stores.
 * This component allows you to inspect the data in your IndexedDB database,
 * select different stores, and view the records in each store.
 */
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, RefreshCw, Download, Trash2 } from "lucide-react";
import { StoreNames } from "@/types/indexeddb";

interface IndexedDBRecord {
  id: string;
  [key: string]: any;
}

interface Store {
  name: string;
  records: IndexedDBRecord[];
  count: number;
}

export function IndexedDBViewer() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dbName, setDbName] = useState<string>("book-collection-db");
  const [activeTab, setActiveTab] = useState<string>(StoreNames.BOOKS);
  const [stores, setStores] = useState<Store[]>([]);
  const [expandedRecords, setExpandedRecords] = useState<{[key: string]: boolean}>({});
  const [storageComparison, setStorageComparison] = useState<{
    localStorage: { books: number, series: number };
    indexedDB: { books: number, series: number };
  }>({ localStorage: { books: 0, series: 0 }, indexedDB: { books: 0, series: 0 } });
  const [isComparing, setIsComparing] = useState(false);
  
  const loadStoreData = async (storeName: string) => {
    try {
      const request = indexedDB.open(dbName);
      
      // Handle database open errors
      request.onerror = (event) => {
        const errorMsg = (event.target as any).error?.message || 'Unknown error';
        console.error(`Error opening database: ${errorMsg}`);
        setError(`Failed to open database: ${errorMsg}`);
      };
      
      // When database opens successfully
      request.onsuccess = (event) => {
        const db = request.result;
        
        try {
          const tx = db.transaction(storeName, 'readonly');
          const store = tx.objectStore(storeName);
          
          // Get all records
          const getAllRequest = store.getAll();
          
          getAllRequest.onsuccess = () => {
            const records = getAllRequest.result as IndexedDBRecord[];
            
            // Create store data object
            const storeData: Store = {
              name: storeName,
              records: records,
              count: records.length
            };
            
            // Update stores state
            setStores(prevStores => {
              const filtered = prevStores.filter(s => s.name !== storeName);
              return [...filtered, storeData];
            });
          };
          
          getAllRequest.onerror = (event) => {
            console.error(`Error getting records from ${storeName}:`, (event.target as any).error);
            setError(`Failed to load records from ${storeName}`);
          };
          
          // Close DB when transaction is complete
          tx.oncomplete = () => {
            db.close();
          };
          
        } catch (txError) {
          console.error(`Error creating transaction:`, txError);
          setError(`Error accessing ${storeName} store: ${txError instanceof Error ? txError.message : String(txError)}`);
          db.close();
        }
      };
    } catch (error) {
      console.error(`Error loading ${storeName} data:`, error);
      setError(`Failed to load ${storeName} data: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  
  const toggleRecordExpansion = (recordId: string) => {
    setExpandedRecords(prev => ({
      ...prev,
      [recordId]: !prev[recordId]
    }));
  };
  
  const getCurrentStore = () => {
    return stores.find(store => store.name === activeTab);
  };
  
  const handleRefresh = () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Open the database to get store names
      const request = indexedDB.open(dbName);
      
      request.onerror = (event) => {
        setError(`Failed to open database: ${(event.target as any).error?.message || 'Unknown error'}`);
        setIsLoading(false);
      };
      
      request.onsuccess = (event) => {
        const db = request.result;
        const storeNames = Array.from(db.objectStoreNames);
        
        // Create empty stores first
        setStores(storeNames.map(name => ({
          name,
          records: [],
          count: 0
        })));
        
        // Load data for each store
        storeNames.forEach(storeName => {
          loadStoreData(storeName);
        });
        
        // Close DB after getting store names
        db.close();
        
        // We set loading to false after a delay to give stores time to load
        setTimeout(() => {
          setIsLoading(false);
        }, 1000);
      };
    } catch (error) {
      setError(`Failed to refresh data: ${error instanceof Error ? error.message : String(error)}`);
      setIsLoading(false);
    }
  };
  
  const handleClearStore = async () => {
    if (!confirm(`Are you sure you want to clear all records in the "${activeTab}" store? This cannot be undone.`)) {
      return;
    }
    
    setIsLoading(true);
    setError(null); // Clear any previous errors
    
    try {
      // Simplified approach using a single function to handle the clear operation
      await clearObjectStore(dbName, activeTab);
      
      // Update the comparison stats
      if (activeTab === StoreNames.BOOKS) {
        setStorageComparison(prev => ({
          ...prev,
          indexedDB: {
            ...prev.indexedDB,
            books: 0
          }
        }));
      } else if (activeTab === StoreNames.SERIES) {
        setStorageComparison(prev => ({
          ...prev,
          indexedDB: {
            ...prev.indexedDB,
            series: 0
          }
        }));
      }
      
      // Show success message
      console.log(`Successfully cleared ${activeTab} store`);
      
      // Refresh data after clearing
      handleRefresh();
    } catch (error) {
      console.error(`Error clearing ${activeTab} store:`, error);
      setError(`Failed to clear store: ${error instanceof Error ? error.message : String(error)}`);
      setIsLoading(false);
    }
  };
  
  // Helper function to clear an object store with proper transaction handling
  const clearObjectStore = (dbName: string, storeName: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      try {
        // Open the database
        const openRequest = indexedDB.open(dbName);
        
        openRequest.onerror = (event) => {
          const errorMsg = (event.target as any).error?.message || 'Unknown error';
          reject(new Error(`Failed to open database: ${errorMsg}`));
        };
        
        openRequest.onsuccess = (event) => {
          const db = openRequest.result;
          
          // Check if the store exists
          if (!Array.from(db.objectStoreNames).includes(storeName)) {
            db.close();
            reject(new Error(`Store "${storeName}" does not exist in database`));
            return;
          }
          
          try {
            // Create a transaction
            const transaction = db.transaction(storeName, 'readwrite');
            const objectStore = transaction.objectStore(storeName);
            
            // Request to clear the store
            const clearRequest = objectStore.clear();
            
            // Handle success case
            clearRequest.onsuccess = () => {
              // Note: we don't resolve here, we wait for transaction completion
              console.log(`Clear operation for ${storeName} successful`);
            };
            
            // Handle clear request error
            clearRequest.onerror = (event) => {
              const error = (event.target as any).error;
              transaction.abort();
              db.close();
              reject(new Error(`Failed to clear ${storeName} store: ${error?.message || 'Unknown error'}`));
            };
            
            // Handle transaction completion (success)
            transaction.oncomplete = () => {
              db.close();
              console.log(`Transaction for clearing ${storeName} completed successfully`);
              resolve();
            };
            
            // Handle transaction error
            transaction.onerror = (event) => {
              const error = (event.target as any).error;
              db.close();
              reject(new Error(`Transaction failed: ${error?.message || 'Unknown error'}`));
            };
            
            // Handle transaction abort
            transaction.onabort = (event) => {
              const error = (event.target as any).error;
              db.close();
              reject(new Error(`Transaction aborted: ${error?.message || 'Unknown error'}`));
            };
            
          } catch (txError) {
            db.close();
            reject(new Error(`Error setting up transaction: ${txError instanceof Error ? txError.message : String(txError)}`));
          }
        };
        
      } catch (outerError) {
        reject(new Error(`Unexpected error during clear operation: ${outerError instanceof Error ? outerError.message : String(outerError)}`));
      }
    });
  };
  
  const compareWithLocalStorage = async () => {
    setIsComparing(true);
    try {
      // Get localStorage counts
      const localStorageBooks = localStorage.getItem('bookLibrary');
      const localStorageSeries = localStorage.getItem('seriesLibrary');
      
      const localStorageBooksCount = localStorageBooks ? JSON.parse(localStorageBooks).length : 0;
      const localStorageSeriesCount = localStorageSeries ? JSON.parse(localStorageSeries).length : 0;
      
      // Get IndexedDB counts
      const request = indexedDB.open(dbName);
      request.onsuccess = async (event) => {
        const db = request.result;
        
        try {
          // Get books count using promise-based approach
          const booksCountPromise = new Promise<number>((resolve, reject) => {
            const countRequest = db.transaction(StoreNames.BOOKS, 'readonly')
              .objectStore(StoreNames.BOOKS).count();
            
            countRequest.onsuccess = () => resolve(countRequest.result);
            countRequest.onerror = (event) => reject((event.target as any).error);
          });
          
          // Get series count using promise-based approach
          const seriesCountPromise = new Promise<number>((resolve, reject) => {
            const countRequest = db.transaction(StoreNames.SERIES, 'readonly')
              .objectStore(StoreNames.SERIES).count();
            
            countRequest.onsuccess = () => resolve(countRequest.result);
            countRequest.onerror = (event) => reject((event.target as any).error);
          });
          
          // Wait for both counts to resolve
          const [booksCount, seriesCount] = await Promise.all([booksCountPromise, seriesCountPromise]);
          
          // Update comparison state
          setStorageComparison({
            localStorage: { books: localStorageBooksCount, series: localStorageSeriesCount },
            indexedDB: { 
              books: booksCount, 
              series: seriesCount 
            }
          });
          
          db.close();
        } catch (error) {
          console.error('Error getting counts:', error);
          db.close();
        }
      };
      
      request.onerror = (event) => {
        console.error('Error opening database for comparison:', (event.target as any).error);
      };
    } catch (error) {
      console.error('Error comparing storage:', error);
    } finally {
      setIsComparing(false);
    }
  };
  
  const handleExportData = () => {
    const currentStore = getCurrentStore();
    if (!currentStore) return;
    
    const jsonData = JSON.stringify(currentStore.records, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentStore.name}_export_${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  useEffect(() => {
    handleRefresh();
    // Also run storage comparison when component mounts
    compareWithLocalStorage();
  }, [dbName]);
  
  const currentStore = getCurrentStore();
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>IndexedDB Viewer</span>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex items-center gap-1"
              onClick={compareWithLocalStorage}
              disabled={isComparing}
            >
              {isComparing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Compare Storage
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="flex items-center gap-1"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Refresh
            </Button>
          </div>
        </CardTitle>
        <CardDescription>
          View and inspect your IndexedDB data stores
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Storage Comparison */}
        <div className="mb-4 border rounded-md p-3">
          <h3 className="text-sm font-medium mb-2">Storage Comparison</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-1">
              <span className="text-xs text-muted-foreground block">Data Source</span>
            </div>
            <div className="col-span-1 text-center">
              <span className="text-xs text-muted-foreground block">Books</span>
            </div>
            <div className="col-span-1 text-center">
              <span className="text-xs text-muted-foreground block">Series</span>
            </div>
            
            <div className="col-span-1">
              <span className="text-sm font-medium">localStorage</span>
            </div>
            <div className="col-span-1 text-center">
              <span className="text-sm">{storageComparison.localStorage.books}</span>
            </div>
            <div className="col-span-1 text-center">
              <span className="text-sm">{storageComparison.localStorage.series}</span>
            </div>
            
            <div className="col-span-1">
              <span className="text-sm font-medium">IndexedDB</span>
            </div>
            <div className="col-span-1 text-center">
              <span className="text-sm font-medium">{storageComparison.indexedDB.books}</span>
            </div>
            <div className="col-span-1 text-center">
              <span className="text-sm font-medium">{storageComparison.indexedDB.series}</span>
            </div>
          </div>
        </div>
        {error && (
          <div className="bg-destructive/10 border border-destructive text-destructive p-3 rounded-md mb-4">
            {error}
          </div>
        )}
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Database</label>
          <Select value={dbName} onValueChange={setDbName}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select database" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="book-collection-db">book-collection-db</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-2">
            {stores.map(store => (
              <TabsTrigger key={store.name} value={store.name}>
                {store.name} ({store.count})
              </TabsTrigger>
            ))}
          </TabsList>
          
          {stores.map(store => (
            <TabsContent key={store.name} value={store.name} className="space-y-4">
              <div className="flex justify-between mb-2">
                <div className="text-sm text-muted-foreground">
                  {store.records.length} {store.records.length === 1 ? 'record' : 'records'}
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleExportData}
                    disabled={store.records.length === 0}
                  >
                    <Download className="h-4 w-4 mr-1" /> Export
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleClearStore}
                    className="text-destructive hover:text-destructive"
                    disabled={store.records.length === 0}
                  >
                    <Trash2 className="h-4 w-4 mr-1" /> Clear
                  </Button>
                </div>
              </div>
              
              {isLoading ? (
                <div className="flex justify-center items-center py-10">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : store.records.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground border border-dashed rounded-md">
                  No records found in this store
                </div>
              ) : (
                <ScrollArea className="h-[500px]">
                  <div className="space-y-2">
                    {store.records.map(record => (
                      <Card key={record.id} className="overflow-hidden">
                        <div 
                          className="p-4 cursor-pointer hover:bg-muted flex justify-between items-center"
                          onClick={() => toggleRecordExpansion(record.id)}
                        >
                          <div className="font-medium">ID: {record.id}</div>
                          <div>
                            {expandedRecords[record.id] ? '▼' : '►'}
                          </div>
                        </div>
                        {expandedRecords[record.id] && (
                          <CardContent className="pt-0 bg-muted/30">
                            <pre className="text-xs overflow-auto p-2 bg-muted/50 rounded-md">
                              {JSON.stringify(record, null, 2)}
                            </pre>
                          </CardContent>
                        )}
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
      <CardFooter>
        <div className="text-xs text-muted-foreground">
          This viewer is for development purposes only.
        </div>
      </CardFooter>
    </Card>
  );
}
