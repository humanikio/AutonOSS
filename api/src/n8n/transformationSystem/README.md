# Transformation System

A modular, session-based build system for transforming ReactFlow workflows into n8n workflows.

## Architecture

The transformation system follows a **compiler-like architecture** with three phases:

```
1. Planning Phase    → Analyze ReactFlow, inject adapters, create build plan
2. Compilation Phase → Execute build plan, resolve fields, generate n8n nodes
3. Validation Phase  → Validate final workflow (TODO)
```

### State Management Philosophy

The system maintains **two separate ReactFlow representations**:

1. **Original ReactFlow** (`/workflows/{id}`) - Frontend source of truth
   - Clean 11-node workflow visible in UI
   - Never modified by backend processing
   - User-editable graph structure

2. **Processed ReactFlow** (`/n8n/buildSession/processedReactFlow`) - Compilation source
   - Adapter-enhanced 14-node workflow
   - Computed during planning, persisted for recovery
   - Invisible to frontend, used only by backend

## Directory Structure

```
transformationSystem/
├── orchrestrators/
│   └── transformationOrchrestrator.ts    # Entry point - coordinates all phases
│
├── services/
│   ├── reviewReactFlow.ts                # Planning Phase service
│   │   ├── createSessionSkeleton.ts      # Extract ordered build plan
│   │   └── exportTransformationMethods.ts # List transformation methods
│   │
│   └── transform2N8n.ts                  # Compilation Phase service
│       └── transformationSession.ts      # Session class - executes skeleton
│
├── state/                                # Firestore state management
│   ├── skeleton/                         # Build plan (ordered tasks)
│   ├── processedReactFlow/               # Adapter-enhanced workflow (NEW)
│   ├── compiledWorkflow/                 # Compiled n8n nodes
│   └── session/                          # Session metadata
│
├── transformationMethodRegistry/
│   ├── index.ts                          # Registry singleton
│   ├── types/                            # Shared transformation types
│   ├── n8n/nodeSchemas/                  # Local n8n node schemas
│   └── eventWaitMethod/                  # Transformation patterns
│       └── wait_AppointmentMilestone.ts
│
└── utils/
    ├── pullMethod.ts                     # Registry lookup
    └── topologicalSort.ts                # Determine execution order
```

## Usage

### Entry Point

```typescript
import { transformWorkflow } from './transformationSystem';

const result = await transformWorkflow(
  'tenant-123',
  'workflow-456',
  'api-key-optional'
);

console.log(result);
// {
//   success: true,
//   phase: 'complete',
//   totalMethods: 5,
//   totalNodes: 15
// }
```

### Individual Phases

```typescript
import { reviewReactFlow, transform2N8n } from './transformationSystem';

// Phase 1: Planning
const planning = await reviewReactFlow('tenant-123', 'workflow-456');

// Phase 2: Compilation
const compilation = await transform2N8n('tenant-123', 'workflow-456', 'api-key');
```

## How It Works

### Phase 1: Planning (`reviewReactFlow`)

1. **Load**: Fetches original ReactFlow workflow from Firestore
2. **Inject Adapters**: Adds contact field adapter nodes after data sources
   - Trigger nodes → `contactAdapter-trigger-X`
   - Find Contact → `contactAdapter-action-X`
   - Create Contact → `contactAdapter-action-X`
   - Adapters call `/api/contacts/:id/flattened` to fetch contact data
3. **Topological Sort**: Determines execution order (now includes adapter nodes)
4. **Create Skeleton**: Maps each node (11 original + 3 adapters = 14) to transformation method
5. **Save State**: Writes to Firestore atomically
   - Processed ReactFlow → `n8n/buildSession/processedReactFlow/main`
   - Skeleton with adapter map → `n8n/buildSession/sessionSkeleton/main`
6. **Return**: Returns adapter-enhanced workflow to orchestrator for in-memory passing

**Output:** Session skeleton (14 tasks) + Processed ReactFlow (14 nodes)

### Phase 2: Compilation (`transform2N8n`)

1. **Load Skeleton**: Fetches build plan from Firestore
2. **Load Workflow**: Chooses source for ReactFlow nodes
   - **Happy Path**: Uses adapter-enhanced workflow passed from orchestrator (in-memory, fast)
   - **Recovery Path**: Loads processed ReactFlow from Firestore (retry scenarios)
3. **Initialize Session**: Creates transformation session with 14-node workflow
4. **Execute Tasks**: For each task in skeleton (in order):
   - Resolve contact fields (`{{$contact.*}}` → n8n expressions)
   - Pull transformation method from registry
   - Execute transformation with resolved node
   - Accumulate result nodes in memory
   - Update context for next transformation
   - Mark task complete in skeleton
   - Flush to Firestore every 10 methods
5. **Build Connections**: Wire all nodes using skeleton edges + internal edges

**Output:** Compiled n8n workflow with connections

### Phase 3: Validation (TODO)

Validates the compiled workflow structure.

## Firestore Structure

