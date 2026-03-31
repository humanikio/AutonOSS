import apiClient from './client';
import { CallAgent } from '@/types';

export const editAgentsAPI = {
  async getAgentForEdit(agentId: string): Promise<CallAgent> {
    const response = await apiClient.get(`/api/edit-agents/${agentId}`);
    return response.data;
  },

  async updateBasicInfo(agentId: string, data: {
    name?: string;
    description?: string;
    status?: 'active' | 'inactive' | 'archived';
  }): Promise<void> {
    await apiClient.put(`/api/edit-agents/${agentId}/basic`, data);
  },

  async updateVoiceSettings(agentId: string, data: {
    voiceId?: string;
    stability?: number;
    similarityBoost?: number;
    style?: number;
    useSpeakerBoost?: boolean;
  }): Promise<void> {
    await apiClient.put(`/api/edit-agents/${agentId}/voice`, data);
  },

  async updateConversationSettings(agentId: string, data: {
    systemPrompt?: string;
    firstMessage?: string;
    language?: string;
  }): Promise<void> {
    await apiClient.put(`/api/edit-agents/${agentId}/conversation`, data);
  },

  async updateBehaviorSettings(agentId: string, data: {
    responseLength?: 'short' | 'medium' | 'long';
    interruptionSensitivity?: 'low' | 'medium' | 'high';
    customToolIds?: string[];
  }): Promise<void> {
    await apiClient.put(`/api/edit-agents/${agentId}/behavior`, data);
  },

  async updateKnowledgeBase(agentId: string, data: any): Promise<{ knowledgeBaseIds: string[] }> {
    const response = await apiClient.put(`/api/edit-agents/${agentId}/knowledge`, data);
    return response.data;
  }
};