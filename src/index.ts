import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(__dirname, '../.env') });

import express from 'express';
import cors from 'cors';
import { Worker, NativeConnection } from '@temporalio/worker';
import * as activities from './temporal/activities/activities';
import temporalRoutes from './temporal/routes';
import httpRequestRoutes from './Nodes/HttpRequest/routes';
import sendGridRoutes from './Nodes/SendGrid/routes';
import postgresRoutes from './Nodes/Postgres/routes';

const app = express();
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
app.use(cors(corsOptions));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Routes
app.use('/api/temporal', temporalRoutes);
app.use('/api/nodes/http-request', httpRequestRoutes);
app.use('/api/nodes/sendgrid', sendGridRoutes);
app.use('/api/nodes/postgres', postgresRoutes);

// Start Temporal worker
async function startTemporalWorker() {
  try {
    const defaultAddress = '35.159.193.134:7233';
    console.log('Connecting worker to Temporal server at:', process.env.TEMPORAL_ADDRESS || defaultAddress);
    
    const connection = await NativeConnection.connect({
      address: process.env.TEMPORAL_ADDRESS || defaultAddress,
      tls: false
    });

    const worker = await Worker.create({
      connection,
      workflowsPath: require.resolve('./temporal/workflows/workflow'),
      activities,
      taskQueue: 'flownodes-queue',
      namespace: process.env.TEMPORAL_NAMESPACE || 'default'
    });

    await worker.run();
    console.log('Temporal worker started successfully');
  } catch (error) {
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
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
