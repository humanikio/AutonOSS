import axios from 'axios';
import { WorkflowUpdateData, N8nWorkflow } from '../types';
import { getWorkflowMapping } from '../workflowMapping/getMapping';
import { createWorkflowMapping } from '../workflowMapping/createMapping';

const N8N_BASE_URL = `${process.env.N8N_API_URL}/api/v1`;
const N8N_API_KEY = process.env.N8N_API_KEY;

export const updateWorkflow = async (
  workflowId: string,
  updateData: WorkflowUpdateData,
  tenantId?: string,
  internalWorkflowId?: string
): Promise<N8nWorkflow> => {
  try {
    console.log('Updating workflow in n8n:', workflowId);

    const response = await axios.put<N8nWorkflow>(
      `${N8N_BASE_URL}/workflows/${workflowId}`,
      updateData,
      {
        headers: {
          'X-N8N-API-KEY': N8N_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('Workflow updated successfully:', response.data.id);

    // Legacy support - ensure mapping exists
    if (tenantId && internalWorkflowId) {
      const existingMapping = await getWorkflowMapping(workflowId);

      if (!existingMapping) {
        console.log('⚠️  No mapping found for workflow - creating for legacy support');

        await createWorkflowMapping({
          n8nWorkflowId: workflowId,
          tenantId,
          workflowId: internalWorkflowId
        });

        console.log('✅ Legacy mapping created');
      } else {
        console.log('✅ Mapping already exists');
      }
    }

    return response.data;

  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('❌ n8n API error details:');
      console.error('Status:', error.response?.status);
      console.error('Data:', JSON.stringify(error.response?.data, null, 2));
      console.error('Message:', error.message);
      throw new Error(`Failed to update workflow in n8n: ${JSON.stringify(error.response?.data) || error.message}`);
    }
    throw error;
  }
};
