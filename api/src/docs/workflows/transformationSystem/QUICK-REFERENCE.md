# Transformation System - Quick Reference

> **Keep this open while coding!** One-page reference for all critical patterns.

---

## 1. URL Construction

### ❌ WRONG
```typescript
url: `${backendUrl}${endpoint}`  // Sends literal {{$parameter["id"]}}
```

### ✅ CORRECT
```typescript
const urlParts: string[] = [];
const paramRegex = /\{\{\$parameter\["([^"]+)"\]\}\}/g;
let match;

while ((match = paramRegex.exec(endpoint)) !== null) {
  // Add static part
  urlParts.push(`'${endpoint.substring(lastIndex, match.index)}'`);

  const paramName = match[1];
  const userValue = nodeParams[paramName];

  if (isExpression(userValue)) {
    const expr = unwrapExpression(userValue);
    urlParts.push(`encodeURIComponent(${expr})`);
  } else if (userValue) {
    urlParts.push(`'${userValue}'`);  // Literal
  } else {
    urlParts.push(`encodeURIComponent($json.${paramName})`);  // Default
  }
}

const fullUrl = `={{ '${backendUrl}' + ${urlParts.join(' + ')} }}`;
```

**File:** `contact_addTag.ts:30-96`

---

## 2. Body Parameters

### Pre-Defined Fields

```typescript
const bodyObj = {
  name: nodeParams.name,
  email: nodeParams.email,
  phoneNumber: nodeParams.phoneNumber,
};

const bodyParameters = buildBodyParameters(bodyObj);
// Auto-filters undefined/null/empty, auto-normalizes expressions

const httpParameters = {
  sendBody: true,
  contentType: 'json',
  specifyBody: 'keypair',
  bodyParameters: { parameters: bodyParameters },
};
```

**File:** `contact_create.ts:32-40`

---

## 3. fixedCollection - Flatten

### When: Backend expects flat root-level fields

```typescript
// Standard fields
const bodyParameters = buildBodyParameters(bodyObj);

// Flatten fixedCollection
if (nodeParams.contactFields?.field) {
  nodeParams.contactFields.field.forEach(item => {
    bodyParameters.push({
      name: item.fieldName,
      value: normalizeExpression(item.fieldValue)
    });
  });
}
```

**Result:** `{name: 'John', custom_score: 95, custom_source: 'web'}`

**File:** `convertReactFlow2N8n.ts:976-999`

---

## 4. fixedCollection - Object

### When: Backend expects nested object field

```typescript
const payloadValue = buildN8nObjectExpression(
  nodeParams.payloadFields?.field || [],
  '={{ $json }}'
);

const bodyObj = {
  workflowId: nodeParams.workflowId,
  payload: payloadValue,  // Single nested object
};
```

**Result:** `{workflowId: '123', payload: {contactId: 'abc', source: 'web'}}`

**File:** `convertReactFlow2N8n.ts:879-884`

---

## 5. Expression Helpers

```typescript
import {
  isExpression,
  unwrapExpression,
  normalizeExpression,
  buildBodyParameters,
  buildN8nObjectExpression
} from '../utils/expressionHelpers';

// Detect
if (isExpression(value)) { ... }

// Unwrap (for embedding in URLs/objects)
const expr = unwrapExpression('={{$json.id}}');  // → '$json.id'

// Normalize (for body params)
const normalized = normalizeExpression('{{$json.id}}');  // → '={{$json.id}}'

// Build body params (all-in-one)
const params = buildBodyParameters(bodyObj);

// Build object expression
const obj = buildN8nObjectExpression(fields);
```

**File:** `expressionHelpers.ts`

---

## 6. Authentication

```typescript
// In transformation: Use placeholder
const headers = {
  'Content-Type': 'application/json',
  'Authorization': 'Bearer TENANT_API_KEY_PLACEHOLDER',  // ← Placeholder!
};

// Post-compilation: Inject real key
const nodesWithAuth = injectAuthenticationKey(compiledNodes, apiKey);
```

**Files:**
- Placeholder: All transformations
- Injection: `updateWorkflow.ts:150-151`, `injectAuthenticationKey.ts`

---

## 7. Conditional Output

```typescript
// Create HTTP + IF nodes
const httpNode = { /* ... */ };
const ifNode = {
  id: `${id}_if`,
  type: 'n8n-nodes-base.if',
  parameters: {
    conditions: {
      conditions: [
        createBooleanCondition('1', 'found', true)
      ]
    }
  }
};

return {
  nodes: [httpNode, ifNode],
  internalEdges: [{ from: id, to: `${id}_if` }],
  replacements: {
    [id]: {
      incomingTarget: id,
      outgoingSource: `${id}_if`
    }
  }
};
```

**File:** `contact_find.ts:92-157`

---

## Decision Trees

### URL Construction

```
Has URL parameters ({{$parameter["xxx"]}})?
├─ YES → Use expression concatenation pattern
└─ NO → Static string: `${backendUrl}${endpoint}`
```

### Body Fields

```
Know field names ahead of time?
├─ YES → buildBodyParameters(bodyObj)
└─ NO → Flatten fixedCollection
```

### fixedCollection

```
Backend expects nested object?
├─ YES → buildN8nObjectExpression(fields)
└─ NO → Flatten to bodyParameters array
```

### Expression Handling

```
Embedding in another expression?
├─ YES → unwrapExpression() first
└─ NO → normalizeExpression() only
```

---

## Common Mistakes

### 1. URL Literals
```typescript
// ❌ url: `${backendUrl}${endpoint}`
// ✅ url: `={{ '${backendUrl}' + ${urlParts.join(' + ')} }}`
```

