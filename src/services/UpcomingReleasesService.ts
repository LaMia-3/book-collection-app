import { UpcomingBook } from '@/types/series';
import { upcomingReleasesRepository } from '@/repositories/UpcomingReleasesRepository';
import { seriesRepository } from '@/repositories/SeriesRepository';
import { notificationRepository } from '@/repositories/NotificationRepository';
import { upcomingReleasesApiService } from '@/services/api/UpcomingReleasesApiService';

/**
 * Service for managing upcoming book releases
 */
export class UpcomingReleasesService {
  /**
   * Get all upcoming releases
   */
  async getAllReleases(): Promise<UpcomingBook[]> {
    return upcomingReleasesRepository.getAll();
  }
  
  /**
   * Get releases for a specific series
   */
  async getReleasesForSeries(seriesId: string): Promise<UpcomingBook[]> {
    return upcomingReleasesRepository.getBySeriesId(seriesId);
  }
  
  /**
   * Add a manual upcoming release
   */
  async addManualRelease(releaseData: Omit<UpcomingBook, 'id' | 'isUserContributed'>): Promise<UpcomingBook> {
    // Set flag indicating this is user-contributed data
    const upcomingBook = await upcomingReleasesRepository.add({
      ...releaseData,
      isUserContributed: true
    });
    
    // Update series to indicate it has upcoming books
    await seriesRepository.update(releaseData.seriesId, { hasUpcoming: true });
    
    // Create notification if the series is being tracked
    const series = await seriesRepository.getById(releaseData.seriesId);
    if (series?.isTracked) {
      await notificationRepository.add({
        title: `New Release: ${upcomingBook.title}`,
        message: `A new book in ${series.name} by ${upcomingBook.author} is coming on ${upcomingBook.expectedReleaseDate?.toLocaleDateString()}.`,
        type: 'release',
        seriesId: series.id,
        bookId: upcomingBook.id,
        actionUrl: upcomingBook.preOrderLink
      });
    }
    
    return upcomingBook;
  }
  
  /**
   * Delete an upcoming release
   */
  async deleteRelease(id: string): Promise<boolean> {
    // Delete any notifications related to this release
    const allNotifications = await notificationRepository.getAll();
    const releaseNotifications = allNotifications.filter(n => n.bookId === id);
    
    for (const notification of releaseNotifications) {
      await notificationRepository.delete(notification.id);
    }
    
    return upcomingReleasesRepository.delete(id);
  }
  
  /**
   * Update an upcoming release
   */
  async updateRelease(id: string, updates: Partial<UpcomingBook>): Promise<UpcomingBook | null> {
    return upcomingReleasesRepository.update(id, updates);
  }
  
  /**
   * Refresh upcoming releases for a series from API
   */
  async refreshReleases(seriesId: string): Promise<UpcomingBook[]> {
    const series = await seriesRepository.getById(seriesId);
    if (!series) return [];
    
    try {
      // Keep manual entries
      const existingReleases = await upcomingReleasesRepository.getBySeriesId(seriesId);
      const manualEntries = existingReleases.filter(release => release.isUserContributed);
      
      // Delete API-sourced entries
      for (const release of existingReleases) {
        if (!release.isUserContributed) {
          await upcomingReleasesRepository.delete(release.id);
        }
      }
      
      // Fetch fresh data from API
      const apiReleases = await upcomingReleasesApiService.searchUpcomingReleases(
        series.name,
        series.author
      );
      
      // Add new releases from API
      const addedReleases: UpcomingBook[] = [];
      for (const release of apiReleases) {
        // Skip if we already have a manual entry with the same title
        if (manualEntries.some(me => me.title.toLowerCase() === release.title.toLowerCase())) {
          continue;
        }
        
        // Add to database
        const newRelease = await upcomingReleasesRepository.add({
          ...release,
          seriesId,
          isUserContributed: false
        });
        
        addedReleases.push(newRelease);
        
        // Create notification if the series is being tracked
        if (series.isTracked) {
          await notificationRepository.add({
            title: `New Release: ${release.title}`,
            message: `A new book in ${series.name} by ${release.author} is coming on ${release.expectedReleaseDate?.toLocaleDateString()}.`,
            type: 'release',
            seriesId,
            bookId: newRelease.id,
            actionUrl: release.preOrderLink
          });
        }
      }
      
      // Update series to indicate it has upcoming books if any releases
      const finalReleases = [...manualEntries, ...addedReleases];
      if (finalReleases.length > 0 && !series.hasUpcoming) {
        await seriesRepository.update(seriesId, { hasUpcoming: true });
      }
      
      return finalReleases;
    } catch (error) {
      console.error('Error refreshing upcoming releases:', error);
      
      // Return existing releases in case of error
      return upcomingReleasesRepository.getBySeriesId(seriesId);
    }
  }
  
  /**
   * Check for upcoming releases for all tracked series
   */
  async checkAllTrackedSeries(): Promise<number> {
    const trackedSeries = await seriesRepository.getTracked();
    let newReleasesCount = 0;
    
    for (const series of trackedSeries) {
      const freshReleases = await this.refreshReleases(series.id);
      newReleasesCount += freshReleases.length;
    }
    
    return newReleasesCount;
  }
  
  /**
   * Get upcoming releases that are due within a certain number of days
   */
  async getUpcomingReleasesInDays(days: number): Promise<UpcomingBook[]> {
    const now = new Date();
    const endDate = new Date();
    endDate.setDate(now.getDate() + days);
    
    return upcomingReleasesRepository.getUpcomingInRange(now, endDate);
  }
  
  /**
   * Convert an upcoming release to a regular book when published
   */
  async convertToReleasedBook(id: string): Promise<boolean> {
    // Logic to add to book collection would go here
    // For now, just delete from upcoming releases
    return upcomingReleasesRepository.delete(id);
  }
}

// Export a singleton instance
export const upcomingReleasesService = new UpcomingReleasesService();
