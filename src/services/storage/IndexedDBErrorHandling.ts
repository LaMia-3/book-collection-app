/**
 * IndexedDBErrorHandling.ts
 * 
 * Enhanced error handling and recovery for IndexedDB operations
 * Provides typed errors, retry mechanisms, and recovery strategies
 */

/**
 * Custom error types for better error classification and handling
 */
export class IndexedDBError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IndexedDBError';
  }
}

export class DatabaseConnectionError extends IndexedDBError {
  constructor(message: string = 'Failed to connect to database') {
    super(message);
    this.name = 'DatabaseConnectionError';
  }
}

export class DatabaseVersionError extends IndexedDBError {
  constructor(message: string = 'Database version mismatch') {
    super(message);
    this.name = 'DatabaseVersionError';
  }
}

export class TransactionError extends IndexedDBError {
  constructor(message: string = 'Transaction failed') {
    super(message);
    this.name = 'TransactionError';
  }
}

export class EntityNotFoundError extends IndexedDBError {
  constructor(entityType: string, entityId: string) {
    super(`${entityType} with ID ${entityId} not found`);
    this.name = 'EntityNotFoundError';
  }
}

export class StorageQuotaError extends IndexedDBError {
  constructor(message: string = 'Storage quota exceeded') {
    super(message);
    this.name = 'StorageQuotaError';
  }
}

export class InvalidDataError extends IndexedDBError {
  constructor(message: string = 'Invalid data format') {
    super(message);
    this.name = 'InvalidDataError';
  }
}

/**
 * Utility to determine the specific type of IndexedDB error
 * @param error The error object to classify
 * @returns A more specific error type
 */
export function classifyIndexedDBError(error: any): IndexedDBError {
  if (!error) return new IndexedDBError('Unknown IndexedDB error');
  
  const errorMessage = error.message || 'Unknown error';
  const errorName = error.name || '';
  
  // Classify DOMException errors
  if (error instanceof DOMException) {
    switch (error.name) {
      case 'QuotaExceededError':
        return new StorageQuotaError(errorMessage);
      case 'VersionError':
        return new DatabaseVersionError(errorMessage);
      case 'AbortError':
        return new TransactionError('Transaction aborted: ' + errorMessage);
      case 'InvalidStateError':
        return new DatabaseConnectionError('Invalid database state: ' + errorMessage);
      default:
        return new IndexedDBError(`${error.name}: ${errorMessage}`);
    }
  }
  
  // Classify based on error message patterns
  if (errorMessage.includes('not found') || errorMessage.includes('does not exist')) {
    return new EntityNotFoundError('Entity', 'unknown');
  }
  
  if (errorMessage.includes('quota') || errorMessage.includes('storage limit')) {
    return new StorageQuotaError(errorMessage);
  }
  
  if (errorMessage.includes('transaction') || errorMessage.includes('aborted')) {
    return new TransactionError(errorMessage);
  }
  
  if (errorMessage.includes('connection') || errorMessage.includes('connect')) {
    return new DatabaseConnectionError(errorMessage);
  }
  
  // Default to generic IndexedDB error
  return new IndexedDBError(errorMessage);
}

/**
 * Options for retry operations
 */
export interface RetryOptions {
  maxRetries: number;
  initialDelay: number;
  backoffFactor: number;
  retryableErrors?: string[];
}

/**
 * Default retry options
 */
const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  initialDelay: 100,
  backoffFactor: 1.5,
  retryableErrors: ['TransactionError', 'DatabaseConnectionError']
};

