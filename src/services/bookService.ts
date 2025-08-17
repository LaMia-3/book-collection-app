import { indexedDBService } from './storage/indexedDBService';
import { StoreNames } from './storage/types';
import type { Book } from '@/types/models/Book';
import type { Book as IndexedDBBook } from '@/types/indexeddb/Book';
import { createLogger } from '@/utils/loggingUtils';

const log = createLogger('bookService');

/**
 * Maps an IndexedDB Book to the application Book model
 */
function mapIndexedDBBookToModel(dbBook: IndexedDBBook): Book {
  return {
    ...dbBook,
    addedDate: dbBook.dateAdded, // Map dateAdded to addedDate
    // Map other fields as needed
    completedDate: dbBook.dateCompleted, // Map dateCompleted to completedDate
  };
}

/**
 * Maps an array of IndexedDB Books to application Book models
 */
function mapIndexedDBBooksToModels(dbBooks: IndexedDBBook[]): Book[] {
  return dbBooks.map(mapIndexedDBBookToModel);
}

/**
 * Retrieves all books from the database
 * @returns Promise that resolves to an array of Book objects
 */
export async function getBooks(): Promise<Book[]> {
  log.debug('Fetching all books from database');
  
  try {
    const dbBooks = await indexedDBService.getBooks();
    log.debug(`Successfully retrieved ${dbBooks.length} books`);
    return mapIndexedDBBooksToModels(dbBooks);
  } catch (error) {
    log.error('Failed to fetch books from database', error);
    throw new Error('Failed to fetch books from database');
  }
}

/**
 * Retrieves a book by its ID
 * @param id - The ID of the book to retrieve
 * @returns Promise that resolves to the Book object or undefined if not found
 */
export async function getBookById(id: string): Promise<Book | undefined> {
  log.debug(`Fetching book with ID: ${id}`);
  
  try {
    const dbBook = await indexedDBService.getBookById(id);
    
    if (!dbBook) {
      log.warn(`Book with ID ${id} not found`);
      return undefined;
    }
    
    log.debug(`Successfully retrieved book: ${dbBook.title}`);
    return mapIndexedDBBookToModel(dbBook);
  } catch (error) {
    log.error(`Failed to fetch book with ID ${id}`, error);
    throw new Error(`Failed to fetch book with ID ${id}`);
  }
}
