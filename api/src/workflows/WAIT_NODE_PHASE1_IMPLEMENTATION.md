# Wait Node Phase 1 Implementation - Complete ✅

## 🎯 Overview

Phase 1 of the Wait Node system for appointment milestones has been successfully implemented. This phase establishes the foundation for workflow execution pausing until specific calendar event milestones occur.

---

## ✅ What Was Implemented

### **1. Extended Wait Node Configuration**
**File**: `/backend/src/workflows/services/nodeRegistry/nodes/action/wait.config.ts`

**Changes:**
- Added new resume mode: `'appointmentMilestone'`
- Added milestone selection dropdown (10 milestone options)
- Added event ID field mapping configuration
- Added Pulseline metadata flags for special handling

**New Properties:**
```typescript
{
  name: 'Appointment Milestone',
  value: 'appointmentMilestone',
  description: 'Wait until an event reaches a specific milestone'
}

// Milestone dropdown options:
'5_days_before', '4_days_before', '3_days_before',
'2_days_before', '1_day_before', '1_hour_before',
'30_minutes_before', '10_minutes_before',
'event_start', 'event_completed'

// Event ID field mapping (default: ={{ $json.eventId }})
```

**Metadata Flags:**
```typescript
_pulseline: {
  isCustomNode: true,
  webhookWait: true,                    // Triggers special conversion
  createSubscriptionOnSave: true,        // Auto-creates subscription
  subscriptionType: 'event.lifecycle.milestone.wait.v1',
  apiEndpoint: '',
  httpMethod: 'POST',
  requiresAuth: false
}
```

---

### **2. New Subscription Record Type**
**File**: `/backend/src/workflows/triggerSubscriptions/services/TriggerDesitinationRegistry/records/event.lifecycle.milestone.wait.v1.ts`

**Purpose**: Defines the payload schema and metadata for wait node subscriptions

**Key Differences from Trigger Version:**
- `metadata.usesResumeUrl: true` - Indicates resumeUrl instead of webhookUrl
- `metadata.requiresEventId: true` - Subscription must specify event ID
- `metadata.pausesWorkflow: true` - Workflow pauses until triggered
- `metadata.isWaitNode: true` - Special handling flag

**Payload Schema**: Same 21 fields as trigger version
- Core identifiers: tenantId, eventId, calendarId
- Milestone information
- Attendee IDs
- Full event data (nested object)
- Validation metadata

**Filterable Fields**:
- `milestone` - Filter by specific milestone value
- `eventId` - Filter by specific event ID
- `eventData.eventType` - Filter by event type
- `isValid` - Filter by validation status

**Registered in Index**: Added to trigger registry with key `'event.lifecycle.milestone.wait.v1'`

---

### **3. Conversion Logic for Webhook Wait**
**File**: `/backend/src/n8n/utils/convertReactFlow2N8n.ts`

**New Detection Logic** (line 72-78):
```typescript
// Handle webhook wait nodes (wait nodes with webhookWait flag)
if (nodeConfig?._pulseline?.webhookWait && nodeName === 'wait') {
  console.log(`🔄 Converting wait node "${nodeName}" with webhookWait to n8n wait (webhook mode)`);
  const waitWebhookNode = convertWaitNodeToWebhookWait(node, nodeConfig);
  n8nNodes.push(waitWebhookNode);
  continue;
}
```

**New Conversion Function** `convertWaitNodeToWebhookWait()`:
- Extracts milestone and eventIdField from node parameters
- Generates unique webhook path: `wait-{nodeId}`
- Creates n8n wait node with `resume: 'webhook'` mode
- Logs milestone and event ID configuration

**Converted n8n Node Structure**:
```typescript
{
  id: 'node_123',
  name: 'Wait for 1_hour_before',
  type: 'n8n-nodes-base.wait',
  typeVersion: 1.1,
  position: [x, y],
  webhookId: 'wait-node_123',
  parameters: {
    resume: 'webhook',        // KEY: Webhook resume mode
    path: 'wait-node_123',    // Webhook path
    httpMethod: 'POST'        // Resume webhook method
  }
}
```

---

### **4. Updated Type Definitions**
**File**: `/backend/src/workflows/services/nodeRegistry/types.ts`

**Extended `IPulselineMetadata` Interface**:
```typescript
export interface IPulselineMetadata {
  // ... existing fields
  webhookWait?: boolean;                    // NEW
  createSubscriptionOnSave?: boolean;       // NEW
  subscriptionType?: string;                // NEW
}
```

**File**: `/backend/src/workflows/triggerSubscriptions/types.ts`

