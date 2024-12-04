import { Client, Connection } from '@temporalio/client';
import { 
  startWorkflow,
  getWorkflowStatus,
  cancelWorkflow,
  signalWorkflow,
  queryWorkflow,
  searchWorkflows
} from '../client';

// Mock @temporalio/client
jest.mock('@temporalio/client');

describe('Temporal Client', () => {
  let mockClient: jest.Mocked<Client>;
  let mockWorkflowHandle: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mock workflow handle
    mockWorkflowHandle = {
      workflowId: 'test-workflow',
      firstExecutionRunId: 'test-run',
      signal: jest.fn(),
      query: jest.fn(),
      cancel: jest.fn(),
      describe: jest.fn(),
    };

    // Setup mock client
    mockClient = {
      workflow: {
        start: jest.fn().mockResolvedValue(mockWorkflowHandle),
        getHandle: jest.fn().mockReturnValue(mockWorkflowHandle),
        list: jest.fn(),
      },
    } as unknown as jest.Mocked<Client>;

    // Mock Connection.connect
    (Connection.connect as jest.Mock).mockResolvedValue({});

    // Mock Client constructor
    (Client as unknown as jest.Mock).mockImplementation(() => mockClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('startWorkflow', () => {
    it('should start workflow with correct parameters', async () => {
      const workflowId = 'test-workflow';
      const workflowType = 'TestWorkflow';
      const args = ['arg1', 'arg2'];
      const options = {
        taskQueue: 'test-queue',
        searchAttributes: {
          CustomStringField: 'test',
          CustomKeywordField: ['keyword1', 'keyword2'],
        },
        memo: { key: 'value' },
        version: '1.0.0',
      };

      const result = await startWorkflow(workflowId, workflowType, args, options);

      expect(mockClient.workflow.start).toHaveBeenCalledWith(
        workflowType,
        expect.objectContaining({
          taskQueue: options.taskQueue,
          workflowId,
          args,
          searchAttributes: expect.any(Object),
          memo: options.memo,
        })
      );

      expect(result).toEqual({
        workflowId: mockWorkflowHandle.workflowId,
        firstExecutionRunId: mockWorkflowHandle.firstExecutionRunId,
      });
    });

    it('should handle workflow start errors', async () => {
      const error = new Error('Workflow start failed');
      mockClient.workflow.start.mockRejectedValue(error);

      await expect(startWorkflow('test', 'TestWorkflow'))
        .rejects
        .toThrow('Workflow start failed');
    });
  });

  describe('getWorkflowStatus', () => {
    it('should get workflow status', async () => {
      const workflowId = 'test-workflow';
      const mockStatus = { status: 'RUNNING' };
      mockWorkflowHandle.describe.mockResolvedValue(mockStatus);

      const status = await getWorkflowStatus(workflowId);

      expect(mockClient.workflow.getHandle).toHaveBeenCalledWith(workflowId);
      expect(status).toEqual(mockStatus);
    });

    it('should handle workflow not found', async () => {
      mockClient.workflow.getHandle.mockImplementation(() => {
        throw new Error('Workflow not found');
      });

      await expect(getWorkflowStatus('non-existent'))
        .rejects
        .toThrow('Workflow not found');
    });
  });

  describe('cancelWorkflow', () => {
    it('should cancel workflow', async () => {
      const workflowId = 'test-workflow';

      await cancelWorkflow(workflowId);

      expect(mockClient.workflow.getHandle).toHaveBeenCalledWith(workflowId);
      expect(mockWorkflowHandle.cancel).toHaveBeenCalled();
    });

    it('should handle cancellation errors', async () => {
      mockWorkflowHandle.cancel.mockRejectedValue(new Error('Cancel failed'));

      await expect(cancelWorkflow('test-workflow'))
        .rejects
        .toThrow('Cancel failed');
    });
  });

  describe('signalWorkflow', () => {
    it('should send signal to workflow', async () => {
      const workflowId = 'test-workflow';
      const signalName = 'testSignal';
      const args = ['arg1', 'arg2'];

      await signalWorkflow(workflowId, signalName, args);

      expect(mockClient.workflow.getHandle).toHaveBeenCalledWith(workflowId);
      expect(mockWorkflowHandle.signal).toHaveBeenCalledWith(signalName, ...args);
    });

    it('should handle signal errors', async () => {
      mockWorkflowHandle.signal.mockRejectedValue(new Error('Signal failed'));

      await expect(signalWorkflow('test', 'testSignal', []))
        .rejects
        .toThrow('Signal failed');
    });
  });

  describe('queryWorkflow', () => {
    it('should query workflow', async () => {
      const workflowId = 'test-workflow';
      const queryName = 'testQuery';
      const args = ['arg1', 'arg2'];
      const mockResult = { data: 'test' };

      mockWorkflowHandle.query.mockResolvedValue(mockResult);

      const result = await queryWorkflow(workflowId, queryName, args);

      expect(mockClient.workflow.getHandle).toHaveBeenCalledWith(workflowId);
      expect(mockWorkflowHandle.query).toHaveBeenCalledWith(queryName, ...args);
      expect(result).toEqual(mockResult);
    });

    it('should handle query errors', async () => {
      mockWorkflowHandle.query.mockRejectedValue(new Error('Query failed'));

      await expect(queryWorkflow('test', 'testQuery', []))
        .rejects
        .toThrow('Query failed');
    });
  });

  describe('searchWorkflows', () => {
    it('should search workflows', async () => {
      const query = 'CustomStringField = "test"';
      const mockResults = [{ workflowId: 'test' }];

      mockClient.workflow.list.mockReturnValue(mockResults as any);

      const results = await searchWorkflows(query);

      expect(mockClient.workflow.list).toHaveBeenCalledWith({
        query,
      });
      expect(results).toEqual(mockResults);
    });

    it('should handle search errors', async () => {
      const error = new Error('Search failed');
      mockClient.workflow.list.mockImplementation(() => {
        throw error;
      });

      await expect(searchWorkflows('test'))
        .rejects
        .toThrow('Search failed');
    });
  });
});
