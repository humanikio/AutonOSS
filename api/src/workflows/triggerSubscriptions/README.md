# Trigger Subscription System - Phase 1

## Overview
The Trigger Subscription System connects system events (SMS received, calls completed, etc.) to workflow executions. Phase 1 implements **CRUD operations only** - event emission and n8n webhook posting will be implemented in Phase 2.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    PHASE 1: Subscription Management          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────┐    ┌──────────────────────────────┐  │
│  │  API Routes      │───▶│  Controller (HTTP handling)  │  │
│  │  (REST CRUD)     │    └──────────────────────────────┘  │
│  └──────────────────┘                 │                     │
│                                       ▼                     │
│            ┌──────────────────────────────────────┐         │
│            │  triggerSubscriptionManager Service  │         │
│            │  (Business logic + validation)       │         │
│            └──────────────────────────────────────┘         │
│                     │                    │                  │
│                     ▼                    ▼                  │
│     ┌────────────────────────┐  ┌──────────────────────┐   │
│     │ TriggerDestination     │  │  Firestore CRUD      │   │
│     │ Registry               │  │  (DB operations)     │   │
│     │ (Event schemas/        │  └──────────────────────┘   │
│     │  validation)           │                             │
│     └────────────────────────┘                             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Key Concepts

### One Subscription Per Workflow
Each workflow can have exactly **one** trigger subscription. This simplifies the system and prevents ambiguity about when a workflow should execute.

### Firestore Data Path
```
/tenants/{tenantId}/workflows/main/triggerSubscriptions/{subscriptionId}
```

### Indexed Queries
The system uses composite Firestore indexes for efficient querying:
- `(triggerType, enabled, priority)` - Get active subscriptions for an event type
- `(enabled, priority)` - Get all active/inactive subscriptions
- See `FIRESTORE_INDEXES.md` for setup instructions

## Available Event Types

### Communication Events

#### `sms.received.v1` - SMS Message Received
**Trigger Point:** `newRequestHandler.ts` after tenant and contact resolution (line ~203-217)
**When:** After `findOrCreateContact` completes, before `addMessageToConversation`

**Available Data:**
- Tenant ID, Contact ID
- Message ID, from/to phone numbers
- Message body and media attachments
- Location metadata (city, state, country)

#### `phone.call.completed.v1` - Phone Call Completed
**Trigger Point:** `handlePostCall.ts` after transcript processing (line ~140-156)
**When:** At the point where `summarizeHistoryService.summarizeConversation()` is called

**Available Data:**
- Tenant ID, Contact ID, Agent ID
- Conversation IDs (ElevenLabs, local, unified)
- Call transcript array and AI analysis
- Call duration, direction (inbound/outbound)
- Call summary, audio URL (if available)

See full schemas in:
```
services/TriggerDesitinationRegistry/records/
```

## API Endpoints

All endpoints require authentication via `authenticateEither` middleware.

### Create Subscription
```http
POST /api/workflows/trigger-subscriptions
Content-Type: application/json
Authorization: Bearer <token> OR X-API-Key: <api-key>

{
  "workflowId": "wf_abc123",
  "triggerType": "sms.received.v1",
  "enabled": true,
  "conditions": {
    "tags": ["inbound"],
    "payload": {
      "mediaCount": { "$eq": 0 }
    }
  },
  "priority": 100,
  "rateLimit": {
    "perMinute": 60,
    "burst": 120
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "01HZYX...",
    "tenantId": "ten_123",
    "workflowId": "wf_abc123",
    "triggerType": "sms.received.v1",
    "enabled": true,
    "priority": 100,
    "version": 1,
    "createdAt": { "_seconds": 1699200000, "_nanoseconds": 0 },
    "updatedAt": { "_seconds": 1699200000, "_nanoseconds": 0 }
  }
}
```

### List Subscriptions
```http
GET /api/workflows/trigger-subscriptions?triggerType=sms.received.v1&enabled=true
Authorization: Bearer <token> OR X-API-Key: <api-key>
```

**Query Parameters:**
- `triggerType` (optional) - Filter by event type
- `enabled` (optional) - Filter by active status (`true`/`false`)
- `workflowId` (optional) - Filter by workflow ID

**Response:**
```json
{
  "success": true,
  "count": 2,
  "data": [
    { /* subscription 1 */ },
    { /* subscription 2 */ }
  ]
}
```

