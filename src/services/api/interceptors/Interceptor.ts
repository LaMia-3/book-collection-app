/**
 * Generic interface for request interceptors
 */
export interface RequestInterceptor<T = any> {
  /**
   * Process a request before it's sent to the API
   * @param request The request object to process
   * @returns The processed request object
   */
  intercept(request: T): T | Promise<T>;
}

/**
 * Generic interface for response interceptors
 */
export interface ResponseInterceptor<T = any, E = Error> {
  /**
   * Process a successful response from the API
   * @param response The successful response to process
   * @returns The processed response
   */
  onSuccess(response: T): T | Promise<T>;

  /**
   * Process an error response from the API
   * @param error The error to process
   * @returns Either the processed error or a recovered response
   */
  onError(error: E): T | E | Promise<T | E>;
}

/**
 * Combined interface for interceptors that handle both requests and responses
 */
export interface Interceptor<TReq = any, TResp = any, E = Error> 
  extends RequestInterceptor<TReq>, ResponseInterceptor<TResp, E> {}

/**
 * Type for a chain of request interceptors
 */
export type RequestInterceptorChain<T = any> = RequestInterceptor<T>[];

/**
 * Type for a chain of response interceptors
 */
export type ResponseInterceptorChain<T = any, E = Error> = ResponseInterceptor<T, E>[];
