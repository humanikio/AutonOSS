# fixedCollection Pattern

> **CRITICAL:** fixedCollection has TWO completely different use cases. Choose the correct pattern based on what the backend API expects.

## Overview

The `fixedCollection` type in n8n allows users to provide an array of field-value pairs. How you transform this depends on the **backend API's expected structure**.

## Decision Tree

```
Does the backend API expect a NESTED object field?
│
├─ YES → Use Pattern A: Build Object Expression
│         Example: { payload: { contactId: '123', source: 'web' } }
│         Use case: Trigger Workflow, Custom Payloads
│
└─ NO → Use Pattern B: Flatten to Body Parameters
          Example: { custom_score: 50, custom_source: 'web', name: 'John' }
          Use case: Contact Fields, Custom Fields
```

---

## Pattern A: Build Object Expression

**Use when:** Backend expects a **single nested object field**.

### API Contract Example

```typescript
// Backend expects:
POST /api/workflows/trigger
{
  "workflowId": "workflow-123",
  "payload": {                    // ← Single nested object
    "contactId": "abc123",
    "source": "web",
    "score": 95
  }
}
```

### Frontend Structure

```typescript
// User configures in UI:
nodeParams = {
  workflowId: 'workflow-123',
  payloadMode: 'fields',          // ← User wants to build object
  payloadFields: {
    field: [
      { name: 'contactId', value: '={{$json.contactId}}' },
      { name: 'source', value: 'web' },
      { name: 'score', value: '={{$json.score}}' }
    ]
  }
}
```

### Node Config

```typescript
// File: workflows/services/nodeRegistry/nodes/action/triggerWorkflow.config.ts

properties: [
  {
    displayName: 'Payload Mode',
    name: 'payloadMode',
    type: 'options',
    options: [
      { name: 'Passthrough', value: 'passthrough' },
      { name: 'Custom Fields', value: 'fields' },  // ← Triggers object building
      { name: 'Raw JSON', value: 'json' },
    ],
  },
  {
    displayName: 'Payload Fields',
    name: 'payloadFields',
    type: 'fixedCollection',  // ← User provides field pairs
    typeOptions: { multipleValues: true },
    displayOptions: {
      show: { payloadMode: ['fields'] }  // Only show when mode is 'fields'
    },
    options: [
      {
        name: 'field',
        displayName: 'Field',
        values: [
          {
            displayName: 'Field Name',
            name: 'name',      // ← User provides key
            type: 'string',
          },
          {
            displayName: 'Field Value',
            name: 'value',     // ← User provides value
            type: 'string',
          },
        ],
      },
    ],
  },
]
```

### Transformation Implementation

```typescript
// File: action_triggerWorkflow.ts (or legacy convertReactFlow2N8n.ts:862-890)

transform(node: ReactFlowNode, config: INodeTypeDescription, context: TransformationContext): TransformationResult {
  const { id, position, data } = node;
  const nodeParams = data?.parameters || {};

  const payloadMode = nodeParams.payloadMode || 'passthrough';

  let payloadValue: string;

  if (payloadMode === 'passthrough') {
    // Pass everything from previous node
    payloadValue = '={{ $json }}';
  }
  else if (payloadMode === 'json') {
    // User provided raw JSON
    payloadValue = nodeParams.payload || '={{ $json }}';
  }
  else if (payloadMode === 'fields') {
    // Build object expression from fixedCollection
    payloadValue = buildN8nObjectExpression(
      nodeParams.payloadFields?.field || [],
      '={{ $json }}'  // Fallback if no fields
    );
  }

  const bodyObj = {
    workflowId: nodeParams.workflowId,
    payload: payloadValue,  // ← Single nested object
  };

  const bodyParameters = buildBodyParameters(bodyObj);

  // Create HTTP node...
}
```

### Helper Function

```typescript
// File: n8n/transformationSystem/transformationMethodRegistry/utils/expressionHelpers.ts

export function buildN8nObjectExpression(
  fields: Array<{ name: string; value: any }>,
  fallback: string = '={{ $json }}'
): string {
  if (!Array.isArray(fields) || fields.length === 0) {
    return fallback;
  }

  const fieldExpressions: string[] = [];

  fields.forEach((field) => {
    if (!field.name || field.value === undefined) return;

    const name = field.name;
    const value = String(field.value);

    if (isExpression(value)) {
      // Expression - unwrap and use without quotes
      const unwrapped = unwrapExpression(value);
      fieldExpressions.push(`"${name}": ${unwrapped}`);
    } else {
      // Static value - wrap in quotes and escape
      const escaped = value.replace(/"/g, '\\"');
      fieldExpressions.push(`"${name}": "${escaped}"`);
    }
  });

  // Build complete n8n object expression
  return `={{ { ${fieldExpressions.join(', ')} } }}`;
}
```

