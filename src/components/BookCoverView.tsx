import { Book } from "@/types/book";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";
import { usePalette } from "@/contexts/PaletteContext";
import { useState, useEffect } from "react";
import { useTheme } from "@/components/ui-common/ThemeProvider";

interface BookCoverViewProps {
  books: Book[];
  onBookClick: (book: Book) => void;
}

export const BookCoverView = ({ books, onBookClick }: BookCoverViewProps) => {
  const { selectedPalette } = usePalette();
  
  // Function to get a color from the palette based on book spine color
  const getPlaceholderColor = (spineColor: number) => {
    // If we have a selected palette with colors
    if (selectedPalette && selectedPalette.colors && selectedPalette.colors.length > 0) {
      // Use the spine color as an index into the palette array
      // We'll use modulo to ensure we stay within the array bounds
      const colorIndex = (spineColor - 1) % selectedPalette.colors.length;
      return selectedPalette.colors[colorIndex];
    }
    
    // Fallback to the standard spine color classes
    return null;
  };
  
  // Utility function to determine if text should be black or white based on background color
  const getContrastTextColor = (backgroundColor: string): string => {
    try {
      // Handle non-hex colors or empty strings
      if (!backgroundColor || !backgroundColor.startsWith('#')) {
        return '#FFFFFF'; // Default to white text
      }
      
      // Convert hex to RGB
      const r = parseInt(backgroundColor.slice(1, 3), 16);
      const g = parseInt(backgroundColor.slice(3, 5), 16);
      const b = parseInt(backgroundColor.slice(5, 7), 16);
      
      if (isNaN(r) || isNaN(g) || isNaN(b)) {
        return '#FFFFFF'; // Default to white text if parsing fails
      }
      
      // Calculate relative luminance using WCAG formula
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      
      // Use black text on bright backgrounds, white text on dark backgrounds
      return luminance > 0.5 ? '#000000' : '#FFFFFF';
    } catch (error) {
      console.error('Error calculating contrast text color:', error);
      return '#FFFFFF'; // Default to white text if any error occurs
    }
  };
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
                  style={{
                    backgroundColor: getPlaceholderColor(book.spineColor) || undefined
                  }}
                  className={`w-full h-full flex items-center justify-center ${!getPlaceholderColor(book.spineColor) ? `bg-spine-${book.spineColor}` : ''}`}
                >
                  <p 
                    style={{
                      color: getPlaceholderColor(book.spineColor) 
                        ? getContrastTextColor(getPlaceholderColor(book.spineColor)) 
                        : '#FFFFFF'
                    }}
                    className="font-serif text-center px-4 line-clamp-3 transition-colors"
                  >
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
