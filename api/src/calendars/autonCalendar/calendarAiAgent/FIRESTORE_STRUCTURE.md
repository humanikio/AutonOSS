# AutonCalendar Firestore Structure

## Current Data Storage Architecture

### Complete Firestore Hierarchy

```
tenants/
  {tenantId}/                                    # Tenant root (workspace)
    calendars/
      autonCalendar/                             # AutonCalendar system root

        activeCalendars/                         # Collection of calendars
          {calendarId}/                          # Individual calendar document

            ├── events/                          # Events collection
            │   {eventId}/                       # Individual event document
            │     ├── attendees/                 # Attendees subcollection
            │     │   {attendeeId}/              # Individual attendee document
            │     │
            │     └── milestones/                # Milestones subcollection
            │         {milestoneId}/             # Individual milestone document
            │
            └── tasks/                           # Tasks collection
                {taskId}/                        # Individual task document
```

---

## Detailed Collection Breakdown

### 1. **Tenant Level**
**Path:** `tenants/{tenantId}`

- **tenantId**: Unique identifier for the workspace/organization
- **Purpose**: Root level for all tenant-scoped data
- **Access Pattern**: All queries start with tenantId for multi-tenancy isolation

---

### 2. **Calendar System Root**
**Path:** `tenants/{tenantId}/calendars/autonCalendar`

- **Fixed Document ID**: `autonCalendar` (hardcoded across the system)
- **Purpose**: Namespace for the AutonCalendar system
- **Note**: This is a **document**, not a collection
- **Why?**: Allows for future expansion (other calendar systems could exist alongside)

---

### 3. **Active Calendars**
**Path:** `tenants/{tenantId}/calendars/autonCalendar/activeCalendars`

**Collection:** Stores all calendar instances for a tenant

**Document Structure:**
```typescript
{
  calendarId: string;           // UUID
  tenantId: string;
  name: string;                 // "Work Calendar", "Personal", etc.
  description?: string;
  color?: string;               // Hex color
  isDefault?: boolean;
  settings?: {
    timezone?: string;          // IANA timezone
    workingHours?: {
      start: string;            // "09:00"
      end: string;              // "17:00"
    };
  };
  createdAt: Date;
  updatedAt: Date;
}
```

**Access Pattern:**
```typescript
firestore
  .collection('tenants')
  .doc(tenantId)
  .collection('calendars')
  .doc('autonCalendar')
  .collection('activeCalendars')
  .doc(calendarId)
```

---

### 4. **Events**
**Path:** `tenants/{tenantId}/calendars/autonCalendar/activeCalendars/{calendarId}/events`

**Collection:** Stores all events within a calendar

**Document Structure:**
```typescript
{
  eventId: string;              // UUID
  calendarId: string;
  tenantId: string;
  eventName: string;
  eventType: 'meeting' | 'call' | 'video' | 'task' | 'reminder' | 'appointment';
  description?: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  attendees?: string[];         // Array of attendee IDs
  primaryAttendeeId?: string | null;
  primaryContactId?: string | null;
  color?: string;
  isAllDay?: boolean;
  timezone?: string;
  recurrence?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval: number;
    endDate?: Date;
  };
  reminders?: {
    minutes: number;
    method: 'email' | 'notification' | 'sms';
  }[];
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}
```

**Access Pattern:**
```typescript
firestore
  .collection('tenants')
  .doc(tenantId)
  .collection('calendars')
  .doc('autonCalendar')
  .collection('activeCalendars')
  .doc(calendarId)
  .collection('events')
  .doc(eventId)
```

**Indexed Queries:**
- `orderBy('startTime', 'asc')` - Get events in chronological order

---

### 5. **Attendees**
**Path:** `tenants/{tenantId}/calendars/autonCalendar/activeCalendars/{calendarId}/events/{eventId}/attendees`

**Subcollection:** Stores all attendees for a specific event

**Document Structure:**
```typescript
{
  attendeeId: string;           // UUID
  calendarId: string;
  eventId: string;
  tenantId: string;
  contactId?: string;           // Link to contact record
  email?: string;
  phone?: string;
  name?: string;
  role: 'organizer' | 'attendee' | 'optional';
  status: 'pending' | 'accepted' | 'declined' | 'tentative';
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}
```

**Access Pattern:**
```typescript
firestore
  .collection('tenants')
  .doc(tenantId)
  .collection('calendars')
  .doc('autonCalendar')
  .collection('activeCalendars')
  .doc(calendarId)
  .collection('events')
  .doc(eventId)
  .collection('attendees')
  .doc(attendeeId)
```

**Indexed Queries:**
- `orderBy('createdAt', 'asc')` - Get attendees in order added

---

### 6. **Milestones**
**Path:** `tenants/{tenantId}/calendars/autonCalendar/activeCalendars/{calendarId}/events/{eventId}/milestones`

