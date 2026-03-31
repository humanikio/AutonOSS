import axios from 'axios';
import { N8nWorkflow } from '../types';

const N8N_BASE_URL = `${process.env.N8N_API_URL}/api/v1`;
const N8N_API_KEY = process.env.N8N_API_KEY;

export const readWorkflow = async (workflowId: string): Promise<N8nWorkflow> => {
  try {
    console.log('Fetching workflow from n8n:', workflowId);

    const response = await axios.get<N8nWorkflow>(
      `${N8N_BASE_URL}/workflows/${workflowId}`,
      {
        headers: {
          'X-N8N-API-KEY': N8N_API_KEY
        }
      }
    );

    console.log('Workflow fetched successfully:', response.data.id);
    return response.data;

  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('n8n API error:', error.response?.data || error.message);
      throw new Error(`Failed to fetch workflow from n8n: ${error.response?.data?.message || error.message}`);
    }
    throw error;
  }
};
