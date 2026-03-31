# Calendar Context Architecture Proposal

## Overview

This document proposes architectural enhancements to provide calendar-wide context (tasks + events) to both the **Brain** (planCycle) and **Task Service** for improved semantic understanding, conflict detection, and ID-less operations.

---

## Current State Analysis

### 1. Calendar ID Flow

**Current Implementation:**
```typescript
// API Request
POST /api/calendar-agent/send-message
Body: { prompt: string, chatId?: string, calendarId?: string }

// Stored in Cycle State
interface Cycle {
  cycleId: string;
  tenantId: string;
  chatId: string | null;
  calendarId?: string;  // ✅ ALREADY STORED IN STATE
  // ...
}
```

**✅ Good News**: `calendarId` is **already stored** in cycle state and flows through the entire system!

**Current Flow**:
1. User sends message with `calendarId` in request body
2. Controller creates cycle with `calendarId`
3. Cycle state persists to Firestore
4. All services (planCycle, taskService, etc.) receive `calendarId` via `executionContext`

**Conclusion**: We don't need to discover `calendarId` - it's already available!

---

### 2. Existing Data Access Services

We already have all the data services we need:

#### Calendar Manager
- `getCalendars(tenantId)` - List all calendars for tenant
- `readCalendar(tenantId, calendarId)` - Get specific calendar

#### Task Manager
- `getTasks(tenantId, calendarId)` - **Get ALL tasks for calendar**
- `readTask(tenantId, calendarId, taskId)` - Get specific task

#### Event Manager
- `getEvents(tenantId, calendarId)` - **Get ALL events for calendar**
- `readEvent(tenantId, calendarId, eventId)` - Get specific event

**Key Insight**: `getTasks()` and `getEvents()` already return **all** data for a calendar - no filtering needed at service layer!

---

### 3. Existing Tools

Current tools are **empty placeholders**:
- `readCalendar.ts` - 0 bytes (empty)
- `listCalendars.ts` - 0 bytes (empty)

But we have **implemented tools**:
- `taskTool.ts` - Thin adapter, passes context to taskService
- `eventTool.ts` - Thin adapter, passes context to eventService

**Pattern**: Tools are thin adapters that normalize context before calling services.

---

## Problem Statement

### What We Need

1. **Brain (planCycle)** needs calendar context BEFORE creating tool calls:
   - See existing tasks/events to understand user context
   - Detect conflicts ("schedule meeting at 2pm" but 2pm is busy)
   - Semantic understanding ("update my dentist appointment" - find it without ID)
   - Smart suggestions ("you have 3 calls tomorrow, want to batch them?")

2. **Task Service** needs calendar context for semantic operations:
   - Finding tasks to update without IDs ("update my budget review task")
   - Finding tasks to delete semantically ("delete the call with John")
   - Conflict detection before creating tasks
   - Date-aware suggestions

---

## Proposed Architecture

### Option 1: Context Gathering Service (RECOMMENDED)

Create a **centralized context gathering service** that both Brain and Tools can use.

#### New Service: `contextGatherer.ts`

