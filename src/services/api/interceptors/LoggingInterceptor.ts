import { Interceptor } from './Interceptor';

/**
 * An interceptor that logs requests and responses for debugging
 */
export class LoggingInterceptor<TReq = any, TResp = any> implements Interceptor<TReq, TResp> {
  private readonly name: string;
  private readonly level: 'debug' | 'info' | 'warn' | 'error';
  
  /**
   * Create a new logging interceptor
   * @param name A name for this interceptor (e.g., the API name)
   * @param level The logging level to use
   */
  constructor(name: string, level: 'debug' | 'info' | 'warn' | 'error' = 'info') {
    this.name = name;
    this.level = level;
  }
  
  /**
   * Log the outgoing request
   */
  intercept(request: TReq): TReq {
    this.log(`📤 Request [${this.name}]:`, request);
    return request;
  }
  
  /**
   * Log the successful response
   */
  onSuccess(response: TResp): TResp {
    this.log(`📥 Response [${this.name}]:`, response);
    return response;
  }
  
  /**
   * Log the error response
   */
  onError(error: Error): Error {
    this.log(`❌ Error [${this.name}]:`, error, 'error');
    return error;
  }
  
  /**
   * Log a message with the appropriate level
   */
  private log(message: string, data: any, overrideLevel?: 'debug' | 'info' | 'warn' | 'error'): void {
    const level = overrideLevel || this.level;
    
    switch (level) {
      case 'debug':
        console.debug(message, data);
        break;
      case 'info':
        console.info(message, data);
        break;
      case 'warn':
        console.warn(message, data);
        break;
      case 'error':
        console.error(message, data);
        break;
    }
  }
}
