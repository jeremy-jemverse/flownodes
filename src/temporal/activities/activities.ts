import { Context, sleep } from '@temporalio/activity';
import { Client } from 'pg';
import axios from 'axios';
import { SendGrid } from '../../Nodes/SendGrid/SendGrid';

// Custom error types
export class PaymentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PaymentError';
  }
}

export class InventoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InventoryError';
  }
}

export class DatabaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class WebhookError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WebhookError';
  }
}

export interface NodeResult {
  success: boolean;
  data?: any;
  error?: string;
}

export async function greet(name: string): Promise<string> {
  return `Hello, ${name}!`;
}

export async function processPayment(orderId: string, amount: number): Promise<string> {
  const context = Context.current();
  
  // Simulate a long-running payment process with heartbeating
  for (let progress = 0; progress <= 100; progress += 20) {
    // Check for cancellation
    if (await context.cancelled) {
      throw new Error('Payment processing cancelled');
    }

    // Heartbeat with progress
    context.heartbeat(progress);
    await sleep(1000);

    // Simulate random payment failures
    if (Math.random() < 0.2) {
      throw new PaymentError(`Payment failed for order ${orderId}`);
    }
  }

  return `Payment processed for order ${orderId}`;
}

export async function updateInventory(productId: string, quantity: number): Promise<string> {
  const context = Context.current();
  
  // Simulate inventory update with heartbeating
  for (let progress = 0; progress <= 100; progress += 25) {
    if (await context.cancelled) {
      throw new Error('Inventory update cancelled');
    }

    context.heartbeat(progress);
    await sleep(500);

    // Simulate inventory errors
    if (Math.random() < 0.1) {
      throw new InventoryError(`Insufficient inventory for product ${productId}`);
    }
  }

  return `Updated inventory for product ${productId}`;
}

export async function cancelPayment(orderId: string): Promise<string> {
  const context = Context.current();
  
  for (let progress = 0; progress <= 100; progress += 33) {
    if (await context.cancelled) {
      throw new Error('Payment cancellation interrupted');
    }

    context.heartbeat(progress);
    await sleep(300);
  }

  return `Payment cancelled for order ${orderId}`;
}

export async function restoreInventory(productId: string, quantity: number): Promise<string> {
  const context = Context.current();
  
  for (let progress = 0; progress <= 100; progress += 33) {
    if (await context.cancelled) {
      throw new Error('Inventory restoration interrupted');
    }

    context.heartbeat(progress);
    await sleep(300);
  }

  return `Restored inventory for product ${productId}`;
}

export async function sendNotification(userId: string, message: string): Promise<void> {
  const context = Context.current();
  context.heartbeat(0);
  
  // Simulate sending notification
  await sleep(500);
  context.heartbeat(100);
}

export async function logEvent(message: string): Promise<void> {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

// Node-specific activities
export async function executeSendGridNode(nodeData: any): Promise<NodeResult> {
  try {
    console.log('[Activity] Executing SendGrid node with data:', JSON.stringify(nodeData, null, 2));
    
    // Transform the workflow input structure to match SendGrid's expected format
    if (!nodeData?.data?.config) {
      throw new PaymentError('Invalid node data structure: missing data.config');
    }

    const { config } = nodeData.data;
    if (!config.email || !config.connection) {
      throw new PaymentError('Invalid config structure: missing email or connection configuration');
    }

    const sendGridParams = {
      apiKey: config.connection.apiKey,
      to: config.email.to,
      from: config.email.from,
      subject: config.email.subject,
      type: config.email.type,
      text: config.email.body?.text || '',
      html: config.email.body?.html || ''
    };

    console.log('[Activity] Transformed SendGrid params:', JSON.stringify(sendGridParams, null, 2));
    
    const sendGrid = new SendGrid();
    const result = await sendGrid.execute(sendGridParams);
    console.log('[Activity] SendGrid execution completed');
    return { success: true, data: result };
  } catch (error) {
    console.error('[Activity] SendGrid execution failed:', error);
    throw new PaymentError(error instanceof Error ? error.message : 'Unknown error');
  }
}

export async function executePostgresNode(data: any): Promise<NodeResult> {
  try {
    const client = new Client(data.connectionString);
    await client.connect();
    const result = await client.query(data.query, data.params);
    await client.end();
    return { success: true, data: result.rows };
  } catch (error) {
    throw new DatabaseError(error instanceof Error ? error.message : 'Unknown error');
  }
}

export async function executeWebhookNode(data: any): Promise<NodeResult> {
  try {
    const response = await axios.request({
      url: data.url,
      method: data.method,
      headers: data.headers,
      data: data.body
    });
    return { success: true, data: response.data };
  } catch (error) {
    throw new WebhookError(error instanceof Error ? error.message : 'Unknown error');
  }
}
