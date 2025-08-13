/**
 * IndexedDBOptimizations.ts
 * 
 * Performance optimizations for IndexedDB operations in the Book Collection App.
 * This file contains batch operations, data compression utilities, and optimized
 * query strategies to improve IndexedDB performance.
 */

import { StoreNames } from '@/types/indexeddb';
import { Book } from '@/types/indexeddb/Book';
import { Series } from '@/types/indexeddb/Series';
import type { IDBPDatabase } from 'idb';

/**
 * Performs batch operations on IndexedDB for improved performance.
 * Using transactions for multiple operations is much more efficient than individual operations.
 */
export class BatchOperations {
  /**
   * Save multiple books in a single transaction
   * @param db The IndexedDB database instance
   * @param books Array of books to save
   * @returns Array of book IDs that were saved
   */
  static async saveMultipleBooks(db: IDBPDatabase, books: Book[]): Promise<string[]> {
    if (!books.length) return [];
    
    try {
      const tx = db.transaction(StoreNames.BOOKS, 'readwrite');
      const store = tx.objectStore(StoreNames.BOOKS);
      
      // Prepare all books with updated timestamps
      const booksToSave = books.map(book => ({
        ...book,
        lastModified: new Date().toISOString(),
        syncStatus: 'synced'
      }));
      
      // Create an array of promises for all put operations
      const putPromises = booksToSave.map(book => store.put(book));
      
      // Wait for all puts to complete
      await Promise.all(putPromises);
      
      // Complete the transaction
      await tx.done;
      
      return booksToSave.map(book => book.id);
    } catch (error) {
      console.error('Failed to save books in batch:', error);
      throw error;
    }
  }
  
  /**
   * Save multiple series in a single transaction
   * @param db The IndexedDB database instance
   * @param seriesArray Array of series to save
   * @returns Array of series IDs that were saved
   */
  static async saveMultipleSeries(db: IDBPDatabase, seriesArray: Series[]): Promise<string[]> {
    if (!seriesArray.length) return [];
    
    try {
      const tx = db.transaction(StoreNames.SERIES, 'readwrite');
      const store = tx.objectStore(StoreNames.SERIES);
      
      // Prepare all series with updated timestamps
      const seriesToSave = seriesArray.map(series => ({
        ...series,
        lastModified: new Date().toISOString()
      }));
      
      // Create an array of promises for all put operations
      const putPromises = seriesToSave.map(series => store.put(series));
      
      // Wait for all puts to complete
      await Promise.all(putPromises);
      
      // Complete the transaction
      await tx.done;
      
      return seriesToSave.map(series => series.id);
    } catch (error) {
      console.error('Failed to save series in batch:', error);
      throw error;
    }
  }
  
  /**
   * Efficiently fetches books by their IDs in a single transaction
   * @param db The IndexedDB database instance
   * @param bookIds Array of book IDs to fetch
   * @returns Array of books matching the provided IDs
   */
  static async getBooksById(db: IDBPDatabase, bookIds: string[]): Promise<Book[]> {
    if (!bookIds.length) return [];
    
    try {
      const tx = db.transaction(StoreNames.BOOKS, 'readonly');
      const store = tx.objectStore(StoreNames.BOOKS);
      
      // Create an array of promises for all get operations
      const getPromises = bookIds.map(id => store.get(id));
      
      // Wait for all gets to complete
      const books = await Promise.all(getPromises);
      
      // Filter out any undefined results (books not found)
      return books.filter(book => book !== undefined) as Book[];
    } catch (error) {
      console.error('Failed to get books by IDs in batch:', error);
      throw error;
    }
  }
}

/**
 * Lazy loading utilities for large datasets
 */
