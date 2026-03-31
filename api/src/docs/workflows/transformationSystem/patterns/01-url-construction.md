# URL Construction Pattern

> **CRITICAL:** This is the most common source of bugs. URLs with parameters MUST use n8n expression concatenation, not string templates.

## The Problem

When building HTTP Request node URLs that contain dynamic parameters (like `contactId`, `tagId`, etc.), **static string concatenation sends literal placeholder text to n8n instead of evaluated values**.

### What Breaks

```typescript
// ❌ BROKEN CODE
const endpoint = '/api/contacts/{{$parameter["contactId"]}}/tags/{{$parameter["tagId"]}}/add';
const url = `${backendUrl}${endpoint}`;

// Result sent to n8n:
// url = 'https://backend.pulseline.io/api/contacts/{{$parameter["contactId"]}}/tags/{{$parameter["tagId"]}}/add'

// At runtime, n8n makes request to:
// POST https://backend.pulseline.io/api/contacts/%7B%7B$parameter[%22contactId%22]%7D%7D/tags/...
// ❌ Backend receives literal string instead of actual contactId!
```

### Error Symptoms

```
🏷️  Add tag {{$parameter["tagId"]}} to contact {{$parameter["contactId"]}}
❌ Error: Contact not found
```

The backend logs show it's searching for a contact with ID `"{{$parameter["contactId"]}}"` (literal string) instead of the actual value like `"abc123"`.

## The Solution

Use **n8n expression concatenation** to build URLs with dynamic parts:

```typescript
// ✅ CORRECT CODE
const endpoint = '/api/contacts/{{$parameter["contactId"]}}/tags/{{$parameter["tagId"]}}/add';

// Parse endpoint to find all {{$parameter["xxx"]}} placeholders
const urlParts: string[] = [];
const paramRegex = /\{\{\$parameter\["([^"]+)"\]\}\}/g;
let match;

while ((match = paramRegex.exec(endpoint)) !== null) {
  // Add static part before this parameter
  const staticPart = endpoint.substring(lastIndex, match.index);
  if (staticPart) urlParts.push(`'${staticPart}'`);

  // Add dynamic parameter
  const paramName = match[1];  // e.g., "contactId"
  const userValue = nodeParams[paramName];

  if (userValue?.startsWith('={{') || userValue?.startsWith('{{')) {
    // User provided an expression - unwrap and encode
    const expr = userValue.slice(3, -2).trim();  // Remove ={{ and }}
    urlParts.push(`encodeURIComponent(${expr})`);
  } else if (userValue) {
    // User provided a literal value - add with quotes
    urlParts.push(`'${userValue}'`);
  } else {
    // No user value - default to $json.paramName
    urlParts.push(`encodeURIComponent($json.${paramName})`);
  }
}

// Build n8n expression
const fullUrl = `={{ '${backendUrl}' + ${urlParts.join(' + ')} }}`;

// Result:
// url = "={{ 'https://backend.pulseline.io' + '/api/contacts/' + encodeURIComponent($json.contactId) + '/tags/' + '87fd7136...' + '/add' }}"

// At runtime, n8n evaluates this to:
// url = 'https://backend.pulseline.io/api/contacts/abc123/tags/87fd7136.../add'
// ✅ Backend receives actual values!
```

## Implementation Steps

### Step 1: Define Endpoint Template in Node Config

```typescript
// File: workflows/services/nodeRegistry/nodes/pulseline/addContactTag.config.ts

export const pulselineAddContactTagNode: INodeTypeDescription = {
  // ...
  _pulseline: {
    transformationMethod: 'contact_addTag',
    apiEndpoint: '/api/contacts/{{$parameter["contactId"]}}/tags/{{$parameter["tagId"]}}/add',
    //                          ^^^^^^^^^^^^^^^^^^^^^^^^      ^^^^^^^^^^^^^^^^^^^^^^^^
    //                          These will be replaced with actual values
  },

  properties: [
    {
      displayName: 'Contact ID',
      name: 'contactId',  // ← This name must match the parameter in endpoint
      type: 'string',
      default: '{{$contact.contactId}}',  // Default n8n expression
    },
    {
      displayName: 'Tag',
      name: 'tagId',  // ← This name must match the parameter in endpoint
      type: 'options',  // Dropdown - provides literal UUID value
    },
  ],
};
```

### Step 2: Build URL in Transformation Method

