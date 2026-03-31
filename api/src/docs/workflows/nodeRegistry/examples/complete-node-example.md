# Complete Node Example: Create Contact

> **Full lifecycle walkthrough** - From config file to runtime execution

---

## 📋 Overview

This document walks through the **complete lifecycle** of the "Create Contact" node:

1. **Node Configuration** (`createContact.config.ts`)
2. **Frontend Registration** (Node appears in editor)
3. **User Configuration** (User fills in parameters)
4. **Workflow Save** (ReactFlow → Database)
5. **Transformation** (Pulseline → n8n)
6. **Runtime Execution** (n8n processes workflow)
7. **Response Handling** (Backend → Frontend)

**Node Type:** API-backed Action Node
**Patterns Used:**
- ✅ API-backed transformation (HTTP Request)
- ✅ Dynamic dropdowns (loadOptionsMethod)
- ✅ fixedCollection (custom fields)
- ✅ Notice field (user warnings)
- ✅ Multi-line text (textarea)
- ✅ Expression support ({{$contact.name}})
- ✅ Authentication (API key injection)

---

## 1️⃣ Node Configuration

### File: `createContact.config.ts`

**Location:** `workflows/services/nodeRegistry/nodes/pulseline/createContact.config.ts:1-139`

```typescript
import { INodeTypeDescription } from '../../types';

export const pulselineCreateContactNode: INodeTypeDescription = {
  // === BASIC INFO ===
  displayName: 'Create Contact',
  name: 'pulselineCreateContact',
  icon: 'fa:user-plus',
  group: ['contactManagement'],
  version: 1,
  description: 'Creates a new contact in Auton',

  // Dynamic subtitle showing phone/email/name
  subtitle: '={{$parameter["name"] || $parameter["phoneNumber"] || $parameter["email"]}}',

  defaults: {
    name: 'Create Contact',
    color: '#00d4ff',
  },

  // === INPUTS/OUTPUTS ===
  inputs: ['main'],
  outputs: ['main'],

  // === PULSELINE METADATA ===
  _pulseline: {
    isCustomNode: true,
    transformationMethod: 'contact_create',
    apiEndpoint: '/api/contacts',
    httpMethod: 'POST',
    requiresAuth: true,

    // Define response structure
    successResponse: {
      fields: [
        { name: 'contactId', type: 'string', description: 'ID of created contact', required: true },
        { name: 'name', type: 'string', description: 'Contact full name' },
        { name: 'phoneNumber', type: 'string', description: 'Contact phone number' },
        { name: 'email', type: 'string', description: 'Contact email address' },
        { name: 'createdAt', type: 'string', description: 'Creation timestamp' },
      ],
    },

    // Load custom fields dropdown
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
    // Notice field - no input, just info
    {
      displayName: 'Required Field Notice',
      name: 'requiredFieldNotice',
      type: 'notice',
      default: '',
      description: '⚠️ At least one contact identifier is required: Phone Number OR Email.',
    },

    // Phone number input
    {
      displayName: 'Phone Number',
      name: 'phoneNumber',
      type: 'string',
      default: '{{$contact.phoneNumber}}',
      required: false,
      placeholder: '+1234567890',
      description: 'Phone number of the contact. If provided, contact will be created with SMS channel.',
    },

    // Email input
    {
      displayName: 'Email',
      name: 'email',
      type: 'string',
      default: '{{$contact.email}}',
      required: false,
      placeholder: 'contact@example.com',
      description: 'Email address of the contact. Required if phone number is not provided.',
    },

    // Name input
    {
      displayName: 'Name',
      name: 'name',
      type: 'string',
      default: '{{$contact.name}}',
      required: false,
      placeholder: 'John Doe',
      description: 'Full name of the contact',
    },

    // Notes - multi-line textarea
    {
      displayName: 'Notes',
      name: 'notes',
      type: 'string',
      typeOptions: {
        rows: 3,
      },
      default: '',
      required: false,
      placeholder: 'Additional notes about the contact',
      description: 'Any additional notes or information about the contact',
    },

    // fixedCollection - dynamic custom fields
    {
      displayName: 'Additional Custom Fields',
      name: 'contactFields',
      type: 'fixedCollection',
      typeOptions: {
        multipleValues: true,
      },
      default: {},
      placeholder: 'Add Custom Field',
      description: 'Add additional custom contact fields (e.g., custom_lead_score, custom_source)',
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
                loadOptionsMethod: 'getContactFields',  // ← Load from API
              },
              default: '',
              description: 'Select a custom field to set',
            },
            {
              displayName: 'Field Value',
              name: 'fieldValue',
              type: 'string',
              default: '',
              placeholder: 'Field value or expression',
              description: 'Value to set for this field. Can use expressions like {{$json.customField}}',
            },
          ],
        },
      ],
    },
  ],
};
```

