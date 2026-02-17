import { Book } from '@/types/book';
import { Book as ModelBook } from '@/types/models/Book';
import { bookApiClient } from '@/services/api';
import { createLogger } from './loggingUtils';
import { normalizeGenreData, standardizeGenreData } from './genreUtils';

// Create a logger for import functionality
const log = createLogger('ImportUtils');

/**
 * Represents a raw book entry from an imported CSV or JSON file
 */
// Extend the Book type to include import-specific fields
declare module '@/types/book' {
  interface Book {
    _importedCollectionNames?: string[];
  }
}

interface RawBookImport {
  title: string;
  author?: string;
  isbn?: string;
  googleBooksId?: string;
  status?: string;
  completedDate?: string;
  rating?: string | number;
  notes?: string;
  genre?: string | string[];
  isPartOfSeries?: string | boolean;
  seriesId?: string;
  seriesName?: string;
  volumeNumber?: string | number;
  pageCount?: string | number;
  publishedDate?: string;
  addedDate?: string; // Date the book was added to the library
  collectionIds?: string | string[];
  collectionNames?: string | string[];
  id?: string; // For enhanced imports that include IDs
}

/**
 * Raw series data from an imported JSON file
 */
interface RawSeriesImport {
  id: string;
  name: string;
  description?: string;
  author?: string;
  coverImage?: string;
  books: string[];
  totalBooks?: number;
  readingOrder?: 'publication' | 'chronological' | 'custom';
  customOrder?: string[];
  status?: 'ongoing' | 'completed' | 'cancelled';
  genre?: string[];
  isTracked?: boolean;
  hasUpcoming?: boolean;
}

/**
 * Raw collection data from an imported JSON file
 */
interface RawCollectionImport {
  id: string;
  name: string;
  description?: string;
  bookIds: string[];
  color?: string;
  imageUrl?: string;
}

/**
 * Enhanced backup format with books, series, and collections
 */
interface EnhancedBackupData {
  version: string;
  timestamp: string;
  books: RawBookImport[];
  series?: RawSeriesImport[];
  collections?: RawCollectionImport[];
  metadata?: {
    bookCount: number;
    seriesCount?: number;
    collectionCount?: number;
    appVersion: string;
    exportDate: string;
  };
}

/**
 * Result of a book import operation
 */
export interface ImportResult {
  successful: Book[];
  failed: {
    rawData: RawBookImport;
    reason: string;
  }[];
  total: number;
}

/**
 * Result of a complete import operation including series and collections
 */
export interface CompleteImportResult extends ImportResult {
  series?: {
    successful: RawSeriesImport[];
    failed: {
      rawData: RawSeriesImport;
      reason: string;
    }[];
    total: number;
  };
  collections?: {
    successful: RawCollectionImport[];
    failed: {
      rawData: RawCollectionImport;
      reason: string;
    }[];
    total: number;
  };
}

/**
 * Parse CSV string into array of objects
 * @param csvString The CSV content as string
 * @returns Array of objects with headers as keys
 */
