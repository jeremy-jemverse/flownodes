import { HttpRequestParameters } from '../types';

export class ValidationService {
  public static validateParameters(parameters: HttpRequestParameters): void {
    // Validate required fields
    if (!parameters.url) {
      throw new Error('URL is required');
    }

    if (!parameters.method) {
      throw new Error('HTTP method is required');
    }

    // Validate URL format
    try {
      new URL(parameters.url);
    } catch (error) {
      throw new Error('Invalid URL format');
    }

    // Validate HTTP method
    const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];
    if (!validMethods.includes(parameters.method)) {
      throw new Error('Invalid HTTP method');
    }

    // Validate timeout
    if (parameters.timeout !== undefined && (typeof parameters.timeout !== 'number' || parameters.timeout <= 0)) {
      throw new Error('Timeout must be a positive number');
    }

    // Validate retry configuration
    if (parameters.retry) {
      if (typeof parameters.retry.attempts !== 'number' || parameters.retry.attempts <= 0) {
        throw new Error('Retry attempts must be a positive number');
      }

      if (typeof parameters.retry.delay !== 'number' || parameters.retry.delay <= 0) {
        throw new Error('Retry delay must be a positive number');
      }

      if (!Array.isArray(parameters.retry.statusCodes) || parameters.retry.statusCodes.length === 0) {
        throw new Error('Retry status codes must be a non-empty array');
      }

      for (const code of parameters.retry.statusCodes) {
        if (typeof code !== 'number' || code < 100 || code > 599) {
          throw new Error('Invalid retry status code');
        }
      }
    }

    // Validate cache configuration
    if (parameters.cache) {
      if (typeof parameters.cache.ttl !== 'number' || parameters.cache.ttl <= 0) {
        throw new Error('Cache TTL must be a positive number');
      }
    }

    // Validate headers
    if (parameters.headers) {
      for (const [key, value] of Object.entries(parameters.headers)) {
        if (typeof value !== 'string') {
          throw new Error('Header values must be strings');
        }
      }
    }

    // Validate query parameters
    if (parameters.queryParams) {
      for (const [key, value] of Object.entries(parameters.queryParams)) {
        if (typeof value !== 'string') {
          throw new Error('Query parameter values must be strings');
        }
      }
    }
  }

  public static shouldRetry(parameters: HttpRequestParameters, statusCode: number | undefined, retryCount: number): boolean {
    if (!parameters.retry || retryCount >= parameters.retry.attempts) {
      return false;
    }

    if (!statusCode) {
      return false;
    }

    return parameters.retry.statusCodes.includes(statusCode);
  }
}
