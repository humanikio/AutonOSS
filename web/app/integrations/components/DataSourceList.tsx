'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DataSourceCard from './DataSourceCard';
import { DataSource } from '../types';

interface DataSourceListProps {
  dataSources: DataSource[];
  onUpdate: (dataSources: DataSource[]) => void;
}

export default function DataSourceList({ dataSources, onUpdate }: DataSourceListProps) {
  const router = useRouter();
  const [showAll, setShowAll] = useState(false);

  const handleTest = (dataSourceId: string) => {
    router.push(`/integrations/test/${dataSourceId}`);
  };

  const handleEdit = (dataSourceId: string) => {
    router.push(`/integrations/configure/${dataSourceId}`);
  };

  const handleViewDetails = (dataSourceId: string) => {
    router.push(`/integrations/details/${dataSourceId}`);
  };

  const handleDelete = (dataSourceId: string) => {
    if (confirm('Are you sure you want to delete this data source?')) {
      onUpdate(dataSources.filter(ds => ds.id !== dataSourceId));
    }
  };

  const displayedSources = showAll ? dataSources : dataSources.slice(0, 6);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-medium text-gray-900">
          Connected Data Sources ({dataSources.length})
        </h2>
      </div>

      {dataSources.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
          <div className="text-gray-400 text-6xl mb-4">🔗</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No data sources connected</h3>
          <p className="text-gray-500 mb-6">Connect your first data source to start integrating</p>
        </div>
      ) : (
        <>
          <div className="grid gap-4">
            {displayedSources.map(dataSource => (
              <DataSourceCard
                key={dataSource.id}
                dataSource={dataSource}
                onTest={() => handleTest(dataSource.id)}
                onEdit={() => handleEdit(dataSource.id)}
                onViewDetails={() => handleViewDetails(dataSource.id)}
                onDelete={() => handleDelete(dataSource.id)}
              />
            ))}
          </div>

          {dataSources.length > 6 && (
            <div className="text-center">
              <button
                onClick={() => setShowAll(!showAll)}
                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                {showAll ? 'Show Less' : `Show More (${dataSources.length - 6} more)`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}