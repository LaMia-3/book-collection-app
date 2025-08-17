/**
 * Utility functions for handling book genre data
 */
import logger, { createLogger } from './loggingUtils';

// Create a logger instance for genre utilities
const log = createLogger('GenreUtils');

// Type definition for genre data (could be string or array)
export type GenreData = string | string[] | undefined;

/**
 * Normalizes genre data to array format regardless of input format
 * @param genres - The genre data to normalize
 * @returns An array of genre strings
 */
export const normalizeGenreData = (genres: GenreData): string[] => {
  log.debug('Normalizing genre data', { input: genres });
  
  if (!genres) {
    log.trace('Empty genre data, returning empty array');
    return [];
  }
  
  // If it's already an array, return it
  if (Array.isArray(genres)) {
    const filtered = genres.filter(Boolean);
    log.trace('Input was already array format', { originalLength: genres.length, filteredLength: filtered.length });
    return filtered;
  }
  
  // If it's a string with "/" separators (legacy format)
  if (genres.includes('/')) {
    log.trace('Converting slash-separated string to array');
    const result = genres.split('/').map(g => g.trim()).filter(Boolean);
    log.debug('Split slash-separated string', { original: genres, result });
    return result;
  }
  
  // If it's a string with comma separators
  if (genres.includes(',')) {
    log.trace('Converting comma-separated string to array');
    const result = genres.split(',').map(g => g.trim()).filter(Boolean);
    log.debug('Split comma-separated string', { original: genres, result });
    return result;
  }
  
  // Single genre as a string
  log.trace('Single genre string detected');
  const trimmed = genres.trim();
  return trimmed ? [trimmed] : [];
};

/**
 * Converts genre data to a display string
 * @param genres - The genre data to convert
 * @returns A comma-separated string of genres or "No genres" message
 */
export const genresToDisplayString = (genres: GenreData): string => {
  log.trace('Converting genres to display string');
  const genreArray = normalizeGenreData(genres);
  
  const result = genreArray.length > 0 ? genreArray.join(', ') : 'No genres specified';
  log.debug('Generated display string', { count: genreArray.length, result });
  
  return result;
};

/**
 * Converts genre data to an edit-friendly string format (comma-separated)
 * @param genres - The genre data to convert
 * @returns A comma-separated string suitable for editing in a text input
 */
export const genreToEditString = (genres: GenreData): string => {
  log.trace('Converting genres to edit string');
  
  if (!genres) {
    log.trace('Empty genre data, returning empty string');
    return '';
  }
  
  // If it's already an array, join with commas
  if (Array.isArray(genres)) {
    log.trace('Converting array to comma-separated string', { count: genres.length });
    return genres.join(', ');
  }
  
  // If it's a string with "/" separators (legacy format)
  if (typeof genres === 'string' && genres.includes('/')) {
    log.debug('Converting legacy format with slashes to comma-separated', { original: genres });
    const result = genres.split('/').map(g => g.trim()).join(', ');
    return result;
  }
  
  // Return as is (might be a simple string or comma-separated string)
  log.trace('Using original string format', { value: genres });
  return genres;
};

/**
 * Converts an edit string to a storage array format
 * @param input - The comma-separated string from an input field
 * @returns An array of genre strings with empty entries removed
 */
export const editStringToGenreArray = (input: string): string[] => {
  log.trace('Converting edit string to genre array', { input });
  
  if (!input.trim()) {
    log.trace('Empty input string, returning empty array');
    return [];
  }
  
  // Split by commas
  const result = input
    .split(',')
    .map(genre => genre.trim())
    .filter(Boolean); // Remove empty entries
  
  log.debug('Parsed genre array from edit string', { 
    originalLength: input.split(',').length, 
    resultLength: result.length,
    result
  });
  
  return result;
};

