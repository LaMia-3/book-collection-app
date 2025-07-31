import { Series } from '@/types/series';
import { DatabaseService } from '@/services/DatabaseService';
import { enhancedStorageService } from '@/services/storage/EnhancedStorageService';
import { v4 as uuidv4 } from 'uuid';

/**
 * Repository for managing series data
 * Uses IndexedDB as the exclusive source of truth for all series data
 */
export class SeriesRepository {
  private readonly dbService: DatabaseService;
  private readonly storeName = 'series';
  
  constructor(dbService: DatabaseService) {
    this.dbService = dbService;
  }
  
  /**
   * Get all series in the database
   */
  async getAll(): Promise<Series[]> {
    try {
      // Get series from IndexedDB as the exclusive source of truth
      const seriesFromDB = await enhancedStorageService.getSeries();
      
      // Convert from IndexedDB format to the app's Series format
      const convertedSeries = seriesFromDB.map(series => ({
        ...series,
        // Convert Date fields to ensure proper format for UI
        createdAt: new Date(series.dateAdded || new Date().toISOString()),
        updatedAt: new Date(series.lastModified || new Date().toISOString())
      }));
      
      return convertedSeries as Series[];
    } catch (error) {
      console.error('Error getting all series from IndexedDB:', error);
      return [];
    }
  }
  
  /**
   * Get a series by ID
   */
  async getById(id: string): Promise<Series | null> {
    try {
      // Get from IndexedDB as the exclusive source of truth
      const seriesFromDB = await enhancedStorageService.getSeriesById(id);
      if (seriesFromDB) {
        // Convert to the app's Series format
        const convertedSeries = {
          ...seriesFromDB,
          // Convert Date fields
          createdAt: new Date(seriesFromDB.dateAdded || new Date().toISOString()),
          updatedAt: new Date(seriesFromDB.lastModified || new Date().toISOString())
        };
        
        return convertedSeries as Series;
      }
      
      // Not found in IndexedDB
      return null;
    } catch (error) {
      console.error(`Error getting series ${id}:`, error);
      return null;
    }
  }
  
  /**
   * Get series containing a specific book
   */
  async getByBookId(bookId: string): Promise<Series[]> {
    const allSeries = await this.getAll();
    return allSeries.filter(series => series.books.includes(bookId));
  }
  
  /**
   * Get all series that are being tracked by the user
   */
  async getTracked(): Promise<Series[]> {
    const allSeries = await this.getAll();
    return allSeries.filter(series => series.isTracked);
  }
  
  /**
   * Add a new series to the database
   */
  async add(series: Omit<Series, 'id' | 'createdAt' | 'updatedAt'>): Promise<Series> {
    const now = new Date();
    const newSeries: Series = {
      ...series,
      id: `series-${uuidv4()}`,
      createdAt: now,
      updatedAt: now
    };
    
    try {
      // Add to IndexedDB as the exclusive source of truth
      const enhancedSeries = {
        ...newSeries,
        // Add required IndexedDB fields
        dateAdded: now.toISOString(),
        lastModified: now.toISOString(),
        readingProgress: 0,
        completedBooks: 0
      };
      
      await enhancedStorageService.saveSeries(enhancedSeries as any);
      return newSeries;
    } catch (error) {
      console.error('Error adding series:', error);
      throw error;
    }
  }
  
  /**
   * Update an existing series in the database
   */
  async update(id: string, updates: Partial<Series>): Promise<Series | null> {
    const series = await this.getById(id);
    if (!series) return null;
    
    const now = new Date();
    const updatedSeries: Series = {
      ...series,
      ...updates,
      updatedAt: now
    };
    
    try {
      // Update IndexedDB as the exclusive source of truth
      const enhancedSeries = {
        ...updatedSeries,
        // Add required IndexedDB fields if they don't exist
        readingProgress: (updatedSeries as any).readingProgress || 0,
        completedBooks: (updatedSeries as any).completedBooks || 0,
        dateAdded: (updatedSeries as any).dateAdded || 
                   updatedSeries.createdAt.toISOString(),
        lastModified: now.toISOString()
      };
      
      await enhancedStorageService.saveSeries(enhancedSeries as any);
    } catch (error) {
      console.error(`Error updating series ${id}:`, error);
      throw error; // Re-throw to notify calling code of the failure
    }
    
    return updatedSeries;
  }
  
  /**
   * Set the tracking status of a series
   */
  async setTracking(id: string, isTracked: boolean): Promise<Series | null> {
    return this.update(id, { isTracked });
  }
  
  /**
   * Set the reading order of a series
   */
  async setReadingOrder(
    id: string, 
    readingOrder: 'publication' | 'chronological' | 'custom',
    customOrder?: string[]
  ): Promise<Series | null> {
    return this.update(id, { readingOrder, customOrder });
  }
  
  /**
   * Add a book to a series
   */
  async addBook(id: string, bookId: string): Promise<Series | null> {
    const series = await this.getById(id);
    if (!series) return null;
    
    if (series.books.includes(bookId)) {
      return series; // Book already in series
    }
    
    const updatedBooks = [...series.books, bookId];
    return this.update(id, { books: updatedBooks });
  }
  
  /**
   * Remove a book from a series
   */
  async removeBook(id: string, bookId: string): Promise<Series | null> {
    const series = await this.getById(id);
    if (!series) return null;
    
    const updatedBooks = series.books.filter(id => id !== bookId);
    return this.update(id, { books: updatedBooks });
  }
  
  /**
   * Delete a series from the database
   */
  async delete(id: string): Promise<boolean> {
    try {
      // Delete from IndexedDB as the exclusive source of truth
      await enhancedStorageService.deleteSeries(id);
      return true;
    } catch (error) {
      console.error(`Error deleting series ${id}:`, error);
      return false;
    }
  }
  
  /**
   * Update the total books count of a series
   */
  async updateTotalBooks(id: string, totalBooks: number): Promise<Series | null> {
    return this.update(id, { totalBooks });
  }
  
  /**
   * Set the status of a series (ongoing, completed, etc.)
   */
  async setStatus(id: string, status: 'ongoing' | 'completed' | 'cancelled'): Promise<Series | null> {
    return this.update(id, { status });
  }
}

// Export a singleton instance
export const seriesRepository = new SeriesRepository(new DatabaseService());
