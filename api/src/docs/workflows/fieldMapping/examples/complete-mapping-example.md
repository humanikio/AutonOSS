# Complete Field Mapping Example

> **End-to-end walkthrough** - From test webhook to field insertion in production

---

## 📋 Scenario

**Goal:** Build an SMS workflow that:
1. Receives inbound SMS
2. Finds or creates contact
3. Creates opportunity
4. Sends confirmation SMS with opportunity details

**Field Mapping Needs:**
- Reference webhook payload fields (phone number, message body)
- Reference Find Contact output (contactId, name)
- Reference Create Opportunity output (opportunityId, pipelineId)

---

## 🏗️ Workflow Structure

```
┌─────────────────┐
│  SMS Received   │ (trigger-abc123)
│  Trigger        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Find Contact   │ (node-def456)
│                 │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Create         │ (node-ghi789)
│  Opportunity    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Send SMS       │ (node-jkl012)
│  Confirmation   │
└─────────────────┘
```

---

## Step 1: Setup Workflow

### Create Workflow

**Frontend:**

User creates new workflow named "SMS Lead Workflow"

**Database:**

```javascript
// Firestore: tenants/{tenantId}/workflows/{workflowId}
{
  workflowId: "wf_lead_123",
  name: "SMS Lead Workflow",
  status: "draft",
  createdAt: Timestamp,
  reactflowData: {
    nodes: [],
    edges: []
  }
}
```

### Add Trigger Node

**User action:** Drag "SMS Received" trigger to canvas

**ReactFlow state:**

```typescript
{
  nodes: [
    {
      id: 'trigger-abc123',
      type: 'smsReceivedTrigger',
      position: { x: 250, y: 50 },
      data: {
        label: 'SMS Received',
        nodeName: 'smsReceivedTrigger',
        parameters: {}
      }
    }
  ],
  edges: []
}
```

---

## Step 2: Send Test Webhook

### User Gets Test URL

**UI displays:**

```
┌────────────────────────────────────────────┐
│  SMS Received Trigger                      │
├────────────────────────────────────────────┤
│  Test URL:                                 │
│  https://n8n.pulseline.io/webhook-test/    │
│  abc-def-ghi-123                           │
│                                            │
│  [Copy URL]                                │
└────────────────────────────────────────────┘
```

### User Sends Test Webhook

```bash
curl -X POST https://n8n.pulseline.io/webhook-test/abc-def-ghi-123 \
  -H "Content-Type: application/json" \
  -d '{
    "from": "+15551234567",
    "body": "I am interested in your product",
    "messageId": "SM_abc123",
    "timestamp": "2025-01-19T10:00:00Z",
    "contact": {
      "contactId": "con_789",
      "name": "John Doe",
      "phoneNumber": "+15551234567",
      "email": "john@example.com",
      "tags": ["lead", "sms"]
    },
    "metadata": {
      "channel": "sms",
      "provider": "twilio",
      "cost": 0.0075
    }
  }'
```

### Backend Captures Payload

**n8n stores in Firestore:**

```javascript
// triggerTests/test-uuid-456
{
  payload: {
    from: "+15551234567",
    body: "I am interested in your product",
    messageId: "SM_abc123",
    timestamp: "2025-01-19T10:00:00Z",
    contact: { ... },
    metadata: { ... }
  },
  receivedAt: Timestamp(2025-01-19 10:00:00),
  testUrl: "https://n8n.pulseline.io/webhook-test/abc-def-ghi-123"
}
```

### UI Updates

**Real-time listener detects new test:**

```
┌────────────────────────────────────────────┐
│  Test Events                          [⟳]  │
├────────────────────────────────────────────┤
│  ● 10:00:00 - From +15551234567            │ ← New!
│    "I am interested in your product"       │
│                                            │
│  [Set as Field Mapping Source]             │
└────────────────────────────────────────────┘
```

---

