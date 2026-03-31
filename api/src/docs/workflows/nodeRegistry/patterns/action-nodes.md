# Action Nodes Pattern

> **Workflow actions and transformations** - Perform operations in the middle of workflows

---

## 📋 Overview

**Action nodes** are nodes that:
1. **Perform operations** (API calls, data transformations, waiting)
2. **Have inputs** (connect to previous nodes)
3. **Transform to HTTP Request or native n8n nodes** during compilation
4. **Pass data forward** to next nodes

**File Location:** `workflows/services/nodeRegistry/nodes/`

---

## 🎯 Two Types of Action Nodes

### Type A: API-Backed Actions
Transform to n8n HTTP Request nodes that call backend APIs.

**Examples:**
- Create Contact → `POST /api/contacts`
- Send SMS → `POST /api/sms/send`
- Create Opportunity → `POST /api/opportunities`
- Trigger Workflow → `POST /api/workflows/trigger`

### Type B: Native n8n Nodes
Pass through directly to n8n (no HTTP transformation).

**Examples:**
- Wait → n8n Wait node
- IF → n8n IF node
- Set → n8n Set node
- Code → n8n Code node

---

## 📐 Type A: API-Backed Action Nodes

### Structure

**File:** `createContact.config.ts:8-138`

```typescript
export const pulselineCreateContactNode: INodeTypeDescription = {
  // === BASIC INFO ===
  displayName: 'Create Contact',
  name: 'pulselineCreateContact',
  icon: 'fa:user-plus',
  group: ['contactManagement'],
  version: 1,
  description: 'Creates a new contact in Auton',
  subtitle: '={{$parameter["name"] || $parameter["phoneNumber"]}}',

  defaults: {
    name: 'Create Contact',
    color: '#00d4ff',
  },

  // === INPUTS/OUTPUTS ===
  inputs: ['main'],  // ← Has inputs (not a trigger)
  outputs: ['main'],

  // === PULSELINE METADATA ===
  _pulseline: {
    isCustomNode: true,
    transformationMethod: 'contact_create',  // ← Links to transformation
    apiEndpoint: '/api/contacts',            // ← Backend API
    httpMethod: 'POST',                      // ← HTTP method
    requiresAuth: true,                      // ← Needs API key

    successResponse: {
      fields: [
        { name: 'contactId', type: 'string', required: true },
        { name: 'name', type: 'string' },
        { name: 'phoneNumber', type: 'string' },
        { name: 'email', type: 'string' },
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

  // === PROPERTIES ===
  properties: [
    {
      displayName: 'Phone Number',
      name: 'phoneNumber',
      type: 'string',
      default: '{{$contact.phoneNumber}}',
      required: false,
      placeholder: '+1234567890',
    },
    {
      displayName: 'Email',
      name: 'email',
      type: 'string',
      default: '{{$contact.email}}',
      placeholder: 'contact@example.com',
    },
    {
      displayName: 'Name',
      name: 'name',
      type: 'string',
      default: '{{$contact.name}}',
      placeholder: 'John Doe',
    },
    // ... more properties
  ],
};
```

### Critical _pulseline Fields

**transformationMethod**
Must match transformation file name exactly.

```typescript
_pulseline: {
  transformationMethod: 'contact_create',  // ← File: contact_create.ts
}
```

**File:** `transformationMethodRegistry/contactManagement/contact_create.ts`

**apiEndpoint**
Backend API endpoint that will be called.

```typescript
_pulseline: {
  apiEndpoint: '/api/contacts',  // Full URL: {BACKEND_URL}/api/contacts
  httpMethod: 'POST',
}
```

**requiresAuth**
Whether API call needs authentication key injection.

```typescript
_pulseline: {
  requiresAuth: true,  // ← Placeholder will be replaced with real API key
}
```

**successResponse**
Defines fields returned by API (used for field mapping in next nodes).

```typescript
_pulseline: {
  successResponse: {
    fields: [
      { name: 'contactId', type: 'string', description: 'Created contact ID', required: true },
      { name: 'name', type: 'string', description: 'Contact name' },
      // ...
    ],
  },
}
```

---

## 📐 Type B: Native n8n Nodes

### Structure

**File:** `wait.config.ts:8-270`

