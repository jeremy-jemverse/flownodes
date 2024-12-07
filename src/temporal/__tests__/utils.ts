import { TestWorkflowEnvironment } from '@temporalio/testing';
import { Worker } from '@temporalio/worker';
import * as activities from '../activities/activities';

export async function setupTestEnvironment() {
  const testEnv = await TestWorkflowEnvironment.createLocal();
  
  const worker = await Worker.create({
    connection: testEnv.nativeConnection,
    taskQueue: 'test-queue',
    workflowsPath: require.resolve('../workflows/workflow'),
    activities
  });

  return {
    testEnv,
    worker,
    client: testEnv.client
  };
}

export function createTestWorkflowSchema(options: {
  workflowId: string;
  nodes: any[];
  edges?: any[];
  mode?: 'sequential' | 'parallel';
}) {
  return {
    workflowId: options.workflowId,
    name: 'Test Workflow',
    description: 'Automated test workflow',
    version: '1.0.0',
    nodes: options.nodes,
    edges: options.edges || [],
    execution: {
      mode: options.mode || 'sequential',
      retryPolicy: {
        maxAttempts: 1,
        initialInterval: '1s'
      }
    }
  };
}

export function createTestNode(type: string, data: any) {
  return {
    id: `test-${type}-${Date.now()}`,
    type,
    data
  };
}
