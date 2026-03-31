'use client';

import { useState } from 'react';
import { AlertCircle, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';

interface ErrorLog {
  id: string;
  timestamp: string;
  endpoint: string;
  error: string;
  details: string;
  statusCode?: number;
}

interface RecentErrorsProps {
  dataSourceId: string;
}

export default function RecentErrors({ dataSourceId }: RecentErrorsProps) {
  const [expandedError, setExpandedError] = useState<string | null>(null);

  // Mock error data
  const errors: ErrorLog[] = [
    {
      id: '1',
      timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      endpoint: 'contacts',
      error: 'Rate limit exceeded',
      details: 'API rate limit of 1000 requests per hour exceeded. Request was throttled.',
      statusCode: 429
    },
    {
      id: '2',
      timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
      endpoint: 'appointments',
      error: 'Authentication failed',
      details: 'Invalid API key provided in Authorization header. Please check your credentials.',
      statusCode: 401
    },
    {
      id: '3',
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      endpoint: 'vehicles',
      error: 'Timeout error',
      details: 'Request timed out after 30 seconds. The external API may be experiencing high load.',
      statusCode: 504
    }
  ];

  const formatTimestamp = (timestamp: string) => {
    const now = new Date();
    const errorTime = new Date(timestamp);
    const diffMs = now.getTime() - errorTime.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 1) {
      const diffMins = Math.floor(diffMs / (1000 * 60));
      return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    }
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  };

  const getStatusCodeColor = (code?: number) => {
    if (!code) return 'bg-gray-100 text-gray-700';
    if (code >= 400 && code < 500) return 'bg-orange-100 text-orange-700';
    if (code >= 500) return 'bg-red-100 text-red-700';
    return 'bg-gray-100 text-gray-700';
  };

  const toggleExpanded = (errorId: string) => {
    setExpandedError(expandedError === errorId ? null : errorId);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-medium text-gray-900">Recent Errors</h3>
          {errors.length > 0 && (
            <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded-full">
              {errors.length}
            </span>
          )}
        </div>
        <button className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">
          <span>View All</span>
          <ExternalLink className="h-3 w-3" />
        </button>
      </div>

      {errors.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-green-500 text-4xl mb-2">✓</div>
          <h4 className="text-lg font-medium text-gray-900 mb-1">No Recent Errors</h4>
          <p className="text-gray-500">Your data source is running smoothly</p>
        </div>
      ) : (
        <div className="space-y-3">
          {errors.map(error => (
            <div
              key={error.id}
              className="border border-red-200 rounded-lg p-4 bg-red-50"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-medium text-red-900">{error.error}</h4>
                      {error.statusCode && (
                        <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusCodeColor(error.statusCode)}`}>
                          {error.statusCode}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs text-red-700 mb-2">
                      <span className="font-medium">/{error.endpoint}</span>
                      <span>{formatTimestamp(error.timestamp)}</span>
                    </div>

                    {expandedError === error.id && (
                      <div className="bg-red-100 rounded p-3 mt-3">
                        <p className="text-xs text-red-800">{error.details}</p>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => toggleExpanded(error.id)}
                  className="p-1 text-red-600 hover:text-red-700 hover:bg-red-100 rounded transition-colors"
                >
                  {expandedError === error.id ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {errors.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">
              Error rate: <span className="font-medium text-red-600">2.1%</span> (last 24h)
            </span>
            <span className="text-gray-600">
              Last error: {formatTimestamp(errors[0].timestamp)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}