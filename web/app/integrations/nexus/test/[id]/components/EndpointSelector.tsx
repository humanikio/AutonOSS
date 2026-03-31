'use client';

import { DataSource } from '../../../../types';

interface EndpointSelectorProps {
  dataSource: DataSource;
  selectedEndpoint: string;
  selectedMethod: string;
  onEndpointChange: (endpoint: string) => void;
  onMethodChange: (method: string) => void;
}

export default function EndpointSelector({
  dataSource,
  selectedEndpoint,
  selectedMethod,
  onEndpointChange,
  onMethodChange
}: EndpointSelectorProps) {
  const methods = ['GET', 'POST', 'PUT', 'DELETE'];
  
  const endpointDescriptions: Record<string, string> = {
    contacts: 'Find and retrieve person/contact information',
    appointments: 'Manage appointments and scheduling',
    vehicles: 'Access vehicle inventory and details',
    workorders: 'Create and manage work orders',
    cases: 'Handle support cases and requests',
    permits: 'Manage permits and applications'
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Endpoint Selection</h3>
      
      <div className="space-y-4">
        {/* HTTP Method */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            HTTP Method
          </label>
          <div className="flex gap-2">
            {methods.map(method => (
              <button
                key={method}
                onClick={() => onMethodChange(method)}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  selectedMethod === method
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {method}
              </button>
            ))}
          </div>
        </div>

        {/* Endpoint */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Endpoint
          </label>
          <div className="space-y-2">
            {dataSource.endpoints.map(endpoint => (
              <button
                key={endpoint.name}
                onClick={() => onEndpointChange(endpoint.name)}
                disabled={!endpoint.enabled}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  selectedEndpoint === endpoint.name
                    ? 'border-primary-600 bg-primary-50'
                    : endpoint.enabled
                    ? 'border-gray-200 hover:border-gray-300 bg-white'
                    : 'border-gray-200 bg-gray-50 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      endpoint.enabled ? 'bg-green-500' : 'bg-gray-400'
                    }`} />
                    <span className={`font-medium ${
                      endpoint.enabled ? 'text-gray-900' : 'text-gray-400'
                    }`}>
                      /{endpoint.name}
                    </span>
                  </div>
                  <span className={`text-xs ${
                    endpoint.enabled ? 'text-gray-500' : 'text-gray-400'
                  }`}>
                    {endpoint.recordCount.toLocaleString()} records
                  </span>
                </div>
                {endpointDescriptions[endpoint.name] && (
                  <p className={`text-xs mt-1 ${
                    endpoint.enabled ? 'text-gray-500' : 'text-gray-400'
                  }`}>
                    {endpointDescriptions[endpoint.name]}
                  </p>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Endpoint Info */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Request URL</h4>
          <code className="text-xs text-gray-600 bg-white px-2 py-1 rounded border break-all">
            {selectedMethod} {dataSource.apiEndpoint}/api/{selectedEndpoint}
          </code>
        </div>
      </div>
    </div>
  );
}