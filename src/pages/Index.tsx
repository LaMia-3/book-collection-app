import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSettings } from "@/contexts/SettingsContext";
import { Book } from "@/types/book";
import { BookShelf } from "@/components/BookShelf";
import { BookListView } from "@/components/BookListView";
import { BookCoverView } from "@/components/BookCoverView";
import { Settings } from "@/components/Settings";
import { ViewMode } from "@/components/ViewToggle";
import { BookDetails } from "@/components/BookDetails";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { 
  Library, 
  Search, 
  PlusCircle, 
  PenLine, 
  Plus, 
  BookOpen, 
  Bell, 
  BellOff, 
  RefreshCw, 
  BookMarked, 
  Grid3X3, 
  List, 
  X, 
  Filter, 
  ChevronDown,
  SortAsc
} from "lucide-react";
import { ManualAddBookDialog } from "@/components/dialogs/ManualAddBookDialog";
import { BookSearchDialog } from "@/components/dialogs/BookSearchDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import searchService, { SearchResult, SearchOptions } from "@/services/search/SearchService";
import { SimpleSearch } from "@/components/SimpleSearch";
import { GoalTracker } from "@/components/GoalTracker";
import { AppLayout } from "@/components/layout/AppLayout";
import { useLibrarySettings } from '@/hooks/useLibrarySettings';

