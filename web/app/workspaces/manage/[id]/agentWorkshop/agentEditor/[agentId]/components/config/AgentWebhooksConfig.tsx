/**
 * AgentWebhooksConfig
 *
 * Complete webhook management with dynamic URLs and destination webhooks.
 */

'use client';

import { useState } from 'react';
import { Plus, Zap, Globe, RefreshCw, Webhook as WebhookIcon } from 'lucide-react';
import { Agent } from '../../types';
import { useWebhookManagement } from '../../services/useWebhookManagement';
import { useAuth } from '@/contexts/AuthContext';
import WebhookCard from './webhooks/WebhookCard';
import WebhookCreationWizard from './webhooks/WebhookCreationWizard';
import WebhookDetailsModal from './webhooks/WebhookDetailsModal';
import DestinationWebhookModal from './webhooks/DestinationWebhookModal';
import DestinationWebhookDetailModal from './webhooks/DestinationWebhookDetailModal';

interface AgentWebhooksConfigProps {
  agent: Agent;
  onUpdate: (updates: Partial<Agent>) => void;
}

export default function AgentWebhooksConfig({ agent, onUpdate }: AgentWebhooksConfigProps) {
  const { tenant } = useAuth();

  const {
    webhooks,
    destinationWebhooks,
    actions,
    isLoading,
    isRefreshing,
    error,
    createWebhook,
    deleteWebhook,
    createDestinationWebhook,
    deleteDestinationWebhook,
    generateWebhookUrl,
    getExamplePayload,
    refreshWebhooks,
    getActionName,
  } = useWebhookManagement(agent.id!, tenant?.id || '');

  // Modal states
  const [isCreationWizardOpen, setIsCreationWizardOpen] = useState(false);
  const [isDestinationModalOpen, setIsDestinationModalOpen] = useState(false);
  const [selectedWebhook, setSelectedWebhook] = useState<any>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedDestination, setSelectedDestination] = useState<any>(null);
  const [isDestinationDetailOpen, setIsDestinationDetailOpen] = useState(false);

  // Transform destination webhooks to match display format
  const transformedDestinationWebhooks = destinationWebhooks.map((dw) => ({
    ...dw,
    webhookId: dw.destinationKey,
    webhookUrl: dw.destinationUrl,
    encodedData: '',
    channel: dw.category as 'sms' | 'email' | 'phone',
    method: 'destination' as 'inbound' | 'outbound',
    isDestination: true,
    createdAt: new Date(dw.createdAt),
    metadata: undefined,
  }));

  // Combine and sort all webhooks
  const allWebhooks = [...webhooks, ...transformedDestinationWebhooks].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const recentWebhooks = allWebhooks.slice(0, 5);

  const handleWebhookClick = (webhook: any) => {
    if (webhook.isDestination) {
      const destination = destinationWebhooks.find((d) => d.destinationKey === webhook.destinationKey);
      setSelectedDestination(destination || null);
      setIsDestinationDetailOpen(true);
    } else {
      setSelectedWebhook(webhook);
      setIsDetailsModalOpen(true);
    }
  };

  const handleCopyUrl = (webhook: any) => {
    const url = generateWebhookUrl(webhook);
    navigator.clipboard.writeText(url);
  };

  const handleDeleteWebhook = async (webhook: any) => {
    if (confirm(`Are you sure you want to delete this ${webhook.isDestination ? 'destination' : 'webhook'}?`)) {
      try {
        if (webhook.isDestination) {
          await deleteDestinationWebhook(webhook.destinationKey);
        } else {
          await deleteWebhook(webhook.webhookId);
        }
      } catch (error) {
        console.error('Failed to delete:', error);
      }
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Webhook Integration</h2>
        <p className="text-sm text-slate-500 mt-1">
          Configure webhooks and generate dynamic URLs for external platforms
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-900">{error}</p>
        </div>
      )}

      {/* Creation Actions */}
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
              onClick={() => setIsCreationWizardOpen(true)}
              className="px-3 py-1.5 bg-orange-600 text-white text-xs font-medium rounded hover:bg-orange-700 transition-colors flex items-center gap-1"
            >
              <Plus className="h-3 w-3" />
              Generate
            </button>
          </div>
        </div>

        {/* SMS Destinations */}
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
              onClick={() => setIsDestinationModalOpen(true)}
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
          <h4 className="text-sm font-medium text-slate-900">
            Recent Webhooks ({allWebhooks.length})
          </h4>
          <button
            onClick={refreshWebhooks}
            disabled={isRefreshing}
            className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded transition-colors"
            title="Refresh webhooks"
          >
            <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600"></div>
          </div>
        ) : recentWebhooks.length === 0 ? (
          <div className="text-center py-8 bg-slate-50 rounded-lg border border-slate-200">
            <WebhookIcon className="h-6 w-6 text-slate-300 mx-auto mb-2" />
            <p className="text-xs text-slate-600 mb-1">No webhooks created yet</p>
            <p className="text-xs text-slate-500">
              Click "Generate" above to create your first webhook
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentWebhooks.map((webhook, index) => (
              <WebhookCard
                key={webhook.webhookId || `webhook-${index}`}
                webhook={webhook}
                actionName={
                  webhook.metadata?.actionId
                    ? getActionName(webhook.metadata.actionId)
                    : null
                }
                onView={() => handleWebhookClick(webhook)}
                onCopy={'isDestination' in webhook && webhook.isDestination ? undefined : () => handleCopyUrl(webhook)}
                onDelete={() => handleDeleteWebhook(webhook)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <WebhookCreationWizard
        isOpen={isCreationWizardOpen}
        onClose={() => setIsCreationWizardOpen(false)}
        onCreateWebhook={createWebhook}
        getExamplePayload={getExamplePayload}
        actions={actions}
      />

      <WebhookDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setSelectedWebhook(null);
        }}
        webhook={selectedWebhook}
        webhookUrl={selectedWebhook ? generateWebhookUrl(selectedWebhook) : ''}
        examplePayload={selectedWebhook ? getExamplePayload(selectedWebhook) : {}}
      />

      <DestinationWebhookModal
        isOpen={isDestinationModalOpen}
        onClose={() => setIsDestinationModalOpen(false)}
        onCreateDestination={createDestinationWebhook}
      />

      <DestinationWebhookDetailModal
        isOpen={isDestinationDetailOpen}
        onClose={() => {
          setIsDestinationDetailOpen(false);
          setSelectedDestination(null);
        }}
        destination={selectedDestination}
      />
    </div>
  );
}
