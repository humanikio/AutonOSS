/**
 * useWebhookManagement Hook
 *
 * Manages webhooks, destination webhooks, and agent actions for the agent editor.
 */

import { useState, useEffect, useCallback } from 'react';
import { webhookService, WebhookData } from '@/lib/services/webhookService';
import { useAuth } from '@/contexts/AuthContext';

interface DestinationWebhook {
  destinationKey: string;
  name: string;
  description: string;
  category: string;
  destinationUrl: string;
  isActive: boolean;
  createdAt: string;
}

interface ActionInfo {
  actionId: string;
  name: string;
  description: string;
  type: string;
}

interface WebhookConfig {
  channel: 'sms' | 'email' | 'phone';
  method: 'inbound' | 'outbound';
  name?: string;
  description?: string;
  actionId?: string;
}

interface UseWebhookManagementReturn {
  // State
  webhooks: WebhookData[];
  destinationWebhooks: DestinationWebhook[];
  actions: Record<string, ActionInfo>;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;

  // Webhook CRUD
  createWebhook: (config: WebhookConfig) => Promise<WebhookData>;
  deleteWebhook: (webhookId: string) => Promise<void>;
  toggleWebhook: (webhookId: string, enabled: boolean) => Promise<void>;

  // Destination Webhooks
  createDestinationWebhook: (config: any) => Promise<void>;
  updateDestinationWebhook: (key: string, config: Partial<any>) => Promise<void>;
  deleteDestinationWebhook: (key: string) => Promise<void>;

  // Utilities
  generateWebhookUrl: (webhook: WebhookData) => string;
  getExamplePayload: (webhook: { channel: string; method: string }) => object;
  refreshWebhooks: () => Promise<void>;
  getActionName: (actionId: string) => string | null;
}

