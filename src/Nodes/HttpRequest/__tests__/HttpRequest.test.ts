import { HttpRequest } from '../HttpRequest';
import nock from 'nock';
import { HttpRequestParameters } from '../types';

describe('HttpRequest', () => {
  let httpRequest: HttpRequest;

  beforeEach(() => {
    httpRequest = new HttpRequest();
    nock.cleanAll();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('execute', () => {
    it('should make successful request', async () => {
      const mockResponse = { data: 'test' };
      nock('https://api.example.com')
        .get('/test')
        .reply(200, mockResponse);

      const params: HttpRequestParameters = {
        url: 'https://api.example.com/test',
        method: 'GET'
      };

      const response = await httpRequest.execute(params);
      expect(response.statusCode).toBe(200);
      expect(response.data).toEqual(mockResponse);
    });

    it('should handle request with query parameters', async () => {
      const mockResponse = { data: 'test' };
      nock('https://api.example.com')
        .get('/test')
        .query({ page: '1' })
        .reply(200, mockResponse);

      const params: HttpRequestParameters = {
        url: 'https://api.example.com/test',
        method: 'GET',
        queryParams: { page: '1' }
      };

      const response = await httpRequest.execute(params);
      expect(response.statusCode).toBe(200);
      expect(response.data).toEqual(mockResponse);
    });

    it('should handle request with headers', async () => {
      const mockResponse = { data: 'test' };
      nock('https://api.example.com')
        .get('/test')
        .matchHeader('Authorization', 'Bearer token')
        .reply(200, mockResponse);

      const params: HttpRequestParameters = {
        url: 'https://api.example.com/test',
        method: 'GET',
        headers: { 'Authorization': 'Bearer token' }
      };

      const response = await httpRequest.execute(params);
      expect(response.statusCode).toBe(200);
      expect(response.data).toEqual(mockResponse);
    });

    describe('retry logic', () => {
      it('should retry on server error', async () => {
        const mockResponse = { error: 'Server Error' };
        nock('https://api.example.com')
          .get('/test')
          .times(2)
          .reply(500, mockResponse)
          .get('/test')
          .reply(200, { data: 'success' });

        const params: HttpRequestParameters = {
          url: 'https://api.example.com/test',
          method: 'GET',
          retry: {
            attempts: 3,
            delay: 100,
            statusCodes: [500]
          }
        };

        const response = await httpRequest.execute(params);
        expect(response.statusCode).toBe(200);
        expect(response.retryCount).toBe(2);
      });

      it('should retry on rate limit', async () => {
        const mockResponse = { error: 'Rate Limited' };
        nock('https://api.example.com')
          .get('/test')
          .times(2)
          .reply(429, mockResponse)
          .get('/test')
          .reply(200, { data: 'success' });

        const params: HttpRequestParameters = {
          url: 'https://api.example.com/test',
          method: 'GET',
          retry: {
            attempts: 3,
            delay: 100,
            statusCodes: [429]
          }
        };

        const response = await httpRequest.execute(params);
        expect(response.statusCode).toBe(200);
        expect(response.retryCount).toBe(2);
      });

      it('should respect max retry attempts', async () => {
        nock('https://api.example.com')
          .get('/test')
          .times(3)
          .reply(500, { error: 'Server Error' });

        const params: HttpRequestParameters = {
          url: 'https://api.example.com/test',
          method: 'GET',
          retry: {
            attempts: 2,
            delay: 100,
            statusCodes: [500]
          }
        };

        const response = await httpRequest.execute(params);
        expect(response.statusCode).toBe(500);
        expect(response.retryCount).toBe(2);
      });

      it('should respect custom status codes to retry', async () => {
        const mockResponse = { error: 'Custom Error' };
        nock('https://api.example.com')
          .get('/test')
          .times(2)
          .reply(418, mockResponse)
          .get('/test')
          .reply(200, { data: 'success' });

        const params: HttpRequestParameters = {
          url: 'https://api.example.com/test',
          method: 'GET',
          retry: {
            attempts: 3,
            delay: 100,
            statusCodes: [418]
          }
        };

        const response = await httpRequest.execute(params);
        expect(response.statusCode).toBe(200);
        expect(response.retryCount).toBe(2);
      });
    });

    describe('caching', () => {
      it('should cache successful GET requests', async () => {
        const mockResponse = { data: 'test' };
        nock('https://api.example.com')
          .get('/test')
          .reply(200, mockResponse);

        const params: HttpRequestParameters = {
          url: 'https://api.example.com/test',
          method: 'GET',
          cache: {
            ttl: 300
          }
        };

        // First request should hit the network
        const response1 = await httpRequest.execute(params);
        expect(response1.statusCode).toBe(200);
        expect(response1.data).toEqual(mockResponse);

        // Second request should come from cache
        const response2 = await httpRequest.execute(params);
        expect(response2.statusCode).toBe(200);
        expect(response2.data).toEqual(mockResponse);
        expect(response2.fromCache).toBe(true);
      });

      it('should not cache non-GET requests', async () => {
        const mockResponse = { data: 'test' };
        nock('https://api.example.com')
          .post('/test')
          .times(2)
          .reply(200, mockResponse);

        const params: HttpRequestParameters = {
          url: 'https://api.example.com/test',
          method: 'POST',
          cache: {
            ttl: 300
          }
        };

        // Both requests should hit the network
        const response1 = await httpRequest.execute(params);
        const response2 = await httpRequest.execute(params);

        expect(response1.fromCache).toBe(false);
        expect(response2.fromCache).toBe(false);
      });

      it('should respect cache TTL', async () => {
        const mockResponse = { data: 'test' };
        nock('https://api.example.com')
          .get('/test')
          .times(2)
          .reply(200, mockResponse);

        const params: HttpRequestParameters = {
          url: 'https://api.example.com/test',
          method: 'GET',
          cache: {
            ttl: 1
          }
        };

        // First request should hit the network
        const response1 = await httpRequest.execute(params);
        expect(response1.fromCache).toBe(false);

        // Wait for cache to expire
        await new Promise(resolve => setTimeout(resolve, 1100));

        // Second request should hit the network again
        const response2 = await httpRequest.execute(params);
        expect(response2.fromCache).toBe(false);
      });

      it('should clear cache when requested', async () => {
        const mockResponse = { data: 'test' };
        nock('https://api.example.com')
          .get('/test')
          .times(2)
          .reply(200, mockResponse);

        const params: HttpRequestParameters = {
          url: 'https://api.example.com/test',
          method: 'GET',
          cache: {
            ttl: 300
          }
        };

        // First request should hit the network
        await httpRequest.execute(params);

        // Clear cache
        httpRequest.clearCache();

        // Second request should hit the network again
        const response2 = await httpRequest.execute(params);
        expect(response2.fromCache).toBe(false);
      });
    });

    describe('error handling', () => {
      it('should handle network errors', async () => {
        nock('https://api.example.com')
          .get('/test')
          .replyWithError('Network error');

        const params: HttpRequestParameters = {
          url: 'https://api.example.com/test',
          method: 'GET'
        };

        try {
          await httpRequest.execute(params);
          fail('Expected an error to be thrown');
        } catch (error) {
          expect(error.message).toContain('Network error');
        }
      });

      it('should handle timeout errors', async () => {
        nock('https://api.example.com')
          .get('/test')
          .delayConnection(1000)
          .reply(200);

        const params: HttpRequestParameters = {
          url: 'https://api.example.com/test',
          method: 'GET',
          timeout: 100
        };

        try {
          await httpRequest.execute(params);
          fail('Expected an error to be thrown');
        } catch (error) {
          expect(error.message).toContain('timeout');
        }
      });

      it('should handle server errors', async () => {
        nock('https://api.example.com')
          .get('/test')
          .reply(500, { error: 'Internal Server Error' });

        const params: HttpRequestParameters = {
          url: 'https://api.example.com/test',
          method: 'GET'
        };

        const response = await httpRequest.execute(params);
        expect(response.statusCode).toBe(500);
        expect(response.data).toEqual({ error: 'Internal Server Error' });
      });
    });

    describe('performance metrics', () => {
      it('should track request duration', async () => {
        nock('https://api.example.com')
          .get('/test')
          .delay(100)
          .reply(200, { data: 'test' });

        const params: HttpRequestParameters = {
          url: 'https://api.example.com/test',
          method: 'GET'
        };

        const response = await httpRequest.execute(params);
        expect(response.duration).toBeGreaterThanOrEqual(100);
      });

      it('should track retry count', async () => {
        nock('https://api.example.com')
          .get('/test')
          .times(2)
          .reply(500)
          .get('/test')
          .reply(200, { data: 'success' });

        const params: HttpRequestParameters = {
          url: 'https://api.example.com/test',
          method: 'GET',
          retry: {
            attempts: 3,
            delay: 100,
            statusCodes: [500]
          }
        };

        const response = await httpRequest.execute(params);
        expect(response.retryCount).toBe(2);
      });
    });
  });
});
