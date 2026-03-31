'use client';

import { useState } from 'react';
import { Plus, Minus } from 'lucide-react';
import { ApiTestRequest } from '../../../../types';

interface RequestBuilderProps {
  request: ApiTestRequest;
  onRequestChange: (request: ApiTestRequest) => void;
}

export default function RequestBuilder({ request, onRequestChange }: RequestBuilderProps) {
  const [customParams, setCustomParams] = useState<Array<{ key: string; value: string }>>([
    { key: '', value: '' }
  ]);

  const handleParamChange = (key: string, value: string) => {
    onRequestChange({
      ...request,
      params: { ...request.params, [key]: value }
    });
  };

  const handleCustomParamChange = (index: number, field: 'key' | 'value', value: string) => {
    const updated = [...customParams];
    updated[index] = { ...updated[index], [field]: value };
    setCustomParams(updated);

    // Update request if both key and value are present
    if (updated[index].key && updated[index].value) {
      handleParamChange(updated[index].key, updated[index].value);
    }
  };

  const addCustomParam = () => {
    setCustomParams([...customParams, { key: '', value: '' }]);
  };

  const removeCustomParam = (index: number) => {
    const updated = customParams.filter((_, i) => i !== index);
    setCustomParams(updated);
  };

  const commonParams = {
    contacts: [
      { key: 'phone', label: 'Phone Number', placeholder: '+14155551234', type: 'text' },
      { key: 'email', label: 'Email Address', placeholder: 'user@example.com', type: 'email' },
      { key: 'name', label: 'Name', placeholder: 'John Doe', type: 'text' },
      { key: 'limit', label: 'Limit', placeholder: '10', type: 'number' }
    ],
    appointments: [
      { key: 'contactId', label: 'Contact ID', placeholder: 'cnt_123', type: 'text' },
      { key: 'from', label: 'From Date', placeholder: '2024-01-01', type: 'date' },
      { key: 'to', label: 'To Date', placeholder: '2024-12-31', type: 'date' },
      { key: 'status', label: 'Status', placeholder: 'scheduled', type: 'text' }
    ],
    vehicles: [
      { key: 'vin', label: 'VIN', placeholder: '1HGCM82633A004352', type: 'text' },
      { key: 'make', label: 'Make', placeholder: 'Honda', type: 'text' },
      { key: 'model', label: 'Model', placeholder: 'Accord', type: 'text' },
      { key: 'year', label: 'Year', placeholder: '2024', type: 'number' }
    ],
    workorders: [
      { key: 'status', label: 'Status', placeholder: 'open', type: 'text' },
      { key: 'contactId', label: 'Contact ID', placeholder: 'cnt_123', type: 'text' },
      { key: 'vehicleVin', label: 'Vehicle VIN', placeholder: '1HGCM82633A004352', type: 'text' }
    ]
  };

  const endpointParams = commonParams[request.endpoint as keyof typeof commonParams] || [];

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Request Parameters</h3>
      
      <div className="space-y-4">
        {/* Required Parameters */}
        <div className="bg-blue-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-900 mb-2">Required Parameters</h4>
          <div>
            <label className="block text-xs font-medium text-blue-800 mb-1">
              Data Source ID
            </label>
            <input
              type="text"
              value={request.params.dataSourceId || ''}
              readOnly
              className="w-full px-3 py-2 text-sm bg-white border border-blue-200 rounded-md"
            />
          </div>
        </div>

        {/* Common Parameters */}
        {endpointParams.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">Common Parameters</h4>
            <div className="space-y-3">
              {endpointParams.map(param => (
                <div key={param.key}>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {param.label}
                  </label>
                  <input
                    type={param.type}
                    value={request.params[param.key] || ''}
                    onChange={(e) => handleParamChange(param.key, e.target.value)}
                    placeholder={param.placeholder}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Custom Parameters */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-900">Custom Parameters</h4>
            <button
              onClick={addCustomParam}
              className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
            >
              <Plus className="h-4 w-4" />
              Add Parameter
            </button>
          </div>
          
          <div className="space-y-2">
            {customParams.map((param, index) => (
              <div key={index} className="flex gap-2 items-end">
                <div className="flex-1">
                  <input
                    type="text"
                    value={param.key}
                    onChange={(e) => handleCustomParamChange(index, 'key', e.target.value)}
                    placeholder="Parameter name"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div className="flex-1">
                  <input
                    type="text"
                    value={param.value}
                    onChange={(e) => handleCustomParamChange(index, 'value', e.target.value)}
                    placeholder="Value"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                {customParams.length > 1 && (
                  <button
                    onClick={() => removeCustomParam(index)}
                    className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Request Body (for POST/PUT) */}
        {(request.method === 'POST' || request.method === 'PUT') && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Request Body (JSON)
            </label>
            <textarea
              value={JSON.stringify({
                dataSourceId: request.params.dataSourceId,
                payload: {
                  name: "John Doe",
                  phone: "+14155551234",
                  email: "john.doe@example.com"
                }
              }, null, 2)}
              onChange={() => {/* Handle body change */}}
              rows={8}
              className="w-full px-3 py-2 text-sm font-mono border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder='{\n  "key": "value"\n}'
            />
          </div>
        )}

        {/* Headers */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">Headers</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
              <span className="text-gray-600">Content-Type:</span>
              <span className="font-mono">application/json</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
              <span className="text-gray-600">Authorization:</span>
              <span className="font-mono">Bearer •••••••••••••</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
              <span className="text-gray-600">X-Tenant-ID:</span>
              <span className="font-mono">tn_example123</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}