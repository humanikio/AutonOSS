'use client';

import { DataSource } from '../../../../types';

interface BasicInfoSectionProps {
  dataSource: DataSource;
  onUpdate: (dataSource: DataSource) => void;
}

export default function BasicInfoSection({ dataSource, onUpdate }: BasicInfoSectionProps) {
  const handleChange = (field: keyof DataSource, value: any) => {
    onUpdate({
      ...dataSource,
      [field]: value,
      updatedAt: new Date().toISOString()
    });
  };

  const providers = {
    automotive: ['Reynolds & Reynolds', 'CDK Global', 'DealerSocket', 'Automotivemastermind', 'Other'],
    government: ['Accela', 'Tyler Technologies', 'Socrata', 'Cartegraph', 'Other'],
    healthcare: ['Epic', 'Cerner', 'Allscripts', 'NextGen', 'Other'],
    other: ['Custom API', 'REST API', 'GraphQL API', 'Other']
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Data Source Name
          </label>
          <input
            type="text"
            value={dataSource.name}
            onChange={(e) => handleChange('name', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Type
          </label>
          <select
            value={dataSource.type}
            onChange={(e) => handleChange('type', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="automotive">Automotive</option>
            <option value="government">Government</option>
            <option value="healthcare">Healthcare</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Provider
          </label>
          <select
            value={dataSource.provider}
            onChange={(e) => handleChange('provider', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            {providers[dataSource.type]?.map(provider => (
              <option key={provider} value={provider}>{provider}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Status
          </label>
          <select
            value={dataSource.status}
            onChange={(e) => handleChange('status', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="error">Error</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Description
        </label>
        <textarea
          value={dataSource.description || ''}
          onChange={(e) => handleChange('description', e.target.value)}
          rows={4}
          placeholder="Brief description of this data source..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
      </div>

      {/* Metadata */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Metadata</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Created:</span>
            <div className="font-medium">
              {new Date(dataSource.createdAt).toLocaleDateString()}
            </div>
          </div>
          <div>
            <span className="text-gray-500">Last Updated:</span>
            <div className="font-medium">
              {new Date(dataSource.updatedAt).toLocaleDateString()}
            </div>
          </div>
          <div>
            <span className="text-gray-500">Total Records:</span>
            <div className="font-medium">
              {dataSource.totalRecords.toLocaleString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}