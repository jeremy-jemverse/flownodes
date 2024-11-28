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

// Clear expired cache entries
router.post('/cache/clear-expired', (req: Request, res: Response) => {
  httpRequest.clearExpiredCache();
  res.json({ message: 'Expired cache entries cleared successfully' });
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

    // Execute the request
    const result = await httpRequest.execute(parameters);

    // Return detailed response
    return res.json({
      ...result,
      metadata: {
        cached: result.fromCache || false,
        retries: result.retryCount || 0,
        duration: result.duration || 0,
      },
    });
  } catch (error: any) {
    // Enhanced error response
    return res.status(500).json({
      error: {
        message: error.message || 'Internal server error',
        type: error.name || 'Error',
        retryCount: error.retryCount,
        details: error.response?.data,
      },
    });
  }
}) as any);

export default router;
