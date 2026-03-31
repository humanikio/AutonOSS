# Expression Helpers - API Reference

> **File:** `n8n/transformationSystem/transformationMethodRegistry/utils/expressionHelpers.ts`

## Quick Reference

| Function | Input | Output | Use Case |
|----------|-------|--------|----------|
| `isExpression()` | `'={{$json.id}}'` | `true` | Detect expressions vs literals |
| `unwrapExpression()` | `'={{$json.id}}'` | `'$json.id'` | Remove wrappers for embedding |
| `normalizeExpression()` | `'{{$json.id}}'` | `'={{$json.id}}'` | Ensure `=` prefix |
| `buildBodyParameters()` | `{name: '={{$json.x}}'}` | `[{name: 'name', value: '={{$json.x}}'}]` | Create body param array |
| `buildN8nObjectExpression()` | `[{name: 'id', value: '={{$json.id}}'}]` | `'={{ { id: $json.id } }}'` | Build nested object |

---

## isExpression()

**Detect if a value is an n8n expression.**

```typescript
function isExpression(value: any): boolean
```

### Parameters
- `value: any` - Value to check

### Returns
- `boolean` - `true` if value starts with `={{` or `{{`, `false` otherwise

### Examples

```typescript
isExpression('={{$json.contactId}}')  // → true
isExpression('{{$json.name}}')        // → true
isExpression('literal value')         // → false
isExpression('123')                   // → false
isExpression(null)                    // → false
isExpression(undefined)               // → false
isExpression(123)                     // → false
```

### Use Cases

✅ Deciding whether to quote a value
✅ Determining if unwrapping is needed
✅ Building object expressions
✅ URL construction with mixed types

---

## unwrapExpression()

**Remove `={{ }}` or `{{ }}` wrappers from expressions.**

```typescript
function unwrapExpression(value: any): string
```

### Parameters
- `value: any` - Expression to unwrap

### Returns
- `string` - Expression without wrappers

### Examples

```typescript
unwrapExpression('={{$json.contactId}}')     // → '$json.contactId'
unwrapExpression('{{$json.name}}')           // → '$json.name'
unwrapExpression('={{$json.id || "default"}}') // → '$json.id || "default"'
unwrapExpression('literal value')            // → 'literal value' (no change)
```

### Critical Use Cases

**1. Building Object Expressions**
```typescript
// ❌ WRONG - Nested wrappers
const obj = `={{ { id: ={{$json.id}} } }}`;  // INVALID!

// ✅ CORRECT - Unwrap first
const unwrapped = unwrapExpression('={{$json.id}}');
const obj = `={{ { id: ${unwrapped} } }}`;  // VALID!
```

**2. URL Construction**
```typescript
const userValue = '={{$json.contactId}}';
const expr = unwrapExpression(userValue);  // '$json.contactId'
urlParts.push(`encodeURIComponent(${expr})`);
```

---

## normalizeExpression()

**Ensure expressions have `=` prefix for n8n evaluation.**

```typescript
function normalizeExpression(value: any): string
```

### Parameters
- `value: any` - Value to normalize

### Returns
- `string` - Normalized expression with `=` prefix

### Examples

```typescript
normalizeExpression('={{$json.name}}')   // → '={{$json.name}}' (already correct)
normalizeExpression('{{$json.name}}')    // → '={{$json.name}}' (add =)
normalizeExpression('literal value')     // → 'literal value' (no change)
normalizeExpression('123')               // → '123' (no change)
```

### Use Cases

✅ Adding to body parameters
✅ Storing in node parameters
✅ Processing user input
✅ Interfacing with legacy code

---

## buildBodyParameters()

**Convert object to n8n body parameters array, filtering undefined/null/empty values.**

```typescript
function buildBodyParameters(
  bodyObj: Record<string, any>
): HttpRequestBodyParameter[]
```

### Parameters
- `bodyObj: Record<string, any>` - Object with field names and values

### Returns
- `HttpRequestBodyParameter[]` - Array of `{name, value}` pairs

### Type Definition

```typescript
interface HttpRequestBodyParameter {
  name: string;
  value: string;
}
```

### Examples

```typescript
// Basic usage
const bodyObj = {
  name: '={{$json.name}}',
  phoneNumber: '+1234567890',
  email: undefined,  // Will be filtered out
  notes: '',         // Will be filtered out
  score: null,       // Will be filtered out
};

const result = buildBodyParameters(bodyObj);
// [
//   { name: 'name', value: '={{$json.name}}' },
//   { name: 'phoneNumber', value: '+1234567890' }
// ]
```

### Behavior

- ✅ Normalizes expressions (adds `=` if missing)
- ✅ Filters out `undefined` values
- ✅ Filters out `null` values
- ✅ Filters out empty strings `''`
- ✅ Preserves all other values (including `0`, `false`)

### Use Case

