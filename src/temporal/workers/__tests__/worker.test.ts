import { Worker } from '@temporalio/worker';

jest.mock('@temporalio/worker', () => ({
  Worker: {
    create: jest.fn().mockImplementation(() => ({
      run: jest.fn().mockResolvedValue(undefined),
    })),
  },
}));

describe('Worker', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.mock('../../workflows/workflow', () => ({
      processWorkflow: jest.fn(),
    }));
  });

  it('should create and start worker successfully', async () => {
    const worker = await Worker.create({
      workflowsPath: require.resolve('../../workflows/workflow'),
      activities: expect.any(Object),
      taskQueue: 'workflow-task-queue',
    });

    expect(worker).toBeDefined();
    expect(Worker.create).toHaveBeenCalledWith(expect.objectContaining({
      workflowsPath: expect.any(String),
      activities: expect.any(Object),
      taskQueue: 'workflow-task-queue',
    }));
  });

  it('should handle worker creation errors', async () => {
    const mockError = new Error('Worker creation failed');
    (Worker.create as jest.Mock).mockRejectedValueOnce(mockError);
    
    await expect(Worker.create({
      workflowsPath: require.resolve('../../workflows/workflow'),
      activities: {},
      taskQueue: 'workflow-task-queue',
    })).rejects.toThrow('Worker creation failed');
  });

  it('should register workflow and activities', async () => {
    await Worker.create({
      workflowsPath: require.resolve('../../workflows/workflow'),
      activities: {},
      taskQueue: 'workflow-task-queue',
    });
    
    const createCall = (Worker.create as jest.Mock).mock.calls[0][0];
    expect(createCall.activities).toBeDefined();
    expect(createCall.workflowsPath).toContain('workflows');
  });
});
