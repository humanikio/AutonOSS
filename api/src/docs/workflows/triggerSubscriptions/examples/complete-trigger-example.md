# Complete Trigger Example

> End-to-end SMS trigger workflow - from event to execution

---

## Overview

This example shows the **complete lifecycle** of an SMS trigger:

1. Event definition in TriggerDestinationRegistry
2. Trigger node configuration
3. Workflow creation with trigger node
4. Auto-subscription creation
5. SMS received → handler integration
6. Trigger execution with condition filtering
7. Workflow execution in n8n

---

## Step 1: Event Definition

**Event:** `sms.received.v1`

**File:** `triggerSubscriptions/services/TriggerDesitinationRegistry/records/sms.received.v1.ts`

```typescript
import { TriggerEventDefinition } from '../../../types';

export const smsReceivedV1: TriggerEventDefinition = {
  type: 'sms.received.v1',
  version: 1,
  displayName: 'SMS Received',
  description: 'Triggered when inbound SMS received and contact resolved',
  category: 'communication',

  payloadSchema: {
    type: 'object',
    properties: {
      tenantId: { type: 'string' },
      contactId: { type: 'string' },
      messageId: { type: 'string' },
      from: { type: 'string' },
      to: { type: 'string' },
      body: { type: 'string' },
      mediaCount: { type: 'number' },
      mediaUrls: {
        type: 'array',
        items: { type: 'string' }
      },
      timestamp: { type: 'string' }
    },
    required: ['tenantId', 'contactId', 'messageId', 'from', 'to', 'body', 'timestamp']
  },

  examplePayload: {
    tenantId: 'ten_123',
    contactId: 'con_456',
    messageId: 'msg_789',
    from: '+15551234567',
    to: '+15559999999',
    body: 'Hello, I need help with my order',
    mediaCount: 0,
    mediaUrls: [],
    timestamp: '2025-01-19T10:00:00Z'
  },

  filterableFields: [
    {
      field: 'from',
      type: 'string',
      description: 'Filter by sender phone number'
    },
    {
      field: 'to',
      type: 'string',
      description: 'Filter by recipient phone number'
    },
    {
      field: 'body',
      type: 'string',
      description: 'Filter by message content (supports $contains)'
    },
    {
      field: 'mediaCount',
      type: 'number',
      description: 'Filter by number of media attachments'
    }
  ],

  isStable: true,

  metadata: {
    usesResumeUrl: false  // Standard webhook pattern
  }
};
```

**Registered in:** `TriggerDesitinationRegistry/index.ts`

```typescript
import { smsReceivedV1 } from './records/sms.received.v1';

const eventRegistry: Record<string, TriggerEventDefinition> = {
  'sms.received.v1': smsReceivedV1,
  // ... other events
};
```

---

## Step 2: Trigger Node Configuration

**File:** `nodeRegistry/nodes/trigger/smsReceivedTrigger.config.ts`

```typescript
import { INodeTypeDescription } from 'n8n-workflow';

export const smsReceivedTriggerNode: INodeTypeDescription = {
  displayName: 'SMS Received',
  name: 'smsReceivedTrigger',
  group: ['trigger'],
  version: 1,
  description: 'Triggers workflow when SMS is received',

  defaults: {
    name: 'SMS Received',
    color: '#1E88E5'
  },

  inputs: [],   // Trigger nodes have no inputs
  outputs: ['main'],

  _pulseline: {
    isTrigger: true,
    triggerType: 'sms.received.v1',  // ← Links to event registry
    transformationMethod: 'trigger_webhook'
  },

  properties: [
    {
      displayName: 'Info',
      name: 'info',
      type: 'notice',
      default: '',
      typeOptions: {
        theme: 'info'
      },
      description: 'This trigger activates when an SMS message is received. The message data will be available in the workflow.'
    }
  ]
};
```

**Registered in:** `nodeRegistry/index.ts`

```typescript
import { smsReceivedTriggerNode } from './nodes/trigger/smsReceivedTrigger.config';

export const nodeRegistry = {
  'smsReceivedTrigger': smsReceivedTriggerNode,
  // ... other nodes
};
```

---

## Step 3: Workflow Creation

**User creates workflow in frontend:**

```json
{
  "workflowName": "SMS Auto-Responder",
  "nodes": [
    {
      "id": "node_trigger",
      "type": "smsReceivedTrigger",
      "position": [100, 200],
      "parameters": {}
    },
    {
      "id": "node_send_sms",
      "type": "sendSmsTwilio",
      "position": [400, 200],
      "parameters": {
        "to": "{{ $node.node_trigger.json.from }}",
        "body": "Thanks for your message! We'll respond shortly."
      }
    }
  ],
  "connections": {
    "node_trigger": {
      "main": [[{ "node": "node_send_sms", "type": "main", "index": 0 }]]
    }
  }
}
```

