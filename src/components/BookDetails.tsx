import { useState, useEffect, useRef, KeyboardEvent, useCallback } from "react";
import { Book } from "@/types/book";
import { Series } from "@/types/series";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  Star, 
  BookOpen, 
  X, 
  Library, 
  Plus, 
  ChevronRight,
  ChevronDown, 
  ChevronUp,
  Trash2, 
  AlertTriangle, 
  Check, 
  Edit2, 
  AlertCircle 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { cleanHtml } from "@/utils/textUtils";
import { seriesService } from "@/services/SeriesService";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface BookDetailsProps {
  book: Book;
  onUpdate: (updatedBook: Book) => void;
  onDelete?: (bookId: string) => void;
  onClose: () => void;
}

export const BookDetails = ({ book, onUpdate, onDelete, onClose }: BookDetailsProps) => {
  // State management
  const [editedBook, setEditedBook] = useState<Book>({ ...book });
  const [availableSeries, setAvailableSeries] = useState<Series[]>([]);
  const [loadingSeries, setLoadingSeries] = useState(false);
  const [selectedSeriesId, setSelectedSeriesId] = useState<string>(book.seriesId || '');
  const [volumeNumber, setVolumeNumber] = useState<number | undefined>(book.volumeNumber);
  const [showSeriesInfo, setShowSeriesInfo] = useState(!!book.seriesId);
  
  // States for improved UI from main branch
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Load available series on component mount
  useEffect(() => {
    const loadSeries = async () => {
      setLoadingSeries(true);
      try {
        const seriesList = await seriesService.getAllSeries();
        setAvailableSeries(seriesList);
        
        // If the book is already in a series, select it
        if (book.seriesId) {
          setSelectedSeriesId(book.seriesId);
        }
      } catch (error) {
        console.error('Error loading series:', error);
      } finally {
        setLoadingSeries(false);
      }
    };
    
    loadSeries();
  }, [book.seriesId]);

  // Enhanced save handler with loading state
  const handleSave = useCallback(async () => {
    if (isSaving) return;
    
    setIsSaving(true);
    
    try {
      // Update book with series information and title
      const titleToUse = titleInputRef.current?.value.trim() || editedBook.title;
      
      const updatedBook: Book = {
        ...editedBook,
        title: titleToUse,
        isPartOfSeries: !!selectedSeriesId,
        seriesId: selectedSeriesId || undefined,
        volumeNumber: volumeNumber
      };
      
      // If a series was selected, make sure the book is added to that series
      if (selectedSeriesId) {
        try {
          await seriesService.addBookToSeries(selectedSeriesId, book.id);
          toast({
            title: "Series Updated",
            description: "Book successfully added to series."
          });
        } catch (error) {
          console.error('Error adding book to series:', error);
          toast({
            title: "Error",
            description: "Failed to add book to series.",
            variant: "destructive"
          });
        }
      }
      
      onUpdate(updatedBook);
      onClose();
      
      toast({
        title: "Changes Saved",
        description: "Book details updated successfully."
      });
    } catch (error) {
      console.error('Error saving book:', error);
      toast({
        title: "Error",
        description: "Failed to save changes. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  }, [editedBook, isSaving, onUpdate, onClose, selectedSeriesId, toast]);

  // Delete confirmation and handling
  const handleDeleteConfirmation = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setShowDeleteConfirm(true);
  }, []);
  
  const confirmDelete = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (isDeleting || !onDelete) return;
    
    setIsDeleting(true);
    
    try {
      onDelete(book.id);
      setShowDeleteConfirm(false);
      
      toast({
        title: "Book Deleted",
        description: "The book has been removed from your collection."
      });
    } catch (error) {
      console.error('Error deleting book:', error);
      toast({
        title: "Error",
        description: "Failed to delete book. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  }, [book.id, isDeleting, onDelete, toast]);

  // Title editing functions
  const startTitleEdit = useCallback(() => {
    setIsEditingTitle(true);
    setTitleError(null);
    // Focus the input after state update
    setTimeout(() => {
      if (titleInputRef.current) {
        titleInputRef.current.focus();
        titleInputRef.current.select();
      }
    }, 10);
  }, []);
  
  const validateAndSaveTitle = useCallback(() => {
    const newTitle = titleInputRef.current?.value.trim();
    
    if (!newTitle) {
      setTitleError("Title cannot be empty");
      return false;
    }
    
    setEditedBook(prev => ({ ...prev, title: newTitle }));
    setIsEditingTitle(false);
    setTitleError(null);
    return true;
  }, []);
  
  const cancelTitleEdit = useCallback(() => {
    if (titleInputRef.current) {
      titleInputRef.current.value = editedBook.title;
    }
    setIsEditingTitle(false);
    setTitleError(null);
  }, [editedBook.title]);
  
  const handleTitleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      validateAndSaveTitle();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelTitleEdit();
    }
  }, [validateAndSaveTitle, cancelTitleEdit]);
  
  // Rating click handler
  const handleRatingClick = (rating: number) => {
    setEditedBook({ ...editedBook, rating });
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      // Skip if we're inside an input or textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      // Ctrl/Cmd + S for save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      
      // Escape to close
      if (e.key === 'Escape' && !isEditingTitle && !showDeleteConfirm) {
        e.preventDefault();
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown as EventListener);
    return () => window.removeEventListener('keydown', handleKeyDown as EventListener);
  }, [handleSave, onClose, isEditingTitle, showDeleteConfirm]);

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-elegant">
        <CardHeader className="bg-gradient-warm text-primary-foreground">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {isEditingTitle ? (
                <div className="relative mb-2">
                  <Input
                    ref={titleInputRef}
                    defaultValue={editedBook.title}
                    className={cn(
                      "font-serif text-lg bg-white/20 text-primary-foreground border-white/30",
                      titleError && "border-destructive focus-visible:ring-destructive"
                    )}
                    autoFocus
                    onKeyDown={handleTitleKeyDown}
                    aria-invalid={!!titleError}
                  />
                  {titleError && (
                    <div className="text-destructive text-sm flex items-center gap-1 mt-1">
                      <AlertCircle className="h-3 w-3" /> {titleError}
                    </div>
                  )}
                  <div className="absolute right-1 top-1 flex gap-1">
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault();
                        validateAndSaveTitle();
                      }}
                      className="h-7 w-7 p-0 text-primary-foreground hover:bg-white/20"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault();
                        cancelTitleEdit();
                      }}
                      className="h-7 w-7 p-0 text-primary-foreground hover:bg-white/20"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <CardTitle 
                  className="font-serif text-xl mb-2 cursor-pointer hover:underline hover:underline-offset-4 flex items-center" 
                  onClick={startTitleEdit}
                >
                  {editedBook.title}
                  <Edit2 className="h-4 w-4 ml-2 opacity-50" />
                </CardTitle>
              )}
              <p className="text-primary-foreground/90 font-medium">
                by {editedBook.author}
              </p>
              {editedBook.genre && (
                <Badge variant="secondary" className="mt-2 bg-white/20 text-primary-foreground border-white/30">
                  {editedBook.genre}
                </Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-primary-foreground hover:bg-white/20"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Book Cover and Basic Info */}
          <div className="flex gap-4">
            {book.thumbnail && (
              <img
                src={book.thumbnail}
                alt={book.title}
                className="w-24 h-36 object-cover rounded shadow-book"
              />
            )}
            <div className="flex-1 space-y-2 text-sm">
              {book.publishedDate && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Published: {book.publishedDate}</span>
                </div>
              )}
              {book.pageCount && (
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                  <span>{book.pageCount} pages</span>
                </div>
              )}
            </div>
          </div>

          {/* Reading Progress */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="readingStatus">Reading Status</Label>
              <select
                id="readingStatus"
                value={editedBook.status || (editedBook.completedDate ? 'completed' : 'reading')}
                onChange={(e) => {
                  const status = e.target.value as 'reading' | 'completed' | 'want-to-read';
                  // If changing to completed, set today as completion date if none exists
                  // If changing away from completed, clear completion date
                  const completedDate = status === 'completed' 
                    ? (editedBook.completedDate || new Date().toISOString().split('T')[0])
                    : (status === 'reading' ? editedBook.completedDate : undefined);
                  
                  setEditedBook({ ...editedBook, status, completedDate });
                }}
                className="w-full p-2 border rounded-md bg-background text-foreground"
              >
                <option value="reading">Currently Reading</option>
                <option value="completed">Completed</option>
                <option value="want-to-read">Want to Read</option>
              </select>
            </div>
            
            <div>
              <Label htmlFor="completedDate">Completed Date</Label>
              <Input
                id="completedDate"
                type="date"
                value={editedBook.completedDate || ""}
                disabled={editedBook.status === 'want-to-read'}
                onChange={(e) =>
                  setEditedBook({ ...editedBook, completedDate: e.target.value })
                }
              />
            </div>

            <div>
              <Label>Rating</Label>
              <div className="flex gap-1 mt-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={cn(
                      "h-6 w-6 cursor-pointer transition-colors",
                      star <= (editedBook.rating || 0)
                        ? "fill-accent-warm text-accent-warm"
                        : "text-muted-foreground hover:text-accent-warm"
                    )}
                    onClick={() => handleRatingClick(star)}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Your thoughts about this book..."
              value={editedBook.notes || ""}
              onChange={(e) =>
                setEditedBook({ ...editedBook, notes: e.target.value })
              }
              className="min-h-[100px]"
            />
          </div>

          {/* Description */}
          {book.description && (
            <div>
              <Label>Description</Label>
              <div 
                className="text-sm text-muted-foreground mt-1 p-3 bg-muted rounded leading-relaxed max-h-[200px] overflow-y-auto scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent"
              >
                {cleanHtml(book.description)}
                {/* Fade effect at the bottom to indicate scrollable content */}
                <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-muted to-transparent pointer-events-none"></div>
>>>>>>> main
              </div>
            </div>
          )}
          
          {/* Series Information */}
          <div className="space-y-3">
            <div 
              className="flex items-center justify-between cursor-pointer"
              onClick={() => setShowSeriesInfo(!showSeriesInfo)}
            >
              <div className="flex items-center gap-2">
                <Library className="h-5 w-5 text-primary" />
                <h3 className="text-base font-medium">Series Information</h3>
              </div>
              <Button variant="ghost" size="sm" className="p-1 h-8 w-8">
                {showSeriesInfo ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
            
            {showSeriesInfo && (
              <div className="bg-muted/30 p-4 rounded-md border">
                <div className="mb-4">
                  <Label htmlFor="seriesSelect">Add to Series</Label>
                  {loadingSeries ? (
                    <Skeleton className="h-10 w-full mt-1" />
                  ) : (
                    <div className="relative w-full">
                      <select
                        id="seriesSelect"
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                        value={selectedSeriesId}
                        onChange={(e) => setSelectedSeriesId(e.target.value)}
                      >
                        <option value="">None</option>
                        {availableSeries.map(series => (
                          <option key={series.id} value={series.id}>
                            {series.name} ({series.author || 'Unknown author'})
                          </option>
                        ))}
                      </select>
                      <ChevronRight className="absolute right-3 top-2.5 h-4 w-4 rotate-90 text-muted-foreground" />
                    </div>
                  )}
                </div>
                
                {selectedSeriesId && (
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="volumeNumber">Volume in Series</Label>
                      <Input
                        id="volumeNumber"
                        type="number"
                        min="1"
                        placeholder="Volume number"
                        value={volumeNumber || ''}
                        onChange={(e) => setVolumeNumber(parseInt(e.target.value) || undefined)}
                        className="mt-1"
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => {
                          const seriesId = selectedSeriesId;
                          if (seriesId) {
                            window.location.href = `/series/${seriesId}`;
                          }
                        }}
                      >
                        View Series Details
                        <ChevronRight className="ml-1 h-3 w-3" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-destructive"
                        onClick={() => {
                          setSelectedSeriesId('');
                          setVolumeNumber(undefined);
                        }}
                      >
                        Remove from Series
                        <X className="ml-1 h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
                
                {!selectedSeriesId && (
                  <div className="flex flex-col items-center justify-center p-4 border border-dashed rounded-md bg-muted/50">
                    <p className="text-sm text-muted-foreground mb-2">This book is not part of any series</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center"
                      onClick={() => {
                        window.open('/series', '_blank');
                      }}
                    >
                      <Plus className="mr-1 h-3 w-3" />
                      Create New Series
                    </Button>
                  </div>
                )}
                
                {/* Legacy fields - hidden but preserved for data migration */}
                <input 
                  type="hidden" 
                  value={editedBook._legacySeriesName || ''}
                />
                <input 
                  type="hidden" 
                  value={editedBook._legacyNextBookTitle || ''}
                />
                <input 
                  type="hidden" 
                  value={editedBook._legacyNextBookExpectedYear || ''}
                />
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 pt-4">
            {onDelete && (
              <Button 
                variant="destructive" 
                onClick={handleDeleteConfirmation}
                className="bg-gradient-danger hover:bg-destructive/90 mr-auto"
                title="Delete Book"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Book
              </Button>
            )}
            <div className="flex-grow"></div>
            <Button 
              variant="outline" 
              onClick={onClose}
              type="button"
              title="Cancel Changes"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              className="bg-gradient-warm hover:bg-primary-glow"
              disabled={isSaving}
              type="button"
              title="Save Changes (Ctrl+S)"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
          
          {/* Delete Confirmation Dialog */}
          <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
            <AlertDialogContent className="max-w-md">
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Delete Book
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete "{editedBook.title}"? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel 
                  onClick={(e) => {
                    e.preventDefault();
                    setShowDeleteConfirm(false);
                  }}
                  type="button"
                >
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction 
                  onClick={confirmDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  disabled={isDeleting}
                  type="button"
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
};