export function parseCSV(csvString: string): RawBookImport[] {
  // Split into lines
  const lines = csvString.split(/\r?\n/);
  
  // Log processing details
  log.info('CSV parsing started', { lineCount: lines.length });
  
  if (lines.length < 2) {
    throw new Error('CSV file must contain at least a header row and one data row');
  }
  
  // Parse headers (first row)
  const rawHeaders = parseCSVLine(lines[0]);
  
  // Normalize headers to match our expected format
  const headers = rawHeaders.map(header => {
    // Convert header to lowercase and trim
    const normalizedHeader = header.toLowerCase().trim();
    
    // Map common variations to our expected format
    switch (normalizedHeader) {
      case 'googleid':
      case 'google_id':
      case 'google_books_id':
        return 'googleBooksId';
      case 'completed_date':
      case 'date_completed':
        return 'completedDate';
      case 'published_date':
      case 'date_published':
        return 'publishedDate';
      case 'added_date':
      case 'date_added':
        return 'addedDate';
      case 'is_part_of_series':
        return 'isPartOfSeries';
      case 'series_id':
        return 'seriesId';
      case 'series_name':
        return 'seriesName';
      case 'volume_number':
        return 'volumeNumber';
      case 'page_count':
        return 'pageCount';
      case 'collection_names':
        return 'collectionNames';
      case 'collection_ids':
        return 'collectionIds';
      default:
        return normalizedHeader;
    }
  });
  
  // Parse data rows
  const result: RawBookImport[] = [];
  
  // Log detected headers
  log.info('CSV headers detected and normalized', { 
    originalHeaders: rawHeaders,
    normalizedHeaders: headers 
  });
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line) {  // Skip empty lines
      const values = parseCSVLine(line);
      const entry: Record<string, string> = {};
      
      // Log line parsing details
      log.trace(`Parsing CSV line ${i}`, { values });
      
      // Map values to headers
      headers.forEach((header, index) => {
        if (index < values.length) {
          entry[header] = values[index];
        } else {
          entry[header] = ''; // Empty value if missing
        }
      });
      
      // Log the parsed entry
      log.debug(`Parsed book entry from line ${i}`, { entry });
      
      result.push(entry as unknown as RawBookImport);
    }
  }
  
  return result;
}

/**
 * Parse a single CSV line, handling quoted values with commas
 * and properly handling unquoted date values in YYYY-MM-DD format
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      // Check for escaped quotes
      if (i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++; // Skip the next quote (it's escaped)
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  // Don't forget the last field
  result.push(current);
  
  return result;
}

/**
 * Validate if a raw book import has the required fields
 * @param book Raw book data from import
 * @returns True if valid, false otherwise
 */
export function validateImportedBook(book: RawBookImport): { valid: boolean; reason?: string } {
  log.debug('Validating imported book', { title: book.title, author: book.author });
  
  // Check for required title field
  if (!book.title || !book.title.trim()) {
    log.warn('Validation failed: Missing title');
    return { valid: false, reason: 'Missing required field: title' };
  }
  
  // Accept books with just a title for imports from our own exports
  // This ensures that books with 'Unknown Author' or missing identifiers can still be imported
  // The author will be set to 'Unknown' in the conversion function if missing
  
  // Check if this is likely from our own export (has addedDate field or "Unknown Author")
  const isLikelyOurExport = book.addedDate || 
                          (book.author && book.author.trim() === 'Unknown Author');
                          
  // Only apply strict validation for external imports
  if ((!book.author || !book.author.trim() || book.author.trim() === 'Unknown Author') && 
      (!book.isbn || !book.isbn.trim()) && 
      (!book.googleBooksId || !book.googleBooksId.trim()) && 
      !isLikelyOurExport) {
    log.warn('Validation failed: Missing required identifiers', { 
      hasAuthor: Boolean(book.author?.trim()), 
      authorValue: book.author,
      hasISBN: Boolean(book.isbn?.trim()),
      hasGoogleId: Boolean(book.googleBooksId?.trim()),
      hasAddedDate: Boolean(book.addedDate)
    });
    return { valid: false, reason: 'Missing required field: either author or ISBN is required' };
  }
  
  // Accept any status - we'll normalize it in the conversion function
  if (book.status) {
    log.trace('Status provided for import', { status: book.status });
  } else {
    log.trace('No status provided for import');
  }
  
  // Check for valid rating if provided
  if (book.rating !== undefined && book.rating !== '') {
    const ratingNum = Number(book.rating);
    if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return { valid: false, reason: `Invalid rating: ${book.rating}. Must be a number between 1 and 5` };
    }
  }
  
  // Check for valid completedDate if provided
  if (book.completedDate) {
    // Accept both ISO format dates (with time) and simple YYYY-MM-DD format
    try {
      // Try to parse the date - this will validate it's a proper date string
      new Date(book.completedDate.trim());
      // If we get here, the date is valid
    } catch (e) {
      return { 
        valid: false, 
        reason: `Invalid completedDate: ${book.completedDate}. Must be a valid date format` 
      };
    }
  }
  
  // Check if isPartOfSeries is a valid boolean value if provided
  if (book.isPartOfSeries !== undefined && book.isPartOfSeries !== '') {
    if (typeof book.isPartOfSeries === 'string') {
      const value = book.isPartOfSeries.toLowerCase().trim();
      log.debug('Validating isPartOfSeries value', { value, original: book.isPartOfSeries });
      
      // Accept any value that can be reasonably interpreted as boolean
      // This is more lenient to handle various export formats
      if (!['true', 'false', 'yes', 'no', '1', '0', 't', 'f', 'y', 'n'].includes(value)) {
        log.warn('Invalid isPartOfSeries value', { value });
        return { 
          valid: false, 
          reason: `Invalid isPartOfSeries value: ${book.isPartOfSeries}. Must be true or false` 
        };
      }
    }
  }
  
  return { valid: true };
}

