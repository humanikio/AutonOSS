# Calendar Context Architecture - REVISED PROPOSAL

## Overview

Multi-stage brain architecture where the **brain decides** what calendar context it needs, then fetches it specifically. Mirrors the taskService pattern.

---

## Key Insight: Brain-Directed Context Gathering

**Problem with initial proposal**: Blindly injecting 7 days of calendar data wastes tokens on irrelevant information.

**Better approach**: Brain analyzes request, decides what context it needs, then fetches **only** that specific data.

---

## Proposed Multi-Stage Brain Architecture

### Current Brain Flow (Single LLM Call)
```
1. buildPrompt → compile system prompt + tools + chat history
2. callBrainLLM → single LLM call → { message, tools[] }
3. createTodos → convert tools to todo queue
```

### NEW Brain Flow (Multi-Stage with Context)
```
1. buildPrompt → compile system prompt + tools + CALENDAR CONTEXT INSTRUCTIONS
2. reviewPrompt → LLM Call #1 → analyze request, determine:
   - responseType: 'chat' | 'tools' | 'hybrid'
   - contextNeeded: { dateRange, includeEvents, includeTasks, filters }
   - toolsLikely: ['taskTool', 'eventTool']
3. pullContext → IF contextNeeded, fetch specific calendar data
4. finalDecision → LLM Call #2 (with context) → { message, tools[] }
5. createTodos → convert tools to todo queue
```

**Benefits:**
- ✅ Brain skips context for "hi" / "how can you help"
- ✅ Brain requests specific date ranges (not arbitrary 7 days)
- ✅ Saves tokens - only fetches what's needed
- ✅ Mirrors taskService pattern (consistent architecture)

---

## File Structure

```
/services
  /shared
    calendarContext.ts        ← NEW: Shared service for fetching calendar data

  /planCycle
    planCycle.ts              ← MODIFY: Add new stages
    brain.ts                  ← MODIFY: Becomes multi-stage coordinator

    /brain                    ← NEW DIRECTORY (mirrors /taskService/taskBrain)
      reviewPrompt.ts         ← NEW: LLM Call #1 - analyze & decide context needs
      pullContext.ts          ← NEW: Fetch specific calendar context
      finalDecision.ts        ← NEW: LLM Call #2 - with context, make final plan

    /promptBuilder
      systemPrompt.ts         ← MODIFY: Mention calendar context capability
      toolContext.ts          ← EXISTING: Tool descriptions
      outputFormat.ts         ← MODIFY: Add Stage 1 output format
      calendarContext.ts      ← NEW: Instructions for requesting calendar context
      finalDecisionFormat.ts  ← NEW: Stage 2 output format
```

---

## Implementation Details

### 1. Shared Calendar Context Service

**Create**: `/services/shared/calendarContext.ts`

