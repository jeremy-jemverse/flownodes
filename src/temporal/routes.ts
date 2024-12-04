import { Router, Request, Response } from 'express';
import { startWorkflow, getWorkflowStatus, cancelWorkflow, signalWorkflow, queryWorkflow, searchWorkflows } from './client';

const router = Router();

// Start a workflow
router.post('/workflow/start', async (req: Request, res: Response) => {
  try {
    const { workflowType, workflowId, args, searchAttributes, memo, buildId } = req.body;
    
    if (!workflowId || !workflowType) {
      return res.status(400).json({
        success: false,
        message: 'workflowId and workflowType are required'
      });
    }

    const handle = await startWorkflow(workflowId, workflowType, args || [], {
      searchAttributes,
      memo,
      version: buildId
    });
    
    res.json({
      success: true,
      workflowId: handle.workflowId,
      runId: handle.firstExecutionRunId,
    });
  } catch (error) {
    console.error('Error starting workflow:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

// Get workflow status
router.get('/workflow/:workflowId', async (req: Request, res: Response) => {
  try {
    const { workflowId } = req.params;
    const status = await getWorkflowStatus(workflowId);
    
    res.json({
      success: true,
      status
    });
  } catch (error) {
    console.error('Error getting workflow status:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

// Cancel workflow
router.post('/workflow/:workflowId/cancel', async (req: Request, res: Response) => {
  try {
    const { workflowId } = req.params;
    await cancelWorkflow(workflowId);
    
    res.json({
      success: true,
      message: 'Workflow cancelled successfully'
    });
  } catch (error) {
    console.error('Error cancelling workflow:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

// Send a signal to a workflow
router.post('/workflow/:workflowId/signal/:signalName', async (req: Request, res: Response) => {
  try {
    const { workflowId, signalName } = req.params;
    const args = req.body;
    
    const result = await signalWorkflow(workflowId, signalName, [args]);
    res.json(result);
  } catch (error) {
    console.error('Error sending signal:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

// Query a workflow
router.post('/workflow/:workflowId/query/:queryName', async (req: Request, res: Response) => {
  try {
    const { workflowId, queryName } = req.params;
    const args = req.body;
    
    const result = await queryWorkflow(workflowId, queryName, [args]);
    res.json(result);
  } catch (error) {
    console.error('Error querying workflow:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

// Search workflows
router.get('/workflows/search', async (req: Request, res: Response) => {
  try {
    const { query } = req.query;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Query parameter is required'
      });
    }
    
    const results = await searchWorkflows(query);
    res.json(results);
  } catch (error) {
    console.error('Error searching workflows:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

export default router;