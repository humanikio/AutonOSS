'use client';

import { useState } from 'react';
import { Eye, EyeOff, TestTube, CheckCircle, AlertCircle } from 'lucide-react';
import { DataSource } from '../../../../types';

interface ConnectionSectionProps {
  dataSource: DataSource;
  onUpdate: (dataSource: DataSource) => void;
}

export default function ConnectionSection({ dataSource, onUpdate }: ConnectionSectionProps) {
  const [showApiKey, setShowApiKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

  const handleChange = (field: keyof DataSource, value: any) => {
    onUpdate({
      ...dataSource,
      [field]: value,
      updatedAt: new Date().toISOString()
    });
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);

    // Mock API test
    setTimeout(() => {
      const success = Math.random() > 0.3;
      setTestResult(success ? 'success' : 'error');
      setTesting(false);
    }, 2000);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            API Endpoint
          </label>
          <input
            type="url"
            value={dataSource.apiEndpoint || ''}
            onChange={(e) => handleChange('apiEndpoint', e.target.value)}
            placeholder="https://api.example.com/v1"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Authentication Type
          </label>
          <select
            value={dataSource.authType || 'api_key'}
            onChange={(e) => handleChange('authType', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="api_key">API Key</option>
            <option value="oauth">OAuth 2.0</option>
            <option value="basic">Basic Auth</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {dataSource.authType === 'api_key' ? 'API Key' : 'Token'}
        </label>
        <div className="relative">
          <input
            type={showApiKey ? 'text' : 'password'}
            value="sk-1234567890abcdef" // Mock API key
            onChange={(e) => {/* Handle API key change */}}
            className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          <button
            type="button"
            onClick={() => setShowApiKey(!showApiKey)}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
          >
            {showApiKey ? (
              <EyeOff className="h-5 w-5 text-gray-400" />
            ) : (
              <Eye className="h-5 w-5 text-gray-400" />
            )}
          </button>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          Keep this secure. It will be encrypted and stored safely.
        </p>
      </div>

      {/* Connection Test */}
      <div className="bg-gray-50 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Test Connection</h3>
          <button
            onClick={handleTestConnection}
            disabled={testing}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-primary-400 transition-colors flex items-center gap-2"
          >
            <TestTube className="h-4 w-4" />
            {testing ? 'Testing...' : 'Test Now'}
          </button>
        </div>

        {testing && (
          <div className="flex items-center gap-3 text-primary-600">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></div>
            <span>Testing connection to {dataSource.apiEndpoint}...</span>
          </div>
        )}

        {testResult === 'success' && (
          <div className="flex items-center gap-3 text-green-600 bg-green-50 px-4 py-3 rounded-lg">
            <CheckCircle className="h-5 w-5" />
            <div>
              <div className="font-medium">Connection successful!</div>
              <div className="text-sm">All endpoints are accessible and responding correctly.</div>
            </div>
          </div>
        )}

        {testResult === 'error' && (
          <div className="flex items-center gap-3 text-red-600 bg-red-50 px-4 py-3 rounded-lg">
            <AlertCircle className="h-5 w-5" />
            <div>
              <div className="font-medium">Connection failed</div>
              <div className="text-sm">Unable to authenticate with the provided credentials.</div>
            </div>
          </div>
        )}
      </div>

      {/* Available Endpoints */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Available Endpoints</h3>
        <div className="space-y-3">
          {dataSource.endpoints.map(endpoint => (
            <div
              key={endpoint.name}
              className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${endpoint.enabled ? 'bg-green-500' : 'bg-gray-400'}`} />
                <div>
                  <div className="font-medium capitalize">{endpoint.name}</div>
                  <div className="text-sm text-gray-500">
                    {endpoint.recordCount.toLocaleString()} records
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">
                  GET /api/{endpoint.name}
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={endpoint.enabled}
                    onChange={() => {/* Handle endpoint toggle */}}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}