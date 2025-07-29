import { useState, useEffect, useRef, KeyboardEvent } from "react";
import { Book } from "@/types/book";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Calendar, Star, BookOpen, X, Trash2, AlertTriangle, Check, Edit2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { cleanHtml } from "@/utils/textUtils";
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
  const [editedBook, setEditedBook] = useState<Book>({ ...book });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Title editing state
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleError, setTitleError] = useState<string | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Prevent multiple clicks by using state management
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSave = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isSaving) return;
    
    setIsSaving(true);
    try {
      onUpdate(editedBook);
      onClose();
    } catch (error) {
      console.error('Error saving book:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteConfirmation = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowDeleteConfirm(true);
  };
  
  const confirmDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isDeleting) return;
    
    setIsDeleting(true);
    try {
      if (onDelete) {
        onDelete(book.id);
      }
      setShowDeleteConfirm(false);
      onClose();
    } catch (error) {
      console.error('Error deleting book:', error);
      setShowDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRatingClick = (rating: number) => {
    setEditedBook({ ...editedBook, rating });
  };
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      // Skip if we're editing the title (handled separately)
      if (isEditingTitle) return;
      
      // Save with Ctrl+S or Cmd+S
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (!isSaving) {
          // Create a synthetic event for the save handler
          const syntheticEvent = { preventDefault: () => {} } as React.MouseEvent;
          handleSave(syntheticEvent);
          toast({
            title: "Changes saved",
            description: "Your book details have been updated."
          });
        }
      }
      
      // Cancel with Escape (if not in a dialog)
      if (e.key === 'Escape' && !showDeleteConfirm) {
        e.preventDefault();
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown as EventListener);
    return () => window.removeEventListener('keydown', handleKeyDown as EventListener);
  }, [editedBook, isSaving, isEditingTitle, showDeleteConfirm, onClose, handleSave, toast]);
  
  // Title editing functions
  const startTitleEdit = () => {
    setIsEditingTitle(true);
    setTitleError(null);
    // Focus the input after state update
    setTimeout(() => {
      if (titleInputRef.current) {
        titleInputRef.current.focus();
        titleInputRef.current.select();
      }
    }, 10);
  };
  
  const validateAndSaveTitle = () => {
    const newTitle = titleInputRef.current?.value.trim();
    
    if (!newTitle) {
      setTitleError("Title cannot be empty");
      return false;
    }
    
    setEditedBook({ ...editedBook, title: newTitle });
    setIsEditingTitle(false);
    setTitleError(null);
    return true;
  };
  
  const cancelTitleEdit = () => {
    setIsEditingTitle(false);
    setTitleError(null);
    // Reset to the current value
    if (titleInputRef.current) {
      titleInputRef.current.value = editedBook.title;
    }
  };
  
  const handleTitleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      validateAndSaveTitle();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelTitleEdit();
    }
  };

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
                      "font-serif text-xl bg-white/20 text-primary-foreground border-white/30 pr-16",
                      titleError && "border-destructive focus-visible:ring-destructive"
                    )}
                    onKeyDown={handleTitleKeyDown}
                    aria-invalid={!!titleError}
                  />
                  <div className="absolute right-0 top-0 h-full flex items-center gap-1 pr-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={validateAndSaveTitle}
                      className="h-8 w-8 text-primary-foreground hover:bg-white/20"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={cancelTitleEdit}
                      className="h-8 w-8 text-primary-foreground hover:bg-white/20"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  {titleError && (
                    <div className="text-destructive text-sm flex items-center gap-1 mt-1">
                      <AlertCircle className="h-3 w-3" /> {titleError}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-1 mb-2">
                  <CardTitle className="font-serif text-xl">
                    {editedBook.title}
                  </CardTitle>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={startTitleEdit}
                    className="h-6 w-6 text-primary-foreground/80 hover:bg-white/20 hover:text-primary-foreground"
                    title="Edit title"
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                </div>
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

          {/* Series Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isPartOfSeries"
                checked={editedBook.isPartOfSeries || false}
                onChange={(e) =>
                  setEditedBook({ ...editedBook, isPartOfSeries: e.target.checked })
                }
                className="rounded"
              />
              <Label htmlFor="isPartOfSeries">Part of a series</Label>
            </div>

            {editedBook.isPartOfSeries && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6">
                <div>
                  <Label htmlFor="seriesName">Series Name</Label>
                  <Input
                    id="seriesName"
                    placeholder="e.g., The Chronicles of Narnia"
                    value={editedBook.seriesName || ""}
                    onChange={(e) =>
                      setEditedBook({ ...editedBook, seriesName: e.target.value })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="nextBookTitle">Next Book Title</Label>
                  <Input
                    id="nextBookTitle"
                    placeholder="Title of the next book"
                    value={editedBook.nextBookTitle || ""}
                    onChange={(e) =>
                      setEditedBook({ ...editedBook, nextBookTitle: e.target.value })
                    }
                  />
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="nextBookExpectedYear">Expected Year</Label>
                  <Input
                    id="nextBookExpectedYear"
                    type="number"
                    placeholder="2024"
                    value={editedBook.nextBookExpectedYear || ""}
                    onChange={(e) =>
                      setEditedBook({
                        ...editedBook,
                        nextBookExpectedYear: parseInt(e.target.value) || undefined,
                      })
                    }
                  />
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          {book.description && (
            <div>
              <Label>Description</Label>
              <div className="relative">
                <div 
                  className="text-sm text-muted-foreground mt-1 p-3 bg-muted rounded leading-relaxed max-h-[200px] overflow-y-auto custom-scrollbar scrollbar-thin whitespace-pre-line"
                >
                  {cleanHtml(book.description)}
                </div>
                {/* Fade effect at the bottom to indicate scrollable content */}
                <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-muted to-transparent pointer-events-none"></div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 pt-4">
            {onDelete && (
              <Button 
                variant="destructive" 
                onClick={handleDeleteConfirmation}
                className="bg-gradient-danger hover:bg-destructive/90 mr-auto"
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
                  Are you sure you want to delete "{book.title}"? This action cannot be undone.
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