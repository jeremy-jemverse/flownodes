"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = require("dotenv");
const path_1 = require("path");
// Load environment variables
(0, dotenv_1.config)({ path: (0, path_1.resolve)(__dirname, '../.env') });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const worker_1 = require("@temporalio/worker");
const activities = __importStar(require("./temporal/activities/activities"));
const routes_1 = __importDefault(require("./temporal/routes"));
const routes_2 = __importDefault(require("./Nodes/HttpRequest/routes"));
const routes_3 = __importDefault(require("./Nodes/SendGrid/routes"));
const routes_4 = __importDefault(require("./Nodes/Postgres/routes"));
const app = (0, express_1.default)();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4000;
console.log('Node Environment:', process.env.NODE_ENV);
console.log('API Key exists:', !!process.env.SENDGRID_API_KEY);
console.log('Temporal Address:', process.env.TEMPORAL_ADDRESS);
console.log('Temporal Namespace:', process.env.TEMPORAL_NAMESPACE);
// CORS configuration
const corsOptions = {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400
};
// Middleware
app.use((0, cors_1.default)(corsOptions));
app.use(express_1.default.json());
// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});
// Routes
app.use('/api/temporal', routes_1.default);
app.use('/api/nodes/http-request', routes_2.default);
app.use('/api/nodes/sendgrid', routes_3.default);
app.use('/api/nodes/postgres', routes_4.default);
// Start Temporal worker
async function startTemporalWorker() {
    try {
        const connection = await worker_1.NativeConnection.connect({
            address: process.env.TEMPORAL_ADDRESS || 'localhost:7233'
        });
        const worker = await worker_1.Worker.create({
            connection,
            workflowsPath: require.resolve('./temporal/workflows/workflow'),
            activities,
            taskQueue: 'flownodes-queue',
            namespace: process.env.TEMPORAL_NAMESPACE || 'default'
        });
        await worker.run();
        console.log('Temporal worker started successfully');
    }
    catch (error) {
        console.error('Failed to start Temporal worker:', error);
        process.exit(1);
    }
}
// Start server and worker
async function start() {
    try {
        await startTemporalWorker();
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    }
    catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}
start();
