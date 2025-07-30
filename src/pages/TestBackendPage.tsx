import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { databaseService } from '@/services/DatabaseService';
import { seriesService } from '@/services/SeriesService';
import { upcomingReleasesService } from '@/services/UpcomingReleasesService';
import { notificationService } from '@/services/NotificationService';
import { readingOrderService } from '@/services/ReadingOrderService';
import { Series } from '@/types/series';
import { Notification } from '@/types/notification';
import { Book } from '@/types/book';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Check, AlertCircle, BookOpen, Bell } from 'lucide-react';

const TestBackendPage = () => {
  const [loading, setLoading] = useState(false);
  const [testResults, setTestResults] = useState<{label: string, success: boolean, message: string}[]>([]);
  const [series, setSeries] = useState<Series[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  // Sample book for testing
  const sampleBook: Book = {
    id: "test-book-1",
    title: "The Way of Kings",
    author: "Brandon Sanderson",
    googleBooksId: "google-123",
    thumbnail: "https://picsum.photos/seed/wayofkings/400/600",
    genre: "fantasy",
    status: "completed",
    rating: 5,
    isPartOfSeries: true,
    _legacySeriesName: "The Stormlight Archive",
    spineColor: 3,
    addedDate: new Date().toISOString()
  };
  
  useEffect(() => {
    // Load initial data
    loadData();
  }, []);
  
  const loadData = async () => {
    try {
      setLoading(true);
      
      // Check if we need to migrate data
      const needsMigration = await databaseService.checkMigrationNeeded();
      if (needsMigration) {
        await databaseService.migrateFromLocalStorage();
      }
      
      // Load series
      const allSeries = await seriesService.getAllSeries();
      setSeries(allSeries);
      
      // Load notifications
      const allNotifications = await notificationService.getAllNotifications();
      setNotifications(allNotifications);
      
      setLoading(false);
    } catch (error) {
      console.error("Error loading data:", error);
      setLoading(false);
    }
  };
  
  const runAllTests = async () => {
    setTestResults([]);
    await testDatabaseConnection();
    await testSeriesOperations();
    await testNotificationOperations();
    await testUpcomingReleasesOperations();
    await testReadingOrderOperations();
  };
  
  const testDatabaseConnection = async () => {
    try {
      await databaseService.initDb();
      addTestResult("Database Connection", true, "Successfully connected to IndexedDB");
    } catch (error) {
      addTestResult("Database Connection", false, `Failed to connect to database: ${error}`);
    }
  };
  
  const testSeriesOperations = async () => {
    try {
      // Add a test series
      const newSeries = await seriesService.createSeries({
        name: "The Stormlight Archive",
        description: "Epic fantasy series set in the world of Roshar",
        author: "Brandon Sanderson",
        books: ["test-book-1"],
        coverImage: "https://via.placeholder.com/400x600?text=Test+Series",
        genre: ["fantasy"],
        status: "ongoing",
        readingOrder: "publication",
        isTracked: true,
        hasUpcoming: false,
        totalBooks: 5,
      });
      
      // Test retrieval
      const retrievedSeries = await seriesService.getSeriesById(newSeries.id);
      if (!retrievedSeries) {
        throw new Error("Failed to retrieve added series");
      }
      
      // Test update
      const updatedSeries = await seriesService.updateSeries(newSeries.id, {
        description: "Updated description for testing"
      });
      
      // Test toggle tracking
      await seriesService.toggleSeriesTracking(newSeries.id, false);
      
      // Reload series
      const allSeries = await seriesService.getAllSeries();
      setSeries(allSeries);
      
      addTestResult("Series Operations", true, `Successfully performed CRUD operations on series`);
    } catch (error) {
      addTestResult("Series Operations", false, `Failed series operations: ${error}`);
    }
  };
  
  const testNotificationOperations = async () => {
    try {
      // Create test notification
      const newNotification = await notificationService.addNotification({
        title: "Test Notification",
        message: "This is a test notification from the backend test",
        type: "system"
      });
      
      // Mark as read
      await notificationService.markAsRead(newNotification.id);
      
      // Reload notifications
      const allNotifications = await notificationService.getAllNotifications();
      setNotifications(allNotifications);
      
      addTestResult("Notification Operations", true, "Successfully performed notification operations");
    } catch (error) {
      addTestResult("Notification Operations", false, `Failed notification operations: ${error}`);
    }
  };
  
  const testUpcomingReleasesOperations = async () => {
    try {
      if (series.length === 0) {
        addTestResult("Upcoming Releases", false, "No series available to test");
        return;
      }
      
      // Add manual upcoming release
      const testRelease = await upcomingReleasesService.addManualRelease({
        title: "Test Upcoming Book",
        seriesId: series[0].id,
        seriesName: series[0].name,
        author: series[0].author || "Test Author",
        expectedReleaseDate: new Date(new Date().setMonth(new Date().getMonth() + 2)),
        coverImageUrl: "https://picsum.photos/seed/testbook/400/600",
        preOrderLink: "https://example.com",
        synopsis: "A test book for the upcoming releases service",
        amazonProductId: "test-123"
      });
      
      // Get upcoming releases for the series
      const releases = await upcomingReleasesService.getReleasesForSeries(series[0].id);
      
      addTestResult("Upcoming Releases", true, `Successfully added and retrieved ${releases.length} upcoming release(s)`);
    } catch (error) {
      addTestResult("Upcoming Releases", false, `Failed upcoming releases operations: ${error}`);
    }
  };
  
  const testReadingOrderOperations = async () => {
    try {
      if (series.length === 0) {
        addTestResult("Reading Order", false, "No series available to test");
        return;
      }
      
      // Test setting reading order
      await readingOrderService.changeReadingOrderMode(series[0].id, "chronological");
      
      // Test setting custom order
      const customOrder = ["test-book-1", "test-book-2", "test-book-3"];
      await readingOrderService.updateCustomOrder(series[0].id, customOrder);
      
      addTestResult("Reading Order", true, "Successfully updated reading order modes");
    } catch (error) {
      addTestResult("Reading Order", false, `Failed reading order operations: ${error}`);
    }
  };
  
  const addTestResult = (label: string, success: boolean, message: string) => {
    setTestResults(prev => [...prev, { label, success, message }]);
  };
  
  return (
    <div className="container py-8">
      <div className="mb-8 space-y-4">
        <h1 className="text-4xl font-bold">Backend Testing Page</h1>
        <p className="text-lg text-muted-foreground">
          Test the Book Series feature backend implementation
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Backend Tests</CardTitle>
            <CardDescription>Run tests to verify backend functionality</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <div className="flex gap-4">
                <Button onClick={runAllTests} disabled={loading}>
                  Run All Tests
                </Button>
                <Button variant="outline" onClick={loadData} disabled={loading}>
                  Reload Data
                </Button>
              </div>
              
              <Separator className="my-2" />
              
              <div className="space-y-4">
                {testResults.map((result, index) => (
                  <Alert key={index} variant={result.success ? "default" : "destructive"}>
                    <div className="flex items-center gap-2">
                      {result.success ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                      <AlertTitle>{result.label}</AlertTitle>
                    </div>
                    <AlertDescription>{result.message}</AlertDescription>
                  </Alert>
                ))}
                
                {testResults.length === 0 && !loading && (
                  <p className="text-muted-foreground">No tests run yet. Click "Run All Tests" to begin testing.</p>
                )}
                
                {loading && <p>Loading...</p>}
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Data Viewer</CardTitle>
            <CardDescription>View data stored in the backend</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="series">
              <TabsList className="mb-4">
                <TabsTrigger value="series">Series ({series.length})</TabsTrigger>
                <TabsTrigger value="notifications">Notifications ({notifications.length})</TabsTrigger>
              </TabsList>
              
              <TabsContent value="series" className="space-y-4">
                {series.map(s => (
                  <Card key={s.id}>
                    <CardHeader className="p-4">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{s.name}</CardTitle>
                        <Badge variant={s.isTracked ? "default" : "outline"}>
                          {s.isTracked ? "Tracked" : "Not Tracked"}
                        </Badge>
                      </div>
                      <CardDescription>{s.author}</CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <p className="text-sm truncate">{s.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="secondary">{s.status || 'Unknown'}</Badge>
                        <Badge variant="outline">{s.readingOrder}</Badge>
                        <Badge variant="outline">Books: {s.books?.length || 0}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {series.length === 0 && (
                  <p className="text-muted-foreground">No series data available.</p>
                )}
              </TabsContent>
              
              <TabsContent value="notifications" className="space-y-4">
                {notifications.map(n => (
                  <Card key={n.id}>
                    <CardHeader className="p-4">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{n.title}</CardTitle>
                        <Badge variant={n.isRead ? "outline" : "default"}>
                          {n.isRead ? "Read" : "Unread"}
                        </Badge>
                      </div>
                      <CardDescription>
                        {new Date(n.createdAt).toLocaleDateString()}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <p className="text-sm">{n.message}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge>{n.type}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {notifications.length === 0 && (
                  <p className="text-muted-foreground">No notification data available.</p>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TestBackendPage;
