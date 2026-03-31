/**
 * WebhookCreationWizard
 *
 * Multi-step wizard for creating dynamic webhooks.
 */

'use client';

import { useState } from 'react';
import { X, MessageSquare, Mail, Phone, ArrowRight, Loader2, Check, Zap } from 'lucide-react';
import { WebhookData } from '@/lib/services/webhookService';
import WebhookExamplePayload from './WebhookExamplePayload';

interface WebhookCreationWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateWebhook: (config: {
    channel: 'sms' | 'email' | 'phone';
    method: 'inbound' | 'outbound';
    name?: string;
    description?: string;
    actionId?: string;
  }) => Promise<WebhookData>;
  getExamplePayload: (webhook: { channel: string; method: string }) => object;
  actions?: Record<string, { actionId: string; name: string; description: string; type: string }>;
}

const CHANNELS = [
  {
    id: 'sms' as const,
    name: 'SMS',
    icon: MessageSquare,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    description: 'Text message webhooks',
  },
  {
    id: 'email' as const,
    name: 'Email',
    icon: Mail,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    description: 'Email webhooks',
  },
  {
    id: 'phone' as const,
    name: 'Phone',
    icon: Phone,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    description: 'Voice call webhooks',
  },
];

const METHODS = [
  {
    id: 'inbound' as const,
    name: 'Inbound',
    description: 'Receive messages from external sources',
    color: 'bg-green-100 text-green-700 border-green-200',
  },
  {
    id: 'outbound' as const,
    name: 'Outbound',
    description: 'Trigger agent to send messages',
    color: 'bg-blue-100 text-blue-700 border-blue-200',
  },
];

