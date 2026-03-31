/**
 * Output Format for Event Brain Stage 3 - Generate Handler JSONs
 * Defines the JSON structure for handler call generation
 */

export const GENERATE_HANDLER_OUTPUT_FORMAT = `
====================
OUTPUT FORMAT (Stage 3)
====================

You MUST respond with this JSON structure:

{
  "message": "string - REQUIRED - Detailed message explaining what you're doing",
  "reasoning": "string - Explain the parameters you're generating",
  "handlerCalls": [
    {
      "handler": "createEventHandler | updateEventHandler | deleteEventHandler | readEventHandler | getEventsHandler",
      "parameters": {
        // ALL parameters needed for this handler
        // See detailed specifications for each handler
      }
    }
  ]
}

====================
FIELD DESCRIPTIONS
====================

1. message (REQUIRED):
   - This is the DETAILED execution message
   - Be SPECIFIC about exactly what you're creating/updating/deleting
   - Include event names, times, and key details in the message
   - This is NOT a high-level message - be detailed and actionable
   - Examples:
     * "Scheduling your 'Team Standup' meeting for tomorrow at 10am..."
     * "Creating 2 events: 'Client Call' at 2pm and 'Budget Review' on Friday..."
     * "Rescheduling 'Meeting with Sarah' from 2pm to 4pm today..."

2. reasoning (REQUIRED):
   - Explain the parameters you're generating
   - How you converted dates/times to UTC
   - What assumptions you made
   - Why you chose specific values (event type, duration, etc.)

3. handlerCalls (REQUIRED array):
   - Array of handler call objects
   - Each must have: handler name + parameters object
   - Generate exact number specified in Stage 1 operations
   - Maximum 4 handler calls

====================
HANDLER CALL STRUCTURE
====================

handler:
- Must be one of: createEventHandler, updateEventHandler, deleteEventHandler, readEventHandler, getEventsHandler
- Use FULL handler name (not abbreviated)

parameters:
- Object with ALL required parameters for that handler
- Include optional parameters when relevant
- Follow handler specifications EXACTLY
- Use proper data types

====================
EXAMPLES
====================

Example 1 - Simple Event Creation:
{
  "message": "Scheduling your 'Team Standup' meeting for tomorrow at 10am...",
  "reasoning": "Converting 'tomorrow at 10am' to ISO format. Using 30min default duration. Event type set to 'meeting' for in-person standup.",
  "handlerCalls": [
    {
      "handler": "createEventHandler",
      "parameters": {
        "eventName": "Team Standup",
        "eventType": "meeting",
        "startTime": "2025-12-06T10:00:00Z",
        "endTime": "2025-12-06T10:30:00Z",
        "location": "Conference Room A"
      }
    }
  ]
}

Example 2 - Video Call with Attendees:
{
  "message": "Creating video call 'Q4 Planning' for today at 2pm with Sarah and Mike...",
  "reasoning": "Creating 1-hour video meeting. Event type 'video' for remote call. Adding two attendees by name/email.",
  "handlerCalls": [
    {
      "handler": "createEventHandler",
      "parameters": {
        "eventName": "Q4 Planning Session",
        "eventType": "video",
        "description": "Discuss Q4 goals and upcoming initiatives",
        "startTime": "2025-12-05T14:00:00Z",
        "endTime": "2025-12-05T15:00:00Z",
        "location": "https://zoom.us/j/meeting",
        "attendees": [
          { "name": "Sarah Johnson", "email": "sarah@company.com" },
          { "name": "Mike Chen", "email": "mike@company.com" }
        ],
        "reminders": [
          { "minutes": 15, "method": "notification" }
        ]
      }
    }
  ]
}

Example 3 - Multiple Events:
{
  "message": "Creating 2 events: 'Client Call' at 2pm today and 'Budget Review' on Friday...",
  "reasoning": "Creating two separate events. First is a call today, second is a meeting on Friday. Both are 1-hour duration.",
  "handlerCalls": [
    {
      "handler": "createEventHandler",
      "parameters": {
        "eventName": "Client Call",
        "eventType": "call",
        "startTime": "2025-12-05T14:00:00Z",
        "endTime": "2025-12-05T15:00:00Z"
      }
    },
    {
      "handler": "createEventHandler",
      "parameters": {
        "eventName": "Budget Review",
        "eventType": "meeting",
        "startTime": "2025-12-08T10:00:00Z",
        "endTime": "2025-12-08T11:00:00Z",
        "description": "Review Q4 budget proposal"
      }
    }
  ]
}

Example 4 - Event Update:
{
  "message": "Rescheduling 'Team Meeting' from 2pm to 4pm today...",
  "reasoning": "Updating startTime and endTime for existing event. Using eventId from calendar context. Keeping same duration (1 hour).",
  "handlerCalls": [
    {
      "handler": "updateEventHandler",
      "parameters": {
        "eventId": "event_abc123",
        "startTime": "2025-12-05T16:00:00Z",
        "endTime": "2025-12-05T17:00:00Z"
      }
    }
  ]
}

Example 5 - All-Day Event:
{
  "message": "Creating all-day 'Company Retreat' event from Dec 15-17...",
  "reasoning": "Multi-day all-day event. Setting isAllDay to true, spanning 3 days.",
  "handlerCalls": [
    {
      "handler": "createEventHandler",
      "parameters": {
        "eventName": "Company Retreat",
        "eventType": "meeting",
        "description": "Annual company retreat in Lake Tahoe",
        "startTime": "2025-12-15T00:00:00Z",
        "endTime": "2025-12-17T23:59:59Z",
        "location": "Lake Tahoe Resort",
        "isAllDay": true,
        "color": "#10B981"
      }
    }
  ]
}

====================
CRITICAL RULES
====================

1. ALWAYS include message, reasoning, and handlerCalls fields
2. message must be DETAILED and SPECIFIC (not high-level)
3. Generate EXACTLY the number of handler calls from Stage 1 operations
4. Use FULL handler names (createEventHandler, not just "create")
5. ALL dates in ISO 8601 format: YYYY-MM-DDTHH:MM:SSZ
6. ALL times must be in UTC (use 'Z' suffix)
7. startTime and endTime are REQUIRED for all events
8. endTime MUST be after startTime
9. Convert relative times using CURRENT DATE & TIME context
10. Event names must be DESCRIPTIVE (no generic names)
11. Include ALL required parameters for each handler
12. Maximum 4 handler calls total
13. Output ONLY valid JSON - no text before or after

====================
DATE/TIME CONVERSION REFERENCE
====================

Current Date & Time: See CURRENT DATE & TIME section above

Conversions:
- "today" → Use current date (2025-12-05)
- "tomorrow" → Add 1 day (2025-12-06)
- "next Monday" → Calculate next Monday date
- "2pm" → "14:00" (24-hour format)
- "3:30pm" → "15:30"
- "noon" → "12:00"
- "midnight" → "00:00"

ISO Format Examples:
- "2025-12-05T14:00:00Z" (2pm UTC)
- "2025-12-06T09:30:00Z" (9:30am UTC)
- Always use 'Z' suffix for UTC timezone

Duration Examples:
- "30 minutes" → startTime to startTime + 30 min
- "1 hour" → startTime to startTime + 60 min
- "all day" → isAllDay: true, 00:00:00Z to 23:59:59Z
`;
