# Quick Problem Solving

> Symptom → System → Fix guide for common workflow issues

---

## How to Use This Guide

1. **Find your symptom** in the table of contents
2. **Identify the system** causing the issue
3. **Follow the debug steps** to diagnose
4. **Apply the fix** from the solution section

---

## Table of Contents

### Workflow Deployment Issues
- [Workflow saves but doesn't deploy to n8n](#workflow-saves-but-doesnt-deploy-to-n8n)
- [Transformation fails during deployment](#transformation-fails-during-deployment)
- [Node missing transformation method](#node-missing-transformation-method)
- [Webhook URL not generated](#webhook-url-not-generated)

### Trigger Execution Issues
- [Workflow not triggering on events](#workflow-not-triggering-on-events)
- [Trigger subscription not created](#trigger-subscription-not-created)
- [Event occurs but workflow doesn't execute](#event-occurs-but-workflow-doesnt-execute)
- [Multiple workflows triggering for one event](#multiple-workflows-triggering-for-one-event)

### Field Mapping Issues
- [Fields not showing in dropdown](#fields-not-showing-in-dropdown)
- [Field expressions not resolving](#field-expressions-not-resolving)
- [Custom fields showing as literal strings](#custom-fields-showing-as-literal-strings)

### n8n Integration Issues
- [n8n workflow not activating](#n8n-workflow-not-activating)
- [Webhook returns 404](#webhook-returns-404)
- [Workflow executes but fails](#workflow-executes-but-fails)

---

## Workflow Deployment Issues

### Workflow saves but doesn't deploy to n8n

**Symptom:**
- Frontend shows "Workflow saved"
- No webhook URL returned
- Workflow not visible in n8n

**System:** Frontend-Backend Integration

**Debug Steps:**

1. **Check `isPublic` flag**
   ```typescript
   // In frontend request
   const requestBody = {
     name: "My Workflow",
     nodes: [...],
     edges: [...],
     isPublic: ???  // ← Should be true for deployment
   };
   ```

2. **Check backend logs**
   ```bash
   # Look for this log
   "🚀 Syncing workflow to n8n (isPublic=true)"

   # If you see this instead:
   "📝 Draft mode - skipping n8n sync"
   # → isPublic is false
   ```

**Solution:**

Frontend must send `isPublic: true`:
```typescript
// Frontend: Deploy workflow
async function deployWorkflow() {
  const response = await fetch(`/api/workflows/${workflowId}`, {
    method: 'PUT',
    body: JSON.stringify({
      name: workflowName,
      nodes: nodes,
      edges: edges,
      isPublic: true  // ← Required for n8n deployment
    })
  });
}
```

**Fix Location:** Frontend deployment logic

---

### Transformation fails during deployment

**Symptom:**
- Error during save: "Transformation failed"
- Backend logs show transformation errors
- Workflow saved locally but not deployed

**System:** Transformation System

**Debug Steps:**

1. **Check backend logs for specific error**
   ```bash
   # Look for transformation phase errors
   "❌ Phase 1: Planning failed"
   "❌ Phase 2: Compilation failed"
   ```

2. **Common transformation errors:**
   - **"Node config not found"** → Node not registered in Node Registry
   - **"Transformation method not found"** → Method not registered in Transformation Registry
   - **"Invalid field expression"** → Field mapping syntax error

3. **Verify all nodes have configs**
   ```bash
   # Check Node Registry
   GET /api/workflows/nodes

   # Verify your node type is listed
   ```

**Solution:**

**If node config missing:**
```typescript
// 1. Create node config
// File: nodeRegistry/nodes/{category}/{nodeName}.config.ts
export const myNode: INodeTypeDescription = {
  name: 'myNode',
  _pulseline: {
    transformationMethod: 'my_transformation_method'
  },
  properties: [...]
};

// 2. Register in nodeRegistry/index.ts
import { myNode } from './nodes/{category}/myNode.config';
export const nodeRegistry = {
  'myNode': myNode,
};
```

**If transformation method missing:**
```typescript
// 1. Create transformation method
// File: transformationMethodRegistry/methods/my_transformation_method.ts
export const my_transformation_method: TransformationMethod = async (node, ctx) => {
  return {
    name: node.id,
    type: 'n8n-nodes-base.httpRequest',
    parameters: {...}
  };
};

// 2. Register in transformationMethodRegistry/index.ts
TransformationRegistry.registerMethod('my_transformation_method', my_transformation_method);
```

**Fix Location:** Node Registry + Transformation Registry

---

### Node missing transformation method

**Symptom:**
- Error: "Transformation method not found: undefined"
- Specific node fails to transform

**System:** Node Registry + Transformation System

**Debug Steps:**

1. **Check node config**
   ```typescript
   // Read node config
   GET /api/workflows/nodes/{nodeName}

   // Verify _pulseline.transformationMethod exists
   ```

2. **Check transformation registry**
   ```bash
   # Backend logs should show registered methods on startup
   "📋 Registered transformation methods: 45"
   ```

**Solution:**

Add transformation method to node config:
```typescript
// File: nodeRegistry/nodes/{category}/{nodeName}.config.ts
export const myNode: INodeTypeDescription = {
  name: 'myNode',
  _pulseline: {
    transformationMethod: 'my_transformation_method'  // ← Add this
  },
  properties: [...]
};
```

Create and register transformation method:
```typescript
// File: transformationMethodRegistry/methods/my_transformation_method.ts
export const my_transformation_method: TransformationMethod = async (node, ctx) => {
  return {
    name: node.id,
    type: 'n8n-nodes-base.httpRequest',
    parameters: {
      url: node.data.parameters.url,
      method: node.data.parameters.method
    }
  };
};

// Register in transformationMethodRegistry/index.ts
import { my_transformation_method } from './methods/my_transformation_method';
TransformationRegistry.registerMethod('my_transformation_method', my_transformation_method);
```

**Fix Location:** `nodeRegistry/nodes/{category}/{nodeName}.config.ts` + `transformationMethodRegistry/methods/`

---

### Webhook URL not generated

**Symptom:**
- Workflow deployed but no webhook URL in response
- `triggers` array empty or missing

**System:** n8n Integration

**Debug Steps:**

1. **Check if workflow activated in n8n**
   ```bash
   # Backend logs
   "🟢 Activated n8n workflow 123"
   # OR
   "⚠️  Failed to activate workflow"
   ```

2. **Check n8n config in Firestore**
   ```bash
   # Read n8n config
   /tenants/{tenantId}/workflows/{workflowId}/n8n/config

   # Should contain:
   {
     n8nWorkflowId: '123',
     triggers: [
       {
         url: 'https://n8n.../webhook/...'
       }
     ]
   }
   ```

3. **Verify trigger node has stable webhook ID**
   ```typescript
   // Check trigger node parameters
   triggerNode.data.parameters.path
   // Should be a UUID: 'abc-def-123'
   // Should NOT be null or undefined
   ```

**Solution:**

Ensure trigger node has `path` parameter:
```typescript
// File: workflowCrudManager/updateWorkflow.ts
// ensureWebhookIds() should mint UUID for trigger nodes

// If missing, manually verify:
const ensureWebhookIds = (nodes: any[]): any[] => {
  for (const node of nodes) {
    const config = NodeRegistry.getNodeConfig(node.type);
    const isTrigger = config?._pulseline?.isTrigger;

    if (isTrigger && !node.data.parameters.path) {
      node.data.parameters.path = randomUUID();  // Mint UUID
    }
  }
  return nodes;
};
```

**Fix Location:** `workflowCrudManager/updateWorkflow.ts:21-46`

---

## Trigger Execution Issues

### Workflow not triggering on events

**Symptom:**
- External event occurs (SMS, call, etc.)
- Workflow doesn't execute
- No errors in logs

**System:** Trigger Subscriptions

**Debug Steps:**

1. **Check if subscription exists**
   ```bash
   GET /api/workflows/trigger-subscriptions?workflowId=wf_123

   # Should return at least one subscription
   ```

2. **Check subscription enabled**
   ```json
   {
     "id": "sub_xyz",
     "workflowId": "wf_123",
     "triggerType": "sms.received.v1",
     "enabled": true  // ← Must be true
   }
   ```

3. **Check trigger type matches**
   ```typescript
   // Event handler calls:
   executeTrigger({ triggerType: 'sms.received.v1' })

   // Subscription must have:
   subscription.triggerType === 'sms.received.v1'
   ```

4. **Check webhook URL exists**
   ```bash
   # Read n8n config
   /tenants/{tenantId}/workflows/{workflowId}/n8n/config

   # Verify triggers[0].url exists
   ```

**Solution:**

**If subscription missing:**
- Workflow may not have trigger node
- Trigger node missing `_pulseline.triggerType`
- Subscription creation failed during deployment

**Fix:** Re-deploy workflow with trigger node:
```typescript
// Ensure trigger node has triggerType
const triggerNode = {
  type: 'smsReceivedTrigger',  // Node config must have _pulseline.triggerType
  data: {
    parameters: { path: 'uuid-here' }
  }
};
```

**If subscription disabled:**
```bash
PUT /api/workflows/trigger-subscriptions/{subscriptionId}
{
  "enabled": true
}
```

**If webhook URL missing:**
- Re-deploy workflow with `isPublic: true`

**Fix Location:** Multiple (subscription creation, workflow deployment)

---

### Trigger subscription not created

**Symptom:**
- Workflow deployed successfully
- No trigger subscription in database
- Query returns empty array

**System:** Trigger Subscriptions + Node Registry

**Debug Steps:**

1. **Check if workflow has trigger node**
   ```typescript
   // Workflow nodes should include:
   {
     type: 'smsReceivedTrigger',  // Or other trigger type
     data: { ... }
   }
   ```

2. **Check trigger node config**
   ```bash
   GET /api/workflows/nodes/smsReceivedTrigger

   # Verify _pulseline.isTrigger = true
   # Verify _pulseline.triggerType exists
   ```

3. **Check backend logs during deployment**
   ```bash
   # Should see:
   "🔔 Trigger node detected: smsReceivedTrigger"
   "🔔 Trigger type: sms.received.v1"
   "➕ Creating trigger subscription..."
   "✅ Subscription created successfully"

   # If missing, subscription creation was skipped
   ```

**Solution:**

Ensure trigger node has correct metadata:
```typescript
// File: nodeRegistry/nodes/trigger/smsReceivedTrigger.config.ts
export const smsReceivedTriggerNode: INodeTypeDescription = {
  name: 'smsReceivedTrigger',
  _pulseline: {
    isTrigger: true,                    // ← Required
    triggerType: 'sms.received.v1',     // ← Required
    transformationMethod: 'trigger_webhook'
  },
  properties: [...]
};
```

If trigger node config is correct, manually create subscription:
```bash
POST /api/workflows/trigger-subscriptions
{
  "workflowId": "wf_123",
  "triggerType": "sms.received.v1",
  "enabled": true
}
```

**Fix Location:** `nodeRegistry/nodes/trigger/{triggerName}.config.ts`

---

### Event occurs but workflow doesn't execute

**Symptom:**
- Event handler logs show event received
- `executeTrigger()` called
- Workflow doesn't execute

**System:** Trigger Execution Engine

**Debug Steps:**

1. **Check executeTrigger logs**
   ```bash
   # Should see:
   "🎯 ========== TRIGGER EXECUTION =========="
   "📋 Found X active subscriptions"

   # If X = 0:
   # → No subscriptions match (disabled or wrong triggerType)
   ```

2. **Check subscription conditions**
   ```json
   {
     "conditions": {
       "payload": {
         "mediaCount": { "$gt": 0 }
       }
     }
   }
   ```

   If conditions exist, payload must match:
   ```json
   {
     "mediaCount": 2  // ✅ 2 > 0, matches
   }
   ```

3. **Test webhook URL directly**
   ```bash
   # Bypass trigger system, POST directly to webhook
   curl -X POST https://n8n.example.com/webhook/abc-def-123 \
     -H "Content-Type: application/json" \
     -d '{"test": true}'

   # If workflow executes:
   # → Trigger system issue

   # If workflow doesn't execute:
   # → n8n issue
   ```

**Solution:**

**If no subscriptions found:**
- Check subscription enabled: `subscription.enabled === true`
- Check triggerType matches event: `subscription.triggerType === 'sms.received.v1'`

**If subscription has conditions:**
- Test payload against conditions:
  ```typescript
  import { evaluateConditions } from './evaluateConditions';

  const match = evaluateConditions(
    { "mediaCount": { "$gt": 0 } },
    { mediaCount: 0 }
  );
  // Returns: false (0 is not > 0)
  ```

- Remove conditions or adjust payload

**If webhook POST fails:**
- Check n8n workflow is active
- Check webhook URL is correct
- Check n8n server is running

**Fix Location:** Subscription conditions or n8n configuration

---

### Multiple workflows triggering for one event

**Symptom:**
- One SMS triggers multiple workflows
- Unexpected workflow executions

**System:** Trigger Subscriptions

**Debug Steps:**

1. **List all subscriptions for event type**
   ```bash
   GET /api/workflows/trigger-subscriptions?triggerType=sms.received.v1

   # Check how many subscriptions returned
   ```

2. **Check subscription conditions**
   - Multiple subscriptions may match same event
   - Check if conditions overlap

**Solution:**

**If multiple workflows should trigger:**
- This is expected behavior (multiple subscribers to same event)

**If only one workflow should trigger:**
- Add conditions to filter subscriptions:
  ```json
  {
    "workflowId": "wf_123",
    "conditions": {
      "payload": {
        "from": { "$eq": "+15551234567" }  // Only this phone number
      }
    }
  }
  ```

- Or disable unwanted subscriptions:
  ```bash
  PUT /api/workflows/trigger-subscriptions/{subscriptionId}
  {
    "enabled": false
  }
  ```

**Fix Location:** Subscription conditions

---

## Field Mapping Issues

### Fields not showing in dropdown

**Symptom:**
- Field mapping dropdown is empty
- "No fields available" message

**System:** Field Mapping

**Debug Steps:**

1. **Check if test payload was sent**
   ```bash
   # Read field mapping data
   GET /tenants/{tenantId}/workflows/{workflowId}/fieldMappingData/{nodeId}

   # Should contain:
   {
     availableFields: [...],
     testPayload: {...}
   }
   ```

2. **If no field mapping data:**
   - User never sent test data to trigger
   - Test payload API call failed

**Solution:**

Send test payload to trigger node:
```typescript
// Frontend: Send test data
await fetch(`/api/workflows/${workflowId}/set-field-mapping`, {
  method: 'POST',
  body: JSON.stringify({
    nodeId: 'trigger_node_id',
    testPayload: {
      from: '+15551234567',
      body: 'Test message',
      contact: {
        name: 'John Doe',
        email: 'john@example.com'
      }
    }
  })
});
```

This will extract and store available fields:
```json
{
  "availableFields": [
    { "path": "from", "type": "string" },
    { "path": "body", "type": "string" },
    { "path": "contact.name", "type": "string" },
    { "path": "contact.email", "type": "string" }
  ]
}
```

**Fix Location:** Frontend trigger node test data feature

---

### Field expressions not resolving

**Symptom:**
- Field expression in ReactFlow: `={{ $json['from'] }}`
- n8n node shows literal: `={{ $json['from'] }}` (not resolved)

**System:** Transformation System (Custom Field Resolution)

**Debug Steps:**

1. **Check transformation logs**
   ```bash
   # Should see:
   "🔍 Resolving custom field: ={{ $json['from'] }}"
   "✅ Resolved to: ={{ $node['SMS Received'].json['from'] }}"

   # If not seen:
   # → Custom field resolution not running
   ```

2. **Check field mapping data exists**
   ```bash
   # Read field mapping data
   /workflows/{workflowId}/fieldMappingData/{nodeId}
   ```

**Solution:**

Ensure `resolveCustomFields()` is called during transformation:
```typescript
// File: transformationMethodRegistry/methods/{method}.ts

// In transformation method:
const resolvedParameters = await resolveCustomFields(
  node.data.parameters,
  tenantId,
  workflowId
);

return {
  name: node.id,
  type: 'n8n-nodes-base.twilio',
  parameters: resolvedParameters  // ← Use resolved parameters
};
```

**Fix Location:** Transformation method implementation

---

### Custom fields showing as literal strings

**Symptom:**
- Workflow executes
- Field shows literal: `{{ $json['from'] }}` in output
- Expected: Actual phone number

**System:** n8n Expression Evaluation

**Debug Steps:**

1. **Check expression syntax**
   ```typescript
   // ReactFlow (custom syntax):
   "={{ $json['from'] }}"

   // Should transform to (n8n syntax):
   "={{ $node['Trigger Node Name'].json['from'] }}"
   ```

2. **Check node name matches**
   - n8n expression references node by NAME
   - Node name must match transformed node name

**Solution:**

Verify transformed node name matches expression:
```typescript
// Transformation creates node with name:
{
  name: 'SMS Received',  // ← This name
  type: 'n8n-nodes-base.webhook'
}

// Expression must reference this name:
"={{ $node['SMS Received'].json['from'] }}"
//         ^^^^^^^^^^^^^^ Must match exactly
```

If node name changes, expressions break. Ensure consistent node naming.

**Fix Location:** Transformation method node naming

---

## n8n Integration Issues

### n8n workflow not activating

**Symptom:**
- Workflow created in n8n
- Workflow status: "Inactive"
- Webhook doesn't work

**System:** n8n Integration

**Debug Steps:**

1. **Check activation logs**
   ```bash
   # Should see:
   "🟢 Activated n8n workflow 123"

   # If error:
   "⚠️  Failed to activate workflow"
   ```

2. **Check n8n API response**
   - n8n may reject activation if workflow has errors
   - Check n8n UI for validation errors

**Solution:**

Manually activate in n8n:
```bash
# Via API
POST https://n8n.example.com/api/v1/workflows/123/activate
Authorization: Bearer {n8n_api_key}
```

Or via n8n UI:
- Open workflow in n8n
- Click "Active" toggle
- Check for validation errors

**Fix Location:** n8n configuration or workflow validation

---

### Webhook returns 404

**Symptom:**
- POST to webhook URL returns 404
- Workflow doesn't execute

**System:** n8n Webhooks

**Debug Steps:**

1. **Verify workflow is active in n8n**
   ```bash
   GET https://n8n.example.com/api/v1/workflows/123

   # Check: "active": true
   ```

2. **Verify webhook path matches**
   ```typescript
   // Stored webhook URL:
   "https://n8n.example.com/webhook/abc-def-123"

   // Trigger node path parameter:
   triggerNode.data.parameters.path === 'abc-def-123'

   // Must match exactly
   ```

3. **Check n8n webhook configuration**
   - n8n webhook node may have path restrictions
   - Check webhook node settings in n8n UI

**Solution:**

Ensure webhook path is stable:
```typescript
// File: workflowCrudManager/updateWorkflow.ts
// ensureWebhookIds() mints stable UUID

// Verify trigger node has path:
if (!node.data.parameters.path) {
  node.data.parameters.path = randomUUID();
}
```

If path changes, webhook URL changes → update subscription.

**Fix Location:** Webhook path stability

---

### Workflow executes but fails

**Symptom:**
- Webhook receives payload successfully
- Workflow execution starts
- Workflow fails during execution

**System:** n8n Workflow Execution

**Debug Steps:**

1. **Check n8n execution logs**
   - Open n8n UI → Executions
   - Find failed execution
   - Check which node failed

2. **Common failure reasons:**
   - **Missing credentials** → API key not configured
   - **Invalid parameters** → Field expression didn't resolve
   - **Rate limit** → API rate limit exceeded
   - **Network error** → Can't reach external API

**Solution:**

**If missing credentials:**
```typescript
// Ensure injectAuthenticationKey() adds credentials
const nodesWithAuth = injectAuthenticationKey(compiledNodes, accountApiKey);
```

**If invalid parameters:**
- Check field mapping resolution
- Test expressions in n8n UI

**If external API error:**
- Check API credentials
- Check API rate limits
- Check API endpoint availability

**Fix Location:** n8n workflow configuration or external API

---

## Quick Reference

### Debug Command Checklist

```bash
# 1. Check workflow exists
GET /api/workflows/{workflowId}

# 2. Check workflow deployed to n8n
GET /tenants/{tenantId}/workflows/{workflowId}/n8n/config

# 3. Check trigger subscription exists
GET /api/workflows/trigger-subscriptions?workflowId={workflowId}

# 4. Check subscription enabled
# Response: { enabled: true }

# 5. Check webhook URL exists
# Response: { triggers: [{ url: '...' }] }

# 6. Test webhook directly
curl -X POST {webhook_url} -d '{"test": true}'

# 7. Check field mapping data
GET /tenants/{tenantId}/workflows/{workflowId}/fieldMappingData/{nodeId}

# 8. Check available nodes
GET /api/workflows/nodes

# 9. Check node config
GET /api/workflows/nodes/{nodeName}

# 10. Manually execute trigger
POST /api/workflows/trigger-subscriptions/execute
{
  "triggerType": "sms.received.v1",
  "payload": {...}
}
```

---

## System Health Checklist

### Before Deployment
- [ ] All nodes have registered configs in Node Registry
- [ ] All nodes have transformation methods in Transformation Registry
- [ ] Trigger nodes have `_pulseline.isTrigger = true`
- [ ] Trigger nodes have `_pulseline.triggerType` matching event registry
- [ ] Test payload sent to trigger nodes

### After Deployment
- [ ] Workflow saved with `isPublic = true`
- [ ] n8n workflow created (check n8nWorkflowId in Firestore)
- [ ] n8n workflow activated (check `active: true` in n8n)
- [ ] Webhook URL generated (check `/n8n/config` subcollection)
- [ ] Trigger subscription created (if has trigger node)
- [ ] Subscription enabled (check `enabled: true`)

### Before Event Testing
- [ ] Subscription exists for workflow
- [ ] Subscription triggerType matches event type
- [ ] Subscription enabled
- [ ] Webhook URL accessible (test with curl)
- [ ] n8n workflow active

---

## Related Docs

- **[README.md](./README.md)** - System integration overview
- **[END-TO-END-FLOW.md](./END-TO-END-FLOW.md)** - Complete flow walkthrough
- **[patterns/frontend-backend.md](./patterns/frontend-backend.md)** - Frontend integration
- **[patterns/trigger-integration.md](./patterns/trigger-integration.md)** - Trigger system details
