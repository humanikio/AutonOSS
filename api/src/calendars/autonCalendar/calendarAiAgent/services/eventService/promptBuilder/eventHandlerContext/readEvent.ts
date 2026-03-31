/**
 * Read Event Handler - Detailed Context
 * Loaded in Stage 2 (generateHandlerJsons) when readEventHandler is needed
 */

export const READ_EVENT_CONTEXT = `
==============================================
READ EVENT HANDLER - DETAILED SPECIFICATION
==============================================

Handler Name: readEventHandler

Purpose: Fetch details of a specific calendar event by ID

-------------------
REQUIRED FIELDS
-------------------
- eventId: string
  - The ID of the event to read
  - Must be a valid event ID in the calendar
  - Example: "event_abc123"

-------------------
RESPONSE
-------------------
Returns complete event object with all fields:
- eventId, eventName, eventType
- startTime, endTime, location
- description, attendees, color
- isAllDay, timezone, recurrence
- reminders, metadata
- createdAt, updatedAt

-------------------
EXAMPLES
-------------------

Example 1 - Read Specific Event:
{
  "handler": "readEventHandler",
  "parameters": {
    "eventId": "event_abc123"
  }
}

Example 2 - Get Event Before Updating:
{
  "handler": "readEventHandler",
  "parameters": {
    "eventId": "event_xyz789"
  }
}

-------------------
USE CASES
-------------------
1. Get event details to show user
2. Fetch event before updating it
3. Verify event exists
4. Check event attendees or timing
5. Review event recurrence pattern

-------------------
IMPORTANT NOTES
-------------------
1. Returns null if event not found
2. Useful before update operations to confirm event exists
3. Can be used to display event details to user
4. All timestamps are converted to Date objects
5. Attendees array contains attendee IDs (not full objects)
`;
