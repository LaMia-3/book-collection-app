import React, { useState, useCallback } from 'react';
import { BookDetails } from '@/components/BookDetails';
import { Series } from '@/types/series';
import { Book } from '@/types/book';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Plus, GripVertical, BookOpen, Bookmark, BookX } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { enhancedStorageService } from '@/services/storage/EnhancedStorageService';

interface SeriesBooksTabProps {
  series: Series;
  books: Book[];
  allBooks: Book[];
  onUpdateBook?: (updatedBook: Book) => void;
}

/**
 * Tab for managing books in a series
 */
export const SeriesBooksTab = ({ series, books, allBooks, onUpdateBook }: SeriesBooksTabProps) => {
  const { toast } = useToast();
  const [readingOrder, setReadingOrder] = useState<'publication' | 'chronological' | 'custom'>(
    series.readingOrder || 'publication'
  );
  const [isAddingBooks, setIsAddingBooks] = useState(false);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  
  // Handle book click to show details
  const handleBookClick = (book: Book) => {
    setSelectedBook(book);
  };
  
  // For the add books functionality
  // Filter out books that are already in any series
  // This enforces the rule that books can only belong to one series at a time
  const nonSeriesBooks = allBooks.filter(book => {
    // First check: Not in current series
    if (series.books.includes(book.id)) {
      return false;
    }
    
    // Second check: Not part of any series at all (using book's own properties)
    if (book.isPartOfSeries || book.seriesId) {
      return false;
    }
    
    // Third check: Not in any other series
    // All series data is now checked via the series array passed as props
    // No need to use localStorage here anymore
    
    // If we reach here, the book isn't in any series
    return true;
  });
  const [selectedBookIds, setSelectedBookIds] = useState<Record<string, boolean>>({});
  
  // Order books based on selected ordering
  const getOrderedBooks = (): Book[] => {
    switch (readingOrder) {
      case 'publication':
        return [...books].sort((a, b) => {
          // Sort by publication date if available
          if (a.publishedDate && b.publishedDate) {
            return new Date(a.publishedDate).getTime() - new Date(b.publishedDate).getTime();
          }
          return 0;
        });
      
      case 'chronological':
        // In a real app, this would use a "chronologicalOrder" property
        // For now, we'll just use the same as publication
        return [...books].sort((a, b) => {
          if (a.publishedDate && b.publishedDate) {
            return new Date(a.publishedDate).getTime() - new Date(b.publishedDate).getTime();
          }
          return 0;
        });
      
      case 'custom':
        // Use custom order if defined, otherwise just return books
        if (series.customOrder && series.customOrder.length > 0) {
          return [...books].sort((a, b) => {
            const aIndex = series.customOrder?.indexOf(a.id) ?? -1;
            const bIndex = series.customOrder?.indexOf(b.id) ?? -1;
            // If both are found in custom order
            if (aIndex >= 0 && bIndex >= 0) {
              return aIndex - bIndex;
            }
            // If only one is found, put the one in custom order first
            if (aIndex >= 0) return -1;
            if (bIndex >= 0) return 1;
            // If neither is in custom order, maintain their current order
            return 0;
          });
        }
        return books;
      
      default:
        return books;
    }
  };
  
  const orderedBooks = getOrderedBooks();
  
  // Handle drag end for custom ordering
  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    
    const items = Array.from(orderedBooks);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    // Update the custom order
    const newCustomOrder = items.map(book => book.id);
    
    try {
      // Get the current series from the storage service
      const currentSeries = await enhancedStorageService.getSeriesById(series.id);
      if (currentSeries) {
        // Update the series with new custom order
        const updatedSeries = {
          ...currentSeries,
          customOrder: newCustomOrder
        };
        
        // Save the updated series using the storage service
        await enhancedStorageService.saveSeries(updatedSeries);
        
        toast({
          title: "Series order updated",
          description: "The reading order has been updated."
        });
      }
    } catch (error) {
      console.error("Error updating series order:", error);
      toast({
        title: "Error",
        description: "Failed to update reading order. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  // Handle adding books to series
  const handleAddBooks = async () => {
    // Get selected book IDs
    const booksToAdd = Object.entries(selectedBookIds)
      .filter(([_, isSelected]) => isSelected)
      .map(([id]) => id);
    
    if (booksToAdd.length === 0) {
      toast({
        title: "No books selected",
        description: "Please select at least one book to add to the series.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Get the current series
      const currentSeries = await enhancedStorageService.getSeriesById(series.id);
      
      if (currentSeries) {
        // Update the series with new books
        const updatedSeries = {
          ...currentSeries,
          books: [...currentSeries.books, ...booksToAdd]
        };
        
        // Update each book to include series information
        for (const bookId of booksToAdd) {
          // Get the book from storage
          const book = await enhancedStorageService.getBookById(bookId);
          if (book) {
            // Update book with series information
            const updatedBook = {
              ...book,
              isPartOfSeries: true,
              seriesId: series.id
              // Note: We're not setting volumeNumber here as that would require user input
            };
            
            // Save the updated book
            await enhancedStorageService.saveBook(updatedBook);
          }
        }
        
        // Save the updated series
        await enhancedStorageService.saveSeries(updatedSeries);
        
        toast({
          title: "Books added",
          description: `${booksToAdd.length} book${booksToAdd.length > 1 ? 's' : ''} added to the series.`
        });
        
        // Reset state
        setSelectedBookIds({});
        setIsAddingBooks(false);
        
        // In a real app, we would refetch the data here
        // For now, just reload the page
        window.location.reload();
      }
    } catch (error) {
      console.error("Error adding books to series:", error);
      toast({
        title: "Error",
        description: "Failed to add books to the series. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  // Handle removing a book from the series
  const handleRemoveBook = async (bookId: string) => {
    if (confirm("Remove this book from the series?")) {
      try {
        // Use the enhanced storage service to remove the book from series
        await enhancedStorageService.removeBookFromSeries(bookId, series.id);
        
        toast({
          title: "Book removed",
          description: "The book has been removed from the series."
        });
        
        // Refresh the page to see the updated data
        window.location.reload();
      } catch (error) {
        console.error("Error removing book from series:", error);
        toast({
          title: "Error",
          description: "Failed to remove book from the series. Please try again.",
          variant: "destructive"
        });
      }
    }
  };
  
  // Handle book update
  const handleBookUpdate = (updatedBook: Book) => {
    if (onUpdateBook) {
      onUpdateBook(updatedBook);
    }
    setSelectedBook(null);
  };

  return (
    <div className="space-y-6">
      {!isAddingBooks ? (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label htmlFor="reading-order">Reading Order:</Label>
              <Select 
                value={readingOrder} 
                onValueChange={(value) => setReadingOrder(value as any)}
              >
                <SelectTrigger id="reading-order" className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="publication">Publication Order</SelectItem>
                  <SelectItem value="chronological">Chronological Order</SelectItem>
                  <SelectItem value="custom">Custom Order</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Button onClick={() => setIsAddingBooks(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Books
            </Button>
          </div>
          
          {books.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-muted-foreground/20 rounded-lg">
              <BookX className="h-16 w-16 text-muted-foreground/40 mb-4" />
              <h2 className="text-xl font-medium mb-2">No Books Yet</h2>
              <p className="text-muted-foreground text-center max-w-md mb-6">
                This series doesn't have any books yet. Add books to start tracking your reading progress.
              </p>
              <Button onClick={() => setIsAddingBooks(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Books
              </Button>
            </div>
          ) : readingOrder === 'custom' ? (
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="books">
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="space-y-2"
                  >
                    {orderedBooks.map((book, index) => (
                      <Draggable key={book.id} draggableId={book.id} index={index}>
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className="flex items-center border rounded-md p-3 bg-background cursor-pointer"
                            onClick={() => handleBookClick(book)}
                          >
                            <div 
                              {...provided.dragHandleProps}
                              className="mr-3 text-muted-foreground hover:text-foreground"
                            >
                              <GripVertical className="h-5 w-5" />
                            </div>
                            
                            <div className="flex-grow">
                              <div className="font-medium">{book.title}</div>
                              <div className="text-sm text-muted-foreground">{book.author}</div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              {book.status && (
                                <Badge variant={
                                  book.status === 'completed' ? 'default' :
                                  book.status === 'reading' ? 'secondary' : 'outline'
                                }>
                                  {book.status}
                                </Badge>
                              )}
                              
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveBook(book.id);
                                }}
                              >
                                Remove
                              </Button>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          ) : (
            <div className="space-y-2">
              {orderedBooks.map((book) => (
                <div
                  key={book.id}
                  className="flex items-center border rounded-md p-3 bg-background cursor-pointer"
                  onClick={() => handleBookClick(book)}
                >
                  <div className="mr-3 text-muted-foreground">
                    {book.status === 'completed' ? (
                      <Bookmark className="h-5 w-5 text-primary" />
                    ) : (
                      <BookOpen className="h-5 w-5" />
                    )}
                  </div>
                  
                  <div className="flex-grow">
                    <div className="font-medium">{book.title}</div>
                    <div className="text-sm text-muted-foreground">{book.author}</div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {book.status && (
                      <Badge variant={
                        book.status === 'completed' ? 'default' :
                        book.status === 'reading' ? 'secondary' : 'outline'
                      }>
                        {book.status}
                      </Badge>
                    )}
                    
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveBook(book.id);
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Add Books to Series</h3>
            <Button variant="outline" onClick={() => setIsAddingBooks(false)}>
              Cancel
            </Button>
          </div>
          
          {nonSeriesBooks.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <p>No books available to add. Books that are already in a series cannot be added to another series.</p>
            </div>
          ) : (
            <>
              <ScrollArea className="h-[400px]">
                <div className="space-y-2 pr-4">
                  {nonSeriesBooks.map((book) => (
                    <Card key={book.id} className={selectedBookIds[book.id] ? "border-primary" : ""}>
                      <CardContent className="p-4 flex items-center">
                        <input
                          type="checkbox"
                          id={`add-book-${book.id}`}
                          checked={!!selectedBookIds[book.id]}
                          onChange={() => {
                            setSelectedBookIds(prev => ({
                              ...prev,
                              [book.id]: !prev[book.id]
                            }));
                          }}
                          className="mr-3 h-4 w-4"
                        />
                        <div className="flex-grow">
                          <label 
                            htmlFor={`add-book-${book.id}`}
                            className="font-medium cursor-pointer"
                          >
                            {book.title}
                          </label>
                          <div className="text-sm text-muted-foreground">{book.author}</div>
                        </div>
                        {book.status && (
                          <Badge variant={
                            book.status === 'completed' ? 'default' :
                            book.status === 'reading' ? 'secondary' : 'outline'
                          }>
                            {book.status}
                          </Badge>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
              
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsAddingBooks(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddBooks}>
                  Add Selected Books
                </Button>
              </div>
            </>
          )}
        </div>
      )}
      
      {/* Book Details Modal */}
      {selectedBook && (
        <BookDetails
          book={selectedBook}
          onUpdate={handleBookUpdate}
          onClose={() => setSelectedBook(null)}
        />
      )}
    </div>
  );
};
