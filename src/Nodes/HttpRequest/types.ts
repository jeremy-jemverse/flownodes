export interface HttpRequestParameters {
  url: string;
  method: string;
  headers?: Record<string, string>;
  queryParams?: Record<string, string>;
  body?: any;
  timeout?: number;
  retry?: {
    attempts: number;
    delay: number;
    statusCodes: number[];
  };
  cache?: {
    ttl: number;
  };
}

export interface HttpRequestResponse {
  statusCode: number;
  data: any;
  headers: Record<string, string>;
  duration?: number;
  retryCount?: number;
  fromCache?: boolean;
}

export interface HttpRequestError {
  message: string;
  statusCode?: number;
  error?: any;
  retryCount?: number;
}

export interface CacheEntry {
  response: HttpRequestResponse;
  timestamp: number;
  ttl: number;
}
