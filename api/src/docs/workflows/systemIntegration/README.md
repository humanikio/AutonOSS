# System Integration

> **Complete guide** to how all workflow systems work together

---

## 📋 Overview

The System Integration layer connects four core workflow subsystems into a cohesive automation platform:

1. **Transformation System** - Converts ReactFlow workflows to n8n format
2. **Node Registry** - Provides node configurations and capabilities
3. **Field Mapping** - Maps test data to workflow parameters
4. **Trigger Subscriptions** - Executes workflows when events occur

This document explains how these systems integrate to enable the complete workflow lifecycle.

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    PULSELINE WORKFLOW SYSTEM                    │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┐
│   FRONTEND   │  ReactFlow UI
│  (React)     │  - Drag & drop nodes
└──────┬───────┘  - Configure parameters
       │          - Test workflows
       │
       ↓  POST /api/workflows/:id (isPublic=true)
       │
┌──────┴───────────────────────────────────────────────────────┐
│                        BACKEND API                            │
└───────────────────────────────────────────────────────────────┘
       │
       ├─→ 1. SAVE TO FIRESTORE
       │   Save original ReactFlow format
       │   /tenants/{tid}/workflows/{wid}
       │
       ├─→ 2. TRANSFORMATION SYSTEM
       │   ReactFlow → n8n conversion
       │   - Node Registry: Get node configs
       │   - Transform each node via transformation methods
       │   - Field Mapping: Resolve custom field expressions
       │   - Build n8n workflow structure
       │
       ├─→ 3. DEPLOY TO N8N
       │   workflowManager.createWorkflow() or updateWorkflow()
       │   - POST to n8n API
       │   - Activate workflow
       │   - Get webhook URLs
       │
       ├─→ 4. STORE N8N CONFIG
       │   Save n8n metadata in subcollection
       │   /workflows/{wid}/n8n/config
       │   - n8nWorkflowId
       │   - webhookUrls
       │   - triggers
       │
       └─→ 5. AUTO-CREATE TRIGGER SUBSCRIPTIONS
           If workflow has trigger nodes:
           - Extract triggerType from node config
           - createSubscription(workflowId, triggerType)
           - Store in /triggerSubscriptions/{subId}

┌─────────────────────────────────────────────────────────────────┐
│                        EXECUTION FLOW                           │
└─────────────────────────────────────────────────────────────────┘

EXTERNAL EVENT (SMS, Phone, Calendar)
   ↓
EVENT HANDLER
   ↓
executeTrigger({
  tenantId: 'ten_123',
  triggerType: 'sms.received.v1',
  payload: { from, body, ... }
})
   ↓
QUERY SUBSCRIPTIONS
   - WHERE triggerType = 'sms.received.v1'
   - WHERE enabled = true
   ↓
EVALUATE CONDITIONS
   - Filter by payload conditions
   ↓
READ WORKFLOW
   - Get productionWebhookUrl from n8n config
   ↓
POST TO WEBHOOK
   - POST payload to https://n8n.../webhook/{id}
   ↓
N8N EXECUTES WORKFLOW
   - Trigger node receives payload
   - Subsequent nodes execute
   - Workflow completes
```

---

## 🔗 System Integration Points

### 1. Node Registry ↔ Transformation System

**Purpose:** Node configs define how nodes are transformed to n8n format.

**Integration Flow:**

```typescript
// Node config defines transformation method
// File: nodeRegistry/nodes/sms/sendSms.config.ts
export const sendSmsNode = {
  name: 'sendSms',
  _pulseline: {
    transformationMethod: 'twilio_send_sms'  // ← Links to transformation
  },
  properties: [...]
};

// Transformation system reads node config
// File: transformationSystem/services/transform2N8n.ts
const nodeConfig = NodeRegistry.getNodeConfig(reactFlowNode.type);
const transformMethod = nodeConfig._pulseline.transformationMethod;

// Execute transformation
const transformFn = TransformationRegistry.getMethod(transformMethod);
const n8nNode = await transformFn(reactFlowNode, context);
```

**Key Files:**
- **Node Config:** `nodeRegistry/nodes/**/*.config.ts`
- **Transformation Registry:** `transformationSystem/transformationMethodRegistry/index.ts`
- **Transform Executor:** `transformationSystem/services/transform2N8n.ts`

---

### 2. Field Mapping ↔ Transformation System

**Purpose:** Resolve custom field expressions during transformation.

**Integration Flow:**

```typescript
// 1. User sends test payload to trigger
POST /api/workflows/:workflowId/set-field-mapping
Body: { nodeId: 'trigger_1', testPayload: {...} }

