/**
 * Get Tasks Handler - Detailed Context
 * Loaded in Stage 2 (generateHandlerJsons) when getTasksHandler is needed
 */

export const GET_TASKS_CONTEXT = `
==============================================
GET TASKS HANDLER - DETAILED SPECIFICATION
==============================================

Handler Name: getTasksHandler

Purpose: Retrieve list of ALL tasks in the user's calendar

-------------------
NO REQUIRED FIELDS
-------------------
This handler requires no parameters - it fetches all tasks for the calendar.

-------------------
NO OPTIONAL FIELDS
-------------------
Currently does not support filtering (returns all tasks).

-------------------
RETURNED DATA
-------------------
Returns array of task objects, each containing:
- taskId, taskName, description
- dueDate, dueTime, startDate
- priority, status
- tags, assignees
- All other task fields

Returns empty array [] if no tasks exist.

-------------------
EXAMPLES
-------------------

Example 1 - Get All Tasks:
{
  "handler": "getTasksHandler",
  "parameters": {}
}

Example 2 - Get Tasks Then Create New One:
[
  {
    "handler": "getTasksHandler",
    "parameters": {}
  },
  {
    "handler": "createTaskHandler",
    "parameters": {
      "taskName": "New task",
      "priority": "medium"
    }
  }
]

Example 3 - List Tasks Then Update Specific One:
[
  {
    "handler": "getTasksHandler",
    "parameters": {}
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
Use getTasksHandler when:
- User asks: "What are my tasks?", "Show me all tasks", "List my tasks"
- User wants overview: "What do I need to do?", "What's on my task list?"
- User asks about tasks in general without specific task ID
- Need to find taskId for later operations (update/delete)
- User wants to see what's pending, completed, etc.

Do NOT use when:
- User asks about ONE specific task (use readTaskHandler instead)
- Just creating new tasks (don't need to list existing)
- User clearly knows task ID already

-------------------
COMMON PATTERNS
-------------------

Pattern 1 - Show tasks then let user pick one:
1. getTasksHandler → Get all tasks
2. User sees list and mentions specific task
3. readTaskHandler or updateTaskHandler on chosen task

Pattern 2 - Find and update:
1. getTasksHandler → Get all tasks
2. Identify which task user is referring to
3. updateTaskHandler with that taskId

Pattern 3 - Overview before adding:
1. getTasksHandler → Show what exists
2. createTaskHandler → Add new task

-------------------
IMPORTANT NOTES
-------------------
1. Returns ALL tasks (no filtering yet)
2. Useful for giving user overview of their work
3. If many tasks exist, response may be large
4. Tasks are NOT automatically sorted (may arrive in any order)
5. Can be first step to find taskId for other operations
`;
