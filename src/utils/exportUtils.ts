import { Book } from '@/types/book';
import { Series } from '@/types/series';
import { Collection } from '@/types/collection';

/**
 * Book data formatted for export
 */
interface ExportableBook {
  title: string;
  author: string;
  googleBooksId?: string;
  status: string;
  completedDate?: string;
  rating?: number;
  notes?: string;
  genre?: string | string[];
  isPartOfSeries?: boolean;
  seriesId?: string;
  seriesName?: string;
  volumeNumber?: number;
  pageCount?: number;
  publishedDate?: string;
  addedDate: string;
  collectionIds?: string[];
  collectionNames?: string[];
}

/**
 * Series data formatted for export
 */
interface ExportableSeries {
  id: string;
  name: string;
  description?: string;
  author?: string;
  coverImage?: string;
  books: string[];
  totalBooks?: number;
  readingOrder: 'publication' | 'chronological' | 'custom';
  customOrder?: string[];
  status?: 'ongoing' | 'completed' | 'cancelled';
  genre?: string[];
  isTracked: boolean;
  hasUpcoming?: boolean;
}

/**
 * Collection data formatted for export
 */
interface ExportableCollection {
  id: string;
  name: string;
  description?: string;
  bookIds: string[];
  color?: string;
  imageUrl?: string;
}

/**
 * Converts book collection to CSV format
 * @param books Array of books to convert
 * @param collections Optional array of collections to include collection names
 * @returns CSV string with headers
 */
export function booksToCSV(books: Book[], collections: Collection[] = []): string {
  // Define CSV headers based on our import requirements
  const headers = [
    'title',
    'author',
    'isbn',
    'status',
    'completedDate',
    'rating',
    'notes',
    'genre',
    'isPartOfSeries',
    'seriesId',
    'seriesName',
    'volumeNumber',
    'pageCount',
    'publishedDate',
    'addedDate',
    'collectionNames'
  ];
  
  // Create CSV header row
  let csv = headers.join(',') + '\n';
  
  // Process each book
  books.forEach(book => {
    // Find collection names for this book if collections are provided
    const bookCollections = collections
      .filter(collection => collection.bookIds.includes(book.id))
      .map(collection => collection.name);
      
    const row = headers.map(header => {
      // Handle special cases and ensure proper CSV escaping
      switch (header) {
        case 'status':
          // Convert status to the expected format
          if (book.completedDate) return '"completed"';
          if (book.status === 'reading') return '"reading"';
          return '"want to read"';
          
        case 'isPartOfSeries':
          return book.isPartOfSeries ? '"true"' : '"false"';
          
        case 'isbn':
          // Use googleBooksId as a fallback for ISBN
          return book.googleBooksId ? `"${book.googleBooksId}"` : '';
          
        case 'seriesId':
          return book.seriesId ? `"${book.seriesId}"` : '';
          
        case 'volumeNumber':
          return book.volumeNumber ? `${book.volumeNumber}` : '';
          
        case 'collectionNames':
          // Join collection names with semicolons and escape for CSV
          if (bookCollections.length > 0) {
            return `"${bookCollections.join(';').replace(/"/g, '""')}"`;  
          }
          return '';
          
        default:
          // Get the value (or empty string if undefined)
          const value = book[header as keyof Book];
          
          // Convert to string and properly escape for CSV
          if (value === undefined || value === null) {
            return '';
          } else if (typeof value === 'string') {
            // Escape quotes and wrap in quotes to handle commas and other special chars
            return `"${value.replace(/"/g, '""')}"`; 
          } else {
            return `${value}`;
          }
      }
    });
    
    // Add the row to the CSV
    csv += row.join(',') + '\n';
  });
  
  return csv;
}

/**
 * Converts book collection to JSON format
 * @param books Array of books to convert
 * @param collections Optional array of collections to include collection names
 * @returns JSON string
 */
