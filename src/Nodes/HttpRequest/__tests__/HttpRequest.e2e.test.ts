import { HttpRequest } from '../HttpRequest';
import express from 'express';
import { Server } from 'http';
import { HttpRequestParameters } from '../types';

describe('HttpRequest E2E Tests', () => {
  let server: Server;
  let httpRequest: HttpRequest;
  const port = 3456;
  const baseUrl = `http://localhost:${port}`;

  beforeAll(async () => {
    // Setup test server
    const app = express();
    
    // Success endpoint
    app.get('/success', (req, res) => {
      res.json({ message: 'success' });
    });

    // Delayed response endpoint
    app.get('/delay', (req, res) => {
      setTimeout(() => {
        res.json({ message: 'delayed' });
      }, 1000);
    });

    // Rate limit endpoint
    let requestCount = 0;
    app.get('/rate-limit', (req, res) => {
      requestCount++;
      if (requestCount <= 2) {
        res.status(429).json({ error: 'Too Many Requests' });
      } else {
        res.json({ message: 'success after retry' });
      }
    });

    // Error endpoint
    app.get('/error', (req, res) => {
      res.status(500).json({ error: 'Internal Server Error' });
    });

    // Query params endpoint
    app.get('/query', (req, res) => {
      res.json({ params: req.query });
    });

    server = app.listen(port);
    httpRequest = new HttpRequest();
  });

  afterAll(async () => {
    server.close();
  });

  it('should successfully make a GET request', async () => {
    const params: HttpRequestParameters = {
      url: `${baseUrl}/success`,
      method: 'GET'
    };

    const response = await httpRequest.execute(params);
    expect(response.statusCode).toBe(200);
    expect(response.data).toEqual({ message: 'success' });
    expect(response.duration).toBeDefined();
    expect(response.retryCount).toBe(0);
  });

  it('should handle query parameters correctly', async () => {
    const params: HttpRequestParameters = {
      url: `${baseUrl}/query`,
      method: 'GET',
      queryParams: {
        name: 'test',
        value: '123'
      }
    };

    const response = await httpRequest.execute(params);
    expect(response.statusCode).toBe(200);
    expect(response.data.params).toEqual({
      name: 'test',
      value: '123'
    });
  });

  it('should retry on rate limit and eventually succeed', async () => {
    const params: HttpRequestParameters = {
      url: `${baseUrl}/rate-limit`,
      method: 'GET',
      retry: {
        attempts: 3,
        delay: 100,
        statusCodes: [429]
      }
    };

    const response = await httpRequest.execute(params);
    expect(response.statusCode).toBe(200);
    expect(response.data).toEqual({ message: 'success after retry' });
    expect(response.retryCount).toBeGreaterThan(0);
  });

  it('should respect timeout settings', async () => {
    const params: HttpRequestParameters = {
      url: `${baseUrl}/delay`,
      method: 'GET',
      timeout: 500
    };

    await expect(httpRequest.execute(params)).rejects.toThrow();
  });

  it('should use cache for repeated GET requests', async () => {
    const params: HttpRequestParameters = {
      url: `${baseUrl}/success`,
      method: 'GET',
      cache: {
        ttl: 5000
      }
    };

    // First request
    const response1 = await httpRequest.execute(params);
    expect(response1.statusCode).toBe(200);

    // Second request should be from cache
    const response2 = await httpRequest.execute(params);
    expect(response2.statusCode).toBe(200);
    expect(response2.fromCache).toBe(true);
  });

  it('should handle server errors appropriately', async () => {
    const params: HttpRequestParameters = {
      url: `${baseUrl}/error`,
      method: 'GET',
      retry: {
        attempts: 2,
        delay: 100,
        statusCodes: [500]
      }
    };

    const response = await httpRequest.execute(params);
    expect(response.statusCode).toBe(500);
    expect(response.data).toEqual({ error: 'Internal Server Error' });
    expect(response.retryCount).toBeGreaterThan(0);
  });
});
