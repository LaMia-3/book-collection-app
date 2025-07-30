import { UpcomingBook } from '@/types/series';
import { DatabaseService } from '@/services/DatabaseService';
import { v4 as uuidv4 } from 'uuid';

/**
 * Repository for managing upcoming book releases in the database
 */
export class UpcomingReleasesRepository {
  private readonly dbService: DatabaseService;
  private readonly storeName = 'upcomingReleases';
  
  constructor(dbService: DatabaseService) {
    this.dbService = dbService;
  }
  
  /**
   * Get all upcoming book releases
   */
  async getAll(): Promise<UpcomingBook[]> {
    return this.dbService.getAll<UpcomingBook>(this.storeName);
  }
  
  /**
   * Get upcoming releases by series ID
   */
  async getBySeriesId(seriesId: string): Promise<UpcomingBook[]> {
    const allReleases = await this.getAll();
    return allReleases.filter(release => release.seriesId === seriesId);
  }
  
  /**
   * Get upcoming release by ID
   */
  async getById(id: string): Promise<UpcomingBook | null> {
    return this.dbService.getById<UpcomingBook>(this.storeName, id);
  }
  
  /**
   * Get upcoming releases for tracked series
   */
  async getForTrackedSeries(trackedSeriesIds: string[]): Promise<UpcomingBook[]> {
    const allReleases = await this.getAll();
    return allReleases.filter(release => trackedSeriesIds.includes(release.seriesId));
  }
  
  /**
   * Get upcoming releases within a specific date range
   */
  async getUpcomingInRange(startDate: Date, endDate: Date): Promise<UpcomingBook[]> {
    const allReleases = await this.getAll();
    return allReleases.filter(release => {
      if (!release.expectedReleaseDate) return false;
      
      const releaseDate = new Date(release.expectedReleaseDate);
      return releaseDate >= startDate && releaseDate <= endDate;
    });
  }
  
  /**
   * Add a new upcoming book release
   */
  async add(upcomingBook: Omit<UpcomingBook, 'id'>): Promise<UpcomingBook> {
    const newBook: UpcomingBook = {
      id: `upcoming-${uuidv4()}`,
      ...upcomingBook
    };
    
    await this.dbService.add(this.storeName, newBook);
    return newBook;
  }
  
  /**
   * Update an existing upcoming book release
   */
  async update(id: string, updates: Partial<UpcomingBook>): Promise<UpcomingBook | null> {
    const release = await this.getById(id);
    if (!release) return null;
    
    const updatedRelease: UpcomingBook = {
      ...release,
      ...updates
    };
    
    await this.dbService.update(this.storeName, id, updatedRelease);
    return updatedRelease;
  }
  
  /**
   * Update release date of an upcoming book
   */
  async updateReleaseDate(id: string, newDate: Date): Promise<UpcomingBook | null> {
    return this.update(id, { expectedReleaseDate: newDate });
  }
  
  /**
   * Update the preorder link for an upcoming book
   */
  async updatePreorderLink(id: string, link: string): Promise<UpcomingBook | null> {
    return this.update(id, { preOrderLink: link });
  }
  
  /**
   * Mark a book as user contributed or API-sourced
   */
  async setIsUserContributed(id: string, isUserContributed: boolean): Promise<UpcomingBook | null> {
    return this.update(id, { isUserContributed });
  }
  
  /**
   * Delete an upcoming book release
   */
  async delete(id: string): Promise<boolean> {
    return this.dbService.delete(this.storeName, id);
  }
  
  /**
   * Delete all upcoming releases for a series
   */
  async deleteBySeriesId(seriesId: string): Promise<void> {
    const releases = await this.getBySeriesId(seriesId);
    for (const release of releases) {
      await this.delete(release.id);
    }
  }
  
  /**
   * Convert an upcoming release to a regular book when it's released
   */
  async markAsReleased(id: string): Promise<boolean> {
    return this.delete(id); // Delete from upcoming releases
    // Additional logic to add to regular books would be implemented in a service
  }
}

// Export a singleton instance
export const upcomingReleasesRepository = new UpcomingReleasesRepository(new DatabaseService());
