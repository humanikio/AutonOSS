# Calendar AI Agent Specification

## Overview
This document outlines the complete calendar system capabilities to enable an AI agent to perform CRUD operations on calendars, events, tasks, and attendees.

---

## Table of Contents
1. [Data Models](#data-models)
2. [Calendar Operations](#calendar-operations)
3. [Event Operations](#event-operations)
4. [Task Operations](#task-operations)
5. [Attendee System](#attendee-system)
6. [API Endpoints](#api-endpoints)

---

## Data Models

### 1. Calendar

#### Structure
```typescript
interface Calendar {
  calendarId: string;           // UUID (auto-generated)
  tenantId: string;             // Required
  name: string;                 // Required
  description?: string;         // Optional
  color?: string;               // Optional (default: '#3B82F6')
  isDefault?: boolean;          // Optional (default: false)
  settings?: {
    timezone?: string;          // IANA timezone (e.g., 'America/New_York')
    workingHours?: {
      start: string;            // e.g., '09:00'
      end: string;              // e.g., '17:00'
    };
  };
  createdAt: Date;              // Auto-generated
  updatedAt: Date;              // Auto-updated
}
```

#### Required Fields (Create)
- `name` ✅

#### Optional Fields (Create)
- `description`
- `color` (defaults to '#3B82F6' if not provided)
- `isDefault` (defaults to false if not provided)
- `settings.timezone`
- `settings.workingHours.start`
- `settings.workingHours.end`

---

### 2. Event

#### Structure
```typescript
interface CalendarEvent {
  eventId: string;              // UUID (auto-generated)
  calendarId: string;           // Required (parent calendar)
  tenantId: string;             // Required
  eventName: string;            // Required
  eventType: EventType;         // Required: 'meeting' | 'call' | 'video' | 'task' | 'reminder' | 'appointment'
  description?: string;         // Optional
  startTime: Date;              // Required
  endTime: Date;                // Required
  location?: string;            // Optional
  attendees?: string[];         // Array of attendee IDs (managed by attendee system)
  primaryAttendeeId?: string | null;    // First attendee added
  primaryContactId?: string | null;     // Contact ID from primary attendee
  color?: string;               // Optional (default: '#3B82F6')
  isAllDay?: boolean;           // Optional (default: false)
  timezone?: string;            // Optional IANA timezone (default: 'America/New_York')
  recurrence?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval: number;           // e.g., 1 = every day, 2 = every 2 days
    endDate?: Date;             // Optional end date for recurrence
  };
  reminders?: {
    minutes: number;            // Minutes before event
    method: 'email' | 'notification' | 'sms';
  }[];
  metadata?: Record<string, any>;   // Optional key-value pairs
  createdAt: Date;              // Auto-generated
  updatedAt: Date;              // Auto-updated
}
```

#### Required Fields (Create)
- `eventName` ✅
- `eventType` ✅ (must be one of: 'meeting', 'call', 'video', 'task', 'reminder', 'appointment')
- `startTime` ✅
- `endTime` ✅

#### Optional Fields (Create)
- `description`
- `location`
- `attendees` (AddAttendeeInput[] - see Attendee System section)
- `color` (defaults to '#3B82F6')
- `isAllDay` (defaults to false)
- `timezone` (defaults to 'America/New_York')
- `recurrence.frequency`
- `recurrence.interval`
- `recurrence.endDate`
- `reminders[]` (array of reminder objects)
- `metadata` (any custom key-value data)

---

### 3. Task

#### Structure
```typescript
interface Task {
  taskId: string;               // UUID (auto-generated)
  calendarId: string;           // Required (parent calendar)
  tenantId: string;             // Required
  taskName: string;             // Required
  description?: string;         // Optional

  // Time flexibility - all optional
  dueDate?: Date;               // Optional due date
  dueTime?: Date;               // Optional specific time (requires dueDate)
  startDate?: Date;             // Optional start date
  estimatedDuration?: number;   // Optional duration in minutes

  // Task-specific fields
  priority: TaskPriority;       // Required: 'low' | 'medium' | 'high' | 'urgent' (default: 'medium')
  status: TaskStatus;           // Required: 'todo' | 'in_progress' | 'completed' | 'cancelled' | 'blocked' (default: 'todo')
  completedAt?: Date;           // Auto-set when status becomes 'completed'

  // Relationships
  assignees?: string[];         // Array of assignee IDs
  primaryAssigneeId?: string | null;    // First assignee (auto-set)
  parentTaskId?: string | null;         // For subtasks
  linkedEventId?: string | null;        // Optional link to related event

  // Organization
  tags?: string[];              // Optional tags for categorization
  checklistItems?: {
    id: string;
    text: string;
    completed: boolean;
  }[];

  // Recurrence (like events)
  recurrence?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval: number;
    endDate?: Date;
  };

  // Reminders
  reminders?: {
    minutes: number;
    method: 'email' | 'notification' | 'sms';
  }[];

  metadata?: Record<string, any>;
  createdAt: Date;              // Auto-generated
  updatedAt: Date;              // Auto-updated
}
```

#### Required Fields (Create)
- `taskName` ✅

#### Optional Fields (Create)
- `description`
- `dueDate`
- `dueTime` (⚠️ **requires `dueDate` to be set**)
- `startDate`
- `estimatedDuration` (in minutes)
- `priority` (defaults to 'medium')
- `status` (defaults to 'todo')
- `assignees` (array of assignee IDs)
- `parentTaskId` (for creating subtasks)
- `linkedEventId` (to link task to an event)
- `tags` (array of strings)
- `checklistItems` (array of checklist items)
- `recurrence.frequency`
- `recurrence.interval`
- `recurrence.endDate`
- `reminders[]`
- `metadata`

#### Special Behaviors
- When `status` is updated to 'completed', `completedAt` is automatically set to current timestamp
- When `assignees` is updated, `primaryAssigneeId` is automatically set to first assignee

---

### 4. Attendee

#### Structure
```typescript
interface Attendee {
  attendeeId: string;           // UUID (auto-generated)
  calendarId: string;           // Required (parent calendar)
  eventId: string;              // Required (parent event)
  tenantId: string;             // Required
  contactId?: string;           // Optional - link to contact record
  email?: string;               // Optional - attendee email
  phone?: string;               // Optional - attendee phone
  name?: string;                // Optional - attendee name
  role: AttendeeRole;           // Required: 'organizer' | 'attendee' | 'optional' (default: 'attendee')
  status: AttendeeStatus;       // Required: 'pending' | 'accepted' | 'declined' | 'tentative' (default: 'pending')
  metadata?: Record<string, any>;
  createdAt: Date;              // Auto-generated
  updatedAt: Date;              // Auto-updated
}
```

#### Required Fields (Create)
At least **ONE** of the following identifiers is **required**:
- `contactId` ⚠️ OR
- `email` ⚠️ OR
- `phone` ⚠️

**Note:** Name alone is NOT sufficient. You must provide at least one unique identifier.

#### Optional Fields (Create)
- `name`
- `role` (defaults to 'attendee')
- `status` (defaults to 'pending')
- `metadata`

#### Attendee Resolution System
When creating attendees:
1. If `contactId` is provided, it's used directly
2. If only `email` or `phone` is provided, the system attempts to:
   - Find an existing contact with that email/phone
   - OR create a new contact record
   - Then link the attendee to that contact via `contactId`

This ensures all attendees are eventually linked to contact records for unified contact management.

---

## Calendar Operations

### Create Calendar
**Operation:** `createCalendar(tenantId, input)`

**Required Parameters:**
- `tenantId`: string
- `input.name`: string

**Optional Parameters:**
- `input.description`: string
- `input.color`: string
- `input.isDefault`: boolean
- `input.settings.timezone`: string
- `input.settings.workingHours.start`: string
- `input.settings.workingHours.end`: string

**Returns:** Calendar object

**Example:**
```typescript
const calendar = await createCalendar('tenant123', {
  name: 'My Calendar',
  description: 'Personal calendar for events',
  color: '#FF5733',
  settings: {
    timezone: 'America/Los_Angeles',
    workingHours: {
      start: '09:00',
      end: '17:00'
    }
  }
});
```

---

### Read Calendar
**Operation:** `readCalendar(tenantId, calendarId)`

**Required Parameters:**
- `tenantId`: string
- `calendarId`: string

**Returns:** Calendar object or null if not found

---

### Get All Calendars
**Operation:** `getCalendars(tenantId)`

**Required Parameters:**
- `tenantId`: string

**Returns:** Array of Calendar objects

---

### Update Calendar
**Operation:** `updateCalendar(tenantId, calendarId, input)`

**Required Parameters:**
- `tenantId`: string
- `calendarId`: string

**Optional Parameters (all optional, updates only what's provided):**
- `input.name`: string
- `input.description`: string
- `input.color`: string
- `input.isDefault`: boolean
- `input.settings.timezone`: string
- `input.settings.workingHours.start`: string
- `input.settings.workingHours.end`: string

**Returns:** Updated Calendar object or null if not found

---

### Delete Calendar
**Operation:** `deleteCalendar(tenantId, calendarId)`

**Required Parameters:**
- `tenantId`: string
- `calendarId`: string

**Returns:** boolean (true if deleted, false if not found)

**⚠️ Warning:** This does NOT cascade delete events/tasks. Events and tasks in this calendar will remain in the database but may become orphaned.

---

## Event Operations

### Create Event
**Operation:** `createEvent(tenantId, calendarId, input)`

**Required Parameters:**
- `tenantId`: string
- `calendarId`: string
- `input.eventName`: string
- `input.eventType`: 'meeting' | 'call' | 'video' | 'task' | 'reminder' | 'appointment'
- `input.startTime`: Date
- `input.endTime`: Date

**Optional Parameters:**
- `input.description`: string
- `input.location`: string
- `input.attendees`: AddAttendeeInput[] (see Attendee System)
- `input.color`: string (default: '#3B82F6')
- `input.isAllDay`: boolean (default: false)
- `input.timezone`: string (default: 'America/New_York')
- `input.recurrence.frequency`: 'daily' | 'weekly' | 'monthly' | 'yearly'
- `input.recurrence.interval`: number
- `input.recurrence.endDate`: Date
- `input.reminders`: Array of {minutes: number, method: 'email' | 'notification' | 'sms'}
- `input.metadata`: Record<string, any>

**Returns:** CalendarEvent object

**Special Behavior:**
- If attendees are provided, they are automatically created and linked
- The first attendee becomes the `primaryAttendeeId`
- If the primary attendee has a `contactId`, it becomes `primaryContactId`
- Triggers 'event_created' milestone notification
- Initializes future milestone system for event lifecycle management

**Example:**
```typescript
const event = await createEvent('tenant123', 'calendar456', {
  eventName: 'Team Meeting',
  eventType: 'meeting',
  description: 'Weekly team sync',
  startTime: new Date('2025-01-15T10:00:00'),
  endTime: new Date('2025-01-15T11:00:00'),
  location: 'Conference Room A',
  timezone: 'America/New_York',
  attendees: [
    { email: 'john@example.com', name: 'John Doe', role: 'organizer' },
    { email: 'jane@example.com', name: 'Jane Smith' }
  ],
  reminders: [
    { minutes: 15, method: 'email' },
    { minutes: 5, method: 'notification' }
  ]
});
```

---

### Read Event
**Operation:** `readEvent(tenantId, calendarId, eventId)`

**Required Parameters:**
- `tenantId`: string
- `calendarId`: string
- `eventId`: string

**Returns:** CalendarEvent object or null if not found

---

### Get All Events
**Operation:** `getEvents(tenantId, calendarId)`

**Required Parameters:**
- `tenantId`: string
- `calendarId`: string

**Returns:** Array of CalendarEvent objects (ordered by startTime ascending)

---

### Update Event
**Operation:** `updateEvent(tenantId, calendarId, eventId, input)`

**Required Parameters:**
- `tenantId`: string
- `calendarId`: string
- `eventId`: string

**Optional Parameters (all optional, updates only what's provided):**
- `input.eventName`: string
- `input.eventType`: EventType
- `input.description`: string
- `input.startTime`: Date
- `input.endTime`: Date
- `input.location`: string
- `input.attendees`: AddAttendeeInput[] (see Attendee Sync below)
- `input.color`: string
- `input.isAllDay`: boolean
- `input.timezone`: string
- `input.recurrence`: Recurrence object
- `input.reminders`: Reminder array
- `input.metadata`: Record<string, any>

**Returns:** Updated CalendarEvent object or null if not found

**Attendee Sync Behavior:**
- If `attendees` is **not** provided in update → existing attendees remain unchanged
- If `attendees` **is** provided → smart sync occurs:
  - New attendees (not in current list) → **created**
  - Existing attendees with changes → **updated**
  - Attendees missing from new list → **deleted**
- Comparison is done by `contactId` first, then `email`, then `phone`

**Example:**
```typescript
// Update event details without affecting attendees
await updateEvent('tenant123', 'calendar456', 'event789', {
  eventName: 'Updated Team Meeting',
  location: 'Virtual - Zoom'
});

// Update event and replace attendees
await updateEvent('tenant123', 'calendar456', 'event789', {
  startTime: new Date('2025-01-15T14:00:00'),
  attendees: [
    { email: 'john@example.com', name: 'John Doe' },
    { email: 'bob@example.com', name: 'Bob Johnson' } // New attendee
    // Jane will be removed
  ]
});
```

---

### Delete Event
**Operation:** `deleteEvent(tenantId, calendarId, eventId)`

**Required Parameters:**
- `tenantId`: string
- `calendarId`: string
- `eventId`: string

**Returns:** boolean (true if deleted, false if not found)

**Cascade Behavior:**
✅ Automatically deletes all attendees associated with this event

---

## Task Operations

### Create Task
**Operation:** `createTask(tenantId, calendarId, input)`

**Required Parameters:**
- `tenantId`: string
- `calendarId`: string
- `input.taskName`: string

**Optional Parameters:**
- `input.description`: string
- `input.dueDate`: Date
- `input.dueTime`: Date (⚠️ requires `dueDate`)
- `input.startDate`: Date
- `input.estimatedDuration`: number (minutes)
- `input.priority`: 'low' | 'medium' | 'high' | 'urgent' (default: 'medium')
- `input.status`: 'todo' | 'in_progress' | 'completed' | 'cancelled' | 'blocked' (default: 'todo')
- `input.assignees`: string[] (array of assignee IDs)
- `input.parentTaskId`: string (for subtasks)
- `input.linkedEventId`: string (to link to an event)
- `input.tags`: string[]
- `input.checklistItems`: Array of {id, text, completed}
- `input.recurrence`: Recurrence object
- `input.reminders`: Reminder array
- `input.metadata`: Record<string, any>

**Returns:** Task object

**Validation:**
- If `dueTime` is provided, `dueDate` **must** also be provided (throws error otherwise)

**Example:**
```typescript
const task = await createTask('tenant123', 'calendar456', {
  taskName: 'Prepare presentation',
  description: 'Create slides for Q1 review',
  dueDate: new Date('2025-01-20'),
  dueTime: new Date('2025-01-20T17:00:00'),
  priority: 'high',
  status: 'todo',
  tags: ['presentation', 'q1-review'],
  checklistItems: [
    { id: '1', text: 'Gather data', completed: false },
    { id: '2', text: 'Create slides', completed: false },
    { id: '3', text: 'Practice delivery', completed: false }
  ],
  estimatedDuration: 120, // 2 hours
  reminders: [
    { minutes: 1440, method: 'email' } // 1 day before
  ]
});
```

---

### Read Task
**Operation:** `readTask(tenantId, calendarId, taskId)`

**Required Parameters:**
- `tenantId`: string
- `calendarId`: string
- `taskId`: string

**Returns:** Task object or null if not found

---

### Get All Tasks
**Operation:** `getTasks(tenantId, calendarId)`

**Required Parameters:**
- `tenantId`: string
- `calendarId`: string

**Returns:** Array of Task objects

---

### Update Task
**Operation:** `updateTask(tenantId, calendarId, taskId, input)`

**Required Parameters:**
- `tenantId`: string
- `calendarId`: string
- `taskId`: string

**Optional Parameters (all optional, updates only what's provided):**
- `input.taskName`: string
- `input.description`: string
- `input.dueDate`: Date
- `input.dueTime`: Date (⚠️ requires `dueDate`)
- `input.startDate`: Date
- `input.estimatedDuration`: number
- `input.priority`: TaskPriority
- `input.status`: TaskStatus
- `input.assignees`: string[]
- `input.parentTaskId`: string
- `input.linkedEventId`: string
- `input.tags`: string[]
- `input.checklistItems`: ChecklistItem[]
- `input.recurrence`: Recurrence object
- `input.reminders`: Reminder array
- `input.metadata`: Record<string, any>

**Returns:** Updated Task object or null if not found

**Special Behaviors:**
- If `status` is changed to 'completed' → `completedAt` is automatically set to current time
- If `assignees` is updated → `primaryAssigneeId` is automatically set to first assignee
- Validation: If `dueTime` is provided, `dueDate` must also be provided

**Example:**
```typescript
// Mark task as completed
await updateTask('tenant123', 'calendar456', 'task789', {
  status: 'completed' // completedAt will be auto-set
});

// Update checklist items
await updateTask('tenant123', 'calendar456', 'task789', {
  checklistItems: [
    { id: '1', text: 'Gather data', completed: true },
    { id: '2', text: 'Create slides', completed: true },
    { id: '3', text: 'Practice delivery', completed: false }
  ]
});
```

---

### Delete Task
**Operation:** `deleteTask(tenantId, calendarId, taskId)`

**Required Parameters:**
- `tenantId`: string
- `calendarId`: string
- `taskId`: string

**Returns:** boolean (true if deleted, false if not found)

**Note:** Does not cascade delete subtasks or linked events. Those relationships will be broken.

---

## Attendee System

### Overview
The attendee system manages people associated with calendar events. Attendees are stored as subcollections under events and can be linked to contact records for unified contact management.

### Attendee Lifecycle

#### 1. Adding Attendees to Event

**During Event Creation:**
- Attendees can be provided in the `createEvent` input
- System validates each attendee has at least one identifier (contactId, email, or phone)
- System resolves attendees to contacts (finds existing or creates new)
- Attendees are created and linked to the event
- First attendee becomes the `primaryAttendeeId` on the event
- If primary attendee has a `contactId`, it becomes `primaryContactId` on the event

**After Event Creation:**
Use `addAttendees` to add more attendees to an existing event.

---

### Add Attendees
**Operation:** `addAttendees(tenantId, calendarId, eventId, attendeesInput)`

**Required Parameters:**
- `tenantId`: string
- `calendarId`: string
- `eventId`: string
- `attendeesInput`: AddAttendeeInput[]

**AddAttendeeInput Structure:**
Each attendee must have at least ONE of:
- `contactId`: string ⚠️ OR
- `email`: string ⚠️ OR
- `phone`: string ⚠️

Optional fields:
- `name`: string
- `role`: 'organizer' | 'attendee' | 'optional' (default: 'attendee')
- `status`: 'pending' | 'accepted' | 'declined' | 'tentative' (default: 'pending')
- `metadata`: Record<string, any>

**Returns:** Array of created Attendee objects

**Example:**
```typescript
const attendees = await addAttendees('tenant123', 'calendar456', 'event789', [
  {
    email: 'alice@example.com',
    name: 'Alice Brown',
    role: 'attendee',
    status: 'accepted'
  },
  {
    contactId: 'contact123', // Existing contact
    role: 'optional'
  },
  {
    phone: '+1234567890',
    name: 'Bob Wilson'
  }
]);
```

---

### Get Attendees
**Operation:** `getAttendees(tenantId, calendarId, eventId)`

**Required Parameters:**
- `tenantId`: string
- `calendarId`: string
- `eventId`: string

**Returns:** Array of Attendee objects (ordered by createdAt)

---

### Get Single Attendee
**Operation:** `getAttendee(tenantId, calendarId, eventId, attendeeId)`

**Required Parameters:**
- `tenantId`: string
- `calendarId`: string
- `eventId`: string
- `attendeeId`: string

**Returns:** Attendee object or null if not found

---

### Update Attendee
**Operation:** `updateAttendee(tenantId, calendarId, eventId, attendeeId, input)`

**Required Parameters:**
- `tenantId`: string
- `calendarId`: string
- `eventId`: string
- `attendeeId`: string

**Optional Parameters (all optional):**
- `input.name`: string
- `input.email`: string
- `input.phone`: string
- `input.role`: AttendeeRole
- `input.status`: AttendeeStatus
- `input.metadata`: Record<string, any>

**Returns:** Updated Attendee object or null if not found

**Example:**
```typescript
// Update attendee status
await updateAttendee('tenant123', 'calendar456', 'event789', 'attendee123', {
  status: 'accepted'
});
```

---

### Remove Attendee
**Operation:** `removeAttendee(tenantId, calendarId, eventId, attendeeId)`

**Required Parameters:**
- `tenantId`: string
- `calendarId`: string
- `eventId`: string
- `attendeeId`: string

**Returns:** boolean (true if deleted, false if not found)

---

### Attendee Orchestrator

The system includes an `attendeeOrchestrator` utility that provides high-level attendee management:

#### `resolveAttendeeContacts(tenantId, attendeesInput)`
- For each attendee without a `contactId`, attempts to find or create a contact
- Returns attendees with resolved `contactId` values

#### `createEventAttendees(tenantId, calendarId, eventId, attendeesInput)`
- Validates attendees
- Resolves contacts
- Creates all attendees
- Returns array of created attendee IDs

#### `syncEventAttendees(tenantId, calendarId, eventId, newAttendeesData)`
- Intelligently syncs attendees during event updates
- Compares new attendees list with current attendees
- Creates new attendees
- Updates existing attendees that have changes
- Deletes attendees not in the new list
- Returns final array of attendee IDs

#### `deleteAllEventAttendees(tenantId, calendarId, eventId)`
- Cascade deletes all attendees for an event
- Used during event deletion
- Returns count of deleted attendees

#### `validateAttendees(attendeesInput)`
- Validates that each attendee has at least one identifier
- Throws error if validation fails

---

### Primary Attendee Concept

**Events have two special fields related to attendees:**

1. **`primaryAttendeeId`**: The ID of the first attendee added to the event
   - Set automatically during event creation
   - Used for triggering notifications and workflows

2. **`primaryContactId`**: The `contactId` of the primary attendee
   - Set automatically if the primary attendee has a linked contact
   - Used for merge fields in email templates and communications
   - May be null if primary attendee doesn't have a contact record

These fields enable the system to identify a "main" contact for the event, useful for:
- Sending primary notifications
- Using merge fields in email templates
- Workflow triggers based on specific contacts

---

## API Endpoints

All routes accept **EITHER** Firebase JWT **OR** API Key authentication.

### Calendar Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/calendars` | Create new calendar |
| GET | `/api/calendars` | Get all calendars for tenant |
| GET | `/api/calendars/:id` | Get single calendar |
| PUT | `/api/calendars/:id` | Update calendar |
| DELETE | `/api/calendars/:id` | Delete calendar |

---

### Event Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/calendars/:calendarId/events` | Create new event |
| GET | `/api/calendars/:calendarId/events` | Get all events for calendar |
| GET | `/api/calendars/:calendarId/events/:eventId` | Get single event |
| PUT | `/api/calendars/:calendarId/events/:eventId` | Update event |
| DELETE | `/api/calendars/:calendarId/events/:eventId` | Delete event |

---

### Attendee Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/calendars/:calendarId/events/:eventId/attendees` | Add attendees to event |
| GET | `/api/calendars/:calendarId/events/:eventId/attendees` | Get all attendees for event |
| GET | `/api/calendars/:calendarId/events/:eventId/attendees/:attendeeId` | Get single attendee |
| PATCH | `/api/calendars/:calendarId/events/:eventId/attendees/:attendeeId` | Update attendee |
| DELETE | `/api/calendars/:calendarId/events/:eventId/attendees/:attendeeId` | Remove attendee |

---

### Task Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/calendars/:calendarId/tasks` | Create new task |
| GET | `/api/calendars/:calendarId/tasks` | Get all tasks for calendar |
| GET | `/api/calendars/:calendarId/tasks/:taskId` | Get single task |
| PUT | `/api/calendars/:calendarId/tasks/:taskId` | Update task |
| DELETE | `/api/calendars/:calendarId/tasks/:taskId` | Delete task |

---

## AI Agent Implementation Guidelines

### 1. Reading Data
- Use `getCalendars()`, `getEvents()`, `getTasks()` to fetch lists
- Use `readCalendar()`, `readEvent()`, `readTask()` for specific items
- Use `getAttendees()` to fetch attendees for an event

### 2. Creating Items
- **Always** provide required fields (see Required Fields sections)
- Optional fields can be omitted, system will apply defaults
- For events with attendees, provide attendees during creation for automatic linking
- Validate `dueTime` requires `dueDate` for tasks

### 3. Updating Items
- Only include fields that need to be changed
- For events: omit `attendees` field to keep existing attendees unchanged
- For events: include `attendees` field to trigger smart sync (add/update/delete)
- For tasks: changing status to 'completed' auto-sets `completedAt`

### 4. Deleting Items
- Event deletion cascades to attendees ✅
- Calendar deletion does NOT cascade to events/tasks ⚠️
- Task deletion does NOT cascade to subtasks or linked events ⚠️

### 5. Attendee Management
- Each attendee must have at least ONE identifier (contactId, email, or phone)
- System automatically resolves attendees to contacts
- Use attendee orchestrator for complex operations
- Primary attendee is automatically tracked for notifications

### 6. Error Handling
- Check for null returns (item not found)
- Validate required fields before calling operations
- Handle cascade delete behaviors appropriately

### 7. Date/Time Handling
- All dates are stored as Date objects
- Firestore timestamps are converted to Date objects on read
- Use IANA timezone strings (e.g., 'America/New_York')
- Default timezone is 'America/New_York' if not specified

---

## Firestore Collection Structure

```
tenants/
  {tenantId}/
    calendars/
      autonCalendar/
        activeCalendars/
          {calendarId}/           # Calendar document
            events/
              {eventId}/          # Event document
                attendees/
                  {attendeeId}/   # Attendee document
            tasks/
              {taskId}/           # Task document
```

---

## Summary for AI Agent

### What Can Be Done?

#### ✅ **CRUD Operations Supported:**
- **Calendars:** Create, Read, Update, Delete
- **Events:** Create, Read, Update, Delete (with attendee cascade)
- **Tasks:** Create, Read, Update, Delete
- **Attendees:** Create (Add), Read, Update, Delete

#### 🔄 **Smart Features:**
- Attendee-to-contact resolution
- Intelligent attendee sync on event updates
- Automatic primary attendee/contact tracking
- Cascade delete for event attendees
- Auto-set completedAt for completed tasks
- Auto-set primaryAssigneeId for tasks

#### ⚠️ **Limitations/Warnings:**
- Calendar deletion does NOT cascade delete events/tasks
- Task deletion does NOT cascade delete subtasks
- Tasks with dueTime must have dueDate
- Attendees must have at least one identifier (contactId, email, or phone)

---

## Next Steps for AI Agent Development

1. **Read Operations:** Implement functions to query calendars, events, tasks, and attendees
2. **Create Operations:** Implement creation with proper validation of required fields
3. **Update Operations:** Implement partial updates with smart attendee sync for events
4. **Delete Operations:** Implement deletions with awareness of cascade behaviors
5. **Error Handling:** Handle null returns, validation errors, and cascade warnings
6. **Natural Language Processing:** Parse user requests into proper operation calls
7. **Context Awareness:** Track current calendar/event context for easier operations

---

**Document Version:** 1.0
**Last Updated:** 2025-01-04
**Maintained By:** Pulseline Engineering Team
