# Custom Field Resolver System

## Overview

The Custom Field Resolver system automatically injects **adapter nodes** into workflows to provide universal access to contact data. Adapters are invisible to users but fetch complete contact information (standard + custom fields) from the API, making all contact fields available throughout the workflow.

---

## Architecture

### **Key Components**

1. **Backend Adapter Node** (`/nodes/adapters/contactAdapter.config.ts`)
   - Calls `GET /api/contacts/:contactId`
   - Returns complete contact object with all fields
   - Registered in node registry as system node

2. **Frontend Adapter Component** (`AdapterNode.tsx`)
   - Renders as invisible (0x0 size, opacity: 0)
   - Cannot be clicked, configured, or deleted by users
   - Only visible in development mode (tiny debug label)

3. **Custom Field Resolver** (to be implemented)
   - `/customFieldResolver.ts` - Main orchestrator
   - `/injectContactFieldAdapter.ts` - Graph analysis & adapter injection
   - `/contactCustomFields.ts` - Field placeholder resolution

---

## How It Works

### **1. User Creates Workflow**

```
[Trigger with contactId] → [Action Node uses {{$contact.name}}] → [Save]
```

### **2. Backend Processes Workflow**

When user hits **Save**, `updateWorkflow.ts` calls the custom field resolver:

```typescript
const resolvedData = await resolveCustomFields(workflowJson);
```

### **3. Adapter Injection**

`injectContactFieldAdapter.ts` analyzes the graph:

- **Finds trigger node** → Places `contactAdapter-trigger-{id}` after it
- **Finds FindContact nodes** → Places `contactAdapter-find-{id}` after each (higher weight)
- **Inserts edges**: `Trigger → Adapter → Original Next Node`

**Result:**
```
[Trigger] → [contactAdapter-trigger-123] → [Action Node] → ...
```

### **4. Field Resolution**

`contactCustomFields.ts` scans all node parameters recursively:

- **Finds**: `{{$contact.name}}`
- **Determines** which adapter this node should use (based on graph position)
- **Replaces with**: `{{$node["contactAdapter-trigger-123"].json["fields"]["name"]}}`

### **5. Deployment to n8n**

During `convertReactFlow2N8n.ts`:

- Adapter node → HTTP Request node (`GET /api/contacts/{contactId}`)
- contactId expression is already resolved (from trigger or FindContact)
- Response provides all fields to downstream nodes

---

## Weighting System

When multiple contact sources exist, adapters are prioritized:

| Source | Weight | Example |
|--------|--------|---------|
| Trigger | 1 | `{{$json.body.contactId}}` |
| FindContact | 2 | `{{$node["findContact-X"].json["contactId"]}}` |

**Rule:** Downstream nodes use the **nearest ancestor adapter** with the **highest weight**.

**Example:**
```
[Trigger] → [contactAdapter-trigger] → [Node A uses trigger adapter]
    ↓
[FindContact] → [contactAdapter-find] → [Node B uses FindContact adapter (fresher data)]
```

---

## Field Placeholder Syntax

### **Frontend (User Input)**

```javascript
{{$contact.name}}          // User types this
{{$contact.email}}
{{$contact.customField1}}  // Custom fields work too!
```

### **Backend (After Resolution)**

```javascript
{{$node["contactAdapter-trigger-123"].json["fields"]["name"]}}
{{$node["contactAdapter-trigger-123"].json["fields"]["email"]}}
{{$node["contactAdapter-trigger-123"].json["fields"]["customField1"]}}
```

### **n8n Runtime (Actual Execution)**

1. Adapter calls `GET /api/contacts/abc123`
2. Returns:
   ```json
   {
     "contactId": "abc123",
     "fields": {
       "name": "John Doe",
       "email": "john@example.com",
       "customField1": "value1"
     }
   }
   ```
3. Downstream nodes access: `$node["contactAdapter-trigger-123"].json["fields"]["name"]` → `"John Doe"`

---

## Graph Analysis Algorithm

### **Execution Order (Topological Sort)**

```typescript
function buildExecutionOrder(nodes, edges) {
  // Standard topological sort
  // Returns: [trigger, adapter, nodeA, findContact, adapter2, nodeB, ...]
}
```

### **Downstream Node Detection**

```typescript
function findDownstreamNodes(sourceNodeId, executionOrder, contactSources) {
  // Find all nodes that execute AFTER sourceNodeId
  // Stop at next contact source (higher weight takes over)
  return downstreamNodeIds;
}
```

### **Nearest Ancestor Adapter**