---

## 2️⃣ Frontend Registration

### Registration in Index

**File:** `workflows/services/nodeRegistry/index.ts:54-96`

```typescript
import { pulselineCreateContactNode } from './nodes/pulseline/createContact.config';

const nodeConfigs: Record<string, INodeTypeDescription> = {
  // ... other nodes
  pulselineCreateContact: pulselineCreateContactNode,
};

export class NodeRegistry {
  static getAllNodes(): INodeTypeDescription[] {
    return Object.values(nodeConfigs);
  }

  static getNodeConfig(nodeName: string): INodeTypeDescription | undefined {
    return nodeConfigs[nodeName];
  }
}
```

### Frontend API Call

**Frontend workflow:**

```typescript
// GET /api/workflows/nodes
const response = await fetch(`${BACKEND_URL}/api/workflows/nodes`);
const allNodes = await response.json();

// Find our node
const createContactNode = allNodes.find(n => n.name === 'pulselineCreateContact');

// Result:
{
  displayName: 'Create Contact',
  name: 'pulselineCreateContact',
  icon: 'fa:user-plus',
  group: ['contactManagement'],
  version: 1,
  description: 'Creates a new contact in Auton',
  defaults: {
    name: 'Create Contact',
    color: '#00d4ff',
  },
  properties: [...],
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
  },
}
```

---

## 3️⃣ User Configuration

### Node Appears in Editor

**Frontend UI:**

```
┌─────────────────────────────────────────┐
│  Node Palette                           │
├─────────────────────────────────────────┤
│  Contact Management                     │
│  ┌───────────────────────────────────┐  │
│  │ 📱 Create Contact                 │  │
│  │ Creates a new contact in Auton    │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### User Drags Node to Canvas

**ReactFlow state:**

```typescript
{
  id: 'node-abc123',
  type: 'pulselineCreateContact',
  position: { x: 250, y: 150 },
  data: {
    parameters: {}  // Empty initially
  }
}
```

### User Opens Node Config Panel

**Frontend renders properties:**

```
┌─────────────────────────────────────────────────┐
│  Create Contact                           [X]   │
├─────────────────────────────────────────────────┤
│                                                 │
│  ⚠️ Required Field Notice                      │
│  At least one contact identifier is required:  │
│  Phone Number OR Email.                        │
│                                                 │
│  Phone Number                                  │
│  ┌───────────────────────────────────────────┐ │
│  │ {{$contact.phoneNumber}}                  │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
│  Email                                         │
│  ┌───────────────────────────────────────────┐ │
│  │ {{$contact.email}}                        │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
│  Name                                          │
│  ┌───────────────────────────────────────────┐ │
│  │ {{$contact.name}}                         │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
│  Notes                                         │
│  ┌───────────────────────────────────────────┐ │
│  │                                           │ │
│  │                                           │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
│  Additional Custom Fields        [+ Add Field] │
│                                                 │
└─────────────────────────────────────────────────┘
```

### User Adds Custom Field

**User clicks "+ Add Field":**

```
┌─────────────────────────────────────────────────┐
│  Additional Custom Fields                       │
│                                                 │
│  Field #1                                       │
│  Field Name                     [▼]             │
│  ┌───────────────────────────────────────────┐ │
│  │ Loading...                                │ │  ← Frontend calls loadOptionsMethod
│  └───────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

**Frontend makes API call:**

