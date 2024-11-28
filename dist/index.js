"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
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
