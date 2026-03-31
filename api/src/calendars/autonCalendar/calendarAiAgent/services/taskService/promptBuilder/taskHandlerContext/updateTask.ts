/**
 * Update Task Handler - Detailed Context
 * Loaded in Stage 2 (generateHandlerJsons) when updateTaskHandler is needed
 */

export const UPDATE_TASK_CONTEXT = `
==============================================
UPDATE TASK HANDLER - DETAILED SPECIFICATION
==============================================

Handler Name: updateTaskHandler

Purpose: Update existing tasks in the user's calendar

-------------------
REQUIRED FIELDS
-------------------
- taskId: string
  - The ID of the task to update
  - Must be obtained from previous readTask or getTasks call
  - Example: "task_abc123"

-------------------
OPTIONAL FIELDS (At Least One Required)
-------------------

All fields from createTaskHandler can be updated:

Task Identification:
- taskName: string
  - Update the task title/name

- description: string
  - Update task description/notes

Dates & Time:
- dueDate: ISO 8601 date string
  - Change when task is due
  - Example: "2025-12-15"

- dueTime: ISO 8601 datetime string
  - Change specific due time
  - REQUIRES dueDate to be set
  - Example: "2025-12-15T14:00:00Z"

- startDate: ISO 8601 date string
  - Change when to start task

- estimatedDuration: number
  - Update time estimate (in minutes)

Task Properties:
- priority: "low" | "medium" | "high" | "urgent"
  - Change task priority

- status: "todo" | "in_progress" | "completed" | "cancelled" | "blocked"
  - Change task status
  - Common: "completed" when done, "in_progress" when starting

Organization:
- tags: string[]
  - Replace all tags with new set
  - Example: ["urgent", "finance"]

- assignees: string[]
  - Replace assignee list

Relationships:
- parentTaskId: string
  - Change parent task (move in hierarchy)

- linkedEventId: string
  - Link to different event

Advanced:
- checklistItems: Array<{ id: string, text: string, completed: boolean }>
  - Replace entire checklist

- recurrence: { frequency: string, interval: number, endDate?: string }
  - Update recurrence pattern

- reminders: Array<{ minutes: number, method: string }>
  - Replace reminder settings

-------------------
EXAMPLES
-------------------

Example 1 - Mark Task as Completed:
{
  "handler": "updateTaskHandler",
  "parameters": {
    "taskId": "task_abc123",
    "status": "completed"
  }
}

Example 2 - Change Priority:
{
  "handler": "updateTaskHandler",
  "parameters": {
    "taskId": "task_xyz789",
    "priority": "urgent"
  }
}

Example 3 - Update Due Date:
{
  "handler": "updateTaskHandler",
  "parameters": {
    "taskId": "task_def456",
    "dueDate": "2025-12-20",
    "dueTime": "2025-12-20T16:00:00Z"
  }
}

Example 4 - Update Multiple Fields:
{
  "handler": "updateTaskHandler",
  "parameters": {
    "taskId": "task_ghi789",
    "taskName": "Review Q4 budget (revised)",
    "description": "Updated budget review with new data",
    "priority": "urgent",
    "status": "in_progress",
    "tags": ["budget", "Q4", "revised", "urgent"]
  }
}

Example 5 - Update Checklist Progress:
{
  "handler": "updateTaskHandler",
  "parameters": {
    "taskId": "task_jkl012",
    "checklistItems": [
      { "id": "1", "text": "Create slides", "completed": true },
      { "id": "2", "text": "Add data charts", "completed": true },
      { "id": "3", "text": "Practice delivery", "completed": false }
    ]
  }
}

Example 6 - Change Status to In Progress:
{
  "handler": "updateTaskHandler",
  "parameters": {
    "taskId": "task_mno345",
    "status": "in_progress"
  }
}

-------------------
IMPORTANT NOTES
-------------------
1. taskId is REQUIRED - cannot update without knowing which task
2. Provide ONLY fields that should change (partial updates supported)
3. When updating arrays (tags, assignees, checklist), entire array is replaced
4. To mark task done: set status to "completed"
5. To start working on task: set status to "in_progress"
6. Dates must use ISO 8601 format
7. dueTime requires dueDate to be present (either in update or already on task)
8. Updating status to "completed" automatically sets completedAt timestamp
`;
