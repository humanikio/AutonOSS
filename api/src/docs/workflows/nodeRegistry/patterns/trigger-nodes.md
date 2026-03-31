# Trigger Nodes Pattern

> **Event-driven workflow triggers** - Start workflows automatically when events occur

---

## 📋 Overview

**Trigger nodes** are special nodes that:
1. **Start workflows** when specific events occur (SMS received, phone call completed, etc.)
2. **Have no inputs** (they are the first node in a workflow)
3. **Auto-create subscriptions** when workflow is saved
4. **Receive event payloads** from the trigger subscription system
5. **Transform to n8n webhook nodes** during compilation

**File Location:** `workflows/services/nodeRegistry/nodes/trigger/`

---

## 🎯 When to Use

Use trigger nodes when you need to:

✅ Start workflow on SMS received
✅ Start workflow on phone call completed
✅ Start workflow on calendar event milestone
✅ Start workflow on custom business event

❌ **DON'T use for:**
- Manual workflow starts (use webhook node)
- Actions that run in the middle of workflow
- Conditional routing

---

## 🏗️ Architecture

```
Event Occurs (SMS received)
    ↓
Backend fires event
    ↓
Trigger Subscription System
    ├─ Query active subscriptions
    ├─ Filter by conditions
    └─ POST to workflow webhook URL
        ↓
n8n Webhook Node (compiled from trigger)
    ↓
Workflow executes with event payload
```

---

## 📐 Node Structure

### Required Configuration

**File:** `smsReceivedTrigger.config.ts:30-68`

```typescript
export const smsReceivedTriggerNode: INodeTypeDescription = {
  // === BASIC INFO ===
  displayName: 'SMS Received',
  name: 'smsReceivedTrigger',
  icon: 'fa:comment-dots',
  group: ['trigger', 'communication'],
  version: 1,
  description: 'Triggers when an SMS message is received and processed',

  defaults: {
    name: 'SMS Received',
    color: '#10b981',  // Green for SMS
  },

  // === CRITICAL: Triggers have NO inputs ===
  inputs: [],  // ← Empty!
  outputs: ['main'],

  // === PULSELINE METADATA ===
  _pulseline: {
    isCustomNode: true,
    isTrigger: true,  // ← Mark as trigger
    triggerType: 'sms.received.v1',  // ← Event type from registry
    transformationMethod: 'trigger_webhook',  // ← Always use this

    // Not used for trigger nodes
    apiEndpoint: '',
    httpMethod: 'POST',
    requiresAuth: false,

    // Define payload structure (from event definition)
    successResponse: {
      fields: successResponseFields,
    },
  },

  // === PROPERTIES ===
  properties: [],  // Usually empty for triggers
};
```

---

## 🔑 Critical Fields

### 1. inputs: []
**Triggers MUST have empty inputs array**

```typescript
// ✅ CORRECT
inputs: [],

// ❌ WRONG - Triggers don't have inputs
inputs: ['main'],
```

### 2. _pulseline.isTrigger: true
**Marks node as trigger for subscription creation**

```typescript
_pulseline: {
  isTrigger: true,  // ← Frontend uses this
  triggerType: 'sms.received.v1',  // ← Links to event registry
}
```

### 3. transformationMethod: 'trigger_webhook'
**All triggers use the same transformation method**

```typescript
_pulseline: {
  transformationMethod: 'trigger_webhook',  // ← Always this
}
```

**File:** `transformationMethodRegistry/triggers/trigger_webhook.ts`

### 4. successResponse Fields
**Defines payload structure for field mapping**

```typescript
_pulseline: {
  successResponse: {
    fields: [
      { name: 'tenantId', type: 'string', description: '...', required: true },
      { name: 'contactId', type: 'string', description: '...', required: true },
      { name: 'messageId', type: 'string', description: '...' },
      { name: 'body', type: 'string', description: 'Message text' },
      // ... more fields
    ],
  },
}
```

---

## 🔗 Event Registry Integration

### Step 1: Define Event in Trigger Destination Registry

**File:** `triggerSubscriptions/services/TriggerDesitinationRegistry/records/sms.received.v1.ts`

```typescript
export const smsReceivedV1: TriggerEventDefinition = {
  type: 'sms.received.v1',
  version: 1,
  displayName: 'SMS Received',
  description: 'Triggered when an inbound SMS message is received',
  category: 'communication',

  payloadSchema: {
    type: 'object',
    properties: {
      tenantId: { type: 'string', description: 'Tenant identifier' },
      contactId: { type: 'string', description: 'Contact identifier' },
      messageId: { type: 'string', description: 'Twilio message ID' },
      from: { type: 'string', description: 'Sender phone number' },
      to: { type: 'string', description: 'Recipient phone number' },
      body: { type: 'string', description: 'Message text content' },
      timestamp: { type: 'string', description: 'ISO 8601 timestamp' },
      // ...
    },
    required: ['tenantId', 'contactId', 'messageId', 'from', 'to', 'body', 'timestamp']
  },

  filterableFields: [
    { field: 'from', type: 'string', description: 'Filter by sender phone' },
    { field: 'body', type: 'string', description: 'Filter by text content' },
  ],
};
```

