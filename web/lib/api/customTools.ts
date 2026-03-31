import apiClient from './client';

export interface CustomTool {
  id: string;
  tenantId: string;
  elevenlabsToolId: string;
  name: string;
  description: string;
  webhookUrl: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  pathParams?: Record<string, any>;
  queryParams?: Record<string, any>;
  requestBody?: Record<string, any>;
  requestHeaders?: Record<string, string>;
  responseTimeout?: number;
  disableInterruptions?: boolean;
  forcePreToolSpeech?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CustomToolRequest {
  name: string;
  description: string;
  webhookUrl: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  pathParams?: Record<string, any>;
  queryParams?: Record<string, any>;
  requestBody?: Record<string, any>;
  requestHeaders?: Record<string, string>;
  responseTimeout?: number;
  disableInterruptions?: boolean;
  forcePreToolSpeech?: boolean;
}

export const customToolsAPI = {
  // Get all custom tools
  async getCustomTools(): Promise<CustomTool[]> {
    const response = await apiClient.get('/api/custom-tools');
    return response.data.data || [];
  },

  // Create a new custom tool
  async createCustomTool(data: CustomToolRequest): Promise<CustomTool> {
    const response = await apiClient.post('/api/custom-tools', data);
    return response.data.data;
  },

  // Update an existing custom tool
  async updateCustomTool(id: string, data: Partial<CustomToolRequest>): Promise<CustomTool> {
    const response = await apiClient.put(`/api/custom-tools/${id}`, data);
    return response.data.data;
  },

  // Delete a custom tool
  async deleteCustomTool(id: string): Promise<void> {
    await apiClient.delete(`/api/custom-tools/${id}`);
  },

  // Get a specific custom tool
  async getCustomTool(id: string): Promise<CustomTool> {
    const response = await apiClient.get(`/api/custom-tools/${id}`);
    return response.data.data;
  }
};