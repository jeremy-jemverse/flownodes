import { 
  proxyActivities, 
  defineSignal, 
  defineQuery, 
  setHandler,
  startChild,
  executeChild,
  ActivityFailure,
  ApplicationFailure,
  workflowInfo,
  SearchAttributes,
  Trigger,
  ParentClosePolicy,
  condition,
  CancellationScope,
} from '@temporalio/workflow';
import type * as activities from '../activities/activities';

// Activity configurations
const baseActivities = proxyActivities<typeof activities>({
  startToCloseTimeout: '1 minute',
  retry: {
    initialInterval: '1 second',
    maximumInterval: '1 minute',
    backoffCoefficient: 2,
    maximumAttempts: 3,
  },
});

// Custom retry policies for different activities
const paymentActivities = proxyActivities<typeof activities>({
  startToCloseTimeout: '2 minutes',
  heartbeatTimeout: '10 seconds',
  retry: {
    initialInterval: '2 seconds',
    maximumInterval: '30 seconds',
    backoffCoefficient: 2,
    maximumAttempts: 5,
    nonRetryableErrorTypes: ['PAYMENT_ERROR'],
  },
});

const inventoryActivities = proxyActivities<typeof activities>({
  startToCloseTimeout: '30 seconds',
  heartbeatTimeout: '5 seconds',
  retry: {
    initialInterval: '1 second',
    maximumInterval: '10 seconds',
    backoffCoefficient: 2,
    maximumAttempts: 3,
    nonRetryableErrorTypes: ['INVENTORY_ERROR'],
  },
});

// Define signals
export const updateMessageSignal = defineSignal<[string]>('updateMessage');
export const addOrderItemSignal = defineSignal<[{ productId: string; quantity: number }]>('addOrderItem');
export const cancelOrderSignal = defineSignal('cancelOrder');

// Define queries
export const getCurrentMessageQuery = defineQuery<string>('getCurrentMessage');
export const getOrderStatusQuery = defineQuery<{
  status: string;
  items: Array<{ productId: string; quantity: number }>;
  totalAmount: number;
  progress: {
    payment: number;
    inventory: number;
    overall: number;
  };
  lastUpdated: string;
  cancelled: boolean;
}>('getOrderStatus');
export const getOrderProgressQuery = defineQuery<{
  payment: number;
  inventory: number;
  overall: number;
}>('getOrderProgress');

// Child workflow that handles notifications
export async function notificationWorkflow(userId: string, message: string): Promise<void> {
  await baseActivities.sendNotification(userId, message);
}

// Saga pattern workflow for order processing with parallel processing and cancellation
export async function orderWorkflow(
  orderId: string, 
  userId: string,
  items: Array<{ productId: string; quantity: number }>,
  totalAmount: number
): Promise<string> {
  const searchAttributes: SearchAttributes = {
    CustomStringField: orderId,
    CustomKeywordField: 'order_processing',
  };
  Object.assign(workflowInfo().searchAttributes, searchAttributes);

  let orderStatus = {
    status: 'PROCESSING',
    items,
    totalAmount,
    progress: {
      payment: 0,
      inventory: 0,
      overall: 0
    },
    lastUpdated: new Date().toISOString(),
    cancelled: false
  };

  setHandler(getOrderStatusQuery, () => orderStatus);
  setHandler(getOrderProgressQuery, () => orderStatus.progress);
  
  setHandler(addOrderItemSignal, (newItem) => {
    if (!orderStatus.cancelled) {
      orderStatus.items.push(newItem);
      orderStatus.lastUpdated = new Date().toISOString();
    }
  });

  setHandler(cancelOrderSignal, () => {
    orderStatus.cancelled = true;
    orderStatus.status = 'CANCELLED';
    orderStatus.lastUpdated = new Date().toISOString();
  });

  // Use CancellationScope to handle cancellation
  try {
    return await CancellationScope.cancellable(async () => {
      // Process payment
      try {
        orderStatus.status = 'PROCESSING_PAYMENT';
        await paymentActivities.processPayment(orderId, totalAmount);
        orderStatus.progress.payment = 100;
        orderStatus.progress.overall = 50;
      } catch (error) {
        if (error instanceof ActivityFailure) {
          orderStatus.status = 'PAYMENT_FAILED';
          throw new Error(`Payment failed: ${error.message}`);
        }
        throw error;
      }

      // Process inventory updates in parallel
      try {
        orderStatus.status = 'UPDATING_INVENTORY';
        const inventoryUpdates = items.map(item => 
          inventoryActivities.updateInventory(item.productId, item.quantity)
        );
        await Promise.all(inventoryUpdates);
        orderStatus.progress.inventory = 100;
        orderStatus.progress.overall = 100;
      } catch (error) {
        if (error instanceof ActivityFailure) {
          // Compensating transaction: cancel payment
          await paymentActivities.cancelPayment(orderId);
          orderStatus.status = 'INVENTORY_FAILED';
          throw new Error(`Inventory update failed: ${error.message}`);
        }
        throw error;
      }

      // Send notification through child workflow
      await executeChild(notificationWorkflow, {
        workflowId: `notification-${orderId}`,
        parentClosePolicy: ParentClosePolicy.PARENT_CLOSE_POLICY_ABANDON,
        args: [userId, `Order ${orderId} has been processed successfully`]
      });

      orderStatus.status = 'COMPLETED';
      return `Order ${orderId} processed successfully`;
    });
  } catch (error) {
    if (orderStatus.cancelled) {
      return `Order ${orderId} was cancelled`;
    }
    throw error;
  }
}

// Versioned workflow example
export async function versionedWorkflow(name: string): Promise<string> {
  const version = workflowInfo().buildId || '1.0';
  
  if (version === '1.0') {
    return `Hello ${name} from version 1.0!`;
  } else {
    return `Greetings ${name} from version ${version}!`;
  }
}

// Long-running workflow with signals and queries
export async function statefulExample(initialMessage: string): Promise<string> {
  let currentMessage = initialMessage;

  setHandler(updateMessageSignal, (message) => {
    currentMessage = message;
  });

  setHandler(getCurrentMessageQuery, () => currentMessage);

  const trigger = new Trigger<void>();
  
  // Wait for signal or timeout
  await Promise.race([
    trigger,
    condition(() => currentMessage !== initialMessage),
    condition(() => false, '30 seconds')
  ]);

  return currentMessage;
}

// Simple workflow
export async function example(name: string): Promise<string> {
  return await baseActivities.greet(name);
}
