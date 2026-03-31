'use client';

import { useState } from 'react';
import { X, Plus, Trash2, AlertCircle, CheckCircle, Globe, Settings, Code, Clock } from 'lucide-react';
import { customToolsAPI, CustomToolRequest } from '@/lib/api/customTools';

interface CustomToolModalProps {
  isOpen: boolean;
  onClose: () => void;
  onToolCreated: (tool: any) => void;
}

export default function CustomToolModal({ isOpen, onClose, onToolCreated }: CustomToolModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<CustomToolRequest>({
    name: '',
    description: '',
    webhookUrl: '',
    method: 'POST',
    pathParams: {},
    queryParams: {},
    requestBody: {},
    requestHeaders: {},
    responseTimeout: 10,
    disableInterruptions: false,
    forcePreToolSpeech: false
  });

  const [newParam, setNewParam] = useState({ key: '', value: '', type: 'string' });
  const [newHeader, setNewHeader] = useState({ key: '', value: '' });

  const handleInputChange = (field: keyof CustomToolRequest, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const addParameter = (type: 'pathParams' | 'queryParams' | 'requestBody') => {
    if (!newParam.key.trim()) return;
    
    const value = newParam.type === 'number' ? Number(newParam.value) : 
                  newParam.type === 'boolean' ? newParam.value === 'true' : 
                  newParam.value;
    
    setFormData(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [newParam.key]: value
      }
    }));
    
    setNewParam({ key: '', value: '', type: 'string' });
  };

  const removeParameter = (type: 'pathParams' | 'queryParams' | 'requestBody', key: string) => {
    setFormData(prev => ({
      ...prev,
      [type]: Object.fromEntries(Object.entries(prev[type] || {}).filter(([k]) => k !== key))
    }));
  };

  const addHeader = () => {
    if (!newHeader.key.trim() || !newHeader.value.trim()) return;
    
    setFormData(prev => ({
      ...prev,
      requestHeaders: {
        ...prev.requestHeaders,
        [newHeader.key]: newHeader.value
      }
    }));
    
    setNewHeader({ key: '', value: '' });
  };

  const removeHeader = (key: string) => {
    setFormData(prev => ({
      ...prev,
      requestHeaders: Object.fromEntries(Object.entries(prev.requestHeaders || {}).filter(([k]) => k !== key))
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Validation
      if (!formData.name.trim()) {
        throw new Error('Tool name is required');
      }
      if (!formData.description.trim()) {
        throw new Error('Tool description is required');
      }
      if (!formData.webhookUrl.trim()) {
        throw new Error('Webhook URL is required');
      }

      // Validate URL format
      try {
        new URL(formData.webhookUrl);
      } catch {
        throw new Error('Please enter a valid URL');
      }

      const createdTool = await customToolsAPI.createCustomTool(formData);
      
      setSuccess('Custom tool created successfully!');
      onToolCreated(createdTool);
      
      // Reset form
      setTimeout(() => {
        onClose();
        setFormData({
          name: '',
          description: '',
          webhookUrl: '',
          method: 'POST',
          pathParams: {},
          queryParams: {},
          requestBody: {},
          requestHeaders: {},
          responseTimeout: 10,
          disableInterruptions: false,
          forcePreToolSpeech: false
        });
        setSuccess(null);
      }, 1500);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create custom tool');
    } finally {
      setLoading(false);
    }
  };

  const renderParameterSection = (
    title: string, 
    type: 'pathParams' | 'queryParams' | 'requestBody',
    description: string
  ) => (
    <div>
      <h4 className="font-medium text-gray-900 mb-2">{title}</h4>
      <p className="text-sm text-gray-600 mb-3">{description}</p>
      
      {/* Add new parameter */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        <input
          type="text"
          placeholder="Key"
          value={newParam.key}
          onChange={(e) => setNewParam(prev => ({ ...prev, key: e.target.value }))}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={newParam.type}
          onChange={(e) => setNewParam(prev => ({ ...prev, type: e.target.value }))}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="string">String</option>
          <option value="number">Number</option>
          <option value="boolean">Boolean</option>
        </select>
        <input
          type={newParam.type === 'number' ? 'number' : 'text'}
          placeholder="Value"
          value={newParam.value}
          onChange={(e) => setNewParam(prev => ({ ...prev, value: e.target.value }))}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="button"
          onClick={() => addParameter(type)}
          className="btn-secondary text-sm px-3 py-2"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Existing parameters */}
      <div className="space-y-2">
        {Object.entries(formData[type] || {}).map(([key, value]) => (
          <div key={key} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-md">
            <div className="flex items-center gap-3">
              <span className="font-medium text-sm">{key}:</span>
              <span className="text-sm text-gray-600">{String(value)}</span>
              <span className="text-xs text-gray-400">({typeof value})</span>
            </div>
            <button
              type="button"
              onClick={() => removeParameter(type, key)}
              className="text-red-600 hover:text-red-800"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Globe className="h-5 w-5 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Create Custom Webhook Tool</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Status Messages */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <span className="text-sm text-red-800">{error}</span>
              </div>
            )}
            
            {success && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-md flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-800">{success}</span>
              </div>
            )}

            {/* Basic Information */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Code className="h-5 w-5" />
                Basic Information
              </h3>
              
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tool Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Get Weather Data"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description *
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Describe what this tool does and when the agent should use it..."
                    required
                  />
                </div>
              </div>
            </div>

            {/* Webhook Configuration */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Webhook Configuration
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Webhook URL *
                  </label>
                  <input
                    type="url"
                    value={formData.webhookUrl}
                    onChange={(e) => handleInputChange('webhookUrl', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://api.example.com/webhook"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    HTTP Method
                  </label>
                  <select
                    value={formData.method}
                    onChange={(e) => handleInputChange('method', e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="PATCH">PATCH</option>
                    <option value="DELETE">DELETE</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Parameters */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Request Parameters</h3>
              
              <div className="space-y-6">
                {renderParameterSection(
                  'Path Parameters',
                  'pathParams',
                  'Parameters that will be part of the URL path (e.g., /api/users/{userId})'
                )}
                
                {renderParameterSection(
                  'Query Parameters',
                  'queryParams',
                  'Parameters that will be added to the URL as query string (e.g., ?limit=10&sort=name)'
                )}
                
                {renderParameterSection(
                  'Request Body',
                  'requestBody',
                  'Data that will be sent in the request body (for POST, PUT, PATCH requests)'
                )}
              </div>
            </div>

            {/* Headers */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Request Headers</h4>
              <p className="text-sm text-gray-600">Custom headers to include with the request</p>
              
              {/* Add new header */}
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="Header name (e.g., Authorization)"
                  value={newHeader.key}
                  onChange={(e) => setNewHeader(prev => ({ ...prev, key: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  placeholder="Header value"
                  value={newHeader.value}
                  onChange={(e) => setNewHeader(prev => ({ ...prev, value: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={addHeader}
                  className="btn-secondary text-sm px-3 py-2"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              {/* Existing headers */}
              <div className="space-y-2">
                {Object.entries(formData.requestHeaders || {}).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-md">
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-sm">{key}:</span>
                      <span className="text-sm text-gray-600">{value}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeHeader(key)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Advanced Settings */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Advanced Settings
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Response Timeout (seconds)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={formData.responseTimeout}
                    onChange={(e) => handleInputChange('responseTimeout', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div className="space-y-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.disableInterruptions}
                      onChange={(e) => handleInputChange('disableInterruptions', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Disable Interruptions</span>
                  </label>
                  <p className="text-xs text-gray-500 ml-6">Prevent customer from interrupting while tool is running</p>
                  
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.forcePreToolSpeech}
                      onChange={(e) => handleInputChange('forcePreToolSpeech', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Force Pre-Tool Speech</span>
                  </label>
                  <p className="text-xs text-gray-500 ml-6">Ensure agent speaks before calling the tool</p>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              * Required fields
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="btn-primary flex items-center gap-2 px-6 py-2"
              >
                {loading ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Create Tool
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}