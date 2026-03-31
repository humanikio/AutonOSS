# Pattern: Node Output Field Discovery

> **Deep dive** on discovering and mapping fields from previous node outputs

---

## 📋 Overview

This pattern enables automatic discovery of available fields from previous nodes in a workflow, allowing users to reference outputs without knowing the exact structure.

### What it does

1. ✅ Traverses workflow graph to find all upstream nodes
2. ✅ Loads node configs for each previous node
3. ✅ Extracts `successResponse.fields` definitions
4. ✅ Creates field definitions grouped by node
5. ✅ Generates correct n8n expressions (no `.body`)

### Why it matters

Without this pattern:
- ❌ Users must manually look up node response structures
- ❌ No visibility into available output fields
- ❌ Must write complex node reference expressions
- ❌ Errors from wrong field names

With this pattern:
- ✅ Automatic field discovery from graph
- ✅ Visual field selection by node
- ✅ Type information available
- ✅ One-click expression insertion
- ✅ Always references correct upstream nodes

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│             NODE OUTPUT FIELD PATTERN                       │
└─────────────────────────────────────────────────────────────┘

1. GRAPH ANALYSIS
   ┌──────────────────────────────────────────┐
   │ User opens node config panel             │
   │ → Current node: "Add Tag" (node-789)    │
   └──────────────────┬───────────────────────┘
                      │
                      ▼
   ┌──────────────────────────────────────────┐
   │ findPreviousNodes(node-789, graph)       │
   │ → Traverse edges backwards               │
   │ → Discover all upstream nodes            │
   │ → Returns: [trigger-123, node-456]       │
   └──────────────────┬───────────────────────┘
                      │
2. LOAD NODE CONFIGS                          │
   ┌──────────────────────────────────────────┘
   │ For each previous node:
   │   GET /api/workflows/nodes/:nodeName
   │   → Load INodeTypeDescription
   └──────────────────┬───────────────────────┐
                      │
                      ▼
   ┌──────────────────────────────────────────┐
   │ Check for successResponse definition     │
   │ node._pulseline.successResponse?.fields  │
   └──────────────────┬───────────────────────┘
                      │
3. EXTRACT FIELDS                             │
   ┌──────────────────────────────────────────┘
   │ For each successResponse.field:
   │   Create FieldDefinition:
   │     - path: field.name
   │     - displayName: field.name
   │     - group: node.data.label
   │     - sourceNodeName: node.id
   │     - type: field.type
   └──────────────────┬───────────────────────┐
                      │
4. GROUP AND DISPLAY                          │
   ┌──────────────────────────────────────────┘
   │ groupFields(allFields)
   │ → Group by node label
   │ → Display in FieldGroupDropdown
   │   🔍 Find Contact (4 fields)
   │   🔍 Create Opportunity (3 fields)
   └──────────────────┬───────────────────────┐
                      │
5. GENERATE EXPRESSION                        │
   ┌──────────────────────────────────────────┘
   │ User selects field
   │ → {{ $("node-456").item.json.contactId }}
   │ → No .body wrapper (node output)
   └─────────────────────────────────────────┘
```

---

## 🔧 Implementation

### Step 1: Graph Traversal

**File:** `frontend/lib/workflowGraphUtils.ts:17-45`

```typescript
/**
 * Finds all nodes that come before a target node in the workflow execution path
 * Uses recursive depth-first search to traverse backwards through the graph
 */
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

    // Find all edges that point TO this node (incoming edges)
    const incomingEdges = allEdges.filter(e => e.target === nodeId);

    incomingEdges.forEach(edge => {
      // Add the source node as a predecessor
      previousNodeIds.add(edge.source);
      // Recursively traverse to find all upstream nodes
      traverse(edge.source);
    });
  }

  // Start traversal from target node
  traverse(targetNodeId);

  // Convert node IDs to actual node objects
  return allNodes.filter(n => previousNodeIds.has(n.id));
}
```

**Example Workflow:**

```
┌─────────────┐
│SMS Trigger  │ (trigger-123)
│             │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│Find Contact │ (node-456)
│             │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│Create Opp   │ (node-789)
│             │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│Add Tag      │ (node-abc) ← Current node
└─────────────┘
```

**For "Add Tag" node:**

```typescript
const previousNodes = findPreviousNodes('node-abc', allNodes, allEdges);

