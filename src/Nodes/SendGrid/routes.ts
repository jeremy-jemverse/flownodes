import { Router, Request, Response } from 'express';
import { SendGrid } from './SendGrid';
import { SendGridParameters } from './types';

const router = Router();
const sendGrid = new SendGrid();

// Send email endpoint
router.post('/send', async (req: Request, res: Response) => {
  try {
    const parameters = req.body as SendGridParameters;

    try {
      // Validate parameters
      sendGrid.validateParameters(parameters);
    } catch (error) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : 'Invalid parameters',
      });
    }

    const response = await sendGrid.execute(parameters);
    res.status(response.success ? 200 : 500).json(response);
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

export default router;
