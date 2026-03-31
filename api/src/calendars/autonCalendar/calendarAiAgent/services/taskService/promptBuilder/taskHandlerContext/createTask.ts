/**
 * Create Task Handler - Detailed Context
 * Loaded in Stage 2 (generateHandlerJsons) when createTaskHandler is needed
 */

export const CREATE_TASK_CONTEXT = `
==============================================
CREATE TASK HANDLER - DETAILED SPECIFICATION
==============================================

Handler Name: createTaskHandler

Purpose: Create new tasks in the user's calendar

-------------------
REQUIRED FIELDS
-------------------
- taskName: string
  - The name/title of the task
  - Must be clear and descriptive
  - PRESERVE the user's exact wording when possible
  - DO NOT use generic names like "Task at 3pm", "To Do", "New Task"
  - Example: "Review Q4 budget", "Call dentist", "Test out new agent functions on Auton"

-------------------
OPTIONAL FIELDS
-------------------

Description:
- description: string
  - Additional details about the task
  - Can include notes, context, instructions
  - Make this meaningful and specific to the user's request
  - DO NOT use generic descriptions like "To Do", "Task", "New task"
  - Example: "Review the Q4 budget proposal and provide feedback", "Schedule dentist appointment for teeth cleaning"

Dates & Time:
- dueDate: ISO 8601 date string (YYYY-MM-DD)
  - The date by which task should be completed
  - Example: "2025-12-12"

- dueTime: ISO 8601 datetime string (YYYY-MM-DDTHH:MM:SSZ)
  - Specific time task is due
  - REQUIRES dueDate to be set
  - Example: "2025-12-12T15:00:00Z" (3pm UTC)

- startDate: ISO 8601 date string
  - When to begin working on task
  - Optional, useful for planning

- estimatedDuration: number
  - How long task will take (in minutes)
  - Example: 60 (for 1 hour), 30 (for 30 minutes)

Task Properties:
- priority: "low" | "medium" | "high" | "urgent"
  - Default: "medium"
  - Use "urgent" for time-sensitive tasks
  - Use "low" for nice-to-haves

- status: "todo" | "in_progress" | "completed" | "cancelled" | "blocked"
  - Default: "todo"
  - Usually leave as default for new tasks
  - Use "in_progress" if starting immediately

Organization:
- tags: string[]
  - Labels for categorizing tasks
  - Example: ["budget", "finance", "Q4"]

- assignees: string[]
  - User IDs of people assigned to task
  - First assignee becomes primary
  - Example: ["user_123", "user_456"]

Relationships:
- parentTaskId: string
  - ID of parent task (for subtasks)
  - Creates task hierarchy
  - Example: "task_abc123"

- linkedEventId: string
  - ID of related calendar event
  - Useful for linking tasks to meetings
  - Example: "event_xyz789"

Advanced Features:
- checklistItems: Array<{ id: string, text: string, completed: boolean }>
  - Sub-items within task
  - Example: [
      { "id": "1", "text": "Review numbers", "completed": false },
      { "id": "2", "text": "Create summary", "completed": false }
    ]

- recurrence: { frequency: string, interval: number, endDate?: string }
  - For repeating tasks
  - frequency: "daily" | "weekly" | "monthly" | "yearly"
  - interval: how often (1 = every, 2 = every other, etc.)
  - endDate: ISO 8601 date when recurrence stops
  - Example: { "frequency": "weekly", "interval": 1, "endDate": "2025-12-31" }

- reminders: Array<{ minutes: number, method: string }>
  - Alerts before task is due
  - minutes: how many minutes before due time
  - method: "email" | "notification" | "sms"
  - Example: [
      { "minutes": 60, "method": "notification" },
      { "minutes": 1440, "method": "email" }
    ]

-------------------
EXAMPLES
-------------------

Example 1 - Simple Task:
{
  "handler": "createTaskHandler",
  "parameters": {
    "taskName": "Buy groceries",
    "priority": "medium",
    "tags": ["personal", "shopping"]
  }
}

Example 2 - Task with Due Date:
{
  "handler": "createTaskHandler",
  "parameters": {
    "taskName": "Submit expense report",
    "description": "Submit Q4 expense report to finance",
    "dueDate": "2025-12-15",
    "priority": "high",
    "tags": ["work", "finance"]
  }
}

Example 3 - Task with Specific Due Time:
{
  "handler": "createTaskHandler",
  "parameters": {
    "taskName": "Review Q4 budget",
    "description": "Review and approve Q4 budget proposal",
    "dueDate": "2025-12-12",
    "dueTime": "2025-12-12T15:00:00Z",
    "priority": "urgent",
    "estimatedDuration": 90,
    "tags": ["budget", "Q4", "finance"]
  }
}

Example 4 - Task with Checklist:
{
  "handler": "createTaskHandler",
  "parameters": {
    "taskName": "Prepare presentation",
    "dueDate": "2025-12-20",
    "priority": "high",
    "checklistItems": [
      { "id": "1", "text": "Create slides", "completed": false },
      { "id": "2", "text": "Add data charts", "completed": false },
      { "id": "3", "text": "Practice delivery", "completed": false }
    ],
    "tags": ["presentation", "work"]
  }
}

Example 5 - Recurring Task:
{
  "handler": "createTaskHandler",
  "parameters": {
    "taskName": "Weekly team sync",
    "description": "Check in with team on progress",
    "dueDate": "2025-12-06",
    "dueTime": "2025-12-06T10:00:00Z",
    "priority": "medium",
    "recurrence": {
      "frequency": "weekly",
      "interval": 1,
      "endDate": "2026-01-31"
    },
    "reminders": [
      { "minutes": 15, "method": "notification" }
    ],
    "tags": ["team", "recurring"]
  }
}

-------------------
IMPORTANT NOTES
-------------------
1. Always use ISO 8601 format for dates: "YYYY-MM-DD" or "YYYY-MM-DDTHH:MM:SSZ"
2. dueTime requires dueDate - cannot set time without date
3. All times should be in UTC timezone
4. For "today", "tomorrow", "next week" - convert to actual ISO dates
5. Priority defaults to "medium" if not specified
6. Status defaults to "todo" for new tasks
7. Generate unique IDs for checklist items (can use "1", "2", "3", etc.)
8. Estimateduration is in minutes (60 = 1 hour, 120 = 2 hours)
`;
