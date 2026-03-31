'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Play, Copy, Download } from 'lucide-react';
import { DataSource, ApiTestRequest, ApiTestResponse } from '../../../types';
import EndpointSelector from './components/EndpointSelector';
import RequestBuilder from './components/RequestBuilder';
import ResponseViewer from './components/ResponseViewer';
import RequestHistory from './components/RequestHistory';

interface ApiTestPageProps {
  params: Promise<{ id: string }>;
}

export default async function ApiTestPage({ params }: ApiTestPageProps) {
  const { id } = await params;
  const router = useRouter();
  const [dataSource, setDataSource] = useState<DataSource | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('request');
  
  const [currentRequest, setCurrentRequest] = useState<ApiTestRequest>({
    endpoint: 'contacts',
    method: 'GET',
    params: {
      dataSourceId: id,
      phone: '',
      email: '',
      name: ''
    }
  });
  
  const [response, setResponse] = useState<ApiTestResponse | null>(null);
  const [testing, setTesting] = useState(false);
  const [requestHistory, setRequestHistory] = useState<Array<{
    request: ApiTestRequest;
    response: ApiTestResponse;
    timestamp: string;
  }>>([]);

  useEffect(() => {
    // Mock data fetch
    const mockDataSource: DataSource = {
      id: id,
      name: 'Reynolds Dealership North',
      type: 'automotive',
      provider: 'Reynolds & Reynolds',
      status: 'active',
      lastSync: new Date().toISOString(),
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
      authType: 'api_key'
    };

    setTimeout(() => {
      setDataSource(mockDataSource);
      setLoading(false);
    }, 500);
  }, [id]);

  const handleSendRequest = async () => {
    if (!dataSource) return;
    
    setTesting(true);
    
    // Mock API call
    setTimeout(() => {
      const mockResponse: ApiTestResponse = {
        status: 200,
        statusText: 'OK',
        data: {
          id: 'cnt_123456',
          providerRefs: [{ provider: 'reynolds', id: 'R-98765' }],
          name: { first: 'John', last: 'Doe', full: 'John Doe' },
          phones: [{ e164: '+14155551234', label: 'mobile', primary: true }],
          emails: [{ address: 'john.doe@email.com', primary: true }],
          address: {
            line1: '123 Main St',
            city: 'San Francisco',
            region: 'CA',
            postal: '94105',
            country: 'US'
          },
          tags: ['customer'],
          meta: { source: 'reynolds_north', lastUpdated: new Date().toISOString() }
        },
        headers: {
          'content-type': 'application/json',
          'x-ratelimit-remaining': '99',
          'x-response-time': '245ms'
        },
        timestamp: new Date().toISOString()
      };

      setResponse(mockResponse);
      setRequestHistory(prev => [{
        request: currentRequest,
        response: mockResponse,
        timestamp: new Date().toISOString()
      }, ...prev.slice(0, 9)]); // Keep last 10 requests
      
      setTesting(false);
    }, 1500);
  };

  const handleCopyResponse = () => {
    if (response) {
      navigator.clipboard.writeText(JSON.stringify(response.data, null, 2));
    }
  };

  const handleDownloadResponse = () => {
    if (response) {
      const blob = new Blob([JSON.stringify(response.data, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `api-response-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const tabs = [
    { id: 'request', label: 'Request Builder' },
    { id: 'response', label: 'Response' },
    { id: 'history', label: 'History' }
  ];

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
          <span className="text-gray-600 text-lg">Loading API tester...</span>
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
              <h1 className="text-3xl font-light text-gray-900">API Tester</h1>
              <p className="mt-1 text-gray-500">{dataSource.name}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {response && (
              <>
                <button
                  onClick={handleCopyResponse}
                  className="px-3 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
                >
                  <Copy className="h-4 w-4" />
                  Copy
                </button>
                <button
                  onClick={handleDownloadResponse}
                  className="px-3 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download
                </button>
              </>
            )}
            <button
              onClick={handleSendRequest}
              disabled={testing}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-primary-400 transition-colors flex items-center gap-2"
            >
              <Play className="h-4 w-4" />
              {testing ? 'Testing...' : 'Send Request'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Endpoint Selector & Request Builder */}
          <div className="lg:col-span-1 space-y-6">
            <EndpointSelector
              dataSource={dataSource}
              selectedEndpoint={currentRequest.endpoint}
              selectedMethod={currentRequest.method}
              onEndpointChange={(endpoint) => setCurrentRequest(prev => ({ ...prev, endpoint }))}
              onMethodChange={(method) => setCurrentRequest(prev => ({ ...prev, method: method as 'GET' | 'POST' | 'PUT' | 'DELETE' }))}
            />
            
            <RequestBuilder
              request={currentRequest}
              onRequestChange={setCurrentRequest}
            />
          </div>

          {/* Right Column - Tabs */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg border border-gray-200">
              {/* Tab Navigation */}
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
                      {tab.id === 'history' && requestHistory.length > 0 && (
                        <span className="ml-2 px-2 py-1 text-xs bg-gray-200 text-gray-600 rounded-full">
                          {requestHistory.length}
                        </span>
                      )}
                    </button>
                  ))}
                </nav>
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {activeTab === 'request' && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900">Request Preview</h3>
                    <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                      <pre className="text-sm">
{`${currentRequest.method} ${dataSource.apiEndpoint}/${currentRequest.endpoint}${
  Object.keys(currentRequest.params).length > 0 
    ? '?' + new URLSearchParams(
        Object.entries(currentRequest.params).filter(([_, v]) => v)
      ).toString()
    : ''
}`}
                      </pre>
                    </div>
                    <p className="text-sm text-gray-500">
                      Click "Send Request" to execute this API call and see the response.
                    </p>
                  </div>
                )}

                {activeTab === 'response' && (
                  <ResponseViewer 
                    response={response} 
                    loading={testing}
                  />
                )}

                {activeTab === 'history' && (
                  <RequestHistory 
                    history={requestHistory}
                    onReplayRequest={(request) => setCurrentRequest(request)}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}