# Trigger Subscription System

> **Complete guide** to the system that connects events to workflow executions

---

## 📋 Overview

The Trigger Subscription System enables workflows to automatically execute when system events occur (SMS received, calls completed, calendar milestones).

### Key Features

- ✅ **Event Registry** - Central definition of all event types with schemas
- ✅ **Auto-Creation** - Subscriptions created automatically when trigger nodes added to workflows
- ✅ **Conditional Filtering** - MongoDB-style operators filter events before execution
- ✅ **Two Patterns** - Webhook (standard) and ResumeUrl (wait nodes)
- ✅ **1:1 Relationship** - One subscription per workflow (simplified architecture)

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                   TRIGGER SUBSCRIPTION FLOW                     │
└─────────────────────────────────────────────────────────────────┘

1. EVENT OCCURS
   SMS received, call completed, calendar milestone, etc.
   ↓
2. EVENT HANDLER CALLS executeTrigger()
   executeTrigger({
     tenantId: "ten_123",
     triggerType: "sms.received.v1",
     payload: { from: "+1555", body: "...", ... }
   })
   ↓
3. VALIDATE PAYLOAD
   Check against TriggerDestinationRegistry schema
   ↓
4. QUERY ACTIVE SUBSCRIPTIONS
   Firestore query: triggerType + enabled + tenant
   ↓
5. EVALUATE CONDITIONS
   Filter subscriptions by payload conditions
   Example: { "mediaCount": { "$eq": 0 } }
   ↓
6. EXECUTE EACH SUBSCRIPTION

   IF webhook pattern (standard):
     → Read workflow document
     → Get production webhook URL
     → POST payload to webhook

   IF resumeUrl pattern (wait nodes):
     → Query waitExecutions
     → Get resumeUrl for this workflow/event
     → POST payload to resumeUrl
     → Mark execution as resumed
   ↓
7. RETURN RESULTS
   { subscriptionsFound: 2, completed: 2, failed: 0 }
```

---

## 🎯 Core Concepts

### 1. Trigger Destination Registry

**Central registry** of all event types.

**File:** `triggerSubscriptions/services/TriggerDesitinationRegistry/index.ts:23-28`

```typescript
const eventRegistry: Record<string, TriggerEventDefinition> = {
  'sms.received.v1': smsReceivedV1,
  'phone.call.completed.v1': phoneCallCompletedV1,
  'event.lifecycle.milestone.v1': eventLifecycleMilestoneV1,
  'event.lifecycle.milestone.wait.v1': eventLifecycleMilestoneWaitV1,
};
```

**Event Definition Structure:**

```typescript
interface TriggerEventDefinition {
  type: string;                    // "sms.received.v1"
  version: number;
  displayName: string;
  description: string;
  category: 'communication' | 'contact' | 'opportunity' | 'system' | 'calendar';

  payloadSchema: {
    type: 'object';
    properties: Record<string, any>;
    required: string[];
  };

  examplePayload: Record<string, any>;

  filterableFields: Array<{
    field: string;
    type: 'string' | 'number' | 'boolean' | 'array';
    description: string;
  }>;

  isStable: boolean;
  deprecatedAt?: string;
  replacedBy?: string;

  metadata?: {
    usesResumeUrl?: boolean;       // Wait node pattern
    requiresEventId?: boolean;
    pausesWorkflow?: boolean;
    [key: string]: any;
  };
}
```

---

### 2. Trigger Subscription

**1:1 Relationship** - Each workflow has exactly one subscription.

**Firestore Path:**
```
/tenants/{tenantId}/workflows/main/triggerSubscriptions/{subscriptionId}
```

**Structure:**

```typescript
interface TriggerSubscription {
  id: string;                      // ULID
  tenantId: string;
  workflowId: string;              // 1:1 - one subscription per workflow

  triggerType: string;             // "sms.received.v1"
  enabled: boolean;                // Active/inactive toggle

  conditions?: {
    payload?: {
      "field": { "$operator": value }
    }
  };

  priority?: number;               // Default: 100
  rateLimit?: {
    perMinute?: number;
    burst?: number;
  };

