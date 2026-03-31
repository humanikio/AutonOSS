# Pattern: Frontend-Backend Integration

> ReactFlow UI ↔ Backend API ↔ n8n Server data flow

---

## Overview

This pattern describes how the frontend ReactFlow interface integrates with the backend API and ultimately deploys workflows to the n8n server.

**Key Flow:** User interaction → Frontend state → API request → Backend processing → n8n deployment → Database storage

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                         │
│                                                             │
│  ┌──────────────┐                                          │
│  │  ReactFlow   │  Workflow canvas                         │
│  │   Canvas     │  - Nodes (trigger, action, condition)    │
│  │              │  - Edges (connections)                   │
│  └──────┬───────┘                                          │
│         │                                                   │
│         ↓                                                   │
│  ┌──────────────┐                                          │
│  │ Node Config  │  Configuration panels                    │
│  │    Panel     │  - Parameters                            │
│  │              │  - Field mapping                         │
│  └──────┬───────┘                                          │
│         │                                                   │
│         ↓                                                   │
│  ┌──────────────┐                                          │
│  │  Workflow    │  State management                        │
│  │    State     │  - nodes: []                             │
│  │              │  - edges: []                             │
│  └──────┬───────┘  - workflowId                            │
│         │                                                   │
└─────────┼─────────────────────────────────────────────────┘
          │
          │  PUT /api/workflows/:id
          │  { nodes, edges, isPublic: true }
          ↓
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND API (Express)                    │
│                                                             │
│  ┌──────────────┐                                          │
│  │  Controller  │  updateWorkflowController()              │
│  └──────┬───────┘                                          │
│         │                                                   │
│         ↓                                                   │
│  ┌──────────────┐                                          │
│  │   Save to    │  Firestore: /workflows/{id}              │
│  │  Firestore   │  - Original ReactFlow format             │
│  └──────┬───────┘                                          │
│         │                                                   │
│         ↓                                                   │
│  ┌──────────────┐                                          │
│  │ Transform to │  transformWorkflow()                     │
│  │     n8n      │  - Node Registry                         │
│  │              │  - Transformation System                 │
│  └──────┬───────┘  - Field Mapping                         │
│         │                                                   │
│         ↓                                                   │
│  ┌──────────────┐                                          │
│  │  Deploy to   │  workflowManager.createWorkflow()        │
│  │   n8n API    │  - POST /workflows                       │
│  └──────┬───────┘  - POST /workflows/:id/activate          │
│         │                                                   │
│         ↓                                                   │
│  ┌──────────────┐                                          │
│  │  Store n8n   │  Firestore: /workflows/{id}/n8n/config   │
│  │    Config    │  - n8nWorkflowId                         │
│  └──────┬───────┘  - Webhook URLs                          │
│         │                                                   │
└─────────┼─────────────────────────────────────────────────┘
          │
          ↓  Response: { success, data: { triggers: [...] } }
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                         │
│  - Update UI: "Workflow deployed!"                         │
│  - Display webhook URL                                     │
│  - Show active status indicator                            │
└─────────────────────────────────────────────────────────────┘
```

---

## Frontend State Structure

### ReactFlow Workflow State

```typescript
interface WorkflowState {
  workflowId: string;
  name: string;
  nodes: ReactFlowNode[];
  edges: ReactFlowEdge[];
  status: 'draft' | 'published';
  isPublic: boolean;  // Controls n8n sync
}

interface ReactFlowNode {
  id: string;                    // 'node_1'
  type: string;                  // 'sendSms'
  position: { x: number; y: number };
  data: {
    nodeName: string;            // 'sendSms'
    label: string;               // 'Send SMS'
    parameters: Record<string, any>;  // Node-specific params
  };
}

