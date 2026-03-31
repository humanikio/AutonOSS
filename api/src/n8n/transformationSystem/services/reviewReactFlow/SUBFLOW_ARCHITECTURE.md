# Subflow Switch Injection Architecture

## Overview

Automatic subflow creation with switch-based routing for nodes that trigger subflow conditions (e.g., milestone wait nodes where N≥2 in a linear path).

---

## Flow Architecture

```
reviewReactFlow.ts
  ↓
subWorkflowAdapter.ts (Main Orchestrator)
  ↓
  ├─→ findSubflowTriggers.ts (Detection)
  ├─→ cacheLinearPath.ts (Queue Management)
  ├─→ handleSubflowCreation.ts (Per-Path Orchestrator)
  │     ↓
  │     ├─→ createSwitchDetermination.ts (Switch Logic)
  │     ├─→ resolveSubflowGroups.ts (Group Creation)
  │     ├─→ utils/edgeRewiring.ts (Edge Rewiring Utility)
  │     └─→ write2ProcessedReactflow.ts (State Persistence)
  │
  └─→ validateRevisedFlow.ts (Final Validation)
```

---

## Phase 1: Detection & Queueing

### **1.1 Main Orchestrator**
**File:** `subWorkflowAdapter.ts`

**Responsibilities:**
- Entry point called by `reviewReactFlow.ts`
- Coordinates detection → queueing → processing
- Returns status code:
  - `201`: No adaptation needed (no subflow triggers found)
  - `200`: Subflows created successfully

**Flow:**
```typescript
1. Call findSubflowTriggers(nodes, edges)
2. If no triggers found → return 201
3. Cache linear paths → cacheLinearPath()
4. For each queued path:
   - Call handleSubflowCreation(path)
   - Mark path complete in queue
5. Call validateRevisedFlow(modifiedWorkflow)
   - Validate edge integrity
   - Check node ID uniqueness
   - Verify switch routing
6. If validation passes → return 200
7. If validation fails → throw error
```

---

### **1.2 Trigger Detection**
**File:** `findSubflowTriggers.ts`

**Responsibilities:**
- Walk topological order
- Identify nodes with `_pulseline.subflowTrigger` config
- Detect linear paths containing N≥minCount triggers
- Name paths: `path1`, `path2`, etc.

**Detection Logic:**
```typescript
1. Get all nodes with subflowTrigger config
2. For each trigger type (e.g., 'milestoneWait'):
   - Check triggerWhen parameter matches (e.g., resume='appointmentMilestone')
3. Walk graph to identify linear paths (no branching)
4. Count triggers in each linear path
5. If count >= minCount (default 2) → mark path for subflow creation
```

**Output:**
```typescript
interface SubflowPath {
  pathId: string;           // 'path1', 'path2', etc.
  triggerType: string;      // 'milestoneWait'
  nodes: ReactFlowNode[];   // Ordered nodes in linear path
  triggers: ReactFlowNode[]; // Subset of nodes that are triggers
  startIndex: number;       // Index in topological order where path starts
  endIndex: number;         // Index in topological order where path ends
}
```

---

### **1.3 Queue Management**
**File:** `memory/cacheLinearPath.ts`

**Responsibilities:**
- In-memory queue for multiple linear paths
- Track processing status
- Provide interface for checking/marking completion

**Interface:**
```typescript
interface LinearPathQueue {
  paths: SubflowPath[];
  currentIndex: number;
  totalCount: number;
  completedCount: number;
}

// API
export function addPath(path: SubflowPath): void
export function getNextPath(): SubflowPath | null
export function markComplete(pathId: string): void
export function getStatus(): { total: number; completed: number; remaining: number }
export function clearQueue(): void
```

---

## Phase 2: Subflow Creation (Per-Path)

### **2.1 Per-Path Orchestrator**
**File:** `handleSubflowCreation.ts`

**Responsibilities:**
- Mini orchestrator for single linear path
- Coordinates switch creation → grouping → persistence
- Fed paths from queue by main orchestrator

