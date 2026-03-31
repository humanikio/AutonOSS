# Testing Trigger Subscriptions

> Manual and automated testing guide for trigger workflows

---

## Overview

This guide covers:
- Manual API testing with curl
- Integration testing patterns
- End-to-end workflow testing
- Debugging failed executions

---

## Manual Testing

### Prerequisites

**1. Get authentication token:**

```bash
# Set your token
export TOKEN="your_jwt_token_here"
export TENANT_ID="ten_123"
```

**2. Ensure workflow exists with trigger node:**

```bash
# List workflows
curl -X GET http://localhost:8000/api/workflows \
  -H "Authorization: Bearer $TOKEN"
```

**3. Verify subscription created:**

```bash
# List subscriptions for workflow
curl -X GET "http://localhost:8000/api/workflows/trigger-subscriptions?workflowId=wf_abc" \
  -H "Authorization: Bearer $TOKEN"
```

---

### Test 1: Execute SMS Trigger

**Trigger:** `sms.received.v1`

```bash
curl -X POST http://localhost:8000/api/workflows/trigger-subscriptions/execute \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "triggerType": "sms.received.v1",
    "payload": {
      "tenantId": "ten_123",
      "contactId": "con_456",
      "messageId": "msg_789",
      "from": "+15551234567",
      "to": "+15559999999",
      "body": "Test message",
      "mediaCount": 0,
      "timestamp": "2025-01-19T10:00:00Z"
    }
  }'
```

**Expected Response:**

```json
{
  "success": true,
  "message": "Trigger executed successfully",
  "subscriptionsFound": 1,
  "executionResults": [
    {
      "subscriptionId": "sub_abc",
      "workflowId": "wf_123",
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

### Test 2: Execute Phone Call Trigger

**Trigger:** `phone.call.completed.v1`

```bash
curl -X POST http://localhost:8000/api/workflows/trigger-subscriptions/execute \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "triggerType": "phone.call.completed.v1",
    "payload": {
      "tenantId": "ten_123",
      "contactId": "con_456",
      "callId": "call_789",
      "agentId": "agent_101",
      "direction": "inbound",
      "from": "+15551234567",
      "to": "+15559999999",
      "callDuration": 320,
      "timestamp": "2025-01-19T10:05:00Z",
      "transcript": "Hello, how can I help you today?",
      "summary": "Customer inquiry about product features"
    }
  }'
```

---

### Test 3: Execute Calendar Milestone Trigger

**Trigger:** `event.lifecycle.milestone.v1`

```bash
curl -X POST http://localhost:8000/api/workflows/trigger-subscriptions/execute \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "triggerType": "event.lifecycle.milestone.v1",
    "payload": {
      "tenantId": "ten_123",
      "milestone": "1_hour_before",
      "eventId": "evt_456",
      "eventData": {
        "eventName": "Team Meeting",
        "eventType": "meeting",
        "startTime": "2025-01-19T11:00:00Z",
        "endTime": "2025-01-19T12:00:00Z",
        "contactId": "con_789"
      }
    }
  }'
```

---

### Test 4: Test with Conditions

**Subscription with conditions:**

```typescript
// First, create subscription with conditions
await createSubscription('ten_123', {
  workflowId: 'wf_media_filter',
  triggerType: 'sms.received.v1',
  enabled: true,
  conditions: {
    payload: {
      "mediaCount": { "$gt": 0 }
    }
  }
});
```

**Test with matching payload:**

```bash
curl -X POST http://localhost:8000/api/workflows/trigger-subscriptions/execute \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "triggerType": "sms.received.v1",
    "payload": {
      "tenantId": "ten_123",
      "contactId": "con_456",
      "messageId": "msg_789",
      "from": "+15551234567",
      "to": "+15559999999",
      "body": "Check this photo",
      "mediaCount": 2,
      "timestamp": "2025-01-19T10:00:00Z"
    }
  }'
```

**Expected:** Subscription matches (mediaCount = 2 > 0)

**Test with non-matching payload:**

```bash
curl -X POST http://localhost:8000/api/workflows/trigger-subscriptions/execute \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "triggerType": "sms.received.v1",
    "payload": {
      "tenantId": "ten_123",
      "contactId": "con_456",
      "messageId": "msg_790",
      "from": "+15551234567",
      "to": "+15559999999",
      "body": "Text only",
      "mediaCount": 0,
      "timestamp": "2025-01-19T10:01:00Z"
    }
  }'