interface ReactFlowEdge {
  id: string;                    // 'edge_1'
  source: string;                // 'node_1'
  target: string;                // 'node_2'
  sourceHandle?: string;         // 'main'
  targetHandle?: string;         // null
}
```

**Example:**
```typescript
const workflowState = {
  workflowId: 'wf_123',
  name: 'SMS Auto-Responder',
  nodes: [
    {
      id: 'node_1',
      type: 'smsReceivedTrigger',
      position: { x: 100, y: 200 },
      data: {
        nodeName: 'smsReceivedTrigger',
        label: 'SMS Received',
        parameters: {
          path: null  // Minted server-side
        }
      }
    },
    {
      id: 'node_2',
      type: 'sendSms',
      position: { x: 400, y: 200 },
      data: {
        nodeName: 'sendSms',
        label: 'Send SMS',
        parameters: {
          to: '={{ $json[\'from\'] }}',
          body: 'Thanks for texting!'
        }
      }
    }
  ],
  edges: [
    {
      id: 'edge_1',
      source: 'node_1',
      target: 'node_2',
      sourceHandle: 'main'
    }
  ],
  status: 'draft',
  isPublic: false
};
```

---

## API Request Format

### Save Workflow (Draft Mode)

```http
PUT /api/workflows/wf_123
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "name": "SMS Auto-Responder",
  "nodes": [
    {
      "id": "node_1",
      "type": "smsReceivedTrigger",
      "position": { "x": 100, "y": 200 },
      "data": {
        "nodeName": "smsReceivedTrigger",
        "label": "SMS Received",
        "parameters": { "path": null }
      }
    },
    {
      "id": "node_2",
      "type": "sendSms",
      "position": { "x": 400, "y": 200 },
      "data": {
        "nodeName": "sendSms",
        "label": "Send SMS",
        "parameters": {
          "to": "={{ $json['from'] }}",
          "body": "Thanks for texting!"
        }
      }
    }
  ],
  "edges": [
    {
      "id": "edge_1",
      "source": "node_1",
      "target": "node_2",
      "sourceHandle": "main"
    }
  ],
  "isPublic": false  // ← Draft mode - don't deploy to n8n
}
```

**Backend Response:**
```json
{
  "success": true,
  "data": {
    "id": "wf_123",
    "name": "SMS Auto-Responder",
    "nodes": [...],
    "edges": [...],
    "isPublic": false,
    "updatedAt": "2025-01-19T10:00:00Z"
  }
}
```

**Result:**
- Workflow saved to Firestore
- NOT deployed to n8n
- NOT active for triggering

---

### Deploy Workflow (Production Mode)

```http
PUT /api/workflows/wf_123
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "name": "SMS Auto-Responder",
  "nodes": [...],  // Same as above
  "edges": [...],
  "isPublic": true  // ← Deploy to n8n
}
```

**Backend Response:**
```json
{
  "success": true,
  "data": {
    "id": "wf_123",
    "name": "SMS Auto-Responder",
    "nodes": [...],
    "edges": [...],
    "isPublic": true,
    "triggers": [
      {
        "nodeId": "SMS Received",
        "url": "https://n8n.example.com/webhook/abc-def-123",
        "webhookId": "abc-def-123",
        "httpMethod": "POST"
      }
    ],
    "updatedAt": "2025-01-19T10:05:00Z"
  }
}
```

**Result:**
- Workflow saved to Firestore
- Transformed to n8n format
- Deployed to n8n server
- Activated and ready for triggering
- Webhook URL returned to frontend

---

## Backend Processing Steps

### Step 1: Save to Firestore

```typescript
// File: workflowCrudManager/updateWorkflow.ts

// Ensure stable webhook IDs (minted server-side)
if (data.nodes) {
  ensureWebhookIds(data.nodes);
  // Mints UUID for trigger/webhook nodes if not present
  // Prevents webhook ID drift on subsequent saves
}

// Update main workflow document
await firestore
  .collection('tenants').doc(tenantId)
  .collection('workflows').doc(workflowId)
  .update({
    name: data.name,
    nodes: data.nodes,
    edges: data.edges,
    isPublic: data.isPublic,
    updatedAt: Timestamp.now()
  });

console.log('✅ Saved to Firestore');
```

**Firestore Structure:**
```
/tenants/ten_123/
  workflows/
    wf_123/
      id: 'wf_123'
      name: 'SMS Auto-Responder'
      nodes: [...]      # ReactFlow format (original)
      edges: [...]
      isPublic: false
      createdAt: Timestamp
      updatedAt: Timestamp
```

---

### Step 2: Check if n8n Sync Required

```typescript
if (data.isPublic === true && data.nodes && data.edges) {
  console.log('🚀 Syncing workflow to n8n (isPublic=true)');

  // Proceed with transformation and deployment
} else {
  console.log('📝 Draft mode - skipping n8n sync');

  // Skip transformation and deployment
  return updatedWorkflow;
}
```

**Decision Logic:**
- `isPublic === true` → Deploy to n8n
- `isPublic === false` → Save locally only

---

### Step 3: Get Account API Key

```typescript
// File: utils/accountApiKeyHelper.ts