```typescript
// GET /api/customFields/fields-list?entityScope=contact
const response = await fetch(
  `${BACKEND_URL}/api/customFields/fields-list?entityScope=contact`,
  {
    headers: {
      'Authorization': `Bearer ${userToken}`,
    }
  }
);

const data = await response.json();
// Response:
[
  { name: 'custom_lead_score', displayName: 'Lead Score' },
  { name: 'custom_source', displayName: 'Source' },
  { name: 'custom_industry', displayName: 'Industry' },
]

// Frontend maps using responseMapping
const options = data.map(item => ({
  name: item.displayName,   // 'Lead Score'
  value: item.name,         // 'custom_lead_score'
}));
```

**Dropdown populated:**

```
┌─────────────────────────────────────────────────┐
│  Field Name                     [▼]             │
│  ┌───────────────────────────────────────────┐ │
│  │ Lead Score                                │ │
│  │ Source                                    │ │
│  │ Industry                                  │ │
│  └───────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

### User Completes Configuration

**Final state:**

```typescript
{
  id: 'node-abc123',
  type: 'pulselineCreateContact',
  position: { x: 250, y: 150 },
  data: {
    parameters: {
      phoneNumber: '{{$contact.phoneNumber}}',
      email: '{{$contact.email}}',
      name: '{{$contact.name}}',
      notes: 'New lead from website form',
      contactFields: {
        field: [
          {
            fieldName: 'custom_lead_score',
            fieldValue: '85'
          },
          {
            fieldName: 'custom_source',
            fieldValue: 'website'
          }
        ]
      }
    }
  }
}
```

---

## 4️⃣ Workflow Save

### Frontend Saves Workflow

```typescript
// POST /api/workflows
await fetch(`${BACKEND_URL}/api/workflows`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${userToken}`,
  },
  body: JSON.stringify({
    name: 'New Contact Workflow',
    nodes: [
      {
        id: 'node-abc123',
        type: 'pulselineCreateContact',
        position: { x: 250, y: 150 },
        data: {
          parameters: {
            phoneNumber: '{{$contact.phoneNumber}}',
            email: '{{$contact.email}}',
            name: '{{$contact.name}}',
            notes: 'New lead from website form',
            contactFields: {
              field: [
                { fieldName: 'custom_lead_score', fieldValue: '85' },
                { fieldName: 'custom_source', fieldValue: 'website' }
              ]
            }
          }
        }
      }
    ],
    edges: []
  })
});
```

### Backend Stores Workflow

**Database record:**

```json
{
  "workflowId": "wf_123456",
  "tenantId": "ten_abc",
  "name": "New Contact Workflow",
  "status": "draft",
  "reactflowData": {
    "nodes": [...],
    "edges": [...]
  },
  "createdAt": "2025-01-18T10:00:00Z"
}
```

---

## 5️⃣ Transformation (Deploy to Production)

### User Clicks "Deploy to Production"

**Frontend calls:**

```typescript
// POST /api/workflows/:workflowId/deploy
await fetch(`${BACKEND_URL}/api/workflows/wf_123456/deploy`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${userToken}`,
  }
});
```

### Backend Transformation Process

**File:** `transformationMethodRegistry/contactManagement/contact_create.ts:16-91`

```typescript
export class CreateContactTransformation implements Transformation {
  readonly name = 'contact_create';
  readonly priority = 50;

  matches(node: ReactFlowNode, config?: INodeTypeDescription): boolean {
    return config?.name === 'pulselineCreateContact';
  }

  transform(node: ReactFlowNode, config: INodeTypeDescription, context: TransformationContext): TransformationResult {
    const { id, position, data } = node;
    const nodeParams = data?.parameters || {};

    const backendUrl = process.env.BACKEND_URL || 'https://backend.pulseline.io';
    const endpoint = config._pulseline?.apiEndpoint || '/api/contacts';

    // Build body from node parameters
    const bodyObj: Record<string, any> = {
      name: nodeParams.name,
      phoneNumber: nodeParams.phoneNumber,
      email: nodeParams.email,
      tags: nodeParams.tags,
      customFields: nodeParams.customFields,
    };

    const bodyParameters = buildBodyParameters(bodyObj);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer TENANT_API_KEY_PLACEHOLDER',
    };