**Subcollection:** Stores lifecycle milestones for event automation/notifications

**Document Structure:**
```typescript
{
  milestoneId: string;          // UUID
  eventId: string;
  calendarId: string;
  tenantId: string;
  type: '5_days_before' | '4_days_before' | '3_days_before' | '2_days_before' |
        '1_day_before' | '6_hours_before' | '2_hours_before' | '1_hour_before' |
        '30_minutes_before' | '10_minutes_before' | '1_minute_before' | 'event_completed';
  scheduledExecutionTime: Date;  // When this milestone should fire
  status: 'pending' | 'scheduled' | 'completed' | 'failed' | 'cancelled';
  n8nExecutionId?: string;       // Workflow execution ID
  n8nWebhookUrl?: string;
  isValid: boolean;              // False if event was cancelled/modified
  createdAt: Date;
  updatedAt: Date;
  executedAt?: Date;
}
```

**Access Pattern:**
```typescript
firestore
  .collection('tenants')
  .doc(tenantId)
  .collection('calendars')
  .doc('autonCalendar')
  .collection('activeCalendars')
  .doc(calendarId)
  .collection('events')
  .doc(eventId)
  .collection('milestones')
  .doc(milestoneId)
```

**Purpose:**
- Event lifecycle automation
- Trigger workflows at specific times before/after events
- Integrates with n8n workflow system
- Supports notification scheduling

---

### 7. **Tasks**
**Path:** `tenants/{tenantId}/calendars/autonCalendar/activeCalendars/{calendarId}/tasks`

**Collection:** Stores all tasks within a calendar

**Document Structure:**
```typescript
{
  taskId: string;               // UUID
  calendarId: string;
  tenantId: string;
  taskName: string;
  description?: string;
  dueDate?: Date;
  dueTime?: Date;
  startDate?: Date;
  estimatedDuration?: number;   // Minutes
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'todo' | 'in_progress' | 'completed' | 'cancelled' | 'blocked';
  completedAt?: Date;
  assignees?: string[];
  primaryAssigneeId?: string | null;
  parentTaskId?: string | null; // For subtasks
  linkedEventId?: string | null;
  tags?: string[];
  checklistItems?: {
    id: string;
    text: string;
    completed: boolean;
  }[];
  recurrence?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval: number;
    endDate?: Date;
  };
  reminders?: {
    minutes: number;
    method: 'email' | 'notification' | 'sms';
  }[];
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}
```

**Access Pattern:**
```typescript
firestore
  .collection('tenants')
  .doc(tenantId)
  .collection('calendars')
  .doc('autonCalendar')
  .collection('activeCalendars')
  .doc(calendarId)
  .collection('tasks')
  .doc(taskId)
```

**Note:** Tasks are at the **calendar level**, not event level. No subcollections.

---

## ✅ IMPLEMENTED: AI Agent Chat System Structure

### Workspace-Wide Chat Storage

Since the AI agent is **workspace-wide** (tenant-scoped) and works across all calendars, the chat data is stored at the **autonCalendar/aiAgent/main document level**.

### Final Chat Structure (IMPLEMENTED)

```
tenants/
  {tenantId}/
    calendars/
      autonCalendar/

        ├── activeCalendars/         # Existing calendar data
        │   └── ...
        │
        └── aiAgent/                 # 🆕 AI Agent namespace
            main/                    # 🆕 Main state document (single source of truth)
              ├── (fields)           # currentChatId, currentCycleId, settings, stats
              │
              ├── chats/             # Chat sessions subcollection
              │   {chatId}/
              │     └── messages/    # Messages subcollection
              │         {messageId}/
              │
              └── cycles/            # Execution cycles subcollection
                  {cycleId}/
```

**Key Design Decision:** All state is nested under `aiAgent/main` (a single document) for cleanliness and atomic state updates.

---

## Detailed AI Agent Structure

### 1. **AI Agent Chats Collection**
**Path:** `tenants/{tenantId}/calendars/autonCalendar/aiAgentChats`

**Purpose:** Store chat sessions for the calendar AI agent

**Document Structure (Chat):**
```typescript
interface Chat {
  chatId: string;               // UUID
  tenantId: string;
  name?: string;                // "Event Planning - Jan 2025"
  createdAt: Date;
  updatedAt: Date;
  lastMessageAt?: Date;
  isActive: boolean;            // True if currently selected
  metadata?: {
    eventCount?: number;        // Events created in this chat
    taskCount?: number;         // Tasks created in this chat
    totalMessages?: number;
  };
}
```

**Access Pattern:**
```typescript
firestore
  .collection('tenants')
  .doc(tenantId)
  .collection('calendars')
  .doc('autonCalendar')
  .collection('aiAgentChats')
  .doc(chatId)
```