```typescript
// File: n8n/transformationSystem/transformationMethodRegistry/contactManagement/contact_addTag.ts

transform(node: ReactFlowNode, config: INodeTypeDescription, context: TransformationContext): TransformationResult {
  const { id, position, data } = node;
  const nodeParams = data?.parameters || {};

  const backendUrl = process.env.BACKEND_URL || 'https://backend.pulseline.io';
  const endpoint = config._pulseline?.apiEndpoint || '/api/contacts/{{$parameter["contactId"]}}/tags/{{$parameter["tagId"]}}/add';

  // Build URL with n8n expression concatenation
  const urlParts: string[] = [];
  let lastIndex = 0;
  const paramRegex = /\{\{\$parameter\["([^"]+)"\]\}\}/g;
  let match;
  let hasUrlExpressions = false;

  while ((match = paramRegex.exec(endpoint)) !== null) {
    hasUrlExpressions = true;

    // Add static part before this match
    if (match.index > lastIndex) {
      const staticPart = endpoint.substring(lastIndex, match.index);
      urlParts.push(`'${staticPart}'`);
    }

    // Add dynamic part
    const paramName = match[1];
    const userValue = nodeParams[paramName];

    if (userValue !== undefined && userValue !== '') {
      const strValue = String(userValue).trim();

      if (strValue.startsWith('={{') || strValue.startsWith('{{')) {
        // It's an n8n expression - unwrap and encode
        let expr = strValue;
        if (expr.startsWith('={{')) {
          expr = expr.slice(3, -2).trim();  // Remove ={{ and }}
        } else if (expr.startsWith('{{')) {
          expr = expr.slice(2, -2).trim();  // Remove {{ and }}
        }

        // Wrap expression in parentheses if it contains operators
        if (expr.includes('||') || expr.includes('&&') || expr.includes('?')) {
          expr = `(${expr})`;
        }

        urlParts.push(`encodeURIComponent(${expr})`);
      } else {
        // It's a literal value (like a UUID from dropdown) - add as-is with quotes
        urlParts.push(`'${strValue}'`);
      }
    } else {
      // Default to $json.paramName
      urlParts.push(`encodeURIComponent($json.${paramName})`);
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining static part
  if (lastIndex < endpoint.length) {
    const staticPart = endpoint.substring(lastIndex);
    if (staticPart) {
      urlParts.push(`'${staticPart}'`);
    }
  }

  // Build full URL using n8n expression syntax
  let fullUrl: string;
  if (hasUrlExpressions) {
    const urlExpression = `'${backendUrl}' + ${urlParts.join(' + ')}`;
    fullUrl = `={{ ${urlExpression} }}`;
  } else {
    // No parameters - use static URL
    fullUrl = `${backendUrl}${endpoint}`;
  }

  // Use fullUrl in HTTP node configuration
  const httpParameters: HttpRequestParameters = {
    method: 'POST',
    url: fullUrl,  // ← n8n expression, not static string!
    // ...
  };

  // Return HTTP node...
}
```

## Real-World Examples

### Example 1: Expression Parameter

User provides an n8n expression as the parameter value:

```typescript
// Frontend - User enters in Contact ID field:
"={{$json.contactId}}"

// Transformation processes:
nodeParams.contactId = "={{$json.contactId}}"
strValue = "={{$json.contactId}}"
// Detected as expression, unwrap:
expr = "$json.contactId"
// Add to URL parts:
urlParts.push("encodeURIComponent($json.contactId)")

// Final URL:
url = "={{ 'https://backend.pulseline.io' + '/api/contacts/' + encodeURIComponent($json.contactId) + '/tags/' + '87fd7136-71d9-4aa8-a92a-083942561b00' + '/add' }}"

// At runtime, if $json.contactId = "abc123":
url = "https://backend.pulseline.io/api/contacts/abc123/tags/87fd7136-71d9-4aa8-a92a-083942561b00/add"
```

### Example 2: Literal Parameter

User selects from a dropdown (provides literal UUID):

```typescript
// Frontend - User selects tag from dropdown:
// tagId = "87fd7136-71d9-4aa8-a92a-083942561b00"

// Transformation processes:
nodeParams.tagId = "87fd7136-71d9-4aa8-a92a-083942561b00"
strValue = "87fd7136-71d9-4aa8-a92a-083942561b00"
// Not an expression - add as literal with quotes:
urlParts.push("'87fd7136-71d9-4aa8-a92a-083942561b00'")

// Final URL:
url = "={{ 'https://backend.pulseline.io' + '/api/contacts/' + encodeURIComponent($json.contactId) + '/tags/' + '87fd7136-71d9-4aa8-a92a-083942561b00' + '/add' }}"
```

### Example 3: Default to $json

User doesn't provide a value - use $json fallback:

```typescript
// Frontend - User leaves Contact ID empty

// Transformation processes:
nodeParams.contactId = undefined
// No user value - default to $json:
urlParts.push("encodeURIComponent($json.contactId)")

// Final URL uses $json.contactId from previous node's output
```

## Edge Cases

### 1. Empty Parameter

If user provides empty string, fall back to `$json`:

```typescript
if (userValue !== undefined && userValue !== '') {
  // Use user value
} else {
  // Default to $json.paramName
  urlParts.push(`encodeURIComponent($json.${paramName})`);
}
```

### 2. Operators in Expression

If expression contains operators, wrap in parentheses to preserve precedence:

