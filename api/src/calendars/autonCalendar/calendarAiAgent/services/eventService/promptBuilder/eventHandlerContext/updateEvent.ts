/**
 * Update Event Handler - Detailed Context
 * Loaded in Stage 2 (generateHandlerJsons) when updateEventHandler is needed
 */

export const UPDATE_EVENT_CONTEXT = `
==============================================
UPDATE EVENT HANDLER - DETAILED SPECIFICATION
==============================================

Handler Name: updateEventHandler

Purpose: Update existing calendar events

-------------------
REQUIRED FIELDS
-------------------
- eventId: string
  - The ID of the event to update
  - Must be obtained from previous readEvent or getEvents call
  - Example: "event_abc123"

-------------------
OPTIONAL FIELDS (At Least One Required)
-------------------

All fields from createEventHandler can be updated:

Event Identification:
- eventName: string
  - Update the event title/name
  - Example: "Team Standup (Updated)"

- eventType: "meeting" | "call" | "video" | "task" | "reminder" | "appointment"
  - Change the event type

Time & Date:
- startTime: ISO 8601 datetime string
  - Change when event starts
  - Example: "2025-12-15T14:00:00Z"

- endTime: ISO 8601 datetime string
  - Change when event ends
  - Must be after startTime
  - Example: "2025-12-15T15:00:00Z"

Details:
- description: string
  - Update event description/notes

- location: string
  - Change event location
  - Example: "Conference Room B", "https://zoom.us/j/newlink"

Attendees:
- attendees: Array<AttendeeObject>
  - Replace entire attendee list
  - Each attendee object can have:
    - name: string (optional, display name)
    - email: string (REQUIRED if no contactId or phoneNumber)
    - phoneNumber: string (REQUIRED if no contactId or email)
    - contactId: string (REQUIRED if no email or phoneNumber)

  ⚠️ CRITICAL ATTENDEE REQUIREMENTS:
  - EVERY attendee MUST have at least ONE identifier: email, phoneNumber, OR contactId
  - Name alone is NOT sufficient - it will cause validation errors
  - If user only provides a name (e.g., "Fredrick"), you have TWO options:
    1. OMIT the attendee entirely and mention in your message that you need their contact info
    2. Use a placeholder email like "fredrick@example.com" and mention in your message that the user should update it

  VALID Examples:
  [
    { "name": "Sarah Johnson", "email": "sarah@example.com" },
    { "email": "mike@company.com" },
    { "contactId": "contact_123" },
    { "name": "Dr. Smith", "phoneNumber": "+1-555-0123" }
  ]

  INVALID Examples (WILL FAIL):
  [
    { "name": "Fredrick" },  // ❌ No identifier!
    { "name": "Sarah" }       // ❌ No identifier!
  ]

Visual & Display:
- color: string
  - Change event color
  - Hex code format
  - Example: "#10B981"

- isAllDay: boolean
  - Change all-day status
  - Example: true

Timezone:
- timezone: string
  - Change timezone
  - IANA timezone identifier
  - Example: "America/Los_Angeles"

Recurrence:
- recurrence: { frequency: string, interval: number, endDate?: string }
  - Update recurrence pattern
  - frequency: "daily" | "weekly" | "monthly" | "yearly"
  - interval: number (1 = every, 2 = every other, etc.)
  - endDate: ISO 8601 date (optional)
  - Example: { "frequency": "weekly", "interval": 2 }

Reminders:
- reminders: Array<{ minutes: number, method: string }>
  - Replace reminder settings
  - minutes: number (minutes before event)
  - method: "email" | "notification" | "sms"
  - Example: [{ "minutes": 30, "method": "notification" }]

Metadata:
- metadata: object
  - Update custom metadata
  - Example: { "conferenceLink": "https://zoom.us/j/updated" }

-------------------
EXAMPLES
-------------------

Example 1 - Reschedule Event:
{
  "handler": "updateEventHandler",
  "parameters": {
    "eventId": "event_abc123",
    "startTime": "2025-12-10T15:00:00Z",
    "endTime": "2025-12-10T16:00:00Z"
  }
}

Example 2 - Change Location:
{
  "handler": "updateEventHandler",
  "parameters": {
    "eventId": "event_xyz789",
    "location": "https://zoom.us/j/987654321"
  }
}

Example 3 - Add Description and Change Type:
{
  "handler": "updateEventHandler",
  "parameters": {
    "eventId": "event_def456",
    "eventType": "video",
    "description": "Discuss Q4 results and plan for Q1",
    "location": "https://teams.microsoft.com/l/meetup/..."
  }
}

Example 4 - Update Attendees:
{
  "handler": "updateEventHandler",
  "parameters": {
    "eventId": "event_ghi789",
    "attendees": [
      { "name": "Sarah Johnson", "email": "sarah@company.com" },
      { "name": "Mike Chen", "email": "mike@company.com" },
      { "name": "Jessica Lee", "email": "jessica@company.com" }
    ]
  }
}

Example 5 - Change Multiple Fields:
{
  "handler": "updateEventHandler",
  "parameters": {
    "eventId": "event_jkl012",
    "eventName": "Q4 Planning Session (Extended)",
    "startTime": "2025-12-12T14:00:00Z",
    "endTime": "2025-12-12T16:00:00Z",
    "description": "Extended session to cover all Q4 initiatives",
    "color": "#EF4444",
    "reminders": [
      { "minutes": 30, "method": "notification" },
      { "minutes": 60, "method": "email" }
    ]
  }
}

Example 6 - Convert to All-Day Event:
{
  "handler": "updateEventHandler",
  "parameters": {
    "eventId": "event_mno345",
    "isAllDay": true,
    "startTime": "2025-12-15T00:00:00Z",
    "endTime": "2025-12-15T23:59:59Z"
  }
}

Example 7 - Update Recurrence:
{
  "handler": "updateEventHandler",
  "parameters": {
    "eventId": "event_pqr678",
    "recurrence": {
      "frequency": "weekly",
      "interval": 2,
      "endDate": "2026-06-30"
    }
  }
}

-------------------
IMPORTANT NOTES
-------------------
1. eventId is REQUIRED - cannot update without knowing which event
2. Provide ONLY fields that should change (partial updates supported)
3. ⚠️ CRITICAL: When updating attendees, EVERY attendee MUST have email, phoneNumber, OR contactId - name alone will FAIL
4. If user only provides attendee name, OMIT the attendee and mention in your message
5. When updating attendees array, entire list is replaced (not merged)
6. When updating reminders array, entire list is replaced (not merged)
7. endTime must be after startTime if both are provided
8. All times must be in ISO 8601 format with UTC timezone
9. Updating startTime or endTime will trigger milestone recalculation
10. For "move to tomorrow", "change to 3pm" - convert to actual ISO datetimes
11. Timezone changes affect how event is displayed to users
`;
