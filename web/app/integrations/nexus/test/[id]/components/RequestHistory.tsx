'use client';

import { Play, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { ApiTestRequest, ApiTestResponse } from '../../../../types';

interface RequestHistoryProps {
  history: Array<{
    request: ApiTestRequest;
    response: ApiTestResponse;
    timestamp: string;
  }>;
  onReplayRequest: (request: ApiTestRequest) => void;
}

export default function RequestHistory({ history, onReplayRequest }: RequestHistoryProps) {
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

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

  const formatParams = (params: Record<string, any>) => {
    const filteredParams = Object.entries(params).filter(([_, value]) => value);
    if (filteredParams.length === 0) return 'No parameters';
    
    return filteredParams
      .slice(0, 3)
      .map(([key, value]) => `${key}=${value}`)
      .join(', ') + (filteredParams.length > 3 ? '...' : '');
  };

  if (history.length === 0) {
    return (
      <div className="text-center py-16">
        <Clock className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Request History</h3>
        <p className="text-gray-500">Your API test history will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Request History</h3>
        <span className="text-sm text-gray-500">{history.length} request{history.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="space-y-3">
        {history.map((item, index) => {
          const StatusIcon = getStatusIcon(item.response.status);
          
          return (
            <div
              key={index}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  {/* Request Summary */}
                  <div className="flex items-center gap-3 mb-2">
                    <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded">
                      {item.request.method}
                    </span>
                    <span className="font-medium text-gray-900">
                      /{item.request.endpoint}
                    </span>
                    <div className="flex items-center gap-1">
                      <StatusIcon className={`h-4 w-4 ${getStatusColor(item.response.status)}`} />
                      <span className={`text-sm font-medium ${getStatusColor(item.response.status)}`}>
                        {item.response.status}
                      </span>
                    </div>
                  </div>

                  {/* Parameters */}
                  <div className="text-sm text-gray-600 mb-2">
                    <span className="font-medium">Parameters:</span> {formatParams(item.request.params)}
                  </div>

                  {/* Timestamp */}
                  <div className="text-xs text-gray-500">
                    {formatTimestamp(item.timestamp)}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 ml-4">
                  <span className="text-xs text-gray-500">
                    {item.response.headers['x-response-time'] || 'N/A'}
                  </span>
                  <button
                    onClick={() => onReplayRequest(item.request)}
                    className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                    title="Replay this request"
                  >
                    <Play className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Response Preview */}
              {item.response.data && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="bg-gray-50 rounded p-3">
                    <div className="text-xs text-gray-500 mb-1">Response Preview:</div>
                    <pre className="text-xs text-gray-700 overflow-x-auto whitespace-pre-wrap max-h-20">
                      {JSON.stringify(item.response.data, null, 2).slice(0, 200)}
                      {JSON.stringify(item.response.data, null, 2).length > 200 && '...'}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {history.length >= 10 && (
        <div className="text-center py-4 text-sm text-gray-500">
          Showing the 10 most recent requests
        </div>
      )}
    </div>
  );
}