## Step 3: Set Field Mapping

### User Selects Test Event

**User clicks:** "Set as Field Mapping Source"

**Frontend calls:**

```typescript
POST http://localhost:8000/api/workflows/wf_lead_123/set-field-mapping
Authorization: Bearer eyJ...
Content-Type: application/json

{
  "testId": "test-uuid-456"
}
```

### Backend Extracts Fields

**File:** `workflows/services/setFieldMappingReference/index.ts:25-61`

**Process:**

```typescript
// 1. Fetch test payload
const testPayload = await getTestPayloadFirestore(
  tenantId,
  workflowId,
  'test-uuid-456'
);

// 2. Extract fields
const fields = defineFieldsFromJson(testPayload.payload);

// Result: 16 fields extracted
[
  { path: 'body', displayName: 'body', type: 'string', value: 'I am interested...', ... },
  { path: 'contact', displayName: 'contact', type: 'object', ... },
  { path: 'contact.contactId', displayName: 'contactId', type: 'string', value: 'con_789', ... },
  { path: 'contact.email', displayName: 'email', type: 'string', value: 'john@example.com', ... },
  { path: 'contact.name', displayName: 'name', type: 'string', value: 'John Doe', ... },
  { path: 'contact.phoneNumber', displayName: 'phoneNumber', type: 'string', value: '+15551234567', ... },
  { path: 'contact.tags', displayName: 'tags', type: 'array', value: ['lead', 'sms'], ... },
  { path: 'contact.tags[0]', displayName: 'tags', type: 'string', value: 'lead', ... },
  { path: 'from', displayName: 'from', type: 'string', value: '+15551234567', ... },
  { path: 'messageId', displayName: 'messageId', type: 'string', value: 'SM_abc123', ... },
  { path: 'metadata', displayName: 'metadata', type: 'object', ... },
  { path: 'metadata.channel', displayName: 'channel', type: 'string', value: 'sms', ... },
  { path: 'metadata.cost', displayName: 'cost', type: 'number', value: 0.0075, ... },
  { path: 'metadata.provider', displayName: 'provider', type: 'string', value: 'twilio', ... },
  { path: 'timestamp', displayName: 'timestamp', type: 'string', value: '2025-01-19T10:00:00Z', ... },
]
```

### Backend Stores Mapping

```typescript
// 3. Store in Firestore
await setMainMapping(tenantId, workflowId, 'test-uuid-456', testPayload.payload, fields);
```

**Firestore result:**

```javascript
// triggerTests/main
{
  selectedTestId: "test-uuid-456",
  selectedPayload: { ... },
  availableFields: [ ... 16 fields ... ],
  mappingUpdatedAt: Timestamp(2025-01-19 10:00:05)
}
```

**Frontend shows success:**

```
✅ Field mapping set successfully
16 fields extracted from test payload
```

---

## Step 4: Configure Find Contact Node

### Add Node to Workflow

**User drags "Find Contact" node to canvas:**

```typescript
{
  id: 'node-def456',
  type: 'pulselineFindContact',
  position: { x: 250, y: 200 },
  data: {
    label: 'Find Contact',
    nodeName: 'pulselineFindContact',
    parameters: {}
  }
}
```

**Connect to trigger:**

```typescript
edges: [
  { source: 'trigger-abc123', target: 'node-def456' }
]
```

### Open Node Config Panel

**User clicks node → Config panel opens**

### Configure Phone Number Parameter

**Property:**

```typescript
{
  displayName: 'Phone Number',
  name: 'phoneNumber',
  type: 'string',
  required: true,
  placeholder: '+1234567890'
}
```

**User clicks ⚡ button → Field dropdown opens**

**Available fields loaded:**

