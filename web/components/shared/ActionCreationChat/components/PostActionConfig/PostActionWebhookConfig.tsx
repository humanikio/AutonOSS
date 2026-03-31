'use client';

import { useState } from 'react';
import { PostActionConfiguration, PostActionWebhookPayload } from '../../types/postActionConfig';
import { 
  Webhook, 
  Settings, 
  Eye, 
  EyeOff, 
  Plus, 
  X, 
  Info, 
  AlertCircle,
  Send,
  Database,
  Clock,
  RefreshCw
} from 'lucide-react';

interface PostActionWebhookConfigProps {
  config: PostActionConfiguration;
  onConfigUpdate: (config: PostActionConfiguration) => void;
  isLoading?: boolean;
  className?: string;
}

export default function PostActionWebhookConfig({
  config,
  onConfigUpdate,
  isLoading = false,
  className = ''
}: PostActionWebhookConfigProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [customFieldKey, setCustomFieldKey] = useState('');
  const [customFieldValue, setCustomFieldValue] = useState('');

  const updateWebhookConfig = (updates: Partial<typeof config.webhook>) => {
    onConfigUpdate({
      ...config,
      webhook: { ...config.webhook, ...updates }
    });
  };

  const updatePayloadMapping = (updates: Partial<typeof config.payloadMapping>) => {
    onConfigUpdate({
      ...config,
      payloadMapping: { ...config.payloadMapping, ...updates }
    });
  };

  const updateResponseHandling = (updates: Partial<typeof config.responseHandling>) => {
    onConfigUpdate({
      ...config,
      responseHandling: { ...config.responseHandling, ...updates }
    });
  };

  const addCustomField = () => {
    if (!customFieldKey.trim()) return;
    
    const currentCustomFields = config.payloadMapping.customDataFields || {};
    updatePayloadMapping({
      customDataFields: {
        ...currentCustomFields,
        [customFieldKey]: customFieldValue
      }
    });
    
    setCustomFieldKey('');
    setCustomFieldValue('');
  };

  const removeCustomField = (key: string) => {
    const currentCustomFields = config.payloadMapping.customDataFields || {};
    const { [key]: _, ...remaining } = currentCustomFields;
    updatePayloadMapping({
      customDataFields: remaining
    });
  };

  // Generate example payload
  const examplePayload: PostActionWebhookPayload = {
    timestamp: new Date().toISOString(),
    ...(config.payloadMapping.includeSessionId && { sessionId: 'session_abc123' }),
    ...(config.payloadMapping.includeAgentId && { agentId: 'agent_xyz789' }),
    ...(config.payloadMapping.includeActionId && { actionId: 'action_def456' }),
    interaction: {
      ...(config.payloadMapping.includeUserInput && { userInput: 'Hello, I need help with...' }),
      ...(config.payloadMapping.includeAgentResponse && { agentResponse: 'I\'d be happy to assist you...' }),
      duration: 1250
    },
    ...(config.payloadMapping.includeCustomData && config.payloadMapping.customDataFields && {
      customData: config.payloadMapping.customDataFields
    })
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
          <Webhook className="h-5 w-5 text-orange-600" />
          Post-Action Configuration
        </h3>
        <p className="mt-1 text-sm text-gray-600">
          Configure what happens after the agent responds to this action
        </p>
      </div>

      {/* Enable/Disable Toggle */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Send className="h-5 w-5 text-gray-600" />
            <div>
              <h4 className="text-sm font-medium text-gray-900">Post Response Webhook</h4>
              <p className="text-xs text-gray-600">Send interaction data to an external endpoint</p>
            </div>
          </div>
          
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config.webhook.enabled}
              onChange={(e) => updateWebhookConfig({ enabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
          </label>
        </div>
      </div>

      {config.webhook.enabled && (
        <>
          {/* Webhook Configuration */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-900">Endpoint Configuration</h4>
            
            {/* URL & Method */}
            <div className="grid grid-cols-4 gap-4">
              <div className="col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Webhook URL
                </label>
                <input
                  type="url"
                  value={config.webhook.url}
                  onChange={(e) => updateWebhookConfig({ url: e.target.value })}
                  placeholder="https://your-api.com/webhook"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Method
                </label>
                <select
                  value={config.webhook.method}
                  onChange={(e) => updateWebhookConfig({ method: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="GET">GET</option>
                </select>
              </div>
            </div>

            {/* Authentication */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Authentication
              </label>
              <select
                value={config.webhook.authentication?.type || 'none'}
                onChange={(e) => updateWebhookConfig({ 
                  authentication: { 
                    ...config.webhook.authentication,
                    type: e.target.value as any 
                  } 
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="none">None</option>
                <option value="basic">Basic Auth</option>
                <option value="bearer">Bearer Token</option>
                <option value="api_key">API Key</option>
              </select>
            </div>

            {/* Auth Credentials */}
            {config.webhook.authentication?.type === 'basic' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    value={config.webhook.authentication.credentials?.username || ''}
                    onChange={(e) => updateWebhookConfig({
                      authentication: {
                        ...config.webhook.authentication!,
                        credentials: {
                          ...config.webhook.authentication!.credentials,
                          username: e.target.value
                        }
                      }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={config.webhook.authentication.credentials?.password || ''}
                      onChange={(e) => updateWebhookConfig({
                        authentication: {
                          ...config.webhook.authentication!,
                          credentials: {
                            ...config.webhook.authentication!.credentials,
                            password: e.target.value
                          }
                        }
                      })}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {config.webhook.authentication?.type === 'bearer' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bearer Token
                </label>
                <div className="relative">
                  <input
                    type={showToken ? 'text' : 'password'}
                    value={config.webhook.authentication.credentials?.token || ''}
                    onChange={(e) => updateWebhookConfig({
                      authentication: {
                        ...config.webhook.authentication!,
                        credentials: {
                          ...config.webhook.authentication!.credentials,
                          token: e.target.value
                        }
                      }
                    })}
                    placeholder="your-bearer-token"
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
                  >
                    {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Payload Configuration */}
          <div className="border-t border-gray-200 pt-6">
            <h4 className="text-sm font-medium text-gray-900 mb-4 flex items-center gap-2">
              <Database className="h-4 w-4" />
              Payload Data
            </h4>
            
            <div className="space-y-3">
              {[
                { key: 'includeAgentResponse', label: 'Agent Response', icon: '🤖' },
                { key: 'includeUserInput', label: 'User Input', icon: '👤' },
                { key: 'includeTimestamp', label: 'Timestamp', icon: '🕐' },
                { key: 'includeSessionId', label: 'Session ID', icon: '🔖' },
                { key: 'includeAgentId', label: 'Agent ID', icon: '🆔' },
                { key: 'includeActionId', label: 'Action ID', icon: '⚡' },
                { key: 'includeCustomData', label: 'Custom Data', icon: '📦' }
              ].map((field) => (
                <label key={field.key} className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={config.payloadMapping[field.key as keyof typeof config.payloadMapping] as boolean}
                    onChange={(e) => updatePayloadMapping({ [field.key]: e.target.checked })}
                    className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                  />
                  <span className="text-sm text-gray-700 flex items-center gap-2">
                    <span>{field.icon}</span>
                    {field.label}
                  </span>
                </label>
              ))}
            </div>

            {/* Custom Fields */}
            {config.payloadMapping.includeCustomData && (
              <div className="mt-4 space-y-3">
                <h5 className="text-xs font-medium text-gray-700 uppercase">Custom Fields</h5>
                
                {/* Existing custom fields */}
                {Object.entries(config.payloadMapping.customDataFields || {}).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-2 bg-gray-50 p-2 rounded">
                    <span className="text-sm font-mono text-gray-600">{key}:</span>
                    <span className="text-sm text-gray-800">{String(value)}</span>
                    <button
                      onClick={() => removeCustomField(key)}
                      className="ml-auto text-red-500 hover:text-red-700"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}

                {/* Add new custom field */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customFieldKey}
                    onChange={(e) => setCustomFieldKey(e.target.value)}
                    placeholder="Field name"
                    className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
                  />
                  <input
                    type="text"
                    value={customFieldValue}
                    onChange={(e) => setCustomFieldValue(e.target.value)}
                    placeholder="Value"
                    className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
                  />
                  <button
                    onClick={addCustomField}
                    disabled={!customFieldKey.trim()}
                    className="p-1 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Response Handling */}
          <div className="border-t border-gray-200 pt-6">
            <h4 className="text-sm font-medium text-gray-900 mb-4 flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Response & Retry Configuration
            </h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Timeout (ms)
                </label>
                <input
                  type="number"
                  value={config.responseHandling.timeoutMs}
                  onChange={(e) => updateResponseHandling({ timeoutMs: parseInt(e.target.value) || 5000 })}
                  min="1000"
                  max="30000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              
              <div className="flex items-end gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={config.responseHandling.retryOnFailure}
                    onChange={(e) => updateResponseHandling({ retryOnFailure: e.target.checked })}
                    className="w-4 h-4 text-orange-600 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700">Retry on failure</span>
                </label>
                
                {config.responseHandling.retryOnFailure && (
                  <input
                    type="number"
                    value={config.responseHandling.maxRetries}
                    onChange={(e) => updateResponseHandling({ maxRetries: parseInt(e.target.value) || 3 })}
                    min="1"
                    max="5"
                    className="w-16 px-2 py-1 text-sm border border-gray-300 rounded"
                    placeholder="Max"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Example Payload Preview */}
          <div className="border-t border-gray-200 pt-6">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Example Payload Preview</h4>
            <div className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto">
              <pre className="text-xs font-mono">
{JSON.stringify(examplePayload, null, 2)}
              </pre>
            </div>
          </div>
        </>
      )}
    </div>
  );
}