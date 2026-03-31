# Authentication Flow Pattern

> **Two-stage process:** Transformations inject **placeholders**, then `injectAuthenticationKey()` replaces them with actual API keys post-compilation.

## ⚠️ CRITICAL: Use Authorization Header Only

**ALL Pulseline API endpoints use the `authenticateEither` middleware which ONLY accepts:**

```typescript
headers: {
  'Authorization': 'Bearer TENANT_API_KEY_PLACEHOLDER'  // ✅ CORRECT
}
```

**DO NOT USE:**
```typescript
headers: {
  'X-API-Key': 'TENANT_API_KEY_PLACEHOLDER'  // ❌ WRONG - Results in 401 Unauthorized
}
```

The `authenticateEither` middleware (`/src/middleware/authenticateEither.ts`) only checks the `Authorization` header with `Bearer` prefix. Custom headers like `X-API-Key` are **NOT supported** for Pulseline API authentication.

**Reference:** All transformation methods (`sms_send.ts`, `contact_create.ts`, `email_send.ts`, `wait_AppointmentMilestone.ts`, etc.) use `Authorization: Bearer` pattern.

---

## Overview

Authentication keys are **never hardcoded** in transformations. Instead:
1. Transformations set placeholder: `'Bearer TENANT_API_KEY_PLACEHOLDER'`
2. After compilation completes, `injectAuthenticationKey()` replaces placeholders with real keys
3. n8n workflow is synced with authenticated nodes

## Why Two Stages?

**Security:** API keys are tenant-specific and shouldn't be in transformation logic
**Flexibility:** Same transformation works for all tenants
**Separation:** Transformation logic is pure (no side effects)

---

## Stage 1: Placeholder Injection (Transformation)

### Implementation

```typescript
// File: contact_addTag.ts (or any transformation that calls backend APIs)

transform(node: ReactFlowNode, config: INodeTypeDescription, context: TransformationContext): TransformationResult {
  // ... build URL, body params, etc ...

  const headers: Record<string, any> = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer TENANT_API_KEY_PLACEHOLDER',  // ← Placeholder!
  };

  const httpParameters: HttpRequestParameters = {
    method: 'POST',
    url: fullUrl,
    sendHeaders: true,
    specifyHeaders: 'json',
    jsonHeaders: JSON.stringify(headers),  // ← Headers as JSON string
    // ...
  };

  // Return HTTP node with placeholder in headers
}
```

### Alternative Format: headerParameters

Some nodes use `headerParameters` instead of `jsonHeaders`:

```typescript
const httpParameters: HttpRequestParameters = {
  method: 'POST',
  url: fullUrl,
  sendHeaders: true,
  specifyHeaders: 'keypair',
  headerParameters: {
    parameters: [
      { name: 'Content-Type', value: 'application/json' },
      { name: 'Authorization', value: 'Bearer TENANT_API_KEY_PLACEHOLDER' }
    ]
  },
};
```

### Files Using Placeholders

Every transformation that calls Pulseline backend APIs:
- `contact_addTag.ts:98-101`
- `contact_removeTag.ts:98-101`
- `contact_create.ts:42-45`
- `contact_update.ts:110-113`
- `contact_delete.ts:98-101`
- `contact_find.ts:56-59`
- `opportunity_create.ts`
- `opportunity_update.ts`
- `opportunity_delete.ts`
- All transformations with `_pulseline.requiresAuth: true`

---

## Stage 2: Placeholder Replacement (Post-Compilation)

### Call Flow

```
1. User saves workflow (isPublic=true)
   workflows/services/workflowCrudManager/updateWorkflow.ts:47-52

2. Get/create API key for tenant
   updateWorkflow.ts:102-113
   ↓ getOrCreateAccountApiKey(tenantId, userId)

3. Transform workflow (with placeholders)
   updateWorkflow.ts:123-144
   ↓ transformWorkflow(tenantId, workflowId, apiKey, ...)

4. Read compiled nodes from Firestore
   updateWorkflow.ts:147
   ↓ const compiledNodes = await readCompiledWorkflow(tenantId, workflowId)

5. Inject real API key (replace placeholders)
   updateWorkflow.ts:150-151
   ↓ injectAuthenticationKey(compiledNodes, accountApiKey)

6. Sync to n8n with authenticated nodes
   updateWorkflow.ts:159-194
   ↓ workflowManager.updateWorkflow(n8nId, {nodes: nodesWithAuth, ...})
```

### Implementation

