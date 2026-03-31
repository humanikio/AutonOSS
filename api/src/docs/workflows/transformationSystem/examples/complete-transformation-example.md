# Complete Transformation Example

> **Real-world implementation:** Contact Tag transformation demonstrating all core patterns.

## Overview

This example shows a complete transformation implementing:
- ✅ URL construction with expressions and literals
- ✅ Authentication placeholder injection
- ✅ Expression detection and unwrapping
- ✅ No body parameters (URL-based API)

**Node:** Add Contact Tag
**API:** `POST /api/contacts/{contactId}/tags/{tagId}/add`

---

## Step 1: Node Config

```typescript
// File: workflows/services/nodeRegistry/nodes/pulseline/addContactTag.config.ts

export const pulselineAddContactTagNode: INodeTypeDescription = {
  displayName: 'Add Contact Tag',
  name: 'pulselineAddContactTag',
  icon: 'fa:tag',
  group: ['contactManagement'],
  version: 1,
  description: 'Add a tag to a contact',

  inputs: ['main'],
  outputs: ['main'],

  _pulseline: {
    isCustomNode: true,
    transformationMethod: 'contact_addTag',  // ← Links to transformation
    apiEndpoint: '/api/contacts/{{$parameter["contactId"]}}/tags/{{$parameter["tagId"]}}/add',
    //                          ^^^^^^^^^^^^^^^^^^^^^^^^^^^^      ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    //                          These become URL parameters
    httpMethod: 'POST',
    requiresAuth: true,
  },

  properties: [
    {
      displayName: 'Contact ID',
      name: 'contactId',  // ← Must match {{$parameter["contactId"]}}
      type: 'string',
      default: '{{$contact.contactId}}',  // Default expression
      required: true,
    },
    {
      displayName: 'Tag',
      name: 'tagId',  // ← Must match {{$parameter["tagId"]}}
      type: 'options',  // Dropdown provides literal UUID
      typeOptions: {
        loadOptionsMethod: 'getTags',  // Load tags from backend
      },
      required: true,
    },
  ],
};
```

**Key Points:**
- `apiEndpoint` template has `{{$parameter["xxx"]}}` placeholders
- Property names match parameter names in template
- `transformationMethod` links to transformation class

---

## Step 2: Transformation Implementation

```typescript
// File: n8n/transformationSystem/transformationMethodRegistry/contactManagement/contact_addTag.ts

import type {
  Transformation,
  TransformationResult,
  TransformationContext,
  ReactFlowNode,
} from '../types/transformationMethodTypes';
import type { INodeTypeDescription } from '../../../../workflows/services/nodeRegistry/types';
import type { HttpRequestNodeConfig, HttpRequestParameters } from '../n8n/nodeSchemas/HttpRequest.schema';
import { HTTP_REQUEST_DEFAULTS } from '../n8n/nodeSchemas/HttpRequest.schema';

export class AddContactTagTransformation implements Transformation {
  readonly name = 'contact_addTag';
  readonly priority = 50;

  matches(node: ReactFlowNode, config?: INodeTypeDescription): boolean {
    return config?.name === 'pulselineAddContactTag';
  }

  transform(
    node: ReactFlowNode,
    config: INodeTypeDescription,
    context: TransformationContext
  ): TransformationResult {
    const { id, position, data } = node;
    const nodeParams = data?.parameters || {};

    // Backend URL from environment
    const backendUrl = process.env.BACKEND_URL || 'https://backend.pulseline.io';

    // Endpoint template from config
    const endpoint = config._pulseline?.apiEndpoint ||
      '/api/contacts/{{$parameter["contactId"]}}/tags/{{$parameter["tagId"]}}/add';

    // ========================================================================
    // PATTERN: URL Construction with Expression Concatenation
    // ========================================================================

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

      // Extract parameter name
      const paramName = match[1];  // e.g., "contactId" or "tagId"
      const userValue = nodeParams[paramName];

      if (userValue !== undefined && userValue !== '') {
        const strValue = String(userValue).trim();

        // PATTERN: Expression Detection
        if (strValue.startsWith('={{') || strValue.startsWith('{{')) {
          // It's an n8n expression - unwrap and encode

          // PATTERN: Expression Unwrapping
          let expr = strValue;
          if (expr.startsWith('={{')) {
            expr = expr.slice(3, -2).trim();  // Remove ={{ and }}
          } else if (expr.startsWith('{{')) {
            expr = expr.slice(2, -2).trim();  // Remove {{ and }}
          }

          // Handle operators (preserve precedence)
          if (expr.includes('||') || expr.includes('&&') || expr.includes('?')) {
            expr = `(${expr})`;
          }

          urlParts.push(`encodeURIComponent(${expr})`);
        } else {
          // It's a literal value (like UUID from dropdown) - add with quotes
          urlParts.push(`'${strValue}'`);
        }
      } else {
        // No user value - default to $json.paramName
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
      fullUrl = `${backendUrl}${endpoint}`;
    }

    // ========================================================================
    // PATTERN: Authentication Placeholder Injection
    // ========================================================================

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer TENANT_API_KEY_PLACEHOLDER',  // ← Placeholder!
    };

    // ========================================================================
    // HTTP Node Configuration
    // ========================================================================

    const httpParameters: HttpRequestParameters = {
      method: 'POST',
      url: fullUrl,  // ← n8n expression, not static string!
      authentication: 'none',
      sendBody: false,  // No body needed - parameters are in URL
      sendHeaders: true,
      specifyHeaders: 'json',
      jsonHeaders: JSON.stringify(headers),
      options: {
        response: {
          response: {
            neverError: true,  // Continue workflow even if API errors
          },
        },
      },
    };

    const httpNode: HttpRequestNodeConfig = {
      id,
      name: id,  // Use node ID for stable references
      type: HTTP_REQUEST_DEFAULTS.type,
      typeVersion: HTTP_REQUEST_DEFAULTS.typeVersion,
      position: [position.x, position.y],
      parameters: httpParameters,
    };

    // ========================================================================
    // Return Result
    // ========================================================================

    return {
      nodes: [httpNode],
      internalEdges: [],
      replacements: {},
      metadata: {
        transformationName: this.name,
        originalNodeId: id,
        originalNodeType: node.type,
        nodesCreated: 1,
        custom: { endpoint, contactId: nodeParams.contactId, tagId: nodeParams.tagId },
      },
    };
  }
}

export const contact_addTag = new AddContactTagTransformation();
```

