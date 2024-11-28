import { HttpRequest } from '../HttpRequest';
import { HttpRequestParameters, HttpRequestResponse } from '../types';
import axios, { AxiosError } from 'axios';
import nock from 'nock';
import { ValidationService } from '../services/ValidationService';
import { CacheService } from '../services/CacheService';

// Mock ValidationService
const mockValidateParameters = jest.fn();
const mockShouldRetry = jest.fn();
jest.mock('../services/ValidationService', () => ({
  ValidationService: {
    validateParameters: (...args: any[]) => mockValidateParameters(...args),
    shouldRetry: (...args: any[]) => mockShouldRetry(...args)
  }
}));

// Mock CacheService
class MockCacheService {
  get = jest.fn();
  set = jest.fn();
  clear = jest.fn();
}

const mockCacheServiceInstance = new MockCacheService();
jest.mock('../services/CacheService', () => ({
  CacheService: jest.fn(() => mockCacheServiceInstance)
}));

describe('HttpRequest', () => {
  let httpRequest: HttpRequest;
  const baseUrl = 'https://api.example.com';

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup ValidationService mock
    mockValidateParameters.mockReset();
    mockValidateParameters.mockReturnValue(true);
    mockShouldRetry.mockReset();
    mockShouldRetry.mockReturnValue(true);
    
    // Setup CacheService mock
    mockCacheServiceInstance.get.mockReset();
    mockCacheServiceInstance.set.mockReset();
    mockCacheServiceInstance.clear.mockReset();
    mockCacheServiceInstance.get.mockReturnValue(null);
    
    // Create HttpRequest instance
    httpRequest = new HttpRequest();
    
    // Clean up nock
    nock.cleanAll();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  afterAll(() => {
    nock.restore();
  });

  it('should make a successful GET request', async () => {
    const mockResponse = { data: 'test' };
    nock(baseUrl)
      .get('/test')
      .reply(200, mockResponse);

    const params: HttpRequestParameters = {
      url: `${baseUrl}/test`,
      method: 'GET'
    };

    const response = await httpRequest.execute(params);
    expect(response.statusCode).toBe(200);
    expect(response.data).toEqual(mockResponse);
    expect(mockValidateParameters).toHaveBeenCalledWith(params);
  });

  it('should handle network errors', async () => {
    const params: HttpRequestParameters = {
      url: 'http://non-existent-domain.com',
      method: 'GET'
    };

    await expect(httpRequest.execute(params)).rejects.toThrow();
    expect(mockValidateParameters).toHaveBeenCalledWith(params);
  });

  it('should handle timeout errors', async () => {
    nock(baseUrl)
      .get('/test')
      .delayConnection(2000)
      .reply(200);

    const params: HttpRequestParameters = {
      url: `${baseUrl}/test`,
      method: 'GET',
      timeout: 1000
    };

    await expect(httpRequest.execute(params)).rejects.toThrow();
    expect(mockValidateParameters).toHaveBeenCalledWith(params);
  });

  it('should retry on server errors', async () => {
    mockShouldRetry.mockReturnValueOnce(true).mockReturnValue(false);

    nock(baseUrl)
      .get('/test')
      .reply(500)
      .get('/test')
      .reply(200, { success: true });

    const params: HttpRequestParameters = {
      url: `${baseUrl}/test`,
      method: 'GET',
      retry: {
        attempts: 3,
        delay: 100,
        statusCodes: [500]
      }
    };

    const response = await httpRequest.execute(params);
    expect(response.statusCode).toBe(200);
    expect(response.data).toEqual({ success: true });
    expect(response.retryCount).toBe(1);
    expect(mockValidateParameters).toHaveBeenCalledWith(params);
    expect(mockShouldRetry).toHaveBeenCalledWith(params, 500, 0);
  });

  it('should use cache for GET requests', async () => {
    const mockResponse = { data: 'cached' };
    const params: HttpRequestParameters = {
      url: `${baseUrl}/test`,
      method: 'GET',
      cache: {
        ttl: 5000
      }
    };

    // Mock cache miss for first request
    mockCacheServiceInstance.get.mockReturnValueOnce(null);

    nock(baseUrl)
      .get('/test')
      .reply(200, mockResponse);

    // First request
    const response1 = await httpRequest.execute(params);
    expect(response1.statusCode).toBe(200);
    expect(response1.data).toEqual(mockResponse);
    expect(mockCacheServiceInstance.set).toHaveBeenCalled();
    expect(mockValidateParameters).toHaveBeenCalledWith(params);

    // Mock cache hit for second request
    mockCacheServiceInstance.get.mockReturnValueOnce({
      statusCode: 200,
      data: mockResponse,
      fromCache: true
    } as HttpRequestResponse);

    // Second request should be from cache
    const response2 = await httpRequest.execute(params);
    expect(response2.statusCode).toBe(200);
    expect(response2.data).toEqual(mockResponse);
    expect(response2.fromCache).toBe(true);
    expect(mockValidateParameters).toHaveBeenCalledWith(params);
  });

  it('should not cache non-GET requests', async () => {
    const mockResponse = { data: 'test' };
    nock(baseUrl)
      .post('/test')
      .reply(200, mockResponse)
      .post('/test')
      .reply(200, { data: 'different' });

    const params: HttpRequestParameters = {
      url: `${baseUrl}/test`,
      method: 'POST',
      cache: {
        ttl: 5000
      }
    };

    const response1 = await httpRequest.execute(params);
    expect(response1.statusCode).toBe(200);
    expect(response1.data).toEqual(mockResponse);
    expect(mockCacheServiceInstance.set).not.toHaveBeenCalled();
    expect(mockValidateParameters).toHaveBeenCalledWith(params);

    const response2 = await httpRequest.execute(params);
    expect(response2.statusCode).toBe(200);
    expect(response2.data).toEqual({ data: 'different' });
    expect(response2.fromCache).toBeUndefined();
    expect(mockValidateParameters).toHaveBeenCalledWith(params);
  });
});
