'use client';

import { useState } from 'react';
import { Clock, RefreshCw, AlertCircle } from 'lucide-react';
import { DataSource } from '../../../../types';

interface SyncSettingsProps {
  dataSource: DataSource;
  onUpdate: (dataSource: DataSource) => void;
}

interface SyncSettings {
  frequency: 'real-time' | 'hourly' | 'daily' | 'manual';
  enabled: boolean;
  retryAttempts: number;
  timeout: number;
  webhookUrl?: string;
}

export default function SyncSettingsSection({ dataSource, onUpdate }: SyncSettingsProps) {
  const [syncSettings, setSyncSettings] = useState<SyncSettings>({
    frequency: 'hourly',
    enabled: true,
    retryAttempts: 3,
    timeout: 30,
    webhookUrl: ''
  });

  const handleSettingChange = (field: keyof SyncSettings, value: any) => {
    setSyncSettings(prev => ({ ...prev, [field]: value }));
  };

  const frequencyOptions = [
    { value: 'real-time', label: 'Real-time (Webhooks)', description: 'Instant updates when data changes' },
    { value: 'hourly', label: 'Every Hour', description: 'Sync data every hour' },
    { value: 'daily', label: 'Daily', description: 'Sync data once per day' },
    { value: 'manual', label: 'Manual Only', description: 'Sync only when triggered manually' }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Synchronization Settings</h3>
        <p className="text-gray-500">Configure how and when data is synchronized between systems</p>
      </div>

      {/* Sync Enabled Toggle */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <RefreshCw className="h-5 w-5 text-gray-600" />
            <div>
              <h4 className="font-medium text-gray-900">Enable Synchronization</h4>
              <p className="text-sm text-gray-500">Allow automatic data synchronization</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={syncSettings.enabled}
              onChange={(e) => handleSettingChange('enabled', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
          </label>
        </div>
      </div>

      {syncSettings.enabled && (
        <>
          {/* Sync Frequency */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Sync Frequency
            </label>
            <div className="space-y-2">
              {frequencyOptions.map(option => (
                <label key={option.value} className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="frequency"
                    value={option.value}
                    checked={syncSettings.frequency === option.value}
                    onChange={(e) => handleSettingChange('frequency', e.target.value)}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                  />
                  <div className="ml-3">
                    <div className="text-sm font-medium text-gray-900">{option.label}</div>
                    <div className="text-xs text-gray-500">{option.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Real-time Settings */}
          {syncSettings.frequency === 'real-time' && (
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-blue-900">Webhook Configuration Required</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    Real-time sync requires webhook support from the data source. Configure the webhook URL below.
                  </p>
                  <div className="mt-3">
                    <label className="block text-xs font-medium text-blue-900 mb-1">
                      Webhook URL (to be provided to external system)
                    </label>
                    <input
                      type="url"
                      value={`https://api.yourapp.com/webhooks/${dataSource.id}`}
                      readOnly
                      className="w-full px-3 py-2 text-sm bg-white border border-blue-200 rounded-md"
                    />
                    <p className="text-xs text-blue-600 mt-1">
                      Configure this URL in your external system's webhook settings
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Advanced Settings */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-900">Advanced Settings</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Retry Attempts
                </label>
                <select
                  value={syncSettings.retryAttempts}
                  onChange={(e) => handleSettingChange('retryAttempts', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value={1}>1 attempt</option>
                  <option value={3}>3 attempts</option>
                  <option value={5}>5 attempts</option>
                  <option value={10}>10 attempts</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Number of times to retry failed sync operations
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Request Timeout (seconds)
                </label>
                <select
                  value={syncSettings.timeout}
                  onChange={(e) => handleSettingChange('timeout', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value={10}>10 seconds</option>
                  <option value={30}>30 seconds</option>
                  <option value={60}>60 seconds</option>
                  <option value={120}>2 minutes</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Maximum time to wait for API responses
                </p>
              </div>
            </div>
          </div>

          {/* Sync History */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4 text-gray-600" />
              <h4 className="text-sm font-medium text-gray-900">Recent Sync Activity</h4>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Last successful sync:</span>
                <span className="font-medium">2 minutes ago</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Records synced:</span>
                <span className="font-medium">1,247</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Sync duration:</span>
                <span className="font-medium">23 seconds</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Success rate (24h):</span>
                <span className="font-medium text-green-600">98.5%</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}