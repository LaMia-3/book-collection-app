import { useState } from "react";
import { Book } from "@/types/book";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Star, ChevronUp, ChevronDown } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

// Define sort fields for the BookListView
type SortField = 'title' | 'author' | 'genre' | 'status' | 'rating' | 'addedDate';

// Define sort direction
type SortDirection = 'asc' | 'desc';

interface BookListViewProps {
  books: Book[];
  onBookClick: (book: Book) => void;
}

export const BookListView = ({ books, onBookClick }: BookListViewProps) => {
  // State for tracking the sort field and direction
  const [sortField, setSortField] = useState<SortField>('title');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  
  // Function to handle column header click for sorting
  const handleSort = (field: SortField) => {
    // If clicking the same field, toggle direction
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // If clicking a different field, set it as the new sort field with ascending direction
      setSortField(field);
      setSortDirection('asc');
    }
  };
  
  // Create a sortable header component
  const SortableHeader = ({ field, children, className = '' }: { field: SortField, children: React.ReactNode, className?: string }) => {
    const isActive = sortField === field;
    
    return (
      <TableHead 
        className={`cursor-pointer hover:text-foreground ${isActive ? 'text-foreground' : ''} ${className}`}
        onClick={() => handleSort(field)}
      >
        <div className="flex items-center gap-1">
          {children}
          {isActive && (
            <span className="ml-1">
              {sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </span>
          )}
        </div>
      </TableHead>
    );
  };
  
  // Sort the books based on current sort field and direction
  const sortedBooks = [...books].sort((a, b) => {
    // Helper function to get comparable values
    const getValue = (book: Book, field: SortField) => {
      switch (field) {
        case 'title':
          return book.title.toLowerCase();
        case 'author':
          return book.author.toLowerCase();
        case 'genre':
          return (book.genre || '').toLowerCase();
        case 'status':
          return book.status || (book.completedDate ? 'completed' : 'reading');
        case 'rating':
          return book.rating || 0;
        case 'addedDate':
          return book.addedDate || '';
        default:
          return '';
      }
    };
    
    const valueA = getValue(a, sortField);
    const valueB = getValue(b, sortField);
    
    if (valueA < valueB) return sortDirection === 'asc' ? -1 : 1;
    if (valueA > valueB) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });
  if (books.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <h3 className="text-xl font-serif text-muted-foreground mb-2">Your library is empty</h3>
        <p className="text-muted-foreground">Start building your collection by searching for books above</p>
      </div>
    );
  }

  return (
    <div className="overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <SortableHeader field="title" className="w-[250px]">Title</SortableHeader>
            <SortableHeader field="author" className="w-[180px]">Author</SortableHeader>
            <SortableHeader field="genre" className="w-[120px]">Genre</SortableHeader>
            <SortableHeader field="status">Status</SortableHeader>
            <SortableHeader field="rating" className="w-[80px]">Rating</SortableHeader>
            <SortableHeader field="addedDate" className="w-[120px]">Added</SortableHeader>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedBooks.map((book) => (
            <TableRow 
              key={book.id} 
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => onBookClick(book)}
            >
              <TableCell className="font-medium font-serif">
                {book.title}
                {book.isPartOfSeries && (
                  <Badge variant="outline" className="ml-2">Series</Badge>
                )}
              </TableCell>
              <TableCell>{book.author}</TableCell>
              <TableCell>{book.genre || '-'}</TableCell>
              <TableCell>
                <Badge 
                  className={
                    book.status === 'want-to-read'
                      ? "bg-gradient-cool text-white"
                      : book.status === 'completed' || (!book.status && book.completedDate)
                        ? "bg-gradient-success text-white" 
                        : "bg-gradient-warm text-white"
                  }
                >
                  {book.status === 'want-to-read'
                    ? "Want to Read"
                    : book.status === 'completed' || (!book.status && book.completedDate)
                      ? "Read" 
                      : "Reading"
                  }
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex">
                  {book.rating ? Array(book.rating).fill(0).map((_, i) => (
                    <Star 
                      key={i} 
                      className="h-4 w-4 fill-accent-warm text-accent-warm" 
                    />
                  )) : '-'}
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {book.addedDate ? formatDistanceToNow(new Date(book.addedDate), { addSuffix: true }) : '-'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
