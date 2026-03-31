'use client';

import { useState } from 'react';
import { CheckCircle, AlertCircle, Clock, Eye, Code } from 'lucide-react';
import { ApiTestResponse } from '../../../../types';

interface ResponseViewerProps {
  response: ApiTestResponse | null;
  loading: boolean;
}

export default function ResponseViewer({ response, loading }: ResponseViewerProps) {
  const [viewMode, setViewMode] = useState<'formatted' | 'raw'>('formatted');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex items-center gap-3 text-primary-600">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <span className="text-lg">Sending request...</span>
        </div>
      </div>
    );
  }

  if (!response) {
    return (
      <div className="text-center py-16">
        <Clock className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Response Yet</h3>
        <p className="text-gray-500">Send a request to see the response here</p>
      </div>
    );
  }

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return 'text-green-600';
    if (status >= 400 && status < 500) return 'text-orange-600';
    if (status >= 500) return 'text-red-600';
    return 'text-gray-600';
  };

  const getStatusIcon = (status: number) => {
    if (status >= 200 && status < 300) return CheckCircle;
    return AlertCircle;
  };

  const StatusIcon = getStatusIcon(response.status);

  const formatJsonData = (data: any) => {
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  };

  return (
    <div className="space-y-6">
      {/* Response Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <StatusIcon className={`h-6 w-6 ${getStatusColor(response.status)}`} />
          <div>
            <div className={`text-lg font-semibold ${getStatusColor(response.status)}`}>
              {response.status} {response.statusText}
            </div>
            <div className="text-sm text-gray-500">
              Response received at {new Date(response.timestamp).toLocaleTimeString()}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('formatted')}
            className={`px-3 py-2 text-sm rounded-md flex items-center gap-2 transition-colors ${
              viewMode === 'formatted'
                ? 'bg-primary-100 text-primary-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Eye className="h-4 w-4" />
            Formatted
          </button>
          <button
            onClick={() => setViewMode('raw')}
            className={`px-3 py-2 text-sm rounded-md flex items-center gap-2 transition-colors ${
              viewMode === 'raw'
                ? 'bg-primary-100 text-primary-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Code className="h-4 w-4" />
            Raw JSON
          </button>
        </div>
      </div>

      {/* Response Headers */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Response Headers</h4>
        <div className="space-y-2">
          {Object.entries(response.headers).map(([key, value]) => (
            <div key={key} className="flex justify-between items-center text-sm">
              <span className="text-gray-600 font-medium">{key}:</span>
              <span className="font-mono text-gray-800">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Response Body */}
      <div>
        <h4 className="text-sm font-medium text-gray-900 mb-3">Response Body</h4>
        
        {viewMode === 'formatted' && response.data ? (
          <div className="space-y-4">
            {/* Contact Information Card */}
            {response.data.id && response.data.name && (
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h5 className="font-medium text-gray-900">Contact Information</h5>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    ID: {response.data.id}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Name:</span>
                    <div className="font-medium">{response.data.name?.full || 'N/A'}</div>
                  </div>
                  
                  {response.data.phones?.[0] && (
                    <div>
                      <span className="text-gray-500">Phone:</span>
                      <div className="font-medium">{response.data.phones[0].e164}</div>
                    </div>
                  )}
                  
                  {response.data.emails?.[0] && (
                    <div>
                      <span className="text-gray-500">Email:</span>
                      <div className="font-medium">{response.data.emails[0].address}</div>
                    </div>
                  )}
                  
                  {response.data.address && (
                    <div>
                      <span className="text-gray-500">Address:</span>
                      <div className="font-medium">
                        {response.data.address.line1}, {response.data.address.city}, {response.data.address.region}
                      </div>
                    </div>
                  )}
                </div>

                {response.data.providerRefs && response.data.providerRefs.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <span className="text-xs text-gray-500">Provider References:</span>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {response.data.providerRefs.map((ref: any, index: number) => (
                        <span
                          key={index}
                          className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded"
                        >
                          {ref.provider}: {ref.id}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Raw JSON fallback */}
            <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
              <pre className="text-sm whitespace-pre-wrap">
                {formatJsonData(response.data)}
              </pre>
            </div>
          </div>
        ) : (
          <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
            <pre className="text-sm whitespace-pre-wrap">
              {formatJsonData(response.data)}
            </pre>
          </div>
        )}
      </div>

      {/* Response Metadata */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Response Metadata</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Status:</span>
            <div className="font-medium">{response.status}</div>
          </div>
          <div>
            <span className="text-gray-500">Response Time:</span>
            <div className="font-medium">{response.headers['x-response-time'] || 'N/A'}</div>
          </div>
          <div>
            <span className="text-gray-500">Rate Limit:</span>
            <div className="font-medium">{response.headers['x-ratelimit-remaining'] || 'N/A'}</div>
          </div>
          <div>
            <span className="text-gray-500">Content Type:</span>
            <div className="font-medium">{response.headers['content-type'] || 'N/A'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}