    const httpParameters: HttpRequestParameters = {
      method: 'POST',
      url: `${backendUrl}${endpoint}`,
      authentication: 'none',
      sendBody: true,
      contentType: 'json',
      specifyBody: 'keypair',
      bodyParameters: {
        parameters: bodyParameters,
      },
      sendHeaders: true,
      specifyHeaders: 'json',
      jsonHeaders: JSON.stringify(headers),
      options: {
        response: {
          response: {
            neverError: true,
          },
        },
      },
    };

    const httpNode: HttpRequestNodeConfig = {
      id: 'node-abc123',
      name: 'node-abc123',
      type: 'n8n-nodes-base.httpRequest',
      typeVersion: 4.2,
      position: [250, 150],
      parameters: httpParameters,
    };

    return {
      nodes: [httpNode],
      internalEdges: [],
      replacements: {},
      metadata: {
        transformationName: 'contact_create',
        originalNodeId: 'node-abc123',
        originalNodeType: 'pulselineCreateContact',
        nodesCreated: 1,
        custom: { endpoint: '/api/contacts' },
      },
    };
  }
}
```

### buildBodyParameters Helper

**File:** `transformationSystem/utils/expressionHelpers.ts`

```typescript
// Input bodyObj:
{
  name: '{{$contact.name}}',
  phoneNumber: '{{$contact.phoneNumber}}',
  email: '{{$contact.email}}',
  notes: 'New lead from website form',
  customFields: {
    field: [
      { fieldName: 'custom_lead_score', fieldValue: '85' },
      { fieldName: 'custom_source', fieldValue: 'website' }
    ]
  }
}

// buildBodyParameters processes:
// 1. Flatten fixedCollection
// 2. Build n8n expression format

// Output bodyParameters:
[
  { name: 'name', value: '={{$parameter["name"]}}' },
  { name: 'phoneNumber', value: '={{$parameter["phoneNumber"]}}' },
  { name: 'email', value: '={{$parameter["email"]}}' },
  { name: 'notes', value: 'New lead from website form' },
  { name: 'custom_lead_score', value: '85' },
  { name: 'custom_source', value: 'website' }
]
```

### Generated n8n Node

**Result:**

```json
{
  "id": "node-abc123",
  "name": "node-abc123",
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 4.2,
  "position": [250, 150],
  "parameters": {
    "method": "POST",
    "url": "https://backend.pulseline.io/api/contacts",
    "authentication": "none",
    "sendBody": true,
    "contentType": "json",
    "specifyBody": "keypair",
    "bodyParameters": {
      "parameters": [
        { "name": "name", "value": "={{$parameter[\"name\"]}}" },
        { "name": "phoneNumber", "value": "={{$parameter[\"phoneNumber\"]}}" },
        { "name": "email", "value": "={{$parameter[\"email\"]}}" },
        { "name": "notes", "value": "New lead from website form" },
        { "name": "custom_lead_score", "value": "85" },
        { "name": "custom_source", "value": "website" }
      ]
    },
    "sendHeaders": true,
    "specifyHeaders": "json",
    "jsonHeaders": "{\"Content-Type\":\"application/json\",\"Authorization\":\"Bearer TENANT_API_KEY_PLACEHOLDER\"}",
    "options": {
      "response": {
        "response": {
          "neverError": true
        }
      }
    }
  }
}
```

### Deployment to n8n

**Backend workflow:**

1. Transform all nodes
2. Replace `TENANT_API_KEY_PLACEHOLDER` with actual API key
3. Create/update n8n workflow via API
4. Store production webhook URL
5. Activate workflow

```typescript
// PUT /n8n/api/workflows/:id
await n8nClient.put(`/workflows/${n8nWorkflowId}`, {
  name: 'New Contact Workflow',
  nodes: [transformedHttpNode],
  connections: {},
  active: true,
});
```

---

## 6️⃣ Runtime Execution

### Workflow Triggered

**Scenario:** SMS received triggers workflow

```json
{
  "tenantId": "ten_abc",
  "contactId": "con_999",
  "messageId": "SM12345",
  "from": "+15551234567",
  "body": "I'm interested in your product",
  "contact": {
    "contactId": "con_999",
    "phoneNumber": "+15551234567",
    "email": "john@example.com",
    "name": "John Doe"
  }
}
```

### n8n Processes Node

**File:** n8n HTTP Request node execution

```typescript
// n8n evaluates expressions
const name = '={{$parameter["name"]}}';
// Resolves to: '={{$contact.name}}'
// Evaluates with $contact context
// Result: 'John Doe'

