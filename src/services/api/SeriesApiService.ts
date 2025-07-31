import { Series } from '@/types/series';
import { Book } from '@/types/book';

export interface SeriesDetectionResult {
  series: Partial<Series>;
  confidence: number; // 0-100
  source: string; // 'google' | 'openlib' | 'title' | 'collection'
  matchedBooks?: Book[]; // Other books that might be in the same series
}

/**
 * Service for fetching series data from external APIs
 */
export class SeriesApiService {
  private baseUrl = 'https://www.googleapis.com/books/v1';
  private openLibraryBaseUrl = 'https://openlibrary.org/api';
  
  /**
   * Get enhanced series information by searching APIs with book info
   * Returns null if no series is detected
   */
  async getEnhancedSeriesInfo(bookId: string, title: string, author: string): Promise<Partial<Series> | null> {
    try {
      const result = await this.detectSeries(bookId, title, author);
      return result ? result.series : null;
    } catch (error) {
      console.error('Error fetching series info:', error);
      return null;
    }
  }
  
  /**
   * Detect if a book belongs to a series using multiple methods
   * Returns details about the detected series with confidence level
   */
  async detectSeries(bookId: string, title: string, author: string, existingBooks: Book[] = []): Promise<SeriesDetectionResult | null> {
    try {
      // HIGHEST PRIORITY: Direct API data (Google Books or OpenLibrary)
      // This provides the most accurate and official series information
      let apiDirectResult: SeriesDetectionResult | null = null;
      if (bookId) {
        // Try to get direct series information from APIs
        apiDirectResult = await this.detectSeriesDirectly(bookId);
        if (apiDirectResult) {
          // Always trust direct API data when available - it's authoritative
          return apiDirectResult;
        }
      }
      
      // SECOND PRIORITY: Matching with user's existing series collection
      // This ensures consistency in user's library and avoids duplicate series
      const existingSeriesResult = await this.detectSeriesFromExistingCollection(title, author);
      if (existingSeriesResult && existingSeriesResult.confidence >= 70) {
        return existingSeriesResult;
      }
      
      // THIRD PRIORITY: Other detection methods (inference-based)
      // Only use these when we don't have API data or existing series match
      const results = await Promise.all([
        this.detectSeriesFromGoogleBooks(bookId, title, author),
        this.detectSeriesFromTitlePattern(title, author),
        this.detectSeriesFromExistingBooks(title, author, existingBooks)
      ]);
      
      // Filter out null results and sort by confidence
      const validResults = results.filter(Boolean) as SeriesDetectionResult[];
      if (validResults.length === 0) return null;
      
      // Return the result with highest confidence
      return validResults.sort((a, b) => b.confidence - a.confidence)[0];
    } catch (error) {
      console.error('Error in series detection:', error instanceof Error ? error.message : 'Unknown error');
      return null;
    }
  }
  