```typescript
// /services/shared/contextGatherer.ts

export interface CalendarContext {
  calendar: Calendar;
  tasks: Task[];
  events: CalendarEvent[];
  summary: {
    totalTasks: number;
    totalEvents: number;
    upcomingTasks: Task[];      // Next 7 days
    upcomingEvents: CalendarEvent[];  // Next 7 days
    todaySchedule: CalendarEvent[];
  };
}

export interface ContextGathererOptions {
  includeTasks?: boolean;         // Default: true
  includeEvents?: boolean;        // Default: true
  dateRange?: {
    start: Date;
    end: Date;
  };
  taskFilters?: {
    status?: 'pending' | 'completed' | 'all';
    priority?: 'low' | 'medium' | 'high';
  };
}

/**
 * Gather comprehensive calendar context
 * Used by both Brain (planCycle) and Task/Event services
 */
export async function gatherCalendarContext(
  tenantId: string,
  calendarId: string,
  options?: ContextGathererOptions
): Promise<CalendarContext> {
  const {
    includeTasks = true,
    includeEvents = true,
    dateRange,
    taskFilters
  } = options || {};

  // Fetch calendar metadata
  const calendar = await readCalendar(tenantId, calendarId);
  if (!calendar) {
    throw new Error(`Calendar not found: ${calendarId}`);
  }

  // Fetch tasks if requested
  let tasks: Task[] = [];
  if (includeTasks) {
    const allTasks = await getTasks(tenantId, calendarId);

    // Apply filters
    tasks = allTasks.filter(task => {
      // Filter by date range
      if (dateRange && task.dueDate) {
        const taskDate = new Date(task.dueDate);
        if (taskDate < dateRange.start || taskDate > dateRange.end) {
          return false;
        }
      }

      // Filter by status
      if (taskFilters?.status && taskFilters.status !== 'all') {
        if (taskFilters.status === 'completed' && task.status !== 'completed') {
          return false;
        }
        if (taskFilters.status === 'pending' && task.status === 'completed') {
          return false;
        }
      }

      // Filter by priority
      if (taskFilters?.priority && task.priority !== taskFilters.priority) {
        return false;
      }

      return true;
    });
  }

  // Fetch events if requested
  let events: CalendarEvent[] = [];
  if (includeEvents) {
    const allEvents = await getEvents(tenantId, calendarId);

    // Apply date range filter
    if (dateRange) {
      events = allEvents.filter(event => {
        const eventStart = new Date(event.startTime);
        return eventStart >= dateRange.start && eventStart <= dateRange.end;
      });
    } else {
      events = allEvents;
    }
  }

  // Build summary
  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  const upcomingTasks = tasks.filter(task => {
    if (!task.dueDate) return false;
    const dueDate = new Date(task.dueDate);
    return dueDate >= now && dueDate <= sevenDaysFromNow;
  });

  const upcomingEvents = events.filter(event => {
    const startTime = new Date(event.startTime);
    return startTime >= now && startTime <= sevenDaysFromNow;
  });

  const todaySchedule = events.filter(event => {
    const startTime = new Date(event.startTime);
    return startTime >= now && startTime <= todayEnd;
  });

  return {
    calendar,
    tasks,
    events,
    summary: {
      totalTasks: tasks.length,
      totalEvents: events.length,
      upcomingTasks,
      upcomingEvents,
      todaySchedule
    }
  };
}

/**
 * Format calendar context for LLM consumption
 * Converts context into natural language for prompt injection
 */
export function formatContextForLLM(context: CalendarContext): string {
  const { calendar, tasks, events, summary } = context;

  let output = `\n====================\nCALENDAR CONTEXT\n====================\n\n`;
  output += `Calendar: ${calendar.name}\n`;
  output += `Total Tasks: ${summary.totalTasks}\n`;
  output += `Total Events: ${summary.totalEvents}\n\n`;

  // Today's schedule
  if (summary.todaySchedule.length > 0) {
    output += `TODAY'S SCHEDULE (${summary.todaySchedule.length} events):\n`;
    summary.todaySchedule.forEach(event => {
      const start = new Date(event.startTime);
      const end = new Date(event.endTime);
      output += `  - ${start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} - ${end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}: ${event.eventName}\n`;
    });
    output += `\n`;
  }

  // Upcoming tasks
  if (summary.upcomingTasks.length > 0) {
    output += `UPCOMING TASKS (Next 7 days):\n`;
    summary.upcomingTasks.slice(0, 10).forEach(task => {  // Limit to 10 for LLM context
      const due = task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date';
      output += `  - ${task.taskName} (${task.priority || 'normal'} priority, due: ${due})\n`;
    });
    if (summary.upcomingTasks.length > 10) {
      output += `  ... and ${summary.upcomingTasks.length - 10} more\n`;
    }
    output += `\n`;
  }

  // Upcoming events
  if (summary.upcomingEvents.length > 0) {
    output += `UPCOMING EVENTS (Next 7 days):\n`;
    summary.upcomingEvents.slice(0, 10).forEach(event => {
      const start = new Date(event.startTime);
      output += `  - ${start.toLocaleDateString()} at ${start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}: ${event.eventName}\n`;
    });
    if (summary.upcomingEvents.length > 10) {
      output += `  ... and ${summary.upcomingEvents.length - 10} more\n`;
    }
    output += `\n`;
  }

  output += `Use this context to:\n`;
  output += `1. Detect scheduling conflicts\n`;
  output += `2. Find tasks/events by semantic description (without IDs)\n`;
  output += `3. Provide intelligent suggestions\n`;
  output += `4. Understand user's current workload\n`;

  return output;
}
```

---

### Integration Points

#### 1. Brain (planCycle) Integration

**Modify**: `/services/planCycle/promptBuilder.ts`

```typescript
import { gatherCalendarContext, formatContextForLLM } from '../shared/contextGatherer';

