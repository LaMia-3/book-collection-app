import React from "react";
import { Badge } from "@/components/ui/badge";
import { standardizeGenreData, genresToDisplayString, type GenreData } from "@/utils/genreUtils";
import { createLogger } from "@/utils/loggingUtils";

const log = createLogger("GenreDisplay");

interface GenreDisplayProps {
  genres: GenreData;
  className?: string;
  maxDisplay?: number; // Maximum number of genres to display before truncating
  showBadges?: boolean; // Whether to show badges or text with forward slashes
}

/**
 * Component for displaying book genres as badges or text
 */
export const GenreDisplay: React.FC<GenreDisplayProps> = ({ 
  genres, 
  className = "",
  maxDisplay = 0, // 0 = show all genres
  showBadges = true
}) => {
  log.debug("Rendering genre display", { 
    genreType: typeof genres, 
    maxDisplay, 
    showBadges 
  });
  const genreArray = standardizeGenreData(genres);
  
  log.trace("Standardized genres", { genreCount: genreArray.length, genres: genreArray });
  
  if (genreArray.length === 0) {
    log.debug("No genres to display");
    return <div className="text-muted-foreground text-sm">Uncategorized</div>;
  }
  
  // Handle truncation if maxDisplay is set
  const displayGenres = maxDisplay > 0 && genreArray.length > maxDisplay
    ? genreArray.slice(0, maxDisplay)
    : genreArray;
    
  const hasMore = maxDisplay > 0 && genreArray.length > maxDisplay;
  const moreCount = genreArray.length - maxDisplay;
  const allGenresString = genreArray.join(' / ');
  
  log.debug("Rendering genres", { 
    total: genreArray.length, 
    displaying: displayGenres.length, 
    hasMore, 
    moreCount 
  });
  
  // Text-only display with forward slashes
  if (!showBadges) {
    const displayText = displayGenres.join(' / ');
    return (
      <span className={className} title={allGenresString}>
        {displayText}
        {hasMore && <span className="text-muted-foreground"> (+{moreCount} more)</span>}
      </span>
    );
  }
  
  // Badge display
  return (
    <div className={`flex flex-wrap gap-2 ${className}`} 
         aria-label={`Book genres: ${allGenresString}`}
         role="list">
      {displayGenres.map((genre, index) => (
        <Badge 
          key={`${genre}-${index}`}
          variant="secondary"
          className="bg-purple-100 text-purple-800 hover:bg-purple-200 genre-badge"
          role="listitem"
        >
          {genre}
        </Badge>
      ))}
      {hasMore && (
        <Badge 
          variant="outline"
          className="border-dashed text-muted-foreground genre-more-badge"
        >
          +{moreCount} more
        </Badge>
      )}
    </div>
  );
};
