# Pattern: Webhook Field Extraction

> **Deep dive** on extracting and mapping fields from test webhook payloads

---

## 📋 Overview

This pattern enables users to capture test webhook payloads, extract all fields automatically, and make them available for field mapping in workflows.

### What it does

1. ✅ Captures test webhook payloads in Firestore
2. ✅ Extracts all fields recursively (nested objects, arrays)
3. ✅ Stores field definitions with types and sample values
4. ✅ Makes fields available to frontend for selection
5. ✅ Generates correct n8n expressions with `.body` wrapper

### Why it matters

Without this pattern:
- ❌ Users must manually inspect webhook payloads
- ❌ No way to see available fields
- ❌ Must write complex n8n expressions by hand
- ❌ Errors from mistyped field paths

With this pattern:
- ✅ Automatic field discovery
- ✅ Visual field selection
- ✅ Type information available
- ✅ Sample values shown
- ✅ One-click expression insertion

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  WEBHOOK FIELD PATTERN                      │
└─────────────────────────────────────────────────────────────┘

1. TEST WEBHOOK CAPTURE
   ┌──────────────────────────────────────────┐
   │ User sends webhook to test URL           │
   │ POST /webhook-test/{uuid}                │
   │ { "from": "+1555", "body": "Hi", ... }  │
   └──────────────────┬───────────────────────┘
                      │
                      ▼
   ┌──────────────────────────────────────────┐
   │ n8n receives and stores in Firestore     │
   │ triggerTests/{uuid}                      │
   │   - payload: { ... }                     │
   │   - receivedAt: Timestamp                │
   │   - testUrl: "..."                       │
   └──────────────────┬───────────────────────┘
                      │
2. USER SELECTS TEST EVENT                    │
   ┌──────────────────────────────────────────┘
   │ Frontend shows list of test events
   │ User clicks one to use for field mapping
   └──────────────────┬───────────────────────┐
                      │
                      ▼
   ┌──────────────────────────────────────────┐
   │ POST /api/workflows/:id/set-field-mapping│
   │ { testId: "uuid" }                       │
   └──────────────────┬───────────────────────┘
                      │
3. BACKEND EXTRACTS FIELDS                    │
   ┌──────────────────────────────────────────┘
   │ getTestPayloadFirestore(testId)
   │ → Fetch test payload
   └──────────────────┬───────────────────────┐
                      │
                      ▼
   ┌──────────────────────────────────────────┐
   │ defineFieldsFromJson(payload)            │
   │ → Recursively flatten JSON               │
   │ → Extract field paths, types, values     │
   │ → Create FieldDefinition array           │
   └──────────────────┬───────────────────────┘
                      │
                      ▼
   ┌──────────────────────────────────────────┐
   │ setMainMapping(fields)                   │
   │ → Store in triggerTests/main             │
   │ → availableFields: [...]                 │
   └──────────────────┬───────────────────────┘
                      │
4. FRONTEND LOADS FIELDS                      │
   ┌──────────────────────────────────────────┘
   │ Real-time listener on triggerTests/main
   │ → Load availableFields
   │ → Add sourceNodeName (trigger ID)
   │ → Display in FieldGroupDropdown
   └──────────────────┬───────────────────────┐
                      │
5. USER SELECTS FIELD                         │
   ┌──────────────────────────────────────────┘
   │ Click field in dropdown
   │ → Generate expression with .body
   │ → Insert at cursor
   └─────────────────────────────────────────┘
```

---

## 🔧 Implementation

### Step 1: Test Webhook Capture

**Handled by n8n webhook system** - Payloads automatically stored in Firestore.

**Firestore Structure:**

```
tenants/{tenantId}/workflows/{workflowId}/triggerTests/
  ├─ main (metadata document)
  │   ├─ selectedTestId: "uuid-456"
  │   ├─ selectedPayload: { ... }
  │   ├─ availableFields: [ ... ]
  │   ├─ mappingUpdatedAt: Timestamp
  │   └─ activeTestUrl: "https://..."
  │
  ├─ uuid-123 (test event 1)
  │   ├─ payload: { from: "+1555", body: "Hi", ... }
  │   ├─ receivedAt: Timestamp(2025-01-18 10:00:00)
  │   └─ testUrl: "https://n8n.../webhook-test/uuid-123"
  │
  └─ uuid-456 (test event 2)
      ├─ payload: { from: "+1777", body: "Hello", ... }
      ├─ receivedAt: Timestamp(2025-01-18 10:05:00)
      └─ testUrl: "https://n8n.../webhook-test/uuid-456"
