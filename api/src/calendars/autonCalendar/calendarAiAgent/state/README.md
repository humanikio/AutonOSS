# Calendar AI Agent - State Management

## 📁 File Structure

```
state/
├── chats.ts                      # Main export (use this!)
├── chats/                        # Chat services
│   ├── index.ts                  # Barrel export
│   ├── createChat.ts             # Create new chat (auto-sets as current)
│   ├── getCurrentChat.ts         # Get active chat
│   ├── changeCurrentChat.ts      # Switch active chat
│   ├── listChats.ts              # List all chats
│   ├── updateChat.ts             # Update chat metadata
│   ├── deleteChat.ts             # Delete chat + messages
│   ├── createMessage.ts          # Add message to current chat
│   └── getChatMessages.ts        # Get messages for chat
├── utils/                        # Utilities
│   └── getCurrentState.ts        # Get/update main state document
└── cycles/                       # Cycles (future)
    └── cycles.ts
```

---

## 🗂️ Firestore Structure

### Path: `tenants/{tenantId}/calendars/autonCalendar/aiAgent/main`

```
main/                             # Main state document
  ├── (fields)                    # currentChatId, currentCycleId, settings, etc.
  │
  ├── chats/                      # Chat sessions
  │   {chatId}/
  │     └── messages/
  │         {messageId}/
  │
  └── cycles/                     # Execution cycles
      {cycleId}/
```

**Main Document Fields:**
```typescript
{
  currentChatId: string | null;
  currentCycleId: string | null;
  lastActiveAt: Date;
  totalChats: number;
  totalMessages: number;
  totalCycles: number;
  settings?: {
    defaultCalendarId?: string;
    timezone?: string;
    preferences?: Record<string, any>;
  };
  metadata?: Record<string, any>;
}
```

---

## 🚀 Usage Examples

### Import Everything from One Place

```typescript
import {
  // Chat operations
  createChat,
  getCurrentChat,
  changeCurrentChat,
  listChats,
  updateChat,
  deleteChat,

  // Message operations
  createMessage,
  getChatMessages,

  // State utilities
  getCurrentState,
  updateState,
  initializeState,

  // Types
  type Chat,
  type Message,
  type AIAgentState
} from './state/chats';
```

---

## 📝 Service Documentation

### 1. **createChat(tenantId, input?)**

Creates a new chat and **automatically sets it as the current chat**.

```typescript
const chat = await createChat('tenant123', {
  name: 'Event Planning - January',
  metadata: {
    customField: 'value'
  }
});

// Chat is now the current chat (no need to call changeCurrentChat)
```

**Returns:** `Chat`

**Side Effects:**
- Creates chat document
- Sets as current chat in main state
- Increments `totalChats` counter

---

### 2. **getCurrentChat(tenantId)**

Gets the currently active chat using the `currentChatId` from main state.

```typescript
const chat = await getCurrentChat('tenant123');

if (chat) {
  console.log(`Current chat: ${chat.name}`);
} else {
  console.log('No current chat set');
}
```

**Returns:** `Chat | null`

**Uses:** `getCurrentState()` utility to find `currentChatId`

---

### 3. **changeCurrentChat(tenantId, chatId)**

Switches the active chat to a different chat session.

```typescript
await changeCurrentChat('tenant123', 'chat456');
```

**Returns:** `boolean`

**Side Effects:**
- Updates `currentChatId` in main state
- Sets `isActive: true` on the chat
- Updates `lastActiveAt` timestamp

**Throws:** If chat doesn't exist

---

### 4. **listChats(tenantId)**

Gets all chats for the tenant, ordered by most recently updated.

```typescript
const chats = await listChats('tenant123');

chats.forEach(chat => {
  console.log(`${chat.name} - ${chat.metadata?.totalMessages} messages`);
});
```

**Returns:** `Chat[]`

**Order:** Descending by `updatedAt`

---

### 5. **updateChat(tenantId, chatId, input)**

Updates chat metadata (name, custom metadata).

```typescript
await updateChat('tenant123', 'chat456', {
  name: 'Updated Chat Name',
  metadata: {
    eventCount: 5,
    taskCount: 3
  }
});
```

**Returns:** `Chat | null`

**Updatable Fields:**
- `name`
- `metadata` (merged with existing)

---

### 6. **deleteChat(tenantId, chatId)**

Deletes a chat and all its messages.

```typescript
await deleteChat('tenant123', 'chat456');
```

**Returns:** `boolean`

**Side Effects:**
- Deletes all messages in chat (batch delete)
- Deletes chat document
- If deleted chat was current → clears `currentChatId` in main state
- Decrements `totalChats` counter

**Cascade Behavior:** ✅ Deletes all messages

---

### 7. **createMessage(tenantId, input)**

Creates a message in the **current chat** (uses `getCurrentState` to find it).

```typescript
// User message
await createMessage('tenant123', {
  role: 'user',
  content: 'Create an event for tomorrow at 2pm'
});

// Assistant message with tool calls
await createMessage('tenant123', {
  role: 'assistant',
  content: 'I created the event for you.',
  eventId: 'event123',
  cycleId: 'cycle456',
  toolCalls: [
    {
      tool: 'createEvent',
      params: { eventName: 'Meeting', startTime: '...' },
      result: { eventId: 'event123' }
    }
  ]
});
```

**Returns:** `Message`

**Side Effects:**
- Creates message document
- Updates chat's `lastMessageAt`
- Increments chat's `metadata.totalMessages`
- Increments global `totalMessages` counter

**Throws:** If no current chat is set

---

### 8. **getChatMessages(tenantId, chatId?, limit?)**

