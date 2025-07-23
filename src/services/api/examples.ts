/**
 * Examples of how to use the API interceptor system
 */
import { bookApiClient } from './index';
import { 
  LoggingInterceptor,
  ErrorHandlingInterceptor,
  CacheInterceptor,
  RequestInterceptor
} from './interceptors';

/**
 * Configure the API client with interceptors
 */
export function configureApiClient(): void {
  // Add a logging interceptor to debug API calls
  bookApiClient.addRequestInterceptor(new LoggingInterceptor('BookAPI', 'debug'));
  bookApiClient.addResponseInterceptor(new LoggingInterceptor('BookAPI', 'debug'));
  
  // Add an error handling interceptor with retry capabilities
  bookApiClient.addResponseInterceptor(
    new ErrorHandlingInterceptor('BookAPI', 3, 1000) // Retry up to 3 times with 1s delay
  );
  
  // Add a cache interceptor to reduce duplicate requests
  const cacheInterceptor = new CacheInterceptor(
    10 * 60 * 1000,  // Cache responses for 10 minutes
    (request) => {
      // Custom cache key generation
      if (request.type === 'bookDetails') {
        return `details:${request.id}`;
      }
      
      // For search requests
      const { query, type, page, limit } = request;
      return `search:${query}:${type || 'all'}:${page || 1}:${limit || 10}`;
    }
  );
  
  bookApiClient.addRequestInterceptor(cacheInterceptor);
  bookApiClient.addResponseInterceptor(cacheInterceptor);
  
  console.log('API client configured with interceptors!');
}

/**
 * Example of a custom interceptor that adds user context
 * to outgoing API requests (for analytics or personalization)
 */
export class UserContextInterceptor implements RequestInterceptor {
  private userId: string;
  
  constructor(userId: string) {
    this.userId = userId;
  }
  
  intercept(request: any): any {
    // Add user context to the request
    return {
      ...request,
      context: {
        ...request.context,
        userId: this.userId,
        timestamp: new Date().toISOString()
      }
    };
  }
}
