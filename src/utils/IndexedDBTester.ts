/**
 * Utility for testing IndexedDB implementation
 */
import { indexedDBService } from '@/services/storage/IndexedDBService';
import { enhancedStorageService } from '@/services/storage/EnhancedStorageService';
import { Book } from '@/types/indexeddb/Book';
import { Series } from '@/types/indexeddb/Series';
import { ReadingStatus } from '@/types/models/Book';

/**
 * Test the IndexedDB implementation with sample data
 */
export async function testIndexedDBImplementation(): Promise<string> {
  try {
    console.log('Testing IndexedDB implementation...');
    
    // Initialize the database
    await indexedDBService.initDb();
    console.log('IndexedDB initialized successfully');
    
    // Test data: Sample book
    const testBook: Book = {
      id: `test-book-${Date.now()}`,
      title: 'Test Book Title',
      author: 'Test Author',
      dateAdded: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      spineColor: 1,
      progress: 0.5,
      status: ReadingStatus.READING,
      syncStatus: 'synced'
    };
    
    // Test data: Sample series
    const testSeries: Series = {
      id: `test-series-${Date.now()}`,
      name: 'Test Series',
      author: 'Test Author',
      books: [],
      totalBooks: 0,
      completedBooks: 0,
      readingProgress: 0,
      readingOrder: 'publication',
      isTracked: false,
      dateAdded: new Date().toISOString(),
      lastModified: new Date().toISOString()
    };
    
    // Test saving a book
    console.log('Saving test book...');
    const bookId = await indexedDBService.saveBook(testBook);
    console.log(`Test book saved with ID: ${bookId}`);
    
    // Test retrieving the book
    console.log('Retrieving test book...');
    const retrievedBook = await indexedDBService.getBookById(bookId);
    console.log('Retrieved book:', retrievedBook);
    
    // Test saving a series
    console.log('Saving test series...');
    const seriesId = await indexedDBService.saveSeries(testSeries);
    console.log(`Test series saved with ID: ${seriesId}`);
    
    // Test retrieving the series
    console.log('Retrieving test series...');
    const retrievedSeries = await indexedDBService.getSeriesById(seriesId);
    console.log('Retrieved series:', retrievedSeries);
    
    // Test the enhanced storage service
    console.log('Testing EnhancedStorageService...');
    await enhancedStorageService.initialize();
    
    // Add book to series
    console.log('Adding book to series...');
    await enhancedStorageService.addBookToSeries(bookId, seriesId);
    
    // Get updated book and series
    const updatedBook = await enhancedStorageService.getBookById(bookId);
    const updatedSeries = await enhancedStorageService.getSeriesById(seriesId);
    
    console.log('Updated book with series info:', updatedBook);
    console.log('Updated series with book:', updatedSeries);
    
    // Update series progress
    console.log('Updating series progress...');
    const progress = await enhancedStorageService.updateSeriesProgress(seriesId);
    console.log(`Series progress updated: ${progress}`);
    
    return 'IndexedDB test completed successfully!';
  } catch (error) {
    console.error('IndexedDB test failed:', error);
    return `IndexedDB test failed: ${error}`;
  }
}

/**
 * Compare LocalStorage with IndexedDB data
 */
export async function compareStorageData(): Promise<string> {
  try {
    console.log('Comparing localStorage and IndexedDB data...');
    
    // Get data from localStorage
    const localStorageBooks = localStorage.getItem('bookLibrary') 
      ? JSON.parse(localStorage.getItem('bookLibrary')!) 
      : [];
    
    const localStorageSeries = localStorage.getItem('seriesLibrary') 
      ? JSON.parse(localStorage.getItem('seriesLibrary')!) 
      : [];
    
    // Get data from IndexedDB
    const indexedDBBooks = await enhancedStorageService.getBooks();
    const indexedDBSeries = await enhancedStorageService.getSeries();
    
    console.log('Books in localStorage:', localStorageBooks.length);
    console.log('Books in IndexedDB:', indexedDBBooks.length);
    console.log('Series in localStorage:', localStorageSeries.length);
    console.log('Series in IndexedDB:', indexedDBSeries.length);
    
    return 'Storage comparison completed!';
  } catch (error) {
    console.error('Storage comparison failed:', error);
    return `Storage comparison failed: ${error}`;
  }
}