---

## Step 4: Backend Transformation

**When workflow saved, backend processes it:**

**File:** `workflows/workflowManager/saveWorkflow.ts`

```typescript
export async function saveWorkflow(tenantId: string, workflowData: any) {
  // 1. Transform workflow for n8n
  const n8nWorkflow = await transformWorkflow(workflowData);

  // 2. Deploy to n8n
  const n8nResponse = await n8nClient.createWorkflow(n8nWorkflow);

  // 3. Activate workflow → Get webhook URL
  const activationResponse = await n8nClient.activateWorkflow(n8nResponse.id);
  const webhookUrl = activationResponse.webhookUrl;

  // 4. Save workflow document
  const workflow = {
    workflowId: ulid(),
    tenantId,
    workflowName: workflowData.workflowName,
    n8nWorkflowId: n8nResponse.id,
    productionWebhookUrl: webhookUrl,  // ← Critical for trigger execution
    isActive: true,
    nodes: workflowData.nodes,
    connections: workflowData.connections
  };

  await firestore
    .collection('tenants').doc(tenantId)
    .collection('workflows').doc('main')
    .collection('workflows').doc(workflow.workflowId)
    .set(workflow);

  // 5. AUTO-CREATE SUBSCRIPTION (if has trigger node)
  const hasTrigger = workflowData.nodes.some(node => {
    const nodeConfig = nodeRegistry.getNodeConfig(node.type);
    return nodeConfig?._pulseline?.isTrigger === true;
  });

  if (hasTrigger) {
    const triggerNode = workflowData.nodes.find(node => {
      const nodeConfig = nodeRegistry.getNodeConfig(node.type);
      return nodeConfig?._pulseline?.isTrigger === true;
    });

    const nodeConfig = nodeRegistry.getNodeConfig(triggerNode.type);
    const triggerType = nodeConfig._pulseline.triggerType;

    // Auto-create subscription
    await createSubscription(tenantId, {
      workflowId: workflow.workflowId,
      triggerType: triggerType,  // "sms.received.v1"
      enabled: true
    });
  }

  return workflow;
}
```

**Result:** Subscription created automatically.

