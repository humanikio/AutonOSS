import axios from 'axios';

const N8N_BASE_URL = `${process.env.N8N_API_URL}/api/v1`;
const N8N_API_KEY = process.env.N8N_API_KEY;

/**
 * Activates a workflow in n8n
 * Uses the dedicated POST /workflows/{id}/activate endpoint
 * IMPORTANT: This endpoint expects NO BODY - only headers
 */
export const activateWorkflow = async (workflowId: string): Promise<void> => {
  try {
    console.log(`🟢 Activating n8n workflow: ${workflowId}`);

    // Use the dedicated activation endpoint with NO BODY
    await axios.post(
      `${N8N_BASE_URL}/workflows/${workflowId}/activate`,
      null, // IMPORTANT: No body sent
      {
        headers: {
          'X-N8N-API-KEY': N8N_API_KEY
        }
      }
    );

    console.log(`✅ Workflow ${workflowId} activated successfully`);

  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('❌ Failed to activate workflow:');
      console.error('Status:', error.response?.status);
      console.error('Data:', JSON.stringify(error.response?.data, null, 2));
      throw new Error(`Failed to activate workflow: ${JSON.stringify(error.response?.data) || error.message}`);
    }
    throw error;
  }
};
