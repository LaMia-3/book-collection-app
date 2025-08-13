import { UpcomingBook } from '@/types/series';

/**
 * Service for fetching upcoming book releases
 * Uses external APIs and local data to provide upcoming book releases
 */
export class UpcomingReleasesApiService {
  private cache: Record<string, UpcomingBook[]> = {};

  /**
   * Searches for upcoming book releases by series name and author
   */
  async searchUpcomingReleases(seriesName: string, author?: string): Promise<UpcomingBook[]> {
    console.log('Searching for upcoming releases', { seriesName, author });
    
    // Check cache
    const cacheKey = `${seriesName}-${author || ''}`;
    if (this.cache[cacheKey]) {
      return this.cache[cacheKey];
    }
    
    try {
      // Use Google Books API to search for upcoming books
      const query = encodeURIComponent(`${seriesName} ${author || ''} new release upcoming`);
      const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${query}&orderBy=newest&maxResults=5`);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.items || data.items.length === 0) {
        return [];
      }
      
      // Process results into UpcomingBook format
      const now = new Date();
      const results = data.items
        .filter((item: any) => {
          const info = item.volumeInfo || {};
          const publishedDate = info.publishedDate;
          
          // If it has a future publication date or was published very recently
          if (publishedDate) {
            const date = new Date(publishedDate);
            // Include if date is in the future or within the last 30 days
            return date > now || (now.getTime() - date.getTime() < 30 * 24 * 60 * 60 * 1000);
          }
          return false;
        })
        .map((item: any) => this.convertToUpcomingBook(item, seriesName))
        .filter(Boolean);
      
      // Cache results
      this.cache[cacheKey] = results;
      return results;
    } catch (error) {
      console.error('Error fetching upcoming releases:', error);
      return [];
    }
  }
  
  /**
   * Converts Google Books API item to UpcomingBook format
   */
  private convertToUpcomingBook(item: any, seriesName: string): UpcomingBook | null {
    try {
      const volumeInfo = item.volumeInfo || {};
      const title = volumeInfo.title;
      const author = volumeInfo.authors?.[0] || 'Unknown Author';
      
      if (!title) return null;
      
      const publishedDate = volumeInfo.publishedDate ? new Date(volumeInfo.publishedDate) : new Date();
      
      // Generate a stable ID based on the book info
      const id = `upcoming-${encodeURIComponent(title.toLowerCase().replace(/\s+/g, '-'))}`;
      
      return {
        id,
        title,
        seriesId: `series-${encodeURIComponent(seriesName.toLowerCase().replace(/\s+/g, '-'))}`,
        seriesName,
        author,
        expectedReleaseDate: publishedDate,
        coverImageUrl: volumeInfo.imageLinks?.thumbnail || '',
        preOrderLink: item.saleInfo?.buyLink || '',
        synopsis: volumeInfo.description || `Upcoming book in the ${seriesName} series.`,
        isUserContributed: false,
        amazonProductId: item.id || ''
      };
    } catch (error) {
      console.error('Error converting book item:', error);
      return null;
    }
  }
  
  /**
   * Allow users to add their own upcoming releases when API data isn't available
   */
  async addUserContributedRelease(release: Omit<UpcomingBook, 'id' | 'isUserContributed'>): Promise<UpcomingBook> {
    // Generate an ID for the user-contributed release
    const id = `upcoming-user-${Date.now()}`;
    const newRelease: UpcomingBook = {
      ...release,
      id,
      isUserContributed: true
    };
    
    // Add to cache with a special key
    const cacheKey = `user-${release.seriesName}`;
    if (!this.cache[cacheKey]) {
      this.cache[cacheKey] = [];
    }
    this.cache[cacheKey].push(newRelease);
    
    return newRelease;
  }
}

// Export a singleton instance
export const upcomingReleasesApiService = new UpcomingReleasesApiService();