```

**Expected:** No subscriptions match (mediaCount = 0, condition requires > 0)

```json
{
  "success": true,
  "message": "Trigger executed successfully",
  "subscriptionsFound": 0,
  "executionResults": [],
  "summary": {
    "total": 0,
    "completed": 0,
    "failed": 0
  }
}
```

---

### Test 5: Test Wait Node Pattern (ResumeUrl)

**Setup: Create wait execution first**

This simulates workflow hitting wait node and saving resumeUrl.

```typescript
// Normally done by workflow transformation
await createWaitExecution({
  tenantId: 'ten_123',
  workflowId: 'wf_calendar_wait',
  executionId: 'exec_456',
  milestone: '1_hour_before',
  eventId: 'evt_789',
  resumeUrl: 'https://n8n.example.com/webhook/resume-abc123',
  status: 'waiting'
});
```

**Then trigger milestone event:**

```bash
curl -X POST http://localhost:8000/api/workflows/trigger-subscriptions/execute \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "triggerType": "event.lifecycle.milestone.wait.v1",
    "payload": {
      "tenantId": "ten_123",
      "milestone": "1_hour_before",
      "eventId": "evt_789",
      "eventData": {
        "eventName": "Team Meeting",
        "eventType": "meeting",
        "startTime": "2025-01-19T11:00:00Z"
      }
    }
  }'
```

**Expected:**
- Execution engine detects `usesResumeUrl: true` in event metadata
- Queries `waitExecutions` for matching milestone + eventId
- POSTs to resumeUrl (not workflow webhook)
- Marks execution as resumed

---

## Integration Testing

### Test in TypeScript/Jest

**File:** `workflows/triggerSubscriptions/__tests__/triggerExecution.test.ts`

```typescript
import { executeTrigger } from '../services/triggerExecutions';
import { createSubscription } from '../services/triggerSubscriptionManager';
import { createWorkflow } from '../../workflowManager';

describe('Trigger Execution', () => {
  const tenantId = 'ten_test_123';
  let workflowId: string;
  let subscriptionId: string;

  beforeAll(async () => {
    // Create test workflow
    const workflow = await createWorkflow(tenantId, {
      workflowName: 'Test SMS Workflow',
      productionWebhookUrl: 'https://n8n.test.com/webhook/test-123'
    });
    workflowId = workflow.workflowId;

    // Create subscription
    const subscription = await createSubscription(tenantId, {
      workflowId,
      triggerType: 'sms.received.v1',
      enabled: true
    });
    subscriptionId = subscription.id;
  });

  afterAll(async () => {
    // Cleanup
    await deleteSubscription(tenantId, subscriptionId);
    await deleteWorkflow(tenantId, workflowId);
  });

  test('should execute trigger for matching subscription', async () => {
    const result = await executeTrigger({
      tenantId,
      triggerType: 'sms.received.v1',
      payload: {
        tenantId,
        contactId: 'con_test',
        messageId: 'msg_test',
        from: '+15551234567',
        to: '+15559999999',
        body: 'Test message',
        mediaCount: 0,
        timestamp: new Date().toISOString()
      }
    });

    expect(result.success).toBe(true);
    expect(result.subscriptionsFound).toBe(1);
    expect(result.summary.completed).toBe(1);
    expect(result.summary.failed).toBe(0);
  });

  test('should filter by conditions', async () => {
    // Update subscription with condition
    await updateSubscription(tenantId, subscriptionId, {
      conditions: {
        payload: {
          "mediaCount": { "$gt": 0 }
        }
      }
    });

    // Test with non-matching payload
    const result = await executeTrigger({
      tenantId,
      triggerType: 'sms.received.v1',
      payload: {
        tenantId,
        contactId: 'con_test',
        messageId: 'msg_test2',
        from: '+15551234567',
        to: '+15559999999',
        body: 'No media',
        mediaCount: 0,  // ← Doesn't match condition
        timestamp: new Date().toISOString()
      }
    });

    expect(result.subscriptionsFound).toBe(0);  // Filtered out by condition
  });

  test('should handle disabled subscriptions', async () => {
    // Disable subscription
    await updateSubscription(tenantId, subscriptionId, {
      enabled: false
    });

    const result = await executeTrigger({
      tenantId,
      triggerType: 'sms.received.v1',
      payload: {
        tenantId,
        contactId: 'con_test',
        messageId: 'msg_test3',
        from: '+15551234567',
        to: '+15559999999',
        body: 'Test',
        mediaCount: 0,
        timestamp: new Date().toISOString()
      }
    });

    expect(result.subscriptionsFound).toBe(0);  // Subscription disabled
  });
});
```

---

### Test Condition Evaluation

**File:** `workflows/triggerSubscriptions/__tests__/evaluateConditions.test.ts`

```typescript
import { evaluateConditions } from '../services/triggerExecutions/utils/evaluateConditions';

