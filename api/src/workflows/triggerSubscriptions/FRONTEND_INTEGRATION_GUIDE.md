# Frontend Integration Guide: Trigger Subscription Filtering

## Overview

When a user saves a workflow with a trigger node, the frontend must create a trigger subscription that includes **filtering conditions** based on the node's configuration parameters. This prevents workflows from firing on every single event of that type.

---

## The Problem (Before This Update)

**User creates workflow:**
```
[Trigger: Event Lifecycle Milestone]
  - milestoneFilter: "1_hour_before"
  - eventTypeFilter: "meeting"
  → [Send SMS: "Your meeting is in 1 hour"]
```

**Frontend creates subscription WITHOUT conditions:**
```json
POST /api/workflows/trigger-subscriptions
{
  "workflowId": "workflow-abc",
  "triggerType": "event.lifecycle.milestone.v1"
}
```

**Result:** Workflow fires on **ALL milestones** (30_minutes_before, event_created, event_completed, etc.) ❌

---

## The Solution (After This Update)

### **Option 1: Send Node Parameters (Recommended)**

Backend automatically converts node parameters to conditions.

**Frontend sends:**
```json
POST /api/workflows/trigger-subscriptions
{
  "workflowId": "workflow-abc",
  "triggerType": "event.lifecycle.milestone.v1",
  "nodeParameters": {
    "milestoneFilter": "1_hour_before",
    "eventTypeFilter": "meeting"
  }
}
```

**Backend auto-generates:**
```json
{
  "conditions": {
    "payload": {
      "milestone": { "$eq": "1_hour_before" },
      "eventData.eventType": { "$eq": "meeting" }
    }
  }
}
```

**Result:** Workflow fires **ONLY on "1_hour_before" milestones for meeting events** ✅

---

### **Option 2: Manually Specify Conditions**

Frontend builds conditions itself.

**Frontend sends:**
```json
POST /api/workflows/trigger-subscriptions
{
  "workflowId": "workflow-abc",
  "triggerType": "event.lifecycle.milestone.v1",
  "conditions": {
    "payload": {
      "milestone": { "$eq": "1_hour_before" },
      "eventData.eventType": { "$eq": "meeting" }
    }
  }
}
```

**Result:** Same as Option 1 ✅

---

## Frontend Implementation

### **Step 1: Extract Trigger Node Configuration**

When user saves workflow, find the trigger node and extract its parameters:

```typescript
// Example: React workflow save handler
const saveWorkflow = async () => {
  const triggerNode = nodes.find(n => n.data?.nodeName?.endsWith('Trigger'));

  if (!triggerNode) {
    throw new Error('No trigger node found');
  }

  // Extract trigger type and node parameters
  const triggerType = triggerNode.data.config?._pulseline?.triggerType;
  const nodeParameters = triggerNode.data.parameters || {};

  console.log('Trigger Type:', triggerType);
  console.log('Node Parameters:', nodeParameters);
  // Example output:
  // Trigger Type: event.lifecycle.milestone.v1
  // Node Parameters: { milestoneFilter: "1_hour_before", eventTypeFilter: "meeting" }
};
```

---

### **Step 2: Create Trigger Subscription with Node Parameters**

```typescript
const createTriggerSubscription = async (
  workflowId: string,
  triggerType: string,
  nodeParameters: Record<string, any>
) => {
  const response = await fetch('/api/workflows/trigger-subscriptions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      workflowId,
      triggerType,
      nodeParameters,  // ← Backend converts to conditions.payload
      enabled: true
    })
  });

  if (!response.ok) {
    throw new Error('Failed to create trigger subscription');
  }

  const subscription = await response.json();
  console.log('Created subscription:', subscription.data);
  // Output: { id: "01ABC123", conditions: { payload: { milestone: { $eq: "1_hour_before" }, ... } } }
};
```

---

### **Step 3: Complete Workflow Save Flow**

