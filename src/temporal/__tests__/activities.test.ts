import { MockActivityEnvironment } from '@temporalio/testing';
import { Context } from '@temporalio/activity';
import * as activities from '../activities/activities';
import { PaymentError, InventoryError } from '../activities/activities';

describe('Temporal Activities', () => {
  let mockEnv: MockActivityEnvironment;

  beforeEach(() => {
    mockEnv = new MockActivityEnvironment();
    jest.spyOn(Context, 'current').mockReturnValue({
      info: {
        activityId: 'test-activity',
        activityType: 'test',
        attempt: 1,
        isLocal: false,
        scheduleToCloseTimeout: '1 minute',
        scheduleToStartTimeout: '1 minute',
        startToCloseTimeout: '1 minute',
        heartbeatTimeout: '1 minute',
        taskQueue: 'test-queue',
        workflowExecution: { workflowId: 'test', runId: 'test' },
        workflowType: 'test',
      },
      cancelled: Promise.resolve(false),
      cancellationSignal: new AbortController().signal,
      heartbeat: jest.fn(),
      log: console,
      metadata: new Map(),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('processPayment', () => {
    it('should process payment successfully', async () => {
      const orderId = 'test-order-123';
      const amount = 100;

      const result = await activities.processPayment(orderId, amount);
      expect(result).toBe(`Payment processed for order ${orderId}`);
    });

    it('should heartbeat during payment processing', async () => {
      const orderId = 'test-order-123';
      const amount = 100;

      const heartbeatSpy = jest.spyOn(mockEnv, 'heartbeat');
      jest.spyOn(Context, 'current').mockReturnValue(mockEnv);

      await activities.processPayment(orderId, amount);
      expect(heartbeatSpy).toHaveBeenCalledTimes(5); // 0%, 20%, 40%, 60%, 80%, 100%
    });

    it('should handle cancellation', async () => {
      const orderId = 'test-order-123';
      const amount = 100;

      // Mock cancellation
      jest.spyOn(Context, 'current').mockReturnValue({
        ...Context.current,
        cancelled: Promise.resolve(true),
      });

      await expect(activities.processPayment(orderId, amount))
        .rejects
        .toThrow('Payment processing cancelled');
    });

    it('should throw PaymentError on failure', async () => {
      const orderId = 'test-order-123';
      const amount = 100;

      // Mock Math.random to always return 0.1 (less than 0.2 threshold)
      jest.spyOn(Math, 'random').mockReturnValue(0.1);
      jest.spyOn(Context, 'current').mockReturnValue(mockEnv);

      await expect(activities.processPayment(orderId, amount))
        .rejects
        .toThrow(PaymentError);
    });
  });

  describe('updateInventory', () => {
    it('should update inventory successfully', async () => {
      const productId = 'test-product-123';
      const quantity = 5;

      jest.spyOn(Context, 'current').mockReturnValue(mockEnv);

      const result = await activities.updateInventory(productId, quantity);
      expect(result).toBe(`Inventory updated for product ${productId}`);
    });

    it('should heartbeat during inventory update', async () => {
      const productId = 'test-product-123';
      const quantity = 5;

      const heartbeatSpy = jest.spyOn(mockEnv, 'heartbeat');
      jest.spyOn(Context, 'current').mockReturnValue(mockEnv);

      await activities.updateInventory(productId, quantity);
      expect(heartbeatSpy).toHaveBeenCalledTimes(4); // 0%, 25%, 50%, 75%, 100%
    });

    it('should handle cancellation', async () => {
      const productId = 'test-product-123';
      const quantity = 5;

      // Mock cancellation
      jest.spyOn(Context, 'current').mockReturnValue({
        ...Context.current,
        cancelled: Promise.resolve(true),
      });

      await expect(activities.updateInventory(productId, quantity))
        .rejects
        .toThrow('Inventory update cancelled');
    });

    it('should throw InventoryError on failure', async () => {
      const productId = 'test-product-123';
      const quantity = 5;

      // Mock Math.random to always return 0.1 (less than 0.15 threshold)
      jest.spyOn(Math, 'random').mockReturnValue(0.1);
      jest.spyOn(Context, 'current').mockReturnValue(mockEnv);

      await expect(activities.updateInventory(productId, quantity))
        .rejects
        .toThrow(InventoryError);
    });
  });

  describe('cancelPayment', () => {
    it('should cancel payment successfully', async () => {
      const orderId = 'test-order-123';
      
      jest.spyOn(Context, 'current').mockReturnValue(mockEnv);

      const result = await activities.cancelPayment(orderId);
      expect(result).toBe(`Payment cancelled for order ${orderId}`);
    });

    it('should throw PaymentError on cancellation failure', async () => {
      const orderId = 'test-order-123';

      // Mock Math.random to always return 0.1 (less than 0.2 threshold)
      jest.spyOn(Math, 'random').mockReturnValue(0.1);
      jest.spyOn(Context, 'current').mockReturnValue(mockEnv);

      await expect(activities.cancelPayment(orderId))
        .rejects
        .toThrow(PaymentError);
    });
  });

  describe('sendNotification', () => {
    it('should send notification successfully', async () => {
      const userId = 'test-user-123';
      const message = 'Test notification';

      jest.spyOn(Context, 'current').mockReturnValue(mockEnv);

      await activities.sendNotification(userId, message);
      // Since this is void, we just verify it doesn't throw
    });

    it('should handle notification failure', async () => {
      const userId = 'test-user-123';
      const message = 'Test notification';

      // Mock Math.random to always return 0.1 (less than 0.2 threshold)
      jest.spyOn(Math, 'random').mockReturnValue(0.1);
      jest.spyOn(Context, 'current').mockReturnValue(mockEnv);

      await expect(activities.sendNotification(userId, message))
        .rejects
        .toThrow('Failed to send notification');
    });
  });
});
