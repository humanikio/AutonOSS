import apiClient from './client';

/**
 * Node Registry API Client
 * Provides access to available workflow nodes from the backend registry
 */

// ==================== Types ====================

export type NodePropertyTypes =
  | 'string'
  | 'number'
  | 'boolean'
  | 'collection'
  | 'fixedCollection'
  | 'options'
  | 'multiOptions'
  | 'color'
  | 'dateTime'
  | 'json'
  | 'notice'
  | 'filter'
  | 'resourceLocator'
  | 'credentialsSelect'
  | 'resourceMapper'
  | 'curlImport'
  | 'assignmentCollection'
  | 'hidden';

export interface INodePropertyOptions {
  name: string;
  value: string | number | boolean;
  description?: string;
  action?: string;
}

export interface INodePropertyCollection {
  name: string;
  displayName: string;
  values: INodeProperties[];
}

export interface IDisplayOptions {
  show?: { [key: string]: any[] };
  hide?: { [key: string]: any[] };
}

export interface INodeProperties {
  displayName: string;
  name: string;
  type: NodePropertyTypes;
  default: any;
  description?: string;
  displayOptions?: IDisplayOptions;
  options?: Array<INodePropertyOptions | INodeProperties | INodePropertyCollection>;
  required?: boolean;
  requiredOptions?: IDisplayOptions; // Conditional required logic (same format as displayOptions)
  disabledOptions?: IDisplayOptions; // Conditional disabled/readonly logic (same format as displayOptions)
  requiresDataPath?: 'single' | 'multiple';
  placeholder?: string;
  hint?: string;
  typeOptions?: any;
  routing?: any;
  extractValue?: any;
}

export interface NodeDefaults {
  name: string;
  color?: string;
}

export interface IWebhookDescription {
  name: string;
  httpMethod: string;
  path: string;
  responseMode?: string;
  responseData?: string;
}

export interface NodeListItem {
  name: string;
  displayName: string;
  description: string;
  group: string[];
  icon?: string | { light: string; dark: string };
  iconUrl?: string;
  version: number | number[];
  category: 'trigger' | 'action' | 'condition';
}

export interface IConditionalOutput {
  enabled: boolean;
  field: string;
  trueLabel?: string;
  falseLabel?: string;
  truePath?: string;
  falsePath?: string;
}

export interface IResponseField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description?: string;
  required?: boolean;
}

export interface ISuccessResponse {
  fields: IResponseField[];
}

export interface ILoadOptionsResponseMapping {
  valueField: string;
  labelField: string;
  descriptionField?: string;
  dataPath?: string; // Optional nested path to array in response (e.g., 'actions' for data.actions)
}

export interface ILoadOptionsMethod {
  endpoint: string;
  method: 'GET' | 'POST';
  responseMapping: ILoadOptionsResponseMapping;
  dependsOn?: string[];
}

export interface IPulselineMetadata {
  isCustomNode: boolean;
  apiEndpoint: string;
  httpMethod: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  requiresAuth: boolean;
  requiresConfirmation?: boolean;
  continueOnFail?: boolean; // Allow workflow to continue even if HTTP request fails (essential for gate nodes)
  bodyMapping?: Record<string, string>;
  conditionalOutput?: IConditionalOutput;
  successResponse?: ISuccessResponse;
  loadOptionsMethods?: Record<string, ILoadOptionsMethod>;
}

export interface INodeTypeDescription {
  displayName: string;
  name: string;
  icon?: string | { light: string; dark: string };
  iconUrl?: string;
  group: string[];
  version: number | number[];
  defaultVersion?: number;
  description: string;
  subtitle?: string;
  defaults: NodeDefaults;
  inputs: Array<string> | string;
  inputNames?: string[];
  outputs: Array<string> | string;
  outputNames?: string[];
  properties: INodeProperties[];
  credentials?: any[];
  webhooks?: IWebhookDescription[];
  hints?: Array<{
    message: string;
    type: string;
    location: string;
  }>;
  _pulseline?: IPulselineMetadata;
}

export interface NodeStats {
  total: number;
  triggers: number;
  actions: number;
  conditions: number;
}

export interface NodeInstance {
  id: string;
  name: string;
  type: string;
  typeVersion: number;
  position: [number, number];
  parameters: Record<string, any>;
}

export interface NodeValidation {
  valid: boolean;
  errors: string[];
}

// ==================== API Responses ====================

export interface GetAllNodesResponse {
  success: boolean;
  data: NodeListItem[];
}

export interface GetNodeConfigResponse {
  success: boolean;
  data: INodeTypeDescription;
  error?: string;
}

export interface GetNodesByCategoryResponse {
  success: boolean;
  data: NodeListItem[];
  error?: string;
}

export interface GetNodeStatsResponse {
  success: boolean;
  data: NodeStats;
}

export interface CreateNodeInstanceResponse {
  success: boolean;
  data: NodeInstance;
  error?: string;
}

export interface ValidateNodeResponse {
  success: boolean;
  data: NodeValidation;
  error?: string;
}

// ==================== API Client ====================

export const nodeRegistryApi = {
  /**
   * Get all available nodes (lightweight list for UI)
   */
  async getAllNodes(): Promise<GetAllNodesResponse> {
    const response = await apiClient.get('/api/workflows/nodes');
    return response.data;
  },

  /**
   * Get full configuration for a specific node
   */
  async getNodeConfig(nodeName: string): Promise<GetNodeConfigResponse> {
    const response = await apiClient.get(`/api/workflows/nodes/${nodeName}`);
    return response.data;
  },

  /**
   * Get nodes filtered by category (trigger, action, condition)
   */
  async getNodesByCategory(
    category: 'trigger' | 'action' | 'condition'
  ): Promise<GetNodesByCategoryResponse> {
    const response = await apiClient.get(`/api/workflows/nodes/category/${category}`);
    return response.data;
  },

  /**
   * Get statistics about available nodes
   */
  async getNodeStats(): Promise<GetNodeStatsResponse> {
    const response = await apiClient.get('/api/workflows/nodes/stats');
    return response.data;
  },

  /**
   * Create a new node instance with default values
   */
  async createNodeInstance(
    nodeName: string,
    position: [number, number],
    customName?: string
  ): Promise<CreateNodeInstanceResponse> {
    const response = await apiClient.post(`/api/workflows/nodes/${nodeName}/create-instance`, {
      position,
      customName,
    });
    return response.data;
  },

  /**
   * Validate a node against its configuration
   */
  async validateNode(node: any): Promise<ValidateNodeResponse> {
    const response = await apiClient.post('/api/workflows/nodes/validate', { node });
    return response.data;
  },
};