```typescript
// Frontend loads from Firestore main doc
const fields = [
  {
    path: 'from',
    displayName: 'from',
    group: 'inboundWebhook',
    sourceNodeName: 'trigger-abc123',
    type: 'string',
    value: '+15551234567',
    isNested: false
  },
  {
    path: 'contact.phoneNumber',
    displayName: 'phoneNumber',
    group: 'inboundWebhook',
    sourceNodeName: 'trigger-abc123',
    type: 'string',
    value: '+15551234567',
    isNested: true
  },
  // ... more fields
];
```

**UI displays:**

```
┌────────────────────────────────────────────┐
│  📥 Webhook Payload                  [16]  │
│  ───────────────────────────────────────── │
│    from                                    │
│    from                                    │
│    string • +15551234567                   │
│                                            │
│    phoneNumber                             │
│    contact.phoneNumber                     │
│    string • +15551234567                   │
│                                            │
│    body                                    │
│    body                                    │
│    string • I am interested in your...     │
│                                            │
│    (13 more fields...)                     │
└────────────────────────────────────────────┘
```

### Insert Field

**User selects "from" field**

**Expression generated:**

```typescript
const field = {
  path: 'from',
  group: 'inboundWebhook',
  sourceNodeName: 'trigger-abc123'
};

const expression = `={{ $("trigger-abc123").item.json.body.from }}`;
```

**Inserted into input:**

```
┌────────────────────────────────────────────┐
│  Phone Number                              │
│  ┌──────────────────────────────────────┐  │
│  │ {{ $("trigger-abc123").item.json.    │  │
│  │    body.from }}                      │  │
│  └──────────────────────────────────────┘  │
└────────────────────────────────────────────┘
```

**User saves node config:**

```typescript
{
  parameters: {
    phoneNumber: '={{ $("trigger-abc123").item.json.body.from }}'
  }
}
```

---

## Step 5: Add Create Opportunity Node

### Add and Connect Node

```typescript
{
  id: 'node-ghi789',
  type: 'pulselineCreateOpportunity',
  position: { x: 250, y: 350 },
  data: {
    label: 'Create Opportunity',
    nodeName: 'pulselineCreateOpportunity',
    parameters: {}
  }
}

edges: [
  { source: 'trigger-abc123', target: 'node-def456' },
  { source: 'node-def456', target: 'node-ghi789' }
]
```

### Open Config Panel

**Frontend discovers previous nodes:**

```typescript
const previousNodes = findPreviousNodes('node-ghi789', allNodes, allEdges);
// Returns: ['trigger-abc123', 'node-def456']
```

**Frontend loads node configs:**

```typescript
// For node-def456 (Find Contact)
const config = await nodeRegistryApi.getNodeConfig('pulselineFindContact');

// Extract successResponse fields
const fields = config.data._pulseline.successResponse.fields;
// Returns:
[
  { name: 'contactId', type: 'string', required: true },
  { name: 'name', type: 'string' },
  { name: 'phoneNumber', type: 'string' },
  { name: 'email', type: 'string' },
  { name: 'tags', type: 'array' }
]
```

**Frontend creates field definitions:**

```typescript
const nodeOutputFields = fields.map(field => ({
  path: field.name,
  displayName: field.name,
  group: 'Find Contact',              // Node label
  sourceNodeName: 'node-def456',      // Node ID
  type: field.type,
  value: null,
  isNested: false
}));
```

**Merged with webhook fields:**

```typescript
setAvailableFields([...webhookFields, ...nodeOutputFields]);
// Total: 16 webhook fields + 5 node output fields = 21 fields
```

### Configure Contact ID Parameter

**User clicks ⚡ button**

**Field dropdown shows:**

```
┌────────────────────────────────────────────┐
│  📥 Webhook Payload                  [16]  │
│  ───────────────────────────────────────── │
│  (webhook fields...)                       │
└────────────────────────────────────────────┘

┌────────────────────────────────────────────┐
│  🔍 Find Contact                      [5]  │ ← New!
│  ───────────────────────────────────────── │
│    contactId                               │
│    contactId                               │
│    string                                  │
│                                            │
│    email                                   │
│    email                                   │
│    string                                  │
│                                            │
│    name                                    │
│    name                                    │
│    string                                  │
│                                            │
│    phoneNumber                             │
│    phoneNumber                             │
│    string                                  │
│                                            │
│    tags                                    │
│    tags                                    │
│    array                                   │
└────────────────────────────────────────────┘
```