---

## Step 3: Runtime Example

### User Input

```typescript
// User configures node in frontend:
nodeParams = {
  contactId: '={{$json.contactId}}',              // Expression from previous node
  tagId: '87fd7136-71d9-4aa8-a92a-083942561b00'   // Literal UUID from dropdown
}
```

### Transformation Processing

**URL Construction:**

```typescript
// Parse endpoint: '/api/contacts/{{$parameter["contactId"]}}/tags/{{$parameter["tagId"]}}/add'

// First match: {{$parameter["contactId"]}}
paramName = 'contactId'
userValue = '={{$json.contactId}}'
// Detected as expression
expr = '$json.contactId'  // Unwrapped
urlParts = ["'/api/contacts/'", "encodeURIComponent($json.contactId)"]

// Second match: {{$parameter["tagId"]}}
paramName = 'tagId'
userValue = '87fd7136-71d9-4aa8-a92a-083942561b00'
// Detected as literal
urlParts = ["'/api/contacts/'", "encodeURIComponent($json.contactId)", "'/tags/'", "'87fd7136-71d9-4aa8-a92a-083942561b00'"]

// Remaining static part: '/add'
urlParts = ["'/api/contacts/'", "encodeURIComponent($json.contactId)", "'/tags/'", "'87fd7136-71d9-4aa8-a92a-083942561b00'", "'/add'"]

// Build final URL
urlExpression = "'https://backend.pulseline.io' + '/api/contacts/' + encodeURIComponent($json.contactId) + '/tags/' + '87fd7136-71d9-4aa8-a92a-083942561b00' + '/add'"

fullUrl = "={{ 'https://backend.pulseline.io' + '/api/contacts/' + encodeURIComponent($json.contactId) + '/tags/' + '87fd7136-71d9-4aa8-a92a-083942561b00' + '/add' }}"
```

### Compiled n8n Node

```json
{
  "id": "add-tag-node-1",
  "name": "add-tag-node-1",
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 4.2,
  "position": [500, 200],
  "parameters": {
    "method": "POST",
    "url": "={{ 'https://backend.pulseline.io' + '/api/contacts/' + encodeURIComponent($json.contactId) + '/tags/' + '87fd7136-71d9-4aa8-a92a-083942561b00' + '/add' }}",
    "authentication": "none",
    "sendBody": false,
    "sendHeaders": true,
    "specifyHeaders": "json",
    "jsonHeaders": "{\"Content-Type\":\"application/json\",\"Authorization\":\"Bearer TENANT_API_KEY_PLACEHOLDER\"}",
    "options": {
      "response": {
        "response": {
          "neverError": true
        }
      }
    }
  }
}
```

### After Authentication Injection

```json
{
  "jsonHeaders": "{\"Content-Type\":\"application/json\",\"Authorization\":\"Bearer ak_1234567890.sk_abcdef1234567890\"}"
}
```

### n8n Runtime Evaluation

