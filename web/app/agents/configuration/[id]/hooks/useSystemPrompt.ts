import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export interface SystemPromptData {
  systemPrompt: string;
  migrationStatus: {
    hasInternalPrompt: boolean;
    hasLegacyPrompt: boolean;
    promptLength: number;
    needsMigration: boolean;
  };
}

export interface UseSystemPromptReturn {
  systemPrompt: string;
  isLoading: boolean;
  error: string | null;
  migrationStatus: SystemPromptData['migrationStatus'] | null;
  updateSystemPrompt: (prompt: string) => Promise<void>;
  refreshSystemPrompt: () => Promise<void>;
}

export function useSystemPrompt(agentId: string): UseSystemPromptReturn {
  const { getToken } = useAuth();
  const [systemPrompt, setSystemPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [migrationStatus, setMigrationStatus] = useState<SystemPromptData['migrationStatus'] | null>(null);

  const fetchSystemPrompt = useCallback(async () => {
    if (!agentId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const token = await getToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      console.log('🔄 Fetching system prompt for agent:', agentId);
      
      const response = await fetch(`/api/agents/${agentId}/system-prompt`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to fetch system prompt`);
      }

      const data = await response.json();
      
      if (data.success && data.data) {
        const prompt = data.data.systemPrompt || '';
        setSystemPrompt(prompt);
        setMigrationStatus(data.data.migrationStatus || null);
        console.log('✅ System prompt loaded:', prompt.length, 'characters');
      } else {
        throw new Error(data.error || 'Failed to load system prompt data');
      }

    } catch (err) {
      console.error('❌ Error fetching system prompt:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch system prompt');
    } finally {
      setIsLoading(false);
    }
  }, [agentId, getToken]);

  const updateSystemPrompt = useCallback(async (prompt: string) => {
    if (!agentId) return;
    
    try {
      setError(null);
      
      const token = await getToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      console.log('💾 Updating system prompt for agent:', agentId, `(${prompt.length} characters)`);
      
      const response = await fetch(`/api/agents/${agentId}/system-prompt`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ prompt })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to update system prompt`);
      }

      const data = await response.json();
      
      if (data.success) {
        setSystemPrompt(prompt);
        console.log('✅ System prompt updated successfully');
      } else {
        throw new Error(data.error || 'Failed to update system prompt');
      }

    } catch (err) {
      console.error('❌ Error updating system prompt:', err);
      setError(err instanceof Error ? err.message : 'Failed to update system prompt');
      throw err; // Re-throw so calling component can handle it
    }
  }, [agentId, getToken]);

  const refreshSystemPrompt = useCallback(async () => {
    await fetchSystemPrompt();
  }, [fetchSystemPrompt]);

  useEffect(() => {
    fetchSystemPrompt();
  }, [fetchSystemPrompt]);

  return {
    systemPrompt,
    isLoading,
    error,
    migrationStatus,
    updateSystemPrompt,
    refreshSystemPrompt
  };
}