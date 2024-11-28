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
        const response = await httpRequest.execute(parameters);
        res.status(response.statusCode).json(response);
    }
    catch (error) {
        console.error('Error executing request:', error);
        res.status(500).json({
            error: error instanceof Error ? error.message : 'Internal server error',
        });
    }
}));
exports.default = router;
