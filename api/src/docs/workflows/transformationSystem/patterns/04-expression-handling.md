# Expression Handling Pattern

> **CRITICAL:** n8n expressions cannot be nested. Always detect, unwrap, and normalize before embedding in other expressions.

## Overview

n8n uses special syntax for dynamic values:
- `={{...}}` - Expression (evaluated at runtime)
- `{{...}}` - Legacy expression (needs `=` prefix)
- Everything else - Literal value

**The Golden Rule:** When embedding expressions inside other expressions (like object literals or URL concatenation), you MUST unwrap the inner expression first.

---

## Expression Detection

### The Problem

```typescript
const userValue = '={{$json.contactId}}';

// Need to know: Is this an expression or literal string?
```

### The Solution

```typescript
function isExpression(value: any): boolean {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  return trimmed.startsWith('={{') || trimmed.startsWith('{{');
}

// Examples:
isExpression('={{$json.id}}')      // → true
isExpression('{{$json.name}}')     // → true
isExpression('literal value')      // → false
isExpression('123')                // → false
isExpression(null)                 // → false
```

### File Location

```
n8n/transformationSystem/transformationMethodRegistry/utils/expressionHelpers.ts:17-21
```

### When to Use

✅ **Use `isExpression()` when:**
- Deciding whether to quote a value
- Determining if unwrapping is needed
- Building object expressions
- URL construction with mixed types

---

## Expression Unwrapping

### The Problem

```typescript
// ❌ WRONG - Nested expressions (INVALID!)
const expr = '={{$json.contactId}}';
const url = `={{ 'https://api.com/contacts/' + ${expr} }}`;
// Result: ={{ 'https://api.com/contacts/' + ={{$json.contactId}} }}  // SYNTAX ERROR!
```

### The Solution

```typescript
function unwrapExpression(value: any): string {
  const s = String(value).trim();

  if (s.startsWith('={{')) {
    // Remove ={{ and }}
    return s.slice(3, -2).trim();
  } else if (s.startsWith('{{')) {
    // Remove {{ and }}
    return s.slice(2, -2).trim();
  }

  // Not an expression, return as-is
  return s;
}

// Examples:
unwrapExpression('={{$json.contactId}}')  // → '$json.contactId'
unwrapExpression('{{$json.name}}')        // → '$json.name'
unwrapExpression('literal value')         // → 'literal value'
```

### File Location

```
n8n/transformationSystem/transformationMethodRegistry/utils/expressionHelpers.ts:38-51
```

### Critical Use Cases

#### Use Case 1: Building Object Expressions

```typescript
const fields = [
  { name: 'contactId', value: '={{$json.contactId}}' }
];

fields.forEach(field => {
  if (isExpression(field.value)) {
    // ✅ CORRECT - Unwrap before embedding
    const unwrapped = unwrapExpression(field.value);  // '$json.contactId'
    fieldExpressions.push(`"${field.name}": ${unwrapped}`);
  }
});

// Result: ={{ { "contactId": $json.contactId } }}  // VALID!
```

#### Use Case 2: URL Construction

```typescript
const userValue = '={{$json.contactId}}';

if (isExpression(userValue)) {
  // ✅ CORRECT - Unwrap before concatenating
  const expr = unwrapExpression(userValue);  // '$json.contactId'
  urlParts.push(`encodeURIComponent(${expr})`);
}

// Result: encodeURIComponent($json.contactId)  // VALID!
```

### When to Use

✅ **Unwrap expressions when:**
- Embedding in URL concatenation
- Building object literals inside `={{ }}`
- Constructing array literals
- Any nested expression scenario

❌ **DON'T unwrap when:**
- Passing to n8n body parameters (keep wrapped)
- Storing as standalone value
- Expression is already unwrapped

---

## Expression Normalization

### The Problem

n8n requires expressions to start with `=` for evaluation:

```typescript
// ❌ These won't evaluate:
'{{$json.name}}'       // Missing "="
'$json.contactId'      // Missing {{ }} wrappers

// ✅ These will evaluate:
'={{$json.name}}'      // Correct format
```

### The Solution

```typescript
function normalizeExpression(value: any): string {
  const s = String(value).trim();

  if (isExpression(s)) {
    // Ensure leading "="
    return s.startsWith('={{') ? s : '=' + s;
  }

  // Not an expression - return as-is
  return s;
}

// Examples:
normalizeExpression('={{$json.name}}')    // → '={{$json.name}}'    (already correct)
normalizeExpression('{{$json.name}}')     // → '={{$json.name}}'    (add =)
normalizeExpression('literal value')      // → 'literal value'      (no change)
normalizeExpression('123')                // → '123'                (no change)
```

### File Location

```
n8n/transformationSystem/transformationMethodRegistry/utils/expressionHelpers.ts:64-70
```

### When to Use

✅ **Normalize expressions when:**
- Adding to body parameters array
- Storing in n8n node parameters
- User input might be missing `=` prefix
- Interfacing with legacy code

---

