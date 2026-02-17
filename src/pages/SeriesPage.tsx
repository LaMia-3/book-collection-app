import { useState, useEffect, useMemo } from "react";
import { Settings } from "@/components/Settings";
import { useNavigate } from "react-router-dom";
import { useSettings } from "@/contexts/SettingsContext";
import { useLibrarySettings } from '@/hooks/useLibrarySettings';
import { Series } from "@/types/series";
import { Book } from "@/types/book";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Library, Plus, BookOpen, Bell, BellOff, RefreshCw, BookMarked, Grid3X3, List, Search, X, Filter, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SeriesCard } from "@/components/series/SeriesCard";
import { CreateSeriesDialog } from "@/components/series/CreateSeriesDialog";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { seriesDetectionService } from "@/services/api/SeriesDetectionService";
import { Checkbox } from "@/components/ui/checkbox";
import { SeriesFilterPanel, SeriesFilter } from "@/components/filters/SeriesFilterPanel";
import { enhancedStorageService } from "@/services/storage/EnhancedStorageService";
import { PageHeader, HeaderActionButton } from "@/components/ui/page-header";
import { AppLayout } from "@/components/layout/AppLayout";

/**
 * Series management page component
 */
const SeriesPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { settings } = useSettings();
  const [series, setSeries] = useState<Series[]>([]);
  const [isCreatingNewSeries, setIsCreatingNewSeries] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const { books, setBooks, showSettings, settingsProps, setShowSettings } = useLibrarySettings({
    onLibraryCleared: () => setSeries([]),
  });
  const [filter, setFilter] = useState<SeriesFilter>({});
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  
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
    // Start with all series
    let result = series;
    
    // Apply tracked filter if enabled
    if (filter.tracked) {
      result = result.filter(s => s.isTracked);
    }
    
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
  }, [series, filter]);
  
  // Clear all filters
  const clearFilters = () => {
    setFilter({});
  };
  
  // Get the personalized library name
  const libraryName = settings.preferredName 
    ? `${settings.preferredName}'s Series`
    : "My Series";
    
  // Load books and series from IndexedDB as the sole source of truth
  useEffect(() => {
    setIsLoading(true);
    
    const loadData = async () => {
      try {
        // Initialize the enhanced storage service
        await enhancedStorageService.initialize();
        
        // Load books data from IndexedDB
        const booksFromDB = await enhancedStorageService.getBooks();
        
        // Books are already in the correct format thanks to the adapter
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
            completedDate: (book as any).dateCompleted,
            rating: book.rating,
            notes: book.notes,
            // CRITICAL FIX: Handle series fields properly for filtering in CreateSeriesDialog
            isPartOfSeries: !!book.seriesId || book.isPartOfSeries === true ? true : false,
            seriesId: book.seriesId || undefined,
            // Use safe type assertions for fields that might not exist in the type
            _legacySeriesName: (book as any).seriesName || undefined, // Add legacy series name if it exists
            volumeNumber: (book as any).volumeNumber || (book as any).seriesPosition, // Use either field with type assertion
            seriesPosition: (book as any).seriesPosition,
            spineColor: (book as any).spineColor,
            // Use dateAdded if available, otherwise addedDate or current date
            addedDate: (book as any).dateAdded || (book as any).addedDate || new Date().toISOString()
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
        toast({
          title: "Error",
          description: "There was a problem loading your series data.",
          variant: "destructive"
        });
        
        // Initialize with empty arrays on error
        setBooks([]);
        setSeries([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, []);
  
  // Sync changes to IndexedDB whenever series changes
  useEffect(() => {
    if (series.length > 0 && !isLoading) {
      // Update IndexedDB as the sole source of truth
      const updateIndexedDB = async () => {
        try {
          // Update each series individually for better error isolation
          for (const uiSeries of series) {
            try {
              await enhancedStorageService.saveSeries(uiSeries);
            } catch (error) {
              console.error(`Error updating series ${uiSeries.id} in IndexedDB:`, error);
              toast({
                title: "Error",
                description: `Could not update series ${uiSeries.name}`,
                variant: "destructive"
              });
            }
          }
        } catch (error) {
          console.error('Error in batch update of series in IndexedDB:', error);
          toast({
            title: "Error",
            description: "Could not save all series changes",
            variant: "destructive"
          });
        }
      };
      
      updateIndexedDB();
    }
  }, [series, isLoading, toast]);
  
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
      
      // Update IndexedDB as the sole source of truth
      enhancedStorageService.saveSeries(updatedSeriesItem)
        .then(() => {
          console.log(`Series ${updatedSeriesItem.id} updated in IndexedDB`);
        })
        .catch(error => {
          console.error(`Error updating series ${updatedSeriesItem.id} in IndexedDB:`, error);
          toast({
            title: "Error",
            description: "Could not update series tracking status in database",
            variant: "destructive"
          });
        });
      
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

  // TODO: This function will be redone in a future update
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
  
  // TODO: This function will be redone in a future update
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
      
      // Update IndexedDB as the sole source of truth
      try {
        for (const seriesItem of updatedSeries) {
          await enhancedStorageService.saveSeries(seriesItem);
        }
      } catch (error) {
        console.error('Error updating IndexedDB:', error);
        toast({
          title: "Error",
          description: "Could not save all series changes",
          variant: "destructive"
        });
      }
      
      toast({
        title: "Series Detection Complete",
        description: `${detectedSeries.length} potential series found in your collection.`,
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
    <AppLayout
      onAddClick={() => setIsCreatingNewSeries(true)}
      onSettingsClick={() => setShowSettings(true)}
      addButtonLabel="Add Series"
      searchComponent={
        <div className="flex items-center gap-2 w-full">
          {/* Search input */}
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              type="text"
              value={filter.search || ''}
              onChange={(e) => setFilter({ ...filter, search: e.target.value || undefined })}
              placeholder="Search series..."
              className="pl-10 h-10 text-sm w-full"
            />
            {filter.search && (
              <button
                type="button"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center justify-center text-muted-foreground hover:text-foreground"
                onClick={() => setFilter({ ...filter, search: undefined })}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          
          {/* Sort dropdown */}
          <Select
            value={filter.sortBy || 'alphabetical'}
            onValueChange={(value) => setFilter({...filter, sortBy: value as 'alphabetical' | 'recent'})}
          >
            <SelectTrigger className="w-[140px] h-10">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="alphabetical">Alphabetical</SelectItem>
              <SelectItem value="recent">Recently Updated</SelectItem>
            </SelectContent>
          </Select>
          
          {/* Filter button */}
          <div className="relative">
            <Button 
              variant="outline" 
              className="h-10"
              onClick={() => {
                setIsFilterOpen(!isFilterOpen)
              }}
            >
              <Filter className="h-4 w-4 mr-1" />
              Filters
              {(filter.genres?.length || 0) + (filter.statuses?.length || 0) + (filter.authors?.length || 0) > 0 && (
                <Badge
                  variant="secondary"
                  className="rounded-full h-5 min-w-[20px] p-0 flex items-center justify-center text-xs ml-1"
                >
                  {(filter.genres?.length || 0) + (filter.statuses?.length || 0) + (filter.authors?.length || 0)}
                </Badge>
              )}
            </Button>
            
            {/* Filter Panel Dropdown */}
            {isFilterOpen && (
              <div className="absolute z-50 right-0 mt-1">
                <SeriesFilterPanel
                  filter={filter}
                  onFilterChange={setFilter}
                  genres={availableGenres}
                  authors={availableAuthors}
                  onClearFilters={clearFilters}
                  hideSearchInput={true}
                />
              </div>
            )}
          </div>
          
          {/* View Toggle Buttons */}
          <div className="flex">
            <Button
              variant={viewMode === "grid" ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode("grid")}
              className="rounded-r-none h-10 w-10"
              title="Grid view"
            >
              <Grid3X3 />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode("list")}
              className="rounded-l-none h-10 w-10"
              title="List view"
            >
              <List />
            </Button>
          </div>
        </div>
      }
    >
      <div className="mt-6 mb-6">
        {/* Series Filter Panel moved to dropdown */}
        
        <div className="mt-0">
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
          
          {/* Empty state when no tracked series exist */}
          {series.length > 0 && filter.tracked && filteredSeries.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-muted-foreground/20 rounded-lg">
              <BookMarked className="h-16 w-16 text-muted-foreground/40 mb-4" />
              <h2 className="text-xl font-medium mb-2">No Tracked Series</h2>
              <p className="text-muted-foreground text-center max-w-md mb-6">
                Track series to get notifications about upcoming releases and keep up with your favorite authors.
              </p>
              <div className="text-center">
                <p className="mb-3 text-sm">You have {series.length} series in your collection</p>
                <Button 
                  onClick={() => setFilter({...filter, tracked: false})}
                  variant="outline"
                >
                  <Bell className="h-4 w-4 mr-2" />
                  Show All Series
                </Button>
              </div>
            </div>
          )}
          
          {/* Series grid/list */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-64 animate-pulse bg-muted rounded-lg" />
              ))}
            </div>
          ) : (series.length > 0 && filteredSeries.length > 0) && (
            <>
              {viewMode === "grid" ? (
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
              ) : (
                <div className="space-y-4">
                  {filteredSeries.map(seriesItem => (
                    <div key={seriesItem.id} className="flex items-start gap-4 p-4 border rounded-lg hover:bg-accent/5 transition-colors">
                      {/* Series cover image */}
                      <div className="h-24 w-20 flex-shrink-0 bg-muted overflow-hidden rounded-md">
                        {seriesItem.coverImage ? (
                          <img
                            src={seriesItem.coverImage}
                            alt={seriesItem.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center bg-primary/10 text-primary p-1">
                            <Library className="h-8 w-8 opacity-70" />
                          </div>
                        )}
                      </div>
                      
                      {/* Series details */}
                      <div className="flex-grow min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-medium truncate">{seriesItem.name}</h3>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleToggleTracking(seriesItem.id, !seriesItem.isTracked)}
                              title={seriesItem.isTracked ? "Stop tracking" : "Track series"}
                            >
                              {seriesItem.isTracked ? (
                                <Bell className="h-4 w-4 text-primary" />
                              ) : (
                                <BellOff className="h-4 w-4 text-muted-foreground" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive/80"
                              onClick={() => handleDeleteSeries(seriesItem.id)}
                              title="Delete series"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trash-2">
                                <path d="M3 6h18" />
                                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                                <line x1="10" x2="10" y1="11" y2="17" />
                                <line x1="14" x2="14" y1="11" y2="17" />
                              </svg>
                            </Button>
                          </div>
                        </div>
                        
                        {seriesItem.author && (
                          <p className="text-sm text-muted-foreground mb-1">by {seriesItem.author}</p>
                        )}
                        
                        <div className="flex items-center gap-4 mt-2">
                          <div className="flex items-center gap-1">
                            <BookOpen className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{seriesItem.books?.length || 0} books</span>
                          </div>
                          
                          {seriesItem.genre && (
                            <div className="flex items-center gap-1">
                              <span className="text-xs px-2 py-0.5 bg-accent/20 rounded-full">
                                {Array.isArray(seriesItem.genre) ? seriesItem.genre[0] : seriesItem.genre}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
          
          {/* No results message */}
          {series.length > 0 && filteredSeries.length === 0 && !filter.tracked && (
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
        </div>
      </div>
      
      {/* Create Series Dialog */}
      {isCreatingNewSeries && (
        <CreateSeriesDialog
          open={isCreatingNewSeries}
          onClose={() => setIsCreatingNewSeries(false)}
          onCreateSeries={(newSeries) => {
            // Add the new series to state
            setSeries(prev => [...prev, newSeries]);
            setIsCreatingNewSeries(false);
            
            // Save to IndexedDB
            enhancedStorageService.saveSeries(newSeries)
              .then(() => {
                console.log(`Series ${newSeries.id} saved to IndexedDB`);
              })
              .catch(error => {
                console.error(`Error saving series ${newSeries.id} to IndexedDB:`, error);
                toast({
                  title: "Error",
                  description: "Could not save the new series to database",
                  variant: "destructive"
                });
              });
          }}
          books={books}
        />
      )}
      
      {/* Settings Dialog */}
      {showSettings && (
        <Settings {...settingsProps} />
      )}
    </AppLayout>
  );
};

export default SeriesPage;
