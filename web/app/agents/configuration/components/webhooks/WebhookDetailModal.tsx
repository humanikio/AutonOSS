'use client';

import React, { useState, useEffect } from 'react';
import { X, Copy, Eye, EyeOff, Trash2, Settings, Shield, Info } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface WebhookDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  webhook: any;
  agentId: string;
  onDelete?: () => void;
}

type MenuSection = 'details' | 'authentication' | 'examples';

export default function WebhookDetailModal({
  isOpen,
  onClose,
  webhook,
  agentId,
  onDelete
}: WebhookDetailModalProps) {
  const { tenant } = useAuth();
  const [activeSection, setActiveSection] = useState<MenuSection>('details');
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);

  // Helper function to get the correct webhook URL with production base URL
  const getCorrectWebhookUrl = (webhook: any) => {
    const productionBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    // The encoded data can be in webhookUrl, encodedData, or metadata.encodedPayload
    const encodedData = webhook.encodedData || webhook.webhookUrl || webhook.metadata?.encodedPayload;
    return `${productionBaseUrl}/api/universal-message/${encodedData}`;
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // You could add a toast notification here
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const getWebhookExamplePayload = (webhook: any) => {
    if (!webhook) return {};

    const basePayload = {
      agentId,
      tenantId: tenant?.id || 'your-tenant-id',
      timestamp: new Date().toISOString(),
      webhookId: webhook.id || 'webhook-id'
    };

    if (webhook.method === 'inbound') {
      switch (webhook.channel) {
        case 'sms':
          return {
            ...basePayload,
            from: '+1234567890',
            messageContent: 'Hello, I need help with my account',
            
            // Optional contact creation fields (auto-creates contact if not exists)
            full_name: "John Smith",                // OR name, fullName
            first_name: "John",                     // OR firstName  
            last_name: "Smith",                     // OR lastName
            email: "john.smith@example.com"         // OR emailAddress
          };
        case 'email':
          return {
            ...basePayload,
            from: 'customer@example.com',
            subject: 'Support Request',
            messageContent: 'I need assistance with my recent order',
            
            // Optional contact creation fields (auto-creates contact if not exists)
            full_name: "Jane Doe",                  // OR name, fullName
            first_name: "Jane",                     // OR firstName
            last_name: "Doe",                       // OR lastName
            phone: "+1234567890"                    // OR phoneNumber
          };
        case 'phone':
          return {
            ...basePayload,
            from: '+1234567890',
            
            // Optional contact creation fields (auto-creates contact if not exists)
            full_name: "Mike Johnson",              // OR name, fullName
            first_name: "Mike",                     // OR firstName
            last_name: "Johnson",                   // OR lastName
            email: "mike.johnson@example.com"       // OR emailAddress
          };
      }
    } else {
      switch (webhook.channel) {
        case 'sms':
          return {
            ...basePayload,
            to: '+1234567890',
            
            // Optional contact creation fields (auto-creates contact if not exists)
            full_name: "Sarah Wilson",              // OR name, fullName
            first_name: "Sarah",                    // OR firstName
            last_name: "Wilson",                    // OR lastName
            email: "sarah.wilson@example.com"       // OR emailAddress
          };
        case 'email':
          return {
            ...basePayload,
            to: 'customer@example.com',
            subject: 'Re: Support Request',
            messageContent: 'Thank you for reaching out. We have received your inquiry.',
            
            // Optional contact creation fields (auto-creates contact if not exists)
            full_name: "David Brown",               // OR name, fullName
            first_name: "David",                    // OR firstName
            last_name: "Brown",                     // OR lastName
            phone: "+1234567890"                    // OR phoneNumber
          };
        case 'phone':
          return {
            ...basePayload,
            to: '+1234567890',
            
            // Optional contact creation fields (auto-creates contact if not exists)
            full_name: "Lisa Davis",                // OR name, fullName
            first_name: "Lisa",                     // OR firstName
            last_name: "Davis",                     // OR lastName
            email: "lisa.davis@example.com"         // OR emailAddress
          };
      }
    }
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this webhook? This action cannot be undone.')) {
      onDelete?.();
      onClose();
    }
  };

  const menuItems = [
    { id: 'details', label: 'Details', icon: Settings },
    { id: 'authentication', label: 'Authentication', icon: Shield },
    { id: 'examples', label: 'Examples', icon: Info }
  ];

  useEffect(() => {
    if (isOpen) {
      setActiveSection('details');
    }
  }, [isOpen]);

  if (!isOpen || !webhook) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex">
        {/* Sidebar Menu */}
        <div className="w-80 bg-gray-50 border-r border-gray-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Webhook Details</h2>
              <p className="text-sm text-gray-500 capitalize">{webhook.channel} {webhook.method}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>


          {/* Navigation Menu */}
          <nav className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id as MenuSection)}
                  className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeSection === item.id
                      ? 'bg-orange-100 text-orange-900 border border-orange-200'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-4 h-4 mr-3" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Delete Button */}
          <div className="mt-6">
            <button
              onClick={handleDelete}
              className="w-full flex items-center justify-center px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md border border-red-200"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Webhook
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Content Area */}
          <div className="flex-1 p-6 overflow-y-auto">
            {/* Details Section */}
            {activeSection === 'details' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Webhook Information</h3>
                  
                  {/* Webhook URL */}
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-orange-900">Webhook URL</span>
                      <button
                        onClick={() => copyToClipboard(getCorrectWebhookUrl(webhook))}
                        className="text-orange-600 hover:text-orange-800"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                    <code className="text-xs text-orange-700 font-mono break-all block">
                      {getCorrectWebhookUrl(webhook)}
                    </code>
                    <div className="mt-2 text-xs text-orange-600">
                      Status: <span className={webhook.isActive ? 'text-green-600' : 'text-red-600'}>
                        {webhook.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                        <p className="text-sm text-gray-900">{webhook.name || `${webhook.channel} ${webhook.method} webhook`}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Channel</label>
                        <p className="text-sm text-gray-900 capitalize">{webhook.channel}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Method</label>
                        <p className="text-sm text-gray-900 capitalize">{webhook.method}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Action ID</label>
                        <p className="text-sm text-gray-900 font-mono">{webhook.actionId}</p>
                      </div>
                    </div>

                    {webhook.description && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <p className="text-sm text-gray-900">{webhook.description}</p>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Created</label>
                      <p className="text-sm text-gray-900">
                        {webhook.createdAt ? new Date(webhook.createdAt).toLocaleString() : 'Unknown'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Authentication Section */}
            {activeSection === 'authentication' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Authentication</h3>
                  
                  <div className="space-y-4 border border-orange-200 bg-orange-50 rounded-lg p-4">
                    <div>
                      <h4 className="text-sm font-medium text-orange-900">🔑 Authentication</h4>
                      <p className="text-xs text-orange-700 mt-1">
                        <strong>IMPORTANT:</strong> Add these as HTTP headers in your external tools (n8n, GoHighLevel, etc.)
                      </p>
                    </div>
                    
                    {/* Username */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-orange-900">Username:</span>
                        <button
                          onClick={() => copyToClipboard(webhook.webhookId || '')}
                          className="text-orange-600 hover:text-orange-800"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                      <code className="text-xs text-orange-700 font-mono break-all block bg-white p-2 rounded border">
                        {webhook.webhookId || 'N/A'}
                      </code>
                    </div>

                    {/* Password */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-orange-900">Password:</span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                            className="text-orange-600 hover:text-orange-800"
                          >
                            {showWebhookSecret ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </button>
                          <button
                            onClick={() => copyToClipboard(webhook.webhookPassword || '')}
                            className="text-orange-600 hover:text-orange-800"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <code className="text-xs text-orange-700 font-mono break-all block bg-white p-2 rounded border">
                        {showWebhookSecret ? (webhook.webhookPassword || 'N/A') : '••••••••••••••••'}
                      </code>
                    </div>

                    <div className="bg-white border border-orange-200 rounded p-2 text-xs font-mono text-gray-800">
                      <div>Authorization: Basic [base64(username:password)]</div>
                      <div className="text-orange-600 text-xs mt-1">
                        Or use "Basic Auth" option in your tool with credentials above
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Examples Section */}
            {activeSection === 'examples' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Usage Examples</h3>
                  
                  <div className="space-y-4">
                    {/* Example Payload */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-sm font-medium text-gray-900">
                          {webhook.method === 'inbound' ? 'Inbound' : 'Outbound'} {webhook.channel.toUpperCase()} Payload Example
                        </h4>
                        <button
                          onClick={() => copyToClipboard(JSON.stringify(getWebhookExamplePayload(webhook), null, 2))}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <div className="relative">
                        <pre className="bg-gray-900 text-gray-100 p-3 rounded-lg text-xs overflow-x-auto">
{JSON.stringify(getWebhookExamplePayload(webhook), null, 2)}
                        </pre>
                      </div>
                    </div>

                    {/* Usage Instructions */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-blue-900 mb-2">Usage Instructions</h4>
                      <div className="text-xs text-blue-700 space-y-1">
                        <p>• Use this URL as a POST endpoint in your external systems (n8n, GoHighLevel, etc.)</p>
                        <p>• Add Authorization header with Basic Auth (see Authentication section)</p>
                        <p>• Set Content-Type to "application/json" for POST requests</p>
                        {webhook.method === 'inbound' ? (
                          <>
                            <p>• <strong>Required:</strong> "from" field (phone number, email, or contactId)</p>
                            {webhook.channel === 'sms' && (
                              <p>• <strong>Required:</strong> "message" field for SMS content</p>
                            )}
                          </>
                        ) : (
                          <>
                            <p>• <strong>Required:</strong> "to" field (phone number, email, or contactId)</p>
                            <p>• <strong>Required:</strong> "message" field for content</p>
                          </>
                        )}
                        <p>• <strong>Optional:</strong> Contact creation fields: full_name, first_name, last_name, email, phone</p>
                        <p className="text-blue-600">  → These fields will auto-create contacts if they don't exist in the system</p>
                      </div>
                    </div>
                    
                    {/* Field Mapping Information */}
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-green-900 mb-2">Field Mapping Options</h4>
                      <div className="text-xs text-green-700 space-y-1">
                        <p>Our system automatically maps common field name variations:</p>
                        <p>• <strong>Name:</strong> full_name, name, fullName</p>
                        <p>• <strong>First Name:</strong> first_name, firstName</p>
                        <p>• <strong>Last Name:</strong> last_name, lastName</p>
                        <p>• <strong>Email:</strong> email, emailAddress</p>
                        <p>• <strong>Phone:</strong> phone, phoneNumber</p>
                        <p className="text-green-600 mt-2">Use whichever naming convention matches your external system!</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
            <div className="flex justify-between items-center">
              <div className="text-xs text-gray-500">
                {webhook.channel.toUpperCase()} {webhook.method} • Created {webhook.createdAt ? new Date(webhook.createdAt).toLocaleDateString() : 'Unknown'}
              </div>
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}