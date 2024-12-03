"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = require("dotenv");
const path_1 = require("path");
// Configure dotenv with multiple paths
const envPaths = [
    (0, path_1.resolve)(process.cwd(), '.env'),
    (0, path_1.resolve)(process.cwd(), '.env.local'),
    (0, path_1.resolve)(process.cwd(), '.env.production'),
];
// Try loading from each path
envPaths.forEach(path => {
    (0, dotenv_1.config)({ path });
});
// Log environment loading
console.log('Node Environment:', process.env.NODE_ENV);
console.log('API Key exists:', !!process.env.SENDGRID_API_KEY);
// Rest of the imports
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const routes_1 = __importDefault(require("./Nodes/HttpRequest/routes"));
const routes_2 = __importDefault(require("./Nodes/SendGrid/routes"));
const app = (0, express_1.default)();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4000;
// CORS configuration
const corsOptions = {
    origin: process.env.CORS_ORIGIN || '*', // Allow all origins in development
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400 // 24 hours
};
// Middleware
app.use((0, cors_1.default)(corsOptions));
app.use(express_1.default.json());
// Sample API route
app.get('/api/hello', (req, res) => {
    res.json({ message: 'Hello from Node API!' });
});
// Node routes
app.use('/api/nodes/http-request', routes_1.default);
app.use('/api/nodes/sendgrid', routes_2.default);
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
