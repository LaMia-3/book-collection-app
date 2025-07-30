import { Series } from '@/types/series';
import { generateMockSeries } from '@/utils/mockApiData';

/**
 * Service for fetching series data from external APIs
 * Simplified mock implementation for development
 */
export class SeriesApiService {
  // Use mock data instead of making real API calls
  async getEnhancedSeriesInfo(bookId: string, title: string, author: string): Promise<Partial<Series> | null> {
    console.log('Mock API call for enhanced series info', { bookId, title, author });
    
    // Return a mock series based on the book title
    const mockSeries = generateMockSeries().find(s => {
      return s.name.toLowerCase().includes(title.toLowerCase()) || 
             (author && s.author?.toLowerCase().includes(author.toLowerCase()));
    });
    
    if (mockSeries) {
      return {
        name: mockSeries.name,
        description: mockSeries.description,
        author: mockSeries.author,
        coverImage: mockSeries.coverImage,
        status: mockSeries.status,
        totalBooks: mockSeries.totalBooks,
        genre: mockSeries.genre
      };
    }
    
    // Default mock series data
    return {
      name: title.split(':')[0] || 'Unknown Series',
      description: 'A captivating series of books that will keep you engaged from start to finish.',
      author: author,
      coverImage: 'https://picsum.photos/seed/series1/400/600',
      status: 'ongoing',
      totalBooks: 5,
      genre: ['Fiction']
    };
  }
}

// Export a singleton instance
export const seriesApiService = new SeriesApiService();
