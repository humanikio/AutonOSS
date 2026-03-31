# Wait Node Phase 2 Implementation Plan

## 🎯 Overview

Phase 2 implements the complete resumeUrl capture and storage system using the recommended n8n pattern: **Set node → HTTP Request → Wait node** injection at conversion time.

## ⚠️ CRITICAL: Authentication Requirements

**ALL HTTP requests to Pulseline API MUST use the `Authorization: Bearer` header pattern:**

```typescript
headers: {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${apiKey}`  // ✅ CORRECT
}

// ❌ WRONG - DO NOT USE:
headers: {
  'X-API-Key': apiKey  // This will result in 401 Unauthorized
}
```

**Why:** The `authenticateEither` middleware (used by ALL protected routes) only checks the `Authorization` header, not custom headers like `X-API-Key`.

**Reference implementations:** All transformation methods (`sms_send.ts`, `contact_create.ts`, `email_send.ts`, etc.) use `Authorization: Bearer TENANT_API_KEY_PLACEHOLDER` which gets replaced by `injectAuthenticationKey` utility during workflow compilation.

---

## 📐 Architecture Summary

### **Key Pattern:**
When converting a wait node with `webhookWait: true`, we inject **3 nodes** instead of 1:

```
Original: [Wait Node (appointmentMilestone)]

Converted: [Set Node] → [HTTP Request] → [Wait Node (webhook)]
            ↓              ↓
        Capture vars   POST to API    Resume on milestone
```

### **Data Flow:**
1. **Set Node** captures: `$execution.id`, `$execution.resumeUrl`, `$workflow.id`
2. **HTTP Request** POSTs to `/api/inbound-n8n/execution-hooks` with `Authorization: Bearer {apiKey}` header
3. **Backend** authenticates via `authenticateEither` middleware, resolves tenantId from API key, maps n8nWorkflowId → internal workflowId
4. **Storage** saves to `/tenants/{tenantId}/workflows/{workflowId}/n8n/waitExecutions/{executionId}`
5. **Mapping** creates `/n8n/{n8nWorkflowId}` for quick reverse lookup
6. **Milestone Occurs** → Backend queries waitExecutions → POSTs to resumeUrl

---

## 📂 File Structure Changes

### **New Files to Create:**

#### **1. Inbound Event Handler**
```
/backend/src/inboundEvents/n8n/
  ├── routes/
  │   └── inboundN8nRoutes.ts
  ├── controllers/
  │   └── inboundN8nController.ts
  └── services/
      └── executionHookHandler.ts
```

#### **2. N8n Workflow Mapping Service**
```
/backend/src/n8n/services/workflowMapping/
  ├── createMapping.ts
  ├── getMapping.ts
  └── deleteMapping.ts
```

#### **3. Wait Execution Storage Service**
```
/backend/src/workflows/services/waitExecutionManager/
  ├── storeResumeUrl.ts
  ├── getLatestResumeUrl.ts
  └── markResumed.ts
```

### **Files to Modify:**

1. `/backend/src/n8n/utils/convertReactFlow2N8n.ts` - Inject Set + HTTP nodes
2. `/backend/src/n8n/services/workflowManager/createWorkflow.ts` - Create mapping
3. `/backend/src/n8n/services/workflowManager/updateWorkflow.ts` - Legacy support: create mapping if missing
4. `/backend/src/n8n/services/workflowManager/deleteWorkflow.ts` - Delete mapping
5. `/backend/src/workflows/triggerSubscriptions/services/triggerExecutions.ts` - Use resumeUrl
6. `/backend/src/routes/index.ts` - Mount inbound-n8n routes

---

## 🔨 Detailed Implementation Plan

---

## **PART 1: N8n Workflow Mapping System**

### **Purpose:**
Quick reverse lookup from n8nWorkflowId → tenantId + internal workflowId

### **Firestore Structure:**
```
/n8n/{n8nWorkflowId}
  {
    n8nWorkflowId: 'workflow_123',
    tenantId: 'ten_456',
    workflowId: 'wf_789',
    createdAt: Timestamp
  }
```

---

### **1.1 Create Mapping Service**

**File:** `/backend/src/n8n/services/workflowMapping/createMapping.ts`

```typescript
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

export interface CreateMappingInput {
  n8nWorkflowId: string;
  tenantId: string;
  workflowId: string;
}

/**
 * Create reverse mapping from n8nWorkflowId to tenant/workflow
 * Allows quick resolution when n8n webhooks POST back to API
 */