/**
 * Execute an IndexedDB operation with automatic retry on failure
 * @param operation The IndexedDB operation to execute
 * @param options Retry options
 * @returns The result of the operation
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const retryOptions = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: any;
  let delay = retryOptions.initialDelay;
  
  for (let attempt = 0; attempt <= retryOptions.maxRetries; attempt++) {
    try {
      // Execute the operation
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Classify the error
      const classifiedError = classifyIndexedDBError(error);
      
      // Check if this error type is retryable
      const isRetryableError = retryOptions.retryableErrors?.includes(classifiedError.name) ?? false;
      
      // If we've reached max retries or the error is not retryable, throw
      if (attempt >= retryOptions.maxRetries || !isRetryableError) {
        throw classifiedError;
      }
      
      // Log the retry attempt
      console.warn(
        `IndexedDB operation failed with error: ${classifiedError.message}. ` +
        `Retrying in ${delay}ms (attempt ${attempt + 1} of ${retryOptions.maxRetries})...`
      );
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Increase delay for next attempt
      delay = delay * retryOptions.backoffFactor;
    }
  }
  
  // This should never be reached due to the throw in the loop,
  // but TypeScript requires a return statement
  throw lastError;
}

/**
 * Error recovery strategies
 */
export class RecoveryStrategies {
  /**
   * Try to recover data from localStorage if IndexedDB fails
   * @param key The localStorage key to retrieve
   * @param defaultValue Default value if localStorage also fails
   * @returns The recovered data or default value
   */
  static localStorageFallback<T>(key: string, defaultValue: T): T {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : defaultValue;
    } catch (e) {
      console.error('Failed to recover from localStorage:', e);
      return defaultValue;
    }
  }
  
  /**
   * Execute a database operation in a new transaction if the current one fails
   * @param db The database instance
   * @param storeName The object store to use
   * @param mode The transaction mode
   * @param operation The operation to execute
   * @returns The result of the operation
   */
  static async newTransaction<T>(
    db: IDBDatabase,
    storeName: string | string[],
    mode: IDBTransactionMode,
    operation: (store: IDBObjectStore) => Promise<T>
  ): Promise<T> {
    try {
      const tx = db.transaction(storeName, mode);
      const store = tx.objectStore(Array.isArray(storeName) ? storeName[0] : storeName);
      return await operation(store);
    } catch (error) {
      console.error('Transaction failed, creating new transaction:', error);
      
      // Create a new transaction and retry
      const newTx = db.transaction(storeName, mode);
      const newStore = newTx.objectStore(Array.isArray(storeName) ? storeName[0] : storeName);
      return await operation(newStore);
    }
  }
  
  /**
   * Attempt to reconnect to the database if the connection is lost
   * @param dbName Database name
   * @param version Database version
   * @returns A Promise resolving to a new database connection
   */
  static async reconnectDatabase(dbName: string, version: number): Promise<IDBDatabase> {
    console.log('Attempting to reconnect to database:', dbName);
    
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName, version);
      
      request.onsuccess = () => {
        console.log('Successfully reconnected to database');
        resolve(request.result);
      };
      
      request.onerror = () => {
        console.error('Failed to reconnect to database');
        reject(new DatabaseConnectionError('Failed to reconnect to database'));
      };
    });
  }
}

/**
 * Error logging and telemetry
 */
export class ErrorTelemetry {
  private static errors: Array<{
    error: IndexedDBError,
    timestamp: Date,
    recovered: boolean
  }> = [];
  
  /**
   * Log an error with additional context
   * @param error The error that occurred
   * @param recovered Whether recovery was successful
   * @param context Additional context about the error
   */
  static logError(error: IndexedDBError, recovered: boolean = false, context: Record<string, any> = {}) {
    // Store error in memory
    this.errors.push({
      error,
      timestamp: new Date(),
      recovered
    });
    
    // Log to console
    console.error(
      `IndexedDB Error [${recovered ? 'Recovered' : 'Unrecovered'}]:`, 
      error.name, 
      error.message,
      context
    );
    
    // In a production app, you might want to send this to a telemetry service
    // Example: this.sendToTelemetryService(error, recovered, context);
  }
  
  /**
   * Get recent errors
   * @param limit Maximum number of errors to return
   * @returns Array of recent errors
   */
  static getRecentErrors(limit: number = 10) {
    return this.errors.slice(-limit);
  }
  
  /**
   * Clear error history
   */
  static clearErrors() {
    this.errors = [];
  }
}
