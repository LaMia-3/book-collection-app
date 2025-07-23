import { Book } from '@/types/models/Book';

/**
 * Database schema version for tracking migrations
 */
export const DB_VERSION = 1;

/**
 * Database name
 */
export const DB_NAME = 'miraBookCollection';

/**
 * Object store names (tables)
 */
export enum StoreNames {
  BOOKS = 'books',
  SETTINGS = 'settings',
  BACKUP = 'backups',
  COLLECTIONS = 'collections'
}

/**
 * Book object with additional metadata for database operations
 */
export interface BookRecord extends Book {
  // Additional fields for database operations
  lastUpdated?: string;
  syncStatus?: 'pending' | 'synced' | 'error';
  deleted?: boolean;
}

/**
 * User settings object stored in the database
 */
export interface UserSettings {
  id?: number; // Only one settings object will exist, with id=1
  theme?: 'light' | 'dark' | 'system';
  defaultView?: 'shelf' | 'list' | 'cover' | 'insights';
  defaultSort?: string;
  defaultFilter?: string;
  apiProvider?: string;
  lastBackup?: string; // ISO date string
  syncEnabled?: boolean;
  updatedAt?: string; // ISO date string
}

/**
 * Collection/tag for organizing books
 */
export interface Collection {
  id: string;
  name: string;
  description?: string;
  color?: string;
  bookIds: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Backup record
 */
export interface BackupRecord {
  id?: number;
  name: string;
  data: string; // JSON stringified data
  timestamp: string;
  bookCount: number;
  size: number; // Size in bytes
}

/**
 * Database migration interface
 */
export interface Migration {
  version: number;
  execute: (db: IDBDatabase) => Promise<void> | void;
}

/**
 * Interface for storage operations
 */
export interface StorageInterface {
  // Database initialization
  initialize(): Promise<void>;
  
  // Book operations
  getBooks(): Promise<Book[]>;
  getBookById(id: string): Promise<Book | undefined>;
  saveBook(book: Book): Promise<string>; // Returns ID
  saveBooks(books: Book[]): Promise<string[]>; // Returns IDs
  deleteBook(id: string): Promise<void>;
  deleteBooks(ids: string[]): Promise<void>;
  
  // Collection operations
  getCollections(): Promise<Collection[]>;
  getCollection(id: string): Promise<Collection | undefined>;
  saveCollection(collection: Collection): Promise<string>; // Returns ID
  deleteCollection(id: string): Promise<void>;
  
  // Settings operations
  getSettings(): Promise<UserSettings>;
  saveSettings(settings: UserSettings): Promise<void>;
  
  // Backup operations
  createBackup(name: string): Promise<number>; // Returns backup ID
  getBackups(): Promise<BackupRecord[]>;
  restoreBackup(id: number): Promise<void>;
  deleteBackup(id: number): Promise<void>;
  
  // Utility operations
  clearAllData(): Promise<void>;
  getStorageStats(): Promise<{ books: number, collections: number, backups: number, totalSize: number }>;
}

/**
 * Error types for storage operations
 */
export enum StorageErrorType {
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  MIGRATION_FAILED = 'MIGRATION_FAILED'
}

/**
 * Custom storage error class
 */
export class StorageError extends Error {
  readonly type: StorageErrorType;
  readonly originalError?: Error;
  
  constructor(
    message: string,
    type: StorageErrorType = StorageErrorType.UNKNOWN_ERROR,
    originalError?: Error
  ) {
    super(message);
    this.name = 'StorageError';
    this.type = type;
    this.originalError = originalError;
  }
}