### Example: Runtime Evaluation

```typescript
// User input:
payloadFields.field = [
  { name: 'contactId', value: '={{$json.contactId}}' },
  { name: 'source', value: 'web' },
  { name: 'score', value: '={{$json.score}}' }
]

// After buildN8nObjectExpression:
payload = "={{ { \"contactId\": $json.contactId, \"source\": \"web\", \"score\": $json.score } }}"

// Body parameters:
bodyParameters = [
  { name: 'workflowId', value: 'workflow-123' },
  { name: 'payload', value: '={{ { "contactId": $json.contactId, "source": "web", "score": $json.score } }}' }
]

// n8n evaluates at runtime (if $json = {contactId: 'abc123', score: 95}):
POST /api/workflows/trigger
{
  "workflowId": "workflow-123",
  "payload": {
    "contactId": "abc123",   // ← Evaluated from $json.contactId
    "source": "web",
    "score": 95              // ← Evaluated from $json.score
  }
}
```

### CRITICAL: Expression Unwrapping

```typescript
// ❌ WRONG - Nested expressions (INVALID SYNTAX!)
"={{ { \"contactId\": ={{ $json.contactId }} } }}"

// ✅ CORRECT - Unwrapped expressions
"={{ { \"contactId\": $json.contactId } }}"
```

**Why?** n8n expressions cannot be nested. When building an object literal inside `={{ ... }}`, inner expressions must be unwrapped JavaScript, not more `={{ }}` wrappers.

---

## Pattern B: Flatten to Body Parameters

**Use when:** Backend expects **custom fields at the root level** alongside standard fields.

### API Contract Example

```typescript
// Backend expects:
POST /api/contacts
{
  "name": "John Doe",           // ← Standard field
  "phoneNumber": "+1234567890", // ← Standard field
  "email": "john@example.com",  // ← Standard field
  "custom_lead_score": 95,      // ← Custom field (root level!)
  "custom_source": "website",   // ← Custom field (root level!)
  "custom_notes": "VIP client"  // ← Custom field (root level!)
}
```

### Frontend Structure

```typescript
// User configures in UI:
nodeParams = {
  name: 'John Doe',
  phoneNumber: '+1234567890',
  email: 'john@example.com',
  contactFields: {               // ← fixedCollection for custom fields
    field: [
      { fieldName: 'custom_lead_score', fieldValue: '={{$json.score}}' },
      { fieldName: 'custom_source', fieldValue: 'website' },
      { fieldName: 'custom_notes', fieldValue: '={{$json.notes}}' }
    ]
  }
}
```

### Node Config

```typescript
// File: workflows/services/nodeRegistry/nodes/pulseline/createContact.config.ts

properties: [
  // Standard fields (known ahead of time)
  {
    displayName: 'Phone Number',
    name: 'phoneNumber',
    type: 'string',
    default: '{{$contact.phoneNumber}}',
  },
  {
    displayName: 'Email',
    name: 'email',
    type: 'string',
    default: '{{$contact.email}}',
  },
  {
    displayName: 'Name',
    name: 'name',
    type: 'string',
    default: '{{$contact.name}}',
  },

  // Custom fields (user-defined via fixedCollection)
  {
    displayName: 'Additional Custom Fields',
    name: 'contactFields',
    type: 'fixedCollection',
    typeOptions: { multipleValues: true },
    options: [
      {
        name: 'field',
        displayName: 'Field',
        values: [
          {
            displayName: 'Field Name',
            name: 'fieldName',  // ← User provides field name
            type: 'options',
            typeOptions: {
              loadOptionsMethod: 'getContactFields',  // Load from backend
            },
          },
          {
            displayName: 'Field Value',
            name: 'fieldValue',  // ← User provides field value
            type: 'string',
          },
        ],
      },
    ],
  },
]
```

### Transformation Implementation

