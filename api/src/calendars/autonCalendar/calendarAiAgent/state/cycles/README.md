# Cycle State Management

## Overview

Cycles are **immutable records** that track the execution state of agent operations. They have only **3 states**: `processing`, `completed`, or `failed`.

The **Cycle Watcher** automatically updates cycle status based on orchestrator execution results.

---

## 📁 File Structure

```
state/
├── cycles.ts                    # ⭐ Main export (use this!)
├── cycles/                      # Cycle services
│   ├── index.ts                 # Barrel export
│   ├── createCycle.ts           # Create cycle (mints UUID, sets as current)
│   ├── updateCycle.ts           # Update status (+ convenience methods)
│   └── getCycle.ts              # Get cycle(s)
└── utils/
    └── cycleWatcher.ts          # 🔍 Auto-update cycle status
```

---

## 🔄 Cycle Lifecycle

```
createCycle()
    ↓
[processing] ← Initial state
    ↓
    ├─→ orchestrator succeeds → [completed] ✅
    └─→ orchestrator fails → [failed] ❌
```

---

## 📊 Cycle Document Structure

### Firestore Path
`tenants/{tenantId}/calendars/autonCalendar/aiAgent/main/cycles/{cycleId}`

### Document Schema
```typescript
{
  cycleId: string;               // UUID (auto-generated)
  tenantId: string;
  chatId: string | null;         // Link to chat session
  status: 'processing' | 'completed' | 'failed';
  createdAt: Date;
  startedAt?: Date;              // When processing started
  completedAt?: Date;            // When completed (if successful)
  failedAt?: Date;               // When failed (if error)
  error?: string;                // Error message (if failed)
  metadata?: Record<string, any>;
}
```

---

## 🎯 Key Principles

### 1. **Immutable Records**
Cycles are **pure immutable records**. Only status and timestamps can be updated.

### 2. **Always Mints New Cycle**
`createCycle()` **always** mints a new UUID and replaces `currentCycleId` in main document.

### 3. **3 States Only**
- `processing` - Cycle is running
- `completed` - Cycle finished successfully
- `failed` - Cycle encountered an error

### 4. **Auto-Tracking**
Cycle Watcher automatically updates status based on orchestrator results.

---

## 🚀 Usage

### Import Everything from One Place

```typescript
import {
  // Cycle operations
  createCycle,
  getCurrentCycle,
  getCycle,
  listCycles,
  updateCycle,
  completeCycle,
  failCycle,

  // Cycle Watcher
  watchCycle,
  completeCurrentCycle,
  failCurrentCycle,

  // Types
  type Cycle,
  type CycleStatus
} from './state/cycles';
```

---

## 📝 Service Documentation

### 1. **createCycle(tenantId, input?)**

Creates a new cycle and **mints a new UUID**, replacing `currentCycleId` in main.

```typescript
const cycle = await createCycle('tenant123', {
  chatId: 'chat456',  // Optional (defaults to current chat)
  metadata: {
    operation: 'create_event'
  }
});

// cycle.status = 'processing'
// cycle.cycleId is now in main.currentCycleId
```

**Returns:** `Cycle`

**Side Effects:**
- Mints new UUID
- Sets `currentCycleId` in main document
- Increments `totalCycles` counter
- Initial status: `processing`

---

### 2. **updateCycle(tenantId, cycleId, input)**

Updates cycle status and/or error message. Auto-sets timestamps.

```typescript
// Update status
await updateCycle('tenant123', 'cycle456', {
  status: 'completed'
});
// → Sets completedAt timestamp

await updateCycle('tenant123', 'cycle456', {
  status: 'failed',
  error: 'Calendar not found'
});
// → Sets failedAt timestamp + error message
```

**Returns:** `Cycle | null`

**Auto-Timestamps:**
- `status: 'completed'` → sets `completedAt`
- `status: 'failed'` → sets `failedAt`

---

### 3. **completeCycle(tenantId, cycleId)**

Convenience method to mark cycle as completed.

```typescript
await completeCycle('tenant123', 'cycle456');
// Equivalent to: updateCycle(tenantId, cycleId, { status: 'completed' })
```

---

### 4. **failCycle(tenantId, cycleId, error?)**

Convenience method to mark cycle as failed.

```typescript
await failCycle('tenant123', 'cycle456', 'Operation timed out');
// Equivalent to: updateCycle(tenantId, cycleId, { status: 'failed', error: '...' })
```

---

### 5. **getCurrentCycle(tenantId)**

Gets the currently active cycle using `currentCycleId` from main state.

```typescript
const cycle = await getCurrentCycle('tenant123');

if (cycle) {
  console.log(`Current cycle: ${cycle.status}`);
}
```

**Returns:** `Cycle | null`

**Uses:** `getCurrentState()` utility

---

### 6. **getCycle(tenantId, cycleId)**

Gets a specific cycle by ID.

```typescript
const cycle = await getCycle('tenant123', 'cycle456');
```

**Returns:** `Cycle | null`

---

### 7. **listCycles(tenantId, limit?)**

Lists all cycles for tenant, ordered by most recent.

```typescript
const cycles = await listCycles('tenant123', 10);

cycles.forEach(cycle => {
  console.log(`${cycle.cycleId}: ${cycle.status}`);
});
```

**Returns:** `Cycle[]`

**Order:** Descending by `createdAt`

---

## 🔍 Cycle Watcher

### Purpose
The Cycle Watcher automatically tracks orchestrator execution and updates cycle status:
- ✅ **Success** → marks cycle as `completed`
- ❌ **Failure** → marks cycle as `failed` with error message

### Mount in Request Orchestrator

