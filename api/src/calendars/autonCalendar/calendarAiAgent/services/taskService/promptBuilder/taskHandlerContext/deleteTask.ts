/**
 * Delete Task Handler - Detailed Context
 * Loaded in Stage 2 (generateHandlerJsons) when deleteTaskHandler is needed
 */

export const DELETE_TASK_CONTEXT = `
==============================================
DELETE TASK HANDLER - DETAILED SPECIFICATION
==============================================

Handler Name: deleteTaskHandler

Purpose: Permanently delete tasks from the user's calendar

-------------------
REQUIRED FIELDS
-------------------
- taskId: string
  - The ID of the task to delete
  - Must be obtained from previous readTask or getTasks call
  - Example: "task_abc123"

-------------------
NO OPTIONAL FIELDS
-------------------
This handler only requires taskId.

-------------------
EXAMPLES
-------------------

Example 1 - Delete Single Task:
{
  "handler": "deleteTaskHandler",
  "parameters": {
    "taskId": "task_abc123"
  }
}

Example 2 - Delete Multiple Tasks (in sequence):
[
  {
    "handler": "deleteTaskHandler",
    "parameters": {
      "taskId": "task_abc123"
    }
  },
  {
    "handler": "deleteTaskHandler",
    "parameters": {
      "taskId": "task_xyz789"
    }
  }
]

-------------------
IMPORTANT NOTES
-------------------
1. Deletion is PERMANENT - cannot be undone
2. taskId must be valid and exist in the calendar
3. If task doesn't exist, operation will return false/error
4. Deleting parent tasks does NOT automatically delete subtasks
5. Consider marking status as "cancelled" instead of deleting if user might need history
`;
