import { TestWorkflowEnvironment } from '@temporalio/testing';
import { Worker, Runtime } from '@temporalio/worker';
import * as activities from '../activities/activities';
import * as workflows from '../workflows/workflow';

declare global {
  var testEnv: TestWorkflowEnvironment | undefined;
  var worker: Worker | undefined;
  var workerPromise: Promise<void> | undefined;
}

// Helper function to handle cleanup
async function cleanup() {
  try {
    // First cleanup the worker
    if (global.worker) {
      try {
        // Wait for any in-flight tasks
        if (global.worker.getState() === 'RUNNING') {
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      } catch (error) {
        console.error('Error waiting for worker:', error);
      } finally {
        global.worker = undefined;
      }
    }

    // Then cleanup the test environment
    if (global.testEnv) {
      try {
        await global.testEnv.teardown();
      } catch (error) {
        console.error('Error tearing down test environment:', error);
      } finally {
        global.testEnv = undefined;
      }
    }

    // Finally shutdown the runtime
    try {
      await Runtime.instance().shutdown();
    } catch (error) {
      console.error('Error shutting down runtime:', error);
    }
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
}

// Ensure cleanup runs even if tests fail
process.on('SIGTERM', cleanup);
process.on('SIGINT', cleanup);

beforeAll(async () => {
  // Increase timeout for setup
  jest.setTimeout(120000);

  try {
    // Create test environment
    const testEnv = await TestWorkflowEnvironment.createLocal();
    global.testEnv = testEnv;
    
    // Create worker with native connection from test environment
    const worker = await Worker.create({
      connection: testEnv.nativeConnection,
      taskQueue: 'test-queue',
      activities,
      workflowsPath: require.resolve('../workflows/workflow'),
      shutdownGraceTime: 10000, // Increase grace time
    });

    global.worker = worker;
    
    // Start the worker and wait for it to be ready
    global.workerPromise = worker.run();
    
    // Wait for worker to be in RUNNING state
    let attempts = 0;
    const maxAttempts = 50;
    while (worker.getState() !== 'RUNNING' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    if (worker.getState() !== 'RUNNING') {
      throw new Error('Worker failed to start after 5 seconds');
    }
  } catch (error) {
    console.error('Error during setup:', error);
    // Try to clean up if setup fails
    await cleanup();
    throw error;
  }
}, 120000);

afterAll(async () => {
  await cleanup();
}, 120000);
