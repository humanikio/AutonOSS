# Task Service Architecture

## Overview

The Task Service is a specialized LLM-powered service that processes task-related requests from the main brain. It receives a clean, focused prompt from the initial brain and uses its own internal LLM to determine which handlers to execute and with what parameters.

---

## Flow Diagram

```
Brain (planCycle)
  ↓ [clean prompt + intent]
taskTool (thin handler)
  ↓ [context passthrough]
taskService (THIS SERVICE)
  ↓
  1. Build Prompt (no chat history needed)
  2. Call Internal LLM
  3. Parse JSON Response
  4. Execute Handler(s)
  5. Return Results
```

---

## Architecture Components

### 1. Prompt Builder (`promptBuilder/`)

Similar to `planCycle/promptBuilder`, but focused on task operations.

#### Files:
- `systemPrompt.ts` - Task service identity and capabilities
- `taskHandlerContext/` - Directory containing individual handler formats
  - `index.ts` - Barrel export for all handler contexts
  - `createTask.ts` - Format for creating tasks
  - `updateTask.ts` - Format for updating tasks
  - `deleteTask.ts` - Format for deleting tasks
  - `readTask.ts` - Format for reading single task
  - `getTasks.ts` - Format for getting all tasks
- `outputFormat.ts` - JSON structure that LLM must return
- `promptBuilder.ts` - Main compiler that assembles the full prompt

---

### 2. Handlers (`handlers/`)

Handlers act as **adapters** - they receive LLM-generated JSON and normalize it before calling the actual service methods.

#### Handler Responsibilities:
- ✅ Receive structured JSON from LLM
- ✅ Validate required fields
- ✅ Normalize/transform data formats (e.g., parse dates)
- ✅ Map LLM field names to service parameter names
- ✅ Call underlying taskManager service methods
- ✅ Return standardized result

#### Files:
- `createTask.ts` - Adapter for task creation
- `updateTask.ts` - Adapter for task updates
- `deleteTask.ts` - Adapter for task deletion
- `readTask.ts` - Adapter for reading single task
- `getTasks.ts` - Adapter for getting all tasks

---

## Task Manager Operations

Based on `/calendars/autonCalendar/services/taskManager/`:

### Available Operations:

#### 1. **createTask**
```typescript
createTask(tenantId: string, calendarId: string, input: CreateTaskInput): Promise<Task>
```

**CreateTaskInput Fields:**
- `taskName` (required)
- `description?`
- `dueDate?` - Date object
- `dueTime?` - Date object (requires dueDate)
- `startDate?` - Date object
- `estimatedDuration?` - number (minutes)
- `priority?` - 'low' | 'medium' | 'high' | 'urgent'
- `status?` - 'todo' | 'in_progress' | 'completed' | 'cancelled' | 'blocked'
- `assignees?` - string[] (user IDs)
- `parentTaskId?` - string (for subtasks)
- `linkedEventId?` - string (link to calendar event)
- `tags?` - string[]
- `checklistItems?` - { id: string, text: string, completed: boolean }[]
- `recurrence?` - { frequency, interval, endDate? }
- `reminders?` - { minutes: number, method: 'email' | 'notification' | 'sms' }[]
- `metadata?` - Record<string, any>

#### 2. **updateTask**
```typescript
updateTask(tenantId: string, calendarId: string, taskId: string, input: UpdateTaskInput): Promise<Task | null>
```

**UpdateTaskInput:** All fields from CreateTaskInput (all optional)

#### 3. **deleteTask**
```typescript
deleteTask(tenantId: string, calendarId: string, taskId: string): Promise<boolean>
```

#### 4. **readTask**
```typescript
readTask(tenantId: string, calendarId: string, taskId: string): Promise<Task | null>
```

#### 5. **getTasks**
```typescript
getTasks(tenantId: string, calendarId: string): Promise<Task[]>
```

---

## Prompt Builder Details

### systemPrompt.ts

Defines the task service's identity and capabilities.

**Should Include:**
- Role: "You are a task management specialist within a calendar AI system"
- Capabilities: What operations you can perform (create, update, delete, read, list)
- Task schema understanding: Priority levels, status types, date handling
- Constraints: What you cannot do

### taskHandlerContext/

Each file exports a string describing the handler format and parameters.

#### createTask.ts
Should define:
- Handler name: `"createTaskHandler"`
- Purpose: Create new tasks
- Required fields: `taskName`
- Optional fields: All other CreateTaskInput fields
- Date format expectations: ISO 8601 strings
- Examples of valid requests

#### updateTask.ts
Should define:
- Handler name: `"updateTaskHandler"`
- Purpose: Update existing tasks
- Required fields: `taskId`
- Optional fields: Any CreateTaskInput field to update
- Partial update support
- Examples of updates (status changes, date changes, etc.)

#### deleteTask.ts
Should define:
- Handler name: `"deleteTaskHandler"`
- Purpose: Delete tasks
- Required fields: `taskId`
- Examples of deletion requests

#### readTask.ts
Should define:
- Handler name: `"readTaskHandler"`
- Purpose: Get single task details
- Required fields: `taskId`
- When to use: User asks about specific task

