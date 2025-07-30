import { Series } from '@/types/series';
import { DatabaseService } from '@/services/DatabaseService';
import { v4 as uuidv4 } from 'uuid';

/**
 * Repository for managing series data in the database
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
    return this.dbService.getAll<Series>(this.storeName);
  }
  
  /**
   * Get a series by ID
   */
  async getById(id: string): Promise<Series | null> {
    return this.dbService.getById<Series>(this.storeName, id);
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
      id: `series-${uuidv4()}`,
      ...series,
      createdAt: now,
      updatedAt: now
    };
    
    await this.dbService.add(this.storeName, newSeries);
    return newSeries;
  }
  
  /**
   * Update an existing series in the database
   */
  async update(id: string, updates: Partial<Series>): Promise<Series | null> {
    const series = await this.getById(id);
    if (!series) return null;
    
    const updatedSeries: Series = {
      ...series,
      ...updates,
      updatedAt: new Date()
    };
    
    await this.dbService.update(this.storeName, id, updatedSeries);
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
    return this.dbService.delete(this.storeName, id);
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