**User selects "contactId" from Find Contact group**

**Expression generated:**

```typescript
const field = {
  path: 'contactId',
  group: 'Find Contact',
  sourceNodeName: 'node-def456'
};

// ✅ No .body for node output
const expression = `={{ $("node-def456").item.json.contactId }}`;
```

**Inserted:**

```
┌────────────────────────────────────────────┐
│  Contact ID                                │
│  ┌──────────────────────────────────────┐  │
│  │ {{ $("node-def456").item.json.       │  │
│  │    contactId }}                      │  │
│  └──────────────────────────────────────┘  │
└────────────────────────────────────────────┘
```

**User configures other fields:**

```typescript
{
  parameters: {
    contactId: '={{ $("node-def456").item.json.contactId }}',
    name: '={{ $("node-def456").item.json.name }}',
    pipelineId: 'pipe_123',  // Static value
    value: 5000               // Static value
  }
}
```

---

## Step 6: Add Send SMS Confirmation Node

### Add and Connect

```typescript
{
  id: 'node-jkl012',
  type: 'sendSms',
  position: { x: 250, y: 500 },
  data: {
    label: 'Send SMS Confirmation',
    nodeName: 'sendSms',
    parameters: {}
  }
}

edges: [
  // ... previous edges
  { source: 'node-ghi789', target: 'node-jkl012' }
]
```

### Open Config Panel

**Previous nodes discovered:**

```typescript
findPreviousNodes('node-jkl012', allNodes, allEdges);
// Returns: ['trigger-abc123', 'node-def456', 'node-ghi789']
```

**Load all node configs:**

```typescript
// Find Contact fields (5)
// Create Opportunity fields (7)
successResponse: {
  fields: [
    { name: 'opportunityId', type: 'string', required: true },
    { name: 'name', type: 'string' },
    { name: 'pipelineId', type: 'string' },
    { name: 'stageId', type: 'string' },
    { name: 'contactId', type: 'string' },
    { name: 'value', type: 'number' },
    { name: 'createdAt', type: 'string' }
  ]
}
```

**All available fields:**

```
16 webhook fields +
5 Find Contact fields +
7 Create Opportunity fields =
28 total fields
```

### Configure Message Parameter

**Property:**

```typescript
{
  displayName: 'Message',
  name: 'message',
  type: 'string',
  typeOptions: { rows: 3 },
  required: true
}
```

**User builds message with multiple fields:**

```
Step 1: Type text
"Hi "

Step 2: Insert "name" from Find Contact
"Hi {{ $("node-def456").item.json.name }}"

Step 3: Type more text
"Hi {{ $("node-def456").item.json.name }}, thanks for reaching out! "

Step 4: Insert "opportunityId" from Create Opportunity
"Hi {{ $("node-def456").item.json.name }}, thanks for reaching out! We've created opportunity {{ $("node-ghi789").item.json.opportunityId }} for you. "

Step 5: Type closing
"Hi {{ $("node-def456").item.json.name }}, thanks for reaching out! We've created opportunity {{ $("node-ghi789").item.json.opportunityId }} for you. We'll be in touch soon!"
```

**Configure phone number:**

```typescript
{
  parameters: {
    phoneNumber: '={{ $("trigger-abc123").item.json.body.from }}',
    message: 'Hi {{ $("node-def456").item.json.name }}, thanks for reaching out! We\'ve created opportunity {{ $("node-ghi789").item.json.opportunityId }} for you. We\'ll be in touch soon!'
  }
}
```