// 2. Field mapping extracts available fields
// File: setFieldMappingReference/index.ts
const fields = defineFieldsFromJson(testPayload);
// Result: ['from', 'body', 'contact.name', 'contact.email', ...]

// 3. Store field mapping reference
await setFieldMappingReference(workflowId, nodeId, fields);

// 4. Frontend displays fields for user mapping
// User maps: parameter.to = "={{ $json['contact.phone'] }}"

// 5. Transformation resolves custom field expressions
// File: transformationSystem/utils/resolveCustomFields.ts
const resolvedValue = resolveCustomFieldExpression(
  "={{ $json['contact.phone'] }}",
  fieldMappingData
);
// Returns: "={{ $node['Webhook'].json['contact']['phone'] }}"
```

**Key Files:**
- **Field Extraction:** `setFieldMappingReference/defineFieldsFromJson.ts`
- **Field Resolution:** `transformationSystem/utils/resolveCustomFields.ts`
- **Storage:** `workflows/{wid}/fieldMappingData/{nodeId}`

---

### 3. Trigger Subscriptions ↔ Node Registry

**Purpose:** Trigger nodes auto-create subscriptions.

**Integration Flow:**

```typescript
// 1. Trigger node config links to event type
// File: nodeRegistry/nodes/trigger/smsReceivedTrigger.config.ts
export const smsReceivedTriggerNode = {
  name: 'smsReceivedTrigger',
  _pulseline: {
    isTrigger: true,
    triggerType: 'sms.received.v1'  // ← Links to event registry
  }
};

// 2. Backend detects trigger node on workflow save
// File: workflowCrudManager/updateWorkflow.ts
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

  // Auto-create subscription
  await createSubscription(tenantId, {
    workflowId,
    triggerType,
    enabled: true
  });
}
```

**Key Files:**
- **Trigger Detection:** `workflowCrudManager/updateWorkflow.ts`
- **Subscription Creation:** `triggerSubscriptions/services/triggerSubscriptionManager/createSubscription.ts`
- **Event Registry:** `triggerSubscriptions/services/TriggerDestinationRegistry/index.ts`

---

### 4. Trigger Subscriptions ↔ Workflow Execution

**Purpose:** Events trigger workflows via webhook URLs.

**Integration Flow:**

```typescript
// 1. Event occurs
const smsReceived = {
  from: '+15551234567',
  body: 'Hello',
  contactId: 'con_456'
};

// 2. Event handler calls executeTrigger
// File: inboundEvents/sms/services/newRequestHandler.ts
await executeTrigger({
  tenantId: 'ten_123',
  triggerType: 'sms.received.v1',
  payload: smsReceived
});

// 3. Query active subscriptions
// File: triggerExecutions.ts
const subscriptions = await getSubscriptions(tenantId, {
  triggerType: 'sms.received.v1',
  enabled: true
});

// 4. Read workflow to get webhook URL
const workflow = await readWorkflow(tenantId, subscription.workflowId);

// Read n8n config from subcollection
const n8nConfig = await firestore
  .collection('tenants').doc(tenantId)
  .collection('workflows').doc(workflowId)
  .collection('n8n').doc('config')
  .get();

const webhookUrl = n8nConfig.data().triggers[0].url;

// 5. POST payload to webhook
await axios.post(webhookUrl, payload);

// 6. n8n executes workflow
```

**Key Files:**
- **Trigger Execution:** `triggerSubscriptions/services/triggerExecutions.ts`
- **Workflow Webhook Storage:** `/workflows/{wid}/n8n/config`
- **Event Handlers:** `inboundEvents/sms/services/newRequestHandler.ts`

---

### 5. Transformation System ↔ n8n Server

**Purpose:** Deploy transformed workflows to n8n for execution.

**Integration Flow:**

```typescript
// 1. Transform ReactFlow to n8n format
// File: workflowCrudManager/updateWorkflow.ts
const transformResult = await transformWorkflow(
  tenantId,
  workflowId,
  apiKey,
  { rawReactFlow: { name, nodes, edges } }
);

// 2. Load compiled nodes from Firestore
const compiledNodes = await readCompiledWorkflow(tenantId, workflowId);

// 3. Inject API authentication
const nodesWithAuth = injectAuthenticationKey(compiledNodes, apiKey);

// 4. Build n8n workflow structure
const n8nWorkflowData = {
  name: workflow.name,
  nodes: nodesWithAuth,
  connections: transformResult.connections,
  settings: {},
  staticData: null
};