### Step 2: Load Event Definition in Node Config

**File:** `smsReceivedTrigger.config.ts:13-28`

```typescript
import { TriggerDestinationRegistry } from '../../../../triggerSubscriptions/services/TriggerDesitinationRegistry/index';

// Get event definition from registry
const eventDefinition = TriggerDestinationRegistry.getEventDefinition('sms.received.v1');

if (!eventDefinition) {
  throw new Error('SMS Received event definition not found');
}

// Convert payload schema to success response fields
const successResponseFields: IResponseField[] = Object.entries(
  eventDefinition.payloadSchema.properties
).map(([name, schema]: [string, any]) => ({
  name,
  type: schema.type,
  description: schema.description,
  required: eventDefinition.payloadSchema.required?.includes(name) || false,
}));
```

---

## 🎨 Trigger Node with Parameters

Some triggers allow user configuration (filtering).

### Example: Event Lifecycle Milestone Trigger

**File:** `eventLifecycleMilestoneTrigger.config.ts:219-337`

```typescript
properties: [
  {
    displayName: 'Milestone Filter',
    name: 'milestoneFilter',
    type: 'options',
    default: 'all',
    description: 'Which event lifecycle milestone to trigger on',
    options: [
      { name: 'All Milestones', value: 'all' },
      { name: '1 Hour Before', value: '1_hour_before' },
      { name: '30 Minutes Before', value: '30_minutes_before' },
      { name: 'Event Completed', value: 'event_completed' },
      // ... more options
    ]
  },
  {
    displayName: 'Event Type Filter',
    name: 'eventTypeFilter',
    type: 'options',
    default: 'all',
    description: 'Filter by specific event types',
    options: [
      { name: 'All Event Types', value: 'all' },
      { name: 'Meeting', value: 'meeting' },
      { name: 'Call', value: 'call' },
      { name: 'Appointment', value: 'appointment' },
      // ...
    ]
  }
]
```

**How filtering works:**
- User selects filter values in frontend
- Values saved to workflow
- Subscription system uses values to filter events
- Only matching events trigger workflow

---

## 🔄 Complete Lifecycle

### 1. User Adds Trigger Node to Workflow

```typescript
// Frontend adds node to ReactFlow
const triggerNode = {
  id: 'trigger-1',
  type: 'smsReceivedTrigger',
  position: [100, 100],
  data: {
    parameters: {}
  }
};
```

### 2. User Saves Workflow

```typescript
// Frontend detects trigger node
const config = NodeRegistry.getNodeConfig('smsReceivedTrigger');

if (config._pulseline?.isTrigger) {
  // Create subscription
  await createSubscription({
    tenantId: user.tenantId,
    workflowId: workflow.id,
    triggerType: config._pulseline.triggerType,  // 'sms.received.v1'
    webhookUrl: productionWebhookUrl,  // n8n webhook URL
    filters: node.data.parameters,  // Any filter params
  });
}
```

### 3. Workflow Transforms to n8n

**File:** `transformationMethodRegistry/triggers/trigger_webhook.ts`

```typescript
// Trigger node transforms to n8n webhook
const webhookNode = {
  id: 'trigger-1',
  name: 'trigger-1',
  type: 'n8n-nodes-base.webhook',
  typeVersion: 1,
  parameters: {
    httpMethod: 'POST',
    path: 'webhook-abc123',  // Unique path
    responseMode: 'onReceived',
  },
};
```

### 4. Event Occurs (SMS Received)

```typescript
// Backend receives SMS via Twilio
// Creates event payload
const payload = {
  tenantId: 'ten_123',
  contactId: 'con_456',
  messageId: 'SM789',
  from: '+15551234567',
  to: '+15559876543',
  body: 'Hello!',
  timestamp: '2025-01-18T10:00:00Z',
};

// Trigger execution system fires
await executeTrigger({
  tenantId: 'ten_123',
  triggerType: 'sms.received.v1',
  payload,
});
```

### 5. Subscription System Executes

```typescript
// Query subscriptions
const subscriptions = await getSubscriptions({
  tenantId: 'ten_123',
  triggerType: 'sms.received.v1',
});

// For each subscription
for (const sub of subscriptions) {
  // POST to workflow webhook
  await axios.post(sub.webhookUrl, payload);
}
```

### 6. Workflow Runs in n8n

```typescript
// n8n webhook receives payload
// Workflow executes with $json containing event data
{
  "tenantId": "ten_123",
  "contactId": "con_456",
  "messageId": "SM789",
  "from": "+15551234567",
  "body": "Hello!",
  // ... full payload
}
```

---

## ⚠️ Common Mistakes

### ❌ Mistake 1: Trigger with Inputs

