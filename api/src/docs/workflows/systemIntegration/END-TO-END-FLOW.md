# End-to-End Workflow Flow

> **Complete user journey** from workflow creation to execution

---

## Overview

This document traces the complete lifecycle of a workflow from creation in the frontend to execution when triggered by an external event.

**User Goal:** Create an SMS auto-responder workflow that sends a thank-you message when a customer texts.

---

## Phase 1: Workflow Creation (Frontend)

### Step 1: User Opens Workflow Builder

**Frontend Action:**
```typescript
// User navigates to /workflows/new
// ReactFlow canvas loads
```

**UI State:**
- Empty canvas
- Node palette visible (all nodes from Node Registry)
- Save button disabled

---

### Step 2: Load Available Nodes

**Frontend Request:**
```http
GET /api/workflows/nodes
Authorization: Bearer {jwt_token}
```

**Backend Response:**
```json
{
  "success": true,
  "data": {
    "nodes": [
      {
        "name": "smsReceivedTrigger",
        "displayName": "SMS Received",
        "group": "trigger",
        "_pulseline": {
          "isTrigger": true,
          "triggerType": "sms.received.v1"
        },
        "properties": [...]
      },
      {
        "name": "sendSms",
        "displayName": "Send SMS",
        "group": "sms",
        "_pulseline": {
          "transformationMethod": "twilio_send_sms"
        },
        "properties": [...]
      }
    ]
  }
}
```

**UI Update:**
- Node palette populates with available nodes
- Nodes grouped by category (Trigger, SMS, CRM, etc.)

---

### Step 3: Drag Trigger Node to Canvas

**User Action:** Drags "SMS Received" trigger to canvas

**Frontend State Update:**
```typescript
const newNode = {
  id: 'node_1',
  type: 'smsReceivedTrigger',
  position: { x: 100, y: 200 },
  data: {
    nodeName: 'smsReceivedTrigger',
    label: 'SMS Received',
    parameters: {
      path: null  // Will be minted server-side
    }
  }
};

setNodes([...nodes, newNode]);
```

**UI State:**
- "SMS Received" node appears on canvas
- Save button still disabled (needs at least one action node)

---

### Step 4: Drag Send SMS Node to Canvas

**User Action:** Drags "Send SMS" action to canvas

**Frontend State Update:**
```typescript
const actionNode = {
  id: 'node_2',
  type: 'sendSms',
  position: { x: 400, y: 200 },
  data: {
    nodeName: 'sendSms',
    label: 'Send SMS',
    parameters: {
      to: '',      // User will configure
      body: ''     // User will configure
    }
  }
};

setNodes([...nodes, actionNode]);
```

---

### Step 5: Connect Nodes

**User Action:** Draws edge from trigger to action

**Frontend State Update:**
```typescript
const newEdge = {
  id: 'edge_1',
  source: 'node_1',
  target: 'node_2',
  sourceHandle: 'main',
  targetHandle: null
};

setEdges([...edges, newEdge]);
```

**UI State:**
- Visual connection appears between nodes
- Save button enabled

---

### Step 6: Configure Send SMS Parameters

**User Action:** Clicks "Send SMS" node, opens config panel

**UI Shows:**
```
┌─────────────────────────────────┐
│ Send SMS Configuration          │
├─────────────────────────────────┤
│ To:   [{{ $json['from'] }}    ]│  ← Field mapping dropdown
│ Body: [Thanks for texting!    ]│
└─────────────────────────────────┘
```

**User selects field mapping:**
- Clicks "To" field dropdown
- Sees available fields: `from`, `to`, `body`, `contact.name`, `contact.phone`
- Selects `from` (reply to sender)

**Frontend State Update:**
```typescript
updateNodeData('node_2', {
  parameters: {
    to: '={{ $json[\'from\'] }}',  // Field mapping expression
    body: 'Thanks for texting! We\'ll respond shortly.'
  }
});
```

---

### Step 7: Test Workflow with Sample Data

**User Action:** Clicks "Send Test Data" in trigger node