```typescript
{
  id: 'sub_01HX7K8QWER9TY',
  tenantId: 'ten_123',
  workflowId: 'wf_01HX7K8QW2345',
  triggerType: 'sms.received.v1',
  enabled: true,
  conditions: undefined,  // No conditions = match all SMS
  priority: 100,
  version: 1,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

---

## Step 5: SMS Handler Integration

**When SMS received from Twilio:**

**File:** `inboundEvents/sms/services/newRequestHandler.ts`

```typescript
export async function handleInboundSMS(twilioPayload: any) {
  // 1. Parse Twilio payload
  const processedData = {
    tenantId: await resolveTenantFromPhoneNumber(twilioPayload.To),
    messageId: twilioPayload.MessageSid,
    from: twilioPayload.From,
    to: twilioPayload.To,
    body: twilioPayload.Body,
    mediaUrls: parseMediaUrls(twilioPayload),
    metadata: {
      timestamp: new Date().toISOString()
    }
  };

  // 2. Resolve contact
  const contact = await resolveOrCreateContact({
    tenantId: processedData.tenantId,
    phoneNumber: processedData.from
  });

  // 3. Save message to database
  await saveMessage({
    tenantId: processedData.tenantId,
    contactId: contact.contactId,
    messageId: processedData.messageId,
    from: processedData.from,
    to: processedData.to,
    body: processedData.body,
    mediaUrls: processedData.mediaUrls,
    timestamp: processedData.metadata.timestamp
  });

  // 4. EXECUTE TRIGGER
  const payload = {
    tenantId: processedData.tenantId!,
    contactId: contact.contactId,
    messageId: processedData.messageId,
    from: processedData.from,
    to: processedData.to,
    body: processedData.body,
    mediaCount: processedData.mediaUrls.length,
    mediaUrls: processedData.mediaUrls,
    timestamp: processedData.metadata.timestamp
  };

  await executeTrigger({
    tenantId: processedData.tenantId!,
    triggerType: 'sms.received.v1',
    payload
  });

  return { success: true };
}
```

---

## Step 6: Trigger Execution

**File:** `triggerSubscriptions/services/triggerExecutions.ts`

```typescript
export async function executeTrigger(input: TriggerExecutionInput) {
  const { tenantId, triggerType, payload } = input;

  // 1. VALIDATE EVENT TYPE
  const eventDef = TriggerDestinationRegistry.getEventDefinition(triggerType);
  if (!eventDef) {
    throw new Error(`Unknown event type: ${triggerType}`);
  }

  // 2. VALIDATE PAYLOAD
  const payloadValidation = TriggerDestinationRegistry.validatePayload(
    triggerType,
    payload
  );

  if (!payloadValidation.valid) {
    throw new Error(`Invalid payload: ${payloadValidation.errors.join(', ')}`);
  }

  // 3. QUERY ACTIVE SUBSCRIPTIONS
  const subscriptionsResult = await getSubscriptions(tenantId, {
    triggerType: triggerType,
    enabled: true
  }, {
    payload: payload,  // ← Evaluates conditions
    verbose: false
  });

  const subscriptions = subscriptionsResult.subscriptions;

  console.log(`[Trigger] Found ${subscriptions.length} subscriptions for ${triggerType}`);

  if (subscriptions.length === 0) {
    return {
      success: true,
      message: 'No active subscriptions found',
      subscriptionsFound: 0,
      executionResults: [],
      summary: { total: 0, completed: 0, failed: 0 }
    };
  }

  // 4. CHECK EXECUTION PATTERN
  const usesResumeUrl = eventDef.metadata?.usesResumeUrl || false;

  // 5. EXECUTE EACH SUBSCRIPTION
  const executionResults = [];

  for (const subscription of subscriptions) {
    try {
      if (usesResumeUrl) {
        // WAIT NODE PATTERN (not used for SMS)
        // ... resumeUrl logic ...
      } else {
        // STANDARD WEBHOOK PATTERN

        // Read workflow
        const workflow = await readWorkflow(tenantId, subscription.workflowId);

        if (!workflow.productionWebhookUrl) {
          throw new Error('Workflow missing production webhook URL');
        }

        // POST to webhook
        await sendPayload({
          webhookUrl: workflow.productionWebhookUrl,
          payload: payload
        });

        executionResults.push({
          subscriptionId: subscription.id,
          workflowId: subscription.workflowId,
          success: true
        });
      }
    } catch (error) {
      executionResults.push({
        subscriptionId: subscription.id,
        workflowId: subscription.workflowId,
        success: false,
        error: error.message
      });
    }
  }

  // 6. RETURN RESULTS
  const completed = executionResults.filter(r => r.success).length;
  const failed = executionResults.filter(r => !r.success).length;

  return {
    success: true,
    message: 'Trigger executed successfully',
    subscriptionsFound: subscriptions.length,
    executionResults,
    summary: {
      total: subscriptions.length,
      completed,
      failed
    }
  };
}
```

---

## Step 7: Payload Sent to Webhook

**File:** `triggerSubscriptions/services/triggerExecutions/sendPayload.ts`

```typescript
export async function sendPayload(input: {
  webhookUrl: string;
  payload: Record<string, any>;
}) {
  const response = await fetch(input.webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(input.payload)
  });

  if (!response.ok) {
    throw new Error(`Failed to POST to webhook: ${response.statusText}`);
  }

  return { success: true };
}
```

**Payload sent to n8n:**

```json
{
  "tenantId": "ten_123",
  "contactId": "con_456",
  "messageId": "msg_789",
  "from": "+15551234567",
  "to": "+15559999999",
  "body": "Hello, I need help with my order",
  "mediaCount": 0,
  "mediaUrls": [],
  "timestamp": "2025-01-19T10:00:00Z"
}
```

---

## Step 8: n8n Workflow Execution

**n8n receives payload at webhook:**

```
https://n8n.example.com/webhook/abc123
```

**Workflow executes:**

1. **SMS Received Trigger** - Receives payload
2. **Send SMS (Twilio)** - Sends auto-response

**Trigger node output in n8n:**

```json
{
  "from": "+15551234567",
  "to": "+15559999999",
  "body": "Hello, I need help with my order",
  "contactId": "con_456",
  "messageId": "msg_789",
  "mediaCount": 0,
  "timestamp": "2025-01-19T10:00:00Z"
}
```

**Send SMS node uses field mapping:**

```json
{
  "to": "{{ $node['SMS Received'].json.from }}",  // "+15551234567"
  "body": "Thanks for your message! We'll respond shortly."
}
```

**Result:** Customer receives auto-response.

---

## Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      COMPLETE SMS TRIGGER FLOW                  │
└─────────────────────────────────────────────────────────────────┘

1. EVENT DEFINITION
   ├─ TriggerDestinationRegistry
   │  └─ sms.received.v1 registered
   │     ├─ payloadSchema defined
   │     ├─ filterableFields defined
   │     └─ metadata.usesResumeUrl = false
   │
2. TRIGGER NODE CONFIG
   ├─ nodeRegistry
   │  └─ smsReceivedTrigger
   │     └─ _pulseline.triggerType = 'sms.received.v1'
   │
3. WORKFLOW CREATION
   ├─ User creates workflow with SMS trigger node
   ├─ Backend transforms workflow → n8n
   ├─ n8n activates workflow → generates webhookUrl
   ├─ Backend saves workflow document
   │  └─ productionWebhookUrl: "https://n8n.../webhook/abc123"
   │
4. AUTO-SUBSCRIPTION
   ├─ Backend detects trigger node
   ├─ Extracts triggerType from node config
   ├─ Creates subscription automatically
   │  └─ Subscription: { workflowId, triggerType: 'sms.received.v1', enabled: true }
   │
5. SMS RECEIVED
   ├─ Twilio webhook → /api/inbound/sms
   ├─ Handler resolves contact
   ├─ Handler saves message
   │
6. TRIGGER EXECUTION
   ├─ executeTrigger({
   │    triggerType: 'sms.received.v1',
   │    payload: { from, body, contactId, ... }
   │  })
   ├─ Validate payload against schema ✓
   ├─ Query subscriptions:
   │  └─ WHERE triggerType = 'sms.received.v1'
   │  └─ WHERE enabled = true
   │  └─ Result: 1 subscription found
   ├─ Evaluate conditions (if any)
   │  └─ No conditions → Match
   ├─ Read workflow document
   │  └─ Get productionWebhookUrl
   ├─ POST payload to webhookUrl
   │  └─ https://n8n.../webhook/abc123
   │
7. N8N WORKFLOW EXECUTES
   ├─ Trigger node receives payload
   ├─ Subsequent nodes execute
   │  └─ Send SMS → "Thanks for your message!"
   ├─ Workflow completes
   │
8. CUSTOMER RECEIVES RESPONSE
   └─ SMS delivered to customer
```