```typescript
// Input: "={{$json.id || $json.fallbackId}}"
// After unwrap: "$json.id || $json.fallbackId"

if (expr.includes('||') || expr.includes('&&') || expr.includes('?')) {
  expr = `(${expr})`;
}
// Result: "($json.id || $json.fallbackId)"

urlParts.push(`encodeURIComponent(${expr})`);
// Final: "encodeURIComponent(($json.id || $json.fallbackId))"
```

### 3. No URL Parameters (Static URL)

If endpoint has no `{{$parameter}}` placeholders, use static URL:

```typescript
const endpoint = '/api/contacts';  // No parameters

if (hasUrlExpressions) {
  fullUrl = `={{ '${backendUrl}' + ${urlParts.join(' + ')} }}`;
} else {
  // No expressions - use static string
  fullUrl = `${backendUrl}${endpoint}`;
  // Result: 'https://backend.pulseline.io/api/contacts'
}
```

## Files Using This Pattern

All transformations with URL parameters MUST use this pattern:

- ✅ `contact_addTag.ts:30-96`
- ✅ `contact_removeTag.ts:30-96`
- ✅ `contact_update.ts:31-97`
- ✅ `contact_delete.ts:30-96`

Static URLs (no parameters) can use simple concatenation:

- `contact_create.ts` - `/api/contacts` (no parameters)
- `contact_find.ts` - `/api/contacts/find` (no parameters)
- `opportunity_create.ts` - `/api/opportunities/opportunities` (no parameters)

## Testing Your Implementation

### Unit Test

```typescript
// Test with expression parameter
const node = {
  data: {
    parameters: {
      contactId: '={{$json.contactId}}',
      tagId: '87fd7136-71d9-4aa8-a92a-083942561b00'
    }
  }
};

const result = transformation.transform(node, config, context);
const httpNode = result.nodes[0];

expect(httpNode.parameters.url).toBe(
  "={{ 'https://backend.pulseline.io' + '/api/contacts/' + encodeURIComponent($json.contactId) + '/tags/' + '87fd7136-71d9-4aa8-a92a-083942561b00' + '/add' }}"
);
```

### Integration Test

1. Create workflow with Add Contact Tag node
2. Set contactId to `={{$json.contactId}}`
3. Select a tag from dropdown
4. Save workflow (triggers transformation)
5. Check compiled n8n workflow in Firestore
6. Verify URL is n8n expression, not literal string

## Debugging

Enable logging to see URL construction:

```typescript
console.log('🌐 Endpoint template:', endpoint);
console.log('📦 Node parameters:', nodeParams);
console.log('🔧 URL parts:', urlParts);
console.log('✅ Final URL:', fullUrl);
```

Expected output:

```
🌐 Endpoint template: /api/contacts/{{$parameter["contactId"]}}/tags/{{$parameter["tagId"]}}/add
📦 Node parameters: { contactId: '={{$json.contactId}}', tagId: '87fd7136...' }
🔧 URL parts: [ "'/api/contacts/'", "encodeURIComponent($json.contactId)", "'/tags/'", "'87fd7136...'", "'/add'" ]
✅ Final URL: ={{ 'https://backend.pulseline.io' + '/api/contacts/' + encodeURIComponent($json.contactId) + '/tags/' + '87fd7136...' + '/add' }}
```

## Common Mistakes

### Mistake 1: Using Template Literal Directly

```typescript
// ❌ WRONG
const url = `${backendUrl}${endpoint}`;
```

### Mistake 2: Not Unwrapping Expressions

```typescript
// ❌ WRONG - Keeps the ={{ }} wrappers
urlParts.push(userValue);
// Result: ...+ ={{$json.contactId}} +...  // INVALID SYNTAX!

// ✅ CORRECT - Unwrap first
const expr = userValue.slice(3, -2).trim();
urlParts.push(`encodeURIComponent(${expr})`);
```

### Mistake 3: Encoding Literal Values

```typescript
// ❌ WRONG - Literal UUID wrapped in encodeURIComponent
urlParts.push(`encodeURIComponent('${userValue}')`);

// ✅ CORRECT - Literal values just use quotes
urlParts.push(`'${userValue}'`);
```

### Mistake 4: Forgetting Static Parts

```typescript
// ❌ WRONG - Missing '/tags/' and '/add' parts
urlParts = ["encodeURIComponent($json.contactId)", "'87fd...'"];

// ✅ CORRECT - Include all static parts
urlParts = [
  "'/api/contacts/'",
  "encodeURIComponent($json.contactId)",
  "'/tags/'",
  "'87fd...'",
  "'/add'"
];
```

## Summary

✅ **DO:**
- Parse endpoint template with regex
- Detect if parameter is expression or literal
- Unwrap expressions before embedding
- Use `encodeURIComponent()` for expressions
- Use quotes for literal values
- Join all parts with `+` operator
- Wrap final result in `={{ ... }}`

❌ **DON'T:**
- Use template literal concatenation
- Send literal `{{$parameter}}` strings to n8n
- Forget to unwrap expressions
- Encode literal values
- Skip static parts between parameters
