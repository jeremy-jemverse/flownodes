import { Request, Response } from 'express';
import { Client } from '@temporalio/client';
import { temporalRouter } from '../routes';
import { jest } from '@jest/globals';

jest.mock('../routes');

describe('Temporal Routes', () => {
  let mockClient: jest.Mocked<Client>;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockClient = {
      workflow: {
        start: jest.fn(),
        getHandle: jest.fn(),
        list: jest.fn(),
      },
    } as unknown as jest.Mocked<Client>;

    mockReq = {
      body: {},
      params: {},
      query: {},
    };

    mockRes = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  describe('POST /workflow/start', () => {
    it('should start workflow successfully', async () => {
      const req = {
        ...mockReq,
        body: {
          workflowId: 'test-workflow',
          workflowType: 'TestWorkflow',
          args: ['arg1', 'arg2'],
        },
      };

      await temporalRouter.routes.find(r => r.path === '/workflow/start')?.handler(
        req as Request,
        mockRes as Response
      );

      expect(mockClient.workflow.start).toHaveBeenCalledTimes(1);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        workflowId: 'test-workflow',
      });
    });

    it('should handle workflow start error', async () => {
      mockClient.workflow.start.mockRejectedValue(new Error('Start failed'));

      await temporalRouter.routes.find(r => r.path === '/workflow/start')?.handler(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Failed to start workflow',
        details: 'Start failed',
      });
    });
  });

  describe('GET /workflow/:workflowId', () => {
    it('should get workflow status successfully', async () => {
      const req = {
        ...mockReq,
        params: { workflowId: 'test-workflow' },
      };

      await temporalRouter.routes.find(r => r.path === '/workflow/:workflowId')?.handler(
        req as Request,
        mockRes as Response
      );

      expect(mockClient.workflow.getHandle).toHaveBeenCalledTimes(1);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        status: 'COMPLETED',
      });
    });

    it('should handle workflow not found', async () => {
      mockClient.workflow.getHandle.mockRejectedValue(new Error('Not found'));

      await temporalRouter.routes.find(r => r.path === '/workflow/:workflowId')?.handler(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Workflow not found',
        workflowId: 'test-workflow',
      });
    });
  });

  describe('POST /workflow/:workflowId/query/:queryType', () => {
    it('should query workflow successfully', async () => {
      const req = {
        ...mockReq,
        params: {
          workflowId: 'test-workflow',
          queryType: 'testQuery',
        },
      };

      await temporalRouter.routes.find(r => r.path === '/workflow/:workflowId/query/:queryType')?.handler(
        req as Request,
        mockRes as Response
      );

      expect(mockClient.workflow.getHandle).toHaveBeenCalledTimes(1);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        result: 'query result',
      });
    });
  });

  describe('POST /workflow/:workflowId/signal/:signalType', () => {
    it('should signal workflow successfully', async () => {
      const req = {
        ...mockReq,
        params: {
          workflowId: 'test-workflow',
          signalType: 'testSignal',
        },
        body: { data: 'signal data' },
      };

      await temporalRouter.routes.find(r => r.path === '/workflow/:workflowId/signal/:signalType')?.handler(
        req as Request,
        mockRes as Response
      );

      expect(mockClient.workflow.getHandle).toHaveBeenCalledTimes(1);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
      });
    });
  });

  describe('POST /workflow/:workflowId/cancel', () => {
    it('should cancel workflow successfully', async () => {
      const req = {
        ...mockReq,
        params: { workflowId: 'test-workflow' },
      };

      await temporalRouter.routes.find(r => r.path === '/workflow/:workflowId/cancel')?.handler(
        req as Request,
        mockRes as Response
      );

      expect(mockClient.workflow.getHandle).toHaveBeenCalledTimes(1);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
      });
    });
  });

  describe('GET /workflows/search', () => {
    it('should search workflows successfully', async () => {
      const req = {
        ...mockReq,
        query: { query: 'test query' },
      };

      const mockWorkflows = [
        { workflowId: 'workflow1', status: 'COMPLETED' },
        { workflowId: 'workflow2', status: 'RUNNING' },
      ];

      mockClient.workflow.list.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          yield* mockWorkflows;
        },
      } as any);

      await temporalRouter.routes.find(r => r.path === '/workflows/search')?.handler(
        req as Request,
        mockRes as Response
      );

      expect(mockClient.workflow.list).toHaveBeenCalledTimes(1);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockWorkflows);
    });
  });
});
