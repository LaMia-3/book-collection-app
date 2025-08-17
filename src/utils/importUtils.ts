import { Book } from '@/types/book';
import { Book as ModelBook } from '@/types/models/Book';
import { bookApiClient } from '@/services/api';
import { createLogger } from './loggingUtils';

// Create a logger for import functionality
const log = createLogger('ImportUtils');

/**
 * Represents a raw book entry from an imported CSV or JSON file
 */
interface RawBookImport {
  title: string;
  author?: string;
  isbn?: string;
  googleBooksId?: string;
  status?: string;
  completedDate?: string;
  rating?: string | number;
  notes?: string;
  genre?: string;
  isPartOfSeries?: string | boolean;
  seriesName?: string;
  pageCount?: string | number;
  publishedDate?: string;
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
  const headers = parseCSVLine(lines[0]);
  
  // Parse data rows
  const result: RawBookImport[] = [];
  
  // Log detected headers
  log.debug('CSV headers detected', { headers });
  
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
  
  // Check for either author or ISBN
  if ((!book.author || !book.author.trim()) && (!book.isbn || !book.isbn.trim()) && (!book.googleBooksId || !book.googleBooksId.trim())) {
    log.warn('Validation failed: Missing required identifiers', { 
      hasAuthor: Boolean(book.author?.trim()), 
      hasISBN: Boolean(book.isbn?.trim()),
      hasGoogleId: Boolean(book.googleBooksId?.trim())
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
    // Simple validation, check if it looks like a date
    const datePattern = /^\\d{4}-\\d{2}-\\d{2}$/;
    if (!datePattern.test(book.completedDate.trim())) {
      return { 
        valid: false, 
        reason: `Invalid completedDate: ${book.completedDate}. Must be in YYYY-MM-DD format` 
      };
    }
  }
  
  // Check if isPartOfSeries is a valid boolean value if provided
  if (book.isPartOfSeries !== undefined && book.isPartOfSeries !== '') {
    if (typeof book.isPartOfSeries === 'string') {
      const value = book.isPartOfSeries.toLowerCase().trim();
      if (!['true', 'false', 'yes', 'no', '1', '0'].includes(value)) {
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
    author: rawBook.author || '',
    googleBooksId: rawBook.googleBooksId || rawBook.isbn, // Use ISBN as googleBooksId if available
    genre: rawBook.genre,
    notes: rawBook.notes,
  };
  
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
  
  // Handle completed date - supports both quoted and unquoted YYYY-MM-DD format
  if (rawBook.completedDate && rawBook.completedDate.trim()) {
    // Clean up the date string - remove any quotes that might be present
    let dateStr = rawBook.completedDate.trim();
    dateStr = dateStr.replace(/^"|"$/g, ''); // Remove surrounding quotes if present
    
    // Validate that the date is in YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      // FIXED: Accept all valid YYYY-MM-DD dates, including future dates
      book.completedDate = dateStr;
      log.debug(`Valid completed date format accepted`, { date: dateStr });
    } else {
      log.warn(`Invalid completed date format`, { date: dateStr, expected: 'YYYY-MM-DD' });
      // Still use the date but log a warning
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
    } else if (typeof rawBook.isPartOfSeries === 'string') {
      const value = rawBook.isPartOfSeries.toLowerCase().trim();
      book.isPartOfSeries = ['true', 'yes', '1'].includes(value);
    }
  }
  
  // Add series name if book is part of series
  if (book.isPartOfSeries && rawBook.seriesName) {
    book.seriesName = rawBook.seriesName;
  }
  
  // Add published date - supports both quoted and unquoted YYYY-MM-DD format
  if (rawBook.publishedDate) {
    // Clean up the date string - remove any quotes that might be present
    let dateStr = rawBook.publishedDate.trim();
    dateStr = dateStr.replace(/^"|"$/g, ''); // Remove surrounding quotes if present
    
    // Validate that the date is in YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      book.publishedDate = dateStr;
    } else {
      // For published date, also support YYYY format
      if (/^\d{4}$/.test(dateStr)) {
        book.publishedDate = dateStr;
      } else {
        log.warn(`Invalid published date format`, { date: dateStr, expected: 'YYYY-MM-DD or YYYY' });
        // Still use the date but log a warning
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
export async function importFromJSON(file: File): Promise<ImportResult> {
  return new Promise((resolve, reject) => {
    // Set up file reader
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const jsonString = e.target?.result as string;
        
        // Parse the JSON content
        let rawBooks: RawBookImport[];
        try {
          const parsed = JSON.parse(jsonString);
          if (!Array.isArray(parsed)) {
            const errorMessage = 'JSON file must contain an array of book objects';
          log.error(errorMessage, { parsed: typeof parsed });
          throw new Error(errorMessage);
          }
          rawBooks = parsed as RawBookImport[];
        } catch (parseError) {
          const errorMessage = `Invalid JSON format: ${parseError instanceof Error ? parseError.message : String(parseError)}`;
          log.error(errorMessage);
          throw new Error(errorMessage);
        }
        
        // Process each book
        const result = await processImportedBooks(rawBooks);
        resolve(result);
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
        author: rawBook.author || 'Unknown',
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
            genre: apiBookDetails.genre || baseBook.genre,
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
              genre: apiBookDetails.genre || baseBook.genre,
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
              genre: apiBookDetails.genre || baseBook.genre,
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
