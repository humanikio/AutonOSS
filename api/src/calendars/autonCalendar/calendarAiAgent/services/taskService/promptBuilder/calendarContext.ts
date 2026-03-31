/**
 * Calendar Context Instructions for Task Service
 * Explains to task brain how to request calendar context in Stage 1
 */

export const TASK_CALENDAR_CONTEXT_INSTRUCTIONS = `
====================
CALENDAR CONTEXT SYSTEM
====================

You have access to a calendar context system that can fetch tasks and events.

In STAGE 1 (this stage), you analyze the task request and determine what calendar context you need.
In STAGE 2, the system will fetch that specific context for you.
In STAGE 3, you'll receive the context and generate your final handler calls.

Context Request Format (in your Stage 1 response):
{
  "contextRequest": {
    "needed": boolean,              // Do you need calendar context?
    "dateRange": {
      "start": "YYYY-MM-DD",        // Start date (ISO format)
      "end": "YYYY-MM-DD"           // End date (ISO format)
    },
    "includeTasks": boolean,         // Fetch tasks? (default: true) - OMIT for default
    "includeEvents": boolean,        // Fetch events? (default: true) - OMIT for default
    "taskFilters": {
      "status": "pending" | "completed" | "all",
      "priority": "low" | "medium" | "high"
    },
    "reasoning": "Why you need this context"
  }
}

IMPORTANT: By default, BOTH tasks AND events are fetched for comprehensive conflict detection and linking.
Only set includeTasks or includeEvents to filter to one type if you have a specific reason.

====================
WHEN TO REQUEST CONTEXT
====================

REQUEST CONTEXT when:

✓ Finding tasks by semantic description
  Example: "Update my dentist appointment" → need to find "dentist" task
  Request: Tasks for next 30-60 days

✓ Detecting time conflicts for new tasks
  Example: "Create task for 2pm today" → check for conflicts at that time
  Request: Events for today only

✓ Linking tasks to events
  Example: "Create task to prepare for tomorrow's meeting" → find the meeting
  Request: Events for tomorrow

✓ Understanding workload before creating
  Example: "Add another high priority task" → see current high priority tasks
  Request: Pending high priority tasks

✓ Finding related tasks
  Example: "Update the task about the budget" → find task with "budget" in name
  Request: Tasks for current month

✓ Checking what's already done
  Example: "Create task for budget review if not already done" → check completed tasks
  Request: Completed tasks for date range

DO NOT REQUEST CONTEXT when:

✗ Creating simple standalone task
  Example: "Create task 'Buy milk' for tomorrow" → no context needed

✗ Task has explicit ID provided
  Example: "Update task task_abc123 to high priority" → ID already known

✗ Deleting by explicit ID
  Example: "Delete task task_xyz789" → no search needed

✗ Simple queries that don't need filtering
  Example: "Get all my tasks" → generic query, no context needed

====================
TASK-SPECIFIC USE CASES
====================

Use Case 1 - Semantic Task Finding (Filter: Tasks Only):
User: "Mark my dentist appointment as complete"
{
  "contextRequest": {
    "needed": true,
    "dateRange": { "start": "2025-12-01", "end": "2026-01-31" },
    "includeTasks": true,
    "includeEvents": false,
    "taskFilters": { "status": "pending" },
    "reasoning": "Need to find 'dentist' task by semantic description without ID - only need tasks"
  }
}
Note: Filtered to tasks only since we're updating a task, not an event

Use Case 2 - Conflict Detection (Default: Both Tasks and Events):
User: "Create task 'Client call' at 2pm today"
{
  "contextRequest": {
    "needed": true,
    "dateRange": { "start": "2025-12-05", "end": "2025-12-05" },
    "reasoning": "Check for conflicts at 2pm before creating task - need both tasks and events"
  }
}
Note: Omitted includeTasks/includeEvents - fetches BOTH by default for comprehensive conflict check

Use Case 3 - Event Linking (Filter: Events Only):
User: "Create task to prepare for tomorrow's team meeting"
{
  "contextRequest": {
    "needed": true,
    "dateRange": { "start": "2025-12-06", "end": "2025-12-06" },
    "includeTasks": false,
    "includeEvents": true,
    "reasoning": "Find 'team meeting' event to link task to it - only need events"
  }
}
Note: Filtered to events only since we're looking for an event to link to

Use Case 4 - Workload Check:
User: "Add another urgent task to the list"
{
  "contextRequest": {
    "needed": true,
    "dateRange": { "start": "2025-12-01", "end": "2025-12-31" },
    "includeTasks": true,
    "includeEvents": false,
    "taskFilters": { "status": "pending", "priority": "urgent" },
    "reasoning": "Check current urgent task load to warn if overloaded"
  }
}

Use Case 5 - Duplicate Prevention (Default: Both Tasks and Events):
User: "Create task to review Q4 budget"
{
  "contextRequest": {
    "needed": true,
    "dateRange": { "start": "2025-12-01", "end": "2025-12-31" },
    "reasoning": "Check if Q4 budget review already exists as task or event to prevent duplicates"
  }
}
Note: Fetches both - budget review could be a task OR an event

Use Case 6 - Smart Scheduling (Default: Both Tasks and Events):
User: "Create task with a good time slot"
{
  "contextRequest": {
    "needed": true,
    "dateRange": { "start": "2025-12-05", "end": "2025-12-07" },
    "reasoning": "Find gaps in calendar to suggest optimal time for task - need both tasks and events"
  }
}
Note: Fetches both to find true gaps in the calendar

====================
BEST PRACTICES
====================

1. Default to Both Tasks and Events
   - By default, BOTH tasks and events are fetched
   - This is best for conflict detection, duplicate prevention, and comprehensive context
   - ONLY filter to one type (includeTasks/includeEvents) when you have a specific reason
   - Examples of when to filter:
     * Updating a task by name → Only need tasks
     * Finding an event to link → Only need events
     * Checking task workload → Only need tasks

2. Be Specific with Date Ranges
   - Use exact ranges, not "all time"
   - Consider what period is actually relevant
   - Example: Finding "dentist" → 30-60 days, not 365 days

3. Use Filters Wisely
   - Use taskFilters (status, priority) to narrow results
   - Saves tokens and speeds up processing
   - Only filter when the specific subset is needed

4. When in Doubt, Request Context
   - Better to have context and not use it than need it and not have it
   - Stage 1 is fast - Stage 3 with context is more accurate

5. Include Clear Reasoning
   - Explain why you need the context
   - Helps with debugging and understanding

6. Consider Edge Cases
   - Duplicate prevention
   - Conflict detection
   - Event linking opportunities

Remember: You're in STAGE 1 now. Just specify what context you need.
You'll receive it in STAGE 3 and can use it to generate your handler calls.
`;
