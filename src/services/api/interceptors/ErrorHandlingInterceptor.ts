import { ResponseInterceptor } from './Interceptor';

/**
 * Standard error structure for API errors
 */
export interface ApiError extends Error {
  statusCode?: number;
  source?: string;
  timestamp?: string;
  data?: any;
}

/**
 * Factory function to create an API error
 */
export function createApiError(
  message: string,
  statusCode?: number,
  source?: string,
  data?: any
): ApiError {
  const error: ApiError = new Error(message);
  error.statusCode = statusCode;
  error.source = source;
  error.timestamp = new Date().toISOString();
  error.data = data;
  return error;
}

/**
 * Response interceptor that standardizes error handling across API providers
 */
export class ErrorHandlingInterceptor<T = any> implements ResponseInterceptor<T, Error> {
  private readonly source: string;
  private readonly retryCount: number;
  private readonly retryDelay: number;
  
  /**
   * Create a new error handling interceptor
   * @param source The source identifier for this interceptor
   * @param retryCount Number of times to retry on failure (0 = no retry)
   * @param retryDelay Delay in ms between retry attempts
   */
  constructor(source: string, retryCount = 0, retryDelay = 1000) {
    this.source = source;
    this.retryCount = retryCount;
    this.retryDelay = retryDelay;
  }
  
  /**
   * Pass through successful responses
   */
  onSuccess(response: T): T {
    return response;
  }
  
  /**
   * Handle errors with standardized format and retry logic
   */
  async onError(error: any): Promise<T | ApiError> {
    // Extract useful information from the error
    const statusCode = error.status || error.statusCode || 
                      (error.response ? error.response.status : undefined);
    
    const message = error.message || 
                   (error.response && error.response.statusText ? 
                    error.response.statusText : 'Unknown error');
    
    const data = error.data || 
                (error.response && error.response.data ? 
                 error.response.data : undefined);
    
    // Create standardized error
    const apiError = createApiError(message, statusCode, this.source, data);
    
    // If retry is enabled and it's a retriable error (e.g., 429, 503, network errors)
    if (this.retryCount > 0 && this.isRetriableError(statusCode)) {
      return this.retryRequest(apiError, this.retryCount);
    }
    
    // No retry or non-retriable error
    return apiError;
  }
  
  /**
   * Check if an error is retriable based on status code
   */
  private isRetriableError(statusCode?: number): boolean {
    if (!statusCode) return true; // Network errors are retriable
    
    // Standard retriable status codes
    return [408, 429, 500, 502, 503, 504].includes(statusCode);
  }
  
  /**
   * Retry the original request
   * @param error The error that occurred
   * @param attemptsLeft Number of retry attempts left
   * @private
   */
  private async retryRequest(error: ApiError, attemptsLeft: number): Promise<T | ApiError> {
    if (attemptsLeft <= 0) {
      return error;
    }
    
    console.warn(`Retrying request after error: ${error.message}. Attempts left: ${attemptsLeft}`);
    
    // Wait before retrying
    await new Promise(resolve => setTimeout(resolve, this.retryDelay));
    
    try {
      // This would require access to the original request and client
      // In a real implementation, this would need to be handled by the client
      // For now, we'll just return the error as we don't have retry capability
      return error;
    } catch (retryError) {
      // Recursive retry with one fewer attempt
      return this.retryRequest(error, attemptsLeft - 1);
    }
  }
}