---

## Step 7: Deploy to Production

### User Clicks "Deploy"

**Frontend calls:**

```typescript
POST http://localhost:8000/api/workflows/wf_lead_123/deploy
```

### Backend Transformation

**Each node transformed:**

**1. SMS Trigger → n8n Webhook**

```typescript
{
  type: 'n8n-nodes-base.webhook',
  parameters: {
    path: 'sms-received-wf-lead-123',
    // ...
  }
}
```

**2. Find Contact → HTTP Request**

```typescript
{
  type: 'n8n-nodes-base.httpRequest',
  parameters: {
    method: 'POST',
    url: 'https://backend.pulseline.io/api/contacts/find',
    bodyParameters: {
      parameters: [
        {
          name: 'phoneNumber',
          value: '={{ $("trigger-abc123").item.json.body.from }}'
        }
      ]
    },
    // ... auth headers
  }
}
```

**3. Create Opportunity → HTTP Request**

```typescript
{
  type: 'n8n-nodes-base.httpRequest',
  parameters: {
    method: 'POST',
    url: 'https://backend.pulseline.io/api/opportunities',
    bodyParameters: {
      parameters: [
        {
          name: 'contactId',
          value: '={{ $("node-def456").item.json.contactId }}'
        },
        {
          name: 'name',
          value: '={{ $("node-def456").item.json.name }}'
        },
        {
          name: 'pipelineId',
          value: 'pipe_123'
        },
        {
          name: 'value',
          value: '5000'
        }
      ]
    }
  }
}
```

**4. Send SMS → HTTP Request**

```typescript
{
  type: 'n8n-nodes-base.httpRequest',
  parameters: {
    method: 'POST',
    url: 'https://backend.pulseline.io/api/sms/send',
    bodyParameters: {
      parameters: [
        {
          name: 'phoneNumber',
          value: '={{ $("trigger-abc123").item.json.body.from }}'
        },
        {
          name: 'message',
          value: 'Hi {{ $("node-def456").item.json.name }}, thanks for reaching out! We\'ve created opportunity {{ $("node-ghi789").item.json.opportunityId }} for you. We\'ll be in touch soon!'
        }
      ]
    }
  }
}
```

### Deployed to n8n

**Workflow activated with production webhook URL**

---

## Step 8: Runtime Execution

### Inbound SMS Received

**Payload:**

```json
{
  "from": "+15551234567",
  "body": "I want to learn more about your services",
  "messageId": "SM_xyz789",
  "contact": {
    "contactId": "con_456",
    "name": "Jane Smith",
    "phoneNumber": "+15551234567",
    "email": "jane@example.com"
  }
}
```

### n8n Processes Workflow

**Node 1: Webhook Trigger**

```javascript
// Webhook node output
{
  json: {
    body: {
      from: "+15551234567",
      body: "I want to learn more about your services",
      contact: {
        contactId: "con_456",
        name: "Jane Smith",
        // ...
      }
    }
  }
}
```

**Node 2: Find Contact**

```javascript
// Expression evaluated
$("trigger-abc123").item.json.body.from
// Resolves to: "+15551234567"

// HTTP Request sent
POST /api/contacts/find
{ phoneNumber: "+15551234567" }

// Response
{
  contactId: "con_456",
  name: "Jane Smith",
  phoneNumber: "+15551234567",
  email: "jane@example.com",
  tags: ["customer", "sms"]
}

// Node output
{
  json: {
    contactId: "con_456",
    name: "Jane Smith",
    phoneNumber: "+15551234567",
    email: "jane@example.com",
    tags: ["customer", "sms"]
  }
}
```

**Node 3: Create Opportunity**

