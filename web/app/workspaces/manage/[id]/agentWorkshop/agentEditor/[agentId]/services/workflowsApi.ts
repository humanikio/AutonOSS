/**
 * Workflows API Service
 *
 * API layer for workflows operations.
 * Used for fetching workflows for selection in agent tools.
 */

import apiClient from '@/lib/api/client';
import { ApiResponse } from '@/types';

export interface Workflow {
  id: string;
  name: string;
  folderId: string | null;
  createdAt: any;
  updatedAt: any;
  createdBy: string;
  status: 'draft' | 'published';
  isPublic?: boolean;
  nodes?: any[];
  edges?: any[];
  triggers?: any[];
}

/**
 * List all workflows for the tenant
 */
export async function listWorkflows(): Promise<Workflow[]> {
  const response = await apiClient.get<ApiResponse<Workflow[]>>('/api/workflows/workflows');
  return response.data.data || [];
}
