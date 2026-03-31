'use client';

import { useState, useEffect } from 'react';
import { Webhook, Settings, Copy, Eye, EyeOff, Link as LinkIcon, Zap, ExternalLink, Info, Plus, MessageSquare, Mail, Phone, RefreshCw, X, Check, Trash2, Globe, ArrowRight } from 'lucide-react';
import { ConfigurationSectionProps } from '../../types';
import WebhookConfigurationModal from '../channels/WebhookConfigurationModal';
import DestinationWebhookModal from './DestinationWebhookModal';
import DestinationWebhookDetailModal from './DestinationWebhookDetailModal';
import WebhookDetailModal from './WebhookDetailModal';
import { useAuth } from '@/contexts/AuthContext';
import { webhookService, WebhookData } from '@/lib/services/webhookService';

export default function WebhooksSection({ agentId, config, onUpdate }: ConfigurationSectionProps) {
  const { user, tenant, getToken } = useAuth();
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);
  const [isWebhookConfigurationOpen, setIsWebhookConfigurationOpen] = useState(false);
  const [isDestinationWebhookOpen, setIsDestinationWebhookOpen] = useState(false);
  const [webhooks, setWebhooks] = useState<WebhookData[]>([]);
  const [destinationWebhooks, setDestinationWebhooks] = useState<any[]>([]);
  const [isLoadingWebhooks, setIsLoadingWebhooks] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedWebhook, setSelectedWebhook] = useState<WebhookData | null>(null);
  const [isWebhookDetailsOpen, setIsWebhookDetailsOpen] = useState(false);
  const [isViewAllOpen, setIsViewAllOpen] = useState(false);
  const [recentLimit] = useState(3); // Show up to 3 most recent webhooks
  const [actions, setActions] = useState<Record<string, { name: string; description: string; type: string }>>({});
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [webhookToDelete, setWebhookToDelete] = useState<WebhookData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDestinationDetailOpen, setIsDestinationDetailOpen] = useState(false);
  const [selectedDestinationKey, setSelectedDestinationKey] = useState<string>('');

  // Helper function to get the correct webhook URL with production base URL
  const getCorrectWebhookUrl = (webhook: WebhookData) => {
    const productionBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    // The encoded data can be in webhookUrl, encodedData, or metadata.encodedPayload
    const encodedData = webhook.encodedData || webhook.webhookUrl || webhook.metadata?.encodedPayload;
    return `${productionBaseUrl}/api/universal-message/${encodedData}`;
  };

  // Fetch actions for this agent
  const fetchActions = async () => {
    if (!tenant?.id || !agentId) return;

    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication token not available');
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/agent-training/actions/agent/${agentId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();
      
      if (!response.ok || !result.success) {
        console.error('Failed to fetch actions:', result.error);
        return;
      }

      // Create a lookup map of actionId -> action details
      const actionsMap: Record<string, { name: string; description: string; type: string }> = {};
      result.data.actions.forEach((action: any) => {
        actionsMap[action.actionId] = {
          name: action.name,
          description: action.description || 'No description',
          type: action.type
        };
      });

      setActions(actionsMap);
    } catch (error) {
      console.error('Error fetching actions:', error);
    }
  };

  // Fetch webhooks for this agent
  const fetchWebhooks = async () => {
    if (!tenant?.id || !agentId) return;

    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication token not available');
      }

      const fetchedWebhooks = await webhookService.getAgentWebhooks(tenant.id, agentId, token);
      setWebhooks(fetchedWebhooks);
    } catch (error) {
      console.error('Error fetching webhooks:', error);
    } finally {
      setIsLoadingWebhooks(false);
      setIsRefreshing(false);
    }
  };

  // Fetch destination webhooks for this agent
  const fetchDestinationWebhooks = async () => {
    if (!tenant?.id || !agentId) return;

    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication token not available');
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/destination-webhooks/destinations/${tenant.id}/${agentId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch destination webhooks: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        setDestinationWebhooks(result.data.webhooks || []);
      } else {
        throw new Error(result.message || 'Failed to fetch destination webhooks');
      }
    } catch (error) {
      console.error('Error fetching destination webhooks:', error);
      setDestinationWebhooks([]);
    }
  };

  // Load webhooks and actions on component mount
  useEffect(() => {
    fetchWebhooks();
    fetchDestinationWebhooks();
    fetchActions();
  }, [tenant?.id, agentId]);

  // Refresh webhooks and actions
  const handleRefreshWebhooks = async () => {
    setIsRefreshing(true);
    await Promise.all([fetchWebhooks(), fetchDestinationWebhooks(), fetchActions()]);
  };

  const handleChannelsUpdate = (channelsUpdates: any) => {
    onUpdate({
      channels: {
        ...config.channels,
        ...channelsUpdates
      }
    });
  };

  const toggleWebhook = async (enabled: boolean) => {
    // Update local state first for immediate UI feedback
    handleChannelsUpdate({
      webhook: {
        ...config.channels?.webhook,
        enabled
      }
    });

    // Make API call to update the agent document
    try {
      if (!user) {
        throw new Error('User not authenticated');
      }

      const token = await getToken();
      if (!token) {
        throw new Error('Failed to get authentication token');
      }
      
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      
      const response = await fetch(`${apiUrl}/api/agents/${agentId}/manage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'updateEnabledChannels',
          channelType: 'webhook',
          enabled
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update webhook setting');
      }

      console.log(`Successfully updated webhook: ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Error updating webhook:', error);
      
      // Revert the local state change on error
      handleChannelsUpdate({
        webhook: {
          ...config.channels?.webhook,
          enabled: !enabled
        }
      });
      
      alert(`Failed to update webhook: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const updateWebhookConfig = (updates: any) => {
    handleChannelsUpdate({
      webhook: {
        ...config.channels?.webhook,
        ...updates
      }
    });
  };

  const generateWebhookSecret = () => {
    const secret = Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, '0')).join('');
    updateWebhookConfig({ secret });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleWebhookClick = (webhook: any) => {
    if (webhook.isDestination) {
      // Handle destination webhook click - open the destination detail modal
      console.log('Clicked destination webhook:', webhook);
      setSelectedDestinationKey(webhook.destinationKey);
      setIsDestinationDetailOpen(true);
    } else {
      // Handle regular webhook click
      setSelectedWebhook(webhook);
      setIsWebhookDetailsOpen(true);
    }
  };

  const handleCloseWebhookDetails = () => {
    setIsWebhookDetailsOpen(false);
    setSelectedWebhook(null);
  };

  const handleCloseDestinationDetails = () => {
    setIsDestinationDetailOpen(false);
    setSelectedDestinationKey('');
  };

  const handleDestinationWebhookSave = () => {
    // Refresh destination webhooks after save
    fetchDestinationWebhooks();
    handleCloseDestinationDetails();
    setSelectedWebhook(null);
  };

  const handleViewAll = () => {
    setIsViewAllOpen(true);
  };

  const handleCloseViewAll = () => {
    setIsViewAllOpen(false);
  };

  // Get recent webhooks (sorted by creation date, most recent first)
  // Transform destination webhooks to match the display format
  const transformedDestinationWebhooks = destinationWebhooks.map(dw => ({
    ...dw,
    webhookId: dw.destinationKey,
    channel: dw.category,
    method: 'destination',
    isDestination: true,
    name: dw.name,
    description: dw.description,
    createdAt: dw.createdAt,
    isActive: dw.isActive
  }));

  // Combine both types of webhooks and sort by creation date
  const allWebhooks = [...webhooks, ...transformedDestinationWebhooks]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const recentWebhooks = allWebhooks.slice(0, recentLimit);
  const hasMoreWebhooks = allWebhooks.length > recentLimit;

  const getWebhookExamplePayload = (webhook: WebhookData) => {
    if (webhook.method === 'inbound') {
      if (webhook.channel === 'sms') {
        return {
          // Required fields for SMS inbound
          messageContent: "Hi, I'm interested in your services",
          tenantId: tenant?.id || "your-tenant-id",
          contactId: "contact_abc123",
          agentId: agentId,
          action: "general",
          from: "+1234567890",                    // Phone number
          to: "+1987654321",                      // Agent's phone number
          
          // Optional fields
          conversationId: "conv_xyz789",
          timestamp: new Date().toISOString(),
          messageId: "msg_unique123",
          
          // Optional: Contact creation fields (auto-creates contact if contactId not found)
          full_name: "John Smith",
          first_name: "John", 
          last_name: "Smith",
          email: "john.smith@example.com"
        };
      } else if (webhook.channel === 'email') {
        return {
          // Required fields for Email inbound  
          messageContent: "Hi, I'd like more information about your products.",
          tenantId: tenant?.id || "your-tenant-id",
          contactId: "contact_abc123", 
          agentId: agentId,
          action: "general",
          from: "customer@example.com",           // Email address
          to: "agent@company.com",                // Agent's email
          
          // Optional fields
          conversationId: "conv_xyz789",
          timestamp: new Date().toISOString(),
          messageId: "email_unique123",
          
          // Optional: Contact creation fields (auto-creates contact if contactId not found)
          full_name: "Jane Doe",
          first_name: "Jane",
          last_name: "Doe", 
          phone: "+1234567890"
        };
      } else if (webhook.channel === 'phone') {
        return {
          // Required fields for Phone inbound
          tenantId: tenant?.id || "your-tenant-id",
          contactId: "contact_abc123",
          agentId: agentId,
          action: "general", 
          from: "+1234567890",                    // Phone number
          to: "+1987654321",                      // Agent's phone number
          
          // Optional fields
          conversationId: "conv_xyz789",
          timestamp: new Date().toISOString(),
          callId: "call_unique123",
          
          // Optional: Contact creation fields (auto-creates contact if contactId not found)
          full_name: "Alex Johnson",
          first_name: "Alex",
          last_name: "Johnson",
          email: "alex.johnson@example.com"
        };
      }
    } else {
      // Outbound use case
      if (webhook.channel === 'sms') {
        return {
          // Required fields for SMS outbound
          tenantId: tenant?.id || "your-tenant-id",
          agentId: agentId,
          contactId: "contact_abc123",              // Target contact ID
          action: "general",                        // Action to trigger
          
          // Optional fields
          targetPhoneNumber: "+1234567890",         // Alternative if no contactId
          messageContent: "Custom message content", // Optional custom message
          conversationId: "conv_xyz789",
          actionId: "action_specific123",           // Specific action ID for context
          
          // Optional: Contact creation fields (auto-creates contact if contactId/phone not found)
          full_name: "Sarah Wilson",
          first_name: "Sarah",
          last_name: "Wilson", 
          email: "sarah.wilson@example.com"
        };
      } else if (webhook.channel === 'email') {
        return {
          // Required fields for Email outbound
          tenantId: tenant?.id || "your-tenant-id",
          agentId: agentId,
          contactId: "contact_abc123",              // Target contact ID
          action: "general",                        // Action to trigger
          
          // Optional fields
          targetEmailAddress: "customer@example.com", // Alternative if no contactId
          messageContent: "Custom email content",     // Optional custom message
          conversationId: "conv_xyz789",
          actionId: "action_specific123",             // Specific action ID for context
          
          // Optional: Contact creation fields (auto-creates contact if contactId/email not found)
          full_name: "Mike Davis",
          first_name: "Mike",
          last_name: "Davis",
          phone: "+1234567890"
        };
      } else if (webhook.channel === 'phone') {
        return {
          // Required fields for Phone outbound
          tenantId: tenant?.id || "your-tenant-id",
          agentId: agentId,
          contactId: "contact_abc123",              // Target contact ID
          action: "general",                        // Action to trigger
          
          // Optional fields
          targetPhoneNumber: "+1234567890",         // Alternative if no contactId
          conversationId: "conv_xyz789",
          actionId: "action_specific123",           // Specific action ID for context
          
          // Optional: Contact creation fields (auto-creates contact if contactId/phone not found)
          full_name: "Lisa Brown",
          first_name: "Lisa",
          last_name: "Brown",
          email: "lisa.brown@example.com"
        };
      }
    }
    return {};
  };

  // Helper function to get channel icon and color
  const getChannelInfo = (channel: string) => {
    switch (channel) {
      case 'sms':
        return {
          icon: MessageSquare,
          color: 'text-green-600',
          bgColor: 'bg-green-50'
        };
      case 'email':
        return {
          icon: Mail,
          color: 'text-purple-600',
          bgColor: 'bg-purple-50'
        };
      case 'phone':
        return {
          icon: Phone,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50'
        };
      default:
        return {
          icon: Webhook,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50'
        };
    }
  };

  // Helper function to get method badge color
  const getMethodColor = (method: string) => {
    switch (method) {
      case 'inbound':
        return 'bg-green-100 text-green-700';
      case 'outbound':
        return 'bg-blue-100 text-blue-700';
      case 'destination':
        return 'bg-purple-100 text-purple-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  // Helper function to get action name for a webhook
  const getActionName = (webhook: WebhookData) => {
    const actionId = webhook.metadata?.actionId;
    if (!actionId) return null;
    
    const action = actions[actionId];
    return action ? `${action.name} (${action.type})` : actionId;
  };

  // Handle webhook deletion
  const handleDeleteWebhook = (webhook: WebhookData) => {
    setWebhookToDelete(webhook);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteWebhook = async () => {
    if (!webhookToDelete || !tenant?.id) return;

    setIsDeleting(true);
    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication token not available');
      }

      await webhookService.deleteWebhook(tenant.id, agentId, webhookToDelete.webhookId, token);
      
      // Refresh webhooks list
      await fetchWebhooks();
      
      // Close modal
      setIsDeleteModalOpen(false);
      setWebhookToDelete(null);
    } catch (error) {
      console.error('Error deleting webhook:', error);
      alert(`Failed to delete webhook: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const cancelDeleteWebhook = () => {
    setIsDeleteModalOpen(false);
    setWebhookToDelete(null);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h3 className="text-lg font-medium text-gray-900">Webhook Integration</h3>
        <p className="text-gray-600 mt-1 text-sm">
          Configure webhooks and generate dynamic URLs for external platforms.
        </p>
      </div>

      {/* Webhook Creation Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Dynamic Webhook URLs */}
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-orange-100 rounded">
                <Zap className="h-4 w-4 text-orange-600" />
              </div>
              <div>
                <h4 className="text-sm font-medium text-orange-900">Dynamic URLs</h4>
                <p className="text-xs text-orange-700">n8n, GoHighLevel, automation</p>
              </div>
            </div>
            <button
              onClick={() => setIsWebhookConfigurationOpen(true)}
              className="px-3 py-1.5 bg-orange-600 text-white text-xs font-medium rounded hover:bg-orange-700 transition-colors flex items-center gap-1"
            >
              <Plus className="h-3 w-3" />
              Generate
            </button>
          </div>
        </div>

        {/* SMS Generation Destinations */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-100 rounded">
                <Globe className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <h4 className="text-sm font-medium text-blue-900">SMS Destinations</h4>
                <p className="text-xs text-blue-700">External endpoint redirects</p>
              </div>
            </div>
            <button
              onClick={() => setIsDestinationWebhookOpen(true)}
              className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors flex items-center gap-1"
            >
              <Plus className="h-3 w-3" />
              Configure
            </button>
          </div>
        </div>
      </div>

      {/* Recent Webhooks */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-900">Recent Webhooks</h4>
          <div className="flex items-center gap-2">
            {hasMoreWebhooks && (
              <button
                onClick={handleViewAll}
                className="text-xs text-orange-600 hover:text-orange-700 font-medium transition-colors"
              >
                View All ({allWebhooks.length})
              </button>
            )}
            <span className="text-xs text-gray-500">
              {isLoadingWebhooks ? 'Loading...' : `${allWebhooks.filter(w => w.isActive).length} active`}
            </span>
            <button
              onClick={handleRefreshWebhooks}
              disabled={isRefreshing}
              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded transition-colors"
              title="Refresh webhooks"
            >
              <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
        
        {isLoadingWebhooks ? (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600"></div>
          </div>
        ) : recentWebhooks.length === 0 ? (
          <div className="text-center py-4 bg-gray-50 rounded border border-gray-200">
            <Webhook className="h-6 w-6 text-gray-400 mx-auto mb-1" />
            <p className="text-xs text-gray-600 mb-1">No webhooks created yet</p>
            <p className="text-xs text-gray-500">Click "Generate" above to create your first webhook</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentWebhooks.map((webhook, index) => {
              const channelInfo = getChannelInfo(webhook.channel);
              const Icon = channelInfo.icon;
              
              return (
                <div 
                  key={webhook.webhookId || webhook.encodedData || `webhook-${index}`} 
                  className={`bg-white rounded border cursor-pointer transition-all p-3 ${
                    webhook.isDestination 
                      ? 'border-purple-200 hover:border-purple-300 hover:shadow-sm bg-gradient-to-r from-purple-50/50 to-white'
                      : 'border-gray-200 hover:border-orange-300 hover:shadow-sm'
                  }`}
                  onClick={() => handleWebhookClick(webhook)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className={`p-1 ${channelInfo.bgColor} rounded`}>
                        <Icon className={`h-3 w-3 ${channelInfo.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-xs font-medium text-gray-900 truncate">
                            {webhook.name || `${webhook.channel.toUpperCase()} ${webhook.method}`}
                          </span>
                          <span className={`px-1.5 py-0.5 text-xs rounded-full ${getMethodColor(webhook.method)}`}>
                            {webhook.isDestination ? 'Dest' : webhook.method.charAt(0).toUpperCase() + webhook.method.slice(1)}
                          </span>
                          {webhook.isDestination && (
                            <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full flex items-center gap-0.5">
                              <Globe className="h-2.5 w-2.5" />
                            </span>
                          )}
                          {!webhook.isActive && (
                            <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                              Inactive
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span className="truncate">
                            {webhook.description || `${webhook.channel} ${webhook.method}`}
                          </span>
                          <span>•</span>
                          <span className="whitespace-nowrap">
                            {new Date(webhook.createdAt).toLocaleDateString()}
                          </span>
                          {getActionName(webhook) && (
                            <>
                              <span>•</span>
                              <span className="text-orange-600 font-medium whitespace-nowrap">
                                {getActionName(webhook)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      {!webhook.isDestination && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(getCorrectWebhookUrl(webhook));
                          }}
                          className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded transition-colors"
                          title="Copy webhook URL"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteWebhook(webhook);
                        }}
                        className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title={`Delete ${webhook.isDestination ? 'destination webhook' : 'webhook'}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                      <div className="p-1 text-gray-400" title="Click to view details">
                        <Eye className="h-3 w-3" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>


      {/* Webhook Configuration Modal */}
      <WebhookConfigurationModal
        isOpen={isWebhookConfigurationOpen}
        onClose={() => {
          setIsWebhookConfigurationOpen(false);
          // Refresh webhooks when modal closes in case new webhooks were created
          fetchWebhooks();
        }}
        agentId={agentId}
      />

      {/* Destination Webhook Modal */}
      <DestinationWebhookModal
        isOpen={isDestinationWebhookOpen}
        onClose={() => {
          setIsDestinationWebhookOpen(false);
          // Refresh destination webhooks after creation
          fetchDestinationWebhooks();
        }}
        agentId={agentId}
      />

      {/* Destination Webhook Detail Modal */}
      <DestinationWebhookDetailModal
        isOpen={isDestinationDetailOpen}
        onClose={handleCloseDestinationDetails}
        destinationKey={selectedDestinationKey}
        agentId={agentId}
        onSave={handleDestinationWebhookSave}
      />

      {/* View All Webhooks Modal */}
      {isViewAllOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-50 rounded-lg">
                  <Webhook className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">All Webhooks</h3>
                  <p className="text-sm text-gray-500">{allWebhooks.length} webhook{allWebhooks.length !== 1 ? 's' : ''} configured</p>
                </div>
              </div>
              <button
                onClick={handleCloseViewAll}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* Webhooks List */}
            <div className="p-6">
              {allWebhooks.length === 0 ? (
                <div className="text-center py-8">
                  <Webhook className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">No webhooks created yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {allWebhooks.map((webhook, index) => {
                      const channelInfo = getChannelInfo(webhook.channel);
                      const Icon = channelInfo.icon;
                      
                      return (
                        <div 
                          key={webhook.webhookId || webhook.encodedData || `webhook-${index}`}
                          className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                            webhook.isDestination
                              ? 'border-2 border-purple-200 hover:border-purple-300 hover:bg-purple-50/50 bg-gradient-to-r from-purple-50/50 to-white'
                              : 'hover:bg-gray-50 border border-transparent hover:border-gray-200'
                          }`}
                          onClick={() => {
                            handleWebhookClick(webhook);
                            setIsViewAllOpen(false);
                          }}
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <div className={`p-1.5 ${channelInfo.bgColor} rounded`}>
                              <Icon className={`h-3 w-3 ${channelInfo.color}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-900 truncate">
                                  {webhook.name || `${webhook.channel.toUpperCase()} ${webhook.method}`}
                                </span>
                                <span className={`px-1.5 py-0.5 text-xs rounded-full ${getMethodColor(webhook.method)}`}>
                                  {webhook.isDestination ? 'Destination' : webhook.method.charAt(0).toUpperCase() + webhook.method.slice(1)}
                                </span>
                                {webhook.isDestination && (
                                  <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full flex items-center gap-1">
                                    <Globe className="h-3 w-3" />
                                    Redirect
                                  </span>
                                )}
                                {!webhook.isActive && (
                                  <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                                    Inactive
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-4 mt-1">
                                <span className="text-xs text-gray-500 truncate">
                                  {webhook.description || `Process ${webhook.channel} ${webhook.method} messages`}
                                </span>
                                {getActionName(webhook) && (
                                  <span className="text-xs text-orange-600 font-medium whitespace-nowrap">
                                    Action: {getActionName(webhook)}
                                  </span>
                                )}
                                <span className="text-xs text-gray-400 whitespace-nowrap">
                                  {new Date(webhook.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-3">
                            {!webhook.isDestination && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyToClipboard(getCorrectWebhookUrl(webhook));
                                }}
                                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                                title="Copy webhook URL"
                              >
                                <Copy className="h-3 w-3" />
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteWebhook(webhook);
                              }}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              title={`Delete ${webhook.isDestination ? 'destination webhook' : 'webhook'}`}
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                            <div className="p-1.5 text-gray-400" title="Click to view details">
                              <Eye className="h-3 w-3" />
                            </div>
                          </div>
                        </div>
                      );
                    })
                  }
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center gap-3 p-6 border-t border-gray-200">
              <div className="text-xs text-gray-500">
                {webhooks.filter(w => w.isActive).length} active • {webhooks.length} total
              </div>
              <button
                onClick={handleCloseViewAll}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Webhook Details Modal */}
      <WebhookDetailModal
        isOpen={isWebhookDetailsOpen && selectedWebhook !== null}
        onClose={handleCloseWebhookDetails}
        webhook={selectedWebhook}
        agentId={agentId}
        onDelete={() => {
          if (selectedWebhook) {
            handleDeleteWebhook(selectedWebhook);
          }
        }}
      />


      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && webhookToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-50 rounded-lg">
                  <Trash2 className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Delete Webhook</h3>
                  <p className="text-sm text-gray-500">This action cannot be undone</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <p className="text-gray-700 mb-4">
                Are you sure you want to delete this webhook?
              </p>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`p-1 ${getChannelInfo(webhookToDelete.channel).bgColor} rounded`}>
                    {(() => {
                      const Icon = getChannelInfo(webhookToDelete.channel).icon;
                      return <Icon className={`h-3 w-3 ${getChannelInfo(webhookToDelete.channel).color}`} />;
                    })()}
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {webhookToDelete.name || `${webhookToDelete.channel.toUpperCase()} ${webhookToDelete.method} Webhook`}
                  </span>
                  <span className={`px-1.5 py-0.5 text-xs rounded-full ${getMethodColor(webhookToDelete.method)}`}>
                    {webhookToDelete.method.charAt(0).toUpperCase() + webhookToDelete.method.slice(1)}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mb-2">
                  {webhookToDelete.description || `Process ${webhookToDelete.channel} ${webhookToDelete.method} messages`}
                </p>
                <code className="text-xs text-gray-600 font-mono break-all block bg-white p-2 rounded border">
                  {getCorrectWebhookUrl(webhookToDelete)}
                </code>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end items-center gap-3 p-6 border-t border-gray-200">
              <button
                onClick={cancelDeleteWebhook}
                disabled={isDeleting}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteWebhook}
                disabled={isDeleting}
                className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Delete Webhook
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}