**Frontend Request:**
```http
POST /api/workflows/{workflowId}/set-field-mapping
Content-Type: application/json

{
  "nodeId": "node_1",
  "testPayload": {
    "from": "+15551234567",
    "to": "+15559999999",
    "body": "Hello, I need help",
    "contactId": "con_test_123",
    "messageId": "msg_test_456",
    "mediaCount": 0,
    "timestamp": "2025-01-19T10:00:00Z"
  }
}
```

**Backend Processing:**
```typescript
// File: setFieldMappingReference/index.ts
export async function setFieldMappingReference(
  workflowId: string,
  nodeId: string,
  testPayload: any
) {
  // 1. Extract available fields
  const fields = defineFieldsFromJson(testPayload);
  // Result: [
  //   { path: 'from', type: 'string' },
  //   { path: 'to', type: 'string' },
  //   { path: 'body', type: 'string' },
  //   { path: 'contactId', type: 'string' },
  //   ...
  // ]

  // 2. Store field mapping
  await firestore
    .collection('tenants').doc(tenantId)
    .collection('workflows').doc(workflowId)
    .collection('fieldMappingData').doc(nodeId)
    .set({
      availableFields: fields,
      testPayload: testPayload,
      createdAt: Timestamp.now()
    });

  return { availableFields: fields };
}
```

**Backend Response:**
```json
{
  "success": true,
  "data": {
    "availableFields": [
      { "path": "from", "type": "string" },
      { "path": "to", "type": "string" },
      { "path": "body", "type": "string" },
      { "path": "contactId", "type": "string" },
      { "path": "messageId", "type": "string" },
      { "path": "mediaCount", "type": "number" },
      { "path": "timestamp", "type": "string" }
    ]
  }
}
```

**UI Update:**
- Field mapping dropdown now shows all available fields
- User can select fields in downstream nodes

---

### Step 8: Save Workflow (Draft)

**User Action:** Clicks "Save" (not "Save & Deploy")

**Frontend Request:**
```http
PUT /api/workflows/wf_123
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
          "body": "Thanks for texting! We'll respond shortly."
        }
      }
    }
  ],
  "edges": [
    {
      "id": "edge_1",
      "source": "node_1",
      "target": "node_2"
    }
  ],
  "isPublic": false  // ← Draft mode, don't sync to n8n
}
```

**Backend Processing:**
```typescript
// File: workflowCrudManager/updateWorkflow.ts
export async function updateWorkflow(tenantId, workflowId, data) {
  // 1. Ensure webhook IDs (minted server-side)
  ensureWebhookIds(data.nodes);
  // Result: node_1.data.parameters.path = 'abc-def-123' (UUID)

  // 2. Update Firestore
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

  // 3. Skip n8n sync (isPublic=false)
  console.log('Draft mode - skipping n8n sync');

  return updatedWorkflow;
}
```

**Result:**
- Workflow saved to Firestore
- NOT deployed to n8n (draft mode)
- NOT active for triggering

---

## Phase 2: Workflow Deployment

### Step 9: Deploy Workflow

**User Action:** Clicks "Save & Deploy" (or toggles "Active" switch)

**Frontend Request:**
```http
PUT /api/workflows/wf_123
Content-Type: application/json

{
  "name": "SMS Auto-Responder",
  "nodes": [...],  // Same as before
  "edges": [...],
  "isPublic": true  // ← Deploy to n8n
}
```

**Backend Processing (Complete Transformation Flow):**

