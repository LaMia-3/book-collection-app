import { Book } from "@/types/book";
import { BookSpine } from "./BookSpine";

interface BookShelfProps {
  books: Book[];
  onBookClick: (book: Book) => void;
}

export const BookShelf = ({ books, onBookClick }: BookShelfProps) => {
  if (books.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-24 h-24 bg-gradient-shelf rounded-lg mb-6 shadow-shelf"></div>
        <h3 className="text-xl font-serif text-muted-foreground mb-2">Your library awaits</h3>
        <p className="text-muted-foreground">Start building your collection by searching for books above</p>
      </div>
    );
  }

  // Separate books into categories based on status
  const currentlyReading = books.filter(book => 
    book.status === 'reading' || (!book.status && !book.completedDate)
  );
  
  const completedBooks = books.filter(book => 
    book.status === 'completed' || (!book.status && book.completedDate)
  );
  
  const wantToReadBooks = books.filter(book => book.status === 'want-to-read');

  // Function to intelligently group books by width to fit on shelves
  const groupBooksByShelves = (books: Book[]) => {
    const shelves: Book[][] = [];
    let currentShelf: Book[] = [];
    let currentShelfWidth = 0;
    // Use container-relative width to ensure books fit on various screen sizes
    // This is a percentage of the container width - we'll fill shelves to about 90% capacity
    const shelfFillPercentage = 0.9;
    // Get an approximate pixel width for the shelf based on container size
    const containerWidth = window.innerWidth > 1200 ? 1200 : window.innerWidth - 48; // Account for margins/padding
    const shelfMaxWidth = containerWidth * shelfFillPercentage;
    const marginBetweenBooks = 4; // Gap between books in pixels

    // Estimate book width based on book attributes for more realistic shelf arrangement
    const estimateBookWidth = (book: Book) => {
      // Base width for any book
      const baseWidth = 36; // Slightly wider base width for more visual fullness
      
      // Calculate font size in pixels (text-xs is roughly 12px)
      const fontSize = 12;
      
      // Use multiple factors to determine book width:
      // 1. Page count (thicker books are wider)
      // 2. Title length (books with longer titles tend to be wider)
      // 3. Publication year (older books tend to be thinner)
      
      // Factor 1: Page count contribution
      const pageCountFactor = book.pageCount 
        ? Math.min(20, Math.max(0, book.pageCount / 50)) // Max 20px from page count
        : 10; // Default if no page count
        
      // Factor 2: Title length contribution
      const titleLengthFactor = Math.min(15, Math.max(0, book.title.length / 5)); // Max 15px from title
      
      // Factor 3: Publication year - older books are slightly thinner
      const currentYear = new Date().getFullYear();
      const pubYear = book.publishedDate ? new Date(book.publishedDate).getFullYear() : currentYear;
      const ageFactor = Math.max(0, Math.min(10, (currentYear - pubYear) / 50)); // Max 10px from age
      
      // Add some randomness for visual interest (±4px)
      const randomFactor = Math.floor(Math.random() * 8) - 4;
      
      // Calculate total width with all factors
      const calculatedWidth = baseWidth + pageCountFactor + titleLengthFactor - ageFactor + randomFactor;
      
      // Return estimated width in pixels - constrain between 30px and 85px
      return Math.min(85, Math.max(30, calculatedWidth));
    };

    books.forEach(book => {
      const bookWidth = estimateBookWidth(book);
      
      // If adding this book would exceed shelf width, start a new shelf
      if (currentShelfWidth + bookWidth + marginBetweenBooks > shelfMaxWidth && currentShelf.length > 0) {
        shelves.push([...currentShelf]);
        currentShelf = [];
        currentShelfWidth = 0;
      }
      
      // Add book to current shelf
      currentShelf.push(book);
      currentShelfWidth += bookWidth + marginBetweenBooks;
    });

    // Add remaining books to a shelf
    if (currentShelf.length > 0) {
      shelves.push(currentShelf);
    }

    return shelves;
  };

  // Group books into shelves based on their width
  const currentlyReadingShelves = currentlyReading.length > 0 
    ? groupBooksByShelves(currentlyReading) 
    : [];

  const completedShelves = completedBooks.length > 0 
    ? groupBooksByShelves(completedBooks) 
    : [];
    
  const wantToReadShelves = wantToReadBooks.length > 0
    ? groupBooksByShelves(wantToReadBooks)
    : [];

  const renderShelf = (shelfBooks: Book[], isFirst?: boolean, isLast?: boolean, shelfIndex?: number) => {
    // Determine border radius based on position in bookshelf group
    const borderTopRadius = isFirst ? '0.5rem' : '0';
    const borderBottomRadius = isLast ? '0.5rem' : '0';

    return (
      <div 
        className="relative mb-1 last:mb-0 w-full"
        style={{
          backgroundImage: 'var(--gradient-shelf)',
          boxShadow: 'var(--shadow-shelf)',
          borderTopLeftRadius: borderTopRadius, 
          borderTopRightRadius: borderTopRadius,
          borderBottomLeftRadius: borderBottomRadius,
          borderBottomRightRadius: borderBottomRadius
        }}
      >
        {/* Bookshelf Structure */}
        <div 
          className="relative bg-gradient-to-b from-amber-900/30 to-amber-800/30 p-2 shadow-lg border border-amber-700/50"
          style={{
            borderTopLeftRadius: borderTopRadius, 
            borderTopRightRadius: borderTopRadius,
            borderBottomLeftRadius: borderBottomRadius,
            borderBottomRightRadius: borderBottomRadius
          }}
        >
          {/* Back panel */}
          <div className="absolute inset-2 bg-gradient-to-b from-amber-900/20 to-amber-800/20 rounded"></div>
          
          {/* Side panels */}
          <div className="absolute left-0 top-0 bottom-0 w-2 bg-gradient-to-r from-amber-800 to-amber-700 rounded-l-lg shadow-inner"></div>
          <div className="absolute right-0 top-0 bottom-0 w-2 bg-gradient-to-l from-amber-800 to-amber-700 rounded-r-lg shadow-inner"></div>
          
          {/* Books container */}
          <div 
            className="relative flex items-end justify-start gap-1 px-2 w-full h-[220px] z-10 overflow-hidden"
          >
            {shelfBooks.map((book) => (
              <BookSpine
                key={book.id}
                book={book}
                onClick={() => onBookClick(book)}
              />
            ))}
            {/* Empty shelf placeholder when there are few books */}
            {shelfBooks.length === 0 && (
              <div className="flex items-center justify-center w-full h-full opacity-50">
                <p className="text-sm text-muted-foreground italic">Empty shelf</p>
              </div>
            )}
          </div>

          {/* Bottom shelf */}
          <div 
            className="h-4 bg-gradient-shelf shadow-shelf relative w-full mt-1" 
            style={{borderBottomLeftRadius: isLast ? '0.5rem' : '0', borderBottomRightRadius: isLast ? '0.5rem' : '0'}}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-b-md"></div>
            {/* Shelf edge highlight */}
            <div className="absolute top-0 left-1 right-1 h-0.5 bg-amber-200 dark:bg-amber-600 rounded-full"></div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Currently Reading Section */}
      {currentlyReadingShelves.length > 0 && (
        <div>
          <h3 className="text-lg font-serif text-foreground mb-3 px-2">Currently Reading</h3>
          <div className="flex flex-col">
            {currentlyReadingShelves.map((shelfBooks, shelfIndex) => {
              const isFirst = shelfIndex === 0;
              const isLast = shelfIndex === currentlyReadingShelves.length - 1;
              return (
                <div key={`reading-${shelfIndex}`}>
                  {renderShelf(shelfBooks, isFirst, isLast, shelfIndex)}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Completed Books Section */}
      {completedShelves.length > 0 && (
        <div>
          <h3 className="text-lg font-serif text-foreground mb-3 px-2">Completed Books</h3>
          <div className="flex flex-col">
            {completedShelves.map((shelfBooks, shelfIndex) => {
              const isFirst = shelfIndex === 0;
              const isLast = shelfIndex === completedShelves.length - 1;
              return (
                <div key={`completed-${shelfIndex}`}>
                  {renderShelf(shelfBooks, isFirst, isLast, shelfIndex + currentlyReadingShelves.length)}
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Want to Read Books Section */}
      {wantToReadShelves.length > 0 && (
        <div>
          <h3 className="text-lg font-serif text-foreground mb-3 px-2">Want to Read</h3>
          <div className="flex flex-col">
            {wantToReadShelves.map((shelfBooks, shelfIndex) => {
              const isFirst = shelfIndex === 0;
              const isLast = shelfIndex === wantToReadShelves.length - 1;
              return (
                <div key={`want-to-read-${shelfIndex}`}>
                  {renderShelf(
                    shelfBooks, 
                    isFirst, 
                    isLast, 
                    shelfIndex + currentlyReadingShelves.length + completedShelves.length
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};