describe('Condition Evaluation', () => {
  test('$eq operator', () => {
    const conditions = { "status": { "$eq": "active" } };

    expect(evaluateConditions(conditions, { status: "active" })).toBe(true);
    expect(evaluateConditions(conditions, { status: "inactive" })).toBe(false);
  });

  test('$gt operator', () => {
    const conditions = { "mediaCount": { "$gt": 0 } };

    expect(evaluateConditions(conditions, { mediaCount: 1 })).toBe(true);
    expect(evaluateConditions(conditions, { mediaCount: 5 })).toBe(true);
    expect(evaluateConditions(conditions, { mediaCount: 0 })).toBe(false);
  });

  test('$in operator', () => {
    const conditions = { "milestone": { "$in": ["1_hour_before", "15_min_before"] } };

    expect(evaluateConditions(conditions, { milestone: "1_hour_before" })).toBe(true);
    expect(evaluateConditions(conditions, { milestone: "15_min_before" })).toBe(true);
    expect(evaluateConditions(conditions, { milestone: "1_day_before" })).toBe(false);
  });

  test('$contains operator (case-insensitive)', () => {
    const conditions = { "body": { "$contains": "urgent" } };

    expect(evaluateConditions(conditions, { body: "This is urgent!" })).toBe(true);
    expect(evaluateConditions(conditions, { body: "URGENT message" })).toBe(true);
    expect(evaluateConditions(conditions, { body: "Normal message" })).toBe(false);
  });

  test('nested field access', () => {
    const conditions = { "eventData.eventType": { "$eq": "meeting" } };

    const payload = {
      eventId: "evt_123",
      eventData: {
        eventName: "Team Standup",
        eventType: "meeting"
      }
    };

    expect(evaluateConditions(conditions, payload)).toBe(true);
  });

  test('multiple conditions (AND logic)', () => {
    const conditions = {
      "from": { "$eq": "+15551234567" },
      "mediaCount": { "$gt": 0 }
    };

    // Both match
    expect(evaluateConditions(conditions, {
      from: "+15551234567",
      mediaCount: 2
    })).toBe(true);

    // Only one matches
    expect(evaluateConditions(conditions, {
      from: "+15551234567",
      mediaCount: 0
    })).toBe(false);
  });
});
```

---

## End-to-End Testing

### Complete SMS Workflow Test

**Scenario:** Test complete flow from SMS received to workflow execution.

**Setup:**

1. **Create workflow in n8n** with SMS trigger node
2. **Save workflow** (auto-creates subscription)
3. **Activate workflow** (generates production webhook URL)

**Test Steps:**

```typescript
// Step 1: Simulate inbound SMS
const smsPayload = {
  From: '+15551234567',
  To: '+15559999999',
  Body: 'Test message',
  NumMedia: '0',
  MessageSid: 'SM123456789'
};

// Step 2: Call SMS handler (same as Twilio webhook)
const response = await fetch('http://localhost:8000/api/inbound/sms', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams(smsPayload)
});

// Step 3: Verify handler processed SMS
expect(response.status).toBe(200);

// Step 4: Wait for async trigger execution
await sleep(2000);

// Step 5: Check n8n execution logs
const executions = await n8nClient.getExecutions(workflowId);
expect(executions.length).toBeGreaterThan(0);

const latestExecution = executions[0];
expect(latestExecution.data.startData.destinationNode).toBe('SMS Received Trigger');
expect(latestExecution.data.startData.runData).toMatchObject({
  body: 'Test message',
  from: '+15551234567'
});
```

---

### Test Wait Node Resume Flow

**Scenario:** Test calendar event wait node pattern.

**Setup:**

1. **Create workflow** with calendar wait node
2. **Workflow reaches wait node** and saves waitExecution
3. **Milestone occurs** and triggers resumeUrl

**Test Steps:**

```typescript
// Step 1: Start workflow execution (hits wait node)
const executionId = await startWorkflowExecution({
  workflowId: 'wf_calendar_wait',
  triggerData: {
    eventId: 'evt_test_123',
    eventName: 'Test Meeting'
  }
});

// Step 2: Verify wait execution created
const waitExecution = await getWaitExecution({
  tenantId,
  workflowId: 'wf_calendar_wait',
  executionId
});