```typescript
const httpParameters: HttpRequestParameters = {
  method: 'POST',
  url: '...',
  sendBody: true,
  contentType: 'json',
  specifyBody: 'keypair',
  bodyParameters: {
    parameters: buildBodyParameters(bodyObj)  // ← Use helper
  },
};
```

---

## buildN8nObjectExpression()

**Convert field pairs into a single n8n object expression.**

```typescript
function buildN8nObjectExpression(
  fields: Array<{ name: string; value: any }>,
  fallback: string = '={{ $json }}'
): string
```

### Parameters
- `fields: Array<{ name, value }>` - Field pairs to convert
- `fallback: string` - Fallback if no fields (default: `'={{ $json }}'`)

### Returns
- `string` - n8n object expression

### Examples

```typescript
// Example 1: Mixed expressions and literals
const fields = [
  { name: 'contactId', value: '={{$json.contactId}}' },
  { name: 'source', value: 'web' },
  { name: 'score', value: '={{$json.score}}' }
];

buildN8nObjectExpression(fields);
// → '={{ { "contactId": $json.contactId, "source": "web", "score": $json.score } }}'

// Example 2: Empty array
buildN8nObjectExpression([]);
// → '={{ $json }}' (uses fallback)

// Example 3: Special characters
const fields = [
  { name: 'message', value: 'He said "hello"' }
];

buildN8nObjectExpression(fields);
// → '={{ { "message": "He said \\"hello\\"" } }}'
```

### Behavior

- ✅ Unwraps expressions before embedding
- ✅ Escapes double quotes in literal values
- ✅ Skips fields with undefined/missing names
- ✅ Returns fallback if array is empty

### CRITICAL: Expression Unwrapping

```typescript
// Input with wrapped expression
{ name: 'id', value: '={{$json.id}}' }

// Processing:
1. Detect as expression: isExpression('={{$json.id}}') → true
2. Unwrap: unwrapExpression('={{$json.id}}') → '$json.id'
3. Embed WITHOUT quotes: `"id": $json.id`

// Result (VALID):
'={{ { "id": $json.id } }}'

// NOT (INVALID):
'={{ { "id": ={{$json.id}} } }}'  // ❌ Nested expressions!
```

### Use Cases

**Trigger Workflow Payload**
```typescript
const payloadFields = [
  { name: 'contactId', value: '={{$json.contactId}}' },
  { name: 'eventType', value: 'form_submitted' }
];

const bodyObj = {
  workflowId: nodeParams.workflowId,
  payload: buildN8nObjectExpression(payloadFields)
};
```

**Custom Object Fields**
```typescript
const metadataFields = [
  { name: 'userId', value: '={{$json.userId}}' },
  { name: 'timestamp', value: '={{$now}}' }
];

const metadata = buildN8nObjectExpression(metadataFields);
```

---

## Import Statement

```typescript
import {
  isExpression,
  unwrapExpression,
  normalizeExpression,
  buildBodyParameters,
  buildN8nObjectExpression
} from '../utils/expressionHelpers';
```

---

## Decision Tree

### For URL Construction

```
Is the parameter value an expression?
├─ YES → unwrapExpression() → encodeURIComponent(expr)
└─ NO → Add with quotes: '${value}'
```

### For Body Parameters

```
Use buildBodyParameters(bodyObj)
- Automatically filters undefined/null/empty
- Automatically normalizes expressions
```

### For Object Fields

```
Does backend expect nested object?
├─ YES → buildN8nObjectExpression(fields)
└─ NO → Flatten to body parameters array
```

---

## Common Patterns

### Pattern 1: Mixed Expression/Literal Handling

```typescript
const value = nodeParams.someField;

if (isExpression(value)) {
  const unwrapped = unwrapExpression(value);
  // Use unwrapped expression
} else {
  // Use literal value with quotes
  const escaped = value.replace(/'/g, "\\'");
  const quoted = `'${escaped}'`;
}
```

### Pattern 2: Safe Body Building

```typescript
const bodyObj = {
  field1: nodeParams.field1,  // Could be undefined
  field2: nodeParams.field2,  // Could be expression
  field3: nodeParams.field3,  // Could be literal
};

// One-liner: filters + normalizes
const bodyParameters = buildBodyParameters(bodyObj);
```

### Pattern 3: Conditional Object Building

```typescript
let payloadValue: string;

if (payloadMode === 'fields') {
  payloadValue = buildN8nObjectExpression(
    nodeParams.payloadFields?.field || [],
    '={{ $json }}'
  );
} else if (payloadMode === 'passthrough') {
  payloadValue = '={{ $json }}';
} else {
  payloadValue = nodeParams.payload;
}
```

---

## Summary

**isExpression()** - Detect expressions
**unwrapExpression()** - Remove wrappers for nesting
**normalizeExpression()** - Ensure `=` prefix
**buildBodyParameters()** - Filter + normalize for body
**buildN8nObjectExpression()** - Build nested objects

**Never nest `={{ }}` wrappers - always unwrap first!**
