import axios from 'axios';
import { N8nWorkflow, GetWorkflowsOptions } from '../types';

const N8N_BASE_URL = `${process.env.N8N_API_URL}/api/v1`;
const N8N_API_KEY = process.env.N8N_API_KEY;

export const getWorkflows = async (options?: GetWorkflowsOptions): Promise<N8nWorkflow[]> => {
  try {
    console.log('Fetching workflows from n8n');

    // Build query params
    const params = new URLSearchParams();
    if (options?.active !== undefined) {
      params.append('active', String(options.active));
    }
    if (options?.limit) {
      params.append('limit', String(options.limit));
    }

    const url = `${N8N_BASE_URL}/workflows${params.toString() ? `?${params.toString()}` : ''}`;

    const response = await axios.get<{ data: N8nWorkflow[] }>(url, {
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY
      }
    });

    console.log(`Fetched ${response.data.data?.length || 0} workflows`);
    return response.data.data || [];

  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('n8n API error:', error.response?.data || error.message);
      throw new Error(`Failed to fetch workflows from n8n: ${error.response?.data?.message || error.message}`);
    }
    throw error;
  }
};
