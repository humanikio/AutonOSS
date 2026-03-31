/**
 * Read Task Handler - Detailed Context
 * Loaded in Stage 2 (generateHandlerJsons) when readTaskHandler is needed
 */

export const READ_TASK_CONTEXT = `
==============================================
READ TASK HANDLER - DETAILED SPECIFICATION
==============================================

Handler Name: readTaskHandler

Purpose: Retrieve detailed information about a specific task

-------------------
REQUIRED FIELDS
-------------------
- taskId: string
  - The ID of the task to read
  - Must be obtained from previous getTasks call or known by user
  - Example: "task_abc123"

-------------------
NO OPTIONAL FIELDS
-------------------
This handler only requires taskId.

-------------------
RETURNED DATA
-------------------
Returns complete task object with all fields:
- taskId, calendarId, tenantId
- taskName, description
- dueDate, dueTime, startDate, estimatedDuration
- priority, status, completedAt
- assignees, primaryAssigneeId
- parentTaskId, linkedEventId
- tags, checklistItems
- recurrence, reminders
- metadata, createdAt, updatedAt

-------------------
EXAMPLES
-------------------

Example 1 - Read Single Task:
{
  "handler": "readTaskHandler",
  "parameters": {
    "taskId": "task_abc123"
  }
}

Example 2 - Read Task Then Update (common pattern):
[
  {
    "handler": "readTaskHandler",
    "parameters": {
      "taskId": "task_abc123"
    }
  },
  {
    "handler": "updateTaskHandler",
    "parameters": {
      "taskId": "task_abc123",
      "status": "completed"
    }
  }
]

-------------------
WHEN TO USE
-------------------
Use readTaskHandler when:
- User asks about specific task details: "What's the budget task about?"
- Need to verify task exists before updating
- User wants to see task information: "Show me task details"
- Need to check current task state before making changes

Do NOT use when:
- User wants to see ALL tasks (use getTasksHandler instead)
- Just creating new tasks (no need to read)

-------------------
IMPORTANT NOTES
-------------------
1. Returns null if task doesn't exist
2. Dates are returned as Date objects (will be formatted in response)
3. Useful for getting task details before updates
4. Can be combined with other handlers in same request
`;
