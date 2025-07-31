/**
 * IndexedDB refined models exports
 */

export * from './Book';
export * from './Series';
export * from './UpcomingBook';
export * from './Notification';

/**
 * Store names for IndexedDB
 */
export enum StoreNames {
  BOOKS = 'books',
  SERIES = 'series',
  UPCOMING_BOOKS = 'upcomingBooks',
  NOTIFICATIONS = 'notifications',
  SETTINGS = 'settings'
}

/**
 * Database configuration
 */
export const DB_CONFIG = {
  NAME: 'book-collection-db',
  VERSION: 1
};
