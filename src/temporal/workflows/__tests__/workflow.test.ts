jest.mock('@temporalio/workflow', () => {
  const mockWorkflowModule = jest.requireActual('@temporalio/workflow');
  const mockActivities = {
    executeSendGridNode: jest.fn(),
    executePostgresNode: jest.fn(),
    executeWebhookNode: jest.fn(),
    logEvent: jest.fn(),
  };

  return {
    ...mockWorkflowModule,
    proxyActivities: jest.fn().mockReturnValue(mockActivities),
    defineSignal: jest.fn().mockReturnValue(jest.fn()),
    defineQuery: jest.fn().mockReturnValue(jest.fn()),
    setHandler: jest.fn(),
    assertInWorkflowContext: jest.fn(),
    scheduleActivity: jest.fn().mockImplementation(async (fn) => fn()),
  };
});

import { processWorkflow } from '../workflow';
import { WorkflowSchema, WorkflowEdge } from '../../types';
import type { Duration } from '@temporalio/common';
import { proxyActivities } from '@temporalio/workflow';

const mockActivities = (jest.mocked(proxyActivities) as jest.Mock).mock.results[0].value;

describe('Process Workflow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createTestSchema = (mode: 'sequential' | 'parallel'): WorkflowSchema => ({
    workflowId: 'test-workflow',
    name: 'Test Workflow',
    description: 'Test workflow execution',
    version: '1.0.0',
    nodes: [
      {
        id: 'sendgrid-node',
        type: 'sendgrid',
        data: {
          apiKey: 'test-api-key',
          to: 'test@example.com',
          from: 'sender@example.com',
          subject: 'Test Email',
          type: 'body',
          body: {
            content: 'Test email content'
          }
        }
      },
      {
        id: 'postgres-node',
        type: 'postgres',
        data: {
          connectionString: 'postgres://localhost:5432/test',
          query: 'SELECT * FROM users',
          params: []
        }
      }
    ],
    edges: [
      {
        id: 'edge-1',
        from: 'sendgrid-node',
        to: 'postgres-node',
        type: 'default'
      }
    ],
    execution: {
      mode,
      retryPolicy: {
        maxAttempts: 3,
        initialInterval: '1 second' as Duration
      }
    }
  });

  it('should execute sequential workflow successfully', async () => {
    const schema = createTestSchema('sequential');
    mockActivities.executeSendGridNode.mockResolvedValueOnce({ success: true, data: {} });
    mockActivities.executePostgresNode.mockResolvedValueOnce({ success: true, data: {} });
    mockActivities.logEvent.mockResolvedValue(undefined);

    await processWorkflow(schema);

    expect(mockActivities.executeSendGridNode).toHaveBeenCalled();
    expect(mockActivities.executePostgresNode).toHaveBeenCalled();
    expect(mockActivities.logEvent).toHaveBeenCalledWith(expect.stringContaining('Starting execution of node: sendgrid-node'));
    
    // Get the call order
    const sendGridCallOrder = mockActivities.executeSendGridNode.mock.invocationCallOrder[0];
    const postgresCallOrder = mockActivities.executePostgresNode.mock.invocationCallOrder[0];
    expect(postgresCallOrder).toBeGreaterThan(sendGridCallOrder);
  });

  it('should execute parallel workflow successfully', async () => {
    const schema = createTestSchema('parallel');
    mockActivities.executeSendGridNode.mockResolvedValueOnce({ success: true, data: {} });
    mockActivities.executePostgresNode.mockResolvedValueOnce({ success: true, data: {} });
    mockActivities.logEvent.mockResolvedValue(undefined);

    await processWorkflow(schema);

    expect(mockActivities.executeSendGridNode).toHaveBeenCalled();
    expect(mockActivities.executePostgresNode).toHaveBeenCalled();
    expect(mockActivities.logEvent).toHaveBeenCalledWith(expect.stringContaining('Workflow completed successfully'));
  });

  it('should handle activity errors', async () => {
    const schema = createTestSchema('sequential');
    const error = new Error('SendGrid Error');
    mockActivities.executeSendGridNode.mockRejectedValueOnce(error);
    mockActivities.logEvent.mockResolvedValue(undefined);

    await expect(processWorkflow(schema)).rejects.toThrow('SendGrid Error');
    expect(mockActivities.executePostgresNode).not.toHaveBeenCalled();
    expect(mockActivities.logEvent).toHaveBeenCalledWith(expect.stringContaining('Error executing node'));
  });

  it('should validate workflow schema', async () => {
    const invalidSchema = {
      workflowId: 'invalid-workflow',
      name: 'Invalid Workflow',
      description: 'Invalid workflow schema',
      version: '1.0.0',
      nodes: [],
      edges: [],
      execution: {
        mode: 'sequential' as const,
        retryPolicy: {
          maxAttempts: 3,
          initialInterval: '1 second' as Duration
        }
      }
    };

    await expect(processWorkflow(invalidSchema as WorkflowSchema)).rejects.toThrow('No starting nodes found');
    expect(mockActivities.logEvent).not.toHaveBeenCalled();
  });
});
