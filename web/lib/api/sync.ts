import apiClient from './client';
import { ApiResponse } from '@/types';

export const syncAPI = {
  // Knowledge sync methods
  getKnowledgeChanges: async () => {
    const response = await apiClient.get<ApiResponse<any>>('/api/sync/knowledge/changes');
    return response.data.data;
  },

  getSyncStatus: async () => {
    const response = await apiClient.get<ApiResponse<any>>('/api/sync/knowledge/sync-status');
    return response.data.data;
  },

  syncKnowledge: async (agentIds?: string[]) => {
    const response = await apiClient.post<ApiResponse<any>>('/api/sync/knowledge/sync', { agentIds });
    return response.data.data;
  },

  syncSingleAgentKnowledge: async (id: string) => {
    const response = await apiClient.post<ApiResponse<any>>(`/api/sync/agents/${id}/knowledge/sync`);
    return response.data.data;
  },

  getAffectedAgents: async (knowledgeType: string, itemIds?: string[]) => {
    const params = new URLSearchParams({ knowledgeType });
    if (itemIds) {
      params.append('itemIds', itemIds.join(','));
    }
    const response = await apiClient.get<ApiResponse<string[]>>(`/api/sync/knowledge/affected-agents?${params}`);
    return response.data.data;
  }
};