// 5. Create or update in n8n
const n8nWorkflow = await workflowManager.createWorkflow(n8nWorkflowData);
// OR
const n8nWorkflow = await workflowManager.updateWorkflow(n8nId, n8nWorkflowData);

// 6. Activate workflow
await workflowManager.activateWorkflow(n8nWorkflow.id);

// 7. Store n8n config in Firestore subcollection
await createWorkflowInFirestore(tenantId, workflowId, n8nWorkflow);
```

**Key Files:**
- **Orchestrator:** `transformationSystem/orchestrators/transformationOrchestrator.ts`
- **n8n Manager:** `n8n/services/workflowManager.ts`
- **Firestore Sync:** `n8n/utils/syncN8nWorkflowFirestore.ts`

---

## 📊 Data Flow Diagrams

### Complete Workflow Creation Flow

```
USER ACTION: Create workflow in frontend
   ↓
┌──────────────────────────────────────────────┐
│ FRONTEND (ReactFlow)                         │
├──────────────────────────────────────────────┤
│ 1. User drags nodes to canvas                │
│ 2. Connects nodes with edges                 │
│ 3. Configures node parameters                │
│ 4. Tests with sample data                    │
│ 5. Clicks "Save & Deploy" (isPublic=true)    │
└──────────────┬───────────────────────────────┘
               │ POST /api/workflows/:id
               ↓
┌──────────────────────────────────────────────┐
│ BACKEND API (updateWorkflow)                 │
├──────────────────────────────────────────────┤
│ 1. Save original ReactFlow to Firestore      │
│    /tenants/{tid}/workflows/{wid}            │
│                                              │
│ 2. Ensure stable webhook IDs                 │
│    - Mint UUIDs for trigger/webhook nodes    │
│                                              │
│ 3. Transform to n8n format                   │
│    transformWorkflow(tenantId, workflowId)   │
│    ├─→ Node Registry: Get configs            │
│    ├─→ Transformation: Execute methods       │
│    └─→ Field Mapping: Resolve expressions    │
│                                              │
│ 4. Deploy to n8n                             │
│    workflowManager.createWorkflow()          │
│    ├─→ POST to n8n API                       │
│    └─→ Activate workflow                     │
│                                              │
│ 5. Store n8n config                          │
│    /workflows/{wid}/n8n/config               │
│    - n8nWorkflowId                           │
│    - webhookUrls                             │
│    - triggers                                │
│                                              │
│ 6. Auto-create trigger subscriptions         │
│    IF has trigger node:                      │
│      createSubscription(workflowId, type)    │
└──────────────┬───────────────────────────────┘
               │
               ↓
┌──────────────────────────────────────────────┐
│ N8N SERVER                                   │
├──────────────────────────────────────────────┤
│ - Workflow created with ID: 123              │
│ - Workflow activated                         │
│ - Webhook URL: /webhook/abc-def-123          │
└──────────────────────────────────────────────┘
```

---

### Workflow Execution Flow

```
EXTERNAL EVENT: SMS received at +15559999999
   ↓
┌──────────────────────────────────────────────┐
│ TWILIO WEBHOOK                               │
│ POST /api/inbound/sms                        │
└──────────────┬───────────────────────────────┘
               │
               ↓
┌──────────────────────────────────────────────┐
│ SMS HANDLER                                  │
├──────────────────────────────────────────────┤
│ 1. Parse Twilio payload                      │
│ 2. Resolve/create contact                    │
│ 3. Save message to database                  │
│ 4. Build trigger payload                     │
│    {                                         │
│      tenantId, contactId, messageId,         │
│      from, to, body, mediaCount              │
│    }                                         │
│ 5. Execute trigger                           │
│    executeTrigger({                          │
│      tenantId: 'ten_123',                    │
│      triggerType: 'sms.received.v1',         │
│      payload: {...}                          │
│    })                                        │
└──────────────┬───────────────────────────────┘
               │
               ↓
┌──────────────────────────────────────────────┐
│ TRIGGER EXECUTION ENGINE                     │
├──────────────────────────────────────────────┤
│ 1. Validate payload against schema           │
│    TriggerDestinationRegistry.validate()     │
│                                              │
│ 2. Query active subscriptions                │
│    WHERE triggerType = 'sms.received.v1'     │
│    WHERE enabled = true                      │
│                                              │
│ 3. Evaluate conditions                       │
│    IF subscription.conditions:               │
│      evaluateConditions(conditions, payload) │
│                                              │
│ 4. For each matching subscription:           │
│    - Read workflow document                  │
│    - Get n8n config from subcollection       │
│    - Extract webhook URL                     │
│    - POST payload to webhook                 │
└──────────────┬───────────────────────────────┘
               │ POST /webhook/abc-def-123
               ↓