export async function buildPrompt(input: PromptBuilderInput): Promise<string> {
  // ... existing code ...

  // NEW: Gather calendar context if calendarId provided
  let calendarContext = '';
  if (input.calendarId) {
    const context = await gatherCalendarContext(input.tenantId, input.calendarId, {
      dateRange: {
        start: new Date(),
        end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)  // Next 7 days
      }
    });
    calendarContext = formatContextForLLM(context);
  }

  const compiledPrompt = `
${SYSTEM_PROMPT}

---

${calendarContext}  // NEW: Injected here

---

${TOOL_CONTEXT}

---

${OUTPUT_FORMAT}

---

Conversation History:
${chatContext}

---

Current User Request:
${currentPrompt}
`.trim();

  return compiledPrompt;
}
```

**Update**: `/services/planCycle/promptBuilder.ts` interface

```typescript
export interface PromptBuilderInput {
  tenantId: string;
  cycleId: string;
  chatId: string;
  calendarId?: string;  // NEW: Add calendarId
}
```

**Modify**: Caller in plan cycle service to pass calendarId from cycle state

```typescript
// Get cycle (which has calendarId)
const cycle = await getCycle(tenantId, cycleId);

const prompt = await buildPrompt({
  tenantId,
  cycleId,
  chatId,
  calendarId: cycle.calendarId  // NEW: Pass from cycle
});
```

---

#### 2. Task Service Integration

**Modify**: `/services/taskService.ts`

```typescript
import { gatherCalendarContext } from '../shared/contextGatherer';

export async function processTask(
  toolContext: TaskToolContext,
  executionContext: ToolExecutionContext
): Promise<ProcessTaskResult> {
  // ... existing code ...

  // NEW: Gather calendar context for semantic operations
  let calendarContext: CalendarContext | null = null;

  if (executionContext.calendarId) {
    calendarContext = await gatherCalendarContext(
      executionContext.tenantId,
      executionContext.calendarId,
      {
        includeTasks: true,
        includeEvents: false,  // Tasks service doesn't need events
        dateRange: {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),  // Past 30 days
          end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)   // Next 30 days
        }
      }
    );
  }

  // Stage 1: Build Prompt (with context)
  const prompt = await buildPrompt({
    userIntent: toolContext.intent || toolContext.userRequest,
    userRequest: toolContext.userRequest,
    calendarId: executionContext.calendarId || '',
    calendarContext  // NEW: Pass context
  });

  // ... rest of process...
}
```

**Modify**: `/services/taskService/promptBuilder.ts`

```typescript
import type { CalendarContext } from '../shared/contextGatherer';
import { formatContextForLLM } from '../shared/contextGatherer';

export interface BuildPromptInput {
  userIntent: string;
  userRequest: string;
  calendarId: string;
  calendarContext?: CalendarContext;  // NEW
}

export async function buildPrompt(input: BuildPromptInput): Promise<string> {
  const { userIntent, userRequest, calendarId, calendarContext } = input;

  // NEW: Format calendar context for LLM
  const contextSection = calendarContext
    ? formatContextForLLM(calendarContext)
    : '';

  const prompt = `
${SYSTEM_PROMPT}

${getRealWorldStateContext()}

${contextSection}  // NEW: Calendar context with existing tasks/events

====================
HANDLER OPTIONS
====================
${HANDLER_DESCRIPTIONS}

====================
CURRENT REQUEST
====================

Calendar ID: ${calendarId}

Main Brain's Assessment:
${userIntent}

Original User Request:
${userRequest}

====================
YOUR TASK (Stage 1 - Operation Review)
====================

You have access to the current calendar context above showing existing tasks and events.
Use this to:
1. Find tasks/events by semantic description (e.g., "update my dentist appointment")
2. Detect conflicts (e.g., "schedule at 2pm" when 2pm is already busy)
3. Make intelligent suggestions based on current workload

Analyze this request and determine:
1. Which handler(s) are needed to accomplish this
2. How many times each handler should be called
3. Brief summary of what each operation will do

...
`.trim();

  return prompt;
}
```

---

### Option 2: Tool-Based Context Gathering (Alternative)

Instead of a centralized service, implement `readCalendar` and `listCalendars` as actual tools that services can call.

#### Implement Tools

**Create**: `/tools/readCalendar.ts`

```typescript
export interface ReadCalendarToolContext {
  userRequest: string;
  intent?: string;
  parameters: {
    calendarId?: string;  // If not provided, use from execution context
    includeTasks?: boolean;
    includeEvents?: boolean;
    dateRange?: {
      start: string;  // ISO date
      end: string;    // ISO date
    };
  };
}

