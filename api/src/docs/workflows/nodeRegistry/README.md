# Node Registry System

> **Central registry for all workflow nodes**
> Manages node configurations, validation, and frontend integration

---

## 📋 Overview

The **Node Registry** is the single source of truth for all available workflow nodes in Pulseline. It:

1. **Registers** all node types (triggers, actions, conditions)
2. **Defines** node configurations (parameters, types, validation)
3. **Provides** node metadata to frontend (for UI rendering)
4. **Links** nodes to transformation methods (for n8n compilation)
5. **Validates** node instances against their configurations

**File Location:** `backend/src/workflows/services/nodeRegistry/`

---

## 🏗️ Architecture

```
Node Registry System
├── index.ts                         # Central registry service
├── types.ts                         # Type definitions (INodeTypeDescription)
├── getAllNodes.ts                   # Export for external use
├── readNodeConfig.ts                # Export for external use
└── nodes/                           # Node configuration files
    ├── trigger/                     # Trigger nodes (no inputs)
    │   ├── smsReceivedTrigger.config.ts
    │   ├── phoneCallCompletedTrigger.config.ts
    │   └── eventLifecycleMilestoneTrigger.config.ts
    ├── action/                      # Action nodes
    │   ├── wait.config.ts
    │   ├── triggerWorkflow.config.ts
    │   └── aiProcessing.config.ts
    ├── condition/                   # Conditional routing nodes
    │   └── if.config.ts
    ├── pulseline/                   # Custom business logic nodes
    │   ├── createContact.config.ts
    │   ├── updateContact.config.ts
    │   ├── findContact.config.ts
    │   ├── addContactTag.config.ts
    │   └── removeContactTag.config.ts
    ├── sms/                         # SMS communication
    │   ├── sendSms.config.ts
    │   ├── inboundAgentSms.config.ts
    │   └── outboundAgentSms.config.ts
    ├── phone/                       # Phone operations
    │   └── outboundCall.config.ts
    ├── opportunities/               # Opportunity management
    │   ├── createOpportunity.config.ts
    │   ├── updateOpportunity.config.ts
    │   └── deleteOpportunity.config.ts
    └── adapters/                    # Invisible adapter nodes
        └── contactAdapter.config.ts
```

---

## 🎯 Node Categories

The registry automatically categorizes nodes based on their configuration:

### 1. Trigger Nodes
**Definition:** Start workflows when events occur
**Characteristics:**
- `inputs: []` (no inputs)
- `outputs: ['main']` (one output)
- `_pulseline.isTrigger: true`
- Auto-create subscriptions on workflow save

**Examples:**
- SMS Received Trigger
- Phone Call Completed Trigger
- Event Lifecycle Milestone Trigger

**File:** `smsReceivedTrigger.config.ts:44`
```typescript
inputs: [],  // Triggers have no inputs
outputs: ['main'],

_pulseline: {
  isTrigger: true,
  triggerType: 'sms.received.v1',
  transformationMethod: 'trigger_webhook',
}
```

### 2. Action Nodes
**Definition:** Perform operations and transformations
**Characteristics:**
- `inputs: ['main']` (one or more inputs)
- `outputs: ['main']` (single output)
- Transform to HTTP Request or native n8n nodes

**Examples:**
- Create Contact
- Send SMS
- Trigger Workflow
- Wait (native n8n)

**File:** `createContact.config.ts:22-23`
```typescript
inputs: ['main'],
outputs: ['main'],

_pulseline: {
  transformationMethod: 'contact_create',
  apiEndpoint: '/api/contacts',
  httpMethod: 'POST',
  requiresAuth: true,
}
```

### 3. Condition Nodes
**Definition:** Route workflows based on conditions
**Characteristics:**
- `inputs: ['main']`
- `outputs: ['main', 'main']` (multiple outputs)
- `outputNames: ['true', 'false']`

**Examples:**
- IF node
- Switch node

**File:** `if.config.ts:22-24`
```typescript
inputs: ['main'],
outputs: ['main', 'main'],
outputNames: ['true', 'false'],
```

---

## 📐 Node Configuration Structure

Every node is defined by an `INodeTypeDescription` object.

### Required Fields

**File:** `types.ts:142-198`

