'use client';

import { useState } from 'react';
import { 
  GitBranch, 
  Settings, 
  Plus, 
  PlayCircle, 
  Code2, 
  Database,
  ArrowRight,
  Zap,
  MapPin,
  Activity
} from 'lucide-react';
import Link from 'next/link';

export default function NexusPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'mappings' | 'endpoints'>('overview');

  const dataMappings = [
    {
      id: 'mapping_1',
      name: 'Contact Normalization',
      sourceField: 'reynolds.customer.full_name',
      targetField: 'contacts.name',
      transformation: 'split(full_name) -> first_name, last_name',
      status: 'active',
      recordsProcessed: 15120
    },
    {
      id: 'mapping_2',
      name: 'Phone Number Standardization',
      sourceField: 'accela.contact.phone',
      targetField: 'contacts.phone',
      transformation: 'normalize_phone(phone) -> E.164 format',
      status: 'active',
      recordsProcessed: 5620
    },
    {
      id: 'mapping_3',
      name: 'Address Geocoding',
      sourceField: 'reynolds.customer.address',
      targetField: 'contacts.location',
      transformation: 'geocode(address) -> lat, lng',
      status: 'processing',
      recordsProcessed: 1248
    }
  ];

  const apiEndpoints = [
    {
      id: 'endpoint_1',
      name: 'Unified Contacts API',
      path: '/api/v1/contacts',
      method: 'GET',
      sources: ['reynolds', 'accela', 'cdk'],
      status: 'active',
      requests_24h: 2847
    },
    {
      id: 'endpoint_2',
      name: 'Real-time Sync Webhook',
      path: '/api/v1/sync/webhook',
      method: 'POST',
      sources: ['reynolds', 'accela'],
      status: 'active',
      requests_24h: 156
    },
    {
      id: 'endpoint_3',
      name: 'Data Export API',
      path: '/api/v1/export',
      method: 'POST',
      sources: ['all'],
      status: 'beta',
      requests_24h: 12
    }
  ];

  const quickActions = [
    {
      name: 'Create Mapping',
      description: 'Map fields between data sources',
      href: '/integrations/nexus/configure/new',
      icon: MapPin,
      color: 'bg-purple-500'
    },
    {
      name: 'Test Endpoint',
      description: 'Test API endpoint functionality',
      href: '/integrations/nexus/test/new',
      icon: PlayCircle,
      color: 'bg-green-500'
    },
    {
      name: 'View Details',
      description: 'Monitor data source activity',
      href: '/integrations/nexus/details',
      icon: Activity,
      color: 'bg-blue-500'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-500 text-white rounded-lg">
                <GitBranch className="h-6 w-6" />
              </div>
              <h1 className="text-3xl font-light text-gray-900">Nexus (UDL)</h1>
            </div>
            <p className="text-gray-500">Universal Data Layer - Transform and map data between sources</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
              <Settings className="h-5 w-5" />
            </button>
            <Link
              href="/integrations/nexus/configure/new"
              className="px-4 py-2 bg-purple-600 text-white rounded-lg flex items-center gap-2 hover:bg-purple-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              New Mapping
            </Link>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {quickActions.map((action) => (
              <Link
                key={action.name}
                href={action.href}
                className="group p-4 bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all duration-200"
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${action.color} text-white group-hover:scale-105 transition-transform`}>
                    <action.icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-gray-900 group-hover:text-gray-700">
                        {action.name}
                      </h3>
                      <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all" />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{action.description}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-2xl font-semibold text-purple-600">{dataMappings.length}</div>
            <div className="text-sm text-gray-500">Active Mappings</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-2xl font-semibold text-blue-600">{apiEndpoints.length}</div>
            <div className="text-sm text-gray-500">API Endpoints</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-2xl font-semibold text-green-600">
              {dataMappings.reduce((sum, mapping) => sum + mapping.recordsProcessed, 0).toLocaleString()}
            </div>
            <div className="text-sm text-gray-500">Records Processed</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-2xl font-semibold text-orange-600">
              {apiEndpoints.reduce((sum, endpoint) => sum + endpoint.requests_24h, 0).toLocaleString()}
            </div>
            <div className="text-sm text-gray-500">API Requests (24h)</div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-200 mb-6">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'overview'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('mappings')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'mappings'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Data Mappings
          </button>
          <button
            onClick={() => setActiveTab('endpoints')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'endpoints'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            API Endpoints
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Data Flow Architecture</h3>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Database className="h-8 w-8 text-blue-500" />
                  <div>
                    <div className="font-medium">Data Sources</div>
                    <div className="text-sm text-gray-500">Reynolds, Accela, CDK</div>
                  </div>
                </div>
                <ArrowRight className="h-6 w-6 text-gray-400" />
                <div className="flex items-center gap-3">
                  <GitBranch className="h-8 w-8 text-purple-500" />
                  <div>
                    <div className="font-medium">Nexus UDL</div>
                    <div className="text-sm text-gray-500">Transform & Map</div>
                  </div>
                </div>
                <ArrowRight className="h-6 w-6 text-gray-400" />
                <div className="flex items-center gap-3">
                  <Code2 className="h-8 w-8 text-green-500" />
                  <div>
                    <div className="font-medium">Unified API</div>
                    <div className="text-sm text-gray-500">Standardized Output</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'mappings' && (
          <div className="space-y-4">
            {dataMappings.map((mapping) => (
              <div key={mapping.id} className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{mapping.name}</h3>
                    <div className="text-sm text-gray-500 mt-1">
                      <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                        {mapping.sourceField}
                      </span>
                      {' → '}
                      <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                        {mapping.targetField}
                      </span>
                    </div>
                  </div>
                  <div className={`px-3 py-1 text-xs rounded-full ${
                    mapping.status === 'active' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {mapping.status}
                  </div>
                </div>
                <div className="text-sm text-gray-600 mb-3">
                  <span className="font-medium">Transformation:</span> {mapping.transformation}
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    {mapping.recordsProcessed.toLocaleString()} records processed
                  </div>
                  <Link
                    href={`/integrations/nexus/configure/${mapping.id}`}
                    className="text-purple-600 hover:text-purple-800 text-sm font-medium"
                  >
                    Configure →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'endpoints' && (
          <div className="space-y-4">
            {apiEndpoints.map((endpoint) => (
              <div key={endpoint.id} className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{endpoint.name}</h3>
                    <div className="text-sm text-gray-500 mt-1">
                      <span className={`inline-block px-2 py-1 text-xs rounded font-mono mr-2 ${
                        endpoint.method === 'GET' 
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {endpoint.method}
                      </span>
                      <span className="font-mono">{endpoint.path}</span>
                    </div>
                  </div>
                  <div className={`px-3 py-1 text-xs rounded-full ${
                    endpoint.status === 'active' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {endpoint.status}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Sources:</span> {endpoint.sources.join(', ')}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-sm text-gray-500">
                      {endpoint.requests_24h} requests (24h)
                    </div>
                    <Link
                      href={`/integrations/nexus/test/${endpoint.id}`}
                      className="text-purple-600 hover:text-purple-800 text-sm font-medium"
                    >
                      Test →
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}