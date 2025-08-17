import { createLogger } from './loggingUtils';
import { normalizeGenreData } from './genreUtils';
import type { Book } from '@/types/models/Book';

/**
 * Represents a count of books per genre
 */
export interface GenreCount {
  /** Genre name */
  name: string;
  /** Number of books with this genre */
  value: number;
  /** Percentage of total genre instances */
  percentage?: number;
}

/**
 * Calculates genre statistics by counting each individual genre separately
 * Books with multiple genres will be counted once for each genre they belong to
 * 
 * @param books - Array of books to analyze
 * @returns Array of genre counts sorted by count (descending)
 */
export function calculateGenreStatistics(books: Book[]): GenreCount[] {
  const log = createLogger('calculateGenreStatistics');
  const genreCounts: Record<string, number> = {};
  let totalGenreInstances = 0;
  
  log.debug(`Calculating genre statistics for ${books.length} books`);
  
  books.forEach(book => {
    // Handle both string and array formats
    const genreArray = Array.isArray(book.genre) 
      ? book.genre 
      : normalizeGenreData(book.genre || '');
    
    if (genreArray.length === 0) {
      // Count uncategorized books
      genreCounts['Uncategorized'] = (genreCounts['Uncategorized'] || 0) + 1;
      totalGenreInstances += 1;
    } else {
      // Count each genre individually
      genreArray.forEach(genre => {
        if (genre && genre.trim()) {
          genreCounts[genre] = (genreCounts[genre] || 0) + 1;
          totalGenreInstances += 1;
        }
      });
    }
  });
  
  // Convert to array format for charts
  let result = Object.entries(genreCounts).map(([name, value]) => ({
    name,
    value,
    percentage: (value / totalGenreInstances) * 100
  }));
  
  // Sort by count (descending)
  result = result.sort((a, b) => b.value - a.value);
  
  log.debug(`Found ${result.length} unique genres across ${totalGenreInstances} total instances`);
  
  return result;
}

/**
 * Returns the top N genres with all others grouped into an "Other" category
 * 
 * @param genreCounts - Array of genre counts to process
 * @param topCount - Number of top genres to keep individually (default: 10)
 * @returns Array with top genres and an "Other" category if applicable
 */
export function getTopGenresWithOthers(genreCounts: GenreCount[], topCount: number = 10): GenreCount[] {
  const log = createLogger('getTopGenresWithOthers');
  
  // If we have fewer genres than topCount, return all of them
  if (genreCounts.length <= topCount) {
    log.debug(`Returning all ${genreCounts.length} genres (fewer than ${topCount} limit)`);
    return genreCounts;
  }
  
  // Get the top genres
  const topGenres = genreCounts.slice(0, topCount);
  
  // Calculate the "Other" category
  const otherGenres = genreCounts.slice(topCount);
  const otherValue = otherGenres.reduce((sum, genre) => sum + genre.value, 0);
  const otherPercentage = otherGenres.reduce((sum, genre) => sum + (genre.percentage || 0), 0);
  
  // Add the "Other" category
  const result = [...topGenres, {
    name: 'Other',
    value: otherValue,
    percentage: otherPercentage
  }];
  
  log.debug(`Returning top ${topCount} genres plus 'Other' category (${otherValue} books)`);
  return result;
}
