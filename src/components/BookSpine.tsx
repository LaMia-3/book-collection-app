import { Book } from "@/types/book";
import { cn } from "@/lib/utils";
import { usePalette } from "@/contexts/PaletteContext";
import { useMemo } from "react";
import { useTheme } from "@/components/ui-common/ThemeProvider";

interface BookSpineProps {
  book: Book;
  onClick: () => void;
}

export const BookSpine = ({ book, onClick }: BookSpineProps) => {
  const { selectedPalette } = usePalette();
  // Generate a pseudo-random number between min and max based on book ID
  // This ensures consistent but varied sizes for each book
  const getRandomForBook = (min: number, max: number, offsetFactor = 0) => {
    // Create a simple hash from the book ID to use as a seed
    let hash = 0;
    for (let i = 0; i < book.id.length; i++) {
      hash = ((hash << 5) - hash) + book.id.charCodeAt(i);
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    // Add the offset factor to create different random values from the same ID
    hash = hash + offsetFactor;
    
    // Generate a value between 0 and 1 using the hash
    const rand = Math.abs((Math.sin(hash) + 1) / 2);
    
    // Scale to the range between min and max
    return min + rand * (max - min);
  };
  // Generate height based on page count or title length
  // For very long titles, make books taller, but never exceed bookshelf height of 220px
  const getSpineHeight = () => {
    const BOOKSHELF_MAX_HEIGHT = 215; // 5px less than bookshelf for margin
    
    // Add randomization factor - different books will vary by +/-10% in height
    const randomFactor = getRandomForBook(0.9, 1.1, 1000);
    
    // Base height on page count if available
    if (book.pageCount) {
      // Calculate base height but include randomization
      const pageBasedHeight = book.pageCount / 3 * randomFactor;
      const baseHeight = Math.min(BOOKSHELF_MAX_HEIGHT, Math.max(130, pageBasedHeight));
      
      // For very long titles, make taller regardless of page count, but respect max height
      if (book.title.length > 120) {
        // Even with long titles, add some randomness
        const longTitleHeight = 215 * getRandomForBook(0.97, 1, 2000);
        return Math.min(BOOKSHELF_MAX_HEIGHT, Math.max(baseHeight, longTitleHeight));
      } else if (book.title.length > 80) {
        // Add randomness to tall books
        const tallBookHeight = 200 * getRandomForBook(0.95, 1.02, 3000);
        return Math.min(BOOKSHELF_MAX_HEIGHT, Math.max(baseHeight, tallBookHeight));
      }
      
      return baseHeight;
    }
    
    // If no page count, base entirely on title length with randomization
    const titleLength = book.title.length;
    
    // Create random variation in height ranges
    const heightRangeRandomizer = getRandomForBook(0.92, 1.08, 4000);
    
    // Increase height for very long titles, but never exceed bookshelf height
    if (titleLength > 120) {
      // Maximum height with slight variation
      return Math.min(BOOKSHELF_MAX_HEIGHT, 215 * heightRangeRandomizer); 
    } else if (titleLength > 80) {
      // Very tall with more variation
      return Math.min(BOOKSHELF_MAX_HEIGHT, 200 * heightRangeRandomizer);
    } else if (titleLength > 60) {
      // Tall with even more variation
      return Math.min(BOOKSHELF_MAX_HEIGHT, 180 * getRandomForBook(0.9, 1.1, 5000));
    } else if (titleLength > 40) {
      // Medium with significant variation
      return Math.min(BOOKSHELF_MAX_HEIGHT, 160 * getRandomForBook(0.88, 1.12, 6000));
    }
    
    // Default height range for normal titles with randomization
    const baseHeight = titleLength * 2.5 + 100;
    const randomizedHeight = baseHeight * getRandomForBook(0.85, 1.15, 7000);
    return Math.min(BOOKSHELF_MAX_HEIGHT, Math.max(120, randomizedHeight));
  };
  
  // Calculate width based on title length to ensure text fits
  const getSpineWidth = () => {
    // Get font size in pixels (text-xs is roughly 12px)
    const fontSize = 12;
    // Estimate how many characters can fit in the height
    const height = getSpineHeight();
    // Reserve some space for padding only (no author name anymore)
    const availableHeight = height - 15;
    
    // Calculate how many characters fit in available height (accounting for line height)
    const charsPerHeight = Math.floor(availableHeight / (fontSize * 1.1));
    
    // Get title length
    const titleLength = book.title.length;
    
    // Add randomization to base width (between 32-40px)
    // Uses a different offset so width and height vary independently
    const randomBaseWidth = Math.floor(getRandomForBook(32, 40, 8000));
    
    // Add randomization to width per column 
    // Default width per column with randomization
    let widthPerColumn = getRandomForBook(10, 14, 9000); 
    
    // Still adjust based on title length, but with randomization
    if (titleLength > 100) {
      // More space for very long titles with some variation
      widthPerColumn = getRandomForBook(13, 16, 10000);
    } else if (titleLength > 70) {
      // More space for long titles with variation
      widthPerColumn = getRandomForBook(11, 15, 11000);
    }
    
    // For each additional column, add appropriate width
    let extraWidthNeeded = 0;
    
    if (titleLength > charsPerHeight) {
      // Calculate how many "columns" of text we need
      const columnsNeeded = Math.ceil(titleLength / charsPerHeight);
      
      // Add random variation to column width multiplier (±10%)
      const widthMultiplier = getRandomForBook(0.9, 1.1, 12000);
      extraWidthNeeded = (columnsNeeded - 1) * widthPerColumn * widthMultiplier;
    }
    
    // Add some small random variation to books even if they don't need extra width
    const randomWidthAdjustment = getRandomForBook(-3, 4, 13000);
    
    // Base width + extra width + random adjustment, with moderate max width
    // Maximum width between 110-125px for variation
    const maxWidth = Math.floor(getRandomForBook(110, 125, 14000));
    return `${Math.min(maxWidth, Math.max(28, randomBaseWidth + extraWidthNeeded + randomWidthAdjustment))}px`;
  };

  const spineHeight = getSpineHeight();
  const spineWidth = getSpineWidth();
  
  // Get palette color for this book
  const spineColor = useMemo(() => {
    if (selectedPalette && selectedPalette.colors?.length > 0) {
      // Create a deterministic but random selection based on book ID
      // This ensures the same book always gets the same color from the palette
      let hash = 0;
      for (let i = 0; i < book.id.length; i++) {
        hash = ((hash << 5) - hash) + book.id.charCodeAt(i);
        hash = hash & hash; // Convert to 32-bit integer
      }
      
      // Select a color from the palette based on book id hash
      const colorIndex = Math.abs(hash) % selectedPalette.colors.length;
      return selectedPalette.colors[colorIndex];
    }
    
    // Fallback to existing spine color if no palette is selected
    return null;
  }, [selectedPalette, book.id]);
  
  // Determine optimal text color based on background color for accessibility
  const textColor = useMemo(() => {
    // If no custom spine color, use the default white text
    if (!spineColor) return '#FFFFFF';
    
    try {
      // Handle non-hex colors or empty strings
      if (!spineColor.startsWith('#')) {
        return '#FFFFFF'; // Default to white text
      }
      
      // Convert hex to RGB
      const r = parseInt(spineColor.slice(1, 3), 16);
      const g = parseInt(spineColor.slice(3, 5), 16);
      const b = parseInt(spineColor.slice(5, 7), 16);
      
      if (isNaN(r) || isNaN(g) || isNaN(b)) {
        return '#FFFFFF'; // Default to white text if parsing fails
      }
      
      // Calculate relative luminance using WCAG formula
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      
      // Use black text on bright backgrounds, white text on dark backgrounds
      return luminance > 0.5 ? '#000000' : '#FFFFFF';
    } catch (error) {
      console.error('Error calculating contrast text color for spine:', error);
      return '#FFFFFF'; // Default to white text if any error occurs
    }
  }, [spineColor]);
  
  // Use class-based color if no palette selected
  const spineColorClass = !spineColor ? `bg-spine-${book.spineColor || 'blue'}` : '';

  return (
    <div
      className={cn(
        "relative cursor-pointer group",
        "rounded-sm shadow-book hover:shadow-elegant"
      )}
      style={{ 
        height: `${spineHeight}px`, 
        width: spineWidth,
        minWidth: '36px',
        maxWidth: '120px'
      }}
      onClick={onClick}
    >
      {/* Book spine background */}
      <div
        className={cn(
          "absolute inset-0 rounded-sm transition-colors duration-300",
          spineColorClass,
          "group-hover:brightness-110"
        )}
        style={spineColor ? { backgroundColor: spineColor } : undefined}
      >
        {/* Spine highlight */}
        <div className="absolute left-1 top-2 bottom-2 w-0.5 bg-white/30 rounded-full"></div>
        
        {/* Book title - vertical text */}
        <div 
          className="absolute inset-0 flex items-center justify-center p-2 pb-3"
          style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
        >
          <span 
            className="text-xs font-medium text-center leading-tight transition-colors"
            style={{ 
              color: textColor,
              textShadow: textColor === '#000000' 
                ? '0 1px 2px rgba(255,255,255,0.2)' 
                : '0 1px 2px rgba(0,0,0,0.3)',
              maxHeight: '95%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              wordBreak: 'break-word',
              whiteSpace: 'pre-line'
            }}
          >
            {book.title}
          </span>
        </div>

        {/* No author name - removed to prevent overlap with title */}

        {/* Subtle texture overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent rounded-sm"></div>
      </div>

      {/* Hover glow effect */}
      <div className="absolute -inset-1 bg-primary/20 rounded-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm -z-10"></div>
    </div>
  );
};