```typescript
export interface INodeTypeDescription {
  // === REQUIRED ===
  displayName: string;              // UI display name
  name: string;                     // Unique identifier
  group: string[];                  // Category tags
  version: number | number[];       // Node version(s)
  description: string;              // Help text
  defaults: NodeDefaults;           // Default name and color
  inputs: Array<string> | string;   // Input connections
  outputs: Array<string> | string;  // Output connections
  properties: INodeProperties[];    // Configuration parameters

  // === OPTIONAL ===
  icon?: string;                    // Font Awesome icon
  iconUrl?: string;                 // Custom icon URL
  subtitle?: string;                // Dynamic subtitle expression
  outputNames?: string[];           // Output labels

  // === PULSELINE CUSTOM ===
  _pulseline?: IPulselineMetadata;  // Transformation metadata
}
```

### _pulseline Metadata

**File:** `types.ts:256-277`

Critical metadata for transformation system:

```typescript
_pulseline: {
  isCustomNode: boolean;                    // Is this a custom Pulseline node?

  // === TRIGGER-SPECIFIC ===
  isTrigger?: boolean;                      // Is this a trigger node?
  triggerType?: string;                     // Event type (e.g., 'sms.received.v1')

  // === TRANSFORMATION ===
  transformationMethod: string;             // Method name in transformation registry
  apiEndpoint: string;                      // Backend API endpoint
  httpMethod: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  requiresAuth: boolean;                    // Needs API key injection?

  // === CONDITIONAL OUTPUT ===
  conditionalOutput?: {                     // Auto-generate IF node?
    enabled: boolean;
    field: string;                          // Response field to check
    trueLabel?: string;
    falseLabel?: string;
  };

  // === DYNAMIC DROPDOWNS ===
  loadOptionsMethods?: Record<string, {
    endpoint: string;                       // API endpoint
    method: 'GET' | 'POST';
    responseMapping: {                      // How to map response
      valueField: string;                   // Field for option value
      labelField: string;                   // Field for option label
      dataPath?: string;                    // Nested data path
    };
  }>;

  // === SUCCESS RESPONSE ===
  successResponse?: {
    fields: Array<{
      name: string;
      type: 'string' | 'number' | 'boolean' | 'object' | 'array';
      description?: string;
      required?: boolean;
    }>;
  };
}
```

---

## 🔧 Registry Service API

**File:** `index.ts:123-261`

### getAllNodes()
Get lightweight list of all nodes for UI.

```typescript
const nodes = NodeRegistry.getAllNodes();
// Returns: NodeListItem[]
// [
//   {
//     name: 'pulselineCreateContact',
//     displayName: 'Create Contact',
//     description: 'Creates a new contact',
//     group: ['contactManagement'],
//     icon: 'fa:user-plus',
//     version: 1,
//     category: 'action'
//   },
//   ...
// ]
```

### getNodeConfig(nodeName)
Get full configuration for a specific node.

```typescript
const config = NodeRegistry.getNodeConfig('pulselineCreateContact');
// Returns: INodeTypeDescription | null

if (config) {
  console.log(config.properties);  // All parameters
  console.log(config._pulseline);  // Transformation metadata
}
```

### getNodesByCategory(category)
Filter nodes by category.

```typescript
const triggers = NodeRegistry.getNodesByCategory('trigger');
const actions = NodeRegistry.getNodesByCategory('action');
const conditions = NodeRegistry.getNodesByCategory('condition');
```

### validateNode(node)
Validate a node instance against its configuration.

```typescript
const result = NodeRegistry.validateNode(nodeInstance);
// Returns: { valid: boolean; errors: string[] }

if (!result.valid) {
  console.error('Validation errors:', result.errors);
  // [
  //   'Missing required parameter "phoneNumber" for node "Create Contact"',
  //   'Invalid version 2 for node "pulselineCreateContact". Valid versions: 1'
  // ]
}
```

### createNodeInstance(nodeName, position, customName?)
Create a new node instance with default values.

```typescript
const newNode = NodeRegistry.createNodeInstance(
  'pulselineCreateContact',
  [100, 200],
  'Create Lead Contact'
);

// Returns:
// {
//   id: 'pulselineCreateContact-1705543234567-abc123',
//   name: 'Create Lead Contact',
//   type: 'n8n-nodes-base.pulselineCreateContact',
//   typeVersion: 1,
//   position: [100, 200],
//   parameters: {
//     phoneNumber: '{{$contact.phoneNumber}}',  // Defaults from config
//     email: '{{$contact.email}}',
//     name: '{{$contact.name}}',
//   }
// }
```

---

## 🔄 Node Lifecycle

### 1. **Registration**

**File:** `index.ts:54-96`

