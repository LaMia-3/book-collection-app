import { Book } from '@/types/book';
import { Series } from '@/types/series';
import { seriesRepository } from '@/repositories/SeriesRepository';

/**
 * Service for managing reading order of books in a series
 */
export class ReadingOrderService {
  /**
   * Get books in publication order
   */
  async getPublicationOrder(seriesId: string, books: Book[]): Promise<Book[]> {
    // Default sort by published date if available, otherwise by title
    return [...books].sort((a, b) => {
      if (a.publicationDate && b.publicationDate) {
        return new Date(a.publicationDate).getTime() - new Date(b.publicationDate).getTime();
      }
      
      // Fall back to title
      return a.title.localeCompare(b.title);
    });
  }
  
  /**
   * Get books in chronological order (based on story timeline)
   */
  async getChronologicalOrder(seriesId: string, books: Book[]): Promise<Book[]> {
    // Use chronological date if available, otherwise fall back to publication order
    return [...books].sort((a, b) => {
      // Use chronological date if both books have it
      if (a._chronologicalDate && b._chronologicalDate) {
        return a._chronologicalDate - b._chronologicalDate;
      }
      
      // Fall back to publication date
      if (a.publicationDate && b.publicationDate) {
        return new Date(a.publicationDate).getTime() - new Date(b.publicationDate).getTime();
      }
      
      // Last resort is title
      return a.title.localeCompare(b.title);
    });
  }
  
  /**
   * Get books in custom order (user-defined)
   */
  async getCustomOrder(seriesId: string, books: Book[]): Promise<Book[]> {
    const series = await seriesRepository.getById(seriesId);
    if (!series || !series.customOrder || series.customOrder.length === 0) {
      // Fall back to publication order if no custom order defined
      return this.getPublicationOrder(seriesId, books);
    }
    
    // Map of book IDs to their positions in the custom order
    const orderMap = new Map<string, number>();
    series.customOrder.forEach((bookId, index) => {
      orderMap.set(bookId, index);
    });
    
    // Sort books by their position in the custom order
    // Books not in the custom order will be placed at the end
    return [...books].sort((a, b) => {
      const posA = orderMap.has(a.id) ? orderMap.get(a.id)! : Number.MAX_SAFE_INTEGER;
      const posB = orderMap.has(b.id) ? orderMap.get(b.id)! : Number.MAX_SAFE_INTEGER;
      
      return posA - posB;
    });
  }
  
  /**
   * Get books in the appropriate order based on series reading order preference
   */
  async getBooksInOrder(series: Series, books: Book[]): Promise<Book[]> {
    switch (series.readingOrder) {
      case 'chronological':
        return this.getChronologicalOrder(series.id, books);
      case 'custom':
        return this.getCustomOrder(series.id, books);
      case 'publication':
      default:
        return this.getPublicationOrder(series.id, books);
    }
  }
  
  /**
   * Update custom reading order
   */
  async updateCustomOrder(seriesId: string, bookOrder: string[]): Promise<Series | null> {
    return seriesRepository.setReadingOrder(seriesId, 'custom', bookOrder);
  }
  
  /**
   * Change reading order mode
   */
  async changeReadingOrderMode(
    seriesId: string, 
    mode: 'publication' | 'chronological' | 'custom'
  ): Promise<Series | null> {
    const series = await seriesRepository.getById(seriesId);
    if (!series) return null;
    
    // If switching to custom order but no custom order exists yet,
    // initialize it with the current book order
    if (mode === 'custom' && (!series.customOrder || series.customOrder.length === 0)) {
      return seriesRepository.setReadingOrder(seriesId, mode, series.books);
    }
    
    // Otherwise just update the mode
    return seriesRepository.setReadingOrder(seriesId, mode, series.customOrder);
  }
  
  /**
   * Reorder a book in the custom order
   */
  async reorderBook(seriesId: string, bookId: string, newIndex: number): Promise<Series | null> {
    const series = await seriesRepository.getById(seriesId);
    if (!series) return null;
    
    // Ensure we have a custom order to work with
    let customOrder = series.customOrder || [...series.books];
    
    // Remove the book from its current position
    customOrder = customOrder.filter(id => id !== bookId);
    
    // Insert it at the new position
    customOrder.splice(newIndex, 0, bookId);
    
    // Update the series
    return seriesRepository.setReadingOrder(seriesId, 'custom', customOrder);
  }
}

// Export a singleton instance
export const readingOrderService = new ReadingOrderService();
