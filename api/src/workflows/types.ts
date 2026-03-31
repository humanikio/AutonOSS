import { Timestamp } from 'firebase-admin/firestore';

// Workflow Status
export type WorkflowStatus = 'draft' | 'published';

// Trigger Metadata (from n8n config)
export interface TriggerMetadata {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  triggerType: 'webhook' | 'schedule' | 'manual' | 'email' | 'other';
  url?: string;              // Production webhook URL
  webhookId?: string;
  httpMethod?: string;
  path?: string;
  authentication?: string;
  cronExpression?: string;   // For schedule triggers
  timezone?: string;         // For schedule triggers
  position: [number, number];
  parameters: any;
}

// Workflow Interface
export interface Workflow {
  id: string;
  name: string;
  folderId: string | null;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
  createdBy: string;
  status: WorkflowStatus;
  isPublic?: boolean; // If true, workflow is synced to n8n
  // Note: n8n config (including n8nWorkflowId, triggers, webhooks) is stored in subcollection: workflows/{id}/n8n/config
  nodes?: any[]; // ReactFlow format
  edges?: any[]; // ReactFlow format
  triggers?: TriggerMetadata[]; // Loaded from n8n config subcollection
}

// Workflow Folder Interface
export interface WorkflowFolder {
  id: string;
  name: string;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
  createdBy: string;
  automationCount?: number; // Calculated field, not stored in DB
}

// Create Workflow Request
export interface CreateWorkflowRequest {
  name?: string;
  status?: WorkflowStatus;
  folderId?: string | null;
}

// Update Workflow Request
export interface UpdateWorkflowRequest {
  name?: string;
  status?: WorkflowStatus;
  folderId?: string | null;
  nodes?: any[];
  edges?: any[];
  isPublic?: boolean; // Toggle to sync workflow to n8n
}

// Create Folder Request
export interface CreateFolderRequest {
  name: string;
}

// Update Folder Request
export interface UpdateFolderRequest {
  name?: string;
}

// Service Response
export interface ServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}
