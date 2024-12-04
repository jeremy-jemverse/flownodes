import { Context, sleep, ApplicationFailure } from '@temporalio/activity';

// Custom error types
export class PaymentError extends ApplicationFailure {
  constructor(message: string) {
    super(message, 'PAYMENT_ERROR');
    this.name = 'PaymentError';
  }
}

export class InventoryError extends ApplicationFailure {
  constructor(message: string) {
    super(message, 'INVENTORY_ERROR');
    this.name = 'InventoryError';
  }
}

export async function greet(name: string): Promise<string> {
  return `Hello, ${name}!`;
}

export async function processPayment(orderId: string, amount: number): Promise<string> {
  const context = Context.current();
  
  // Simulate a long-running payment process with heartbeating
  for (let progress = 0; progress <= 100; progress += 20) {
    // Check for cancellation
    if (context.cancelled) {
      throw new ApplicationFailure('Payment processing cancelled', 'CANCELLED');
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
    if (context.cancelled) {
      throw new ApplicationFailure('Inventory update cancelled', 'CANCELLED');
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
    if (context.cancelled) {
      throw new ApplicationFailure('Payment cancellation interrupted', 'CANCELLED');
    }

    context.heartbeat(progress);
    await sleep(300);
  }

  return `Payment cancelled for order ${orderId}`;
}

export async function restoreInventory(productId: string, quantity: number): Promise<string> {
  const context = Context.current();
  
  for (let progress = 0; progress <= 100; progress += 33) {
    if (context.cancelled) {
      throw new ApplicationFailure('Inventory restoration interrupted', 'CANCELLED');
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
  context.heartbeat(50);
  
  await sleep(500);
  context.heartbeat(100);
}

export async function logEvent(message: string): Promise<void> {
  console.log(`[${new Date().toISOString()}] ${message}`);
}