Import and add to registry:

```typescript
// Import node config
import { pulselineCreateContactNode } from './nodes/pulseline/createContact.config';

// Add to registry
const nodeConfigs: Record<string, INodeTypeDescription> = {
  pulselineCreateContact: pulselineCreateContactNode,
  // ... other nodes
};
```

### 2. **Frontend Query**

Frontend requests available nodes:

```typescript
// API: GET /api/workflows/nodes
const nodes = NodeRegistry.getAllNodes();

// Frontend displays in sidebar by category
```

### 3. **Node Addition**

User drags node into workflow:

```typescript
// Frontend calls createNodeInstance
const newNode = NodeRegistry.createNodeInstance(
  'pulselineCreateContact',
  [x, y]
);

// Add to ReactFlow state
```

### 4. **Configuration**

User opens node config panel:

```typescript
// Frontend requests full config
const config = NodeRegistry.getNodeConfig('pulselineCreateContact');

// Render parameters based on config.properties
config.properties.forEach(property => {
  renderParameter(property);
});
```

### 5. **Transformation**

Workflow is saved and transformed:

```typescript
// Transformation system reads config
const config = NodeRegistry.getNodeConfig(node.type);
const transformationMethod = config._pulseline?.transformationMethod;

// Execute transformation
const transformation = TransformationRegistry.getMethod(transformationMethod);
const result = transformation.transform(node, config, context);
```

### 6. **Execution**

Workflow runs in n8n with compiled nodes.

---

## 🎨 Property Types

**File:** `types.ts:6-24`

### Basic Types

```typescript
{
  displayName: 'Name',
  name: 'name',
  type: 'string',        // Text input
  default: '',
  required: true,
}

{
  displayName: 'Score',
  name: 'score',
  type: 'number',        // Number input
  default: 0,
}

{
  displayName: 'Active',
  name: 'active',
  type: 'boolean',       // Checkbox
  default: false,
}
```

### Options (Static Dropdown)

```typescript
{
  displayName: 'Status',
  name: 'status',
  type: 'options',
  options: [
    { name: 'Active', value: 'active' },
    { name: 'Inactive', value: 'inactive' },
  ],
  default: 'active',
}
```

### Options (Dynamic Dropdown)

**File:** `createContact.config.ts:119-124`

```typescript
{
  displayName: 'Field Name',
  name: 'fieldName',
  type: 'options',
  typeOptions: {
    loadOptionsMethod: 'getContactFields',  // ← Calls API
  },
  default: '',
}
```

Then in `_pulseline`:

```typescript
_pulseline: {
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
}
```

### fixedCollection (Dynamic Fields)

**File:** `createContact.config.ts:101-136`

```typescript
{
  displayName: 'Additional Custom Fields',
  name: 'contactFields',
  type: 'fixedCollection',
  typeOptions: {
    multipleValues: true,  // User can add multiple
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
          type: 'options',
          typeOptions: {
            loadOptionsMethod: 'getContactFields',
          },
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

### Conditional Display

**File:** `if.config.ts:36-46`

```typescript
{
  displayName: 'Field to Check',
  name: 'field',
  type: 'string',
  required: true,

  // Hide when tagCheck mode
  requiredOptions: {
    hide: {
      conditionType: ['tagCheck'],
    },
  },

  // Disable (read-only) when tagCheck mode
  disabledOptions: {
    show: {
      conditionType: ['tagCheck'],
    },
  },
}
```

---

## ⚠️ Common Mistakes

### ❌ Mistake 1: Forgot to Register Node

```typescript
// ❌ WRONG - Created config but didn't add to registry
export const myNewNode: INodeTypeDescription = { ... };
```

```typescript
// ✅ CORRECT - Add to index.ts
import { myNewNode } from './nodes/pulseline/myNode.config';

const nodeConfigs: Record<string, INodeTypeDescription> = {
  myNode: myNewNode,  // ← Add here
};
```

### ❌ Mistake 2: Wrong transformationMethod Name

```typescript
// ❌ WRONG - Doesn't match transformation file
_pulseline: {
  transformationMethod: 'create_contact',  // File is contact_create.ts
}
```

```typescript
// ✅ CORRECT - Match transformation file name
_pulseline: {
  transformationMethod: 'contact_create',  // ← Matches contact_create.ts
}
```

### ❌ Mistake 3: loadOptionsMethod Misconfiguration

```typescript
// ❌ WRONG - Wrong response mapping fields
loadOptionsMethods: {
  getTags: {
    endpoint: '/api/contacts/tags',
    method: 'GET',
    responseMapping: {
      valueField: 'id',         // Field doesn't exist in response
      labelField: 'name',       // Field doesn't exist in response
    },
  },
}

