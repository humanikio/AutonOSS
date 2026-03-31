import axios from 'axios';
import { WorkflowData, N8nWorkflow } from '../types';
import { createWorkflowMapping } from '../workflowMapping/createMapping';

const N8N_BASE_URL = `${process.env.N8N_API_URL}/api/v1`;
const N8N_API_KEY = process.env.N8N_API_KEY;

export const createWorkflow = async (
  workflowData: WorkflowData,
  tenantId: string,
  workflowId: string
): Promise<N8nWorkflow> => {
  try {
    console.log('Creating workflow in n8n:', workflowData.name);

    const response = await axios.post<N8nWorkflow>(
      `${N8N_BASE_URL}/workflows`,
      workflowData,
      {
        headers: {
          'X-N8N-API-KEY': N8N_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('Workflow created successfully:', response.data.id);

    // Create reverse mapping for quick resolution
    await createWorkflowMapping({
      n8nWorkflowId: response.data.id,
      tenantId,
      workflowId
    });

    return response.data;

  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('❌ n8n API error details:');
      console.error('Status:', error.response?.status);
      console.error('Data:', JSON.stringify(error.response?.data, null, 2));
      console.error('Message:', error.message);
      throw new Error(`Failed to create workflow in n8n: ${JSON.stringify(error.response?.data) || error.message}`);
    }
    throw error;
  }
};