---

### 2. **Messages Subcollection**
**Path:** `tenants/{tenantId}/calendars/autonCalendar/aiAgentChats/{chatId}/messages`

**Purpose:** Store conversation messages within a chat

**Document Structure (Message):**
```typescript
interface Message {
  messageId: string;            // UUID
  chatId: string;
  tenantId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;              // Message text
  createdAt: Date;

  // Optional context
  calendarId?: string;          // If action was scoped to a calendar
  eventId?: string;             // If message relates to an event
  taskId?: string;              // If message relates to a task

  // Agent execution metadata
  cycleId?: string;             // Link to execution cycle if applicable
  toolCalls?: {                 // Tools the agent used
    tool: string;
    params: Record<string, any>;
    result?: any;
  }[];

  metadata?: Record<string, any>;
}
```

**Access Pattern:**
```typescript
firestore
  .collection('tenants')
  .doc(tenantId)
  .collection('calendars')
  .doc('autonCalendar')
  .collection('aiAgentChats')
  .doc(chatId)
  .collection('messages')
  .doc(messageId)
```

**Indexed Queries:**
- `orderBy('createdAt', 'asc')` - Get messages in chronological order

---

### 3. **Cycles Subcollection**
**Path:** `tenants/{tenantId}/calendars/autonCalendar/aiAgentChats/{chatId}/cycles`

**Purpose:** Track agent planning/execution cycles (think/plan/act loops)

**Document Structure (Cycle):**
```typescript
interface Cycle {
  cycleId: string;              // UUID
  chatId: string;
  tenantId: string;
  type: 'plan' | 'execute' | 'review';

  // Input
  userPrompt: string;           // Original user request

  // Planning phase
  plan?: {
    steps: string[];            // Planned actions
    reasoning: string;          // Why this plan
    tools: string[];            // Tools to use
  };

  // Execution phase
  execution?: {
    actions: {
      action: string;
      status: 'pending' | 'completed' | 'failed';
      result?: any;
      error?: string;
    }[];
    createdEvents?: string[];   // Event IDs created
    createdTasks?: string[];    // Task IDs created
    updatedEvents?: string[];   // Event IDs updated
    updatedTasks?: string[];    // Task IDs updated
  };

  // Status
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  startedAt: Date;
  completedAt?: Date;
  error?: string;

  metadata?: Record<string, any>;
}
```

**Access Pattern:**
```typescript
firestore
  .collection('tenants')
  .doc(tenantId)
  .collection('calendars')
  .doc('autonCalendar')
  .collection('aiAgentChats')
  .doc(chatId)
  .collection('cycles')
  .doc(cycleId)
```

---

### 4. **AI Agent State Document (Singleton)**
**Path:** `tenants/{tenantId}/calendars/autonCalendar/aiAgentState`

**Purpose:** Store current agent state for the tenant (single document)

**Document Structure:**
```typescript
interface AIAgentState {
  currentChatId: string | null; // Currently active chat
  lastActiveAt: Date;
  totalChats: number;
  totalMessages: number;
  settings?: {
    defaultCalendarId?: string;
    timezone?: string;
    preferences?: Record<string, any>;
  };
}
```

**Access Pattern:**
```typescript
firestore
  .collection('tenants')
  .doc(tenantId)
  .collection('calendars')
  .doc('autonCalendar')
  .doc('aiAgentState')
```

**Note:** This is a **single document** (not a collection), serving as a singleton state holder.

---

## Complete Firestore Path Reference

### Data Hierarchy Summary

| Data Type | Level | Path |
|-----------|-------|------|
| **Calendar** | Calendar | `tenants/{tenantId}/calendars/autonCalendar/activeCalendars/{calendarId}` |
| **Event** | Event | `...activeCalendars/{calendarId}/events/{eventId}` |
| **Attendee** | Attendee | `...events/{eventId}/attendees/{attendeeId}` |
| **Milestone** | Milestone | `...events/{eventId}/milestones/{milestoneId}` |
| **Task** | Task | `...activeCalendars/{calendarId}/tasks/{taskId}` |
| **Chat** | Chat | `tenants/{tenantId}/calendars/autonCalendar/aiAgentChats/{chatId}` |
| **Message** | Message | `...aiAgentChats/{chatId}/messages/{messageId}` |
| **Cycle** | Cycle | `...aiAgentChats/{chatId}/cycles/{cycleId}` |
| **Agent State** | State | `tenants/{tenantId}/calendars/autonCalendar/aiAgentState` |

---

## Access Patterns & Performance Considerations

### 1. **Multi-Tenancy Isolation**
- **Always** filter by `tenantId` first
- Firestore security rules enforce tenant boundaries
- No cross-tenant data leakage