**Flow:**
```typescript
1. Receive SubflowPath from queue
2. Call createSwitchDetermination(path) → get switch node + cases
3. Call resolveSubflowGroups(path, switchCases) → get node groups per case
4. Inject switch + groups into workflow graph
5. Call write2ProcessedReactflow() → save to Firestore
6. Return success
```

---

### **2.2 Switch Creation**
**File:** `handleSubflowCreation/createSwitchDetermination.ts`

**Responsibilities:**
- Create switch node with determination function
- Define cases based on trigger count
- Order cases by trigger value (highest to lowest)

**Process:**
```typescript
1. Import grouping rules: groupingRules/milestoneWait.ts
   - Determine number of groups (= number of triggers)

2. Import determination function: determinationFunctions/milestoneWait.ts
   - Get function to compute which case to route to

3. Sort triggers by value (convert to seconds, highest first)
   - Example: ['5_days_before', '1_hour_before', '30_minutes_before']
   - Sorted: [432000s, 3600s, 1800s]

4. Create switch node:
   - Position: Right before first trigger (n1)
   - Cases: One per trigger (ordered highest to lowest)
   - Expression: Determination function
```

**Switch Node Structure:**
```typescript
{
  id: 'switch-{pathId}',
  type: 'n8n-nodes-base.switch',
  parameters: {
    expression: '={{ computeNextValidMilestone($json.appointmentStartTime, $json.currentTime, ...) }}',
    cases: [
      { value: '5_days_before', outputIndex: 0 },  // Highest value first
      { value: '1_hour_before', outputIndex: 1 },
      { value: '30_minutes_before', outputIndex: 2 },
      { value: 'none', outputIndex: 3 }            // All past
    ]
  }
}
```

---

### **2.3 Group Resolution**
**File:** `handleSubflowCreation/resolveSubflowGroups.ts`

**Responsibilities:**
- Create node groups based on grouping rules
- Each group is a copy of nodes starting from specific trigger

**Grouping Logic (Milestone Wait Example):**
```
3 triggers: n1, n2, n3

Group 1 (Case '5_days_before'):  n1 → action1 → n2 → action2 → n3 → action3
Group 2 (Case '1_hour_before'):       action1 → n2 → action2 → n3 → action3
Group 3 (Case '30_minutes_before'):              action2 → n3 → action3
Group 4 (Case 'none'):                                          action3
```

**Process:**
```typescript
1. Get grouping rules for trigger type (e.g., milestoneWait)
2. For each trigger (n1, n2, n3):
   - Create group starting from that trigger
   - Include all nodes AFTER trigger in topological order
   - Copy nodes with unique IDs: {originalId}-case{N}
   - Copy edges and rewire to new node IDs
3. Return groups array
```

**Output:**
```typescript
interface SubflowGroup {
  caseValue: string;        // '5_days_before'
  startNodeId: string;      // Trigger node this group starts from
  nodes: ReactFlowNode[];   // Copied nodes with unique IDs
  edges: ReactFlowEdge[];   // Rewired edges
}
```

---

### **2.4 State Persistence**
**File:** `handleSubflowCreation/write2ProcessedReactflow.ts`

**Responsibilities:**
- Save modified workflow to Firestore
- Enable resume/failsafe if processing interrupted

**Process:**
```typescript
1. Merge switch node + all groups into workflow
2. Update edges to route through switch
3. Call state/processedReactFlow/write.ts
4. Save to: /tenants/{id}/workflows/{id}/transformationState/processedReactFlow
```

---

## Registries (Extensibility)

### **3.1 Grouping Rules Registry**
**File:** `subflowMethods/groupingRules/index.ts`

```typescript
import { milestoneWaitGrouping } from './milestoneWait';

export const groupingRulesRegistry: Record<string, GroupingRuleFunction> = {
  milestoneWait: milestoneWaitGrouping,
  // Future: otherTriggerType: otherGroupingFunction
};

export function getGroupingRules(triggerType: string): GroupingRuleFunction {
  const rules = groupingRulesRegistry[triggerType];
  if (!rules) {
    throw new Error(`No grouping rules found for trigger type: ${triggerType}`);
  }
  return rules;
}
```