```typescript
// File: contact_create.ts or convertReactFlow2N8n.ts:975-999

transform(node: ReactFlowNode, config: INodeTypeDescription, context: TransformationContext): TransformationResult {
  const { id, position, data } = node;
  const nodeParams = data?.parameters || {};

  // Step 1: Build standard fields
  const bodyObj: Record<string, any> = {
    name: nodeParams.name,
    phoneNumber: nodeParams.phoneNumber,
    email: nodeParams.email,
  };

  // Step 2: Convert to body parameters array
  const bodyParameters = buildBodyParameters(bodyObj);

  // Step 3: Flatten fixedCollection into same array
  if (nodeParams.contactFields?.field && Array.isArray(nodeParams.contactFields.field)) {
    nodeParams.contactFields.field.forEach((item: any) => {
      if (item.fieldName && item.fieldValue !== undefined) {
        // Add each custom field as individual body parameter
        const normalized = normalizeExpression(item.fieldValue);

        bodyParameters.push({
          name: item.fieldName,      // ← User-provided field name
          value: normalized          // ← User-provided value (expression or literal)
        });
      }
    });
  }

  // Step 4: Configure HTTP node
  const httpParameters: HttpRequestParameters = {
    method: 'POST',
    url: `${backendUrl}/api/contacts`,
    sendBody: true,
    contentType: 'json',
    specifyBody: 'keypair',
    bodyParameters: {
      parameters: bodyParameters  // ← All fields in one flat array
    },
    // ...
  };

  // Create and return HTTP node...
}
```

### Example: Runtime Evaluation

```typescript
// User input:
nodeParams = {
  name: 'John Doe',
  phoneNumber: '+1234567890',
  email: 'john@example.com',
  contactFields: {
    field: [
      { fieldName: 'custom_lead_score', fieldValue: '={{$json.score}}' },
      { fieldName: 'custom_source', fieldValue: 'website' },
      { fieldName: 'custom_notes', fieldValue: '={{$json.notes}}' }
    ]
  }
}

// After flattening:
bodyParameters = [
  // Standard fields
  { name: 'name', value: 'John Doe' },
  { name: 'phoneNumber', value: '+1234567890' },
  { name: 'email', value: 'john@example.com' },

  // Custom fields (flattened from fixedCollection)
  { name: 'custom_lead_score', value: '={{$json.score}}' },
  { name: 'custom_source', value: 'website' },
  { name: 'custom_notes', value: '={{$json.notes}}' }
]

// n8n evaluates at runtime (if $json = {score: 95, notes: 'VIP client'}):
POST /api/contacts
{
  "name": "John Doe",
  "phoneNumber": "+1234567890",
  "email": "john@example.com",
  "custom_lead_score": 95,        // ← Evaluated from $json.score
  "custom_source": "website",
  "custom_notes": "VIP client"    // ← Evaluated from $json.notes
}
```

---

## Comparison Table

| Aspect | Pattern A: Object Expression | Pattern B: Flatten Array |
|--------|----------------------------|-------------------------|
| **Backend Expects** | Nested object field | Flat root-level fields |
| **Example** | `{payload: {a: 1, b: 2}}` | `{name: 'x', custom_a: 1, custom_b: 2}` |
| **Use Case** | Trigger Workflow payload | Contact custom fields |
| **Method** | `buildN8nObjectExpression()` | Flatten to `bodyParameters` array |
| **Result Type** | Single body parameter with object value | Multiple body parameters |
| **Expression Handling** | MUST unwrap before embedding | Normalize with `=` prefix |
| **Files** | `convertReactFlow2N8n.ts:879` | `convertReactFlow2N8n.ts:976-999` |

---

## When to Use Each Pattern

### Use Pattern A (Object Expression) When:

✅ Backend has a **single field** that accepts a dynamic object
✅ Example: `payload`, `customData`, `metadata`, `context`
✅ API docs say: "Send arbitrary key-value pairs in the payload field"
✅ Structure: `{ payload: { key1: val1, key2: val2 } }`

**Example Nodes:**
- Trigger Workflow
- Send Custom Webhook
- Custom API Integration

### Use Pattern B (Flatten Array) When:

✅ Backend expects **custom fields at the root level**
✅ Custom fields are **peers** with standard fields
✅ API docs say: "You can add custom fields like custom_xxx"
✅ Structure: `{ name: 'John', custom_score: 95, custom_source: 'web' }`

**Example Nodes:**
- Create Contact
- Update Contact
- Create Opportunity
- Update Opportunity

---

## Implementation Checklist

### For Pattern A (Object Expression):

- [ ] Use `buildN8nObjectExpression()` helper
- [ ] Unwrap expressions before embedding
- [ ] Escape double quotes in literal values
- [ ] Provide fallback value (usually `'={{ $json }}'`)
- [ ] Store result in **single body parameter**

### For Pattern B (Flatten Array):