const phoneNumber = '={{$parameter["phoneNumber"]}}';
// Resolves to: '={{$contact.phoneNumber}}'
// Result: '+15551234567'

// Static values pass through
const notes = 'New lead from website form';
// Result: 'New lead from website form'

// Build request body
const requestBody = {
  name: 'John Doe',
  phoneNumber: '+15551234567',
  email: 'john@example.com',
  notes: 'New lead from website form',
  custom_lead_score: 85,
  custom_source: 'website'
};
```

### HTTP Request Sent

```bash
POST https://backend.pulseline.io/api/contacts
Content-Type: application/json
Authorization: Bearer sk_live_abc123xyz789

{
  "name": "John Doe",
  "phoneNumber": "+15551234567",
  "email": "john@example.com",
  "notes": "New lead from website form",
  "custom_lead_score": 85,
  "custom_source": "website"
}
```

### Backend API Processes Request

**File:** `contacts/controllers/contactController.ts` (example)

```typescript
async createContact(req, res) {
  const { tenantId } = req.user;  // From API key
  const {
    name,
    phoneNumber,
    email,
    notes,
    custom_lead_score,
    custom_source
  } = req.body;

  // Validate
  if (!phoneNumber && !email) {
    return res.status(400).json({
      error: 'At least one identifier required'
    });
  }

  // Create contact
  const contact = await Contact.create({
    tenantId,
    name,
    phoneNumber,
    email,
    notes,
    customFields: {
      custom_lead_score,
      custom_source
    }
  });

  return res.json({
    success: true,
    contactId: contact.contactId,
    name: contact.name,
    phoneNumber: contact.phoneNumber,
    email: contact.email,
    createdAt: contact.createdAt,
  });
}
```

---

## 7️⃣ Response Handling

### Backend Response

```json
{
  "success": true,
  "contactId": "con_new_123",
  "name": "John Doe",
  "phoneNumber": "+15551234567",
  "email": "john@example.com",
  "createdAt": "2025-01-18T10:05:00Z"
}
```

### n8n Stores Response

**$json object:**

```json
{
  "success": true,
  "contactId": "con_new_123",
  "name": "John Doe",
  "phoneNumber": "+15551234567",
  "email": "john@example.com",
  "createdAt": "2025-01-18T10:05:00Z"
}
```

### Next Node Access

**Next node can reference:**

```typescript
{{$json.contactId}}          // 'con_new_123'
{{$json.name}}               // 'John Doe'
{{$json.email}}              // 'john@example.com'
{{$json.createdAt}}          // '2025-01-18T10:05:00Z'
```

### Field Mapping Uses successResponse

**File:** `createContact.config.ts:32-40`

```typescript
successResponse: {
  fields: [
    { name: 'contactId', type: 'string', description: 'ID of created contact', required: true },
    { name: 'name', type: 'string', description: 'Contact full name' },
    { name: 'phoneNumber', type: 'string', description: 'Contact phone number' },
    { name: 'email', type: 'string', description: 'Contact email address' },
    { name: 'createdAt', type: 'string', description: 'Creation timestamp' },
  ],
}
```

**Frontend uses this to:**
1. Show autocomplete for `{{$json.contactId}}`
2. Validate field references
3. Display field types and descriptions
4. Mark required vs optional fields

---

## 🔄 Complete Data Flow Summary

```
1. USER CONFIGURATION
   ┌─────────────────────────────────────────────┐
   │ Frontend: Node Config Panel                 │
   │ - Phone: {{$contact.phoneNumber}}           │
   │ - Email: {{$contact.email}}                 │
   │ - Name: {{$contact.name}}                   │
   │ - Notes: "New lead from website form"       │
   │ - Custom Fields:                            │
   │   • custom_lead_score: 85                   │
   │   • custom_source: website                  │
   └─────────────────────────────────────────────┘
                    ↓
2. WORKFLOW SAVE
   ┌─────────────────────────────────────────────┐
   │ Database: ReactFlow format                  │
   │ {                                           │
   │   type: 'pulselineCreateContact',           │
   │   data: { parameters: {...} }               │
   │ }                                           │
   └─────────────────────────────────────────────┘
                    ↓
