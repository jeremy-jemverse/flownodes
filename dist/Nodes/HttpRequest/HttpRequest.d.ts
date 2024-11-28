import { HttpRequestParameters, HttpRequestResponse } from './types';
export declare class HttpRequest {
    private cacheService;
    constructor();
    execute(parameters: HttpRequestParameters): Promise<HttpRequestResponse>;
    private makeRequest;
    private normalizeHeaders;
    clearCache(): void;
}
