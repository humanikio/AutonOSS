import axios from 'axios';

const N8N_BASE_URL = `${process.env.N8N_API_URL}/api/v1`;
const N8N_API_KEY = process.env.N8N_API_KEY;

export interface ExecutionData {
  id: string;
  finished: boolean;
  mode: string;
  retryOf?: string;
  retrySuccessId?: string;
  startedAt: string;
  stoppedAt?: string;
  workflowId: string;
  status?: 'new' | 'running' | 'success' | 'error' | 'waiting' | 'canceled';
  waitTill?: string;
  data?: {
    resultData?: {
      runData?: Record<string, any[]>;
      error?: {
        message: string;
        stack?: string;
      };
    };
    executionData?: any;
    startData?: any;
  };
}

/**
 * Get single execution with full data
 * https://docs.n8n.io/api/
 *
 * @param executionId - The execution ID to fetch
 * @param includeData - Whether to include full execution data (default: true)
 * @returns Full execution details
 */
export const getExecution = async (
  executionId: string,
  includeData: boolean = true
): Promise<ExecutionData> => {
  try {
    console.log(`Fetching execution ${executionId} from n8n (includeData: ${includeData})`);

    // Build query params
    const params = new URLSearchParams();
    if (includeData) {
      params.append('includeData', 'true');
    }

    const url = `${N8N_BASE_URL}/executions/${executionId}${params.toString() ? `?${params.toString()}` : ''}`;

    const response = await axios.get<{ data: ExecutionData }>(url, {
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY
      }
    });

    console.log(`Fetched execution ${executionId} (status: ${response.data.data.status || 'unknown'})`);

    return response.data.data;

  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('n8n API error:', error.response?.data || error.message);
      throw new Error(`Failed to fetch execution from n8n: ${error.response?.data?.message || error.message}`);
    }
    throw error;
  }
};