**File:** `subflowMethods/groupingRules/milestoneWait.ts`

```typescript
export interface GroupingRuleFunction {
  (triggers: ReactFlowNode[], allNodes: ReactFlowNode[]): SubflowGroup[];
}

export const milestoneWaitGrouping: GroupingRuleFunction = (triggers, allNodes) => {
  // Rule: N triggers → N groups
  // Group 1: All nodes from n1 onwards
  // Group 2: All nodes from n2 onwards
  // Group 3: All nodes from n3 onwards

  const groups: SubflowGroup[] = [];

  triggers.forEach((trigger, index) => {
    const startIndex = allNodes.indexOf(trigger);
    const groupNodes = allNodes.slice(startIndex); // From this trigger onwards

    groups.push({
      caseValue: trigger.data.parameters.milestone, // e.g., '1_hour_before'
      startNodeId: trigger.id,
      nodes: copyNodesWithUniqueIds(groupNodes, `case${index}`),
      edges: rewireEdges(groupNodes, `case${index}`)
    });
  });

  return groups;
};
```

---

### **3.2 Determination Functions Registry**
**File:** `subflowMethods/determinationFunctions/milestoneWait.ts`

**Responsibilities:**
- Define switch routing logic
- Convert milestone values to seconds
- Order cases from highest to lowest
- Generate determination function expression

```typescript
export interface DeterminationFunction {
  expression: string;  // n8n expression for switch
  cases: SwitchCase[];
}

export interface SwitchCase {
  value: string;      // Milestone value (e.g., '5_days_before')
  outputIndex: number;
  seconds: number;    // Converted for ordering
}

export function createMilestoneWaitDetermination(
  triggers: ReactFlowNode[]
): DeterminationFunction {
  // 1. Extract milestone values
  const milestones = triggers.map(t => t.data.parameters.milestone);

  // 2. Convert to seconds
  const milestonesWithSeconds = milestones.map(m => ({
    value: m,
    seconds: convertMilestoneToSeconds(m)
  }));

  // 3. Sort by seconds (highest first)
  milestonesWithSeconds.sort((a, b) => b.seconds - a.seconds);

  // 4. Create cases
  const cases: SwitchCase[] = milestonesWithSeconds.map((m, index) => ({
    value: m.value,
    outputIndex: index,
    seconds: m.seconds
  }));

  // Add 'none' case for all past
  cases.push({
    value: 'none',
    outputIndex: cases.length,
    seconds: 0
  });

  // 5. Generate expression
  const expression = `={{
    const appointmentStart = new Date($json.appointmentStartTime);
    const now = new Date($json.currentTime || Date.now());
    const timeUntilEvent = (appointmentStart - now) / 1000;

    ${cases.slice(0, -1).map(c => `
    if (timeUntilEvent >= ${c.seconds}) return '${c.value}';
    `).join('')}

    return 'none';
  }}`;

  return { expression, cases };
}

function convertMilestoneToSeconds(milestone: string): number {
  const conversions: Record<string, number> = {
    '5_days_before': 5 * 24 * 60 * 60,
    '4_days_before': 4 * 24 * 60 * 60,
    '3_days_before': 3 * 24 * 60 * 60,
    '2_days_before': 2 * 24 * 60 * 60,
    '1_day_before': 1 * 24 * 60 * 60,
    '1_hour_before': 1 * 60 * 60,
    '30_minutes_before': 30 * 60,
    '10_minutes_before': 10 * 60,
    'event_start': 0,
    'event_completed': -1 // Special case
  };

  return conversions[milestone] ?? 0;
}
```

---

## Utilities

### **5.1 Edge Rewiring Utility**
**File:** `utils/edgeRewiring.ts`

**Responsibilities:**
- Rewire edges when injecting switch and groups
- Update edge references to copied node IDs
- Connect switch outputs to group entry points
- Merge group exit points back to main flow