3. TRANSFORMATION (Deploy)
   ┌─────────────────────────────────────────────┐
   │ contact_create.ts                           │
   │ • Reads config._pulseline.apiEndpoint       │
   │ • Calls buildBodyParameters()               │
   │ • Builds HTTP Request node                  │
   │ • Injects API key                           │
   └─────────────────────────────────────────────┘
                    ↓
4. n8n WORKFLOW
   ┌─────────────────────────────────────────────┐
   │ n8n-nodes-base.httpRequest                  │
   │ {                                           │
   │   method: 'POST',                           │
   │   url: '.../api/contacts',                  │
   │   bodyParameters: [                         │
   │     {name: 'name', value: '={{...}}'},      │
   │     {name: 'custom_lead_score', value: 85}  │
   │   ]                                         │
   │ }                                           │
   └─────────────────────────────────────────────┘
                    ↓
5. RUNTIME EXECUTION
   ┌─────────────────────────────────────────────┐
   │ n8n evaluates expressions                   │
   │ • {{$contact.name}} → "John Doe"            │
   │ • {{$contact.phoneNumber}} → "+155..."      │
   │                                             │
   │ POST /api/contacts                          │
   │ {                                           │
   │   name: "John Doe",                         │
   │   phoneNumber: "+15551234567",              │
   │   custom_lead_score: 85                     │
   │ }                                           │
   └─────────────────────────────────────────────┘
                    ↓
6. BACKEND API
   ┌─────────────────────────────────────────────┐
   │ contacts/controllers/contactController.ts   │
   │ • Extract tenant from API key               │
   │ • Validate phone/email                      │
   │ • Create contact in database                │
   │ • Return contact data                       │
   └─────────────────────────────────────────────┘
                    ↓
7. RESPONSE
   ┌─────────────────────────────────────────────┐
   │ {                                           │
   │   contactId: "con_new_123",                 │
   │   name: "John Doe",                         │
   │   phoneNumber: "+15551234567",              │
   │   createdAt: "2025-01-18T10:05:00Z"         │
   │ }                                           │
   └─────────────────────────────────────────────┘
                    ↓
8. NEXT NODE
   ┌─────────────────────────────────────────────┐
   │ Access via expressions:                     │
   │ • {{$json.contactId}}                       │
   │ • {{$json.name}}                            │
   │ • {{$json.createdAt}}                       │
   └─────────────────────────────────────────────┘
```

---

## 🎨 All Patterns Demonstrated

### ✅ Pattern 1: API-backed Transformation

```typescript
_pulseline: {
  transformationMethod: 'contact_create',
  apiEndpoint: '/api/contacts',
  httpMethod: 'POST',
  requiresAuth: true,
}
```

Transforms to HTTP Request node with API call.

### ✅ Pattern 2: Dynamic Subtitle

```typescript
subtitle: '={{$parameter["name"] || $parameter["phoneNumber"] || $parameter["email"]}}',
```

Shows name, or falls back to phone/email in node display.

### ✅ Pattern 3: Notice Field

```typescript
{
  type: 'notice',
  description: '⚠️ At least one contact identifier is required...',
}
```

Displays warning to user, no input.

### ✅ Pattern 4: Textarea (Multi-line)

```typescript
{
  type: 'string',
  typeOptions: {
    rows: 3,
  },
}
```

Renders as textarea instead of single-line input.

### ✅ Pattern 5: Expression Defaults

```typescript
{
  name: 'phoneNumber',
  default: '{{$contact.phoneNumber}}',
}
```

Pre-fills with expression referencing workflow context.

### ✅ Pattern 6: loadOptionsMethod

```typescript
loadOptionsMethods: {
  getContactFields: {
    endpoint: '/api/customFields/fields-list?entityScope=contact',
    method: 'GET',
    responseMapping: {
      valueField: 'name',
      labelField: 'displayName',
    },
  },
}
```

Loads custom field options from backend API.

### ✅ Pattern 7: fixedCollection

```typescript
{
  type: 'fixedCollection',
  typeOptions: {
    multipleValues: true,
  },
  options: [
    {
      name: 'field',
      values: [
        { name: 'fieldName', type: 'options' },
        { name: 'fieldValue', type: 'string' }
      ]
    }
  ]
}
```

User can add multiple field name/value pairs.

### ✅ Pattern 8: successResponse Fields

```typescript
successResponse: {
  fields: [
    { name: 'contactId', type: 'string', required: true },
    { name: 'name', type: 'string' },
  ],
}
```

Defines response structure for field mapping.

### ✅ Pattern 9: Authentication

```typescript
requiresAuth: true
```

Transformation automatically injects:

```typescript
headers: {
  'Authorization': 'Bearer TENANT_API_KEY_PLACEHOLDER',
}
```

Replaced with actual API key during deployment.

### ✅ Pattern 10: buildBodyParameters

```typescript
const bodyParameters = buildBodyParameters(bodyObj);
```

Automatically:
- Flattens fixedCollection
- Builds n8n expression format
- Handles static vs expression values

---

## 🧪 Testing the Complete Flow

### Test 1: Node Registration

```bash
curl http://localhost:4000/api/workflows/nodes | \
  jq '.[] | select(.name=="pulselineCreateContact")'
