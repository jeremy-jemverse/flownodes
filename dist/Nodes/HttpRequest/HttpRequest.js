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
        this.validationService = new ValidationService_1.ValidationService();
        this.cacheService = new CacheService_1.CacheService();
    }
    async execute(parameters) {
        // Validate parameters
        this.validationService.validateParameters(parameters);
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
                // Cache successful GET responses
                if (parameters.cache && parameters.method === 'GET') {
                    this.cacheService.set(parameters.url, parameters.method, response, parameters.cache.ttl);
                }
                return {
                    ...response,
                    duration,
                    retryCount
                };
            }
            catch (error) {
                const statusCode = error.response?.status;
                const shouldRetry = parameters.retry &&
                    retryCount < parameters.retry.attempts &&
                    this.validationService.shouldRetry(parameters, statusCode, retryCount);
                if (shouldRetry) {
                    retryCount++;
                    await new Promise(resolve => setTimeout(resolve, parameters.retry.delay));
                    continue;
                }
                // If we shouldn't retry, or we've exhausted retries, return the error response
                if (error.response) {
                    const duration = Date.now() - startTime;
                    return {
                        statusCode: error.response.status,
                        data: error.response.data,
                        headers: error.response.headers,
                        duration,
                        retryCount
                    };
                }
                // For network errors, timeout errors, etc.
                throw error;
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
        const response = await (0, axios_1.default)(config);
        return {
            statusCode: response.status,
            data: response.data,
            headers: response.headers
        };
    }
    clearCache() {
        this.cacheService.clear();
    }
}
exports.HttpRequest = HttpRequest;
