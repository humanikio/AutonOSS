# Body Field Handling Pattern

> **Two distinct patterns:** Pre-defined fields (transformation knows names) vs User-defined fields (user provides both names and values).

## Overview

HTTP Request nodes can send data in the request body using n8n's **keypair mode**. This allows each field to be individually evaluated as an expression or literal value.

## Pattern A: Pre-Defined Fields

Use when the transformation knows field names ahead of time.

### When to Use

- Standard API endpoints with documented fields
- Contact create/update operations
- Opportunity create/update operations
- Any endpoint where field names are fixed in the API contract

### Implementation

```typescript
// File: contact_create.ts

transform(node: ReactFlowNode, config: INodeTypeDescription, context: TransformationContext): TransformationResult {
  const { id, position, data } = node;
  const nodeParams = data?.parameters || {};

  const backendUrl = process.env.BACKEND_URL || 'https://backend.pulseline.io';
  const endpoint = '/api/contacts';  // No URL parameters

  // Step 1: Define body object with known field names
  const bodyObj: Record<string, any> = {
    name: nodeParams.name,                    // e.g., '={{$json.name}}'
    phoneNumber: nodeParams.phoneNumber,      // e.g., '+1234567890'
    email: nodeParams.email,                  // e.g., '={{$json.email}}'
    tags: nodeParams.tags,                    // e.g., '={{$json.tags}}'
    customFields: nodeParams.customFields,    // e.g., '={{$json.customFields}}'
  };

  // Step 2: Convert to n8n body parameters array
  const bodyParameters = buildBodyParameters(bodyObj);
  // Result: [
  //   { name: 'name', value: '={{$json.name}}' },
  //   { name: 'phoneNumber', value: '+1234567890' },
  //   { name: 'email', value: '={{$json.email}}' },
  //   // tags and customFields omitted if undefined
  // ]

  // Step 3: Configure HTTP Request node
  const httpParameters: HttpRequestParameters = {
    method: 'POST',
    url: `${backendUrl}${endpoint}`,
    authentication: 'none',
    sendBody: true,
    contentType: 'json',
    specifyBody: 'keypair',  // ← Use keypair mode!
    bodyParameters: {
      parameters: bodyParameters,  // ← Array of {name, value} pairs
    },
    sendHeaders: true,
    specifyHeaders: 'json',
    jsonHeaders: JSON.stringify({
      'Content-Type': 'application/json',
      'Authorization': 'Bearer TENANT_API_KEY_PLACEHOLDER',
    }),
  };

  // Create and return HTTP node...
}
```

### Helper Function: `buildBodyParameters`

```typescript
// File: n8n/transformationSystem/transformationMethodRegistry/utils/expressionHelpers.ts

export function buildBodyParameters(bodyObj: Record<string, any>): HttpRequestBodyParameter[] {
  const parameters: HttpRequestBodyParameter[] = [];

  Object.entries(bodyObj).forEach(([name, value]) => {
    // Filter out undefined, null, and empty strings
    if (value !== undefined && value !== '' && value !== null) {
      parameters.push({
        name,
        value: normalizeExpression(value),  // Ensure ={{ prefix for expressions
      });
    }
  });

  return parameters;
}
```

### Example Node Config

```typescript
// File: workflows/services/nodeRegistry/nodes/pulseline/createContact.config.ts

properties: [
  {
    displayName: 'Phone Number',
    name: 'phoneNumber',  // ← Maps to bodyObj.phoneNumber
    type: 'string',
    default: '{{$contact.phoneNumber}}',  // Default n8n expression
  },
  {
    displayName: 'Email',
    name: 'email',  // ← Maps to bodyObj.email
    type: 'string',
    default: '{{$contact.email}}',
  },
  {
    displayName: 'Name',
    name: 'name',  // ← Maps to bodyObj.name
    type: 'string',
    default: '{{$contact.name}}',
  },
]
```

### Runtime Behavior

```typescript
// User input:
nodeParams = {
  name: '={{$json.name}}',
  phoneNumber: '+1234567890',
  email: '={{$json.email}}',
  tags: undefined,  // Not provided
}

// After buildBodyParameters:
bodyParameters = [
  { name: 'name', value: '={{$json.name}}' },
  { name: 'phoneNumber', value: '+1234567890' },
  { name: 'email', value: '={{$json.email}}' },
  // tags omitted (was undefined)
]

// n8n HTTP Request sends:
POST /api/contacts
{
  "name": "John Doe",        // ← Evaluated from $json.name
  "phoneNumber": "+1234567890",
  "email": "john@example.com"  // ← Evaluated from $json.email
}
```

