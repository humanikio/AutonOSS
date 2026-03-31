# Node Config API Reference

> **Complete INodeTypeDescription interface reference**

---

## 📋 Overview

This document provides a complete reference for the `INodeTypeDescription` interface and all related types used to define workflow nodes.

**File:** `workflows/services/nodeRegistry/types.ts`

---

## 🏗️ INodeTypeDescription

**Main interface for defining a node**

**File:** `types.ts:142-198`

```typescript
export interface INodeTypeDescription {
  // === BASIC IDENTIFICATION ===
  displayName: string;              // UI display name (e.g., "Create Contact")
  name: string;                     // Unique identifier (e.g., "pulselineCreateContact")
  icon?: string;                    // Font Awesome icon (e.g., "fa:user-plus")
  iconUrl?: string;                 // Custom icon URL
  group: string[];                  // Category tags (e.g., ["contactManagement"])
  version: number | number[];       // Node version(s) (e.g., 1 or [1, 2])
  defaultVersion?: number;          // Default version if multiple (e.g., 2)
  description: string;              // Help text shown in UI
  subtitle?: string;                // Dynamic subtitle (e.g., "={{$parameter['name']}}")

  // === NODE BEHAVIOR ===
  defaults: NodeDefaults;           // Default name and color
  inputs: Array<string> | string;   // Input connections (e.g., ['main'] or [])
  outputs: Array<string> | string;  // Output connections (e.g., ['main', 'main'])
  inputNames?: string[];            // Input labels
  outputNames?: string[];           // Output labels (e.g., ['true', 'false'])

  // === CONFIGURATION ===
  properties: INodeProperties[];    // User-configurable parameters

  // === WEBHOOK-SPECIFIC ===
  webhooks?: IWebhookDescription[]; // For webhook/wait nodes

  // === UI CONFIGURATION ===
  triggerPanel?: TriggerPanelDefinition | boolean;
  hints?: NodeHint[];               // UI hints/warnings

  // === PULSELINE CUSTOM ===
  _pulseline?: IPulselineMetadata;  // Custom transformation metadata
}
```

---

## 📐 Required Fields

### displayName
**User-visible name in UI**

```typescript
displayName: 'Create Contact'
```

### name
**Unique node identifier (must be unique across all nodes)**

```typescript
name: 'pulselineCreateContact'
```

**Naming convention:**
- Triggers: `{event}Trigger` (e.g., `smsReceivedTrigger`)
- Actions: `pulseline{Action}` (e.g., `pulselineCreateContact`)
- Native: `{nodeName}` (e.g., `wait`, `if`)

### group
**Category tags for UI organization**

```typescript
group: ['contactManagement']          // Contact-related nodes
group: ['trigger', 'communication']   // Trigger + communication
group: ['opportunities']              // Opportunity nodes
group: ['helpers']                    // Utility nodes
```

### version
**Node version(s)**

```typescript
version: 1                    // Single version
version: [1, 1.1, 2]         // Multiple versions
defaultVersion: 2            // Default when multiple
```

### description
**Help text displayed in UI**

```typescript
description: 'Creates a new contact in the system'
```

### defaults
**Default node instance values**

**File:** `types.ts:107-110`

```typescript
defaults: {
  name: 'Create Contact',  // Default node name in workflow
  color: '#00d4ff',        // Node color (hex)
}
```

### inputs
**Input connection types**

```typescript
inputs: []              // Trigger (no inputs)
inputs: ['main']        // Action (one input)
inputs: ['main', 'ai']  // Multiple input types
```

### outputs
**Output connection types**

```typescript
outputs: ['main']              // Single output
outputs: ['main', 'main']      // Multiple outputs (e.g., IF node)
outputNames: ['true', 'false'] // Labels for outputs
```

### properties
**User-configurable parameters (see INodeProperties below)**

```typescript
properties: [
  {
    displayName: 'Name',
    name: 'name',
    type: 'string',
    default: '',
    required: true,
  },
  // ... more properties
]
```

---

## 🎨 INodeProperties

**Defines a single user-configurable parameter**

**File:** `types.ts:56-78`

