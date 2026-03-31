# Event Payload Schemas

This document outlines the exact payloads available for each trigger event, based on the actual data at the trigger point in the codebase.

---

## `sms.received.v1` - SMS Message Received

### Trigger Point
**File:** `backend/src/inboundEvents/sms/services/newRequestHandler.ts`
**Line:** ~203-217
**When:** After `findOrCreateContact()` completes, before `addMessageToConversation()`

### Context
This event fires after:
1. ✅ Tenant has been resolved from Twilio MessagingServiceSid
2. ✅ Contact has been found or created
3. ⏳ Before message is saved to Firestore conversation

### Available Data

```typescript
interface SmsReceivedPayload {
  // Core identifiers (resolved)
  tenantId: string;              // Resolved from MessagingServiceSid
  contactId: string;             // From findOrCreateContact()

  // Message identifiers
  messageId: string;             // processedData.messageSid (Twilio MessageSid)
  messagingServiceId?: string;   // processedData.messagingServiceId

  // Message content
  from: string;                  // processedData.from (sender phone)
  to: string;                    // processedData.to (recipient phone)
  body: string;                  // processedData.body

  // Media attachments
  mediaUrls: string[];           // processedData.mediaUrls (array of Twilio URLs)
  mediaTypes: string[];          // processedData.mediaTypes (content types)
  mediaCount: number;            // processedData.mediaUrls.length

  // Metadata
  timestamp: string;             // processedData.metadata.timestamp (ISO 8601)
  fromCity?: string;             // processedData.metadata.fromCity
  fromState?: string;            // processedData.metadata.fromState
  fromCountry?: string;          // processedData.metadata.fromCountry
  numSegments?: number;          // processedData.metadata.numSegments
}
```

### Example Payload

```json
{
  "tenantId": "ten_01H3X5Y7Z9...",
  "contactId": "con_01H3X6A8B9...",
  "messageId": "SM1234567890abcdef",
  "messagingServiceId": "MG9876543210fedcba",
  "from": "+15551234567",
  "to": "+15559876543",
  "body": "Hello! I would like more information about your services.",
  "mediaUrls": [],
  "mediaTypes": [],
  "mediaCount": 0,
  "timestamp": "2025-11-05T20:15:30.000Z",
  "fromCity": "San Francisco",
  "fromState": "CA",
  "fromCountry": "US",
  "numSegments": 1
}
```

### Example with Media

```json
{
  "tenantId": "ten_01H3X5Y7Z9...",
  "contactId": "con_01H3X6A8B9...",
  "messageId": "SM1234567890abcdef",
  "messagingServiceId": "MG9876543210fedcba",
  "from": "+15551234567",
  "to": "+15559876543",
  "body": "Check out this image!",
  "mediaUrls": [
    "https://api.twilio.com/2010-04-01/Accounts/.../Messages/.../Media/ME..."
  ],
  "mediaTypes": [
    "image/jpeg"
  ],
  "mediaCount": 1,
  "timestamp": "2025-11-05T20:15:30.000Z",
  "fromCity": "Los Angeles",
  "fromState": "CA",
  "fromCountry": "US",
  "numSegments": 1
}
```

---

## `phone.call.completed.v1` - Phone Call Completed

### Trigger Point
**File:** `backend/src/agentCommunication/phone/services/handlePostCall.ts`
**Line:** ~140-156
**When:** At the point where `summarizeHistoryService.summarizeConversation()` is called

### Context
This event fires after:
1. ✅ Call mapping has been resolved (tenant, agent, contact)
2. ✅ Transcript has been processed and saved
3. ✅ Audio has been saved (if available)
4. ✅ Call completion message has been created
5. ⏳ Before conversation summarization runs

### Available Data

```typescript
interface PhoneCallCompletedPayload {
  // Core identifiers (from callMapping)
  tenantId: string;              // callMapping.tenantId
  contactId: string;             // callMapping.contactId
  agentId: string;               // callMapping.agentId

  // Conversation identifiers
  conversationId: string;        // ElevenLabs conversation ID (from webhook)
  localConversationId?: string;  // callMapping.localConversationId (phone record ID)
  actualConversationId: string;  // callMapping.actualConversationId (unified conversation)
  phoneNumber: string;           // callMapping.phoneNumber

  // Call metadata
  direction: 'inbound' | 'outbound';  // from fullData.metadata?.phone_call?.direction
  duration?: number;             // from fullData.metadata?.call_duration_secs

  // AI analysis
  callSummary?: string;          // from fullData.analysis?.transcript_summary
  transcript: any[];             // transcriptArray (array of transcript objects)
  analysis?: object;             // fullData.analysis (full ElevenLabs analysis)

  // Optional audio
  audioUrl?: string;             // from audioResult if available

  // Full metadata
  metadata?: object;             // fullData.metadata (full ElevenLabs metadata)
}
```

### Example Payload (Outbound Call)