### Get Subscription
```http
GET /api/workflows/trigger-subscriptions/:subscriptionId
Authorization: Bearer <token> OR X-API-Key: <api-key>
```

### Update Subscription
```http
PUT /api/workflows/trigger-subscriptions/:subscriptionId
Content-Type: application/json
Authorization: Bearer <token> OR X-API-Key: <api-key>

{
  "enabled": false,
  "priority": 200
}
```

### Delete Subscription
```http
DELETE /api/workflows/trigger-subscriptions/:subscriptionId
Authorization: Bearer <token> OR X-API-Key: <api-key>
```

## File Structure

```
triggerSubscriptions/
├── README.md                           # This file
├── FIRESTORE_INDEXES.md                # Index setup instructions
├── notes.txt                           # Implementation notes
├── types.ts                            # TypeScript interfaces
├── routes/
│   └── triggerSubscriptionRoutes.ts    # Express routes
├── controllers/
│   └── triggerSubscriptionController.ts # HTTP request handlers
└── services/
    ├── triggerSubscriptionManager.ts   # Service facade
    ├── triggerSubscriptionManager/
    │   ├── createSubscription.ts       # Create logic
    │   ├── readSubscription.ts         # Read logic
    │   ├── getSubscriptions.ts         # List/query logic
    │   ├── updateSubscription.ts       # Update logic
    │   └── deleteSubscription.ts       # Delete logic
    └── TriggerDesitinationRegistry/
        ├── index.ts                    # Registry service
        └── records/
            ├── sms.received.v1.ts
            ├── phone.call.initiated.v1.ts
            ├── phone.call.completed.v1.ts
            ├── contact.created.v1.ts
            └── contact.updated.v1.ts
```

## Validation Rules

### On Creation
1. ✅ `tenantId` is required (from auth middleware)
2. ✅ `workflowId` is required and must exist
3. ✅ `triggerType` is required and must be valid (not deprecated)
4. ✅ Workflow cannot already have a subscription (1:1 check)

### On Update
1. ✅ Subscription must exist
2. ✅ Only allowed fields can be updated (enabled, conditions, priority, rateLimit)
3. ✅ `triggerType` and `workflowId` are immutable

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Detailed error message"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (missing/invalid auth)
- `404` - Not Found
- `500` - Internal Server Error

## What's NOT in Phase 1

❌ Event emission (posting to workflows)
❌ Outbox/delivery system
❌ n8n webhook posting
❌ Idempotency tracking
❌ Rate limiting enforcement
❌ Event replay system

These will be Phase 2 after subscription management is validated and stable.

## Next Steps (Phase 2)

1. **Event Emitter Service**
   - Hook into SMS/Phone handlers
   - Query subscriptions on event
   - Create delivery records

2. **Delivery System**
   - Outbox pattern for reliability
   - Background worker for HTTP POSTs
   - Retry logic with exponential backoff
   - DLQ for failed deliveries

3. **n8n Integration**
   - POST to production webhook URLs
   - HMAC signature for security
   - Idempotency handling
   - Response validation

## Testing Checklist

### Unit Tests (TODO)
- [ ] TriggerDestinationRegistry validation
- [ ] createSubscription - valid/invalid event types
- [ ] createSubscription - 1:1 constraint enforcement
- [ ] getSubscriptions - filtering by triggerType + enabled
- [ ] updateSubscription - field mutations
- [ ] deleteSubscription - cleanup

### Integration Tests (TODO)
- [ ] Full CRUD cycle via API
- [ ] Authentication enforcement
- [ ] Workflow existence validation
- [ ] Concurrent creation attempts (1:1 race condition)

### Manual Testing
```bash
# Create subscription
curl -X POST http://localhost:3000/api/workflows/trigger-subscriptions \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{
    "workflowId": "wf_test123",
    "triggerType": "sms.received.v1",
    "enabled": true
  }'

# List subscriptions
curl http://localhost:3000/api/workflows/trigger-subscriptions?enabled=true \
  -H "X-API-Key: YOUR_API_KEY"

# Update subscription
curl -X PUT http://localhost:3000/api/workflows/trigger-subscriptions/01HZYX... \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{ "enabled": false }'

# Delete subscription
curl -X DELETE http://localhost:3000/api/workflows/trigger-subscriptions/01HZYX... \
  -H "X-API-Key: YOUR_API_KEY"
```

## Support

For questions or issues, contact the Pulseline engineering team.
