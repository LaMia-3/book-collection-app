import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useSettings } from "@/contexts/SettingsContext";
import { useToast } from "@/hooks/use-toast";
import { Series } from '@/types/series';
import { Book } from '@/types/book';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, BookOpen, Bell, BellOff, Pencil, Trash2, Loader2 } from 'lucide-react';
import { SeriesBooksTab } from '@/components/series/SeriesBooksTab';
import { SeriesInfoTab } from '@/components/series/SeriesInfoTab';
import { UpcomingReleasesTab } from '@/components/series/UpcomingReleasesTab';
import { seriesApiService } from '@/services/api/SeriesApiService';
import { upcomingReleasesApiService } from '@/services/api/UpcomingReleasesApiService';

/**
 * Detailed view of a specific series
 */
const SeriesDetailPage = () => {
  const { seriesId } = useParams<{ seriesId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { settings } = useSettings();
  const [series, setSeries] = useState<Series | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [seriesBooks, setSeriesBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('books');

  // Load series and related books
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      
      try {
        // Load series
        const savedSeries = localStorage.getItem("seriesLibrary");
        if (savedSeries) {
          const parsedSeries = JSON.parse(savedSeries) as Series[];
          const currentSeries = parsedSeries.find(s => s.id === seriesId);
          
          if (currentSeries) {
            setSeries(currentSeries);
            
            // Load books
            const savedBooks = localStorage.getItem("bookLibrary");
            if (savedBooks) {
              const parsedBooks = JSON.parse(savedBooks) as Book[];
              setBooks(parsedBooks);
              
              // Filter for books in this series
              const seriesBooksData = parsedBooks.filter(book => 
                currentSeries.books.includes(book.id)
              );
              setSeriesBooks(seriesBooksData);
              
              // If series has a representative book, try to enhance series data from APIs
              if (seriesBooksData.length > 0 && !currentSeries.apiEnriched) {
                refreshSeriesData(currentSeries, seriesBooksData[0]);
              }
            }
          } else {
            // Series not found
            toast({
              title: "Series not found",
              description: "The requested series could not be found.",
              variant: "destructive"
            });
            navigate('/series');
          }
        } else {
          // No series data
          toast({
            title: "No series data",
            description: "No series information is available.",
            variant: "destructive"
          });
          navigate('/series');
        }
      } catch (error) {
        console.error("Error loading series data:", error);
        toast({
          title: "Error loading series",
          description: "There was a problem loading the series data.",
          variant: "destructive"
        });
        navigate('/series');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [seriesId, navigate, toast]);
  
  // Function to refresh series data from APIs
  const refreshSeriesData = async (currentSeries: Series, representativeBook: Book) => {
    if (!currentSeries || isRefreshing) return;
    
    setIsRefreshing(true);
    
    try {
      // Try to get enhanced series info from APIs
      const bookId = representativeBook.googleBooksId || '';
      const enhancedInfo = await seriesApiService.getEnhancedSeriesInfo(
        bookId,
        representativeBook.title,
        representativeBook.author
      );
      
      if (enhancedInfo) {
        // Update series with API data
        const updatedSeries = {
          ...currentSeries,
          description: enhancedInfo.description || currentSeries.description,
          coverImage: enhancedInfo.coverImage || currentSeries.coverImage,
          status: enhancedInfo.status || currentSeries.status,
          genre: enhancedInfo.genre || currentSeries.genre,
          totalBooks: enhancedInfo.totalBooks || currentSeries.totalBooks,
          apiEnriched: true
        };
        
        setSeries(updatedSeries);
        
        // Update in localStorage
        const savedSeries = localStorage.getItem("seriesLibrary");
        if (savedSeries) {
          const allSeries = JSON.parse(savedSeries) as Series[];
          const updatedAllSeries = allSeries.map(s => 
            s.id === currentSeries.id ? updatedSeries : s
          );
          localStorage.setItem("seriesLibrary", JSON.stringify(updatedAllSeries));
        }
        
        // Check for upcoming releases
        checkForUpcomingReleases(updatedSeries);
      }
    } catch (error) {
      console.error("Error refreshing series data:", error);
      // No need to show an error toast here, as this is a background operation
    } finally {
      setIsRefreshing(false);
    }
  };
  
  // Function to check for upcoming releases
  const checkForUpcomingReleases = async (currentSeries: Series) => {
    if (!currentSeries) return;
    
    try {
      const upcomingBooks = await upcomingReleasesApiService.searchUpcomingReleases(
        currentSeries.name,
        currentSeries.author
      );
      
      if (upcomingBooks.length > 0) {
        // Update series to indicate it has upcoming books
        const updatedSeries = {
          ...currentSeries,
          hasUpcoming: true
        };
        
        setSeries(updatedSeries);
        
        // Save upcoming books to localStorage
        const savedUpcoming = localStorage.getItem("upcomingBooks");
        const existingUpcoming = savedUpcoming ? JSON.parse(savedUpcoming) : [];
        
        // Merge existing and new upcoming books, avoiding duplicates
        const mergedUpcoming = [...existingUpcoming];
        for (const book of upcomingBooks) {
          if (!mergedUpcoming.some(b => b.id === book.id)) {
            mergedUpcoming.push(book);
          }
        }
        
        localStorage.setItem("upcomingBooks", JSON.stringify(mergedUpcoming));
        
        // Update in series library as well
        const savedSeries = localStorage.getItem("seriesLibrary");
        if (savedSeries) {
          const allSeries = JSON.parse(savedSeries) as Series[];
          const updatedAllSeries = allSeries.map(s => 
            s.id === currentSeries.id ? updatedSeries : s
          );
          localStorage.setItem("seriesLibrary", JSON.stringify(updatedAllSeries));
        }
      }
    } catch (error) {
      console.error("Error checking for upcoming releases:", error);
    }
  };
  
  // Handle tracking toggle
  const handleToggleTracking = () => {
    if (!series) return;
    
    const updatedSeries = { ...series, isTracked: !series.isTracked };
    setSeries(updatedSeries);
    
    // Update in localStorage
    const savedSeries = localStorage.getItem("seriesLibrary");
    if (savedSeries) {
      const parsedSeries = JSON.parse(savedSeries) as Series[];
      const updatedSeriesList = parsedSeries.map(s => 
        s.id === seriesId ? updatedSeries : s
      );
      localStorage.setItem("seriesLibrary", JSON.stringify(updatedSeriesList));
    }
    
    toast({
      title: updatedSeries.isTracked ? "Series tracking enabled" : "Series tracking disabled",
      description: updatedSeries.isTracked 
        ? "You'll be notified about new releases in this series" 
        : "You won't receive notifications for this series anymore"
    });
  };
  
  // Handle delete series
  const handleDeleteSeries = () => {
    if (confirm("Are you sure you want to delete this series? This action cannot be undone.")) {
      // Update in localStorage
      const savedSeries = localStorage.getItem("seriesLibrary");
      if (savedSeries && series) {
        const parsedSeries = JSON.parse(savedSeries) as Series[];
        const updatedSeriesList = parsedSeries.filter(s => s.id !== series.id);
        localStorage.setItem("seriesLibrary", JSON.stringify(updatedSeriesList));
        
        toast({
          title: "Series deleted",
          description: `"${series.name}" series has been deleted.`
        });
        
        navigate('/series');
      }
    }
  };

  // Calculate completion metrics
  const completedBooks = seriesBooks.filter(book => book.status === 'completed').length;
  const inProgressBooks = seriesBooks.filter(book => book.status === 'reading').length;
  const totalBooks = series?.totalBooks || seriesBooks.length;
  const completionPercentage = totalBooks > 0 
    ? Math.round((completedBooks / totalBooks) * 100) 
    : 0;
  
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="animate-pulse">
          <div className="h-64 bg-muted rounded-lg mb-6"></div>
          <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-muted rounded w-1/2 mb-6"></div>
          <div className="h-12 bg-muted rounded mb-6"></div>
          <div className="grid grid-cols-1 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }
  
  if (!series) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col items-center justify-center py-12">
          <h2 className="text-xl font-medium mb-2">Series not found</h2>
          <p className="text-muted-foreground mb-6">
            The requested series could not be found.
          </p>
          <Button asChild>
            <Link to="/series">Back to Series</Link>
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-6">
      {/* Navigation */}
      <div className="mb-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/series')}
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Series
        </Button>
      </div>
      
      {/* Hero Header */}
      <div className="relative h-64 rounded-lg overflow-hidden mb-6">
        {series.coverImage ? (
          <img 
            src={series.coverImage} 
            alt={series.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-muted/60 via-muted to-muted/60 flex items-center justify-center">
            <BookOpen className="h-24 w-24 text-muted-foreground/30" />
          </div>
        )}
        
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
        
        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex-grow">
              <h1 className="font-serif text-3xl font-medium mb-2 mr-12">
                {series.name}
                {isRefreshing && (
                  <Loader2 className="inline-block h-5 w-5 ml-2 animate-spin text-white/70" />
                )}
              </h1>
              <div className="flex flex-wrap gap-4 items-center">
                {series.author && (
                  <p className="text-white/90">{series.author}</p>
                )}
                <div className="flex items-center gap-1">
                  <span className="text-white/80">{seriesBooks.length} books</span>
                  <span className="text-white/50 px-1">•</span>
                  <span className="text-white/80">{completionPercentage}% complete</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="icon"
                className="border-white/30 text-white hover:bg-white/20"
                onClick={handleToggleTracking}
                title={series.isTracked ? "Stop tracking" : "Track series"}
              >
                {series.isTracked ? (
                  <Bell className="h-4 w-4" />
                ) : (
                  <BellOff className="h-4 w-4" />
                )}
              </Button>
              
              <Button
                variant="outline"
                size="icon"
                className="border-white/30 text-white hover:bg-white/20"
                title="Edit series"
              >
                <Pencil className="h-4 w-4" />
              </Button>
              
              <Button
                variant="outline"
                size="icon"
                className="border-white/30 text-white hover:bg-white/20"
                title="Delete series"
                onClick={handleDeleteSeries}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-sm text-muted-foreground mb-1">
          <div>Progress</div>
          <div>
            <span className="font-medium text-foreground">{completedBooks}</span>
            /{totalBooks} books completed
          </div>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-warm rounded-full"
            style={{ width: `${completionPercentage}%` }}
          ></div>
        </div>
        {inProgressBooks > 0 && (
          <div className="text-xs text-muted-foreground mt-1">
            {inProgressBooks} book{inProgressBooks > 1 ? 's' : ''} in progress
          </div>
        )}
      </div>
      
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="books">Books</TabsTrigger>
          <TabsTrigger value="info">Series Info</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming Releases</TabsTrigger>
        </TabsList>
        
        <TabsContent value="books" className="space-y-4">
          <SeriesBooksTab 
            series={series} 
            books={seriesBooks} 
            allBooks={books}
          />
        </TabsContent>
        
        <TabsContent value="info" className="space-y-4">
          <SeriesInfoTab series={series} />
        </TabsContent>
        
        <TabsContent value="upcoming" className="space-y-4">
          <UpcomingReleasesTab seriesId={series.id} seriesName={series.name} author={series.author} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SeriesDetailPage;
