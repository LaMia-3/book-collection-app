import { Series } from '@/types/series';
import { Series as IndexedDbSeries } from '@/types/indexeddb/Series';
import { DatabaseService } from '@/services/DatabaseService';
import { enhancedStorageService } from '@/services/storage/EnhancedStorageService';
import { v4 as uuidv4 } from 'uuid';
import { getStoredAuthToken } from '@/lib/auth-storage';
import { seriesApi, SeriesRecord } from '@/lib/apiClient';

const isAuthenticatedSession = (): boolean => Boolean(getStoredAuthToken());

type SeriesInput = Omit<Series, 'createdAt' | 'updatedAt'> & {
  createdAt?: Date;
  updatedAt?: Date;
};

const normalizeRemoteSeries = (series: SeriesRecord): Series => ({
  id: series.id,
  name: series.name,
  description: series.description,
  author: series.author,
  coverImage: series.coverImage,
  books: series.books || [],
  totalBooks: series.totalBooks,
  readingOrder: series.readingOrder,
  customOrder: series.customOrder,
  status: series.status,
  genre: series.genre,
  isTracked: series.isTracked,
  hasUpcoming: series.hasUpcoming,
  apiEnriched: series.apiEnriched,
  createdAt: new Date(series.createdAt || series.dateAdded || new Date().toISOString()),
  updatedAt: new Date(series.updatedAt || series.lastModified || new Date().toISOString()),
  timestamps: series.timestamps,
  dateAdded: series.dateAdded,
  lastModified: series.lastModified,
});

const normalizeLocalSeries = (series: IndexedDbSeries): Series => ({
  ...series,
  createdAt: new Date(series.dateAdded || new Date().toISOString()),
  updatedAt: new Date(series.lastModified || new Date().toISOString()),
  genre: series.categories,
});

const serializeSeriesRecord = (series: SeriesInput): SeriesRecord => {
  const createdAt = series.createdAt || new Date();
  const updatedAt = series.updatedAt || createdAt;

  return {
    id: series.id,
    name: series.name,
    description: series.description,
    author: series.author,
    coverImage: series.coverImage,
    books: series.books || [],
    totalBooks: series.totalBooks,
    readingOrder: series.readingOrder,
    customOrder: series.customOrder,
    status: series.status,
    genre: series.genre,
    isTracked: series.isTracked,
    hasUpcoming: series.hasUpcoming,
    apiEnriched: series.apiEnriched,
    timestamps: series.timestamps,
    dateAdded: series.dateAdded || createdAt.toISOString(),
    lastModified: series.lastModified || updatedAt.toISOString(),
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
  };
};

const toIndexedDbSeries = (series: SeriesInput): IndexedDbSeries => ({
  id: series.id,
  name: series.name,
  description: series.description,
  author: series.author,
  coverImage: series.coverImage,
  categories: series.genre,
  timestamps: series.timestamps,
  dateAdded: series.dateAdded || (series.createdAt || new Date()).toISOString(),
  lastModified: series.lastModified || (series.updatedAt || new Date()).toISOString(),
  books: series.books || [],
  totalBooks: series.totalBooks || series.books?.length || 0,
  completedBooks: 0,
  readingOrder: series.readingOrder,
  customOrder: series.customOrder,
  status: series.status,
  readingProgress: 0,
  isTracked: series.isTracked,
  hasUpcoming: series.hasUpcoming,
  apiEnriched: series.apiEnriched,
});

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
    if (isAuthenticatedSession()) {
      const remoteSeries = await seriesApi.getAll();
      return remoteSeries.map(normalizeRemoteSeries);
    }

    try {
      const seriesFromDB = await enhancedStorageService.getSeries();
      return seriesFromDB.map((series) => normalizeLocalSeries(series as IndexedDbSeries));
    } catch (error) {
      console.error('Error getting all series from IndexedDB:', error);
      return [];
    }
  }
  
  /**
   * Get a series by ID
   */
  async getById(id: string): Promise<Series | null> {
    if (isAuthenticatedSession()) {
      const remoteSeries = await seriesApi.getById(id);
      return normalizeRemoteSeries(remoteSeries);
    }

    try {
      const seriesFromDB = await enhancedStorageService.getSeriesById(id);
      if (seriesFromDB) {
        return normalizeLocalSeries(seriesFromDB as IndexedDbSeries);
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
  async add(series: Partial<SeriesInput> & Omit<SeriesInput, 'name'> & { name: string }): Promise<Series> {
    const now = new Date();
    const newSeries: Series = {
      ...series,
      id: series.id || `series-${uuidv4()}`,
      books: series.books || [],
      readingOrder: series.readingOrder || 'publication',
      isTracked: series.isTracked ?? false,
      createdAt: now,
      updatedAt: now
    };
    
    if (isAuthenticatedSession()) {
      const createdSeries = await seriesApi.create(serializeSeriesRecord(newSeries));
      return normalizeRemoteSeries(createdSeries);
    }

    try {
      await enhancedStorageService.saveSeries(toIndexedDbSeries(newSeries));
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
    
    if (isAuthenticatedSession()) {
      const remoteSeries = await seriesApi.update(id, serializeSeriesRecord(updatedSeries));
      return normalizeRemoteSeries(remoteSeries);
    }

    try {
      await enhancedStorageService.saveSeries(toIndexedDbSeries(updatedSeries));
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
    if (isAuthenticatedSession()) {
      await seriesApi.delete(id);
      return true;
    }

    try {
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