```typescript
import { watchCycle } from './state/cycles';

export async function requestOrchestrator(tenantId: string, prompt: string) {
  // Wrap your orchestrator logic with watchCycle
  const { result, watcher } = await watchCycle(tenantId, async () => {
    // Your orchestrator logic here
    const response = await processRequest(prompt);
    return response;
  });

  if (!watcher.success) {
    console.log(`Cycle failed: ${watcher.error}`);
    throw new Error(watcher.error);
  }

  return result;
}
```

---

### Automatic Behavior

```typescript
// ✅ Success case
const { result, watcher } = await watchCycle(tenantId, async () => {
  return await createEvent(...);
});
// → Cycle status automatically set to 'completed'

// ❌ Failure case
const { result, watcher } = await watchCycle(tenantId, async () => {
  throw new Error('Calendar not found');
});
// → Cycle status automatically set to 'failed'
// → Error message stored in cycle.error
```

---

### Manual Cycle Control

If you need explicit control (without wrapper):

```typescript
// Complete current cycle manually
await completeCurrentCycle(tenantId);

// Fail current cycle manually
await failCurrentCycle(tenantId, 'Manual failure');
```

---

## 🎯 Common Patterns

### Pattern 1: Create Cycle + Watch Orchestrator

```typescript
import { createCycle, watchCycle } from './state/cycles';

export async function handleRequest(tenantId: string, prompt: string) {
  // 1. Create new cycle
  await createCycle(tenantId, {
    metadata: { prompt }
  });

  // 2. Execute with watcher
  const { result, watcher } = await watchCycle(tenantId, async () => {
    return await executeAgentPipeline(prompt);
  });

  // 3. Check result
  if (!watcher.success) {
    throw new Error(`Pipeline failed: ${watcher.error}`);
  }

  return result;
}
```

---

### Pattern 2: Inspect Cycle History

```typescript
// Get recent cycles
const cycles = await listCycles(tenantId, 20);

// Filter by status
const failed = cycles.filter(c => c.status === 'failed');
const completed = cycles.filter(c => c.status === 'completed');

console.log(`Success rate: ${completed.length}/${cycles.length}`);
```

---

### Pattern 3: Check Current Cycle Status

```typescript
const cycle = await getCurrentCycle(tenantId);

if (cycle && cycle.status === 'processing') {
  console.log('Agent is currently processing...');
}
```

---

## ⚙️ Integration with Request Orchestrator

### Recommended Setup

```typescript
// orchestrators/requestOrchestrator.ts
import { createCycle, watchCycle } from '../state/cycles';
import { createMessage } from '../state/chats';

export async function requestOrchestrator(
  tenantId: string,
  userPrompt: string
) {
  // 1. Create new cycle
  await createCycle(tenantId, {
    metadata: { prompt: userPrompt }
  });

  // 2. Add user message to chat
  await createMessage(tenantId, {
    role: 'user',
    content: userPrompt
  });

  // 3. Execute with cycle watcher
  const { result, watcher } = await watchCycle(tenantId, async () => {
    // Your orchestration logic
    const response = await planAndExecute(tenantId, userPrompt);
    return response;
  });

  // 4. Handle result
  if (!watcher.success) {
    // Add error message to chat
    await createMessage(tenantId, {
      role: 'assistant',
      content: `Sorry, I encountered an error: ${watcher.error}`
    });

    throw new Error(watcher.error);
  }

  // 5. Add success message to chat
  await createMessage(tenantId, {
    role: 'assistant',
    content: result.message,
    cycleId: watcher.cycleId!
  });

  return result;
}
```

---

## 🔒 Immutability Guarantees

### What Can Be Updated:
✅ `status` (processing → completed/failed)
✅ `error` (if failed)
✅ `completedAt` / `failedAt` timestamps
✅ `metadata` (if needed for extended fields later)

### What CANNOT Be Updated:
❌ `cycleId` (immutable UUID)
❌ `tenantId` (immutable)
❌ `chatId` (immutable link)
❌ `createdAt` (immutable timestamp)
❌ `startedAt` (immutable timestamp)

---

## 📊 Statistics & Monitoring

### Track Cycle Metrics

```typescript
const cycles = await listCycles(tenantId, 100);

const stats = {
  total: cycles.length,
  completed: cycles.filter(c => c.status === 'completed').length,
  failed: cycles.filter(c => c.status === 'failed').length,
  processing: cycles.filter(c => c.status === 'processing').length
};

const successRate = (stats.completed / stats.total * 100).toFixed(2);
console.log(`Success rate: ${successRate}%`);
```

---

## 🧪 Testing Checklist

- [ ] Create cycle → verify currentCycleId is set in main
- [ ] Create cycle → verify status starts as 'processing'
- [ ] Complete cycle → verify completedAt timestamp
- [ ] Fail cycle → verify failedAt timestamp + error message
- [ ] watchCycle success → verify auto-completion
- [ ] watchCycle failure → verify auto-failure with error
- [ ] getCurrentCycle → verify uses main.currentCycleId
- [ ] listCycles → verify order (newest first)

---

## 🚧 Future Extensions

Cycles are designed to be extended with additional fields later:

```typescript
// Future: Add execution details
metadata: {
  toolsUsed: ['createEvent', 'updateTask'],
  eventsCreated: ['event123', 'event456'],
  tasksUpdated: ['task789'],
  duration: 1250, // ms
  tokensUsed: 450
}
```

The core structure (3 states + timestamps) remains unchanged.

---

**Status:** ✅ **COMPLETE - Cycle State Management**

All cycle services and the cycle watcher are implemented and ready to use!