/**
 * Convert raw imported book data to the Book type
 * Converts string values to proper types
 */
function convertRawToBook(rawBook: RawBookImport): Partial<Book> {
  // Start with basic book info
  const book: Partial<Book> = {
    title: rawBook.title,
    // Handle 'Unknown Author' as empty string to be replaced with 'Unknown' later
    author: (rawBook.author && rawBook.author.trim() !== 'Unknown Author') ? rawBook.author : '',
    googleBooksId: rawBook.googleBooksId || rawBook.isbn, // Use ISBN as googleBooksId if available
    notes: rawBook.notes,
    // Preserve ID if provided (for enhanced imports)
    id: rawBook.id || crypto.randomUUID(),
  };
  
  // Handle genre data with special care for CSV imports
  if (rawBook.genre) {
    try {
      log.debug('Processing genre data', { rawGenre: rawBook.genre, type: typeof rawBook.genre });
      
      // Handle string genre data (common in CSV imports)
      if (typeof rawBook.genre === 'string') {
        // Check if it's a JSON string that needs parsing
        if (rawBook.genre.startsWith('[') && rawBook.genre.endsWith(']')) {
          try {
            const parsedGenre = JSON.parse(rawBook.genre);
            book.genre = standardizeGenreData(parsedGenre);
            log.debug('Parsed JSON genre data', { parsedGenre });
          } catch (e) {
            // If JSON parsing fails, treat as comma-separated list
            const genreList = rawBook.genre
              .replace(/[\[\]"']/g, '') // Remove brackets and quotes
              .split(/,|;/) // Split by comma or semicolon
              .map(g => g.trim())
              .filter(Boolean);
            book.genre = standardizeGenreData(genreList);
            log.debug('Processed genre as comma-separated list', { genreList });
          }
        } else {
          // Simple string - could be a single genre or comma-separated
          const genreList = rawBook.genre
            .split(/,|;/) // Split by comma or semicolon
            .map(g => g.trim())
            .filter(Boolean);
          book.genre = standardizeGenreData(genreList.length > 0 ? genreList : rawBook.genre);
          log.debug('Processed genre as string', { genreList });
        }
      } else {
        // Already an array or other format
        book.genre = standardizeGenreData(rawBook.genre);
        log.debug('Using genre data as-is', { genre: book.genre });
      }
    } catch (e) {
      log.warn('Error processing genre data', { error: e, rawGenre: rawBook.genre });
      // Default to undefined if processing fails
      book.genre = undefined;
    }
  } else {
    book.genre = undefined;
  }
  
  // Convert status to our internal format
  log.debug('Processing book status', { rawStatus: rawBook.status });
  if (rawBook.status) {
    const status = rawBook.status.toLowerCase().trim();
    log.trace('Normalized status value', { original: rawBook.status, normalized: status });
    
    // Handle various status values
    if (status.includes('want') || status === 'to read' || status === 'to-read') {
      book.status = 'want-to-read' as const;
      log.debug('Status mapped to: want-to-read');
    } else if (status.includes('reading') || status === 'currently reading' || status === 'in progress') {
      book.status = 'reading' as const;
      log.debug('Status mapped to: reading');
    } else if (status.includes('complete') || status.includes('finished') || status.includes('read')) {
      book.status = 'completed' as const;
      log.debug('Status mapped to: completed');
    } else {
      book.status = 'want-to-read' as const; // Default if invalid
      log.debug('Unrecognized status, defaulted to: want-to-read', { originalStatus: rawBook.status });
    }
  } else {
    // If no status is provided but there's a completed date, mark as completed
    if (rawBook.completedDate) {
      book.status = 'completed' as const;
      log.debug('No explicit status but has completed date, setting to: completed', { completedDate: rawBook.completedDate });
    } else {
      book.status = 'want-to-read' as const; // Default
      log.debug('No status or completed date, defaulted to: want-to-read');
    }
  }
  
  // Handle completed date - supports ISO format dates, YYYY-MM-DD format, and quoted dates
  if (rawBook.completedDate && rawBook.completedDate.trim()) {
    // Clean up the date string - remove any quotes that might be present
    let dateStr = rawBook.completedDate.trim();
    dateStr = dateStr.replace(/^"|"$/g, ''); // Remove surrounding quotes if present
    
    log.info('Processing completedDate', { dateStr, bookTitle: book.title });
    
    try {
      // Check if the date is in YYYY-MM-DD format
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        // Already in the correct format, use as is
        book.completedDate = dateStr;
        log.info('Using YYYY-MM-DD format date directly', { completedDate: dateStr, bookTitle: book.title });
      } 
      // Handle MM/DD/YYYY format (common in CSV imports)
      else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
        // Parse MM/DD/YYYY format
        const parts = dateStr.split('/');
        const month = parts[0].padStart(2, '0');
        const day = parts[1].padStart(2, '0');
        const year = parts[2];
        const normalizedDate = `${year}-${month}-${day}`;
        book.completedDate = normalizedDate;
        log.info('Converted MM/DD/YYYY to YYYY-MM-DD', { 
          original: dateStr, 
          normalized: normalizedDate,
          bookTitle: book.title 
        });
      }
      else {
        // Try to parse as a date object
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          // Valid date - normalize to YYYY-MM-DD format
          const normalizedDate = date.toISOString().split('T')[0];
          book.completedDate = normalizedDate;
          log.info('Normalized date format', { 
            original: dateStr, 
            normalized: normalizedDate,
            bookTitle: book.title 
          });
        } else {
          // Invalid date - use as is
          log.warn('Invalid date format, using as-is', { date: dateStr, bookTitle: book.title });
          book.completedDate = dateStr;
        }
      }
    } catch (e) {
      // If date parsing fails, use the original string
      log.warn('Date parsing failed, using as-is', { date: dateStr, error: e, bookTitle: book.title });
      book.completedDate = dateStr;
    }
  } else if (book.status === 'completed') {
    // If the book is marked as completed but doesn't have a completed date,
    // set today's date as the completed date
    log.debug('Book marked as completed but missing completed date, using current date');
    book.completedDate = new Date().toISOString().split('T')[0]; // Today's date
  }
  
  // Convert numeric values
  if (rawBook.rating !== undefined && rawBook.rating !== '') {
    book.rating = Number(rawBook.rating);
  }
  
  if (rawBook.pageCount !== undefined && rawBook.pageCount !== '') {
    book.pageCount = Number(rawBook.pageCount);
  }
  
  // Convert boolean values
  if (rawBook.isPartOfSeries !== undefined && rawBook.isPartOfSeries !== '') {
    if (typeof rawBook.isPartOfSeries === 'boolean') {
      book.isPartOfSeries = rawBook.isPartOfSeries;
      log.debug('Using boolean isPartOfSeries value', { value: rawBook.isPartOfSeries });
    } else if (typeof rawBook.isPartOfSeries === 'string') {
      const value = rawBook.isPartOfSeries.toLowerCase().trim();
      log.debug('Converting string isPartOfSeries value', { original: rawBook.isPartOfSeries, normalized: value });
      
      // Handle various string representations of boolean values
      if (['true', 'yes', '1', 't', 'y'].includes(value)) {
        book.isPartOfSeries = true;
        log.debug('Converted to true');
      } else {
        book.isPartOfSeries = false;
        log.debug('Converted to false');
      }
    }
  }
  
  // Handle series information
  if (book.isPartOfSeries) {
    // Use seriesId if available, otherwise use legacy series name
    if (rawBook.seriesId) {
      book.seriesId = rawBook.seriesId;
    }
    if (rawBook.seriesName) {
      book._legacySeriesName = rawBook.seriesName;
    }
    if (rawBook.volumeNumber !== undefined && rawBook.volumeNumber !== '') {
      book.volumeNumber = Number(rawBook.volumeNumber);
    }
  }
  
  // Handle collection references
  if (rawBook.collectionIds) {
    // Convert string to array if needed
    const collectionIds = typeof rawBook.collectionIds === 'string' 
      ? rawBook.collectionIds.split(';').map(id => id.trim()).filter(Boolean)
      : rawBook.collectionIds;
    
    book.collectionIds = collectionIds;
    log.debug('Processed collectionIds', { collectionIds });
  }
  
  // Handle collection names (from CSV imports)
  if (rawBook.collectionNames) {
    try {
      log.debug('Processing collectionNames', { raw: rawBook.collectionNames, type: typeof rawBook.collectionNames });
      
      // Convert string to array if needed
      let collectionNames;
      if (typeof rawBook.collectionNames === 'string') {
        // Check if it's a JSON string
        if (rawBook.collectionNames.startsWith('[') && rawBook.collectionNames.endsWith(']')) {
          try {
            collectionNames = JSON.parse(rawBook.collectionNames);
          } catch (e) {
            // If JSON parsing fails, treat as semicolon-separated list
            collectionNames = rawBook.collectionNames
              .replace(/[\[\]"']/g, '') // Remove brackets and quotes
              .split(';')
              .map(name => name.trim())
              .filter(Boolean);
          }
        } else {
          // Simple string - could be a single name or semicolon-separated
          collectionNames = rawBook.collectionNames
            .split(';')
            .map(name => name.trim())
            .filter(Boolean);
        }
      } else if (Array.isArray(rawBook.collectionNames)) {
        collectionNames = rawBook.collectionNames;
      }
      
      // Store the collection names for reference
      if (collectionNames && collectionNames.length > 0) {
        book._importedCollectionNames = collectionNames;
        log.debug('Processed collectionNames', { collectionNames });
      }
    } catch (e) {
      log.warn('Error processing collectionNames', { error: e, raw: rawBook.collectionNames });
    }
  }
  
  // Add published date - supports ISO format dates, YYYY-MM-DD format, YYYY format, and quoted dates
  if (rawBook.publishedDate) {
    // Clean up the date string - remove any quotes that might be present
    let dateStr = rawBook.publishedDate.trim();
    dateStr = dateStr.replace(/^"|"$/g, ''); // Remove surrounding quotes if present
    
    // Special case for YYYY format which is common for published dates
    if (/^\d{4}$/.test(dateStr)) {
      book.publishedDate = dateStr;
      log.debug(`Year-only published date accepted`, { year: dateStr });
    } else {
      try {
        // Try to parse as a full date - works with ISO format and YYYY-MM-DD
        const date = new Date(dateStr);
        
        if (isNaN(date.getTime())) {
          // Invalid date
          log.warn(`Invalid published date format, using as-is`, { date: dateStr });
          book.publishedDate = dateStr;
        } else {
          // Valid date - normalize to YYYY-MM-DD format for consistency
          const normalizedDate = date.toISOString().split('T')[0];
          book.publishedDate = normalizedDate;
          log.debug(`Valid published date format normalized`, { original: dateStr, normalized: normalizedDate });
        }
      } catch (e) {
        // If date parsing fails, still use the original string but log a warning
        log.warn(`Published date parsing failed, using as-is`, { date: dateStr, error: e });
        book.publishedDate = dateStr;
      }
    }
  }
  
  book.addedDate = new Date().toISOString().split('T')[0]; // Today's date
  
  // Default spine color
  book.spineColor = Math.floor(Math.random() * 8) + 1; // Random color between 1-8
  
  return book;
}

/**
 * Process a CSV import file
 * @param file The CSV file to process
 * @returns Result of the import operation
 */
export async function importFromCSV(file: File): Promise<ImportResult> {
  return new Promise((resolve, reject) => {
    // Set up file reader
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const csvString = e.target?.result as string;
        
        // Parse the CSV content
        const rawBooks = parseCSV(csvString);
        
        // Process each book
        const result = await processImportedBooks(rawBooks);
        resolve(result);
      } catch (error) {
        const errorMessage = `Failed to parse CSV: ${error instanceof Error ? error.message : String(error)}`;
        log.error(errorMessage);
        reject(new Error(errorMessage));
      }
    };
    
    reader.onerror = () => {
      const errorMessage = 'Failed to read the CSV file';
      log.error(errorMessage);
      reject(new Error(errorMessage));
    };
    
    // Start reading the file
    reader.readAsText(file);
  });
}