// Returns:
[
  { id: 'trigger-123', type: 'smsReceivedTrigger', data: { label: 'SMS Received' } },
  { id: 'node-456', type: 'pulselineFindContact', data: { label: 'Find Contact' } },
  { id: 'node-789', type: 'pulselineCreateOpportunity', data: { label: 'Create Opportunity' } }
]
```

**Algorithm Details:**

```typescript
// Edge structure
const edges = [
  { source: 'trigger-123', target: 'node-456' },
  { source: 'node-456', target: 'node-789' },
  { source: 'node-789', target: 'node-abc' }
];

// For node-abc, traverse backwards:
// 1. Find edges where target = 'node-abc'
//    → edge { source: 'node-789', target: 'node-abc' }
//    → Add 'node-789' to predecessors
//
// 2. Recursively find edges where target = 'node-789'
//    → edge { source: 'node-456', target: 'node-789' }
//    → Add 'node-456' to predecessors
//
// 3. Recursively find edges where target = 'node-456'
//    → edge { source: 'trigger-123', target: 'node-456' }
//    → Add 'trigger-123' to predecessors
//
// Result: ['trigger-123', 'node-456', 'node-789']
```

---

### Step 2: Load Node Configs

**File:** `frontend/app/automations/automationsEditor/components/NodeConfigPanel/index.tsx:240-268`

```typescript
useEffect(() => {
  async function loadNodeOutputFields() {
    if (!user || !workflowId || nodeType === 'trigger') return;

    const fields: FieldDefinition[] = [];

    // 1. Find all previous nodes
    const previousNodes = findPreviousNodes(nodeId, allNodes, allEdges);
    console.log('Previous nodes found:', previousNodes.length);

    // 2. For each previous node, load config
    for (const prevNode of previousNodes) {
      try {
        const nodeName = prevNode.data.nodeName as string;
        console.log(`Loading config for: ${nodeName}`);

        const config = await nodeRegistryApi.getNodeConfig(nodeName);

        if (config.success) {
          console.log(`Config loaded for ${nodeName}`);
          console.log('Has successResponse:', !!config.data._pulseline?.successResponse);

          // Extract fields if successResponse defined
          if (config.data._pulseline?.successResponse?.fields) {
            const responseFields = config.data._pulseline.successResponse.fields;
            console.log(`Found ${responseFields.length} response fields`);

            // Create field definitions...
          }
        }
      } catch (error) {
        console.error(`Error loading config for ${prevNode.data.nodeName}:`, error);
      }
    }

    // 3. Merge with existing fields (webhook)
    setAvailableFields(prev => [...prev, ...fields]);
  }

  loadNodeOutputFields();
}, [user, workflowId, nodeType, nodeId, allNodes, allEdges]);
```

**API Call:**

```typescript
// GET /api/workflows/nodes/pulselineFindContact
const response = await fetch(`${API_URL}/api/workflows/nodes/pulselineFindContact`);