  version: number;                 // Optimistic locking
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

---

### 3. Auto-Creation from Trigger Nodes

When user adds trigger node to workflow, subscription auto-created.

**Node Config:**

```typescript
// smsReceivedTrigger.config.ts
_pulseline: {
  isTrigger: true,
  triggerType: 'sms.received.v1',  // ← Links to registry
  transformationMethod: 'trigger_webhook'
}
```

**On workflow save:** Backend creates subscription:

```typescript
createSubscription(tenantId, {
  workflowId: workflow.id,
  triggerType: 'sms.received.v1',
  enabled: true
});
```

---

### 4. Conditional Filtering

**MongoDB-style operators:**

```typescript
conditions: {
  payload: {
    // Equality
    "from": { "$eq": "+15551234567" },

    // Greater than
    "mediaCount": { "$gt": 0 },

    // In array
    "milestone": { "$in": ["1_hour_before", "15_min_before"] },

    // Contains (case-insensitive)
    "body": { "$contains": "urgent" },

    // Exists
    "eventId": { "$exists": true }
  }
}
```

**Supported Operators:**

| Operator | Description | Example |
|----------|-------------|---------|
| `$eq` | Equals | `{ "status": { "$eq": "active" } }` |
| `$ne` | Not equals | `{ "status": { "$ne": "archived" } }` |
| `$in` | In array | `{ "tag": { "$in": ["vip", "urgent"] } }` |
| `$nin` | Not in array | `{ "type": { "$nin": ["spam"] } }` |
| `$gt` | Greater than | `{ "count": { "$gt": 5 } }` |
| `$gte` | Greater or equal | `{ "score": { "$gte": 80 } }` |
| `$lt` | Less than | `{ "age": { "$lt": 18 } }` |
| `$lte` | Less or equal | `{ "price": { "$lte": 100 } }` |
| `$contains` | String contains | `{ "body": { "$contains": "hello" } }` |
| `$exists` | Field exists | `{ "email": { "$exists": true } }` |

---

### 5. Execution Patterns

**Pattern A: Webhook (Standard Triggers)**

**Used by:** SMS, Phone, Calendar events

**Flow:**
1. Event occurs → `executeTrigger()` called
2. Query active subscriptions
3. Read workflow document → Get `productionWebhookUrl`
4. POST payload to webhook
5. n8n executes workflow

**Example:**
```typescript
// In SMS handler
await executeTrigger({
  tenantId: 'ten_123',
  triggerType: 'sms.received.v1',
  payload: {
    from: '+15551234567',
    body: 'Hello',
    contactId: 'con_456'
  }
});

// Execution engine:
// 1. Find subscriptions for sms.received.v1
// 2. For each subscription:
//    - Read workflow
//    - POST to workflow.productionWebhookUrl
```

---

**Pattern B: ResumeUrl (Wait Nodes)**

**Used by:** Wait node milestone triggers

**Flow:**
1. Workflow hits wait node → Saves `waitExecution` with resumeUrl
2. Event occurs (e.g., calendar milestone) → `executeTrigger()` called
3. Query active subscriptions
4. Query `waitExecutions` → Get resumeUrl for this workflow/event
5. POST payload to resumeUrl (specific to paused execution)
6. Mark execution as resumed
7. Workflow continues from wait node

**Metadata Flag:**
```typescript
metadata: {
  usesResumeUrl: true  // ← Triggers resumeUrl pattern
}
```

**Example:**
```typescript
// Wait node creates execution
waitExecution: {
  workflowId: 'wf_123',
  executionId: 'exec_789',
  milestone: '1_hour_before',
  eventId: 'evt_456',
  resumeUrl: 'https://n8n.../webhook/resume-xyz',
  status: 'waiting'
}

// Later, event occurs
await executeTrigger({
  tenantId: 'ten_123',
  triggerType: 'event.lifecycle.milestone.wait.v1',
  payload: {
    milestone: '1_hour_before',
    eventId: 'evt_456'
  }
});

// Execution engine:
// 1. Detect usesResumeUrl: true
// 2. Query waitExecutions for milestone + eventId
// 3. POST to resumeUrl (specific execution)
// 4. Mark execution.status = 'resumed'
```

---

## 🔧 API Reference

### Execute Trigger

**Main entry point for event handlers.**

**File:** `triggerExecutions.ts:63-281`

```typescript
export async function executeTrigger(
  input: TriggerExecutionInput
): Promise<TriggerExecutionResult>

interface TriggerExecutionInput {
  tenantId: string;
  triggerType: string;
  payload: Record<string, any>;
}

interface TriggerExecutionResult {
  success: boolean;
  message: string;
  subscriptionsFound: number;
  executionResults: Array<{
    subscriptionId: string;
    workflowId: string;
    success: boolean;
    error?: string;
  }>;
  summary: {
    total: number;
    completed: number;
    failed: number;
  };
}
```

**Usage:**

```typescript
import { executeTrigger } from './triggerExecutions';

const result = await executeTrigger({
  tenantId: 'ten_123',
  triggerType: 'sms.received.v1',
  payload: {
    from: '+15551234567',
    body: 'Hello',
    // ... full payload
  }
});

console.log(`Executed ${result.summary.completed}/${result.subscriptionsFound} subscriptions`);
```

---

### Create Subscription

**File:** `triggerSubscriptionManager/createSubscription.ts:18-96`

```typescript
export async function createSubscription(
  tenantId: string,
  input: CreateSubscriptionInput
): Promise<TriggerSubscription>
```

**Validation:**
- ✅ tenantId required
- ✅ workflowId required and must exist
- ✅ triggerType required and must be valid (not deprecated)
- ✅ Workflow cannot already have subscription (1:1 check)

**Example:**

```typescript
const subscription = await createSubscription('ten_123', {
  workflowId: 'wf_abc',
  triggerType: 'sms.received.v1',
  enabled: true,
  conditions: {
    payload: {
      "mediaCount": { "$eq": 0 }
    }
  },
  priority: 100
});
```

---

### Get Subscriptions

**File:** `triggerSubscriptionManager/getSubscriptions.ts`

```typescript
export async function getSubscriptions(
  tenantId: string,
  filters?: SubscriptionFilters,
  options?: {
    includeDisabled?: boolean;
    payload?: Record<string, any>;  // For condition evaluation
    verbose?: boolean;
  }
): Promise<{
  subscriptions: TriggerSubscription[];
  count: number;
}>
```

**Filters:**
```typescript
interface SubscriptionFilters {
  triggerType?: string;
  enabled?: boolean;
  workflowId?: string;
}
```

**With condition evaluation:**

```typescript
const result = await getSubscriptions('ten_123', {
  triggerType: 'sms.received.v1',
  enabled: true
}, {
  payload: { mediaCount: 2 },  // Only return subscriptions matching this payload
  verbose: true                 // Log condition evaluation
});
```

---

### Evaluate Conditions

**File:** `triggerExecutions/utils/evaluateConditions.ts:130-152`

```typescript
export function evaluateConditions(
  conditions: Record<string, any> | undefined,
  payload: Record<string, any>
): boolean
```

**Example:**

```typescript
const match = evaluateConditions(
  { "mediaCount": { "$gt": 0 } },
  { mediaCount: 2, from: '+1555' }
);
// Returns: true (2 > 0)
```

---

## 📚 Integration Points

### 1. SMS Handler

**File:** `inboundEvents/sms/services/newRequestHandler.ts:214-226`

```typescript
// After contact resolution
const payload = {
  tenantId: processedData.tenantId,
  contactId: contact.contactId,
  messageId: processedData.messageId,
  from: processedData.from,
  to: processedData.to,
  body: processedData.body,
  mediaCount: processedData.mediaUrls.length,
  // ...
};

await executeTrigger({
  tenantId: processedData.tenantId,
  triggerType: 'sms.received.v1',
  payload
});
```

### 2. Phone Handler

**File:** `agentCommunication/phone/services/handlePostCall.ts`

```typescript
// After call completed
await executeTrigger({
  tenantId: call.tenantId,
  triggerType: 'phone.call.completed.v1',
  payload: {
    contactId: call.contactId,
    agentId: call.agentId,
    transcript: call.transcript,
    callDuration: call.duration,
    // ...
  }
});
```

### 3. Calendar Handler

**File:** `calendars/autonCalendar/services/eventLifecycleManager/notifySubscriptionService.ts`

```typescript
// When milestone reached
await executeTrigger({
  tenantId: event.tenantId,
  triggerType: 'event.lifecycle.milestone.v1',
  payload: {
    milestone: '1_hour_before',
    eventId: event.eventId,
    eventData: {
      eventName: event.eventName,
      eventType: event.eventType,
      startTime: event.startTime
    }
    // ...
  }
});
```

---

## 🧪 Testing

See **[helpers/testing-triggers.md](./helpers/testing-triggers.md)** for complete testing guide.

**Quick test:**

```bash
# Execute trigger manually
curl -X POST http://localhost:8000/api/workflows/trigger-subscriptions/execute \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "triggerType": "sms.received.v1",
    "payload": {
      "from": "+15551234567",
      "body": "Test message",
      "contactId": "con_123",
      "mediaCount": 0
    }
  }'
```

---

## 🔗 Related Documentation

- **[QUICK-REFERENCE.md](./QUICK-REFERENCE.md)** - Add new event type checklist
- **[patterns/event-registration.md](./patterns/event-registration.md)** - Event registration guide
- **[patterns/subscription-lifecycle.md](./patterns/subscription-lifecycle.md)** - Lifecycle details
- **[patterns/conditional-filtering.md](./patterns/conditional-filtering.md)** - All operators
- **[helpers/testing-triggers.md](./helpers/testing-triggers.md)** - Testing guide
- **[examples/complete-trigger-example.md](./examples/complete-trigger-example.md)** - Complete example

---

**Next:** See [QUICK-REFERENCE.md](./QUICK-REFERENCE.md) for developer quick-start guide.
