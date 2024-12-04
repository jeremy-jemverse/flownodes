import { TestWorkflowEnvironment } from '@temporalio/testing';
import { Worker } from '@temporalio/worker';
import { OrderWorkflow } from '../workflows/workflow';
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
        amount: 100,
        items: [
          { productId: 'prod1', quantity: 2 },
        ],
      };

      const handle = await testEnv.client.workflow.start(OrderWorkflow, {
        args: [input],
        workflowId,
        taskQueue: 'test-queue',
      });

      const result = await handle.result();
      expect(result).toEqual({
        success: true,
        orderId: input.orderId,
      });
    });

    it('should handle payment failure and rollback', async () => {
      const workflowId = 'test-order-e2e-payment-fail';
      const input = {
        orderId: '124',
        amount: -100, // Invalid amount to trigger failure
        items: [
          { productId: 'prod1', quantity: 2 },
        ],
      };

      const handle = await testEnv.client.workflow.start(OrderWorkflow, {
        args: [input],
        workflowId,
        taskQueue: 'test-queue',
      });

      await expect(handle.result()).rejects.toThrow('Payment failed');
    });

    it('should handle inventory failure and rollback payment', async () => {
      const workflowId = 'test-order-e2e-inventory-fail';
      const input = {
        orderId: '125',
        amount: 100,
        items: [
          { productId: 'invalid-product', quantity: 2 }, // Invalid product to trigger failure
        ],
      };

      const handle = await testEnv.client.workflow.start(OrderWorkflow, {
        args: [input],
        workflowId,
        taskQueue: 'test-queue',
      });

      await expect(handle.result()).rejects.toThrow('Inventory update failed');
    });

    it('should handle order cancellation and rollback', async () => {
      const workflowId = 'test-order-e2e-cancel';
      const input = {
        orderId: '126',
        amount: 100,
        items: [
          { productId: 'prod1', quantity: 2 },
        ],
      };

      const handle = await testEnv.client.workflow.start(OrderWorkflow, {
        args: [input],
        workflowId,
        taskQueue: 'test-queue',
      });

      // Wait a bit to ensure the workflow has started
      await new Promise(resolve => setTimeout(resolve, 100));

      // Cancel the workflow
      await handle.cancel();

      await expect(handle.result()).rejects.toThrow('Cancelled');
    });
  });
});