export async function readCalendarTool(
  toolContext: ReadCalendarToolContext,
  executionContext: ToolExecutionContext
): Promise<CalendarContext> {
  const calendarId = toolContext.parameters.calendarId || executionContext.calendarId;

  if (!calendarId) {
    throw new Error('No calendar ID provided');
  }

  return await gatherCalendarContext(
    executionContext.tenantId,
    calendarId,
    {
      includeTasks: toolContext.parameters.includeTasks,
      includeEvents: toolContext.parameters.includeEvents,
      dateRange: toolContext.parameters.dateRange ? {
        start: new Date(toolContext.parameters.dateRange.start),
        end: new Date(toolContext.parameters.dateRange.end)
      } : undefined
    }
  );
}
```

**Create**: `/tools/listCalendars.ts`

```typescript
export async function listCalendarsTool(
  toolContext: any,
  executionContext: ToolExecutionContext
): Promise<Calendar[]> {
  return await getCalendars(executionContext.tenantId);
}
```

---

## Comparison: Option 1 vs Option 2

### Option 1: Context Gathering Service (Recommended)

**Pros:**
- ✅ Direct and fast - no tool orchestration overhead
- ✅ Can be called synchronously before brain thinks
- ✅ Simpler architecture - just a service function
- ✅ Brain gets context upfront, makes better initial decisions
- ✅ Reusable across all services

**Cons:**
- ❌ Adds token overhead to every brain call (even if not needed)
- ❌ Less flexible - brain can't request specific context on demand

**Best For:**
- Brain (planCycle) - needs context upfront before making decisions
- Task Service - needs to see existing tasks for semantic matching

---

### Option 2: Tool-Based Context (Alternative)

**Pros:**
- ✅ Brain can decide if it needs context
- ✅ Reduces token overhead (only fetches if needed)
- ✅ Brain can request specific date ranges/filters

**Cons:**
- ❌ Requires multi-turn flow (brain must call tool, get result, then decide)
- ❌ More complex orchestration
- ❌ Slower (additional LLM call to decide to fetch context)
- ❌ Brain might forget to fetch context when needed

**Best For:**
- Advanced workflows where brain selectively needs calendar discovery
- Multi-calendar tenants who need to discover which calendar to use

---

## Recommended Approach: Hybrid

**Implement BOTH, use appropriately:**

### 1. Context Gathering Service (Primary)
Use for:
- Brain's initial prompt (always inject upcoming 7 days)
- Task service semantic operations
- Fast, synchronous context needs

### 2. Tools (Secondary)
Create `readCalendar` and `listCalendars` tools for:
- Discovering calendars when ID not provided
- Fetching specific date ranges brain identifies as relevant
- Multi-calendar scenarios

### Implementation Priority

**Phase 1** (Immediate):
- ✅ Create `contextGatherer.ts` service
- ✅ Integrate into Brain (planCycle)
- ✅ Integrate into Task Service

**Phase 2** (Future):
- ⏳ Implement `readCalendar.ts` tool
- ⏳ Implement `listCalendars.ts` tool
- ⏳ Update Brain to use tools for advanced scenarios

---

## Token Budget Considerations

### Context Size Impact

**Example Calendar Context** (formatted for LLM):
```
Calendar: My Work Calendar
Total Tasks: 15
Total Events: 8

TODAY'S SCHEDULE (3 events):
  - 9:00 AM - 10:00 AM: Team Standup
  - 2:00 PM - 3:00 PM: Client Call
  - 4:00 PM - 5:00 PM: Project Review

UPCOMING TASKS (Next 7 days):
  - Review Q4 budget (high priority, due: 12/06/2025)
  - Call dentist (medium priority, due: 12/07/2025)
  - Prepare presentation (high priority, due: 12/08/2025)

UPCOMING EVENTS (Next 7 days):
  - 12/06/2025 at 10:00 AM: Board Meeting
  - 12/07/2025 at 2:00 PM: Client Presentation
