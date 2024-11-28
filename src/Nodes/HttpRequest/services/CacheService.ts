import { CacheEntry, HttpRequestResponse } from '../types';

export class CacheService {
  private cache: Map<string, CacheEntry>;

  constructor() {
    this.cache = new Map();
  }

  private generateCacheKey(url: string, method: string, queryParams?: Record<string, string>): string {
    const queryString = queryParams ? new URLSearchParams(queryParams).toString() : '';
    return `${method}:${url}${queryString ? `?${queryString}` : ''}`;
  }

  set(
    url: string,
    method: string,
    response: HttpRequestResponse,
    ttl: number,
    queryParams?: Record<string, string>
  ): void {
    const key = this.generateCacheKey(url, method, queryParams);
    this.cache.set(key, {
      response,
      timestamp: Date.now(),
      ttl,
    });
  }

  get(url: string, method: string, queryParams?: Record<string, string>): HttpRequestResponse | null {
    const key = this.generateCacheKey(url, method, queryParams);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    const age = (Date.now() - entry.timestamp) / 1000; // Convert to seconds
    if (age > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return {
      ...entry.response,
      fromCache: true,
    };
  }

  clear(): void {
    this.cache.clear();
  }

  clearExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      const age = (now - entry.timestamp) / 1000;
      if (age > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }
}
