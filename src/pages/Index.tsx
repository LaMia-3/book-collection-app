import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSettings } from "@/contexts/SettingsContext";
import { Book } from "@/types/book";
import { BookSearch } from "@/components/BookSearch";
import { BookShelf } from "@/components/BookShelf";
import { BookListView } from "@/components/BookListView";
import { BookCoverView } from "@/components/BookCoverView";
import { InsightsView } from "@/components/InsightsView";
import { Settings } from "@/components/Settings";
import { ViewToggle, ViewMode } from "@/components/ViewToggle";
import { BookDetails } from "@/components/BookDetails";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Library, Search, Settings as SettingsIcon } from "lucide-react";
import searchService, { SearchResult, SearchOptions } from "@/services/search/SearchService";
import { AdvancedSearch } from "@/components/AdvancedSearch";
import { GoalTracker } from "@/components/GoalTracker";
import { NotificationBell } from "@/components/notifications/NotificationBell";

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
  const [showSearch, setShowSearch] = useState(false);
  // Use default view from settings or fallback to 'shelf'
  const [viewMode, setViewMode] = useState<ViewMode>(settings.defaultView as ViewMode || 'shelf');
  const [showSettings, setShowSettings] = useState(false);
  
  // Calculate books completed in the current month
  const [booksCompletedThisMonth, setBooksCompletedThisMonth] = useState<number>(0);
  
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

  // Helper function to clear an IndexedDB object store
  const clearIndexedDBStore = (dbName: string, storeName: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      try {
        const openRequest = indexedDB.open(dbName);
        
        openRequest.onerror = (event) => {
          const error = (event.target as any).error;
          reject(new Error(`Failed to open database: ${error?.message || 'Unknown error'}`));
        };
        
        openRequest.onsuccess = (event) => {
          const db = openRequest.result;
          
          // Check if the store exists
          if (!Array.from(db.objectStoreNames).includes(storeName)) {
            db.close();
            reject(new Error(`Store "${storeName}" does not exist in database`));
            return;
          }
          
          try {
            // Create a transaction
            const transaction = db.transaction(storeName, 'readwrite');
            const objectStore = transaction.objectStore(storeName);
            
            // Request to clear the store
            const clearRequest = objectStore.clear();
            
            // Handle success case
            clearRequest.onsuccess = () => {
              // Note: we don't resolve here, we wait for transaction completion
              console.log(`Clear operation for ${storeName} successful`);
            };
            
            // Handle clear request error
            clearRequest.onerror = (event) => {
              const error = (event.target as any).error;
              transaction.abort();
              db.close();
              reject(new Error(`Failed to clear ${storeName} store: ${error?.message || 'Unknown error'}`));
            };
            
            // Handle transaction completion (success)
            transaction.oncomplete = () => {
              db.close();
              console.log(`Transaction for clearing ${storeName} completed successfully`);
              resolve();
            };
            
            // Handle transaction error
            transaction.onerror = (event) => {
              const error = (event.target as any).error;
              db.close();
              reject(new Error(`Transaction failed: ${error?.message || 'Unknown error'}`));
            };
            
            // Handle transaction abort
            transaction.onabort = (event) => {
              const error = (event.target as any).error;
              db.close();
              reject(new Error(`Transaction aborted: ${error?.message || 'Unknown error'}`));
            };
            
          } catch (txError) {
            db.close();
            reject(new Error(`Error setting up transaction: ${txError instanceof Error ? txError.message : String(txError)}`));
          }
        };
        
      } catch (outerError) {
        reject(new Error(`Unexpected error during clear operation: ${outerError instanceof Error ? outerError.message : String(outerError)}`));
      }
    });
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
      
      // Close the search interface
      setShowSearch(false);
      
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
    
    // Show success toast
    toast({
      title: "Book Removed",
      description: "The book has been removed from your library.",
    });
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
    <div className="min-h-screen bg-gradient-page">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Library className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-serif font-bold text-foreground">
              {libraryName}
            </h1>
          </div>
          <p className="text-lg text-muted-foreground font-sans">
            Track your reading journey, one book at a time
          </p>
        </div>

        {/* Action Bar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <AdvancedSearch 
              onSearch={handleSearch}
              placeholder="Search your books..."
              className="w-full"
            />
          </div>
          <Button
            onClick={() => setShowSearch(!showSearch)}
            className="bg-gradient-warm hover:bg-primary-glow transition-all duration-300"
          >
            <Search className="h-4 w-4 mr-2" />
            {showSearch ? "Hide Search" : "Add Books"}
          </Button>
        </div>

        {/* Book Search */}
        {showSearch && (
          <div className="mb-8 p-6 bg-card rounded-lg shadow-elegant">
            <BookSearch onAddBook={addBook} existingBooks={books} />
          </div>
        )}

        {/* Library Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
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
        <div className="bg-card rounded-lg p-6 shadow-elegant">
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
            
            <div className="flex items-center gap-4">
              {/* Notification Bell */}
              <NotificationBell />
              
              {/* Settings Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowSettings(true)}
                className="rounded-full"
                title="Settings"
              >
                <SettingsIcon className="h-5 w-5" />
              </Button>
              
              {/* View Toggle */}
              <ViewToggle 
                viewMode={viewMode} 
                onChange={(newViewMode) => {
                  if (newViewMode === 'series') {
                    navigate('/series');
                  } else {
                    setViewMode(newViewMode);
                  }
                }}
              />  
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
            {viewMode === 'insights' && (
              <div className="animate-fade-in">
                <InsightsView books={books} />
              </div>
            )}
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
        
        {/* Settings Modal */}
        <Settings
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          books={books}
          onDeleteLibrary={async () => {
            try {
              // Import required services only when needed
              const { enhancedStorageService } = await import('@/services/storage/EnhancedStorageService');
              const { seriesService } = await import('@/services/SeriesService');
              const { notificationService } = await import('@/services/NotificationService');
              
              // Clear UI state first for immediate feedback
              setBooks([]);
              setFilteredBooks([]);
              
              // Clear all books in IndexedDB
              try {
                // Use a helper function to clear the IndexedDB books store
                await clearIndexedDBStore('book-collection-db', 'books');
                console.log('Successfully cleared books from IndexedDB');
              } catch (booksError) {
                console.error('Error clearing books from IndexedDB:', booksError);
                // Continue with other deletion even if books deletion fails
              }
              
              // Clear series and related data
              try {
                // Clear all series in IndexedDB
                await clearIndexedDBStore('book-collection-db', 'series');
                console.log('Successfully cleared series from IndexedDB');
                
                // Clear any remaining notifications
                await notificationService.clearAllNotifications();
                console.log('Notifications cleared successfully');
              } catch (seriesError) {
                console.error('Error clearing series data:', seriesError);
                // Continue with library deletion even if series deletion fails
              }
              
              // Also clear localStorage for compatibility with old implementation
              localStorage.removeItem('bookLibrary');
              localStorage.removeItem('seriesLibrary');
              localStorage.removeItem('upcomingBooks');
              localStorage.removeItem('releaseNotifications');
              console.log('localStorage items removed');
              
              // Show success toast
              toast({
                title: "Library Deleted",
                description: "Your book collection and series data have been successfully deleted."
              });
              
              return Promise.resolve();
            } catch (error) {
              console.error('Error deleting library:', error);
              
              // Show error toast
              toast({
                title: "Error",
                description: `Failed to delete library: ${error instanceof Error ? error.message : String(error)}`,
                variant: "destructive"
              });
              
              return Promise.reject(error);
            }
          }}
          onImportCSV={async (file) => {
            try {
              // Import the CSV file using our utility
              const { importFromCSV } = await import('@/utils/importUtils');
              const importResult = await importFromCSV(file);
              
              // Add the successfully imported books to the collection
              if (importResult.successful.length > 0) {
                try {
                  // Import the storage service
                  const { enhancedStorageService } = await import('@/services/storage/EnhancedStorageService');
                  
                  // Save each book to IndexedDB
                  const savedBooks = [];
                  for (const book of importResult.successful) {
                    // Convert UI book to IndexedDB book format
                    const indexedDBBook = {
                      ...book,
                      dateAdded: book.addedDate || new Date().toISOString(),
                      dateCompleted: book.completedDate,
                      lastModified: new Date().toISOString(),
                      syncStatus: 'synced',
                      progress: typeof book.progress === 'number' ? book.progress : 0
                    };
                    
                    // Save to IndexedDB
                    await enhancedStorageService.saveBook(indexedDBBook);
                    savedBooks.push(book);
                  }
                  
                  // Update UI state with the saved books
                  setBooks(prevBooks => [...prevBooks, ...savedBooks]);
                  
                  toast({
                    title: "Import Successful",
                    description: `${importResult.successful.length} books were imported successfully. ${importResult.failed.length > 0 ? `${importResult.failed.length} failed.` : ''}`
                  });
                } catch (saveError) {
                  console.error('Error saving imported books to IndexedDB:', saveError);
                  toast({
                    title: "Import Partial Success",
                    description: `Books imported but may not appear in all views. Please refresh the page. Error: ${saveError instanceof Error ? saveError.message : String(saveError)}`,
                    variant: "warning"
                  });
                }
              } else {
                toast({
                  title: "Import Failed",
                  description: `No books were imported. Please check your file format.`,
                  variant: "destructive"
                });
              }
              
              return Promise.resolve();
            } catch (error) {
              console.error('CSV import error:', error);
              toast({
                title: "Import Error",
                description: `Error importing CSV: ${error instanceof Error ? error.message : String(error)}`,
                variant: "destructive"
              });
              return Promise.reject(error);
            }
          }}
          onImportJSON={async (file) => {
            try {
              // Import the JSON file using our utility
              const { importFromJSON } = await import('@/utils/importUtils');
              const importResult = await importFromJSON(file);
              
              // Add the successfully imported books to the collection
              if (importResult.successful.length > 0) {
                try {
                  // Import the storage service
                  const { enhancedStorageService } = await import('@/services/storage/EnhancedStorageService');
                  
                  // Save each book to IndexedDB
                  const savedBooks = [];
                  for (const book of importResult.successful) {
                    // Convert UI book to IndexedDB book format
                    const indexedDBBook = {
                      ...book,
                      dateAdded: book.addedDate || new Date().toISOString(),
                      dateCompleted: book.completedDate,
                      lastModified: new Date().toISOString(),
                      syncStatus: 'synced',
                      progress: typeof book.progress === 'number' ? book.progress : 0
                    };
                    
                    // Save to IndexedDB
                    await enhancedStorageService.saveBook(indexedDBBook);
                    savedBooks.push(book);
                  }
                  
                  // Update UI state with the saved books
                  setBooks(prevBooks => [...prevBooks, ...savedBooks]);
                  
                  toast({
                    title: "Import Successful",
                    description: `${importResult.successful.length} books were imported successfully. ${importResult.failed.length > 0 ? `${importResult.failed.length} failed.` : ''}`
                  });
                } catch (saveError) {
                  console.error('Error saving imported books to IndexedDB:', saveError);
                  toast({
                    title: "Import Partial Success",
                    description: `Books imported but may not appear in all views. Please refresh the page. Error: ${saveError instanceof Error ? saveError.message : String(saveError)}`,
                    variant: "warning"
                  });
                }
              } else {
                toast({
                  title: "Import Failed",
                  description: `No books were imported. Please check your file format.`,
                  variant: "destructive"
                });
              }
              
              return Promise.resolve();
            } catch (error) {
              console.error('JSON import error:', error);
              toast({
                title: "Import Error",
                description: `Error importing JSON: ${error instanceof Error ? error.message : String(error)}`,
                variant: "destructive"
              });
              return Promise.reject(error);
            }
          }}
          onCreateBackup={async () => {
            try {
              // Import and use the backup utility
              const { createBackup } = await import('@/utils/backupUtils');
              
              // Create and download a backup of the current books
              createBackup(books);
              
              toast({
                title: "Backup Created",
                description: `Successfully created a backup with ${books.length} books.`
              });
              
              return Promise.resolve();
            } catch (error) {
              console.error('Backup creation error:', error);
              toast({
                title: "Backup Error",
                description: `Error creating backup: ${error instanceof Error ? error.message : String(error)}`,
                variant: "destructive"
              });
              return Promise.reject(error);
            }
          }}
          onRestoreBackup={async (file) => {
            try {
              // Restore from the backup file
              const { restoreFromBackup } = await import('@/utils/backupUtils');
              const restoreResult = await restoreFromBackup(file);
              
              if (restoreResult.success && restoreResult.books.length > 0) {
                try {
                  // Import the storage service
                  const { enhancedStorageService } = await import('@/services/storage/EnhancedStorageService');
                  
                  // Save each book to IndexedDB
                  for (const book of restoreResult.books) {
                    // Convert UI book to IndexedDB book format
                    const indexedDBBook = {
                      ...book,
                      dateAdded: book.addedDate || new Date().toISOString(),
                      dateCompleted: book.completedDate,
                      lastModified: new Date().toISOString(),
                      syncStatus: 'synced',
                      progress: typeof book.progress === 'number' ? book.progress : 0
                    };
                    
                    // Save to IndexedDB
                    await enhancedStorageService.saveBook(indexedDBBook);
                  }
                  
                  // Replace the current book collection with the restored books
                  setBooks(restoreResult.books);
                  
                  toast({
                    title: "Restore Successful",
                    description: restoreResult.message
                  });
                } catch (saveError) {
                  console.error('Error saving restored books to IndexedDB:', saveError);
                  toast({
                    title: "Restore Partial Success",
                    description: `Books restored but may not appear in all views. Please refresh the page. Error: ${saveError instanceof Error ? saveError.message : String(saveError)}`,
                    variant: "destructive"
                  });
                }
              } else {
                toast({
                  title: "Restore Failed",
                  description: "The backup file doesn't contain any valid books.",
                  variant: "destructive"
                });
              }
              
              return Promise.resolve();
            } catch (error) {
              console.error('Backup restore error:', error);
              toast({
                title: "Restore Error",
                description: `Error restoring backup: ${error instanceof Error ? error.message : String(error)}`,
                variant: "destructive"
              });
              return Promise.reject(error);
            }
          }}
        />
      </div>
    </div>
  );
};

export default Index;
