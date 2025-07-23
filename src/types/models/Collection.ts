import { ReadingStatus } from './Book';

/**
 * Filter options for the book collection
 */
export interface CollectionFilter {
  text?: string;         // Full-text search across fields
  authors?: string[];    // Filter by specific authors
  genres?: string[];     // Filter by specific genres
  status?: ReadingStatus[]; // Filter by reading status
  rating?: number;       // Filter by minimum rating
  readDateStart?: string; // Filter by read date range (start)
  readDateEnd?: string;   // Filter by read date range (end)
  addedDateStart?: string; // Filter by added date range (start)
  addedDateEnd?: string;   // Filter by added date range (end)
  series?: string[];     // Filter by series
  tags?: string[];       // Filter by tags
  shelves?: string[];    // Filter by custom shelves
  favorite?: boolean;    // Filter for favorites only
}

/**
 * Sorting options for the book collection
 */
export enum SortField {
  TITLE = 'title',
  AUTHOR = 'author',
  ADDED_DATE = 'addedDate',
  COMPLETED_DATE = 'completedDate',
  RATING = 'rating',
  PUBLISHER = 'publisher',
  PUBLISHED_DATE = 'publishedDate',
}

export enum SortDirection {
  ASC = 'asc',
  DESC = 'desc',
}

/**
 * Sort configuration for the book collection
 */
export interface CollectionSort {
  field: SortField;
  direction: SortDirection;
}

/**
 * View type for the collection
 */
export enum CollectionViewType {
  GRID = 'grid',
  LIST = 'list',
  COMPACT = 'compact',
}

/**
 * Collection view configuration (user preferences)
 */
export interface CollectionViewConfig {
  viewType: CollectionViewType;
  sort: CollectionSort;
  pageSize: number;
  filter: CollectionFilter;
}

/**
 * A saved view configuration that the user can apply
 */
export interface SavedView {
  id: string;
  name: string;
  config: CollectionViewConfig;
  default?: boolean;
}

/**
 * Statistics about the book collection
 */
export interface CollectionStats {
  total: number;
  completed: number;
  reading: number;
  toRead: number;
  dnf: number;
  onHold: number;
  favorites: number;
  averageRating: number;
  byGenre: {[genre: string]: number};
  byAuthor: {[author: string]: number};
  byRating: {[rating: string]: number};  // "1" to "5"
  byYear: {[year: string]: number};
}
