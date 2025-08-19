import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Database, AlertCircle, Trash2, RefreshCw, Settings, Server, CheckCircle2, Wrench, Zap, UserCircle } from "lucide-react";
import { PageHeader, HeaderActionButton } from '@/components/ui/page-header';
import { useToast } from '@/hooks/use-toast';

// Import components and utilities
import { IndexedDBViewer } from '@/components/debug/IndexedDBViewer';
import WorkflowTester from '@/components/debug/WorkflowTester';
import { resetIndexedDB, resetLocalStorage, resetAllStorage } from '@/utils/ResetDatabaseUtil';
import { migrateDataToIndexedDB, isMigrationNeeded } from '@/utils/DataMigrationUtil';
import { useSettings } from '@/contexts/SettingsContext';

// Import services
import { databaseService } from '@/services/DatabaseService';
import { seriesService } from '@/services/SeriesService';
import { upcomingReleasesService } from '@/services/UpcomingReleasesService';
import { notificationService } from '@/services/NotificationService';
import { readingOrderService } from '@/services/ReadingOrderService';

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
  const { settings } = useSettings();
  const [isResetting, setIsResetting] = useState(false);
  const [resetType, setResetType] = useState<'indexeddb' | 'localstorage' | 'all' | null>(null);
  
  // Data migration state
  // Migration state
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationNeeded, setMigrationNeeded] = useState<boolean | null>(null);
  const [report, setReport] = useState<MigrationReport | null>(null);
  
  // Storage statistics state
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
    if (isMigrating) return;
    
    setIsMigrating(true);
    
    try {
      const result = await migrateDataToIndexedDB();
      setReport(result);
      setMigrationNeeded(false);
      
      // Refresh storage stats
      const { enhancedStorageService } = await import('@/services/storage/EnhancedStorageService');
      const books = await enhancedStorageService.getBooks();
      const series = await enhancedStorageService.getSeries();
      
      setIndexedDBStats({
        books: books.length,
        series: series.length
      });
      
      toast({
        title: "Migration Complete",
        description: `Migrated ${result.booksMigrated} books and ${result.seriesMigrated} series to IndexedDB.`,
        variant: "default"
      });
    } catch (error) {
      console.error('Error migrating data:', error);
      toast({
        title: "Migration Failed",
        description: `Failed to migrate data: ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive"
      });
    } finally {
      setIsMigrating(false);
    }
  };
  
  // Handle database reset
  const handleReset = async (type: 'indexeddb' | 'localstorage' | 'all') => {
    if (isResetting) return;
    
    const confirmReset = window.confirm(
      type === 'all' 
        ? 'Are you sure you want to reset all storage? This will delete all your books and series data.'
        : type === 'indexeddb'
          ? 'Are you sure you want to reset IndexedDB? This will delete all your books and series data from IndexedDB.'
          : 'Are you sure you want to reset localStorage? This will delete any legacy data that might still be in localStorage.'
    );
    
    if (!confirmReset) return;
    
    setIsResetting(true);
    setResetType(type);
    
    try {
      if (type === 'indexeddb') {
        await resetIndexedDB();
        // Update IndexedDB stats
        setIndexedDBStats({ books: 0, series: 0 });
      } else if (type === 'localstorage') {
        await resetLocalStorage();
        // Update localStorage stats
        setLocalStorageStats({ books: 0, series: 0 });
      } else {
        // Reset both
        await resetAllStorage();
        // Update both stats
        setIndexedDBStats({ books: 0, series: 0 });
        setLocalStorageStats({ books: 0, series: 0 });
      }
      
      toast({
        title: "Reset Successful",
        description: `Successfully reset ${type === 'all' ? 'all storage' : type}. You may need to refresh the page.`,
        variant: "default"
      });
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
      <PageHeader
        title="Admin Dashboard"
        subtitle="Manage your database and storage"
        backTo="/"
        backAriaLabel="Back to Library"
        className="mb-8"
      >
      
      <Tabs defaultValue={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex w-full mb-8">
          <TabsTrigger value="viewer" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            <span>Database Viewer</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <UserCircle className="h-4 w-4" />
            <span>User Settings</span>
          </TabsTrigger>
          <TabsTrigger value="migration" className="flex items-center gap-2">
            <Server className="h-4 w-4" />
            <span>Data Migration</span>
          </TabsTrigger>
          <TabsTrigger value="reset" className="flex items-center gap-2">
            <Trash2 className="h-4 w-4" />
            <span>Database Reset</span>
          </TabsTrigger>
          <TabsTrigger value="workflow-test" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            <span>Workflow Test</span>
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
              <CardTitle className="flex items-center">
                <Database className="h-5 w-5 mr-2" />
                Data Migration
                <Badge variant="outline" className="ml-2 text-yellow-500 border-yellow-500">Legacy Support</Badge>
              </CardTitle>
              <CardDescription>
                Migrate any legacy localStorage data to IndexedDB (the app's exclusive source of truth)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <Card className="p-4">
                  <h3 className="font-medium mb-2">
                    localStorage Data 
                    <Badge variant="outline" className="ml-1 text-yellow-500 border-yellow-500 text-xs">Legacy</Badge>
                    <span className="text-xs text-muted-foreground">(deprecated)</span>
                  </h3>
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
                  <h3 className="font-medium mb-2">
                    IndexedDB Data 
                    <Badge variant="outline" className="ml-1 text-primary border-primary text-xs">Primary Storage</Badge>
                    <span className="text-xs text-primary">(exclusive source of truth)</span>
                  </h3>
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
                  <CardTitle className="flex items-center">
                    <AlertCircle className="h-5 w-5 mr-2" />
                    Migration Status
                  </CardTitle>
                  <CardDescription>
                    Check if any legacy data needs to be migrated to IndexedDB (the app's exclusive data store)
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
                          You have legacy data in localStorage that should be migrated to IndexedDB, which is now the exclusive source of truth for all application data.
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
              <CardTitle className="flex items-center">
                <Trash2 className="h-5 w-5 mr-2" />
                Database Reset
              </CardTitle>
              <CardDescription>
                Reset your database and start fresh
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <Alert className="bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-900">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Warning</AlertTitle>
                  <AlertDescription>
                    Resetting your database will permanently delete all your data. This action cannot be undone.
                  </AlertDescription>
                </Alert>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Database className="h-5 w-5 mr-2" />
                      Reset IndexedDB
                      <Badge variant="outline" className="ml-2 text-primary border-primary">Primary Storage</Badge>
                    </CardTitle>
                    <CardDescription>
                      Clear all data stored in IndexedDB (the app's exclusive source of truth)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p>
                      This will delete all your books, series, and settings data stored in IndexedDB.
                      Since IndexedDB is now the exclusive source of truth for all application data, 
                      resetting it will give you a completely clean slate.
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
                      <Server className="h-5 w-5 mr-2" />
                      Reset localStorage
                      <Badge variant="outline" className="ml-2 text-yellow-500 border-yellow-500">Legacy Storage</Badge>
                    </CardTitle>
                    <CardDescription>
                      Clear all data stored in legacy localStorage (deprecated storage)
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
                      This will reset both IndexedDB (primary storage) and localStorage (legacy storage), giving you a completely clean slate.
                      After resetting, you should refresh the page to ensure all components initialize properly with the empty data stores.
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

        {/* User Settings Tab */}
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <UserCircle className="h-5 w-5 mr-2" />
                User Settings
              </CardTitle>
              <CardDescription>
                View and manage user settings, including birthday information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <Card className="p-4">
                  <h3 className="font-medium mb-4">General Settings</h3>
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2 items-center">
                      <span className="font-medium">Preferred Name:</span>
                      <span className="col-span-2">{settings.preferredName || 'Not set'}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 items-center">
                      <span className="font-medium">Birthday:</span>
                      <span className="col-span-2">{settings.birthday || 'Not set'}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 items-center">
                      <span className="font-medium">Celebrate Birthday:</span>
                      <span className="col-span-2">{settings.celebrateBirthday ? 'Yes' : 'No'}</span>
                    </div>
                  </div>
                </Card>

                <Card className="p-4">
                  <h3 className="font-medium mb-4">View & API Preferences</h3>
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2 items-center">
                      <span className="font-medium">Default View:</span>
                      <span className="col-span-2">{settings.defaultView || 'shelf'}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 items-center">
                      <span className="font-medium">Default API:</span>
                      <span className="col-span-2">{settings.defaultApi || 'google'}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 items-center">
                      <span className="font-medium">Default Status:</span>
                      <span className="col-span-2">{settings.defaultStatus || 'want-to-read'}</span>
                    </div>
                  </div>
                </Card>

                <Card className="p-4">
                  <h3 className="font-medium mb-4">Reading Goals</h3>
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2 items-center">
                      <span className="font-medium">Goals Enabled:</span>
                      <span className="col-span-2">{settings.goals?.enabled ? 'Yes' : 'No'}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 items-center">
                      <span className="font-medium">Monthly Target:</span>
                      <span className="col-span-2">{settings.goals?.monthlyTarget || 0} books</span>
                    </div>
                  </div>
                </Card>

                <Alert className="bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-200 dark:border-blue-900">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Birthday Information</AlertTitle>
                  <AlertDescription>
                    The birthday is stored in user settings and is used to display the birthday celebration. 
                    The current format is: {settings.birthday ? `"${settings.birthday}"` : 'Not set'}
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Workflow Test Tab */}
        <TabsContent value="workflow-test">
          <Card>
            <CardHeader>
              <CardTitle>Library Workflow Tester</CardTitle>
              <CardDescription>
                Add sample books from Google Books and Open Library APIs and organize them into series
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WorkflowTester />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Workflow Test is now the last tab */}
      </Tabs>
      </PageHeader>
    </div>
  );
}