export async function createWorkflowMapping(input: CreateMappingInput): Promise<void> {
  const { n8nWorkflowId, tenantId, workflowId } = input;

  const db = getFirestore();

  await db.collection('n8n').doc(n8nWorkflowId).set({
    n8nWorkflowId,
    tenantId,
    workflowId,
    createdAt: FieldValue.serverTimestamp()
  });

  console.log(`✅ Created n8n workflow mapping: ${n8nWorkflowId} → ${tenantId}/${workflowId}`);
}
```

---

### **1.2 Get Mapping Service**

**File:** `/backend/src/n8n/services/workflowMapping/getMapping.ts`

```typescript
import { getFirestore } from 'firebase-admin/firestore';

export interface WorkflowMapping {
  n8nWorkflowId: string;
  tenantId: string;
  workflowId: string;
  createdAt: any;
}

/**
 * Get workflow mapping by n8nWorkflowId
 * Returns null if not found
 */
export async function getWorkflowMapping(n8nWorkflowId: string): Promise<WorkflowMapping | null> {
  const db = getFirestore();

  const doc = await db.collection('n8n').doc(n8nWorkflowId).get();

  if (!doc.exists) {
    return null;
  }

  return doc.data() as WorkflowMapping;
}
```

---

### **1.3 Delete Mapping Service**

**File:** `/backend/src/n8n/services/workflowMapping/deleteMapping.ts`

```typescript
import { getFirestore } from 'firebase-admin/firestore';

/**
 * Delete n8n workflow mapping
 * Called when workflow is deleted
 */
export async function deleteWorkflowMapping(n8nWorkflowId: string): Promise<void> {
  const db = getFirestore();

  await db.collection('n8n').doc(n8nWorkflowId).delete();

  console.log(`✅ Deleted n8n workflow mapping: ${n8nWorkflowId}`);
}
```

---

### **1.4 Modify updateWorkflow.ts (Legacy Support)**

**File:** `/backend/src/n8n/services/workflowManager/updateWorkflow.ts`

**Purpose:** Ensure mapping exists for legacy workflows that were created before Phase 2

**Changes:**
```typescript
import { getWorkflowMapping } from '../workflowMapping/getMapping';
import { createWorkflowMapping } from '../workflowMapping/createMapping';

