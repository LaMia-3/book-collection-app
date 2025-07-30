import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSettings } from "@/contexts/SettingsContext";
import { Series } from "@/types/series";
import { Book } from "@/types/book";
import { Button } from "@/components/ui/button";
import { Library, Plus, ArrowLeft, BookOpen, Bell, BellOff, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SeriesCard } from "@/components/series/SeriesCard";
import { CreateSeriesDialog } from "@/components/series/CreateSeriesDialog";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { seriesDetectionService } from "@/services/api/SeriesDetectionService";
import { generateMockSeries, detectPotentialSeries } from "@/utils/mockApiData";

/**
 * Series management page component
 */
const SeriesPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { settings } = useSettings();
  const [books, setBooks] = useState<Book[]>([]);
  const [series, setSeries] = useState<Series[]>([]);
  const [isCreatingNewSeries, setIsCreatingNewSeries] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Get the personalized library name
  const libraryName = settings.preferredName 
    ? `${settings.preferredName}'s Series Collection`
    : "My Series Collection";
    
  // Load books and series from localStorage on component mount
  useEffect(() => {
    setIsLoading(true);
    
    const loadData = async () => {
      // Load books data
      const savedBooks = localStorage.getItem("bookLibrary");
      let parsedBooks: Book[] = [];
      if (savedBooks) {
        try {
          parsedBooks = JSON.parse(savedBooks);
          setBooks(parsedBooks);
        } catch (error) {
          console.error("Error loading books from localStorage:", error);
          setBooks([]);
        }
      }
      
      // Load series data
      const savedSeries = localStorage.getItem("seriesLibrary");
      let seriesData: Series[] = [];
      
      try {
        if (savedSeries) {
          seriesData = JSON.parse(savedSeries);
        } 
        // If no saved series data or empty array, generate mock series
        else if (parsedBooks.length > 0) {
          seriesData = await detectSeriesFromBooks(parsedBooks);
        }
        
        setSeries(seriesData);
      } catch (error) {
        console.error("Error processing series data:", error);
        setSeries([]);
      }
      
      setIsLoading(false);
    };
    
    loadData();
  }, []);
  
  // Save series to localStorage whenever it changes
  useEffect(() => {
    if (series.length > 0) {
      localStorage.setItem("seriesLibrary", JSON.stringify(series));
    }
  }, [series]);
  
  // Handle tracking toggle
  // Detect series from books using the API service
  const detectSeriesFromBooks = async (books: Book[]): Promise<Series[]> => {
    try {
      // Use mock data for demonstration if we have less than 10 books
      if (books.length < 10) {
        return generateMockSeries();
      }
      
      // For larger collections, use the detection service
      const potentialSeries = await seriesDetectionService.detectSeriesFromCollection(books);
      
      // Convert the Map to an array of Series objects
      const series: Series[] = [];
      
      for (const [seriesName, seriesBooks] of potentialSeries.entries()) {
        // Enrich the series data with API information
        const enrichedData = await seriesDetectionService.enrichSeriesData(seriesName, seriesBooks);
        
        series.push({
          id: `series-${seriesName.toLowerCase().replace(/\s+/g, '-')}-${Date.now().toString(36)}`,
          name: seriesName,
          books: seriesBooks.map(book => book.id),
          readingOrder: 'publication',
          isTracked: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          ...enrichedData
        } as Series);
      }
      
      return series;
    } catch (error) {
      console.error('Error detecting series:', error);
      return [];
    }
  };
  
  // Handle series detection button click
  const handleDetectSeries = async () => {
    setIsLoading(true);
    
    try {
      // Use the detective service
      const detectedSeries = await detectSeriesFromBooks(books);
      
      // Merge with existing series
      const updatedSeries = [...series];
      
      for (const newSeries of detectedSeries) {
        // Check if we already have this series
        if (!updatedSeries.some(existing => existing.name === newSeries.name)) {
          updatedSeries.push(newSeries);
        }
      }
      
      // Update state and localStorage
      setSeries(updatedSeries);
      localStorage.setItem("seriesLibrary", JSON.stringify(updatedSeries));
      
      toast({
        title: "Series Detection Complete",
        description: `${detectedSeries.length} potential series found in your collection.`
      });
    } catch (error) {
      console.error('Error during series detection:', error);
      toast({
        title: "Detection Error",
        description: "There was a problem detecting series from your books.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle toggle tracking
  const handleToggleTracking = (seriesId: string, tracked: boolean) => {
    setSeries(prevSeries => 
      prevSeries.map(s => 
        s.id === seriesId ? { ...s, isTracked: tracked } : s
      )
    );
    
    // Update localStorage
    localStorage.setItem("seriesLibrary", JSON.stringify(
      series.map(s => s.id === seriesId ? { ...s, isTracked: tracked } : s)
    ));
    
    toast({
      title: tracked ? "Series tracking enabled" : "Series tracking disabled",
      description: tracked 
        ? "You'll be notified about new releases in this series" 
        : "You won't receive notifications for this series anymore"
    });
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center justify-between mb-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/')}
              className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              <BookOpen className="h-4 w-4 mr-1" />
              Back to Library
            </Button>
            
            <div className="flex items-center">
              <NotificationBell />
            </div>
          </div>
          <h1 className="text-2xl font-serif font-semibold mb-1">
            {libraryName}
          </h1>
          <p className="text-muted-foreground">
            {series.length === 0 
              ? "Start organizing your books into series"
              : `${series.length} series in your collection`}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline"
            onClick={handleDetectSeries}
            disabled={isLoading}
            title="Detect series from your book collection"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Detect Series
          </Button>
          
          <Button 
            onClick={() => setIsCreatingNewSeries(true)}
            className="bg-gradient-warm hover:bg-primary-glow"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Series
          </Button>
        </div>
      </div>
      
      {/* Empty state when no series exist */}
      {series.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-muted-foreground/20 rounded-lg">
          <Library className="h-16 w-16 text-muted-foreground/40 mb-4" />
          <h2 className="text-xl font-medium mb-2">No Series Yet</h2>
          <p className="text-muted-foreground text-center max-w-md mb-6">
            Organize your books into series to track your progress, manage reading order, 
            and get notified about upcoming releases.
          </p>
          <Button 
            onClick={() => setIsCreatingNewSeries(true)}
            className="bg-gradient-warm hover:bg-primary-glow"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Series
          </Button>
        </div>
      )}
      
      {/* Series grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-64 animate-pulse bg-muted rounded-lg" />
          ))}
        </div>
      ) : series.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {series.map(seriesItem => (
            <SeriesCard 
              key={seriesItem.id} 
              series={seriesItem}
              onToggleTracking={handleToggleTracking}
            />
          ))}
        </div>
      ) : null}
      
      {/* Create Series Dialog */}
      <CreateSeriesDialog
        open={isCreatingNewSeries}
        onOpenChange={setIsCreatingNewSeries}
        books={books}
        onSeriesCreated={(newSeries) => {
          setSeries(prev => [...prev, newSeries]);
        }}
      />
    </div>
  );
};

export default SeriesPage;
