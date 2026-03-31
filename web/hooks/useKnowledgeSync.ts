import { useState, useEffect, useCallback } from 'react';
import { syncAPI } from '@/lib/api/sync';

export interface KnowledgeChanges {
  businessInfoChanged: boolean;
  productsChanged: string[];
  faqsChanged: string[];
  brandGuidelinesChanged: boolean;
  affectedAgents: string[];
}

export interface SyncStatus {
  agents: Array<{
    id: string;
    name: string;
    status: 'synced' | 'pending' | 'failed';
    lastSyncAt?: string;
    lastSyncError?: string;
  }>;
  totalAgents: number;
  syncedAgents: number;
  pendingAgents: number;
  failedAgents: number;
}

export interface SyncResult {
  agentId: string;
  agentName: string;
  success: boolean;
  error?: string;
  syncedTypes: string[];
}

export function useKnowledgeSync() {
  const [changes, setChanges] = useState<KnowledgeChanges | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSync, setIsSyncing] = useState(false);

  // Check for knowledge changes
  const checkChanges = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const changesData = await syncAPI.getKnowledgeChanges();
      setChanges(changesData);
    } catch (err: any) {
      // Handle 429 rate limit errors gracefully
      if (err?.response?.status === 429) {
        console.warn('Rate limited when checking knowledge changes - retrying later');
        setError('Rate limited - please try again later');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to check changes');
        console.error('Failed to check knowledge changes:', err);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get sync status
  const getSyncStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const statusData = await syncAPI.getSyncStatus();
      setSyncStatus(statusData);
    } catch (err: any) {
      // Handle 429 rate limit errors gracefully
      if (err?.response?.status === 429) {
        console.warn('Rate limited when getting sync status - retrying later');
        setError('Rate limited - please try again later');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to get sync status');
        console.error('Failed to get sync status:', err);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Sync all agents with changes
  const syncAll = useCallback(async (): Promise<SyncResult[]> => {
    try {
      setIsSyncing(true);
      setError(null);
      const results = await syncAPI.syncKnowledge();
      
      // Refresh status after sync
      await Promise.all([checkChanges(), getSyncStatus()]);
      
      return results;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync all agents');
      console.error('Failed to sync all agents:', err);
      throw err;
    } finally {
      setIsSyncing(false);
    }
  }, [checkChanges, getSyncStatus]);

  // Sync specific agents
  const syncSelected = useCallback(async (agentIds: string[]): Promise<SyncResult[]> => {
    try {
      setIsSyncing(true);
      setError(null);
      const results = await syncAPI.syncKnowledge(agentIds);
      
      // Refresh status after sync
      await Promise.all([checkChanges(), getSyncStatus()]);
      
      return results;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync selected agents');
      console.error('Failed to sync selected agents:', err);
      throw err;
    } finally {
      setIsSyncing(false);
    }
  }, [checkChanges, getSyncStatus]);

  // Sync single agent
  const syncAgent = useCallback(async (agentId: string): Promise<SyncResult> => {
    try {
      setIsSyncing(true);
      setError(null);
      const result = await syncAPI.syncSingleAgentKnowledge(agentId);
      
      // Refresh status after sync
      await Promise.all([checkChanges(), getSyncStatus()]);
      
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync agent');
      console.error('Failed to sync agent:', err);
      throw err;
    } finally {
      setIsSyncing(false);
    }
  }, [checkChanges, getSyncStatus]);

  // Get affected agents by knowledge type
  const getAffectedAgents = useCallback(async (knowledgeType: string, itemIds?: string[]): Promise<string[]> => {
    try {
      const result = await syncAPI.getAffectedAgents(knowledgeType, itemIds || []);
      return result || [];
    } catch (err) {
      console.error('Failed to get affected agents:', err);
      return [];
    }
  }, []);

  // Load initial data with error handling
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        await Promise.all([checkChanges(), getSyncStatus()]);
      } catch (error) {
        // Silently handle errors on initial load to prevent console spam
        console.warn('Knowledge sync APIs not available:', error instanceof Error ? error.message : 'Unknown error');
      }
    };
    
    loadInitialData();
  }, [checkChanges, getSyncStatus]);

  // Computed properties
  const hasChanges = changes ? (
    changes.businessInfoChanged ||
    changes.productsChanged.length > 0 ||
    changes.faqsChanged.length > 0 ||
    changes.brandGuidelinesChanged
  ) : false;

  const changedTypes = changes ? [
    ...(changes.businessInfoChanged ? ['Business Information'] : []),
    ...(changes.productsChanged.length > 0 ? ['Products'] : []),
    ...(changes.faqsChanged.length > 0 ? ['FAQs'] : []),
    ...(changes.brandGuidelinesChanged ? ['Brand Guidelines'] : [])
  ] : [];

  const affectedAgentsCount = changes?.affectedAgents.length || 0;

  const pendingAgentsCount = syncStatus?.pendingAgents || 0;

  return {
    // Data
    changes,
    syncStatus,
    
    // Computed
    hasChanges,
    changedTypes,
    affectedAgentsCount,
    pendingAgentsCount,
    
    // State
    isLoading,
    isSyncing: isSync,
    error,
    
    // Actions
    checkChanges,
    getSyncStatus,
    syncAll,
    syncSelected,
    syncAgent,
    getAffectedAgents,
    
    // Refresh function
    refresh: useCallback(async () => {
      await Promise.all([checkChanges(), getSyncStatus()]);
    }, [checkChanges, getSyncStatus])
  };
}