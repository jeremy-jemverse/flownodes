import { Client, Connection } from '@temporalio/client';

// Function to get or create a Temporal Client
export async function getTemporalClient() {
  const connection = await Connection.connect();
  return new Client({
    connection,
    namespace: 'default',
  });
}

interface SearchAttributes {
  CustomStringField?: string | string[];
  CustomKeywordField?: string | string[];
  [key: string]: any;
}

interface StartWorkflowOptions {
  taskQueue?: string;
  searchAttributes?: SearchAttributes;
  memo?: {
    [key: string]: any;
  };
  version?: string;
}

// Function to start a workflow
export async function startWorkflow(
  workflowId: string,
  workflowType: string,
  args: any[] = [],
  options?: StartWorkflowOptions
) {
  const client = await getTemporalClient();
  
  // Format search attributes
  const searchAttributes = options?.searchAttributes ? {
    CustomStringField: Array.isArray(options.searchAttributes.CustomStringField) 
      ? options.searchAttributes.CustomStringField 
      : [options.searchAttributes.CustomStringField],
    CustomKeywordField: Array.isArray(options.searchAttributes.CustomKeywordField)
      ? options.searchAttributes.CustomKeywordField
      : [options.searchAttributes.CustomKeywordField]
  } : undefined;
  
  const handle = await client.workflow.start(workflowType, {
    taskQueue: options?.taskQueue || 'flownodes-queue',
    workflowId,
    args,
    searchAttributes,
    memo: options?.memo,
    ...(options?.version ? { 
      buildId: options.version 
    } : {}),
  });

  return handle;
}

// Function to get workflow status
export async function getWorkflowStatus(workflowId: string) {
  const client = await getTemporalClient();
  const handle = client.workflow.getHandle(workflowId);
  
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
  const handle = client.workflow.getHandle(workflowId);
  
  try {
    await handle.cancel();
    return { success: true, message: 'Workflow cancelled successfully' };
  } catch (error) {
    console.error(`Error cancelling workflow: ${error}`);
    throw error;
  }
}

// Function to send a signal to a workflow
export async function signalWorkflow(workflowId: string, signalName: string, args: any[]) {
  const client = await getTemporalClient();
  const handle = client.workflow.getHandle(workflowId);
  
  try {
    await handle.signal(signalName, ...args);
    return { success: true, message: 'Signal sent successfully' };
  } catch (error) {
    console.error(`Error sending signal to workflow: ${error}`);
    throw error;
  }
}

// Function to query a workflow
export async function queryWorkflow(workflowId: string, queryName: string, args: any[]) {
  const client = await getTemporalClient();
  const handle = client.workflow.getHandle(workflowId);
  
  try {
    const result = await handle.query(queryName, ...args);
    return { success: true, result };
  } catch (error) {
    console.error(`Error querying workflow: ${error}`);
    throw error;
  }
}

// Function to search workflows
export async function searchWorkflows(query: string) {
  const client = await getTemporalClient();
  
  try {
    const workflows = await client.workflow.list({
      query,
    });
    
    const results = [];
    for await (const workflow of workflows) {
      results.push(workflow);
    }
    
    return { success: true, results };
  } catch (error) {
    console.error(`Error searching workflows: ${error}`);
    throw error;
  }
}