┌──────────────────────────────────────────────┐
│ N8N WORKFLOW EXECUTION                       │
├──────────────────────────────────────────────┤
│ 1. Webhook trigger receives payload          │
│ 2. Workflow nodes execute in sequence        │
│    - Send SMS                                │
│    - Update contact                          │
│    - Create opportunity                      │
│ 3. Workflow completes                        │
└──────────────────────────────────────────────┘
```

---

## 🗄️ Firestore Data Structure

### Workflow Storage

```
/tenants/{tenantId}/
  workflows/
    {workflowId}/
      # Main workflow document (ReactFlow format)
      id: string
      name: string
      nodes: array          # ReactFlow nodes
      edges: array          # ReactFlow edges
      status: 'draft' | 'published'
      isPublic: boolean     # Controls n8n sync
      createdAt: timestamp
      updatedAt: timestamp

      # Subcollections
      n8n/
        config/
          # n8n workflow metadata
          n8nWorkflowId: string
          triggers: array[
            {
              nodeId: string
              url: string          # Production webhook URL
              webhookId: string
              httpMethod: string
            }
          ]
          createdAt: timestamp
          updatedAt: timestamp

      fieldMappingData/
        {nodeId}/
          # Available fields for mapping
          availableFields: array[
            { path: 'from', type: 'string' },
            { path: 'contact.name', type: 'string' }
          ]
          testPayload: object    # Sample data
          createdAt: timestamp

      compiledWorkflow/
        nodes/
          # Transformed n8n nodes (intermediate)
          nodes: array[n8nNode]

      skeleton/
        buildPlan/
          # Transformation build plan
          methods: array[...]

  triggerSubscriptions/
    {subscriptionId}/
      # Auto-created from trigger nodes
      id: string
      workflowId: string       # Links back to workflow
      triggerType: string      # 'sms.received.v1'
      enabled: boolean
      conditions: object       # Optional payload filtering
      priority: number
      createdAt: timestamp
      updatedAt: timestamp
```

---

## 🔧 Key API Endpoints

### Workflow Management

```bash
# Create workflow
POST /api/workflows
Body: { name: "My Workflow" }

# Update workflow (triggers transformation if isPublic=true)
PUT /api/workflows/:id
Body: {
  name: "Updated Workflow",
  nodes: [...],
  edges: [...],
  isPublic: true  # ← Triggers n8n sync
}

# Get workflow
GET /api/workflows/:id

# Delete workflow
DELETE /api/workflows/:id

# Trigger workflow manually
POST /api/workflows/trigger
Body: {
  workflowId: "wf_123",
  payload: {...}
}
```

---

### Field Mapping

```bash
# Set field mapping from test payload
POST /api/workflows/:workflowId/set-field-mapping
Body: {
  nodeId: "trigger_1",
  testPayload: {
    from: "+1555",
    body: "Test",
    contact: { name: "John" }
  }
}

# Frontend receives available fields:
Response: {
  availableFields: [
    { path: "from", type: "string" },
    { path: "body", type: "string" },
    { path: "contact.name", type: "string" }
  ]
}
```

---

### Trigger Subscriptions

```bash
# List subscriptions
GET /api/workflows/trigger-subscriptions

# Get subscription
GET /api/workflows/trigger-subscriptions/:id

# Create subscription (usually auto-created)
POST /api/workflows/trigger-subscriptions
Body: {
  workflowId: "wf_123",
  triggerType: "sms.received.v1",
  enabled: true
}

# Update subscription
PUT /api/workflows/trigger-subscriptions/:id
Body: {
  enabled: false,
  conditions: {
    payload: { "mediaCount": { "$gt": 0 } }
  }
}

# Delete subscription
DELETE /api/workflows/trigger-subscriptions/:id

# Execute trigger manually (testing)
POST /api/workflows/trigger-subscriptions/execute
Body: {
  triggerType: "sms.received.v1",
  payload: {...}
}
```

---

### Node Registry

```bash
# Get all available nodes
GET /api/workflows/nodes

# Get node config
GET /api/workflows/nodes/:nodeName

