import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from '@/components/ui/collapsible';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  Filter, 
  X, 
  ChevronDown, 
  CircleSlash,
  BookOpen,
  CircleDot
} from 'lucide-react';

export interface SeriesFilter {
  search?: string;
  genres?: string[];
  statuses?: ('ongoing' | 'completed' | 'cancelled')[];
  authors?: string[];
}

interface SeriesFilterPanelProps {
  filter: SeriesFilter;
  onFilterChange: (filter: SeriesFilter) => void;
  genres: string[];
  authors: string[];
  onClearFilters: () => void;
}

export const SeriesFilterPanel = ({
  filter,
  onFilterChange,
  genres,
  authors,
  onClearFilters
}: SeriesFilterPanelProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(filter.search || '');

  // Count active filters
  const activeFilterCount = 
    (filter.search ? 1 : 0) + 
    (filter.genres?.length || 0) + 
    (filter.statuses?.length || 0) + 
    (filter.authors?.length || 0);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onFilterChange({ ...filter, search: searchQuery });
  };

  const toggleGenre = (genre: string) => {
    const currentGenres = filter.genres || [];
    if (currentGenres.includes(genre)) {
      onFilterChange({
        ...filter,
        genres: currentGenres.filter(g => g !== genre)
      });
    } else {
      onFilterChange({
        ...filter,
        genres: [...currentGenres, genre]
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
      {/* Search bar - Always visible */}
      <div className="flex items-center gap-2 w-full">
        <div className="relative flex-grow">
          <form onSubmit={handleSearch} className="flex w-full">
            <Input
              placeholder="Search series..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-10"
            />
            {searchQuery && (
              <button
                type="button"
                className="absolute right-10 top-0 bottom-0 flex items-center justify-center text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setSearchQuery('');
                  if (filter.search) {
                    onFilterChange({ ...filter, search: undefined });
                  }
                }}
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <Button type="submit" className="ml-2">
              Search
            </Button>
          </form>
        </div>
        
        <div className="relative">
          <Button 
            variant="outline" 
            className="gap-1"
            onClick={() => setIsOpen(!isOpen)}
          >
            <Filter className="h-4 w-4 mr-1" />
            Filters
            {activeFilterCount > 0 && (
              <Badge
                variant="secondary"
                className="rounded-full h-5 min-w-[20px] p-0 flex items-center justify-center text-xs ml-1"
              >
                {activeFilterCount}
              </Badge>
            )}
            <ChevronDown className="h-3.5 w-3.5 ml-1" />
          </Button>
          
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearFilters}
              className="ml-2 text-xs h-8"
            >
              <CircleSlash className="h-3.5 w-3.5 mr-1" />
              Clear
            </Button>
          )}
          
          {/* Expandable filters panel - Positioned as overlay */}
          {isOpen && (
            <div className="absolute z-50 top-full right-0 w-80 mt-2 p-4 border rounded-md shadow-md bg-card dark:bg-card">
            <div className="space-y-4">
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
        </div>
      )}
    </div>
  );
};
