/**
 * Calendar Context Instructions
 * Explains to brain how to request calendar context in Stage 1
 */

export const CALENDAR_CONTEXT_INSTRUCTIONS = `
====================
CALENDAR CONTEXT SYSTEM
====================

You have access to a calendar context system that can fetch tasks and events.

In STAGE 1 (this stage), you analyze the request and determine what calendar context you need.
In STAGE 2, the system will fetch that specific context for you.
In STAGE 3, you'll receive the context and make your final decision.

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

IMPORTANT: By default, BOTH tasks AND events are fetched for comprehensive conflict detection.
Only set includeTasks or includeEvents to filter to one type if you have a specific reason.

====================
WHEN TO REQUEST CONTEXT
====================

REQUEST CONTEXT when:
 Finding tasks/events by semantic description
  Example: "Update my dentist appointment" � need to find "dentist" task
  Request: Tasks for next 30-60 days

 Detecting scheduling conflicts
  Example: "Schedule meeting at 2pm today" � check for conflicts
  Request: Events for today only

 Understanding workload
  Example: "Add another high priority task" � see current high priority tasks
  Request: Pending high priority tasks

 Batch operations
  Example: "Delete all completed tasks from last week" � find matching tasks
  Request: Completed tasks from last 7 days

 Date-aware suggestions
  Example: "When's my next meeting?" � check upcoming events
  Request: Events for next 7 days

DO NOT REQUEST CONTEXT when:
 Simple greetings
  Example: "Hello" / "Hi" � just respond

 Help requests
  Example: "What can you do?" � explain capabilities

 Creating with full details and no conflicts matter
  Example: "Create task 'Buy milk' for next Monday" � straightforward creation

 User is asking general questions
  Example: "How do I delete a task?" � instructional response

====================
EXAMPLES
====================

Example 1 - Semantic Finding (Default: Both Tasks and Events):
User: "Update my dentist appointment to 3pm"
{
  "contextRequest": {
    "needed": true,
    "dateRange": { "start": "2025-12-01", "end": "2026-01-31" },
    "reasoning": "Need to find 'dentist' appointment without ID - could be task or event"
  }
}
Note: includeTasks and includeEvents omitted - defaults to fetching BOTH

Example 2 - Conflict Detection (Default: Both Tasks and Events):
User: "Schedule team meeting at 2pm today"
{
  "contextRequest": {
    "needed": true,
    "dateRange": { "start": "2025-12-05", "end": "2025-12-05" },
    "reasoning": "Check today's schedule for conflicts at 2pm - need both tasks and events"
  }
}
Note: Fetches BOTH tasks and events by default for comprehensive conflict detection

Example 3 - Workload Awareness (Filter: Tasks Only):
User: "Add another high priority task"
{
  "contextRequest": {
    "needed": true,
    "dateRange": { "start": "2025-12-01", "end": "2025-12-31" },
    "includeTasks": true,
    "includeEvents": false,
    "taskFilters": { "status": "pending", "priority": "high" },
    "reasoning": "Check current high priority task load to warn if overloaded - only need tasks, not events"
  }
}
Note: Here we explicitly filter to tasks only since events aren't relevant for task workload

Example 4 - Simple Chat (No Context):
User: "Hello!"
{
  "contextRequest": {
    "needed": false,
    "reasoning": "Simple greeting, no calendar operations needed"
  }
}

Example 5 - Simple Creation (No Context):
User: "Create task 'Review Q4 budget' for tomorrow"
{
  "contextRequest": {
    "needed": false,
    "reasoning": "Straightforward task creation with all details provided, no conflicts to check"
  }
}

====================
BEST PRACTICES
====================

1. Default to Both Tasks and Events
   - By default, BOTH tasks and events are fetched
   - This is best for conflict detection, duplicate prevention, and comprehensive context
   - ONLY filter to one type (includeTasks/includeEvents) when you have a specific reason
   - Examples of when to filter:
     * Checking task workload → Only need tasks
     * Finding specific event → Only need events
     * Task-only semantic search → Only need tasks

2. Be Specific with Date Ranges
   - Use exact ranges, not "all time"
   - Consider what period is actually relevant
   - Example: "next dentist" → 30-60 days, not 365 days

3. Use Filters Wisely
   - Use taskFilters (status, priority) to narrow results
   - This saves tokens and speeds up processing
   - Only filter when the specific subset is needed

4. When in Doubt, Request Context
   - Better to have context and not use it than need it and not have it
   - Stage 1 is fast - Stage 2 with context is more accurate

5. Include Reasoning
   - Explain why you need the context
   - Helps with debugging and understanding

Remember: You're in STAGE 1 now. Just specify what context you need.
You'll receive it in STAGE 3 and can use it to make your final decision.
`;
