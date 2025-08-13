import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Database, AlertCircle, Trash2, RefreshCw, Settings, Server, CheckCircle2, Wrench, Beaker } from "lucide-react";
import { useToast } from '@/hooks/use-toast';

// Import components and utilities
import { IndexedDBViewer } from '@/components/debug/IndexedDBViewer';
import IndexedDBTester from '@/components/debug/IndexedDBTester';
import BackendTester from '@/components/debug/BackendTester';
import { resetIndexedDB, resetLocalStorage, resetAllStorage } from '@/utils/ResetDatabaseUtil';
import { migrateDataToIndexedDB, isMigrationNeeded } from '@/utils/DataMigrationUtil';

// Import UI components
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Import test utilities
import { testIndexedDBImplementation, compareStorageData } from '@/utils/IndexedDBTester';
import { databaseService } from '@/services/DatabaseService';
import { seriesService } from '@/services/SeriesService';
import { upcomingReleasesService } from '@/services/UpcomingReleasesService';
import { notificationService } from '@/services/NotificationService';
import { readingOrderService } from '@/services/ReadingOrderService';
import { Badge } from '@/components/ui/badge';

// Interface for migration report
interface MigrationReport {
  booksFound: number;
  booksMigrated: number;
  seriesFound: number;
  seriesMigrated: number;
  errors: string[];
}

/**
 * Admin Page
 * 
 * A unified admin interface that combines:
 * 1. Database Viewer - View and inspect IndexedDB data
 * 2. Data Migration - Migrate data between localStorage and IndexedDB
 * 3. Database Reset - Reset the database to a clean state
 */