/**
 * Process a JSON import file
 * @param file The JSON file to process
 * @returns Result of the import operation
 */
export async function importFromJSON(file: File): Promise<ImportResult | CompleteImportResult> {
  return new Promise((resolve, reject) => {
    // Set up file reader
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const jsonString = e.target?.result as string;
        
        // Parse the JSON content
        try {
          const parsed = JSON.parse(jsonString);
          
          // Check if this is an enhanced backup format with version field
          if (parsed && typeof parsed === 'object' && 'version' in parsed) {
            log.info('Detected enhanced backup format', { version: parsed.version });
            const enhancedData = parsed as EnhancedBackupData;
            
            // Process the enhanced format
            const result = await processEnhancedImport(enhancedData);
            resolve(result);
            return;
          }
          
          // Standard format - array of books
          if (!Array.isArray(parsed)) {
            const errorMessage = 'JSON file must contain an array of book objects or be in enhanced backup format';
            log.error(errorMessage, { parsed: typeof parsed });
            throw new Error(errorMessage);
          }
          
          const rawBooks = parsed as RawBookImport[];
          // Process each book
          const result = await processImportedBooks(rawBooks);
          resolve(result);
        } catch (parseError) {
          const errorMessage = `Invalid JSON format: ${parseError instanceof Error ? parseError.message : String(parseError)}`;
          log.error(errorMessage);
          throw new Error(errorMessage);
        }
      } catch (error) {
        const errorMessage = `Failed to parse JSON: ${error instanceof Error ? error.message : String(error)}`;
        log.error(errorMessage);
        reject(new Error(errorMessage));
      }
    };
    
    reader.onerror = () => {
      const errorMessage = 'Failed to read the JSON file';
      log.error(errorMessage);
      reject(new Error(errorMessage));
    };
    
    // Start reading the file
    reader.readAsText(file);
  });
}

