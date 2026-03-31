'use client';

import { useState, useEffect } from 'react';
import { X, Copy, Check, Link as LinkIcon, MessageSquare, Mail, Phone, ArrowRight, Info, AlertCircle, Search, Plus, Filter, Grid3X3 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { webhookService } from '@/lib/services/webhookService';

interface WebhookConfig {
  channel: 'sms' | 'email' | 'phone';
  actionId: string;
  useCase: 'inbound' | 'outbound';
  description: string;
}

interface WebhookConfigurationModalProps {
  isOpen: boolean;
  onClose: () => void;
  agentId: string;
}

const CHANNEL_OPTIONS = [
  {
    id: 'sms' as const,
    label: 'SMS',
    icon: MessageSquare,
    description: 'Send and receive text messages',
    color: 'text-green-600',
    bgColor: 'bg-green-50'
  },
  {
    id: 'email' as const,
    label: 'Email',
    icon: Mail,
    description: 'Send and receive emails',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50'
  },
  {
    id: 'phone' as const,
    label: 'Phone',
    icon: Phone,
    description: 'Voice calls (outbound only)',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    disabled: false
  }
];

const USE_CASE_OPTIONS = [
  {
    id: 'inbound' as const,
    label: 'Inbound',
    description: 'Process incoming messages from users',
    icon: ArrowRight,
    requirements: 'Requires "from" field (phone/email/contactId)'
  },
  {
    id: 'outbound' as const,
    label: 'Outbound',
    description: 'Send outbound messages to users',
    icon: ArrowRight,
    requirements: 'Requires "to" field (phone/email/contactId)'
  }
];

interface ActionOption {
  id: string;
  label: string;
  description: string;
  type: string;
  isActive: boolean;
}

export default function WebhookConfigurationModal({ isOpen, onClose, agentId }: WebhookConfigurationModalProps) {
  const { tenant, getToken } = useAuth();
  const [config, setConfig] = useState<WebhookConfig>({
    channel: 'sms',
    actionId: '',
    useCase: 'inbound',
    description: ''
  });
  const [customActionId, setCustomActionId] = useState('');
  const [generatedUrl, setGeneratedUrl] = useState('');
  const [webhookCredentials, setWebhookCredentials] = useState<{
    webhookId: string;
    webhookPassword: string;
    basicAuthHeader: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [credentialsCopied, setCredentialsCopied] = useState({ username: false, password: false });
  const [isGenerating, setIsGenerating] = useState(false);
  const [actions, setActions] = useState<ActionOption[]>([]);
  const [isLoadingActions, setIsLoadingActions] = useState(false);
  
  // Action browser modal state
  const [isActionBrowserOpen, setIsActionBrowserOpen] = useState(false);
  const [actionSearchQuery, setActionSearchQuery] = useState('');
  const [actionTypeFilter, setActionTypeFilter] = useState<string>('all');

  // Fetch real actions for the agent
  const fetchActions = async () => {
    if (!tenant?.id || !agentId) {
      console.log('Skipping action fetch - missing tenant or agentId:', { tenantId: tenant?.id, agentId });
      return;
    }

    console.log('Fetching actions for agent:', agentId, 'tenant:', tenant?.id);
    setIsLoadingActions(true);
    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication token not available');
      }

      console.log('Making API call to:', `${process.env.NEXT_PUBLIC_API_URL}/api/agent-training/actions/agent/${agentId}`);
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/agent-training/actions/agent/${agentId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('Response status:', response.status, response.statusText);
      
      const result = await response.json();
      
      console.log('API Response for actions:', result);
      
      if (!response.ok || !result.success) {
        console.error('Failed to fetch actions:', result.error);
        return;
      }

      const actionOptions: ActionOption[] = result.data.actions.map((action: any) => ({
        id: action.actionId,
        label: action.name,
        description: action.description || 'No description',
        type: action.type,
        isActive: action.isActive
      }));

      console.log('Processed action options:', actionOptions);
      setActions(actionOptions);
    } catch (error) {
      console.error('Error fetching actions:', error);
    } finally {
      setIsLoadingActions(false);
    }
  };

  // Reset form when modal opens/closes and fetch actions
  useEffect(() => {
    console.log('WebhookConfigurationModal useEffect triggered:', { isOpen, tenantId: tenant?.id, agentId });
    if (isOpen) {
      setConfig({
        channel: 'sms',
        actionId: '',
        useCase: 'inbound',
        description: ''
      });
      setCustomActionId('');
      setGeneratedUrl('');
      setWebhookCredentials(null);
      setCopied(false);
      setCredentialsCopied({ username: false, password: false });
      
      // Fetch actions when modal opens
      fetchActions();
    }
  }, [isOpen, tenant?.id, agentId, getToken]);

  // Auto-set outbound when phone channel is selected
  useEffect(() => {
    if (config.channel === 'phone' && config.useCase === 'inbound') {
      setConfig(prev => ({ ...prev, useCase: 'outbound' }));
    }
  }, [config.channel]);

  const handleClose = () => {
    onClose();
  };

  const generateWebhookUrl = async () => {
    if (!tenant?.id || !agentId) return;

    setIsGenerating(true);
    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication token not available');
      }

      const finalActionId = config.actionId;
      
      // Prepare the request data
      const webhookRequest = {
        agentId: agentId,
        tenantId: tenant.id,
        actionId: finalActionId,
        name: config.description || `${config.channel} ${config.useCase} webhook`,
        description: config.description || `${config.channel.toUpperCase()} ${config.useCase} webhook for action: ${finalActionId}`
      };

      // Call the appropriate API endpoint
      const result = await webhookService.createWebhook(
        config.channel,
        config.useCase,
        webhookRequest,
        token
      );
      
      setGeneratedUrl(result.data.webhookUrl);
      setWebhookCredentials({
        webhookId: result.data.webhookId,
        webhookPassword: result.data.webhookPassword,
        basicAuthHeader: result.data.basicAuthHeader
      });
      
      // Show success message
      console.log('Webhook created successfully:', result.data);
    } catch (error) {
      console.error('Error creating webhook:', error);
      alert(`Failed to create webhook: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const copyCredential = async (type: 'username' | 'password', value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCredentialsCopied(prev => ({ ...prev, [type]: true }));
      setTimeout(() => {
        setCredentialsCopied(prev => ({ ...prev, [type]: false }));
      }, 2000);
    } catch (error) {
      console.error('Failed to copy credential:', error);
    }
  };

  const isFormValid = () => {
    return config.actionId && config.actionId !== '';
  };

  // Filter actions based on search and type
  const filteredActions = actions.filter(action => {
    const matchesSearch = actionSearchQuery === '' || 
      action.label.toLowerCase().includes(actionSearchQuery.toLowerCase()) ||
      action.description.toLowerCase().includes(actionSearchQuery.toLowerCase()) ||
      action.id.toLowerCase().includes(actionSearchQuery.toLowerCase());
    
    const matchesType = actionTypeFilter === 'all' || action.type === actionTypeFilter;
    
    return matchesSearch && matchesType;
  });

  // Get unique action types for filter dropdown
  const actionTypes = Array.from(new Set(actions.map(action => action.type)));

  // Handle action selection from browser
  const handleActionSelect = (actionId: string) => {
    setConfig(prev => ({ ...prev, actionId }));
    setIsActionBrowserOpen(false);
    setActionSearchQuery(''); // Reset search
    setActionTypeFilter('all'); // Reset filter
  };

  const getExamplePayload = () => {
    if (config.useCase === 'inbound') {
      if (config.channel === 'sms') {
        return {
          // Required fields
          from: "+1234567890",                    // Phone number OR contactId
          messageContent: "Hi, I'm interested in your services",
          
          // Optional contact creation fields (auto-creates contact if not exists)
          full_name: "John Smith",                // OR name, fullName
          first_name: "John",                     // OR firstName  
          last_name: "Smith",                     // OR lastName
          email: "john.smith@example.com",        // OR emailAddress
          
          // Alternative: Use contactId instead of phone number
          // contactId: "contact_abc123"
        };
      } else if (config.channel === 'email') {
        return {
          // Required fields
          from: "customer@example.com",           // Email address OR contactId
          messageContent: "Hi, I'd like more information about your products.",
          
          // Optional contact creation fields (auto-creates contact if not exists)
          full_name: "Jane Doe",                  // OR name, fullName
          first_name: "Jane",                     // OR firstName
          last_name: "Doe",                       // OR lastName
          phone: "+1234567890",                   // OR phoneNumber
          
          // Alternative: Use contactId instead of email address
          // contactId: "contact_abc123"
        };
      } else if (config.channel === 'phone') {
        return {
          // Required fields
          from: "+1234567890",                    // Phone number OR contactId
          
          // Optional contact creation fields (auto-creates contact if not exists)
          full_name: "Mike Johnson",              // OR name, fullName
          first_name: "Mike",                     // OR firstName
          last_name: "Johnson",                   // OR lastName
          email: "mike.johnson@example.com",      // OR emailAddress
          
          // Alternative: Use contactId instead of phone number
          // contactId: "contact_abc123"
        };
      }
    } else {
      // Outbound use case
      if (config.channel === 'sms') {
        return {
          // Required fields
          to: "+1234567890",                      // Phone number OR contactId
          
          // Optional fields
          actionId: config.actionId || 'general',
          
          // Optional contact creation fields (auto-creates contact if not exists)
          full_name: "Sarah Wilson",              // OR name, fullName
          first_name: "Sarah",                    // OR firstName
          last_name: "Wilson",                    // OR lastName
          email: "sarah.wilson@example.com",      // OR emailAddress
          
          // Alternative: Use contactId instead of phone number
          // contactId: "contact_abc123"
        };
      } else if (config.channel === 'email') {
        return {
          // Required fields
          to: "customer@example.com",             // Email address OR contactId
          
          // Optional fields
          actionId: config.actionId || 'general',
          
          // Optional contact creation fields (auto-creates contact if not exists)
          full_name: "David Brown",               // OR name, fullName
          first_name: "David",                    // OR firstName
          last_name: "Brown",                     // OR lastName
          phone: "+1234567890",                   // OR phoneNumber
          
          // Alternative: Use contactId instead of email address
          // contactId: "contact_abc123"
        };
      } else if (config.channel === 'phone') {
        return {
          // Required fields
          to: "+1234567890",                      // Phone number OR contactId
          
          // Optional fields
          actionId: config.actionId || 'general',
          
          // Optional contact creation fields (auto-creates contact if not exists)
          full_name: "Lisa Davis",                // OR name, fullName
          first_name: "Lisa",                     // OR firstName
          last_name: "Davis",                     // OR lastName
          email: "lisa.davis@example.com",        // OR emailAddress
          
          // Alternative: Use contactId instead of phone number
          // contactId: "contact_abc123"
        };
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-50 rounded-lg">
              <LinkIcon className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">Webhook URL Generator</h3>
              <p className="text-sm text-gray-500">Create custom webhook URLs for external integrations</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-8">
          {/* Configuration Form */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Configuration */}
            <div className="space-y-6">
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-4">Webhook Configuration</h4>
                
                {/* Channel Selection */}
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Communication Channel
                  </label>
                  <div className="grid grid-cols-1 gap-3">
                    {CHANNEL_OPTIONS.map((option) => {
                      const Icon = option.icon;
                      return (
                        <label
                          key={option.id}
                          className={`relative flex items-center p-3 border rounded-lg cursor-pointer transition-all hover:bg-gray-50 ${
                            config.channel === option.id 
                              ? 'border-orange-500 bg-orange-50' 
                              : 'border-gray-200'
                          } ${option.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <input
                            type="radio"
                            name="channel"
                            value={option.id}
                            checked={config.channel === option.id}
                            disabled={option.disabled}
                            onChange={(e) => setConfig(prev => ({ ...prev, channel: e.target.value as any }))}
                            className="sr-only"
                          />
                          <div className={`p-2 rounded-lg mr-3 ${option.bgColor}`}>
                            <Icon className={`h-4 w-4 ${option.color}`} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-900">{option.label}</span>
                              {option.disabled && (
                                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                                  Coming Soon
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500">{option.description}</p>
                          </div>
                          {config.channel === option.id && (
                            <div className="absolute top-2 right-2">
                              <Check className="h-4 w-4 text-orange-600" />
                            </div>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Use Case Selection */}
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Use Case
                  </label>
                  <div className="grid grid-cols-1 gap-3">
                    {USE_CASE_OPTIONS.filter(option => {
                      // For phone channel, only show outbound option
                      if (config.channel === 'phone') {
                        return option.id === 'outbound';
                      }
                      return true;
                    }).map((option) => {
                      const Icon = option.icon;
                      return (
                        <label
                          key={option.id}
                          className={`relative flex items-center p-3 border rounded-lg cursor-pointer transition-all hover:bg-gray-50 ${
                            config.useCase === option.id 
                              ? 'border-orange-500 bg-orange-50' 
                              : 'border-gray-200'
                          }`}
                        >
                          <input
                            type="radio"
                            name="useCase"
                            value={option.id}
                            checked={config.useCase === option.id}
                            onChange={(e) => setConfig(prev => ({ ...prev, useCase: e.target.value as any }))}
                            className="sr-only"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium text-gray-900">{option.label}</span>
                              <Icon className="h-3 w-3 text-gray-400" />
                            </div>
                            <p className="text-xs text-gray-500">{option.description}</p>
                            <p className="text-xs text-orange-600 mt-1">{option.requirements}</p>
                          </div>
                          {config.useCase === option.id && (
                            <div className="absolute top-2 right-2">
                              <Check className="h-4 w-4 text-orange-600" />
                            </div>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Action ID Selection */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-700">
                      Action Configuration
                      <span className="text-xs text-gray-500 ml-2">(defines agent behavior for this webhook)</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsActionBrowserOpen(true)}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded-lg transition-colors"
                    >
                      <Grid3X3 className="h-4 w-4" />
                      Browse Actions
                    </button>
                  </div>
                  
                  {isLoadingActions ? (
                    <div className="flex items-center justify-center py-8 border border-gray-200 rounded-lg bg-gray-50">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600"></div>
                      <span className="ml-3 text-sm text-gray-600">Loading actions...</span>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* All Actions (Active + Inactive) */}
                      {actions.map((action) => (
                        <label
                          key={action.id}
                          className={`relative flex items-start p-4 border rounded-lg cursor-pointer transition-all hover:bg-gray-50 ${
                            config.actionId === action.id 
                              ? 'border-orange-500 bg-orange-50 ring-1 ring-orange-500' 
                              : 'border-gray-200'
                          }`}
                        >
                          <input
                            type="radio"
                            name="actionId"
                            value={action.id}
                            checked={config.actionId === action.id}
                            onChange={(e) => setConfig(prev => ({ ...prev, actionId: e.target.value }))}
                            className="sr-only"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-sm font-medium ${action.isActive ? 'text-gray-900' : 'text-gray-500'}`}>
                                {action.label}
                              </span>
                              <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                                action.type === 'nurture' ? 'bg-green-100 text-green-700' :
                                action.type === 'support' ? 'bg-blue-100 text-blue-700' :
                                action.type === 'followup' ? 'bg-purple-100 text-purple-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {action.type}
                              </span>
                              {!action.isActive && (
                                <span className="px-2 py-0.5 text-xs rounded-full font-medium bg-yellow-100 text-yellow-700">
                                  Inactive
                                </span>
                              )}
                            </div>
                            <p className={`text-xs ${action.isActive ? 'text-gray-600' : 'text-gray-400'}`}>
                              {action.description}
                            </p>
                            <p className={`text-xs mt-1 font-mono ${action.isActive ? 'text-orange-600' : 'text-gray-400'}`}>
                              ID: {action.id}
                            </p>
                          </div>
                          {config.actionId === action.id && (
                            <div className="absolute top-3 right-3">
                              <Check className="h-4 w-4 text-orange-600" />
                            </div>
                          )}
                        </label>
                      ))}
                      
                      {/* Inactive Actions Warning */}
                      {actions.filter(action => action.isActive).length === 0 && actions.length > 0 && (
                        <div className="text-center py-4 border border-yellow-200 rounded-lg bg-yellow-50 mb-3">
                          <AlertCircle className="h-5 w-5 text-yellow-600 mx-auto mb-2" />
                          <p className="text-sm text-yellow-800 font-medium">All Actions Are Inactive</p>
                          <p className="text-xs text-yellow-700 mt-1">
                            You can still create webhooks, but inactive actions may not behave as expected.
                          </p>
                        </div>
                      )}
                      
                      {/* No Actions At All */}
                      {actions.length === 0 && (
                        <div className="text-center py-6 border border-gray-200 rounded-lg bg-gray-50">
                          <AlertCircle className="h-6 w-6 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-600 font-medium">No Actions Found</p>
                          <p className="text-xs text-gray-500 mt-1">
                            Create an action first in the Actions section.
                          </p>
                        </div>
                      )}
                      
                    </div>
                  )}
                </div>


                {/* Description */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Description (Optional)
                  </label>
                  <textarea
                    value={config.description}
                    onChange={(e) => setConfig(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe what this webhook does..."
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
              </div>
            </div>

            {/* Right Column - Preview & Generate */}
            <div className="space-y-6">
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-4">Generated Webhook</h4>
                
                {/* Generate Button */}
                <div className="mb-4">
                  <button
                    onClick={generateWebhookUrl}
                    disabled={!isFormValid() || isGenerating}
                    className={`w-full px-4 py-3 rounded-lg font-medium transition-colors ${
                      isFormValid() && !isGenerating
                        ? 'bg-orange-600 text-white hover:bg-orange-700'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {isGenerating ? 'Generating...' : 'Generate Webhook URL'}
                  </button>
                </div>

                {/* Generated URL */}
                {generatedUrl && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Webhook URL
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={generatedUrl}
                          readOnly
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm font-mono"
                        />
                        <button
                          onClick={copyToClipboard}
                          className={`px-3 py-2 rounded-md border transition-colors ${
                            copied 
                              ? 'border-green-500 bg-green-50 text-green-700' 
                              : 'border-gray-300 hover:bg-gray-50 text-gray-700'
                          }`}
                          title="Copy URL"
                        >
                          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Basic Auth Credentials - SHOWN ONCE ONLY */}
                    {webhookCredentials && (
                      <div className="space-y-4 border-2 border-orange-200 bg-orange-50 rounded-lg p-4">
                        <div className="flex items-start gap-2 mb-3">
                          <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5" />
                          <div>
                            <h5 className="text-sm font-medium text-orange-900">🔑 Authentication Credentials</h5>
                            <p className="text-xs text-orange-700 mt-1">
                              <strong>IMPORTANT:</strong> These credentials are shown only once. Copy them now and store them securely.
                            </p>
                          </div>
                        </div>

                        {/* Username */}
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Username (Key ID)
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={webhookCredentials.webhookId}
                              readOnly
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-white text-sm font-mono"
                            />
                            <button
                              onClick={() => copyCredential('username', webhookCredentials.webhookId)}
                              className={`px-3 py-2 rounded-md border transition-colors ${
                                credentialsCopied.username 
                                  ? 'border-green-500 bg-green-50 text-green-700' 
                                  : 'border-gray-300 hover:bg-gray-50 text-gray-700'
                              }`}
                              title="Copy Username"
                            >
                              {credentialsCopied.username ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>

                        {/* Password */}
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Password (Secret)
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={webhookCredentials.webhookPassword}
                              readOnly
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-white text-sm font-mono"
                            />
                            <button
                              onClick={() => copyCredential('password', webhookCredentials.webhookPassword)}
                              className={`px-3 py-2 rounded-md border transition-colors ${
                                credentialsCopied.password 
                                  ? 'border-green-500 bg-green-50 text-green-700' 
                                  : 'border-gray-300 hover:bg-gray-50 text-gray-700'
                              }`}
                              title="Copy Password"
                            >
                              {credentialsCopied.password ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>

                        {/* How to use */}
                        <div className="bg-white border border-orange-200 rounded p-3">
                          <h6 className="text-xs font-medium text-gray-900 mb-2">How to use in your tools:</h6>
                          <ul className="text-xs text-gray-600 space-y-1">
                            <li>• <strong>n8n/Zapier/Make:</strong> Add "Basic Auth" and paste Username + Password</li>
                            <li>• <strong>Custom code:</strong> Add header: <code className="bg-gray-100 px-1 rounded">Authorization: Basic [base64(username:password)]</code></li>
                            <li>• <strong>Postman/curl:</strong> Use "Basic Auth" tab with these credentials</li>
                          </ul>
                        </div>
                      </div>
                    )}

                    {/* Usage Instructions */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-start gap-2">
                        <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                        <div>
                          <h5 className="text-sm font-medium text-blue-900">Usage Instructions</h5>
                          <p className="text-xs text-blue-700 mt-1">
                            Use this URL as a POST endpoint in your external systems (n8n, GoHighLevel, etc.)
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Example Payload */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Example POST Body
                      </label>
                      <pre className="bg-gray-900 text-gray-100 p-3 rounded-lg text-xs overflow-x-auto">
{JSON.stringify(getExamplePayload(), null, 2)}
                      </pre>
                    </div>

                    {/* Channel-specific notes */}
                    {config.channel === 'sms' && config.useCase === 'inbound' && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                          <div>
                            <p className="text-xs text-yellow-700">
                              <strong>SMS Inbound:</strong> Must include <code className="bg-yellow-100 px-1 rounded">messageContent</code> and <code className="bg-yellow-100 px-1 rounded">from</code> (or <code className="bg-yellow-100 px-1 rounded">phone</code>) in the POST body. The system will extract the message from <code className="bg-yellow-100 px-1 rounded">messageContent</code> or <code className="bg-yellow-100 px-1 rounded">customData.messageContent</code> (for GoHighLevel).
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {config.channel === 'email' && config.useCase === 'inbound' && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                          <div>
                            <p className="text-xs text-yellow-700">
                              <strong>Email Inbound:</strong> Must include <code className="bg-yellow-100 px-1 rounded">messageContent</code> and <code className="bg-yellow-100 px-1 rounded">from</code> (or <code className="bg-yellow-100 px-1 rounded">fromAddress</code>) in the POST body. Include the subject line in the messageContent for better context.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Field mapping information */}
                    {config.useCase === 'inbound' && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                          <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                          <div>
                            <h6 className="text-xs font-medium text-blue-900 mb-1">Field Mapping</h6>
                            <p className="text-xs text-blue-700">
                              Our system automatically maps common field names. For phone numbers, you can use <code className="bg-blue-100 px-1 rounded">from</code>, <code className="bg-blue-100 px-1 rounded">phone</code>, or <code className="bg-blue-100 px-1 rounded">fromAddress</code>. For message content, use <code className="bg-blue-100 px-1 rounded">messageContent</code> or nest it in <code className="bg-blue-100 px-1 rounded">customData.messageContent</code> (GoHighLevel format).
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {/* Action Browser Modal */}
      {isActionBrowserOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-50 rounded-lg">
                  <Grid3X3 className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Browse Actions</h3>
                  <p className="text-sm text-gray-500">
                    {actions.length} action{actions.length !== 1 ? 's' : ''} available for this agent
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsActionBrowserOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* Search and Filter Bar */}
            <div className="p-6 border-b border-gray-200 bg-gray-50">
              <div className="flex gap-4 items-center">
                {/* Search Input */}
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search actions by name, description, or ID..."
                    value={actionSearchQuery}
                    onChange={(e) => setActionSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>

                {/* Type Filter */}
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <select
                    value={actionTypeFilter}
                    onChange={(e) => setActionTypeFilter(e.target.value)}
                    className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white min-w-[140px]"
                  >
                    <option value="all">All Types</option>
                    {actionTypes.map(type => (
                      <option key={type} value={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              {/* Search Results Summary */}
              <div className="mt-3 text-sm text-gray-600">
                {filteredActions.length} of {actions.length} action{filteredActions.length !== 1 ? 's' : ''} shown
                {actionSearchQuery && (
                  <span className="ml-2">
                    • Searching for "{actionSearchQuery}"
                  </span>
                )}
                {actionTypeFilter !== 'all' && (
                  <span className="ml-2">
                    • Filtered by {actionTypeFilter}
                  </span>
                )}
              </div>
            </div>

            {/* Actions Grid */}
            <div className="flex-1 overflow-y-auto p-6">
              {filteredActions.length === 0 ? (
                <div className="text-center py-12">
                  <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">No Actions Found</h4>
                  <p className="text-gray-600 mb-4">
                    {actionSearchQuery || actionTypeFilter !== 'all' 
                      ? 'Try adjusting your search or filter criteria.' 
                      : 'No actions have been created for this agent yet.'
                    }
                  </p>
                  {(actionSearchQuery || actionTypeFilter !== 'all') && (
                    <button
                      onClick={() => {
                        setActionSearchQuery('');
                        setActionTypeFilter('all');
                      }}
                      className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredActions.map((action) => (
                    <div
                      key={action.id}
                      className={`relative p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md hover:border-orange-300 ${
                        config.actionId === action.id 
                          ? 'border-orange-500 bg-orange-50 ring-1 ring-orange-500' 
                          : 'border-gray-200 hover:bg-gray-50'
                      } ${!action.isActive ? 'opacity-75' : ''}`}
                      onClick={() => handleActionSelect(action.id)}
                    >
                      {/* Selected Indicator */}
                      {config.actionId === action.id && (
                        <div className="absolute top-3 right-3">
                          <Check className="h-5 w-5 text-orange-600" />
                        </div>
                      )}

                      {/* Action Content */}
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                              action.type === 'nurture' ? 'bg-green-100 text-green-700' :
                              action.type === 'support' ? 'bg-blue-100 text-blue-700' :
                              action.type === 'followup' ? 'bg-purple-100 text-purple-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {action.type}
                            </span>
                            {!action.isActive && (
                              <span className="px-2 py-1 text-xs rounded-full font-medium bg-yellow-100 text-yellow-700">
                                Inactive
                              </span>
                            )}
                          </div>
                        </div>

                        <div>
                          <h4 className={`font-medium ${action.isActive ? 'text-gray-900' : 'text-gray-600'} mb-1`}>
                            {action.label}
                          </h4>
                          <p className={`text-sm ${action.isActive ? 'text-gray-600' : 'text-gray-500'} line-clamp-2`}>
                            {action.description}
                          </p>
                        </div>

                        <div className="pt-2 border-t border-gray-100">
                          <div className="flex items-center justify-between text-xs">
                            <code className={`px-2 py-1 rounded font-mono ${
                              action.isActive ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'
                            }`}>
                              {action.id}
                            </code>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleActionSelect(action.id);
                              }}
                              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                                config.actionId === action.id
                                  ? 'bg-orange-600 text-white'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                            >
                              {config.actionId === action.id ? 'Selected' : 'Select'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center p-6 border-t border-gray-200 bg-gray-50">
              <div className="text-sm text-gray-600">
                {config.actionId ? (
                  <span className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    Action selected: <code className="font-mono text-orange-600">{config.actionId}</code>
                  </span>
                ) : (
                  <span className="text-gray-500">No action selected</span>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setIsActionBrowserOpen(false)}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
                {config.actionId && (
                  <button
                    onClick={() => setIsActionBrowserOpen(false)}
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2"
                  >
                    <Check className="h-4 w-4" />
                    Continue with Selected
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}