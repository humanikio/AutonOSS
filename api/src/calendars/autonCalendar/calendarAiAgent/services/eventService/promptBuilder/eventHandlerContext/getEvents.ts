/**
 * Get Events Handler - Detailed Context
 * Loaded in Stage 2 (generateHandlerJsons) when getEventsHandler is needed
 */

export const GET_EVENTS_CONTEXT = `
==============================================
GET EVENTS HANDLER - DETAILED SPECIFICATION
==============================================

Handler Name: getEventsHandler

Purpose: Retrieve all calendar events (returns events sorted by startTime)

-------------------
NO PARAMETERS REQUIRED
-------------------
This handler takes no parameters - it returns ALL events for the calendar.

-------------------
RESPONSE
-------------------
Returns array of event objects, sorted by startTime (ascending).
Each event includes:
- eventId, eventName, eventType
- startTime, endTime, location
- description, attendees, color
- isAllDay, timezone, recurrence
- reminders, metadata
- createdAt, updatedAt

-------------------
EXAMPLES
-------------------

Example 1 - Get All Events:
{
  "handler": "getEventsHandler",
  "parameters": {}
}

Example 2 - List User's Events:
{
  "handler": "getEventsHandler",
  "parameters": {}
}

-------------------
USE CASES
-------------------
1. "Show me all my events"
2. "What events do I have?"
3. "List my calendar"
4. "What's on my schedule?"
5. Finding events by searching through results

-------------------
FILTERING & SEARCH
-------------------
NOTE: This handler returns ALL events. To find specific events:
- User can request "events today", "events this week", etc.
- You should call getEventsHandler and then describe/filter the results in your response
- For semantic searches like "find my meeting with Sarah", call getEventsHandler and analyze results
- Calendar context can be used for date-range filtering

-------------------
IMPORTANT NOTES
-------------------
1. Returns empty array [] if no events found
2. Events are sorted by startTime (earliest first)
3. Includes all events regardless of date (past, present, future)
4. Does NOT paginate - returns all events
5. For date-specific queries, use calendar context instead
6. Consider using calendar context for better performance on large calendars
`;
