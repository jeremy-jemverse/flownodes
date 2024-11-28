"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const HttpRequest_1 = require("./HttpRequest");
const ValidationService_1 = require("./services/ValidationService");
const router = (0, express_1.Router)();
const httpRequest = new HttpRequest_1.HttpRequest();
// Clear cache endpoint
router.post('/cache/clear', (req, res) => {
    httpRequest.clearCache();
    res.json({ message: 'Cache cleared successfully' });
});
// Clear expired cache entries
router.post('/cache/clear-expired', (req, res) => {
    httpRequest.clearExpiredCache();
    res.json({ message: 'Expired cache entries cleared successfully' });
});
// Main execute endpoint
router.post('/execute', (async (req, res) => {
    try {
        const parameters = req.body;
        try {
            // Validate parameters
            ValidationService_1.ValidationService.validateParameters(parameters);
        }
        catch (error) {
            return res.status(400).json({
                error: error instanceof Error ? error.message : 'Invalid parameters',
            });
        }
        // Execute the request
        const result = await httpRequest.execute(parameters);
        // Return detailed response
        return res.json({
            ...result,
            metadata: {
                cached: result.fromCache || false,
                retries: result.retryCount || 0,
                duration: result.duration || 0,
            },
        });
    }
    catch (error) {
        // Enhanced error response
        return res.status(500).json({
            error: {
                message: error.message || 'Internal server error',
                type: error.name || 'Error',
                retryCount: error.retryCount,
                details: error.response?.data,
            },
        });
    }
}));
exports.default = router;
