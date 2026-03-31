# File Organization - Contact Field System

## ✅ Current Active Files

### **Planning Phase** (`/services/reviewReactFlow/`)
```
reviewReactFlow.ts                    ← Main planning orchestrator
  ├─ createSessionSkeleton.ts         ← Creates task skeleton
  ├─ exportTransformationMethods.ts   ← Exports method names
  └─ injectContactFieldAdapter.ts     ← NEW: Injects contact adapters (uses utils/topologicalSort)
```

**Flow**:
1. Load ReactFlow from Firestore
2. **Inject contact adapters** (trigger, FindContact, CreateContact)
3. Topological sort (includes adapters)
4. Create skeleton with adapters as tasks
5. **Save adapter map** to skeleton
6. Save to Firestore

---

### **Compilation Phase** (`/services/transform2N8n/`)
```
transform2N8n.ts                      ← Main compilation orchestrator
  ├─ transformationSession.ts         ← Executes skeleton tasks
  └─ resolveContactFields.ts          ← NEW: Resolves {{$contact.*}} per-node
```

**Flow**:
1. Load skeleton (includes adapter map)
2. For each task:
   - Get source node
   - **Resolve contact fields** using adapter map
   - Execute transformation
   - Batch save every 10 nodes
3. Build connections

---

### **State Management** (`/state/`)
```
types.ts                              ← MODIFIED: Added adapterMap to SessionSkeleton
skeleton/
  ├─ write.ts                         ← Saves skeleton (now includes adapterMap)
  └─ read.ts                          ← Loads skeleton (now includes adapterMap)
```

---

### **Orchestrator** (`/orchrestrators/`)
```
transformationOrchrestrator.ts        ← MODIFIED: Removed preprocessing phase
```

**Flow**:
1. Clear state
2. Planning (includes adapter injection)
3. Compilation (includes field resolution)

---

## 📦 Legacy Files (Kept for Reference)

### **Old Preprocessing System** (`/services/customFieldResolver/`)
```
⚠️ NO LONGER USED - Kept for reference and potential rollback

resolveCustomFields.ts                ← Old preprocessing orchestrator
  - Called before planning
  - Processed entire workflow at once
  - In-memory only, no state persistence
  - REPLACED BY: Integrated planning/compilation approach

contactCustomFields.ts                ← Old batch field resolver
  - Resolved all nodes at once
  - In-memory processing
  - REPLACED BY: /services/transform2N8n/resolveContactFields.ts

injectContactFieldAdapter.ts          ← MOVED to /services/reviewReactFlow/
graphUtils.ts                         ← MOVED to /services/reviewReactFlow/

index.ts                              ← Exports for backward compatibility
README.md                             ← Documentation (still useful)
IMPLEMENTATION_STATUS.md              ← Old implementation notes
```

---

## 🔄 Migration Summary

### **What Moved**:
| Old Location | New Location | Reason |
|--------------|--------------|--------|
| `/customFieldResolver/injectContactFieldAdapter.ts` | `/reviewReactFlow/injectContactFieldAdapter.ts` | Planning phase concern |
| `/customFieldResolver/graphUtils.ts` | ~~Deleted~~ | Redundant - uses `/utils/topologicalSort.ts` instead |

### **What's New**:
| File | Purpose |
|------|---------|
| `/transform2N8n/resolveContactFields.ts` | Per-node field resolution during compilation |

### **What's Legacy**:
| File | Status |
|------|--------|
| `/customFieldResolver/resolveCustomFields.ts` | ⚠️ Not used - kept for rollback |
| `/customFieldResolver/contactCustomFields.ts` | ⚠️ Not used - kept for rollback |

---

## 📋 Import Paths

### **Active Imports**:

```typescript
// Planning phase needs adapter injection
import { injectContactFieldAdapter } from './reviewReactFlow/injectContactFieldAdapter';

// Compilation phase needs field resolution
import { resolveContactFields } from './resolveContactFields';

// Type definitions
import type { SessionSkeleton } from '../state/types';  // Now includes adapterMap
```

### **Legacy Imports (Avoid)**:
```typescript
// ❌ DON'T USE - Old preprocessing approach
import { resolveCustomFields } from './customFieldResolver';
import { resolveContactCustomFields } from './customFieldResolver/contactCustomFields';
```

---

## 🎯 Key Benefits of New Organization

### ✅ **Logical Grouping**
- Planning files in `/reviewReactFlow/`
- Compilation files in `/transform2N8n/`
- Clear separation of concerns

### ✅ **No More Preprocessing**
- Adapter injection happens during planning
- Field resolution happens during compilation
- Single pass through workflow

### ✅ **State Persistence**
- Adapter map saved in skeleton (Firestore)
- Can resume compilation after failures
- No data loss

### ✅ **Batched Processing**
- Field resolution per-task (not all at once)
- Memory efficient
- Scalable to 1000+ nodes

### ✅ **Clean Architecture**
- Follows existing patterns
- Each phase self-contained
- Easy to test and maintain

---

## 🧪 Testing Import Paths

To verify files are organized correctly:

```bash
# Should work (active files)
grep -r "from './reviewReactFlow/injectContactFieldAdapter'" src/
grep -r "from './resolveContactFields'" src/n8n/transformationSystem/services/transform2N8n/

# Should return nothing (legacy not used)
grep -r "from './customFieldResolver/resolveCustomFields'" src/ --exclude-dir=customFieldResolver
grep -r "from './customFieldResolver/contactCustomFields'" src/ --exclude-dir=customFieldResolver
```

---

## 📝 Notes

1. **Legacy folder kept**: In case we need to rollback or reference old implementation
2. **Index exports maintained**: For backward compatibility with any external references
3. **Documentation preserved**: README and implementation notes still useful
4. **Clear warnings added**: Legacy files marked with ⚠️ headers

---

Generated: 2025-01-18
