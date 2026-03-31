import axios from 'axios';

const N8N_BASE_URL = `${process.env.N8N_API_URL}/api/v1`;
const N8N_API_KEY = process.env.N8N_API_KEY;

export interface ExecuteWorkflowResponse {
  executionId: string;
  data: any;
}

/**
 * Execute an n8n workflow with provided data
 *
 * @param workflowId - The n8n workflow ID to execute
 * @param data - Payload data to pass to the workflow
 * @returns Execution result with executionId
 */
export const executeWorkflow = async (
  workflowId: string,
  data: Record<string, any>
): Promise<ExecuteWorkflowResponse> => {
  try {
    console.log(`🚀 Executing n8n workflow: ${workflowId}`);

    const response = await axios.post(
      `${N8N_BASE_URL}/workflows/${workflowId}/execute`,
      { data },
      {
        headers: {
          'X-N8N-API-KEY': N8N_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log(`✅ Workflow executed successfully`);
    console.log(`   Execution ID: ${response.data.executionId}`);

    return {
      executionId: response.data.executionId || response.data.id,
      data: response.data
    };

  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('❌ n8n API error details:');
      console.error('Status:', error.response?.status);
      console.error('Data:', JSON.stringify(error.response?.data, null, 2));
      console.error('Message:', error.message);
      throw new Error(`Failed to execute workflow in n8n: ${JSON.stringify(error.response?.data) || error.message}`);
    }
    throw error;
  }
};
