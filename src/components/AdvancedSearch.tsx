import React, { useState, useEffect, useRef } from 'react';
import { Search, Settings2, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { SearchOptions, SearchableField } from '@/services/search/SearchService';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface AdvancedSearchProps {
  onSearch: (query: string, options: SearchOptions) => void;
  placeholder?: string;
  className?: string;
}

export const AdvancedSearch = ({ onSearch, placeholder = "Search your books...", className }: AdvancedSearchProps) => {
  const [query, setQuery] = useState('');
  const [showOptions, setShowOptions] = useState(false);
  const [options, setOptions] = useState<SearchOptions>({
    fields: ['all'],
    fuzzy: true,
    caseSensitive: false,
    exactMatch: false,
    limit: 100
  });
  
  // Reference to the search input
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Focus the input when the component mounts
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);
  
  // Handle search submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query, options);
  };
  
  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    // For immediate search as-you-type
    onSearch(e.target.value, options);
  };

  // Get active options count for badge
  const getActiveOptionsCount = () => {
    let count = 0;
    if (options.fields && options.fields.length > 0 && !options.fields.includes('all')) count++;
    if (options.caseSensitive) count++;
    if (options.exactMatch) count++;
    if (!options.fuzzy) count++;
    return count;
  };
  
  // Toggle field selection
  const toggleField = (field: SearchableField) => {
    setOptions(prev => {
      // Special handling for 'all' field
      if (field === 'all') {
        return {
          ...prev,
          fields: ['all']
        };
      }
      
      // Remove 'all' when selecting specific fields
      const updatedFields = prev.fields?.filter(f => f !== 'all') || [];
      
      // Toggle the selected field
      if (updatedFields.includes(field)) {
        const filtered = updatedFields.filter(f => f !== field);
        // If no fields are selected, default to 'all'
        return {
          ...prev,
          fields: filtered.length > 0 ? filtered : ['all']
        };
      } else {
        return {
          ...prev,
          fields: [...updatedFields, field]
        };
      }
    });
  };

  // Reset search options to defaults
  const resetOptions = () => {
    setOptions({
      fields: ['all'],
      fuzzy: true,
      caseSensitive: false,
      exactMatch: false,
      limit: 100
    });
  };
  
  return (
    <div className={cn("relative", className)}>
      <form onSubmit={handleSubmit} className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          ref={searchInputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          placeholder={placeholder}
          className="pl-10 pr-20"
        />
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex gap-1">
          {query && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => {
                setQuery('');
                onSearch('', options);
                searchInputRef.current?.focus();
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
          <Popover open={showOptions} onOpenChange={setShowOptions}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 relative"
              >
                <Settings2 className="h-4 w-4" />
                {getActiveOptionsCount() > 0 && (
                  <Badge 
                    variant="secondary" 
                    className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]"
                  >
                    {getActiveOptionsCount()}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Search Options</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={resetOptions}
                    className="h-8 px-2 text-xs"
                  >
                    Reset
                  </Button>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs">Search Fields</Label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: 'all', label: 'All Fields' },
                      { value: 'title', label: 'Title' },
                      { value: 'author', label: 'Author' },
                      { value: 'genre', label: 'Genre' },
                      { value: 'seriesName', label: 'Series' },
                      { value: 'notes', label: 'Notes' }
                    ].map((field) => (
                      <Badge
                        key={field.value}
                        variant={options.fields?.includes(field.value as SearchableField) ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => toggleField(field.value as SearchableField)}
                      >
                        {field.label}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs">Matching Options</Label>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="fuzzyMatching"
                        checked={options.fuzzy}
                        onCheckedChange={(checked) => 
                          setOptions(prev => ({ ...prev, fuzzy: !!checked }))
                        }
                      />
                      <Label htmlFor="fuzzyMatching" className="text-sm">
                        Enable fuzzy matching (handles typos)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="caseSensitive"
                        checked={options.caseSensitive}
                        onCheckedChange={(checked) => 
                          setOptions(prev => ({ ...prev, caseSensitive: !!checked }))
                        }
                      />
                      <Label htmlFor="caseSensitive" className="text-sm">
                        Case sensitive
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="exactMatch"
                        checked={options.exactMatch}
                        onCheckedChange={(checked) => 
                          setOptions(prev => ({ ...prev, exactMatch: !!checked }))
                        }
                      />
                      <Label htmlFor="exactMatch" className="text-sm">
                        Match exact phrases only
                      </Label>
                    </div>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </form>
    </div>
  );
};

export default AdvancedSearch;
