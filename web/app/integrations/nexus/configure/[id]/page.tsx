'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, TestTube } from 'lucide-react';
import { DataSource, FieldMapping } from '../../../types';
import BasicInfoSection from './components/BasicInfoSection';
import ConnectionSection from './components/ConnectionSection';
import FieldMappingSection from './components/FieldMappingSection';
import SyncSettingsSection from './components/SyncSettingsSection';

interface ConfigureDataSourceProps {
  params: Promise<{ id: string }>;
}

export default function ConfigureDataSource({ params }: ConfigureDataSourceProps) {
  const router = useRouter();
  const resolvedParams = use(params);
  const [dataSource, setDataSource] = useState<DataSource | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');

  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([
    { internalField: 'contact.name', externalField: 'customer.full_name', transformation: '' },
    { internalField: 'contact.phone', externalField: 'customer.phone_number', transformation: 'e164' },
    { internalField: 'contact.email', externalField: 'customer.email_address', transformation: 'lowercase' }
  ]);

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
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      apiEndpoint: 'https://api.reynolds.com/v1',
      authType: 'api_key',
      description: 'Main dealership management system for North location'
    };

    setTimeout(() => {
      setDataSource(mockDataSource);
      setLoading(false);
    }, 1000);
  }, [resolvedParams.id]);

  const handleSave = async () => {
    setSaving(true);
    // Mock save
    setTimeout(() => {
      setSaving(false);
      router.push('/integrations');
    }, 1500);
  };

  const handleTest = () => {
    router.push(`/integrations/test/${resolvedParams.id}`);
  };

  const tabs = [
    { id: 'basic', label: 'Basic Info', component: BasicInfoSection },
    { id: 'connection', label: 'Connection', component: ConnectionSection },
    { id: 'mapping', label: 'Field Mapping', component: FieldMappingSection },
    { id: 'sync', label: 'Sync Settings', component: SyncSettingsSection }
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component;

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
          <span className="text-gray-600 text-lg">Loading configuration...</span>
        </div>
      </div>
    );
  }

  if (!dataSource) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Data Source Not Found</h2>
          <p className="text-gray-600 mb-6">The requested data source could not be found.</p>
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
              <h1 className="text-3xl font-light text-gray-900">{dataSource.name}</h1>
              <p className="mt-1 text-gray-500">Configure data source settings</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={handleTest}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
            >
              <TestTube className="h-4 w-4" />
              Test API
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-primary-400 transition-colors flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg border border-gray-200 mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-primary-600 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {ActiveComponent && (
              <ActiveComponent
                dataSource={dataSource}
                onUpdate={setDataSource}
                fieldMappings={activeTab === 'mapping' ? fieldMappings : undefined}
                onFieldMappingsUpdate={activeTab === 'mapping' ? setFieldMappings : undefined}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}