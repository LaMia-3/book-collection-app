import React, { useState } from 'react';
import { Button } from "../ui/button";
import { TruncatedText } from "./TruncatedText";

interface GenreCollapsibleProps {
  genres: string[];
  limit?: number;
}

export const GenreCollapsible: React.FC<GenreCollapsibleProps> = ({
  genres,
  limit = 2
}) => {
  const [expanded, setExpanded] = useState(false);
  
  if (!genres || genres.length === 0) {
    return <span className="text-gray-400 italic">No genres</span>;
  }
  
  if (genres.length <= limit) {
    return (
      <div className="flex flex-wrap gap-1">
        {genres.map((genre, index) => (
          <span key={index} className="bg-muted px-2 py-0.5 rounded text-xs">
            <TruncatedText text={genre} maxLength={15} />
          </span>
        ))}
      </div>
    );
  }
  
  return (
    <div>
      <div className="flex flex-wrap gap-1">
        {(expanded ? genres : genres.slice(0, limit)).map((genre, index) => (
          <span key={index} className="bg-muted px-2 py-0.5 rounded text-xs">
            <TruncatedText text={genre} maxLength={15} />
          </span>
        ))}
        
        {!expanded && genres.length > limit && (
          <Button 
            variant="ghost" 
            size="sm"
            className="px-1 py-0 h-5 text-xs text-blue-500 hover:text-blue-700 dark:text-blue-400"
            onClick={(e) => {
              e.stopPropagation(); // Prevent click from bubbling to parent row
              setExpanded(true);
            }}
          >
            +{genres.length - limit} more
          </Button>
        )}
        
        {expanded && (
          <Button 
            variant="ghost" 
            size="sm"
            className="px-1 py-0 h-5 text-xs text-blue-500 hover:text-blue-700 dark:text-blue-400"
            onClick={(e) => {
              e.stopPropagation(); // Prevent click from bubbling to parent row
              setExpanded(false);
            }}
          >
            Show less
          </Button>
        )}
      </div>
    </div>
  );
};
