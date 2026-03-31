# Calendar AI Agent API

Complete API documentation for the Calendar AI Agent system.

---

## Authentication

All endpoints require authentication via:
- **Firebase JWT** (Authorization: Bearer token)
- **OR API Key** (inherited from parent routes)

The `tenantId` is automatically extracted from the authenticated request.

---

## Base URL

```
/api/calendar-agent
```

---

## Endpoints

### 1. Send Message (Main Processing Endpoint)

**POST** `/api/calendar-agent/send-message`

Send a message to the AI agent for processing. This triggers the full orchestration pipeline.

#### Request Body
```json
{
  "prompt": "Schedule a team meeting tomorrow at 2pm",
  "chatId": "optional-chat-id",
  "calendarId": "optional-calendar-id"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| prompt | string | ✅ Yes | User's natural language request |
| chatId | string | ❌ No | Specific chat to use (defaults to current) |
| calendarId | string | ❌ No | Calendar context for the operation |

#### Response
```json
{
  "success": true,
  "message": "I created the meeting for tomorrow at 2pm",
  "chatId": "chat-uuid",
  "cycleId": "cycle-uuid"
}
```

#### Error Response
```json
{
  "success": false,
  "message": "Processing failed: Calendar not found",
  "chatId": "chat-uuid",
  "cycleId": "cycle-uuid",
  "error": "Calendar not found"
}
```

#### Processing Flow
1. Ensures chat exists (creates if needed)
2. Saves user message to chat
3. Creates new execution cycle
4. Processes request with cycle watcher
5. Saves agent response to chat
6. Returns result

---

## Chat Management

### 2. Get Current Chat

**GET** `/api/calendar-agent/chat/current`

Get the currently active chat session.

#### Response
```json
{
  "chat": {
    "chatId": "uuid",
    "tenantId": "tenant-id",
    "name": "Chat 2025-01-04",
    "isActive": true,
    "createdAt": "2025-01-04T12:00:00.000Z",
    "updatedAt": "2025-01-04T12:30:00.000Z",
    "lastMessageAt": "2025-01-04T12:30:00.000Z",
    "metadata": {
      "totalMessages": 10,
      "eventCount": 2,
      "taskCount": 1
    }
  }
}
```

#### Error (404)
```json
{
  "error": "No current chat found"
}
```

---

### 3. List All Chats

**GET** `/api/calendar-agent/chats`

Get all chat sessions for the tenant, ordered by most recently updated.

#### Response
```json
{
  "chats": [
    {
      "chatId": "uuid-1",
      "name": "Event Planning",
      "isActive": true,
      "lastMessageAt": "2025-01-04T12:30:00.000Z",
      "metadata": {
        "totalMessages": 25
      }
    },
    {
      "chatId": "uuid-2",
      "name": "Task Management",
      "isActive": false,
      "lastMessageAt": "2025-01-03T10:00:00.000Z",
      "metadata": {
        "totalMessages": 15
      }
    }
  ]
}
```

---

### 4. Create Chat

**POST** `/api/calendar-agent/chats`

Create a new chat session. Automatically sets it as the current chat.

#### Request Body
```json
{
  "name": "Event Planning",
  "metadata": {
    "customField": "value"
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | ❌ No | Chat name (defaults to timestamped name) |
| metadata | object | ❌ No | Custom metadata |

#### Response (201)
```json
{
  "chat": {
    "chatId": "uuid",
    "tenantId": "tenant-id",
    "name": "Event Planning",
    "isActive": true,
    "createdAt": "2025-01-04T12:00:00.000Z",
    "updatedAt": "2025-01-04T12:00:00.000Z",
    "metadata": {
      "customField": "value",
      "totalMessages": 0,
      "eventCount": 0,
      "taskCount": 0
    }
  }
}
```

---

### 5. Change Current Chat

**POST** `/api/calendar-agent/chat/current`

Switch the active chat to a different chat session.

#### Request Body
```json
{
  "chatId": "target-chat-uuid"
}
```

#### Response
```json
{
  "success": true,
  "message": "Current chat changed"
}
```

---

### 6. Update Chat

**PUT** `/api/calendar-agent/chats/:chatId`

Update chat metadata (name, custom fields).

#### Request Body
```json
{
  "name": "Updated Chat Name",
  "metadata": {
    "eventCount": 5,
    "customField": "new value"
  }
}
```

#### Response
```json
{
  "chat": {
    "chatId": "uuid",
    "name": "Updated Chat Name",
    "metadata": {
      "eventCount": 5,
      "customField": "new value"
    },
    "updatedAt": "2025-01-04T12:30:00.000Z"
  }
}
```

---

### 7. Delete Chat

**DELETE** `/api/calendar-agent/chats/:chatId`

Delete a chat and all its messages (cascade delete).

#### Response
```json
{
  "success": true,
  "message": "Chat deleted"
}
```

**Note:** If deleting the current chat, `currentChatId` is cleared from main state.

---

### 8. Get Chat Messages

**GET** `/api/calendar-agent/chats/:chatId/messages`

Get all messages for a specific chat, in chronological order.

#### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| limit | number | ❌ No | Limit number of messages (for pagination) |

#### Response
```json
{
  "messages": [
    {
      "messageId": "uuid-1",
      "chatId": "chat-uuid",
      "role": "user",
      "content": "Schedule a meeting tomorrow",
      "createdAt": "2025-01-04T12:00:00.000Z",
      "calendarId": null,
      "eventId": null,
      "taskId": null,
      "cycleId": null
    },
    {
      "messageId": "uuid-2",
      "chatId": "chat-uuid",
      "role": "assistant",
      "content": "I've scheduled the meeting for 2pm tomorrow",
      "createdAt": "2025-01-04T12:00:05.000Z",
      "calendarId": "cal-123",
      "eventId": "event-456",
      "cycleId": "cycle-789",
      "toolCalls": [
        {
          "tool": "createEvent",
          "params": { "eventName": "Meeting" },
          "result": { "eventId": "event-456" }
        }
      ]
    }
  ]
}
```

---

## Cycle Management

### 9. Get Current Cycle

**GET** `/api/calendar-agent/cycle/current`

Get the currently active execution cycle.

#### Response
```json
{
  "cycle": {
    "cycleId": "uuid",
    "tenantId": "tenant-id",
    "chatId": "chat-uuid",
    "status": "processing",
    "createdAt": "2025-01-04T12:00:00.000Z",
    "startedAt": "2025-01-04T12:00:00.000Z",
    "completedAt": null,
    "failedAt": null,
    "error": null,
    "metadata": {
      "prompt": "Schedule a meeting...",
      "calendarId": "cal-123"
    }
  }
}
```

#### Cycle Status Values
- `processing` - Cycle is currently executing
- `completed` - Cycle finished successfully
- `failed` - Cycle encountered an error

---

### 10. List All Cycles

**GET** `/api/calendar-agent/cycles`

Get all execution cycles for the tenant, ordered by most recent.

#### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| limit | number | ❌ No | Limit number of cycles |

#### Response
```json
{
  "cycles": [
    {
      "cycleId": "uuid-1",
      "status": "completed",
      "createdAt": "2025-01-04T12:00:00.000Z",
      "completedAt": "2025-01-04T12:00:05.000Z",
      "metadata": {
        "prompt": "Schedule a meeting..."
      }
    },
    {
      "cycleId": "uuid-2",
      "status": "failed",
      "createdAt": "2025-01-04T11:00:00.000Z",
      "failedAt": "2025-01-04T11:00:03.000Z",
      "error": "Calendar not found"
    }
  ]
}
```

---

## Health Check

### 11. Health Check

**GET** `/api/calendar-agent/health`

Check if the AI agent service is running.

#### Response
```json
{
  "status": "ok",
  "service": "calendar-ai-agent",
  "timestamp": "2025-01-04T12:00:00.000Z"
}
```

---

## Complete Usage Example

### Scenario: User wants to schedule a meeting

#### 1. Send Message
```bash
curl -X POST http://localhost:8000/api/calendar-agent/send-message \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Schedule a team meeting tomorrow at 2pm"
  }'
```

Response:
```json
{
  "success": true,
  "message": "I've scheduled the team meeting for tomorrow at 2pm",
  "chatId": "chat-abc123",
  "cycleId": "cycle-def456"
}
```

#### 2. Get Chat Messages (see conversation)
```bash
curl http://localhost:8000/api/calendar-agent/chats/chat-abc123/messages \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Response:
```json
{
  "messages": [
    {
      "role": "user",
      "content": "Schedule a team meeting tomorrow at 2pm",
      "createdAt": "2025-01-04T12:00:00.000Z"
    },
    {
      "role": "assistant",
      "content": "I've scheduled the team meeting for tomorrow at 2pm",
      "createdAt": "2025-01-04T12:00:05.000Z",
      "eventId": "event-xyz789"
    }
  ]
}
```

#### 3. Check Cycle Status
```bash
curl http://localhost:8000/api/calendar-agent/cycle/current \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Response:
```json
{
  "cycle": {
    "cycleId": "cycle-def456",
    "status": "completed",
    "completedAt": "2025-01-04T12:00:05.000Z"
  }
}
```

---

## Error Handling

All endpoints return appropriate HTTP status codes:

| Status Code | Meaning |
|-------------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (invalid input) |
| 401 | Unauthorized (missing/invalid auth) |
| 404 | Not Found (resource doesn't exist) |
| 500 | Internal Server Error |

Error responses include:
```json
{
  "error": "Detailed error message"
}
```

Or for send-message:
```json
{
  "success": false,
  "message": "Processing failed: ...",
  "error": "Detailed error"
}
```

---

## Message Roles

Messages have two roles:

### `user`
Messages sent by the user.

### `assistant`
Messages generated by the AI agent.

---

## Message Fields

| Field | Type | Description |
|-------|------|-------------|
| messageId | string | Unique message ID |
| chatId | string | Parent chat ID |
| role | 'user' \| 'assistant' | Message sender |
| content | string | Message text |
| createdAt | Date | Timestamp |
| calendarId | string? | Calendar context |
| eventId | string? | Created/modified event |
| taskId | string? | Created/modified task |
| cycleId | string? | Execution cycle |
| toolCalls | array? | Tools the agent used |
| metadata | object? | Additional data |

---

## Next Steps

### Implementing Agent Logic

Replace the placeholder in `requestOrchestrator.ts`:

```typescript
async function processAgentPipeline(
  tenantId: string,
  prompt: string,
  calendarId?: string
) {
  // TODO: Implement actual agent logic here
  // - Parse prompt with NLP
  // - Determine actions (create event, update task, etc.)
  // - Execute calendar operations
  // - Format response

  return {
    response: "Agent response...",
    eventId: "created-event-id",
    taskId: "created-task-id",
    toolCalls: [...]
  };
}
```

### Mounting Routes

In your main Express app:

```typescript
import calendarAiAgentRoutes from './calendars/autonCalendar/calendarAiAgent/routes/calendarAiAgentRoutes';

// Mount with authentication middleware
app.use('/api/calendar-agent', authenticateEither, calendarAiAgentRoutes);
```

---

**API Version:** 1.0
**Last Updated:** 2025-01-04
**Status:** ✅ Ready for integration