```javascript
// Expressions evaluated
$("node-def456").item.json.contactId  // → "con_456"
$("node-def456").item.json.name       // → "Jane Smith"

// HTTP Request sent
POST /api/opportunities
{
  contactId: "con_456",
  name: "Jane Smith",
  pipelineId: "pipe_123",
  value: 5000
}

// Response
{
  opportunityId: "opp_789",
  name: "Jane Smith",
  pipelineId: "pipe_123",
  stageId: "stage_001",
  contactId: "con_456",
  value: 5000,
  createdAt: "2025-01-19T14:30:00Z"
}

// Node output
{
  json: {
    opportunityId: "opp_789",
    name: "Jane Smith",
    // ...
  }
}
```

**Node 4: Send SMS**

```javascript
// Expressions evaluated
$("trigger-abc123").item.json.body.from           // → "+15551234567"
$("node-def456").item.json.name                   // → "Jane Smith"
$("node-ghi789").item.json.opportunityId          // → "opp_789"

// Message composed
"Hi Jane Smith, thanks for reaching out! We've created opportunity opp_789 for you. We'll be in touch soon!"

// HTTP Request sent
POST /api/sms/send
{
  phoneNumber: "+15551234567",
  message: "Hi Jane Smith, thanks for reaching out! We've created opportunity opp_789 for you. We'll be in touch soon!"
}

// SMS sent successfully!
```

---

## 🎯 Complete Data Flow Summary

```
1. TEST WEBHOOK
   User sends: { from: "+1555", body: "...", contact: {...} }
   ↓
2. CAPTURE & EXTRACT
   Backend extracts 16 fields from payload
   ↓
3. STORE MAPPING
   Firestore: triggerTests/main.availableFields = [16 fields]
   ↓
4. BUILD WORKFLOW
   User adds nodes: Find Contact → Create Opportunity → Send SMS
   ↓
5. CONFIGURE NODES
   User selects fields from dropdown:
   • Webhook fields (16) - with .body
   • Find Contact outputs (5) - no .body
   • Create Opportunity outputs (7) - no .body
   ↓
6. DEPLOY
   Transform to n8n with expressions:
   • {{ $("trigger").item.json.body.from }}
   • {{ $("node-456").item.json.contactId }}
   • {{ $("node-789").item.json.opportunityId }}
   ↓
7. RUNTIME
   Real SMS triggers workflow
   n8n evaluates all expressions
   ↓
8. SUCCESS
   Contact found, opportunity created, SMS sent!
```

---

## ✅ Key Takeaways

### 1. Two Field Sources

- **Webhook fields:** From test payload, stored in Firestore, need `.body`
- **Node outputs:** From successResponse, discovered via graph traversal, no `.body`

### 2. Expression Formats

```javascript
// Webhook
{{ $("trigger-123").item.json.body.fieldPath }}

// Node output
{{ $("node-456").item.json.fieldPath }}
```

### 3. Dynamic Field Discovery

- Graph traversal finds all previous nodes
- Load node configs to get successResponse
- Create field definitions grouped by node
- Total fields = webhook fields + all previous node fields

### 4. Multiple Field References

- Single input can have multiple field expressions
- Mix webhook fields, node outputs, and static text
- All expressions evaluated at runtime

### 5. End-to-End Flow

Test → Extract → Store → Build → Configure → Deploy → Execute

---

## 🔗 Related Documentation

- **[../README.md](../README.md)** - Complete system overview
- **[../QUICK-REFERENCE.md](../QUICK-REFERENCE.md)** - Code templates
- **[../patterns/webhook-fields.md](../patterns/webhook-fields.md)** - Webhook field extraction
- **[../patterns/node-output-fields.md](../patterns/node-output-fields.md)** - Node output discovery
- **[../helpers/expression-builder.md](../helpers/expression-builder.md)** - Expression formats
- **[../../nodeRegistry/examples/complete-node-example.md](../../nodeRegistry/examples/complete-node-example.md)** - Node lifecycle

---

**This example demonstrates the complete power of the field mapping system: automatic field discovery, intelligent expression generation, and seamless runtime evaluation.**