/**
 * Process an enhanced backup import with books, series, and collections
 * @param data The enhanced backup data
 * @returns Result of the import operation
 */
async function processEnhancedImport(data: EnhancedBackupData): Promise<CompleteImportResult> {
  log.info('Processing enhanced import', { 
    bookCount: data.books?.length || 0,
    seriesCount: data.series?.length || 0,
    collectionCount: data.collections?.length || 0,
    version: data.version
  });
  
  const result: CompleteImportResult = {
    successful: [],
    failed: [],
    total: data.books?.length || 0,
    series: {
      successful: [],
      failed: [],
      total: data.series?.length || 0
    },
    collections: {
      successful: [],
      failed: [],
      total: data.collections?.length || 0
    }
  };
  
  // Process books
  if (data.books && data.books.length > 0) {
    const bookResult = await processImportedBooks(data.books);
    result.successful = bookResult.successful;
    result.failed = bookResult.failed;
  }
  
  // Process series
  if (data.series && data.series.length > 0) {
    for (const rawSeries of data.series) {
      try {
        // Validate series
        if (!rawSeries.id || !rawSeries.name) {
          result.series.failed.push({
            rawData: rawSeries,
            reason: 'Missing required fields: id and name'
          });
          continue;
        }
        
        // Add to successful imports
        result.series.successful.push(rawSeries);
      } catch (error) {
        result.series.failed.push({
          rawData: rawSeries,
          reason: `Processing error: ${error instanceof Error ? error.message : String(error)}`
        });
      }
    }
  }
  
  // Process collections
  if (data.collections && data.collections.length > 0) {
    for (const rawCollection of data.collections) {
      try {
        // Validate collection
        if (!rawCollection.id || !rawCollection.name) {
          result.collections.failed.push({
            rawData: rawCollection,
            reason: 'Missing required fields: id and name'
          });
          continue;
        }
        
        // Add to successful imports
        result.collections.successful.push(rawCollection);
      } catch (error) {
        result.collections.failed.push({
          rawData: rawCollection,
          reason: `Processing error: ${error instanceof Error ? error.message : String(error)}`
        });
      }
    }
  }
  
  return result;
}

