import { Book } from '@/types/book';

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
  genre?: string;
  isPartOfSeries?: boolean;
  seriesName?: string;
  pageCount?: number;
  publishedDate?: string;
  addedDate: string;
}

/**
 * Converts book collection to CSV format
 * @param books Array of books to convert
 * @returns CSV string with headers
 */
export function booksToCSV(books: Book[]): string {
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
    'seriesName',
    'pageCount',
    'publishedDate',
    'addedDate'
  ];
  
  // Create CSV header row
  let csv = headers.join(',') + '\n';
  
  // Process each book
  books.forEach(book => {
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
 * @returns JSON string
 */
export function booksToJSON(books: Book[]): string {
  // Create a simplified representation with only the needed fields
  const exportBooks = books.map(book => {
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
      seriesName: book.seriesName || undefined,
      pageCount: book.pageCount || undefined,
      publishedDate: book.publishedDate || undefined,
      addedDate: book.addedDate
    };
    return exportBook;
  });
  
  return JSON.stringify(exportBooks, null, 2);
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
