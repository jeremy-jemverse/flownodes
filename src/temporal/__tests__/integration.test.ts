import { TestWorkflowEnvironment } from '@temporalio/testing';
import { Worker } from '@temporalio/worker';
import { orderWorkflow } from '../workflows/workflow';
import * as activities from '../activities/activities';

describe('Integration Tests', () => {
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

  describe('End-to-End Order Processing', () => {
    it('should process order successfully', async () => {
      const workflowId = 'test-order-e2e';
      const input = {
        orderId: '123',
        userId: 'user-123',
        items: [
          { productId: 'prod1', quantity: 2 },
        ],
        amount: 100,
      };

      const handle = await testEnv.client.workflow.start(orderWorkflow, {
        args: [input.orderId, input.userId, input.items, input.amount],
        workflowId,
        taskQueue: 'test-queue',
      });

      const result = await handle.result();
      expect(result).toContain('processed successfully');
    });

    it('should handle payment failure and rollback', async () => {
      const workflowId = 'test-order-e2e-payment-fail';
      const input = {
        orderId: '124',
        userId: 'user-124',
        items: [
          { productId: 'prod1', quantity: 2 },
        ],
        amount: -100, // Invalid amount to trigger failure
      };

      const handle = await testEnv.client.workflow.start(orderWorkflow, {
        args: [input.orderId, input.userId, input.items, input.amount],
        workflowId,
        taskQueue: 'test-queue',
      });

      await expect(handle.result()).rejects.toThrow('Payment failed');
    });

    it('should handle inventory failure and rollback payment', async () => {
      const workflowId = 'test-order-e2e-inventory-fail';
      const input = {
        orderId: '125',
        userId: 'user-125',
        items: [
          { productId: 'invalid-product', quantity: 2 }, // Invalid product to trigger failure
        ],
        amount: 100,
      };

      const handle = await testEnv.client.workflow.start(orderWorkflow, {
        args: [input.orderId, input.userId, input.items, input.amount],
        workflowId,
        taskQueue: 'test-queue',
      });

      await expect(handle.result()).rejects.toThrow('Inventory update failed');
    });

    it('should handle order cancellation and rollback', async () => {
      const workflowId = 'test-order-e2e-cancel';
      const input = {
        orderId: '126',
        userId: 'user-126',
        items: [
          { productId: 'prod1', quantity: 2 },
        ],
        amount: 100,
      };

      const handle = await testEnv.client.workflow.start(orderWorkflow, {
        args: [input.orderId, input.userId, input.items, input.amount],
        workflowId,
        taskQueue: 'test-queue',
      });

      // Wait a bit to ensure the workflow has started
      await new Promise(resolve => setTimeout(resolve, 100));

      // Cancel the workflow
      await handle.cancel();

      await expect(handle.result()).rejects.toThrow('cancelled');
    });
  });
});