export function booksToJSON(books: Book[], collections: Collection[] = []): string {
  // Create a simplified representation with only the needed fields
  const exportBooks = books.map(book => {
    // Find collection names for this book if collections are provided
    const bookCollections = collections
      .filter(collection => collection.bookIds.includes(book.id))
      .map(collection => collection.name);

    const exportBook: ExportableBook = {
      title: book.title,
      author: book.author,
      googleBooksId: book.googleBooksId || undefined,
      status: book.completedDate ? 'completed' : (book.status === 'want-to-read' ? 'want to read' : (book.status || 'want to read')),
      completedDate: book.completedDate || undefined,
      rating: book.rating || undefined,
      notes: book.notes || undefined,
      genre: book.genre || undefined,
      isPartOfSeries: book.isPartOfSeries || false,
      seriesId: book.seriesId || undefined,
      seriesName: book._legacySeriesName || undefined,
      volumeNumber: book.volumeNumber || undefined,
      pageCount: book.pageCount || undefined,
      publishedDate: book.publishedDate || undefined,
      addedDate: book.addedDate,
      collectionIds: book.collectionIds || undefined,
      collectionNames: bookCollections.length > 0 ? bookCollections : undefined
    };
    return exportBook;
  });
  
  return JSON.stringify(exportBooks, null, 2);
}

/**
 * Converts series to JSON format
 * @param series Array of series to convert
 * @returns JSON string
 */
export function seriesToJSON(series: Series[]): string {
  const exportSeries = series.map(s => {
    const exportSeries: ExportableSeries = {
      id: s.id,
      name: s.name,
      description: s.description,
      author: s.author,
      coverImage: s.coverImage,
      books: s.books,
      totalBooks: s.totalBooks,
      readingOrder: s.readingOrder,
      customOrder: s.customOrder,
      status: s.status,
      genre: s.genre,
      isTracked: s.isTracked,
      hasUpcoming: s.hasUpcoming
    };
    return exportSeries;
  });
  
  return JSON.stringify(exportSeries, null, 2);
}

/**
 * Converts collections to JSON format
 * @param collections Array of collections to convert
 * @returns JSON string
 */
export function collectionsToJSON(collections: Collection[]): string {
  const exportCollections = collections.map(c => {
    const exportCollection: ExportableCollection = {
      id: c.id,
      name: c.name,
      description: c.description,
      bookIds: c.bookIds,
      color: c.color,
      imageUrl: c.imageUrl
    };
    return exportCollection;
  });
  
  return JSON.stringify(exportCollections, null, 2);
}

/**
 * Converts series to CSV format
 * @param series Array of series to convert
 * @returns CSV string with headers
 */
export function seriesToCSV(series: Series[]): string {
  // Define CSV headers for series
  const headers = [
    'id',
    'name',
    'description',
    'author',
    'books',
    'totalBooks',
    'readingOrder',
    'status',
    'genre',
    'isTracked',
    'hasUpcoming'
  ];
  
  // Create CSV header row
  let csv = headers.join(',') + '\n';
  
  // Process each series
  series.forEach(s => {
    const row = headers.map(header => {
      switch (header) {
        case 'books':
          // Join book IDs with semicolons
          return s.books.length > 0 ? `"${s.books.join(';').replace(/"/g, '""')}"` : '';
          
        case 'genre':
          // Join genres with semicolons
          return s.genre && s.genre.length > 0 ? `"${s.genre.join(';').replace(/"/g, '""')}"` : '';
          
        case 'isTracked':
          return s.isTracked ? '"true"' : '"false"';
          
        case 'hasUpcoming':
          return s.hasUpcoming ? '"true"' : '"false"';
          
        default:
          // Get the value (or empty string if undefined)
          const value = s[header as keyof Series];
          
          // Convert to string and properly escape for CSV
          if (value === undefined || value === null) {
            return '';
          } else if (typeof value === 'string') {
            // Escape quotes and wrap in quotes to handle commas and other special chars
            return `"${value.replace(/"/g, '""')}"`;  
          } else {
            return `${value}`;
          }
      }
    });
    
    // Add the row to the CSV
    csv += row.join(',') + '\n';
  });
  
  return csv;
}