```
tenants/{tenantId}/workflows/{workflowId}/
├── [root doc]                        # Original ReactFlow (11 nodes)
│   ├── name: string                  # Frontend source of truth
│   ├── nodes: ReactFlowNode[]        # NEVER modified by backend
│   └── edges: ReactFlowEdge[]        # User-editable graph
│
└── n8n/
    └── buildSession/
        ├── [root doc]                    # Session metadata
        │   ├── status: "planning" | "compiling" | "complete" | "failed"
        │   ├── startedAt: Timestamp
        │   ├── completedAt: Timestamp
        │   ├── totalMethods: number
        │   └── totalNodesCreated: number
        │
        ├── processedReactFlow/           # NEW: Adapter-enhanced workflow
        │   └── main                      # Computed during planning
        │       ├── name: string
        │       ├── nodes: ReactFlowNode[]     # 14 nodes (11 + 3 adapters)
        │       ├── edges: ReactFlowEdge[]     # Includes adapter edges
        │       ├── originalNodeCount: number  # 11
        │       ├── adapterNodeCount: number   # 3
        │       └── createdAt: Timestamp
        │
        ├── sessionSkeleton/
        │   └── main                      # Build plan
        │       ├── methods: SkeletonTask[]    # 14 tasks
        │       ├── edges: ReactFlowEdge[]
        │       ├── adapterMap: Record<string, string>  # nodeId → adapterNodeId
        │       └── createdAt: Timestamp
        │
        └── compiledWorkflow/
            └── main                      # Compiled nodes
                ├── nodes: any[]          # n8n nodes
                ├── internalEdges: TransformationEdge[]
                ├── replacements: Record<string, NodeReplacement>
                └── lastAppendedAt: Timestamp
```

## Adding New Transformations

### 1. Create transformation pattern

```typescript
// transformationMethodRegistry/myCategory/myTransformation.ts
import type { Transformation } from '../types/transformationMethodTypes';

export class MyTransformation implements Transformation {
  readonly name = 'my_transformation';
  readonly priority = 100;

  matches(node, config) {
    // Return true if this transformation should apply
  }

  async transform(node, config, context) {
    // Return TransformationResult
    return {
      nodes: [...],
      internalEdges: [...],
      replacements: {...},
      metadata: {...},
    };
  }
}

export const myTransformation = new MyTransformation();
```

### 2. Register in registry

```typescript
// transformationMethodRegistry/index.ts
import { myTransformation } from './myCategory/myTransformation';

private constructor() {
  this.register(waitAppointmentMilestone);
  this.register(myTransformation);  // ← Add here
}
```

### 3. Declare in node config

```typescript
// workflows/services/nodeRegistry/nodes/action/myNode.config.ts
export const myNode: INodeTypeDescription = {
  // ... node config ...
  _pulseline: {
    transformationMethod: 'my_transformation',  // ← Declare here
  },
};
```

## Key Concepts

### Build Plan (Skeleton)

The skeleton is an ordered list of transformation tasks. Each task specifies:
- **position**: Execution order (from topological sort)
- **methodName**: Which transformation to use
- **sourceNodeId**: ReactFlow node ID
- **status**: pending | completed | failed

### Transformation Context

Each transformation receives:
- **allNodes**: All ReactFlow nodes
- **allEdges**: All ReactFlow edges
- **nodeIdToName**: Map of node IDs to names
- **n8nBaseUrl**: Base URL for webhook generation

Context is updated after each transformation so later transformations can reference earlier ones.

### Session State

The session maintains state in Firestore:
- **Processed ReactFlow**: Adapter-enhanced workflow (14 nodes)
- **Skeleton**: Build plan with task status + adapter map
- **Compiled Workflow**: Accumulated n8n nodes
- **Session Metadata**: Status, timestamps, error info

This enables:
- **Progress tracking**: Task-by-task status updates
- **Error recovery**: Compilation can restart from Firestore state
- **Frontend isolation**: Original workflow never modified
- **Debugging**: Full audit trail of computed workflows
- **Future caching**: Incremental builds possible

### Recovery Scenarios

**1. Happy Path (No Failures)**
- Planning phase returns adapter-enhanced workflow in-memory
- Orchestrator passes directly to compilation (no Firestore read)
- Fast, efficient single-pass execution

**2. Compilation Failure + Retry**
- User/system retries compilation without re-running planning
- Compilation loads processed ReactFlow from Firestore
- Has all 14 nodes (including adapters) to proceed

**3. State Corruption Recovery**
- Orchestrator clears all build state atomically
- Re-runs planning phase (re-computes adapters)
- Fresh processedReactFlow + skeleton created
- Compilation proceeds with clean state

## Design Principles

1. **Declarative over Imperative** - Nodes declare their transformation method
2. **Stateful Compilation** - Session tracks progress in Firestore
3. **Ordered Execution** - Topological sort ensures deterministic builds
4. **Batch Processing** - Flush to Firestore every 10 methods (memory efficient)
5. **Modular** - Each transformation is self-contained
6. **Type Safe** - TypeScript interfaces enforce contracts

## Future Enhancements

- [ ] Caching (reuse unchanged transformations)
- [ ] Incremental builds (only rebuild changed nodes)
- [ ] Parallel execution (independent transformations)
- [ ] Validation phase implementation
- [ ] Edge wiring with replacement mappings
- [ ] Standard transformation for non-custom nodes