```json
{
  "tenantId": "ten_01H3X5Y7Z9...",
  "contactId": "con_01H3X6A8B9...",
  "agentId": "agent_01H3X7B9C0...",
  "conversationId": "conv_11labs_abc123def456",
  "localConversationId": "phone_01H3X8C9D1...",
  "actualConversationId": "conv_unified_xyz789",
  "phoneNumber": "+15551234567",
  "direction": "outbound",
  "duration": 180,
  "callSummary": "Customer inquired about pricing for the premium plan. Showed strong interest in scheduling a demo next week. Mentioned they are currently using a competitor and looking to switch.",
  "transcript": [
    {
      "role": "agent",
      "text": "Hello, this is Sarah from Pulseline. Is this John?",
      "timestamp": 1699200000
    },
    {
      "role": "user",
      "text": "Yes, hi Sarah. Thanks for calling.",
      "timestamp": 1699200005
    },
    {
      "role": "agent",
      "text": "I wanted to follow up on your inquiry about our premium plan. Do you have a few minutes to chat?",
      "timestamp": 1699200010
    },
    {
      "role": "user",
      "text": "Sure, I'd love to learn more about pricing.",
      "timestamp": 1699200015
    }
  ],
  "analysis": {
    "transcript_summary": "Customer inquired about pricing for premium plan...",
    "call_summary_title": "Premium Plan Pricing Inquiry",
    "sentiment": "positive",
    "intent": "purchase_intent",
    "topics": ["pricing", "premium_plan", "demo_scheduling"]
  },
  "audioUrl": "https://firebasestorage.googleapis.com/.../audio/conv_11labs_abc123def456.mp3",
  "metadata": {
    "call_duration_secs": 180,
    "phone_call": {
      "direction": "outbound"
    },
    "agent_name": "Sarah",
    "end_reason": "user_hangup"
  }
}
```

### Example Payload (Inbound Call, No Audio Yet)

```json
{
  "tenantId": "ten_01H3X5Y7Z9...",
  "contactId": "con_01H3X6A8B9...",
  "agentId": "agent_01H3X7B9C0...",
  "conversationId": "conv_11labs_xyz789abc",
  "localConversationId": "phone_01H3X8C9D1...",
  "actualConversationId": "conv_unified_abc123",
  "phoneNumber": "+15551234567",
  "direction": "inbound",
  "duration": 45,
  "callSummary": "Customer called to report a technical issue with login. Issue resolved by resetting password.",
  "transcript": [
    {
      "role": "user",
      "text": "Hi, I'm having trouble logging into my account.",
      "timestamp": 1699200000
    },
    {
      "role": "agent",
      "text": "I'm sorry to hear that. Let me help you with that right away.",
      "timestamp": 1699200003
    }
  ],
  "analysis": {
    "transcript_summary": "Customer reported login issue. Password reset resolved the problem.",
    "call_summary_title": "Login Issue - Password Reset",
    "sentiment": "neutral",
    "intent": "support_request",
    "topics": ["login_issue", "password_reset", "technical_support"]
  },
  "metadata": {
    "call_duration_secs": 45,
    "phone_call": {
      "direction": "inbound"
    }
  }
}
```

---

## Notes on Trigger Timing

### SMS Received
- ✅ **Safe to trigger:** Contact is guaranteed to exist
- ✅ **Safe to trigger:** Tenant is guaranteed to be resolved
- ⚠️ **Not yet persisted:** Message has NOT been saved to Firestore yet
- 💡 **Use case:** Trigger workflows based on message content before persistence

### Phone Call Completed
- ✅ **Safe to trigger:** All data is available and persisted
- ✅ **Safe to trigger:** Transcript and audio are saved
- ✅ **Safe to trigger:** Call completion message is created
- ⚠️ **Not yet run:** Conversation summarization hasn't run yet
- 💡 **Use case:** Trigger workflows after call completes with full context

---

## Required Fields by Event

### sms.received.v1
**Must be present:**
- `tenantId`
- `contactId`
- `messageId`
- `from`
- `to`
- `body`
- `timestamp`

**Always arrays (may be empty):**
- `mediaUrls`
- `mediaTypes`

### phone.call.completed.v1
**Must be present:**
- `tenantId`
- `contactId`
- `agentId`
- `conversationId`
- `actualConversationId`
- `phoneNumber`
- `direction`
- `transcript` (must have length > 0)

**Optional but common:**
- `duration`
- `callSummary`
- `analysis`
- `audioUrl`
- `metadata`

---

## Filterable Fields

Workflows can optionally filter events using these fields:

### sms.received.v1
- `from` - Sender phone number
- `to` - Recipient phone number
- `mediaCount` - Number of attachments
- `body` - Message text (contains)
- `contactId` - Specific contact

### phone.call.completed.v1
- `direction` - inbound or outbound
- `duration` - Call length in seconds
- `agentId` - Specific agent
- `contactId` - Specific contact