```typescript
// File: workflowCrudManager/updateWorkflow.ts
export async function updateWorkflow(tenantId, workflowId, data, userId) {
  // ========== STEP 1: Save to Firestore ==========
  await firestore
    .collection('tenants').doc(tenantId)
    .collection('workflows').doc(workflowId)
    .update({
      nodes: data.nodes,
      edges: data.edges,
      isPublic: true,
      updatedAt: Timestamp.now()
    });

  // ========== STEP 2: Get API Key ==========
  const accountApiKey = await getOrCreateAccountApiKey(tenantId, userId);
  console.log('✅ Retrieved account API key');

  // ========== STEP 3: Transform to n8n ==========
  console.log('🔧 Starting transformation system...');

  const transformResult = await transformWorkflow(
    tenantId,
    workflowId,
    accountApiKey,
    {
      rawReactFlow: {
        name: 'SMS Auto-Responder',
        nodes: data.nodes,
        edges: data.edges
      }
    }
  );

  // Transformation orchestrator runs:
  // 1. reviewReactFlow() - Planning phase
  //    - Detects nodes: smsReceivedTrigger, sendSms
  //    - Creates build plan: ['trigger_webhook', 'twilio_send_sms']
  //
  // 2. transform2N8n() - Compilation phase
  //    - Executes transformation methods
  //    - Resolves custom field expressions
  //    - Builds n8n nodes and connections
  //
  // Result:
  //   {
  //     success: true,
  //     totalMethods: 2,
  //     totalNodes: 2,
  //     connections: {
  //       'SMS Received': { main: [[{ node: 'Send SMS', type: 'main', index: 0 }]] }
  //     }
  //   }

  console.log(`✅ Transformation complete: ${transformResult.totalNodes} nodes`);

  // ========== STEP 4: Load Compiled Nodes ==========
  const compiledNodes = await readCompiledWorkflow(tenantId, workflowId);
  // Result: [
  //   {
  //     name: 'SMS Received',
  //     type: 'n8n-nodes-base.webhook',
  //     webhookId: 'abc-def-123',
  //     parameters: { path: 'abc-def-123', httpMethod: 'POST' }
  //   },
  //   {
  //     name: 'Send SMS',
  //     type: 'n8n-nodes-base.twilio',
  //     parameters: {
  //       resource: 'sms',
  //       operation: 'send',
  //       to: '={{ $node["SMS Received"].json["from"] }}',  // Resolved!
  //       body: 'Thanks for texting! We\'ll respond shortly.'
  //     }
  //   }
  // ]

  // ========== STEP 5: Inject Authentication ==========
  const nodesWithAuth = injectAuthenticationKey(compiledNodes, accountApiKey);
  // Adds Twilio credentials to Send SMS node

  // ========== STEP 6: Build n8n Workflow ==========
  const n8nWorkflowData = {
    name: 'SMS Auto-Responder',
    nodes: nodesWithAuth,
    connections: transformResult.connections,
    settings: {},
    staticData: null
  };

  // ========== STEP 7: Create in n8n ==========
  console.log('➕ Creating n8n workflow...');
  const n8nWorkflow = await workflowManager.createWorkflow(
    n8nWorkflowData,
    tenantId,
    workflowId
  );
  // Result: { id: '123', name: '...', nodes: [...], ... }

  console.log(`✅ Created n8n workflow: ${n8nWorkflow.id}`);

  // ========== STEP 8: Activate Workflow ==========
  await workflowManager.activateWorkflow(n8nWorkflow.id);
  console.log(`🟢 Activated n8n workflow`);

  // ========== STEP 9: Store n8n Config ==========
  await createWorkflowInFirestore(tenantId, workflowId, n8nWorkflow);
  // Saves to: /workflows/wf_123/n8n/config
  // {
  //   n8nWorkflowId: '123',
  //   triggers: [
  //     {
  //       nodeId: 'SMS Received',
  //       url: 'https://n8n.example.com/webhook/abc-def-123',
  //       webhookId: 'abc-def-123',
  //       httpMethod: 'POST'
  //     }
  //   ],
  //   createdAt: Timestamp
  // }

  console.log(`✅ Synced to n8n config subcollection`);

  // ========== STEP 10: Auto-Create Trigger Subscription ==========
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

    console.log(`🔔 Auto-creating trigger subscription: ${triggerType}`);

    await createSubscription(tenantId, {
      workflowId: workflowId,
      triggerType: triggerType,  // 'sms.received.v1'
      enabled: true
    });

    console.log(`✅ Subscription created`);
  }

  return updatedWorkflow;
}
```

**Backend Response:**
```json
{
  "success": true,
  "data": {
    "id": "wf_123",
    "name": "SMS Auto-Responder",
    "status": "published",
    "isPublic": true,
    "nodes": [...],
    "edges": [...],
    "triggers": [
      {
        "nodeId": "SMS Received",
        "url": "https://n8n.example.com/webhook/abc-def-123",
        "webhookId": "abc-def-123"
      }
    ]
  }
}
```

