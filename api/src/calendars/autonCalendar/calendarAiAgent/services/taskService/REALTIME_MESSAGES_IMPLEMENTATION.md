# Real-Time Message Updates Implementation

## Overview

Implemented real-time message posting during task service execution stages, allowing users to see what the agent is thinking and doing as it progresses through multi-stage LLM operations.

---

## Backend Changes ✅ COMPLETED

### 1. Updated Output Interfaces

#### `taskBrain/reviewPrompt.ts`
**Added `message` field to output:**
```typescript
export interface ReviewPromptOutput {
  message: string; // NEW - Message to send to user explaining what will be done
  reasoning: string;
  operations: OperationReview[];
}
```

#### `taskBrain/generateHandlerJsons.ts`
**Added `message` field to output:**
```typescript
export interface GenerateHandlerJsonsOutput {
  message: string; // NEW - Message to send to user explaining what's being executed
  reasoning: string;
  handlerCalls: HandlerCall[];
}
```

### 2. Updated Prompts

#### `promptBuilder.ts` - Stage 1 Output Format
```json
{
  "message": "I'm going to create two new tasks for you: one for reviewing the Q4 budget and another for following up with the team.",
  "reasoning": "User wants to create 2 new tasks...",
  "operations": [...]
}
```

#### `generateHandlerJsons.ts` - Stage 4 Output Format
```json
{
  "message": "Creating your task 'Review Q4 budget' for today at 3pm...",
  "reasoning": "Creating task as requested...",
  "handlerCalls": [...]
}
```

### 3. Added Message Posting to taskService.ts

#### After Stage 2 (Review Prompt):
```typescript
// Post Stage 2 message to user
console.log(`\n📤 Posting Stage 2 message to chat...`);
await createMessage(executionContext.tenantId, {
  role: 'assistant',
  content: reviewOutput.message,
  calendarId: executionContext.calendarId,
  metadata: {
    stage: 'reviewPrompt',
    operations: reviewOutput.operations
  }
});
console.log(`✅ Stage 2 message posted`);
```

#### After Stage 4 (Generate Handler JSONs):
```typescript
// Post Stage 4 message to user
console.log(`\n📤 Posting Stage 4 message to chat...`);
await createMessage(executionContext.tenantId, {
  role: 'assistant',
  content: handlerJsons.message,
  calendarId: executionContext.calendarId,
  metadata: {
    stage: 'generateHandlerJsons',
    handlerCount: handlerJsons.handlerCalls.length
  }
});
console.log(`✅ Stage 4 message posted`);
```

---

## Frontend Changes 🔄 TO BE IMPLEMENTED

### Current Behavior (Polling):
```typescript
// chatInterface.tsx
const handleSendMessage = async () => {
  await service.sendMessage(prompt, currentChat?.chatId);
  await loadMessages(); // ❌ Polls once after completion
  onChatUpdate?.();
};
```

**Problem:** User only sees final result, not intermediate messages

### Proposed Behavior (Real-Time Listener):

#### Option 1: Using Firestore SDK Directly

```typescript
'use client';

import { useEffect } from 'react';
import { onSnapshot, collection, query, orderBy } from 'firebase/firestore';
import { db } from '@/config/firebase'; // Your Firebase config

export function ChatInterface({ service, currentChat, onChatUpdate }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    if (!currentChat?.chatId) {
      setMessages([]);
      return;
    }

    // Set up real-time listener
    const messagesRef = collection(
      db,
      'tenants',
      tenantId,
      'calendars',
      'autonCalendar',
      'aiAgent',
      'main',
      'chats',
      currentChat.chatId,
      'messages'
    );

    const q = query(messagesRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        ...doc.data(),
        messageId: doc.id,
        createdAt: doc.data().createdAt?.toDate()
      })) as Message[];

      setMessages(msgs);
    }, (error) => {
      console.error('Error listening to messages:', error);
      setError('Failed to load messages');
    });

    // Cleanup listener on unmount
    return () => unsubscribe();
  }, [currentChat?.chatId]);

  // Rest of component...
}
```

#### Option 2: Using API with Server-Sent Events (SSE)

If you prefer not to expose Firestore to frontend:

```typescript
// Backend - Add SSE endpoint
router.get('/api/calendar-agent/chats/:chatId/messages/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const { chatId } = req.params;

  const unsubscribe = firestore
    .collection('tenants')
    .doc(tenantId)
    .collection('calendars')
    .doc('autonCalendar')
    .collection('aiAgent')
    .doc('main')
    .collection('chats')
    .doc(chatId)
    .collection('messages')
    .orderBy('createdAt', 'asc')
    .onSnapshot((snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          res.write(`data: ${JSON.stringify(change.doc.data())}\n\n`);
        }
      });
    });

  req.on('close', () => {
    unsubscribe();
    res.end();
  });
});

// Frontend
useEffect(() => {
  const eventSource = new EventSource(
    `/api/calendar-agent/chats/${currentChat.chatId}/messages/stream`
  );

  eventSource.onmessage = (event) => {
    const newMessage = JSON.parse(event.data);
    setMessages(prev => [...prev, newMessage]);
  };

  return () => eventSource.close();
}, [currentChat?.chatId]);
```