```typescript
function findNearestAncestorAdapter(nodeId, adapterMap, executionOrder) {
  // Walk backward through execution order
  // Find first adapter node that this node can "see"
  // Prefer higher weight adapters if multiple paths exist
  return adapterNodeId;
}
```

---

## Edge Cases Handled

### **1. No Trigger**
- Skip adapter injection
- Return original workflow unchanged

### **2. Multiple FindContacts**
```
[Trigger] → [FindContact A] → [Node X uses A's adapter]
    ↓
[FindContact B] → [Node Y uses B's adapter]  ← Most recent wins
```

### **3. Parallel Branches**
```
        ┌→ [Branch A] → [FindContact A] → [Uses A's adapter]
Trigger → Adapter
        └→ [Branch B] → [No FindContact] → [Uses trigger adapter]
```
Each branch independently determines which adapter to use.

### **4. FindContact Failure**
- `continueOnFail: true` ensures workflow continues
- No fallback logic (as per design decision)
- Downstream nodes may receive empty/null fields

---

## Implementation Checklist

### ✅ **Completed**

- [x] Contact adapter node config (`contactAdapter.config.ts`)
- [x] Register adapter in node registry
- [x] Frontend adapter component (`AdapterNode.tsx`)
- [x] Register adapter node type in editor
- [x] Prevent adapter configuration/deletion
- [x] Contact field dropdown component

### ⏳ **To Do**

- [ ] `/customFieldResolver.ts` - Orchestrator
- [ ] `/injectContactFieldAdapter.ts` - Graph analysis & injection
- [ ] `/contactCustomFields.ts` - Field placeholder resolution
- [ ] Graph analysis utilities (topological sort, path finding)
- [ ] Integration with `updateWorkflow.ts`
- [ ] Adapter → HTTP Request conversion in `convertReactFlow2N8n.ts`
- [ ] Testing with real workflows

---

## API Contract

### **Adapter HTTP Request**

**Endpoint:** `GET /api/contacts/:contactId`

**Headers:**
```
Authorization: Bearer {API_KEY}
```

**Response:**
```json
{
  "contactId": "abc123",
  "fields": {
    "name": "John Doe",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phoneNumber": "+15551234567",
    "dateOfBirth": "1990-01-01",
    "notes": "VIP customer",
    "customField1": "Custom value 1",
    "customField2": "Custom value 2"
    // ... all custom fields merged in
  }
}
```

---

## Debugging

### **Development Mode**

Adapters show a tiny debug label in dev:
```
[contactAdapter-trigger-123]
     ↑ Only visible in NODE_ENV=development
```

### **Console Logs**

Look for:
- `🔧 Starting custom field resolution...`
- `📍 Injecting adapter after: trigger-123`
- `✅ Resolved contact field: {{$contact.name}} → {{$node["contactAdapter-X"].json["fields"]["name"]}}`

### **Graph Inspection**

Examine saved workflow JSON - adapters should be present:
```json
{
  "nodes": [
    { "id": "trigger-123", "type": "trigger", ... },
    { "id": "contactAdapter-trigger-123", "type": "adapter", ... },  ← Injected!
    { "id": "action-456", "type": "action", ... }
  ]
}
```

---

## Future Extensions

### **Opportunity Adapter**
```typescript
export const opportunityAdapterNode: INodeTypeDescription = {
  name: 'opportunityAdapter',
  _pulseline: {
    isAdapter: true,
    adapterType: 'opportunity',
    apiEndpoint: '/api/opportunities/{{$parameter["opportunityId"]}}',
    // ...
  }
}
```

### **Campaign Adapter**
### **Deal Adapter**
### **Custom Object Adapters**

The system is designed to be extensible - just add new adapter types!

---

## Performance Considerations

- **Adapter overhead**: 1 extra HTTP call per contact source
- **Graph analysis**: O(V + E) complexity (vertices + edges)
- **Parameter scanning**: Recursive, but typically shallow depth
- **Estimated impact**: <100ms for typical workflows (<50 nodes)

---

## Design Decisions

| Question | Decision | Rationale |
|----------|----------|-----------|
| Multiple FindContacts? | Use most recent | Fresher data preferred |
| FindContact fails? | No fallback | Keep workflows simple |
| Adapter naming? | Use node ID | Ensures uniqueness |
| Custom fields? | Fetch dynamically | Supports user-defined fields |
| Adapter visibility? | Always hidden | Users don't need to know |
| Weighting? | Simple numerical | Easy to understand/extend |
| Parallel branches? | No merging | Same contact = same data |

---

## Questions?

Contact the engineering team or review:
- `/backend/src/workflows/services/customFieldResolver/notes.txt`
- This README
- Node config examples in `/nodes/adapters/`
