import { bookApiClient } from './BookApiClient';
import { googleBooksProvider } from './GoogleBooksProvider';
import { openLibraryProvider } from './OpenLibraryProvider';
import { 
  LoggingInterceptor, 
  ErrorHandlingInterceptor, 
  CacheInterceptor 
} from './interceptors';

// Register all providers with the client
bookApiClient.registerProvider(googleBooksProvider);
bookApiClient.registerProvider(openLibraryProvider);

// Set Google Books as the default provider
bookApiClient.setActiveProvider('google');

// Configure interceptors
// Add a logging interceptor in development mode
if (process.env.NODE_ENV === 'development') {
  bookApiClient.addRequestInterceptor(new LoggingInterceptor('BookAPI', 'debug'));
  bookApiClient.addResponseInterceptor(new LoggingInterceptor('BookAPI', 'debug'));
}

// Add error handling with retry capabilities
bookApiClient.addResponseInterceptor(
  new ErrorHandlingInterceptor('BookAPI', 2, 1000) // Retry up to 2 times with 1s delay
);

// Add response caching to improve performance
const cacheInterceptor = new CacheInterceptor(10 * 60 * 1000); // Cache for 10 minutes
bookApiClient.addRequestInterceptor(cacheInterceptor);
bookApiClient.addResponseInterceptor(cacheInterceptor);

export { 
  bookApiClient,
  googleBooksProvider, 
  openLibraryProvider 
};

// Default export of the API client
export default bookApiClient;
