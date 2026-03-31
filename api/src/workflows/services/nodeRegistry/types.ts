/**
 * Type definitions matching n8n's INodeTypeDescription format
 * Reference: https://github.com/n8n-io/n8n/blob/master/packages/workflow/src/interfaces.ts
 */

export type NodePropertyTypes =
  | 'string'
  | 'number'
  | 'boolean'
  | 'options'
  | 'multiOptions'
  | 'collection'
  | 'fixedCollection'
  | 'json'
  | 'notice'
  | 'dateTime'
  | 'color'
  | 'hidden'
  | 'resourceLocator'
  | 'credentialsSelect'
  | 'filter'
  | 'assignmentCollection'
  | 'resourceMapper'
  | 'notice';

export type NodeConnectionType = 'main' | 'ai';

export interface INodePropertyOptions {
  name: string;
  value?: string | number | boolean;
  description?: string;
  action?: string;
  displayName?: string;
  values?: INodeProperties[];
}

export interface IDisplayOptions {
  show?: { [key: string]: Array<string | number | boolean> };
  hide?: { [key: string]: Array<string | number | boolean> };
}

export interface INodePropertyTypeOptions {
  minValue?: number;
  maxValue?: number;
  numberStepSize?: number;
  loadOptionsMethod?: string;
  loadOptionsDependsOn?: string[];
  multipleValues?: boolean;
  multipleValueButtonText?: string;
  password?: boolean;
  rows?: number;
  sortable?: boolean;
  [key: string]: any;
}

export interface INodeProperties {
  displayName: string;
  name: string;
  type: NodePropertyTypes;
  typeOptions?: INodePropertyTypeOptions;
  default: any;
  description?: string;
  hint?: string;
  displayOptions?: IDisplayOptions;
  options?: Array<INodePropertyOptions | INodeProperties>;
  placeholder?: string;
  isNodeSetting?: boolean;
  noDataExpression?: boolean;
  required?: boolean;
  requiredOptions?: IDisplayOptions; // Conditional required logic (same format as displayOptions)
  disabledOptions?: IDisplayOptions; // Conditional disabled/readonly logic (same format as displayOptions)
  routing?: any;
  extractValue?: any;
  modes?: any[];
  requiresDataPath?: 'single' | 'multiple';
  validateType?: string;
  ignoreValidationDuringExecution?: boolean;
}

export interface INodeCredentialDescription {
  name: string;
  required?: boolean;
  displayOptions?: IDisplayOptions;
  testedBy?: string | { [key: string]: any };
}

export type IHttpRequestMethods = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

export type WebhookResponseMode = 'onReceived' | 'lastNode' | 'responseNode';

export interface IWebhookDescription {
  [key: string]: string | boolean | undefined;
  httpMethod: string;
  isFullPath?: boolean;
  name: string;
  path: string;
  responseBinaryPropertyName?: string;
  responseContentType?: string;
  responsePropertyName?: string;
  responseMode?: string;
  responseData?: string;
  restartWebhook?: boolean;
  responseCode?: string;
  responseHeaders?: string;
}

export interface NodeDefaults {
  name: string;
  color?: string;
}

export type NodeHintType = 'info' | 'warning' | 'danger';
export type NodeHintLocation = 'outputPane' | 'inputPane' | 'ndv';
export type NodeHintWhen = 'always' | 'beforeExecution' | 'afterExecution';

export interface NodeHint {
  message: string;
  type?: NodeHintType;
  location?: NodeHintLocation;
  displayCondition?: string;
  whenToDisplay?: NodeHintWhen;
}

export interface TriggerPanelDefinition {
  hideContent?: boolean | string;
  header?: string;
  executionsHelp?: string | { active: string; inactive: string };
  activationHint?: string | { active: string; inactive: string };
}

/**
 * Parameter default configuration for auto-generation on node creation
 */
export interface IParameterDefault {
  value: any;
  pattern?: 'timestamp' | 'uuid' | 'static';
}

/**
 * Main node type description interface matching n8n's INodeTypeDescription
 */
export interface INodeTypeDescription {
  // Basic identification
  displayName: string;
  name: string;
  icon?: string | { light: string; dark: string };
  iconUrl?: string;
  group: string[];
  version: number | number[];
  defaultVersion?: number;
  description: string;
  subtitle?: string;

  // Search & discovery
  keywords?: string[];  // Search terms for LLM/tool discovery
  hidden?: boolean;     // Hide from search results (internal nodes)

  // Node behavior
  defaults: NodeDefaults;
  inputs: Array<NodeConnectionType | string> | string;
  outputs: Array<NodeConnectionType | string> | string;
  inputNames?: string[] | string;
  outputNames?: string[] | string;

  // Configuration
  properties: INodeProperties[];
  credentials?: INodeCredentialDescription[];

  // Parameter auto-generation (for frontend node creation)
  parameterDefaults?: {
    [parameterName: string]: IParameterDefault;
  };

