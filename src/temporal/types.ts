export interface WorkflowEdge {
  id: string;
  from: string;
  to: string;
  type: 'default' | 'conditional';
}

export interface WorkflowSchema {
  workflowId: string;
  name: string;
  description: string;
  version: string;
  nodes: Array<{
    id: string;
    type: string;
    data: any;
  }>;
  edges: WorkflowEdge[];
  execution: {
    mode: 'sequential' | 'parallel';
    retryPolicy: {
      maxAttempts: number;
      initialInterval: Duration;
    };
  };
}

export interface NodeResult {
  nodeId: string;
  success: boolean;
  data?: any;
  error?: string;
}

export interface WorkflowResult {
  workflowId: string;
  success: boolean;
  nodeResults: NodeResult[];
  error?: string;
}
