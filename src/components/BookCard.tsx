import React from 'react';
import { Book } from '@/types/book';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createLogger } from '@/utils/loggingUtils';

// Create a logger for the BookCard component
const log = createLogger('BookCard');

interface BookCardProps {
  book: Book;
  compact?: boolean;
  className?: string;
  showRating?: boolean;
}

export const BookCard = ({ 
  book, 
  compact = false, 
  className = '',
  showRating = true
}: BookCardProps) => {
  // Generate a rating display
  const renderRating = (rating?: number) => {
    if (!rating || !showRating) return null;
    
    return (
      <div className="flex items-center gap-1 mt-1">
        {[...Array(5)].map((_, i) => (
          <Star 
            key={i} 
            className={cn(
              "h-3 w-3", 
              i < rating 
                ? "fill-yellow-500 text-yellow-500" 
                : "text-muted-foreground"
            )}
          />
        ))}
      </div>
    );
  };
  
  // Format the genre as a badge
  const renderGenre = (genre?: string | string[]) => {
    log.debug('Rendering genre in BookCard', { bookId: book.id, genre });
    
    if (!genre) {
      log.trace('No genre to render');
      return null;
    }
    
    if (Array.isArray(genre)) {
      log.trace('Rendering genre array', { count: genre.length });
      return (
        <div className="flex flex-wrap gap-1 mt-1">
          {genre.slice(0, 2).map(g => (
            <Badge key={g} variant="outline" className="text-[10px] py-0">
              {g}
            </Badge>
          ))}
          {genre.length > 2 && (
            <span className="text-xs text-muted-foreground">
              +{genre.length - 2} more
            </span>
          )}
        </div>
      );
    }
    
    log.trace('Rendering single genre string');
    return (
      <Badge variant="outline" className="text-xs mt-1">
        {genre}
      </Badge>
    );
  };
  
  return (
    <Card className={cn(
      "h-full overflow-hidden transition-all", 
      compact ? "border-0 shadow-none" : "border shadow-sm",
      book.status === 'dnf' ? "ring-1 ring-amber-500" : "",
      className
    )}>
      <div className={cn(
        "relative bg-gradient-to-r from-muted to-muted/50",
        compact ? "h-28 w-full" : "h-40 w-full"
      )}>
        {book.thumbnail ? (
          <img 
            src={book.thumbnail} 
            alt={book.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <BookOpen className="h-8 w-8 text-muted-foreground/50" />
          </div>
        )}
        {book.status === 'reading' && (
          <div className="absolute top-0 left-0 w-full h-1 bg-accent" />
        )}
        {book.status === 'dnf' && (
          <>
            <div className="absolute inset-0 border-2 border-amber-500 rounded-t-md" />
            <div className="absolute top-2 right-2">
              <Badge className="bg-amber-500 text-[10px] py-0">DNF</Badge>
            </div>
          </>
        )}
      </div>
      
      <CardContent className={cn(
        compact ? "p-2" : "p-4"
      )}>
        <h3 className={cn(
          "font-medium line-clamp-2",
          compact ? "text-sm" : "text-base"
        )}>
          {book.title}
        </h3>
        
        <p className={cn(
          "text-muted-foreground line-clamp-1",
          compact ? "text-xs" : "text-sm"
        )}>
          {book.author}
        </p>
        
        {renderRating(book.rating)}
        {!compact && renderGenre(book.genre)}
      </CardContent>
    </Card>
  );
};
