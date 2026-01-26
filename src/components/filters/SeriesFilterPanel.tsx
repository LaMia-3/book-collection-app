import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { SearchInput } from '@/components/SearchInput';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  Filter, 
  X, 
  ChevronDown, 
  CircleSlash,
  BookOpen,
  CircleDot,
  BookMarked,
  Bell
} from 'lucide-react';
import { createLogger } from '@/utils/loggingUtils';

// Create a logger for the SeriesFilterPanel component
const log = createLogger('SeriesFilterPanel');

export interface SeriesFilter {
  search?: string;
  genres?: string[];
  statuses?: ('ongoing' | 'completed' | 'cancelled')[];
  authors?: string[];
  sortBy?: 'alphabetical' | 'recent';
  tracked?: boolean;
}

interface SeriesFilterPanelProps {
  filter: SeriesFilter;
  onFilterChange: (filter: SeriesFilter) => void;
  genres: string[];
  authors: string[];
  onClearFilters: () => void;
  hideSearchInput?: boolean;
}

export const SeriesFilterPanel = ({
  filter,
  onFilterChange,
  genres,
  authors,
  onClearFilters,
  hideSearchInput = false
}: SeriesFilterPanelProps) => {
  // Count active filters
  const activeFilterCount = 
    (filter.search ? 1 : 0) + 
    (filter.genres?.length || 0) + 
    (filter.statuses?.length || 0) + 
    (filter.authors?.length || 0) + 
    (filter.tracked ? 1 : 0);

  // Update search results as user types
  const handleSearchChange = (query: string) => {
    log.debug('Search query updated', { query });
    onFilterChange({ ...filter, search: query || undefined });
  };

  const toggleGenre = (genre: string) => {
    const currentGenres = filter.genres || [];
    const isRemoving = currentGenres.includes(genre);
    
    if (isRemoving) {
      const newGenres = currentGenres.filter(g => g !== genre);
      onFilterChange({
        ...filter,
        genres: newGenres
      });
    } else {
      const newGenres = [...currentGenres, genre];
      onFilterChange({
        ...filter,
        genres: newGenres
      });
    }
  };

  const toggleStatus = (status: 'ongoing' | 'completed' | 'cancelled') => {
    const currentStatuses = filter.statuses || [];
    if (currentStatuses.includes(status)) {
      onFilterChange({
        ...filter,
        statuses: currentStatuses.filter(s => s !== status)
      });
    } else {
      onFilterChange({
        ...filter,
        statuses: [...currentStatuses, status]
      });
    }
  };

  const toggleAuthor = (author: string) => {
    const currentAuthors = filter.authors || [];
    if (currentAuthors.includes(author)) {
      onFilterChange({
        ...filter,
        authors: currentAuthors.filter(a => a !== author)
      });
    } else {
      onFilterChange({
        ...filter,
        authors: [...currentAuthors, author]
      });
    }
  };

  // Get status label
  const getStatusLabel = (status: string) => {
    return {
      'ongoing': 'Ongoing',
      'completed': 'Completed',
      'cancelled': 'Cancelled'
    }[status] || status;
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'ongoing':
        return <CircleDot className="h-4 w-4 text-blue-500" />;
      case 'completed':
        return <CircleDot className="h-4 w-4 text-green-500" />;
      case 'cancelled':
        return <CircleDot className="h-4 w-4 text-orange-500" />;
      default:
        return <CircleDot className="h-4 w-4" />;
    }
  };

  return (
    <div className="w-full mb-6">
      {/* Search bar - Only shown if not hidden */}
      {!hideSearchInput && (
        <div className="flex items-center gap-2 w-full mb-4">
          <div className="relative flex-grow">
            <SearchInput
              placeholder="Search series..."
              initialValue={filter.search || ''}
              onSearch={handleSearchChange}
              className="w-full"
            />
          </div>
        </div>
      )}
      
      {/* Filter options */}
      <div className="space-y-4 border rounded-md p-4 bg-card shadow-lg absolute z-50 top-full right-0 w-80 mt-2">
        {/* Clear filters button */}
        {activeFilterCount > 0 && (
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearFilters}
              className="text-xs h-8"
            >
              <CircleSlash className="h-3.5 w-3.5 mr-1" />
              Clear all filters
            </Button>
          </div>
        )}
        
        {/* Genre Filter */}
        <div>
          <Label className="text-sm font-medium mb-2 block">Genre</Label>
          <div className="flex flex-wrap gap-2 mt-1">
            {genres.map((genre) => (
              <Badge
                key={genre}
                variant={filter.genres?.includes(genre) ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => toggleGenre(genre)}
              >
                {genre}
                {filter.genres?.includes(genre) && (
                  <X className="h-3 w-3 ml-1" />
                )}
              </Badge>
            ))}
            {genres.length === 0 && (
              <span className="text-sm text-muted-foreground">No genres available</span>
            )}
          </div>
        </div>
        
        <Separator />
        
        {/* Tracked Series Filter */}
        <div>
          <Label className="text-sm font-medium mb-2 block">Tracking</Label>
          <div className="flex items-center gap-2 mt-1">
            <label className="flex items-center gap-2 cursor-pointer hover:text-accent-foreground">
              <input 
                type="checkbox" 
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" 
                checked={filter.tracked} 
                onChange={(e) => onFilterChange({...filter, tracked: e.target.checked})}
              />
              <BookMarked className="h-4 w-4" />
              <span>Show tracked series only</span>
            </label>
          </div>
        </div>
        
        <Separator />
        
        {/* Status Filter */}
        <div>
          <Label className="text-sm font-medium mb-2 block">Status</Label>
          <div className="flex flex-wrap gap-2 mt-1">
            {['ongoing', 'completed', 'cancelled'].map((status) => (
              <Badge
                key={status}
                variant={filter.statuses?.includes(status as any) ? "default" : "outline"}
                className={`cursor-pointer ${
                  status === 'ongoing' ? 'border-blue-500/30 hover:border-blue-500/50' : 
                  status === 'completed' ? 'border-green-500/30 hover:border-green-500/50' : 
                  'border-orange-500/30 hover:border-orange-500/50'
                }`}
                onClick={() => toggleStatus(status as any)}
              >
                {getStatusIcon(status)}
                <span className="ml-1">{getStatusLabel(status)}</span>
              </Badge>
            ))}
          </div>
        </div>
        
        <Separator />
        
        {/* Author Filter */}
        <div>
          <Label className="text-sm font-medium mb-2 block">Author</Label>
          {authors.length > 0 ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  <span>
                    {filter.authors?.length 
                      ? `${filter.authors.length} selected` 
                      : 'Select authors'}
                  </span>
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 max-h-[200px] overflow-auto">
                {authors.map(author => (
                  <DropdownMenuItem 
                    key={author}
                    className="flex items-center justify-between cursor-pointer"
                    onClick={(e) => {
                      e.preventDefault();
                      toggleAuthor(author);
                    }}
                  >
                    {author}
                    {filter.authors?.includes(author) && (
                      <BookOpen className="h-4 w-4 ml-2" />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="text-sm text-muted-foreground">
              No authors available
            </div>
          )}
          
          {/* Display selected authors */}
          {filter.authors && filter.authors.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {filter.authors.map(author => (
                <Badge key={author} variant="secondary" className="flex items-center gap-1">
                  {author}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleAuthor(author)}
                    className="h-4 w-4 p-0 ml-1 hover:bg-transparent"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Active Filter Pills - Show below search when filters are active */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {filter.search && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Search: {filter.search}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onFilterChange({ ...filter, search: undefined })}
                className="h-4 w-4 p-0 ml-1 hover:bg-transparent"
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
          
          {filter.genres?.map(genre => (
            <Badge key={genre} variant="secondary" className="flex items-center gap-1">
              Genre: {genre}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleGenre(genre)}
                className="h-4 w-4 p-0 ml-1 hover:bg-transparent"
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
          
          {filter.statuses?.map(status => (
            <Badge key={status} variant="secondary" className="flex items-center gap-1">
              Status: {getStatusLabel(status)}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleStatus(status)}
                className="h-4 w-4 p-0 ml-1 hover:bg-transparent"
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
          
          {filter.authors?.map(author => (
            <Badge key={author} variant="secondary" className="flex items-center gap-1">
              Author: {author}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleAuthor(author)}
                className="h-4 w-4 p-0 ml-1 hover:bg-transparent"
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
          
          {filter.tracked && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Tracked Series Only
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onFilterChange({ ...filter, tracked: false })}
                className="h-4 w-4 p-0 ml-1 hover:bg-transparent"
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
};
