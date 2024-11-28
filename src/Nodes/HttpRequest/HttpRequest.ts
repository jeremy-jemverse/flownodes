import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import { HttpRequestParameters, HttpRequestResponse } from './types';
import { ValidationService } from './services/ValidationService';
import { CacheService } from './services/CacheService';

export class HttpRequest {
  private validationService: ValidationService;
  private cacheService: CacheService;

  constructor() {
    this.validationService = new ValidationService();
    this.cacheService = new CacheService();
  }

  public async execute(parameters: HttpRequestParameters): Promise<HttpRequestResponse> {
    // Validate parameters
    ValidationService.validateParameters(parameters);

    // Check cache first
    if (parameters.cache && parameters.method === 'GET') {
      const cachedResponse = this.cacheService.get(parameters.url, parameters.method);
      if (cachedResponse) {
        return cachedResponse;
      }
    }

    // Initialize retry count
    let retryCount = 0;

    // Start time for duration tracking
    const startTime = Date.now();

    while (true) {
      try {
        const response = await this.makeRequest(parameters);
        const duration = Date.now() - startTime;

        const result: HttpRequestResponse = {
          statusCode: response.status,
          data: response.data,
          headers: this.normalizeHeaders(response.headers),
          duration,
          retryCount
        };

        // Cache successful GET responses
        if (parameters.cache && parameters.method === 'GET') {
          this.cacheService.set(parameters.url, parameters.method, result, parameters.cache.ttl);
        }

        return result;
      } catch (error) {
        const axiosError = error as AxiosError;
        const statusCode = axiosError.response?.status;
        
        const shouldRetry = parameters.retry &&
          retryCount < parameters.retry.attempts &&
          ValidationService.shouldRetry(parameters, statusCode, retryCount);

        if (shouldRetry) {
          retryCount++;
          await new Promise(resolve => setTimeout(resolve, parameters.retry!.delay));
          continue;
        }

        // If we shouldn't retry, or we've exhausted retries, return the error response
        if (axiosError.response) {
          const duration = Date.now() - startTime;
          return {
            statusCode: axiosError.response.status,
            data: axiosError.response.data,
            headers: this.normalizeHeaders(axiosError.response.headers),
            duration,
            retryCount
          };
        }

        // For network errors, timeout errors, etc.
        throw axiosError;
      }
    }
  }

  private async makeRequest(parameters: HttpRequestParameters): Promise<AxiosResponse> {
    const config: AxiosRequestConfig = {
      url: parameters.url,
      method: parameters.method,
      headers: parameters.headers,
      params: parameters.queryParams,
      data: parameters.body,
      timeout: parameters.timeout
    };

    return axios(config);
  }

  private normalizeHeaders(headers: any): Record<string, string> {
    const normalized: Record<string, string> = {};
    Object.entries(headers || {}).forEach(([key, value]) => {
      normalized[key] = String(value);
    });
    return normalized;
  }

  public clearCache(): void {
    this.cacheService.clear();
  }
}
