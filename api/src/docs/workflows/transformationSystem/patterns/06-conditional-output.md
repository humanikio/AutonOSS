# Conditional Output Pattern (IF Node Injection)

> **Multi-node transformation:** Some transformations create **two nodes** (HTTP + IF) for conditional routing based on API response fields.

## When to Use

Use when a node needs **conditional routing** based on the API response:

✅ Find Contact (route based on `found: true/false`)
✅ Check Status (route based on `status: 'active'/'inactive'`)
✅ Validate Data (route based on `valid: true/false`)

❌ Standard CRUD operations (create, update, delete - no routing needed)

---

## Implementation

### Step 1: Node Config Declaration

```typescript
// File: workflows/services/nodeRegistry/nodes/pulseline/findContact.config.ts

export const pulselineFindContactNode: INodeTypeDescription = {
  displayName: 'Find Contact',
  name: 'pulselineFindContact',

  outputs: ['main', 'main'],  // ← TWO outputs for conditional routing!

  _pulseline: {
    transformationMethod: 'contact_find',
    conditionalOutput: {
      enabled: true,
      field: 'found',              // ← Check this field in response
      trueLabel: 'Contact Found',
      falseLabel: 'Contact Not Found',
    },
  },
};
```

### Step 2: Transformation Creates Two Nodes

```typescript
// File: n8n/transformationSystem/transformationMethodRegistry/contactManagement/contact_find.ts

transform(node: ReactFlowNode, config: INodeTypeDescription, context: TransformationContext): TransformationResult {
  const { id, position } = node;

  // Create HTTP Request Node
  const httpNode: HttpRequestNodeConfig = {
    id,  // Original node ID
    name: id,
    type: 'n8n-nodes-base.httpRequest',
    position: [position.x, position.y],
    parameters: {
      method: 'POST',
      url: '...',
      options: {
        response: {
          response: {
            neverError: true,  // ← CRITICAL: Continue even if 404/500
          }
        }
      }
    },
  };

  // Create IF Node
  const ifNodeId = `${id}_if`;
  const checkField = config._pulseline?.conditionalOutput?.field || 'found';

  const ifNode: IfNodeConfig = {
    id: ifNodeId,
    name: ifNodeId,
    type: 'n8n-nodes-base.if',
    typeVersion: 2,
    position: [position.x + 300, position.y],  // ← 300px to the right
    parameters: {
      conditions: {
        conditions: [
          {
            id: '1',
            leftValue: `={{$json.${checkField}}}`,  // ← Check response field
            rightValue: '',
            operator: {
              type: 'boolean',
              operation: 'true'
            }
          }
        ],
        combinator: 'and'
      }
    },
  };

  return {
    nodes: [httpNode, ifNode],  // ← TWO nodes!

    internalEdges: [
      { from: id, to: ifNodeId }  // ← Wire HTTP → IF
    ],

    replacements: {
      [id]: {
        incomingTarget: id,        // ← Previous nodes connect to HTTP
        outgoingSource: ifNodeId   // ← Next nodes connect FROM IF
      }
    },

    metadata: {
      nodesCreated: 2,
      hasConditionalOutput: true,
      conditionalField: checkField,
    },
  };
}
```

### Step 3: Connection Wiring

The transformation system uses `replacements` to rewire connections:

```
Original ReactFlow:
  [Node A] → [Find Contact] → [Node B (if found)]
                            → [Node C (if not found)]

Compiled n8n:
  [Node A] → [HTTP Request (Find Contact)] → [IF Node] → true → [Node B]
                                                        → false → [Node C]
```

**Key Points:**
- `incomingTarget: id` - Incoming edges connect to HTTP node
- `outgoingSource: ifNodeId` - Outgoing edges connect from IF node
- `internalEdges` - Wire HTTP → IF internally

---

## IF Node Schema

### Condition Types

```typescript
// Boolean check
{
  leftValue: '={{$json.found}}',
  operator: { type: 'boolean', operation: 'true' }
}

// String equality
{
  leftValue: '={{$json.status}}',
  rightValue: 'active',
  operator: { type: 'string', operation: 'equals' }
}

// Number comparison
{
  leftValue: '={{$json.score}}',
  rightValue: '50',
  operator: { type: 'number', operation: 'gt' }
}
```

