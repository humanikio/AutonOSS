# Pattern: Conditional Filtering

> MongoDB-style operators for filtering trigger subscriptions by payload

---

## Overview

Subscriptions can filter events using **MongoDB-style operators** in the `conditions.payload` field.

**Only subscriptions that match conditions** will trigger workflow execution.

---

## Basic Structure

```typescript
conditions: {
  payload: {
    "fieldName": { "$operator": value }
  }
}
```

**Logic:**
- All conditions must match (AND logic)
- Missing fields evaluate to undefined
- Conditions are optional (no conditions = match all events)

---

## All Operators

### Equality Operators

#### `$eq` - Equals

**Match exact value.**

```typescript
// Only trigger if from specific number
conditions: {
  payload: {
    "from": { "$eq": "+15551234567" }
  }
}
```

**Example Payloads:**
```typescript
{ from: "+15551234567" }  // ✅ Match
{ from: "+15559999999" }  // ❌ No match
```

---

#### `$ne` - Not Equals

**Match if value is different.**

```typescript
// Trigger for all except archived status
conditions: {
  payload: {
    "status": { "$ne": "archived" }
  }
}
```

**Example Payloads:**
```typescript
{ status: "active" }    // ✅ Match
{ status: "pending" }   // ✅ Match
{ status: "archived" }  // ❌ No match
```

---

### Array Operators

#### `$in` - In Array

**Match if value is in provided array.**

```typescript
// Trigger for specific milestones
conditions: {
  payload: {
    "milestone": { "$in": ["1_hour_before", "15_min_before"] }
  }
}
```

**Example Payloads:**
```typescript
{ milestone: "1_hour_before" }  // ✅ Match
{ milestone: "15_min_before" }  // ✅ Match
{ milestone: "1_day_before" }   // ❌ No match
```

---

#### `$nin` - Not In Array

**Match if value is NOT in provided array.**

```typescript
// Trigger for all except spam/test types
conditions: {
  payload: {
    "messageType": { "$nin": ["spam", "test"] }
  }
}
```

**Example Payloads:**
```typescript
{ messageType: "normal" }    // ✅ Match
{ messageType: "urgent" }    // ✅ Match
{ messageType: "spam" }      // ❌ No match
{ messageType: "test" }      // ❌ No match
```

---

### Comparison Operators

#### `$gt` - Greater Than

**Match if value is greater.**

```typescript
// Only trigger if SMS has media
conditions: {
  payload: {
    "mediaCount": { "$gt": 0 }
  }
}
```

**Example Payloads:**
```typescript
{ mediaCount: 1 }  // ✅ Match
{ mediaCount: 5 }  // ✅ Match
{ mediaCount: 0 }  // ❌ No match
```

---

#### `$gte` - Greater Than or Equal

**Match if value is greater or equal.**

```typescript
// Trigger for calls 5 minutes or longer
conditions: {
  payload: {
    "callDuration": { "$gte": 300 }
  }
}
```

**Example Payloads:**
```typescript
{ callDuration: 300 }  // ✅ Match (exactly 5 min)
{ callDuration: 500 }  // ✅ Match
{ callDuration: 120 }  // ❌ No match
```

---

#### `$lt` - Less Than

**Match if value is less.**

```typescript
// Trigger for short messages
conditions: {
  payload: {
    "bodyLength": { "$lt": 100 }
  }
}
```

**Example Payloads:**
```typescript
{ bodyLength: 50 }   // ✅ Match
{ bodyLength: 99 }   // ✅ Match
{ bodyLength: 100 }  // ❌ No match
{ bodyLength: 200 }  // ❌ No match
```

---

#### `$lte` - Less Than or Equal

**Match if value is less or equal.**

```typescript
// Trigger for affordable items
conditions: {
  payload: {
    "price": { "$lte": 100 }
  }
}
```

**Example Payloads:**
```typescript
{ price: 50 }   // ✅ Match
{ price: 100 }  // ✅ Match (exactly 100)
{ price: 150 }  // ❌ No match
```

---

### String Operators

#### `$contains` - String Contains (Case-Insensitive)

**Match if string contains substring.**

```typescript
// Trigger if message body contains "urgent"
conditions: {
  payload: {
    "body": { "$contains": "urgent" }
  }
}
```

