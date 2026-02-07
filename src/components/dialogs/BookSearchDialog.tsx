import { useState, useEffect } from "react";
import { BookSearch } from "@/components/BookSearch";
import { Book } from "@/types/book";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface BookSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddBook: (book: Book) => void;
  existingBooks: Book[];
}

export function BookSearchDialog({
  open,
  onOpenChange,
  onAddBook,
  existingBooks,
}: BookSearchDialogProps) {
  // Wrap the onAddBook function to close the dialog after adding a book
  const handleAddBook = (book: Book) => {
    onAddBook(book);
    // Don't close the dialog automatically so users can add multiple books
  };

  // State to track dialog height based on viewport
  const [maxHeight, setMaxHeight] = useState("600px");

  // Update max height based on viewport size
  useEffect(() => {
    const updateMaxHeight = () => {
      // Calculate 80% of viewport height
      const viewportHeight = window.innerHeight;
      const calculatedHeight = Math.floor(viewportHeight * 0.8);
      setMaxHeight(`${calculatedHeight}px`);
    };

    // Set initial height
    updateMaxHeight();

    // Add event listener for resize
    window.addEventListener("resize", updateMaxHeight);

    // Clean up
    return () => window.removeEventListener("resize", updateMaxHeight);
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[90vw] p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>Search for Books</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="px-6" style={{ maxHeight }}>
          <div className="py-4">
            <BookSearch 
              onAddBook={handleAddBook} 
              existingBooks={existingBooks} 
              maxResultsHeight={`calc(${maxHeight} - 180px)`}
            />
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
