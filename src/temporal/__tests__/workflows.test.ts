import { TestWorkflowEnvironment } from '@temporalio/testing';
import { Worker } from '@temporalio/worker';
import * as workflow from '../workflows/workflow';
import * as activities from '../activities/activities';

describe('Workflows', () => {
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

  describe('OrderWorkflow', () => {
    it('should complete order processing successfully', async () => {
      const workflowId = 'test-order-workflow';
      const input = {
        orderId: '123',
        amount: 100,
      };

      const handle = await testEnv.client.workflow.start(workflow.OrderWorkflow, {
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

    it('should handle payment failure', async () => {
      const workflowId = 'test-order-workflow-payment-failure';
      const input = {
        orderId: '123',
        amount: -100, // Invalid amount to trigger failure
      };

      const handle = await testEnv.client.workflow.start(workflow.OrderWorkflow, {
        args: [input],
        workflowId,
        taskQueue: 'test-queue',
      });

      await expect(handle.result()).rejects.toThrow('Payment failed');
    });

    it('should handle inventory failure', async () => {
      const workflowId = 'test-order-workflow-inventory-failure';
      const input = {
        orderId: '123',
        amount: 100,
        productId: 'invalid-product', // Invalid product to trigger failure
      };

      const handle = await testEnv.client.workflow.start(workflow.OrderWorkflow, {
        args: [input],
        workflowId,
        taskQueue: 'test-queue',
      });

      await expect(handle.result()).rejects.toThrow('Inventory update failed');
    });

    it('should handle cancellation', async () => {
      const workflowId = 'test-order-workflow-cancellation';
      const input = {
        orderId: '123',
        amount: 100,
      };

      const handle = await testEnv.client.workflow.start(workflow.OrderWorkflow, {
        args: [input],
        workflowId,
        taskQueue: 'test-queue',
      });

      // Cancel the workflow
      await handle.cancel();

      await expect(handle.result()).rejects.toThrow('Cancelled');
    });
  });
});