**Functions:**
```typescript
// Rewire edges for switch injection
export function rewireEdgesForSwitch(
  switchNode: ReactFlowNode,
  groups: SubflowGroup[],
  originalEdges: ReactFlowEdge[]
): ReactFlowEdge[]

// Create edges from switch to each group's first node
export function createSwitchOutputEdges(
  switchNodeId: string,
  groups: SubflowGroup[]
): ReactFlowEdge[]

// Update edges within a copied group to use new node IDs
export function updateGroupInternalEdges(
  originalEdges: ReactFlowEdge[],
  nodeIdMap: Map<string, string>, // originalId → copiedId
  caseSuffix: string
): ReactFlowEdge[]

// Merge group exit edges back to main flow
export function createGroupExitEdges(
  groups: SubflowGroup[],
  nextNodeId: string // Node after the subflow section
): ReactFlowEdge[]
```

**Example:**
```typescript
// Before: trigger → n1 → action → n2 → action → next
// After:  trigger → switch → [group1: n1-c0 → act-c0 → n2-c0 → act-c0]
//                          → [group2: act-c1 → n2-c1 → act-c1]
//                          → ... → next
```

---

### **5.2 Flow Validation**
**File:** `validateRevisedFlow.ts`

**Responsibilities:**
- Final validation before returning 200
- Ensure graph integrity after subflow injection

**Validation Checks:**
```typescript
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateRevisedFlow(
  workflow: ReactFlowWorkflow
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Check node ID uniqueness
  const nodeIds = new Set<string>();
  workflow.nodes.forEach(node => {
    if (nodeIds.has(node.id)) {
      errors.push(`Duplicate node ID: ${node.id}`);
    }
    nodeIds.add(node.id);
  });

  // 2. Validate edge integrity (all sources/targets exist)
  workflow.edges.forEach(edge => {
    const sourceExists = workflow.nodes.some(n => n.id === edge.source);
    const targetExists = workflow.nodes.some(n => n.id === edge.target);

    if (!sourceExists) {
      errors.push(`Edge ${edge.id}: source node ${edge.source} not found`);
    }
    if (!targetExists) {
      errors.push(`Edge ${edge.id}: target node ${edge.target} not found`);
    }
  });

  // 3. Check for orphaned nodes (no incoming/outgoing edges)
  workflow.nodes.forEach(node => {
    const hasIncoming = workflow.edges.some(e => e.target === node.id);
    const hasOutgoing = workflow.edges.some(e => e.source === node.id);

    // Triggers don't need incoming, final nodes don't need outgoing
    if (!hasIncoming && node.type !== 'trigger') {
      warnings.push(`Node ${node.id} has no incoming edges`);
    }
    if (!hasOutgoing && !isTerminalNode(node)) {
      warnings.push(`Node ${node.id} has no outgoing edges`);
    }
  });

  // 4. Verify switch nodes have correct number of outputs
  const switchNodes = workflow.nodes.filter(n => n.type === 'n8n-nodes-base.switch');
  switchNodes.forEach(switchNode => {
    const outputs = workflow.edges.filter(e => e.source === switchNode.id);
    const expectedOutputs = switchNode.data?.parameters?.cases?.length || 0;

    if (outputs.length !== expectedOutputs) {
      errors.push(`Switch ${switchNode.id}: expected ${expectedOutputs} outputs, found ${outputs.length}`);
    }
  });

  // 5. Check topological sort still works (no cycles)
  try {
    topologicalSort(workflow.nodes, workflow.edges);
  } catch (error) {
    errors.push(`Topological sort failed: ${error.message}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}
```

---

## Integration Points

### **4.1 reviewReactFlow.ts Integration**

**Current Flow:**
```typescript
1. Load ReactFlow
2. Inject contact adapters
3. Create skeleton
4. Save to Firestore
```

**Updated Flow:**
```typescript
1. Load ReactFlow
2. Inject contact adapters
3. **→ Call subWorkflowAdapter.ts**
   - Detection & queueing
   - Per-path processing (switch + groups)
   - Validation (validateRevisedFlow.ts)
   - If 201 returned → no subflows needed
   - If 200 returned → subflows created & validated
