'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Settings, TestTube, RefreshCw, TrendingUp } from 'lucide-react';
import { DataSource, ActivityLog } from '../../../types';
import StatusIndicator from '../../../components/StatusIndicator';
import ActivityFeed from './components/ActivityFeed';
import EndpointMetrics from './components/EndpointMetrics';
import SyncMetrics from './components/SyncMetrics';
import RecentErrors from './components/RecentErrors';

interface DataSourceDetailsProps {
  params: Promise<{ id: string }>;
}

export default function DataSourceDetails({ params }: DataSourceDetailsProps) {
  const router = useRouter();
  const resolvedParams = use(params);
  const [dataSource, setDataSource] = useState<DataSource | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    // Mock data fetch
    const mockDataSource: DataSource = {
      id: resolvedParams.id,
      name: 'Reynolds Dealership North',
      type: 'automotive',
      provider: 'Reynolds & Reynolds',
      status: 'active',
      lastSync: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
      totalRecords: 15247,
      endpoints: [
        { name: 'contacts', recordCount: 15120, enabled: true },
        { name: 'appointments', recordCount: 89, enabled: true },
        { name: 'vehicles', recordCount: 1248, enabled: true },
        { name: 'workorders', recordCount: 456, enabled: true }
      ],
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
      apiEndpoint: 'https://api.reynolds.com/v1',
      authType: 'api_key',
      description: 'Main dealership management system for North location'
    };

    const mockActivityLogs: ActivityLog[] = [
      {
        id: '1',
        dataSourceId: resolvedParams.id,
        action: 'sync',
        details: 'Contact sync completed',
        recordCount: 125,
        timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
        status: 'success'
      },
      {
        id: '2',
        dataSourceId: resolvedParams.id,
        action: 'sync',
        details: 'Appointment sync completed',
        recordCount: 8,
        timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        status: 'success'
      },
      {
        id: '3',
        dataSourceId: resolvedParams.id,
        action: 'test',
        details: 'API connection test performed',
        timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        status: 'success'
      },
      {
        id: '4',
        dataSourceId: resolvedParams.id,
        action: 'sync',
        details: 'Vehicle sync completed',
        recordCount: 42,
        timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        status: 'success'
      },
      {
        id: '5',
        dataSourceId: resolvedParams.id,
        action: 'config_change',
        details: 'Field mapping updated for contact.phone',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        status: 'success'
      }
    ];

    setTimeout(() => {
      setDataSource(mockDataSource);
      setActivityLogs(mockActivityLogs);
      setLoading(false);
    }, 1000);
  }, [resolvedParams.id]);

  const handleSync = async () => {
    setSyncing(true);
    // Mock sync delay
    setTimeout(() => {
      setSyncing(false);
      // Add new activity log
      const newLog: ActivityLog = {
        id: Date.now().toString(),
        dataSourceId: resolvedParams.id,
        action: 'sync',
        details: 'Manual sync completed',
        recordCount: 156,
        timestamp: new Date().toISOString(),
        status: 'success'
      };
      setActivityLogs(prev => [newLog, ...prev]);
    }, 3000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-start justify-center pt-48">
        <div className="flex flex-col items-center">
          <div className="relative w-32 h-32 rounded-full bg-black overflow-hidden mb-4">
            <video
              autoPlay
              loop
              muted
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
            >
              <source src="/loading/loadingVideo.mp4" type="video/mp4" />
            </video>
          </div>
          <span className="text-gray-600 text-lg">Loading details...</span>
        </div>
      </div>
    );
  }

  if (!dataSource) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Data Source Not Found</h2>
          <button
            onClick={() => router.push('/integrations')}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Back to Integrations
          </button>
        </div>
      </div>
    );
  }

  const formatLastSync = (lastSync: string) => {
    const now = new Date();
    const syncTime = new Date(lastSync);
    const diffMs = now.getTime() - syncTime.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/integrations')}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-light text-gray-900">{dataSource.name}</h1>
                <StatusIndicator status={dataSource.status} />
              </div>
              <p className="mt-1 text-gray-500">{dataSource.provider} • {dataSource.type}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={handleSync}
              disabled={syncing}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:bg-gray-200 transition-colors flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync Now'}
            </button>
            <button
              onClick={() => router.push(`/integrations/test/${dataSource.id}`)}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
            >
              <TestTube className="h-4 w-4" />
              Test API
            </button>
            <button
              onClick={() => router.push(`/integrations/configure/${dataSource.id}`)}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              Configure
            </button>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Last Sync</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {formatLastSync(dataSource.lastSync)}
                </p>
              </div>
              <RefreshCw className="h-8 w-8 text-gray-400" />
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Records</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {dataSource.totalRecords.toLocaleString()}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Endpoints</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {dataSource.endpoints.filter(e => e.enabled).length}
                </p>
              </div>
              <div className="h-8 w-8 bg-primary-100 rounded-full flex items-center justify-center">
                <div className="h-4 w-4 bg-primary-600 rounded-full"></div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Uptime (24h)</p>
                <p className="text-2xl font-semibold text-green-600">99.8%</p>
              </div>
              <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                <div className="h-4 w-4 bg-green-500 rounded-full"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Sync Metrics */}
            <SyncMetrics dataSource={dataSource} />
            
            {/* Endpoint Metrics */}
            <EndpointMetrics dataSource={dataSource} />
            
            {/* Recent Errors */}
            <RecentErrors dataSourceId={dataSource.id} />
          </div>

          {/* Right Column */}
          <div className="space-y-8">
            {/* Activity Feed */}
            <ActivityFeed 
              activities={activityLogs} 
              onRefresh={() => {/* Refresh activities */}}
            />

            {/* Data Source Info */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Data Source Information</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Created:</span>
                  <span className="font-medium">
                    {new Date(dataSource.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Last Updated:</span>
                  <span className="font-medium">
                    {new Date(dataSource.updatedAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">API Endpoint:</span>
                  <span className="font-medium font-mono text-xs">
                    {dataSource.apiEndpoint}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Auth Type:</span>
                  <span className="font-medium capitalize">
                    {dataSource.authType?.replace('_', ' ')}
                  </span>
                </div>
              </div>
              
              {dataSource.description && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600">{dataSource.description}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}