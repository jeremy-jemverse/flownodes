"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const HttpRequest_1 = require("./HttpRequest");
const router = (0, express_1.Router)();
const httpRequest = new HttpRequest_1.HttpRequest();
router.post('/execute', (async (req, res) => {
    try {
        const parameters = req.body;
        // Validate required parameters
        if (!parameters.url || !parameters.method) {
            return res.status(400).json({
                error: 'Missing required parameters: url and method are required',
            });
        }
        // Execute the request
        const result = await httpRequest.execute(parameters);
        return res.json(result);
    }
    catch (error) {
        return res.status(500).json({
            error: {
                message: error.message,
                statusCode: error.statusCode,
                details: error.error,
            },
        });
    }
}));
exports.default = router;
