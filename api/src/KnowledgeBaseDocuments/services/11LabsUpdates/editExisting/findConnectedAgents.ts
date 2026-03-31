import axios from 'axios';

export interface ConnectedAgent {
  id: string;  // 11Labs uses 'id' not 'agent_id'
  name: string;
  type?: string;
  created_at_unix_secs?: number;
  access_level?: string;
  tags?: string[];
}

export interface FindConnectedAgentsResponse {
  agents: ConnectedAgent[];
  has_more: boolean;
  next_cursor?: string | null;
}

export interface FindConnectedAgentsOptions {
  cursor?: string;
  page_size?: number; // 1-100, default 30
}

/**
 * Find agents that are connected to a specific 11Labs knowledge base document
 */
export async function findConnectedAgents(
  documentationId: string,
  options: FindConnectedAgentsOptions = {}
): Promise<ConnectedAgent[]> {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    
    if (!apiKey) {
      throw new Error('ELEVENLABS_API_KEY environment variable is not set');
    }

    console.log(`Finding connected agents for 11Labs document: ${documentationId}`);

    const allAgents: ConnectedAgent[] = [];
    let cursor = options.cursor;
    let hasMore = true;

    // Handle pagination to get all connected agents
    while (hasMore) {
      const params: Record<string, string | number> = {};
      
      if (cursor) {
        params.cursor = cursor;
      }
      
      if (options.page_size) {
        params.page_size = Math.min(Math.max(options.page_size, 1), 100); // Clamp between 1-100
      }

      const response = await axios.get(
        `https://api.elevenlabs.io/v1/convai/knowledge-base/${documentationId}/dependent-agents`,
        {
          headers: {
            'xi-api-key': apiKey
          },
          params,
          timeout: 30000 // 30 second timeout
        }
      );

      if (response.status !== 200) {
        throw new Error(`11Labs API returned status ${response.status}: ${response.statusText}`);
      }

      const result = response.data as FindConnectedAgentsResponse;
      
      // Add agents from this page
      allAgents.push(...result.agents);
      
      // Check if there are more pages
      hasMore = result.has_more;
      cursor = result.next_cursor || undefined;

      console.log(`Found ${result.agents.length} agents on this page. Total so far: ${allAgents.length}`);
    }

    console.log(`Successfully found ${allAgents.length} connected agents for document ${documentationId}`);
    
    if (allAgents.length > 0) {
      console.log('Connected agents:', allAgents.map(agent => `${agent.name} (${agent.id})`));
    }

    return allAgents;

  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('11Labs API Error:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      
      if (error.response?.status === 404) {
        console.log(`11Labs document ${documentationId} not found or has no connected agents`);
        return []; // Return empty array if document not found
      } else if (error.response?.status === 422) {
        throw new Error(`11Labs validation error: ${JSON.stringify(error.response.data)}`);
      } else if (error.response?.status === 401) {
        throw new Error('11Labs API authentication failed. Check your API key.');
      } else if (error.response?.status === 429) {
        throw new Error('11Labs API rate limit exceeded. Please try again later.');
      } else {
        throw new Error(`11Labs API error (${error.response?.status}): ${error.response?.statusText || error.message}`);
      }
    }
    
    console.error('Error finding connected agents:', error);
    throw new Error(`Failed to find connected agents: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Helper function to get a summary of connected agents
 */
export function getConnectedAgentsSummary(agents: ConnectedAgent[]): string {
  if (agents.length === 0) {
    return 'No connected agents';
  }

  if (agents.length === 1) {
    return `1 connected agent: ${agents[0].name}`;
  }

  return `${agents.length} connected agents: ${agents.map(a => a.name).join(', ')}`;
}