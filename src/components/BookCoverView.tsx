import { Book } from "@/types/book";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";

interface BookCoverViewProps {
  books: Book[];
  onBookClick: (book: Book) => void;
}

export const BookCoverView = ({ books, onBookClick }: BookCoverViewProps) => {
  if (books.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <h3 className="text-xl font-serif text-muted-foreground mb-2">Your library is empty</h3>
        <p className="text-muted-foreground">Start building your collection by searching for books above</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 p-2">
      {books.map((book) => (
        <Card 
          key={book.id}
          className="overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-elegant"
          onClick={() => onBookClick(book)}
        >
          <CardContent className="p-0 relative flex flex-col h-full">
            <div className="aspect-[2/3] w-full bg-muted relative">
              {book.thumbnail ? (
                <img 
                  src={book.thumbnail} 
                  alt={book.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div 
                  className={`w-full h-full flex items-center justify-center bg-spine-${book.spineColor}`}
                >
                  <p className="font-serif text-white text-center px-4 line-clamp-3">
                    {book.title}
                  </p>
                </div>
              )}
              {book.status === 'want-to-read' && (
                <Badge className="absolute top-2 right-2 bg-gradient-cool text-white">
                  Want to Read
                </Badge>
              )}
              {(book.status === 'completed' || (!book.status && book.completedDate)) && (
                <Badge className="absolute top-2 right-2 bg-gradient-success text-white">
                  Read
                </Badge>
              )}
              {(book.status === 'reading' || (!book.status && !book.completedDate && book.status !== 'want-to-read')) && (
                <Badge className="absolute top-2 right-2 bg-gradient-warm text-white">
                  Reading
                </Badge>
              )}
            </div>
            <div className="p-3">
              <h3 className="font-serif font-medium text-sm leading-tight mb-1 line-clamp-2">
                {book.title}
              </h3>
              <p className="text-xs text-muted-foreground mb-1">
                {book.author}
              </p>
              {book.rating && (
                <div className="flex">
                  {Array(book.rating).fill(0).map((_, i) => (
                    <Star key={i} className="h-3 w-3 fill-accent-warm text-accent-warm" />
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
