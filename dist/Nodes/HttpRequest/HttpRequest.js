"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpRequest = void 0;
const axios_1 = __importDefault(require("axios"));
const ValidationService_1 = require("./services/ValidationService");
const CacheService_1 = require("./services/CacheService");
class HttpRequest {
    constructor() {
        this.cacheService = new CacheService_1.CacheService();
    }
    async execute(parameters) {
        // Validate parameters
        ValidationService_1.ValidationService.validateParameters(parameters);
        // Check cache first
        if (parameters.cache && parameters.method === 'GET') {
            const cachedResponse = this.cacheService.get(parameters.url, parameters.method);
            if (cachedResponse) {
                return cachedResponse;
            }
        }
        // Initialize retry count
        let retryCount = 0;
        // Start time for duration tracking
        const startTime = Date.now();
        while (true) {
            try {
                const response = await this.makeRequest(parameters);
                const duration = Date.now() - startTime;
                const result = {
                    statusCode: response.status,
                    data: response.data,
                    headers: this.normalizeHeaders(response.headers),
                    duration,
                    retryCount
                };
                // Cache successful GET responses
                if (parameters.cache && parameters.method === 'GET') {
                    this.cacheService.set(parameters.url, parameters.method, result, parameters.cache.ttl);
                }
                return result;
            }
            catch (error) {
                const axiosError = error;
                const statusCode = axiosError.response?.status;
                const shouldRetry = parameters.retry &&
                    retryCount < parameters.retry.attempts &&
                    ValidationService_1.ValidationService.shouldRetry(parameters, statusCode, retryCount);
                if (shouldRetry) {
                    retryCount++;
                    await new Promise(resolve => setTimeout(resolve, parameters.retry.delay));
                    continue;
                }
                // If we shouldn't retry, or we've exhausted retries, return the error response
                if (axiosError.response) {
                    const duration = Date.now() - startTime;
                    return {
                        statusCode: axiosError.response.status,
                        data: axiosError.response.data,
                        headers: this.normalizeHeaders(axiosError.response.headers),
                        duration,
                        retryCount
                    };
                }
                // For network errors, timeout errors, etc.
                throw axiosError;
            }
        }
    }
    async makeRequest(parameters) {
        const config = {
            url: parameters.url,
            method: parameters.method,
            headers: parameters.headers,
            params: parameters.queryParams,
            data: parameters.body,
            timeout: parameters.timeout
        };
        return (0, axios_1.default)(config);
    }
    normalizeHeaders(headers) {
        const normalized = {};
        Object.entries(headers || {}).forEach(([key, value]) => {
            normalized[key] = String(value);
        });
        return normalized;
    }
    clearCache() {
        this.cacheService.clear();
    }
}
exports.HttpRequest = HttpRequest;