  // Webhook-specific (for trigger nodes)
  webhooks?: IWebhookDescription[];

  // UI configuration
  triggerPanel?: TriggerPanelDefinition | boolean;
  hints?: NodeHint[];

  // Advanced options
  maxNodes?: number;
  polling?: boolean;
  supportsCORS?: boolean;
  eventTriggerDescription?: string;
  activationMessage?: string;
  requestDefaults?: any;
  requestOperations?: any;
  hooks?: {
    [key: string]: any[] | undefined;
    activate?: any[];
    deactivate?: any[];
  };
  translation?: { [key: string]: object };
  mockManualExecution?: boolean;
  extendsCredential?: string;
  communityNodePackageVersion?: string;
  usableAsTool?: any;

  // Custom Pulseline metadata for HTTP conversion
  _pulseline?: IPulselineMetadata;
}

/**
 * Conditional output configuration for Pulseline nodes
 * Enables automatic IF node generation for conditional routing
 */
export interface IConditionalOutput {
  enabled: boolean;
  field: string;              // Field to check in HTTP response (e.g., 'found')
  trueLabel?: string;         // Label for true branch (default: 'True')
  falseLabel?: string;        // Label for false branch (default: 'False')
  truePath?: string;          // Optional: custom expression for true condition
  falsePath?: string;         // Optional: custom expression for false condition
}

/**
 * Response field definition for node outputs
 */
export interface IResponseField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description?: string;
  required?: boolean;
}

/**
 * Success response configuration
 * Defines the expected fields in a successful node execution response
 */
export interface ISuccessResponse {
  fields: IResponseField[];
}

/**
 * Response mapping for dynamic dropdown options
 * Defines how to transform API response into dropdown options
 */
export interface ILoadOptionsResponseMapping {
  valueField: string;           // Field to use as option value (e.g., 'id')
  labelField: string;           // Field to use as option label (e.g., 'name')
  descriptionField?: string;    // Optional field for option description
  dataPath?: string;            // Optional nested path to array in response (e.g., 'actions' for data.actions)
}

/**
 * Load options method definition for dynamic dropdowns
 * Defines an API call to fetch dropdown options dynamically
 */
export interface ILoadOptionsMethod {
  endpoint: string;                           // API endpoint to fetch options
  method: 'GET' | 'POST';                     // HTTP method
  responseMapping: ILoadOptionsResponseMapping; // How to map response to options
  dependsOn?: string[];                       // Parameter names this depends on
}

/**
 * Subflow trigger configuration
 * Defines when and how to create subflows for nodes that require switch-based routing
 */
export interface ISubflowTriggerConfig {
  type: string;                      // Identifier for this subflow trigger class (e.g., 'milestoneWait')
  triggerWhen?: string;              // Optional: Parameter value that activates this trigger (e.g., 'appointmentMilestone')
  minCount: number;                  // Minimum count of nodes in linear path to trigger subflow (N+1 where N=1 means 2 nodes)
  determinationFunction: string;     // Function name for switch expression that computes which branch to route to
  sortKey: string;                   // Parameter name to use for ordering nodes (e.g., 'milestone' for chronological sorting)
}

/**
 * Pulseline-specific metadata for custom node conversion
 */
export interface IPulselineMetadata {
  isCustomNode: boolean;
  isTrigger?: boolean;           // Mark as subscription trigger node (auto-creates subscription)
  triggerType?: string;           // Event type for subscription (e.g., 'sms.received.v1')
  isAdapter?: boolean;            // Mark as adapter node (invisible, auto-injected for field resolution)
  adapterType?: string;           // Type of adapter (e.g., 'contact', 'opportunity')
  webhookWait?: boolean;          // Mark wait node for webhook resume mode (converts to n8n webhook wait)
  createSubscriptionOnSave?: boolean; // Auto-create subscription when workflow saved
  subscriptionType?: string;      // Subscription type for webhook wait nodes
  transformationMethod?: string;  // Declarative transformation method name (e.g., 'wait_appointmentMilestone')
  transformationMethodSelector?: string; // Parameter name that determines which transformation method to use
  transformationMethodMap?: Record<string, string>; // Map of parameter values to transformation method names
  subflowTrigger?: ISubflowTriggerConfig; // Subflow creation trigger configuration (for nodes that require branching)
  apiEndpoint: string;
  httpMethod: IHttpRequestMethods;
  requiresAuth: boolean;
  requiresConfirmation?: boolean;
  continueOnFail?: boolean; // Allow workflow to continue even if HTTP request fails (essential for gate nodes)
  bodyMapping?: Record<string, string>;
  conditionalOutput?: IConditionalOutput;
  successResponse?: ISuccessResponse;
  loadOptionsMethods?: Record<string, ILoadOptionsMethod>; // Dynamic dropdown options
}

/**
 * Lightweight node info for listing nodes (what the UI needs)
 */
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