```typescript
// ❌ WRONG - Triggers should have NO inputs
inputs: ['main'],
outputs: ['main'],
_pulseline: {
  isTrigger: true,  // Conflict!
}
```

```typescript
// ✅ CORRECT
inputs: [],  // Empty for triggers
outputs: ['main'],
_pulseline: {
  isTrigger: true,
}
```

### ❌ Mistake 2: Wrong transformationMethod

```typescript
// ❌ WRONG - Custom transformation method
_pulseline: {
  isTrigger: true,
  transformationMethod: 'sms_received',  // Wrong!
}
```

```typescript
// ✅ CORRECT - All triggers use trigger_webhook
_pulseline: {
  isTrigger: true,
  transformationMethod: 'trigger_webhook',
}
```

### ❌ Mistake 3: Event Type Not in Registry

```typescript
// ❌ WRONG - Event not defined
_pulseline: {
  triggerType: 'custom.event.v1',  // Doesn't exist in registry
}
```

```typescript
// ✅ CORRECT - Use existing event or add to registry first
_pulseline: {
  triggerType: 'sms.received.v1',  // Defined in registry
}
```

### ❌ Mistake 4: Missing successResponse

```typescript
// ❌ WRONG - No field definitions
_pulseline: {
  isTrigger: true,
  triggerType: 'sms.received.v1',
  // Missing successResponse!
}
```

```typescript
// ✅ CORRECT - Define payload structure
_pulseline: {
  isTrigger: true,
  triggerType: 'sms.received.v1',
  successResponse: {
    fields: successResponseFields,  // From event definition
  },
}
```

---

## 🧪 Testing

### Test 1: Node Appears in UI

```typescript
// Check node is registered
const triggers = NodeRegistry.getNodesByCategory('trigger');
expect(triggers.find(n => n.name === 'smsReceivedTrigger')).toBeDefined();
```

### Test 2: Event Definition Loads

```typescript
// Verify event definition exists
const eventDef = TriggerDestinationRegistry.getEventDefinition('sms.received.v1');
expect(eventDef).toBeDefined();
expect(eventDef.displayName).toBe('SMS Received');
```

### Test 3: Subscription Created

```typescript
// Add trigger to workflow
const workflow = {
  nodes: [{
    id: 'trigger-1',
    type: 'smsReceivedTrigger',
    data: { parameters: {} }
  }]
};

// Save workflow
await saveWorkflow(workflow);

// Verify subscription exists
const subscriptions = await getSubscriptions({
  tenantId,
  workflowId,
  triggerType: 'sms.received.v1'
});

expect(subscriptions.length).toBeGreaterThan(0);
```

### Test 4: Transformation Output

```typescript
// Transform trigger node
const config = NodeRegistry.getNodeConfig('smsReceivedTrigger');
const transformation = TransformationRegistry.getMethod('trigger_webhook');
const result = transformation.transform(triggerNode, config, context);

// Verify n8n webhook node created
expect(result.nodes.length).toBe(1);
expect(result.nodes[0].type).toBe('n8n-nodes-base.webhook');
expect(result.nodes[0].parameters.httpMethod).toBe('POST');
```

---

## 📊 Examples in Codebase

### 1. SMS Received Trigger
**File:** `smsReceivedTrigger.config.ts`
- Simple trigger, no parameters
- Maps SMS event payload to fields

### 2. Phone Call Completed Trigger
**File:** `phoneCallCompletedTrigger.config.ts:30-68`
- Triggers when agent call completes
- Includes transcript in payload

### 3. Event Lifecycle Milestone Trigger
**File:** `eventLifecycleMilestoneTrigger.config.ts:182-338`
- Complex trigger with filter parameters
- Milestone filter (1 hour before, event completed, etc.)
- Event type filter (meeting, call, appointment)

---

## 🔗 Related Documentation

- **Event Registry:** See trigger subscriptions docs for event definitions
- **Subscription System:** See trigger subscriptions docs for execution flow
- **Webhook Transformation:** See transformation system docs for trigger_webhook method
- **Field Mapping:** See field mapping docs for how successResponse fields are used

---

## ✅ Checklist for New Trigger Node

- [ ] Event defined in TriggerDestinationRegistry
- [ ] Event type string matches registry (e.g., 'sms.received.v1')
- [ ] inputs: [] (empty array)
- [ ] outputs: ['main']
- [ ] _pulseline.isTrigger: true
- [ ] _pulseline.triggerType set correctly
- [ ] _pulseline.transformationMethod: 'trigger_webhook'
- [ ] successResponse.fields mapped from event definition
- [ ] Node registered in index.ts
- [ ] Tested subscription creation
- [ ] Tested event triggers workflow

---

**File Locations:**
- Node Configs: `workflows/services/nodeRegistry/nodes/trigger/`
- Event Definitions: `triggerSubscriptions/services/TriggerDesitinationRegistry/records/`
- Transformation: `transformationMethodRegistry/triggers/trigger_webhook.ts`
- Subscription System: `triggerSubscriptions/services/`
