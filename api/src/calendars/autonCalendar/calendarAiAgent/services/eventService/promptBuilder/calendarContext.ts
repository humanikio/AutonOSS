/**
 * Calendar Context Instructions for Event Service
 * Explains to event brain how to request calendar context in Stage 1
 */

export const EVENT_CALENDAR_CONTEXT_INSTRUCTIONS = `
====================
CALENDAR CONTEXT SYSTEM
====================

You have access to a calendar context system that can fetch tasks and events.

In STAGE 1 (this stage), you analyze the event request and determine what calendar context you need.
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

✓ Finding events by semantic description
  Example: "Cancel my meeting with Sarah" → need to find "Sarah" event
  Request: Events for next 30-60 days

✓ Detecting time conflicts for new events
  Example: "Schedule meeting at 2pm today" → check for conflicts at that time
  Request: Both tasks and events for today

✓ Linking events to tasks
  Example: "Create meeting about the budget task" → find the budget task
  Request: Tasks for relevant period

✓ Understanding schedule before adding events
  Example: "Schedule team standup when I'm free" → find free time slots
  Request: Events and tasks for target dates

✓ Finding related events
  Example: "Reschedule my standup meeting" → find event with "standup" in name
  Request: Events for current month

✓ Checking what's already scheduled
  Example: "Schedule meeting if not already scheduled" → check existing events
  Request: Events for date range

DO NOT REQUEST CONTEXT when:

✗ Creating simple standalone event
  Example: "Schedule meeting tomorrow at 2pm" → no context needed

✗ Event has explicit ID provided
  Example: "Update event event_abc123 to 3pm" → ID already known

✗ Deleting by explicit ID
  Example: "Delete event event_xyz789" → no search needed

✗ Simple queries that don't need filtering
  Example: "Get all my events" → generic query, no context needed

====================
EVENT-SPECIFIC USE CASES
====================

Use Case 1 - Semantic Event Finding (Filter: Events Only):
User: "Cancel my meeting with Sarah"
{
  "contextRequest": {
    "needed": true,
    "dateRange": { "start": "2025-12-01", "end": "2026-01-31" },
    "includeTasks": false,
    "includeEvents": true,
    "reasoning": "Need to find 'Sarah' event by semantic description without ID - only need events"
  }
}
Note: Filtered to events only since we're canceling an event, not a task

Use Case 2 - Conflict Detection (Default: Both Tasks and Events):
User: "Schedule team meeting at 2pm today"
{
  "contextRequest": {
    "needed": true,
    "dateRange": { "start": "2025-12-05", "end": "2025-12-05" },
    "reasoning": "Check for conflicts at 2pm before creating event - need both tasks and events"
  }
}
Note: Omitted includeTasks/includeEvents - fetches BOTH by default for comprehensive conflict check

Use Case 3 - Task Linking (Filter: Tasks Only):
User: "Schedule meeting to discuss the budget review task"
{
  "contextRequest": {
    "needed": true,
    "dateRange": { "start": "2025-12-01", "end": "2025-12-31" },
    "includeTasks": true,
    "includeEvents": false,
    "reasoning": "Find 'budget review' task to link event to it - only need tasks"
  }
}
Note: Filtered to tasks only since we're looking for a task to link to

Use Case 4 - Free Time Finding (Default: Both Tasks and Events):
User: "Schedule 1-hour meeting when I'm free this week"
{
  "contextRequest": {
    "needed": true,
    "dateRange": { "start": "2025-12-05", "end": "2025-12-11" },
    "reasoning": "Find gaps in calendar to suggest optimal time - need both tasks and events"
  }
}
Note: Fetches both to find true free time slots

Use Case 5 - Duplicate Prevention (Default: Both Tasks and Events):
User: "Schedule Q4 review meeting"
{
  "contextRequest": {
    "needed": true,
    "dateRange": { "start": "2025-12-01", "end": "2025-12-31" },
    "reasoning": "Check if Q4 review already exists as event or task to prevent duplicates"
  }
}
Note: Fetches both - Q4 review could be an event OR a task

Use Case 6 - Rescheduling (Filter: Events Only):
User: "Move my 2pm meeting to 4pm"
{
  "contextRequest": {
    "needed": true,
    "dateRange": { "start": "2025-12-05", "end": "2025-12-05" },
    "includeTasks": false,
    "includeEvents": true,
    "reasoning": "Find 2pm event to reschedule, then check 4pm for conflicts - only need events"
  }
}
Note: Need events to find the 2pm meeting and check 4pm slot

Use Case 7 - Recurring Pattern Detection:
User: "Schedule another weekly standup"
{
  "contextRequest": {
    "needed": true,
    "dateRange": { "start": "2025-12-01", "end": "2025-12-31" },
    "includeTasks": false,
    "includeEvents": true,
    "reasoning": "Find existing standup pattern to match timing and settings"
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
     * Canceling an event by name → Only need events
     * Finding a task to link → Only need tasks
     * Checking event schedule → Only need events

2. Be Specific with Date Ranges
   - Use exact ranges, not "all time"
   - Consider what period is actually relevant
   - Example: Finding "meeting with Sarah" → 30-60 days, not 365 days

3. Use Filters Wisely
   - Use taskFilters (status, priority) to narrow task results
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
   - Task/event linking opportunities
   - Recurring event patterns

Remember: You're in STAGE 1 now. Just specify what context you need.
You'll receive it in STAGE 3 and can use it to generate your handler calls.
`;
