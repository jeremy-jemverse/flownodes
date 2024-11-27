import { Router, Request, Response } from 'express';
import { HttpRequest } from './HttpRequest';
import { HttpRequestParameters } from './types';

const router = Router();
const httpRequest = new HttpRequest();

router.post('/execute', (async (req: Request, res: Response) => {
  try {
    const parameters = req.body as HttpRequestParameters;

    // Validate required parameters
    if (!parameters.url || !parameters.method) {
      return res.status(400).json({
        error: 'Missing required parameters: url and method are required',
      });
    }

    // Execute the request
    const result = await httpRequest.execute(parameters);
    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({
      error: {
        message: error.message,
        statusCode: error.statusCode,
        details: error.error,
      },
    });
  }
}) as any);

export default router;
