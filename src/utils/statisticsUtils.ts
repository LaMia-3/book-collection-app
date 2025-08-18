import { createLogger } from './loggingUtils';
import { normalizeGenreData } from './genreUtils';
import { Book, ReadingStatus } from '@/types/models/Book';

/**
 * Represents a count of books per genre or status category
 */
export interface GenreCount {
  /** Category name (genre name or reading status) */
  name: string;
  /** Number of books in this category */
  value: number;
  /** Percentage of total instances */
  percentage?: number;
}

/**
 * Represents reading status statistics
 */
export interface ReadingStatusStats {
  /** Books currently being read */
  reading: number;
  /** Books completed */
  completed: number;
  /** Books marked as "want to read" */
  wantToRead: number;
  /** Books marked as "did not finish" */
  dnf: number;
  /** Books on hold */
  onHold: number;
  /** Total number of books */
  total: number;
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

/**
 * Calculates statistics about reading status across books
 * 
 * @param books - Array of books to analyze
 * @returns Object containing counts for each reading status
 */
export function calculateReadingStatusStatistics(books: Book[]): ReadingStatusStats {
  const log = createLogger('calculateReadingStatusStatistics');
  
  // Initialize counters
  const stats: ReadingStatusStats = {
    reading: 0,
    completed: 0,
    wantToRead: 0,
    dnf: 0,
    onHold: 0,
    total: books.length
  };
  
  log.debug(`Calculating reading status statistics for ${books.length} books`);
  
  // Count books by status
  books.forEach(book => {
    if (!book.status) {
      // Default to want-to-read if no status is specified
      stats.wantToRead += 1;
    } else {
      // Use string comparison since book.status might be either the enum value or string
      const status = String(book.status).toLowerCase();
      if (status === 'reading' || status === ReadingStatus.READING.toLowerCase()) {
        stats.reading += 1;
      } else if (status === 'completed' || status === ReadingStatus.COMPLETED.toLowerCase()) {
        stats.completed += 1;
      } else if (status === 'want-to-read' || status === 'to_read' || status === ReadingStatus.TO_READ.toLowerCase()) {
        stats.wantToRead += 1;
      } else if (status === 'dnf' || status === ReadingStatus.DNF.toLowerCase()) {
        stats.dnf += 1;
      } else if (status === 'on-hold' || status === 'on_hold' || status === ReadingStatus.ON_HOLD.toLowerCase()) {
        stats.onHold += 1;
      } else {
        // Fallback for any unrecognized status
        log.warn(`Unrecognized reading status: ${book.status}`);
        stats.wantToRead += 1;
      }
    }
  });
  
  log.debug('Reading status statistics calculated', stats);
  
  return stats;
}

/**
 * Converts reading status statistics to chart-friendly data format
 * 
 * @param stats - Reading status statistics object
 * @returns Array of reading status counts for chart visualization
 */
export function getReadingStatusChartData(stats: ReadingStatusStats): GenreCount[] {
  return [
    { name: 'Currently Reading', value: stats.reading },
    { name: 'Completed', value: stats.completed },
    { name: 'Want to Read', value: stats.wantToRead },
    { name: 'Did Not Finish', value: stats.dnf },
    { name: 'On Hold', value: stats.onHold }
  ].filter(item => item.value > 0);  // Only include statuses with books
}