```typescript
export interface INodeProperties {
  displayName: string;              // Label shown in UI
  name: string;                     // Parameter name (used in code)
  type: NodePropertyTypes;          // Input type (string, number, options, etc.)
  typeOptions?: INodePropertyTypeOptions;
  default: any;                     // Default value
  description?: string;             // Help text
  hint?: string;                    // Additional hint
  placeholder?: string;             // Placeholder text
  required?: boolean;               // Is required?
  displayOptions?: IDisplayOptions; // Conditional visibility
  requiredOptions?: IDisplayOptions; // Conditional required
  disabledOptions?: IDisplayOptions; // Conditional disabled
  options?: INodePropertyOptions[]; // For 'options' type
  noDataExpression?: boolean;       // Disable expression mode?
}
```

### Property Types

**File:** `types.ts:6-24`

```typescript
export type NodePropertyTypes =
  | 'string'              // Text input
  | 'number'              // Number input
  | 'boolean'             // Checkbox
  | 'options'             // Dropdown (single select)
  | 'multiOptions'        // Dropdown (multi select)
  | 'collection'          // Nested object
  | 'fixedCollection'     // User-defined fields
  | 'json'                // JSON editor
  | 'notice'              // Info/warning message
  | 'dateTime'            // Date/time picker
  | 'color'               // Color picker
  | 'hidden';             // Hidden field
```

### typeOptions

**Additional configuration for property types**

**File:** `types.ts:42-54`

```typescript
export interface INodePropertyTypeOptions {
  minValue?: number;                // Minimum value (number)
  maxValue?: number;                // Maximum value (number)
  numberStepSize?: number;          // Step increment (number)
  rows?: number;                    // Rows for textarea (string)
  password?: boolean;               // Mask input (string)
  loadOptionsMethod?: string;       // Dynamic dropdown method name
  loadOptionsDependsOn?: string[];  // Parameter dependencies
  multipleValues?: boolean;         // Allow multiple (fixedCollection)
  multipleValueButtonText?: string; // Button text (fixedCollection)
}
```

### displayOptions

**Conditional visibility based on other parameter values**

**File:** `types.ts:37-40`

```typescript
export interface IDisplayOptions {
  show?: { [key: string]: Array<string | number | boolean> };
  hide?: { [key: string]: Array<string | number | boolean> };
}
```

**Example:**
```typescript
displayOptions: {
  show: {
    conditionType: ['string'],              // Show when conditionType='string'
    stringOperation: ['equals', 'contains'] // AND operation is equals OR contains
  }
}
```

---

## 🔧 IPulselineMetadata

**Custom Pulseline metadata for transformation system**

**File:** `types.ts:256-277`

```typescript
export interface IPulselineMetadata {
  // === BASIC ===
  isCustomNode: boolean;                // Is this a custom Pulseline node?

  // === TRIGGER-SPECIFIC ===
  isTrigger?: boolean;                  // Is this a trigger node?
  triggerType?: string;                 // Event type (e.g., 'sms.received.v1')
  createSubscriptionOnSave?: boolean;   // Auto-create subscription?

  // === TRANSFORMATION ===
  transformationMethod?: string;        // Single method name
  transformationMethodSelector?: string; // Parameter name for dynamic selection
  transformationMethodMap?: Record<string, string>; // Value → method map

  // === API ENDPOINT ===
  apiEndpoint: string;                  // Backend API endpoint
  httpMethod: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  requiresAuth: boolean;                // Needs API key injection?

  // === CONDITIONAL OUTPUT ===
  conditionalOutput?: IConditionalOutput;

  // === SUCCESS RESPONSE ===
  successResponse?: ISuccessResponse;

  // === LOAD OPTIONS ===
  loadOptionsMethods?: Record<string, ILoadOptionsMethod>;

  // === ADAPTER ===
  isAdapter?: boolean;                  // Invisible adapter node?
  adapterType?: string;                 // Type of adapter
}
```

### IConditionalOutput

**Auto-generate IF node for conditional routing**

**File:** `types.ts:204-211`

```typescript
export interface IConditionalOutput {
  enabled: boolean;
  field: string;        // Response field to check (e.g., 'found')
  trueLabel?: string;   // Label for true output
  falseLabel?: string;  // Label for false output
}
```

**Example:**
```typescript
conditionalOutput: {
  enabled: true,
  field: 'found',
  trueLabel: 'Contact Found',
  falseLabel: 'Contact Not Found',
}
```

### ISuccessResponse

**Expected API response fields (for field mapping)**

**File:** `types.ts:227-229`

```typescript
export interface ISuccessResponse {
  fields: IResponseField[];
}

export interface IResponseField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description?: string;
  required?: boolean;
}
```

