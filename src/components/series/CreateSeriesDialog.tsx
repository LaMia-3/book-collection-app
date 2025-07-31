import React, { useState, useEffect } from 'react';
import { Book } from '@/types/book';
import { Series, SeriesCreationData } from '@/types/series';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from '@/hooks/use-toast';
import { enhancedStorageService } from '@/services/storage/EnhancedStorageService';

interface CreateSeriesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSeriesCreated: (newSeries: Series) => void;
}

/**
 * Dialog for creating a new book series
 */
export const CreateSeriesDialog = ({
  open,
  onOpenChange,
  onSeriesCreated
}: CreateSeriesDialogProps) => {
  const { toast } = useToast();
  const [step, setStep] = useState<'info' | 'books'>('info');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [availableBooks, setAvailableBooks] = useState<Book[]>([]);
  const [seriesData, setSeriesData] = useState<SeriesCreationData>({
    name: '',
    author: '',
    description: '',
    isTracked: true,
    bookIds: [],
  });
  const [selectedBookIds, setSelectedBookIds] = useState<Record<string, boolean>>({});
  
  // Fetch books directly from IndexedDB when dialog opens or when switching to books step
  useEffect(() => {
    if (open && step === 'books') {
      loadBooksNotInSeries();
    }
  }, [open, step]);
  
  // Function to load books not already in a series directly from IndexedDB
  const loadBooksNotInSeries = async () => {
    setIsLoading(true);
    try {
      // Initialize storage service
      await enhancedStorageService.initialize();
      
      // Get all books directly from IndexedDB
      const allBooks = await enhancedStorageService.getBooks();
      console.log('All books from IndexedDB:', allBooks.length);
      
      // Get all books that are not already part of a series
      const booksNotInSeries = allBooks.filter(book => {
        const notInSeries = !book.seriesId; // The definitive check from IndexedDB
        console.log(`Book "${book.title}": seriesId=${book.seriesId} => notInSeries=${notInSeries}`);
        return notInSeries;
      });
      
      // Convert to UI Book format for display
      const uiBooks = booksNotInSeries.map(book => ({
        id: book.id,
        title: book.title,
        author: book.author || 'Unknown Author',
        // Add required Book fields
        isPartOfSeries: false,
        spineColor: book.spineColor || '#6366f1',
        addedDate: book.dateAdded,
        status: book.status || 'toread',
        // Add empty strings for optional fields to avoid null/undefined issues
        description: book.description || '',
        genre: book.genre || []
      } as unknown as Book)); // Use unknown as intermediate to satisfy TypeScript
      
      console.log('Books not in series:', booksNotInSeries.length);
      console.log('Books available for series:', uiBooks.map(b => b.title));
      
      setAvailableBooks(uiBooks);
    } catch (error) {
      console.error('Error loading books from IndexedDB:', error);
      toast({
        title: 'Error loading books',
        description: 'Could not load books from your collection.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleNextStep = () => {
    if (!seriesData.name.trim()) {
      toast({
        title: "Series name required",
        description: "Please enter a name for your series",
        variant: "destructive"
      });
      return;
    }
    
    setStep('books');
  };
  
  const handlePrevStep = () => {
    setStep('info');
  };
  
  const handleCreateSeries = async () => {
    setIsSubmitting(true);
    try {
      // Collect selected book IDs
      const bookIds = Object.entries(selectedBookIds)
        .filter(([_, isSelected]) => isSelected)
        .map(([id]) => id);
      
      // Create a new series with proper IndexedDB fields
      const newSeries = {
        id: `series-${Date.now()}`,
        name: seriesData.name,
        description: seriesData.description,
        author: seriesData.author,
        books: bookIds,
        totalBooks: bookIds.length,
        completedBooks: 0,
        readingProgress: 0,
        readingOrder: 'publication' as 'publication' | 'chronological' | 'custom', // Use type assertion for enum
        isTracked: seriesData.isTracked,
        dateAdded: new Date().toISOString(),
        lastModified: new Date().toISOString()
      };
      
      // Save to IndexedDB
      await enhancedStorageService.saveSeries(newSeries);
      
      // Update selected books with seriesId
      for (const bookId of bookIds) {
        const book = await enhancedStorageService.getBookById(bookId);
        if (book) {
          book.seriesId = newSeries.id;
          book.lastModified = new Date().toISOString();
          await enhancedStorageService.saveBook(book);
        }
      }
      
      onSeriesCreated(newSeries as any);
      
      // Reset form
      setSeriesData({
        name: '',
        author: '',
        description: '',
        isTracked: true,
        bookIds: [],
      });
      setSelectedBookIds({});
      setStep('info');
      onOpenChange(false);
      
      toast({
        title: "Series created",
        description: `Successfully created "${newSeries.name}" series with ${bookIds.length} books`
      });
    } catch (error) {
      console.error('Error creating series:', error);
      toast({
        title: "Error creating series",
        description: "There was a problem creating your series. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const toggleBookSelection = (bookId: string) => {
    setSelectedBookIds(prev => ({
      ...prev,
      [bookId]: !prev[bookId]
    }));
  };
  
  // Group available books by author for easier selection
  const booksByAuthor = availableBooks.reduce<Record<string, Book[]>>((acc, book) => {
    const author = book.author || 'Unknown Author';
    if (!acc[author]) {
      acc[author] = [];
    }
    acc[author].push(book);
    return acc;
  }, {});
  
  const authorGroups = Object.keys(booksByAuthor).sort();
  const selectedCount = Object.values(selectedBookIds).filter(Boolean).length;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {step === 'info' ? 'Create New Series' : 'Add Books to Series'}
          </DialogTitle>
          <DialogDescription>
            {step === 'info'
              ? 'Enter the details for your new book series'
              : 'Select books from your collection to add to this series.'}
          </DialogDescription>
        </DialogHeader>
        
        {step === 'info' ? (
          <div className="py-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Series Name</Label>
                <Input
                  id="name"
                  placeholder="Enter series name"
                  value={seriesData.name}
                  onChange={(e) => setSeriesData({...seriesData, name: e.target.value})}
                  autoFocus
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="author">Author</Label>
                <Input
                  id="author"
                  placeholder="Enter author name (if series has consistent author)"
                  value={seriesData.author || ''}
                  onChange={(e) => setSeriesData({...seriesData, author: e.target.value})}
                />
                <p className="text-sm text-muted-foreground">
                  Leave blank if the series has multiple authors
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Enter a description for this series..."
                  value={seriesData.description || ''}
                  onChange={(e) => setSeriesData({...seriesData, description: e.target.value})}
                  rows={4}
                />
              </div>
              
              <div className="flex items-center space-x-2 pt-2">
                <Switch
                  id="track-series"
                  checked={seriesData.isTracked}
                  onCheckedChange={(checked) => setSeriesData({...seriesData, isTracked: checked})}
                />
                <Label htmlFor="track-series">
                  Track this series for upcoming releases
                </Label>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-4">
            {isLoading ? (
              // Loading state
              <div className="flex flex-col items-center justify-center py-16 space-y-4">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
                <p className="text-sm text-muted-foreground">Loading books from your collection...</p>
              </div>
            ) : (
              <>
                <p className="text-sm mb-4">
                  {availableBooks.length === 0
                    ? "You don't have any books available to add to this series. Books already in other series won't appear here."
                    : `Select books to add to "${seriesData.name}" (${selectedCount} selected)`}
                </p>
                
                <p className="text-xs text-muted-foreground mb-2">
                  Note: Only books not already assigned to a series are shown here.
                </p>
                
                {availableBooks.length > 0 ? (
                  <ScrollArea className="h-[400px] pr-4">
                    <div className="space-y-6">
                      {authorGroups.map(author => (
                        <div key={author} className="space-y-2">
                          <h3 className="text-sm font-medium border-b pb-1">{author}</h3>
                          <div className="space-y-1">
                            {booksByAuthor[author].map(book => (
                              <div key={book.id} className="flex items-start space-x-2">
                                <Checkbox
                                  id={`book-${book.id}`}
                                  checked={!!selectedBookIds[book.id]}
                                  onCheckedChange={() => toggleBookSelection(book.id)}
                                />
                                <Label
                                  htmlFor={`book-${book.id}`}
                                  className="text-sm leading-tight cursor-pointer"
                                >
                                  {book.title}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="text-center py-10 text-muted-foreground">
                    <p>Add books to your collection first</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}
        
        <DialogFooter className="flex items-center justify-between sm:justify-between">
          {step === 'books' ? (
            <Button 
              type="button" 
              variant="outline" 
              onClick={handlePrevStep}
              disabled={isSubmitting}
            >
              Back
            </Button>
          ) : (
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          )}
          
          <Button 
            type="button" 
            onClick={step === 'info' ? handleNextStep : handleCreateSeries}
            disabled={isSubmitting}
          >
            {isSubmitting 
              ? 'Creating...' 
              : step === 'info' 
                ? 'Next' 
                : 'Create Series'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