---

## Example with Conditions

**Scenario:** Only trigger for SMS with media (MMS).

**Step 1: Update subscription with condition**

```typescript
await updateSubscription('ten_123', 'sub_01HX7K8QWER9TY', {
  conditions: {
    payload: {
      "mediaCount": { "$gt": 0 }
    }
  }
});
```

**Step 2: Test with text-only SMS**

```typescript
// SMS received (no media)
await executeTrigger({
  tenantId: 'ten_123',
  triggerType: 'sms.received.v1',
  payload: {
    tenantId: 'ten_123',
    contactId: 'con_456',
    messageId: 'msg_001',
    from: '+15551234567',
    to: '+15559999999',
    body: 'Hello',
    mediaCount: 0,  // ← No media
    mediaUrls: [],
    timestamp: '2025-01-19T10:00:00Z'
  }
});
```

**Result:**
```json
{
  "success": true,
  "subscriptionsFound": 0,  // ← Filtered out by condition
  "executionResults": [],
  "summary": {
    "total": 0,
    "completed": 0,
    "failed": 0
  }
}
```

**Workflow NOT executed** (condition failed: 0 is not > 0).

---

**Step 3: Test with MMS**

```typescript
// SMS received (with media)
await executeTrigger({
  tenantId: 'ten_123',
  triggerType: 'sms.received.v1',
  payload: {
    tenantId: 'ten_123',
    contactId: 'con_456',
    messageId: 'msg_002',
    from: '+15551234567',
    to: '+15559999999',
    body: 'Check this photo',
    mediaCount: 2,  // ← Has media
    mediaUrls: [
      'https://api.twilio.com/media/img1.jpg',
      'https://api.twilio.com/media/img2.jpg'
    ],
    timestamp: '2025-01-19T10:01:00Z'
  }
});
```

**Result:**
```json
{
  "success": true,
  "subscriptionsFound": 1,  // ← Condition matched
  "executionResults": [
    {
      "subscriptionId": "sub_01HX7K8QWER9TY",
      "workflowId": "wf_01HX7K8QW2345",
      "success": true
    }
  ],
  "summary": {
    "total": 1,
    "completed": 1,
    "failed": 0
  }
}
```

