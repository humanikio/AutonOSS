'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Settings, BookOpen } from 'lucide-react';
import DataSourceList from '../components/DataSourceList';
import AddDataSourceModal from '../components/AddDataSourceModal';
import { DataSource } from '../types';

export default function DataSourcesPage() {
  const { user, tenant, isAuthenticated } = useAuth();
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Mock data for now
  useEffect(() => {
    // Simulate API call
    const mockDataSources: DataSource[] = [
      {
        id: 'ds_reynolds_north',
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
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'ds_accela_gov',
        name: 'Accela Government',
        type: 'government',
        provider: 'Accela',
        status: 'active',
        lastSync: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        totalRecords: 8934,
        endpoints: [
          { name: 'contacts', recordCount: 5620, enabled: true },
          { name: 'cases', recordCount: 2314, enabled: true },
          { name: 'permits', recordCount: 1000, enabled: true }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'ds_cdk_south',
        name: 'CDK Global South',
        type: 'automotive',
        provider: 'CDK Global',
        status: 'error',
        lastSync: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        totalRecords: 0,
        endpoints: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    setTimeout(() => {
      setDataSources(mockDataSources);
      setLoading(false);
    }, 1000);
  }, []);

  const handleAddDataSource = (dataSource: Omit<DataSource, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newDataSource: DataSource = {
      ...dataSource,
      id: `ds_${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setDataSources(prev => [...prev, newDataSource]);
    setShowAddModal(false);
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
          <span className="text-gray-600 text-lg">Loading data sources...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-light text-gray-900">Data Sources</h1>
            <p className="mt-2 text-gray-500">Manage external data source connections</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
              <BookOpen className="h-5 w-5" />
            </button>
            <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
              <Settings className="h-5 w-5" />
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg flex items-center gap-2 hover:bg-primary-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Data Source
            </button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-2xl font-semibold text-gray-900">{dataSources.length}</div>
            <div className="text-sm text-gray-500">Connected Sources</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-2xl font-semibold text-gray-900">
              {dataSources.filter(ds => ds.status === 'active').length}
            </div>
            <div className="text-sm text-gray-500">Active Connections</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-2xl font-semibold text-gray-900">
              {dataSources.reduce((sum, ds) => sum + ds.totalRecords, 0).toLocaleString()}
            </div>
            <div className="text-sm text-gray-500">Total Records</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-2xl font-semibold text-gray-900">
              {dataSources.reduce((sum, ds) => sum + ds.endpoints.length, 0)}
            </div>
            <div className="text-sm text-gray-500">Available Endpoints</div>
          </div>
        </div>

        {/* Data Sources List */}
        <DataSourceList 
          dataSources={dataSources} 
          onUpdate={setDataSources}
        />

        {/* Add Data Source Modal */}
        {showAddModal && (
          <AddDataSourceModal
            onClose={() => setShowAddModal(false)}
            onAdd={handleAddDataSource}
          />
        )}
      </div>
    </div>
  );
}