```typescript
/**
 * Shared Calendar Context Service
 * Used by both Brain and TaskService to fetch calendar data
 */

import { getTasks } from '../../../services/taskManager/getTasks';
import { getEvents } from '../../../services/eventManager/getEvents';
import { readCalendar } from '../../../services/calendarManager/readCalendar';
import type { Task } from '../../../services/taskManager/createTask';
import type { CalendarEvent } from '../../../services/eventManager/createEvent';
import type { Calendar } from '../../../services/calendarManager/createCalendar';

export interface CalendarContextRequest {
  dateRange?: {
    start: Date;
    end: Date;
  };
  includeTasks?: boolean;      // Default: true
  includeEvents?: boolean;     // Default: true
  taskFilters?: {
    status?: 'pending' | 'completed' | 'all';
    priority?: 'low' | 'medium' | 'high';
  };
  limit?: number;               // Max items to return (prevent token overflow)
}

export interface CalendarContextResponse {
  calendar: Calendar;
  tasks: Task[];
  events: CalendarEvent[];
  summary: {
    totalTasks: number;
    totalEvents: number;
    dateRange: { start: Date; end: Date } | null;
  };
}

/**
 * Fetch calendar context based on specific requirements
 * Used by both Brain and TaskService
 */
export async function fetchCalendarContext(
  tenantId: string,
  calendarId: string,
  request: CalendarContextRequest
): Promise<CalendarContextResponse> {
  console.log(`📅 Fetching calendar context for ${calendarId}`, request);

  const {
    dateRange,
    includeTasks = true,
    includeEvents = true,
    taskFilters,
    limit = 50  // Default limit to prevent token overflow
  } = request;

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

    // Limit to prevent token overflow
    if (tasks.length > limit) {
      console.warn(`⚠️  Limiting tasks from ${tasks.length} to ${limit}`);
      tasks = tasks.slice(0, limit);
    }
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

    // Limit to prevent token overflow
    if (events.length > limit) {
      console.warn(`⚠️  Limiting events from ${events.length} to ${limit}`);
      events = events.slice(0, limit);
    }
  }

  console.log(`✅ Fetched ${tasks.length} tasks, ${events.length} events`);

  return {
    calendar,
    tasks,
    events,
    summary: {
      totalTasks: tasks.length,
      totalEvents: events.length,
      dateRange: dateRange || null
    }
  };
}

/**
 * Format calendar context for LLM consumption
 */
export function formatCalendarContextForLLM(context: CalendarContextResponse): string {
  const { calendar, tasks, events, summary } = context;

  let output = `\n====================\nCALENDAR CONTEXT\n====================\n\n`;
  output += `Calendar: ${calendar.name}\n`;

  if (summary.dateRange) {
    output += `Date Range: ${summary.dateRange.start.toLocaleDateString()} - ${summary.dateRange.end.toLocaleDateString()}\n`;
  }

  output += `Tasks Found: ${summary.totalTasks}\n`;
  output += `Events Found: ${summary.totalEvents}\n\n`;

  // Tasks
  if (tasks.length > 0) {
    output += `TASKS:\n`;
    tasks.forEach(task => {
      const due = task.dueDate
        ? new Date(task.dueDate).toLocaleDateString()
        : 'No due date';
      const time = task.dueTime
        ? ` at ${new Date(task.dueTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
        : '';
      const priority = task.priority ? ` [${task.priority}]` : '';
      const status = task.status === 'completed' ? ' ✓' : '';

      output += `  - ${task.taskName}${priority} - Due: ${due}${time}${status}\n`;
      if (task.description) {
        output += `    Description: ${task.description}\n`;
      }
    });
    output += `\n`;
  }

  // Events
  if (events.length > 0) {
    output += `EVENTS:\n`;
    events.forEach(event => {
      const start = new Date(event.startTime);
      const end = new Date(event.endTime);
      const date = start.toLocaleDateString();
      const timeRange = `${start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} - ${end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;

      output += `  - ${event.eventName} - ${date} ${timeRange}\n`;
      if (event.description) {
        output += `    Description: ${event.description}\n`;
      }
      if (event.location) {
        output += `    Location: ${event.location}\n`;
      }
    });
    output += `\n`;
  }

  output += `Use this context for:\n`;
  output += `- Finding tasks/events by semantic description\n`;
  output += `- Detecting scheduling conflicts\n`;
  output += `- Making intelligent suggestions\n`;
  output += `- Understanding workload\n`;

  return output;
}
```

---

### 2. Brain Stage 1: Review Prompt

**Create**: `/services/planCycle/brain/reviewPrompt.ts`

```typescript
/**
 * Brain Stage 1 - Review Prompt (LLM Call #1)
 * Analyzes user request and determines:
 * - Response type (chat vs tools)
 * - Calendar context needs
 * - Likely tools needed
 */

import { claude4 } from '../../../../../../llmModels/claude4';

export interface ContextRequest {
  needed: boolean;              // Does this request need calendar context?
  dateRange?: {
    start: string;              // ISO date
    end: string;                // ISO date
  };
  includeTasks?: boolean;
  includeEvents?: boolean;
  taskFilters?: {
    status?: 'pending' | 'completed' | 'all';
    priority?: 'low' | 'medium' | 'high';
  };
  reasoning: string;            // Why this context is needed
}

export interface BrainReviewOutput {
  responseType: 'chat' | 'tools' | 'hybrid';
  message: string;                    // High-level response to user
  reasoning: string;                  // Internal reasoning
  contextRequest: ContextRequest;     // What calendar context to fetch
  toolsLikely: string[];              // Likely tools needed (helps Stage 2)
}

/**
 * Stage 1: Analyze request and determine context needs
 * This is LLM Call #1 - quick analysis without full context
 */
export async function reviewPrompt(
  compiledPrompt: string
): Promise<BrainReviewOutput> {
  console.log(`\n🧠 Brain Stage 1: Reviewing Request`);

  try {
    const promptWithJsonInstruction = `${compiledPrompt}

CRITICAL: You MUST respond with ONLY valid JSON. Do not include any text before or after the JSON object. Start your response with { and end with }.`;

    const response = await claude4.processText(promptWithJsonInstruction);

    // Extract JSON
    let jsonContent = response.trim();
    const jsonStart = jsonContent.indexOf('{');
    const jsonEnd = jsonContent.lastIndexOf('}') + 1;

    if (jsonStart === -1 || jsonEnd === 0) {
      throw new Error('No JSON found in LLM response');
    }

    jsonContent = jsonContent.substring(jsonStart, jsonEnd);

    // Parse response
    const parsed = JSON.parse(jsonContent) as BrainReviewOutput;

    // Validate response
    if (!parsed.responseType || !parsed.message || !parsed.contextRequest) {
      throw new Error('Invalid response structure from LLM');
    }

    console.log(`✓ Brain Review Complete:`);
    console.log(`  Response Type: ${parsed.responseType}`);
    console.log(`  Context Needed: ${parsed.contextRequest.needed}`);
    if (parsed.contextRequest.needed) {
      console.log(`  Date Range: ${parsed.contextRequest.dateRange?.start} to ${parsed.contextRequest.dateRange?.end}`);
      console.log(`  Include Tasks: ${parsed.contextRequest.includeTasks}`);
      console.log(`  Include Events: ${parsed.contextRequest.includeEvents}`);
    }
    console.log(`  Tools Likely: ${parsed.toolsLikely.join(', ')}`);

    return parsed;

  } catch (error: any) {
    console.error(`❌ Error in brain reviewPrompt:`, error.message);
    throw new Error(`Failed to review prompt: ${error.message}`);
  }
}
```

---

### 3. Brain Stage 2: Pull Context

**Create**: `/services/planCycle/brain/pullContext.ts`

```typescript
/**
 * Brain Stage 2 - Pull Context
 * Fetches specific calendar context based on Stage 1 analysis
 */

import { fetchCalendarContext, formatCalendarContextForLLM } from '../../shared/calendarContext';
import type { BrainReviewOutput } from './reviewPrompt';

/**
 * Pull calendar context if needed
 *
 * @param tenantId - Tenant ID
 * @param calendarId - Calendar ID
 * @param reviewOutput - Output from Stage 1
 * @returns Formatted context string for LLM (empty if not needed)
 */
export async function pullContext(
  tenantId: string,
  calendarId: string | undefined,
  reviewOutput: BrainReviewOutput
): Promise<string> {
  console.log(`\n🧠 Brain Stage 2: Pulling Context`);

  const { contextRequest } = reviewOutput;

  // Skip if no context needed
  if (!contextRequest.needed) {
    console.log(`  ⏭️  No context needed - skipping`);
    return '';
  }

  // Skip if no calendarId provided
  if (!calendarId) {
    console.log(`  ⚠️  No calendar ID provided - skipping context fetch`);
    return '';
  }

  // Parse date range
  let dateRange;
  if (contextRequest.dateRange) {
    dateRange = {
      start: new Date(contextRequest.dateRange.start),
      end: new Date(contextRequest.dateRange.end)
    };
  }

  console.log(`  📥 Fetching calendar context...`);

  // Fetch context
  const context = await fetchCalendarContext(tenantId, calendarId, {
    dateRange,
    includeTasks: contextRequest.includeTasks,
    includeEvents: contextRequest.includeEvents,
    taskFilters: contextRequest.taskFilters
  });

  console.log(`  ✓ Context fetched: ${context.summary.totalTasks} tasks, ${context.summary.totalEvents} events`);

  // Format for LLM
  const formattedContext = formatCalendarContextForLLM(context);

  return formattedContext;
}
```

---

### 4. Brain Stage 3: Final Decision

**Create**: `/services/planCycle/brain/finalDecision.ts`

```typescript
/**
 * Brain Stage 3 - Final Decision (LLM Call #2)
 * Makes final decision WITH calendar context
 * Outputs final tool plan
 */

import { claude4 } from '../../../../../../llmModels/claude4';
import type { BrainResponse } from '../brain';

/**
 * Make final decision with full context
 * This is LLM Call #2 - with calendar context loaded
 */
export async function finalDecision(
  basePrompt: string,
  calendarContext: string,
  reviewMessage: string
): Promise<BrainResponse> {
  console.log(`\n🧠 Brain Stage 3: Making Final Decision`);

  // Compile final prompt with context
  const finalPrompt = `${basePrompt}

${calendarContext}

---

PREVIOUS ANALYSIS:
${reviewMessage}

---

Now that you have the calendar context above, make your FINAL decision about what tools to use (if any) and craft your response to the user.

Remember:
- Use the calendar context to find tasks/events semantically
- Detect conflicts
- Make intelligent suggestions
- Provide the final JSON response in the format specified earlier
`;

  try {
    const promptWithJsonInstruction = `${finalPrompt}

CRITICAL: You MUST respond with ONLY valid JSON. Do not include any text before or after the JSON object. Start your response with { and end with }.`;

    const response = await claude4.processText(promptWithJsonInstruction);

    // Extract JSON
    let jsonContent = response.trim();
    const jsonStart = jsonContent.indexOf('{');
    const jsonEnd = jsonContent.lastIndexOf('}') + 1;

    if (jsonStart === -1 || jsonEnd === 0) {
      throw new Error('No JSON found in LLM response');
    }

    jsonContent = jsonContent.substring(jsonStart, jsonEnd);

    // Parse response
    const parsed = JSON.parse(jsonContent) as BrainResponse;

    // Validate response
    if (!parsed.message) {
      throw new Error('Brain response missing "message" field');
    }

    console.log(`✓ Final Decision Complete:`);
    console.log(`  Message: "${parsed.message.substring(0, 60)}..."`);
    console.log(`  Tools: ${parsed.tools?.length || 0} tool(s)`);

    return parsed;

  } catch (error: any) {
    console.error(`❌ Error in brain finalDecision:`, error.message);
    throw new Error(`Brain final decision failed: ${error.message}`);
  }
}
```

---

### 5. Update Brain Coordinator

**Modify**: `/services/planCycle/brain.ts`

```typescript
/**
 * Brain LLM Service - Multi-Stage Coordinator
 * Orchestrates multi-stage brain process with context gathering
 */

import { reviewPrompt } from './brain/reviewPrompt';
import { pullContext } from './brain/pullContext';
import { finalDecision } from './brain/finalDecision';

export interface BrainResponse {
  message: string;
  reasoning: string;
  tools: Array<{
    toolName: 'eventTool' | 'taskTool';
    intent: string;
    context: {
      userRequest: string;
      parameters: Record<string, any>;
    };
  }>;
}

/**
 * Multi-stage brain process
 *
 * Stage 1: Review request and determine context needs
 * Stage 2: Pull specific calendar context if needed
 * Stage 3: Make final decision with context
 */
export async function callBrainLLM(
  compiledPrompt: string,
  tenantId: string,
  calendarId?: string
): Promise<BrainResponse> {
  try {
    console.log(`🧠 Starting Multi-Stage Brain Process`);

    // STAGE 1: Review and analyze
    const reviewOutput = await reviewPrompt(compiledPrompt);

    // If just chat (no tools), return early
    if (reviewOutput.responseType === 'chat' && reviewOutput.toolsLikely.length === 0) {
      console.log(`💬 Simple chat response - skipping context and tools`);
      return {
        message: reviewOutput.message,
        reasoning: reviewOutput.reasoning,
        tools: []
      };
    }

    // STAGE 2: Pull context if needed
    const calendarContext = await pullContext(tenantId, calendarId, reviewOutput);

    // STAGE 3: Make final decision with context
    const finalResponse = await finalDecision(
      compiledPrompt,
      calendarContext,
      reviewOutput.message
    );

    console.log(`✅ Multi-Stage Brain Process Complete`);

    return finalResponse;

  } catch (error: any) {
    console.error('❌ Error in multi-stage brain:', error);
    throw new Error(`Brain process failed: ${error.message}`);
  }
}
```

---

### 6. Calendar Context Instructions

**Create**: `/services/planCycle/promptBuilder/calendarContext.ts`

```typescript
/**
 * Calendar Context Instructions
 * Explains to brain how to request calendar context
 */

export const CALENDAR_CONTEXT_INSTRUCTIONS = `
====================
CALENDAR CONTEXT SYSTEM
====================

You have access to a calendar context system that can fetch tasks and events.

When analyzing user requests, you can request specific calendar context in Stage 1:

Context Request Format:
{
  "contextRequest": {
    "needed": boolean,              // Do you need calendar context?
    "dateRange": {
      "start": "YYYY-MM-DD",        // Start date (ISO format)
      "end": "YYYY-MM-DD"           // End date (ISO format)
    },
    "includeTasks": boolean,         // Fetch tasks?
    "includeEvents": boolean,        // Fetch events?
    "taskFilters": {
      "status": "pending" | "completed" | "all",
      "priority": "low" | "medium" | "high"
    },
    "reasoning": "Why you need this context"
  }
}

Examples of When to Request Context:

1. Finding tasks/events semantically:
   User: "Update my dentist appointment"
   → Request context with tasks for next 30 days to find "dentist" task

2. Conflict detection:
   User: "Schedule meeting at 2pm today"
   → Request context with today's events to check for conflicts

3. Workload awareness:
   User: "Add another high priority task"
   → Request context with pending high priority tasks to warn user

4. Batch operations:
   User: "Delete all completed tasks from last week"
   → Request context with completed tasks from last week

Examples of When NOT to Request Context:

1. Simple greetings:
   User: "Hello"
   → No context needed, just respond

2. Help requests:
   User: "What can you do?"
   → No context needed, explain capabilities

3. Creating simple tasks with full details:
   User: "Create task 'Buy milk' for tomorrow"
   → No context needed if no conflicts/finding required

IMPORTANT:
- Request SPECIFIC date ranges (not "all time")
- Request ONLY what you need (tasks OR events, not always both)
- If unsure, err on side of requesting context
- Stage 1 is fast - Stage 2 with context is more accurate
`;
```

---

### 7. Update Stage 1 Output Format

**Modify**: `/services/planCycle/promptBuilder/outputFormat.ts`

Add Stage 1 output format:

```typescript
export const STAGE_1_OUTPUT_FORMAT = `
STAGE 1 OUTPUT FORMAT:

You MUST respond with this structure for Stage 1:

{
  "responseType": "chat" | "tools" | "hybrid",
  "message": "High-level response to user (1-2 sentences)",
  "reasoning": "Your internal analysis",
  "contextRequest": {
    "needed": boolean,
    "dateRange": { "start": "YYYY-MM-DD", "end": "YYYY-MM-DD" },
    "includeTasks": boolean,
    "includeEvents": boolean,
    "taskFilters": { ... },
    "reasoning": "Why this context is needed"
  },
  "toolsLikely": ["taskTool", "eventTool"]  // Tools you think you'll need
}

Response Types:
- "chat": Just responding to user, no tools needed
- "tools": Need to use tools to complete request
- "hybrid": Responding AND using tools

Examples:

User: "Hello"
{
  "responseType": "chat",
  "message": "Hi! How can I help with your calendar today?",
  "reasoning": "Simple greeting, no calendar operations needed",
  "contextRequest": { "needed": false },
  "toolsLikely": []
}

User: "Update my dentist appointment to 3pm"
{
  "responseType": "tools",
  "message": "I'll update your dentist appointment to 3pm.",
  "reasoning": "Need to find dentist appointment task/event without ID, then update it",
  "contextRequest": {
    "needed": true,
    "dateRange": { "start": "2025-12-01", "end": "2025-12-31" },
    "includeTasks": true,
    "includeEvents": true,
    "reasoning": "Need to find 'dentist' appointment semantically in upcoming schedule"
  },
  "toolsLikely": ["taskTool", "eventTool"]
}

User: "Schedule team meeting at 2pm today"
{
  "responseType": "tools",
  "message": "I'll schedule a team meeting for 2pm today.",
  "reasoning": "Creating new event, but should check for conflicts first",
  "contextRequest": {
    "needed": true,
    "dateRange": { "start": "2025-12-05", "end": "2025-12-05" },
    "includeTasks": false,
    "includeEvents": true,
    "reasoning": "Check today's schedule for conflicts at 2pm"
  },
  "toolsLikely": ["eventTool"]
}
`;
```

---

## Summary of Changes

### New Files:
1. `/services/shared/calendarContext.ts` - Shared context fetching service
2. `/services/planCycle/brain/reviewPrompt.ts` - Stage 1 analysis
3. `/services/planCycle/brain/pullContext.ts` - Stage 2 context fetching
4. `/services/planCycle/brain/finalDecision.ts` - Stage 3 final decision
5. `/services/planCycle/promptBuilder/calendarContext.ts` - Context instructions
6. `/services/planCycle/promptBuilder/stage1OutputFormat.ts` - Stage 1 format

### Modified Files:
1. `/services/planCycle/brain.ts` - Multi-stage coordinator
2. `/services/planCycle/promptBuilder.ts` - Include calendar context instructions
3. `/services/planCycle/promptBuilder/systemPrompt.ts` - Mention context capability

---

## Benefits Over Initial Proposal

1. **Token Efficient**: Only fetches context when needed
2. **Specific Requests**: Brain requests exact date ranges, not arbitrary 7 days
3. **Skips for Chat**: "Hi" / "Help" responses skip context entirely
4. **Mirrors TaskService**: Consistent multi-stage pattern
5. **Flexible**: Brain can request tasks only, events only, or both
6. **Smart Filtering**: Can request specific status, priority, date ranges

---

## Example Flows

### Flow 1: Simple Greeting (No Context)
```
User: "Hi"

Stage 1 (reviewPrompt):
{
  "responseType": "chat",
  "contextRequest": { "needed": false },
  "toolsLikely": []
}

→ Skip Stage 2 (no context needed)
→ Skip Stage 3 (no tools needed)
→ Return: { message: "Hi! How can I help?", tools: [] }
```

### Flow 2: Semantic Task Update (With Context)
```
User: "Update my dentist appointment to 3pm"

Stage 1 (reviewPrompt):
{
  "responseType": "tools",
  "contextRequest": {
    "needed": true,
    "dateRange": { "start": "2025-12-01", "end": "2025-12-31" },
    "includeTasks": true,
    "includeEvents": true
  },
  "toolsLikely": ["taskTool"]
}

Stage 2 (pullContext):
→ Fetches tasks/events for Dec 2025
→ Finds task: "Dentist appointment - Dec 7, 2pm"
→ Returns formatted context

Stage 3 (finalDecision):
→ Brain sees "Dentist appointment" task
→ Creates updateTaskHandler with taskId + new time
→ Returns: { message: "I'll update...", tools: [updateTaskHandler] }
```

### Flow 3: Conflict Detection (With Context)
```
User: "Schedule team meeting at 2pm today"

Stage 1 (reviewPrompt):
{
  "responseType": "tools",
  "contextRequest": {
    "needed": true,
    "dateRange": { "start": "2025-12-05", "end": "2025-12-05" },
    "includeTasks": false,
    "includeEvents": true,
    "reasoning": "Check for conflicts at 2pm"
  },
  "toolsLikely": ["eventTool"]
}

Stage 2 (pullContext):
→ Fetches today's events
→ Finds: "Client Call - 2:00pm - 3:00pm"
→ Returns formatted context

Stage 3 (finalDecision):
→ Brain sees conflict at 2pm
→ Returns: {
    message: "You have a Client Call at 2pm. Would you like me to schedule the team meeting at 3pm instead?",
    tools: []  // Asking for clarification first
  }
```

---

## Implementation Estimate

### Phase 1: Core Service
- Create `calendarContext.ts` service - 2 hours
- Write unit tests - 1 hour

### Phase 2: Brain Stages
- Create `brain/reviewPrompt.ts` - 2 hours
- Create `brain/pullContext.ts` - 1 hour
- Create `brain/finalDecision.ts` - 2 hours
- Update `brain.ts` coordinator - 1 hour

### Phase 3: Prompt Updates
- Create `calendarContext.ts` instructions - 1 hour
- Update `systemPrompt.ts` - 30 min
- Create `stage1OutputFormat.ts` - 1 hour
- Update `outputFormat.ts` - 30 min

### Phase 4: Testing
- Test simple chat (no context) - 1 hour
- Test semantic finding - 2 hours
- Test conflict detection - 1 hour
- Test various date ranges - 1 hour

**Total**: ~16 hours (~2 days)

---

## Next Steps

1. Create `calendarContext.ts` shared service
2. Create brain stages (reviewPrompt, pullContext, finalDecision)
3. Update brain.ts coordinator
4. Add calendar context instructions to prompts
5. Test with various scenarios

Ready to implement! 🚀
