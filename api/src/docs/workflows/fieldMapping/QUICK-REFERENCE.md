# Field Mapping - Quick Reference

> **Code templates and decision trees** for common field mapping tasks

---

## 📋 Quick Navigation

- [Field Definition Template](#field-definition-template)
- [Expression Format Templates](#expression-format-templates)
- [Backend: Extract Webhook Fields](#backend-extract-webhook-fields)
- [Backend: Store Field Mapping](#backend-store-field-mapping)
- [Frontend: Load Webhook Fields](#frontend-load-webhook-fields)
- [Frontend: Discover Node Outputs](#frontend-discover-node-outputs)
- [Frontend: Group and Display](#frontend-group-and-display)
- [Frontend: Insert Field Expression](#frontend-insert-field-expression)
- [Node Config: Add successResponse](#node-config-add-successresponse)
- [Decision Trees](#decision-trees)
- [Common Mistakes](#common-mistakes)

---

## Field Definition Template

```typescript
interface FieldDefinition {
  path: string;              // "contact.phoneNumber"
  displayName: string;       // "phoneNumber"
  group: string;             // "inboundWebhook" or node label
  type: string;              // "string", "number", "boolean", "array", "object"
  value: any;                // Sample value from test (or null)
  isNested: boolean;         // true if contains dot
  sourceNodeName?: string;   // Node ID for n8n expressions
}
```

**Example:**

```typescript
const field: FieldDefinition = {
  path: 'contact.phoneNumber',
  displayName: 'phoneNumber',
  group: 'inboundWebhook',
  type: 'string',
  value: '+15551234567',
  isNested: true,
  sourceNodeName: 'trigger-123'
};
```

---

## Expression Format Templates

### Webhook Field Expression

```typescript
// Pattern
`={{ $("${nodeId}").item.json.body.${fieldPath} }}`

// Example
`={{ $("trigger-abc123").item.json.body.phoneNumber }}`
`={{ $("trigger-abc123").item.json.body.contact.name }}`
```

### Previous Node Output Expression

```typescript
// Pattern
`={{ $("${nodeId}").item.json.${fieldPath} }}`

// Example
`={{ $("node-def456").item.json.contactId }}`
`={{ $("node-def456").item.json.email }}`
```

### Contact Context Expression

```typescript
// Pattern
`{{$contact.${fieldName}}}`

// Example
`{{$contact.phoneNumber}}`
`{{$contact.name}}`
`{{$contact.email}}`
```

---

## Backend: Extract Webhook Fields

**File:** `workflows/services/setFieldMappingReference/defineFieldsFromJson.ts`

```typescript
export function defineFieldsFromJson(payload: any): FieldDefinition[] {
  const fields: FieldDefinition[] = [];

  function getType(value: any): FieldDefinition['type'] {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'object') return 'object';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    return 'string';
  }

  function getDisplayName(path: string): string {
    const cleanPath = path.replace(/\[\d+\]/g, '');
    const segments = cleanPath.split('.');
    return segments[segments.length - 1];
  }

  function flatten(obj: any, prefix: string = ''): void {
    for (const key in obj) {
      if (!obj.hasOwnProperty(key)) continue;

      const value = obj[key];
      const path = prefix ? `${prefix}.${key}` : key;
      const type = getType(value);
      const isNested = prefix.length > 0;

      // Add field definition
      fields.push({
        path,
        displayName: getDisplayName(path),
        group: 'inboundWebhook',
        type,
        value,
        isNested,
      });

      // Recursively flatten objects
      if (type === 'object' && value !== null) {
        flatten(value, path);
      }

      // Handle arrays
      if (type === 'array' && value.length > 0) {
        const firstElement = value[0];
        if (typeof firstElement === 'object' && firstElement !== null) {
          flatten(firstElement, `${path}[0]`);
        } else {
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
  return fields.sort((a, b) => a.path.localeCompare(b.path));
}
```

**Usage:**

```typescript
const payload = {
  from: '+15551234567',
  body: 'Hello',
  contact: {
    contactId: 'con_123',
    name: 'John Doe'
  }
};

const fields = defineFieldsFromJson(payload);
// Returns: Array of FieldDefinition objects
```

---

## Backend: Store Field Mapping

**File:** `workflows/services/setFieldMappingReference/setMainMapping.ts`

```typescript
import admin from 'firebase-admin';
import { FieldDefinition } from './defineFieldsFromJson';

const db = admin.firestore();

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
    { merge: true }
  );
}
```

**Usage:**

```typescript
const result = await setFieldMappingReference(tenantId, workflowId, testId);
// Extracts fields + stores in Firestore
```

---

## Frontend: Load Webhook Fields

**File:** `frontend/app/automations/automationsEditor/components/NodeConfigPanel/index.tsx`

```typescript
import { collection, query, orderBy, limit, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';

const [availableFields, setAvailableFields] = useState<FieldDefinition[]>([]);

useEffect(() => {
  async function loadWebhookFields() {
    if (!user || !workflowId || !currentTenantId) return;

    const fields: FieldDefinition[] = [];

    // Find trigger node ID
    const triggerNode = allNodes.find(n => n.type === 'trigger');
    const triggerNodeId = triggerNode?.id;

    // Load webhook fields from Firestore
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
        data.availableFields.forEach((field: FieldDefinition) => {
          fields.push({
            ...field,
            sourceNodeName: triggerNodeId, // Add node ID
          });
        });
      }
    }

    setAvailableFields(fields);
  }

  loadWebhookFields();
}, [user, workflowId, currentTenantId, allNodes]);
```

---

## Frontend: Discover Node Outputs

**File:** `frontend/app/automations/automationsEditor/components/NodeConfigPanel/index.tsx`

```typescript
import { nodeRegistryApi } from '@/lib/api/nodeRegistry';
import { findPreviousNodes } from '@/lib/workflowGraphUtils';

useEffect(() => {
  async function loadNodeOutputFields() {
    if (!user || !workflowId || nodeType === 'trigger') return;

    const fields: FieldDefinition[] = [];

    // 1. Find all previous nodes
    const previousNodes = findPreviousNodes(nodeId, allNodes, allEdges);
    console.log('Previous nodes:', previousNodes);

    // 2. For each previous node, load config and extract fields
    for (const prevNode of previousNodes) {
      try {
        const config = await nodeRegistryApi.getNodeConfig(prevNode.data.nodeName as string);

        if (config.success && config.data._pulseline?.successResponse?.fields) {
          const responseFields = config.data._pulseline.successResponse.fields;

          responseFields.forEach(field => {
            fields.push({
              path: field.name,
              displayName: field.name,
              group: prevNode.data.label as string,  // Node label for display
              sourceNodeName: prevNode.id,           // Node ID for expressions
              type: field.type,
              value: null,
              isNested: false,
            });
          });
        }
      } catch (error) {
        console.error(`Error loading config for ${prevNode.data.nodeName}:`, error);
      }
    }

    // 3. Merge with webhook fields
    setAvailableFields(prev => [...prev, ...fields]);
  }

  loadNodeOutputFields();
}, [user, workflowId, nodeType, nodeId, allNodes, allEdges]);
```

---

## Frontend: Group and Display

**File:** `frontend/lib/fieldGroupConfig.ts`

```typescript
export interface GroupedFields {
  group: GroupConfig;
  fields: FieldDefinition[];
}

export function groupFields(fields: FieldDefinition[]): GroupedFields[] {
  const fieldsByGroup = new Map<string, FieldDefinition[]>();
  const dynamicGroups = new Map<string, GroupConfig>();

  // 1. Group fields by their group property
  fields.forEach((field) => {
    const groupName = field.group || 'root';
    if (!fieldsByGroup.has(groupName)) {
      fieldsByGroup.set(groupName, []);
    }
    fieldsByGroup.get(groupName)!.push(field);

    // 2. Create dynamic group config if not static
    if (!FIELD_GROUP_CONFIG.find(g => g.name === groupName)) {
      if (!dynamicGroups.has(groupName)) {
        dynamicGroups.set(groupName, {
          name: groupName,
          displayName: groupName,
          icon: '🔍',
          priority: 2,
          description: `Output from ${groupName} node`,
        });
      }
    }
  });

  // 3. Merge static + dynamic groups
  const allGroups = [
    ...FIELD_GROUP_CONFIG,
    ...Array.from(dynamicGroups.values())
  ];

  // 4. Build grouped structure
  const grouped: GroupedFields[] = [];
  allGroups.forEach((groupConfig) => {
    const fieldsInGroup = fieldsByGroup.get(groupConfig.name);
    if (fieldsInGroup && fieldsInGroup.length > 0) {
      grouped.push({
        group: groupConfig,
        fields: fieldsInGroup.sort((a, b) => a.displayName.localeCompare(b.displayName)),
      });
    }
  });

  // 5. Sort by priority
  return grouped.sort((a, b) => a.group.priority - b.group.priority);
}
```

**Component:**

```typescript
import { FieldGroupDropdown } from './FieldGroupDropdown';

<FieldGroupDropdown
  fields={availableFields}
  onSelectField={insertFieldAtCursor}
/>
```

---

## Frontend: Insert Field Expression

**File:** `frontend/app/automations/automationsEditor/components/NodeConfigPanel/NodeParameterRenderer.tsx`

```typescript
const insertFieldAtCursor = (field: FieldDefinition) => {
  let expression: string;

  // 1. Determine expression format based on field source
  if (!field?.sourceNodeName) {
    // Fallback (shouldn't happen)
    expression = `{{$json.${field.path}}}`;
  } else if (field.group === 'inboundWebhook') {
    // Webhook trigger - needs .body wrapper
    expression = `={{ $("${field.sourceNodeName}").item.json.body.${field.path} }}`;
  } else {
    // Previous node output - no .body
    expression = `={{ $("${field.sourceNodeName}").item.json.${field.path} }}`;
  }

  // 2. Insert at cursor position
  if (inputRef) {
    const start = inputRef.selectionStart || 0;
    const end = inputRef.selectionEnd || 0;
    const currentValue = value || '';
    const newValue = currentValue.substring(0, start) + expression + currentValue.substring(end);
    onChange(property.name, newValue);

    // 3. Set cursor position after insertion
    setTimeout(() => {
      inputRef.focus();
      const newPosition = start + expression.length;
      inputRef.setSelectionRange(newPosition, newPosition);
    }, 0);
  } else {
    // No cursor position, just append
    const newValue = (value || '') + expression;
    onChange(property.name, newValue);
  }

  setShowFieldMenu(false);
};
```

---

## Node Config: Add successResponse

**File:** `workflows/services/nodeRegistry/nodes/pulseline/findContact.config.ts`

```typescript
import { INodeTypeDescription } from '../../types';

export const findContactNode: INodeTypeDescription = {
  displayName: 'Find Contact',
  name: 'pulselineFindContact',
  icon: 'fa:search',
  group: ['contactManagement'],
  version: 1,
  description: 'Find a contact by phone or email',

  defaults: {
    name: 'Find Contact',
    color: '#00d4ff',
  },

  inputs: ['main'],
  outputs: ['main'],

  _pulseline: {
    isCustomNode: true,
    transformationMethod: 'contact_find',
    apiEndpoint: '/api/contacts/find',
    httpMethod: 'POST',
    requiresAuth: true,

    // ✅ Define output fields for field mapping
    successResponse: {
      fields: [
        {
          name: 'contactId',
          type: 'string',
          description: 'Unique contact identifier',
          required: true
        },
        {
          name: 'name',
          type: 'string',
          description: 'Contact full name'
        },
        {
          name: 'phoneNumber',
          type: 'string',
          description: 'Contact phone number'
        },
        {
          name: 'email',
          type: 'string',
          description: 'Contact email address'
        },
        {
          name: 'tags',
          type: 'array',
          description: 'List of contact tags'
        },
        {
          name: 'customFields',
          type: 'object',
          description: 'Custom field values'
        },
        {
          name: 'createdAt',
          type: 'string',
          description: 'Contact creation timestamp'
        }
      ]
    }
  },

  properties: [
    // ... node properties
  ]
};
```

---

## Decision Trees

### Tree 1: Which Expression Format?

```
Is this a webhook trigger field?
├─ YES → Use .body format
│         {{ $("nodeId").item.json.body.fieldPath }}
│
└─ NO → Is this from a previous node?
    ├─ YES → Use direct format
    │         {{ $("nodeId").item.json.fieldPath }}
    │
    └─ NO → Is this contact context?
        ├─ YES → Use $contact format
        │         {{$contact.fieldName}}
        │
        └─ NO → Error: Unknown field source
```

### Tree 2: Where Are Fields Coming From?

```
What fields are available?
├─ Webhook trigger exists?
│  ├─ YES → Check Firestore triggerTests/main
│  │        ├─ Has availableFields? → Load webhook fields
│  │        └─ No availableFields? → User needs to select test
│  └─ NO → Skip webhook fields
│
└─ Previous nodes exist?
   ├─ YES → For each previous node:
   │        ├─ Load node config
   │        ├─ Check _pulseline.successResponse
   │        │  ├─ Has fields? → Add to available fields
   │        │  └─ No fields? → Skip this node
   │        └─ Next node
   └─ NO → No node output fields
```

### Tree 3: How to Display Fields?

```
Field display strategy:
├─ Group fields by source
│  ├─ "inboundWebhook" → 📥 Webhook Payload
│  └─ Node labels → 🔍 [Node Name]
│
├─ Sort groups by priority
│  ├─ Priority 1: Static groups (webhook)
│  └─ Priority 2: Dynamic groups (nodes)
│
└─ Within each group:
   ├─ Sort fields alphabetically
   └─ Show: displayName, path, type, value
```

---

## Common Mistakes

### ❌ Mistake 1: Wrong Expression Format for Webhook

```typescript
// ❌ WRONG - Missing .body
{{ $("trigger-123").item.json.phoneNumber }}

// ✅ CORRECT - Has .body
{{ $("trigger-123").item.json.body.phoneNumber }}
```

**Why:** Webhook payloads are wrapped in `.body` by n8n.

---

### ❌ Mistake 2: Wrong Expression Format for Node Output

```typescript
// ❌ WRONG - Has .body (shouldn't)
{{ $("node-456").item.json.body.contactId }}

// ✅ CORRECT - No .body
{{ $("node-456").item.json.contactId }}
```

**Why:** Node outputs are at top level, not wrapped.

---

### ❌ Mistake 3: Missing sourceNodeName

```typescript
// ❌ WRONG - Can't generate expression without node ID
const field: FieldDefinition = {
  path: 'phoneNumber',
  displayName: 'phoneNumber',
  group: 'inboundWebhook',
  type: 'string',
  value: '+1555',
  isNested: false,
  // sourceNodeName missing!
};

// ✅ CORRECT - Has sourceNodeName
const field: FieldDefinition = {
  path: 'phoneNumber',
  displayName: 'phoneNumber',
  group: 'inboundWebhook',
  type: 'string',
  value: '+1555',
  isNested: false,
  sourceNodeName: 'trigger-123', // ✅ Required for expressions
};
```

---

### ❌ Mistake 4: Not Merging Webhook + Node Fields

```typescript
// ❌ WRONG - Overwriting instead of merging
setAvailableFields(nodeOutputFields); // Lost webhook fields!

// ✅ CORRECT - Merge arrays
setAvailableFields(prev => [...prev, ...nodeOutputFields]);
```

---

### ❌ Mistake 5: Forgetting to Add successResponse

```typescript
// ❌ WRONG - Node has no output definition
_pulseline: {
  transformationMethod: 'contact_find',
  apiEndpoint: '/api/contacts/find',
  // successResponse missing!
}

// ✅ CORRECT - Define output structure
_pulseline: {
  transformationMethod: 'contact_find',
  apiEndpoint: '/api/contacts/find',
  successResponse: {
    fields: [
      { name: 'contactId', type: 'string', required: true },
      { name: 'name', type: 'string' },
    ]
  }
}
```

---

## Quick Commands

### Test Field Extraction

```bash
# Send test webhook
curl -X POST https://n8n.pulseline.io/webhook-test/uuid-123 \
  -H "Content-Type: application/json" \
  -d '{"from":"+1555","body":"Test","contact":{"name":"John"}}'

# Set field mapping
curl -X POST http://localhost:8000/api/workflows/wf_123/set-field-mapping \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"testId":"uuid-123"}'
```

### Check Firestore Mapping

```javascript
// Firebase Console or client
const mainDoc = await db
  .collection('tenants').doc(tenantId)
  .collection('workflows').doc(workflowId)
  .collection('triggerTests').doc('main')
  .get();

console.log('Available fields:', mainDoc.data().availableFields);
```

### Debug Field Loading

```typescript
// In NodeConfigPanel
console.log('Webhook fields:', availableFields.filter(f => f.group === 'inboundWebhook'));
console.log('Node output fields:', availableFields.filter(f => f.group !== 'inboundWebhook'));
console.log('Previous nodes found:', previousNodes.length);
```

---

## Testing Checklist

### Webhook Fields

- [ ] Test webhook sent to test URL
- [ ] Test event appears in dropdown
- [ ] User selects test event
- [ ] "Set Field Mapping" button clicked
- [ ] Firestore `main` document has `availableFields`
- [ ] Frontend loads fields from Firestore
- [ ] Fields appear in dropdown under "Webhook Payload"
- [ ] Selecting field inserts correct expression with `.body`

### Node Output Fields

- [ ] Workflow has previous nodes
- [ ] Previous nodes have `successResponse.fields` defined
- [ ] `findPreviousNodes()` discovers all upstream nodes
- [ ] Node configs loaded successfully
- [ ] Fields extracted from `successResponse`
- [ ] Fields appear in dropdown under node labels
- [ ] Selecting field inserts correct expression without `.body`

### Expression Insertion

- [ ] Cursor position maintained after insertion
- [ ] Expression has correct format for source
- [ ] Multiple insertions work correctly
- [ ] Expressions work in n8n runtime

---

## Related Documentation

- **[README.md](./README.md)** - Complete system overview
- **[patterns/webhook-fields.md](./patterns/webhook-fields.md)** - Webhook field deep dive
- **[patterns/node-output-fields.md](./patterns/node-output-fields.md)** - Node output deep dive
- **[helpers/expression-builder.md](./helpers/expression-builder.md)** - Expression formats
- **[examples/complete-mapping-example.md](./examples/complete-mapping-example.md)** - End-to-end example

---

**Need more detail?** See the full [README.md](./README.md) for architecture and concepts.