```typescript
// File: workflows/services/workflowCrudManager/updateWorkflow.ts

// Step 1: Get API key
let accountApiKey: string | undefined;
if (userId) {
  try {
    accountApiKey = await getOrCreateAccountApiKey(tenantId, userId);
    console.log(`✅ Retrieved account API key for tenant ${tenantId}`);
  } catch (error) {
    console.error(`⚠️  Failed to get account API key:`, error);
  }
}

// Step 2: Transform workflow (creates nodes with placeholders)
const transformResult = await transformWorkflow(
  tenantId,
  workflowId,
  accountApiKey,
  { rawReactFlow: { name, nodes, edges, status } }
);

// Step 3: Load compiled nodes
const compiledNodes = await readCompiledWorkflow(tenantId, workflowId);

// Step 4: Inject authentication (replace placeholders)
const { injectAuthenticationKey } = await import('../../../n8n/transformationSystem/utils/injectAuthenticationKey');
const nodesWithAuth = injectAuthenticationKey(compiledNodes, accountApiKey);

// Step 5: Sync to n8n
const n8nWorkflowData = {
  name: updatedWorkflow.name,
  nodes: nodesWithAuth,  // ← Nodes with real API keys!
  connections,
  settings: {},
  staticData: null,
};

await workflowManager.updateWorkflow(existingN8nId, n8nWorkflowData, tenantId, workflowId);
```

---

## Injection Utility

### File Location

```
n8n/transformationSystem/utils/injectAuthenticationKey.ts
```

### Implementation

```typescript
export function injectAuthenticationKey(nodes: any[], apiKey?: string): any[] {
  if (!apiKey) {
    console.warn('⚠️  No API key provided - nodes will use placeholders');
    return nodes;
  }

  console.log('🔐 Injecting authentication keys into nodes...');

  let injectionCount = 0;

  const processedNodes = nodes.map((node) => {
    // Only process HTTP Request nodes
    if (node.type !== 'n8n-nodes-base.httpRequest') {
      return node;
    }

    const params = node.parameters;

    // Handle JSON headers format
    if (params?.jsonHeaders) {
      try {
        const headers = JSON.parse(params.jsonHeaders);
        let modified = false;

        // Replace placeholder in Authorization header
        if (headers.Authorization) {
          if (headers.Authorization.includes('TENANT_API_KEY_PLACEHOLDER') ||
              headers.Authorization.includes('pulseline_api_key')) {
            headers.Authorization = `Bearer ${apiKey}`;
            modified = true;
          }
        }

        // ⚠️ LEGACY SUPPORT ONLY - X-API-Key is NOT recognized by authenticateEither middleware
        // DO NOT USE X-API-Key in new transformations - use Authorization header instead!
        if (headers['X-API-Key']) {
          if (headers['X-API-Key'].includes('TENANT_API_KEY_PLACEHOLDER') ||
              headers['X-API-Key'].includes('pulseline_api_key')) {
            headers['X-API-Key'] = apiKey;
            modified = true;
          }
        }

        if (modified) {
          params.jsonHeaders = JSON.stringify(headers);
          injectionCount++;
          console.log(`   🔑 Injected API key into node: ${node.name || node.id}`);
        }
      } catch (error) {
        console.error(`⚠️  Failed to parse jsonHeaders for node ${node.id}:`, error);
      }
    }

    // Handle parameter-based header format
    if (params?.headerParameters?.parameters) {
      params.headerParameters.parameters.forEach((header: any) => {
        if (header.name === 'Authorization' &&
            (header.value.includes('TENANT_API_KEY_PLACEHOLDER') ||
             header.value.includes('pulseline_api_key'))) {
          header.value = `Bearer ${apiKey}`;
          injectionCount++;
          console.log(`   🔑 Injected API key into node: ${node.name || node.id}`);
        }
      });
    }

    return node;
  });

  if (injectionCount > 0) {
    console.log(`✅ Injected authentication into ${injectionCount} node(s)`);
  } else {
    console.log('ℹ️  No nodes required authentication injection');
  }

  return processedNodes;
}
```

### Supported Header Formats

1. **JSON Headers** (`specifyHeaders: 'json'`)
   ```typescript
   jsonHeaders: '{"Content-Type": "application/json", "Authorization": "Bearer TENANT_API_KEY_PLACEHOLDER"}'
   ```

2. **Parameter Headers** (`specifyHeaders: 'keypair'`)
   ```typescript
   headerParameters: {
     parameters: [
       { name: 'Authorization', value: 'Bearer TENANT_API_KEY_PLACEHOLDER' }
     ]
   }
   ```

### Supported Placeholders

- `TENANT_API_KEY_PLACEHOLDER` - Recommended (most descriptive)
- `pulseline_api_key` - Legacy support

---

## API Key Retrieval

### File Location

```
workflows/utils/accountApiKeyHelper.ts
```

### How It Works

