import { Worker } from '@temporalio/worker';
import * as activities from '../activities/activities';

async function run() {
  // Step 1: Register Workflows and Activities with the Worker and connect to Temporal Server
  const worker = await Worker.create({
    workflowsPath: require.resolve('../workflows/workflow'),
    activities,
    taskQueue: 'flownodes-queue',
  });

  // Step 2: Start accepting tasks
  await worker.run();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
