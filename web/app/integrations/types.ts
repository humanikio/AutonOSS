export interface DataSourceEndpoint {
  name: string;
  recordCount: number;
  enabled: boolean;
}

export interface DataSource {
  id: string;
  name: string;
  type: 'automotive' | 'government' | 'healthcare' | 'other';
  provider: string;
  status: 'active' | 'inactive' | 'error' | 'connecting';
  lastSync: string;
  totalRecords: number;
  endpoints: DataSourceEndpoint[];
  createdAt: string;
  updatedAt: string;
  apiEndpoint?: string;
  authType?: 'api_key' | 'oauth' | 'basic';
  description?: string;
}

export interface FieldMapping {
  internalField: string;
  externalField: string;
  transformation?: string;
}

export interface DataSourceConfig {
  id: string;
  dataSourceId: string;
  fieldMappings: FieldMapping[];
  syncSettings: {
    frequency: 'real-time' | 'hourly' | 'daily' | 'manual';
    enabled: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ApiTestRequest {
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  params: Record<string, any>;
  headers?: Record<string, string>;
}

export interface ApiTestResponse {
  status: number;
  statusText: string;
  data: any;
  headers: Record<string, string>;
  timestamp: string;
}

export interface ActivityLog {
  id: string;
  dataSourceId: string;
  action: 'sync' | 'test' | 'config_change' | 'error';
  details: string;
  recordCount?: number;
  timestamp: string;
  status: 'success' | 'error' | 'warning';
}