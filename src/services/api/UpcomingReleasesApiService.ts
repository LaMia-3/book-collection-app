import { UpcomingBook } from '@/types/series';

/**
 * Service for fetching upcoming book releases
 * Simplified mock implementation for development
 */
export class UpcomingReleasesApiService {
  private cache: Record<string, UpcomingBook[]> = {};

  /**
   * Searches for upcoming book releases by series name and author
   */
  async searchUpcomingReleases(seriesName: string, author?: string): Promise<UpcomingBook[]> {
    console.log('Mock API call for upcoming releases', { seriesName, author });
    
    // Check cache
    const cacheKey = `${seriesName}-${author || ''}`;
    if (this.cache[cacheKey]) {
      return this.cache[cacheKey];
    }

    // Generate mock data
    const mockData = this.getMockUpcomingReleases(seriesName, author);
    this.cache[cacheKey] = mockData;
    
    return mockData;
  }
  
  /**
   * Generate mock upcoming releases for demo purposes
   */
  private getMockUpcomingReleases(seriesName: string, author?: string): UpcomingBook[] {
    const normalizedSeriesName = seriesName.toLowerCase();
    const now = new Date();
    const mockReleases: UpcomingBook[] = [];
    
    // Generate different mock data based on series name
    if (normalizedSeriesName.includes('stormlight') || normalizedSeriesName.includes('archive')) {
      mockReleases.push({
        id: 'upcoming-stormlight-1',
        title: 'The Stormlight Archive Book 5',
        seriesId: `series-${normalizedSeriesName.replace(/\s/g, '-')}`,
        seriesName: 'The Stormlight Archive',
        author: author || 'Brandon Sanderson',
        expectedReleaseDate: new Date(now.getFullYear(), now.getMonth() + 4, 15),
        coverImageUrl: 'https://picsum.photos/seed/stormlight/400/600',
        preOrderLink: 'https://www.amazon.com/',
        synopsis: 'The fifth book in the New York Times bestselling Stormlight Archive epic fantasy series.',
        isUserContributed: false,
        amazonProductId: 'B09LCJPR13'
      });
    } else if (normalizedSeriesName.includes('mistborn')) {
      mockReleases.push({
        id: 'upcoming-mistborn-1',
        title: 'The Lost Metal',
        seriesId: `series-${normalizedSeriesName.replace(/\s/g, '-')}`,
        seriesName: 'Mistborn',
        author: author || 'Brandon Sanderson',
        expectedReleaseDate: new Date(now.getFullYear(), now.getMonth() + 1, 10),
        coverImageUrl: 'https://picsum.photos/seed/mistborn/400/600',
        preOrderLink: 'https://www.amazon.com/',
        synopsis: 'The final novel of the Mistborn Era 2 series.',
        isUserContributed: false,
        amazonProductId: 'B0B7YGLCVS'
      });
    } else {
      // Generic upcoming book for any other series
      mockReleases.push({
        id: `upcoming-${normalizedSeriesName.replace(/\s/g, '-')}-1`,
        title: `Next Book in ${seriesName}`,
        seriesId: `series-${normalizedSeriesName.replace(/\s/g, '-')}`,
        seriesName: seriesName,
        author: author || 'Unknown Author',
        expectedReleaseDate: new Date(now.getFullYear(), now.getMonth() + Math.floor(Math.random() * 6) + 1, Math.floor(Math.random() * 28) + 1),
        coverImageUrl: '',
        preOrderLink: 'https://www.amazon.com/',
        synopsis: `The upcoming book in the ${seriesName} series.`,
        isUserContributed: false,
        amazonProductId: `mock-${Date.now()}`
      });
    }
    
    return mockReleases;
  }
}

// Export a singleton instance
export const upcomingReleasesApiService = new UpcomingReleasesApiService();