// Response:
{
  success: true,
  data: {
    displayName: 'Find Contact',
    name: 'pulselineFindContact',
    // ... other config
    _pulseline: {
      transformationMethod: 'contact_find',
      apiEndpoint: '/api/contacts/find',
      successResponse: {
        fields: [
          { name: 'contactId', type: 'string', description: '...', required: true },
          { name: 'name', type: 'string', description: '...' },
          { name: 'phoneNumber', type: 'string', description: '...' },
          { name: 'email', type: 'string', description: '...' },
          { name: 'tags', type: 'array', description: '...' }
        ]
      }
    }
  }
}
```

---

### Step 3: Extract Field Definitions

**File:** `NodeConfigPanel/index.tsx:249-264`

```typescript
if (config.data._pulseline?.successResponse?.fields) {
  const responseFields = config.data._pulseline.successResponse.fields;

  responseFields.forEach(field => {
    fields.push({
      path: field.name,                  // "contactId"
      displayName: field.name,           // "contactId"
      group: prevNode.data.label as string,  // "Find Contact"
      sourceNodeName: prevNode.id,       // "node-456"
      type: field.type,                  // "string"
      value: null,                       // No sample value
      isNested: false,                   // Top-level field
    });
  });
}
```

**Example:**

**Node Config:**

```typescript
// pulselineFindContact node config
_pulseline: {
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
      }
    ]
  }
}
```

**Generated Field Definitions:**

```typescript
[
  {
    path: 'contactId',
    displayName: 'contactId',
    group: 'Find Contact',         // Node label
    sourceNodeName: 'node-456',    // Node ID
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
  {
    path: 'phoneNumber',
    displayName: 'phoneNumber',
    group: 'Find Contact',
    sourceNodeName: 'node-456',
    type: 'string',
    value: null,
    isNested: false
  },
  {
    path: 'email',
    displayName: 'email',
    group: 'Find Contact',
    sourceNodeName: 'node-456',
    type: 'string',
    value: null,
    isNested: false
  },
  {
    path: 'tags',
    displayName: 'tags',
    group: 'Find Contact',
    sourceNodeName: 'node-456',
    type: 'array',
    value: null,
    isNested: false
  }
]
```

---

### Step 4: Group and Display

**Grouping Logic:**

**File:** `frontend/lib/fieldGroupConfig.ts:53-99`

```typescript
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

    // 2. Create dynamic group config for node outputs
    if (!FIELD_GROUP_CONFIG.find(g => g.name === groupName)) {
      if (!dynamicGroups.has(groupName)) {
        dynamicGroups.set(groupName, {
          name: groupName,
          displayName: groupName,      // "Find Contact"
          icon: '🔍',
          priority: 2,                  // After static groups
          description: `Output from ${groupName} node`,
        });
      }
    }
  });

  // 3. Build grouped structure
  const grouped: GroupedFields[] = [];
  const allGroups = [...FIELD_GROUP_CONFIG, ...Array.from(dynamicGroups.values())];

  allGroups.forEach((groupConfig) => {
    const fieldsInGroup = fieldsByGroup.get(groupConfig.name);
    if (fieldsInGroup && fieldsInGroup.length > 0) {
      grouped.push({
        group: groupConfig,
        fields: fieldsInGroup.sort((a, b) => a.displayName.localeCompare(b.displayName)),
      });
    }
  });

  // 4. Sort by priority
  return grouped.sort((a, b) => a.group.priority - b.group.priority);
}
```

**UI Display:**

```
┌────────────────────────────────────────────┐
│  📥 Webhook Payload                   [5]  │
│  ───────────────────────────────────────── │
│  (webhook fields...)                       │
└────────────────────────────────────────────┘

┌────────────────────────────────────────────┐
│  🔍 Find Contact                      [5]  │ ← Dynamic group
│  ───────────────────────────────────────── │
│  contactId                                 │
│  contactId                                 │
│  string                                    │
│                                            │
│  email                                     │
│  email                                     │
│  string                                    │
│                                            │
│  name                                      │
│  name                                      │
│  string                                    │
│                                            │
│  phoneNumber                               │
│  phoneNumber                               │
│  string                                    │
│                                            │
│  tags                                      │
│  tags                                      │
│  array                                     │
└────────────────────────────────────────────┘

┌────────────────────────────────────────────┐
│  🔍 Create Opportunity                [3]  │ ← Another dynamic group
│  ───────────────────────────────────────── │
│  opportunityId                             │
│  pipelineId                                │
│  createdAt                                 │
└────────────────────────────────────────────┘
```

---

### Step 5: Generate Expression

**File:** `NodeConfigPanel/NodeParameterRenderer.tsx:400-402`

```typescript
const insertFieldAtCursor = (field: FieldDefinition) => {
  let expression: string;

  if (field.group === 'inboundWebhook') {
    // Webhook field - needs .body
    expression = `={{ $("${field.sourceNodeName}").item.json.body.${field.path} }}`;
  } else {
    // ✅ Node output field - NO .body
    expression = `={{ $("${field.sourceNodeName}").item.json.${field.path} }}`;
  }

  // Insert at cursor...
};
```

**Example:**

User selects `contactId` from "Find Contact" group:

```typescript
// Field object
{
  path: 'contactId',
  displayName: 'contactId',
  group: 'Find Contact',
  sourceNodeName: 'node-456',
  type: 'string',
  value: null,
  isNested: false
}

// Generated expression
{{ $("node-456").item.json.contactId }}
```

**Key Difference from Webhook:**

```javascript
// Webhook field - HAS .body
{{ $("trigger-123").item.json.body.phoneNumber }}

