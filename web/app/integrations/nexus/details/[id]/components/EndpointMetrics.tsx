'use client';

import { TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';
import { DataSource } from '../../../../types';

interface EndpointMetricsProps {
  dataSource: DataSource;
}

export default function EndpointMetrics({ dataSource }: EndpointMetricsProps) {
  // Mock metrics data
  const endpointStats = dataSource.endpoints.map(endpoint => ({
    ...endpoint,
    successRate: Math.random() * 10 + 90, // 90-100%
    avgResponseTime: Math.floor(Math.random() * 200 + 100), // 100-300ms
    requestsToday: Math.floor(Math.random() * 1000 + 100),
    trend: Math.random() > 0.5 ? 'up' : 'down',
    trendValue: Math.floor(Math.random() * 20 + 5)
  }));

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-medium text-gray-900">Endpoint Performance</h3>
        <BarChart3 className="h-5 w-5 text-gray-400" />
      </div>

      <div className="space-y-4">
        {endpointStats.map(endpoint => (
          <div
            key={endpoint.name}
            className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${
                  endpoint.enabled ? 'bg-green-500' : 'bg-gray-400'
                }`} />
                <h4 className="font-medium text-gray-900 capitalize">
                  /{endpoint.name}
                </h4>
              </div>
              
              <div className="flex items-center gap-2">
                {endpoint.trend === 'up' ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
                <span className={`text-sm font-medium ${
                  endpoint.trend === 'up' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {endpoint.trendValue}%
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Records:</span>
                <div className="font-medium">{endpoint.recordCount.toLocaleString()}</div>
              </div>
              
              <div>
                <span className="text-gray-500">Success Rate:</span>
                <div className="font-medium text-green-600">
                  {endpoint.successRate.toFixed(1)}%
                </div>
              </div>
              
              <div>
                <span className="text-gray-500">Avg Response:</span>
                <div className="font-medium">{endpoint.avgResponseTime}ms</div>
              </div>
              
              <div>
                <span className="text-gray-500">Requests Today:</span>
                <div className="font-medium">{endpoint.requestsToday.toLocaleString()}</div>
              </div>
            </div>

            {/* Mini Progress Bar */}
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                <span>Success Rate</span>
                <span>{endpoint.successRate.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${endpoint.successRate}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="text-center">
            <div className="text-2xl font-semibold text-gray-900">
              {endpointStats.filter(e => e.enabled).length}
            </div>
            <div className="text-gray-500">Active Endpoints</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-semibold text-green-600">
              {(endpointStats.reduce((acc, e) => acc + e.successRate, 0) / endpointStats.length).toFixed(1)}%
            </div>
            <div className="text-gray-500">Avg Success Rate</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-semibold text-primary-600">
              {Math.floor(endpointStats.reduce((acc, e) => acc + e.avgResponseTime, 0) / endpointStats.length)}ms
            </div>
            <div className="text-gray-500">Avg Response Time</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-semibold text-gray-900">
              {endpointStats.reduce((acc, e) => acc + e.requestsToday, 0).toLocaleString()}
            </div>
            <div className="text-gray-500">Total Requests</div>
          </div>
        </div>
      </div>
    </div>
  );
}