**Example Payloads:**
```typescript
{ body: "This is urgent!" }           // ✅ Match
{ body: "URGENT: Please respond" }    // ✅ Match (case-insensitive)
{ body: "Hello, how are you?" }       // ❌ No match
```

**Note:** Case-insensitive matching.

---

### Existence Operators

#### `$exists` - Field Exists

**Match based on field presence.**

```typescript
// Only trigger if eventId is present
conditions: {
  payload: {
    "eventId": { "$exists": true }
  }
}
```

**Example Payloads:**
```typescript
{ eventId: "evt_123" }        // ✅ Match (field exists)
{ eventId: null }             // ✅ Match (field exists, even if null)
{ contactId: "con_456" }      // ❌ No match (eventId missing)
```

**Opposite:**
```typescript
// Trigger only if field is missing
conditions: {
  payload: {
    "optionalField": { "$exists": false }
  }
}
```

---

## Multiple Conditions

**All conditions must match (AND logic).**

```typescript
// Trigger for SMS with media from specific number
conditions: {
  payload: {
    "from": { "$eq": "+15551234567" },
    "mediaCount": { "$gt": 0 }
  }
}
```

**Evaluation:**
```typescript
// ✅ Both conditions match
{
  from: "+15551234567",
  mediaCount: 2
}

// ❌ Only one condition matches
{
  from: "+15551234567",
  mediaCount: 0
}

// ❌ Only one condition matches
{
  from: "+15559999999",
  mediaCount: 2
}
```

---

## Nested Field Access

**Use dot notation for nested fields.**

```typescript
// Access nested eventData.eventType
conditions: {
  payload: {
    "eventData.eventType": { "$eq": "meeting" }
  }
}
```

**Example Payload:**
```typescript
{
  eventId: "evt_123",
  eventData: {
    eventName: "Team Standup",
    eventType: "meeting"  // ← Accessed via "eventData.eventType"
  }
}
```

**Deep nesting:**
```typescript
conditions: {
  payload: {
    "contact.preferences.notifications": { "$eq": true }
  }
}
```

**Matches:**
```typescript
{
  contact: {
    contactId: "con_123",
    preferences: {
      notifications: true  // ← Deep nested access
    }
  }
}
```

---

## Common Patterns

### Pattern: SMS with Media Only

```typescript
conditions: {
  payload: {
    "mediaCount": { "$gt": 0 }
  }
}
```

**Use case:** Trigger workflow only for MMS messages (with attachments).

---

### Pattern: Specific Phone Numbers

```typescript
conditions: {
  payload: {
    "from": { "$in": ["+15551234567", "+15559876543"] }
  }
}
```

**Use case:** VIP customer phone numbers that trigger special workflows.

---

### Pattern: Calendar Milestone Filtering

```typescript
conditions: {
  payload: {
    "milestone": { "$in": ["1_hour_before", "15_min_before"] },
    "eventData.eventType": { "$eq": "meeting" }
  }
}
```

**Use case:** Only trigger for meeting events at critical milestones.

---

### Pattern: High-Value Opportunities

```typescript
conditions: {
  payload: {
    "opportunityValue": { "$gte": 10000 },
    "stage": { "$ne": "closed_lost" }
  }
}
```

**Use case:** Trigger for high-value open opportunities.

---

### Pattern: Urgent Messages

```typescript
conditions: {
  payload: {
    "body": { "$contains": "urgent" }
  }
}
```

**Use case:** Route urgent messages to escalation workflow.

---

### Pattern: Wait Node Event Matching

```typescript
conditions: {
  payload: {
    "milestone": { "$eq": "1_hour_before" },
    "eventId": { "$exists": true }
  }
}
```

**Use case:** Wait node pattern - ensure eventId present for resumeUrl matching.

---

### Pattern: Exclude Test Events

```typescript
conditions: {
  payload: {
    "contactId": { "$nin": ["test_contact_1", "test_contact_2"] }
  }
}
```

**Use case:** Filter out test contacts in production workflows.

---

## Debugging Conditions

### Enable Verbose Logging

**File:** `triggerSubscriptionManager/getSubscriptions.ts`

```typescript
const result = await getSubscriptions('ten_123', {
  triggerType: 'sms.received.v1'
}, {
  payload: { from: '+1555', mediaCount: 2 },
  verbose: true  // ← Logs condition evaluation
});
```

