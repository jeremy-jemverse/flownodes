import { TestWorkflowEnvironment } from '@temporalio/testing';
import { Worker } from '@temporalio/worker';
import { Client } from '@temporalio/client';
import express from 'express';
import request from 'supertest';
import router from '../routes';
import * as activities from '../activities/activities';
import * as workflow from '../workflows/workflow';

describe('Temporal Integration Tests', () => {
  let testEnv: TestWorkflowEnvironment;
  let worker: Worker;
  let client: Client;
  let app: express.Application;

  beforeAll(async () => {
    // Setup Temporal test environment
    testEnv = await TestWorkflowEnvironment.createLocal();
    
    // Create worker
    worker = await Worker.create({
      connection: testEnv.nativeConnection,
      taskQueue: 'test-queue',
      workflowsPath: require.resolve('../workflows/workflow'),
      activities: activities,
    });

    // Get client
    client = testEnv.client;

    // Start worker
    await worker.run();

    // Setup Express app
    app = express();
    app.use(express.json());
    app.use('/temporal', router);
  });

  afterAll(async () => {
    await testEnv?.teardown();
  });

  describe('End-to-end Order Processing', () => {
    const orderId = 'test-order-123';
    const userId = 'test-user-123';
    const items = [
      { productId: 'prod-1', quantity: 2 },
      { productId: 'prod-2', quantity: 1 }
    ];
    const amount = 100;

    it('should process order end-to-end', async () => {
      // 1. Start order workflow
      const startResponse = await request(app)
        .post('/temporal/workflow/start')
        .send({
          workflowId: `order-${orderId}`,
          workflowType: 'orderWorkflow',
          args: [orderId, userId, items, amount],
          searchAttributes: {
            CustomStringField: orderId,
            CustomKeywordField: 'order_processing'
          }
        });

      expect(startResponse.status).toBe(200);
      expect(startResponse.body.success).toBe(true);
      expect(startResponse.body.workflowId).toBe(`order-${orderId}`);

      // 2. Query order status
      const statusResponse = await request(app)
        .post(`/temporal/workflow/order-${orderId}/query/getOrderStatus`)
        .send({});

      expect(statusResponse.status).toBe(200);
      expect(statusResponse.body.status).toBe('PROCESSING');

      // 3. Add new item to order
      const newItem = { productId: 'prod-3', quantity: 1 };
      const signalResponse = await request(app)
        .post(`/temporal/workflow/order-${orderId}/signal/addOrderItem`)
        .send(newItem);

      expect(signalResponse.status).toBe(200);

      // 4. Query order progress
      const progressResponse = await request(app)
        .post(`/temporal/workflow/order-${orderId}/query/getOrderProgress`)
        .send({});

      expect(progressResponse.status).toBe(200);
      expect(progressResponse.body).toHaveProperty('payment');
      expect(progressResponse.body).toHaveProperty('inventory');
      expect(progressResponse.body).toHaveProperty('overall');

      // 5. Wait for workflow completion
      await new Promise(resolve => setTimeout(resolve, 5000));

      // 6. Get final status
      const finalStatusResponse = await request(app)
        .get(`/temporal/workflow/order-${orderId}`)
        .send();

      expect(finalStatusResponse.status).toBe(200);
      expect(finalStatusResponse.body.success).toBe(true);
      expect(finalStatusResponse.body.status.status).toBe('COMPLETED');
    });

    it('should handle order cancellation', async () => {
      // 1. Start order workflow
      const startResponse = await request(app)
        .post('/temporal/workflow/start')
        .send({
          workflowId: `order-${orderId}-cancel`,
          workflowType: 'orderWorkflow',
          args: [orderId, userId, items, amount]
        });

      expect(startResponse.status).toBe(200);

      // 2. Wait for workflow to start processing
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 3. Cancel the order
      const cancelResponse = await request(app)
        .post(`/temporal/workflow/order-${orderId}-cancel/cancel`)
        .send();

      expect(cancelResponse.status).toBe(200);

      // 4. Wait for cancellation to process
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 5. Get final status
      const finalStatusResponse = await request(app)
        .get(`/temporal/workflow/order-${orderId}-cancel`)
        .send();

      expect(finalStatusResponse.status).toBe(200);
      expect(finalStatusResponse.body.status.status).toBe('CANCELLED');
    });

    it('should handle search workflows', async () => {
      // 1. Start multiple workflows
      await request(app)
        .post('/temporal/workflow/start')
        .send({
          workflowId: `order-search-1`,
          workflowType: 'orderWorkflow',
          args: [orderId, userId, items, amount],
          searchAttributes: {
            CustomStringField: 'search-test',
            CustomKeywordField: 'order_processing'
          }
        });

      await request(app)
        .post('/temporal/workflow/start')
        .send({
          workflowId: `order-search-2`,
          workflowType: 'orderWorkflow',
          args: [orderId, userId, items, amount],
          searchAttributes: {
            CustomStringField: 'search-test',
            CustomKeywordField: 'order_processing'
          }
        });

      // 2. Wait for workflows to start
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 3. Search for workflows
      const searchResponse = await request(app)
        .get('/temporal/workflows/search')
        .query({ query: 'CustomStringField = "search-test"' });

      expect(searchResponse.status).toBe(200);
      expect(searchResponse.body).toHaveLength(2);
      expect(searchResponse.body.map((w: any) => w.workflowId))
        .toEqual(expect.arrayContaining(['order-search-1', 'order-search-2']));
    });
  });

  describe('Error Handling', () => {
    it('should handle payment failures', async () => {
      // Mock payment activity to fail
      jest.spyOn(activities, 'processPayment').mockRejectedValueOnce(
        new activities.PaymentError('Payment failed')
      );

      const response = await request(app)
        .post('/temporal/workflow/start')
        .send({
          workflowId: 'order-payment-fail',
          workflowType: 'orderWorkflow',
          args: ['order-123', 'user-123', [], 100]
        });

      expect(response.status).toBe(200);

      // Wait for workflow to fail
      await new Promise(resolve => setTimeout(resolve, 2000));

      const statusResponse = await request(app)
        .get('/temporal/workflow/order-payment-fail')
        .send();

      expect(statusResponse.body.status.status).toBe('PAYMENT_FAILED');
    });

    it('should handle inventory failures', async () => {
      // Mock inventory activity to fail
      jest.spyOn(activities, 'updateInventory').mockRejectedValueOnce(
        new activities.InventoryError('Inventory update failed')
      );

      const response = await request(app)
        .post('/temporal/workflow/start')
        .send({
          workflowId: 'order-inventory-fail',
          workflowType: 'orderWorkflow',
          args: ['order-123', 'user-123', [{ productId: 'test', quantity: 1 }], 100]
        });

      expect(response.status).toBe(200);

      // Wait for workflow to fail
      await new Promise(resolve => setTimeout(resolve, 2000));

      const statusResponse = await request(app)
        .get('/temporal/workflow/order-inventory-fail')
        .send();

      expect(statusResponse.body.status.status).toBe('INVENTORY_FAILED');
    });
  });
});
