# Event Service Implementation Plan

**Goal**: Implement full multi-stage eventService architecture (matching taskService pattern)

**Status**: In Progress - Handler Contexts Complete

---

## Architecture Overview

```
eventService.ts (Main Orchestrator)
├── Stage 1: Build Prompt (promptBuilder)
├── Stage 2: Review Operations (eventBrain/reviewPrompt) - LLM Call #1
├── Stage 3: Pull Contexts (eventBrain/pullContext)
├── Stage 4: Generate Handler JSONs (eventBrain/generateHandlerJsons) - LLM Call #2
└── Stage 5: Execute Handlers (handlerQueueExecutor)
```

---

## Progress Checklist

### ✅ Phase 1: Handler Context Files
- [x] Create `/promptBuilder/eventHandlerContext/createEvent.ts`
- [x] Create `/promptBuilder/eventHandlerContext/updateEvent.ts`
- [x] Create `/promptBuilder/eventHandlerContext/readEvent.ts`
- [x] Create `/promptBuilder/eventHandlerContext/getEvents.ts`
- [x] Create `/promptBuilder/eventHandlerContext/deleteEvent.ts`
- [x] Create `/promptBuilder/eventHandlerContext/index.ts` (exports)
- [x] Create `/promptBuilder/eventHandlerContext.ts` (basic descriptions)

### 🔄 Phase 2: Prompt Builder System
**Location**: `/services/eventService/promptBuilder/`

- [ ] **systemPrompt.ts**
  - Copy from taskService and adapt for events
  - Update handler references (createEventHandler, updateEventHandler, etc.)
  - Keep same structure and instructions

- [ ] **outputFormat.ts**
  - Copy from taskService and adapt
  - Change handler names to event handlers
  - Keep same JSON structure

- [ ] **calendarContext.ts**
  - Copy from taskService (should be nearly identical)
  - Instructions for when/how to use calendar context
  - Best practices for date ranges

- [ ] **index.ts** (Main prompt builder)
  - Copy from taskService `promptBuilder.ts`
  - Import HANDLER_DESCRIPTIONS from eventHandlerContext.ts
  - Import systemPrompt, outputFormat, calendarContext
  - Export `buildPrompt()` function
  - Update references from "task" to "event"

**Files to create:**
```
promptBuilder/
├── eventHandlerContext.ts ✅
├── eventHandlerContext/ ✅
│   ├── createEvent.ts ✅
│   ├── updateEvent.ts ✅
│   ├── readEvent.ts ✅
│   ├── getEvents.ts ✅
│   ├── deleteEvent.ts ✅
│   └── index.ts ✅
├── systemPrompt.ts ⏳
├── outputFormat.ts ⏳
├── calendarContext.ts ⏳
└── index.ts ⏳
```

---

### 🔄 Phase 3: Event Brain (Multi-Stage LLM System)
**Location**: `/services/eventService/eventBrain/`

#### 3.1: reviewPrompt.ts (Stage 1)
**Reference**: `taskService/taskBrain/reviewPrompt.ts`

- [ ] Copy structure from taskService reviewPrompt
- [ ] Update handler types: 'create' | 'update' | 'delete' | 'read' | 'getEvents'
- [ ] Update OUTPUT_FORMAT for event operations
- [ ] Update system prompt references
- [ ] Export `ReviewPromptOutput` interface
- [ ] Export `reviewPrompt()` function

**Output Interface:**
```typescript
interface ReviewPromptOutput {
  operations: Array<{
    handler: 'create' | 'update' | 'delete' | 'read' | 'getEvents';
    reasoning: string;
  }>;
  contextRequest: {
    needed: boolean;
    dateRange?: { start: string; end: string };
    includeTasks?: boolean;
    includeEvents?: boolean;
    reasoning?: string;
  };
}
```

#### 3.2: pullContext.ts (Stage 2)
**Reference**: `taskService/taskBrain/pullContext.ts`

- [ ] Copy structure from taskService pullContext
- [ ] Import event handler contexts instead of task contexts
- [ ] Update switch statement for event handlers
- [ ] Import `postPendingToolMessage`, `postSuccessToolMessage`
- [ ] Add tool messages for calendar context fetching
- [ ] Export `pullContext()` function

**Imports needed:**
```typescript
import { CREATE_EVENT_CONTEXT } from '../promptBuilder/eventHandlerContext/createEvent';
import { UPDATE_EVENT_CONTEXT } from '../promptBuilder/eventHandlerContext/updateEvent';
import { DELETE_EVENT_CONTEXT } from '../promptBuilder/eventHandlerContext/deleteEvent';
import { READ_EVENT_CONTEXT } from '../promptBuilder/eventHandlerContext/readEvent';
import { GET_EVENTS_CONTEXT } from '../promptBuilder/eventHandlerContext/getEvents';
import { fetchCalendarContext, formatCalendarContextForLLM } from '../../shared/calendarContext';
import { postPendingToolMessage, postSuccessToolMessage } from '../../shared/postToolMessage';
```