export default function WebhookCreationWizard({
  isOpen,
  onClose,
  onCreateWebhook,
  getExamplePayload,
  actions = {},
}: WebhookCreationWizardProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [channel, setChannel] = useState<'sms' | 'email' | 'phone' | null>(null);
  const [method, setMethod] = useState<'inbound' | 'outbound' | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [actionId, setActionId] = useState<string>('');
  const [isCreating, setIsCreating] = useState(false);
  const [createdWebhook, setCreatedWebhook] = useState<WebhookData | null>(null);

  const resetWizard = () => {
    setStep(1);
    setChannel(null);
    setMethod(null);
    setName('');
    setDescription('');
    setActionId('');
    setCreatedWebhook(null);
  };

  const handleClose = () => {
    resetWizard();
    onClose();
  };

  const handleCreate = async () => {
    if (!channel || !method) return;

    setIsCreating(true);
    try {
      const webhook = await onCreateWebhook({
        channel,
        method,
        name: name.trim() || undefined,
        description: description.trim() || undefined,
        actionId: actionId.trim() || undefined,
      });
      setCreatedWebhook(webhook);
      setStep(3);
    } catch (error) {
      console.error('Failed to create webhook:', error);
      // Error handling could be improved with toast notifications
    } finally {
      setIsCreating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-50 rounded-lg">
              <Zap className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-slate-900">
                {step === 3 ? 'Webhook Created!' : 'Create Dynamic Webhook'}
              </h3>
              <p className="text-sm text-slate-500">
                {step === 1 && 'Select channel type'}
                {step === 2 && 'Configure webhook details'}
                {step === 3 && 'Your webhook is ready to use'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: Channel Selection */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-slate-700 mb-3">
                  Choose Channel Type
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  {CHANNELS.map((ch) => {
                    const Icon = ch.icon;
                    return (
                      <button
                        key={ch.id}
                        onClick={() => setChannel(ch.id)}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          channel === ch.id
                            ? `${ch.borderColor} ${ch.bgColor} ring-2 ring-offset-2`
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <Icon
                          className={`h-6 w-6 mx-auto mb-2 ${
                            channel === ch.id ? ch.color : 'text-slate-400'
                          }`}
                        />
                        <p className="text-sm font-medium text-slate-900">{ch.name}</p>
                        <p className="text-xs text-slate-500 mt-1">{ch.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {channel && (
                <div>
                  <h4 className="text-sm font-medium text-slate-700 mb-3">
                    Select Method
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    {METHODS.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setMethod(m.id)}
                        className={`p-4 rounded-lg border-2 text-left transition-all ${
                          method === m.id
                            ? 'border-slate-400 bg-slate-50 ring-2 ring-slate-300 ring-offset-2'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full border ${m.color}`}
                          >
                            {m.name}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600">{m.description}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Configuration */}
          {step === 2 && channel && method && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-xs text-slate-600">
                  Creating: <span className="font-medium">{channel.toUpperCase()}</span>{' '}
                  <span className="font-medium">{method}</span> webhook
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Name (Optional)
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Production SMS Inbound"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what this webhook does..."
                  rows={3}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 resize-none"
                />
              </div>

              {/* Action ID Selection */}
              {Object.keys(actions).length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Link to Action (Optional)
                  </label>
                  <p className="text-xs text-slate-500 mb-2">
                    Select a specific action to trigger, or leave blank for general handling
                  </p>
                  <select
                    value={actionId}
                    onChange={(e) => setActionId(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  >
                    <option value="">None (use default)</option>
                    {Object.values(actions).map((action) => (
                      <option key={action.actionId} value={action.actionId}>
                        {action.name} ({action.type})
                      </option>
                    ))}
                  </select>
                  {actionId && actions[actionId] && (
                    <p className="text-xs text-slate-600 mt-2 p-2 bg-slate-50 rounded border border-slate-200">
                      {actions[actionId].description}
                    </p>
                  )}
                </div>
              )}

              {/* Example Payload Preview */}
              <WebhookExamplePayload
                payload={getExamplePayload({ channel, method })}
                title="Expected Payload Format"
              />
            </div>
          )}

          {/* Step 3: Success */}
          {step === 3 && createdWebhook && (
            <div className="space-y-4">
              <div className="flex items-center justify-center py-6">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
                  <Check className="h-8 w-8 text-emerald-600" />
                </div>
              </div>

              <div className="text-center">
                <h4 className="text-lg font-medium text-slate-900 mb-1">
                  Webhook Created Successfully!
                </h4>
                <p className="text-sm text-slate-500">
                  Your webhook is ready to receive requests
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                    Webhook URL
                  </label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 text-xs bg-slate-900 text-slate-50 rounded-lg overflow-x-auto">
                      {createdWebhook.webhookUrl}
                    </code>
                    <button
                      onClick={() => copyToClipboard(createdWebhook.webhookUrl)}
                      className="px-3 py-2 text-xs bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                {createdWebhook.webhookPassword && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-xs font-medium text-yellow-900 mb-2">
                      ⚠️ Save these credentials - they won't be shown again
                    </p>
                    <div className="space-y-2">
                      <div>
                        <label className="block text-xs font-medium text-yellow-800 mb-1">
                          Password
                        </label>
                        <code className="block px-2 py-1 text-xs bg-white rounded border border-yellow-200">
                          {createdWebhook.webhookPassword}
                        </code>
                      </div>
                      {createdWebhook.basicAuthHeader && (
                        <div>
                          <label className="block text-xs font-medium text-yellow-800 mb-1">
                            Authorization Header
                          </label>
                          <code className="block px-2 py-1 text-xs bg-white rounded border border-yellow-200 truncate">
                            {createdWebhook.basicAuthHeader}
                          </code>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center gap-3 p-6 border-t border-slate-200">
          {step < 3 ? (
            <>
              <button
                onClick={step === 1 ? handleClose : () => setStep(1)}
                className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
              >
                {step === 1 ? 'Cancel' : 'Back'}
              </button>
              <button
                onClick={() => {
                  if (step === 1 && channel && method) {
                    setStep(2);
                  } else if (step === 2) {
                    handleCreate();
                  }
                }}
                disabled={
                  (step === 1 && (!channel || !method)) ||
                  (step === 2 && isCreating)
                }
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    {step === 1 ? 'Next' : 'Create Webhook'}
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </>
          ) : (
            <button
              onClick={handleClose}
              className="ml-auto px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
