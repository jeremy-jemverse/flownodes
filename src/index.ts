import express, { Request, Response } from 'express';
import httpRequestRoutes from './Nodes/HttpRequest/routes';

const app = express();
const PORT: number = process.env.PORT ? parseInt(process.env.PORT) : 4000;

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
