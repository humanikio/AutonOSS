'use client';

import { RefreshCw, CheckCircle, AlertCircle, Settings, TestTube, Zap } from 'lucide-react';
import { ActivityLog } from '../../../../types';

interface ActivityFeedProps {
  activities: ActivityLog[];
  onRefresh: () => void;
}

export default function ActivityFeed({ activities, onRefresh }: ActivityFeedProps) {
  const getActivityIcon = (action: ActivityLog['action']) => {
    switch (action) {
      case 'sync': return RefreshCw;
      case 'test': return TestTube;
      case 'config_change': return Settings;
      case 'error': return AlertCircle;
      default: return Zap;
    }
  };

  const getActivityColor = (status: ActivityLog['status']) => {
    switch (status) {
      case 'success': return 'text-green-600 bg-green-100';
      case 'error': return 'text-red-600 bg-red-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const now = new Date();
    const activityTime = new Date(timestamp);
    const diffMs = now.getTime() - activityTime.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
        <button
          onClick={onRefresh}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      <div className="p-4">
        {activities.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 text-4xl mb-2">📊</div>
            <p className="text-gray-500">No recent activity</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity, index) => {
              const Icon = getActivityIcon(activity.action);
              const colorClasses = getActivityColor(activity.status);

              return (
                <div key={activity.id} className="flex items-start gap-3">
                  <div className={`p-2 rounded-full ${colorClasses} flex-shrink-0`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900">
                        {activity.details}
                      </p>
                      <span className="text-xs text-gray-500 flex-shrink-0">
                        {formatTimestamp(activity.timestamp)}
                      </span>
                    </div>
                    
                    {activity.recordCount && (
                      <p className="text-xs text-gray-600 mt-1">
                        {activity.recordCount.toLocaleString()} records processed
                      </p>
                    )}
                    
                    {index < activities.length - 1 && (
                      <div className="w-px h-4 bg-gray-200 ml-4 mt-2"></div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {activities.length > 0 && (
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-center">
          <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">
            View All Activity
          </button>
        </div>
      )}
    </div>
  );
}