4. Read processed ReactFlow from Firestore (with subflows)
5. Create skeleton (with switch nodes + groups)
6. Save to Firestore
```

**Code Location:**
```typescript
// After adapter injection (line 63)
console.log(`=🔀 Checking for subflow triggers...`);
const subflowResult = await subWorkflowAdapter(workflowWithAdapters);

if (subflowResult.status === 200) {
  console.log(`   ✅ Subflows created: ${subflowResult.pathsProcessed} path(s)`);
  // Reload from Firestore to get updated workflow
  const { readProcessedReactFlow } = await import('../state/processedReactFlow');
  workflowWithAdapters = await readProcessedReactFlow(tenantId, workflowId);
} else {
  console.log(`   ℹ️  No subflow adaptation needed`);
}

// Continue with skeleton creation...
```

---

### **4.2 Failsafe & Resume**

**State Persistence:**
- After each path processing → write to `processedReactFlow`
- Enables resume if orchestrator crashes mid-processing

**Resume Logic:**
```typescript
// In subWorkflowAdapter.ts
const existingProcessed = await readProcessedReactFlow(tenantId, workflowId);
if (existingProcessed) {
  console.log('⚠️  Found existing processed workflow - resuming...');
  return { status: 200, pathsProcessed: 0 }; // Already done
}
```

---

## Architecture Assessment

### **Strengths:**
✅ Clear separation of concerns (detection → queueing → processing)
✅ Extensible via registry pattern (future trigger types)
✅ Queue-based for multiple paths
✅ State persistence for resume/failsafe
✅ Follows existing patterns (similar to adapter injection)
✅ Switch ordering logic (highest to lowest values)

### **Potential Issues:**

⚠️ **1. Order of Operations:**
- User noted: "Switch should probably come before groups"
- **Recommendation:** Create switch → then create groups → then inject both
- Current plan has correct order in orchestrator

⚠️ **2. Node ID Uniqueness:**
- Copying nodes requires unique IDs: `{originalId}-case{N}`
- Edge rewiring must update source/target references
- **Recommendation:** Use consistent suffix pattern across all copied nodes

⚠️ **3. Topological Order Impact:**
- Injecting switch changes graph structure
- May need to re-run topological sort after injection
- **Recommendation:** Document assumption that linear path stays linear after switch

⚠️ **4. Edge Rewiring Complexity:**
- Must update:
  - Incoming edges → route to switch
  - Switch outputs → route to each group's first node
  - Outgoing edges from final nodes in each group → merge back
- **Recommendation:** Create dedicated utility: `rewireEdgesForSwitch()`

⚠️ **5. Memory vs Firestore:**
- User mentioned: "passing from memory but have failsafe to pull from firestore"
- **Recommendation:**
  - Pass modified workflow through return value
  - Also persist to Firestore for failsafe
  - Main orchestrator checks return value first, falls back to Firestore read

### **Recommended Additions:**

1. **Validation Step:**
   - After group creation, validate no broken edges
   - Check all copied node IDs are unique

2. **Rollback Mechanism:**
   - If processing fails mid-path, restore original workflow
   - Keep original workflow cached before modifications

3. **Logging:**
   - Detailed logs at each step for debugging
   - Track which paths/groups/switches were created

---

## File Structure Summary

```
reviewReactFlow/
├── reviewReactFlow.ts                    (Main entry - updated)
├── SUBFLOW_ARCHITECTURE.md               (This file)
│
├── subWorkflowAdapter.ts                 (Main orchestrator)
│
├── subWorkflowAdapter/
│   ├── findSubflowTriggers.ts           (Detection)
│   ├── validateRevisedFlow.ts           (Final validation)
│   │
│   ├── memory/
│   │   └── cacheLinearPath.ts           (Queue management)
│   │
│   ├── utils/
│   │   └── edgeRewiring.ts              (Edge rewiring utility)
│   │
│   ├── orchrestrators/
│   │   └── handleSubflowCreation.ts     (Per-path orchestrator)
│   │
│   ├── handleSubflowCreation/
│   │   ├── createSwitchDetermination.ts (Switch creation)
│   │   ├── resolveSubflowGroups.ts      (Group creation)
│   │   └── write2ProcessedReactflow.ts  (State persistence)
│   │
│   └── subflowMethods/
│       ├── groupingRules/
│       │   ├── index.ts                 (Registry)
│       │   └── milestoneWait.ts         (Rules)
│       │
│       └── determinationFunctions/
│           └── milestoneWait.ts         (Determination logic)
```

---

## Memory Strategy: In-Memory vs Redis

### **Recommendation: In-Memory Cache (Node.js Map/Array)**

**Why In-Memory is Sufficient:**

✅ **1. Synchronous Processing**
- Planning phase processes one workflow at a time
- No concurrent access to queue needed
- Sequential: detect → queue → process path1 → process path2 → done

✅ **2. Short-Lived Data**
- Queue only exists during planning phase (seconds to minutes)
- Data destroyed after workflow processing completes
- No need for persistence beyond execution

✅ **3. Small Data Volume**
- Typical workflow: 10-50 nodes
- Even with 5 linear paths × 50 nodes = ~250 nodes in memory
- Each node ~1-5KB → total memory < 5MB
- Well within Node.js heap limits

✅ **4. Single-Tenant Context**
- Each planning phase is isolated to one tenant's workflow
- No cross-tenant data sharing needed
- No risk of data leakage

✅ **5. Firestore Provides Failsafe**
- `write2ProcessedReactflow.ts` persists to Firestore after each path
- If process crashes, can resume from Firestore
- No need for Redis-based persistence

**When Redis Would Be Needed:**
❌ Multi-process workers processing same workflow concurrently
❌ Long-lived queue spanning multiple requests
❌ Cross-server state sharing (multi-instance deployment)
❌ Queue data needs to survive process restart

**None of these apply here.**

### **In-Memory Implementation**

**File:** `memory/cacheLinearPath.ts`

```typescript
// Simple in-memory queue using Map
const pathQueue = new Map<string, SubflowPath>();
let processingOrder: string[] = [];
let completedPaths = new Set<string>();

