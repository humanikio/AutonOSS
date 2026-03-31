// Shared types for n8n workflow management

export interface WorkflowNode {
  [key: string]: any;
}

export interface WorkflowData {
  name: string;
  active?: boolean; // Optional: n8n doesn't allow this during creation
  nodes: WorkflowNode[];
  connections: Record<string, any>;
  settings?: Record<string, any>;
  tags?: string[];
}

export interface WorkflowUpdateData {
  name?: string;
  active?: boolean;
  nodes?: WorkflowNode[];
  connections?: Record<string, any>;
  settings?: Record<string, any>;
  tags?: string[];
}

export interface N8nWorkflow {
  id: string;
  name: string;
  active: boolean;
  nodes: WorkflowNode[];
  connections: Record<string, any>;
  settings?: Record<string, any>;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface GetWorkflowsOptions {
  active?: boolean;
  limit?: number;
}