# Get node stats
GET /api/workflows/nodes/stats
```

---

## 🎯 Integration Patterns

### Pattern 1: Adding a New Trigger Event

**Steps:**

1. **Register event in TriggerDestinationRegistry**
   ```typescript
   // triggerSubscriptions/services/TriggerDestinationRegistry/records/email.received.v1.ts
   export const emailReceivedV1: TriggerEventDefinition = {
     type: 'email.received.v1',
     payloadSchema: {...},
     filterableFields: [...]
   };
   ```

2. **Create trigger node config**
   ```typescript
   // nodeRegistry/nodes/trigger/emailReceivedTrigger.config.ts
   export const emailReceivedTriggerNode = {
     name: 'emailReceivedTrigger',
     _pulseline: {
       isTrigger: true,
       triggerType: 'email.received.v1'  // ← Links to registry
     }
   };
   ```

3. **Add transformation method**
   ```typescript
   // transformationMethodRegistry/methods/trigger_webhook.ts
   // Already handles all webhook triggers
   ```

4. **Integrate in event handler**
   ```typescript
   // inboundEvents/email/services/emailHandler.ts
   await executeTrigger({
     tenantId,
     triggerType: 'email.received.v1',
     payload: {...}
   });
   ```

**Result:** Complete trigger event integration across all systems.

---

### Pattern 2: Adding a New Action Node

**Steps:**

1. **Create node config**
   ```typescript
   // nodeRegistry/nodes/crm/createDeal.config.ts
   export const createDealNode = {
     name: 'createDeal',
     _pulseline: {
       transformationMethod: 'hubspot_create_deal'
     },
     properties: [...]
   };
   ```

2. **Create transformation method**
   ```typescript
   // transformationMethodRegistry/methods/hubspot_create_deal.ts
   export const hubspot_create_deal: TransformationMethod = async (node, ctx) => {
     return {
       name: node.id,
       type: 'n8n-nodes-base.httpRequest',
       parameters: {
         url: 'https://api.hubspot.com/crm/v3/objects/deals',
         method: 'POST',
         body: {...}
       }
     };
   };
   ```

3. **Register transformation method**
   ```typescript
   // transformationMethodRegistry/index.ts
   TransformationRegistry.registerMethod('hubspot_create_deal', hubspot_create_deal);
   ```

**Result:** New action node available in frontend, transforms correctly to n8n.

---

## 🚨 Common Integration Issues

### Issue: Workflow not triggering

**Symptom:** Event occurs but workflow doesn't execute.

**Debug Steps:**
1. Check subscription exists: `GET /api/workflows/trigger-subscriptions?workflowId=wf_123`
2. Check subscription enabled: `subscription.enabled === true`
3. Check webhook URL exists: Read `/workflows/{wid}/n8n/config`
4. Test webhook directly: `POST https://n8n.../webhook/{id}`
5. Check n8n workflow active: n8n UI → Workflows → Active status

**Common Causes:**
- Subscription not created (trigger node missing `_pulseline.triggerType`)
- Workflow not deployed (`isPublic=false`)
- n8n workflow deactivated
- Wrong `triggerType` in subscription

---

### Issue: Transformation fails

**Symptom:** Error when saving workflow with `isPublic=true`.

**Debug Steps:**
1. Check transformation logs in backend
2. Verify all nodes have valid `transformationMethod`
3. Check Node Registry has configs for all node types
4. Verify custom field expressions resolve correctly

**Common Causes:**
- Node config missing `_pulseline.transformationMethod`
- Transformation method not registered
- Invalid field expression syntax
- Missing API key for custom nodes

---

### Issue: Field mapping not working

**Symptom:** Custom fields show as `{{ $json['field'] }}` instead of actual n8n expressions.

**Debug Steps:**
1. Check field mapping data exists: Read `/workflows/{wid}/fieldMappingData/{nodeId}`
2. Verify test payload was sent: `POST /set-field-mapping`
3. Check transformation resolves fields: Look for `resolveCustomFields()` logs

**Common Causes:**
- Test payload never sent to node
- Field mapping data not saved to Firestore
- Transformation not calling `resolveCustomFields()`
- Frontend using wrong field expression format

---

## 📚 Related Documentation

- **[Transformation System](../transformationSystem/README.md)** - ReactFlow → n8n conversion
- **[Node Registry](../nodeRegistry/README.md)** - Node configurations
- **[Field Mapping](../fieldMapping/README.md)** - Test data → field extraction
- **[Trigger Subscriptions](../triggerSubscriptions/README.md)** - Event → Workflow execution

---

## 🔗 Next Steps

- **[END-TO-END-FLOW.md](./END-TO-END-FLOW.md)** - Complete user journey walkthrough
- **[patterns/frontend-backend.md](./patterns/frontend-backend.md)** - Frontend integration details
- **[patterns/trigger-integration.md](./patterns/trigger-integration.md)** - Trigger system deep dive
- **[QUICK-PROBLEM-SOLVING.md](./QUICK-PROBLEM-SOLVING.md)** - Troubleshooting guide