**UI Update:**
- Success message: "Workflow deployed successfully!"
- Status indicator: "Active"
- Webhook URL displayed in trigger node config

**Firestore State After Deployment:**
```
/tenants/ten_123/
  workflows/
    wf_123/
      # Main document
      id: 'wf_123'
      name: 'SMS Auto-Responder'
      isPublic: true
      nodes: [...]
      edges: [...]

      # n8n config subcollection
      n8n/
        config/
          n8nWorkflowId: '123'
          triggers: [
            {
              nodeId: 'SMS Received',
              url: 'https://n8n.example.com/webhook/abc-def-123'
            }
          ]

      # Field mapping subcollection
      fieldMappingData/
        node_1/
          availableFields: [...]
          testPayload: {...}

  # Trigger subscription
  triggerSubscriptions/
    sub_xyz/
      id: 'sub_xyz'
      workflowId: 'wf_123'
      triggerType: 'sms.received.v1'
      enabled: true
```

---

## Phase 3: Workflow Execution

### Step 10: Customer Sends SMS

**External Event:**
```
Customer phone: +15551234567
Sends SMS to: +15559999999
Message: "I need help with my order"
```

**Twilio Webhook → Pulseline:**
```http
POST /api/inbound/sms
Content-Type: application/x-www-form-urlencoded

From=%2B15551234567&
To=%2B15559999999&
Body=I+need+help+with+my+order&
MessageSid=SM123456789&
NumMedia=0
```

---

### Step 11: SMS Handler Processes Event

**Backend Processing:**
```typescript
// File: inboundEvents/sms/services/newRequestHandler.ts
export async function handleInboundSMS(twilioPayload) {
  console.log('📨 Received inbound SMS');

  // 1. Parse Twilio payload
  const processedData = {
    tenantId: await resolveTenantFromPhoneNumber(twilioPayload.To),
    messageId: twilioPayload.MessageSid,
    from: twilioPayload.From,       // +15551234567
    to: twilioPayload.To,           // +15559999999
    body: twilioPayload.Body,       // "I need help with my order"
    mediaUrls: [],
    timestamp: new Date().toISOString()
  };

  console.log('📋 Resolved tenant:', processedData.tenantId);

  // 2. Resolve or create contact
  const contact = await resolveOrCreateContact({
    tenantId: processedData.tenantId,
    phoneNumber: processedData.from
  });

  console.log('👤 Contact resolved:', contact.contactId);

  // 3. Save message to database
  await saveMessage({
    tenantId: processedData.tenantId,
    contactId: contact.contactId,
    messageId: processedData.messageId,
    from: processedData.from,
    to: processedData.to,
    body: processedData.body,
    timestamp: processedData.timestamp
  });

  console.log('💾 Message saved to database');

  // 4. Build trigger payload
  const payload = {
    tenantId: processedData.tenantId,
    contactId: contact.contactId,
    messageId: processedData.messageId,
    from: processedData.from,         // +15551234567
    to: processedData.to,             // +15559999999
    body: processedData.body,         // "I need help with my order"
    mediaCount: 0,
    mediaUrls: [],
    timestamp: processedData.timestamp
  };

  // 5. Execute trigger
  console.log('🔔 Executing trigger: sms.received.v1');

  await executeTrigger({
    tenantId: processedData.tenantId,
    triggerType: 'sms.received.v1',
    payload: payload
  });

  return { success: true };
}
```

---

### Step 12: Trigger Execution Engine

