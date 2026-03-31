/**
 * Agent API Service
 *
 * Clean API layer for agent CRUD operations.
 * Interfaces with backend endpoints.
 */

import { Agent } from '../types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ============================================
// AGENT CRUD OPERATIONS
// ============================================

/**
 * Create a new agent
 */
export async function createAgent(
  token: string,
  name: string,
  selectedAvatar?: { color: string; entityImagePath: string; iconImagePath: string }
): Promise<{ agentId: string }> {
  const response = await fetch(`${API_URL}/api/agent-management/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ name, selectedAvatar }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to create agent' }));
    throw new Error(error.message || 'Failed to create agent');
  }

  const result = await response.json();
  return { agentId: result.data.agentId };
}

/**
 * Update agent name
 */
export async function updateAgentName(
  token: string,
  agentId: string,
  name: string
): Promise<void> {
  const response = await fetch(`${API_URL}/api/agent-management/${agentId}/manage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ action: 'updateName', name }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to update agent name' }));
    throw new Error(error.message || 'Failed to update agent name');
  }
}

/**
 * Update agent status
 */
export async function updateAgentStatus(
  token: string,
  agentId: string,
  status: 'draft' | 'active' | 'paused'
): Promise<void> {
  const response = await fetch(`${API_URL}/api/agent-management/${agentId}/manage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ action: 'updateStatus', status }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to update agent status' }));
    throw new Error(error.message || 'Failed to update agent status');
  }
}

/**
 * Delete an agent
 */
export async function deleteAgent(token: string, agentId: string): Promise<void> {
  const response = await fetch(`${API_URL}/api/agent-management/${agentId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to delete agent' }));
    throw new Error(error.message || 'Failed to delete agent');
  }
}

// ============================================
// AGENT CONFIGURATION OPERATIONS
// ============================================

/**
 * Update agent configuration (bulk update)
 */
export async function updateAgentConfig(
  token: string,
  agentId: string,
  elevenLabsAgentId: string,
  updates: Record<string, any>
): Promise<{ updatedFields: string[] }> {
  const response = await fetch(`${API_URL}/api/agent-management/${agentId}/config`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ elevenLabsAgentId, updates }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to update agent config' }));
    throw new Error(error.message || 'Failed to update agent config');
  }

  const result = await response.json();
  return { updatedFields: result.data?.updatedFields || [] };
}

/**
 * Refresh agent configuration from 11Labs
 */
export async function refreshAgentConfig(
  token: string,
  agentId: string,
  elevenLabsAgentId: string
): Promise<{ updatedFields: string[] }> {
  const response = await fetch(`${API_URL}/api/agent-management/${agentId}/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ elevenLabsAgentId }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to refresh agent config' }));
    throw new Error(error.message || 'Failed to refresh agent config');
  }

  const result = await response.json();
  return { updatedFields: result.data?.updatedFields || [] };
}

// ============================================
// SYSTEM PROMPT OPERATIONS
// ============================================

/**
 * Update system prompt
 */
export async function updateSystemPrompt(
  token: string,
  agentId: string,
  prompt: string
): Promise<void> {
  const response = await fetch(`${API_URL}/api/agent-management/${agentId}/prompt`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ prompt }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to update system prompt' }));
    throw new Error(error.message || 'Failed to update system prompt');
  }
}

// ============================================
// VOICE CONFIGURATION OPERATIONS
// ============================================

/**
 * Get available voices
 */
export async function getVoices(
  token: string,
  agentId: string
): Promise<any[]> {
  const response = await fetch(`${API_URL}/api/agent-management/${agentId}/voices`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to get voices' }));
    throw new Error(error.message || 'Failed to get voices');
  }

  const result = await response.json();
  return result.data?.voices || [];
}

/**
 * Update voice selection
 */
export async function updateVoice(
  token: string,
  agentId: string,
  voiceId: string
): Promise<void> {
  const response = await fetch(`${API_URL}/api/agent-management/${agentId}/voice-config`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ action: 'selectVoice', voiceId }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to update voice' }));
    throw new Error(error.message || 'Failed to update voice');
  }
}

// ============================================
// KNOWLEDGE BASE OPERATIONS
// ============================================

/**
 * Update knowledge base documents
 */
export async function updateKnowledgeBase(
  token: string,
  agentId: string,
  documents: any[]
): Promise<void> {
  const response = await fetch(`${API_URL}/api/agent-management/${agentId}/knowledge-base`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ documents }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to update knowledge base' }));
    throw new Error(error.message || 'Failed to update knowledge base');
  }
}

// ============================================
// CHANNEL OPERATIONS
// ============================================

/**
 * Update channel configuration
 */
export async function updateChannel(
  token: string,
  agentId: string,
  channel: 'voice' | 'sms' | 'email' | 'webhook',
  config: { enabled: boolean; [key: string]: any }
): Promise<void> {
  const response = await fetch(`${API_URL}/api/agent-management/${agentId}/manage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ action: 'updateChannel', channel, config }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to update channel' }));
    throw new Error(error.message || 'Failed to update channel');
  }
}