**Output:**
```
[Conditions] Evaluating subscription sub_abc
[Conditions] Field "from": $eq "+15551234567"
[Conditions]   Payload value: "+1555"
[Conditions]   Result: false ❌
[Conditions] Subscription sub_abc: NO MATCH
```

---

### Test Conditions Manually

**File:** `triggerExecutions/utils/evaluateConditions.ts:130-152`

```typescript
import { evaluateConditions } from './evaluateConditions';

const match = evaluateConditions(
  { "mediaCount": { "$gt": 0 } },
  { mediaCount: 2, from: '+1555' }
);

console.log(match);  // true
```

---

### Common Debugging Issues

**Issue: Condition not matching**

```typescript
// ❌ Wrong - string vs number mismatch
conditions: {
  payload: {
    "mediaCount": { "$eq": "0" }  // String "0"
  }
}

// ✅ Correct
conditions: {
  payload: {
    "mediaCount": { "$eq": 0 }  // Number 0
  }
}
```

**Issue: Field name typo**

```typescript
// ❌ Wrong - field name doesn't match payload
conditions: {
  payload: {
    "messageBody": { "$contains": "urgent" }  // Payload has "body"
  }
}

// ✅ Correct
conditions: {
  payload: {
    "body": { "$contains": "urgent" }
  }
}
```

**Issue: Case sensitivity**

```typescript
// Only $contains is case-insensitive
conditions: {
  payload: {
    "status": { "$eq": "Active" }  // ❌ Won't match "active"
  }
}

// Options:
// 1. Use exact case
conditions: {
  payload: {
    "status": { "$eq": "active" }  // ✅ Match "active"
  }
}

// 2. Use $contains for case-insensitive
conditions: {
  payload: {
    "status": { "$contains": "active" }  // ✅ Matches "active", "Active", "ACTIVE"
  }
}
```

---

## Implementation Details

### Evaluation Function

**File:** `triggerExecutions/utils/evaluateConditions.ts:130-152`

```typescript
export function evaluateConditions(
  conditions: Record<string, any> | undefined,
  payload: Record<string, any>
): boolean {
  if (!conditions || Object.keys(conditions).length === 0) {
    return true;  // No conditions = match all
  }

  for (const [field, operatorObj] of Object.entries(conditions)) {
    const payloadValue = getNestedValue(payload, field);

    if (!evaluateSingleCondition(operatorObj, payloadValue)) {
      return false;  // First failed condition = no match
    }
  }

  return true;  // All conditions passed
}
```

**Logic:**
- No conditions → Match all events
- First failed condition → Immediate return false
- All conditions pass → Return true

---

### Nested Value Access

**File:** `triggerExecutions/utils/evaluateConditions.ts`

```typescript
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => {
    return current?.[key];
  }, obj);
}
```

**Example:**
```typescript
const payload = {
  eventData: {
    eventType: "meeting"
  }
};

getNestedValue(payload, "eventData.eventType");
// Returns: "meeting"
```

---

### Operator Implementation

**File:** `triggerExecutions/utils/evaluateConditions.ts`

```typescript
function evaluateSingleCondition(
  operatorObj: Record<string, any>,
  payloadValue: any
): boolean {
  for (const [operator, expectedValue] of Object.entries(operatorObj)) {
    switch (operator) {
      case '$eq':
        return payloadValue === expectedValue;

      case '$ne':
        return payloadValue !== expectedValue;

      case '$in':
        return Array.isArray(expectedValue) && expectedValue.includes(payloadValue);

      case '$nin':
        return Array.isArray(expectedValue) && !expectedValue.includes(payloadValue);

      case '$gt':
        return payloadValue > expectedValue;

      case '$gte':
        return payloadValue >= expectedValue;

      case '$lt':
        return payloadValue < expectedValue;

      case '$lte':
        return payloadValue <= expectedValue;

      case '$contains':
        return typeof payloadValue === 'string' &&
               typeof expectedValue === 'string' &&
               payloadValue.toLowerCase().includes(expectedValue.toLowerCase());

      case '$exists':
        return expectedValue === true ? payloadValue !== undefined : payloadValue === undefined;

      default:
        return false;  // Unknown operator
    }
  }
}
```

---

## Query Optimization

### Firestore Query First

Subscriptions are queried by `triggerType` and `enabled` **before** condition evaluation.

