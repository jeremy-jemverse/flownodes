import { Request, Response } from 'express';
import router from '../routes';
import { 
  startWorkflow,
  getWorkflowStatus,
  cancelWorkflow,
  signalWorkflow,
  queryWorkflow,
  searchWorkflows
} from '../client';

// Mock the client functions
jest.mock('../client');

describe('Temporal Routes', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    mockResponse = {
      json: mockJson,
      status: mockStatus,
    };
  });

  describe('POST /workflow/start', () => {
    it('should start workflow successfully', async () => {
      const workflowId = 'test-workflow';
      const workflowType = 'TestWorkflow';
      const args = ['arg1', 'arg2'];
      const searchAttributes = { CustomStringField: 'test' };
      const memo = { key: 'value' };
      const buildId = '1.0.0';

      mockRequest = {
        body: { workflowId, workflowType, args, searchAttributes, memo, buildId },
      };

      (startWorkflow as jest.Mock).mockResolvedValue({
        workflowId,
        runId: 'test-run',
      });

      await router.handle(mockRequest as Request, mockResponse as Response);

      expect(startWorkflow).toHaveBeenCalledWith(
        workflowId,
        workflowType,
        args,
        expect.objectContaining({
          searchAttributes,
          memo,
          version: buildId,
        })
      );

      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        workflowId,
        runId: 'test-run',
      });
    });

    it('should handle missing required parameters', async () => {
      mockRequest = {
        body: {},
      };

      await router.handle(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'workflowId and workflowType are required',
      });
    });

    it('should handle workflow start errors', async () => {
      mockRequest = {
        body: {
          workflowId: 'test',
          workflowType: 'Test',
        },
      };

      const error = new Error('Start failed');
      (startWorkflow as jest.Mock).mockRejectedValue(error);

      await router.handle(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Start failed',
      });
    });
  });

  describe('GET /workflow/:workflowId', () => {
    it('should get workflow status successfully', async () => {
      const workflowId = 'test-workflow';
      const mockStatus = { status: 'RUNNING' };

      mockRequest = {
        params: { workflowId },
      };

      (getWorkflowStatus as jest.Mock).mockResolvedValue(mockStatus);

      await router.handle(mockRequest as Request, mockResponse as Response);

      expect(getWorkflowStatus).toHaveBeenCalledWith(workflowId);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        status: mockStatus,
      });
    });

    it('should handle workflow status errors', async () => {
      mockRequest = {
        params: { workflowId: 'test' },
      };

      const error = new Error('Status check failed');
      (getWorkflowStatus as jest.Mock).mockRejectedValue(error);

      await router.handle(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Status check failed',
      });
    });
  });

  describe('POST /workflow/:workflowId/cancel', () => {
    it('should cancel workflow successfully', async () => {
      const workflowId = 'test-workflow';

      mockRequest = {
        params: { workflowId },
      };

      await router.handle(mockRequest as Request, mockResponse as Response);

      expect(cancelWorkflow).toHaveBeenCalledWith(workflowId);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'Workflow cancelled successfully',
      });
    });

    it('should handle cancellation errors', async () => {
      mockRequest = {
        params: { workflowId: 'test' },
      };

      const error = new Error('Cancellation failed');
      (cancelWorkflow as jest.Mock).mockRejectedValue(error);

      await router.handle(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Cancellation failed',
      });
    });
  });

  describe('POST /workflow/:workflowId/signal/:signalName', () => {
    it('should send signal successfully', async () => {
      const workflowId = 'test-workflow';
      const signalName = 'testSignal';
      const args = { data: 'test' };

      mockRequest = {
        params: { workflowId, signalName },
        body: args,
      };

      const mockResult = { success: true };
      (signalWorkflow as jest.Mock).mockResolvedValue(mockResult);

      await router.handle(mockRequest as Request, mockResponse as Response);

      expect(signalWorkflow).toHaveBeenCalledWith(workflowId, signalName, [args]);
      expect(mockJson).toHaveBeenCalledWith(mockResult);
    });

    it('should handle signal errors', async () => {
      mockRequest = {
        params: { workflowId: 'test', signalName: 'test' },
        body: {},
      };

      const error = new Error('Signal failed');
      (signalWorkflow as jest.Mock).mockRejectedValue(error);

      await router.handle(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Signal failed',
      });
    });
  });

  describe('POST /workflow/:workflowId/query/:queryName', () => {
    it('should query workflow successfully', async () => {
      const workflowId = 'test-workflow';
      const queryName = 'testQuery';
      const args = { data: 'test' };

      mockRequest = {
        params: { workflowId, queryName },
        body: args,
      };

      const mockResult = { status: 'RUNNING' };
      (queryWorkflow as jest.Mock).mockResolvedValue(mockResult);

      await router.handle(mockRequest as Request, mockResponse as Response);

      expect(queryWorkflow).toHaveBeenCalledWith(workflowId, queryName, [args]);
      expect(mockJson).toHaveBeenCalledWith(mockResult);
    });

    it('should handle query errors', async () => {
      mockRequest = {
        params: { workflowId: 'test', queryName: 'test' },
        body: {},
      };

      const error = new Error('Query failed');
      (queryWorkflow as jest.Mock).mockRejectedValue(error);

      await router.handle(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Query failed',
      });
    });
  });

  describe('GET /workflows/search', () => {
    it('should search workflows successfully', async () => {
      const query = 'test query';

      mockRequest = {
        query: { query },
      };

      const mockResults = [{ workflowId: 'test' }];
      (searchWorkflows as jest.Mock).mockResolvedValue(mockResults);

      await router.handle(mockRequest as Request, mockResponse as Response);

      expect(searchWorkflows).toHaveBeenCalledWith(query);
      expect(mockJson).toHaveBeenCalledWith(mockResults);
    });

    it('should handle missing query parameter', async () => {
      mockRequest = {
        query: {},
      };

      await router.handle(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Query parameter is required',
      });
    });

    it('should handle search errors', async () => {
      mockRequest = {
        query: { query: 'test' },
      };

      const error = new Error('Search failed');
      (searchWorkflows as jest.Mock).mockRejectedValue(error);

      await router.handle(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Search failed',
      });
    });
  });
});