**Backend Processing:**
```typescript
// File: triggerSubscriptions/services/triggerExecutions.ts
export async function executeTrigger(input) {
  const { tenantId, triggerType, payload } = input;

  console.log(`\n🎯 ========== TRIGGER EXECUTION ==========`);
  console.log(`   Type: ${triggerType}`);
  console.log(`   Tenant: ${tenantId}`);

  // 1. Validate payload
  const eventDef = TriggerDestinationRegistry.getEventDefinition(triggerType);
  const payloadValidation = TriggerDestinationRegistry.validatePayload(
    triggerType,
    payload
  );

  if (!payloadValidation.valid) {
    throw new Error(`Invalid payload: ${payloadValidation.errors.join(', ')}`);
  }

  console.log('✅ Payload validated');

  // 2. Query active subscriptions
  const subscriptions = await getSubscriptions(tenantId, {
    triggerType: 'sms.received.v1',
    enabled: true
  });

  console.log(`📋 Found ${subscriptions.length} active subscriptions`);

  if (subscriptions.length === 0) {
    return {
      success: true,
      message: 'No active subscriptions found',
      subscriptionsFound: 0
    };
  }

  // 3. Execute each subscription
  for (const subscription of subscriptions) {
    console.log(`\n🔄 Processing subscription: ${subscription.id}`);
    console.log(`   Workflow: ${subscription.workflowId}`);

    // 4. Read workflow
    const workflow = await readWorkflow(tenantId, subscription.workflowId);

    // 5. Get webhook URL from n8n config
    const n8nConfig = await firestore
      .collection('tenants').doc(tenantId)
      .collection('workflows').doc(subscription.workflowId)
      .collection('n8n').doc('config')
      .get();

    const webhookUrl = n8nConfig.data().triggers[0].url;
    console.log(`🔗 Webhook URL: ${webhookUrl}`);

    // 6. POST to webhook
    console.log('📤 Posting payload to webhook...');

    await axios.post(webhookUrl, payload, {
      headers: { 'Content-Type': 'application/json' }
    });

    console.log('✅ Payload sent successfully');
  }

  return {
    success: true,
    subscriptionsFound: subscriptions.length,
    summary: {
      total: subscriptions.length,
      completed: subscriptions.length,
      failed: 0
    }
  };
}
```

**HTTP Request to n8n:**
```http
POST https://n8n.example.com/webhook/abc-def-123
Content-Type: application/json

{
  "tenantId": "ten_123",
  "contactId": "con_456",
  "messageId": "SM123456789",
  "from": "+15551234567",
  "to": "+15559999999",
  "body": "I need help with my order",
  "mediaCount": 0,
  "mediaUrls": [],
  "timestamp": "2025-01-19T10:00:00Z"
}
```

---

### Step 13: n8n Workflow Execution

**n8n Receives Webhook:**

```
Workflow: SMS Auto-Responder (ID: 123)
Status: Executing...

Node 1: SMS Received (webhook)
  Input: {
    "from": "+15551234567",
    "to": "+15559999999",
    "body": "I need help with my order",
    "contactId": "con_456",
    ...
  }
  Output: Same payload

Node 2: Send SMS (twilio)
  Input: {
    "to": "={{ $node['SMS Received'].json['from'] }}",
    "body": "Thanks for texting! We'll respond shortly."
  }
  Resolved: {
    "to": "+15551234567",  // ← Field mapping resolved!
    "body": "Thanks for texting! We'll respond shortly."
  }
  Action: POST to Twilio API
  Result: SMS sent successfully

Workflow Status: Completed
```

---

### Step 14: Customer Receives Response

**Twilio Sends SMS:**
```
To: +15551234567
From: +15559999999
Body: "Thanks for texting! We'll respond shortly."
```

**Customer's Phone:**
```
┌─────────────────────────────────┐
│ Messages                        │
├─────────────────────────────────┤
│ +15559999999                    │
│                                 │
│ Me:                             │
│ I need help with my order       │
│ 10:00 AM                        │
│                                 │
│ Them:                           │
│ Thanks for texting! We'll       │
│ respond shortly.                │
│ 10:00 AM                        │
└─────────────────────────────────┘
```

---

## Complete Flow Diagram

