'use client';

import { Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { DataSource } from '../../../../types';

interface SyncMetricsProps {
  dataSource: DataSource;
}

export default function SyncMetrics({ dataSource }: SyncMetricsProps) {
  // Mock sync data for the last 24 hours
  const syncData = Array.from({ length: 24 }, (_, i) => ({
    hour: 23 - i,
    successful: Math.floor(Math.random() * 50 + 10),
    failed: Math.floor(Math.random() * 5),
    duration: Math.floor(Math.random() * 30 + 15) // seconds
  }));

  const totalSuccess = syncData.reduce((acc, d) => acc + d.successful, 0);
  const totalFailed = syncData.reduce((acc, d) => acc + d.failed, 0);
  const successRate = totalSuccess / (totalSuccess + totalFailed) * 100;
  const avgDuration = syncData.reduce((acc, d) => acc + d.duration, 0) / syncData.length;

  const maxSyncs = Math.max(...syncData.map(d => d.successful + d.failed));

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-6">Sync Performance (24h)</h3>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="flex items-center gap-4 p-4 bg-green-50 rounded-lg">
          <CheckCircle className="h-8 w-8 text-green-600" />
          <div>
            <div className="text-2xl font-semibold text-green-600">{successRate.toFixed(1)}%</div>
            <div className="text-sm text-green-700">Success Rate</div>
          </div>
        </div>

        <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg">
          <Clock className="h-8 w-8 text-blue-600" />
          <div>
            <div className="text-2xl font-semibold text-blue-600">{avgDuration.toFixed(0)}s</div>
            <div className="text-sm text-blue-700">Avg Duration</div>
          </div>
        </div>

        <div className="flex items-center gap-4 p-4 bg-red-50 rounded-lg">
          <AlertTriangle className="h-8 w-8 text-red-600" />
          <div>
            <div className="text-2xl font-semibold text-red-600">{totalFailed}</div>
            <div className="text-sm text-red-700">Failed Syncs</div>
          </div>
        </div>
      </div>

      {/* Sync Chart */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-medium text-gray-900">Hourly Sync Activity</h4>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span className="text-gray-600">Successful</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded"></div>
              <span className="text-gray-600">Failed</span>
            </div>
          </div>
        </div>

        <div className="flex items-end justify-between h-32 bg-gray-50 rounded p-4 gap-1">
          {syncData.reverse().map((data, index) => {
            const totalHeight = ((data.successful + data.failed) / maxSyncs) * 100;
            const successHeight = (data.successful / (data.successful + data.failed)) * totalHeight;
            
            return (
              <div key={index} className="flex flex-col items-center gap-1 flex-1">
                <div className="w-full max-w-4 relative" style={{ height: '80px' }}>
                  {/* Failed syncs (red, on top) */}
                  <div
                    className="bg-red-500 w-full absolute bottom-0 rounded-t"
                    style={{ height: `${totalHeight}%` }}
                  />
                  {/* Successful syncs (green, overlay) */}
                  <div
                    className="bg-green-500 w-full absolute bottom-0 rounded-t"
                    style={{ height: `${successHeight}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500">
                  {data.hour === 0 ? 'Now' : `${data.hour}h`}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Sync Details */}
      <div className="border-t border-gray-200 pt-6">
        <h4 className="text-sm font-medium text-gray-900 mb-4">Recent Sync Sessions</h4>
        <div className="space-y-3">
          {[
            { time: '2 minutes ago', records: 125, duration: 23, status: 'success' },
            { time: '1 hour ago', records: 89, duration: 18, status: 'success' },
            { time: '3 hours ago', records: 0, duration: 0, status: 'failed' },
            { time: '6 hours ago', records: 156, duration: 31, status: 'success' }
          ].map((sync, index) => (
            <div key={index} className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${
                  sync.status === 'success' ? 'bg-green-500' : 'bg-red-500'
                }`} />
                <span className="text-sm text-gray-900">{sync.time}</span>
              </div>
              
              <div className="flex items-center gap-6 text-sm text-gray-600">
                {sync.status === 'success' ? (
                  <>
                    <span>{sync.records} records</span>
                    <span>{sync.duration}s</span>
                  </>
                ) : (
                  <span className="text-red-600">Connection failed</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}