/**
 * Converts collections to CSV format
 * @param collections Array of collections to convert
 * @returns CSV string with headers
 */
export function collectionsToCSV(collections: Collection[]): string {
  // Define CSV headers for collections
  const headers = [
    'id',
    'name',
    'description',
    'bookIds',
    'color',
    'imageUrl'
  ];
  
  // Create CSV header row
  let csv = headers.join(',') + '\n';
  
  // Process each collection
  collections.forEach(c => {
    const row = headers.map(header => {
      switch (header) {
        case 'bookIds':
          // Join book IDs with semicolons
          return c.bookIds.length > 0 ? `"${c.bookIds.join(';').replace(/"/g, '""')}"` : '';
          
        default:
          // Get the value (or empty string if undefined)
          const value = c[header as keyof Collection];
          
          // Convert to string and properly escape for CSV
          if (value === undefined || value === null) {
            return '';
          } else if (typeof value === 'string') {
            // Escape quotes and wrap in quotes to handle commas and other special chars
            return `"${value.replace(/"/g, '""')}"`;  
          } else {
            return `${value}`;
          }
      }
    });
    
    // Add the row to the CSV
    csv += row.join(',') + '\n';
  });
  
  return csv;
}

/**
 * Creates a complete JSON export with books, series, and collections
 * @param books Array of books to export
 * @param series Array of series to export
 * @param collections Array of collections to export
 * @returns JSON string with all data
 */
export function createCompleteJSONExport(
  books: Book[], 
  series: Series[], 
  collections: Collection[]
): string {
  const exportData = {
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    books: books.map(book => {
      // Find collection names for this book
      const bookCollections = collections
        .filter(collection => collection.bookIds.includes(book.id))
        .map(collection => collection.name);

      return {
        title: book.title,
        author: book.author,
        googleBooksId: book.googleBooksId || undefined,
        status: book.completedDate ? 'completed' : (book.status === 'want-to-read' ? 'want to read' : (book.status || 'want to read')),
        completedDate: book.completedDate || undefined,
        rating: book.rating || undefined,
        notes: book.notes || undefined,
        genre: book.genre || undefined,
        isPartOfSeries: book.isPartOfSeries || false,
        seriesId: book.seriesId || undefined,
        seriesName: book._legacySeriesName || undefined,
        volumeNumber: book.volumeNumber || undefined,
        pageCount: book.pageCount || undefined,
        publishedDate: book.publishedDate || undefined,
        addedDate: book.addedDate,
        collectionIds: book.collectionIds || undefined,
        collectionNames: bookCollections.length > 0 ? bookCollections : undefined,
        id: book.id // Include ID for relationships
      };
    }),
    series: series.map(s => ({
      id: s.id,
      name: s.name,
      description: s.description,
      author: s.author,
      coverImage: s.coverImage,
      books: s.books,
      totalBooks: s.totalBooks,
      readingOrder: s.readingOrder,
      customOrder: s.customOrder,
      status: s.status,
      genre: s.genre,
      isTracked: s.isTracked,
      hasUpcoming: s.hasUpcoming
    })),
    collections: collections.map(c => ({
      id: c.id,
      name: c.name,
      description: c.description,
      bookIds: c.bookIds,
      color: c.color,
      imageUrl: c.imageUrl
    })),
    metadata: {
      bookCount: books.length,
      seriesCount: series.length,
      collectionCount: collections.length,
      appVersion: '2.0.0',
      exportDate: new Date().toISOString()
    }
  };
  
  return JSON.stringify(exportData, null, 2);
}

/**
 * Create and download a file with the given content
 * @param content File content
 * @param fileName Name to save the file as
 * @param contentType MIME type of the file
 */
export function downloadFile(content: string, fileName: string, contentType: string): void {
  // Create a blob with the content
  const blob = new Blob([content], { type: contentType });
  
  // Create a URL for the blob
  const url = URL.createObjectURL(blob);
  
  // Create a temporary anchor element
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  
  // Append, click, and remove the link
  document.body.appendChild(link);
  link.click();
  
  // Clean up
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 100);
}
