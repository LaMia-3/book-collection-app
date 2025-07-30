import { useState } from "react";
import { Book } from "@/types/book";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Calendar, Star, BookOpen, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface BookDetailsProps {
  book: Book;
  onUpdate: (updatedBook: Book) => void;
  onDelete?: (bookId: string) => void;
  onClose: () => void;
}

export const BookDetails = ({ book, onUpdate, onDelete, onClose }: BookDetailsProps) => {
  const [editedBook, setEditedBook] = useState<Book>({ ...book });

  const handleSave = () => {
    onUpdate(editedBook);
    onClose();
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(book.id);
    }
  };

  const handleRatingClick = (rating: number) => {
    setEditedBook({ ...editedBook, rating });
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-elegant">
        <CardHeader className="bg-gradient-warm text-primary-foreground">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="font-serif text-xl mb-2">
                {book.title}
              </CardTitle>
              <p className="text-primary-foreground/90 font-medium">
                by {book.author}
              </p>
              {book.genre && (
                <Badge variant="secondary" className="mt-2 bg-white/20 text-primary-foreground border-white/30">
                  {book.genre}
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
                    value={editedBook._legacySeriesName || ""}
                    onChange={(e) =>
                      setEditedBook({ ...editedBook, _legacySeriesName: e.target.value })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="nextBookTitle">Next Book Title</Label>
                  <Input
                    id="nextBookTitle"
                    placeholder="Title of the next book"
                    value={editedBook._legacyNextBookTitle || ""}
                    onChange={(e) =>
                      setEditedBook({ ...editedBook, _legacyNextBookTitle: e.target.value })
                    }
                  />
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="nextBookExpectedYear">Expected Year</Label>
                  <Input
                    id="nextBookExpectedYear"
                    type="number"
                    placeholder="2024"
                    value={editedBook._legacyNextBookExpectedYear || ""}
                    onChange={(e) =>
                      setEditedBook({
                        ...editedBook,
                        _legacyNextBookExpectedYear: parseInt(e.target.value) || undefined,
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
              <div className="text-sm text-muted-foreground mt-1 p-3 bg-muted rounded leading-relaxed">
                {book.description.length > 300
                  ? `${book.description.substring(0, 300)}...`
                  : book.description}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 pt-4">
            <Button onClick={handleSave} className="bg-gradient-warm hover:bg-primary-glow">
              Save Changes
            </Button>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <div className="flex-grow"></div>
            {onDelete && (
              <Button 
                variant="destructive" 
                onClick={handleDelete}
                className="bg-gradient-danger hover:bg-destructive/90"
              >
                Delete Book
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};