```typescript
export const waitNode: INodeTypeDescription = {
  displayName: 'Wait',
  name: 'wait',
  icon: 'fa:pause-circle',
  group: ['helpers'],
  version: [1, 1.1],
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
        { name: 'Appointment Milestone', value: 'appointmentMilestone' },
      ],
      default: 'timeInterval',
    },
    {
      displayName: 'Wait Amount',
      name: 'amount',
      type: 'number',
      displayOptions: {
        show: { resume: ['timeInterval'] }  // ← Only show when resume=timeInterval
      },
      default: 1,
    },
    {
      displayName: 'Wait Unit',
      name: 'unit',
      type: 'options',
      displayOptions: {
        show: { resume: ['timeInterval'] }
      },
      options: [
        { name: 'Seconds', value: 'seconds' },
        { name: 'Minutes', value: 'minutes' },
        { name: 'Hours', value: 'hours' },
        { name: 'Days', value: 'days' },
      ],
      default: 'hours',
    },
    // ... more conditional properties
  ],

  _pulseline: {
    isCustomNode: true,
    apiEndpoint: '',           // ← Not used for native nodes
    httpMethod: 'POST',
    requiresAuth: false,

    // Dynamic transformation based on parameter
    transformationMethodSelector: 'resume',  // ← Parameter name
    transformationMethodMap: {
      timeInterval: 'wait_timeInterval',     // ← Different transformations
      specificTime: 'wait_specificTime',
      webhook: 'wait_webhook',
      appointmentMilestone: 'wait_appointmentMilestone',
    },
  },
};
```

### Dynamic Transformation Method

**transformationMethodSelector**
Parameter name that determines which transformation to use.

**transformationMethodMap**
Maps parameter values to transformation methods.

**File:** `wait.config.ts:243-250`

```typescript
_pulseline: {
  transformationMethodSelector: 'resume',  // Check this parameter
  transformationMethodMap: {
    timeInterval: 'wait_timeInterval',      // If resume='timeInterval'
    specificTime: 'wait_specificTime',      // If resume='specificTime'
    webhook: 'wait_webhook',                // If resume='webhook'
    appointmentMilestone: 'wait_appointmentMilestone',  // If resume='appointmentMilestone'
  },
}
```

**At transformation time:**
```typescript
const resume = node.data.parameters.resume;  // 'timeInterval'
const methodName = config._pulseline.transformationMethodMap[resume];  // 'wait_timeInterval'
const transformation = TransformationRegistry.getMethod(methodName);
```

---

## 🎨 Common Property Patterns

### 1. Text Input with Default Expression

```typescript
{
  displayName: 'Phone Number',
  name: 'phoneNumber',
  type: 'string',
  default: '{{$contact.phoneNumber}}',  // ← Default expression
  placeholder: '+1234567890',
  description: 'Contact phone number',
}
```

### 2. Number Input with Validation

```typescript
{
  displayName: 'Value',
  name: 'value',
  type: 'number',
  default: 0,
  required: true,
  typeOptions: {
    minValue: 0,          // ← Minimum value
    maxValue: 1000000,    // ← Maximum value
    numberStepSize: 100,  // ← Step increment
  },
}
```

### 3. Static Dropdown

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

### 4. Dynamic Dropdown (loadOptionsMethod)

**File:** `createOpportunity.config.ts:78-88`

```typescript
{
  displayName: 'Pipeline',
  name: 'pipelineId',
  type: 'options',
  typeOptions: {
    loadOptionsMethod: 'getPipelines',  // ← Load from API
  },
  default: '',
  required: true,
  options: [],  // Populated dynamically
}
```

**In _pulseline:**

```typescript
_pulseline: {
  loadOptionsMethods: {
    getPipelines: {
      endpoint: '/api/opportunities/pipelines',
      method: 'GET',
      responseMapping: {
        valueField: 'id',
        labelField: 'name',
      },
    },
  },
}
```

See [Load Options Pattern](./load-options.md) for details.

### 5. Dependent Dropdown

**File:** `createOpportunity.config.ts:90-105`

```typescript
{
  displayName: 'Stage',
  name: 'stageId',
  type: 'options',
  typeOptions: {
    loadOptionsMethod: 'getStages',  // ← Load stages
  },
  displayOptions: {
    show: {
      pipelineId: ['*'],  // ← Only show when pipeline selected
    },
  },
}
```

**In _pulseline:**

```typescript
_pulseline: {
  loadOptionsMethods: {
    getStages: {
      endpoint: '/api/opportunities/pipelines/{{$parameter["pipelineId"]}}/stages',
      method: 'GET',
      dependsOn: ['pipelineId'],  // ← Depends on pipelineId parameter
      responseMapping: {
        valueField: 'id',
        labelField: 'name',
      },
    },
  },
}
```