```

**Expected:** Full node config returned.

### Test 2: Custom Fields Load

```bash
curl -H "Authorization: Bearer ${TOKEN}" \
  http://localhost:4000/api/customFields/fields-list?entityScope=contact
```

**Expected:** Array of custom fields with `name` and `displayName`.

### Test 3: Workflow Save

```bash
curl -X POST http://localhost:4000/api/workflows \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "name": "Test Workflow",
    "nodes": [{
      "id": "node-1",
      "type": "pulselineCreateContact",
      "data": {
        "parameters": {
          "phoneNumber": "{{$contact.phoneNumber}}",
          "name": "{{$contact.name}}"
        }
      }
    }]
  }'
```

**Expected:** Workflow created, `workflowId` returned.

### Test 4: Transformation

```bash
# Deploy workflow
curl -X POST http://localhost:4000/api/workflows/${WORKFLOW_ID}/deploy \
  -H "Authorization: Bearer ${TOKEN}"
```

**Expected:** n8n workflow created with HTTP Request node.

### Test 5: Runtime Execution

```bash
# Trigger workflow (e.g., via webhook)
curl -X POST ${N8N_WEBHOOK_URL} \
  -H "Content-Type: application/json" \
  -d '{
    "contact": {
      "phoneNumber": "+15551234567",
      "name": "John Doe",
      "email": "john@example.com"
    }
  }'
```

**Expected:** Contact created, response with `contactId`.

### Test 6: Verify Contact Created

```bash
curl -H "Authorization: Bearer ${TOKEN}" \
  http://localhost:4000/api/contacts?phoneNumber=%2B15551234567
```

**Expected:** Contact found with correct data.

---

## 🔗 Related Documentation

- **Action Nodes Pattern:** See `patterns/action-nodes.md`
- **Load Options Pattern:** See `patterns/load-options.md`
- **Transformation System:** See `../../transformationSystem/INDEX.md`
- **Expression Helpers:** See `../../transformationSystem/helpers/expression-helpers-reference.md`
- **Field Mapping:** (Coming in next section)

---

## ✅ Complete Lifecycle Checklist

- [x] Node config created (`createContact.config.ts`)
- [x] Registered in index.ts
- [x] Transformation method created (`contact_create.ts`)
- [x] Backend API endpoint exists (`/api/contacts`)
- [x] Frontend displays node in palette
- [x] Node config panel renders all properties
- [x] loadOptionsMethod loads custom fields
- [x] fixedCollection allows multiple entries
- [x] Workflow saves to database
- [x] Transformation generates HTTP Request node
- [x] API key injection works
- [x] Runtime execution calls backend
- [x] Response structure matches successResponse
- [x] Next nodes can reference $json fields

---

**File Locations:**
- **Node Config:** `workflows/services/nodeRegistry/nodes/pulseline/createContact.config.ts`
- **Transformation:** `transformationMethodRegistry/contactManagement/contact_create.ts`
- **Expression Helpers:** `transformationSystem/utils/expressionHelpers.ts`
- **Backend API:** `contacts/controllers/contactController.ts` (example)