let accountApiKey: string | undefined;
if (userId) {
  try {
    accountApiKey = await getOrCreateAccountApiKey(tenantId, userId);
    console.log('✅ Retrieved account API key');
  } catch (error) {
    console.error('⚠️  Failed to get API key, using placeholders');
  }
}
```

**Purpose:** Inject tenant-specific API credentials (Twilio, HubSpot, etc.) into transformed nodes.

---

### Step 4: Transform to n8n Format

```typescript
// File: transformationSystem/orchestrators/transformationOrchrestrator.ts

const transformResult = await transformWorkflow(
  tenantId,
  workflowId,
  accountApiKey,
  {
    rawReactFlow: {
      name: data.name,
      nodes: data.nodes,
      edges: data.edges
    }
  }
);

if (!transformResult.success) {
  throw new Error(`Transformation failed: ${transformResult.error}`);
}

console.log(`✅ Transformation complete: ${transformResult.totalNodes} nodes`);
```

**Transformation Phases:**
1. **Planning** - Analyze ReactFlow, create build plan
2. **Compilation** - Execute transformation methods, resolve fields
3. **Validation** - (TODO)

**Result:**
- n8n nodes stored in Firestore: `/workflows/{wid}/compiledWorkflow/nodes`
- Connections map returned

---

### Step 5: Load Compiled Nodes

```typescript
// File: transformationSystem/state/compiledWorkflow.ts

const compiledNodes = await readCompiledWorkflow(tenantId, workflowId);

// Result: Array of n8n nodes
// [
//   {
//     name: 'SMS Received',
//     type: 'n8n-nodes-base.webhook',
//     parameters: {
//       path: 'abc-def-123',
//       httpMethod: 'POST'
//     }
//   },
//   {
//     name: 'Send SMS',
//     type: 'n8n-nodes-base.twilio',
//     parameters: {
//       resource: 'sms',
//       operation: 'send',
//       to: '={{ $node["SMS Received"].json["from"] }}',  // Resolved!
//       body: 'Thanks for texting!'
//     }
//   }
// ]
```

---

### Step 6: Inject Authentication

```typescript
// File: transformationSystem/utils/injectAuthenticationKey.ts

const nodesWithAuth = injectAuthenticationKey(compiledNodes, accountApiKey);

// Injects API credentials into nodes that need them
// Example: Twilio credentials for Send SMS node
```

---

### Step 7: Build n8n Workflow Structure

```typescript
const n8nWorkflowData = {
  name: 'SMS Auto-Responder',
  nodes: nodesWithAuth,
  connections: transformResult.connections,
  settings: {},
  staticData: null
};

// n8n connections format:
// {
//   'SMS Received': {
//     main: [
//       [{ node: 'Send SMS', type: 'main', index: 0 }]
//     ]
//   }
// }
```

---

### Step 8: Deploy to n8n

```typescript
// File: n8n/services/workflowManager.ts

// Check if already exists in n8n
const existingN8nConfig = await getN8nConfig(tenantId, workflowId);

if (existingN8nConfig?.n8nWorkflowId) {
  // Update existing workflow
  const n8nWorkflow = await workflowManager.updateWorkflow(
    existingN8nConfig.n8nWorkflowId,
    n8nWorkflowData,
    tenantId,
    workflowId
  );

  console.log(`✅ Updated n8n workflow: ${n8nWorkflow.id}`);
} else {
  // Create new workflow
  const n8nWorkflow = await workflowManager.createWorkflow(
    n8nWorkflowData,
    tenantId,
    workflowId
  );

  console.log(`✅ Created n8n workflow: ${n8nWorkflow.id}`);
}
```

**n8n API Calls:**
```http
# Create workflow
POST https://n8n.example.com/api/v1/workflows
Authorization: Bearer {n8n_api_key}
Content-Type: application/json

{
  "name": "SMS Auto-Responder",
  "nodes": [...],
  "connections": {...},
  "settings": {},
  "staticData": null
}

# Response
{
  "id": "123",
  "name": "SMS Auto-Responder",
  "nodes": [...],
  "connections": {...},
  "active": false
}
```

---

### Step 9: Activate Workflow

```typescript
// Activate so webhooks work immediately
await workflowManager.activateWorkflow(n8nWorkflow.id);

