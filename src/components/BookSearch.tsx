import { useState, useEffect } from "react";
import { useSettings } from "@/contexts/SettingsContext";
import { Search, Plus, Loader2, BookOpen, Library, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Book } from "@/types/book";
import { Series } from "@/types/series";
import { useToast } from "@/hooks/use-toast";
import { bookApiClient } from "@/services/api";
import { BookSearchItem } from "@/types/api/BookApiProvider";
import { Select } from "@/components/ui/select";
import { seriesApiService, SeriesDetectionResult } from "@/services/api/SeriesApiService";
import { seriesService } from "@/services/SeriesService";
import { SeriesAssignmentDialog } from "@/components/dialogs/SeriesAssignmentDialog";
import { Badge } from "@/components/ui/badge";

interface BookSearchProps {
  onAddBook: (book: Book) => void;
  existingBooks: Book[];
}

export const BookSearch = ({ onAddBook, existingBooks }: BookSearchProps) => {
  const { settings } = useSettings();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<BookSearchItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [seriesDetectionResult, setSeriesDetectionResult] = useState<SeriesDetectionResult | null>(null);
  const [showSeriesDialog, setShowSeriesDialog] = useState(false);
  const [currentBook, setCurrentBook] = useState<Book | null>(null);
  const [detectingSeries, setDetectingSeries] = useState(false);
  const [activeProvider, setActiveProvider] = useState(
    // Initialize from settings if available, otherwise use current provider
    settings.defaultApi || bookApiClient.activeProviderId
  );
  const { toast } = useToast();
  
  // Update the active provider when settings change
  useEffect(() => {
    if (settings.defaultApi) {
      setActiveProvider(settings.defaultApi);
      bookApiClient.setActiveProvider(settings.defaultApi);
    }
  }, [settings.defaultApi]);

  const searchBooks = async (query: string) => {
    if (!query.trim()) return;

    setIsLoading(true);
    try {
      // Make sure the client is using the selected provider
      if (activeProvider && activeProvider !== bookApiClient.activeProviderId) {
        bookApiClient.setActiveProvider(activeProvider);
      }

      // Use our API client to search for books
      const searchResult = await bookApiClient.searchBooks({
        query,
        limit: 10
      });
      
      // Filter out books that are already in the library
      const filteredResults = searchResult.books.filter((apiBook) => {
        // Check if this book already exists in the user's library
        // First check by provider-specific ID
        const existsById = apiBook.id && existingBooks.some(existingBook => 
          (existingBook as any).googleBooksId === apiBook.id || // Legacy field
          (existingBook as any).sourceId === apiBook.id // New field
        );
        
        if (existsById) return false;
        
        // If no ID match, check by title and author
        const apiBookAuthor = typeof apiBook.author === 'string' ? apiBook.author.toLowerCase() : 
          (Array.isArray(apiBook.author) && apiBook.author.length > 0) ? apiBook.author[0].toLowerCase() : '';
          
        const existsByTitleAndAuthor = existingBooks.some(existingBook => 
          existingBook.title.toLowerCase() === apiBook.title.toLowerCase() && 
          existingBook.author.toLowerCase() === apiBookAuthor
        );
        
        return !existsByTitleAndAuthor;
      });
      
      setSearchResults(filteredResults);
    } catch (error) {
      console.error('Error searching books:', error);
      toast({
        title: "Search Error",
        description: `Failed to search using ${bookApiClient.activeProvider.name}. ${error instanceof Error ? error.message : ''}`,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchBooks(searchQuery);
  };

  const detectSeries = async (book: Book): Promise<SeriesDetectionResult | null> => {
    try {
      // Use the enhanced Series API service to check if this book might be part of a series
      const detectionResult = await seriesApiService.detectSeries(
        book.googleBooksId || '',
        book.title,
        book.author,
        existingBooks
      );
      
      return detectionResult;
    } catch (error) {
      console.error('Error detecting series:', error);
      return null;
    }
  };
  
  const addBookToCollection = async (book: BookSearchItem) => {
    setIsLoading(true);
    try {
      // Fetch detailed book information using our API client
      const detailedBook = await bookApiClient.getBookDetails(book.id);
      
      // Convert the ReadingStatus enum to string status for the existing application
      // Use user's preferred default status if no status is provided
      const defaultStatus = settings.defaultStatus || 'want-to-read';
      
      // Create a book object compatible with the existing application
      const newBook: Book = {
        id: `book-${Math.random().toString(36).substring(2, 10)}`,
        title: detailedBook.title,
        author: Array.isArray(detailedBook.author) && detailedBook.author.length > 0 
          ? detailedBook.author[0] : typeof detailedBook.author === 'string' ? detailedBook.author : 'Unknown',
        thumbnail: detailedBook.thumbnail,
        genre: Array.isArray(detailedBook.genre) && detailedBook.genre.length > 0 
          ? detailedBook.genre[0] : typeof detailedBook.genre === 'string' ? detailedBook.genre : undefined,
        description: detailedBook.description,
        publishedDate: detailedBook.publishedDate,
        pageCount: detailedBook.pageCount,
        googleBooksId: detailedBook.sourceType === 'google' ? detailedBook.id : undefined,
        openLibraryId: detailedBook.sourceType === 'openlib' ? detailedBook.id : undefined,
        status: defaultStatus as 'reading' | 'completed' | 'want-to-read',
        isPartOfSeries: false, // Initially set to false
        addedDate: new Date().toISOString(),
        spineColor: Math.floor(Math.random() * 8) + 1, // Random spine color 1-8
      };
      
      // Set the current book for reference in the series dialog
      setCurrentBook(newBook);
      
      // First add the book to the collection
      onAddBook(newBook);
      
      // Show success toast
      toast({
        title: "Book Added",
        description: `${detailedBook.title} has been added to your collection.`,
      });
      
      // Check if it might be part of a series - but don't add automatically
      setDetectingSeries(true);
      const detectionResult = await detectSeries(newBook);
      setDetectingSeries(false);
      
      if (detectionResult && detectionResult.series && detectionResult.series.name) {
        // We found a potential series
        setSeriesDetectionResult(detectionResult);
        
        // Always show the dialog for user to decide - no automatic assignment
        setShowSeriesDialog(true);
        
        // Detection logic is kept, but we don't set any volume number automatically
        // The dialog will handle this if the user decides to assign to a series
      }
      // Book is already added - no need for additional logic here
      
      // Clear search results
      setSearchResults([]);
      setSearchQuery("");
    } catch (error) {
      console.error('Error adding book:', error);
      toast({
        title: "Error Adding Book",
        description: `Failed to add book: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleAssignToSeries = async (book: Book, seriesId: string, volumeNumber?: number) => {
    try {
      // Update the book with series information
      const updatedBook = {
        ...book,
        isPartOfSeries: true,
        seriesId: seriesId,
        volumeNumber
      };
      
      // Add the book to the series in the database
      await seriesService.addBookToSeries(seriesId, book.id);
      
      // Add/update the book in the collection
      // In our revised flow, the book has not been added yet in automatic mode
      onAddBook(updatedBook);
      
      // Get the series name for the toast
      const series = await seriesService.getSeriesById(seriesId);
      const seriesName = series?.name || 'selected series';
      
      // Ensure the series in localStorage contains this book
      // This fixes the issue where the book doesn't show in the Series page
      const seriesJson = localStorage.getItem('seriesLibrary');
      if (seriesJson) {
        const allSeries = JSON.parse(seriesJson);
        const updatedSeries = allSeries.map((s: Series) => {
          if (s.id === seriesId) {
            // Ensure the book is in the series.books array
            const books = s.books || [];
            if (!books.includes(book.id)) {
              books.push(book.id);
            }
            return { ...s, books };
          }
          return s;
        });
        localStorage.setItem('seriesLibrary', JSON.stringify(updatedSeries));
      }
      
      toast({
        title: "Added to Series",
        description: `${book.title} has been added to the ${seriesName} series.`,
      });
      
      // Close dialog and reset state
      setShowSeriesDialog(false);
      setSeriesDetectionResult(null);
      setCurrentBook(null);
    } catch (error) {
      console.error('Error adding book to series:', error);
      toast({
        title: "Error Adding to Series",
        description: `Failed to add book to series: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    }
  };
  
  const handleCreateNewSeries = async (seriesData: Partial<Series>, book: Book, volumeNumber?: number) => {
    try {
      // Create new series
      const newSeries = await seriesService.createSeries({
        name: seriesData.name || `Unknown Series`,
        description: seriesData.description || `Series featuring ${book.title}`,
        author: seriesData.author || book.author,
        books: [book.id],  // Include the book ID here
        coverImage: seriesData.coverImage || book.thumbnail,
        genre: seriesData.genre || (book.genre ? [book.genre] : []),
        status: seriesData.status || 'ongoing',
        readingOrder: 'publication',
        totalBooks: seriesData.totalBooks,
        isTracked: false,
        hasUpcoming: false
      });
      
      // Update the book with series information
      const updatedBook = {
        ...book,
        isPartOfSeries: true,
        seriesId: newSeries.id,
        volumeNumber
      };
      
      // Add the book to the collection
      // In our revised flow, the book has not been added yet in automatic mode
      onAddBook(updatedBook);
      
      // Ensure the newly created series is correctly saved in localStorage
      // This fixes the issue where the book doesn't show in the Series page
      const seriesJson = localStorage.getItem('seriesLibrary');
      if (seriesJson) {
        const allSeries = JSON.parse(seriesJson);
        
        // Make sure the new series has the book in its books array
        if (!newSeries.books?.includes(book.id)) {
          newSeries.books = [...(newSeries.books || []), book.id];
        }
        
        // Check if the series already exists in localStorage
        const existingSeriesIndex = allSeries.findIndex((s: Series) => s.id === newSeries.id);
        if (existingSeriesIndex >= 0) {
          // Update existing series
          allSeries[existingSeriesIndex] = newSeries;
        } else {
          // Add new series
          allSeries.push(newSeries);
        }
        
        localStorage.setItem('seriesLibrary', JSON.stringify(allSeries));
      }
      
      toast({
        title: "New Series Created",
        description: `${book.title} has been added to the new ${newSeries.name} series.`,
      });
      
      // Close dialog and reset state
      setShowSeriesDialog(false);
      setSeriesDetectionResult(null);
      setCurrentBook(null);
    } catch (error) {
      console.error('Error creating new series:', error);
      toast({
        title: "Error Creating Series",
        description: `Failed to create series: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Form */}
      <div className="flex flex-col gap-4">
        {/* Provider Selector */}
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" />
          <label className="text-sm font-medium">Data Source:</label>
          <select 
            value={activeProvider || ''} 
            onChange={(e) => setActiveProvider(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 max-w-[200px]"
          >
            {bookApiClient.getProviders().map(provider => (
              <option key={provider.id} value={provider.id}>
                {provider.name}
              </option>
            ))}
          </select>
        </div>
        
        {/* Search Input */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search for books or authors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 font-sans"
            />
          </div>
          <Button 
            type="submit" 
            disabled={isLoading || !searchQuery.trim()}
            className="bg-gradient-warm hover:bg-primary-glow transition-all duration-300"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </form>
      </div>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-serif text-foreground">
            Search Results
          </h3>
          <div className="space-y-2">
            {searchResults.map((book) => (
              <Card key={book.id} className="relative overflow-hidden">
                <CardContent className="p-4 flex items-start gap-4">
                  <div className="h-24 w-16 flex-shrink-0 bg-muted overflow-hidden">
                    {book.thumbnail ? (
                      <img
                        src={book.thumbnail}
                        alt={book.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center bg-accent-cool text-white p-1">
                        <span className="text-xs text-center">
                          {book.title}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-serif font-medium text-base mb-1 line-clamp-2">
                      {book.title}
                    </h4>
                    <p className="text-sm text-muted-foreground mb-1">
                      {typeof book.author === 'string' ? book.author : 
                       Array.isArray(book.author) ? book.author.join(", ") : 
                       "Unknown Author"}
                    </p>
                    {book.publishedDate && (
                      <p className="text-xs text-muted-foreground">
                        Published: {book.publishedDate}
                      </p>
                    )}
                    <p className="text-xs text-primary mt-1">
                      Source: {book.provider}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => addBookToCollection(book)}
                    className="absolute top-2 right-2"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-1" /> Add
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
      
      {/* Series Assignment Dialog */}
      {currentBook && (
        <SeriesAssignmentDialog
          open={showSeriesDialog}
          onOpenChange={setShowSeriesDialog}
          book={currentBook}
          existingBooks={existingBooks}
          detectedSeries={seriesDetectionResult}
          onAssignSeries={handleAssignToSeries}
          onCreateNewSeries={handleCreateNewSeries}
        />
      )}
      
      {/* Series Detection Status */}
      {detectingSeries && (
        <div className="mt-4 p-3 border rounded-md bg-muted/30 flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <p className="text-sm">Checking if this book is part of a series...</p>
        </div>
      )}
    </div>
  );
};