- [ ] Start with standard fields using `buildBodyParameters()`
- [ ] Loop through `fixedCollection.field` array
- [ ] Normalize each value with `normalizeExpression()`
- [ ] Push to **same body parameters array**
- [ ] Filter out undefined/empty values

---

## Common Pitfalls

### Pitfall 1: Using Wrong Pattern

```typescript
// ❌ WRONG - Flattening when backend expects nested object
// Backend expects: {payload: {contactId: '123'}}
bodyParameters = [
  { name: 'contactId', value: '123' }  // Missing 'payload' wrapper!
]

// ✅ CORRECT - Build object expression
bodyParameters = [
  { name: 'payload', value: '={{ { "contactId": $json.contactId } }}' }
]
```

### Pitfall 2: Nested Expressions (Pattern A)

```typescript
// ❌ WRONG - Nested ={{ }} wrappers
const fieldValue = '={{$json.contactId}}';
const obj = `={{ { "contactId": ${fieldValue} } }}`;
// Result: ={{ { "contactId": ={{$json.contactId}} } }}  // INVALID!

// ✅ CORRECT - Unwrap first
const unwrapped = unwrapExpression(fieldValue);  // '$json.contactId'
const obj = `={{ { "contactId": ${unwrapped} } }}`;
// Result: ={{ { "contactId": $json.contactId } }}  // VALID!
```

### Pitfall 3: Not Escaping Quotes (Pattern A)

```typescript
// ❌ WRONG - Unescaped quotes break syntax
const value = 'He said "hello"';
const obj = `={{ { "message": "${value}" } }}`;
// Result: ={{ { "message": "He said "hello"" } }}  // BROKEN!

// ✅ CORRECT - Escape quotes
const escaped = value.replace(/"/g, '\\"');
const obj = `={{ { "message": "${escaped}" } }}`;
// Result: ={{ { "message": "He said \"hello\"" } }}  // VALID!
```

### Pitfall 4: Missing Normalization (Pattern B)

```typescript
// ❌ WRONG - Expression missing "=" prefix
bodyParameters.push({
  name: 'custom_score',
  value: '{{$json.score}}'  // Missing "=" - won't evaluate!
});

// ✅ CORRECT - Normalize first
bodyParameters.push({
  name: 'custom_score',
  value: normalizeExpression('{{$json.score}}')  // → '={{$json.score}}'
});
```

---

## Testing

### Unit Test: Pattern A (Object Expression)

```typescript
const fields = [
  { name: 'contactId', value: '={{$json.contactId}}' },
  { name: 'source', value: 'web' },
  { name: 'message', value: 'He said "hello"' }
];

const result = buildN8nObjectExpression(fields);

expect(result).toBe(
  '={{ { "contactId": $json.contactId, "source": "web", "message": "He said \\"hello\\"" } }}'
);
```

### Unit Test: Pattern B (Flatten Array)

```typescript
const nodeParams = {
  name: 'John',
  contactFields: {
    field: [
      { fieldName: 'custom_score', fieldValue: '={{$json.score}}' },
      { fieldName: 'custom_source', fieldValue: 'website' }
    ]
  }
};

const bodyParameters = buildBodyParameters({ name: nodeParams.name });

// Flatten fixedCollection
nodeParams.contactFields.field.forEach(item => {
  bodyParameters.push({
    name: item.fieldName,
    value: normalizeExpression(item.fieldValue)
  });
});

expect(bodyParameters).toEqual([
  { name: 'name', value: 'John' },
  { name: 'custom_score', value: '={{$json.score}}' },
  { name: 'custom_source', value: 'website' }
]);
```

---

## Files Using These Patterns

### Pattern A: Object Expression
- `convertReactFlow2N8n.ts:879-884` - Trigger Workflow payload
- `expressionHelpers.ts:93-123` - `buildN8nObjectExpression()` helper

### Pattern B: Flatten Array
- `convertReactFlow2N8n.ts:976-999` - Contact custom fields
- `contact_create.ts` - **TODO: Implement flattening**
- `contact_update.ts` - **TODO: Implement flattening**

---

## Summary

✅ **Pattern A: Object Expression**
- Single nested object field
- Use `buildN8nObjectExpression()`
- MUST unwrap expressions
- Escape quotes in literals

✅ **Pattern B: Flatten Array**
- Root-level custom fields
- Append to body parameters array
- Normalize expressions
- Filter undefined values

❌ **DON'T:**
- Use wrong pattern for your API
- Nest `={{ }}` expressions
- Forget to escape quotes (Pattern A)
- Skip normalization (Pattern B)
- Mix patterns in one transformation