**Example:**
```typescript
successResponse: {
  fields: [
    { name: 'contactId', type: 'string', description: 'Created contact ID', required: true },
    { name: 'name', type: 'string', description: 'Contact name' },
    { name: 'email', type: 'string', description: 'Contact email' },
  ],
}
```

### ILoadOptionsMethod

**Dynamic dropdown configuration**

**File:** `types.ts:246-251`

```typescript
export interface ILoadOptionsMethod {
  endpoint: string;                     // API endpoint
  method: 'GET' | 'POST';              // HTTP method
  responseMapping: ILoadOptionsResponseMapping;
  dependsOn?: string[];                // Parameter dependencies
}

export interface ILoadOptionsResponseMapping {
  valueField: string;      // Field for option value
  labelField: string;      // Field for option label
  descriptionField?: string;
  dataPath?: string;       // Nested array path
}
```

**Example:**
```typescript
loadOptionsMethods: {
  getTags: {
    endpoint: '/api/contacts/tags',
    method: 'GET',
    responseMapping: {
      valueField: 'tagId',
      labelField: 'tagName',
      dataPath: 'tags',
    },
  },
}
```

---

## 📊 Complete Examples

### Example 1: Trigger Node

```typescript
export const smsReceivedTriggerNode: INodeTypeDescription = {
  displayName: 'SMS Received',
  name: 'smsReceivedTrigger',
  icon: 'fa:comment-dots',
  group: ['trigger', 'communication'],
  version: 1,
  description: 'Triggers when an SMS message is received',

  defaults: {
    name: 'SMS Received',
    color: '#10b981',
  },

  inputs: [],           // ← No inputs (trigger)
  outputs: ['main'],

  _pulseline: {
    isCustomNode: true,
    isTrigger: true,
    triggerType: 'sms.received.v1',
    transformationMethod: 'trigger_webhook',
    apiEndpoint: '',
    httpMethod: 'POST',
    requiresAuth: false,
    successResponse: {
      fields: [
        { name: 'tenantId', type: 'string', required: true },
        { name: 'contactId', type: 'string', required: true },
        { name: 'body', type: 'string' },
      ],
    },
  },

  properties: [],       // ← Usually empty for triggers
};
```

### Example 2: API-Backed Action Node

```typescript
export const pulselineCreateContactNode: INodeTypeDescription = {
  displayName: 'Create Contact',
  name: 'pulselineCreateContact',
  icon: 'fa:user-plus',
  group: ['contactManagement'],
  version: 1,
  description: 'Creates a new contact',

  defaults: {
    name: 'Create Contact',
    color: '#00d4ff',
  },

  inputs: ['main'],     // ← Has inputs (action)
  outputs: ['main'],

  _pulseline: {
    isCustomNode: true,
    transformationMethod: 'contact_create',
    apiEndpoint: '/api/contacts',
    httpMethod: 'POST',
    requiresAuth: true,
    successResponse: {
      fields: [
        { name: 'contactId', type: 'string', required: true },
        { name: 'name', type: 'string' },
      ],
    },
    loadOptionsMethods: {
      getContactFields: {
        endpoint: '/api/customFields/fields-list?entityScope=contact',
        method: 'GET',
        responseMapping: {
          valueField: 'name',
          labelField: 'displayName',
        },
      },
    },
  },

  properties: [
    {
      displayName: 'Phone Number',
      name: 'phoneNumber',
      type: 'string',
      default: '{{$contact.phoneNumber}}',
      required: true,
    },
    {
      displayName: 'Name',
      name: 'name',
      type: 'string',
      default: '',
      placeholder: 'John Doe',
    },
  ],
};
```

### Example 3: Condition Node

```typescript
export const ifNode: INodeTypeDescription = {
  displayName: 'IF',
  name: 'if',
  icon: 'fa:map-signs',
  group: ['flowControl'],
  version: [2],
  description: 'Route workflow based on conditions',

  defaults: {
    name: 'IF',
    color: '#408000',
  },

  inputs: ['main'],
  outputs: ['main', 'main'],    // ← Multiple outputs
  outputNames: ['true', 'false'], // ← Output labels

  properties: [
    {
      displayName: 'Condition Type',
      name: 'conditionType',
      type: 'options',
      options: [
        { name: 'Boolean Check', value: 'boolean' },
        { name: 'String Comparison', value: 'string' },
        { name: 'Number Comparison', value: 'number' },
      ],
      default: 'boolean',
    },
    {
      displayName: 'Compare To',
      name: 'compareValue',
      type: 'string',
      displayOptions: {
        show: {
          conditionType: ['string'],  // ← Conditional display
        },
      },
    },
  ],

  _pulseline: {
    isCustomNode: false,
    transformationMethod: 'condition_if',
    apiEndpoint: '',
    httpMethod: 'GET',
    requiresAuth: false,
  },
};
```

