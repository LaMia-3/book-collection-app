/**
 * Utility functions for handling book genre data
 */

// Type definition for genre data (could be string or array)
export type GenreData = string | string[] | undefined;

/**
 * Normalizes genre data to array format regardless of input format
 * @param genres - The genre data to normalize
 * @returns An array of genre strings
 */
export const normalizeGenreData = (genres: GenreData): string[] => {
  if (!genres) return [];
  
  // If it's already an array, return it
  if (Array.isArray(genres)) return genres.filter(Boolean);
  
  // If it's a string with "/" separators (legacy format)
  if (genres.includes('/')) {
    return genres.split('/').map(g => g.trim()).filter(Boolean);
  }
  
  // If it's a string with comma separators
  if (genres.includes(',')) {
    return genres.split(',').map(g => g.trim()).filter(Boolean);
  }
  
  // Single genre as a string
  return [genres.trim()].filter(Boolean);
};

/**
 * Converts genre data to a display string
 * @param genres - The genre data to convert
 * @returns A comma-separated string of genres or "No genres" message
 */
export const genresToDisplayString = (genres: GenreData): string => {
  const genreArray = normalizeGenreData(genres);
  return genreArray.length > 0 ? genreArray.join(', ') : 'No genres specified';
};

/**
 * Converts genre data to an edit-friendly string format (comma-separated)
 * @param genres - The genre data to convert
 * @returns A comma-separated string suitable for editing in a text input
 */
export const genreToEditString = (genres: GenreData): string => {
  if (!genres) return '';
  
  // If it's already an array, join with commas
  if (Array.isArray(genres)) return genres.join(', ');
  
  // If it's a string with "/" separators (legacy format)
  if (typeof genres === 'string' && genres.includes('/')) {
    return genres.split('/').map(g => g.trim()).join(', ');
  }
  
  // Return as is (might be a simple string or comma-separated string)
  return genres;
};

/**
 * Converts an edit string to a storage array format
 * @param input - The comma-separated string from an input field
 * @returns An array of genre strings with empty entries removed
 */
export const editStringToGenreArray = (input: string): string[] => {
  if (!input.trim()) return [];
  
  // Split by commas
  return input
    .split(',')
    .map(genre => genre.trim())
    .filter(Boolean); // Remove empty entries
};

