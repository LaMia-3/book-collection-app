import React from "react";
import { Link } from "react-router-dom";
import { Series } from "@/types/series";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, CalendarClock, Bell, BellOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface SeriesCardProps {
  series: Series;
  onToggleTracking?: (seriesId: string, tracked: boolean) => void;
}

/**
 * Card component for displaying a book series in a grid
 */
export const SeriesCard = ({ series, onToggleTracking }: SeriesCardProps) => {
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
  
  return (
    <Card className="h-full overflow-hidden transition-all duration-300 hover:shadow-md border border-border">
      <div className="relative h-40 bg-gradient-to-r from-muted to-muted/50">
        {series.coverImage ? (
          <img 
            src={series.coverImage} 
            alt={series.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <BookOpen className="h-16 w-16 text-muted-foreground/50" />
            <span className="sr-only">{series.name}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        
        {/* Status badge */}
        {series.status && (
          <div className="absolute top-2 right-2 z-10">
            <Badge 
              variant="outline" 
              className={cn("text-xs capitalize", getStatusColor(series.status))}
            >
              {series.status}
            </Badge>
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
      </div>
      
      <CardContent className="pt-4">
        <h3 className="font-serif text-xl font-medium mb-1 line-clamp-2">
          {series.name}
        </h3>
        <p className="text-sm text-muted-foreground mb-3 line-clamp-1">
          {series.author || "Various Authors"}
        </p>
        
        <div className="flex items-center gap-2 mb-4">
          <div className="flex-grow bg-muted h-2 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-warm"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
          <span className="text-sm font-medium whitespace-nowrap">
            {completionPercentage}%
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" asChild>
            <Link to={`/series/${series.id}`}>View Series</Link>
          </Button>
          {series.hasUpcoming && (
            <div className="flex items-center gap-1 text-accent-warm text-sm">
              <CalendarClock className="h-4 w-4" />
              <span>Upcoming</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
