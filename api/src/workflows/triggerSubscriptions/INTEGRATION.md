# Integration Checklist

## Step 1: Install Dependencies (if needed)
Check if `ulid` package is installed:
```bash
npm list ulid
```

If not installed:
```bash
npm install ulid
```

## Step 2: Create Firestore Indexes
Follow instructions in `FIRESTORE_INDEXES.md` to create required composite indexes.

**Quick Method:**
Add to `firestore.indexes.json` and deploy:
```bash
firebase deploy --only firestore:indexes
```

**Wait for indexes to build** (check Firebase Console → Firestore → Indexes tab)

## Step 3: Register Routes with Express App
Add trigger subscription routes to your main router.

**File:** `/backend/src/routes/index.ts`

```typescript
import triggerSubscriptionRoutes from '../workflows/triggerSubscriptions/routes/triggerSubscriptionRoutes';

// ... other imports

// Register trigger subscription routes
router.use('/workflows/trigger-subscriptions', triggerSubscriptionRoutes);
```

## Step 4: Test API Endpoints

### Test 1: Health Check
```bash
# Verify route is registered
curl http://localhost:3000/api/workflows/trigger-subscriptions \
  -H "X-API-Key: YOUR_API_KEY"
# Expected: Empty array [] (no subscriptions yet)
```

### Test 2: Create Subscription
```bash
curl -X POST http://localhost:3000/api/workflows/trigger-subscriptions \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{
    "workflowId": "test_workflow_123",
    "triggerType": "sms.received.v1",
    "enabled": true
  }'
# Expected: 201 Created with subscription data
```

### Test 3: Invalid Event Type
```bash
curl -X POST http://localhost:3000/api/workflows/trigger-subscriptions \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{
    "workflowId": "test_workflow_123",
    "triggerType": "invalid.event.type"
  }'
# Expected: 500 with "Unknown event type: invalid.event.type"
```

### Test 4: Duplicate Subscription (1:1 enforcement)
```bash
# Try creating second subscription for same workflow
curl -X POST http://localhost:3000/api/workflows/trigger-subscriptions \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{
    "workflowId": "test_workflow_123",
    "triggerType": "phone.call.completed.v1"
  }'
# Expected: 500 with "Workflow test_workflow_123 already has a trigger subscription"
```

### Test 5: Query with Filters
```bash
curl "http://localhost:3000/api/workflows/trigger-subscriptions?triggerType=sms.received.v1&enabled=true" \
  -H "X-API-Key: YOUR_API_KEY"
# Expected: 200 with array of matching subscriptions
```

### Test 6: Update Subscription
```bash
curl -X PUT http://localhost:3000/api/workflows/trigger-subscriptions/SUBSCRIPTION_ID \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{ "enabled": false }'
# Expected: 200 with updated subscription
```

### Test 7: Delete Subscription
```bash
curl -X DELETE http://localhost:3000/api/workflows/trigger-subscriptions/SUBSCRIPTION_ID \
  -H "X-API-Key: YOUR_API_KEY"
# Expected: 200 with success message
```

## Step 5: Verify Firestore Data
Check Firebase Console → Firestore Database:

Path: `/tenants/{tenantId}/workflows/main/triggerSubscriptions`

Expected document structure:
```
{
  id: "01HZYX...",
  tenantId: "ten_...",
  workflowId: "wf_...",
  triggerType: "sms.received.v1",
  enabled: true,
  priority: 100,
  version: 1,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

## Step 6: Frontend Integration (Optional for Phase 1)

### List Event Types
```typescript
// GET /api/workflows/trigger-subscriptions/event-types (TODO: add endpoint)
// For now, import from TriggerDestinationRegistry
import { TriggerDestinationRegistry } from '...';

const eventTypes = TriggerDestinationRegistry.getAllEventTypes();
// Returns: ["sms.received.v1", "phone.call.completed.v1", ...]
```

### Workflow Builder Integration
When user creates/edits a workflow:
1. Show dropdown of available event types
2. On save, create/update trigger subscription
3. Display trigger status in workflow UI

## Common Issues & Solutions

### Issue: "tenantId is required"
**Solution:** Ensure `authenticateEither` middleware is working and injecting `tenantId` into request object.

### Issue: "Workflow not found"
**Solution:** Verify workflow exists at path `/tenants/{tenantId}/workflows/main/workflows/{workflowId}`

### Issue: Index errors during queries
**Solution:** Wait for Firestore indexes to finish building (can take 5-10 minutes)

### Issue: "Missing required fields"
**Solution:** Ensure POST body includes `workflowId` and `triggerType`

### Issue: Subscription not queryable by triggerType
**Solution:** Check that composite index `(triggerType, enabled, priority)` is created and **Active** in Firebase Console

## Environment Variables
No new environment variables required. System uses existing Firebase configuration.

## Monitoring & Logging
Watch server logs for:
- ✅ `Created trigger subscription: {id}`
- ✅ `Updated trigger subscription: {id}`
- ✅ `Deleted trigger subscription: {id}`
- ❌ `Error creating subscription:` (check error message)

## Next: Phase 2 Preparation
Once CRUD is stable:
1. Identify integration points in SMS/Phone handlers
2. Design outbox/delivery tables
3. Implement event emission logic
4. Build n8n webhook poster

## Rollback Plan
If issues arise:
1. Comment out route registration in `routes/index.ts`
2. Restart server
3. System continues without trigger subscriptions
4. No data loss (subscriptions remain in Firestore)
