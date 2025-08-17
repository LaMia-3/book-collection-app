/**
 * Utility functions for handling book genre data
 */
import logger, { createLogger } from './loggingUtils';

// Create a logger instance for genre utilities
const log = createLogger('GenreUtils');

// Type definition for genre data (could be string or array)
export type GenreData = string | string[] | undefined;

// Acronyms that should remain all uppercase
export const GENRE_ACRONYMS = [
  'LGBT', 'LGBTQ', 'LGBTQ+', 'SF', 'YA', 'NA', 'DIY', '3D'
];

// Acronyms that should be expanded
export const ACRONYM_EXPANSIONS: Record<string, string> = {
  'YA': 'Young Adult',
  'NA': 'New Adult',
  'SF': 'Science Fiction',
  'SFF': 'Science Fiction And Fantasy'
};

// Special case genres with custom formatting
export const SPECIAL_CASE_GENRES: Record<string, string> = {
  '19th century': '19th Century',
  "children's": "Children's",
  "children's books": "Children's Books",
  "kid's": "Kid's",
  "kid's books": "Kid's Books"
};

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

/**
 * Helper function to standardize a single word
 * @param word - The word to standardize
 * @returns Capitalized word
 */
export function standardizeSingleWord(word: string): string {
  if (!word) return '';
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

/**
 * Standardizes genre capitalization following the rules:
 * - First letter of each word capitalized
 * - Rest of word lowercase
 * - Preserves acronyms from the exception list
 * - Expands acronyms from the expansion list
 * - Handles special cases with custom formatting
 * 
 * @param genre - The genre string to standardize
 * @returns Standardized genre string
 */
export function standardizeGenre(genre: string): string {
  const log = createLogger('standardizeGenre');
  
  // Handle null, undefined or empty string
  if (!genre) {
    log.trace('Empty genre, returning empty string');
    return '';
  }
  
  // Trim input
  const trimmedGenre = genre.trim();
  if (!trimmedGenre) return '';
  
  // Convert to uppercase for case-insensitive matching
  const upperGenre = trimmedGenre.toUpperCase();
  
  // Check if genre should be expanded (highest priority)
  if (Object.keys(ACRONYM_EXPANSIONS).includes(upperGenre)) {
    log.debug(`Expanding acronym: ${genre} -> ${ACRONYM_EXPANSIONS[upperGenre]}`);
    return ACRONYM_EXPANSIONS[upperGenre];
  }
  
  // Check if genre is a known acronym that should be preserved
  if (GENRE_ACRONYMS.includes(upperGenre)) {
    log.debug(`Preserving acronym: ${genre} -> ${upperGenre}`);
    return upperGenre;
  }
  
  // Check if genre is a special case
  const lowerGenre = trimmedGenre.toLowerCase();
  if (Object.keys(SPECIAL_CASE_GENRES).includes(lowerGenre)) {
    log.debug(`Applying special case format: ${genre} -> ${SPECIAL_CASE_GENRES[lowerGenre]}`);
    return SPECIAL_CASE_GENRES[lowerGenre];
  }
  
  // Handle hyphenated words
  if (trimmedGenre.includes('-')) {
    log.debug(`Processing hyphenated genre: ${genre}`);
    return trimmedGenre.split('-')
      .map(part => standardizeSingleWord(part))
      .join('-');
  }
  
  // Standard title case conversion
  log.debug(`Standardizing genre: ${genre}`);
  return trimmedGenre.split(' ')
    .map(word => standardizeSingleWord(word))
    .join(' ');
}

/**
 * Standardizes all genres in an array
 * @param genres - Array of genre strings to standardize
 * @returns Array of standardized genre strings
 */
export function standardizeGenres(genres: string[]): string[] {
  const log = createLogger('standardizeGenres');
  
  if (!genres || !Array.isArray(genres)) {
    log.debug('No genres to standardize or invalid input');
    return [];
  }
  
  log.debug(`Standardizing ${genres.length} genres`);
  return genres.map(genre => standardizeGenre(genre));
}

/**
 * Standardizes genre data regardless of input format (string or array)
 * @param genreData - The genre data to standardize
 * @returns Standardized genre array
 */
export function standardizeGenreData(genreData: GenreData): string[] {
  const log = createLogger('standardizeGenreData');
  log.debug('Standardizing genre data', { input: genreData });
  
  // First normalize to array format
  const normalizedGenres = normalizeGenreData(genreData);
  
  // Then standardize each genre
  return standardizeGenres(normalizedGenres);
}