**File:** `triggerSubscriptionManager/getSubscriptions.ts`

```typescript
let query = firestore
  .collection('tenants').doc(tenantId)
  .collection('workflows').doc('main')
  .collection('triggerSubscriptions')
  .where('triggerType', '==', filters.triggerType)
  .where('enabled', '==', true);

const snapshot = await query.get();

// Then filter by conditions in memory
const matchingSubscriptions = snapshot.docs
  .map(doc => doc.data())
  .filter(sub => evaluateConditions(sub.conditions?.payload, payload));
```

**Performance:**
- ✅ Firestore filters by triggerType + enabled (indexed)
- ✅ In-memory filtering for conditions (small result set)
- ❌ No Firestore index on condition fields (dynamic structure)

---

## Testing Conditions

### Manual API Test

```bash
curl -X POST http://localhost:8000/api/workflows/trigger-subscriptions/execute \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "triggerType": "sms.received.v1",
    "payload": {
      "from": "+15551234567",
      "body": "urgent message",
      "mediaCount": 2,
      "contactId": "con_123"
    }
  }'
```

**Check response:**
```json
{
  "success": true,
  "subscriptionsFound": 2,
  "summary": {
    "total": 2,
    "completed": 1,
    "failed": 0
  }
}
```

If `completed` < `subscriptionsFound`, some subscriptions failed condition checks.

---

### Test Specific Subscription

**Query subscription conditions:**

```typescript
const subscription = await readSubscription('ten_123', 'sub_abc');
console.log(subscription.conditions);
```

**Test against payload:**

```typescript
import { evaluateConditions } from './evaluateConditions';

const match = evaluateConditions(
  subscription.conditions?.payload,
  {
    from: '+15551234567',
    mediaCount: 2,
    body: 'test'
  }
);

console.log('Subscription matches:', match);
```

---

## Complete Example

### SMS with Media from VIP Customer

**Scenario:** Trigger workflow only for MMS from VIP customer phone numbers.

**Subscription:**
```typescript
await createSubscription('ten_123', {
  workflowId: 'wf_vip_mms',
  triggerType: 'sms.received.v1',
  enabled: true,
  conditions: {
    payload: {
      "from": { "$in": ["+15551234567", "+15559876543"] },
      "mediaCount": { "$gt": 0 }
    }
  }
});
```

**Test Payloads:**

```typescript
// ✅ Match - VIP number + has media
{
  from: "+15551234567",
  body: "Check this out",
  mediaCount: 2,
  contactId: "con_vip1"
}

// ❌ No match - VIP number but no media
{
  from: "+15551234567",
  body: "Hello",
  mediaCount: 0,
  contactId: "con_vip1"
}

// ❌ No match - Has media but not VIP
{
  from: "+15559999999",
  body: "Photo",
  mediaCount: 1,
  contactId: "con_123"
}

// ✅ Match - Second VIP number + has media
{
  from: "+15559876543",
  body: "Document attached",
  mediaCount: 1,
  contactId: "con_vip2"
}
```

---

## Operator Reference Table

| Operator | Type | Description | Example |
|----------|------|-------------|---------|
| `$eq` | Any | Equals | `{ "status": { "$eq": "active" } }` |
| `$ne` | Any | Not equals | `{ "type": { "$ne": "spam" } }` |
| `$in` | Array | In array | `{ "tag": { "$in": ["vip", "urgent"] } }` |
| `$nin` | Array | Not in array | `{ "status": { "$nin": ["archived"] } }` |
| `$gt` | Number | Greater than | `{ "count": { "$gt": 5 } }` |
| `$gte` | Number | Greater or equal | `{ "score": { "$gte": 80 } }` |
| `$lt` | Number | Less than | `{ "age": { "$lt": 18 } }` |
| `$lte` | Number | Less or equal | `{ "price": { "$lte": 100 } }` |
| `$contains` | String | String contains (case-insensitive) | `{ "body": { "$contains": "urgent" } }` |
| `$exists` | Boolean | Field exists/missing | `{ "eventId": { "$exists": true } }` |

---

## Related Docs

- [subscription-lifecycle.md](./subscription-lifecycle.md) - Subscription creation with conditions
- [event-registration.md](./event-registration.md) - Define filterableFields
- [QUICK-REFERENCE.md](../QUICK-REFERENCE.md) - Quick operator lookup