  /**
   * Detect series from Google Books API
   */
  private async detectSeriesFromGoogleBooks(bookId: string, title: string, author: string): Promise<SeriesDetectionResult | null> {
    try {
      // Search for books in the series
      const query = encodeURIComponent(`${title} ${author} series`);
      const response = await fetch(`${this.baseUrl}/volumes?q=${query}&maxResults=10`);
      
      if (!response.ok) {
        throw new Error(`Google Books API error: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.items || data.items.length === 0) {
        return null;
      }
      
      // Look for books that mention "series" in the title or description
      const seriesBooks = data.items.filter((item: any) => {
        const volumeInfo = item.volumeInfo || {};
        const seriesInfo = volumeInfo.seriesInfo;
        const description = volumeInfo.description || '';
        const bookTitle = volumeInfo.title || '';
        
        return seriesInfo || 
               description.toLowerCase().includes('series') || 
               bookTitle.toLowerCase().includes('series') ||
               bookTitle.toLowerCase().includes('volume') ||
               bookTitle.toLowerCase().includes('book') && /\d+/.test(bookTitle);
      });
      
      if (seriesBooks.length === 0) {
        return null;
      }
      
      // Try to find the best candidate
      let bestMatch = seriesBooks[0];
      let highestSimilarity = 0;
      let potentialSeriesName = "";
      
      for (const book of seriesBooks) {
        const volumeInfo = book.volumeInfo;
        const extractedName = this.extractSeriesName(volumeInfo.title, title);
        
        if (extractedName) {
          // Calculate how similar this book is to our target book
          const similarity = this.calculateTitleSimilarity(title, volumeInfo.title);
          
          if (similarity > highestSimilarity) {
            highestSimilarity = similarity;
            bestMatch = book;
            potentialSeriesName = extractedName;
          }
        }
      }
      
      const volumeInfo = bestMatch.volumeInfo;
      const seriesName = potentialSeriesName || this.extractSeriesName(volumeInfo.title, title) || title.split(':')[0];
      
      // Calculate confidence based on multiple factors
      let confidence = 0;
      
      // Factor 1: Title explicitly mentions "series"
      if (volumeInfo.title?.toLowerCase().includes('series')) confidence += 40;
      
      // Factor 2: Number of potential series books found
      confidence += Math.min(seriesBooks.length * 5, 25);
      
      // Factor 3: Similarity between books
      confidence += Math.round(highestSimilarity * 20);
      
      // Factor 4: Clear volume/book number pattern
      if (/book\s\d+|volume\s\d+|#\d+|\(\s*\d+\s*\)/.test(volumeInfo.title)) {
        confidence += 15;
      }
      
      return {
        series: {
          name: seriesName,
          description: volumeInfo.description,
          author: volumeInfo.authors ? volumeInfo.authors[0] : author,
          coverImage: volumeInfo.imageLinks?.thumbnail,
          status: this.inferSeriesStatus(seriesBooks),
          totalBooks: this.estimateTotalBooks(seriesBooks),
          genre: volumeInfo.categories
        },
        confidence: Math.min(confidence, 100),
        source: 'google'
      };
    } catch (error) {
      console.error('Error detecting series from Google Books:', error);
      return null;
    }
  }
  
  /**
   * Detect series based on title patterns
   */
  private async detectSeriesFromTitlePattern(title: string, author: string): Promise<SeriesDetectionResult | null> {
    const seriesName = this.extractSeriesName(title, title);
    if (!seriesName) return null;
    
    // Calculate confidence based on pattern clarity
    let confidence = 0;
    
    // Factor 1: Clear series naming pattern
    if (/series/i.test(title)) confidence += 40;
    else if (/book\s\d+|volume\s\d+/i.test(title)) confidence += 35;
    else if (/#\d+/i.test(title)) confidence += 30;
    else if (/\((?:book|vol\.?)\s\d+\)/i.test(title)) confidence += 25;
    else if (title.includes(':')) confidence += 15;
    
    // Extract the potential volume number
    const volumeMatch = title.match(/(?:book|volume|#|\()\s*(\d+)/i);
    const volumeNumber = volumeMatch ? parseInt(volumeMatch[1]) : undefined;
    
    return {
      series: {
        name: seriesName,
        author,
        totalBooks: volumeNumber ? Math.max(volumeNumber, 3) : undefined // Assume at least 3 books if we found a volume number
      },
      confidence,
      source: 'title'
    };
  }
  
  /**
   * Try to detect if this book belongs to a series based on existing books in collection
   */
  /**
   * Directly detect series from Google Books API or OpenLibrary using volume ID
   * This provides much more reliable series information than inferring from titles
   * THIS IS THE HIGHEST PRIORITY SOURCE FOR SERIES INFORMATION
   */
  private async detectSeriesDirectly(bookId: string): Promise<SeriesDetectionResult | null> {
    try {
      // Try different APIs based on the ID format
      if (bookId.startsWith('gb_')) {
        // Google Books ID
        return await this.detectSeriesFromGoogleBooksDirectly(bookId);
      } else if (bookId.startsWith('OL')) {
        // Open Library ID
        return await this.detectSeriesFromOpenLibraryDirectly(bookId);
      }
      
      return null;
    } catch (error) {
      console.error('Error in direct series detection:', error instanceof Error ? error.message : 'Unknown error');
      return null;
    }
  }
  
  /**
   * Directly detect series from Google Books API using volume ID
   * This provides official series information directly from Google Books
   */
  private async detectSeriesFromGoogleBooksDirectly(bookId: string): Promise<SeriesDetectionResult | null> {
    try {
      
      // Make direct API call to get volume info
      const response = await fetch(`${this.baseUrl}/volumes/${bookId}`);
      
      if (!response.ok) {
        throw new Error(`Google Books API error: ${response.statusText}`);
      }
      
      const data = await response.json();
      const volumeInfo = data.volumeInfo;
      
      // Check for explicit series information
      if (volumeInfo && volumeInfo.seriesInfo) {
        // We have direct series information!
        return {
          series: {
            name: volumeInfo.seriesInfo.seriesTitle || 'Unknown Series',
            description: volumeInfo.description,
            author: volumeInfo.authors ? volumeInfo.authors[0] : undefined,
            coverImage: volumeInfo.imageLinks?.thumbnail,
            totalBooks: volumeInfo.seriesInfo.booksInSeries,
            genre: volumeInfo.categories,
            status: volumeInfo.seriesInfo.seriesComplete ? 'completed' : 'ongoing'
          },
          confidence: 95, // Very high confidence for direct API match
          source: 'google_direct'
        };
      }
      
      // Try to find series info in industry identifiers
      // Sometimes series info is embedded in BISAC categories or other metadata
      if (volumeInfo && volumeInfo.industryIdentifiers) {
        for (const identifier of volumeInfo.industryIdentifiers) {
          // Look for series info in BISAC subjects
          if (identifier.type === 'BISAC' && identifier.identifier.includes('Series')) {
            const seriesMatch = identifier.identifier.match(/([^/]+)\s+Series/i);
            if (seriesMatch) {
              return {
                series: {
                  name: seriesMatch[1].trim(),
                  description: volumeInfo.description,
                  author: volumeInfo.authors ? volumeInfo.authors[0] : undefined,
                  coverImage: volumeInfo.imageLinks?.thumbnail,
                  genre: volumeInfo.categories
                },
                confidence: 80,
                source: 'google_metadata'
              };
            }
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error detecting series from Google Books directly:', error instanceof Error ? error.message : 'Unknown error');
      return null;
    }
  }
  
  /**
   * Directly detect series from OpenLibrary API using work ID
   * This provides official series information directly from OpenLibrary
   */
  private async detectSeriesFromOpenLibraryDirectly(bookId: string): Promise<SeriesDetectionResult | null> {
    try {
      // Extract the work ID if we have a book ID
      let workId = bookId;
      if (bookId.startsWith('OL') && bookId.includes('M')) {
        // Convert book ID to work ID by making a first request
        const response = await fetch(`${this.openLibraryBaseUrl}/books/${bookId}.json`);
        if (!response.ok) {
          throw new Error(`OpenLibrary API error: ${response.statusText}`);
        }
        
        const data = await response.json();
        workId = data.works?.[0]?.key;
        
        if (!workId) {
          return null; // No work ID found
        }
        
        // Remove leading /works/ if present
        workId = workId.replace(/^\/works\//, '');
      }
      
      // Now get the work data which may contain series information
      const workResponse = await fetch(`https://openlibrary.org/works/${workId}.json`);
      if (!workResponse.ok) {
        throw new Error(`OpenLibrary API error: ${workResponse.statusText}`);
      }
      
      const workData = await workResponse.json();
      
      // Check if this work is part of a series
      if (workData.series && workData.series.length > 0) {
        // Get the first series (most relevant)
        const seriesKey = workData.series[0].key;
        
        // Get detailed series information
        const seriesResponse = await fetch(`https://openlibrary.org${seriesKey}.json`);
        if (!seriesResponse.ok) {
          throw new Error(`OpenLibrary API error: ${seriesResponse.statusText}`);
        }
        
        const seriesData = await seriesResponse.json();
        
        return {
          series: {
            name: seriesData.name || seriesData.title || 'Unknown Series',
            description: seriesData.description?.value || workData.description?.value,
            author: workData.authors?.[0]?.name,
            totalBooks: seriesData.works?.length,
            status: 'ongoing', // OpenLibrary doesn't indicate status
            genre: workData.subjects?.slice(0, 3)
          },
          confidence: 95, // Very high confidence for direct API match
          source: 'openlib_direct'
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error detecting series from OpenLibrary directly:', error instanceof Error ? error.message : 'Unknown error');
      return null;
    }
  }
  
  /**
   * Detect series by matching with existing series in the collection
   * Prioritizes matching with existing series over creating new ones
   */
  private async detectSeriesFromExistingCollection(title: string, author: string): Promise<SeriesDetectionResult | null> {
    try {
      // Load existing series from IndexedDB (the exclusive source of truth)
      const { enhancedStorageService } = await import('@/services/storage/EnhancedStorageService');
      
      // Initialize storage if needed
      await enhancedStorageService.initialize();
      
      // Get all series from IndexedDB
      const existingSeries = await enhancedStorageService.getSeries();
      if (!existingSeries || existingSeries.length === 0) {
        return null;
      }
      
      // First, filter series by the same author if possible
      const authorSeries = existingSeries.filter(series => 
        series.author && series.author.toLowerCase() === author.toLowerCase()
      );
      
      const seriesToCheck = authorSeries.length > 0 ? authorSeries : existingSeries;
      
      // Find exact name matches first (very high confidence)
      for (const series of seriesToCheck) {
        // Check if title directly contains series name
        if (series.name && title.toLowerCase().includes(series.name.toLowerCase())) {
          // Create a series object with required UI properties
          const uiSeries: Series = {
            ...series,
            // Add UI-specific fields if they don't exist in the IndexedDB series
            createdAt: new Date(series.dateAdded || new Date().toISOString()),
            updatedAt: new Date(series.lastModified || new Date().toISOString())
          };
          
          return {
            series: uiSeries,
            confidence: 90, // Very high confidence for direct name match
            source: 'collection_exact'
          };
        }
      }
      
      // Look for title similarities
      let bestMatch: Series | null = null;
      let highestSimilarity = 0;
      
      // Get all books from IndexedDB
      const allBooks = await enhancedStorageService.getBooks();
      
      for (const series of seriesToCheck) {
        // Compare with each book in the series
        if (series.books && series.books.length > 0) {
          // Filter books that belong to this series
          const seriesBooks = allBooks.filter(book => series.books?.includes(book.id));
          
          // Calculate average title similarity
          let totalSimilarity = 0;
          for (const book of seriesBooks) {
            const similarity = this.calculateTitleSimilarity(
              this.cleanTitleForMatching(title),
              this.cleanTitleForMatching(book.title)
            );
            totalSimilarity += similarity;
          }
          
          const avgSimilarity = seriesBooks.length > 0 ? totalSimilarity / seriesBooks.length : 0;
          
          if (avgSimilarity > highestSimilarity) {
            highestSimilarity = avgSimilarity;
            // Create a series object with required UI properties
            bestMatch = {
              ...series,
              // Add UI-specific fields if they don't exist in the IndexedDB series
              createdAt: new Date(series.dateAdded || new Date().toISOString()),
              updatedAt: new Date(series.lastModified || new Date().toISOString())
            };
          }
        }
      }
      
      if (bestMatch && highestSimilarity > 0.5) {
        return {
          series: bestMatch,
          confidence: Math.min(Math.round(highestSimilarity * 100), 85), // Cap at 85% for similarity-based matches
          source: 'collection_similar'
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error matching with existing collection:', error);
      return null;
    }
  }
  
  /**
   * Detect series by matching with existing books in the collection
   * Prioritizes matching with existing books over creating new ones
   */

  private async detectSeriesFromExistingBooks(title: string, author: string, existingBooks: Book[]): Promise<SeriesDetectionResult | null> {
    // Only proceed if we have enough books to compare
    if (existingBooks.length < 3) return null;
    
    // Filter to books by the same author
    const authorBooks = existingBooks.filter(book => 
      book.author.toLowerCase() === author.toLowerCase()
    );
    
    if (authorBooks.length < 2) return null;
    
    // Group books that might be in the same series based on title similarity
    const potentialMatches: Book[] = [];
    const cleanTitle = this.cleanTitleForMatching(title);
    
    for (const book of authorBooks) {
      const cleanBookTitle = this.cleanTitleForMatching(book.title);
      const similarity = this.calculateTitleSimilarity(cleanTitle, cleanBookTitle);
      
      if (similarity > 0.4) {
        potentialMatches.push(book);
      }
    }
    
    if (potentialMatches.length < 2) return null;
    
    // Try to extract a common series name
    let seriesName = this.findCommonPrefix(potentialMatches.map(b => b.title));
    if (!seriesName || seriesName.length < 4) {
      // If no common prefix, use the extracted series name from the most similar title
      const mostSimilarBook = potentialMatches[0];
      seriesName = this.extractSeriesName(mostSimilarBook.title, mostSimilarBook.title) || 
                   mostSimilarBook.title.split(':')[0];
    }
    
    // Calculate confidence based on number and similarity of matches
    const confidence = Math.min(
      30 + (potentialMatches.length * 10),
      80 // Cap at 80% since collection-based detection is less reliable
    );
    
    return {
      series: {
        name: seriesName.trim(),
        author,
        totalBooks: potentialMatches.length + 1, // Add 1 for the current book
        // Use an existing series image if available
        coverImage: potentialMatches.find(b => b.thumbnail)?.thumbnail
      },
      confidence,
      source: 'collection',
      matchedBooks: potentialMatches
    };
  }
  
  /**
   * Try to extract series name from book title
   */
  private extractSeriesName(fullTitle: string, bookTitle: string): string | null {
    if (!fullTitle) return null;
    
    // Common series patterns
    const patterns = [
      /(.+?)(?: Series)(?:: | - | )(.+)/i, // "Harry Potter Series: Book 1"
      /(.+?)(?: #\d+)/i,                    // "Harry Potter #1"
      /(.+?)(?:: Book \d+)/i,               // "Harry Potter: Book 1"
      /(.+?)(?:: Volume \d+)/i,             // "Harry Potter: Volume 1"
      /(.+?)(?:, Book \d+)/i,               // "Harry Potter, Book 1"
      /(.+?)(?:\((?:Book|Vol\.?) \d+\))/i,  // "Harry Potter (Book 1)"
      /(.+?) - Book \d+/i                    // "Harry Potter - Book 1"
    ];
    
    for (const pattern of patterns) {
      const match = fullTitle.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    // If book title has a colon, first part might be series name
    if (bookTitle.includes(':')) {
      return bookTitle.split(':')[0].trim();
    }
    
    // Try to find a common prefix within the title itself
    const cleanTitle = this.cleanTitleForMatching(bookTitle);
    
    // Extract first part of title as a potential series name
    // Look for a colon, dash, or other common separator
    const separators = [':', '-', '—', '–', '#'];
    
    for (const separator of separators) {
      if (cleanTitle.includes(separator)) {
        const prefix = cleanTitle.split(separator)[0].trim();
        if (prefix.length >= 4) { // At least 4 characters to be meaningful
          return prefix;
        }
      }
    }
    
    // Try to extract a series pattern using word boundaries
    const wordMatch = cleanTitle.match(/^([\w\s]+?)\s+\d+/i);
    if (wordMatch && wordMatch[1] && wordMatch[1].length >= 4) {
      return wordMatch[1].trim();
    }
    
    // No significant common prefix found
    return null;
  }
  
  /**
   * Clean a title for better matching
   */
  private cleanTitleForMatching(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .replace(/\bbook\s+\d+\b|\bvolume\s+\d+\b|#\d+|\(\s*\d+\s*\)|\bpart\s+\d+\b/g, '') // Remove volume numbers
      .replace(/\bseries\b/g, '') // Remove "series" keyword
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();
  }
  
  /**
   * Find the longest common prefix among a list of titles
   */
  /**
   * Calculate similarity between two titles
   * Returns a score between 0 and 1
   */
  private calculateTitleSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1;
    
    // Check for common prefix
    let commonPrefixLength = 0;
    const minLength = Math.min(str1.length, str2.length);
    
    for (let i = 0; i < minLength; i++) {
      if (str1[i] === str2[i]) {
        commonPrefixLength++;
      } else {
        break;
      }
    }
    
    const prefixSimilarity = commonPrefixLength / (Math.max(str1.length, str2.length));
    
    // Word similarity
    const words1 = str1.split(/\s+/);
    const words2 = str2.split(/\s+/);
    
    const commonWords = words1.filter(word => 
      words2.includes(word) && word.length > 3 // Only count substantial words
    );
    
    const wordSimilarity = commonWords.length / Math.max(words1.length, words2.length);
    
    // Return weighted average
    return (prefixSimilarity * 0.6) + (wordSimilarity * 0.4);
  }

  private findCommonPrefix(titles: string[]): string {
    if (!titles.length) return "";
    if (titles.length === 1) return titles[0];
    
    const cleanedTitles = titles.map(title => this.cleanTitleForMatching(title));
    let prefix = cleanedTitles[0];
    
    for (let i = 1; i < cleanedTitles.length; i++) {
      const title = cleanedTitles[i];
      let j = 0;
      
      while (j < prefix.length && j < title.length && prefix[j] === title[j]) {
        j++;
      }
      
      prefix = prefix.substring(0, j);
      if (prefix === "") break;
    }
    
    // Make sure we don't cut words in half
    const lastSpaceIndex = prefix.lastIndexOf(" ");
    if (lastSpaceIndex > 3) { // Ensure we have at least a few characters
      prefix = prefix.substring(0, lastSpaceIndex);
    }
    
    return prefix;
  }
  
  /**
   * Try to infer the status of a series based on available books
   */
  private inferSeriesStatus(seriesBooks: any[]): 'ongoing' | 'completed' | 'cancelled' {
    if (!seriesBooks || seriesBooks.length === 0) return 'ongoing'; // Default to ongoing if we can't determine
    
    // Check for recent publications
    const currentYear = new Date().getFullYear();
    const publishYears = seriesBooks
      .map(book => {
        const date = book.volumeInfo?.publishedDate;
        if (!date) return null;
        const year = parseInt(date.substring(0, 4));
        return isNaN(year) ? null : year;
      })
      .filter(Boolean);
    
    if (publishYears.length === 0) return 'ongoing'; // Default to ongoing if no publish years found
    
    // Sort years from newest to oldest
    publishYears.sort((a, b) => b - a);
    
    // If the most recent book is from the last 3 years, likely ongoing
    if (currentYear - publishYears[0] <= 3) {
      return 'ongoing';
    }
    
    // If the most recent book is quite old, likely completed or cancelled
    if (currentYear - publishYears[0] >= 10) {
      return 'completed';
    }
    
    return 'ongoing'; // Default to ongoing if we can't determine
  }
  
  /**
   * Estimate total books in a series based on available information
   */
  private estimateTotalBooks(seriesBooks: any[]): number | undefined {
    if (!seriesBooks || seriesBooks.length === 0) return undefined;
    
    // Find the highest volume number mentioned in titles
    let maxVolumeNumber = 0;
    
    for (const book of seriesBooks) {
      const title = book.volumeInfo?.title || '';
      
      // Look for volume numbers in the title
      const volumeMatch = title.match(/(?:book|volume|#|\()\s*(\d+)/i);
      if (volumeMatch) {
        const volumeNumber = parseInt(volumeMatch[1]);
        if (!isNaN(volumeNumber) && volumeNumber > maxVolumeNumber) {
          maxVolumeNumber = volumeNumber;
        }
      }
    }
    
    if (maxVolumeNumber > 0) {
      // Round up to account for potentially missing volumes
      return Math.max(maxVolumeNumber, seriesBooks.length);
    }
    
    // Default to the number of books found plus a small buffer
    return seriesBooks.length + 1;
  }
}

// Export a singleton instance
export const seriesApiService = new SeriesApiService();