console.log(`🟢 Activated n8n workflow ${n8nWorkflow.id}`);
```

**n8n API Call:**
```http
POST https://n8n.example.com/api/v1/workflows/123/activate
Authorization: Bearer {n8n_api_key}

# Response
{
  "id": "123",
  "active": true
}
```

---

### Step 10: Store n8n Config in Firestore

```typescript
// File: n8n/utils/syncN8nWorkflowFirestore.ts

await createWorkflowInFirestore(tenantId, workflowId, n8nWorkflow);

// Saves to: /workflows/wf_123/n8n/config
```

**Firestore Structure:**
```
/tenants/ten_123/
  workflows/
    wf_123/
      # Main document (ReactFlow format)
      ...

      # n8n config subcollection
      n8n/
        config/
          n8nWorkflowId: '123'
          triggers: [
            {
              nodeId: 'SMS Received'
              nodeName: 'SMS Received'
              url: 'https://n8n.example.com/webhook/abc-def-123'
              webhookId: 'abc-def-123'
              httpMethod: 'POST'
            }
          ]
          createdAt: Timestamp
          updatedAt: Timestamp
```

---

### Step 11: Auto-Create Trigger Subscription

```typescript
// Detect if workflow has trigger node
const hasTrigger = data.nodes.some(node => {
  const config = NodeRegistry.getNodeConfig(node.type);
  return config?._pulseline?.isTrigger === true;
});

if (hasTrigger) {
  const triggerNode = data.nodes.find(node => {
    const config = NodeRegistry.getNodeConfig(node.type);
    return config?._pulseline?.isTrigger === true;
  });

  const triggerType = NodeRegistry.getNodeConfig(triggerNode.type)
    ?._pulseline?.triggerType;

  console.log(`🔔 Auto-creating subscription: ${triggerType}`);

  await createSubscription(tenantId, {
    workflowId: workflowId,
    triggerType: triggerType,
    enabled: true
  });

  console.log(`✅ Subscription created`);
}
```

**Firestore Structure:**
```
/tenants/ten_123/
  triggerSubscriptions/
    sub_xyz/
      id: 'sub_xyz'
      workflowId: 'wf_123'
      triggerType: 'sms.received.v1'
      enabled: true
      createdAt: Timestamp
      updatedAt: Timestamp
```

---

## Frontend Integration Patterns

### Pattern 1: Load Available Nodes

```typescript
// Frontend: Load nodes on mount
useEffect(() => {
  async function loadNodes() {
    const response = await fetch('/api/workflows/nodes', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    const data = await response.json();
    setAvailableNodes(data.data.nodes);
  }

  loadNodes();
}, []);
```

---

### Pattern 2: Save Workflow (Draft)

```typescript
// Frontend: Save without deploying
async function saveDraft() {
  const response = await fetch(`/api/workflows/${workflowId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: workflowName,
      nodes: nodes,
      edges: edges,
      isPublic: false  // ← Draft mode
    })
  });

  const data = await response.json();

  if (data.success) {
    toast.success('Workflow saved!');
  }
}
```

---

### Pattern 3: Deploy Workflow

```typescript
// Frontend: Save and deploy
async function deployWorkflow() {
  setDeploying(true);

  const response = await fetch(`/api/workflows/${workflowId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: workflowName,
      nodes: nodes,
      edges: edges,
      isPublic: true  // ← Deploy to n8n
    })
  });

  const data = await response.json();

  if (data.success) {
    // Update workflow state with webhook URLs
    setWorkflow(data.data);

    // Show success message
    toast.success('Workflow deployed successfully!');

    // Display webhook URL if available
    if (data.data.triggers?.length > 0) {
      console.log('Webhook URL:', data.data.triggers[0].url);
    }
  } else {
    toast.error(`Deployment failed: ${data.error}`);
  }

  setDeploying(false);
}
```

---

### Pattern 4: Send Test Payload

```typescript
// Frontend: Send test data to trigger node
async function sendTestData(nodeId: string, testPayload: any) {
  const response = await fetch(`/api/workflows/${workflowId}/set-field-mapping`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      nodeId: nodeId,
      testPayload: testPayload
    })
  });

  const data = await response.json();

  if (data.success) {
    // Update available fields for field mapping
    setAvailableFields(data.data.availableFields);

    toast.success('Test data processed!');
  }
}
```

---

### Pattern 5: Configure Node Parameters with Field Mapping

```typescript
// Frontend: Node configuration panel
function NodeConfigPanel({ node, availableFields, onUpdate }) {
  const [parameters, setParameters] = useState(node.data.parameters);

  const handleFieldSelect = (paramName: string, fieldPath: string) => {
    // Build field expression
    const expression = `={{ $json['${fieldPath}'] }}`;

    setParameters({
      ...parameters,
      [paramName]: expression
    });
  };

  const handleSave = () => {
    onUpdate(node.id, { parameters });
  };

  return (
    <div>
      <h3>Configure {node.data.label}</h3>

      <label>To:</label>
      <select onChange={(e) => handleFieldSelect('to', e.target.value)}>
        <option value="">Select field...</option>
        {availableFields.map(field => (
          <option key={field.path} value={field.path}>
            {field.path}
          </option>
        ))}
      </select>

      <label>Body:</label>
      <textarea
        value={parameters.body}
        onChange={(e) => setParameters({ ...parameters, body: e.target.value })}
      />

      <button onClick={handleSave}>Save</button>
    </div>
  );
}
```

---

## Data Transformation Flow

### ReactFlow Format → n8n Format

**Input (ReactFlow):**
```json
{
  "id": "node_2",
  "type": "sendSms",
  "data": {
    "nodeName": "sendSms",
    "parameters": {
      "to": "={{ $json['from'] }}",
      "body": "Thanks!"
    }
  }
}
```

**Transformation:**
```typescript
// 1. Node Registry provides config
const config = NodeRegistry.getNodeConfig('sendSms');
const transformMethod = config._pulseline.transformationMethod;
// Result: 'twilio_send_sms'

