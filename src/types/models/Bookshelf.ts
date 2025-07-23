import { BookSummary } from './Book';

/**
 * Represents a shelf within the bookshelf visualization
 */
export interface ShelfData {
  id: string;
  name: string;
  books: BookSummary[];
  type: ShelfType;
}

/**
 * Types of shelves
 */
export enum ShelfType {
  CURRENTLY_READING = 'currently_reading',
  COMPLETED = 'completed',
  TO_READ = 'to_read',
  CUSTOM = 'custom',
}

/**
 * Visual style options for the bookshelf
 */
export interface BookshelfStyle {
  shelfColor: string;
  shelfHighlightColor: string;
  backPanelColor: string;
  sidePanelColor: string;
  spineColorPalette: SpineColorPalette;
  woodGrain: boolean;
}

/**
 * Color palette for book spines
 */
export interface SpineColorPalette {
  colors: string[];
  useCustomColors: boolean;
}

/**
 * Configuration for the bookshelf view
 */
export interface BookshelfConfig {
  style: BookshelfStyle;
  booksPerShelf: number;
  showTitles: boolean;
  showAuthors: boolean;
  sortField: string;
  showEmptyShelves: boolean;
}

/**
 * Complete data model for the bookshelf visualization
 */
export interface BookshelfViewModel {
  shelves: ShelfData[];
  config: BookshelfConfig;
  currentlyReading?: ShelfData;
  totalBooks: number;
  visibleBooks: number;
}