## Complete Workflow Example

### Scenario: Building HTTP Request Body

```typescript
// User input from frontend:
nodeParams = {
  name: '={{$json.name}}',           // Expression (correct format)
  email: '{{$json.email}}',          // Expression (missing =)
  phoneNumber: '+1234567890',        // Literal
  score: undefined,                  // Empty
}

// Step 1: Build body object
const bodyObj = {
  name: nodeParams.name,
  email: nodeParams.email,
  phoneNumber: nodeParams.phoneNumber,
  score: nodeParams.score,
};

// Step 2: Convert to body parameters
function buildBodyParameters(bodyObj: Record<string, any>): HttpRequestBodyParameter[] {
  const parameters: HttpRequestBodyParameter[] = [];

  Object.entries(bodyObj).forEach(([name, value]) => {
    // Filter undefined/null/empty
    if (value !== undefined && value !== '' && value !== null) {
      parameters.push({
        name,
        value: normalizeExpression(value),  // ← Normalize each value!
      });
    }
  });

  return parameters;
}

// Result:
bodyParameters = [
  { name: 'name', value: '={{$json.name}}' },      // Already correct
  { name: 'email', value: '={{$json.email}}' },    // ← Added "="
  { name: 'phoneNumber', value: '+1234567890' },   // Literal (no change)
  // score omitted (was undefined)
]

// n8n evaluates at runtime:
{
  "name": "John Doe",          // ← Evaluated from $json.name
  "email": "john@example.com", // ← Evaluated from $json.email
  "phoneNumber": "+1234567890"
}
```

---

## All Helper Functions

### Summary Table

| Function | Input | Output | Purpose |
|----------|-------|--------|---------|
| `isExpression()` | `'={{$json.id}}'` | `true` | Detect if value is expression |
| `unwrapExpression()` | `'={{$json.id}}'` | `'$json.id'` | Remove `={{ }}` wrappers |
| `normalizeExpression()` | `'{{$json.id}}'` | `'={{$json.id}}'` | Ensure `=` prefix |
| `buildBodyParameters()` | `{name: '={{$json.x}}'}` | `[{name: 'name', value: '={{$json.x}}'}]` | Create body param array |
| `buildN8nObjectExpression()` | `[{name: 'id', value: '={{$json.id}}'}]` | `'={{ { id: $json.id } }}'` | Build object expression |

### File Location

```
n8n/transformationSystem/transformationMethodRegistry/utils/expressionHelpers.ts
```

---

## Common Patterns

### Pattern 1: Conditional Quote Wrapping

Use when building JavaScript code strings:

```typescript
const value = nodeParams.someField;

if (isExpression(value)) {
  // Don't quote expressions
  const unwrapped = unwrapExpression(value);
  result = unwrapped;  // Result: $json.someField
} else {
  // Quote literals
  const escaped = value.replace(/'/g, "\\'");
  result = `'${escaped}'`;  // Result: 'literal value'
}
```

### Pattern 2: Safe Embedding

Use when nesting expressions:

```typescript
// Building: ={{ { field1: value1, field2: value2 } }}

const fieldParts: string[] = [];

fields.forEach(field => {
  const name = field.name;
  const value = field.value;

  if (isExpression(value)) {
    // Unwrap before embedding
    const unwrapped = unwrapExpression(value);
    fieldParts.push(`"${name}": ${unwrapped}`);  // No quotes around expression!
  } else {
    // Escape and quote literals
    const escaped = value.replace(/"/g, '\\"');
    fieldParts.push(`"${name}": "${escaped}"`);  // Quotes around literal!
  }
});

const result = `={{ { ${fieldParts.join(', ')} } }}`;
```

### Pattern 3: Array Filtering + Normalization

Use for body parameters:

```typescript
const bodyObj = {
  field1: nodeParams.field1,  // Might be undefined
  field2: nodeParams.field2,  // Might be expression
  field3: nodeParams.field3,  // Might be literal
};

const bodyParameters = Object.entries(bodyObj)
  .filter(([_, value]) => value !== undefined && value !== '' && value !== null)
  .map(([name, value]) => ({
    name,
    value: normalizeExpression(value)  // Ensure expressions have "="
  }));
```

---

## Edge Cases

### Edge Case 1: Operators in Expressions

Expressions with operators need parentheses to preserve precedence:

```typescript
const expr = '={{$json.id || $json.fallbackId}}';
const unwrapped = unwrapExpression(expr);  // '$json.id || $json.fallbackId'

// When embedding in function call, wrap in parentheses:
if (unwrapped.includes('||') || unwrapped.includes('&&') || unwrapped.includes('?')) {
  urlParts.push(`encodeURIComponent((${unwrapped}))`);
} else {
  urlParts.push(`encodeURIComponent(${unwrapped})`);
}

// Result: encodeURIComponent(($json.id || $json.fallbackId))
```

### Edge Case 2: Special Characters in Literals

Escape quotes and backslashes:

