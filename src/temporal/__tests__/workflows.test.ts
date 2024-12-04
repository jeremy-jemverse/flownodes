import { TestWorkflowEnvironment } from '@temporalio/testing';
import { Worker } from '@temporalio/worker';
import { orderWorkflow } from '../workflows/workflow';
import * as activities from '../activities/activities';

describe('Workflow Tests', () => {
  let testEnv: TestWorkflowEnvironment;
  let worker: Worker;

  beforeAll(async () => {
    testEnv = await TestWorkflowEnvironment.createLocal();
    worker = await Worker.create({
      connection: testEnv.nativeConnection,
      workflowsPath: require.resolve('../workflows/workflow'),
      activities,
      taskQueue: 'test-queue',
    });
    await worker.runUntil(() => Promise.resolve());
  });

  afterAll(async () => {
    await worker?.shutdown();
    await testEnv?.teardown();
  });

  describe('Order Workflow', () => {
    it('should complete successfully with valid input', async () => {
      const workflowId = 'test-order-1';
      const orderId = 'order-123';
      const userId = 'user-123';
      const items = [{ productId: 'prod-1', quantity: 2 }];
      const amount = 100;

      const handle = await testEnv.client.workflow.start(orderWorkflow, {
        args: [orderId, userId, items, amount],
        workflowId,
        taskQueue: 'test-queue',
      });

      const result = await handle.result();
      expect(result).toContain('processed successfully');
    });

    it('should fail with invalid payment amount', async () => {
      const workflowId = 'test-order-2';
      const orderId = 'order-124';
      const userId = 'user-124';
      const items = [{ productId: 'prod-1', quantity: 2 }];
      const amount = -100;

      const handle = await testEnv.client.workflow.start(orderWorkflow, {
        args: [orderId, userId, items, amount],
        workflowId,
        taskQueue: 'test-queue',
      });

      await expect(handle.result()).rejects.toThrow('Payment failed');
    });

    it('should fail with invalid inventory', async () => {
      const workflowId = 'test-order-3';
      const orderId = 'order-125';
      const userId = 'user-125';
      const items = [{ productId: 'invalid-prod', quantity: 2 }];
      const amount = 100;

      const handle = await testEnv.client.workflow.start(orderWorkflow, {
        args: [orderId, userId, items, amount],
        workflowId,
        taskQueue: 'test-queue',
      });

      await expect(handle.result()).rejects.toThrow('Inventory update failed');
    });

    it('should handle cancellation', async () => {
      const workflowId = 'test-order-4';
      const orderId = 'order-126';
      const userId = 'user-126';
      const items = [{ productId: 'prod-1', quantity: 2 }];
      const amount = 100;

      const handle = await testEnv.client.workflow.start(orderWorkflow, {
        args: [orderId, userId, items, amount],
        workflowId,
        taskQueue: 'test-queue',
      });

      // Wait a bit to ensure workflow has started
      await new Promise(resolve => setTimeout(resolve, 100));

      await handle.cancel();
      await expect(handle.result()).rejects.toThrow('cancelled');
    });
  });
});