#### 3.3: generateHandlerJsons/ (Stage 3)
**Reference**: `taskService/taskBrain/generateHandlerJsons/`

Create subdirectory with:

- [ ] **systemPrompt.ts**
  - Copy from taskService and adapt for events
  - Update references to event handlers

- [ ] **outputFormat.ts**
  - Copy from taskService and adapt
  - Update handler types to event handlers
  - Keep same JSON structure

- [ ] **index.ts**
  - Copy from taskService generateHandlerJsons
  - Update imports and references
  - Export `generateHandlerJsons()` function

**Output Interface:**
```typescript
interface GenerateHandlerJsonsOutput {
  message: string;
  handlerCalls: Array<{
    handler: string;
    parameters: Record<string, any>;
  }>;
}
```

**Files to create:**
```
eventBrain/
├── reviewPrompt.ts ⏳
├── pullContext.ts ⏳
└── generateHandlerJsons/ ⏳
    ├── systemPrompt.ts ⏳
    ├── outputFormat.ts ⏳
    └── index.ts ⏳
```

---

### 🔄 Phase 4: Event Handlers
**Location**: `/services/eventService/handlers/`

**Reference**: `taskService/handlers/`

Each handler should:
1. Import eventManager functions
2. Import `postPendingToolMessage`, `postSuccessToolMessage`, `postErrorToolMessage`
3. Post pending message before operation
4. Execute operation using eventManager
5. Post success/error message after operation
6. Return standardized result

#### 4.1: createEvent.ts
- [ ] Import `createEvent` from eventManager
- [ ] Import postToolMessage utilities
- [ ] Define `CreateEventParams` interface
- [ ] Implement handler with tool messages
- [ ] Handle attendees array transformation
- [ ] Return success/error result

**Template:**
```typescript
export async function createEventHandler(
  params: CreateEventParams,
  context: ToolExecutionContext
): Promise<HandlerResult> {
  await postPendingToolMessage({
    tenantId: context.tenantId,
    chatId: context.chatId,
    calendarId: context.calendarId,
    toolType: 'event',
    action: 'create',
    message: `Creating event "${params.eventName}"...`
  });

  // ... create event ...

  await postSuccessToolMessage({
    toolType: 'event',
    action: 'create',
    message: `Created event "${event.eventName}"!`,
    entityId: event.eventId,
    entityType: 'event'
  });

  return { success: true, data: event };
}
```

#### 4.2: updateEvent.ts
- [ ] Import `updateEvent` from eventManager
- [ ] Post pending message
- [ ] Execute update
- [ ] Post success/error message
- [ ] Return result

#### 4.3: deleteEvent.ts
- [ ] Import `deleteEvent` from eventManager
- [ ] Post pending message
- [ ] Execute deletion
- [ ] Post success/error message
- [ ] Return boolean result

#### 4.4: readEvent.ts
- [ ] Import `readEvent` from eventManager
- [ ] Post pending message
- [ ] Fetch event
- [ ] Post success/error message
- [ ] Return event or null

#### 4.5: getEvents.ts
- [ ] Import `getEvents` from eventManager
- [ ] Post pending message
- [ ] Fetch all events
- [ ] Post success message with count
- [ ] Return events array

**Shared Types** (create `/handlers/types.ts`):
```typescript
export interface ToolExecutionContext {
  tenantId: string;
  chatId?: string;
  calendarId?: string;
}

export interface HandlerResult {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}
```

**Files to create:**
```
handlers/
├── types.ts ⏳
├── createEvent.ts ⏳
├── updateEvent.ts ⏳
├── deleteEvent.ts ⏳
├── readEvent.ts ⏳
└── getEvents.ts ⏳
```

---

### 🔄 Phase 5: Handler Queue Executor
**Location**: `/services/eventService/utils/`

- [ ] **handlerQueueExecutor.ts**
  - Copy from taskService utils
  - Import event handlers instead of task handlers
  - Update handler map to event handlers
  - Keep same execution logic
  - Export `executeHandlerQueue()` function

**Handler Map:**
```typescript
const HANDLER_MAP = {
  createEventHandler: createEventHandler,
  updateEventHandler: updateEventHandler,
  deleteEventHandler: deleteEventHandler,
  readEventHandler: readEventHandler,
  getEventsHandler: getEventsHandler
};
```

**Files to create:**
```
utils/
└── handlerQueueExecutor.ts ⏳
```

---

### 🔄 Phase 6: Main Event Service Orchestrator

