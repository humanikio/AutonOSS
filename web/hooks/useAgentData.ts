import { useState, useEffect } from 'react';
import { AgentService, FirestoreAgent } from '@/lib/services/agentService';

/**
 * Hook to get agent data for display in chat interface
 */
export function useAgentData(tenantId: string, agentId: string | null) {
  const [agent, setAgent] = useState<FirestoreAgent | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tenantId || !agentId) {
      setAgent(null);
      return;
    }

    const fetchAgent = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const agentData = await AgentService.getAgent(tenantId, agentId);
        setAgent(agentData);
      } catch (err) {
        console.error('Error fetching agent data:', err);
        setError('Failed to load agent data');
      } finally {
        setLoading(false);
      }
    };

    fetchAgent();
  }, [tenantId, agentId]);

  return { agent, loading, error };
}

/**
 * Hook to get multiple agents data for caching
 */
export function useAgentsData(tenantId: string, agentIds: string[]) {
  const [agents, setAgents] = useState<Record<string, FirestoreAgent>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tenantId || agentIds.length === 0) {
      setAgents({});
      return;
    }

    const fetchAgents = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const agentPromises = agentIds.map(async (agentId) => {
          const agentData = await AgentService.getAgent(tenantId, agentId);
          return { agentId, agentData };
        });

        const agentResults = await Promise.all(agentPromises);
        
        const agentsMap = agentResults.reduce((acc, { agentId, agentData }) => {
          if (agentData) {
            acc[agentId] = agentData;
          }
          return acc;
        }, {} as Record<string, FirestoreAgent>);
        
        setAgents(agentsMap);
      } catch (err) {
        console.error('Error fetching agents data:', err);
        setError('Failed to load agents data');
      } finally {
        setLoading(false);
      }
    };

    fetchAgents();
  }, [tenantId, agentIds.join(',')]);

  return { agents, loading, error };
}

/**
 * Hook to get all phone-capable agents for call initiation
 */
export function usePhoneCapableAgents(tenantId: string) {
  const [phoneAgents, setPhoneAgents] = useState<FirestoreAgent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tenantId) {
      setPhoneAgents([]);
      return;
    }

    const fetchPhoneAgents = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const agents = await AgentService.getPhoneCapableAgents(tenantId);
        setPhoneAgents(agents);
      } catch (err) {
        console.error('Error fetching phone-capable agents:', err);
        setError('Failed to load phone-capable agents');
      } finally {
        setLoading(false);
      }
    };

    fetchPhoneAgents();
  }, [tenantId]);

  return { phoneAgents, loading, error, refetch: () => {
    // Allow manual refetch
    if (tenantId) {
      AgentService.getPhoneCapableAgents(tenantId).then(setPhoneAgents).catch(console.error);
    }
  }};
}