**Workflow executed** (condition passed: 2 > 0).

---

## Data Flow Summary

### 1. Configuration Phase

**Event Registry → Node Config → Auto-Subscription**

```
TriggerDestinationRegistry/records/sms.received.v1.ts
  type: 'sms.received.v1'
  payloadSchema: { ... }
  filterableFields: [...]
  ↓
nodeRegistry/nodes/trigger/smsReceivedTrigger.config.ts
  _pulseline.triggerType: 'sms.received.v1'
  ↓
Workflow saved with trigger node
  ↓
createSubscription({
  workflowId: 'wf_123',
  triggerType: 'sms.received.v1',
  enabled: true
})
```

---

### 2. Execution Phase

**SMS Received → Handler → Trigger Execution → Webhook → n8n**

```
Twilio SMS Webhook
  ↓
inboundEvents/sms/services/newRequestHandler.ts
  - Resolve contact
  - Save message
  - Build payload
  ↓
executeTrigger({
  tenantId: 'ten_123',
  triggerType: 'sms.received.v1',
  payload: { from, body, contactId, ... }
})
  ↓
Query Firestore:
  triggerType = 'sms.received.v1'
  enabled = true
  → Found 1 subscription
  ↓
Evaluate conditions:
  No conditions → Match all
  ↓
Read workflow:
  workflowId = 'wf_123'
  → productionWebhookUrl = 'https://n8n.../webhook/abc123'
  ↓
POST to webhook:
  URL: https://n8n.../webhook/abc123
  Body: { from, body, contactId, ... }
  ↓
n8n workflow executes
  - Trigger node receives payload
  - Subsequent nodes execute
  - Workflow completes
```

---

## Testing the Complete Flow

### Manual End-to-End Test

**1. Create workflow:**

```bash
curl -X POST http://localhost:8000/api/workflows \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "workflowName": "SMS Auto-Responder Test",
    "nodes": [
      {
        "id": "trigger",
        "type": "smsReceivedTrigger",
        "position": [100, 200],
        "parameters": {}
      },
      {
        "id": "sendSms",
        "type": "sendSmsTwilio",
        "position": [400, 200],
        "parameters": {
          "to": "{{ $node.trigger.json.from }}",
          "body": "Test auto-response"
        }
      }
    ],
    "connections": {
      "trigger": {
        "main": [[{ "node": "sendSms", "type": "main", "index": 0 }]]
      }
    }
  }'
```

**Response:** workflowId + subscription auto-created.

---

**2. Verify subscription:**

```bash
curl -X GET "http://localhost:8000/api/workflows/trigger-subscriptions?workflowId=wf_abc123" \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "subscriptions": [
    {
      "id": "sub_xyz",
      "workflowId": "wf_abc123",
      "triggerType": "sms.received.v1",
      "enabled": true
    }
  ],
  "count": 1
}
```

---

**3. Simulate SMS:**

```bash
curl -X POST http://localhost:8000/api/inbound/sms \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "From=%2B15551234567&To=%2B15559999999&Body=Test%20message&MessageSid=SM123456789&NumMedia=0"
```

**Response:** `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`

---

**4. Check n8n execution:**

```bash
curl -X GET "https://n8n.example.com/api/executions?workflowId=123" \
  -H "Authorization: Bearer $N8N_API_KEY"
```

**Response:** Execution with SMS data.

---

**5. Verify SMS sent:**

Check Twilio logs or database for outbound SMS to +15551234567.

---

## Key Takeaways

**1. Auto-Creation Flow**
- Trigger node config links to event registry via `triggerType`
- Backend detects trigger node on workflow save
- Subscription created automatically (1:1 relationship)

**2. Execution Pattern**
- Event occurs → Handler calls `executeTrigger()`
- Query subscriptions → Evaluate conditions → POST to webhook
- n8n workflow executes from webhook

**3. Condition Filtering**
- Subscriptions can filter by payload fields
- MongoDB-style operators ($eq, $gt, $in, $contains, etc.)
- No conditions = match all events

**4. Integration Points**
- SMS: `newRequestHandler.ts:214-226`
- Phone: `handlePostCall.ts`
- Calendar: `notifySubscriptionService.ts`

---

## Related Docs

- [event-registration.md](../patterns/event-registration.md) - Register new event types
- [subscription-lifecycle.md](../patterns/subscription-lifecycle.md) - Subscription CRUD
- [conditional-filtering.md](../patterns/conditional-filtering.md) - Condition operators
- [testing-triggers.md](../helpers/testing-triggers.md) - Testing guide