// Node output - NO .body
{{ $("node-456").item.json.contactId }}
```

---

## 🎯 Key Patterns

### Pattern 1: Define successResponse in Node Config

**When creating action nodes that return data:**

**File:** `workflows/services/nodeRegistry/nodes/pulseline/createOpportunity.config.ts`

```typescript
export const createOpportunityNode: INodeTypeDescription = {
  displayName: 'Create Opportunity',
  name: 'pulselineCreateOpportunity',
  // ... other config

  _pulseline: {
    transformationMethod: 'opportunity_create',
    apiEndpoint: '/api/opportunities',
    httpMethod: 'POST',
    requiresAuth: true,

    // ✅ Define output structure for field mapping
    successResponse: {
      fields: [
        {
          name: 'opportunityId',
          type: 'string',
          description: 'Unique opportunity identifier',
          required: true
        },
        {
          name: 'name',
          type: 'string',
          description: 'Opportunity name'
        },
        {
          name: 'pipelineId',
          type: 'string',
          description: 'Pipeline ID'
        },
        {
          name: 'stageId',
          type: 'string',
          description: 'Current stage ID'
        },
        {
          name: 'contactId',
          type: 'string',
          description: 'Associated contact ID'
        },
        {
          name: 'value',
          type: 'number',
          description: 'Opportunity value'
        },
        {
          name: 'createdAt',
          type: 'string',
          description: 'Creation timestamp'
        }
      ]
    }
  },

  properties: [...]
};
```

### Pattern 2: Multiple Previous Nodes

**Workflow with branching:**

```
       ┌─────────────┐
       │SMS Trigger  │
       └──────┬──────┘
              │
       ┌──────┴──────┐
       │             │
       ▼             ▼
┌──────────┐   ┌──────────┐
│Find      │   │Create    │
│Contact   │   │Lead      │
└─────┬────┘   └────┬─────┘
      │             │
      └──────┬──────┘
             │
             ▼
      ┌─────────────┐
      │Merge        │ ← Current node
      └─────────────┘
```

**Previous nodes for Merge:**

```typescript
const previousNodes = findPreviousNodes('merge-node', allNodes, allEdges);
// Returns: [trigger, findContact, createLead]
```

**Fields available:**

```
📥 Webhook Payload (5 fields)
🔍 Find Contact (5 fields)
🔍 Create Lead (4 fields)
```

### Pattern 3: No successResponse

**Some nodes don't return data:**

```typescript
export const deleteContactNode: INodeTypeDescription = {
  displayName: 'Delete Contact',
  name: 'pulselineDeleteContact',

  _pulseline: {
    transformationMethod: 'contact_delete',
    apiEndpoint: '/api/contacts/:contactId',
    httpMethod: 'DELETE',
    requiresAuth: true,
    // ❌ No successResponse - delete operations typically don't return data
  },

  properties: [...]
};
```

**Result:** Node discovered but no fields added (skipped in extraction loop).

### Pattern 4: Complex Output Structures

**Node with nested response:**

```typescript
successResponse: {
  fields: [
    {
      name: 'contact',
      type: 'object',
      description: 'Contact object'
    },
    {
      name: 'contact.contactId',
      type: 'string',
      description: 'Contact ID'
    },
    {
      name: 'contact.name',
      type: 'string',
      description: 'Contact name'
    },
    {
      name: 'customFields',
      type: 'object',
      description: 'Custom field values'
    }
  ]
}
```

**Usage:**

```javascript
// Top-level object
{{ $("node-456").item.json.contact }}

// Nested field
{{ $("node-456").item.json.contact.contactId }}

// Custom fields object
{{ $("node-456").item.json.customFields }}
```

---

## 🧪 Testing

### Test 1: Graph Traversal

```typescript
// Create test workflow
const nodes = [
  { id: 'trigger-1', type: 'trigger' },
  { id: 'node-2', type: 'action' },
  { id: 'node-3', type: 'action' }
];

const edges = [
  { source: 'trigger-1', target: 'node-2' },
  { source: 'node-2', target: 'node-3' }
];

