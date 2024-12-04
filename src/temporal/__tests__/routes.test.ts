import { Request, Response } from 'express';
import { WorkflowClient } from '../client';
import { temporalRouter } from '../routes';

jest.mock('../client');

describe('Temporal Routes', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockWorkflowClient: jest.Mocked<WorkflowClient>;

  beforeEach(() => {
    mockRequest = {
      body: {},
      params: {},
      query: {},
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockWorkflowClient = {
      startWorkflow: jest.fn(),
      getWorkflowHandle: jest.fn(),
      listWorkflows: jest.fn(),
      cancelWorkflow: jest.fn(),
      signalWorkflow: jest.fn(),
      queryWorkflow: jest.fn(),
      searchWorkflows: jest.fn(),
    } as unknown as jest.Mocked<WorkflowClient>;

    (WorkflowClient as jest.Mock).mockImplementation(() => mockWorkflowClient);
  });

  describe('POST /workflow/start', () => {
    it('should start a workflow successfully', async () => {
      const workflowId = 'test-workflow';
      const workflowType = 'TestWorkflow';
      const args = ['arg1', 'arg2'];
      const searchAttributes = { CustomStringField: 'test' };
      const memo = { key: 'value' };
      const buildId = '1.0.0';

      mockRequest.body = { workflowId, workflowType, args, searchAttributes, memo, buildId };

      mockWorkflowClient.startWorkflow.mockResolvedValue({
        workflowId,
        runId: 'test-run',
      });

      await temporalRouter.routes.find(r => r.path === '/workflow/start')?.handler(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockWorkflowClient.startWorkflow).toHaveBeenCalledWith(
        workflowId,
        workflowType,
        args,
        expect.objectContaining({
          searchAttributes,
          memo,
          version: buildId,
        })
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        workflowId,
        runId: 'test-run',
      });
    });

    it('should handle missing required parameters', async () => {
      mockRequest.body = {};

      await temporalRouter.routes.find(r => r.path === '/workflow/start')?.handler(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'workflowId and workflowType are required',
      });
    });

    it('should handle workflow start errors', async () => {
      const error = new Error('Failed to start workflow');
      mockWorkflowClient.startWorkflow.mockRejectedValue(error);

      await temporalRouter.routes.find(r => r.path === '/workflow/start')?.handler(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to start workflow',
      });
    });
  });

  describe('GET /workflow/:workflowId', () => {
    it('should get workflow status successfully', async () => {
      const workflowId = 'test-workflow';
      const runId = 'test-run';
      mockRequest.params = { workflowId };
      mockRequest.query = { runId };

      const mockHandle = {
        workflowId,
        runId,
        status: jest.fn().mockResolvedValue('RUNNING'),
      };

      mockWorkflowClient.getWorkflowHandle.mockResolvedValue(mockHandle);

      await temporalRouter.routes.find(r => r.path === '/workflow/:workflowId')?.handler(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        status: 'RUNNING',
      });
    });

    it('should handle workflow status errors', async () => {
      const error = new Error('Failed to get workflow status');
      mockWorkflowClient.getWorkflowHandle.mockRejectedValue(error);

      await temporalRouter.routes.find(r => r.path === '/workflow/:workflowId')?.handler(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to get workflow status',
      });
    });
  });

  describe('POST /workflow/:workflowId/cancel', () => {
    it('should cancel workflow successfully', async () => {
      const workflowId = 'test-workflow';
      mockRequest.params = { workflowId };

      await temporalRouter.routes.find(r => r.path === '/workflow/:workflowId/cancel')?.handler(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockWorkflowClient.cancelWorkflow).toHaveBeenCalledWith(workflowId);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Workflow cancelled successfully',
      });
    });

    it('should handle cancellation errors', async () => {
      const error = new Error('Failed to cancel workflow');
      mockWorkflowClient.cancelWorkflow.mockRejectedValue(error);

      await temporalRouter.routes.find(r => r.path === '/workflow/:workflowId/cancel')?.handler(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to cancel workflow',
      });
    });
  });

  describe('POST /workflow/:workflowId/signal/:signalName', () => {
    it('should send signal successfully', async () => {
      const workflowId = 'test-workflow';
      const signalName = 'testSignal';
      const args = { data: 'test' };
      mockRequest.params = { workflowId, signalName };
      mockRequest.body = args;

      const mockResult = { success: true };
      mockWorkflowClient.signalWorkflow.mockResolvedValue(mockResult);

      await temporalRouter.routes.find(r => r.path === '/workflow/:workflowId/signal/:signalName')?.handler(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockWorkflowClient.signalWorkflow).toHaveBeenCalledWith(workflowId, signalName, [args]);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(mockResult);
    });

    it('should handle signal errors', async () => {
      const error = new Error('Failed to send signal');
      mockWorkflowClient.signalWorkflow.mockRejectedValue(error);

      await temporalRouter.routes.find(r => r.path === '/workflow/:workflowId/signal/:signalName')?.handler(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to send signal',
      });
    });
  });

  describe('POST /workflow/:workflowId/query/:queryName', () => {
    it('should query workflow successfully', async () => {
      const workflowId = 'test-workflow';
      const queryName = 'testQuery';
      const args = { data: 'test' };
      mockRequest.params = { workflowId, queryName };
      mockRequest.body = args;

      const mockResult = { status: 'RUNNING' };
      mockWorkflowClient.queryWorkflow.mockResolvedValue(mockResult);

      await temporalRouter.routes.find(r => r.path === '/workflow/:workflowId/query/:queryName')?.handler(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockWorkflowClient.queryWorkflow).toHaveBeenCalledWith(workflowId, queryName, [args]);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(mockResult);
    });

    it('should handle query errors', async () => {
      const error = new Error('Failed to query workflow');
      mockWorkflowClient.queryWorkflow.mockRejectedValue(error);

      await temporalRouter.routes.find(r => r.path === '/workflow/:workflowId/query/:queryName')?.handler(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to query workflow',
      });
    });
  });

  describe('GET /workflows/search', () => {
    it('should search workflows successfully', async () => {
      const query = 'test query';
      mockRequest.query = { query };

      const mockResults = [{ workflowId: 'test' }];
      mockWorkflowClient.searchWorkflows.mockResolvedValue(mockResults);

      await temporalRouter.routes.find(r => r.path === '/workflows/search')?.handler(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockWorkflowClient.searchWorkflows).toHaveBeenCalledWith(query);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(mockResults);
    });

    it('should handle missing query parameter', async () => {
      mockRequest.query = {};

      await temporalRouter.routes.find(r => r.path === '/workflows/search')?.handler(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Query parameter is required',
      });
    });

    it('should handle search errors', async () => {
      const error = new Error('Failed to search workflows');
      mockWorkflowClient.searchWorkflows.mockRejectedValue(error);

      await temporalRouter.routes.find(r => r.path === '/workflows/search')?.handler(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to search workflows',
      });
    });
  });
});
