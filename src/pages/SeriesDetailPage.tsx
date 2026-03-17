import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useSettings } from "@/contexts/SettingsContext";
import { useToast } from "@/hooks/use-toast";
import { Series } from '@/types/series';
import { Book } from '@/types/book';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, Bell, BellOff, Pencil, Trash2, Loader2 } from 'lucide-react';
import { SeriesBooksTab } from '@/components/series/SeriesBooksTab';
import { SeriesInfoTab } from '@/components/series/SeriesInfoTab';
import { UpcomingReleasesTab } from '@/components/series/UpcomingReleasesTab';
import { SeriesEditDialog } from '@/components/series/SeriesEditDialog';
import { seriesApiService } from '@/services/api/SeriesApiService';
import { upcomingReleasesApiService } from '@/services/api/UpcomingReleasesApiService';
import { PageHeader, HeaderActionButton } from '@/components/ui/page-header';
import { bookRepository } from '@/repositories/BookRepository';
import { seriesRepository } from '@/repositories/SeriesRepository';
import { seriesService } from '@/services/SeriesService';

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
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Function to refresh series data from APIs
  const refreshSeriesData = useCallback(async (currentSeries: Series, representativeBook: Book) => {
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
        const updatedSeries: Series = {
          ...currentSeries,
          description: enhancedInfo.description || currentSeries.description,
          coverImage: enhancedInfo.coverImage || currentSeries.coverImage,
          status: enhancedInfo.status || currentSeries.status,
          genre: enhancedInfo.genre || currentSeries.genre,
          totalBooks: enhancedInfo.totalBooks || currentSeries.totalBooks,
          apiEnriched: true
        };
        
        await seriesRepository.update(updatedSeries.id, updatedSeries);
        
        // Update state
        setSeries(updatedSeries);
        
        // Check for upcoming releases
        checkForUpcomingReleases(updatedSeries);
      }
    } catch (error) {
      console.error("Error refreshing series data:", error);
      // No need to show an error toast here, as this is a background operation
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing]);

  // Load series and related books
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      
      try {
        const currentSeries = await seriesRepository.getById(seriesId || '');
        if (currentSeries) {
          setSeries(currentSeries);
          const repositoryBooks = await bookRepository.getAll();
          setBooks(repositoryBooks);
          
          // Filter for books in this series
          const seriesBooksData = repositoryBooks.filter(book => 
            currentSeries.books.includes(book.id)
          );
          setSeriesBooks(seriesBooksData);
          
          // If series has a representative book, try to enhance series data from APIs
          if (seriesBooksData.length > 0 && !currentSeries.apiEnriched) {
            refreshSeriesData(currentSeries, seriesBooksData[0]);
          }
        } else {
          toast({
            title: "Series not found",
            description: "The requested series could not be found.",
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
  }, [navigate, refreshSeriesData, seriesId, toast]);
  
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
        const updatedSeries: Series = {
          ...currentSeries,
          hasUpcoming: true
        };
        
        await seriesRepository.update(updatedSeries.id, updatedSeries);
        
        // Update state
        setSeries(updatedSeries);
      }
    } catch (error) {
      console.error("Error checking for upcoming releases:", error);
    }
  };

  // Handle tracking toggle
  const handleToggleTracking = async () => {
    if (!series) return;
    
    const updatedSeries: Series = { ...series, isTracked: !series.isTracked };
    
    try {
      await seriesRepository.update(updatedSeries.id, updatedSeries);
      
      // Update state
      setSeries(updatedSeries);
      
      toast({
        title: updatedSeries.isTracked ? "Series tracking enabled" : "Series tracking disabled",
        description: updatedSeries.isTracked 
          ? "You'll be notified about new releases in this series" 
          : "You won't receive notifications for this series anymore"
      });
    } catch (error) {
      console.error("Error updating series tracking:", error);
      toast({
        title: "Error",
        description: "Failed to update series tracking status",
        variant: "destructive"
      });
    }
  };
  
  // Handle delete series
  const handleDeleteSeries = async () => {
    if (!seriesId || !series) return;
    
    if (window.confirm(`Are you sure you want to delete the series "${series.name}"? Books will remain in your collection but will no longer be associated with this series. This cannot be undone.`)) {
      try {
        await seriesService.deleteSeries(seriesId);
        
        toast({
          title: "Series Deleted",
          description: `Series "${series.name}" has been deleted.`
        });
        
        // Navigate back to the series list
        navigate('/series');
      } catch (error) {
        console.error('Error deleting series:', error);
        toast({
          title: "Error",
          description: "Failed to delete the series",
          variant: "destructive"
        });
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
    <div className="container max-w-7xl mx-auto px-4 py-6">
      {/* Page Header */}
      <div className="mb-8">
        <PageHeader
          title={series.name}
          subtitle={series.author || ''}
          backTo="/series"
          backAriaLabel="Back to Series"
          actions={
            <>
              <HeaderActionButton
                icon={series.isTracked ? <Bell /> : <BellOff />}
                label={series.isTracked ? "Stop tracking" : "Track series"}
                onClick={handleToggleTracking}
                variant="secondary"
              />
              <HeaderActionButton
                icon={<Pencil />}
                label="Edit series"
                onClick={() => setIsEditDialogOpen(true)}
                variant="secondary"
              />
              <HeaderActionButton
                icon={<Trash2 />}
                label="Delete series"
                onClick={handleDeleteSeries}
                variant="secondary"
              />
            </>
          }
          className="pb-0"
        />
      </div>
      
      {/* Hero Header with Cover Image */}
      <div className="relative h-64 w-full rounded-lg overflow-hidden mb-6 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20">
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
        
        <div className="absolute bottom-0 left-0 right-0 p-0 pb-4 text-white">
          <div className="flex flex-col gap-1 pl-4">
            <h1 className="text-2xl font-bold text-white">{series.name}</h1>
            <span className="text-white/80 font-medium">{seriesBooks.length} {seriesBooks.length === 1 ? 'book' : 'books'}</span>
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
            onUpdateBook={(updatedBook) => {
              // Update the book in the local state
              const updatedBooks = books.map(book => 
                book.id === updatedBook.id ? updatedBook : book
              );
              setBooks(updatedBooks);
              
              // Update series books
              const updatedSeriesBooks = seriesBooks.map(book => 
                book.id === updatedBook.id ? updatedBook : book
              );
              setSeriesBooks(updatedSeriesBooks);
            }}
            onBooksAddedToSeries={(addedBooks) => {
              setBooks((prevBooks) =>
                prevBooks.map((book) => {
                  const addedBook = addedBooks.find((candidate) => candidate.id === book.id);
                  return addedBook || book;
                }),
              );
              setSeriesBooks((prevBooks) => [
                ...prevBooks,
                ...addedBooks.filter((addedBook) => !prevBooks.some((book) => book.id === addedBook.id)),
              ]);
              setSeries((prevSeries) =>
                prevSeries
                  ? {
                      ...prevSeries,
                      books: [...new Set([...prevSeries.books, ...addedBooks.map((book) => book.id)])],
                    }
                  : prevSeries,
              );
            }}
            onBookRemovedFromSeries={(bookId) => {
              setBooks((prevBooks) =>
                prevBooks.map((book) =>
                  book.id === bookId
                    ? {
                        ...book,
                        isPartOfSeries: false,
                        seriesId: undefined,
                        volumeNumber: undefined,
                        seriesPosition: undefined,
                      }
                    : book,
                ),
              );
              setSeriesBooks((prevBooks) => prevBooks.filter((book) => book.id !== bookId));
              setSeries((prevSeries) =>
                prevSeries
                  ? {
                      ...prevSeries,
                      books: prevSeries.books.filter((id) => id !== bookId),
                    }
                  : prevSeries,
              );
            }}
          />
        </TabsContent>
        
        <TabsContent value="info" className="space-y-4">
          <SeriesInfoTab 
            series={series} 
            onSeriesUpdated={(updatedSeries) => {
              // Update local state with the updated series
              setSeries(updatedSeries);
            }}
          />
        </TabsContent>
        
        <TabsContent value="upcoming" className="space-y-4">
          <UpcomingReleasesTab seriesId={series.id} seriesName={series.name} author={series.author} />
        </TabsContent>
      </Tabs>
      
      {/* Series Edit Dialog */}
      {series && (
        <SeriesEditDialog
          series={series}
          isOpen={isEditDialogOpen}
          onClose={() => setIsEditDialogOpen(false)}
          onSave={(updatedSeries) => {
            setSeries({
              ...updatedSeries,
              createdAt: updatedSeries.createdAt || series.createdAt || new Date(),
              updatedAt: new Date(),
            } as Series);
            setIsEditDialogOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default SeriesDetailPage;
