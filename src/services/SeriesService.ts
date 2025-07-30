import { Series } from '@/types/series';
import { seriesRepository } from '@/repositories/SeriesRepository';
import { upcomingReleasesRepository } from '@/repositories/UpcomingReleasesRepository';
import { notificationRepository } from '@/repositories/NotificationRepository';
import { seriesApiService } from '@/services/api/SeriesApiService';
import { Book } from '@/types/book';

/**
 * Service for managing series operations
 */
export class SeriesService {
  /**
   * Get all series in the database
   */
  async getAllSeries(): Promise<Series[]> {
    return seriesRepository.getAll();
  }
  
  /**
   * Get a series by ID
   */
  async getSeriesById(id: string): Promise<Series | null> {
    return seriesRepository.getById(id);
  }
  
  /**
   * Get all series containing a specific book
   */
  async getSeriesByBookId(bookId: string): Promise<Series[]> {
    return seriesRepository.getByBookId(bookId);
  }
  
  /**
   * Create a new series
   */
  async createSeries(seriesData: Omit<Series, 'id' | 'createdAt' | 'updatedAt'>): Promise<Series> {
    return seriesRepository.add(seriesData);
  }
  
  /**
   * Update an existing series
   */
  async updateSeries(id: string, updates: Partial<Series>): Promise<Series | null> {
    return seriesRepository.update(id, updates);
  }
  
  /**
   * Delete a series and its related data
   */
  async deleteSeries(id: string): Promise<boolean> {
    // Delete related upcoming releases
    await upcomingReleasesRepository.deleteBySeriesId(id);
    
    // Delete related notifications
    const seriesNotifications = await notificationRepository.getBySeriesId(id);
    for (const notification of seriesNotifications) {
      await notificationRepository.delete(notification.id);
    }
    
    // Delete the series itself
    return seriesRepository.delete(id);
  }
  
  /**
   * Enable or disable tracking for a series
   */
  async toggleSeriesTracking(id: string, isTracked: boolean): Promise<Series | null> {
    const updatedSeries = await seriesRepository.setTracking(id, isTracked);
    
    if (updatedSeries && isTracked) {
      // Create notification for tracking enabled
      await notificationRepository.add({
        title: `Tracking ${updatedSeries.name}`,
        message: `You'll now receive notifications for new releases in this series.`,
        type: 'system',
        seriesId: updatedSeries.id,
      });
      
      // Check for upcoming releases to populate data
      await this.refreshUpcomingReleases(id);
    }
    
    return updatedSeries;
  }
  
  /**
   * Add a book to a series
   */
  async addBookToSeries(seriesId: string, bookId: string): Promise<Series | null> {
    return seriesRepository.addBook(seriesId, bookId);
  }
  
  /**
   * Remove a book from a series
   */
  async removeBookFromSeries(seriesId: string, bookId: string): Promise<Series | null> {
    return seriesRepository.removeBook(seriesId, bookId);
  }
  
  /**
   * Change the reading order of a series
   */
  async setReadingOrder(
    id: string, 
    readingOrder: 'publication' | 'chronological' | 'custom',
    customOrder?: string[]
  ): Promise<Series | null> {
    return seriesRepository.setReadingOrder(id, readingOrder, customOrder);
  }
  
  /**
   * Refresh a series with data from external APIs
   */
  async refreshSeriesData(id: string, representativeBook: Book): Promise<Series | null> {
    const series = await seriesRepository.getById(id);
    if (!series) return null;
    
    try {
      // Get enhanced data from API
      const enhancedData = await seriesApiService.getEnhancedSeriesInfo(
        representativeBook.googleBooksId || '',
        representativeBook.title,
        representativeBook.author
      );
      
      if (enhancedData) {
        // Update series with enhanced data
        const updatedSeries = await seriesRepository.update(id, {
          description: enhancedData.description || series.description,
          coverImage: enhancedData.coverImage || series.coverImage,
          status: enhancedData.status || series.status,
          genre: enhancedData.genre || series.genre,
          totalBooks: enhancedData.totalBooks || series.totalBooks,
          apiEnriched: true
        });
        
        // Refresh upcoming releases
        if (updatedSeries) {
          await this.refreshUpcomingReleases(id);
        }
        
        return updatedSeries;
      }
    } catch (error) {
      console.error('Error refreshing series data:', error);
    }
    
    return series;
  }
  
  /**
   * Refresh upcoming releases for a series
   */
  async refreshUpcomingReleases(seriesId: string): Promise<boolean> {
    const series = await seriesRepository.getById(seriesId);
    if (!series) return false;
    
    try {
      // Get data from API
      const upcomingReleases = await seriesApiService.getUpcomingReleases(
        series.name,
        series.author
      );
      
      if (upcomingReleases.length > 0) {
        // Update series to indicate it has upcoming books
        await seriesRepository.update(seriesId, { hasUpcoming: true });
        
        // Save upcoming books
        for (const release of upcomingReleases) {
          // Skip if already exists
          const existingReleases = await upcomingReleasesRepository.getBySeriesId(seriesId);
          if (existingReleases.some(er => er.title === release.title)) {
            continue;
          }
          
          await upcomingReleasesRepository.add({
            ...release,
            seriesId
          });
          
          // Create notification for tracked series
          if (series.isTracked) {
            await notificationRepository.add({
              title: `New Release: ${release.title}`,
              message: `A new book in ${series.name} by ${release.author} is coming on ${release.expectedReleaseDate?.toLocaleDateString()}.`,
              type: 'release',
              seriesId,
              bookId: release.id,
              actionUrl: release.preOrderLink
            });
          }
        }
        
        return true;
      }
    } catch (error) {
      console.error('Error refreshing upcoming releases:', error);
    }
    
    return false;
  }
  
  /**
   * Detect series from a collection of books
   */
  async detectSeriesFromBooks(books: Book[]): Promise<Series[]> {
    const detectedSeries = await seriesApiService.detectSeriesFromBooks(books);
    const createdSeries: Series[] = [];
    
    for (const seriesData of detectedSeries) {
      const newSeries = await this.createSeries({
        name: seriesData.name,
        description: seriesData.description,
        author: seriesData.author,
        books: seriesData.books || [],
        coverImage: seriesData.coverImage,
        genre: seriesData.genre,
        totalBooks: seriesData.totalBooks,
        status: seriesData.status,
        readingOrder: 'publication',
        isTracked: false,
      });
      
      createdSeries.push(newSeries);
    }
    
    return createdSeries;
  }
}

// Export a singleton instance
export const seriesService = new SeriesService();