Gets messages for a chat. If no `chatId` provided, uses current chat.

```typescript
// Get messages from current chat
const messages = await getChatMessages('tenant123');

// Get messages from specific chat
const messages = await getChatMessages('tenant123', 'chat456');

// Get last 50 messages
const messages = await getChatMessages('tenant123', undefined, 50);
```

**Returns:** `Message[]`

**Order:** Ascending by `createdAt` (chronological)

**Uses:** `getCurrentState()` to find current chat if needed

---

## 🔧 State Utilities

### getCurrentState(tenantId)

Fetches the main AI agent state document.

```typescript
const state = await getCurrentState('tenant123');

console.log(`Current chat: ${state.currentChatId}`);
console.log(`Total chats: ${state.totalChats}`);
console.log(`Total messages: ${state.totalMessages}`);
```

**Returns:** `AIAgentState`

**Default Behavior:** Returns default state if document doesn't exist

---

### updateState(tenantId, updates)

Updates the main state document.

```typescript
await updateState('tenant123', {
  currentChatId: 'chat456',
  settings: {
    timezone: 'America/New_York',
    defaultCalendarId: 'cal123'
  }
});
```

**Side Effects:**
- Merges updates with existing state
- Updates `lastActiveAt` automatically

---

### initializeState(tenantId)

Creates the main state document if it doesn't exist.

```typescript
const state = await initializeState('tenant123');
```

**Returns:** `AIAgentState`

**Behavior:** Idempotent (safe to call multiple times)

---

## 🎯 Common Patterns

### Starting a New Conversation

```typescript
// 1. Create a new chat (auto-sets as current)
const chat = await createChat(tenantId, {
  name: 'Event Planning'
});

// 2. Add user message
await createMessage(tenantId, {
  role: 'user',
  content: 'Schedule a team meeting for tomorrow'
});

// 3. Add assistant response
await createMessage(tenantId, {
  role: 'assistant',
  content: 'I created the event for 2pm tomorrow.',
  eventId: 'event123',
  toolCalls: [...]
});
```

---

### Continuing Existing Conversation

```typescript
// 1. Get current chat
const chat = await getCurrentChat(tenantId);

if (!chat) {
  // No chat exists, create one
  await createChat(tenantId);
}

// 2. Add message to current chat
await createMessage(tenantId, {
  role: 'user',
  content: 'Update the meeting time to 3pm'
});
```

---

### Switching Between Conversations

```typescript
// 1. List all chats
const chats = await listChats(tenantId);

// 2. Switch to a specific chat
await changeCurrentChat(tenantId, chats[0].chatId);

// 3. Get messages from that chat
const messages = await getChatMessages(tenantId);
```

---

### Loading Chat History

```typescript
// Get current chat
const chat = await getCurrentChat(tenantId);

if (chat) {
  // Get all messages
  const messages = await getChatMessages(tenantId);

  // Or get last 50 messages for pagination
  const recentMessages = await getChatMessages(tenantId, chat.chatId, 50);
}
```

---

## 🔐 Design Decisions

### 1. **Single Source of Truth**

All state is in `main` document:
- `currentChatId` - Which chat is active
- `currentCycleId` - Which execution cycle is running
- Stats - Total chats, messages, cycles

This enables **atomic updates** and consistent state.

---

### 2. **Auto-Current Chat**

`createChat()` automatically sets the new chat as current because:
- Most common use case
- Reduces API calls
- Simpler developer experience

To create without activating, you'd need to immediately call `changeCurrentChat(oldChatId)`.

---

### 3. **Current Chat Context**

`createMessage()` and `getChatMessages()` default to current chat:
- Simplifies common case (talking to active chat)
- Still allows targeting specific chats via `chatId` parameter

---

### 4. **Cascade Deletes**

`deleteChat()` deletes all messages because:
- Messages can't exist without a chat
- Prevents orphaned data
- Matches user expectations

---

### 5. **Metadata Tracking**

Chat documents track their own stats:
```typescript
metadata: {
  eventCount: 5,
  taskCount: 3,
  totalMessages: 42
}
```

This enables:
- Chat list displays ("42 messages")
- Sorting by activity
- Usage analytics

---

## ⚡ Performance Considerations

### 1. **Pagination**

Use `limit` parameter for large message histories:
```typescript
const messages = await getChatMessages(tenantId, chatId, 50);
```

### 2. **Indexed Queries**

Messages are ordered by `createdAt` (indexed).

### 3. **Batch Operations**

Chat deletion uses batch writes for messages.

---

## 🧪 Testing Checklist

- [ ] Create chat → verify currentChatId is set
- [ ] Create message without current chat → should throw
- [ ] Delete current chat → verify currentChatId is cleared
- [ ] Switch chat → verify isActive flag updates
- [ ] List chats → verify order (most recent first)
- [ ] Get messages → verify order (chronological)
- [ ] Update state → verify merge behavior
- [ ] Initialize state → verify idempotent

---

## 🚧 Next Steps

1. **Implement Cycles** (`state/cycles/`)
   - Plan cycles
   - Execute cycles
   - Review cycles

2. **Add Request Orchestrator** (`orchestrators/requestOrchrestrator.ts`)
   - Parse user prompts
   - Create cycles
   - Link to chats

3. **Build Planning Brain** (`services/planCycle.ts`)
   - Natural language → actions
   - Multi-step planning

4. **Create API Endpoints** (`routes/calendarAiAgentRoutes.ts`)
   - POST `/api/calendar-agent/chat`
   - GET `/api/calendar-agent/chats`
   - etc.

---

**Status:** ✅ **COMPLETE - Chat State Management**

All chat services are implemented and ready to use!
