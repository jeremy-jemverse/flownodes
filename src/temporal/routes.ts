import { Router, Request, Response } from 'express';
import { startWorkflow, getWorkflowStatus, cancelWorkflow, signalWorkflow, queryWorkflow, searchWorkflows } from './client';

interface WorkflowSchema {
  workflowId: string;
  nodes: Array<{
    id: string;
    type: string;
    config?: any;
  }>;
  edges: Array<{
    from: string;
    to: string;
  }>;
  execution: {
    mode: 'sequential' | 'parallel';
    retryPolicy: {
      maxAttempts: number;
      initialInterval: string;
    };
  };
}

const router = Router();

// Start a workflow
router.post('/workflow/start', async (req: Request, res: Response) => {
  try {
    const { workflowId, workflowType, args, searchAttributes, memo, buildId, taskQueue } = req.body;
    
    if (!workflowId || !workflowType) {
      return res.status(400).json({
        success: false,
        message: 'workflowId and workflowType are required'
      });
    }

    const handle = await startWorkflow(workflowId, workflowType, args || [], {
      searchAttributes,
      memo,
      version: buildId,
      taskQueue: taskQueue || 'flownodes-queue'
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

// Save workflow schema and start workflow
router.post('/workflow/save', async (req: Request, res: Response) => {
  try {
    console.log('Incoming request body:', JSON.stringify(req.body, null, 2));
    
    const workflowSchema = req.body as WorkflowSchema;

    // Validate execution configuration
    if (!workflowSchema.execution) {
      return res.status(400).json({
        success: false,
        error: 'Missing execution configuration'
      });
    }

    if (!workflowSchema.execution.retryPolicy) {
      return res.status(400).json({
        success: false,
        error: 'Missing retry policy in execution configuration'
      });
    }

    // Enforce resource limits
    const MAX_NODES = 50;
    const MAX_RETRY_ATTEMPTS = 5;
    const MAX_INITIAL_INTERVAL = '30s';

    if (workflowSchema.nodes.length > MAX_NODES) {
      return res.status(400).json({
        success: false,
        error: `Workflow cannot have more than ${MAX_NODES} nodes`
      });
    }

    // Set and validate retry policy
    if (!workflowSchema.execution.retryPolicy.initialInterval) {
      workflowSchema.execution.retryPolicy.initialInterval = '1s';
    } else if (workflowSchema.execution.retryPolicy.initialInterval > MAX_INITIAL_INTERVAL) {
      workflowSchema.execution.retryPolicy.initialInterval = MAX_INITIAL_INTERVAL;
    }

    if (!workflowSchema.execution.retryPolicy.maxAttempts) {
      workflowSchema.execution.retryPolicy.maxAttempts = 3;
    } else {
      workflowSchema.execution.retryPolicy.maxAttempts = Math.min(
        workflowSchema.execution.retryPolicy.maxAttempts,
        MAX_RETRY_ATTEMPTS
      );
    }

    if (!workflowSchema || !workflowSchema.nodes || !workflowSchema.edges) {
      return res.status(400).json({
        success: false,
        message: 'Workflow schema is required'
      });
    }

    console.log('Schema type:', typeof workflowSchema);
    console.log('Schema workflowId type:', typeof workflowSchema.workflowId);
    console.log('Schema workflowId value:', workflowSchema.workflowId);
    
    // Extract workflowId from schema or generate one if not present
    const workflowId = workflowSchema.workflowId || `workflow-${Date.now()}`;
    console.log('Final workflow:Id : ', workflowId);
    
    // Start the workflow with the schema as args
    const handle = await startWorkflow(workflowId, 'processWorkflow', [workflowSchema], {
      memo: {
        schemaVersion: '1.0',
        createdAt: new Date().toISOString()
      }
    });

    console.log('Created workflow with ID:', workflowId);
    
    res.json({
      success: true,
      workflowId: handle.workflowId,
      runId: handle.firstExecutionRunId,
      schema: workflowSchema
      
    });
  } catch (error) {
    console.error('Error saving workflow:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

export default router;
