# Field Mapping & Reference System

> **Complete guide** to the field mapping and reference system that powers dynamic field selection in workflows

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Core Concepts](#core-concepts)
3. [System Architecture](#system-architecture)
4. [Field Sources](#field-sources)
5. [Field Definition Structure](#field-definition-structure)
6. [Expression Formats](#expression-formats)
7. [Data Flow](#data-flow)
8. [API Reference](#api-reference)
9. [Common Patterns](#common-patterns)
10. [Extending the System](#extending-the-system)
11. [Troubleshooting](#troubleshooting)

---

## Overview

The **Field Mapping & Reference System** enables users to reference dynamic data from webhook payloads and previous node outputs in their workflows.

### What it does

- ✅ Extracts fields from test webhook payloads automatically
- ✅ Discovers available fields from previous nodes in workflow graph
- ✅ Groups fields by source for organized display
- ✅ Generates correct n8n expressions for field references
- ✅ Provides autocomplete UI for field selection
- ✅ Supports nested objects and arrays

### Why it matters

Without this system, users would need to:
- ❌ Manually write complex n8n expressions
- ❌ Guess field names from payloads
- ❌ Remember output structure of previous nodes
- ❌ Handle expression format differences

With this system, users can:
- ✅ Click to insert field references
- ✅ See all available fields with types
- ✅ Get automatic expression generation
- ✅ View sample values from test payloads

---

## Core Concepts

### 1. Field Sources

The system supports **two independent sources** of fields:

#### A. Webhook Trigger Fields
- **Source:** Test webhook payloads sent to trigger node
- **Storage:** Firestore `triggerTests/main` document
- **Lifetime:** Persists until new test selected
- **Group:** `inboundWebhook`

#### B. Previous Node Outputs
- **Source:** Node configs' `successResponse.fields` definitions
- **Discovery:** Graph traversal finds all upstream nodes
- **Lifetime:** Dynamic, recalculated on each load
- **Group:** Node label (e.g., "Find Contact")

### 2. Field Definition

Every field has this structure:

```typescript
interface FieldDefinition {
  path: string;              // "contact.phoneNumber"
  displayName: string;       // "phoneNumber"
  group: string;             // "inboundWebhook" or node label
  type: string;              // "string", "number", etc.
  value: any;                // Sample value from test
  isNested: boolean;         // true for nested fields
  sourceNodeName?: string;   // Node ID for expressions
}
```

### 3. Expression Generation

The system generates different expressions based on field source:

**Webhook Field:**
```javascript
={{ $("trigger-abc123").item.json.body.phoneNumber }}
```

**Previous Node Field:**
```javascript
={{ $("node-def456").item.json.contactId }}
```

**Contact Context (Special):**
```javascript
{{$contact.phoneNumber}}
```

### 4. Field Grouping

Fields are organized by source in the UI:

```
📥 Webhook Payload (5 fields)
  ├─ phoneNumber (string)
  ├─ messageBody (string)
  └─ contact.name (string)

🔍 Find Contact (4 fields)
  ├─ contactId (string)
  ├─ email (string)
  └─ tags (array)

🔍 Create Opportunity (3 fields)
  ├─ opportunityId (string)
  ├─ pipelineId (string)
  └─ createdAt (string)
```

---

## System Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                       FIELD MAPPING SYSTEM                         │
└────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────┐  ┌─────────────────────────────────┐
│   WEBHOOK FIELDS SOURCE     │  │   NODE OUTPUT FIELDS SOURCE     │
├─────────────────────────────┤  ├─────────────────────────────────┤
│                             │  │                                 │
│  1. User sends test webhook │  │  1. Frontend analyzes workflow  │
│                             │  │     graph                       │
│  2. Backend receives at     │  │                                 │
│     special test URL        │  │  2. findPreviousNodes()         │
│                             │  │     discovers upstream nodes    │
│  3. Payload stored in       │  │                                 │
│     Firestore triggerTests  │  │  3. For each previous node:     │
│                             │  │     - Load node config          │
│  4. User selects test event │  │     - Extract successResponse   │
│     in UI                   │  │     - Create field definitions  │
│                             │  │                                 │
│  5. defineFieldsFromJson()  │  │  4. Group by node label         │
│     extracts all fields     │  │                                 │
│                             │  │  5. Merge with webhook fields   │
│  6. setMainMapping() stores │  │                                 │
│     to main document        │  │                                 │
│                             │  │                                 │
│  7. Frontend loads from     │  │                                 │
│     Firestore in real-time  │  │                                 │
└─────────────────────────────┘  └─────────────────────────────────┘
                 │                              │
                 └──────────────┬───────────────┘
                                │
                                ▼
         ┌──────────────────────────────────────────┐
         │       FRONTEND FIELD DISPLAY             │
         ├──────────────────────────────────────────┤
         │                                          │
         │  • groupFields() - Organize by source   │
         │  • FieldGroupDropdown - Display UI      │
         │  • insertFieldAtCursor() - Generate     │
         │    expression and insert                │
         │                                          │
         └──────────────────────────────────────────┘
                                │
                                ▼
         ┌──────────────────────────────────────────┐
         │       N8N EXPRESSION FORMATS             │
         ├──────────────────────────────────────────┤
         │                                          │
         │  Webhook:                                │
         │  $("nodeId").item.json.body.field        │
         │                                          │
         │  Node Output:                            │
         │  $("nodeId").item.json.field             │
         │                                          │
         │  Contact Context:                        │
         │  $contact.field                          │
         │                                          │
         └──────────────────────────────────────────┘
```

---

## Field Sources

### Source 1: Webhook Trigger Fields

**File:** `workflows/services/setFieldMappingReference/`

#### Extraction Process

**Step 1: Test Webhook Captured**

```
POST https://n8n.pulseline.io/webhook-test/uuid-123
{
  "from": "+15551234567",
  "body": "Hello",
  "contact": {
    "contactId": "con_123",
    "name": "John Doe",
    "phoneNumber": "+15551234567"
  }
}
```

**Step 2: User Selects Test Event**

Frontend calls: `POST /api/workflows/:workflowId/set-field-mapping`

**Step 3: Backend Extracts Fields**

**File:** `setFieldMappingReference/defineFieldsFromJson.ts:37-105`

```typescript
export function defineFieldsFromJson(payload: any): FieldDefinition[] {
  const fields: FieldDefinition[] = [];

  function flatten(obj: any, prefix: string = ''): void {
    for (const key in obj) {
      const value = obj[key];
      const path = prefix ? `${prefix}.${key}` : key;
      const type = getType(value);

      // Add field definition
      fields.push({
        path,                           // "contact.name"
        displayName: getDisplayName(path), // "name"
        group: 'inboundWebhook',
        type,
        value,
        isNested: prefix.length > 0,
      });

      // Recursively flatten objects
      if (type === 'object') {
        flatten(value, path);
      }

      // Handle arrays
      if (type === 'array' && value.length > 0) {
        flatten(value[0], `${path}[0]`);
      }
    }
  }

  flatten(payload);
  return fields.sort((a, b) => a.path.localeCompare(b.path));
}
```

**Result:**

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
    value: { contactId: 'con_123', ... },
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
    path: 'from',
    displayName: 'from',
    group: 'inboundWebhook',
    type: 'string',
    value: '+15551234567',
    isNested: false
  }
]
```

**Step 4: Store in Firestore**

**File:** `setFieldMappingReference/setMainMapping.ts:21-47`

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

  await mainDocRef.set({
    selectedTestId: testId,
    selectedPayload: payload,
    availableFields: availableFields,
    mappingUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
}
```

**Firestore Structure:**

```
tenants/{tenantId}/workflows/{workflowId}/triggerTests/
  ├─ main (metadata document)
  │   ├─ selectedTestId: "uuid-456"
  │   ├─ selectedPayload: {...}
  │   ├─ availableFields: [...]
  │   └─ mappingUpdatedAt: Timestamp
  │
  ├─ uuid-123 (test event 1)
  │   ├─ payload: {...}
  │   ├─ receivedAt: Timestamp
  │   └─ testUrl: "..."
  │
  └─ uuid-456 (test event 2)
      ├─ payload: {...}
      ├─ receivedAt: Timestamp
      └─ testUrl: "..."
```

---

### Source 2: Previous Node Outputs

**File:** `frontend/app/automations/automationsEditor/components/NodeConfigPanel/index.tsx:200-278`

#### Discovery Process

**Step 1: Graph Traversal**

**File:** `frontend/lib/workflowGraphUtils.ts:17-45`

```typescript
export function findPreviousNodes(
  targetNodeId: string,
  allNodes: Node[],
  allEdges: Edge[]
): Node[] {
  const previousNodeIds = new Set<string>();
  const visited = new Set<string>();

  function traverse(nodeId: string) {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);

    // Find all edges that point TO this node
    const incomingEdges = allEdges.filter(e => e.target === nodeId);

    incomingEdges.forEach(edge => {
      previousNodeIds.add(edge.source);
      traverse(edge.source); // Recursively find all upstream
    });
  }

  traverse(targetNodeId);
  return allNodes.filter(n => previousNodeIds.has(n.id));
}
```

**Example Workflow:**

```
┌─────────────┐
│  SMS Trigger│ (trigger-123)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│Find Contact │ (node-456)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│Add Tag      │ (node-789) ← Current node
└─────────────┘
```

**For node-789:**

```typescript
findPreviousNodes('node-789', allNodes, allEdges)
// Returns: [trigger-123, node-456]
```

**Step 2: Load Node Configs**

```typescript
for (const prevNode of previousNodes) {
  const config = await nodeRegistryApi.getNodeConfig(prevNode.data.nodeName);

  if (config.success && config.data._pulseline?.successResponse?.fields) {
    // Extract fields...
  }
}
```

**Step 3: Extract successResponse Fields**

**Example: Find Contact node config**

```typescript
_pulseline: {
  successResponse: {
    fields: [
      { name: 'contactId', type: 'string', description: 'Contact ID', required: true },
      { name: 'name', type: 'string', description: 'Contact name' },
      { name: 'phoneNumber', type: 'string', description: 'Phone number' },
      { name: 'email', type: 'string', description: 'Email address' },
      { name: 'tags', type: 'array', description: 'Contact tags' },
    ]
  }
}
```

**Step 4: Create Field Definitions**

```typescript
responseFields.forEach(field => {
  fields.push({
    path: field.name,              // "contactId"
    displayName: field.name,        // "contactId"
    group: prevNode.data.label,     // "Find Contact"
    sourceNodeName: prevNode.id,    // "node-456"
    type: field.type,               // "string"
    value: null,
    isNested: false,
  });
});
```

**Result:**

```typescript
[
  {
    path: 'contactId',
    displayName: 'contactId',
    group: 'Find Contact',
    sourceNodeName: 'node-456',
    type: 'string',
    value: null,
    isNested: false
  },
  {
    path: 'name',
    displayName: 'name',
    group: 'Find Contact',
    sourceNodeName: 'node-456',
    type: 'string',
    value: null,
    isNested: false
  },
  // ... more fields
]
```

---

## Field Definition Structure

```typescript
interface FieldDefinition {
  path: string;
  displayName: string;
  group: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'null';
  value: any;
  isNested: boolean;
  sourceNodeName?: string;
}
```

### Field Properties

| Property | Type | Purpose | Example |
|----------|------|---------|---------|
| `path` | `string` | Dot-notation field path | `"contact.phoneNumber"` |
| `displayName` | `string` | UI display label (last segment) | `"phoneNumber"` |
| `group` | `string` | Source identifier for grouping | `"inboundWebhook"` or `"Find Contact"` |
| `type` | `string` | Data type for validation | `"string"`, `"number"`, etc. |
| `value` | `any` | Sample value from test payload | `"+15551234567"` |
| `isNested` | `boolean` | Is this a nested field? | `true` for `contact.name` |
| `sourceNodeName` | `string?` | Node ID for expression generation | `"node-456"` |

### Examples

**Top-level webhook field:**

```typescript
{
  path: 'from',
  displayName: 'from',
  group: 'inboundWebhook',
  type: 'string',
  value: '+15551234567',
  isNested: false,
  sourceNodeName: 'trigger-123'
}
```

**Nested webhook field:**

```typescript
{
  path: 'contact.phoneNumber',
  displayName: 'phoneNumber',
  group: 'inboundWebhook',
  type: 'string',
  value: '+15551234567',
  isNested: true,
  sourceNodeName: 'trigger-123'
}
```

**Previous node output field:**

```typescript
{
  path: 'contactId',
  displayName: 'contactId',
  group: 'Find Contact',
  type: 'string',
  value: null,  // No sample value
  isNested: false,
  sourceNodeName: 'node-456'
}
```

---

## Expression Formats

### Format 1: Webhook Fields

**Pattern:** `={{ $("nodeId").item.json.body.fieldPath }}`

**Why `.body`?** Webhook payloads are wrapped in `.body` by n8n.

**File:** `frontend/app/automations/automationsEditor/components/NodeConfigPanel/NodeParameterRenderer.tsx:397-399`

```typescript
if (field.group === 'inboundWebhook') {
  expression = `={{ $("${field.sourceNodeName}").item.json.body.${field.path} }}`;
}
```

**Examples:**

```typescript
// Top-level field
{{ $("trigger-123").item.json.body.from }}

// Nested field
{{ $("trigger-123").item.json.body.contact.phoneNumber }}

// Array access
{{ $("trigger-123").item.json.body.tags[0] }}
```

### Format 2: Previous Node Outputs

**Pattern:** `={{ $("nodeId").item.json.fieldPath }}`

**Why no `.body`?** Node responses are at top level.

**File:** `NodeParameterRenderer.tsx:400-402`

```typescript
else {
  expression = `={{ $("${field.sourceNodeName}").item.json.${field.path} }}`;
}
```

**Examples:**

```typescript
// Previous node field
{{ $("node-456").item.json.contactId }}

// Another field
{{ $("node-456").item.json.email }}
```

### Format 3: Contact Context (Special)

**Pattern:** `{{$contact.fieldName}}`

**Purpose:** Reference current contact in workflow context.

**File:** `NodeParameterRenderer.tsx:427-428`

```typescript
const insertContactFieldAtCursor = (fieldName: string) => {
  const expression = `{{$contact.${fieldName}}}`;
  // ...
}
```

**Examples:**

```typescript
// Contact field reference
{{$contact.phoneNumber}}
{{$contact.name}}
{{$contact.email}}
```

---

## Data Flow

### Complete Flow: Test Webhook → Field Selection

```
1. USER SENDS TEST WEBHOOK
   POST https://n8n.pulseline.io/webhook-test/uuid-123
   { "from": "+15551234567", "body": "Hello", ... }

2. N8N CAPTURES PAYLOAD
   Stores in Firestore: triggerTests/uuid-123

3. USER SELECTS TEST EVENT IN UI
   Clicks event in dropdown

4. FRONTEND CALLS BACKEND
   POST /api/workflows/:workflowId/set-field-mapping
   { "testId": "uuid-123" }

5. BACKEND EXTRACTS FIELDS
   defineFieldsFromJson(payload)
   → [{ path: 'from', ... }, { path: 'body', ... }]

6. BACKEND STORES MAPPING
   setMainMapping() → Firestore triggerTests/main
   { availableFields: [...] }

7. FRONTEND LOADS WEBHOOK FIELDS
   Real-time listener on triggerTests/main
   → Webhook fields available

8. FRONTEND FINDS PREVIOUS NODES
   findPreviousNodes(nodeId, allNodes, allEdges)
   → [trigger-123, node-456]

9. FRONTEND LOADS NODE CONFIGS
   For each previous node:
   → Load config
   → Extract successResponse.fields
   → Create field definitions

10. FRONTEND GROUPS FIELDS
    groupFields(allFields)
    → Group by source (webhook, node labels)

11. USER OPENS FIELD DROPDOWN
    FieldGroupDropdown displays:
    📥 Webhook Payload (5)
    🔍 Find Contact (4)

12. USER SELECTS FIELD
    Click on "phoneNumber" from Webhook Payload

13. FRONTEND GENERATES EXPRESSION
    insertFieldAtCursor(field)
    → {{ $("trigger-123").item.json.body.phoneNumber }}

14. EXPRESSION INSERTED AT CURSOR
    User's input now contains field reference
```

---

## API Reference

### Backend Services

#### setFieldMappingReference()

**File:** `workflows/services/setFieldMappingReference/index.ts:25-61`

```typescript
export async function setFieldMappingReference(
  tenantId: string,
  workflowId: string,
  testId: string
): Promise<SetFieldMappingResult>
```

**Parameters:**
- `tenantId` - Tenant ID
- `workflowId` - Workflow ID
- `testId` - UUID of selected test event

**Returns:**
```typescript
{
  success: boolean;
  testId: string;
  fieldsCount: number;
  availableFields: FieldDefinition[];
}
```

**Flow:**
1. Fetch test payload from Firestore
2. Extract fields using `defineFieldsFromJson()`
3. Store mapping using `setMainMapping()`

#### defineFieldsFromJson()

**File:** `workflows/services/setFieldMappingReference/defineFieldsFromJson.ts:37-105`

```typescript
export function defineFieldsFromJson(payload: any): FieldDefinition[]
```

**Algorithm:**
- Recursively flattens JSON object
- Creates dot-notation paths
- Handles nested objects
- Handles arrays (includes `[0]` element path)
- Sorts alphabetically

**Example:**

```typescript
const payload = {
  name: "John",
  contact: {
    phone: "+1555"
  }
};

defineFieldsFromJson(payload);
// Returns:
[
  { path: 'contact', displayName: 'contact', type: 'object', ... },
  { path: 'contact.phone', displayName: 'phone', type: 'string', ... },
  { path: 'name', displayName: 'name', type: 'string', ... }
]
```

### Frontend Functions

#### findPreviousNodes()

**File:** `frontend/lib/workflowGraphUtils.ts:17-45`

```typescript
export function findPreviousNodes(
  targetNodeId: string,
  allNodes: Node[],
  allEdges: Edge[]
): Node[]
```

**Returns:** All nodes that execute before target node.

#### groupFields()

**File:** `frontend/lib/fieldGroupConfig.ts:53-99`

```typescript
export function groupFields(fields: FieldDefinition[]): GroupedFields[]
```

**Returns:** Fields organized by source group.

#### insertFieldAtCursor()

**File:** `NodeConfigPanel/NodeParameterRenderer.tsx:391-425`

```typescript
const insertFieldAtCursor = (field: FieldDefinition) => {
  // Generate expression based on field source
  // Insert at cursor position
  // Update input value
}
```

---

## Common Patterns

### Pattern 1: Add successResponse to Node

**When:** Creating a new action node that returns data.

**File:** `nodeRegistry/nodes/pulseline/findContact.config.ts`

```typescript
export const findContactNode: INodeTypeDescription = {
  displayName: 'Find Contact',
  name: 'pulselineFindContact',
  // ...
  _pulseline: {
    transformationMethod: 'contact_find',
    apiEndpoint: '/api/contacts/find',
    httpMethod: 'POST',
    requiresAuth: true,

    // ✅ Define response structure
    successResponse: {
      fields: [
        { name: 'contactId', type: 'string', description: 'Contact ID', required: true },
        { name: 'name', type: 'string', description: 'Contact name' },
        { name: 'phoneNumber', type: 'string', description: 'Phone number' },
        { name: 'email', type: 'string', description: 'Email address' },
        { name: 'tags', type: 'array', description: 'Contact tags' },
        { name: 'customFields', type: 'object', description: 'Custom fields' },
      ]
    }
  },
  properties: [...]
};
```

### Pattern 2: Load Webhook Fields in Frontend

**File:** `NodeConfigPanel/index.tsx:200-238`

```typescript
useEffect(() => {
  async function loadWebhookFields() {
    const mainDocRef = doc(
      db,
      'tenants',
      currentTenantId,
      'workflows',
      workflowId,
      'triggerTests',
      'main'
    );

    const mainDoc = await getDoc(mainDocRef);
    if (mainDoc.exists()) {
      const data = mainDoc.data();
      if (data.availableFields) {
        // Add sourceNodeName for expressions
        data.availableFields.forEach((field: FieldDefinition) => {
          fields.push({
            ...field,
            sourceNodeName: triggerNodeId,
          });
        });
      }
    }
  }

  loadWebhookFields();
}, [workflowId, currentTenantId]);
```

### Pattern 3: Display Fields with Grouping

**File:** `NodeConfigPanel/FieldGroupDropdown.tsx:12-108`

```typescript
export function FieldGroupDropdown({ fields, onSelectField }: Props) {
  const groupedFields = groupFields(fields);

  return (
    <div>
      {groupedFields.map(({ group, fields: groupFields }) => (
        <div key={group.name}>
          {/* Group Header */}
          <button onClick={() => toggleGroup(group.name)}>
            <span>{group.icon}</span>
            <div>{group.displayName}</div>
            <span>{groupFields.length}</span>
          </button>

          {/* Group Fields */}
          {isExpanded && (
            <div>
              {groupFields.map((field) => (
                <button onClick={() => onSelectField(field)}>
                  <div>{field.displayName}</div>
                  <div>{field.path}</div>
                  <div>{field.type}</div>
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

---

## Extending the System

### Add New Field Source

**1. Create extraction logic** (if needed)

**2. Store fields in accessible location**

**3. Load in frontend:**

```typescript
// In NodeConfigPanel/index.tsx
const [availableFields, setAvailableFields] = useState<FieldDefinition[]>([]);

useEffect(() => {
  async function loadNewSource() {
    // Fetch fields from new source
    const newFields: FieldDefinition[] = [...];

    // Add to existing fields
    setAvailableFields(prev => [...prev, ...newFields]);
  }

  loadNewSource();
}, [dependencies]);
```

**4. Add group config** (if needed):

```typescript
// In frontend/lib/fieldGroupConfig.ts
export const FIELD_GROUP_CONFIG: GroupConfig[] = [
  // Existing groups...
  {
    name: 'myNewSource',
    displayName: 'My New Source',
    icon: '🆕',
    priority: 3,
    description: 'Fields from my new source',
  },
];
```

**5. Handle expression format:**

```typescript
// In NodeParameterRenderer.tsx insertFieldAtCursor()
if (field.group === 'myNewSource') {
  expression = `={{$myNewSource.${field.path}}}`;
}
```

### Add New Expression Format

**1. Identify pattern:**

```typescript
// Example: Workflow variables
{{$vars.myVariable}}
```

**2. Create field source:**

```typescript
const workflowVariables: FieldDefinition[] = [
  {
    path: 'myVariable',
    displayName: 'My Variable',
    group: 'workflowVariables',
    type: 'string',
    value: null,
    isNested: false,
    sourceNodeName: undefined, // Special handling
  }
];
```

**3. Add expression logic:**

```typescript
const insertFieldAtCursor = (field: FieldDefinition) => {
  let expression: string;

  if (field.group === 'workflowVariables') {
    expression = `={{$vars.${field.path}}}`;
  } else if (field.group === 'inboundWebhook') {
    expression = `={{ $("${field.sourceNodeName}").item.json.body.${field.path} }}`;
  } else {
    expression = `={{ $("${field.sourceNodeName}").item.json.${field.path} }}`;
  }

  // Insert logic...
}
```

---

## Troubleshooting

### Issue: "No fields available"

**Cause:** Test webhook not captured or mapping not set.

**Fix:**
1. Send test webhook to test URL
2. Select test event in UI
3. Click "Set Field Mapping" button

**Verify:**
```typescript
// Check Firestore
tenants/{tenantId}/workflows/{workflowId}/triggerTests/main
// Should have: availableFields array
```

### Issue: "sourceNodeName is undefined"

**Cause:** Field loaded without node reference.

**Fix:** Ensure sourceNodeName added when loading:

```typescript
fields.push({
  ...field,
  sourceNodeName: triggerNodeId, // ✅ Add this
});
```

### Issue: "Expression not working in n8n"

**Cause:** Wrong expression format for field source.

**Debug:**
```typescript
// Webhook field - needs .body
❌ {{ $("trigger-123").item.json.phoneNumber }}
✅ {{ $("trigger-123").item.json.body.phoneNumber }}

// Node output - no .body
❌ {{ $("node-456").item.json.body.contactId }}
✅ {{ $("node-456").item.json.contactId }}
```

### Issue: "Previous nodes not found"

**Cause:** Graph traversal issue or no incoming edges.

**Debug:**
```typescript
const previousNodes = findPreviousNodes(nodeId, allNodes, allEdges);
console.log('Previous nodes:', previousNodes);
console.log('Incoming edges:', allEdges.filter(e => e.target === nodeId));
```

**Fix:** Ensure edges exist connecting nodes.

---

## Related Documentation

- **[patterns/webhook-fields.md](./patterns/webhook-fields.md)** - Webhook field extraction deep dive
- **[patterns/node-output-fields.md](./patterns/node-output-fields.md)** - Node output discovery
- **[helpers/expression-builder.md](./helpers/expression-builder.md)** - Expression format reference
- **[examples/complete-mapping-example.md](./examples/complete-mapping-example.md)** - End-to-end example
- **[../nodeRegistry/README.md](../nodeRegistry/README.md)** - Node configuration (successResponse)
- **[../transformationSystem/README.md](../transformationSystem/README.md)** - Expression evaluation

---

**Next:** See [QUICK-REFERENCE.md](./QUICK-REFERENCE.md) for code templates and decision trees.
