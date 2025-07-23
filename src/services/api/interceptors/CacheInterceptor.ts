import { Interceptor } from './Interceptor';

/**
 * Simple in-memory cache implementation
 */
class SimpleCache<T = any> {
  private cache: Map<string, { data: T; timestamp: number }> = new Map();
  private readonly maxAge: number; // milliseconds
  
  constructor(maxAgeInMs = 5 * 60 * 1000) { // Default 5 minutes
    this.maxAge = maxAgeInMs;
  }
  
  /**
   * Get a value from the cache
   * @param key Cache key
   * @returns The cached value or null if not found/expired
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }
    
    const now = Date.now();
    if (now - entry.timestamp > this.maxAge) {
      // Entry expired
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }
  
  /**
   * Store a value in the cache
   * @param key Cache key
   * @param value Value to store
   */
  set(key: string, value: T): void {
    this.cache.set(key, {
      data: value,
      timestamp: Date.now()
    });
  }
  
  /**
   * Clear all cached entries
   */
  clear(): void {
    this.cache.clear();
  }
  
  /**
   * Delete a specific cached entry
   * @param key Cache key
   */
  delete(key: string): void {
    this.cache.delete(key);
  }
  
  /**
   * Get the number of entries in the cache
   */
  get size(): number {
    return this.cache.size;
  }
}

/**
 * Interface for requests that can be cached
 */
export interface CacheableRequest {
  url?: string;
  method?: string;
  params?: Record<string, any>;
  [key: string]: any;
}

/**
 * An interceptor that caches API responses to reduce network requests
 */
export class CacheInterceptor<TReq extends CacheableRequest = CacheableRequest, TResp = any> 
  implements Interceptor<TReq, TResp> {
  
  private readonly cache: SimpleCache<TResp>;
  private readonly getCacheKey: (request: TReq) => string;
  
  /**
   * Create a new cache interceptor
   * @param cacheMaxAge Maximum age in ms for cached entries (default 5 minutes)
   * @param cacheKeyFn Custom function to generate cache keys (optional)
   */
  constructor(
    cacheMaxAge = 5 * 60 * 1000,
    cacheKeyFn?: (request: TReq) => string
  ) {
    this.cache = new SimpleCache<TResp>(cacheMaxAge);
    this.getCacheKey = cacheKeyFn || this.defaultCacheKey;
  }
  
  /**
   * Check the cache for a matching request before sending
   */
  intercept(request: TReq): TReq {
    // Only attempt caching for GET requests
    const method = request.method?.toUpperCase() || 'GET';
    
    if (method !== 'GET') {
      // Skip cache for non-GET requests
      (request as any).__skipCache = true;
      return request;
    }
    
    return request;
  }
  
  /**
   * Cache the successful response for future use
   */
  onSuccess(response: TResp, request?: TReq): TResp {
    if (!request || (request as any).__skipCache) {
      return response;
    }
    
    const cacheKey = this.getCacheKey(request);
    this.cache.set(cacheKey, response);
    
    return response;
  }
  
  /**
   * Pass through errors
   */
  onError(error: Error): Error {
    return error;
  }
  
  /**
   * Try to get a response from the cache
   * @param request The request to check
   * @returns Cached response or null if not in cache
   */
  getCachedResponse(request: TReq): TResp | null {
    if ((request as any).__skipCache) {
      return null;
    }
    
    const cacheKey = this.getCacheKey(request);
    return this.cache.get(cacheKey);
  }
  
  /**
   * Clear all cached responses
   */
  clearCache(): void {
    this.cache.clear();
  }
  
  /**
   * Default function to generate cache keys from requests
   */
  private defaultCacheKey(request: TReq): string {
    const url = request.url || '';
    const params = request.params ? JSON.stringify(request.params) : '';
    return `${url}|${params}`;
  }
}
