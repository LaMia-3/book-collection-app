import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useSettings } from "@/contexts/SettingsContext";
import { Series } from "@/types/series";
import { Book } from "@/types/book";
import { Button } from "@/components/ui/button";
import { Library, Plus, ArrowLeft, BookOpen, Bell, BellOff, RefreshCw, BookMarked } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SeriesCard } from "@/components/series/SeriesCard";
import { CreateSeriesDialog } from "@/components/series/CreateSeriesDialog";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { seriesDetectionService } from "@/services/api/SeriesDetectionService";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SeriesFilterPanel, SeriesFilter } from "@/components/filters/SeriesFilterPanel";
import { enhancedStorageService } from "@/services/storage/EnhancedStorageService";

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
  const [activeTab, setActiveTab] = useState<"all" | "tracked">("tracked");
  const [filter, setFilter] = useState<SeriesFilter>({});
  
  // Extract unique genres and authors for filtering
  const availableGenres = useMemo(() => {
    const genres = new Set<string>();
    series.forEach(s => {
      if (Array.isArray(s.genre)) {
        s.genre.forEach(g => genres.add(g));
      } else if (typeof s.genre === 'string' && s.genre) {
        genres.add(s.genre);
      }
    });
    return Array.from(genres).sort();
  }, [series]);
  
  const availableAuthors = useMemo(() => {
    const authors = new Set<string>();
    series.forEach(s => {
      if (s.author) authors.add(s.author);
    });
    return Array.from(authors).sort();
  }, [series]);
  
  // Apply filters to series
  const filteredSeries = useMemo(() => {
    // Start with the tab filter
    let result = activeTab === "tracked" ? series.filter(s => s.isTracked) : series;
    
    // Apply search filter
    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      result = result.filter(s => 
        s.name.toLowerCase().includes(searchLower) ||
        (s.author && s.author.toLowerCase().includes(searchLower)) ||
        (s.description && s.description.toLowerCase().includes(searchLower))
      );
    }
    
    // Apply genre filter
    if (filter.genres && filter.genres.length > 0) {
      result = result.filter(s => {
        if (Array.isArray(s.genre)) {
          return s.genre.some(g => filter.genres?.includes(g));
        }
        return typeof s.genre === 'string' && filter.genres.includes(s.genre);
      });
    }
    
    // Apply status filter
    if (filter.statuses && filter.statuses.length > 0) {
      result = result.filter(s => 
        s.status && filter.statuses?.includes(s.status as any)
      );
    }
    
    // Apply author filter
    if (filter.authors && filter.authors.length > 0) {
      result = result.filter(s => 
        s.author && filter.authors?.includes(s.author)
      );
    }
    
    return result;
  }, [series, activeTab, filter]);
  
  // Clear all filters
  const clearFilters = () => {
    setFilter({});
  };
  
  // Get the personalized library name
  const libraryName = settings.preferredName 
    ? `${settings.preferredName}'s Series Collection`
    : "My Series Collection";
    
  // Load books and series from IndexedDB with localStorage fallback
  useEffect(() => {
    setIsLoading(true);
    
    const loadData = async () => {
      try {
        // Initialize the enhanced storage service
        await enhancedStorageService.initialize();
        
        // Load books data from IndexedDB and convert to expected format if needed
        const booksFromDB = await enhancedStorageService.getBooks();
        
        // Convert from IndexedDB format to the app's Book format
        const convertedBooks = booksFromDB.map(book => {
          // For debug: log series-related fields from IndexedDB
          console.log(`IndexedDB Book "${book.title}": seriesId=${book.seriesId}, isPartOfSeries=${book.isPartOfSeries}`);
          
          const adaptedBook: Book = {
            id: book.id,
            title: book.title,
            author: book.author,
            genre: book.genre,
            description: book.description,
            publishedDate: book.publishedDate,
            pageCount: book.pageCount,
            thumbnail: book.thumbnail,
            googleBooksId: book.sourceId, // Map from new field to old field
            status: book.status as any, // Convert status enum
            completedDate: book.dateCompleted,
            rating: book.rating,
            notes: book.notes,
            // CRITICAL FIX: Handle series fields properly for filtering in CreateSeriesDialog
            isPartOfSeries: !!book.seriesId || book.isPartOfSeries === true ? true : false,
            seriesId: book.seriesId || undefined,
            _legacySeriesName: book.seriesName || undefined, // Add legacy series name if it exists
            volumeNumber: (book as any).volumeNumber || book.seriesPosition, // Use either field with type assertion
            seriesPosition: book.seriesPosition,
            spineColor: book.spineColor,
            // Use dateAdded if available, otherwise addedDate or current date
            addedDate: book.dateAdded || (book as any).addedDate || new Date().toISOString()
          };
          return adaptedBook;
        });
        
        console.log('Books from IndexedDB:', booksFromDB.length);
        console.log('Converted books for UI:', convertedBooks.length);
        console.log('Books NOT in series:', convertedBooks.filter(b => !b.isPartOfSeries && !b.seriesId).length);
        
        setBooks(convertedBooks);
        
        // Load series data from IndexedDB and convert to expected format if needed
        const seriesFromDB = await enhancedStorageService.getSeries();
        const convertedSeries = seriesFromDB.map(series => ({
          ...series,
          // Ensure required fields exist
          createdAt: new Date(series.dateAdded || new Date().toISOString()),
          updatedAt: new Date(series.lastModified || new Date().toISOString())
        }));
        setSeries(convertedSeries as Series[]);
      } catch (error) {
        console.error("Error loading data from IndexedDB:", error);
        
        // Fallback to localStorage if IndexedDB fails
        // Load books data
        const savedBooks = localStorage.getItem("bookLibrary");
        let parsedBooks: Book[] = [];
        if (savedBooks) {
          try {
            parsedBooks = JSON.parse(savedBooks);
            setBooks(parsedBooks);
          } catch (error) {
            console.error("Error parsing book data:", error);
          }
        }
        
        // Load series data
        const savedSeries = localStorage.getItem("seriesLibrary");
        if (savedSeries) {
          try {
            const parsedSeries = JSON.parse(savedSeries);
            setSeries(parsedSeries);
          } catch (error) {
            console.error("Error parsing series data:", error);
          }
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, []);
  
  // Sync to localStorage AND IndexedDB whenever series changes
  // localStorage remains the primary source of truth for UI per critical implementation detail
  useEffect(() => {
    if (series.length > 0) {
      // FIRST: Update localStorage as primary source of truth for UI
      localStorage.setItem("seriesLibrary", JSON.stringify(series));
      
      // SECOND: Update IndexedDB for persistence
      // We do this in the background and don't block the UI
      const updateIndexedDB = async () => {
        try {
          // Initialize storage if needed
          await enhancedStorageService.initialize();
          
          // Save each series individually with proper type conversion
          for (const seriesItem of series) {
            const enhancedSeries = {
              ...seriesItem,
              // Add required IndexedDB fields if they don't exist
              readingProgress: (seriesItem as any).readingProgress || 0,
              completedBooks: (seriesItem as any).completedBooks || 0,
              dateAdded: (seriesItem as any).dateAdded || 
                        (seriesItem.createdAt instanceof Date ? seriesItem.createdAt.toISOString() : 
                          typeof seriesItem.createdAt === 'string' ? seriesItem.createdAt : 
                          new Date().toISOString()),
              lastModified: (seriesItem as any).lastModified || 
                           (seriesItem.updatedAt instanceof Date ? seriesItem.updatedAt.toISOString() : 
                            typeof seriesItem.updatedAt === 'string' ? seriesItem.updatedAt : 
                            new Date().toISOString())
            };
            await enhancedStorageService.saveSeries(enhancedSeries as any);
          }
        } catch (error) {
          console.error("Failed to sync series to IndexedDB:", error);
          // Don't show errors to user - localStorage is primary source of truth
        }
      };
      
      // Run the IndexedDB update without blocking
      updateIndexedDB();
    }
  }, [series]);
  
  // Handle deleting a series
  const handleDeleteSeries = async (seriesId: string) => {
    setIsLoading(true);
    
    try {
      // Delete from IndexedDB using enhancedStorageService
      await enhancedStorageService.deleteSeries(seriesId);
      
      // Update local state
      setSeries(prev => prev.filter(s => s.id !== seriesId));
      
      toast({
        title: "Series Deleted",
        description: "The series has been permanently deleted.",
      });
    } catch (error) {
      console.error("Error deleting series:", error);
      toast({
        title: "Delete Failed",
        description: `Failed to delete series: ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle tracking toggle
  const handleToggleTracking = async (seriesId: string, tracked: boolean) => {
    try {
      // Find the series in our current state
      const seriesItem = series.find(s => s.id === seriesId);
      if (!seriesItem) return;
      
      // Create updated series object for UI state
      const updatedSeriesItem = { 
        ...seriesItem, 
        isTracked: tracked,
      };
      
      // Update in state immediately for UI responsiveness
      const updatedSeries = series.map(s => {
        if (s.id === seriesId) {
          return updatedSeriesItem;
        }
        return s;
      });
      
      // Update state
      setSeries(updatedSeries);
      
      // Persist to localStorage for backward compatibility (PRIMARY SOURCE OF TRUTH FOR UI)
      localStorage.setItem('seriesLibrary', JSON.stringify(updatedSeries));
      
      // Create enhanced object for IndexedDB with all required fields
      const enhancedSeriesItem = {
        ...seriesItem,
        isTracked: tracked,
        readingProgress: (seriesItem as any).readingProgress || 0,
        completedBooks: (seriesItem as any).completedBooks || 0,
        dateAdded: (seriesItem as any).dateAdded || seriesItem.createdAt?.toISOString() || new Date().toISOString(),
        lastModified: new Date().toISOString()
      };
      
      // Save to IndexedDB
      await enhancedStorageService.saveSeries(enhancedSeriesItem as any);
      
      toast({
        title: tracked ? "Series Tracking Enabled" : "Series Tracking Disabled",
        description: tracked ? "You'll be notified about updates to this series" : "You won't receive notifications for this series",
      });
    } catch (error) {
      console.error("Error updating series tracking:", error);
      toast({
        title: "Error",
        description: "Failed to update series tracking. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Detect series from books using the API service
  const detectSeriesFromBooks = async (books: Book[]): Promise<Series[]> => {
    try {
      // Use detection service to find potential series
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
      
      // Update state
      setSeries(updatedSeries);
      
      // Save to IndexedDB individually to avoid type errors
      for (const seriesItem of updatedSeries) {
        const enhancedSeries = {
          ...seriesItem,
          // Add required IndexedDB fields if they don't exist
          readingProgress: (seriesItem as any).readingProgress || 0,
          completedBooks: (seriesItem as any).completedBooks || 0,
          dateAdded: (seriesItem as any).dateAdded || seriesItem.createdAt?.toISOString() || new Date().toISOString(),
          lastModified: (seriesItem as any).lastModified || seriesItem.updatedAt?.toISOString() || new Date().toISOString()
        };
        await enhancedStorageService.saveSeries(enhancedSeries as any);
      }
      
      // Maintain localStorage for backward compatibility
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
      
      {/* Series Tabs */}
      <Tabs defaultValue="tracked" onValueChange={(v) => setActiveTab(v as "all" | "tracked")} className="mt-6">
        <div className="flex items-center justify-between mb-6">
          <TabsList className="grid w-[400px] grid-cols-2">
            <TabsTrigger value="tracked" className="flex items-center gap-2">
              <BookMarked className="h-4 w-4" />
              Tracked Series <span className="ml-1.5 text-xs bg-muted rounded-full px-2 py-0.5">{series.filter(s => s.isTracked).length}</span>
            </TabsTrigger>
            <TabsTrigger value="all" className="flex items-center gap-2">
              <Library className="h-4 w-4" />
              All Series <span className="ml-1.5 text-xs bg-muted rounded-full px-2 py-0.5">{series.length}</span>
            </TabsTrigger>
          </TabsList>
          
          <div className="text-sm text-muted-foreground">
            {activeTab === "tracked" 
              ? "Series you're tracking for updates"
              : "All series in your collection"}
          </div>
        </div>
        
        {/* Series Filter Panel */}
        <SeriesFilterPanel
          filter={filter}
          onFilterChange={setFilter}
          genres={availableGenres}
          authors={availableAuthors}
          onClearFilters={clearFilters}
        />
        
        <TabsContent value="all" className="mt-0">
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
          
          {/* All Series grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-64 animate-pulse bg-muted rounded-lg" />
              ))}
            </div>
          ) : series.length > 0 && (
            <>
              {filteredSeries.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 border border-dashed rounded-lg">
                  <p className="text-muted-foreground">No series match your filters</p>
                  <Button 
                    variant="link" 
                    className="mt-2"
                    onClick={clearFilters}
                  >
                    Clear all filters
                  </Button>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredSeries.map(seriesItem => (
                  <SeriesCard 
                    key={seriesItem.id} 
                    series={seriesItem}
                    onToggleTracking={handleToggleTracking}
                    onDeleteSeries={handleDeleteSeries}
                  />
                ))}
              </div>
            </>
          )}
        </TabsContent>
        
        <TabsContent value="tracked" className="mt-0">
          {/* Empty state when no tracked series exist */}
          {series.filter(s => s.isTracked).length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-muted-foreground/20 rounded-lg">
              <BookMarked className="h-16 w-16 text-muted-foreground/40 mb-4" />
              <h2 className="text-xl font-medium mb-2">No Tracked Series</h2>
              <p className="text-muted-foreground text-center max-w-md mb-6">
                Track series to get notifications about upcoming releases and keep up with your favorite authors.
              </p>
              {series.length > 0 ? (
                <div className="text-center">
                  <p className="mb-3 text-sm">You have {series.length} series in your collection</p>
                  <Button 
                    onClick={() => setActiveTab("all")}
                    variant="outline"
                  >
                    <Bell className="h-4 w-4 mr-2" />
                    Enable Tracking for Series
                  </Button>
                </div>
              ) : (
                <Button 
                  onClick={() => setIsCreatingNewSeries(true)}
                  className="bg-gradient-warm hover:bg-primary-glow"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Series
                </Button>
              )}
            </div>
          )}
          
          {/* Tracked Series grid */}
          {!isLoading && series.filter(s => s.isTracked).length > 0 && (
            <>
              {filteredSeries.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 border border-dashed rounded-lg">
                  <p className="text-muted-foreground">No tracked series match your filters</p>
                  <Button 
                    variant="link" 
                    className="mt-2"
                    onClick={clearFilters}
                  >
                    Clear all filters
                  </Button>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredSeries.map(seriesItem => (
                  <SeriesCard 
                    key={seriesItem.id} 
                    series={seriesItem}
                    onToggleTracking={handleToggleTracking}
                    onDeleteSeries={handleDeleteSeries}
                  />
                ))
                }
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
      
      {/* Create Series Dialog */}
      <CreateSeriesDialog
        open={isCreatingNewSeries}
        onOpenChange={setIsCreatingNewSeries}
        onSeriesCreated={(newSeries) => {
          // Update state immediately for UI responsiveness
          setSeries(prev => [...prev, newSeries]);
          
          // Save to IndexedDB in the background
          (async () => {
            try {
              const enhancedSeries = {
                ...newSeries,
                readingProgress: 0,
                completedBooks: 0,
                dateAdded: new Date().toISOString(),
                lastModified: new Date().toISOString()
              };
              await enhancedStorageService.saveSeries(enhancedSeries as any);
            } catch (error) {
              console.error("Error saving new series to IndexedDB:", error);
            }
          })();
        }}
      />
    </div>
  );
};

export default SeriesPage;
