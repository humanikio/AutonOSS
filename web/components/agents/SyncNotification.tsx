'use client';

import { useState } from 'react';
import { AlertTriangle, RefreshCw, X, CheckCircle } from 'lucide-react';
import { useKnowledgeSync } from '@/hooks/useKnowledgeSync';

interface SyncNotificationProps {
  className?: string;
}

export default function SyncNotification({ className = '' }: SyncNotificationProps) {
  const {
    hasChanges,
    changedTypes,
    affectedAgentsCount,
    isSyncing,
    syncAll,
    error,
    changes
  } = useKnowledgeSync();

  const [isDismissed, setIsDismissed] = useState(false);
  const [syncResults, setSyncResults] = useState<any>(null);

  // Debug logging
  console.log('SyncNotification Debug:', {
    hasChanges,
    changedTypes,
    affectedAgentsCount,
    changes,
    error,
    isDismissed
  });

  // Don't show if there are no changes, dismissed, or if there are API errors (like 429)
  if (!hasChanges || isDismissed || !changes || error?.includes('Rate limited')) {
    return null;
  }

  const handleSync = async () => {
    try {
      const results = await syncAll();
      setSyncResults(results);
      
      // Auto-dismiss after successful sync
      setTimeout(() => {
        setIsDismissed(true);
        setSyncResults(null);
      }, 3000);
    } catch (error) {
      console.error('Sync failed:', error);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    setSyncResults(null);
  };

  // Show success message if sync completed
  if (syncResults) {
    const successCount = syncResults.filter((r: any) => r.success).length;
    const failureCount = syncResults.filter((r: any) => !r.success).length;

    return (
      <div className={`bg-green-50 border-l-4 border-green-400 p-4 mb-4 ${className}`}>
        <div className="flex">
          <div className="flex-shrink-0">
            <CheckCircle className="h-5 w-5 text-green-400" />
          </div>
          <div className="ml-3 flex-1">
            <p className="text-sm text-green-700">
              <span className="font-medium">Sync completed!</span>{' '}
              {successCount} agents synced successfully
              {failureCount > 0 && `, ${failureCount} failed`}.
            </p>
          </div>
          <div className="ml-auto pl-3">
            <div className="-mx-1.5 -my-1.5">
              <button
                onClick={handleDismiss}
                className="inline-flex rounded-md bg-green-50 p-1.5 text-green-500 hover:bg-green-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4 ${className}`}>
      <div className="flex">
        <div className="flex-shrink-0">
          <AlertTriangle className="h-5 w-5 text-yellow-400" />
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-yellow-800">
            Knowledge updates detected
          </h3>
          <div className="mt-2 text-sm text-yellow-700">
            <p>
              Your <strong>{changedTypes.join(', ')}</strong> has been updated.{' '}
              <strong>{affectedAgentsCount}</strong> agent{affectedAgentsCount !== 1 ? 's' : ''} need{affectedAgentsCount === 1 ? 's' : ''} syncing to get the latest information.
            </p>
          </div>
          {error && (
            <div className="mt-2 text-sm text-red-700">
              <p>Error: {error}</p>
            </div>
          )}
        </div>
        <div className="ml-auto pl-3">
          <div className="flex space-x-2">
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="inline-flex items-center gap-2 rounded-md bg-yellow-100 px-3 py-2 text-sm font-medium text-yellow-800 hover:bg-yellow-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Syncing...' : 'Sync Now'}
            </button>
            <button
              onClick={handleDismiss}
              className="inline-flex rounded-md bg-yellow-50 p-1.5 text-yellow-500 hover:bg-yellow-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}