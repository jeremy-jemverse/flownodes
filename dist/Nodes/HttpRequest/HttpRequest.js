"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpRequest = void 0;
const axios_1 = __importDefault(require("axios"));
class HttpRequest {
    async execute(parameters) {
        try {
            const config = {
                url: parameters.url,
                method: parameters.method,
                headers: parameters.headers || {},
                params: parameters.queryParams,
                data: parameters.body,
                timeout: parameters.timeout || 10000,
                validateStatus: () => true, // Don't throw on any status code
            };
            const response = await (0, axios_1.default)(config);
            return {
                statusCode: response.status,
                data: response.data,
                headers: response.headers,
            };
        }
        catch (error) {
            const httpError = {
                message: error.message || 'Request failed',
                statusCode: error.response?.status,
                error: error.response?.data || error,
            };
            throw httpError;
        }
    }
}
exports.HttpRequest = HttpRequest;
