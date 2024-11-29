import { Router } from 'express';
import { SendGrid } from './SendGrid';
import { SendGridParameters } from './types';

const router = Router();
const sendGrid = new SendGrid();

// Send email endpoint
router.post('/send', async (req, res) => {
  try {
    const parameters = req.body as SendGridParameters;

    try {
      // Validate parameters
      sendGrid.validateParameters(parameters);
    } catch (error) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: error instanceof Error ? error.message : 'Invalid parameters'
      });
    }

    const response = await sendGrid.execute(parameters);
    res.status(response.success ? 200 : response.statusCode || 500).json(response);
  } catch (error) {
    console.error('Error in /send endpoint:', error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

export default router;
