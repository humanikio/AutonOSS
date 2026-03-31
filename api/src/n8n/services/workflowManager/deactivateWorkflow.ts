import axios from 'axios';

const N8N_BASE_URL = `${process.env.N8N_API_URL}/api/v1`;
const N8N_API_KEY = process.env.N8N_API_KEY;

/**
 * Deactivates a workflow in n8n
 * Uses the dedicated POST /workflows/{id}/deactivate endpoint
 * IMPORTANT: This endpoint expects NO BODY - only headers
 */
export const deactivateWorkflow = async (workflowId: string): Promise<void> => {
  try {
    console.log(`⏸️  Deactivating n8n workflow: ${workflowId}`);

    // Use the dedicated deactivation endpoint with NO BODY
    await axios.post(
      `${N8N_BASE_URL}/workflows/${workflowId}/deactivate`,
      null, // IMPORTANT: No body sent
      {
        headers: {
          'X-N8N-API-KEY': N8N_API_KEY
        },
        timeout: 30000 // 30s timeout
      }
    );

    console.log(`✅ Workflow ${workflowId} deactivated successfully`);

  } catch (error) {
    if (axios.isAxiosError(error)) {
      // If already inactive, that's fine - don't throw
      if (error.response?.status === 400 || error.response?.status === 404) {
        console.log(`ℹ️  Workflow ${workflowId} already inactive or not found`);
        return;
      }

      // If timeout, log warning but don't throw
      if (error.code === 'ECONNABORTED') {
        console.warn(`⚠️  Deactivation timed out for ${workflowId} - continuing anyway`);
        return;
      }

      console.error('❌ Failed to deactivate workflow:');
      console.error('Status:', error.response?.status);
      console.error('Data:', JSON.stringify(error.response?.data, null, 2));
      throw new Error(`Failed to deactivate workflow: ${JSON.stringify(error.response?.data) || error.message}`);
    }
    throw error;
  }
};
