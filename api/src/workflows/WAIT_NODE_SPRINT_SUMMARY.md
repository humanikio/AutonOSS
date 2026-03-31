# Wait Node Sprint - Complete Summary

## 🎯 Sprint Goal
Implement appointment milestone wait nodes that pause workflow execution until calendar events reach specific milestones (e.g., "1_hour_before", "event_completed").

---

## ✅ Phase 1: Complete (Today)

### **What Was Built:**
1. **Extended Wait Node Configuration**
   - Added "Appointment Milestone" resume mode
   - 10 milestone options (5_days_before → event_completed)
   - Event ID field mapping
   - Metadata flags for special handling

2. **New Subscription Record Type**
   - `event.lifecycle.milestone.wait.v1`
   - Payload schema with 21 fields
   - Metadata: `usesResumeUrl: true`, `isWaitNode: true`

3. **Conversion Logic Foundation**
   - Detection for `webhookWait` flag
   - Converts to n8n wait node (webhook mode)
   - Type definitions updated

### **Status:** ✅ Complete, TypeScript compiles, ready for Phase 2

### **Documentation:**
- `WAIT_NODE_PHASE1_IMPLEMENTATION.md`

---

## 📋 Phase 2: Ready to Implement

### **Architecture:**
**Pattern:** Inject **Set → HTTP → Wait** nodes at conversion time
- **Set Node**: Captures `$execution.id`, `$execution.resumeUrl`, `$workflow.id`, milestone, eventId
- **HTTP Request**: POSTs to `/api/inbound-n8n/execution-hooks` with API key
- **Wait Node**: Original webhook wait (Phase 1)

### **What Will Be Built:**

#### **Part 1: Workflow Mapping System**
- Quick reverse lookup: n8nWorkflowId → tenantId + internal workflowId
- Storage: `/n8n/{n8nWorkflowId}`
- 3 services: create, get, delete
- Integrated into createWorkflow, updateWorkflow (legacy support), deleteWorkflow

#### **Part 2: Wait Execution Storage**
- Store resumeUrl per execution
- Storage: `/tenants/{tenantId}/workflows/{workflowId}/n8n/waitExecutions/executions/{executionId}`
- 3 services: store, get latest, mark resumed
- Filters by milestone and eventId

#### **Part 3: Inbound Event Handler**
- Receive POST from n8n HTTP Request node
- Authenticate via API key → tenantId
- Resolve mapping → internal workflowId
- Store resumeUrl in Firestore
- Endpoint: `POST /api/inbound-n8n/execution-hooks`

#### **Part 4: Conversion Logic - Node Injection**
- Detect wait node with `webhookWait: true`
- Inject Set node (captures execution vars)
- Inject HTTP Request node (POSTs to API)
- Inject Wait node (webhook mode)
- Rewire edges properly

#### **Part 5: Execution Flow**
- Detect `usesResumeUrl: true` in trigger definition
- Query waitExecutions for latest resumeUrl
- Filter by milestone and eventId
- POST to resumeUrl (not webhookUrl)
- Mark execution as resumed

### **Files to Create:** 11
- 3 mapping services
- 3 wait execution services
- 3 inbound event handler files
- 2 helper functions

### **Files to Modify:** 6
- createWorkflow.ts
- **updateWorkflow.ts (NEW: legacy support)**
- deleteWorkflow.ts
- convertReactFlow2N8n.ts
- triggerExecutions.ts
- routes/index.ts

### **Documentation:**
- `WAIT_NODE_PHASE2_PLAN.md` (comprehensive implementation guide)

---

## 🔄 Complete Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ End-to-End Wait Node Flow                                       │
└─────────────────────────────────────────────────────────────────┘

1. WORKFLOW CREATION
   User saves workflow with wait node (appointmentMilestone)
   ↓
   Backend converts: [Wait] → [Set] → [HTTP] → [Wait (webhook)]
   ↓
   Deploy to n8n → createWorkflow() → Create mapping
   /n8n/{n8nWorkflowId} → { tenantId, workflowId }

2. WORKFLOW EXECUTION
   Trigger event → Workflow runs
   ↓
   Set node: Captures $execution.id, $execution.resumeUrl, etc.
   ↓
   HTTP Request: POSTs to /api/inbound-n8n/execution-hooks
   ↓
   Backend: Authenticates → Maps → Stores resumeUrl
   ↓
   Wait node: Workflow pauses

