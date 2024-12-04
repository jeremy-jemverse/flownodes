import { TestWorkflowEnvironment } from '@temporalio/testing';
import { Worker, Runtime } from '@temporalio/worker';

declare global {
  var testEnv: TestWorkflowEnvironment | undefined;
  var worker: Worker | undefined;
}

describe('Temporal Test Environment', () => {
  // Add extra time for setup
  jest.setTimeout(120000);

  it('should have test environment and worker ready', async () => {
    // Wait a bit for everything to be ready
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    expect(testEnv).toBeDefined();
    expect(worker).toBeDefined();
    expect(worker?.getState()).toBe('RUNNING');
  }, 120000);

  it('should have a valid connection', async () => {
    expect(testEnv).toBeDefined();
    const connection = testEnv!.nativeConnection;
    expect(connection).toBeDefined();
  }, 120000);

  afterAll(async () => {
    try {
      await Runtime.instance().shutdown();
    } catch (error) {
      console.error('Error shutting down runtime:', error);
    }
  }, 120000);
});