### 6. Multi-line Text (Textarea)

```typescript
{
  displayName: 'Description',
  name: 'description',
  type: 'string',
  typeOptions: {
    rows: 4,  // ← Number of rows
  },
  default: '',
  placeholder: 'Enter description...',
}
```

### 7. Date/Time Picker

```typescript
{
  displayName: 'Expected Close Date',
  name: 'expectedCloseDate',
  type: 'dateTime',
  default: '',
  placeholder: '2025-12-31',
}
```

### 8. fixedCollection (User-defined Fields)

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

**Transformation handles flattening:**

**File:** Transformation system → `buildBodyParameters()` or manual flattening

```typescript
// User adds: { fieldName: 'custom_score', fieldValue: '95' }
// Transformation flattens:
bodyParameters.push({
  name: 'custom_score',
  value: '95'
});
```

### 9. Conditional Display

**File:** `if.config.ts:137-149`

```typescript
{
  displayName: 'Compare To',
  name: 'compareValue',
  type: 'string',
  displayOptions: {
    show: {
      conditionType: ['string'],                     // ← Show when conditionType=string
      stringOperation: ['equals', 'notEquals'],      // ← AND operation is equals/notEquals
    },
  },
}
```

### 10. Conditional Required

**File:** `if.config.ts:36-46`

```typescript
{
  displayName: 'Field to Check',
  name: 'field',
  type: 'string',
  required: true,
  requiredOptions: {
    hide: {
      conditionType: ['tagCheck'],  // ← NOT required when tagCheck
    },
  },
}
```

---

## 🔄 Transformation Flow

### 1. User Configures Node

```typescript
// User fills parameters in UI
const node = {
  id: 'create-contact-1',
  type: 'pulselineCreateContact',
  data: {
    parameters: {
      name: '={{$json.name}}',
      phoneNumber: '+15551234567',
      email: '={{$json.email}}',
    }
  }
};
```

### 2. Workflow Saved

```typescript
// Backend transforms ReactFlow → n8n
const config = NodeRegistry.getNodeConfig('pulselineCreateContact');
const transformationMethod = config._pulseline?.transformationMethod;  // 'contact_create'
const transformation = TransformationRegistry.getMethod(transformationMethod);
```

### 3. Transformation Executes

**File:** `contact_create.ts`

```typescript
transform(node, config, context) {
  const nodeParams = node.data.parameters;
  const endpoint = config._pulseline.apiEndpoint;  // '/api/contacts'
  const method = config._pulseline.httpMethod;     // 'POST'

  // Build body parameters
  const bodyObj = {
    name: nodeParams.name,
    phoneNumber: nodeParams.phoneNumber,
    email: nodeParams.email,
  };

  const bodyParameters = buildBodyParameters(bodyObj);

  // Create HTTP Request node
  return {
    nodes: [{
      id: node.id,
      type: 'n8n-nodes-base.httpRequest',
      parameters: {
        method: 'POST',
        url: `${BACKEND_URL}/api/contacts`,
        sendBody: true,
        contentType: 'json',
        bodyParameters: { parameters: bodyParameters },
        jsonHeaders: '{"Authorization": "Bearer TENANT_API_KEY_PLACEHOLDER"}',
      }
    }],
  };
}
```

### 4. Authentication Injection

**File:** `workflows/workflowCrudManager/updateWorkflow.ts:150-151`

```typescript
// Replace placeholder with real API key
const nodesWithAuth = injectAuthenticationKey(compiledNodes, apiKey);

// TENANT_API_KEY_PLACEHOLDER → ak_123...sk_abc...
```

### 5. Workflow Runs in n8n

```typescript
// n8n HTTP Request executes
POST https://backend.pulseline.io/api/contacts
Headers: {
  "Authorization": "Bearer ak_123...sk_abc...",
  "Content-Type": "application/json"
}
Body: {
  "name": "John Doe",
  "phoneNumber": "+15551234567",
  "email": "john@example.com"
}

// Response becomes available in next node as $json
```

---

## ⚠️ Common Mistakes

### ❌ Mistake 1: transformationMethod Doesn't Match File

```typescript
// ❌ WRONG
_pulseline: {
  transformationMethod: 'createContact',  // File: contact_create.ts
}
```

```typescript
// ✅ CORRECT
_pulseline: {
  transformationMethod: 'contact_create',  // ← Matches file name
}
```

### ❌ Mistake 2: Missing requiresAuth