```

**Example Test Payload:**

```json
{
  "from": "+15551234567",
  "body": "I'm interested in your product",
  "messageId": "SM12345",
  "contact": {
    "contactId": "con_123",
    "name": "John Doe",
    "phoneNumber": "+15551234567",
    "email": "john@example.com",
    "tags": ["lead", "website"]
  },
  "metadata": {
    "channel": "sms",
    "provider": "twilio"
  }
}
```

---

### Step 2: User Selects Test Event

**Frontend Component:**

**File:** `frontend/app/automations/automationsEditor/components/NodeConfigPanel/index.tsx:143-198`

```typescript
const [testEvents, setTestEvents] = useState<TestEvent[]>([]);
const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

// Real-time listener for test events
useEffect(() => {
  if (!isWebhookTrigger || !user || !workflowId || !currentTenantId) return;

  const triggerTestsRef = collection(
    db,
    'tenants',
    currentTenantId,
    'workflows',
    workflowId,
    'triggerTests'
  );

  const q = query(
    triggerTestsRef,
    orderBy('receivedAt', 'desc'),
    limit(20)
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const events: TestEvent[] = [];
    snapshot.forEach((doc) => {
      if (doc.id === 'main') return; // Skip metadata doc

      const data = doc.data();
      events.push({
        id: doc.id,
        payload: data.payload,
        receivedAt: data.receivedAt,
        testUrl: data.testUrl,
      });
    });
    setTestEvents(events);
  });

  return () => unsubscribe();
}, [isWebhookTrigger, user, workflowId, currentTenantId]);
```

**User Interface:**

```
┌────────────────────────────────────────────┐
│  Test Events                               │
├────────────────────────────────────────────┤
│  ○ 10:05:00 - SMS from +15557890123        │
│  ● 10:00:00 - SMS from +15551234567        │ ← Selected
│  ○ 09:55:00 - SMS from +15559876543        │
├────────────────────────────────────────────┤
│  [Set as Field Mapping Source]             │
└────────────────────────────────────────────┘
```

**User clicks "Set as Field Mapping Source":**

```typescript
const handleSetFieldMapping = async () => {
  if (!selectedEventId || !user) return;

  const token = await getToken();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const response = await fetch(
    `${apiUrl}/api/workflows/${workflowId}/set-field-mapping`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ testId: selectedEventId }),
    }
  );

  if (response.ok) {
    console.log('Field mapping set successfully');
  }
};
```

---

### Step 3: Backend Extracts Fields

#### 3.1 Orchestration

**File:** `workflows/services/setFieldMappingReference/index.ts:25-61`

```typescript
export async function setFieldMappingReference(
  tenantId: string,
  workflowId: string,
  testId: string
): Promise<SetFieldMappingResult> {
  try {
    // Step 1: Get test payload from Firestore
    const testPayloadData = await getTestPayloadFirestore(
      tenantId,
      workflowId,
      testId
    );

    // Step 2: Define fields from JSON payload
    const availableFields = defineFieldsFromJson(testPayloadData.payload);

    console.log(`Extracted ${availableFields.length} fields from payload`);

    // Step 3: Set mapping in main document
    await setMainMapping(
      tenantId,
      workflowId,
      testId,
      testPayloadData.payload,
      availableFields
    );

    return {
      success: true,
      testId,
      fieldsCount: availableFields.length,
      availableFields,
    };
  } catch (error) {
    console.error('Error setting field mapping reference:', error);
    throw error;
  }
}
```

#### 3.2 Fetch Test Payload

**File:** `workflows/services/setFieldMappingReference/getTestPayloadFirestore.ts:20-50`

```typescript
export async function getTestPayloadFirestore(
  tenantId: string,
  workflowId: string,
  testId: string
): Promise<TestPayloadData> {
  const testPayloadRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('workflows')
    .doc(workflowId)
    .collection('triggerTests')
    .doc(testId);

  const doc = await testPayloadRef.get();

  if (!doc.exists) {
    throw new Error(`Test payload with ID ${testId} not found`);
  }

  const data = doc.data();

  if (!data || !data.payload) {
    throw new Error(`Test payload data is invalid or missing payload field`);
  }

  return {
    payload: data.payload,
    receivedAt: data.receivedAt,
    testUrl: data.testUrl,
  };
}
```

#### 3.3 Extract Field Definitions

**File:** `workflows/services/setFieldMappingReference/defineFieldsFromJson.ts:37-105`

**Algorithm:**

```typescript
export function defineFieldsFromJson(payload: any): FieldDefinition[] {
  const fields: FieldDefinition[] = [];

  // Type detection
  function getType(value: any): FieldDefinition['type'] {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'object') return 'object';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    return 'string';
  }

  // Extract display name (last segment of path)
  function getDisplayName(path: string): string {
    const cleanPath = path.replace(/\[\d+\]/g, '');
    const segments = cleanPath.split('.');
    return segments[segments.length - 1];
  }

  // Recursive flattening
  function flatten(obj: any, prefix: string = ''): void {
    for (const key in obj) {
      if (!obj.hasOwnProperty(key)) continue;

      const value = obj[key];
      const path = prefix ? `${prefix}.${key}` : key;
      const type = getType(value);
      const isNested = prefix.length > 0;

      // Always add field definition
      fields.push({
        path,
        displayName: getDisplayName(path),
        group: 'inboundWebhook',
        type,
        value,
        isNested,
      });

      // Recursively flatten objects
      if (type === 'object' && value !== null && !Array.isArray(value)) {
        flatten(value, path);
      }

      // Handle arrays
      if (type === 'array' && value.length > 0) {
        const firstElement = value[0];
        if (typeof firstElement === 'object' && firstElement !== null) {
          // Array of objects - flatten first element
          flatten(firstElement, `${path}[0]`);
        } else {
          // Array of primitives - add element path
          fields.push({
            path: `${path}[0]`,
            displayName: getDisplayName(`${path}[0]`),
            group: 'inboundWebhook',
            type: getType(firstElement),
            value: firstElement,
            isNested: true,
          });
        }
      }
    }
  }

  if (typeof payload !== 'object' || payload === null) {
    throw new Error('Payload must be a valid JSON object');
  }

  flatten(payload);

  // Sort alphabetically
  return fields.sort((a, b) => a.path.localeCompare(b.path));
}
```

**Example Extraction:**

**Input:**

```json
{
  "from": "+15551234567",
  "body": "Hello",
  "contact": {
    "contactId": "con_123",
    "name": "John Doe",
    "tags": ["lead", "website"]
  }
}
```

**Output:**

```typescript
[
  {
    path: 'body',
    displayName: 'body',
    group: 'inboundWebhook',
    type: 'string',
    value: 'Hello',
    isNested: false
  },
  {
    path: 'contact',
    displayName: 'contact',
    group: 'inboundWebhook',
    type: 'object',
    value: { contactId: 'con_123', name: 'John Doe', tags: [...] },
    isNested: false
  },
  {
    path: 'contact.contactId',
    displayName: 'contactId',
    group: 'inboundWebhook',
    type: 'string',
    value: 'con_123',
    isNested: true
  },
  {
    path: 'contact.name',
    displayName: 'name',
    group: 'inboundWebhook',
    type: 'string',
    value: 'John Doe',
    isNested: true
  },
  {
    path: 'contact.tags',
    displayName: 'tags',
    group: 'inboundWebhook',
    type: 'array',
    value: ['lead', 'website'],
    isNested: true
  },
  {
    path: 'contact.tags[0]',
    displayName: 'tags',
    group: 'inboundWebhook',
    type: 'string',
    value: 'lead',
    isNested: true
  },
  {
    path: 'from',
    displayName: 'from',
    group: 'inboundWebhook',
    type: 'string',
    value: '+15551234567',
    isNested: false
  }
]
```

#### 3.4 Store Field Mapping

**File:** `workflows/services/setFieldMappingReference/setMainMapping.ts:21-47`

```typescript
export async function setMainMapping(
  tenantId: string,
  workflowId: string,
  testId: string,
  payload: any,
  availableFields: FieldDefinition[]
): Promise<void> {
  const mainDocRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('workflows')
    .doc(workflowId)
    .collection('triggerTests')
    .doc('main');

  await mainDocRef.set(
    {
      selectedTestId: testId,
      selectedPayload: payload,
      availableFields: availableFields,
      mappingUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true } // Preserve existing fields
  );

  console.log(`Field mapping updated for workflow ${workflowId}`);
}
```

**Result in Firestore:**

```javascript
// triggerTests/main
{
  selectedTestId: "uuid-456",
  selectedPayload: {
    from: "+15551234567",
    body: "Hello",
    contact: { ... }
  },
  availableFields: [
    { path: 'body', displayName: 'body', type: 'string', ... },
    { path: 'contact', displayName: 'contact', type: 'object', ... },
    { path: 'contact.contactId', displayName: 'contactId', type: 'string', ... },
    // ... more fields
  ],
  mappingUpdatedAt: Timestamp(2025-01-18 10:06:00),
  activeTestUrl: "https://n8n.../webhook-test/uuid-123"
}
```

---

### Step 4: Frontend Loads Fields

**File:** `frontend/app/automations/automationsEditor/components/NodeConfigPanel/index.tsx:200-238`

```typescript
const [availableFields, setAvailableFields] = useState<FieldDefinition[]>([]);

