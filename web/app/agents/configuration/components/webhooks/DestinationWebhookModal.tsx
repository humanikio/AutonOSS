'use client';

import { useState, useEffect } from 'react';
import { X, Copy, Check, Link as LinkIcon, MessageSquare, Mail, Phone, Save, AlertCircle, Info, TestTube, Globe, Zap, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface DestinationWebhookConfig {
  name: string;
  description: string;
  category: 'sms' | 'email' | 'phone';
  endpoint: {
    url: string;
    method: 'POST';
    headers: Record<string, string>;
    authType: 'none' | 'bearer' | 'basic' | 'api_key' | 'signing_secret';
    authConfig: {
      token?: string;
      username?: string;
      password?: string;
      apiKey?: string;
      apiKeyHeader?: string;
    };
  };
  payloadTemplate: string;
  isActive: boolean;
  destinationKey?: string; // Generated after save - used in API requests
}

interface DestinationWebhookModalProps {
  isOpen: boolean;
  onClose: () => void;
  agentId: string;
}

const AUTH_TYPE_OPTIONS = [
  {
    id: 'none' as const,
    label: 'None',
    description: 'No authentication required'
  },
  {
    id: 'bearer' as const,
    label: 'Bearer Token',
    description: 'Authorization: Bearer <token>'
  },
  {
    id: 'basic' as const,
    label: 'Basic Auth',
    description: 'Authorization: Basic <base64(username:password)>'
  },
  {
    id: 'api_key' as const,
    label: 'API Key',
    description: 'Custom header with API key'
  },
  {
    id: 'signing_secret' as const,
    label: 'Signing Secret',
    description: 'Auto-generated HMAC-SHA256 signature verification'
  }
];

const DESTINATION_CATEGORIES = [
  {
    id: 'sms' as const,
    label: 'SMS Generation',
    icon: MessageSquare,
    description: 'Send generated SMS messages to your endpoint instead of actual SMS',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200'
  },
  {
    id: 'email' as const,
    label: 'Email Generation',
    icon: Mail,
    description: 'Send generated email content to your endpoint instead of actual emails',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200'
  },
  {
    id: 'phone' as const,
    label: 'Phone Generation',
    icon: Phone,
    description: 'Send generated call scripts/content to your endpoint instead of making calls',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200'
  }
];

const getDefaultPayloadTemplate = (category: 'sms' | 'email' | 'phone') => {
  // Updated payload template based on actual backend implementation
  const baseTemplate = {
    message: "{{message}}",
    contactId: "{{contactId}}",
    agentId: "{{agentId}}",
    tenantId: "{{tenantId}}",
    timestamp: "{{timestamp}}",
    messageId: "{{messageId}}",
    caseId: "{{caseId}}",
    conversationId: "{{conversationId}}",
    fromPhone: "{{fromPhone}}",
    toPhone: "{{toPhone}}",
    messageType: category,
    contact: {
      contactId: "{{contactId}}",
      fullName: "{{contactFullName}}",
      firstName: "{{contactFirstName}}",
      lastName: "{{contactLastName}}",
      email: "{{contactEmail}}",
      phoneNumber: "{{contactPhoneNumber}}",
      name: "{{contactName}}"
    }
  };

  // All categories use the same base template since the message field
  // contains the appropriate content for SMS, Email, or Phone
  return JSON.stringify(baseTemplate, null, 2);
};

export default function DestinationWebhookModal({ isOpen, onClose, agentId }: DestinationWebhookModalProps) {
  const { tenant, getToken } = useAuth();
  const [currentStep, setCurrentStep] = useState<'category' | 'details' | 'success'>('category');
  const [config, setConfig] = useState<DestinationWebhookConfig>({
    name: '',
    description: '',
    category: 'sms',
    endpoint: {
      url: '',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      authType: 'none',
      authConfig: {}
    },
    payloadTemplate: getDefaultPayloadTemplate('sms'),
    isActive: true
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showAuthPassword, setShowAuthPassword] = useState(false);
  const [showPayloadExample, setShowPayloadExample] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [generatedDestinationKey, setGeneratedDestinationKey] = useState<string>('');

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep('category');
      setConfig({
        name: '',
        description: '',
        category: 'sms',
        endpoint: {
          url: '',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          authType: 'none',
          authConfig: {}
        },
        payloadTemplate: getDefaultPayloadTemplate('sms'),
        isActive: true
      });
      setValidationErrors([]);
      setSaved(false);
      setGeneratedDestinationKey('');
    }
  }, [isOpen]);

  const validateConfig = (): string[] => {
    const errors: string[] = [];

    if (!config.name.trim()) {
      errors.push('Name is required');
    }

    if (!config.endpoint.url.trim()) {
      errors.push('Endpoint URL is required');
    } else {
      try {
        new URL(config.endpoint.url);
      } catch {
        errors.push('Invalid URL format');
      }
    }

    if (config.endpoint.authType === 'bearer' && !config.endpoint.authConfig.token?.trim()) {
      errors.push('Bearer token is required');
    }

    if (config.endpoint.authType === 'basic') {
      if (!config.endpoint.authConfig.username?.trim()) {
        errors.push('Username is required for Basic Auth');
      }
      if (!config.endpoint.authConfig.password?.trim()) {
        errors.push('Password is required for Basic Auth');
      }
    }

    if (config.endpoint.authType === 'api_key') {
      if (!config.endpoint.authConfig.apiKey?.trim()) {
        errors.push('API Key is required');
      }
      if (!config.endpoint.authConfig.apiKeyHeader?.trim()) {
        errors.push('API Key header name is required');
      }
    }

    try {
      JSON.parse(config.payloadTemplate);
    } catch {
      errors.push('Invalid JSON in payload template');
    }

    return errors;
  };

  const handleSave = async () => {
    const errors = validateConfig();
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    setIsSaving(true);
    setValidationErrors([]);

    try {
      console.log('Saving destination webhook config:', config);
      
      // Get auth token
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      // Determine the endpoint based on category
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const endpoint = `${apiUrl}/api/destination-webhooks/setup-${config.category}-destination/${tenant?.id}/${agentId}`;

      // Prepare the request payload
      const payload = {
        name: config.name,
        description: config.description,
        endpoint: {
          url: config.endpoint.url,
          method: config.endpoint.method,
          headers: config.endpoint.headers,
          authType: config.endpoint.authType,
          authConfig: config.endpoint.authConfig
        },
        payloadTemplate: config.payloadTemplate,
        isActive: config.isActive
      };

      // Make API call
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to create destination webhook: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to create destination webhook');
      }

      // Set the generated destination key from the API response
      setGeneratedDestinationKey(result.data.destinationKey);
      
      setSaved(true);
      setCurrentStep('success');

    } catch (error) {
      console.error('Error saving destination webhook:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save destination webhook configuration';
      setValidationErrors([errorMessage]);
    } finally {
      setIsSaving(false);
    }
  };

  const updateConfig = (updates: Partial<DestinationWebhookConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const updateEndpoint = (updates: Partial<DestinationWebhookConfig['endpoint']>) => {
    setConfig(prev => ({
      ...prev,
      endpoint: { ...prev.endpoint, ...updates }
    }));
  };

  const updateAuthConfig = (updates: Partial<DestinationWebhookConfig['endpoint']['authConfig']>) => {
    setConfig(prev => ({
      ...prev,
      endpoint: {
        ...prev.endpoint,
        authConfig: { ...prev.endpoint.authConfig, ...updates }
      }
    }));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };


  const handleCategorySelect = (category: 'sms' | 'email' | 'phone') => {
    setConfig(prev => ({
      ...prev,
      category,
      payloadTemplate: getDefaultPayloadTemplate(category)
    }));
    setCurrentStep('details');
  };

  const handleBackToCategory = () => {
    setCurrentStep('category');
    setValidationErrors([]);
  };

  const selectedCategoryInfo = DESTINATION_CATEGORIES.find(cat => cat.id === config.category);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-8 border-b border-gray-100">
          <div className="flex items-center gap-4">
            {currentStep === 'details' && (
              <button
                onClick={handleBackToCategory}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowRight className="h-5 w-5 text-gray-500 rotate-180" />
              </button>
            )}
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-50 rounded-xl">
                <Globe className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  {currentStep === 'category' && 'Choose Destination Type'}
                  {currentStep === 'details' && `Configure ${selectedCategoryInfo?.label} Destination`}
                  {currentStep === 'success' && 'Destination Created'}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {currentStep === 'category' && 'Select the type of content you want to redirect to your endpoint'}
                  {currentStep === 'details' && 'Set up your endpoint and authentication details'}
                  {currentStep === 'success' && 'Your destination webhook is ready to use'}
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8">
          {/* Step 1: Category Selection */}
          {currentStep === 'category' && (
            <div className="space-y-8">
              <div className="text-center mb-8">
                <p className="text-gray-600">Choose the type of content you want to send to your external endpoint instead of actual communications.</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                {DESTINATION_CATEGORIES.map((category) => {
                  const Icon = category.icon;
                  
                  return (
                    <button
                      key={category.id}
                      onClick={() => handleCategorySelect(category.id)}
                      className={`group p-8 border-2 border-gray-200 rounded-xl text-center transition-all hover:border-blue-300 hover:shadow-lg hover:-translate-y-1`}
                    >
                      <div className={`w-16 h-16 mx-auto mb-4 ${category.bgColor} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                        <Icon className={`h-8 w-8 ${category.color}`} />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">{category.label}</h3>
                      <p className="text-sm text-gray-600">{category.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 2: Details Configuration */}
          {currentStep === 'details' && selectedCategoryInfo && (
            <div className="space-y-8">
              {/* Validation Errors */}
              {validationErrors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="text-sm font-medium text-red-900">Please fix the following errors:</h4>
                      <ul className="mt-1 text-sm text-red-700 list-disc list-inside">
                        {validationErrors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}


              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column - Basic Configuration */}
                <div className="space-y-6">
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h4>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                        <input
                          type="text"
                          value={config.name}
                          onChange={(e) => updateConfig({ name: e.target.value })}
                          placeholder={`e.g., CRM ${selectedCategoryInfo.label} Integration`}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                        <textarea
                          value={config.description}
                          onChange={(e) => updateConfig({ description: e.target.value })}
                          placeholder={`Brief description of this ${selectedCategoryInfo.label.toLowerCase()} destination`}
                          rows={3}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          id="isActive"
                          checked={config.isActive}
                          onChange={(e) => updateConfig({ isActive: e.target.checked })}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                          Active (enable this destination)
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Endpoint Configuration */}
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Endpoint Configuration</h4>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Endpoint URL *</label>
                        <input
                          type="url"
                          value={config.endpoint.url}
                          onChange={(e) => updateEndpoint({ url: e.target.value })}
                          placeholder="https://your-system.com/webhook/destination"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Authentication</label>
                        <select
                          value={config.endpoint.authType}
                          onChange={(e) => updateEndpoint({ 
                            authType: e.target.value as any,
                            authConfig: {}
                          })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          {AUTH_TYPE_OPTIONS.map(option => (
                            <option key={option.id} value={option.id}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Authentication Fields */}
                      {config.endpoint.authType === 'bearer' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Bearer Token *</label>
                          <input
                            type="password"
                            value={config.endpoint.authConfig.token || ''}
                            onChange={(e) => updateAuthConfig({ token: e.target.value })}
                            placeholder="Enter your bearer token"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                          />
                        </div>
                      )}

                      {config.endpoint.authType === 'basic' && (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Username *</label>
                            <input
                              type="text"
                              value={config.endpoint.authConfig.username || ''}
                              onChange={(e) => updateAuthConfig({ username: e.target.value })}
                              placeholder="Enter username"
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Password *</label>
                            <div className="relative">
                              <input
                                type={showAuthPassword ? "text" : "password"}
                                value={config.endpoint.authConfig.password || ''}
                                onChange={(e) => updateAuthConfig({ password: e.target.value })}
                                placeholder="Enter password"
                                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                              <button
                                type="button"
                                onClick={() => setShowAuthPassword(!showAuthPassword)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                              >
                                {showAuthPassword ? (
                                  <EyeOff className="h-4 w-4 text-gray-400" />
                                ) : (
                                  <Eye className="h-4 w-4 text-gray-400" />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {config.endpoint.authType === 'api_key' && (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">API Key Header *</label>
                            <input
                              type="text"
                              value={config.endpoint.authConfig.apiKeyHeader || ''}
                              onChange={(e) => updateAuthConfig({ apiKeyHeader: e.target.value })}
                              placeholder="e.g., X-API-Key"
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">API Key *</label>
                            <input
                              type="password"
                              value={config.endpoint.authConfig.apiKey || ''}
                              onChange={(e) => updateAuthConfig({ apiKey: e.target.value })}
                              placeholder="Enter your API key"
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                            />
                          </div>
                        </div>
                      )}

                      {config.endpoint.authType === 'signing_secret' && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <div className="flex items-start space-x-3">
                            <Info className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                            <div>
                              <h4 className="text-sm font-medium text-blue-900 mb-1">Automatic Signing Secret</h4>
                              <p className="text-sm text-blue-700">
                                A signing secret will be automatically generated when this webhook is created. 
                                This secret will be used to sign requests with HMAC-SHA256 for secure verification.
                              </p>
                              <p className="text-xs text-blue-600 mt-2">
                                The signature will be included in the <code className="bg-blue-100 px-1 rounded">X-Signature</code> header.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Column - Request Example and Payload Information */}
                <div className="space-y-6">
                  {/* API Request Example */}
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">How to Use This Destination</h4>
                    
                    {/* Request Example */}
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="text-sm font-medium text-gray-900">
                          Example {selectedCategoryInfo.label === 'SMS Generation' ? 'SMS' : selectedCategoryInfo.label === 'Email Generation' ? 'Email' : 'Phone'} Request
                        </h5>
                        <button
                          onClick={() => copyToClipboard(JSON.stringify({
                            messageContent: selectedCategoryInfo.id === 'sms' ? "Hi, I'm interested in your services" : selectedCategoryInfo.id === 'email' ? "Hi, I'd like more information about your products." : "",
                            tenantId: tenant?.id || 'your-tenant-id',
                            contactId: "contact_abc123",
                            agentId: agentId,
                            action: "general",
                            destinationKey: generatedDestinationKey || "SMS_abc123_def456789",
                            from: selectedCategoryInfo.id === 'sms' ? "+1234567890" : "customer@example.com",
                            to: selectedCategoryInfo.id === 'sms' ? "+1987654321" : "agent@company.com",
                            conversationId: "conv_xyz789",
                            timestamp: new Date().toISOString(),
                            full_name: "John Smith",
                            first_name: "John",
                            last_name: "Smith",
                            email: selectedCategoryInfo.id !== 'email' ? "john.smith@example.com" : undefined
                          }, null, 2))}
                          className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                        >
                          Copy
                        </button>
                      </div>
                      <pre className="text-xs bg-gray-900 text-gray-100 p-3 rounded overflow-x-auto">
                        <div className="mb-2 text-green-400">// POST /api/agent-communication/{selectedCategoryInfo.id}/inbound</div>
{`{
  "messageContent": "${selectedCategoryInfo.id === 'sms' ? "Hi, I'm interested in your services" : selectedCategoryInfo.id === 'email' ? "Hi, I'd like more information about your products." : ""}",
  "tenantId": "${tenant?.id || 'your-tenant-id'}",
  "contactId": "contact_abc123",
  "agentId": "${agentId}",
  "action": "general",
  `}<span className="bg-yellow-900 text-yellow-300 font-bold">"destinationKey": "{generatedDestinationKey || 'SMS_abc123_def456789'}"</span>{`,  // 🔑 YOUR DESTINATION KEY
  ${selectedCategoryInfo.id === 'email' ? `"from": "customer@example.com",` : `"from": "+1234567890",`}
  ${selectedCategoryInfo.id === 'email' ? `"to": "agent@company.com",` : `"to": "+1987654321",`}
  "conversationId": "conv_xyz789",
  "timestamp": "${new Date().toISOString()}",
  
  // Optional: Contact creation fields (if contactId not provided)
  "full_name": "John Smith",
  "first_name": "John",
  "last_name": "Smith"${selectedCategoryInfo.id !== 'email' ? `,
  "email": "john.smith@example.com"` : ''}
}`}
                      </pre>
                      <p className="text-xs text-gray-600 mt-2">
                        <strong>Note:</strong> The <span className="bg-yellow-100 text-yellow-700 px-1 rounded">destinationKey</span> is what tells the system to use this destination instead of sending actual {selectedCategoryInfo.id === 'sms' ? 'SMS messages' : selectedCategoryInfo.id === 'email' ? 'emails' : 'making phone calls'}.
                      </p>
                    </div>
                  </div>

                  {/* Expandable Payload Preview */}
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">What We'll Send to Your Endpoint</h4>
                    
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <button
                        onClick={() => setShowPayloadExample(!showPayloadExample)}
                        className="w-full flex items-center justify-between text-left"
                      >
                        <div className="flex items-center gap-3">
                          <Info className="h-4 w-4 text-blue-600" />
                          <h5 className="text-sm font-medium text-blue-900">
                            {showPayloadExample ? 'Hide' : 'Show'} Payload Example
                          </h5>
                        </div>
                        <ArrowRight className={`h-4 w-4 text-blue-600 transition-transform ${showPayloadExample ? 'rotate-90' : ''}`} />
                      </button>
                      
                      {showPayloadExample && (
                        <div className="mt-4 space-y-3">
                          <p className="text-xs text-blue-700">
                            When someone sends a message to your agent with the destinationKey, we'll POST this data to your endpoint:
                          </p>
                          <div className="relative">
                            <pre className="bg-white border border-blue-200 rounded p-3 text-xs text-gray-700 overflow-x-auto">
{JSON.stringify({
  message: selectedCategoryInfo.id === 'sms' ? "Thank you for contacting us! We've received your inquiry and will respond within 24 hours." : selectedCategoryInfo.id === 'email' ? "Thank you for your email inquiry. We appreciate your interest and will provide a detailed response shortly." : "Thank you for calling. Based on your inquiry, I can help you with that information.",
  contactId: "contact_jkl012",
  agentId: "agent_xyz789",
  tenantId: "tenant_vwx234", 
  timestamp: new Date().toISOString(),
  messageId: "msg_abc123def456",
  caseId: "case_mno345",
  conversationId: "conv_stu901",
  fromPhone: "+1987654321",
  toPhone: "+1234567890",
  messageType: selectedCategoryInfo.id,
  contact: {
    contactId: "contact_jkl012",
    fullName: "John Smith",
    firstName: "John",
    lastName: "Smith",
    email: "john.smith@example.com",
    phoneNumber: "+1234567890",
    name: "John Smith"
  }
}, null, 2)}
                            </pre>
                            <button
                              onClick={() => copyToClipboard(JSON.stringify({
                                message: selectedCategoryInfo.id === 'sms' ? "Thank you for contacting us! We've received your inquiry and will respond within 24 hours." : "Generated AI response content",
                                contactId: "contact_jkl012",
                                agentId: "agent_xyz789",
                                tenantId: "tenant_vwx234", 
                                timestamp: new Date().toISOString(),
                                messageId: "msg_abc123def456",
                                caseId: "case_mno345",
                                conversationId: "conv_stu901",
                                fromPhone: "+1987654321",
                                toPhone: "+1234567890",
                                messageType: selectedCategoryInfo.id,
                                contact: {
                                  contactId: "contact_jkl012",
                                  fullName: "John Smith",
                                  firstName: "John",
                                  lastName: "Smith",
                                  email: "john.smith@example.com",
                                  phoneNumber: "+1234567890",
                                  name: "John Smith"
                                }
                              }, null, 2))}
                              className="absolute top-2 right-2 p-1.5 bg-gray-100 hover:bg-gray-200 rounded text-gray-600 transition-colors"
                              title="Copy payload example"
                            >
                              <Copy className="h-3 w-3" />
                            </button>
                          </div>
                          <p className="text-xs text-blue-700">
                            <strong>Key Point:</strong> The <code className="bg-blue-100 px-1">message</code> field contains the AI-generated {selectedCategoryInfo.id === 'sms' ? 'SMS message' : selectedCategoryInfo.id === 'email' ? 'email content' : 'call script'} that would normally be sent to the contact.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Quick Summary */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Zap className="h-4 w-4 text-green-600 mt-0.5" />
                      <div>
                        <h5 className="text-sm font-medium text-green-900">Quick Summary</h5>
                        <ol className="text-xs text-green-700 mt-2 space-y-1 list-decimal list-inside">
                          <li>Add <code className="bg-green-100 px-1">destinationKey</code> to your API request</li>
                          <li>We generate the {selectedCategoryInfo.id === 'sms' ? 'SMS' : selectedCategoryInfo.id === 'email' ? 'email' : 'call'} content</li>
                          <li>Instead of sending it, we POST to your endpoint</li>
                          <li>You handle the content in your own system</li>
                        </ol>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Success */}
          {currentStep === 'success' && (
            <div className="text-center space-y-4 max-w-xl mx-auto">
              <div className="space-y-2">
                <div className="w-12 h-12 bg-green-100 rounded-full mx-auto flex items-center justify-center">
                  <Check className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Destination Created!</h3>
                <p className="text-sm text-gray-600">Your {selectedCategoryInfo?.label} destination is ready to use.</p>
              </div>

              {/* Destination Key */}
              <div className="bg-green-50 border border-green-200 rounded p-3">
                <div className="text-center space-y-2">
                  <h4 className="text-sm font-semibold text-green-900">Destination Key</h4>
                  <div className="bg-white border border-green-300 rounded p-2">
                    <div className="flex items-center justify-between gap-2">
                      <code className="text-xs font-mono text-green-800 font-semibold truncate">{generatedDestinationKey}</code>
                      <button
                        onClick={() => copyToClipboard(generatedDestinationKey)}
                        className="p-1 text-green-600 hover:text-green-700 hover:bg-green-100 rounded transition-colors flex-shrink-0"
                        title="Copy destination key"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-green-700">
                    Add <code className="bg-green-100 px-1 rounded text-xs">destinationKey: "{generatedDestinationKey}"</code> to API requests.
                  </p>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded p-3 text-left">
                <h4 className="text-xs font-semibold text-blue-900 mb-2">Next Steps:</h4>
                <div className="space-y-1 text-xs text-blue-700">
                  <div className="flex items-start gap-1">
                    <span className="text-blue-500">1.</span>
                    <span>Use key in API requests to /api/agent-communication/{config.category}/inbound or /outbound</span>
                  </div>
                  <div className="flex items-start gap-1">
                    <span className="text-blue-500">2.</span>
                    <span>Endpoint receives generated content instead of actual communications</span>
                  </div>
                  <div className="flex items-start gap-1">
                    <span className="text-blue-500">3.</span>
                    <span>Monitor endpoint to ensure webhook data is received correctly</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {currentStep === 'details' && (
          <div className="flex justify-between items-center gap-4 p-8 border-t border-gray-100">
            <button
              onClick={handleBackToCategory}
              className="px-6 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Back
            </button>
            <div className="flex items-center gap-3">
              <button
                onClick={handleSave}
                disabled={isSaving || !config.name.trim() || !config.endpoint.url.trim()}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Create Destination
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {currentStep === 'success' && (
          <div className="flex justify-center p-8 border-t border-gray-100">
            <button
              onClick={onClose}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}