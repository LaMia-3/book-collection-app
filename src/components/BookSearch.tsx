import { useState, useEffect } from "react";
import { useSettings } from "@/contexts/SettingsContext";
import { Search, Plus, Loader2, BookOpen } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Book } from "@/types/book";
import { useToast } from "@/hooks/use-toast";
import { bookApiClient } from "@/services/api";
import { BookSearchItem } from "@/types/api/BookApiProvider";
import { Select } from "@/components/ui/select";

interface BookSearchProps {
  onAddBook: (book: Book) => void;
  existingBooks: Book[];
}

export const BookSearch = ({ onAddBook, existingBooks }: BookSearchProps) => {
  const { settings } = useSettings();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<BookSearchItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
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

  const addBookToCollection = async (book: BookSearchItem) => {
    setIsLoading(true);
    try {
      // Fetch detailed book information using our API client
      const detailedBook = await bookApiClient.getBookDetails(book.id);
      
      // Convert the ReadingStatus enum to string status for the existing application
      // Use user's preferred default status if no status is provided
      const defaultStatus = settings.defaultStatus || 'want-to-read';
      
      const convertedBook = {
        ...detailedBook,
        // Map the ReadingStatus enum to string values expected by the rest of the app
        status: detailedBook.status === undefined ? defaultStatus :
          detailedBook.status.toString().includes('TO_READ') ? 'want-to-read' :
          detailedBook.status.toString().includes('READING') ? 'reading' :
          detailedBook.status.toString().includes('COMPLETED') ? 'completed' :
          defaultStatus,
        // Add a backward-compatible googleBooksId field if the source is Google Books
        ...(detailedBook.sourceType === 'google' ? { googleBooksId: detailedBook.sourceId } : {})
      } as any;
      
      // Pass the detailed book to the parent component
      onAddBook(convertedBook);
      
      toast({
        title: "Book Added!",
        description: `"${detailedBook.title}" has been added to your library.`,
      });
    } catch (error) {
      console.error('Error fetching book details:', error);
      toast({
        title: "Error Adding Book",
        description: `Failed to add "${book.title}". ${error instanceof Error ? error.message : ''}`,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
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
    </div>
  );
};