### 2. **Calendar Scope**
- Most queries are scoped to a single `calendarId`
- When AI agent needs "all events", query across all calendars:
  ```typescript
  // Get all calendars for tenant
  const calendars = await getCalendars(tenantId);

  // Query events from each calendar
  for (const calendar of calendars) {
    const events = await getEvents(tenantId, calendar.calendarId);
  }
  ```

### 3. **Chat Message History**
- Messages stored in order within chat
- Use pagination for long conversations:
  ```typescript
  .collection('messages')
  .orderBy('createdAt', 'asc')
  .limit(50)
  ```

### 4. **Workspace-Wide Agent Context**
- Agent state is at `autonCalendar` level (tenant-wide)
- Can access any calendar within the tenant
- Chat history persists across calendar contexts

---

## Implementation Checklist for AI Agent

### Phase 1: Chat State Management ✅ (Your Current Focus)

**Files to implement:**
- ✅ `state/chats/createChat.ts` - Create new chat session
- ✅ `state/chats/listChats.ts` - Get all chats for tenant
- ✅ `state/chats/updateChat.ts` - Update chat metadata
- ✅ `state/chats/deleteChat.ts` - Delete chat session
- ✅ `state/chats/getCurrentChat.ts` - Get active chat
- ✅ `state/chats/changeCurrentChat.ts` - Switch active chat
- ✅ `state/chats/createMessage.ts` - Add message to chat
- ✅ `state/chats/getChatMessages.ts` - Retrieve chat history
- ✅ `state/chats/index.ts` - Barrel exports

**Firestore operations needed:**
```typescript
// Create chat
firestore
  .collection('tenants')
  .doc(tenantId)
  .collection('calendars')
  .doc('autonCalendar')
  .collection('aiAgentChats')
  .doc(chatId)
  .set(chatData)

// Create message
firestore
  .collection('tenants')
  .doc(tenantId)
  .collection('calendars')
  .doc('autonCalendar')
  .collection('aiAgentChats')
  .doc(chatId)
  .collection('messages')
  .doc(messageId)
  .set(messageData)

// Update agent state
firestore
  .collection('tenants')
  .doc(tenantId)
  .collection('calendars')
  .doc('autonCalendar')
  .doc('aiAgentState')
  .set({ currentChatId: chatId }, { merge: true })
```

### Phase 2: Agent Orchestration

**Files to implement:**
- `services/planCycle.ts` - Plan agent actions from user prompt
- `services/executeCycle.ts` - Execute planned actions
- `orchrestrators/requestOrchrestrator.ts` - Main request handler
- `controller/calendarAiAgentController.ts` - HTTP controller
- `routes/calendarAiAgentRoutes.ts` - Express routes

### Phase 3: Tool Integration

**Import existing calendar services:**
```typescript
// From existing services
import { createEvent, getEvents, updateEvent, deleteEvent } from '../services/eventManager';
import { createTask, getTasks, updateTask, deleteTask } from '../services/taskManager';
import { createCalendar, getCalendars, updateCalendar } from '../services/calendarManager';
import { addAttendees, getAttendees, updateAttendee } from '../services/atendeesManager';
```

---

## Why This Structure Works

### ✅ **Tenant Isolation**
- All data scoped to `tenantId`
- Clear security boundaries
- Multi-workspace support

### ✅ **Workspace-Wide Agent**
- Chat data at `autonCalendar` level (not calendar-specific)
- Agent can work across all calendars
- Unified conversation history

### ✅ **Hierarchical Organization**
- Logical nesting: Tenant → Calendar → Events → Attendees/Milestones
- Tasks at calendar level (not event-specific)
- Chats at workspace level (not calendar-specific)

### ✅ **Scalability**
- Subcollections allow unlimited attendees, messages, milestones
- Efficient queries with proper indexing
- No document size limits (subcollections instead of arrays)

### ✅ **Flexibility**
- `metadata` fields for extensibility
- Relationships via ID references
- Optional fields for gradual feature adoption

---

## Next Steps

1. **Implement Chat State Functions** (current focus)
   - Create/read/update/delete chats
   - Message management
   - Agent state tracking

2. **Build Request Orchestrator**
   - Parse user prompts
   - Route to appropriate services
   - Handle multi-step operations

3. **Integrate Calendar Services**
   - Wrap existing CRUD operations
   - Add error handling
   - Implement transaction support for multi-resource changes

4. **Add Agent Brain/Planning**
   - Plan cycles from natural language
   - Execute multi-step operations
   - Track execution state

5. **Create API Endpoints**
   - POST `/api/calendar-agent/chat` - Send message
   - GET `/api/calendar-agent/chats` - List chats
   - POST `/api/calendar-agent/chats` - Create chat
   - etc.

---

**Document Version:** 1.0
**Last Updated:** 2025-01-04
**Maintained By:** Pulseline Engineering Team
