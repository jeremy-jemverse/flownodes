import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { HttpRequestParameters, HttpRequestResponse, HttpRequestError } from './types';

export class HttpRequest {
  async execute(parameters: HttpRequestParameters): Promise<HttpRequestResponse> {
    try {
      const config: AxiosRequestConfig = {
        url: parameters.url,
        method: parameters.method,
        headers: parameters.headers || {},
        params: parameters.queryParams,
        data: parameters.body,
        timeout: parameters.timeout || 10000,
        validateStatus: () => true, // Don't throw on any status code
      };

      const response: AxiosResponse = await axios(config);

      return {
        statusCode: response.status,
        data: response.data,
        headers: response.headers as Record<string, string>,
      };
    } catch (error: any) {
      const httpError: HttpRequestError = {
        message: error.message || 'Request failed',
        statusCode: error.response?.status,
        error: error.response?.data || error,
      };
      throw httpError;
    }
  }
}
