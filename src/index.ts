import express, { Request, Response } from 'express';
import cors from 'cors';
import httpRequestRoutes from './Nodes/HttpRequest/routes';

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

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