expect(waitExecution.status).toBe('waiting');
expect(waitExecution.milestone).toBe('1_hour_before');
expect(waitExecution.resumeUrl).toContain('/webhook/resume-');

// Step 3: Simulate milestone trigger
await executeTrigger({
  tenantId,
  triggerType: 'event.lifecycle.milestone.wait.v1',
  payload: {
    tenantId,
    milestone: '1_hour_before',
    eventId: 'evt_test_123',
    eventData: {
      eventName: 'Test Meeting',
      eventType: 'meeting',
      startTime: new Date(Date.now() + 3600000).toISOString()
    }
  }
});

// Step 4: Wait for async processing
await sleep(2000);

// Step 5: Verify execution resumed
const updatedWaitExecution = await getWaitExecution({
  tenantId,
  workflowId: 'wf_calendar_wait',
  executionId
});

expect(updatedWaitExecution.status).toBe('resumed');

// Step 6: Check workflow continued after wait node
const execution = await n8nClient.getExecution(executionId);
expect(execution.finished).toBe(true);
expect(execution.data.resultData.runData).toHaveProperty('Wait Node');
```

---

## Debugging

### Enable Verbose Logging

**File:** `triggerExecutions.ts`

Add logging to execution flow:

```typescript
export async function executeTrigger(input: TriggerExecutionInput) {
  console.log('[Trigger] Starting execution:', {
    triggerType: input.triggerType,
    tenantId: input.tenantId,
    payloadKeys: Object.keys(input.payload)
  });

  // ... validation ...

  console.log('[Trigger] Subscriptions found:', subscriptions.length);

  for (const subscription of subscriptions) {
    console.log('[Trigger] Processing subscription:', {
      subscriptionId: subscription.id,
      workflowId: subscription.workflowId,
      hasConditions: !!subscription.conditions
    });

    // ... execution ...

    console.log('[Trigger] Subscription result:', {
      subscriptionId: subscription.id,
      success: result.success
    });
  }

  return result;
}
```

---

### Check Subscription Conditions

**Query subscription:**

```bash
curl -X GET "http://localhost:8000/api/workflows/trigger-subscriptions/sub_abc123" \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "id": "sub_abc123",
  "workflowId": "wf_456",
  "triggerType": "sms.received.v1",
  "enabled": true,
  "conditions": {
    "payload": {
      "mediaCount": { "$gt": 0 }
    }
  }
}
```

**Test conditions manually:**

```typescript
import { evaluateConditions } from './evaluateConditions';

const testPayload = {
  from: '+15551234567',
  mediaCount: 0,
  body: 'Test'
};

const match = evaluateConditions(
  { "mediaCount": { "$gt": 0 } },
  testPayload
);

console.log('Match:', match);  // false (0 is not > 0)
```

---

### Check Workflow Webhook URL

**Query workflow:**

```bash
curl -X GET "http://localhost:8000/api/workflows/wf_abc123" \
  -H "Authorization: Bearer $TOKEN"
```

**Verify `productionWebhookUrl` exists:**

```json
{
  "workflowId": "wf_abc123",
  "workflowName": "SMS Handler",
  "productionWebhookUrl": "https://n8n.example.com/webhook/abc123",
  "isActive": true
}
```

**If missing:** Workflow not deployed or activated in n8n.

---

### Test Webhook URL Directly

**Bypass trigger system and POST directly to webhook:**

```bash
curl -X POST https://n8n.example.com/webhook/abc123 \
  -H "Content-Type: application/json" \
  -d '{
    "from": "+15551234567",
    "body": "Direct test",
    "mediaCount": 0
  }'
```

**Expected:** n8n workflow executes.

**If workflow doesn't execute:** Issue is with n8n webhook, not trigger system.

---

### Check Firestore Data

**Query subscriptions directly:**

```typescript
const snapshot = await firestore
  .collection('tenants').doc('ten_123')
  .collection('workflows').doc('main')
  .collection('triggerSubscriptions')
  .where('triggerType', '==', 'sms.received.v1')
  .get();

console.log('Subscriptions:', snapshot.docs.map(doc => doc.data()));
```

**Query wait executions:**

```typescript
const snapshot = await firestore
  .collection('tenants').doc('ten_123')
  .collection('workflows').doc('main')
  .collection('waitExecutions')
  .where('workflowId', '==', 'wf_calendar_wait')
  .where('status', '==', 'waiting')
  .get();