/**
 * Process an array of raw imported books
 * Validates each book and enriches with API data if possible
 */
async function processImportedBooks(rawBooks: RawBookImport[]): Promise<ImportResult> {
  const result: ImportResult = {
    successful: [],
    failed: [],
    total: rawBooks.length
  };
  
  log.info(`Processing ${rawBooks.length} imported books`);
  
  // Process books in sequence to avoid overwhelming the APIs
  for (const rawBook of rawBooks) {
    // Validate the book
    const validation = validateImportedBook(rawBook);
    if (!validation.valid) {
      log.warn(`Book validation failed`, { title: rawBook.title, reason: validation.reason });
      result.failed.push({
        rawData: rawBook,
        reason: validation.reason || 'Unknown validation error'
      });
      continue;
    }
    
    try {
      // Convert raw data to book object
      const partialBook = convertRawToBook(rawBook);
      
      // Create initial book from imported data
      const baseBook = {
        ...partialBook,
        id: crypto.randomUUID(),
        title: rawBook.title,
        // Handle 'Unknown Author' as 'Unknown'
        author: (rawBook.author && rawBook.author.trim() !== 'Unknown Author') ? (rawBook.author || 'Unknown') : 'Unknown',
        spineColor: Math.floor(Math.random() * 8) + 1, // Random color between 1-8
        addedDate: new Date().toISOString().split('T')[0], // Today's date
        // Ensure status is one of the required types
        status: (partialBook.status || 'want-to-read') as 'reading' | 'completed' | 'want-to-read'
      };
      
      // Try to enrich with API data
      let enrichedBook: Book = baseBook as Book;
      
      try {
        log.info(`Attempting to enrich book with API data`, { 
          title: rawBook.title, 
          author: rawBook.author || 'Unknown'
        });
        
        // Use specific ID if we have it, otherwise search by title/author
        if (rawBook.googleBooksId) {
          log.debug(`Using provided Google Books ID for enrichment`, { id: rawBook.googleBooksId });
          // Get book details directly if we have an ID
          const apiBookDetails = await bookApiClient.getBookDetails(rawBook.googleBooksId);
          
          // Convert API data to our Book type and preserve user-provided fields
          enrichedBook = {
            ...baseBook,
            // Copy API fields that we want to keep
            description: apiBookDetails.description,
            pageCount: apiBookDetails.pageCount,
            thumbnail: apiBookDetails.thumbnail,
            publishedDate: apiBookDetails.publishedDate,
            genre: apiBookDetails.genre ? standardizeGenreData(apiBookDetails.genre) : baseBook.genre,
            googleBooksId: rawBook.googleBooksId // Keep the ID for future reference
          };
        } 
        else if (rawBook.isbn) {
          log.debug(`Searching for book by ISBN`, { isbn: rawBook.isbn });
          // Search by ISBN for more accurate results
          const searchResult = await bookApiClient.searchBooks({
            query: rawBook.isbn,
            type: 'isbn',
            limit: 1
          });
          
          if (searchResult.books.length > 0) {
            // Get full details for the first result
            const apiBookDetails = await bookApiClient.getBookDetails(searchResult.books[0].id);
            
            // Convert API data to our Book type
            enrichedBook = {
              ...baseBook,
              // Copy API fields that we want to keep
              description: apiBookDetails.description,
              pageCount: apiBookDetails.pageCount,
              thumbnail: apiBookDetails.thumbnail,
              publishedDate: apiBookDetails.publishedDate,
              genre: apiBookDetails.genre ? standardizeGenreData(apiBookDetails.genre) : baseBook.genre,
              googleBooksId: searchResult.books[0].id // Store the Google Books ID
            };
          }
        } 
        else {
          log.debug(`Searching for book by title and author`, { 
            title: rawBook.title, 
            author: rawBook.author || 'Unknown' 
          });
          // Search by title and author
          const searchTerm = `${rawBook.title} ${rawBook.author || ''}`;
          const searchResult = await bookApiClient.searchBooks({
            query: searchTerm,
            type: 'all',
            limit: 3
          });
          
          if (searchResult.books.length > 0) {
            // Find the best match from the search results
            let bestMatch = searchResult.books[0];
            
            // Simple matching logic - prefer exact title matches
            for (const book of searchResult.books) {
              if (book.title.toLowerCase() === rawBook.title.toLowerCase()) {
                bestMatch = book;
                break;
              }
            }
            
            // Get full details for the best match
            const apiBookDetails = await bookApiClient.getBookDetails(bestMatch.id);
            
            // Convert API data to our Book type
            enrichedBook = {
              ...baseBook,
              // Copy API fields that we want to keep
              description: apiBookDetails.description,
              pageCount: apiBookDetails.pageCount,
              thumbnail: apiBookDetails.thumbnail,
              publishedDate: apiBookDetails.publishedDate,
              genre: apiBookDetails.genre ? standardizeGenreData(apiBookDetails.genre) : baseBook.genre,
              googleBooksId: bestMatch.id, // Store the Google Books ID
              // Add any series information if available
              isPartOfSeries: apiBookDetails.isPartOfSeries || baseBook.isPartOfSeries,
              _legacySeriesName: apiBookDetails.seriesName || baseBook._legacySeriesName
            };
          }
        }
        
        log.info('Book successfully enriched with API data', { title: enrichedBook.title });
      } catch (apiError) {
        // API enrichment failed, but we can still use the base book data
        log.warn(`API enrichment failed`, { 
          title: rawBook.title, 
          error: apiError instanceof Error ? apiError.message : String(apiError) 
        });
        log.debug('Continuing with basic book data from import');
        
        // We'll use the baseBook without API enrichment
        // No action needed as enrichedBook defaults to baseBook
      }
      
      // Add to successful imports
      result.successful.push(enrichedBook);
    } catch (error) {
      const errorMessage = `Processing error: ${error instanceof Error ? error.message : String(error)}`;
      log.error(`Book processing failed`, { title: rawBook.title, error: errorMessage });
      result.failed.push({
        rawData: rawBook,
        reason: errorMessage
      });
    }
  }
  
  return result;
}