```typescript
export async function getOrCreateAccountApiKey(
  tenantId: string,
  userId: string
): Promise<string> {
  // 1. Check if API key already exists
  const existingKey = await findExistingApiKey(tenantId, userId);
  if (existingKey) {
    return existingKey.accessKeyId + '.' + existingKey.apiSecret;
  }

  // 2. Create new API key if not exists
  const newKey = await createApiKey(tenantId, userId);
  return newKey.accessKeyId + '.' + newKey.apiSecret;
}

// Format: "accessKeyId.apiSecret"
// Example: "ak_1234567890abcdef.sk_abcdef1234567890"
```

---

## Testing

### Unit Test: Placeholder Detection

```typescript
const node = {
  type: 'n8n-nodes-base.httpRequest',
  parameters: {
    jsonHeaders: '{"Authorization": "Bearer TENANT_API_KEY_PLACEHOLDER"}'
  }
};

const requiresAuth = nodeRequiresAuth(node);
expect(requiresAuth).toBe(true);
```

### Unit Test: JSON Headers Injection

```typescript
const nodes = [{
  type: 'n8n-nodes-base.httpRequest',
  parameters: {
    jsonHeaders: '{"Authorization": "Bearer TENANT_API_KEY_PLACEHOLDER"}'
  }
}];

const apiKey = 'ak_test.sk_test';
const result = injectAuthenticationKey(nodes, apiKey);

const headers = JSON.parse(result[0].parameters.jsonHeaders);
expect(headers.Authorization).toBe('Bearer ak_test.sk_test');
```

### Unit Test: Parameter Headers Injection

```typescript
const nodes = [{
  type: 'n8n-nodes-base.httpRequest',
  parameters: {
    headerParameters: {
      parameters: [
        { name: 'Authorization', value: 'Bearer TENANT_API_KEY_PLACEHOLDER' }
      ]
    }
  }
}];

const apiKey = 'ak_test.sk_test';
const result = injectAuthenticationKey(nodes, apiKey);

const authHeader = result[0].parameters.headerParameters.parameters.find(h => h.name === 'Authorization');
expect(authHeader.value).toBe('Bearer ak_test.sk_test');
```

---

## Common Pitfalls

### Pitfall 1: Hardcoding API Keys

```typescript
// ❌ WRONG - Never hardcode API keys!
const headers = {
  'Authorization': 'Bearer ak_1234567890abcdef.sk_abcdef1234567890'
};

// ✅ CORRECT - Use placeholder
const headers = {
  'Authorization': 'Bearer TENANT_API_KEY_PLACEHOLDER'
};
```

### Pitfall 2: Missing Injection Call

```typescript
// ❌ WRONG - Syncing with placeholders
const compiledNodes = await readCompiledWorkflow(tenantId, workflowId);
await workflowManager.updateWorkflow(n8nId, { nodes: compiledNodes });
// n8n workflow has placeholders - will fail at runtime!

// ✅ CORRECT - Inject before syncing
const compiledNodes = await readCompiledWorkflow(tenantId, workflowId);
const nodesWithAuth = injectAuthenticationKey(compiledNodes, apiKey);
await workflowManager.updateWorkflow(n8nId, { nodes: nodesWithAuth });
```

### Pitfall 3: Wrong Header Format

```typescript
// ❌ WRONG - Not detected by injection utility
const headers = {
  'Authorization': 'TENANT_API_KEY_PLACEHOLDER'  // Missing "Bearer "
};

// ✅ CORRECT - Include "Bearer " prefix
const headers = {
  'Authorization': 'Bearer TENANT_API_KEY_PLACEHOLDER'
};
```

### Pitfall 4: No API Key Provided

```typescript
// ❌ WRONG - Missing userId parameter
await updateWorkflow(tenantId, workflowId, data);  // userId is undefined!
// Result: Workflow syncs with placeholders

// ✅ CORRECT - Provide userId
await updateWorkflow(tenantId, workflowId, data, userId);
// Result: API key retrieved and injected
```

---

## Summary

✅ **Transformations:**
- Always use `'Bearer TENANT_API_KEY_PLACEHOLDER'`
- Support both `jsonHeaders` and `headerParameters` formats
- Never hardcode API keys

✅ **Injection:**
- Runs post-compilation in `updateWorkflow.ts`
- Replaces all placeholders in HTTP nodes
- Supports both header formats
- Logs injection count

✅ **API Keys:**
- Retrieved via `getOrCreateAccountApiKey()`
- Format: `accessKeyId.apiSecret`
- Stored securely in Firestore
- Unique per tenant

❌ **DON'T:**
- Hardcode API keys in transformations
- Skip injection before n8n sync
- Use wrong placeholder format
- Forget to pass userId to workflow update
