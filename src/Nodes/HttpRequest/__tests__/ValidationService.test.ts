import { ValidationService } from '../services/ValidationService';
import { HttpRequestParameters } from '../types';

describe('ValidationService', () => {
  let validationService: ValidationService;

  beforeEach(() => {
    validationService = new ValidationService();
  });

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

      expect(() => validationService.validateParameters(params)).not.toThrow();
    });

    it('should throw error for missing URL', () => {
      const params: any = {
        method: 'GET'
      };

      expect(() => validationService.validateParameters(params)).toThrow('URL is required');
    });

    it('should throw error for missing method', () => {
      const params: any = {
        url: 'https://api.example.com/test'
      };

      expect(() => validationService.validateParameters(params)).toThrow('HTTP method is required');
    });

    it('should throw error for invalid URL format', () => {
      const params: HttpRequestParameters = {
        url: 'not-a-valid-url',
        method: 'GET'
      };

      expect(() => validationService.validateParameters(params)).toThrow('Invalid URL format');
    });

    it('should throw error for invalid HTTP method', () => {
      const params: HttpRequestParameters = {
        url: 'https://api.example.com/test',
        method: 'INVALID'
      };

      expect(() => validationService.validateParameters(params)).toThrow('Invalid HTTP method');
    });

    describe('retry configuration validation', () => {
      it('should validate valid retry configuration', () => {
        const params: HttpRequestParameters = {
          url: 'https://api.example.com/test',
          method: 'GET',
          retry: {
            attempts: 3,
            delay: 1000,
            statusCodes: [500, 502, 503]
          }
        };

        expect(() => validationService.validateParameters(params)).not.toThrow();
      });

      it('should throw error for invalid retry attempts', () => {
        const params: HttpRequestParameters = {
          url: 'https://api.example.com/test',
          method: 'GET',
          retry: {
            attempts: -1,
            delay: 1000,
            statusCodes: [500]
          }
        };

        expect(() => validationService.validateParameters(params)).toThrow('Invalid retry attempts');
      });

      it('should throw error for invalid retry delay', () => {
        const params: HttpRequestParameters = {
          url: 'https://api.example.com/test',
          method: 'GET',
          retry: {
            attempts: 3,
            delay: -1,
            statusCodes: [500]
          }
        };

        expect(() => validationService.validateParameters(params)).toThrow('Invalid retry delay');
      });

      it('should throw error for invalid status codes', () => {
        const params: HttpRequestParameters = {
          url: 'https://api.example.com/test',
          method: 'GET',
          retry: {
            attempts: 3,
            delay: 1000,
            statusCodes: [600]
          }
        };

        expect(() => validationService.validateParameters(params)).toThrow('Invalid status codes');
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

        expect(() => validationService.validateParameters(params)).not.toThrow();
      });

      it('should throw error for invalid cache TTL', () => {
        const params: HttpRequestParameters = {
          url: 'https://api.example.com/test',
          method: 'GET',
          cache: {
            ttl: -1
          }
        };

        expect(() => validationService.validateParameters(params)).toThrow('Invalid cache TTL');
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

        expect(() => validationService.validateParameters(params)).not.toThrow();
      });

      it('should throw error for invalid header values', () => {
        const params: HttpRequestParameters = {
          url: 'https://api.example.com/test',
          method: 'GET',
          headers: {
            'Accept': null as any
          }
        };

        expect(() => validationService.validateParameters(params)).toThrow('Invalid header value');
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

        expect(() => validationService.validateParameters(params)).not.toThrow();
      });

      it('should throw error for invalid query parameter values', () => {
        const params: HttpRequestParameters = {
          url: 'https://api.example.com/test',
          method: 'GET',
          queryParams: {
            page: null as any
          }
        };

        expect(() => validationService.validateParameters(params)).toThrow('Invalid query parameter value');
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

      expect(validationService.shouldRetry(params, 500, 3)).toBe(false);
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

      expect(validationService.shouldRetry(params, 500, 1)).toBe(true);
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

      expect(validationService.shouldRetry(params, 429, 1)).toBe(true);
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

      expect(validationService.shouldRetry(params, 408, 1)).toBe(true);
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

      expect(validationService.shouldRetry(params, 200, 1)).toBe(false);
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

      expect(validationService.shouldRetry(params, 418, 1)).toBe(true);
    });
  });
});
