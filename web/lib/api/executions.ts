import apiClient from './client';
import { ApiResponse } from '@/types';

export interface ExecutionSummary {
  id: string;
  finished: boolean;
  mode: string;
  retryOf?: string;
  retrySuccessId?: string;
  startedAt: string;
  stoppedAt?: string;
  workflowId: string;
  status?: 'new' | 'running' | 'success' | 'error' | 'waiting' | 'canceled';
  waitTill?: string;
}

export interface ExecutionData {
  id: string;
  finished: boolean;
  mode: string;
  retryOf?: string;
  retrySuccessId?: string;
  startedAt: string;
  stoppedAt?: string;
  workflowId: string;
  status?: 'new' | 'running' | 'success' | 'error' | 'waiting' | 'canceled';
  waitTill?: string;
  data?: {
    resultData?: {
      runData?: Record<string, any[]>;
      error?: {
        message: string;
        stack?: string;
      };
    };
    executionData?: any;
    startData?: any;
  };
}

export interface GetExecutionsListParams {
  localWorkflowId?: string;
  n8nWorkflowId?: string;
  status?: 'new' | 'running' | 'success' | 'error' | 'waiting' | 'canceled';
  limit?: number;
  cursor?: string;
}

export interface GetExecutionsListResponse {
  data: ExecutionSummary[];
  nextCursor?: string;
}

/**
 * Get paginated list of executions for a workflow
 */
export const getExecutionsList = async (
  params: GetExecutionsListParams
): Promise<GetExecutionsListResponse> => {
  const queryParams = new URLSearchParams();

  if (params.localWorkflowId) {
    queryParams.append('localWorkflowId', params.localWorkflowId);
  }
  if (params.n8nWorkflowId) {
    queryParams.append('n8nWorkflowId', params.n8nWorkflowId);
  }
  if (params.status) {
    queryParams.append('status', params.status);
  }
  if (params.limit) {
    queryParams.append('limit', String(params.limit));
  }
  if (params.cursor) {
    queryParams.append('cursor', params.cursor);
  }

  const response = await apiClient.get<ApiResponse<ExecutionSummary[]> & { nextCursor?: string }>(
    `/api/n8n/executions?${queryParams.toString()}`
  );

  return {
    data: response.data.data || [],
    nextCursor: response.data.nextCursor
  };
};

/**
 * Get single execution with full details
 */
export const getExecutionDetails = async (
  executionId: string,
  includeData: boolean = true
): Promise<ExecutionData> => {
  const queryParams = new URLSearchParams();
  if (includeData) {
    queryParams.append('includeData', 'true');
  }

  const response = await apiClient.get<ApiResponse<ExecutionData>>(
    `/api/n8n/executions/${executionId}?${queryParams.toString()}`
  );

  return response.data.data!;
};