```

**Estimated tokens**: ~250-400 tokens

**Impact on Brain prompt**: Adds ~400 tokens to each brain call

**Mitigation strategies**:
1. Limit to next 7 days (not full calendar)
2. Limit to 10 tasks/events max (show summary for rest)
3. Make it configurable (can disable for simple requests)
4. Only include if `calendarId` is present

---

## Use Cases Enabled

### 1. Semantic Task Finding
**User**: "Update my dentist appointment"
**Without Context**: ❌ "I need a task ID"
**With Context**: ✅ Finds task named "Call dentist" or "Dentist appointment"

### 2. Conflict Detection
**User**: "Schedule team meeting at 2pm"
**Without Context**: ❌ Creates conflicting event
**With Context**: ✅ "You have a Client Call at 2pm. Would you like a different time?"

### 3. Smart Suggestions
**User**: "Add task to prepare slides"
**Without Context**: ❌ Just creates task
**With Context**: ✅ "I see you have a Client Presentation on 12/07. Should I set the due date to 12/06 (day before)?"

### 4. Batch Operations
**User**: "Delete all call-related tasks"
**Without Context**: ❌ "I need specific task IDs"
**With Context**: ✅ Finds tasks with "call" in name: "Call dentist", "Call John", "Client call prep"

### 5. Workload Awareness
**User**: "Add another high priority task"
**Without Context**: ❌ Just creates it
**With Context**: ✅ "You already have 3 high priority tasks due this week. Are you sure?"

---

## Security & Performance Considerations

### Security
- ✅ Context gathering respects tenant isolation
- ✅ All data fetched via existing auth'd services
- ✅ No new permission concerns

### Performance
- **Query time**: ~200-500ms per context fetch (2 parallel queries: tasks + events)
- **Caching**: Can cache context for 1-2 minutes if same calendar
- **Token overhead**: ~400 tokens per brain call

### Optimization Strategy
```typescript
// Cache context to avoid redundant fetches
const contextCache = new Map<string, { context: CalendarContext, timestamp: number }>();

export async function gatherCalendarContext(
  tenantId: string,
  calendarId: string,
  options?: ContextGathererOptions
): Promise<CalendarContext> {
  const cacheKey = `${tenantId}:${calendarId}`;
  const cached = contextCache.get(cacheKey);

  // Cache valid for 2 minutes
  if (cached && Date.now() - cached.timestamp < 2 * 60 * 1000) {
    return cached.context;
  }

  // Fetch fresh context
  const context = await fetchCalendarContext(tenantId, calendarId, options);

  contextCache.set(cacheKey, {
    context,
    timestamp: Date.now()
  });

  return context;
}
```

---

## Implementation Checklist

### Phase 1: Core Service
- [ ] Create `/services/shared/contextGatherer.ts`
- [ ] Implement `gatherCalendarContext()` function
- [ ] Implement `formatContextForLLM()` function
- [ ] Add caching layer for performance
- [ ] Write unit tests

### Phase 2: Brain Integration
- [ ] Modify `/services/planCycle/promptBuilder.ts` to accept calendarId
- [ ] Inject context into brain prompt
- [ ] Update caller to pass calendarId from cycle
- [ ] Test with conflict detection scenarios
- [ ] Test with semantic finding scenarios

### Phase 3: Task Service Integration
- [ ] Modify `/services/taskService.ts` to fetch context
- [ ] Pass context to promptBuilder
- [ ] Update Stage 1 prompt with context usage instructions
- [ ] Test semantic task finding
- [ ] Test batch operations

### Phase 4: Tools (Optional)
- [ ] Implement `/tools/readCalendar.ts`
- [ ] Implement `/tools/listCalendars.ts`
- [ ] Add tools to brain's available tools list
- [ ] Test calendar discovery flow

---

## Conclusion

**Recommendation**: Implement **Option 1 (Context Gathering Service)** immediately.

**Why**:
1. CalendarId already flows through system - no discovery needed
2. Direct service calls are faster and simpler than tool orchestration
3. Brain benefits from context upfront for better initial decisions
4. Token overhead (~400 tokens) is acceptable for improved accuracy
5. Can add tools later for advanced scenarios

**Next Steps**:
1. Create `contextGatherer.ts` service (2-3 hours)
2. Integrate into Brain promptBuilder (1 hour)
3. Integrate into Task Service (1 hour)
4. Test and refine (2-3 hours)

**Total Estimated Time**: 1 day of development

---

## Questions for Discussion

1. Should we include calendar context in **all** brain calls, or make it conditional?
2. What's the acceptable token budget increase for context?
3. Should we cache context, and for how long?
4. Do we need event context in task service, or just task context?
5. Should we implement tools now or wait for Phase 4?
