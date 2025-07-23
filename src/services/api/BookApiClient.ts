import { Book } from '@/types/models/Book';
import { 
  BookApiProvider, 
  SearchParams, 
  SearchResult 
} from '@/types/api/BookApiProvider';
import {
  RequestInterceptor,
  ResponseInterceptor,
  RequestInterceptorChain,
  ResponseInterceptorChain
} from './interceptors';

/**
 * BookApiClient provides a unified interface to work with different book API providers.
 * It manages provider registration, selection, and fallback mechanisms.
 */
export class BookApiClient {
  private providers: Map<string, BookApiProvider> = new Map();
  private _activeProviderId: string | null = null;
  
  // Interceptor chains
  private requestInterceptors: RequestInterceptorChain = [];
  private responseInterceptors: ResponseInterceptorChain = [];

  /**
   * Register a new provider with the API client
   * @param provider The provider implementation
   */
  registerProvider(provider: BookApiProvider): void {
    this.providers.set(provider.id, provider);
    
    // If this is the first provider, set it as active
    if (!this._activeProviderId) {
      this._activeProviderId = provider.id;
    }
  }

  /**
   * Get a list of all registered providers
   */
  getProviders(): BookApiProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Set the active provider by ID
   * @param providerId The ID of the provider to use
   * @throws Error if the provider is not registered
   */
  setActiveProvider(providerId: string): void {
    if (!this.providers.has(providerId)) {
      throw new Error(`Provider ${providerId} is not registered`);
    }
    this._activeProviderId = providerId;
  }

  /**
   * Get the currently active provider ID
   */
  get activeProviderId(): string | null {
    return this._activeProviderId;
  }

  /**
   * Get the currently active provider
   * @throws Error if no provider is active
   */
  get activeProvider(): BookApiProvider {
    if (!this._activeProviderId) {
      throw new Error('No active provider selected');
    }
    
    const provider = this.providers.get(this._activeProviderId);
    if (!provider) {
      throw new Error(`Active provider ${this._activeProviderId} not found`);
    }
    
    return provider;
  }
  
  /**
   * Add a request interceptor to the chain
   * @param interceptor The request interceptor to add
   */
  addRequestInterceptor(interceptor: RequestInterceptor): void {
    this.requestInterceptors.push(interceptor);
  }
  
  /**
   * Add a response interceptor to the chain
   * @param interceptor The response interceptor to add
   */
  addResponseInterceptor(interceptor: ResponseInterceptor): void {
    this.responseInterceptors.push(interceptor);
  }
  
  /**
   * Process a request through all request interceptors
   * @param request The request to process
   * @returns The processed request
   * @private
   */
  private async applyRequestInterceptors<T>(request: T): Promise<T> {
    let modifiedRequest = request;
    
    for (const interceptor of this.requestInterceptors) {
      modifiedRequest = await interceptor.intercept(modifiedRequest);
    }
    
    return modifiedRequest;
  }
  
  /**
   * Process a response through all response interceptors
   * @param response The response to process
   * @param originalRequest The original request (optional)
   * @returns The processed response
   * @private
   */
  private async applyResponseInterceptors<T>(response: T, originalRequest?: any): Promise<T> {
    let modifiedResponse = response;
    
    for (const interceptor of this.responseInterceptors) {
      modifiedResponse = await interceptor.onSuccess(modifiedResponse);
    }
    
    return modifiedResponse;
  }
  
  /**
   * Process an error through all response interceptors
   * @param error The error to process
   * @param originalRequest The original request (optional)
   * @returns The processed error or a recovered response
   * @private
   */
  private async handleError(error: Error, originalRequest?: any): Promise<any> {
    let currentError = error;
    
    for (const interceptor of this.responseInterceptors) {
      try {
        // Try to recover from the error
        const result = await interceptor.onError(currentError);
        
        // If the interceptor returned something other than an error, we've recovered
        if (!(result instanceof Error)) {
          return result;
        }
        
        // Otherwise, continue with the new error
        currentError = result;
      } catch (interceptorError) {
        // If an interceptor itself throws, use that as the new error
        currentError = interceptorError instanceof Error 
          ? interceptorError 
          : new Error(String(interceptorError));
      }
    }
    
    // If we get here, no interceptor could recover
    throw currentError;
  }

  /**
   * Search for books using the active provider
   * @param params Search parameters
   * @returns Search result
   * @throws Error if the search fails
   */
  async searchBooks(params: SearchParams): Promise<SearchResult> {
    // Process the request through interceptors
    const processedParams = await this.applyRequestInterceptors(params);
    
    // Try with active provider first
    try {
      const result = await this.activeProvider.searchBooks(processedParams);
      
      // Process the successful response through interceptors
      return await this.applyResponseInterceptors(result, processedParams);
    } catch (error) {
      // First try to recover using interceptors
      try {
        return await this.handleError(error instanceof Error ? error : new Error(String(error)), processedParams);
      } catch (handledError) {
        // If error handling didn't recover, try fallback providers
        for (const provider of this.providers.values()) {
          if (provider.id !== this._activeProviderId) {
            try {
              if (await provider.isAvailable()) {
                // Use this provider and update active provider
                this._activeProviderId = provider.id;
                const result = await provider.searchBooks(processedParams);
                
                // Process the successful response through interceptors
                return await this.applyResponseInterceptors(result, processedParams);
              }
            } catch {
              // Ignore errors from fallback providers
            }
          }
        }
        
        // If all providers fail and interceptors couldn't recover, throw the error
        throw handledError;
      }
    }
  }

  /**
   * Get detailed information for a specific book
   * @param id The book ID
   * @returns Book details
   * @throws Error if the book cannot be found
   */
  async getBookDetails(id: string): Promise<Book> {
    // Create a request object for interceptors
    const request = { id, type: 'bookDetails' };
    
    // Process the request through interceptors
    const processedRequest = await this.applyRequestInterceptors(request);
    
    try {
      const result = await this.activeProvider.getBookDetails(processedRequest.id);
      
      // Process the successful response through interceptors
      return await this.applyResponseInterceptors(result, processedRequest);
    } catch (error) {
      // First try to recover using interceptors
      try {
        return await this.handleError(error instanceof Error ? error : new Error(String(error)), processedRequest);
      } catch (handledError) {
        // If error handling didn't recover, try fallback providers
        for (const provider of this.providers.values()) {
          if (provider.id !== this._activeProviderId) {
            try {
              if (await provider.isAvailable()) {
                // Use this provider and update active provider
                this._activeProviderId = provider.id;
                const result = await provider.getBookDetails(processedRequest.id);
                
                // Process the successful response through interceptors
                return await this.applyResponseInterceptors(result, processedRequest);
              }
            } catch {
              // Ignore errors from fallback providers
            }
          }
        }
        
        // If all providers fail and interceptors couldn't recover, throw the error
        throw handledError;
      }
    }
  }
}

// Create a singleton instance
export const bookApiClient = new BookApiClient();

export default bookApiClient;
