import express, { Request, Response } from 'express';

const app = express();
const PORT: number = process.env.PORT ? parseInt(process.env.PORT) : 4000;

app.use(express.json());

// Sample API route
app.get('/api/hello', (req: Request, res: Response) => {
  res.json({ message: 'Hello from Node API!' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
