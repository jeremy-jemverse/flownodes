import { HttpRequestParameters, HttpRequestResponse } from './types';
export declare class HttpRequest {
    private validationService;
    private cacheService;
    constructor();
    execute(parameters: HttpRequestParameters): Promise<HttpRequestResponse>;
    private makeRequest;
    clearCache(): void;
}
