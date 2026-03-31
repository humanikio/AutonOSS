import axios from 'axios';

const N8N_BASE_URL = `${process.env.N8N_API_URL}/api/v1`;
const N8N_API_KEY = process.env.N8N_API_KEY;

export interface ExecutionSummary {
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
}

export interface GetExecutionsListOptions {
  workflowId: string;
  status?: 'new' | 'running' | 'success' | 'error' | 'waiting' | 'canceled';
  limit?: number;
  cursor?: string; // For pagination (nextCursor from previous response)
}

export interface GetExecutionsListResponse {
  data: ExecutionSummary[];
  nextCursor?: string; // Use this for next page
}

/**
 * Get paginated list of workflow executions
 * https://docs.n8n.io/api/
 *
 * @param options - Filter and pagination options
 * @returns List of execution summaries with pagination cursor
 */
export const getExecutionsList = async (
  options: GetExecutionsListOptions
): Promise<GetExecutionsListResponse> => {
  try {
    console.log('Fetching executions list from n8n:', options);

    // Build query params
    const params = new URLSearchParams();
    params.append('workflowId', options.workflowId);

    if (options.status) {
      params.append('status', options.status);
    }

    if (options.limit) {
      params.append('limit', String(options.limit));
    } else {
      params.append('limit', '100'); // Default limit
    }

    if (options.cursor) {
      params.append('cursor', options.cursor);
    }

    const url = `${N8N_BASE_URL}/executions?${params.toString()}`;

    const response = await axios.get<GetExecutionsListResponse>(url, {
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY
      }
    });

    console.log(`Fetched ${response.data.data?.length || 0} executions`);

    return {
      data: response.data.data || [],
      nextCursor: response.data.nextCursor
    };

  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('n8n API error:', error.response?.data || error.message);
      throw new Error(`Failed to fetch executions from n8n: ${error.response?.data?.message || error.message}`);
    }
    throw error;
  }
};