- [ ] **eventService.ts** (root of eventService/)
  - Copy structure from `taskService.ts`
  - Update all imports to event modules
  - Update references from "task" to "event"
  - Keep same 5-stage flow
  - Export `processEvent()` function
  - Export `ProcessEventResult` interface

**Flow:**
```typescript
export async function processEvent(
  toolContext: EventToolContext,
  executionContext: ToolExecutionContext
): Promise<ProcessEventResult> {
  // Stage 1: Build Prompt
  const prompt = await buildPrompt({ ... });

  // Stage 2: Review Operations (LLM Call #1)
  const reviewOutput = await reviewPrompt(prompt);

  // Stage 3: Pull Contexts
  const detailedContext = await pullContext(tenantId, chatId, calendarId, reviewOutput);

  // Stage 4: Generate Handler JSONs (LLM Call #2)
  const handlerJsons = await generateHandlerJsons(reviewOutput, detailedContext);

  // Post Stage 4 message to user
  await createMessage(tenantId, { ... });

  // Stage 5: Execute Handlers
  const results = await executeHandlerQueue(handlerJsons.handlerCalls, executionContext);

  return { success: true, results };
}
```

**Files to update:**
```
eventService.ts ⏳ (replace stub)
```

---

### 🔄 Phase 7: Update Event Tool

- [ ] **Update eventTool.ts**
  - Import new `processEvent` from eventService
  - Replace stub implementation
  - Pass `EventToolContext` and `ToolExecutionContext`
  - Return `ProcessEventResult`

**Location**: `/services/eventService/tools/eventTool.ts`

---

## File Structure (Final)

```
eventService/
├── IMPLEMENTATION_PLAN.md ✅
├── eventService.ts ⏳ (Main orchestrator)
├── promptBuilder/
│   ├── index.ts ⏳
│   ├── systemPrompt.ts ⏳
│   ├── outputFormat.ts ⏳
│   ├── calendarContext.ts ⏳
│   ├── eventHandlerContext.ts ✅
│   └── eventHandlerContext/
│       ├── index.ts ✅
│       ├── createEvent.ts ✅
│       ├── updateEvent.ts ✅
│       ├── readEvent.ts ✅
│       ├── getEvents.ts ✅
│       └── deleteEvent.ts ✅
├── eventBrain/
│   ├── reviewPrompt.ts ⏳
│   ├── pullContext.ts ⏳
│   └── generateHandlerJsons/
│       ├── index.ts ⏳
│       ├── systemPrompt.ts ⏳
│       └── outputFormat.ts ⏳
├── handlers/
│   ├── types.ts ⏳
│   ├── createEvent.ts ⏳
│   ├── updateEvent.ts ⏳
│   ├── deleteEvent.ts ⏳
│   ├── readEvent.ts ⏳
│   └── getEvents.ts ⏳
└── utils/
    └── handlerQueueExecutor.ts ⏳
```

---

## Key Differences from TaskService

1. **Event Types**: "meeting" | "call" | "video" | "task" | "reminder" | "appointment"
2. **Required Fields**: startTime and endTime are required (tasks have optional dueDate/dueTime)
3. **Attendees**: Events have complex attendee management (tasks have simple assignees)
4. **Timezones**: Events have timezone field (tasks don't)
5. **Handler Names**: createEventHandler vs createTaskHandler, etc.

---

## Implementation Order

1. ✅ **Handler Contexts** (Phase 1) - COMPLETE
2. ⏳ **Prompt Builder** (Phase 2)
3. ⏳ **Event Brain** (Phase 3)
4. ⏳ **Handlers** (Phase 4)
5. ⏳ **Queue Executor** (Phase 5)
6. ⏳ **Main Orchestrator** (Phase 6)
7. ⏳ **Update Tool** (Phase 7)

---

## Testing Checklist

After implementation:

- [ ] Create simple event: "Schedule meeting tomorrow at 2pm"
- [ ] Create event with attendees: "Schedule video call with Sarah at 3pm"
- [ ] Update event time: "Reschedule my 2pm meeting to 4pm"
- [ ] Delete event: "Cancel my meeting with Sarah"
- [ ] List events: "What events do I have?"
- [ ] Get specific event: "Show me details of my 2pm meeting"
- [ ] Create recurring event: "Schedule weekly standup every Monday at 10am"
- [ ] Verify tool messages appear in chat
- [ ] Verify calendar context integration works
- [ ] Test error handling for invalid times/dates

---

## Notes

- All datetime fields must be ISO 8601 format with UTC timezone
- Event creation triggers milestone system (event_created notification)
- Attendees are managed via attendeeOrchestrator (cascade operations)
- Color defaults to "#3B82F6" (blue)
- Timezone defaults to "America/New_York"
- Tool messages follow same pattern as taskService
- Calendar context fetch should work identically to taskService

---

**Last Updated**: 2025-12-05
**Status**: Phase 1 Complete, Ready for Phase 2
