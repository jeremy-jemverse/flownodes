import { HttpRequestParameters, HttpRequestResponse } from './types';
export declare class HttpRequest {
    execute(parameters: HttpRequestParameters): Promise<HttpRequestResponse>;
}
