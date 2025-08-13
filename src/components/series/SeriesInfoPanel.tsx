import React, { useEffect, useState } from 'react';
import { Book } from '@/types/book';
import { Series } from '@/types/series';
import { seriesService } from '@/services/SeriesService';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ChevronRight, Calendar, BookOpen, Library } from 'lucide-react';
import { Link } from 'react-router-dom';

interface SeriesInfoPanelProps {
  seriesId: string;
  currentBookId: string;
  volumeNumber?: number;
}

export const SeriesInfoPanel = ({
  seriesId,
  currentBookId,
  volumeNumber
}: SeriesInfoPanelProps) => {
  const [series, setSeries] = useState<Series | null>(null);
  const [seriesBooks, setSeriesBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSeriesDetails = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Load series details
        const seriesData = await seriesService.getSeriesById(seriesId);
        
        if (!seriesData) {
          setError('Series not found');
          setIsLoading(false);
          return;
        }
        
        setSeries(seriesData);
        
        // Try to load books in the series
        const booksInSeries: Book[] = [];
        if (seriesData.books && seriesData.books.length > 0) {
          // Load books from IndexedDB - the exclusive source of truth
          try {
            const { enhancedStorageService } = await import('@/services/storage/EnhancedStorageService');
            await enhancedStorageService.initialize();
            
            // Get all books from IndexedDB
            const allBooks = await enhancedStorageService.getBooks();
            
            // Filter books that are in this series
            const filteredBooks = allBooks
              .filter(book => seriesData.books.includes(book.id))
              .map(book => ({
                ...book,
                // Convert from IndexedDB format to UI format
                addedDate: book.dateAdded,
                completedDate: book.dateCompleted
              }));
              
            setSeriesBooks(filteredBooks as Book[]);
          } catch (error) {
            console.error('Error loading books from IndexedDB:', error);
          }    
        }
      } catch (error) {
        console.error('Error loading series details:', error);
        setError('Failed to load series information');
      } finally {
        setIsLoading(false);
      }
    };

    if (seriesId) {
      loadSeriesDetails();
    }
  }, [seriesId]);

  // Format reading status
  const getReadingStatus = (status?: string) => {
    if (!status) return 'Unknown';
    
    return {
      'completed': 'Completed',
      'ongoing': 'Ongoing',
      'cancelled': 'Cancelled'
    }[status] || status;
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-20 w-full" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-24" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      </div>
    );
  }

  if (error || !series) {
    return (
      <div className="p-4 text-center border border-dashed rounded-md bg-muted/50">
        <p className="text-sm text-muted-foreground">{error || 'Series information not available'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Series Overview */}
      <div>
        <h4 className="font-medium">{series.name}</h4>
        {series.description && (
          <p className="text-sm text-muted-foreground mt-1">{series.description}</p>
        )}
      </div>

      {/* Series Metadata */}
      <div className="flex flex-wrap gap-2">
        {volumeNumber && (
          <Badge variant="secondary">
            Volume {volumeNumber} {series.totalBooks && `of ${series.totalBooks}`}
          </Badge>
        )}
        
        {series.status && (
          <Badge variant="outline" className={
            series.status === 'completed' 
              ? 'border-green-500/30 text-green-500'
              : series.status === 'ongoing' 
                ? 'border-blue-500/30 text-blue-500'
                : 'border-orange-500/30 text-orange-500'
          }>
            {getReadingStatus(series.status)}
          </Badge>
        )}
        
        {series.author && (
          <Badge variant="outline">
            By {series.author}
          </Badge>
        )}
      </div>

      {/* Books in Series */}
      {seriesBooks.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-1 text-sm font-medium">
            <BookOpen className="h-4 w-4" />
            <span>Books in this Series</span>
          </div>
          
          <div className="space-y-1">
            {seriesBooks.map(book => (
              <div 
                key={book.id} 
                className={`flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors ${
                  book.id === currentBookId ? 'bg-muted' : ''
                }`}
              >
                {book.thumbnail && (
                  <img 
                    src={book.thumbnail} 
                    alt={book.title} 
                    className="h-8 w-6 object-cover rounded"
                  />
                )}
                <div className="flex-1">
                  <p className="text-sm font-medium truncate">
                    {book.id === currentBookId ? (
                      <span className="font-semibold">{book.title}</span>
                    ) : (
                      book.title
                    )}
                  </p>
                  {book.volumeNumber && (
                    <span className="text-xs text-muted-foreground">
                      Volume {book.volumeNumber}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* View Series Button */}
      <Button
        variant="outline"
        size="sm"
        className="w-full text-xs"
        asChild
      >
        <Link to={`/series/${seriesId}`}>
          <Library className="h-3.5 w-3.5 mr-2" />
          View Complete Series
          <ChevronRight className="ml-1 h-3 w-3" />
        </Link>
      </Button>
    </div>
  );
};