export default function AdminPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  // Get tab from URL query parameter if available
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const tabParam = queryParams.get('tab');
  
  const [activeTab, setActiveTab] = useState(tabParam || 'viewer');
  const [isResetting, setIsResetting] = useState(false);
  const [resetType, setResetType] = useState<'indexeddb' | 'localstorage' | 'all' | null>(null);
  
  // Data migration state
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationNeeded, setMigrationNeeded] = useState<boolean | null>(null);
  const [report, setReport] = useState<MigrationReport | null>(null);
  const [localStorageStats, setLocalStorageStats] = useState<{ books: number; series: number }>({ books: 0, series: 0 });
  const [indexedDBStats, setIndexedDBStats] = useState<{ books: number; series: number }>({ books: 0, series: 0 });
  
  // Check if migration is needed on component mount
  useEffect(() => {
    const checkMigrationNeeded = async () => {
      try {
        const needed = await isMigrationNeeded();
        setMigrationNeeded(needed);
        
        // Get localStorage stats
        const localBooks = localStorage.getItem('bookLibrary');
        const localSeries = localStorage.getItem('seriesLibrary');
        
        setLocalStorageStats({
          books: localBooks ? JSON.parse(localBooks).length : 0,
          series: localSeries ? JSON.parse(localSeries).length : 0
        });
        
        // Get IndexedDB stats
        const { enhancedStorageService } = await import('@/services/storage/EnhancedStorageService');
        await enhancedStorageService.initialize();
        
        const books = await enhancedStorageService.getBooks();
        const series = await enhancedStorageService.getSeries();
        
        setIndexedDBStats({
          books: books.length,
          series: series.length
        });
        
      } catch (error) {
        console.error('Error checking if migration is needed:', error);
        toast({
          title: "Error",
          description: "Failed to check if migration is needed",
          variant: "destructive"
        });
      }
    };
    
    checkMigrationNeeded();
  }, [toast]);

  // Handle data migration from localStorage to IndexedDB
  const handleMigration = async () => {
    setIsMigrating(true);
    
    try {
      const migrationReport = await migrateDataToIndexedDB();
      setReport(migrationReport);
      
      if (migrationReport.errors.length > 0) {
        toast({
          title: "Migration Completed with Issues",
          description: `Migrated ${migrationReport.booksMigrated} books and ${migrationReport.seriesMigrated} series with ${migrationReport.errors.length} errors.`,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Migration Successful",
          description: `Successfully migrated ${migrationReport.booksMigrated} books and ${migrationReport.seriesMigrated} series.`
        });
      }
      
      // Refresh stats
      const { enhancedStorageService } = await import('@/services/storage/EnhancedStorageService');
      const books = await enhancedStorageService.getBooks();
      const series = await enhancedStorageService.getSeries();
      
      setIndexedDBStats({
        books: books.length,
        series: series.length
      });
      
      // Check if migration is still needed
      const needed = await isMigrationNeeded();
      setMigrationNeeded(needed);
      
    } catch (error) {
      console.error('Migration failed:', error);
      toast({
        title: "Migration Failed",
        description: `Error during migration: ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive"
      });
    } finally {
      setIsMigrating(false);
    }
  };
  
  // Handle database reset
  const handleReset = async (type: 'indexeddb' | 'localstorage' | 'all') => {
    if (!confirm(`Are you sure you want to reset ${type === 'all' ? 'all storage' : type}? This action cannot be undone.`)) {
      return;
    }

    setIsResetting(true);
    setResetType(type);

    try {
      switch (type) {
        case 'indexeddb':
          await resetIndexedDB();
          toast({
            title: "IndexedDB Reset",
            description: "IndexedDB has been successfully reset. Consider refreshing the page."
          });
          // Update stats after reset
          setIndexedDBStats({ books: 0, series: 0 });
          break;
        case 'localstorage':
          resetLocalStorage();
          toast({
            title: "localStorage Reset",
            description: "localStorage has been successfully cleared."
          });
          // Update stats after reset
          setLocalStorageStats({ books: 0, series: 0 });
          break;
        case 'all':
          await resetAllStorage();
          toast({
            title: "Storage Reset",
            description: "All storage systems have been reset successfully. Consider refreshing the page."
          });
          // Update all stats after reset
          setIndexedDBStats({ books: 0, series: 0 });
          setLocalStorageStats({ books: 0, series: 0 });
          break;
      }
    } catch (error) {
      console.error(`Error resetting ${type}:`, error);
      toast({
        title: "Reset Failed",
        description: `Failed to reset ${type}: ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive"
      });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="container py-8 max-w-7xl">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="icon"
            className="mr-2"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">
              Manage your database and storage
            </p>
          </div>
        </div>
        <div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/')}
            className="flex items-center gap-1"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Library
          </Button>
        </div>
      </div>

      <Alert variant="destructive" className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Admin Area</AlertTitle>
        <AlertDescription>
          This area contains advanced functionality for database management. 
          Be careful with these tools as they can modify or delete your data permanently.
        </AlertDescription>
      </Alert>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="viewer" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            <span>Database Viewer</span>
          </TabsTrigger>
          <TabsTrigger value="migration" className="flex items-center gap-2">
            <Server className="h-4 w-4" />
            <span>Data Migration</span>
          </TabsTrigger>
          <TabsTrigger value="reset" className="flex items-center gap-2">
            <Trash2 className="h-4 w-4" />
            <span>Database Reset</span>
          </TabsTrigger>
          <TabsTrigger value="indexeddb-test" className="flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            <span>IndexedDB Test</span>
          </TabsTrigger>
          <TabsTrigger value="backend-test" className="flex items-center gap-2">
            <Beaker className="h-4 w-4" />
            <span>Backend Test</span>
          </TabsTrigger>
        </TabsList>

        {/* Database Viewer Tab */}
        <TabsContent value="viewer">
          <Card>
            <CardHeader>
              <CardTitle>Database Viewer</CardTitle>
              <CardDescription>
                View and inspect your IndexedDB data stores
              </CardDescription>
            </CardHeader>
            <CardContent>
              <IndexedDBViewer />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Data Migration Tab */}
        <TabsContent value="migration">
          <Card>
            <CardHeader>
              <CardTitle>Data Migration</CardTitle>
              <CardDescription>
                Migrate data between localStorage and IndexedDB
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <Card className="p-4">
                  <h3 className="font-medium mb-2">localStorage Data</h3>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span>Books:</span>
                      <span className="font-mono">{localStorageStats.books}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Series:</span>
                      <span className="font-mono">{localStorageStats.series}</span>
                    </div>
                  </div>
                </Card>
                
                <Card className="p-4">
                  <h3 className="font-medium mb-2">IndexedDB Data</h3>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span>Books:</span>
                      <span className="font-mono">{indexedDBStats.books}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Series:</span>
                      <span className="font-mono">{indexedDBStats.series}</span>
                    </div>
                  </div>
                </Card>
              </div>
              
              {/* Migration Status */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Migration Status</CardTitle>
                  <CardDescription>
                    Check if your data needs to be migrated from localStorage to IndexedDB
                  </CardDescription>
                </CardHeader>
                
                <CardContent>
                  {migrationNeeded === null && (
                    <div className="flex items-start gap-3 bg-muted p-4 rounded-md">
                      <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <div>
                        <p className="font-medium">Checking migration status</p>
                        <p className="text-sm">Please wait while we check if data migration is needed...</p>
                      </div>
                    </div>
                  )}
                  
                  {migrationNeeded === true && (
                    <div className="flex items-start gap-3 bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200 p-4 rounded-md">
                      <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">Migration needed</p>
                        <p className="text-sm">
                          You have data in localStorage that needs to be migrated to IndexedDB for proper functionality.
                          Click the "Migrate Data" button below to transfer your data.
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {migrationNeeded === false && (
                    <div className="flex items-start gap-3 bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200 p-4 rounded-md">
                      <CheckCircle2 className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">No migration needed</p>
                        <p className="text-sm">
                          Your data is already properly stored in IndexedDB. No migration is necessary.
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
                
                <CardFooter className="flex justify-end border-t pt-4">
                  <Button 
                    onClick={handleMigration}
                    disabled={isMigrating || migrationNeeded === false}
                    className="flex items-center gap-2"
                  >
                    {isMigrating ? (
                      <>
                        <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Migrating...
                      </>
                    ) : (
                      <>
                        <Database className="h-4 w-4" />
                        Migrate Data
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
              
              {/* Migration Report */}
              {report && (
                <Card>
                  <CardHeader>
                    <CardTitle>Migration Report</CardTitle>
                    <CardDescription>
                      Summary of the data migration process
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Books found in localStorage:</span>
                        <span className="font-medium">{report.booksFound}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Books successfully migrated:</span>
                        <span className="font-medium">{report.booksMigrated}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Series found in localStorage:</span>
                        <span className="font-medium">{report.seriesFound}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Series successfully migrated:</span>
                        <span className="font-medium">{report.seriesMigrated}</span>
                      </div>
                    </div>
                    
                    {report.errors.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-destructive mb-2">Errors ({report.errors.length})</h4>
                        <div className="max-h-40 overflow-y-auto bg-muted p-3 rounded text-sm">
                          <ul className="space-y-1 list-disc pl-5">
                            {report.errors.map((error, index) => (
                              <li key={index}>{error}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </CardContent>
                  
                  <CardFooter>
                    <div className="text-sm text-muted-foreground">
                      Migration completed at {new Date().toLocaleTimeString()}
                    </div>
                  </CardFooter>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Database Reset Tab */}
        <TabsContent value="reset">
          <Card>
            <CardHeader>
              <CardTitle>Database Reset</CardTitle>
              <CardDescription>
                Reset your database to a clean state
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Warning</AlertTitle>
                <AlertDescription>
                  Resetting your database will permanently delete all your books, series, and settings. 
                  This action cannot be undone.
                </AlertDescription>
              </Alert>

              <div className="grid gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Database className="h-5 w-5 mr-2" />
                      Reset IndexedDB
                    </CardTitle>
                    <CardDescription>
                      Clear all data stored in IndexedDB (books, series, etc.)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p>
                      This will delete all books and series data stored in IndexedDB, which is the primary data store for the application.
                      After resetting, you'll need to refresh the page to see the changes take effect.
                    </p>
                  </CardContent>
                  <CardFooter className="flex justify-end">
                    <Button 
                      variant="destructive"
                      onClick={() => handleReset('indexeddb')}
                      disabled={isResetting}
                      className="flex items-center gap-2"
                    >
                      {isResetting && resetType === 'indexeddb' ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                      Reset IndexedDB
                    </Button>
                  </CardFooter>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Database className="h-5 w-5 mr-2" />
                      Reset localStorage
                    </CardTitle>
                    <CardDescription>
                      Clear all data stored in localStorage
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p>
                      This will clear any remaining data in localStorage. Note that the application has been updated to 
                      use IndexedDB as the exclusive source of truth, so this is only needed if you suspect 
                      there's still legacy data in localStorage.
                    </p>
                  </CardContent>
                  <CardFooter className="flex justify-end">
                    <Button 
                      variant="destructive"
                      onClick={() => handleReset('localstorage')}
                      disabled={isResetting}
                      className="flex items-center gap-2"
                    >
                      {isResetting && resetType === 'localstorage' ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                      Reset localStorage
                    </Button>
                  </CardFooter>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Database className="h-5 w-5 mr-2" />
                      Reset All Storage
                    </CardTitle>
                    <CardDescription>
                      Complete reset of all application storage
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p>
                      This will reset both IndexedDB and localStorage, giving you a completely clean slate.
                      After resetting, you should refresh the page to ensure all components 
                      initialize properly with the empty data stores.
                    </p>
                    
                    <div className="mt-4 p-4 border rounded-md bg-muted/50">
                      <h4 className="font-medium mb-2">How to restart the application after reset:</h4>
                      <ol className="list-decimal pl-5 space-y-1">
                        <li>Reset all storage using the button below</li>
                        <li>Refresh the page to reload with empty storage</li>
                      </ol>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-end">
                    <Button 
                      variant="destructive"
                      onClick={() => handleReset('all')}
                      disabled={isResetting}
                      className="flex items-center gap-2"
                    >
                      {isResetting && resetType === 'all' ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                      Reset All Storage
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* IndexedDB Test Tab */}
        <TabsContent value="indexeddb-test">
          <Card>
            <CardHeader>
              <CardTitle>IndexedDB Implementation Tester</CardTitle>
              <CardDescription>
                Verify the enhanced IndexedDB implementation is working correctly
              </CardDescription>
            </CardHeader>
            <CardContent>
              <IndexedDBTester />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Backend Test Tab */}
        <TabsContent value="backend-test">
          <Card>
            <CardHeader>
              <CardTitle>Backend Test Dashboard</CardTitle>
              <CardDescription>
                Test and verify backend API functionality
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BackendTester />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