// 2. Transformation method transforms node
const transformFn = TransformationRegistry.getMethod('twilio_send_sms');
const n8nNode = await transformFn(reactFlowNode, context);

// 3. Field mapping resolves custom expressions
const resolvedTo = resolveCustomFieldExpression(
  "={{ $json['from'] }}",
  fieldMappingData
);
// Result: "={{ $node['SMS Received'].json['from'] }}"
```

**Output (n8n):**
```json
{
  "name": "Send SMS",
  "type": "n8n-nodes-base.twilio",
  "typeVersion": 1,
  "position": [400, 200],
  "parameters": {
    "resource": "sms",
    "operation": "send",
    "to": "={{ $node['SMS Received'].json['from'] }}",
    "body": "Thanks!"
  },
  "credentials": {
    "twilioApi": {
      "id": "1",
      "name": "Twilio Account"
    }
  }
}
```

---

## Error Handling

### Frontend Error Handling

```typescript
async function deployWorkflow() {
  try {
    const response = await fetch(`/api/workflows/${workflowId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: workflowName,
        nodes: nodes,
        edges: edges,
        isPublic: true
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Deployment failed');
    }

    if (data.success) {
      toast.success('Workflow deployed successfully!');
      setWorkflow(data.data);
    } else {
      throw new Error(data.error || 'Unknown error');
    }
  } catch (error) {
    console.error('Deployment error:', error);
    toast.error(`Failed to deploy: ${error.message}`);
  }
}
```

---

### Backend Error Handling

```typescript
export async function updateWorkflow(tenantId, workflowId, data, userId) {
  try {
    // Save to Firestore
    await firestore.collection('tenants')...

    // Transform and deploy if isPublic=true
    if (data.isPublic === true) {
      try {
        // Transformation
        const transformResult = await transformWorkflow(...);

        // Deploy to n8n
        const n8nWorkflow = await workflowManager.createWorkflow(...);

        // Store config
        await createWorkflowInFirestore(...);

      } catch (error) {
        console.error('n8n sync failed:', error);
        // Don't fail the whole request - workflow still saved locally
        console.warn('Workflow saved locally but n8n sync failed');
      }
    }

    return updatedWorkflow;

  } catch (error) {
    console.error('Update workflow error:', error);
    throw error;  // Propagate to controller
  }
}
```

---

## Related Docs

- **[README.md](../README.md)** - System integration overview
- **[END-TO-END-FLOW.md](../END-TO-END-FLOW.md)** - Complete user journey
- **[trigger-integration.md](./trigger-integration.md)** - Trigger system deep dive
- **[QUICK-PROBLEM-SOLVING.md](../QUICK-PROBLEM-SOLVING.md)** - Troubleshooting guide