```typescript
const saveWorkflowComplete = async () => {
  // 1. Save workflow document
  const workflow = await saveWorkflowToFirestore({
    name: workflowName,
    nodes: reactFlowNodes,
    edges: reactFlowEdges,
    isPublic: true  // Must be public to sync to n8n
  });

  // 2. Extract trigger node configuration
  const triggerNode = reactFlowNodes.find(n =>
    n.data?.config?._pulseline?.isTrigger === true
  );

  if (!triggerNode) {
    console.log('No trigger node - skipping subscription creation');
    return workflow;
  }

  const triggerType = triggerNode.data.config._pulseline.triggerType;
  const nodeParameters = triggerNode.data.parameters || {};

  // 3. Create or update trigger subscription
  try {
    // Check if subscription already exists (1:1 workflow-subscription relationship)
    const existingSubscriptions = await fetch(
      `/api/workflows/trigger-subscriptions?workflowId=${workflow.id}`,
      { headers: { 'Authorization': `Bearer ${apiKey}` } }
    );

    const subs = await existingSubscriptions.json();

    if (subs.data && subs.data.length > 0) {
      // Update existing subscription
      const subscriptionId = subs.data[0].id;

      await fetch(`/api/workflows/trigger-subscriptions/${subscriptionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          enabled: true,
          // NOTE: PUT endpoint doesn't support nodeParameters yet
          // Need to manually build conditions or delete + recreate
        })
      });
    } else {
      // Create new subscription
      await createTriggerSubscription(workflow.id, triggerType, nodeParameters);
    }
  } catch (error) {
    console.error('Failed to create/update trigger subscription:', error);
    throw error;
  }

  return workflow;
};
```

---

## Supported Trigger Types

### **1. Event Lifecycle Milestone (`event.lifecycle.milestone.v1`)**

**Node Parameters:**
- `milestoneFilter`: string - Which milestone to trigger on
  - Values: "all", "event_created", "1_hour_before", "30_minutes_before", "event_completed", etc.
- `eventTypeFilter`: string - Which event types to trigger on
  - Values: "all", "meeting", "call", "video", "appointment", etc.

**Auto-Generated Conditions:**
```typescript
{
  "milestone": { "$eq": "1_hour_before" },          // if milestoneFilter !== "all"
  "eventData.eventType": { "$eq": "meeting" }       // if eventTypeFilter !== "all"
}
```

---

### **2. SMS Received (`sms.received.v1`)**

**Node Parameters:**
- `hasMedia`: boolean - Filter for messages with/without media
- `fromNumber`: string - Filter by specific phone number

**Auto-Generated Conditions:**
```typescript
{
  "mediaCount": { "$gt": 0 },  // if hasMedia === true
  "from": { "$eq": "+1234567890" }  // if fromNumber provided
}
```

---

### **3. Phone Call Completed (`phone.call.completed.v1`)**

**Node Parameters:**
- `callStatus`: string - Filter by call status
  - Values: "all", "completed", "no-answer", "busy", "failed"
- `minDuration`: number - Minimum call duration in seconds

**Auto-Generated Conditions:**
```typescript
{
  "callStatus": { "$eq": "completed" },  // if callStatus !== "all"
  "duration": { "$gte": 60 }  // if minDuration > 0
}
```

---

## Special Case: "All" Filter Values

When a filter is set to "all", no condition is generated for that field.

**Example:**
```json
{
  "nodeParameters": {
    "milestoneFilter": "all",           // No condition generated
    "eventTypeFilter": "meeting"        // Generates: eventData.eventType = "meeting"
  }
}
```

**Result:**
- Triggers on **all milestones** for **meeting events only**

---

## Updating Existing Subscriptions

**Important:** The PUT endpoint (`PUT /api/workflows/trigger-subscriptions/:id`) does NOT currently support `nodeParameters`.

**Workaround:**
1. DELETE old subscription
2. CREATE new subscription with updated nodeParameters

```typescript
const updateTriggerSubscription = async (
  workflowId: string,
  triggerType: string,
  nodeParameters: Record<string, any>
) => {
  // 1. Find existing subscription
  const response = await fetch(
    `/api/workflows/trigger-subscriptions?workflowId=${workflowId}`,
    { headers: { 'Authorization': `Bearer ${apiKey}` } }
  );
  const subs = await response.json();

  // 2. Delete if exists
  if (subs.data && subs.data.length > 0) {
    const subscriptionId = subs.data[0].id;
    await fetch(`/api/workflows/trigger-subscriptions/${subscriptionId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
  }

  // 3. Create new with updated parameters
  await createTriggerSubscription(workflowId, triggerType, nodeParameters);
};
```

---

## Testing

### **Test 1: Verify Condition Generation**

```bash
curl -X POST http://localhost:8000/api/workflows/trigger-subscriptions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "workflowId": "test-workflow-123",
    "triggerType": "event.lifecycle.milestone.v1",
    "nodeParameters": {
      "milestoneFilter": "1_hour_before",
      "eventTypeFilter": "meeting"
    }
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": "01ABCD...",
    "workflowId": "test-workflow-123",
    "triggerType": "event.lifecycle.milestone.v1",
    "conditions": {
      "payload": {
        "milestone": { "$eq": "1_hour_before" },
        "eventData.eventType": { "$eq": "meeting" }
      }
    },
    "enabled": true
  }
}
```

**Backend Logs:**
```
📋 Building conditions from node parameters for event.lifecycle.milestone.v1...
   ✅ Built conditions: {
  "milestone": { "$eq": "1_hour_before" },
  "eventData.eventType": { "$eq": "meeting" }
}
✅ Created trigger subscription: 01ABCD... (event.lifecycle.milestone.v1) for workflow test-workflow-123
```

---

### **Test 2: Verify Filtering Works**

1. Create subscription with `milestoneFilter: "1_hour_before"`
2. Trigger milestone event with `milestone: "30_minutes_before"`
3. Verify workflow does **NOT** execute

**Backend Logs:**
```
📋 Fetching subscriptions for triggerType: event.lifecycle.milestone.v1
✅ Found 1 active subscription(s)
🔍 Filtering subscriptions based on payload conditions...
✅ Filtered to 0 matching subscription(s)
   ⊘ Excluded 1 subscription(s) due to condition mismatch
```

---

## Summary

✅ **Backend Changes Complete:**
- Created `buildSubscriptionConditions()` utility
- Updated `CreateSubscriptionInput` to accept `nodeParameters`
- Updated `createSubscription()` to auto-generate conditions from node parameters
- Updated API documentation

❌ **Frontend Changes Needed:**
- Extract trigger node parameters when saving workflow
- Send `nodeParameters` field when creating trigger subscriptions
- Handle subscription updates (delete + recreate pattern)

**Next Steps:**
1. Update frontend workflow save logic to extract `nodeParameters` from trigger node
2. Send `nodeParameters` in POST /api/workflows/trigger-subscriptions request
3. Test with different milestone/eventType combinations
4. Verify subscriptions only fire for matching conditions
