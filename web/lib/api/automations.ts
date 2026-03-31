import apiClient from './client';
import { ApiResponse } from '@/types';

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

export interface Automation {
  id: string;
  name: string;
  status: 'draft' | 'active' | 'paused';
  totalEnrolled: number;
  activeEnrolled: number;
  createdAt: string;
  updatedAt: string;
  tenantId: string;
  folderId?: string | null; // Folder ID if workflow is in a folder
  nodes?: any[];
  edges?: any[];
  isPublic?: boolean; // If true, workflow is synced to n8n
  n8nWorkflowId?: string; // n8n workflow ID when synced
  triggers?: TriggerMetadata[]; // Loaded from n8n config (includes webhook URLs)
}

export interface CreateAutomationRequest {
  name?: string;
}

// Create a new automation
export const createAutomation = async (data?: CreateAutomationRequest): Promise<Automation> => {
  const response = await apiClient.post<ApiResponse<Automation>>('/api/workflows/workflows', data || {});
  return response.data.data!;
};

// Get all automations for the current tenant
export const getAutomations = async (): Promise<Automation[]> => {
  const response = await apiClient.get<ApiResponse<Automation[]>>('/api/workflows/workflows');
  return response.data.data || [];
};

// Get a specific automation by ID
export const getAutomation = async (id: string): Promise<Automation> => {
  const response = await apiClient.get<ApiResponse<Automation>>(`/api/workflows/workflows/${id}`);
  return response.data.data!;
};

// Update an existing automation
export const updateAutomation = async (id: string, data: Partial<Automation>): Promise<Automation> => {
  const response = await apiClient.put<ApiResponse<Automation>>(`/api/workflows/workflows/${id}`, data);
  return response.data.data!;
};

// Delete an automation
export const deleteAutomation = async (id: string): Promise<void> => {
  await apiClient.delete(`/api/workflows/workflows/${id}`);
};

// Batch delete automations
export interface BatchDeleteResult {
  workflowId: string;
  success: boolean;
  error?: string;
}

export interface BatchDeleteResponse {
  total: number;
  succeeded: number;
  failed: number;
  results: BatchDeleteResult[];
}

export const batchDeleteAutomations = async (workflowIds: string[]): Promise<BatchDeleteResponse> => {
  const response = await apiClient.post<ApiResponse<BatchDeleteResponse>>('/api/workflows/workflows/batch-delete', { workflowIds });
  return response.data.data!;
};

// Folder management interfaces
export interface Folder {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  tenantId: string;
  automationCount: number;
}

export interface CreateFolderRequest {
  name: string;
}

// Get all folders for the current tenant
export const getFolders = async (): Promise<Folder[]> => {
  const response = await apiClient.get<ApiResponse<Folder[]>>('/api/workflows/folders');
  return response.data.data || [];
};

// Create a new folder
export const createFolder = async (data: CreateFolderRequest): Promise<Folder> => {
  const response = await apiClient.post<ApiResponse<Folder>>('/api/workflows/folders', data);
  return response.data.data!;
};

// Add automation to folder
export const addAutomationToFolder = async (folderId: string, workflowId: string): Promise<void> => {
  await apiClient.post(`/api/workflows/folders/${folderId}/add-workflow`, { workflowId });
};

// Get folder contents
export const getFolderContents = async (folderId: string): Promise<Automation[]> => {
  const response = await apiClient.get<ApiResponse<Automation[]>>(`/api/workflows/folders/${folderId}/contents`);
  return response.data.data || [];
};

// Update folder
export const updateFolder = async (id: string, data: Partial<Folder>): Promise<Folder> => {
  const response = await apiClient.put<ApiResponse<Folder>>(`/api/workflows/folders/${id}`, data);
  return response.data.data!;
};

// Delete folder
export const deleteFolder = async (id: string): Promise<void> => {
  await apiClient.delete(`/api/workflows/folders/${id}`);
};