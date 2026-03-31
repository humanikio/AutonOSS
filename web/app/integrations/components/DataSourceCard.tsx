'use client';

import { useState } from 'react';
import { MoreVertical, TestTube, Settings, Eye, Trash2, RefreshCw, AlertCircle } from 'lucide-react';
import { DataSource } from '../types';
import StatusIndicator from './StatusIndicator';
import DropdownMenu from './DropdownMenu';

interface DataSourceCardProps {
  dataSource: DataSource;
  onTest: () => void;
  onEdit: () => void;
  onViewDetails: () => void;
  onDelete: () => void;
}

export default function DataSourceCard({ 
  dataSource, 
  onTest, 
  onEdit, 
  onViewDetails, 
  onDelete 
}: DataSourceCardProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const getProviderIcon = (provider: string) => {
    const icons: Record<string, string> = {
      'Reynolds & Reynolds': '🚗',
      'CDK Global': '🏪',
      'Accela': '🏛️',
      'DealerSocket': '🔧'
    };
    return icons[provider] || '🔗';
  };

  const formatLastSync = (lastSync: string) => {
    const now = new Date();
    const syncTime = new Date(lastSync);
    const diffMs = now.getTime() - syncTime.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  const handleSync = async () => {
    setSyncing(true);
    // Mock sync delay
    setTimeout(() => {
      setSyncing(false);
    }, 2000);
  };

  const dropdownItems = [
    { icon: Eye, label: 'View Details', onClick: onViewDetails },
    { icon: Settings, label: 'Configure', onClick: onEdit },
    { icon: TestTube, label: 'Test API', onClick: onTest },
    { icon: RefreshCw, label: 'Sync Now', onClick: handleSync },
    { icon: Trash2, label: 'Delete', onClick: onDelete, danger: true }
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 hover:border-gray-300 hover:shadow-sm transition-all">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-4 flex-1">
          {/* Provider Icon */}
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-2xl">
              {getProviderIcon(dataSource.provider)}
            </div>
          </div>

          {/* Data Source Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-medium text-gray-900 truncate">
                {dataSource.name}
              </h3>
              <StatusIndicator status={dataSource.status} />
            </div>

            <div className="space-y-1 text-sm text-gray-600">
              <div className="flex items-center gap-4">
                <span>{dataSource.provider}</span>
                <span>•</span>
                <span className="capitalize">{dataSource.type}</span>
              </div>
              
              <div className="flex items-center gap-4">
                <span>Last sync: {formatLastSync(dataSource.lastSync)}</span>
                {syncing && (
                  <div className="flex items-center gap-1 text-primary-600">
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    <span>Syncing...</span>
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-4">
                <span>{dataSource.totalRecords.toLocaleString()} records</span>
                <span>•</span>
                <span>{dataSource.endpoints.length} endpoints</span>
              </div>
            </div>

            {/* Error Message */}
            {dataSource.status === 'error' && (
              <div className="mt-3 flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>Connection failed - check configuration</span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onTest}
            className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
          >
            <TestTube className="h-4 w-4" />
            Test
          </button>
          
          <button
            onClick={onEdit}
            className="px-3 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            Configure
          </button>

          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
            
            {showDropdown && (
              <DropdownMenu
                items={dropdownItems}
                onClose={() => setShowDropdown(false)}
              />
            )}
          </div>
        </div>
      </div>

      {/* Endpoints Overview */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex flex-wrap gap-2">
          {dataSource.endpoints.slice(0, 4).map(endpoint => (
            <div
              key={endpoint.name}
              className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-md flex items-center gap-1"
            >
              <div className={`w-2 h-2 rounded-full ${endpoint.enabled ? 'bg-green-500' : 'bg-gray-400'}`} />
              <span className="capitalize">{endpoint.name}</span>
              <span>({endpoint.recordCount.toLocaleString()})</span>
            </div>
          ))}
          
          {dataSource.endpoints.length > 4 && (
            <div className="px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded-md">
              +{dataSource.endpoints.length - 4} more
            </div>
          )}
        </div>
      </div>
    </div>
  );
}