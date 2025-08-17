import React from "react";
import { Badge } from "@/components/ui/badge";
import { standardizeGenreData, type GenreData } from "@/utils/genreUtils";
import { createLogger } from "@/utils/loggingUtils";

const log = createLogger("GenreDisplay");

interface GenreDisplayProps {
  genres: GenreData;
  className?: string;
}

/**
 * Component for displaying book genres as badges
 */
export const GenreDisplay: React.FC<GenreDisplayProps> = ({ 
  genres, 
  className = "" 
}) => {
  log.debug("Rendering genre display", { genreType: typeof genres });
  const genreArray = standardizeGenreData(genres);
  
  log.trace("Standardized genres", { genreCount: genreArray.length, genres: genreArray });
  
  if (genreArray.length === 0) {
    log.debug("No genres to display");
    return <div className="text-muted-foreground text-sm">No genres specified</div>;
  }
  
  log.debug("Rendering genres", { count: genreArray.length });
  
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {genreArray.map((genre, index) => (
        <Badge 
          key={`${genre}-${index}`}
          variant="secondary"
          className="bg-purple-100 text-purple-800 hover:bg-purple-200"
        >
          {genre}
        </Badge>
      ))}
    </div>
  );
};