```typescript
// ❌ WRONG - Calls authenticated endpoint without auth
_pulseline: {
  apiEndpoint: '/api/contacts',
  requiresAuth: false,  // API will return 401
}
```

```typescript
// ✅ CORRECT
_pulseline: {
  apiEndpoint: '/api/contacts',
  requiresAuth: true,  // ← Placeholder will be replaced
}
```

### ❌ Mistake 3: Empty inputs for Action Node

```typescript
// ❌ WRONG - Actions should have inputs
inputs: [],  // This is for triggers only!
outputs: ['main'],
```

```typescript
// ✅ CORRECT
inputs: ['main'],  // ← Actions have inputs
outputs: ['main'],
```

### ❌ Mistake 4: Wrong Property Type

```typescript
// ❌ WRONG - Date stored as string
{
  displayName: 'Close Date',
  name: 'closeDate',
  type: 'string',  // Should be dateTime
}
```

```typescript
// ✅ CORRECT
{
  displayName: 'Close Date',
  name: 'closeDate',
  type: 'dateTime',  // ← Proper date picker
}
```

---

## 🧪 Testing

### Test Node Config

```typescript
const config = NodeRegistry.getNodeConfig('pulselineCreateContact');
expect(config).toBeDefined();
expect(config.inputs).toEqual(['main']);
expect(config._pulseline?.transformationMethod).toBe('contact_create');
expect(config._pulseline?.requiresAuth).toBe(true);
```

### Test Transformation

```typescript
const transformation = TransformationRegistry.getMethod('contact_create');
const result = transformation.transform(node, config, context);

expect(result.nodes.length).toBe(1);
expect(result.nodes[0].type).toBe('n8n-nodes-base.httpRequest');
expect(result.nodes[0].parameters.method).toBe('POST');
expect(result.nodes[0].parameters.url).toContain('/api/contacts');
```

### Test in Workflow

```typescript
// Create workflow with action node
const workflow = {
  nodes: [
    { id: 'webhook', type: 'webhook' },
    { id: 'create', type: 'pulselineCreateContact', data: { parameters: { ... } } }
  ],
  edges: [
    { source: 'webhook', target: 'create' }
  ]
};

// Save and transform
await saveWorkflow(workflow);

// Verify compiled
const compiled = await readCompiledWorkflow(tenantId, workflowId);
expect(compiled.nodes.find(n => n.id === 'create')).toBeDefined();
```

---

## 📊 Examples in Codebase

### API-Backed Actions

| Node | File | Transformation | Endpoint |
|------|------|---------------|----------|
| Create Contact | `createContact.config.ts` | `contact_create.ts` | `POST /api/contacts` |
| Send SMS | `sendSms.config.ts` | `sms_send.ts` | `POST /api/sms/send` |
| Create Opportunity | `createOpportunity.config.ts` | `opportunity_create.ts` | `POST /api/opportunities` |
| Trigger Workflow | `triggerWorkflow.config.ts` | `action_triggerWorkflow.ts` | `POST /api/workflows/trigger` |

### Native n8n Nodes

| Node | File | Transformation | Type |
|------|------|---------------|------|
| Wait | `wait.config.ts` | `wait_*.ts` (dynamic) | Native n8n Wait |
| IF | `if.config.ts` | `condition_if.ts` | Native n8n IF |
| Set | `set.config.ts` | Native pass-through | Native n8n Set |

---

## ✅ Checklist for New Action Node

**API-Backed:**
- [ ] inputs: ['main']
- [ ] outputs: ['main']
- [ ] transformationMethod matches transformation file name
- [ ] apiEndpoint correct
- [ ] httpMethod correct (GET, POST, PUT, DELETE)
- [ ] requiresAuth: true (if authenticated endpoint)
- [ ] successResponse fields defined
- [ ] All required parameters have required: true
- [ ] loadOptionsMethods configured (if has dropdowns)
- [ ] Registered in index.ts
- [ ] Transformation method implemented
- [ ] Tested in workflow

**Native n8n:**
- [ ] inputs: ['main']
- [ ] Transformation method(s) implemented
- [ ] If dynamic: transformationMethodSelector set
- [ ] If dynamic: transformationMethodMap complete
- [ ] Registered in index.ts
- [ ] Tested transformation outputs valid n8n node

---

**File Locations:**
- Action Node Configs: `workflows/services/nodeRegistry/nodes/`
- Transformations: `transformationMethodRegistry/`
- Authentication Injection: `transformationSystem/utils/injectAuthenticationKey.ts`
- Expression Helpers: `transformationMethodRegistry/utils/expressionHelpers.ts`