3. MILESTONE OCCURS
   Calendar event reaches milestone (e.g., "1_hour_before")
   ↓
   n8n state holder → POST to /api/calendars/event-lifecycle/milestone
   ↓
   processMilestoneEvent() → notifySubscriptionService() → executeTrigger()
   ↓
   Detects usesResumeUrl: true
   ↓
   Queries waitExecutions (filter: milestone, eventId, status=waiting)
   ↓
   Retrieves resumeUrl → POSTs event payload
   ↓
   Marks execution as resumed
   ↓
   n8n workflow resumes from wait node ✅
```

---

## 🎯 Implementation Order

### **Phase 2A: Storage & Mapping** (Safe, no breaking changes)
1. Create mapping services (createMapping, getMapping, deleteMapping)
2. Create wait execution services (storeResumeUrl, getLatestResumeUrl, markResumed)
3. Modify createWorkflow.ts
4. **Modify updateWorkflow.ts (legacy support)**
5. Modify deleteWorkflow.ts
6. Test workflow CRUD operations

### **Phase 2B: Inbound Event Handler**
7. Create /inboundEvents/n8n/ structure
8. Implement routes, controller, service
9. Mount routes
10. Test with Postman

### **Phase 2C: Conversion Logic**
11. Add helper functions (createSetNodeForWait, createHttpNodeForWait)
12. Modify detection logic
13. Implement edge rewiring
14. Test conversion output

### **Phase 2D: Execution Flow**
15. Modify triggerExecutions.ts
16. Query waitExecutions
17. POST to resumeUrl
18. Mark as resumed

### **Phase 2E: End-to-End Testing**
19. Create test workflow
20. Deploy to n8n
21. Verify node injection
22. Trigger workflow
23. Verify storage
24. Trigger milestone
25. Verify resume

---

## 🔑 Key Design Decisions

### **Why Set → HTTP → Wait pattern?**
- **Recommended by n8n docs**: Capture `$execution.resumeUrl` at runtime
- **Avoids API polling**: No need to query n8n for resumeUrl later
- **Self-contained**: Each workflow registers itself automatically

### **Why mapping document at `/n8n/{n8nWorkflowId}`?**
- **Fast reverse lookup**: n8nWorkflowId → tenantId + internal workflowId
- **Security**: Verify API key tenant matches workflow tenant
- **Simple**: Single document read, no queries

### **Why legacy support in updateWorkflow.ts?**
- **Backwards compatibility**: Existing workflows created before Phase 2
- **Automatic migration**: Mappings created on first update
- **Zero downtime**: No manual migration scripts needed

### **Why filter by milestone AND eventId?**
- **Specificity**: Multiple workflows can wait for different milestones on different events
- **Scalability**: No collision between parallel waiting executions
- **Flexibility**: Same workflow can wait for multiple events simultaneously

---

## 📊 Firestore Structure

```
/n8n/{n8nWorkflowId}
  {
    n8nWorkflowId: 'workflow_123',
    tenantId: 'ten_456',
    workflowId: 'wf_789',
    createdAt: Timestamp
  }

/tenants/{tenantId}/workflows/{workflowId}/n8n/waitExecutions/executions/{executionId}
  {
    executionId: 'exec_123',
    n8nWorkflowId: 'workflow_456',
    resumeUrl: 'https://n8n.../webhook/abc/resume',
    milestone: '1_hour_before',
    eventId: 'evt_789',
    status: 'waiting',  // waiting | resumed | expired
    createdAt: Timestamp,
    resumedAt: Timestamp (nullable)
  }
```

---

## ✅ Success Metrics

**Phase 1:**
- ✅ TypeScript compiles without errors
- ✅ Wait node has appointmentMilestone mode
- ✅ Subscription record type registered
- ✅ Conversion logic detects webhookWait flag

**Phase 2:**
- [ ] Mapping created on workflow creation
- [ ] Legacy mappings created on workflow update
- [ ] Mapping deleted on workflow deletion
- [ ] Inbound API receives and stores resumeUrl
- [ ] Set + HTTP + Wait nodes injected correctly
- [ ] Edges rewired properly
- [ ] Milestone trigger uses resumeUrl
- [ ] Workflow resumes successfully
- [ ] End-to-end test passes

---

## 🚀 Next Steps

1. **Review Phase 2 plan** (`WAIT_NODE_PHASE2_PLAN.md`)
2. **Start Phase 2A** (Storage & Mapping)
3. **Test each phase** before moving to next
4. **End-to-end test** when complete

---

## 📁 Documentation Files

1. `WAIT_NODE_PHASE1_IMPLEMENTATION.md` - Phase 1 complete implementation
2. `WAIT_NODE_PHASE2_PLAN.md` - Phase 2 detailed implementation guide
3. `WAIT_NODE_SPRINT_SUMMARY.md` - This file (high-level overview)

---

**Sprint Status:** Phase 1 Complete ✅ | Phase 2 Ready to Implement 🚀