## Pattern B: User-Defined Fields (fixedCollection)

Use when user provides **both** field names **and** values.

### When to Use

- Custom fields that vary per tenant
- Dynamic field mapping
- When field names aren't known at transformation time

### Structure in ReactFlow

```typescript
// User configures in frontend:
nodeParams.contactFields = {
  field: [
    { fieldName: 'custom_lead_score', fieldValue: '={{$json.score}}' },
    { fieldName: 'custom_source', fieldValue: 'website' },
    { fieldName: 'custom_notes', fieldValue: '={{$json.notes}}' }
  ]
}
```

### Implementation (Legacy Script Pattern)

```typescript
// File: n8n/utils/convertReactFlow2N8n.ts (lines 976-999)

// Start with standard fields
const bodyParametersArray: Array<{ name: string; value: string }> = [];

// Add pre-defined fields
Object.entries(jsonBody).forEach(([name, value]) => {
  const s = String(value).trim();
  const isExpr = s.startsWith('={{') || s.startsWith('{{');
  const normalized = isExpr ? (s.startsWith('={{') ? s : '=' + s) : s;

  bodyParametersArray.push({ name, value: normalized });
});

// Handle fixedCollection: Flatten field pairs into body parameters
if (parameters.contactFields) {
  const contactFieldsObj = parameters.contactFields as any;

  if (contactFieldsObj.field && Array.isArray(contactFieldsObj.field)) {
    contactFieldsObj.field.forEach((item: any) => {
      if (item.fieldName && item.fieldValue !== undefined) {
        // Add each custom field as individual body parameter
        const s = String(item.fieldValue).trim();
        const isExpr = s.startsWith('={{') || s.startsWith('{{');
        const normalized = isExpr ? (s.startsWith('={{') ? s : '=' + s) : s;

        bodyParametersArray.push({
          name: item.fieldName,      // ← User-provided field name
          value: normalized          // ← User-provided value (expression or literal)
        });

        console.log(`✅ Added custom field: ${item.fieldName} = ${normalized}`);
      }
    });
  }
}

// n8n HTTP Request v4 expects bodyParameters with parameters wrapper
nodeParameters.bodyParameters = {
  parameters: bodyParametersArray
};
```

### Example Node Config

```typescript
// File: workflows/services/nodeRegistry/nodes/pulseline/createContact.config.ts

properties: [
  {
    displayName: 'Additional Custom Fields',
    name: 'contactFields',  // ← fixedCollection parameter
    type: 'fixedCollection',
    typeOptions: {
      multipleValues: true,  // User can add multiple field pairs
    },
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
              loadOptionsMethod: 'getContactFields',  // Load from API
            },
          },
          {
            displayName: 'Field Value',
            name: 'fieldValue',  // ← User provides field value
            type: 'string',
            placeholder: 'Field value or expression',
          },
        ],
      },
    ],
  },
]
```

### Runtime Behavior

```typescript
// User input:
nodeParams = {
  name: 'John Doe',
  phoneNumber: '+1234567890',
  contactFields: {
    field: [
      { fieldName: 'custom_lead_score', fieldValue: '={{$json.score}}' },
      { fieldName: 'custom_source', fieldValue: 'website' }
    ]
  }
}

// After flattening:
bodyParameters = [
  { name: 'name', value: 'John Doe' },
  { name: 'phoneNumber', value: '+1234567890' },
  { name: 'custom_lead_score', value: '={{$json.score}}' },  // ← From fixedCollection
  { name: 'custom_source', value: 'website' },                // ← From fixedCollection
]

// n8n HTTP Request sends:
POST /api/contacts
{
  "name": "John Doe",
  "phoneNumber": "+1234567890",
  "custom_lead_score": 95,    // ← Evaluated from $json.score
  "custom_source": "website"
}
```

## Comparison

| Aspect | Pre-Defined Fields | User-Defined Fields |
|--------|-------------------|---------------------|
| Field names | Known by transformation | Provided by user |
| Use case | Standard API fields | Custom/dynamic fields |
| Implementation | `buildBodyParameters(bodyObj)` | Flatten fixedCollection |
| Node config | Simple property list | fixedCollection type |
| Example | `name`, `email`, `phoneNumber` | `custom_lead_score`, `custom_source` |

## Expression Normalization

