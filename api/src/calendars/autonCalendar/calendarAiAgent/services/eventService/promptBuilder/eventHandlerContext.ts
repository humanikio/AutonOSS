/**
 * Event Handler Context - Basic Descriptions
 * Used in Stage 1 (reviewPrompt) to determine which operations are needed
 * Does NOT include detailed field specifications - those are loaded later
 */

export const HANDLER_DESCRIPTIONS = `
Available Event Handlers:

1. createEventHandler
   - Purpose: Create new calendar events
   - When to use: User wants to schedule meetings, appointments, calls, etc.
   - Can batch: Yes (can create multiple events in sequence)
   - Requires: Event name, start time, end time, event type at minimum
   - Example: "Schedule a meeting tomorrow at 2pm", "Create an appointment"

2. updateEventHandler
   - Purpose: Update existing event details
   - When to use: User wants to modify event properties (time, location, attendees, etc.)
   - Requires: eventId (must know which event to update)
   - Can batch: Yes (can update multiple events)
   - Example: "Reschedule my meeting to 3pm", "Change meeting location"

3. deleteEventHandler
   - Purpose: Delete events from calendar
   - When to use: User wants to remove/cancel events
   - Requires: eventId (must know which event to delete)
   - Can batch: Yes (can delete multiple events)
   - Example: "Cancel my meeting with Sarah", "Delete tomorrow's standup"

4. readEventHandler
   - Purpose: Retrieve details of a single event
   - When to use: User asks about a specific event's details
   - Requires: eventId
   - Returns: Full event information
   - Example: "Show me details of my 3pm meeting"

5. getEventsHandler
   - Purpose: List all events for the calendar
   - When to use: User wants overview, list, or to browse events
   - Requires: Nothing (gets all events)
   - Returns: Array of all events sorted by start time
   - Example: "What are my events?", "Show me my schedule"

Notes:
- Operations can be combined (e.g., create 2 events, then update 1 existing event)
- Maximum 4 operations per request for performance
- If user mentions specific times/dates, they likely want createEventHandler
- If user says "my meeting", "the standup", etc., they likely need readEventHandler or getEventsHandler first
- All event times must be in ISO 8601 format with UTC timezone
`;

/**
 * Type definition for handler operations
 */
export type HandlerType = 'create' | 'update' | 'delete' | 'read' | 'getEvents';

/**
 * Maps handler types to their full handler names
 */
export const HANDLER_NAME_MAP: Record<HandlerType, string> = {
  create: 'createEventHandler',
  update: 'updateEventHandler',
  delete: 'deleteEventHandler',
  read: 'readEventHandler',
  getEvents: 'getEventsHandler'
};
