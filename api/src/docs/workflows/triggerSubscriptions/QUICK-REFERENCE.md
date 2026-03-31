# Trigger Subscriptions - Quick Reference

> **Developer quick-start** with checklists, templates, and operator reference

---

## 📋 Quick Navigation

- [Add New Event Type Checklist](#add-new-event-type-checklist)
- [Event Definition Template](#event-definition-template)
- [Condition Operators Reference](#condition-operators-reference)
- [Integration Points](#integration-points)
- [Common Patterns](#common-patterns)
- [Testing Checklist](#testing-checklist)

---

## ✅ Add New Event Type Checklist

**Use this when adding a new trigger event (e.g., "email.received.v1")**

### Step 1: Create Event Definition

**File:** `triggerSubscriptions/services/TriggerDesitinationRegistry/records/your.event.type.v1.ts`

```typescript
import { TriggerEventDefinition } from '../../../types';

export const yourEventTypeV1: TriggerEventDefinition = {
  type: 'your.event.type.v1',
  version: 1,
  displayName: 'Your Event Name',
  description: 'Triggered when...',
  category: 'communication', // or contact, opportunity, system, calendar

  payloadSchema: {
    type: 'object',
    properties: {
      tenantId: { type: 'string' },
      // Add all payload fields
    },
    required: ['tenantId'] // List required fields
  },

  examplePayload: {
    tenantId: 'ten_123',
    // Provide example values
  },

  filterableFields: [
    { field: 'fieldName', type: 'string', description: 'Filter by...' }
  ],

  isStable: true,

  metadata: {
    usesResumeUrl: false, // true for wait nodes
    // Add custom metadata if needed
  }
};
```

### Step 2: Register in Registry

**File:** `TriggerDesitinationRegistry/index.ts`

```typescript
// Import
import { yourEventTypeV1 } from './records/your.event.type.v1';

// Add to registry
const eventRegistry: Record<string, TriggerEventDefinition> = {
  'sms.received.v1': smsReceivedV1,
  'your.event.type.v1': yourEventTypeV1, // ← Add here
};
```

### Step 3: Create Trigger Node Config (Optional)

**File:** `nodeRegistry/nodes/trigger/yourEventTrigger.config.ts`

```typescript
export const yourEventTriggerNode: INodeTypeDescription = {
  displayName: 'Your Event Trigger',
  name: 'yourEventTrigger',
  inputs: [],
  outputs: ['main'],

  _pulseline: {
    isTrigger: true,
    triggerType: 'your.event.type.v1', // ← Links to registry
    transformationMethod: 'trigger_webhook'
  },

  properties: [
    // Add any filterable properties
  ]
};
```

### Step 4: Register Node

**File:** `nodeRegistry/index.ts`

```typescript
import { yourEventTriggerNode } from './nodes/trigger/yourEventTrigger.config';

const nodeConfigs: Record<string, INodeTypeDescription> = {
  yourEventTrigger: yourEventTriggerNode,
  // ...
};
```

### Step 5: Add Integration Point

**In your event handler:**

```typescript
import { executeTrigger } from 'workflows/triggerSubscriptions/services/triggerExecutions';

// When event occurs
await executeTrigger({
  tenantId: yourTenantId,
  triggerType: 'your.event.type.v1',
  payload: {
    tenantId: yourTenantId,
    // All fields from payloadSchema
  }
});
```

### Step 6: Test

```bash
# Test event definition
curl http://localhost:8000/api/workflows/trigger-subscriptions/event-types | \
  jq '.[] | select(.type=="your.event.type.v1")'

# Create test subscription
curl -X POST http://localhost:8000/api/workflows/trigger-subscriptions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "workflowId": "wf_test",
    "triggerType": "your.event.type.v1",
    "enabled": true
  }'

# Test execution
curl -X POST http://localhost:8000/api/workflows/trigger-subscriptions/execute \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "triggerType": "your.event.type.v1",
    "payload": { /* your test payload */ }
  }'
```

---

## 📝 Event Definition Template

```typescript
import { TriggerEventDefinition } from '../../../types';

export const eventNameV1: TriggerEventDefinition = {
  // === IDENTITY ===
  type: 'category.action.v1',        // Naming: category.action.version
  version: 1,
  displayName: 'Human Readable Name',
  description: 'Triggered when X happens. Available after Y completes.',
  category: 'communication',          // communication | contact | opportunity | system | calendar

  // === PAYLOAD SCHEMA ===
  payloadSchema: {
    type: 'object',
    properties: {
      // REQUIRED: Always include
      tenantId: { type: 'string', description: 'Tenant identifier' },

      // REQUIRED: Usually include
      contactId: { type: 'string', description: 'Contact identifier' },

      // Add your specific fields
      yourField: { type: 'string', description: 'Description' },
      count: { type: 'number', description: 'Numeric field' },
      active: { type: 'boolean', description: 'Boolean field' },
      tags: { type: 'array', items: { type: 'string' }, description: 'Array field' },

      // Nested objects
      metadata: {
        type: 'object',
        properties: {
          key: { type: 'string' }
        }
      }
    },
    required: ['tenantId', 'yourField'] // List all required fields
  },

  // === EXAMPLE PAYLOAD ===
  examplePayload: {
    tenantId: 'ten_abc123',
    contactId: 'con_def456',
    yourField: 'example value',
    count: 5,
    active: true,
    tags: ['tag1', 'tag2'],
    metadata: {
      key: 'value'
    }
  },

  // === FILTERABLE FIELDS ===
  filterableFields: [
    { field: 'yourField', type: 'string', description: 'Filter by your field' },
    { field: 'count', type: 'number', description: 'Filter by count' },
    { field: 'active', type: 'boolean', description: 'Filter by active status' },
    { field: 'tags', type: 'array', description: 'Filter by tags' },
    { field: 'metadata.key', type: 'string', description: 'Filter by nested field' }
  ],

  // === STATUS ===
  isStable: true,                     // false = experimental, true = production-ready

  // If deprecating:
  // deprecatedAt: '2025-06-01',
  // replacedBy: 'new.event.type.v2',

  // === METADATA (Optional) ===
  metadata: {
    usesResumeUrl: false,             // true for wait nodes only
    requiresEventId: false,           // true if needs eventId in payload
    pausesWorkflow: false,            // true if pauses until triggered
    // Add custom metadata as needed
  }
};
```

---

## 🔍 Condition Operators Reference

### Equality Operators

**$eq** - Equals
```typescript
{ "status": { "$eq": "active" } }
// Matches: status === "active"
```

**$ne** - Not equals
```typescript
{ "status": { "$ne": "archived" } }
// Matches: status !== "archived"
```

### Array Operators

**$in** - Value in array
```typescript
{ "tag": { "$in": ["vip", "urgent", "priority"] } }
// Matches: tag is one of ["vip", "urgent", "priority"]
```

**$nin** - Value not in array
```typescript
{ "category": { "$nin": ["spam", "test"] } }
// Matches: category is NOT one of ["spam", "test"]
```

### Comparison Operators (Numbers)

**$gt** - Greater than
```typescript
{ "mediaCount": { "$gt": 0 } }
// Matches: mediaCount > 0
```

**$gte** - Greater than or equal
```typescript
{ "score": { "$gte": 80 } }
// Matches: score >= 80
```

**$lt** - Less than
```typescript
{ "age": { "$lt": 18 } }
// Matches: age < 18
```

**$lte** - Less than or equal
```typescript
{ "price": { "$lte": 100 } }
// Matches: price <= 100
```

### String Operators

**$contains** - String contains (case-insensitive)
```typescript
{ "body": { "$contains": "urgent" } }
// Matches: body.toLowerCase().includes("urgent")
```

### Existence Operator

**$exists** - Field exists
```typescript
{ "email": { "$exists": true } }
// Matches: email field is present and not null

{ "optionalField": { "$exists": false } }
// Matches: optionalField is undefined or null
```

### Nested Field Access

Use dot notation:
```typescript
{
  "eventData.eventType": { "$eq": "meeting" },
  "contact.tags": { "$in": ["vip"] },
  "metadata.source": { "$contains": "website" }
}
```

### Multiple Conditions (AND logic)

All conditions must match:
```typescript
{
  "mediaCount": { "$gt": 0 },
  "from": { "$eq": "+15551234567" },
  "body": { "$contains": "urgent" }
}
// Matches: Has media AND from specific number AND body contains "urgent"
```

---

## 🔌 Integration Points

### Where to Call executeTrigger()

**Pattern:** Call `executeTrigger()` when your event occurs.

**SMS Example:**

**File:** `inboundEvents/sms/services/newRequestHandler.ts:214-226`

```typescript
// After contact resolution, before storing message
const payload = {
  tenantId: processedData.tenantId,
  contactId: contact.contactId,
  messageId: processedData.messageId,
  from: processedData.from,
  to: processedData.to,
  body: processedData.body,
  mediaUrls: processedData.mediaUrls,
  mediaCount: processedData.mediaUrls.length,
  timestamp: processedData.metadata.timestamp
};

try {
  const result = await executeTrigger({
    tenantId: processedData.tenantId,
    triggerType: 'sms.received.v1',
    payload
  });

  console.log(`Triggered ${result.subscriptionsFound} subscription(s)`);
} catch (error) {
  // Log but don't throw - don't block main flow
  console.error('Error triggering subscriptions:', error);
}
```

**Best Practices:**

1. ✅ Call after data is resolved (tenant, contact, etc.)
2. ✅ Call before storing/processing the main event
3. ✅ Use try/catch to not block main flow
4. ✅ Log results for debugging
5. ✅ Include all required schema fields in payload

---

## 🎯 Common Patterns

### Pattern 1: SMS with Media Filter

**Subscription:**
```typescript
{
  triggerType: 'sms.received.v1',
  conditions: {
    payload: {
      "mediaCount": { "$gt": 0 }
    }
  }
}
```

**Only triggers for SMS messages with attachments.**

---

### Pattern 2: Specific Contact Filter

**Subscription:**
```typescript
{
  triggerType: 'sms.received.v1',
  conditions: {
    payload: {
      "contactId": { "$eq": "con_vip_123" }
    }
  }
}
```

**Only triggers for specific VIP contact.**

---

### Pattern 3: Calendar Milestone Filter

**Subscription:**
```typescript
{
  triggerType: 'event.lifecycle.milestone.v1',
  conditions: {
    payload: {
      "milestone": { "$in": ["1_hour_before", "15_min_before"] },
      "eventData.eventType": { "$eq": "meeting" }
    }
  }
}
```

**Only triggers for meeting reminders 1 hour or 15 min before.**

---

### Pattern 4: Wait Node Pattern

**Event Definition:**
```typescript
metadata: {
  usesResumeUrl: true,  // ← Key flag
  requiresEventId: true,
  pausesWorkflow: true
}
```

**Flow:**
1. Workflow hits wait node → Creates `waitExecution` with `resumeUrl`
2. Event occurs → `executeTrigger()` called
3. Engine queries `waitExecutions` for matching milestone/eventId
4. POST to `resumeUrl` (not workflow webhook)
5. Workflow resumes from wait node

---

### Pattern 5: Priority Execution

**Subscriptions with different priorities:**

```typescript
// High priority workflow
{ priority: 200 }

// Normal priority workflow
{ priority: 100 }

// Low priority workflow
{ priority: 50 }
```

**Execution order:** 200 → 100 → 50 (higher numbers execute first)

---

## 🧪 Testing Checklist

### Test Event Definition

```bash
# Verify event registered
curl http://localhost:8000/api/workflows/trigger-subscriptions/event-types | \
  jq '.[] | select(.type=="your.event.type.v1")'

# Expected: Full event definition returned
```

### Test Subscription Creation

```bash
# Create subscription
curl -X POST http://localhost:8000/api/workflows/trigger-subscriptions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "workflowId": "wf_test123",
    "triggerType": "your.event.type.v1",
    "enabled": true
  }'

# Expected: Subscription created with ID
```

### Test Condition Filtering

```bash
# Create subscription with condition
curl -X POST http://localhost:8000/api/workflows/trigger-subscriptions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "workflowId": "wf_test123",
    "triggerType": "sms.received.v1",
    "enabled": true,
    "conditions": {
      "payload": {
        "mediaCount": { "$gt": 0 }
      }
    }
  }'

# Test with matching payload
curl -X POST http://localhost:8000/api/workflows/trigger-subscriptions/execute \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "triggerType": "sms.received.v1",
    "payload": {
      "tenantId": "ten_test",
      "mediaCount": 2,
      "from": "+1555",
      "body": "test"
    }
  }'

# Expected: Subscription matched and executed

# Test with non-matching payload
curl -X POST http://localhost:8000/api/workflows/trigger-subscriptions/execute \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "triggerType": "sms.received.v1",
    "payload": {
      "tenantId": "ten_test",
      "mediaCount": 0,
      "from": "+1555",
      "body": "test"
    }
  }'

# Expected: No subscriptions matched
```

### Test Execution Flow

```bash
# Execute trigger directly
curl -X POST http://localhost:8000/api/workflows/trigger-subscriptions/execute \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "triggerType": "your.event.type.v1",
    "payload": {
      "tenantId": "ten_test",
      "contactId": "con_test",
      "yourField": "test value"
    }
  }'

# Expected response:
{
  "success": true,
  "message": "Executed 1 subscription(s): 1 succeeded, 0 failed",
  "subscriptionsFound": 1,
  "executionResults": [
    {
      "subscriptionId": "01HZ...",
      "workflowId": "wf_test123",
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

---

## 🐛 Common Issues

### Issue: "Unknown event type"

**Cause:** Event not registered in `TriggerDesitinationRegistry`

**Fix:** Add event to `eventRegistry` in `index.ts`

---

### Issue: "Workflow already has subscription"

**Cause:** 1:1 constraint - workflow can only have one subscription

**Fix:** Delete existing subscription or use different workflow

---

### Issue: "No active subscriptions found"

**Causes:**
1. No subscriptions created
2. Subscriptions disabled (`enabled: false`)
3. Conditions don't match payload

**Debug:**
```bash
# List all subscriptions
curl http://localhost:8000/api/workflows/trigger-subscriptions?triggerType=your.event.type.v1

# Check enabled status
curl http://localhost:8000/api/workflows/trigger-subscriptions?enabled=true
```

---

### Issue: "Condition failed"

**Cause:** Payload doesn't match subscription conditions

**Debug:** Use verbose mode:
```typescript
await getSubscriptions(tenantId, { triggerType: 'sms.received.v1' }, {
  payload: yourPayload,
  verbose: true  // ← Logs condition evaluation
});
```

**Check logs for:**
```
Evaluating 2 condition(s) for subscription 01HZ...
  Condition: mediaCount
  Expected: {"$gt":0}
  Payload Value: 0
  ❌ Condition failed
```

---

## 📚 Related Documentation

- **[README.md](./README.md)** - Complete system overview
- **[patterns/event-registration.md](./patterns/event-registration.md)** - Event registration deep dive
- **[patterns/conditional-filtering.md](./patterns/conditional-filtering.md)** - All operators with examples
- **[helpers/testing-triggers.md](./helpers/testing-triggers.md)** - Comprehensive testing guide
- **[examples/complete-trigger-example.md](./examples/complete-trigger-example.md)** - End-to-end example

---

**Most Important for Devs:**
1. **Add New Event Type Checklist** (top of this doc)
2. **Event Definition Template** (copy/paste ready)
3. **Condition Operators Reference** (all operators)
4. **Integration Points** (where to call executeTrigger)
