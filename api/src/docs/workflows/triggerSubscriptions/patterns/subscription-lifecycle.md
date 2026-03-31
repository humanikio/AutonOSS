# Pattern: Subscription Lifecycle

> Auto-creation, execution, and resume flow

---

## Auto-Creation from Trigger Nodes

When user adds trigger node to workflow, subscription automatically created.

### Node Config Links to Event

**File:** `nodeRegistry/nodes/trigger/smsReceivedTrigger.config.ts`

```typescript
export const smsReceivedTriggerNode: INodeTypeDescription = {
  displayName: 'SMS Received',
  name: 'smsReceivedTrigger',
  inputs: [],
  outputs: ['main'],

  _pulseline: {
    isTrigger: true,
    triggerType: 'sms.received.v1',  // ← Links to registry
    transformationMethod: 'trigger_webhook'
  },

  properties: []
};
```

### Backend Auto-Creates Subscription

**On workflow save with trigger node:**

```typescript
// Check if workflow has trigger node
const hasTrigger = workflow.nodes.some(n =>
  nodeRegistry.getNodeConfig(n.type)?._pulseline?.isTrigger
);

if (hasTrigger) {
  const triggerNode = workflow.nodes.find(n =>
    nodeRegistry.getNodeConfig(n.type)?._pulseline?.isTrigger
  );

  const triggerType = nodeRegistry.getNodeConfig(triggerNode.type)
    ?._pulseline?.triggerType;

  // Create subscription
  await createSubscription(tenantId, {
    workflowId: workflow.id,
    triggerType: triggerType,
    enabled: true
  });
}
```

---

## Execution Flow

### Standard Webhook Pattern

```
1. EVENT OCCURS
   SMS received, call completed, etc.

2. HANDLER CALLS executeTrigger()
   executeTrigger({
     tenantId: 'ten_123',
     triggerType: 'sms.received.v1',
     payload: { ... }
   })

3. QUERY SUBSCRIPTIONS
   Firestore: triggerType + enabled + tenantId

4. EVALUATE CONDITIONS
   Filter by subscription.conditions.payload

5. READ WORKFLOW
   Get workflow.productionWebhookUrl

6. POST TO WEBHOOK
   POST https://n8n.../webhook/abc123
   Body: payload

7. WORKFLOW EXECUTES
   n8n processes workflow
```

---

### ResumeUrl Pattern (Wait Nodes)

```
SETUP PHASE:
1. WORKFLOW HITS WAIT NODE
   Wait node transformation creates waitExecution

2. SAVE WAIT EXECUTION
   waitExecution: {
     workflowId: 'wf_123',
     executionId: 'exec_789',
     milestone: '1_hour_before',
     eventId: 'evt_456',
     resumeUrl: 'https://n8n.../resume-xyz',
     status: 'waiting'
   }

TRIGGER PHASE:
3. EVENT OCCURS
   Calendar milestone reached

4. HANDLER CALLS executeTrigger()
   executeTrigger({
     tenantId: 'ten_123',
     triggerType: 'event.lifecycle.milestone.wait.v1',
     payload: {
       milestone: '1_hour_before',
       eventId: 'evt_456'
     }
   })

5. DETECT usesResumeUrl: true
   Check event metadata

6. QUERY waitExecutions
   Find by: workflowId + milestone + eventId

7. POST TO RESUMEURL
   POST https://n8n.../resume-xyz
   Body: payload

8. MARK RESUMED
   waitExecution.status = 'resumed'

9. WORKFLOW CONTINUES
   n8n resumes from wait node
```

---

## CRUD Operations

### Create

**File:** `triggerSubscriptionManager/createSubscription.ts:18-96`

```typescript
const subscription = await createSubscription(tenantId, {
  workflowId: 'wf_abc',
  triggerType: 'sms.received.v1',
  enabled: true,
  conditions: {
    payload: {
      "mediaCount": { "$eq": 0 }
    }
  }
});
```

**Validation:**
- ✅ workflowId exists
- ✅ triggerType valid (not deprecated)
- ✅ No existing subscription (1:1 constraint)

### Read

```typescript
const subscription = await readSubscription(tenantId, subscriptionId);
```

### Update

```typescript
await updateSubscription(tenantId, subscriptionId, {
  enabled: false,
  priority: 200
});
```

**Immutable fields:** `triggerType`, `workflowId`

### Delete

```typescript
await deleteSubscription(tenantId, subscriptionId);
```

### Query

```typescript
const result = await getSubscriptions(tenantId, {
  triggerType: 'sms.received.v1',
  enabled: true
});
```

---

## Related Docs

- [event-registration.md](./event-registration.md) - Register event types
- [conditional-filtering.md](./conditional-filtering.md) - Filter subscriptions
