// Shared types for automation management

export interface AutomationWorkflow {
  // Our internal workflow ID
  workflowId: string;
  // n8n's workflow ID (if linked)
  n8nWorkflowId?: string;
  // Workflow details
  name: string;
  status: 'draft' | 'active' | 'paused';
  totalEnrolled: number;
  activeEnrolled: number;
  // Metadata
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

export interface AutomationFolder {
  // Folder ID
  folderId: string;
  // Folder details
  name: string;
  workflowIds: string[];
  // Metadata
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkflowData {
  name?: string;
  status?: 'draft' | 'active' | 'paused';
}

export interface UpdateWorkflowData {
  name?: string;
  status?: 'draft' | 'active' | 'paused';
  n8nWorkflowId?: string;
  totalEnrolled?: number;
  activeEnrolled?: number;
}

export interface CreateFolderData {
  name: string;
}

export interface UpdateFolderData {
  name?: string;
  workflowIds?: string[];
}
