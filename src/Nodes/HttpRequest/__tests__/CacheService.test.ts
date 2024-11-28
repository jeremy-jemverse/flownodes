import { CacheService } from '../services/CacheService';
import { HttpRequestResponse } from '../types';

describe('CacheService', () => {
  let cacheService: CacheService;

  beforeEach(() => {
    cacheService = new CacheService();
  });

  describe('set and get', () => {
    it('should store and retrieve cached response', () => {
      const url = 'https://api.example.com/test';
      const method = 'GET';
      const response: HttpRequestResponse = {
        data: { test: 'data' },
        statusCode: 200,
        headers: { 'content-type': 'application/json' }
      };

      cacheService.set(url, method, response, 300);
      const cached = cacheService.get(url, method);

      expect(cached).toEqual({
        ...response,
        fromCache: true
      });
    });

    it('should return null for non-existent cache entry', () => {
      const url = 'https://api.example.com/test';
      const method = 'GET';

      const cached = cacheService.get(url, method);
      expect(cached).toBeNull();
    });

    it('should return null for expired cache entry', async () => {
      const url = 'https://api.example.com/test';
      const method = 'GET';
      const response: HttpRequestResponse = {
        data: { test: 'data' },
        statusCode: 200,
        headers: { 'content-type': 'application/json' }
      };

      cacheService.set(url, method, response, 1); // 1 second TTL

      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 1100));

      const cached = cacheService.get(url, method);
      expect(cached).toBeNull();
    });

    it('should handle different URLs with same method', () => {
      const method = 'GET';
      const response: HttpRequestResponse = {
        data: { test: 'data' },
        statusCode: 200,
        headers: { 'content-type': 'application/json' }
      };

      const url1 = 'https://api.example.com/test1';
      const url2 = 'https://api.example.com/test2';

      cacheService.set(url1, method, response, 300);
      cacheService.set(url2, method, response, 300);

      expect(cacheService.get(url1, method)).toEqual({
        ...response,
        fromCache: true
      });
      expect(cacheService.get(url2, method)).toEqual({
        ...response,
        fromCache: true
      });
    });

    it('should handle same URL with different methods', () => {
      const url = 'https://api.example.com/test';
      const response: HttpRequestResponse = {
        data: { test: 'data' },
        statusCode: 200,
        headers: { 'content-type': 'application/json' }
      };

      cacheService.set(url, 'GET', response, 300);
      cacheService.set(url, 'POST', response, 300);

      expect(cacheService.get(url, 'GET')).toEqual({
        ...response,
        fromCache: true
      });
      expect(cacheService.get(url, 'POST')).toEqual({
        ...response,
        fromCache: true
      });
    });
  });

  describe('clear', () => {
    it('should clear all cache entries', () => {
      const url1 = 'https://api.example.com/test1';
      const url2 = 'https://api.example.com/test2';
      const method = 'GET';
      const response: HttpRequestResponse = {
        data: { test: 'data' },
        statusCode: 200,
        headers: { 'content-type': 'application/json' }
      };

      cacheService.set(url1, method, response, 300);
      cacheService.set(url2, method, response, 300);

      cacheService.clear();

      expect(cacheService.get(url1, method)).toBeNull();
      expect(cacheService.get(url2, method)).toBeNull();
    });
  });

  describe('clearExpired', () => {
    it('should only clear expired cache entries', async () => {
      const url1 = 'https://api.example.com/test1';
      const url2 = 'https://api.example.com/test2';
      const method = 'GET';
      const response: HttpRequestResponse = {
        data: { test: 'data' },
        statusCode: 200,
        headers: { 'content-type': 'application/json' }
      };

      // Set one entry with short TTL and one with long TTL
      cacheService.set(url1, method, response, 1);
      cacheService.set(url2, method, response, 300);

      // Wait for first entry to expire
      await new Promise(resolve => setTimeout(resolve, 1100));

      cacheService.clearExpired();

      expect(cacheService.get(url1, method)).toBeNull();
      expect(cacheService.get(url2, method)).toEqual({
        ...response,
        fromCache: true
      });
    });
  });
});