### 2. Nested Expressions
```typescript
// ❌ `={{ { id: ={{$json.id}} } }}`
// ✅ `={{ { id: $json.id } }}`  (unwrapped)
```

### 3. Missing Normalization
```typescript
// ❌ value: '{{$json.field}}'  (missing =)
// ✅ value: normalizeExpression('{{$json.field}}')
```

### 4. Hardcoded API Keys
```typescript
// ❌ 'Authorization': 'Bearer ak_123...'
// ✅ 'Authorization': 'Bearer TENANT_API_KEY_PLACEHOLDER'
```

### 5. Including Undefined
```typescript
// ❌ bodyParameters.push({name: 'field', value: undefined})
// ✅ buildBodyParameters(bodyObj)  (auto-filters)
```

---

## File Locations

| Pattern | File |
|---------|------|
| URL Construction | `contact_addTag.ts:30-96` |
| Body Parameters | `contact_create.ts:32-40` |
| fixedCollection Flatten | `convertReactFlow2N8n.ts:976-999` |
| fixedCollection Object | `convertReactFlow2N8n.ts:879-884` |
| Expression Helpers | `expressionHelpers.ts` |
| Authentication Injection | `injectAuthenticationKey.ts` |
| Conditional Output | `contact_find.ts:92-157` |

---

## Testing Checklist

- [ ] URL is n8n expression (not static string)
- [ ] Expressions unwrapped before embedding
- [ ] Literals quoted in URLs
- [ ] Body params filter undefined/null/empty
- [ ] Expressions normalized (have `=` prefix)
- [ ] Authentication uses placeholder
- [ ] fixedCollection uses correct pattern
- [ ] Conditional output has internal edges
- [ ] neverError: true if appropriate

---

## Import Statements

```typescript
// Types
import type {
  Transformation,
  TransformationResult,
  TransformationContext,
  ReactFlowNode,
} from '../types/transformationMethodTypes';
import type { INodeTypeDescription } from '../../../../workflows/services/nodeRegistry/types';
import type { HttpRequestNodeConfig, HttpRequestParameters } from '../n8n/nodeSchemas/HttpRequest.schema';
import { HTTP_REQUEST_DEFAULTS } from '../n8n/nodeSchemas/HttpRequest.schema';

// Helpers
import {
  isExpression,
  unwrapExpression,
  normalizeExpression,
  buildBodyParameters,
  buildN8nObjectExpression
} from '../utils/expressionHelpers';

// Conditional output
import type { IfNodeConfig, IfNodeParameters } from '../n8n/nodeSchemas/If.schema';
import { createBooleanCondition } from '../n8n/nodeSchemas/If.schema';
```

---

## Quick Code Templates

### Basic Transformation

```typescript
export class MyTransformation implements Transformation {
  readonly name = 'my_transformation';
  readonly priority = 50;

  matches(node: ReactFlowNode, config?: INodeTypeDescription): boolean {
    return config?.name === 'pulselineMyNode';
  }

  transform(node: ReactFlowNode, config: INodeTypeDescription, context: TransformationContext): TransformationResult {
    const { id, position, data } = node;
    const nodeParams = data?.parameters || {};

    const backendUrl = process.env.BACKEND_URL || 'https://backend.pulseline.io';
    const endpoint = config._pulseline?.apiEndpoint || '/api/my-endpoint';

    // Build URL (if has parameters)
    // Build body (if has body)
    // Set headers with placeholder

    const httpNode: HttpRequestNodeConfig = {
      id,
      name: id,
      type: HTTP_REQUEST_DEFAULTS.type,
      typeVersion: HTTP_REQUEST_DEFAULTS.typeVersion,
      position: [position.x, position.y],
      parameters: httpParameters,
    };

    return {
      nodes: [httpNode],
      internalEdges: [],
      replacements: {},
      metadata: {
        transformationName: this.name,
        originalNodeId: id,
        originalNodeType: node.type,
        nodesCreated: 1,
      },
    };
  }
}

export const my_transformation = new MyTransformation();
```

### Node Config Template

```typescript
export const myNode: INodeTypeDescription = {
  displayName: 'My Node',
  name: 'pulselineMyNode',
  icon: 'fa:icon',
  group: ['category'],
  version: 1,
  description: 'Description',

  inputs: ['main'],
  outputs: ['main'],

  _pulseline: {
    isCustomNode: true,
    transformationMethod: 'my_transformation',
    apiEndpoint: '/api/my-endpoint',
    httpMethod: 'POST',
    requiresAuth: true,
  },

  properties: [
    {
      displayName: 'Field',
      name: 'field',
      type: 'string',
      default: '',
      required: true,
    },
  ],
};
```

---

## Debugging

### Enable Logging

```typescript
console.log('🌐 Endpoint:', endpoint);
console.log('📦 Parameters:', nodeParams);
console.log('🔧 URL parts:', urlParts);
console.log('✅ Final URL:', fullUrl);
console.log('📝 Body parameters:', bodyParameters);
```

### Common Errors

**"Contact not found" with literal {{$parameter}}**
→ URL not using expression concatenation

**"Invalid syntax" in n8n**
→ Nested expressions (not unwrapped)

**"401 Unauthorized"**
→ Placeholder not replaced or injection skipped

**"Field undefined in API request"**
→ Forgot to filter undefined values

---

## Need More Details?

- **Patterns:** See `patterns/*.md`
- **Examples:** See `examples/*.md`
- **Helpers:** See `helpers/expression-helpers-reference.md`
- **Overview:** See `README.md`