const Index = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { settings } = useSettings();
  const [books, setBooks] = useState<Book[]>([]);
  const [filteredBooks, setFilteredBooks] = useState<Book[]>([]);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult<Book>[]>([]);
  const [searchOptions, setSearchOptions] = useState<SearchOptions>({
    fields: ['all'],
    fuzzy: true,
    caseSensitive: false,
    exactMatch: false,
    limit: 100
  });
  const [showSearchDialog, setShowSearchDialog] = useState(false);
  const [showManualAddDialog, setShowManualAddDialog] = useState(false);
  
  // Expose state setters to window object for the dropdown menu
  useEffect(() => {
    // Expose state setters to window object
    (window as any).setShowSearch = setShowSearchDialog;
    (window as any).setShowManualAddDialog = setShowManualAddDialog;
    
    // Cleanup function
    return () => {
      delete (window as any).setShowSearch;
      delete (window as any).setShowManualAddDialog;
    };
  }, []);
  // Use default view from settings or fallback to 'shelf'
  const [viewMode, setViewMode] = useState<ViewMode>(settings.defaultView as ViewMode || 'shelf');
  // Calculate books completed in the current month
  const [booksCompletedThisMonth, setBooksCompletedThisMonth] = useState<number>(0);
  
  const { settingsProps, setShowSettings } = useLibrarySettings({
    externalBooks: books,
    externalSetBooks: (newBooks) => {
      setBooks(newBooks);
      setFilteredBooks(newBooks);
    },
    onLibraryCleared: () => {
      setBooksCompletedThisMonth(0);
    },
  });
  
  // Get the personalized library name
  const libraryName = settings.preferredName 
    ? `${settings.preferredName}'s Personal Library`
    : "My Personal Library";

  // Function to map IndexedDB Book to UI Book type
  const mapIndexedDBBookToUIBook = (indexedDBBook: any): Book => {
    return {
      ...indexedDBBook,
      // Map fields with different names
      addedDate: indexedDBBook.dateAdded || new Date().toISOString(),
      completedDate: indexedDBBook.dateCompleted,
      // Ensure all required fields are present
      isPartOfSeries: indexedDBBook.isPartOfSeries || false,
      spineColor: indexedDBBook.spineColor || 1
    };
  };

  // Load books from IndexedDB on component mount
  useEffect(() => {
    const loadBooksFromIndexedDB = async () => {
      try {
        // Import the storage service
        const { enhancedStorageService } = await import('@/services/storage/EnhancedStorageService');
        
        // Get books from IndexedDB
        const indexedDBBooks = await enhancedStorageService.getBooks();
        
        // Convert to UI book format
        const uiBooks = indexedDBBooks.map(mapIndexedDBBookToUIBook);
        
        setBooks(uiBooks);
        setFilteredBooks(uiBooks);
        
        // Initialize the search index with the books
        searchService.clearIndex();
        searchService.indexBooks(uiBooks);
      } catch (error) {
        console.error("Error loading books from IndexedDB:", error);
        toast({
          title: "Error Loading Books",
          description: "There was an error loading your books. Please refresh the page.",
          variant: "destructive"
        });
        setBooks([]);
        setFilteredBooks([]);
      }
    };
    
    loadBooksFromIndexedDB();
  }, []);
  
  // Calculate books completed in the current month whenever books change
  useEffect(() => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    // Count books completed in the current month
    const completedThisMonth = books.filter(book => {
      // Check if the book has a completedDate
      if (!book.completedDate) return false;
      
      // Parse the completed date
      const completedDate = new Date(book.completedDate);
      
      // Check if it's the current month and year
      return (
        completedDate.getMonth() === currentMonth &&
        completedDate.getFullYear() === currentYear
      );
    }).length;
    
    setBooksCompletedThisMonth(completedThisMonth);
  }, [books]);

  // Note: No need for books sync effect anymore since IndexedDB is the source of truth
  // and all individual operations (add, update, delete) handle IndexedDB updates directly

  const addBook = async (newBook: Book) => {
    try {
      // Import the storage service directly to avoid import cycle issues
      const { enhancedStorageService } = await import('@/services/storage/EnhancedStorageService');
      
      // Convert UI book to IndexedDB format
      // We need to adapt the UI book model to the IndexedDB format that the service expects
      const indexedDBBook = {
        ...newBook,
        // Map required fields for IndexedDB
        dateAdded: newBook.addedDate || new Date().toISOString(),
        dateCompleted: newBook.completedDate,
        lastModified: new Date().toISOString(),
        syncStatus: 'synced' as const,
        // Default to 0 progress if not specified
        // @ts-ignore - progress field exists in the IndexedDB Book type but not UI Book type
        progress: 0
      };
      
      // Save to IndexedDB first
      const bookId = await enhancedStorageService.saveBook(indexedDBBook as any);
      
      // Update the book with the returned ID if needed
      const savedBook = {
        ...newBook,
        id: bookId || newBook.id
      };
      
      // Then update local state
      setBooks((prev) => [...prev, savedBook]);
      
      // Add the new book to the search index
      searchService.indexBook(savedBook);
      
      // If there's an active search, update filtered results
      if (searchQuery) {
        handleSearch(searchQuery, searchOptions);
      } else {
        setFilteredBooks(prev => [...prev, savedBook]);
      }
      
      // Close the search dialog
      setShowSearchDialog(false);
      
      console.log('Book successfully saved to IndexedDB with ID:', bookId);
    } catch (error) {
      console.error('Error saving book to IndexedDB:', error);
      toast({
        title: "Error Saving Book",
        description: `Failed to save book to database: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    }
  };

  const updateBook = (updatedBook: Book) => {
    setBooks((prev) =>
      prev.map((book) => (book.id === updatedBook.id ? updatedBook : book))
    );
    
    // Update the book in the search index
    searchService.updateBook(updatedBook);
    
    // If there's an active search, update filtered results
    if (searchQuery) {
      handleSearch(searchQuery, searchOptions);
    } else {
      setFilteredBooks(prev =>
        prev.map((book) => (book.id === updatedBook.id ? updatedBook : book))
      );
    }
  };

  const deleteBook = async (bookId: string) => {
    try {
      // Import the storage service
      const { enhancedStorageService } = await import('@/services/storage/EnhancedStorageService');
      
      // Delete book from IndexedDB
      await enhancedStorageService.deleteBook(bookId);
      
      // Update local state
      setBooks((prevBooks) => prevBooks.filter((book) => book.id !== bookId));
      setSelectedBook(null);
      
      toast({
        title: "Book Deleted",
        description: "Book removed from your library"
      });
    } catch (error) {
      console.error('Error deleting book:', error);
      toast({
        title: "Delete Failed",
        description: `Error deleting book: ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive"
      });
    }
  };

  // Handle search with advanced options
  const handleSearch = (query: string, options: SearchOptions) => {
    setSearchQuery(query);
    setSearchOptions(options);
    
    if (!query || query.trim() === '') {
      // If query is empty, show all books
      setFilteredBooks(books);
      setSearchResults([]);
      return;
    }
    
    // Perform search using the search service
    const results = searchService.searchBooks(query, options);
    setSearchResults(results);
    
    // Update filtered books based on search results
    setFilteredBooks(results.map(result => result.item));
  };

  return (
    <AppLayout
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      onAddClick={() => {
        // Show dropdown with API search and manual entry options
        // This is handled by a custom dropdown in the AppLayout
      }}
      onSettingsClick={() => setShowSettings(true)}
      onSearchAPIClick={() => setShowSearchDialog(true)}
      onManualEntryClick={() => setShowManualAddDialog(true)}
      addButtonLabel="Add Books"
      searchComponent={
        <div className="flex items-center gap-2 w-full">
          {/* Search input */}
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                const newQuery = e.target.value;
                setSearchQuery(newQuery);
                handleSearch(newQuery, searchOptions);
              }}
              placeholder="Search your books..."
              className="pl-10 h-10 text-sm w-full"
            />
            {searchQuery && (
              <button
                type="button"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center justify-center text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setSearchQuery('');
                  handleSearch('', searchOptions);
                }}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          
          {/* View Toggle Buttons */}
          <div className="flex">
            <Button
              variant={viewMode === 'shelf' ? 'default' : 'outline'}
              size="icon"
              onClick={() => setViewMode('shelf')}
              className="rounded-l-md rounded-r-none h-10 w-10"
              title="Shelf view"
            >
              <BookOpen className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'cover' ? 'default' : 'outline'}
              size="icon"
              onClick={() => setViewMode('cover')}
              className="rounded-none h-10 w-10"
              title="Cover view"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="icon"
              onClick={() => setViewMode('list')}
              className="rounded-l-none rounded-r-md h-10 w-10"
              title="List view"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      }
    >

        {/* Book Search Dialog */}
        <BookSearchDialog
          open={showSearchDialog}
          onOpenChange={setShowSearchDialog}
          onAddBook={addBook}
          existingBooks={books}
        />

        {/* Library Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 mt-0">
          <div className="text-center p-4 bg-card rounded-lg shadow-book">
            <div className="text-2xl font-serif font-bold text-primary">
              {books.length}
            </div>
            <div className="text-sm text-muted-foreground">Books in Library</div>
          </div>
          <div className="text-center p-4 bg-card rounded-lg shadow-book">
            <div className="text-2xl font-serif font-bold text-accent-warm">
              {books.filter((book) => book.completedDate).length}
            </div>
            <div className="text-sm text-muted-foreground">Books Read</div>
          </div>
          <div className="text-center p-4 bg-card rounded-lg shadow-book">
            <div className="text-2xl font-serif font-bold text-accent-cool">
              {books.filter((book) => book.rating && book.rating >= 4).length}
            </div>
            <div className="text-sm text-muted-foreground">Favorites (4+ stars)</div>
          </div>
        </div>
        
        {/* Goal Tracker */}
        <GoalTracker booksCompletedThisMonth={booksCompletedThisMonth} />

        {/* Library View */}
        <div className="bg-card rounded-lg p-6 mx-4 shadow-elegant">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Library className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-serif font-semibold text-foreground">
                Your Library
              </h2>
              {searchQuery && (
                <span className="text-sm text-muted-foreground">
                  ({filteredBooks.length} of {books.length} books)
                </span>
              )}
            </div>
          </div>
          
          {/* Dynamic View Rendering with transition effects */}
          <div className="transition-all duration-500 ease-in-out">
            {viewMode === 'shelf' && (
              <div className="animate-fade-in">
                <BookShelf books={filteredBooks} onBookClick={setSelectedBook} />
              </div>
            )}
            {viewMode === 'list' && (
              <div className="animate-fade-in">
                <BookListView books={filteredBooks} onBookClick={setSelectedBook} />
              </div>
            )}
            {viewMode === 'cover' && (
              <div className="animate-fade-in">
                <BookCoverView books={filteredBooks} onBookClick={setSelectedBook} />
              </div>
            )}
            {/* Insights view moved to its own page */}
          </div>
        </div>

        {/* Book Details Modal */}
        {selectedBook && (
          <BookDetails
            book={selectedBook}
            onUpdate={updateBook}
            onDelete={deleteBook}
            onClose={() => setSelectedBook(null)}
          />
        )}
        
        {/* Manual Add Book Dialog */}
        <ManualAddBookDialog 
          isOpen={showManualAddDialog} 
          onClose={() => setShowManualAddDialog(false)}
          onSave={(newBook) => {
            addBook(newBook);
            setShowManualAddDialog(false);
            toast({
              title: "Book Added",
              description: `${newBook.title} has been added to your library.`
            });
          }}
        />
        
        {/* Settings Modal */}
        <Settings {...settingsProps} />
    </AppLayout>
  );
};

export default Index;
