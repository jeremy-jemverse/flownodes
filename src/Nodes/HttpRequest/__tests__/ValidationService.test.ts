import { ValidationService } from '../services/ValidationService';
import { HttpRequestParameters } from '../types';

describe('ValidationService', () => {
  describe('validateParameters', () => {
    it('should validate valid parameters', () => {
      const params: HttpRequestParameters = {
        url: 'https://api.example.com/test',
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        queryParams: { page: '1' },
        retry: {
          attempts: 3,
          delay: 1000,
          statusCodes: [500, 502, 503]
        },
        cache: {
          ttl: 300
        }
      };

      expect(() => ValidationService.validateParameters(params)).not.toThrow();
    });

    it('should throw error for missing URL', () => {
      const params: any = {
        method: 'GET'
      };

      expect(() => ValidationService.validateParameters(params)).toThrow('URL is required');
    });

    it('should throw error for missing method', () => {
      const params: any = {
        url: 'https://api.example.com/test'
      };

      expect(() => ValidationService.validateParameters(params)).toThrow('HTTP method is required');
    });

    it('should throw error for invalid URL format', () => {
      const params: HttpRequestParameters = {
        url: 'not-a-valid-url',
        method: 'GET'
      };

      expect(() => ValidationService.validateParameters(params)).toThrow('Invalid URL format');
    });

    it('should throw error for invalid HTTP method', () => {
      const params: HttpRequestParameters = {
        url: 'https://api.example.com/test',
        method: 'INVALID'
      };

      expect(() => ValidationService.validateParameters(params)).toThrow('Invalid HTTP method');
    });

    describe('retry configuration validation', () => {
      const validParams: HttpRequestParameters = {
        url: 'https://api.example.com/test',
        method: 'GET',
        retry: {
          attempts: 3,
          delay: 1000,
          statusCodes: [500, 502, 503]
        }
      };

      it('should validate valid retry configuration', () => {
        expect(() => ValidationService.validateParameters(validParams)).not.toThrow();
      });

      it('should throw error for invalid retry attempts', () => {
        const params: HttpRequestParameters = {
          ...validParams,
          retry: {
            ...validParams.retry!,
            attempts: -1
          }
        };

        expect(() => ValidationService.validateParameters(params))
          .toThrow('Retry attempts must be a positive number');
      });

      it('should throw error for invalid retry delay', () => {
        const params: HttpRequestParameters = {
          ...validParams,
          retry: {
            ...validParams.retry!,
            delay: -1
          }
        };

        expect(() => ValidationService.validateParameters(params))
          .toThrow('Retry delay must be a positive number');
      });

      it('should throw error for invalid status codes', () => {
        const params: HttpRequestParameters = {
          ...validParams,
          retry: {
            ...validParams.retry!,
            statusCodes: [600]
          }
        };

        expect(() => ValidationService.validateParameters(params))
          .toThrow('Invalid retry status code');
      });
    });

    describe('cache configuration validation', () => {
      it('should validate valid cache configuration', () => {
        const params: HttpRequestParameters = {
          url: 'https://api.example.com/test',
          method: 'GET',
          cache: {
            ttl: 300
          }
        };

        expect(() => ValidationService.validateParameters(params)).not.toThrow();
      });

      it('should throw error for invalid cache TTL', () => {
        const params: HttpRequestParameters = {
          url: 'https://api.example.com/test',
          method: 'GET',
          cache: {
            ttl: -1
          }
        };

        expect(() => ValidationService.validateParameters(params))
          .toThrow('Cache TTL must be a positive number');
      });
    });

    describe('headers and query parameters validation', () => {
      it('should validate valid headers', () => {
        const params: HttpRequestParameters = {
          url: 'https://api.example.com/test',
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Authorization': 'Bearer token'
          }
        };

        expect(() => ValidationService.validateParameters(params)).not.toThrow();
      });

      it('should throw error for invalid header values', () => {
        const params: HttpRequestParameters = {
          url: 'https://api.example.com/test',
          method: 'GET',
          headers: {
            'test-header': null as any
          }
        };

        expect(() => ValidationService.validateParameters(params))
          .toThrow('Header values must be strings');
      });

      it('should validate valid query parameters', () => {
        const params: HttpRequestParameters = {
          url: 'https://api.example.com/test',
          method: 'GET',
          queryParams: {
            page: '1',
            limit: '10'
          }
        };

        expect(() => ValidationService.validateParameters(params)).not.toThrow();
      });

      it('should throw error for invalid query parameter values', () => {
        const params: HttpRequestParameters = {
          url: 'https://api.example.com/test',
          method: 'GET',
          queryParams: {
            'test-param': null as any
          }
        };

        expect(() => ValidationService.validateParameters(params))
          .toThrow('Query parameter values must be strings');
      });
    });
  });

  describe('shouldRetry', () => {
    it('should return false if max attempts reached', () => {
      const params: HttpRequestParameters = {
        url: 'https://api.example.com/test',
        method: 'GET',
        retry: {
          attempts: 3,
          delay: 1000,
          statusCodes: [500]
        }
      };

      expect(ValidationService.shouldRetry(params, 500, 3)).toBe(false);
    });

    it('should return true for server errors by default', () => {
      const params: HttpRequestParameters = {
        url: 'https://api.example.com/test',
        method: 'GET',
        retry: {
          attempts: 3,
          delay: 1000,
          statusCodes: [500, 502, 503]
        }
      };

      expect(ValidationService.shouldRetry(params, 500, 1)).toBe(true);
    });

    it('should return true for rate limit errors by default', () => {
      const params: HttpRequestParameters = {
        url: 'https://api.example.com/test',
        method: 'GET',
        retry: {
          attempts: 3,
          delay: 1000,
          statusCodes: [429]
        }
      };

      expect(ValidationService.shouldRetry(params, 429, 1)).toBe(true);
    });

    it('should return true for timeout errors by default', () => {
      const params: HttpRequestParameters = {
        url: 'https://api.example.com/test',
        method: 'GET',
        retry: {
          attempts: 3,
          delay: 1000,
          statusCodes: [408]
        }
      };

      expect(ValidationService.shouldRetry(params, 408, 1)).toBe(true);
    });

    it('should return false for successful responses', () => {
      const params: HttpRequestParameters = {
        url: 'https://api.example.com/test',
        method: 'GET',
        retry: {
          attempts: 3,
          delay: 1000,
          statusCodes: [500]
        }
      };

      expect(ValidationService.shouldRetry(params, 200, 1)).toBe(false);
    });

    it('should respect custom status codes to retry', () => {
      const params: HttpRequestParameters = {
        url: 'https://api.example.com/test',
        method: 'GET',
        retry: {
          attempts: 3,
          delay: 1000,
          statusCodes: [418]
        }
      };

      expect(ValidationService.shouldRetry(params, 418, 1)).toBe(true);
    });
  });
});
