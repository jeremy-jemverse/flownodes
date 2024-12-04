import { Client, Connection, WorkflowClient } from '@temporalio/client';
import { SearchAttributes } from '@temporalio/common';

// Function to get or create a Temporal Client
export async function getTemporalClient(address?: string) {
  // Use IP address as it's more reliable
  const defaultAddress = '35.159.193.134:7233';
  
  console.log('Connecting to Temporal server at:', address || process.env.TEMPORAL_SERVER_URL || defaultAddress);
  
  const connection = await Connection.connect({
    address: address || process.env.TEMPORAL_SERVER_URL || defaultAddress,
    tls: false
  });
  return new TemporalClient(connection);
}

class TemporalClient {
  private client: WorkflowClient;

  constructor(connection: Connection) {
    this.client = new WorkflowClient({
      connection,
    });
  }

  async startWorkflow<T>(
    workflowId: string,
    workflowType: string,
    args: any[],
    options: {
      taskQueue?: string;
      searchAttributes?: Partial<SearchAttributes>;
      memo?: Record<string, any>;
      version?: string;
    } = {}
  ) {
    const { taskQueue = 'default', searchAttributes, memo, version } = options;

    return await this.client.start(workflowType, {
      args,
      workflowId,
      taskQueue,
      searchAttributes: searchAttributes as SearchAttributes,
      memo,
      ...(version ? { version } : {}),
    });
  }

  async getWorkflowHandle(workflowId: string, runId?: string) {
    return this.client.getHandle(workflowId, runId);
  }

  async cancelWorkflow(workflowId: string, runId?: string) {
    const handle = await this.getWorkflowHandle(workflowId, runId);
    await handle.cancel();
    return true;
  }

  async signalWorkflow(workflowId: string, signalName: string, args: any[]) {
    const handle = await this.getWorkflowHandle(workflowId);
    await handle.signal(signalName, ...args);
    return true;
  }

  async queryWorkflow(workflowId: string, queryType: string, args: any[]) {
    const handle = await this.getWorkflowHandle(workflowId);
    return await handle.query(queryType, ...args);
  }

  async searchWorkflows(query: string) {
    const result = [];
    for await (const workflow of this.client.list({
      query,
    })) {
      result.push(workflow);
    }
    return result;
  }
}

// Function to start a workflow
export async function startWorkflow(
  workflowId: string,
  workflowType: string,
  args: any[] = [],
  options?: {
    taskQueue?: string;
    searchAttributes?: Partial<SearchAttributes>;
    memo?: Record<string, any>;
    version?: string;
  }
) {
  const client = await getTemporalClient();
  return await client.startWorkflow(workflowId, workflowType, args, options);
}

// Function to get workflow status
export async function getWorkflowStatus(workflowId: string) {
  const client = await getTemporalClient();
  const handle = await client.getWorkflowHandle(workflowId);
  
  try {
    const status = await handle.describe();
    return { success: true, status };
  } catch (error) {
    console.error(`Error getting workflow status: ${error}`);
    throw error;
  }
}

// Function to cancel a workflow
export async function cancelWorkflow(workflowId: string) {
  const client = await getTemporalClient();
  return await client.cancelWorkflow(workflowId);
}

// Function to send a signal to a workflow
export async function signalWorkflow(workflowId: string, signalName: string, args: any[]) {
  const client = await getTemporalClient();
  return await client.signalWorkflow(workflowId, signalName, args);
}

// Function to query a workflow
export async function queryWorkflow(workflowId: string, queryName: string, args: any[]) {
  const client = await getTemporalClient();
  return await client.queryWorkflow(workflowId, queryName, args);
}

// Function to search workflows
export async function searchWorkflows(query: string) {
  const client = await getTemporalClient();
  return await client.searchWorkflows(query);
}