// Add parameters to function signature
export const updateWorkflow = async (
  workflowId: string,
  updateData: WorkflowUpdateData,
  tenantId?: string,       // NEW: Optional for legacy support
  internalWorkflowId?: string  // NEW: Optional for legacy support
): Promise<N8nWorkflow> => {
  try {
    console.log('Updating workflow in n8n:', workflowId);

    const response = await axios.put<N8nWorkflow>(
      `${N8N_BASE_URL}/workflows/${workflowId}`,
      updateData,
      {
        headers: {
          'X-N8N-API-KEY': N8N_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('Workflow updated successfully:', response.data.id);

    // NEW: Legacy support - ensure mapping exists
    if (tenantId && internalWorkflowId) {
      const existingMapping = await getWorkflowMapping(workflowId);

      if (!existingMapping) {
        console.log('⚠️  No mapping found for workflow - creating for legacy support');

        await createWorkflowMapping({
          n8nWorkflowId: workflowId,
          tenantId,
          workflowId: internalWorkflowId
        });

        console.log('✅ Legacy mapping created');
      } else {
        console.log('✅ Mapping already exists');
      }
    }

    return response.data;

  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('❌ n8n API error details:');
      console.error('Status:', error.response?.status);
      console.error('Data:', JSON.stringify(error.response?.data, null, 2));
      console.error('Message:', error.message);
      throw new Error(`Failed to update workflow in n8n: ${JSON.stringify(error.response?.data) || error.message}`);
    }
    throw error;
  }
};
```

**Note:** This ensures that any workflow updated after Phase 2 deployment will automatically get a mapping document created if one doesn't exist. This handles the case where workflows were created before the mapping system was implemented.

---

### **1.5 Modify createWorkflow.ts**

**File:** `/backend/src/n8n/services/workflowManager/createWorkflow.ts`

**Changes:**
```typescript
import { createWorkflowMapping } from '../workflowMapping/createMapping';

// Add parameters to function signature
export const createWorkflow = async (
  workflowData: WorkflowData,
  tenantId: string,      // NEW
  workflowId: string     // NEW
): Promise<N8nWorkflow> => {
  try {
    console.log('Creating workflow in n8n:', workflowData.name);

    const response = await axios.post<N8nWorkflow>(
      `${N8N_BASE_URL}/workflows`,
      workflowData,
      {
        headers: {
          'X-N8N-API-KEY': N8N_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('Workflow created successfully:', response.data.id);

    // NEW: Create reverse mapping
    await createWorkflowMapping({
      n8nWorkflowId: response.data.id,
      tenantId,
      workflowId
    });

    return response.data;

  } catch (error) {
    // ... existing error handling
  }
};
```

**Caller Updates Needed:**
- Any file calling `createWorkflow()` must pass `tenantId` and `workflowId`
- Likely in `/backend/src/workflows/services/workflowCrudManager/createWorkflow.ts`

---

### **1.6 Modify deleteWorkflow.ts**

**File:** `/backend/src/n8n/services/workflowManager/deleteWorkflow.ts`

**Changes:**
```typescript
import { deleteWorkflowMapping } from '../workflowMapping/deleteMapping';

export const deleteWorkflow = async (workflowId: string): Promise<void> => {
  try {
    console.log('🗑️  Starting robust workflow deletion:', workflowId);

    // Step 1: Deactivate the workflow
    await deactivateWorkflow(workflowId);

    // Step 2: Poll until workflow is inactive
    await waitForWorkflowInactive(workflowId);

    // Step 3: Purge waiting executions
    await purgeWaitingExecutions(workflowId);

    // Step 4: Delete the workflow
    console.log('🗑️  Deleting workflow...');
    await axios.delete(
      `${N8N_BASE_URL}/workflows/${workflowId}`,
      {
        headers: {
          'X-N8N-API-KEY': N8N_API_KEY
        },
        timeout: DELETE_TIMEOUT
      }
    );

    // NEW: Delete reverse mapping
    await deleteWorkflowMapping(workflowId);

    console.log('✅ Workflow deleted successfully:', workflowId);

  } catch (error) {
    // ... existing error handling
  }
};
```

---

## **PART 2: Wait Execution Storage System**

### **Purpose:**
Store resumeUrl for each workflow execution that reaches a wait node

### **Firestore Structure:**
```
/tenants/{tenantId}/workflows/{workflowId}/n8n/waitExecutions/{executionId}
  {
    executionId: 'exec_123',
    n8nWorkflowId: 'workflow_456',
    resumeUrl: 'https://n8n.../webhook/abc/resume',
    milestone: '1_hour_before',      // From wait node config
    eventId: 'evt_789',               // From Set node expression
    status: 'waiting',                // waiting | resumed | expired
    createdAt: Timestamp,
    resumedAt: Timestamp (nullable)
  }
```

---

### **2.1 Store ResumeUrl Service**

**File:** `/backend/src/workflows/services/waitExecutionManager/storeResumeUrl.ts`

```typescript
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

export interface StoreResumeUrlInput {
  tenantId: string;
  workflowId: string;
  executionId: string;
  n8nWorkflowId: string;
  resumeUrl: string;
  milestone?: string;       // Optional: extracted from context
  eventId?: string;         // Optional: extracted from context
}

/**
 * Store resumeUrl for a waiting execution
 * Called when n8n execution reaches wait node and POSTs to our API
 */
export async function storeResumeUrl(input: StoreResumeUrlInput): Promise<void> {
  const { tenantId, workflowId, executionId, n8nWorkflowId, resumeUrl, milestone, eventId } = input;

  const db = getFirestore();

  const docRef = db
    .collection('tenants').doc(tenantId)
    .collection('workflows').doc(workflowId)
    .collection('n8n').doc('waitExecutions')
    .collection('executions').doc(executionId);

  await docRef.set({
    executionId,
    n8nWorkflowId,
    resumeUrl,
    milestone: milestone || null,
    eventId: eventId || null,
    status: 'waiting',
    createdAt: FieldValue.serverTimestamp(),
    resumedAt: null
  });

  console.log(`✅ Stored resumeUrl for execution ${executionId}`);
}
```

---

### **2.2 Get Latest ResumeUrl Service**

**File:** `/backend/src/workflows/services/waitExecutionManager/getLatestResumeUrl.ts`

```typescript
import { getFirestore } from 'firebase-admin/firestore';

export interface GetResumeUrlInput {
  tenantId: string;
  workflowId: string;
  milestone?: string;     // Optional: filter by milestone
  eventId?: string;       // Optional: filter by eventId
}

export interface ResumeUrlResult {
  executionId: string;
  resumeUrl: string;
  milestone: string | null;
  eventId: string | null;
  createdAt: any;
}

/**
 * Get latest resumeUrl for a workflow
 * Filters by milestone and/or eventId if provided
 * Returns most recent waiting execution
 */
export async function getLatestResumeUrl(input: GetResumeUrlInput): Promise<ResumeUrlResult | null> {
  const { tenantId, workflowId, milestone, eventId } = input;

  const db = getFirestore();

  let query = db
    .collection('tenants').doc(tenantId)
    .collection('workflows').doc(workflowId)
    .collection('n8n').doc('waitExecutions')
    .collection('executions')
    .where('status', '==', 'waiting')
    .orderBy('createdAt', 'desc')
    .limit(1);

  // Apply filters if provided
  if (milestone) {
    query = query.where('milestone', '==', milestone) as any;
  }

  if (eventId) {
    query = query.where('eventId', '==', eventId) as any;
  }

  const snapshot = await query.get();

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];
  const data = doc.data();

  return {
    executionId: data.executionId,
    resumeUrl: data.resumeUrl,
    milestone: data.milestone,
    eventId: data.eventId,
    createdAt: data.createdAt
  };
}
```

---

### **2.3 Mark Resumed Service**

**File:** `/backend/src/workflows/services/waitExecutionManager/markResumed.ts`

```typescript
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

/**
 * Mark execution as resumed after successfully POSTing to resumeUrl
 */
export async function markExecutionResumed(
  tenantId: string,
  workflowId: string,
  executionId: string
): Promise<void> {
  const db = getFirestore();

  await db
    .collection('tenants').doc(tenantId)
    .collection('workflows').doc(workflowId)
    .collection('n8n').doc('waitExecutions')
    .collection('executions').doc(executionId)
    .update({
      status: 'resumed',
      resumedAt: FieldValue.serverTimestamp()
    });

  console.log(`✅ Marked execution ${executionId} as resumed`);
}
```

---

## **PART 3: Inbound Event Handler**

### **Purpose:**
Receive POST from n8n HTTP Request node with executionId, resumeUrl, workflowId

---

### **3.1 Routes**

**File:** `/backend/src/inboundEvents/n8n/routes/inboundN8nRoutes.ts`

```typescript
import { Router } from 'express';
import { inboundN8nController } from '../controllers/inboundN8nController';

const router = Router();

/**
 * POST /api/inbound-n8n/execution-hooks
 * Receives execution metadata from n8n workflows
 *
 * Posted by injected HTTP Request node when workflow reaches wait node
 * Requires API key authentication (handled by authenticateEither middleware)
 */
router.post(
  '/execution-hooks',
  inboundN8nController.handleExecutionHook
);

/**
 * GET /api/inbound-n8n/health
 * Health check endpoint
 */
router.get('/health', (_, res) => {
  res.json({
    status: 'OK',
    service: 'inbound-n8n',
    timestamp: new Date().toISOString()
  });
});

export default router;
```

---

### **3.2 Controller**

**File:** `/backend/src/inboundEvents/n8n/controllers/inboundN8nController.ts`

```typescript
import { Request, Response } from 'express';
import { executionHookHandler } from '../services/executionHookHandler';

/**
 * Payload from n8n HTTP Request node
 */
export interface N8nExecutionHookPayload {
  executionId: string;
  resumeUrl: string;
  workflowId: string;       // n8n workflow ID
  milestone?: string;       // Optional: from wait node config
  eventId?: string;         // Optional: from workflow data
}

export class InboundN8nController {
  /**
   * Handle execution hook from n8n
   * Stores resumeUrl for later use when milestone occurs
   */
  async handleExecutionHook(req: Request, res: Response) {
    try {
      const payload: N8nExecutionHookPayload = req.body;
      const tenantId = req.tenantId; // From authenticateEither middleware

      console.log('📡 N8n execution hook received:');
      console.log(`   Execution ID: ${payload.executionId}`);
      console.log(`   Workflow ID (n8n): ${payload.workflowId}`);
      console.log(`   Tenant ID: ${tenantId}`);

      // Validate required fields
      if (!payload.executionId || !payload.resumeUrl || !payload.workflowId) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: executionId, resumeUrl, workflowId'
        });
      }

      // Process and store
      await executionHookHandler.handleHook({
        tenantId,
        ...payload
      });

      console.log('✅ Execution hook processed successfully');

      res.status(200).json({
        success: true,
        message: 'Execution hook processed'
      });

    } catch (error: any) {
      console.error('❌ Error processing execution hook:', error);

      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }
}

export const inboundN8nController = new InboundN8nController();
```

---

### **3.3 Service**

**File:** `/backend/src/inboundEvents/n8n/services/executionHookHandler.ts`

```typescript
import { getWorkflowMapping } from '../../../n8n/services/workflowMapping/getMapping';
import { storeResumeUrl } from '../../../workflows/services/waitExecutionManager/storeResumeUrl';

export interface ExecutionHookInput {
  tenantId: string;
  executionId: string;
  resumeUrl: string;
  workflowId: string;       // n8n workflow ID
  milestone?: string;
  eventId?: string;
}

export class ExecutionHookHandler {
  /**
   * Process execution hook from n8n
   *
   * Flow:
   * 1. Lookup internal workflowId from n8nWorkflowId mapping
   * 2. Verify tenantId matches (security check)
   * 3. Store resumeUrl in waitExecutions subcollection
   */
  async handleHook(input: ExecutionHookInput): Promise<void> {
    const { tenantId, executionId, resumeUrl, workflowId: n8nWorkflowId, milestone, eventId } = input;

    console.log('🔍 Resolving n8n workflow mapping...');

    // Get mapping
    const mapping = await getWorkflowMapping(n8nWorkflowId);

    if (!mapping) {
      throw new Error(`No mapping found for n8n workflow ${n8nWorkflowId}`);
    }

    // Security check: verify tenantId matches
    if (mapping.tenantId !== tenantId) {
      throw new Error(
        `TenantId mismatch: API key tenant ${tenantId} != workflow tenant ${mapping.tenantId}`
      );
    }

    console.log(`✅ Mapped to internal workflow: ${mapping.workflowId}`);

    // Store resumeUrl
    await storeResumeUrl({
      tenantId,
      workflowId: mapping.workflowId,
      executionId,
      n8nWorkflowId,
      resumeUrl,
      milestone,
      eventId
    });

    console.log('✅ ResumeUrl stored successfully');
  }
}

export const executionHookHandler = new ExecutionHookHandler();
```

---

### **3.4 Mount Routes**

**File:** `/backend/src/routes/index.ts`

```typescript
// Add import
import inboundN8nRoutes from '../inboundEvents/n8n/routes/inboundN8nRoutes';

// Mount route (after inbound-sms)
router.use('/api/inbound-n8n', authenticateEither, inboundN8nRoutes);
```

---

## **PART 4: Conversion Logic - Inject Set + HTTP Nodes**

### **Purpose:**
When converting wait node with `webhookWait: true`, inject Set node and HTTP Request node before it

---

### **4.1 Modify convertReactFlow2N8n.ts**

**File:** `/backend/src/n8n/utils/convertReactFlow2N8n.ts`

**Changes to Detection Logic** (around line 72):

```typescript
// Handle webhook wait nodes (wait nodes with webhookWait flag)
if (nodeConfig?._pulseline?.webhookWait && nodeName === 'wait') {
  console.log(`🔄 Converting wait node "${nodeName}" with webhookWait - injecting Set + HTTP + Wait`);

  // Extract wait node config
  const milestone = parameters.milestone || '1_hour_before';
  const eventIdField = parameters.eventIdField || '={{ $json.eventId }}';

  // Generate IDs for injected nodes
  const setNodeId = `set_${node.id}`;
  const httpNodeId = `http_${node.id}`;

  // INJECT 1: Set node to capture execution variables
  const setNode = createSetNodeForWait(node, setNodeId, milestone, eventIdField);
  n8nNodes.push(setNode);

  // INJECT 2: HTTP Request node to POST to our API
  const httpNode = createHttpNodeForWait(node, httpNodeId, apiKey);
  n8nNodes.push(httpNode);

  // INJECT 3: Original wait node (webhook mode)
  const waitNode = convertWaitNodeToWebhookWait(node, nodeConfig);
  n8nNodes.push(waitNode);

  // Store injected node IDs for edge rewiring
  const injectedNodes = {
    original: node.id,
    set: setNodeId,
    http: httpNodeId,
    wait: waitNode.id
  };

  // Track for edge updates
  waitNodeInjections.push(injectedNodes);

  continue;
}
```

**Add Helper Function** `createSetNodeForWait()`:

```typescript
/**
 * Create Set node to capture execution variables
 * Sets: executionId, resumeUrl, workflowId, milestone, eventId
 */
function createSetNodeForWait(
  originalNode: ReactFlowNode,
  setNodeId: string,
  milestone: string,
  eventIdField: string
): any {
  const position = originalNode.position;

  return {
    id: setNodeId,
    name: `Capture Wait Context`,
    type: 'n8n-nodes-base.set',
    typeVersion: 3.3,
    position: [position.x - 400, position.y],  // Place before wait node
    parameters: {
      mode: 'manual',
      assignments: {
        assignments: [
          {
            id: 'exec_id',
            name: 'executionId',
            value: '={{ $execution.id }}',
            type: 'string'
          },
          {
            id: 'resume_url',
            name: 'resumeUrl',
            value: '={{ $execution.resumeUrl }}',
            type: 'string'
          },
          {
            id: 'workflow_id',
            name: 'workflowId',
            value: '={{ $workflow.id }}',
            type: 'string'
          },
          {
            id: 'milestone_val',
            name: 'milestone',
            value: milestone,
            type: 'string'
          },
          {
            id: 'event_id_val',
            name: 'eventId',
            value: eventIdField,  // e.g., ={{ $json.eventId }}
            type: 'string'
          }
        ]
      },
      options: {}
    }
  };
}
```

**Add Helper Function** `createHttpNodeForWait()`:

```typescript
/**
 * Create HTTP Request node to POST execution data to our API
 */
function createHttpNodeForWait(
  originalNode: ReactFlowNode,
  httpNodeId: string,
  apiKey?: string
): any {
  const position = originalNode.position;

  const apiUrl = process.env.BACKEND_API_URL || 'https://api.yourapp.com';

  return {
    id: httpNodeId,
    name: 'Register Wait Execution',
    type: 'n8n-nodes-base.httpRequest',
    typeVersion: 4.2,
    position: [position.x - 200, position.y],  // Between Set and Wait
    parameters: {
      method: 'POST',
      url: `${apiUrl}/api/inbound-n8n/execution-hooks`,
      authentication: 'none',  // We handle auth via headers
      sendHeaders: true,
      specifyHeaders: 'json',  // Use JSON format for headers
      jsonHeaders: JSON.stringify({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey || 'TENANT_API_KEY_PLACEHOLDER'}`  // CRITICAL: Must use Authorization header!
      }),
      sendBody: true,
      contentType: 'json',
      specifyBody: 'json',
      jsonBody: '={{ $json }}',  // Forward all fields from Set node
      bodyParameters: {
        parameters: [
          {
            name: 'executionId',
            value: '={{ $json.executionId }}'
          },
          {
            name: 'resumeUrl',
            value: '={{ $json.resumeUrl }}'
          },
          {
            name: 'workflowId',
            value: '={{ $json.workflowId }}'
          },
          {
            name: 'milestone',
            value: '={{ $json.milestone }}'
          },
          {
            name: 'eventId',
            value: '={{ $json.eventId }}'
          }
        ]
      },
      options: {}
    }
  };
}
```

**Add Edge Rewiring Logic** (after node conversion, before edge conversion):

```typescript
// After all nodes converted, before edge conversion:

// Rewire edges for injected wait nodes
for (const injection of waitNodeInjections) {
  // Find incoming edges to original wait node
  const incomingEdges = reactFlowEdges.filter(e => e.target === injection.original);

  // Rewire to Set node instead
  for (const edge of incomingEdges) {
    n8nConnections.push({
      source: edge.source,
      target: injection.set,
      sourceIndex: 0,
      targetIndex: 0
    });
  }

  // Add Set → HTTP connection
  n8nConnections.push({
    source: injection.set,
    target: injection.http,
    sourceIndex: 0,
    targetIndex: 0
  });

  // Add HTTP → Wait connection
  n8nConnections.push({
    source: injection.http,
    target: injection.wait,
    sourceIndex: 0,
    targetIndex: 0
  });

  // Find outgoing edges from original wait node
  const outgoingEdges = reactFlowEdges.filter(e => e.source === injection.original);

  // Rewire from Wait node to next nodes
  for (const edge of outgoingEdges) {
    n8nConnections.push({
      source: injection.wait,
      target: edge.target,
      sourceIndex: 0,
      targetIndex: 0
    });
  }
}
```

---

## **PART 5: Modified Trigger Execution Flow**

### **Purpose:**
Detect `usesResumeUrl` flag and fetch from waitExecutions instead of webhook URL

---

### **5.1 Modify triggerExecutions.ts**

**File:** `/backend/src/workflows/triggerSubscriptions/services/triggerExecutions.ts`

**Changes** (around line 130):

```typescript
// Within executeSubscription loop
try {
  // Step 4a: Read workflow and determine URL type
  console.log(`   Step 4a: Determining target URL (webhook or resume)...`);

  const triggerDef = TriggerDestinationRegistry.getEventDefinition(subscription.triggerType);
  const usesResumeUrl = triggerDef?.metadata?.usesResumeUrl || false;

  let targetUrl: string;

  if (usesResumeUrl) {
    // Wait node - fetch resumeUrl from waitExecutions
    console.log(`   ⏸️  Wait node subscription - fetching resumeUrl`);

    const resumeResult = await getLatestResumeUrl({
      tenantId: subscription.tenantId,
      workflowId: subscription.workflowId,
      milestone: payload.milestone,  // From event payload
      eventId: payload.eventId        // From event payload
    });

    if (!resumeResult) {
      const error = 'No waiting execution found - workflow may not have reached wait node yet';
      console.error(`   ❌ ${error}`);
      markFailed(queue, i, error);
      continue;
    }

    targetUrl = resumeResult.resumeUrl;
    console.log(`   ✅ Found resumeUrl: ${targetUrl}`);

  } else {
    // Standard trigger - fetch webhookUrl from workflow
    console.log(`   🔗 Standard trigger - fetching webhookUrl`);

    const workflowResult = await callReadWorkflow({
      tenantId: subscription.tenantId,
      workflowId: subscription.workflowId
    });

    if (!workflowResult.success || !workflowResult.webhookUrl) {
      const error = 'No webhook URL found';
      console.error(`   ❌ ${error}`);
      markFailed(queue, i, error);
      continue;
    }

    targetUrl = workflowResult.webhookUrl;
    console.log(`   ✅ Found webhookUrl: ${targetUrl}`);
  }

  // Step 4b: Send payload to target URL
  console.log(`   Step 4b: Sending payload...`);
  const sendResult = await sendPayload({
    webhookUrl: targetUrl,  // Could be webhookUrl or resumeUrl
    payload: payloadValidation.payload,
    workflowId: subscription.workflowId,
    subscriptionId: subscription.id
  });

  if (sendResult.success && usesResumeUrl) {
    // Mark execution as resumed
    const resumeResult = await getLatestResumeUrl({
      tenantId: subscription.tenantId,
      workflowId: subscription.workflowId,
      milestone: payload.milestone,
      eventId: payload.eventId
    });

    if (resumeResult) {
      await markExecutionResumed(
        subscription.tenantId,
        subscription.workflowId,
        resumeResult.executionId
      );
    }
  }

  // ... rest of success/failure handling
}
```

**Add Imports:**
```typescript
import { getLatestResumeUrl } from '../../services/waitExecutionManager/getLatestResumeUrl';
import { markExecutionResumed } from '../../services/waitExecutionManager/markResumed';
import { TriggerDestinationRegistry } from '../TriggerDesitinationRegistry';
```

---

## 📊 Complete Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 2: Complete Wait Node Flow                               │
└─────────────────────────────────────────────────────────────────┘

1. WORKFLOW CREATION
   User saves workflow → Backend converts nodes
   ↓
   [Original]    [Wait Node (appointmentMilestone)]

   [Converted]   [Set Node] → [HTTP Request] → [Wait Node (webhook)]
                     ↓              ↓               ↓
                  Capture      POST to API    n8n waits
   ↓
   Deploy to n8n → createWorkflow() → Create mapping
   /n8n/{n8nWorkflowId} → { tenantId, workflowId }

2. WORKFLOW EXECUTION
   Trigger event → Workflow runs → Reaches Set node
   ↓
   Set node captures:
   - $execution.id
   - $execution.resumeUrl
   - $workflow.id
   - milestone (from config)
   - eventId (from workflow data)
   ↓
   HTTP Request node POSTs to /api/inbound-n8n/execution-hooks
   Headers: { Authorization: "Bearer plkey_xxx.plsec_xxx" }
   ↓
   Backend receives POST:
   - authenticateEither middleware validates Authorization header
   - Extracts API key from "Bearer {apiKey}" format → validates → tenantId
   - Looks up mapping: n8nWorkflowId → { tenantId, workflowId }
   - Verifies tenantId matches
   - Stores in /tenants/{tenantId}/workflows/{workflowId}/n8n/waitExecutions/{executionId}
   ↓
   Wait node activates → n8n pauses execution

3. MILESTONE OCCURS
   Calendar event milestone reached → n8n state holder workflow POSTs
   ↓
   /api/calendars/event-lifecycle/milestone
   ↓
   processMilestoneEvent() → notifySubscriptionService()
   ↓
   executeTrigger() → Finds subscriptions
   ↓
   Detects usesResumeUrl: true
   ↓
   Queries /tenants/{tenantId}/workflows/{workflowId}/n8n/waitExecutions/
   - Filters: milestone = "1_hour_before", eventId = "evt_123", status = "waiting"
   ↓
   Retrieves resumeUrl
   ↓
   POSTs event payload to resumeUrl
   ↓
   Marks execution as resumed
   ↓
   n8n workflow continues from wait node with event data ✅
```

---

## 🎯 Implementation Order

### **Phase 2A: Storage & Mapping (No Breaking Changes)**
1. Create `/backend/src/n8n/services/workflowMapping/` services (createMapping, getMapping, deleteMapping)
2. Create `/backend/src/workflows/services/waitExecutionManager/` services (storeResumeUrl, getLatestResumeUrl, markResumed)
3. Modify `createWorkflow.ts` to create mapping on workflow creation
4. Modify `updateWorkflow.ts` to create mapping if missing (legacy support)
5. Modify `deleteWorkflow.ts` to delete mapping on workflow deletion
6. Test workflow creation/update/deletion still works

### **Phase 2B: Inbound Event Handler**
7. Create `/backend/src/inboundEvents/n8n/` structure
8. Implement routes, controller, service
9. Mount routes in `/backend/src/routes/index.ts`
10. Test with manual POST (use Postman)

### **Phase 2C: Conversion Logic**
11. Add helper functions to `convertReactFlow2N8n.ts` (createSetNodeForWait, createHttpNodeForWait)
12. Modify detection logic to inject nodes
13. Implement edge rewiring
14. Test conversion output (log n8n JSON)

### **Phase 2D: Execution Flow**
15. Modify `triggerExecutions.ts` to detect `usesResumeUrl`
16. Query `waitExecutions` for resumeUrl
17. POST to resumeUrl instead of webhookUrl
18. Mark as resumed

### **Phase 2E: End-to-End Testing**
19. Create test workflow with wait node
20. Deploy to n8n
21. Verify Set + HTTP + Wait nodes exist
22. Trigger workflow
23. Verify resumeUrl stored
24. Trigger milestone
25. Verify workflow resumes

---

## 📝 Summary

**Files to Create:** 11
- 3 mapping services (createMapping, getMapping, deleteMapping)
- 3 wait execution services (storeResumeUrl, getLatestResumeUrl, markResumed)
- 3 inbound event handler files (routes, controller, service)
- 2 helper functions in conversion (createSetNodeForWait, createHttpNodeForWait)

**Files to Modify:** 6
- createWorkflow.ts (add mapping creation)
- updateWorkflow.ts (legacy support: create mapping if missing)
- deleteWorkflow.ts (delete mapping)
- convertReactFlow2N8n.ts (inject Set + HTTP + Wait nodes)
- triggerExecutions.ts (use resumeUrl for wait subscriptions)
- routes/index.ts (mount inbound-n8n routes)

**Firestore Collections Created:** 2
- `/n8n/{n8nWorkflowId}` - Mapping documents
- `/tenants/{tenantId}/workflows/{workflowId}/n8n/waitExecutions/executions/{executionId}` - Wait executions

**API Endpoints Added:** 1
- `POST /api/inbound-n8n/execution-hooks` (authenticated)

---

## ✅ Testing Checklist

- [ ] Workflow mapping created on workflow creation
- [ ] Workflow mapping deleted on workflow deletion
- [ ] Set + HTTP + Wait nodes injected correctly
- [ ] Edges rewired properly
- [ ] HTTP Request node POSTs to API successfully
- [ ] API authenticates and resolves tenant
- [ ] Mapping lookup works
- [ ] ResumeUrl stored in Firestore
- [ ] Milestone trigger fetches resumeUrl
- [ ] POST to resumeUrl resumes workflow
- [ ] Execution marked as resumed
- [ ] End-to-end flow works

---

**Phase 2 Status:** Ready for implementation 🚀
