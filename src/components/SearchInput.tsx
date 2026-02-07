import React, { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface SearchInputProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  className?: string;
  initialValue?: string;
}

export const SearchInput = ({ 
  onSearch, 
  placeholder = "Search...", 
  className,
  initialValue = ""
}: SearchInputProps) => {
  const [query, setQuery] = useState(initialValue);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Focus the input when the component mounts
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  // Handle input change with debounce
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    onSearch(newQuery);
  };

  // Clear search
  const handleClearSearch = () => {
    setQuery('');
    onSearch('');
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  return (
    <div className={cn("relative w-full", className)}>
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
      <Input
        ref={searchInputRef}
        type="text"
        value={query}
        onChange={handleInputChange}
        placeholder={placeholder}
        className="pl-10 pr-10 h-10 text-sm w-full"
      />
      {query && (
        <button
          type="button"
          className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center justify-center text-muted-foreground hover:text-foreground"
          onClick={handleClearSearch}
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};

export default SearchInput;
