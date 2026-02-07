import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Series } from "@/types/series";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  BookOpen, 
  CalendarClock, 
  Bell, 
  BellOff,
  ChevronDown,
  ChevronUp, 
  ChevronRight,
  Trash2,
  BookOpen as BookOpenIcon 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SeriesBooksPanel } from "./SeriesBooksPanel";
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger 
} from "@/components/ui/collapsible";

interface SeriesCardProps {
  series: Series;
  onToggleTracking?: (seriesId: string, tracked: boolean) => void;
  onDeleteSeries?: (seriesId: string) => void;
}

/**
 * Card component for displaying a book series in a grid
 */
export const SeriesCard = ({ series, onToggleTracking, onDeleteSeries }: SeriesCardProps) => {
  // State for expandable books panel
  const [showBooks, setShowBooks] = useState(false);
  
  // Calculate completion percentage
  const completionPercentage = series.books.length > 0 
    ? Math.round((series.books.filter(bookId => bookId).length / (series.totalBooks || series.books.length)) * 100)
    : 0;
  
  // Determine status color
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500/20 text-green-700 border-green-500/30';
      case 'cancelled': return 'bg-red-500/20 text-red-700 border-red-500/30';
      default: return 'bg-blue-500/20 text-blue-700 border-blue-500/30';
    }
  };
  
  // Determine series color based on status or use a default
  const seriesColor = series.status === 'completed' ? '#22c55e' : 
                      series.status === 'cancelled' ? '#ef4444' : 
                      series.status === 'ongoing' ? '#3b82f6' : 
                      '#6366f1';
                      
  return (
    <Card 
      className="flex flex-col overflow-hidden hover:shadow-md transition-shadow cursor-pointer h-full"
      style={{ borderLeft: `4px solid ${seriesColor}` }}
      onClick={() => window.location.href = `/series/${series.id}`}
    >
      <div 
        className="h-32 bg-cover bg-center relative"
        style={{ 
          backgroundColor: seriesColor,
          backgroundImage: series.coverImage ? `url(${series.coverImage})` : 'none'
        }}
      >
        {!series.coverImage && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-white text-4xl font-bold opacity-30">
              {series.name.substring(0, 2).toUpperCase()}
            </span>
          </div>
        )}
        
        {/* Tracking toggle */}
        {onToggleTracking && (
          <Button
            size="icon"
            variant="ghost"
            className="absolute top-2 left-2 h-8 w-8 bg-background/40 hover:bg-background/60 backdrop-blur-sm"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleTracking(series.id, !series.isTracked);
            }}
            title={series.isTracked ? "Stop tracking this series" : "Track this series"}
          >
            {series.isTracked ? (
              <Bell className="h-4 w-4 text-primary" />
            ) : (
              <BellOff className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        )}
        
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
          <h3 className="text-white font-semibold truncate">{series.name}</h3>
        </div>
      </div>
      
      <div className="p-4 flex-grow">
        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
          {series.author || "Various Authors"}
        </p>
        
        <div className="flex items-center gap-2 mb-2">
          <div className="flex-grow bg-muted h-2 rounded-full overflow-hidden">
            <div 
              className="h-full"
              style={{ width: `${completionPercentage}%`, backgroundColor: seriesColor }}
            />
          </div>
          <span className="text-sm font-medium whitespace-nowrap">
            {completionPercentage}%
          </span>
        </div>
        
        <p className="text-sm text-gray-500">
          {`${series.books.length} ${series.books.length === 1 ? 'book' : 'books'}`}
          {series.totalBooks && series.totalBooks > series.books.length && 
            ` (${series.totalBooks} total)`}
        </p>
        
        {series.hasUpcoming && (
          <div className="flex items-center gap-1 text-accent-warm text-sm mt-2">
            <CalendarClock className="h-4 w-4" />
            <span>Upcoming release</span>
          </div>
        )}
      </div>
      
      <div className="p-3 border-t flex justify-end gap-2">
        <Button 
          variant="ghost" 
          size="icon"
          asChild
          onClick={(e) => e.stopPropagation()}
        >
          <Link to={`/series/${series.id}`} title="View series details">
            <ChevronRight className="h-4 w-4" />
          </Link>
        </Button>
        
        {onDeleteSeries && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (window.confirm(`Are you sure you want to delete "${series.name}"? This action cannot be undone.`)) {
                onDeleteSeries(series.id);
              }
            }}
            title="Delete series"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
      
      {/* Books panel removed */}
    </Card>
  );
};