#### getTasks.ts
Should define:
- Handler name: `"getTasksHandler"`
- Purpose: List all tasks for calendar
- Required fields: None
- When to use: User asks for task list, overview, etc.

### outputFormat.ts

Defines the JSON structure the LLM MUST return.

**Structure:**
```json
{
  "reasoning": "string - internal thought process",
  "handlers": [
    {
      "handlerName": "createTaskHandler | updateTaskHandler | deleteTaskHandler | readTaskHandler | getTasksHandler",
      "parameters": {
        // Handler-specific parameters
        // All dates as ISO 8601 strings
        // All fields matching handler expectations
      }
    }
  ]
}
```

**Key Points:**
- Can specify multiple handlers (e.g., create task then link to event)
- Parameters must include ALL data needed by handler
- Dates must be ISO 8601 strings (handlers will parse to Date objects)
- Must be valid JSON (no trailing commas, proper escaping)

---

## Handler Implementation Pattern

### Example: createTask Handler

```typescript
// handlers/createTask.ts

import { createTask, CreateTaskInput } from '../../../../services/taskManager';
import type { ToolExecutionContext } from '../../../processToDoQueue';

export interface CreateTaskHandlerParams {
  taskName: string;
  description?: string;
  dueDate?: string; // ISO 8601
  dueTime?: string; // ISO 8601
  startDate?: string; // ISO 8601
  estimatedDuration?: number;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  status?: 'todo' | 'in_progress' | 'completed' | 'cancelled' | 'blocked';
  assignees?: string[];
  parentTaskId?: string;
  linkedEventId?: string;
  tags?: string[];
  checklistItems?: { id: string; text: string; completed: boolean }[];
  recurrence?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval: number;
    endDate?: string; // ISO 8601
  };
  reminders?: {
    minutes: number;
    method: 'email' | 'notification' | 'sms';
  }[];
  metadata?: Record<string, any>;
}

export interface CreateTaskHandlerResult {
  success: boolean;
  taskId?: string;
  taskName?: string;
  message: string;
  error?: string;
}

/**
 * Create Task Handler
 * Adapter that normalizes LLM output and calls createTask service
 */
export async function createTaskHandler(
  params: CreateTaskHandlerParams,
  context: ToolExecutionContext
): Promise<CreateTaskHandlerResult> {
  try {
    console.log(`\n📝 CREATE TASK HANDLER`);
    console.log(`   Task Name: ${params.taskName}`);
    console.log(`   Priority: ${params.priority || 'medium'}`);

    // Validate required fields
    if (!params.taskName) {
      throw new Error('taskName is required');
    }

    if (!context.calendarId) {
      throw new Error('calendarId is required from context');
    }

    // Normalize dates (convert ISO strings to Date objects)
    const input: CreateTaskInput = {
      taskName: params.taskName,
      description: params.description,
      dueDate: params.dueDate ? new Date(params.dueDate) : undefined,
      dueTime: params.dueTime ? new Date(params.dueTime) : undefined,
      startDate: params.startDate ? new Date(params.startDate) : undefined,
      estimatedDuration: params.estimatedDuration,
      priority: params.priority,
      status: params.status,
      assignees: params.assignees,
      parentTaskId: params.parentTaskId,
      linkedEventId: params.linkedEventId,
      tags: params.tags,
      checklistItems: params.checklistItems,
      recurrence: params.recurrence ? {
        frequency: params.recurrence.frequency,
        interval: params.recurrence.interval,
        endDate: params.recurrence.endDate ? new Date(params.recurrence.endDate) : undefined
      } : undefined,
      reminders: params.reminders,
      metadata: params.metadata
    };

    // Call actual service
    const task = await createTask(
      context.tenantId,
      context.calendarId,
      input
    );

    console.log(`✅ Task created: ${task.taskId}`);

    return {
      success: true,
      taskId: task.taskId,
      taskName: task.taskName,
      message: `Task "${task.taskName}" created successfully`
    };

  } catch (error: any) {
    console.error(`❌ Create task handler error:`, error.message);

    return {
      success: false,
      message: 'Failed to create task',
      error: error.message
    };
  }
}
```

---

## Example Flow

### User Request:
> "Create a high priority task to review Q4 budget, due next Friday at 3pm, and another task to follow up with the team tomorrow"

### Brain Output (from planCycle):
```json
{
  "message": "I'll create two tasks for you: one to review Q4 budget due next Friday at 3pm, and another to follow up with the team tomorrow.",
  "tools": [
    {
      "toolName": "taskTool",
      "intent": "Create two tasks as requested",
      "context": {
        "userRequest": "Create high priority task for Q4 budget review (Friday 3pm) and team follow-up task (tomorrow)",
        "parameters": {
          "action": "create",
          "tasks": [
            { "name": "Review Q4 budget", "priority": "high", "due": "next Friday 3pm" },
            { "name": "Follow up with team", "due": "tomorrow" }
          ]
        }
      }
    }
  ]
}
```

