import { Router, Request, Response } from 'express';
import { HttpRequest } from './HttpRequest';
import { HttpRequestParameters } from './types';
import { ValidationService } from './services/ValidationService';

const router = Router();
const httpRequest = new HttpRequest();

// Clear cache endpoint
router.post('/cache/clear', (req: Request, res: Response) => {
  httpRequest.clearCache();
  res.json({ message: 'Cache cleared successfully' });
});

// Main execute endpoint
router.post('/execute', (async (req: Request, res: Response) => {
  try {
    const parameters = req.body as HttpRequestParameters;

    try {
      // Validate parameters
      ValidationService.validateParameters(parameters);
    } catch (error) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : 'Invalid parameters',
      });
    }

    const response = await httpRequest.execute(parameters);
    res.status(response.statusCode).json(response);
  } catch (error) {
    console.error('Error executing request:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}));

export default router;