```typescript
// Previous node output:
$json = {
  contactId: "contact-abc123",
  name: "John Doe",
  // ...
}

// n8n evaluates URL expression:
url = 'https://backend.pulseline.io' + '/api/contacts/' + encodeURIComponent('contact-abc123') + '/tags/' + '87fd7136-71d9-4aa8-a92a-083942561b00' + '/add'

// Final HTTP request:
POST https://backend.pulseline.io/api/contacts/contact-abc123/tags/87fd7136-71d9-4aa8-a92a-083942561b00/add
Headers:
  Content-Type: application/json
  Authorization: Bearer ak_1234567890.sk_abcdef1234567890
```

---

## Step 4: Complete Call Flow

```
1. User saves workflow in frontend
   ↓
2. workflows/services/workflowCrudManager/updateWorkflow.ts
   ↓ Get/create API key: getOrCreateAccountApiKey(tenantId, userId)
   ↓
3. n8n/transformationSystem/services/transform2N8n.ts
   ↓ Load ReactFlow workflow from Firestore
   ↓ Topological sort to determine execution order
   ↓
4. n8n/transformationSystem/services/transform2N8n/transformationSession.ts
   ↓ For each node in order:
   ↓   - Get node config from NodeRegistry
   ↓   - Pull transformation method from registry
   ↓   - Execute transformation (contact_addTag.transform())
   ↓   - Accumulate compiled nodes
   ↓
5. contact_addTag.ts
   ↓ Parse endpoint template
   ↓ Build URL with expression concatenation
   ↓ Set authentication placeholder
   ↓ Return HTTP node
   ↓
6. n8n/transformationSystem/state/compiledWorkflow/append.ts
   ↓ Save compiled node to Firestore
   ↓
7. workflows/services/workflowCrudManager/updateWorkflow.ts
   ↓ Read compiled nodes
   ↓ Inject authentication: injectAuthenticationKey(nodes, apiKey)
   ↓ Replace 'TENANT_API_KEY_PLACEHOLDER' → 'ak_1234...sk_abcd...'
   ↓
8. n8n/services/workflowManager.ts
   ↓ Sync to n8n instance
   ↓ workflowManager.updateWorkflow(n8nId, {nodes: nodesWithAuth})
   ↓
9. n8n instance
   ↓ Workflow ready to execute
   ↓ When triggered: evaluates URL expression at runtime
   ↓ Makes authenticated API call
```

---

## Key Patterns Demonstrated

### 1. URL Construction
- ✅ Parse endpoint template with regex
- ✅ Detect expressions vs literals
- ✅ Unwrap expressions before embedding
- ✅ Use `encodeURIComponent()` for expressions
- ✅ Quote literals
- ✅ Join with `+` operator
- ✅ Wrap in `={{ }}`

### 2. Expression Handling
- ✅ Detect with `isExpression()`
- ✅ Unwrap with `unwrapExpression()`
- ✅ Handle operators (wrap in parentheses)
- ✅ Default to `$json.paramName` if empty

### 3. Authentication
- ✅ Use placeholder in transformation
- ✅ Inject real key post-compilation
- ✅ Support multiple header formats

---

## Testing Checklist

- [ ] Transformation matches correct node config
- [ ] URL is n8n expression (not static string)
- [ ] Expressions are unwrapped before embedding
- [ ] Literals are quoted
- [ ] Authentication placeholder is set
- [ ] No body parameters (sendBody: false)
- [ ] neverError: true for resilience
- [ ] Metadata includes original node info

---

## Common Issues & Fixes

### Issue 1: Literal String in URL

**Symptom:** Backend receives `{{$parameter["contactId"]}}` instead of actual ID

**Cause:** Using template literal instead of expression concatenation
```typescript
// ❌ WRONG
url: `${backendUrl}${endpoint}`
```

**Fix:** Use expression concatenation pattern
```typescript
// ✅ CORRECT
url: `={{ '${backendUrl}' + ${urlParts.join(' + ')} }}`
```

### Issue 2: Nested Expressions

**Symptom:** n8n shows syntax error in URL

**Cause:** Not unwrapping expressions
```typescript
// ❌ WRONG
urlParts.push(userValue)  // Still has ={{ }}
```

**Fix:** Unwrap before embedding
```typescript
// ✅ CORRECT
const expr = unwrapExpression(userValue)
urlParts.push(`encodeURIComponent(${expr})`)
```

### Issue 3: Authentication Failure

**Symptom:** API returns 401 Unauthorized

**Cause:** Placeholder not replaced with real key

**Fix:** Ensure `injectAuthenticationKey()` is called
```typescript
const nodesWithAuth = injectAuthenticationKey(compiledNodes, apiKey);
```

---

## Summary

This example demonstrates:
- Complete transformation lifecycle
- All critical patterns in one place
- Real-world implementation
- Common issues and solutions

**Use this as a template for new transformations with URL parameters!**