### taskService Internal LLM Output:
```json
{
  "reasoning": "User wants two tasks created. First is high priority Q4 budget review due Friday 3pm. Second is team follow-up due tomorrow with default priority.",
  "handlers": [
    {
      "handlerName": "createTaskHandler",
      "parameters": {
        "taskName": "Review Q4 budget",
        "description": "Review the Q4 budget report",
        "priority": "high",
        "status": "todo",
        "dueDate": "2025-12-12T00:00:00Z",
        "dueTime": "2025-12-12T15:00:00Z",
        "tags": ["budget", "review", "Q4"]
      }
    },
    {
      "handlerName": "createTaskHandler",
      "parameters": {
        "taskName": "Follow up with team",
        "description": "Follow up with the team on recent discussions",
        "priority": "medium",
        "status": "todo",
        "dueDate": "2025-12-06T00:00:00Z",
        "tags": ["team", "follow-up"]
      }
    }
  ]
}
```

### Handler Execution:
1. `createTaskHandler` called with first parameters → Creates task
2. `createTaskHandler` called with second parameters → Creates task
3. Both results aggregated and returned

---

## Key Design Principles

### 1. **No Chat History in Task Service**
The main brain already processed the conversation. Task service receives a focused intent.

### 2. **LLM Focuses on Structure, Not Logic**
The internal LLM's job is to:
- Parse the user's intent
- Determine which handler(s) to use
- Extract all parameters with proper field names
- Output valid JSON

The LLM does NOT:
- Perform the actual operations
- Handle business logic
- Validate against database

### 3. **Handlers Are Adapters**
Handlers bridge the gap between LLM output and service requirements:
- **Input**: LLM's JSON (dates as ISO strings, fields as specified)
- **Transform**: Parse dates, validate, normalize
- **Output**: Call service method with proper types

### 4. **Multiple Handlers Supported**
A single request can trigger multiple handlers:
```json
{
  "handlers": [
    { "handlerName": "createTaskHandler", ... },
    { "handlerName": "readTaskHandler", ... },
    { "handlerName": "updateTaskHandler", ... }
  ]
}
```

### 5. **Error Handling**
Each handler returns success/failure:
```typescript
{
  success: boolean;
  message: string;
  error?: string;
  [key: string]: any; // Handler-specific data
}
```

---

## Implementation Checklist

### Phase 1: Prompt Builder
- [ ] `systemPrompt.ts` - Define task service identity
- [ ] `taskHandlerContext/createTask.ts` - Create task format
- [ ] `taskHandlerContext/updateTask.ts` - Update task format
- [ ] `taskHandlerContext/deleteTask.ts` - Delete task format
- [ ] `taskHandlerContext/readTask.ts` - Read task format
- [ ] `taskHandlerContext/getTasks.ts` - Get tasks format
- [ ] `taskHandlerContext/index.ts` - Barrel export
- [ ] `outputFormat.ts` - JSON response structure
- [ ] `promptBuilder.ts` - Main prompt compiler

### Phase 2: Handlers
- [ ] `handlers/createTask.ts` - Create task adapter
- [ ] `handlers/updateTask.ts` - Update task adapter
- [ ] `handlers/deleteTask.ts` - Delete task adapter
- [ ] `handlers/readTask.ts` - Read task adapter
- [ ] `handlers/getTasks.ts` - Get tasks adapter
- [ ] `handlers/index.ts` - Barrel export

### Phase 3: Main Service
- [ ] `taskBrain.ts` - LLM caller (similar to planCycle/brain.ts)
- [ ] `taskService.ts` - Main orchestrator
  - Build prompt
  - Call LLM
  - Parse response
  - Execute handlers
  - Aggregate results

### Phase 4: Integration
- [ ] Update `processTask` in main `taskService.ts` to use new architecture
- [ ] Test with various task operations
- [ ] Handle edge cases and errors

---

## Date Handling Strategy

### LLM Output:
- All dates as ISO 8601 strings: `"2025-12-12T15:00:00Z"`
- Relative dates converted to absolute: "tomorrow" → "2025-12-06T00:00:00Z"

### Handler Processing:
```typescript
dueDate: params.dueDate ? new Date(params.dueDate) : undefined
```

### Service Layer:
Receives Date objects, stores in Firestore as Timestamps

---

## Testing Strategy

### Unit Tests:
- Each handler independently
- Date parsing edge cases
- Validation logic

### Integration Tests:
- Full flow from taskTool → taskService → handlers → taskManager
- Multiple handler execution
- Error propagation

### End-to-End Tests:
- User request → brain → taskTool → taskService → database

---

## Future Enhancements

1. **Smart Task Suggestions**: Analyze calendar and suggest optimal times
2. **Task Dependencies**: Handle "do X before Y" relationships
3. **Batch Operations**: Efficient handling of multiple tasks
4. **Natural Language Dates**: "next Tuesday", "in 3 weeks"
5. **Task Templates**: Pre-configured task structures
6. **Priority Intelligence**: Suggest priorities based on context

---

## Notes

- Keep handlers thin - all business logic in taskManager
- LLM should output ALL needed data in first response
- No back-and-forth with LLM - single prompt, single response
- Handlers normalize but don't add logic
- Always validate required fields in handlers
- Log at each step for debugging
