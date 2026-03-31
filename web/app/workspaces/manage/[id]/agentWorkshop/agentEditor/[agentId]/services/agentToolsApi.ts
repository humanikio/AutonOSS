/**
 * Agent Tools API Service
 *
 * API layer for agent tools CRUD operations.
 * Interfaces with backend agent tools endpoints.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface AgentTool {
  toolId: string;
  name?: string;
  description?: string;
  workflowId?: string;
  createdAt: any;
  updatedAt: any;
}

// ============================================
// TOOL CRUD OPERATIONS
// ============================================

/**
 * List all tools for an agent
 */
export async function listAgentTools(
  token: string,
  agentId: string
): Promise<AgentTool[]> {
  const response = await fetch(`${API_URL}/api/agents/${agentId}/tools`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to list tools' }));
    throw new Error(error.message || 'Failed to list tools');
  }

  const result = await response.json();
  return result.data || [];
}

/**
 * Get a specific tool
 */
export async function getAgentTool(
  token: string,
  agentId: string,
  toolId: string
): Promise<AgentTool> {
  const response = await fetch(`${API_URL}/api/agents/${agentId}/tools/${toolId}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to get tool' }));
    throw new Error(error.message || 'Failed to get tool');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Create a new tool
 */
export async function createAgentTool(
  token: string,
  agentId: string,
  data: {
    name?: string;
    description?: string;
    workflowId?: string;
  }
): Promise<{ toolId: string; tool: AgentTool }> {
  const response = await fetch(`${API_URL}/api/agents/${agentId}/tools`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to create tool' }));
    throw new Error(error.message || 'Failed to create tool');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Update a tool
 */
export async function updateAgentTool(
  token: string,
  agentId: string,
  toolId: string,
  data: {
    name?: string;
    description?: string;
    workflowId?: string;
  }
): Promise<void> {
  const response = await fetch(`${API_URL}/api/agents/${agentId}/tools/${toolId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to update tool' }));
    throw new Error(error.message || 'Failed to update tool');
  }
}

/**
 * Delete a tool
 */
export async function deleteAgentTool(
  token: string,
  agentId: string,
  toolId: string
): Promise<void> {
  const response = await fetch(`${API_URL}/api/agents/${agentId}/tools/${toolId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to delete tool' }));
    throw new Error(error.message || 'Failed to delete tool');
  }
}