export function useWebhookManagement(
  agentId: string,
  tenantId: string
): UseWebhookManagementReturn {
  const { getToken } = useAuth();

  // State
  const [webhooks, setWebhooks] = useState<WebhookData[]>([]);
  const [destinationWebhooks, setDestinationWebhooks] = useState<DestinationWebhook[]>([]);
  const [actions, setActions] = useState<Record<string, ActionInfo>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch webhooks for this agent
   */
  const fetchWebhooks = useCallback(async () => {
    if (!tenantId || !agentId) return;

    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication token not available');
      }

      const fetchedWebhooks = await webhookService.getAgentWebhooks(tenantId, agentId, token);
      setWebhooks(fetchedWebhooks);
    } catch (err) {
      console.error('Error fetching webhooks:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch webhooks');
    }
  }, [tenantId, agentId, getToken]);

  /**
   * Fetch destination webhooks for this agent
   */
  const fetchDestinationWebhooks = useCallback(async () => {
    if (!tenantId || !agentId) return;

    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication token not available');
      }

      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(
        `${baseUrl}/api/destination-webhooks/destinations/${tenantId}/${agentId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch destination webhooks: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        setDestinationWebhooks(result.data.webhooks || []);
      } else {
        throw new Error(result.message || 'Failed to fetch destination webhooks');
      }
    } catch (err) {
      console.error('Error fetching destination webhooks:', err);
      setDestinationWebhooks([]);
    }
  }, [tenantId, agentId, getToken]);

  /**
   * Fetch actions for this agent
   */
  const fetchActions = useCallback(async () => {
    if (!tenantId || !agentId) return;

    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication token not available');
      }

      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(
        `${baseUrl}/api/agent-training/actions/agent/${agentId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        console.error('Failed to fetch actions:', result.error);
        return;
      }

      // Create a lookup map of actionId -> action details
      const actionsMap: Record<string, ActionInfo> = {};
      result.data.actions.forEach((action: any) => {
        actionsMap[action.actionId] = {
          actionId: action.actionId,
          name: action.name,
          description: action.description || 'No description',
          type: action.type,
        };
      });

      setActions(actionsMap);
    } catch (err) {
      console.error('Error fetching actions:', err);
    }
  }, [tenantId, agentId, getToken]);

  /**
   * Load all data on mount and when agentId/tenantId change
   */
  useEffect(() => {
    if (!tenantId || !agentId) return;

    const loadAllData = async () => {
      setIsLoading(true);
      await Promise.all([fetchWebhooks(), fetchDestinationWebhooks(), fetchActions()]);
      setIsLoading(false);
    };

    loadAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, agentId]);

  /**
   * Create webhook
   */
  const createWebhook = useCallback(
    async (config: WebhookConfig): Promise<WebhookData> => {
      try {
        const token = await getToken();
        if (!token) {
          throw new Error('Authentication token not available');
        }

        const response = await webhookService.createWebhook(
          config.channel,
          config.method,
          {
            agentId,
            tenantId,
            name: config.name,
            description: config.description,
            actionId: config.actionId,
          },
          token
        );

        // Refresh webhooks list
        await fetchWebhooks();

        return response.data as unknown as WebhookData;
      } catch (err) {
        console.error('Error creating webhook:', err);
        setError(err instanceof Error ? err.message : 'Failed to create webhook');
        throw err;
      }
    },
    [agentId, tenantId, getToken, fetchWebhooks]
  );

  /**
   * Delete webhook
   */
  const deleteWebhook = useCallback(
    async (webhookId: string) => {
      try {
        const token = await getToken();
        if (!token) {
          throw new Error('Authentication token not available');
        }

        await webhookService.deleteWebhook(tenantId, agentId, webhookId, token);

        // Refresh webhooks list
        await fetchWebhooks();
      } catch (err) {
        console.error('Error deleting webhook:', err);
        setError(err instanceof Error ? err.message : 'Failed to delete webhook');
        throw err;
      }
    },
    [tenantId, agentId, getToken, fetchWebhooks]
  );

  /**
   * Toggle webhook enabled state
   */
  const toggleWebhook = useCallback(
    async (webhookId: string, enabled: boolean) => {
      try {
        const token = await getToken();
        if (!token) {
          throw new Error('Authentication token not available');
        }

        if (!enabled) {
          await webhookService.deactivateWebhook(tenantId, agentId, webhookId, token);
        }

        // Refresh webhooks list
        await fetchWebhooks();
      } catch (err) {
        console.error('Error toggling webhook:', err);
        setError(err instanceof Error ? err.message : 'Failed to toggle webhook');
        throw err;
      }
    },
    [tenantId, agentId, getToken, fetchWebhooks]
  );

  /**
   * Create destination webhook
   */
  const createDestinationWebhook = useCallback(
    async (config: any) => {
      try {
        const token = await getToken();
        if (!token) {
          throw new Error('Authentication token not available');
        }

        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const response = await fetch(`${baseUrl}/api/destination-webhooks`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            ...config,
            tenantId,
            agentId,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to create destination webhook');
        }

        // Refresh destination webhooks list
        await fetchDestinationWebhooks();
      } catch (err) {
        console.error('Error creating destination webhook:', err);
        setError(err instanceof Error ? err.message : 'Failed to create destination webhook');
        throw err;
      }
    },
    [tenantId, agentId, getToken, fetchDestinationWebhooks]
  );

  /**
   * Update destination webhook
   */
  const updateDestinationWebhook = useCallback(
    async (key: string, config: Partial<any>) => {
      try {
        const token = await getToken();
        if (!token) {
          throw new Error('Authentication token not available');
        }

        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const response = await fetch(`${baseUrl}/api/destination-webhooks/${key}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(config),
        });

        if (!response.ok) {
          throw new Error('Failed to update destination webhook');
        }

        // Refresh destination webhooks list
        await fetchDestinationWebhooks();
      } catch (err) {
        console.error('Error updating destination webhook:', err);
        setError(err instanceof Error ? err.message : 'Failed to update destination webhook');
        throw err;
      }
    },
    [getToken, fetchDestinationWebhooks]
  );

  /**
   * Delete destination webhook
   */
  const deleteDestinationWebhook = useCallback(
    async (key: string) => {
      try {
        const token = await getToken();
        if (!token) {
          throw new Error('Authentication token not available');
        }

        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const response = await fetch(`${baseUrl}/api/destination-webhooks/${key}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to delete destination webhook');
        }

        // Refresh destination webhooks list
        await fetchDestinationWebhooks();
      } catch (err) {
        console.error('Error deleting destination webhook:', err);
        setError(err instanceof Error ? err.message : 'Failed to delete destination webhook');
        throw err;
      }
    },
    [getToken, fetchDestinationWebhooks]
  );

  /**
   * Generate webhook URL with production base
   */
  const generateWebhookUrl = useCallback((webhook: WebhookData): string => {
    const productionBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const encodedData = webhook.encodedData || webhook.webhookUrl || webhook.metadata?.encodedPayload;
    return `${productionBaseUrl}/api/universal-message/${encodedData}`;
  }, []);

  /**
   * Get example payload for webhook
   */
  const getExamplePayload = useCallback(
    (webhook: { channel: string; method: string }): object => {
      if (webhook.method === 'inbound') {
        if (webhook.channel === 'sms') {
          return {
            messageContent: "Hi, I'm interested in your services",
            tenantId: tenantId || 'your-tenant-id',
            contactId: 'contact_abc123',
            agentId: agentId,
            action: 'general',
            from: '+1234567890',
            to: '+1987654321',
            conversationId: 'conv_xyz789',
            timestamp: new Date().toISOString(),
            messageId: 'msg_unique123',
          };
        } else if (webhook.channel === 'email') {
          return {
            messageContent: "Hi, I'd like more information about your products.",
            tenantId: tenantId || 'your-tenant-id',
            contactId: 'contact_abc123',
            agentId: agentId,
            action: 'general',
            from: 'customer@example.com',
            to: 'agent@company.com',
            conversationId: 'conv_xyz789',
            timestamp: new Date().toISOString(),
            messageId: 'email_unique123',
          };
        } else if (webhook.channel === 'phone') {
          return {
            tenantId: tenantId || 'your-tenant-id',
            contactId: 'contact_abc123',
            agentId: agentId,
            action: 'general',
            from: '+1234567890',
            to: '+1987654321',
            conversationId: 'conv_xyz789',
            timestamp: new Date().toISOString(),
            callId: 'call_unique123',
          };
        }
      } else {
        // Outbound
        if (webhook.channel === 'sms') {
          return {
            tenantId: tenantId || 'your-tenant-id',
            agentId: agentId,
            contactId: 'contact_abc123',
            action: 'general',
            targetPhoneNumber: '+1234567890',
            messageContent: 'Custom message content',
            conversationId: 'conv_xyz789',
          };
        } else if (webhook.channel === 'email') {
          return {
            tenantId: tenantId || 'your-tenant-id',
            agentId: agentId,
            contactId: 'contact_abc123',
            action: 'general',
            targetEmailAddress: 'customer@example.com',
            messageContent: 'Custom email content',
            conversationId: 'conv_xyz789',
          };
        } else if (webhook.channel === 'phone') {
          return {
            tenantId: tenantId || 'your-tenant-id',
            agentId: agentId,
            contactId: 'contact_abc123',
            action: 'general',
            targetPhoneNumber: '+1234567890',
            conversationId: 'conv_xyz789',
          };
        }
      }
      return {};
    },
    [tenantId, agentId]
  );

  /**
   * Refresh all webhooks and related data
   */
  const refreshWebhooks = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([fetchWebhooks(), fetchDestinationWebhooks(), fetchActions()]);
    setIsRefreshing(false);
  }, [fetchWebhooks, fetchDestinationWebhooks, fetchActions]);

  /**
   * Get action name from action ID
   */
  const getActionName = useCallback(
    (actionId: string): string | null => {
      const action = actions[actionId];
      return action ? `${action.name} (${action.type})` : null;
    },
    [actions]
  );

  return {
    // State
    webhooks,
    destinationWebhooks,
    actions,
    isLoading,
    isRefreshing,
    error,

    // Webhook CRUD
    createWebhook,
    deleteWebhook,
    toggleWebhook,

    // Destination Webhooks
    createDestinationWebhook,
    updateDestinationWebhook,
    deleteDestinationWebhook,

    // Utilities
    generateWebhookUrl,
    getExamplePayload,
    refreshWebhooks,
    getActionName,
  };
}