console.log('Waiting executions:', snapshot.docs.map(doc => doc.data()));
```

---

## Common Issues

### Issue: No subscriptions found

**Symptoms:**
```json
{
  "subscriptionsFound": 0,
  "executionResults": []
}
```

**Causes:**
1. Subscription not created yet
2. Subscription disabled
3. Wrong triggerType
4. Wrong tenantId

**Debug:**
```bash
# List all subscriptions for tenant
curl -X GET "http://localhost:8000/api/workflows/trigger-subscriptions" \
  -H "Authorization: Bearer $TOKEN"

# Check specific workflow
curl -X GET "http://localhost:8000/api/workflows/trigger-subscriptions?workflowId=wf_abc" \
  -H "Authorization: Bearer $TOKEN"
```

---

### Issue: Subscription found but filtered out

**Symptoms:**
```json
{
  "subscriptionsFound": 0,  // Filtered by conditions
  "executionResults": []
}
```

**Cause:** Payload doesn't match subscription conditions.

**Debug:**
```typescript
// Get subscription conditions
const sub = await readSubscription('ten_123', 'sub_abc');
console.log('Conditions:', sub.conditions);

// Test against payload
const match = evaluateConditions(sub.conditions?.payload, {
  from: '+15551234567',
  mediaCount: 0
});
console.log('Match:', match);
```

---

### Issue: Webhook POST failed

**Symptoms:**
```json
{
  "subscriptionsFound": 1,
  "summary": {
    "completed": 0,
    "failed": 1
  },
  "executionResults": [
    {
      "subscriptionId": "sub_abc",
      "success": false,
      "error": "Failed to POST to webhook"
    }
  ]
}
```

**Causes:**
1. Workflow not activated in n8n
2. Invalid webhook URL
3. n8n server down
4. Network issue

**Debug:**
```bash
# Test webhook URL directly
curl -X POST https://n8n.example.com/webhook/abc123 \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

# Check n8n server
curl https://n8n.example.com/healthz
```

---

### Issue: Wait node not resuming

**Symptoms:** Milestone triggered but workflow didn't resume.

**Causes:**
1. No waitExecution found for milestone + eventId
2. Workflow already resumed
3. Wrong triggerType (should be `event.lifecycle.milestone.wait.v1`)

**Debug:**
```typescript
// Query wait executions
const waitExecs = await firestore
  .collection('tenants').doc('ten_123')
  .collection('workflows').doc('main')
  .collection('waitExecutions')
  .where('eventId', '==', 'evt_456')
  .where('milestone', '==', '1_hour_before')
  .get();

console.log('Wait executions:', waitExecs.docs.map(doc => ({
  id: doc.id,
  ...doc.data()
})));

// Check if already resumed
waitExecs.forEach(doc => {
  const data = doc.data();
  console.log(`Execution ${data.executionId}: ${data.status}`);
});
```

---

## Performance Testing

### Load Test

**Simulate multiple concurrent triggers:**

```typescript
async function loadTest() {
  const promises = [];

  for (let i = 0; i < 100; i++) {
    promises.push(
      executeTrigger({
        tenantId: 'ten_123',
        triggerType: 'sms.received.v1',
        payload: {
          tenantId: 'ten_123',
          contactId: `con_${i}`,
          messageId: `msg_${i}`,
          from: `+1555${i.toString().padStart(7, '0')}`,
          to: '+15559999999',
          body: `Load test ${i}`,
          mediaCount: 0,
          timestamp: new Date().toISOString()
        }
      })
    );
  }

  const results = await Promise.all(promises);

  const successful = results.filter(r => r.success).length;
  console.log(`${successful}/100 triggers executed successfully`);
}
```

---

## Testing Checklist

**Before releasing new event type:**

- [ ] Event definition created in `TriggerDestinationRegistry`
- [ ] Event registered in registry index
- [ ] payloadSchema validates correctly
- [ ] filterableFields documented
- [ ] Integration point calls `executeTrigger()` with correct payload
- [ ] Manual API test with curl
- [ ] Condition filtering tested (if applicable)
- [ ] Wait node pattern tested (if `usesResumeUrl: true`)
- [ ] End-to-end workflow execution verified
- [ ] Error handling tested (invalid payload, disabled subscription, etc.)

---

## Related Docs

- [conditional-filtering.md](../patterns/conditional-filtering.md) - Test condition operators
- [event-registration.md](../patterns/event-registration.md) - Register events before testing
- [complete-trigger-example.md](../examples/complete-trigger-example.md) - End-to-end example