const previous = findPreviousNodes('node-3', nodes, edges);
console.log(previous.map(n => n.id));
// Expected: ['trigger-1', 'node-2']
```

### Test 2: Load Node Config

```bash
curl http://localhost:8000/api/workflows/nodes/pulselineFindContact | jq '.data._pulseline.successResponse'
```

**Expected:**

```json
{
  "fields": [
    { "name": "contactId", "type": "string", "required": true },
    { "name": "name", "type": "string" },
    { "name": "phoneNumber", "type": "string" },
    { "name": "email", "type": "string" }
  ]
}
```

### Test 3: Field Extraction

```typescript
const config = {
  _pulseline: {
    successResponse: {
      fields: [
        { name: 'contactId', type: 'string', required: true },
        { name: 'name', type: 'string' }
      ]
    }
  }
};

const node = { id: 'node-456', data: { label: 'Find Contact' } };
const fields = config._pulseline.successResponse.fields.map(field => ({
  path: field.name,
  displayName: field.name,
  group: node.data.label,
  sourceNodeName: node.id,
  type: field.type,
  value: null,
  isNested: false
}));

console.log(fields.length); // Expected: 2
console.log(fields[0].sourceNodeName); // Expected: 'node-456'
```

### Test 4: Expression Generation

```typescript
const field = {
  path: 'contactId',
  group: 'Find Contact',
  sourceNodeName: 'node-456'
};

const expr = `={{ $("${field.sourceNodeName}").item.json.${field.path} }}`;
console.log(expr);
// Expected: {{ $("node-456").item.json.contactId }}
```

### Test 5: Runtime Validation

**In n8n Code node:**

```javascript
// Verify expression resolves correctly
const contactId = $("node-456").item.json.contactId;
console.log('Contact ID:', contactId); // Should output actual ID

// Verify no .body needed
try {
  const wrong = $("node-456").item.json.body.contactId; // ❌ undefined
} catch (e) {
  console.log('Correctly fails with .body');
}
```

---

## 🐛 Common Issues

### Issue 1: "No previous nodes found"

**Cause:** Nodes not connected or wrong direction.

**Debug:**

```typescript
console.log('All edges:', allEdges);
console.log('Edges pointing to current node:', allEdges.filter(e => e.target === nodeId));
```

**Fix:** Ensure edges connect previous nodes TO current node.

### Issue 2: "successResponse undefined"

**Cause:** Node config missing response definition.

**Fix:** Add `successResponse` to node config:

```typescript
_pulseline: {
  // ...
  successResponse: {
    fields: [
      { name: 'resultField', type: 'string', required: true }
    ]
  }
}
```

### Issue 3: "Expression has .body but shouldn't"

**Cause:** Node output field treated as webhook field.

**Debug:**

```typescript
console.log('Field group:', field.group);
// Should NOT be 'inboundWebhook' for node outputs
```

**Fix:** Ensure node output fields have group = node label, not 'inboundWebhook'.

### Issue 4: "Fields not grouped by node"

**Cause:** `group` property not set to node label.

**Fix:**

```typescript
// ❌ WRONG
fields.push({
  path: field.name,
  group: 'nodeOutputs', // Generic group
  // ...
});

// ✅ CORRECT
fields.push({
  path: field.name,
  group: prevNode.data.label, // Node-specific label
  // ...
});
```

---

## 🔗 Related Patterns

- **[webhook-fields.md](./webhook-fields.md)** - Webhook field extraction
- **[../helpers/expression-builder.md](../helpers/expression-builder.md)** - Expression formats
- **[../examples/complete-mapping-example.md](../examples/complete-mapping-example.md)** - End-to-end example

---

## 📚 Related Documentation

- **[README.md](../README.md)** - Complete system overview
- **[QUICK-REFERENCE.md](../QUICK-REFERENCE.md)** - Code templates
- **[../../nodeRegistry/README.md](../../nodeRegistry/README.md)** - Node configuration
- **[../../nodeRegistry/helpers/node-config-api.md](../../nodeRegistry/helpers/node-config-api.md)** - successResponse reference

---

**File Locations:**

- **Graph Traversal:** `frontend/lib/workflowGraphUtils.ts:17-45`
- **Field Discovery:** `frontend/app/automations/automationsEditor/components/NodeConfigPanel/index.tsx:240-268`
- **Grouping Logic:** `frontend/lib/fieldGroupConfig.ts:53-99`
- **Expression Gen:** `NodeConfigPanel/NodeParameterRenderer.tsx:400-402`
- **Node Config Example:** `workflows/services/nodeRegistry/nodes/pulseline/findContact.config.ts:32-47`