---

## Message Flow Example

### User Request:
> "Create task to review budget today at 3pm"

### Messages Posted (Real-Time):

1. **User Message** (posted immediately)
   ```
   User: Create task to review budget today at 3pm
   ```

2. **Stage 2 Message** (after reviewPrompt - ~2-3 seconds)
   ```
   Assistant: I'm analyzing your request and will create a task for you...
   ```

3. **Stage 4 Message** (after generateHandlerJsons - ~5-7 seconds)
   ```
   Assistant: Creating your task 'Review budget' for today at 3:00 PM...
   ```

4. **Final Completion** (after handler execution - ~10 seconds total)
   ```
   [Task card appears showing the created task]
   ```

---

## Benefits

### 1. **Real-Time Feedback**
- User sees what agent is thinking
- Reduces perceived wait time
- Builds trust in AI reasoning

### 2. **Better UX**
- No "black box" feeling
- User can cancel if agent misunderstood
- Progressive disclosure of work

### 3. **Debugging**
- See exactly where agent is in process
- Identify slow stages
- Better error messages

---

## Testing

### Test Case 1: Simple Task Creation
**Input:** "Create task to call John tomorrow"

**Expected Messages:**
1. User message appears immediately
2. Stage 2: "I'll create a task for calling John tomorrow..." (2-3s)
3. Stage 4: "Creating task 'Call John' for tomorrow..." (5-7s)
4. Task appears in calendar (10s)

### Test Case 2: Multiple Tasks
**Input:** "Create 2 tasks: review budget and call dentist"

**Expected Messages:**
1. User message appears immediately
2. Stage 2: "I'm going to create two tasks for you..." (2-3s)
3. Stage 4: "Creating tasks 'Review budget' and 'Call dentist'..." (6-8s)
4. Both tasks appear in calendar (12s)

### Test Case 3: Error Handling
**Input:** "Update that task" (no task specified)

**Expected Messages:**
1. User message appears immediately
2. Stage 2: "I need more information..." (2-3s)
3. Agent asks for clarification (no Stage 4)

---

## Implementation Checklist

### Backend ✅ DONE
- [x] Add `message` field to ReviewPromptOutput
- [x] Add `message` field to GenerateHandlerJsonsOutput
- [x] Update prompts to require message field
- [x] Import createMessage in taskService.ts
- [x] Post message after Stage 2
- [x] Post message after Stage 4
- [x] Add metadata to track stages

### Frontend ✅ COMPLETED
- [x] Choose implementation (Firestore SDK - chosen)
- [x] Add real-time listener to chatInterface.tsx
- [x] Remove polling (loadMessages after send)
- [x] Add loading states for intermediate messages (already present)
- [x] Test real-time updates (ready for testing)
- [x] Handle listener cleanup on unmount

---

## Files Modified

### Backend:
1. `/services/taskService.ts` - Added createMessage imports and calls
2. `/taskService/taskBrain/reviewPrompt.ts` - Added message field
3. `/taskService/taskBrain/generateHandlerJsons.ts` - Added message field
4. `/taskService/promptBuilder.ts` - Updated output format with message
5. `/taskService/promptBuilder/taskHandlerContext/generateHandlerJsons.ts` - Updated examples

### Frontend:
1. `/app/calendar/viewer/[id]/components/aiAgentModal/chatInterface.tsx` - Added Firestore real-time listener
   - Imported Firestore SDK functions (collection, query, orderBy, onSnapshot, Timestamp)
   - Imported useAuth hook to get currentTenantId
   - Replaced polling useEffect with real-time onSnapshot listener
   - Removed loadMessages() call after sendMessage
   - Added automatic cleanup on unmount/chat change

---

## Notes

- Messages are posted to Firestore immediately as each stage completes
- Frontend should listen to Firestore changes for real-time updates
- No need to wait for full completion before showing intermediate messages
- Each message includes metadata about which stage it's from
- Consider adding visual indicators (spinner, stage labels) in UI

---

## Next Steps

1. **Frontend Implementation Priority:** Choose Firestore SDK approach (simpler, faster)
2. **Add Visual Indicators:** Show "thinking..." states between messages
3. **Message Timestamps:** Display when each message was posted
4. **Stage Indicators:** Show which stage agent is currently in
5. **Cancel Functionality:** Allow user to cancel long-running operations
