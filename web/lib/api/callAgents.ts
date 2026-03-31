import apiClient from './client';
import { CallAgent, CallAgentRequest, ApiResponse } from '@/types';

export const callAgentsAPI = {

  // Call agent CRUD
  getCallAgents: async (): Promise<CallAgent[]> => {
    const response = await apiClient.get<ApiResponse<CallAgent[]>>('/api/call-agents');
    return response.data.data || [];
  },

  createCallAgent: async (agentData: CallAgentRequest): Promise<CallAgent> => {
    const response = await apiClient.post<ApiResponse<CallAgent>>('/api/call-agents', agentData);
    return response.data.data!;
  },

  getCallAgent: async (id: string): Promise<CallAgent> => {
    const response = await apiClient.get<ApiResponse<CallAgent>>(`/api/call-agents/${id}`);
    return response.data.data!;
  },

  updateCallAgent: async (id: string, agentData: Partial<CallAgentRequest>): Promise<CallAgent> => {
    const response = await apiClient.put<ApiResponse<CallAgent>>(`/api/call-agents/${id}`, agentData);
    return response.data.data!;
  },

  deleteCallAgent: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/call-agents/${id}`);
  },

  // Agent status management
  toggleAgentStatus: async (id: string, status: 'active' | 'paused'): Promise<void> => {
    await apiClient.patch(`/api/call-agents/${id}/status`, { status });
  }
};