```
┌──────────────┐
│   CUSTOMER   │  Sends SMS: "I need help"
└──────┬───────┘
       │
       ↓  SMS to +15559999999
┌──────────────┐
│    TWILIO    │  Webhook POST /api/inbound/sms
└──────┬───────┘
       │
       ↓
┌──────────────────────────────────┐
│  SMS HANDLER                     │
│  1. Parse Twilio payload         │
│  2. Resolve contact              │
│  3. Save message                 │
│  4. Build trigger payload        │
│  5. executeTrigger()             │
└──────┬───────────────────────────┘
       │
       ↓
┌──────────────────────────────────┐
│  TRIGGER EXECUTION ENGINE        │
│  1. Validate payload             │
│  2. Query subscriptions          │
│     - WHERE type='sms.received'  │
│     - WHERE enabled=true         │
│  3. Found: 1 subscription        │
│  4. Read workflow wf_123         │
│  5. Get webhook URL              │
│  6. POST to webhook              │
└──────┬───────────────────────────┘
       │
       ↓  POST /webhook/abc-def-123
┌──────────────────────────────────┐
│  N8N WORKFLOW                    │
│  1. Webhook receives payload     │
│  2. Send SMS node executes       │
│     - to: {{ $json['from'] }}    │
│     - Resolved: +15551234567     │
│  3. POST to Twilio API           │
│  4. Workflow completes           │
└──────┬───────────────────────────┘
       │
       ↓
┌──────────────┐
│    TWILIO    │  Sends SMS to customer
└──────┬───────┘
       │
       ↓
┌──────────────┐
│   CUSTOMER   │  Receives: "Thanks for texting!"
└──────────────┘
```

---

## Timeline Summary

| Time | Event | System | Result |
|------|-------|--------|--------|
| T+0s | User creates workflow | Frontend | ReactFlow nodes + edges |
| T+5s | User sends test data | Frontend → Backend | Field mapping created |
| T+10s | User clicks "Save & Deploy" | Frontend → Backend | Transformation triggered |
| T+12s | Transformation executes | Backend | n8n nodes generated |
| T+15s | Deploy to n8n | Backend → n8n | Workflow activated |
| T+16s | Auto-create subscription | Backend | Subscription saved |
| T+20s | Customer sends SMS | Twilio → Backend | SMS received |
| T+21s | SMS handler processes | Backend | Message saved, trigger executed |
| T+22s | Trigger execution | Backend | Subscription queried |
| T+23s | POST to webhook | Backend → n8n | Workflow triggered |
| T+24s | n8n executes workflow | n8n | Send SMS node runs |
| T+25s | Twilio sends response | n8n → Twilio | SMS delivered |
| T+26s | Customer receives SMS | Twilio → Customer | Auto-response received |

**Total Time:** 26 seconds from creation to execution

---

## Key Integration Points

### 1. Frontend → Backend
- **Trigger:** User saves workflow
- **Data:** ReactFlow nodes + edges
- **Result:** Workflow saved to Firestore

### 2. Backend → Transformation System
- **Trigger:** `isPublic=true`
- **Data:** ReactFlow workflow
- **Result:** n8n nodes generated

### 3. Transformation → Node Registry
- **Trigger:** For each node
- **Data:** Node type
- **Result:** Transformation method retrieved

### 4. Transformation → Field Mapping
- **Trigger:** Custom field expression found
- **Data:** `={{ $json['field'] }}`
- **Result:** Resolved to n8n expression

### 5. Backend → n8n Server
- **Trigger:** Transformation complete
- **Data:** n8n workflow structure
- **Result:** Workflow created + activated

### 6. Backend → Trigger Subscriptions
- **Trigger:** Trigger node detected
- **Data:** workflowId + triggerType
- **Result:** Subscription created

### 7. External Event → Trigger System
- **Trigger:** Event handler
- **Data:** Event payload
- **Result:** Subscriptions queried

### 8. Trigger System → n8n Workflow
- **Trigger:** Subscription match
- **Data:** Event payload
- **Result:** Workflow executed

---

## Related Docs

- **[README.md](./README.md)** - System integration overview
- **[patterns/frontend-backend.md](./patterns/frontend-backend.md)** - Frontend integration details
- **[patterns/trigger-integration.md](./patterns/trigger-integration.md)** - Trigger system deep dive
- **[QUICK-PROBLEM-SOLVING.md](./QUICK-PROBLEM-SOLVING.md)** - Troubleshooting guide