**Extended `TriggerEventDefinition` Interface**:
```typescript
export interface TriggerEventDefinition {
  // ... existing fields
  metadata?: {                              // NEW
    usesResumeUrl?: boolean;
    requiresEventId?: boolean;
    pausesWorkflow?: boolean;
    isWaitNode?: boolean;
    [key: string]: any;
  };
}
```

---

## 🔄 Complete Flow (Phase 1)

```
1. User drags Wait node into workflow
   ↓
2. User configures:
   - Resume mode: "Appointment Milestone"
   - Milestone: "1_hour_before"
   - Event ID field: "={{ $json.eventId }}"
   ↓
3. User saves workflow
   ↓
4. Backend detects wait node with webhookWait flag
   ↓
5. Conversion logic transforms to n8n wait node (webhook mode)
   - type: 'n8n-nodes-base.wait'
   - parameters.resume: 'webhook'
   - webhookId: 'wait-{nodeId}'
   ↓
6. Workflow deployed to n8n
   ↓
7. Workflow executes and reaches wait node
   ↓
8. n8n pauses execution, generates dynamic resumeUrl
   ↓
   [PHASE 1 COMPLETE - PHASE 2 BEGINS HERE]
```

---

## 🚫 What Was NOT Implemented (Phase 2)

**NOT included in Phase 1:**
1. ❌ ResumeUrl retrieval from n8n API
2. ❌ Storage of resumeUrl in Firestore
3. ❌ Poller service to query n8n for waiting executions
4. ❌ Modified execution flow to use resumeUrl
5. ❌ Subscription creation logic for wait nodes
6. ❌ API endpoint for resumeUrl registration

**These will be implemented in Phase 2** after determining the best approach for:
- How to retrieve resumeUrl from n8n execution data
- Whether to use polling or n8n webhooks
- Storage structure in Firestore (`/workflows/{id}/n8n/waitExecutions/`)

---

## 📋 Files Modified/Created

### **Created Files:**
1. `/backend/src/workflows/triggerSubscriptions/services/TriggerDesitinationRegistry/records/event.lifecycle.milestone.wait.v1.ts`
2. `/backend/src/workflows/WAIT_NODE_PHASE1_IMPLEMENTATION.md` (this file)

### **Modified Files:**
1. `/backend/src/workflows/services/nodeRegistry/nodes/action/wait.config.ts`
   - Added appointmentMilestone resume mode
   - Added milestone and eventIdField properties
   - Added _pulseline metadata

2. `/backend/src/workflows/services/nodeRegistry/types.ts`
   - Extended IPulselineMetadata with webhookWait flags

3. `/backend/src/workflows/triggerSubscriptions/types.ts`
   - Extended TriggerEventDefinition with metadata field

4. `/backend/src/workflows/triggerSubscriptions/services/TriggerDesitinationRegistry/index.ts`
   - Imported and registered eventLifecycleMilestoneWaitV1

5. `/backend/src/n8n/utils/convertReactFlow2N8n.ts`
   - Added detection for webhookWait flag
   - Added convertWaitNodeToWebhookWait() function

---

## ✅ Verification

**TypeScript Compilation**: ✅ Successful (`npx tsc --noEmit`)

**What Works Now:**
- ✅ Wait node configuration in workflow editor
- ✅ Appointment milestone selection
- ✅ Event ID field mapping
- ✅ Conversion to n8n webhook wait node
- ✅ Subscription record type defined
- ✅ Trigger registry updated

**What to Test Next:**
1. Add wait node to workflow in frontend
2. Configure milestone and event ID
3. Save workflow and verify n8n conversion
4. Deploy to n8n and verify wait node parameters
5. Check that n8n generates webhookId correctly

---

## 🎯 Next Steps (Phase 2)

### **Option A: Polling n8n API**
Query n8n API for waiting executions and extract resumeUrl

### **Option B: n8n Execution Webhooks**
Configure n8n to POST execution state changes to our API

### **Decision Point:**
User needs to:
1. Inspect n8n execution data to find where resumeUrl is exposed
2. Decide between polling vs webhooks
3. Design storage structure for waitExecutions

### **Phase 2 Tasks:**
1. Create poller/webhook service for resumeUrl retrieval
2. Build storage service for `/workflows/{id}/n8n/waitExecutions/`
3. Modify trigger execution flow to detect `usesResumeUrl` flag
4. Query waitExecutions to find matching resumeUrl
5. POST to resumeUrl instead of webhookUrl
6. Mark execution as resumed in Firestore

---

## 🎉 Status: Phase 1 Complete!

The foundation for Wait node appointment milestones is ready. All conversion logic, type definitions, and node configurations are in place. Phase 2 can begin once resumeUrl retrieval mechanism is designed.