### Example 4: Native Node with Dynamic Transformation

```typescript
export const waitNode: INodeTypeDescription = {
  displayName: 'Wait',
  name: 'wait',
  icon: 'fa:pause-circle',
  group: ['helpers'],
  version: [1, 1.1],
  defaultVersion: 1.1,
  description: 'Pauses workflow execution',

  defaults: {
    name: 'Wait',
    color: '#804000',
  },

  inputs: ['main'],
  outputs: ['main'],

  properties: [
    {
      displayName: 'Resume',
      name: 'resume',
      type: 'options',
      options: [
        { name: 'After Time Interval', value: 'timeInterval' },
        { name: 'At Specified Time', value: 'specificTime' },
        { name: 'On Webhook Call', value: 'webhook' },
      ],
      default: 'timeInterval',
    },
    {
      displayName: 'Wait Amount',
      name: 'amount',
      type: 'number',
      displayOptions: {
        show: { resume: ['timeInterval'] }
      },
      typeOptions: {
        minValue: 0,
        numberStepSize: 1,
      },
      default: 1,
    },
  ],

  _pulseline: {
    isCustomNode: true,
    transformationMethodSelector: 'resume',  // ← Dynamic selection
    transformationMethodMap: {
      timeInterval: 'wait_timeInterval',
      specificTime: 'wait_specificTime',
      webhook: 'wait_webhook',
    },
    apiEndpoint: '',
    httpMethod: 'POST',
    requiresAuth: false,
  },
};
```

---

## 📚 Property Type Examples

### string

```typescript
{
  displayName: 'Name',
  name: 'name',
  type: 'string',
  default: '',
  required: true,
  placeholder: 'Enter name',
  description: 'Contact name',
}
```

### string (textarea)

```typescript
{
  displayName: 'Notes',
  name: 'notes',
  type: 'string',
  typeOptions: {
    rows: 4,  // ← Textarea
  },
  default: '',
}
```

### number

```typescript
{
  displayName: 'Score',
  name: 'score',
  type: 'number',
  default: 0,
  typeOptions: {
    minValue: 0,
    maxValue: 100,
    numberStepSize: 5,
  },
}
```

### boolean

```typescript
{
  displayName: 'Active',
  name: 'active',
  type: 'boolean',
  default: true,
}
```

### options (static)

```typescript
{
  displayName: 'Priority',
  name: 'priority',
  type: 'options',
  options: [
    { name: 'Low', value: 'low' },
    { name: 'Medium', value: 'medium' },
    { name: 'High', value: 'high' },
  ],
  default: 'medium',
}
```

### options (dynamic)

```typescript
{
  displayName: 'Tag',
  name: 'tagId',
  type: 'options',
  typeOptions: {
    loadOptionsMethod: 'getTags',
  },
  default: '',
  options: [],  // Populated dynamically
}
```

### dateTime

```typescript
{
  displayName: 'Close Date',
  name: 'closeDate',
  type: 'dateTime',
  default: '',
  placeholder: '2025-12-31',
}
```

### notice

```typescript
{
  displayName: 'Info',
  name: 'info',
  type: 'notice',
  default: '',
  description: '⚠️ Important: At least one identifier required',
}
```

### fixedCollection

```typescript
{
  displayName: 'Custom Fields',
  name: 'customFields',
  type: 'fixedCollection',
  typeOptions: {
    multipleValues: true,
  },
  default: {},
  options: [
    {
      name: 'field',
      displayName: 'Field',
      values: [
        {
          displayName: 'Field Name',
          name: 'fieldName',
          type: 'string',
          default: '',
        },
        {
          displayName: 'Field Value',
          name: 'fieldValue',
          type: 'string',
          default: '',
        },
      ],
    },
  ],
}
```

---

## 🔗 Related Documentation

- **Trigger Pattern:** See patterns/trigger-nodes.md
- **Action Pattern:** See patterns/action-nodes.md
- **Load Options:** See patterns/load-options.md
- **Complete Example:** See examples/complete-node-example.md
- **Quick Reference:** See QUICK-REFERENCE.md

---

**File Location:** `workflows/services/nodeRegistry/types.ts`
**Lines:** 1-292
