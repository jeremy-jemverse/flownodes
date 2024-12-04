import { TestWorkflowEnvironment } from '@temporalio/testing';
import { Worker } from '@temporalio/worker';
import { Client } from '@temporalio/client';
import * as activities from '../activities/activities';
import * as workflow from '../workflows/workflow';

describe('Temporal Workflows', () => {
  let testEnv: TestWorkflowEnvironment;
  let worker: Worker;
  let client: Client;

  beforeAll(async () => {
    testEnv = await TestWorkflowEnvironment.createLocal();
    worker = await Worker.create({
      connection: testEnv.nativeConnection,
      taskQueue: 'test-queue',
      workflowsPath: require.resolve('../workflows/workflow'),
      activities: activities,
    });
    client = testEnv.client;
    await worker.run();
  });

  afterAll(async () => {
    await testEnv?.teardown();
  });

  describe('orderWorkflow', () => {
    const testOrderId = 'test-order-123';
    const testUserId = 'test-user-123';
    const testItems = [
      { productId: 'prod-1', quantity: 2 },
      { productId: 'prod-2', quantity: 1 }
    ];
    const testAmount = 100;

    it('should complete order processing successfully', async () => {
      const handle = await client.workflow.start(workflow.orderWorkflow, {
        taskQueue: 'test-queue',
        workflowId: `order-${testOrderId}`,
        args: [testOrderId, testUserId, testItems, testAmount],
      });

      const result = await handle.result();
      expect(result).toBe(`Order ${testOrderId} processed successfully`);

      // Verify the final status
      const status = await handle.query(workflow.getOrderStatusQuery);
      expect(status.status).toBe('COMPLETED');
      expect(status.progress.overall).toBe(100);
    });

    it('should handle payment failure', async () => {
      // Mock payment activity to fail
      jest.spyOn(activities, 'processPayment').mockRejectedValueOnce(
        new activities.PaymentError('Payment failed')
      );

      const handle = await client.workflow.start(workflow.orderWorkflow, {
        taskQueue: 'test-queue',
        workflowId: `order-${testOrderId}-payment-fail`,
        args: [testOrderId, testUserId, testItems, testAmount],
      });

      await expect(handle.result()).rejects.toThrow('Payment failed');

      const status = await handle.query(workflow.getOrderStatusQuery);
      expect(status.status).toBe('PAYMENT_FAILED');
    });

    it('should handle inventory failure and compensate payment', async () => {
      // Mock inventory activity to fail
      jest.spyOn(activities, 'updateInventory').mockRejectedValueOnce(
        new activities.InventoryError('Inventory update failed')
      );

      const handle = await client.workflow.start(workflow.orderWorkflow, {
        taskQueue: 'test-queue',
        workflowId: `order-${testOrderId}-inventory-fail`,
        args: [testOrderId, testUserId, testItems, testAmount],
      });

      await expect(handle.result()).rejects.toThrow('Inventory update failed');

      const status = await handle.query(workflow.getOrderStatusQuery);
      expect(status.status).toBe('INVENTORY_FAILED');

      // Verify payment cancellation was called
      expect(activities.cancelPayment).toHaveBeenCalledWith(testOrderId);
    });

    it('should handle order cancellation', async () => {
      const handle = await client.workflow.start(workflow.orderWorkflow, {
        taskQueue: 'test-queue',
        workflowId: `order-${testOrderId}-cancel`,
        args: [testOrderId, testUserId, testItems, testAmount],
      });

      // Wait for workflow to start processing
      await new Promise(resolve => setTimeout(resolve, 100));

      // Cancel the order
      await handle.signal(workflow.cancelOrderSignal);

      const result = await handle.result();
      expect(result).toBe(`Order ${testOrderId} was cancelled`);

      const status = await handle.query(workflow.getOrderStatusQuery);
      expect(status.status).toBe('CANCELLED');
      expect(status.cancelled).toBe(true);
    });

    it('should handle adding items to order', async () => {
      const handle = await client.workflow.start(workflow.orderWorkflow, {
        taskQueue: 'test-queue',
        workflowId: `order-${testOrderId}-add-item`,
        args: [testOrderId, testUserId, testItems, testAmount],
      });

      // Add a new item
      const newItem = { productId: 'prod-3', quantity: 1 };
      await handle.signal(workflow.addOrderItemSignal, newItem);

      const status = await handle.query(workflow.getOrderStatusQuery);
      expect(status.items).toHaveLength(testItems.length + 1);
      expect(status.items).toContainEqual(newItem);
    });
  });

  describe('notificationWorkflow', () => {
    it('should send notification successfully', async () => {
      const testUserId = 'test-user-123';
      const testMessage = 'Test notification';

      const handle = await client.workflow.start(workflow.notificationWorkflow, {
        taskQueue: 'test-queue',
        workflowId: `notification-${testUserId}`,
        args: [testUserId, testMessage],
      });

      await handle.result();
      expect(activities.sendNotification).toHaveBeenCalledWith(testUserId, testMessage);
    });
  });

  describe('versionedWorkflow', () => {
    it('should handle versioned changes', async () => {
      const testName = 'test-user';

      const handle = await client.workflow.start(workflow.versionedWorkflow, {
        taskQueue: 'test-queue',
        workflowId: `versioned-${testName}`,
        args: [testName],
      });

      const result = await handle.result();
      expect(result).toContain(testName);
    });
  });
});