```typescript
const literal = 'He said "hello"';
const escaped = literal.replace(/"/g, '\\"');
// Result: 'He said \"hello\"'

// In object expression:
const obj = `={{ { "message": "${escaped}" } }}`;
// Result: ={{ { "message": "He said \"hello\"" } }}
```

### Edge Case 3: Empty/Null Values

Always filter before normalizing:

```typescript
const value = nodeParams.field;  // Could be undefined, null, ''

if (value !== undefined && value !== null && value !== '') {
  const normalized = normalizeExpression(value);
  bodyParameters.push({ name: 'field', value: normalized });
}
// If value was empty, parameter is not added
```

---

## Testing

### Unit Tests

```typescript
describe('Expression Helpers', () => {
  describe('isExpression', () => {
    it('detects ={{ }} expressions', () => {
      expect(isExpression('={{$json.id}}')).toBe(true);
    });

    it('detects {{ }} expressions', () => {
      expect(isExpression('{{$json.name}}')).toBe(true);
    });

    it('rejects literals', () => {
      expect(isExpression('literal')).toBe(false);
      expect(isExpression('123')).toBe(false);
    });

    it('handles non-strings', () => {
      expect(isExpression(null)).toBe(false);
      expect(isExpression(undefined)).toBe(false);
      expect(isExpression(123)).toBe(false);
    });
  });

  describe('unwrapExpression', () => {
    it('unwraps ={{ }} format', () => {
      expect(unwrapExpression('={{$json.id}}')).toBe('$json.id');
    });

    it('unwraps {{ }} format', () => {
      expect(unwrapExpression('{{$json.name}}')).toBe('$json.name');
    });

    it('returns literals unchanged', () => {
      expect(unwrapExpression('literal')).toBe('literal');
    });
  });

  describe('normalizeExpression', () => {
    it('keeps ={{ }} unchanged', () => {
      expect(normalizeExpression('={{$json.id}}')).toBe('={{$json.id}}');
    });

    it('adds = to {{ }} format', () => {
      expect(normalizeExpression('{{$json.id}}')).toBe('={{$json.id}}');
    });

    it('leaves literals unchanged', () => {
      expect(normalizeExpression('literal')).toBe('literal');
    });
  });
});
```

---

## Common Mistakes

### Mistake 1: Not Unwrapping

```typescript
// ❌ WRONG
const value = '={{$json.id}}';
const obj = `={{ { "id": ${value} } }}`;
// Result: ={{ { "id": ={{$json.id}} } }}  // INVALID!

// ✅ CORRECT
const unwrapped = unwrapExpression(value);
const obj = `={{ { "id": ${unwrapped} } }}`;
// Result: ={{ { "id": $json.id } }}  // VALID!
```

### Mistake 2: Not Normalizing

```typescript
// ❌ WRONG
bodyParameters.push({
  name: 'field',
  value: '{{$json.field}}'  // Missing "=" - won't evaluate!
});

// ✅ CORRECT
bodyParameters.push({
  name: 'field',
  value: normalizeExpression('{{$json.field}}')  // → '={{$json.field}}'
});
```

### Mistake 3: Quoting Expressions

```typescript
// ❌ WRONG
if (isExpression(value)) {
  const unwrapped = unwrapExpression(value);
  fieldParts.push(`"${name}": "${unwrapped}"`);  // Don't quote expressions!
}

// ✅ CORRECT
if (isExpression(value)) {
  const unwrapped = unwrapExpression(value);
  fieldParts.push(`"${name}": ${unwrapped}`);  // No quotes!
}
```

### Mistake 4: Not Escaping Literals

```typescript
// ❌ WRONG
const literal = 'He said "hello"';
const obj = `={{ { "message": "${literal}" } }}`;
// Result: ={{ { "message": "He said "hello"" } }}  // BROKEN!

// ✅ CORRECT
const escaped = literal.replace(/"/g, '\\"');
const obj = `={{ { "message": "${escaped}" } }}`;
// Result: ={{ { "message": "He said \"hello\"" } }}  // VALID!
```

---

## Summary

✅ **DO:**
- Detect expressions with `isExpression()`
- Unwrap before embedding in other expressions
- Normalize when storing in n8n parameters
- Filter undefined/null before processing
- Escape special characters in literals
- Use helper functions (don't reimplement)

❌ **DON'T:**
- Nest `={{ }}` wrappers
- Quote expressions (only quote literals)
- Skip normalization for user input
- Include undefined values in body parameters
- Forget to escape quotes in literals
- Mix expression handling patterns

---

## Quick Reference

```typescript
// Detect
if (isExpression(value)) { ... }

// Unwrap (for embedding)
const unwrapped = unwrapExpression(value);

// Normalize (for storing)
const normalized = normalizeExpression(value);

// Build body params (all-in-one)
const params = buildBodyParameters(bodyObj);

// Build object (for nested fields)
const obj = buildN8nObjectExpression(fields);
```

**File:** `n8n/transformationSystem/transformationMethodRegistry/utils/expressionHelpers.ts`
