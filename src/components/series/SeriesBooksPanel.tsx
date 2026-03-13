import React, { useState, useEffect } from 'react';
import { Series } from '@/types/series';
import { Book } from '@/types/book';
import { BookCard } from '@/components/BookCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BookDetails } from '@/components/BookDetails';
import { BookOpen, ListOrdered } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { bookRepository } from '@/repositories/BookRepository';
import { seriesRepository } from '@/repositories/SeriesRepository';

interface SeriesBooksPanelProps {
  series: Series;
}

export const SeriesBooksPanel = ({ series }: SeriesBooksPanelProps) => {
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [showBookDetails, setShowBookDetails] = useState(false);

  // Load books in this series through the repository so authenticated sessions use the API path.
  useEffect(() => {
    const loadBooks = async () => {
      setIsLoading(true);
      
      try {
        const allBooks = await bookRepository.getAll();
        
        // Filter books that are in this series
        const seriesBooks = allBooks.filter(book => 
          book.seriesId === series.id || 
          series.books?.includes(book.id)
        );
        
        // Sort books by volume number if available
        const sortedBooks = [...seriesBooks].sort((a, b) => {
          if (a.volumeNumber && b.volumeNumber) {
            return a.volumeNumber - b.volumeNumber;
          }
          return 0;
        });
        
        setBooks(sortedBooks);
      } catch (error) {
        console.error('Error loading books:', error);
        setBooks([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadBooks();
  }, [series]);

  /**
   * Handle clicking on a book to view its details
   * Ensures the book has complete series information before showing the BookDetails dialog
   */
  const handleBookClick = (book: Book) => {
    // Ensure the book has the correct series information
    // This is needed because the book might be in the series.books array
    // but not have its seriesId properly set
    const bookWithSeriesInfo = {
      ...book,
      isPartOfSeries: true,
      seriesId: series.id
    };
    
    setSelectedBook(bookWithSeriesInfo);
    setShowBookDetails(true);
  };

  /**
   * Handle updating a book from the BookDetails dialog
   * Keeps the panel state in sync after BookDetails persists the book update.
   */
  const handleBookUpdate = async (updatedBook: Book) => {
    const bookWithSeriesInfo = { ...updatedBook, isPartOfSeries: true, seriesId: series.id };
    
    setBooks(prevBooks => 
      prevBooks.map(book => book.id === updatedBook.id ? bookWithSeriesInfo : book)
    );
    // Close the dialog
    setShowBookDetails(false);
  };

  const handleBookDelete = async (bookId: string) => {
    try {
      await bookRepository.delete(bookId);
      
      const currentSeries = await seriesRepository.getById(series.id);
      if (currentSeries && currentSeries.books.includes(bookId)) {
        await seriesRepository.update(series.id, {
          ...currentSeries,
          books: currentSeries.books.filter(id => id !== bookId),
          lastModified: new Date().toISOString()
        });
      }
      
      // Remove the book from our local state
      setBooks(prevBooks => prevBooks.filter(book => book.id !== bookId));
      
      console.log('Successfully deleted book from series');
    } catch (error) {
      console.error('Error deleting book from series:', error);
    }
    
    // Close the dialog
    setShowBookDetails(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-lg flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Books in this Series
        </h3>
        <Badge variant="outline" className="flex items-center gap-1">
          <ListOrdered className="h-3.5 w-3.5" />
          {series.readingOrder || 'Publication'} Order
        </Badge>
      </div>
      
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-[240px] animate-pulse bg-muted rounded-md" />
          ))}
        </div>
      ) : books.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 border border-dashed rounded-md">
          <p className="text-muted-foreground mb-2">No books in this series yet</p>
          <Button variant="outline" size="sm">
            Add Books to Series
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {books.map(book => (
            <div 
              key={book.id} 
              className="cursor-pointer transform transition-transform hover:scale-[1.02] hover:shadow-md"
              onClick={() => handleBookClick(book)}
            >
              <BookCard book={book} compact />
              {book.volumeNumber && (
                <Badge className="mt-2 absolute top-2 right-2">
                  Vol. {book.volumeNumber}
                </Badge>
              )}
            </div>
          ))}
        </div>
      )}
      
      {/* Book Details Dialog */}
      {selectedBook && (
        <Dialog open={showBookDetails} onOpenChange={setShowBookDetails}>
          <DialogContent className="max-w-3xl h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Book Details</DialogTitle>
            </DialogHeader>
            <BookDetails 
              book={selectedBook}
              onUpdate={handleBookUpdate}
              onDelete={handleBookDelete}
              onClose={() => setShowBookDetails(false)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
