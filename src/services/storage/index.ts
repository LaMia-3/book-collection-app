// Export the main storage service
export { storageService } from './StorageService';
export { default } from './StorageService';

// Export types for use throughout the app
export {
  StorageInterface,
  StorageError,
  StorageErrorType,
  UserSettings,
  Collection,
  BackupRecord
} from './types';

// Export implementations for advanced usage
export { IndexedDBStorage } from './IndexedDBStorage';
export { LocalStorageFallback } from './LocalStorageFallback';
