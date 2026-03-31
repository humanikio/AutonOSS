import axios from 'axios';
import { deleteWorkflowMapping } from '../workflowMapping/deleteMapping';

const N8N_BASE_URL = `${process.env.N8N_API_URL}/api/v1`;
const N8N_API_KEY = process.env.N8N_API_KEY;

// Timeouts for different operations
const DEACTIVATE_TIMEOUT = 30000; // 30s for deactivation
const POLL_TIMEOUT = 60000; // 60s total polling time
const POLL_INTERVAL = 2000; // Poll every 2s
const DELETE_TIMEOUT = 120000; // 120s for final deletion (generous for cleanup)

interface N8nExecution {
  id: string;
  mode: string;
  status: string;
  workflowId: string;
}

interface N8nWorkflow {
  id: string;
  name: string;
  active: boolean;
}

export const deleteWorkflow = async (workflowId: string): Promise<void> => {
  try {
    console.log('🗑️  Starting robust workflow deletion:', workflowId);

    // Step 1: Deactivate the workflow
    await deactivateWorkflow(workflowId);

    // Step 2: Poll until workflow is inactive
    await waitForWorkflowInactive(workflowId);

    // Step 3: Purge waiting executions
    await purgeWaitingExecutions(workflowId);

    // Step 4: Delete the workflow
    console.log('🗑️  Deleting workflow...');
    await axios.delete(
      `${N8N_BASE_URL}/workflows/${workflowId}`,
      {
        headers: {
          'X-N8N-API-KEY': N8N_API_KEY
        },
        timeout: DELETE_TIMEOUT
      }
    );

    // Delete reverse mapping
    await deleteWorkflowMapping(workflowId);

    console.log('✅ Workflow deleted successfully:', workflowId);

  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED') {
        console.error('❌ n8n delete request timed out');
        throw new Error(`n8n workflow deletion timed out after waiting for deactivation and execution cleanup`);
      }
      console.error('❌ n8n API error:', error.response?.data || error.message);
      throw new Error(`Failed to delete workflow from n8n: ${error.response?.data?.message || error.message}`);
    }
    throw error;
  }
};

/**
 * Step 1: Deactivate the workflow
 */
async function deactivateWorkflow(workflowId: string): Promise<void> {
  try {
    console.log('⏸️  Deactivating workflow...');
    await axios.post(
      `${N8N_BASE_URL}/workflows/${workflowId}/deactivate`,
      null,
      {
        headers: {
          'X-N8N-API-KEY': N8N_API_KEY
        },
        timeout: DEACTIVATE_TIMEOUT
      }
    );
    console.log('✅ Workflow deactivated');
  } catch (error) {
    if (axios.isAxiosError(error)) {
      // If already inactive, that's fine
      if (error.response?.status === 400 || error.response?.status === 404) {
        console.log('ℹ️  Workflow already inactive or not found');
        return;
      }
      if (error.code === 'ECONNABORTED') {
        console.warn('⚠️  Deactivation timed out - continuing anyway');
        return;
      }
    }
    throw error;
  }
}

/**
 * Step 2: Poll until workflow is inactive
 */
async function waitForWorkflowInactive(workflowId: string): Promise<void> {
  console.log('⏳ Polling for workflow to become inactive...');
  const startTime = Date.now();

  while (Date.now() - startTime < POLL_TIMEOUT) {
    try {
      const response = await axios.get<N8nWorkflow>(
        `${N8N_BASE_URL}/workflows/${workflowId}`,
        {
          headers: {
            'X-N8N-API-KEY': N8N_API_KEY
          },
          timeout: 10000
        }
      );

      if (!response.data.active) {
        console.log('✅ Workflow is now inactive');
        return;
      }

      console.log('⏳ Workflow still active, waiting...');
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        console.log('ℹ️  Workflow not found (may have been deleted)');
        return;
      }
      throw error;
    }
  }

  console.warn('⚠️  Timeout waiting for workflow to deactivate - proceeding anyway');
}

/**
 * Step 3: Purge waiting executions for this workflow
 */
async function purgeWaitingExecutions(workflowId: string): Promise<void> {
  try {
    console.log('🧹 Fetching waiting executions...');

    // Get all waiting executions (n8n doesn't support filtering by workflowId in query,
    // so we fetch waiting executions and filter client-side)
    const response = await axios.get<{ data: N8nExecution[] }>(
      `${N8N_BASE_URL}/executions`,
      {
        headers: {
          'X-N8N-API-KEY': N8N_API_KEY
        },
        params: {
          limit: 100,
          status: 'waiting'
        },
        timeout: 30000
      }
    );

    // Filter to only this workflow's executions
    const workflowExecutions = response.data.data.filter(
      exec => exec.workflowId === workflowId
    );

    if (workflowExecutions.length === 0) {
      console.log('ℹ️  No waiting executions found');
      return;
    }

    console.log(`🧹 Deleting ${workflowExecutions.length} waiting execution(s)...`);

    // Delete each waiting execution
    await Promise.all(
      workflowExecutions.map(async (execution) => {
        try {
          await axios.delete(
            `${N8N_BASE_URL}/executions/${execution.id}`,
            {
              headers: {
                'X-N8N-API-KEY': N8N_API_KEY
              },
              timeout: 10000
            }
          );
          console.log(`  ✅ Deleted execution ${execution.id}`);
        } catch (error) {
          console.warn(`  ⚠️  Failed to delete execution ${execution.id}:`, error);
          // Continue even if individual execution deletion fails
        }
      })
    );

    console.log('✅ Finished purging executions');
  } catch (error) {
    console.warn('⚠️  Error fetching/purging executions - continuing anyway:', error);
    // Don't fail the entire deletion if execution cleanup fails
  }
}