### Helper Function

```typescript
// File: n8n/nodeSchemas/If.schema.ts

export function createBooleanCondition(
  id: string,
  fieldName: string,
  expectedValue: boolean
): IfCondition {
  return {
    id,
    leftValue: `={{$json.${fieldName}}}`,
    rightValue: '',
    operator: {
      type: 'boolean',
      operation: expectedValue ? 'true' : 'false'
    }
  };
}

// Usage:
const condition = createBooleanCondition('1', 'found', true);
```

---

## Runtime Behavior

### Success Path (Contact Found)

```typescript
// API Response:
{
  "found": true,
  "contactId": "abc123",
  "name": "John Doe"
}

// IF Node evaluates: $json.found === true → TRUE
// → Workflow continues to output_0 (true branch)
```

### Failure Path (Contact Not Found)

```typescript
// API Response:
{
  "found": false,
  "message": "Contact not found"
}

// IF Node evaluates: $json.found === true → FALSE
// → Workflow continues to output_1 (false branch)
```

### Error Path (neverError: true)

Even if API returns 500:

```typescript
// HTTP returns 500
// neverError: true prevents workflow from stopping
// Response: { "error": "Internal server error" }

// IF Node evaluates: $json.found === undefined → FALSE
// → Workflow continues to output_1 (false branch)
```

---

## Files Using This Pattern

- ✅ `contact_find.ts:92-157` - Complete implementation
- 📋 `findContact.config.ts:33-38` - Config declaration
- 🛠️ `If.schema.ts` - IF node type definitions

---

## Testing

```typescript
const node = {
  id: 'find-contact-1',
  type: 'pulselineFindContact',
  data: { parameters: { value: '{{$json.phoneNumber}}' } }
};

const result = transformation.transform(node, config, context);

// Verify two nodes created
expect(result.nodes.length).toBe(2);
expect(result.nodes[0].type).toBe('n8n-nodes-base.httpRequest');
expect(result.nodes[1].type).toBe('n8n-nodes-base.if');

// Verify internal edge
expect(result.internalEdges).toEqual([
  { from: 'find-contact-1', to: 'find-contact-1_if' }
]);

// Verify replacements
expect(result.replacements['find-contact-1']).toEqual({
  incomingTarget: 'find-contact-1',
  outgoingSource: 'find-contact-1_if'
});
```

---

## Common Pitfalls

### Pitfall 1: Forgetting neverError

```typescript
// ❌ WRONG - Workflow stops on 404
options: {
  response: {
    response: {}  // Missing neverError
  }
}

// ✅ CORRECT
options: {
  response: {
    response: {
      neverError: true  // Continue even if error
    }
  }
}
```

### Pitfall 2: Wrong Replacement Mapping

```typescript
// ❌ WRONG - Next nodes connect to HTTP (skip IF)
replacements: {
  [id]: {
    outgoingSource: id  // Points to HTTP, not IF!
  }
}

// ✅ CORRECT - Next nodes connect from IF
replacements: {
  [id]: {
    outgoingSource: ifNodeId  // Points to IF node
  }
}
```

### Pitfall 3: Missing Internal Edge

```typescript
// ❌ WRONG - HTTP and IF not connected
internalEdges: []  // No connection!

// ✅ CORRECT - Wire HTTP → IF
internalEdges: [
  { from: id, to: ifNodeId }
]
```

---

## Summary

✅ **Pattern:**
- Create TWO nodes (HTTP + IF)
- Use `neverError: true` on HTTP node
- Wire HTTP → IF via `internalEdges`
- Use `replacements` for connection rewiring

✅ **Config:**
- Set `outputs: ['main', 'main']`
- Declare `conditionalOutput` in `_pulseline`
- Specify check field and labels

❌ **DON'T:**
- Create conditional output without `neverError`
- Forget internal edge
- Point outgoing to HTTP instead of IF
- Use single output in config