// Response: { tags: [{ tagId: 'x', tagName: 'y' }] }
```

```typescript
// ✅ CORRECT - Match actual response fields
loadOptionsMethods: {
  getTags: {
    endpoint: '/api/contacts/tags',
    method: 'GET',
    responseMapping: {
      valueField: 'tagId',      // ← Matches response
      labelField: 'tagName',    // ← Matches response
      dataPath: 'tags',         // ← Nested array path
    },
  },
}
```

### ❌ Mistake 4: Inputs/Outputs Mismatch

```typescript
// ❌ WRONG - Trigger with inputs
inputs: ['main'],     // Triggers should have NO inputs
outputs: ['main'],

_pulseline: {
  isTrigger: true,    // Conflict!
}
```

```typescript
// ✅ CORRECT - Triggers have no inputs
inputs: [],           // ← Empty for triggers
outputs: ['main'],

_pulseline: {
  isTrigger: true,
}
```

---

## 🧪 Testing

### Test Node Appears in UI

```typescript
// 1. Add node to registry
const nodeConfigs = {
  myNewNode: myNewNodeConfig,
};

// 2. Restart backend
// 3. Check API endpoint
GET /api/workflows/nodes

// 4. Verify node in response
{
  "nodes": [
    {
      "name": "myNewNode",
      "displayName": "My New Node",
      "category": "action"
    }
  ]
}
```

### Test Node Configuration

```typescript
// Get config
const config = NodeRegistry.getNodeConfig('myNewNode');

// Verify fields
expect(config).toBeDefined();
expect(config.displayName).toBe('My New Node');
expect(config._pulseline?.transformationMethod).toBe('my_transformation');
expect(config.properties.length).toBeGreaterThan(0);
```

### Test Node Validation

```typescript
const node = {
  id: 'test-1',
  type: 'myNewNode',
  typeVersion: 1,
  parameters: {
    // Missing required parameter
  }
};

const result = NodeRegistry.validateNode(node);
expect(result.valid).toBe(false);
expect(result.errors).toContain('Missing required parameter');
```

---

## 🔗 Integration with Other Systems

### With Transformation System

**File:** Transformation methods read node configs

```typescript
// In transformation method
transform(node: ReactFlowNode, config: INodeTypeDescription) {
  const endpoint = config._pulseline?.apiEndpoint;
  const method = config._pulseline?.httpMethod;
  const requiresAuth = config._pulseline?.requiresAuth;

  // Use config to build HTTP Request node
}
```

### With Trigger Subscriptions

**File:** Trigger nodes auto-create subscriptions

```typescript
// Frontend detects trigger node
if (config._pulseline?.isTrigger && config._pulseline?.triggerType) {
  // Create subscription
  await createSubscription({
    tenantId,
    workflowId,
    triggerType: config._pulseline.triggerType,
    webhookUrl: productionWebhookUrl,
  });
}
```

### With Frontend

**File:** Frontend renders based on config

```typescript
// NodeConfigPanel renders parameters
config.properties.forEach(property => {
  switch (property.type) {
    case 'string':
      return <TextInput property={property} />;
    case 'options':
      if (property.typeOptions?.loadOptionsMethod) {
        return <DynamicDropdown property={property} />;
      }
      return <StaticDropdown property={property} />;
    case 'fixedCollection':
      return <FixedCollectionRenderer property={property} />;
  }
});
```

---

## 📊 Registry Statistics

```typescript
const stats = NodeRegistry.getNodeStats();

// {
//   total: 28,
//   triggers: 4,
//   actions: 21,
//   conditions: 3
// }
```

---

## 🚀 Next Steps

1. **Create your first node:** See [QUICK-REFERENCE.md](./QUICK-REFERENCE.md)
2. **Learn trigger pattern:** See [Trigger Nodes](./patterns/trigger-nodes.md)
3. **Learn action pattern:** See [Action Nodes](./patterns/action-nodes.md)
4. **Add dynamic dropdowns:** See [Load Options](./patterns/load-options.md)
5. **See complete example:** See [Complete Example](./examples/complete-node-example.md)

---

**File:** `workflows/services/nodeRegistry/index.ts`
**Lines:** 1-262
