'use client';

import { useState } from 'react';
import { X, TestTube, Check, AlertCircle } from 'lucide-react';
import { DataSource } from '../types';

interface AddDataSourceModalProps {
  onClose: () => void;
  onAdd: (dataSource: Omit<DataSource, 'id' | 'createdAt' | 'updatedAt'>) => void;
}

interface FormData {
  name: string;
  type: DataSource['type'];
  provider: string;
  apiEndpoint: string;
  authType: 'api_key' | 'oauth' | 'basic';
  apiKey: string;
  description: string;
}

export default function AddDataSourceModal({ onClose, onAdd }: AddDataSourceModalProps) {
  const [step, setStep] = useState(1);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    type: 'automotive',
    provider: '',
    apiEndpoint: '',
    authType: 'api_key',
    apiKey: '',
    description: ''
  });

  const providers = {
    automotive: ['Reynolds & Reynolds', 'CDK Global', 'DealerSocket', 'Automotivemastermind', 'Other'],
    government: ['Accela', 'Tyler Technologies', 'Socrata', 'Cartegraph', 'Other'],
    healthcare: ['Epic', 'Cerner', 'Allscripts', 'NextGen', 'Other'],
    other: ['Custom API', 'REST API', 'GraphQL API', 'Other']
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
      ...(field === 'type' ? { provider: '' } : {})
    }));
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);

    // Mock API test
    setTimeout(() => {
      const success = Math.random() > 0.3; // 70% success rate for demo
      setTestResult(success ? 'success' : 'error');
      setTesting(false);
    }, 2000);
  };

  const handleSubmit = () => {
    const newDataSource: Omit<DataSource, 'id' | 'createdAt' | 'updatedAt'> = {
      name: formData.name,
      type: formData.type,
      provider: formData.provider,
      status: 'inactive',
      lastSync: new Date().toISOString(),
      totalRecords: 0,
      endpoints: [],
      apiEndpoint: formData.apiEndpoint,
      authType: formData.authType,
      description: formData.description
    };

    onAdd(newDataSource);
  };

  const isStepValid = () => {
    switch (step) {
      case 1:
        return formData.name && formData.type && formData.provider;
      case 2:
        return formData.apiEndpoint && formData.apiKey;
      case 3:
        return testResult === 'success';
      default:
        return false;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Add Data Source</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center">
            {[1, 2, 3].map((stepNumber) => (
              <div key={stepNumber} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    stepNumber === step
                      ? 'bg-primary-600 text-white'
                      : stepNumber < step
                      ? 'bg-primary-100 text-primary-600'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {stepNumber < step ? <Check className="h-4 w-4" /> : stepNumber}
                </div>
                {stepNumber < 3 && (
                  <div
                    className={`w-16 h-1 mx-2 ${
                      stepNumber < step ? 'bg-primary-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-sm">
            <span className={step === 1 ? 'text-primary-600 font-medium' : 'text-gray-500'}>
              Basic Info
            </span>
            <span className={step === 2 ? 'text-primary-600 font-medium' : 'text-gray-500'}>
              Connection
            </span>
            <span className={step === 3 ? 'text-primary-600 font-medium' : 'text-gray-500'}>
              Test & Save
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data Source Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="e.g., Reynolds Dealership North"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => handleInputChange('type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="automotive">Automotive</option>
                  <option value="government">Government</option>
                  <option value="healthcare">Healthcare</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Provider
                </label>
                <select
                  value={formData.provider}
                  onChange={(e) => handleInputChange('provider', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  disabled={!formData.type}
                >
                  <option value="">Select a provider...</option>
                  {providers[formData.type]?.map(provider => (
                    <option key={provider} value={provider}>{provider}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Brief description of this data source..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  API Endpoint
                </label>
                <input
                  type="url"
                  value={formData.apiEndpoint}
                  onChange={(e) => handleInputChange('apiEndpoint', e.target.value)}
                  placeholder="https://api.example.com/v1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Authentication Type
                </label>
                <select
                  value={formData.authType}
                  onChange={(e) => handleInputChange('authType', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="api_key">API Key</option>
                  <option value="oauth">OAuth 2.0</option>
                  <option value="basic">Basic Auth</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {formData.authType === 'api_key' ? 'API Key' : 'Token'}
                </label>
                <input
                  type="password"
                  value={formData.apiKey}
                  onChange={(e) => handleInputChange('apiKey', e.target.value)}
                  placeholder="Enter your API key or token..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Test Connection</h3>
                <p className="text-gray-600 mb-6">
                  We'll test the connection to ensure everything is working properly
                </p>

                {!testResult && !testing && (
                  <button
                    onClick={handleTestConnection}
                    className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2 mx-auto"
                  >
                    <TestTube className="h-5 w-5" />
                    Test Connection
                  </button>
                )}

                {testing && (
                  <div className="flex items-center justify-center gap-3 text-primary-600">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
                    <span>Testing connection...</span>
                  </div>
                )}

                {testResult === 'success' && (
                  <div className="flex items-center justify-center gap-3 text-green-600 bg-green-50 px-4 py-3 rounded-lg">
                    <Check className="h-6 w-6" />
                    <span>Connection successful!</span>
                  </div>
                )}

                {testResult === 'error' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-center gap-3 text-red-600 bg-red-50 px-4 py-3 rounded-lg">
                      <AlertCircle className="h-6 w-6" />
                      <span>Connection failed. Please check your settings.</span>
                    </div>
                    <button
                      onClick={handleTestConnection}
                      className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2 mx-auto"
                    >
                      <TestTube className="h-5 w-5" />
                      Try Again
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
          <div className="flex gap-2">
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Back
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            
            {step < 3 ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={!isStepValid()}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!isStepValid()}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                Add Data Source
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}