# Firestore Composite Indexes Required

## Collection Path
`/tenants/{tenantId}/workflows/main/triggerSubscriptions`

## Required Indexes

### Index 1: Query by triggerType and enabled status
**Fields:**
- `triggerType` (Ascending)
- `enabled` (Ascending)
- `priority` (Descending)

**Usage:** Get all active subscriptions for a specific event type, ordered by priority

**Query Example:**
```typescript
firestore
  .collection('tenants').doc(tenantId)
  .collection('workflows').doc('main')
  .collection('triggerSubscriptions')
  .where('triggerType', '==', 'sms.received.v1')
  .where('enabled', '==', true)
  .orderBy('priority', 'desc')
```

### Index 2: Query by enabled status only
**Fields:**
- `enabled` (Ascending)
- `priority` (Descending)

**Usage:** Get all active/inactive subscriptions ordered by priority

**Query Example:**
```typescript
firestore
  .collection('tenants').doc(tenantId)
  .collection('workflows').doc('main')
  .collection('triggerSubscriptions')
  .where('enabled', '==', true)
  .orderBy('priority', 'desc')
```

### Index 3: Query by workflowId (for 1:1 validation)
**Fields:**
- `workflowId` (Ascending)

**Usage:** Check if a workflow already has a subscription (1:1 relationship enforcement)

**Query Example:**
```typescript
firestore
  .collection('tenants').doc('main')
  .collection('workflows').doc('main')
  .collection('triggerSubscriptions')
  .where('workflowId', '==', 'wf_abc123')
  .limit(1)
```

## How to Create Indexes

### Option 1: Firebase Console (Manual)
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Firestore Database** → **Indexes** tab
4. Click **Create Index**
5. Enter the following:
   - **Collection ID:** `triggerSubscriptions`
   - **Collection Group:** No (single collection)
   - Add the fields listed above for each index
6. Click **Create**

### Option 2: firestore.indexes.json (Automatic)
Add this to your `firestore.indexes.json` file:

```json
{
  "indexes": [
    {
      "collectionGroup": "triggerSubscriptions",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "triggerType", "order": "ASCENDING" },
        { "fieldPath": "enabled", "order": "ASCENDING" },
        { "fieldPath": "priority", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "triggerSubscriptions",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "enabled", "order": "ASCENDING" },
        { "fieldPath": "priority", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "triggerSubscriptions",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "workflowId", "order": "ASCENDING" }
      ]
    }
  ]
}
```

Deploy with:
```bash
firebase deploy --only firestore:indexes
```

## Index Build Status
After creating indexes, they may take several minutes to build, especially with existing data. Check build status in the Firebase Console Indexes tab.

## Notes
- Single-field indexes (like `workflowId`) are created automatically by Firestore
- Composite indexes (multiple fields + orderBy) must be created manually
- Indexes are shared across all tenants (collection group query)
- Each index increases storage costs slightly but dramatically improves query performance
