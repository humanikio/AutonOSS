/**
 * Delete Event Handler - Detailed Context
 * Loaded in Stage 2 (generateHandlerJsons) when deleteEventHandler is needed
 */

export const DELETE_EVENT_CONTEXT = `
==============================================
DELETE EVENT HANDLER - DETAILED SPECIFICATION
==============================================

Handler Name: deleteEventHandler

Purpose: Delete a calendar event (with cascade deletion of attendees)

-------------------
REQUIRED FIELDS
-------------------
- eventId: string
  - The ID of the event to delete
  - Must be a valid event ID
  - Example: "event_abc123"

-------------------
RESPONSE
-------------------
Returns boolean:
- true if event was deleted successfully
- false if event not found

-------------------
CASCADE DELETION
-------------------
When an event is deleted:
1. All attendee records for the event are deleted first
2. Then the event document itself is deleted
3. This ensures no orphaned attendee data remains

-------------------
EXAMPLES
-------------------

Example 1 - Delete Specific Event:
{
  "handler": "deleteEventHandler",
  "parameters": {
    "eventId": "event_abc123"
  }
}

Example 2 - Cancel Meeting:
{
  "handler": "deleteEventHandler",
  "parameters": {
    "eventId": "event_xyz789"
  }
}

Example 3 - Remove Event:
{
  "handler": "deleteEventHandler",
  "parameters": {
    "eventId": "event_def456"
  }
}

-------------------
USE CASES
-------------------
1. "Delete my meeting with Sarah"
   - First find event (getEventsHandler or calendar context)
   - Then delete by eventId

2. "Cancel tomorrow's standup"
   - First find event by description and date
   - Then delete by eventId

3. "Remove the event at 3pm"
   - First find event by time
   - Then delete by eventId

4. "Delete all events" (Multiple deletions)
   - Call getEventsHandler first
   - Then call deleteEventHandler for each event

-------------------
IMPORTANT NOTES
-------------------
1. Deletion is PERMANENT - cannot be undone
2. Automatically deletes all associated attendees (cascade delete)
3. Returns false if event doesn't exist (not an error)
4. For recurring events: only deletes the specific occurrence (not implemented yet)
5. No confirmation prompt - deletion happens immediately
6. Event milestones and notifications are NOT automatically cancelled
7. If event has linkedEventId references from tasks, those references become invalid
`;
