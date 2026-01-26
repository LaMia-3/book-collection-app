import React from 'react';
import { SearchInput } from './SearchInput';
import { SearchOptions } from '@/services/search/SearchService';

interface SimpleSearchProps {
  onSearch: (query: string, options: SearchOptions) => void;
  placeholder?: string;
  className?: string;
  initialValue?: string;
}

export const SimpleSearch = ({ 
  onSearch, 
  placeholder = "Search...", 
  className,
  initialValue = ""
}: SimpleSearchProps) => {
  // Default search options
  const defaultOptions: SearchOptions = {
    fields: ['all'],
    fuzzy: true,
    caseSensitive: false,
    exactMatch: false,
    limit: 100
  };

  // Handle search with default options
  const handleSearch = (query: string) => {
    onSearch(query, defaultOptions);
  };

  return (
    <SearchInput
      onSearch={handleSearch}
      placeholder={placeholder}
      className={className}
      initialValue={initialValue}
    />
  );
};

export default SimpleSearch;