export class LazyLoading {
  /**
   * Retrieve books with pagination
   * @param db The IndexedDB database instance
   * @param page Page number (0-based)
   * @param pageSize Number of books per page
   * @param sortBy Field to sort by
   * @param sortDirection Sort direction ('asc' or 'desc')
   * @returns Array of books for the requested page
   */
  static async getBooksPaginated(
    db: IDBPDatabase, 
    page: number = 0, 
    pageSize: number = 50,
    sortBy: string = 'lastModified',
    sortDirection: 'asc' | 'desc' = 'desc'
  ): Promise<Book[]> {
    try {
      const tx = db.transaction(StoreNames.BOOKS, 'readonly');
      const store = tx.objectStore(StoreNames.BOOKS);
      
      // Get the appropriate index based on sort field, default to lastModified
      const index = store.index(sortBy in store.indexNames ? sortBy : 'lastModified');
      
      // Determine cursor direction
      const direction = sortDirection === 'asc' ? 'next' : 'prev';
      
      // Retrieve all books sorted by the index
      const cursor = await index.openCursor(null, direction);
      
      // Skip to the start of the requested page
      let currentPage = 0;
      let currentIndex = 0;
      const skip = page * pageSize;
      let books: Book[] = [];
      
      // Advance cursor to starting point of page
      if (cursor && skip > 0) {
        await cursor.advance(skip);
      }
      
      // Retrieve the requested page of books
      while (cursor && books.length < pageSize) {
        books.push(cursor.value);
        await cursor.continue();
      }
      
      return books;
    } catch (error) {
      console.error('Failed to get paginated books:', error);
      throw error;
    }
  }
}

/**
 * Query optimization utilities for efficient data retrieval
 */
export class QueryOptimization {
  /**
   * Get books by status with optimized indexing
   * @param db The IndexedDB database instance
   * @param status The reading status to filter by
   * @returns Array of books with the specified status
   */
  static async getBooksByStatus(db: IDBPDatabase, status: string): Promise<Book[]> {
    try {
      const tx = db.transaction(StoreNames.BOOKS, 'readonly');
      const store = tx.objectStore(StoreNames.BOOKS);
      const index = store.index('status');
      
      return index.getAll(status);
    } catch (error) {
      console.error(`Failed to get books with status ${status}:`, error);
      throw error;
    }
  }
  
  /**
   * Get recently added books with optimized indexing
   * @param db The IndexedDB database instance
   * @param limit Maximum number of books to return
   * @returns Array of recently added books
   */
  static async getRecentlyAddedBooks(db: IDBPDatabase, limit: number = 10): Promise<Book[]> {
    try {
      const tx = db.transaction(StoreNames.BOOKS, 'readonly');
      const store = tx.objectStore(StoreNames.BOOKS);
      const index = store.index('dateAdded');
      
      const books: Book[] = [];
      let cursor = await index.openCursor(null, 'prev'); // Descending order
      
      while (cursor && books.length < limit) {
        books.push(cursor.value);
        await cursor.continue();
      }
      
      return books;
    } catch (error) {
      console.error('Failed to get recently added books:', error);
      throw error;
    }
  }
  
  /**
   * Get recently updated books with optimized indexing
   * @param db The IndexedDB database instance
   * @param limit Maximum number of books to return, or -1 for all books
   * @returns Array of recently updated books
   */
  static async getRecentlyUpdatedBooks(db: IDBPDatabase, limit: number = -1): Promise<Book[]> {
    try {
      const tx = db.transaction(StoreNames.BOOKS, 'readonly');
      const store = tx.objectStore(StoreNames.BOOKS);
      
      // If we want all books (limit is -1), use getAll for better performance
      if (limit === -1) {
        console.log('Getting ALL books from IndexedDB (no limit)');
        return await store.getAll();
      }
      
      // Otherwise use the index and cursor for sorted, limited results
      const index = store.index('lastModified');
      
      const books: Book[] = [];
      let cursor = await index.openCursor(null, 'prev'); // Descending order
      
      while (cursor && (limit === -1 || books.length < limit)) {
        books.push(cursor.value);
        await cursor.continue();
      }
      
      console.log(`Retrieved ${books.length} books from IndexedDB with limit ${limit}`);
      return books;
    } catch (error) {
      console.error('Failed to get recently updated books:', error);
      throw error;
    }
  }
}

