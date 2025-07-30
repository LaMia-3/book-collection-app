import React, { useState } from 'react';
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

interface CreateSeriesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSeriesCreated: (newSeries: Series) => void;
  books: Book[];
}

/**
 * Dialog for creating a new book series
 */
export const CreateSeriesDialog = ({
  open,
  onOpenChange,
  onSeriesCreated,
  books
}: CreateSeriesDialogProps) => {
  const { toast } = useToast();
  const [step, setStep] = useState<'info' | 'books'>('info');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [seriesData, setSeriesData] = useState<SeriesCreationData>({
    name: '',
    author: '',
    description: '',
    isTracked: true,
    bookIds: [],
  });
  const [selectedBookIds, setSelectedBookIds] = useState<Record<string, boolean>>({});
  
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
  
  const handleCreateSeries = () => {
    setIsSubmitting(true);
    try {
      // Collect selected book IDs
      const bookIds = Object.entries(selectedBookIds)
        .filter(([_, isSelected]) => isSelected)
        .map(([id]) => id);
      
      // Generate a mock series ID (will be handled by backend later)
      const newSeries: Series = {
        id: `series-${Date.now()}`,
        name: seriesData.name,
        description: seriesData.description,
        author: seriesData.author,
        books: bookIds,
        totalBooks: bookIds.length,
        readingOrder: 'publication',
        isTracked: seriesData.isTracked,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      onSeriesCreated(newSeries);
      
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
        description: `Successfully created "${newSeries.name}" series`
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
  
  // Filter out books that are already in a series
  const availableBooks = books.filter(book => !(book.isPartOfSeries || book.seriesId));
  
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
              ? 'Enter the details for your new book series.'
              : 'Select books from your collection to add to this series.'}
          </DialogDescription>
        </DialogHeader>
        
        {step === 'info' ? (
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Series Name <span className="text-destructive">*</span></Label>
                <Input
                  id="name"
                  placeholder="e.g., The Chronicles of Narnia"
                  value={seriesData.name}
                  onChange={(e) => setSeriesData({...seriesData, name: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="author">Series Author</Label>
                <Input
                  id="author"
                  placeholder="e.g., C.S. Lewis"
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
            <p className="text-sm mb-4">
              {books.length === 0 
                ? "You don't have any books in your collection yet." 
                : availableBooks.length === 0
                  ? "All your books are already assigned to series. You can create an empty series."
                  : `Select books to add to "${seriesData.name}" (${selectedCount} selected)`}
            </p>
            <p className="text-xs text-muted-foreground mb-2">
              Note: Only books not already assigned to a series are shown here.
            </p>
            
            {books.length > 0 && availableBooks.length > 0 ? (
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
                              {book.isPartOfSeries && book._legacySeriesName && (
                                <span className="text-xs text-muted-foreground ml-2">
                                  (Part of: {book._legacySeriesName})
                                </span>
                              )}
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
