import apiClient from './client';
import { PromptGenerationRequest } from '@/types';

export interface GeneratedPrompt {
  systemPrompt: string;
  firstMessage: string;
}

export interface PromptGenerationResponse {
  success: boolean;
  data: GeneratedPrompt;
  message?: string;
  timestamp: string;
}

export interface FirstMessageResponse {
  success: boolean;
  data: { firstMessage: string };
  message?: string;
  timestamp: string;
}

export interface PromptTemplatesResponse {
  success: boolean;
  data: {
    conversationStyles: Array<{
      value: string;
      label: string;
      description: string;
    }>;
    businessGoalExamples: Record<string, string[]>;
    targetAudienceExamples: string[];
    challengeExamples: string[];
  };
  timestamp: string;
}

export interface ValidationResponse {
  success: boolean;
  data: {
    isValid: boolean;
    errors: string[];
    suggestions: string[];
  };
  timestamp: string;
}

export const promptGenerationApi = {
  /**
   * Generate a complete agent prompt with system prompt and conversation flow
   */
  async generateAgentPrompt(request: PromptGenerationRequest): Promise<PromptGenerationResponse> {
    const response = await apiClient.post('/api/prompt-generation/agent-prompt', request);
    return response.data;
  },

  /**
   * Generate just the first message for an agent
   */
  async generateFirstMessage(request: PromptGenerationRequest): Promise<FirstMessageResponse> {
    const response = await apiClient.post('/api/prompt-generation/first-message', request);
    return response.data;
  },

  /**
   * Get prompt generation templates and suggestions
   */
  async getTemplates(): Promise<PromptTemplatesResponse> {
    const response = await apiClient.get('/api/prompt-generation/templates');
    return response.data;
  },

  /**
   * Validate a prompt request before generation
   */
  async validateRequest(request: Partial<PromptGenerationRequest>): Promise<ValidationResponse> {
    const response = await apiClient.post('/api/prompt-generation/validate', request);
    return response.data;
  }
};