useEffect(() => {
  async function buildAvailableFields() {
    if (!user || !workflowId) return;

    const fields: FieldDefinition[] = [];

    // Find trigger node ID
    const triggerNode = allNodes.find(n => n.type === 'trigger');
    const triggerNodeId = triggerNode?.id;

    try {
      // Load webhook fields from Firestore main doc
      const mainDocRef = doc(
        db,
        'tenants',
        currentTenantId || user.uid,
        'workflows',
        workflowId,
        'triggerTests',
        'main'
      );

      const mainDoc = await getDoc(mainDocRef);
      if (mainDoc.exists()) {
        const data = mainDoc.data();
        if (data.availableFields) {
          // Add sourceNodeName for expression generation
          data.availableFields.forEach((field: FieldDefinition) => {
            fields.push({
              ...field,
              sourceNodeName: triggerNodeId, // ✅ Critical for expressions
            });
          });
          console.log('Webhook fields loaded:', data.availableFields.length);
        }
      }

      setAvailableFields(fields);
    } catch (error) {
      console.error('Error loading webhook fields:', error);
    }
  }

  buildAvailableFields();
}, [user, workflowId, allNodes, currentTenantId]);
```

**Result:**

```typescript
// availableFields state
[
  {
    path: 'body',
    displayName: 'body',
    group: 'inboundWebhook',
    type: 'string',
    value: 'Hello',
    isNested: false,
    sourceNodeName: 'trigger-abc123' // ✅ Added by frontend
  },
  {
    path: 'contact.phoneNumber',
    displayName: 'phoneNumber',
    group: 'inboundWebhook',
    type: 'string',
    value: '+15551234567',
    isNested: true,
    sourceNodeName: 'trigger-abc123' // ✅ Added by frontend
  },
  // ... more fields
]
```

---

### Step 5: Display and Selection

**Component:** `FieldGroupDropdown`

**File:** `frontend/app/automations/automationsEditor/components/NodeConfigPanel/FieldGroupDropdown.tsx:12-108`

```typescript
export function FieldGroupDropdown({ fields, onSelectField }: Props) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(['inboundWebhook'])
  );
  const groupedFields = groupFields(fields);

  return (
    <div className="max-h-96 overflow-y-auto">
      {groupedFields.map(({ group, fields: groupFields }) => (
        <div key={group.name}>
          {/* Group Header */}
          <button onClick={() => toggleGroup(group.name)}>
            <span>{group.icon}</span> {/* 📥 */}
            <div>{group.displayName}</div> {/* Webhook Payload */}
            <span>{groupFields.length}</span> {/* 7 */}
          </button>

          {/* Field List */}
          {isExpanded && (
            <div>
              {groupFields.map((field) => (
                <button
                  key={`${field.sourceNodeName}-${field.path}`}
                  onClick={() => onSelectField(field)}
                >
                  <div>{field.displayName}</div>
                  <div>{field.path}</div>
                  <div>
                    {field.type}
                    {field.value && ` • ${String(field.value).substring(0, 40)}`}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
```

**UI Display:**

```
┌────────────────────────────────────────────┐
│  📥 Webhook Payload                   [7]  │
├────────────────────────────────────────────┤
│  body                                      │
│  body                                      │
│  string • Hello                            │
│                                            │
│  phoneNumber                               │
│  contact.phoneNumber                       │
│  string • +15551234567                     │
│                                            │
│  name                                      │
│  contact.name                              │
│  string • John Doe                         │
│                                            │
│  tags                                      │
│  contact.tags                              │
│  array • ["lead","website"]                │
└────────────────────────────────────────────┘
```

---

### Step 6: Generate Expression

**File:** `NodeConfigPanel/NodeParameterRenderer.tsx:391-425`

```typescript
const insertFieldAtCursor = (field: FieldDefinition) => {
  let expression: string;

  if (!field?.sourceNodeName) {
    // Fallback (shouldn't happen)
    expression = `{{$json.${field.path}}}`;
  } else if (field.group === 'inboundWebhook') {
    // ✅ Webhook field - needs .body
    expression = `={{ $("${field.sourceNodeName}").item.json.body.${field.path} }}`;
  } else {
    // Previous node - no .body
    expression = `={{ $("${field.sourceNodeName}").item.json.${field.path} }}`;
  }

  // Insert at cursor position
  if (inputRef) {
    const start = inputRef.selectionStart || 0;
    const end = inputRef.selectionEnd || 0;
    const currentValue = value || '';
    const newValue =
      currentValue.substring(0, start) +
      expression +
      currentValue.substring(end);
    onChange(property.name, newValue);

    // Restore cursor position
    setTimeout(() => {
      inputRef.focus();
      const newPosition = start + expression.length;
      inputRef.setSelectionRange(newPosition, newPosition);
    }, 0);
  } else {
    // No cursor - append
    onChange(property.name, (value || '') + expression);
  }

  setShowFieldMenu(false);
};
```

**Example:**

User selects `contact.phoneNumber` field:

```typescript
// Field object
{
  path: 'contact.phoneNumber',
  displayName: 'phoneNumber',
  group: 'inboundWebhook',
  sourceNodeName: 'trigger-abc123',
  type: 'string',
  value: '+15551234567',
  isNested: true
}

// Generated expression
{{ $("trigger-abc123").item.json.body.contact.phoneNumber }}
```

---

## 🎯 Key Patterns

### Pattern 1: Recursive Field Extraction

**Handles nested objects:**

```typescript
const payload = {
  user: {
    profile: {
      name: "John"
    }
  }
};

// Extracts:
// - user (object)
// - user.profile (object)
// - user.profile.name (string)
```

### Pattern 2: Array Handling

**Includes first element path:**

```typescript
const payload = {
  tags: ["lead", "website"]
};

// Extracts:
// - tags (array)
// - tags[0] (string) ← First element path
```

**For array of objects:**

```typescript
const payload = {
  contacts: [
    { id: "1", name: "John" },
    { id: "2", name: "Jane" }
  ]
};

// Extracts:
// - contacts (array)
// - contacts[0] (object)
// - contacts[0].id (string)
// - contacts[0].name (string)
```

### Pattern 3: Expression with .body Wrapper

**Why .body?** n8n webhook nodes wrap payloads:

```javascript
// n8n webhook node output structure
{
  json: {
    body: {
      // ← User's payload here
      from: "+1555",
      message: "Hello"
    },
    headers: { ... },
    query: { ... }
  }
}
```

**Expression must include `.body`:**

```javascript
// ✅ CORRECT
{{ $("trigger-123").item.json.body.from }}

// ❌ WRONG - Missing .body
{{ $("trigger-123").item.json.from }}
```

---

## 🧪 Testing

### Test 1: Send Test Webhook

```bash
curl -X POST https://n8n.pulseline.io/webhook-test/uuid-123 \
  -H "Content-Type: application/json" \
  -d '{
    "from": "+15551234567",
    "body": "Test message",
    "contact": {
      "contactId": "con_123",
      "name": "John Doe",
      "tags": ["lead"]
    }
  }'
```

**Verify:** Event appears in Firestore `triggerTests/uuid-123`

### Test 2: Extract Fields

```typescript
const payload = {
  from: "+15551234567",
  body: "Test",
  contact: { name: "John" }
};

const fields = defineFieldsFromJson(payload);
console.log(fields);

// Expected: 5 fields
// - body (string)
// - contact (object)
// - contact.name (string)
// - from (string)
```

### Test 3: Set Mapping

```bash
curl -X POST http://localhost:8000/api/workflows/wf_123/set-field-mapping \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"testId":"uuid-123"}'
```

**Verify:** Firestore `triggerTests/main` has `availableFields` array

### Test 4: Frontend Load

```typescript
// Check fields loaded
console.log('Available fields:', availableFields.length);
console.log('Webhook fields:', availableFields.filter(f => f.group === 'inboundWebhook'));

// Check sourceNodeName added
console.log('All have sourceNodeName:', availableFields.every(f => f.sourceNodeName));
```

### Test 5: Expression Generation

```typescript
const field = {
  path: 'contact.phoneNumber',
  group: 'inboundWebhook',
  sourceNodeName: 'trigger-123'
};

const expr = `={{ $("${field.sourceNodeName}").item.json.body.${field.path} }}`;
console.log(expr);
// Expected: {{ $("trigger-123").item.json.body.contact.phoneNumber }}
```

### Test 6: Runtime Validation

Test in n8n workflow:

```javascript
// In n8n Code node, verify expression works
const phoneNumber = $("trigger-123").item.json.body.contact.phoneNumber;
console.log(phoneNumber); // Should output: +15551234567
```

---

## 🐛 Common Issues

### Issue 1: "No fields available"

**Cause:** Test webhook not captured or mapping not set.

**Debug:**

```typescript
// Check Firestore
tenants/{tenantId}/workflows/{workflowId}/triggerTests/
  - main document exists?
  - main.availableFields is array?
  - array has items?
```

**Fix:** Send test webhook, select event, click "Set Field Mapping"

### Issue 2: "Expression doesn't work in n8n"

**Cause:** Missing `.body` in expression.

**Debug:**

```javascript
// Check webhook node output structure
console.log($("trigger-123").item.json);
// Should have .body property
```

**Fix:** Ensure expression uses `.body`:
```javascript
$("trigger-123").item.json.body.fieldPath
```

### Issue 3: "Nested fields not extracted"

**Cause:** Object not recursively flattened.

**Debug:**

```typescript
const fields = defineFieldsFromJson({ user: { name: "John" } });
console.log(fields.map(f => f.path));
// Expected: ['user', 'user.name']
```

**Fix:** Ensure `flatten()` recursively processes objects.

### Issue 4: "sourceNodeName is undefined"

**Cause:** Frontend not adding node ID when loading.

**Fix:**

```typescript
// ❌ WRONG
fields.push(field);

// ✅ CORRECT
fields.push({
  ...field,
  sourceNodeName: triggerNodeId,
});
```

---

## 🔗 Related Patterns

- **[node-output-fields.md](./node-output-fields.md)** - Previous node output discovery
- **[../helpers/expression-builder.md](../helpers/expression-builder.md)** - Expression formats
- **[../examples/complete-mapping-example.md](../examples/complete-mapping-example.md)** - End-to-end example

---

## 📚 Related Documentation

- **[README.md](../README.md)** - Complete system overview
- **[QUICK-REFERENCE.md](../QUICK-REFERENCE.md)** - Code templates
- **[../nodeRegistry/README.md](../../nodeRegistry/README.md)** - Node configuration
- **[../transformationSystem/README.md](../../transformationSystem/README.md)** - Expression evaluation

---

**File Locations:**

- **Orchestration:** `workflows/services/setFieldMappingReference/index.ts:25-61`
- **Field Extraction:** `workflows/services/setFieldMappingReference/defineFieldsFromJson.ts:37-105`
- **Storage:** `workflows/services/setFieldMappingReference/setMainMapping.ts:21-47`
- **Frontend Load:** `frontend/app/automations/automationsEditor/components/NodeConfigPanel/index.tsx:200-238`
- **Expression Gen:** `NodeConfigPanel/NodeParameterRenderer.tsx:391-425`
