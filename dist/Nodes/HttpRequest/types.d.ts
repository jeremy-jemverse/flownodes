export interface HttpRequestParameters {
    url: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    headers?: Record<string, string>;
    queryParams?: Record<string, string>;
    body?: any;
    timeout?: number;
}
export interface HttpRequestResponse {
    statusCode: number;
    data: any;
    headers: Record<string, string>;
}
export interface HttpRequestError {
    message: string;
    statusCode?: number;
    error?: any;
}
