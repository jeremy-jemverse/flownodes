import { Worker, NativeConnection } from '@temporalio/worker';
import * as activities from '../activities/activities';

async function run() {
  try {
    console.log('Starting Temporal worker...');

    // Create a connection to the Temporal server
    const connection = await NativeConnection.connect({
      address: '35.159.193.134:7233', // Cloud server address
      // TLS configuration if needed
      tls: process.env.TEMPORAL_TLS === 'true' ? {
        serverNameOverride: process.env.TEMPORAL_SERVER_NAME,
        serverRootCACertificate: Buffer.from(process.env.TEMPORAL_SERVER_ROOT_CA || '', 'base64'),
      } : undefined,
    });

    // Create the worker
    const worker = await Worker.create({
      connection,
      namespace: process.env.TEMPORAL_NAMESPACE || 'default',
      workflowsPath: require.resolve('../workflows/workflow'),
      activities,
      taskQueue: 'flownodes-queue',
    });

    // Log worker startup
    console.log('Worker configuration:', {
      namespace: worker.options.namespace,
      taskQueue: worker.options.taskQueue,
      activities: Object.keys(activities),
    });

    // Start accepting tasks
    await worker.run();

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('Shutting down worker...');
      await worker.shutdown();
      process.exit(0);
    });

  } catch (error) {
    console.error('Error starting worker:', error);
    process.exit(1);
  }
}

// Start the worker
console.log('Initializing Temporal worker...');
run().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