/**
 * Cache management utilities for optimal performance
 */
export class CacheManagement {
  /**
   * Optimal cache invalidation strategies
   * @param entity Entity type being updated
   * @param id ID of the entity being updated
   * @param dependencies Related entities that might need cache invalidation
   */
  static determineCacheInvalidation(
    entity: 'book' | 'series' | 'upcomingRelease' | 'notification',
    id: string,
    dependencies?: { seriesId?: string }
  ): string[] {
    const cacheKeysToInvalidate: string[] = [];
    
    switch (entity) {
      case 'book':
        cacheKeysToInvalidate.push('books');
        // Only invalidate series cache if the book is part of a series
        if (dependencies?.seriesId) {
          cacheKeysToInvalidate.push('series');
        }
        break;
      case 'series':
        cacheKeysToInvalidate.push('series');
        // Series changes might affect book listings (for series info in book items)
        cacheKeysToInvalidate.push('books');
        break;
      case 'upcomingRelease':
        cacheKeysToInvalidate.push('upcomingReleases');
        break;
      case 'notification':
        cacheKeysToInvalidate.push('notifications');
        break;
    }
    
    return cacheKeysToInvalidate;
  }
  
  /**
   * Selective cache update that updates only the affected entity in cache
   * instead of invalidating the entire cache
   * @param cache Current cache state
   * @param entityType Type of entity being updated
   * @param entity The updated entity
   * @returns Updated cache with the entity updated instead of invalidated
   */
  static updateEntityInCache<T extends { id: string }>(
    cache: T[] | null,
    entity: T
  ): T[] {
    if (!cache) return [entity];
    
    const updatedCache = [...cache];
    const index = updatedCache.findIndex(item => item.id === entity.id);
    
    if (index >= 0) {
      // Update existing entity
      updatedCache[index] = entity;
    } else {
      // Add new entity
      updatedCache.push(entity);
    }
    
    return updatedCache;
  }
  
  /**
   * Remove an entity from cache without invalidating the entire cache
   * @param cache Current cache state
   * @param entityType Type of entity being removed
   * @param entityId ID of the entity to remove
   * @returns Updated cache with the entity removed
   */
  static removeEntityFromCache<T extends { id: string }>(
    cache: T[] | null,
    entityId: string
  ): T[] {
    if (!cache) return [];
    
    return cache.filter(item => item.id !== entityId);
  }
}

/**
 * Performance monitoring for IndexedDB operations
 */
export class PerformanceMonitoring {
  private static operations: Record<string, { count: number, totalTime: number }> = {};
  
  /**
   * Start timing an operation
   * @param operationName Name of the operation to time
   * @returns A function that stops timing and records the result
   */
  static startTiming(operationName: string): () => void {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      if (!this.operations[operationName]) {
        this.operations[operationName] = { count: 0, totalTime: 0 };
      }
      
      this.operations[operationName].count++;
      this.operations[operationName].totalTime += duration;
      
      // Log if operation is particularly slow (over 200ms)
      if (duration > 200) {
        console.warn(`Slow IndexedDB operation: ${operationName} took ${duration.toFixed(2)}ms`);
      }
    };
  }
  
  /**
   * Get performance statistics for all operations
   * @returns Object containing stats for all measured operations
   */
  static getPerformanceStats(): Record<string, { 
    count: number, 
    totalTime: number, 
    avgTime: number 
  }> {
    const stats: Record<string, any> = {};
    
    Object.keys(this.operations).forEach(op => {
      const { count, totalTime } = this.operations[op];
      stats[op] = {
        count,
        totalTime,
        avgTime: totalTime / count
      };
    });
    
    return stats;
  }
  
  /**
   * Reset all performance statistics
   */
  static resetStats(): void {
    this.operations = {};
  }
}