Both patterns use **expression normalization** to ensure n8n evaluates values correctly:

```typescript
function normalizeExpression(value: any): string {
  const s = String(value).trim();

  if (s.startsWith('={{') || s.startsWith('{{')) {
    // Ensure leading "="
    return s.startsWith('={{') ? s : '=' + s;
  }

  // Not an expression - return as-is
  return s;
}

// Examples:
normalizeExpression('={{$json.name}}')  // → '={{$json.name}}'  (already correct)
normalizeExpression('{{$json.name}}')   // → '={{$json.name}}'  (add =)
normalizeExpression('literal value')    // → 'literal value'    (no change)
```

## Files Using These Patterns

### Pre-Defined Fields
- `contact_create.ts:32-40` - Standard contact fields
- `contact_update.ts:99-107` - Standard contact fields
- `opportunity_create.ts:34-42` - Standard opportunity fields
- `opportunity_update.ts:35-43` - Standard opportunity fields

### User-Defined Fields (fixedCollection)
- `convertReactFlow2N8n.ts:976-999` - fixedCollection flattening (legacy)
- **TODO:** Implement in new transformation system

## Common Pitfalls

### 1. Including Undefined Values

```typescript
// ❌ WRONG - Sends undefined to API
const bodyObj = {
  name: nodeParams.name,     // undefined
  email: nodeParams.email,   // 'john@example.com'
};
// Result: { name: undefined, email: 'john@example.com' }

// ✅ CORRECT - Filter undefined values
const bodyParameters = buildBodyParameters(bodyObj);
// Result: [{ name: 'email', value: 'john@example.com' }]
```

### 2. Not Normalizing Expressions

```typescript
// ❌ WRONG - Missing "=" prefix
bodyParameters.push({
  name: 'contactId',
  value: '{{$json.contactId}}'  // Missing "=" - won't evaluate!
});

// ✅ CORRECT - Normalize first
bodyParameters.push({
  name: 'contactId',
  value: normalizeExpression('{{$json.contactId}}')  // → '={{$json.contactId}}'
});
```

### 3. Forgetting fixedCollection Fields

```typescript
// ❌ WRONG - Only include pre-defined fields
const bodyObj = {
  name: nodeParams.name,
  email: nodeParams.email,
};
// customFields from fixedCollection are lost!

// ✅ CORRECT - Flatten fixedCollection too
const bodyParameters = buildBodyParameters(bodyObj);
// Then append fixedCollection fields:
if (nodeParams.contactFields?.field) {
  nodeParams.contactFields.field.forEach(item => {
    bodyParameters.push({
      name: item.fieldName,
      value: normalizeExpression(item.fieldValue)
    });
  });
}
```

## Testing

### Unit Test: Pre-Defined Fields

```typescript
const nodeParams = {
  name: '={{$json.name}}',
  phoneNumber: '+1234567890',
  email: undefined,  // Not provided
};

const bodyObj = {
  name: nodeParams.name,
  phoneNumber: nodeParams.phoneNumber,
  email: nodeParams.email,
};

const bodyParameters = buildBodyParameters(bodyObj);

expect(bodyParameters).toEqual([
  { name: 'name', value: '={{$json.name}}' },
  { name: 'phoneNumber', value: '+1234567890' },
  // email omitted (was undefined)
]);
```

### Unit Test: fixedCollection Flattening

```typescript
const nodeParams = {
  name: 'John',
  contactFields: {
    field: [
      { fieldName: 'custom_score', fieldValue: '={{$json.score}}' },
      { fieldName: 'custom_source', fieldValue: 'website' },
    ]
  }
};

// Flatten fixedCollection
const customFields = nodeParams.contactFields.field.map(item => ({
  name: item.fieldName,
  value: normalizeExpression(item.fieldValue)
}));

expect(customFields).toEqual([
  { name: 'custom_score', value: '={{$json.score}}' },
  { name: 'custom_source', value: 'website' },
]);
```

## Summary

✅ **Pre-Defined Fields:**
- Use `buildBodyParameters()` helper
- Filter undefined/null/empty automatically
- Normalize expressions automatically
- Simple implementation

✅ **User-Defined Fields (fixedCollection):**
- Flatten `field` array into body parameters
- Each pair becomes one parameter
- Normalize expressions
- Allows dynamic field names

❌ **DON'T:**
- Include undefined/null values
- Forget to normalize expressions
- Skip fixedCollection flattening
- Hardcode field names for dynamic fields