export function addPath(path: SubflowPath): void {
  pathQueue.set(path.pathId, path);
  processingOrder.push(path.pathId);
}

export function getNextPath(): SubflowPath | null {
  for (const pathId of processingOrder) {
    if (!completedPaths.has(pathId)) {
      return pathQueue.get(pathId) || null;
    }
  }
  return null;
}

export function markComplete(pathId: string): void {
  completedPaths.add(pathId);
}

export function clearQueue(): void {
  pathQueue.clear();
  processingOrder = [];
  completedPaths.clear();
}
```

**Memory Footprint:**
- 1 workflow × 5 paths × 50 nodes × 2KB = ~500KB
- Plus edge data × 100 edges × 200 bytes = ~20KB
- **Total: < 1MB** per workflow

**Conclusion:** In-memory cache is the correct choice for this use case.

---

## Next Steps

1. ✅ Review architecture (current step)
2. Implement core files in order:
   - `memory/cacheLinearPath.ts` (queue system)
   - `findSubflowTriggers.ts` (detection)
   - `subflowMethods/groupingRules/milestoneWait.ts` (rules)
   - `subflowMethods/determinationFunctions/milestoneWait.ts` (logic)
   - `handleSubflowCreation/createSwitchDetermination.ts` (switch)
   - `handleSubflowCreation/resolveSubflowGroups.ts` (groups)
   - `handleSubflowCreation/write2ProcessedReactflow.ts` (persistence)
   - `handleSubflowCreation.ts` (per-path orch)
   - `subWorkflowAdapter.ts` (main orch)
3. Update `reviewReactFlow.ts` integration
4. Test with 2, 3, 4 milestone waits
5. Validate edge rewiring and node uniqueness

---

## Conclusion

**Architecture is solid** with minor recommendations for validation and failsafe handling. The registry pattern ensures extensibility, queue-based processing handles multiple paths cleanly, and state persistence provides resume capability. Ready for implementation once edge rewiring utility and validation logic are added.
