/**
 * Create Event Handler - Detailed Context
 * Loaded in Stage 2 (generateHandlerJsons) when createEventHandler is needed
 */

export const CREATE_EVENT_CONTEXT = `
==============================================
CREATE EVENT HANDLER - DETAILED SPECIFICATION
==============================================

Handler Name: createEventHandler

Purpose: Create new calendar events

-------------------
REQUIRED FIELDS
-------------------
- eventName: string
  - The name/title of the event
  - Must be clear and descriptive
  - PRESERVE the user's exact wording when possible
  - DO NOT use generic names like "Event at 3pm", "Meeting", "New Event"
  - Example: "Team standup", "Coffee with Sarah", "Q4 planning session"

- eventType: "meeting" | "call" | "video" | "task" | "reminder" | "appointment"
  - The type of event
  - meeting: In-person meeting
  - call: Phone call
  - video: Video conference (Zoom, Teams, etc.)
  - task: Task-based event
  - reminder: Reminder/notification
  - appointment: Appointment (doctor, dentist, etc.)

- startTime: ISO 8601 datetime string (YYYY-MM-DDTHH:MM:SSZ)
  - When the event starts
  - Must be in UTC timezone
  - Example: "2025-12-06T15:00:00Z" (3pm UTC)

- endTime: ISO 8601 datetime string (YYYY-MM-DDTHH:MM:SSZ)
  - When the event ends
  - Must be after startTime
  - Must be in UTC timezone
  - Example: "2025-12-06T16:00:00Z" (4pm UTC)

-------------------
OPTIONAL FIELDS
-------------------

Description:
- description: string
  - Additional details about the event
  - Can include agenda, notes, meeting objectives
  - Make this meaningful and specific to the user's request
  - DO NOT use generic descriptions like "Meeting", "Event", "Call"
  - Example: "Discuss Q4 goals and upcoming product launches"

Location:
- location: string
  - Where the event takes place
  - Can be physical address, room name, or video link
  - Example: "Conference Room A", "https://zoom.us/j/123456", "123 Main St"

Attendees:
- attendees: Array<AttendeeObject>
  - People invited to the event
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
  - Hex color code for event display
  - Default: "#3B82F6" (blue)
  - Example: "#10B981" (green), "#EF4444" (red)

- isAllDay: boolean
  - Whether event spans entire day(s)
  - Default: false
  - If true, time portion of startTime/endTime is ignored
  - Example: true

Timezone:
- timezone: string
  - IANA timezone identifier
  - Default: "America/New_York"
  - Example: "America/Los_Angeles", "Europe/London", "Asia/Tokyo"

Recurrence:
- recurrence: { frequency: string, interval: number, endDate?: string }
  - For repeating events
  - frequency: "daily" | "weekly" | "monthly" | "yearly"
  - interval: how often (1 = every, 2 = every other, etc.)
  - endDate: ISO 8601 date when recurrence stops (optional)
  - Example: { "frequency": "weekly", "interval": 1, "endDate": "2025-12-31" }

Reminders:
- reminders: Array<{ minutes: number, method: string }>
  - Alerts before event starts
  - minutes: how many minutes before event
  - method: "email" | "notification" | "sms"
  - Example: [
      { "minutes": 15, "method": "notification" },
      { "minutes": 60, "method": "email" }
    ]

Metadata:
- metadata: object
  - Additional custom data
  - Can store any JSON-serializable data
  - Example: { "conferenceLink": "https://zoom.us/j/123", "meetingId": "ABC123" }

-------------------
EXAMPLES
-------------------

Example 1 - Simple Meeting:
{
  "handler": "createEventHandler",
  "parameters": {
    "eventName": "Team standup",
    "eventType": "meeting",
    "startTime": "2025-12-06T10:00:00Z",
    "endTime": "2025-12-06T10:30:00Z",
    "location": "Conference Room B"
  }
}

Example 2 - Video Call with Attendees:
{
  "handler": "createEventHandler",
  "parameters": {
    "eventName": "Q4 Planning Session",
    "eventType": "video",
    "description": "Review Q4 goals and plan upcoming initiatives",
    "startTime": "2025-12-10T15:00:00Z",
    "endTime": "2025-12-10T16:00:00Z",
    "location": "https://zoom.us/j/123456789",
    "attendees": [
      { "name": "Sarah Johnson", "email": "sarah@company.com" },
      { "name": "Mike Chen", "email": "mike@company.com" }
    ],
    "reminders": [
      { "minutes": 15, "method": "notification" }
    ]
  }
}

Example 3 - All-Day Event:
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

Example 4 - Recurring Weekly Meeting:
{
  "handler": "createEventHandler",
  "parameters": {
    "eventName": "Weekly Team Sync",
    "eventType": "meeting",
    "description": "Weekly check-in with the team",
    "startTime": "2025-12-06T14:00:00Z",
    "endTime": "2025-12-06T15:00:00Z",
    "location": "Conference Room A",
    "recurrence": {
      "frequency": "weekly",
      "interval": 1,
      "endDate": "2026-06-30"
    },
    "reminders": [
      { "minutes": 10, "method": "notification" }
    ]
  }
}

Example 5 - Appointment with Contact:
{
  "handler": "createEventHandler",
  "parameters": {
    "eventName": "Dentist Appointment",
    "eventType": "appointment",
    "description": "Regular checkup and cleaning",
    "startTime": "2025-12-08T09:00:00Z",
    "endTime": "2025-12-08T10:00:00Z",
    "location": "123 Medical Plaza, Suite 200",
    "attendees": [
      { "contactId": "contact_dentist_123" }
    ],
    "reminders": [
      { "minutes": 1440, "method": "email" },
      { "minutes": 60, "method": "notification" }
    ],
    "color": "#8B5CF6"
  }
}

-------------------
IMPORTANT NOTES
-------------------
1. Always use ISO 8601 format for datetimes: "YYYY-MM-DDTHH:MM:SSZ"
2. All times must be in UTC timezone
3. endTime must be after startTime
4. For "today at 3pm", "tomorrow at 2pm" - convert to actual ISO datetimes in UTC
5. eventType is required - choose the most appropriate type
6. Default color is "#3B82F6" (blue) if not specified
7. Default timezone is "America/New_York" if not specified
8. ⚠️ CRITICAL: Attendees MUST have email, phoneNumber, OR contactId - name alone will FAIL
9. If user only provides attendee name, OMIT the attendee and mention in your message
10. For recurring events, frequency and interval are required
11. Reminder minutes are relative to startTime (e.g., 60 = 1 hour before)
`;
