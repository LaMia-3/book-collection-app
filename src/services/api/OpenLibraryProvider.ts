import { Book, ReadingStatus } from '@/types/models/Book';
import { 
  BookApiProvider, 
  SearchParams, 
  SearchResult, 
  BookSearchItem 
} from '@/types/api/BookApiProvider';

/**
 * Provider implementation for the Open Library API
 */
export class OpenLibraryProvider implements BookApiProvider {
  readonly id = 'openlib';
  readonly name = 'Open Library';

  private readonly searchBaseUrl = 'https://openlibrary.org/search.json';
  private readonly detailsBaseUrl = 'https://openlibrary.org/works';
  private readonly coverBaseUrl = 'https://covers.openlibrary.org/b';
  
  /**
   * Search for books using the Open Library API
   * @param params Search parameters
   * @returns Search result
   */
  async searchBooks(params: SearchParams): Promise<SearchResult> {
    const { query, type = 'all', page = 1, limit = 10 } = params;
    
    // Calculate start index (Open Library uses 0-based pagination)
    const offset = (page - 1) * limit;
    
    // Construct search query based on type
    let searchQuery = query;
    let searchField = '';
    
    if (type !== 'all') {
      // Map our search type to Open Library API field
      const fieldMapping: Record<string, string> = {
        'title': 'title',
        'author': 'author',
        'isbn': 'isbn'
      };
      searchField = `&${fieldMapping[type]}=${encodeURIComponent(query)}`;
      searchQuery = ''; // Use empty query with field search
    }
    
    // Make API request
    const response = await fetch(
      `${this.searchBaseUrl}?q=${encodeURIComponent(searchQuery)}${searchField}&offset=${offset}&limit=${limit}`
    );
    
    if (!response.ok) {
      throw new Error(`Open Library API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Transform to our common format
    const books: BookSearchItem[] = (data.docs || []).map((item: any) => {
      // Extract cover ID for thumbnail URL
      const coverId = item.cover_i;
      const thumbnailUrl = coverId 
        ? `${this.coverBaseUrl}/id/${coverId}-M.jpg` 
        : undefined;

      return {
        id: item.key.replace('/works/', ''),
        title: item.title || 'Unknown Title',
        author: item.author_name?.[0] || 'Unknown Author',
        thumbnail: thumbnailUrl,
        publishedDate: item.first_publish_year?.toString(),
        provider: this.id
      };
    });
    
    return {
      books,
      totalItems: data.numFound || books.length,
      page,
      hasMore: offset + books.length < (data.numFound || 0)
    };
  }

  /**
   * Get detailed information for a specific book
   * @param id Book ID from Open Library (work ID)
   * @returns Book details
   */
  async getBookDetails(id: string): Promise<Book> {
    // First, get the work details
    const workResponse = await fetch(`${this.detailsBaseUrl}/${id}.json`);
    
    if (!workResponse.ok) {
      throw new Error(`Open Library API error: ${workResponse.status} ${workResponse.statusText}`);
    }
    
    const workData = await workResponse.json();
    
    // Get the first edition if available for more details
    let editionData: any = {};
    if (workData.editions_key && workData.editions_key.length > 0) {
      try {
        const editionResponse = await fetch(`https://openlibrary.org/books/${workData.editions_key[0]}.json`);
        if (editionResponse.ok) {
          editionData = await editionResponse.json();
        }
      } catch (error) {
        console.warn('Could not fetch edition details', error);
      }
    }
    
    // Extract cover ID for thumbnail
    const coverId = workData.covers?.[0] || editionData.covers?.[0];
    const thumbnailUrl = coverId 
      ? `${this.coverBaseUrl}/id/${coverId}-M.jpg` 
      : undefined;
    
    // Transform to our Book format
    return {
      id: crypto.randomUUID(), // Generate a unique ID for our system
      title: workData.title || 'Unknown Title',
      author: workData.author_name?.[0] || editionData.authors?.[0]?.name || 'Unknown Author',
      genre: workData.subjects?.[0],
      description: workData.description?.value || workData.description,
      publishedDate: workData.first_publish_date || editionData.publish_date,
      pageCount: editionData.number_of_pages || undefined,
      thumbnail: thumbnailUrl,
      sourceId: id,
      sourceType: 'openlib',
      spineColor: Math.floor(Math.random() * 8) + 1, // Random spine color
      addedDate: new Date().toISOString(),
      status: ReadingStatus.TO_READ // Default status for newly added books
    };
  }

  /**
   * Check if the Open Library API is available
   * @returns True if available, false otherwise
   */
  async isAvailable(): Promise<boolean> {
    try {
      // Make a simple query to check if the API is responding
      const response = await fetch(`${this.searchBaseUrl}?q=test&limit=1`);
      return response.ok;
    } catch {
      return false;
    }
  }
}

// Create a singleton instance
export const openLibraryProvider = new OpenLibraryProvider();

export default openLibraryProvider;
