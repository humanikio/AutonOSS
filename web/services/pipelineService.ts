import { auth } from '@/lib/firebase/firebase';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface PipelineStage {
  id: string;
  name: string;
  order?: number;
}

interface Pipeline {
  id: string;
  name: string;
  dateCreated: string;
  createdBy: string;
  lastModified: string;
  visibleInFunnelChart: boolean;
  visibleInPieChart: boolean;
  opportunityCount: number;
  totalValue: number;
  stages?: PipelineStage[];
}

interface CreatePipelineRequest {
  name: string;
  stages?: { name: string; order?: number }[];
}

interface UpdatePipelineRequest {
  name?: string;
  visibleInFunnelChart?: boolean;
  visibleInPieChart?: boolean;
}

class PipelineService {
  private async getAuthHeaders(): Promise<HeadersInit> {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    const token = await user.getIdToken();
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  async getPipelines(): Promise<Pipeline[]> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/api/opportunities/pipelines`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch pipelines: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('🔍 Raw API response:', data);
      console.log('🔍 Extracted pipelines data:', data.data);
      return data.data || [];
    } catch (error) {
      console.error('Error fetching pipelines:', error);
      throw error;
    }
  }

  async createPipeline(pipelineData: CreatePipelineRequest): Promise<Pipeline> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/api/opportunities/pipelines`, {
        method: 'POST',
        headers,
        body: JSON.stringify(pipelineData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to create pipeline: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error creating pipeline:', error);
      throw error;
    }
  }

  async updatePipeline(pipelineId: string, updateData: UpdatePipelineRequest): Promise<Pipeline> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/api/opportunities/pipelines/${pipelineId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to update pipeline: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error updating pipeline:', error);
      throw error;
    }
  }

  async deletePipeline(pipelineId: string): Promise<void> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/api/opportunities/pipelines/${pipelineId}`, {
        method: 'DELETE',
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to delete pipeline: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error deleting pipeline:', error);
      throw error;
    }
  }

  async createStage(pipelineId: string, stageData: { name: string; order?: number }): Promise<PipelineStage> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/api/opportunities/pipelines/${pipelineId}/stages`, {
        method: 'POST',
        headers,
        body: JSON.stringify(stageData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to create stage: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error creating stage:', error);
      throw error;
    }
  }

  async updateStage(pipelineId: string, stageId: string, stageData: { name?: string; order?: number }): Promise<PipelineStage> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/api/opportunities/pipelines/${pipelineId}/stages/${stageId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(stageData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to update stage: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error updating stage:', error);
      throw error;
    }
  }

  async deleteStage(pipelineId: string, stageId: string): Promise<void> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/api/opportunities/pipelines/${pipelineId}/stages/${stageId}`, {
        method: 'DELETE',
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to delete stage: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error deleting stage:', error);
      throw error;
    }
  }
}

export const pipelineService = new PipelineService();
export type { Pipeline, PipelineStage, CreatePipelineRequest, UpdatePipelineRequest };