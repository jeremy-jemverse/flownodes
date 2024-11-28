// Load environment variables first
import * as dotenv from 'dotenv';
import { config } from 'dotenv';
import { resolve } from 'path';

// Configure dotenv with multiple paths
const envPaths = [
  resolve(process.cwd(), '.env'),
  resolve(process.cwd(), '.env.local'),
  resolve(process.cwd(), '.env.production'),
];

// Try loading from each path
envPaths.forEach(path => {
  config({ path });
});

// Log environment loading
console.log('Node Environment:', process.env.NODE_ENV);
console.log('API Key exists:', !!process.env.SENDGRID_API_KEY);

// Rest of the imports
import express, { Request, Response } from 'express';
import cors from 'cors';
import httpRequestRoutes from './Nodes/HttpRequest/routes';
import sendGridRoutes from './Nodes/SendGrid/routes';

const app = express();
const PORT: number = process.env.PORT ? parseInt(process.env.PORT) : 4000;

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN || '*', // Allow all origins in development
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400 // 24 hours
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Sample API route
app.get('/api/hello', (req: Request, res: Response) => {
  res.json({ message: 'Hello from Node API!' });
});

// Node routes
app.use('/api/nodes/http-request', httpRequestRoutes);
app.use('/api/nodes/sendgrid', sendGridRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
