# Transformation System Documentation

> **CRITICAL:** This documentation covers patterns that MUST be followed exactly. Incorrect implementation will cause runtime failures in n8n with expression evaluation errors.

## Overview

The Transformation System converts ReactFlow workflows into n8n workflows through a 3-phase compilation process. Each transformation method must handle n8n expressions correctly to ensure proper runtime evaluation.

## Table of Contents

### Core Patterns
1. [URL Construction](./patterns/01-url-construction.md) - **CRITICAL** - Building URLs with dynamic parameters
2. [Body Field Handling](./patterns/02-body-fields.md) - Pre-defined vs user-defined fields
3. [fixedCollection Patterns](./patterns/03-fixed-collection.md) - Field-value pair handling
4. [Expression Handling](./patterns/04-expression-handling.md) - Detecting, unwrapping, normalizing expressions
5. [Authentication Flow](./patterns/05-authentication.md) - Placeholder injection and replacement
6. [Conditional Output](./patterns/06-conditional-output.md) - IF node injection for routing

### Reference
- [Helper Functions API](./helpers/expression-helpers-reference.md) - Complete utility function reference

### Examples
- [Contact Tag Transformation](./examples/contact-tag-transformation.md) - URL parameters with expressions and literals
- [Contact Create Transformation](./examples/contact-create-transformation.md) - Body parameters with fixedCollection
- [Find Contact Transformation](./examples/find-contact-transformation.md) - Conditional output with IF node

## Quick Start

### The Golden Rule

**n8n expressions CANNOT be nested. Always unwrap when embedding.**

```typescript
// ❌ WRONG - Nested expressions
url: `${backendUrl}${endpoint}`  // Sends literal "{{$parameter["id"]}}"
body: `={{ { id: ={{ $json.id }} } }}`  // Invalid syntax

// ✅ CORRECT - Properly constructed
url: `={{ 'https://api.com' + '/contacts/' + encodeURIComponent($json.id) }}`
body: `={{ { id: $json.id } }}`  // Unwrapped expression
```

## System Architecture

```
Frontend (ReactFlow - 11 nodes)
    ↓
Planning Phase (reviewReactFlow)
    ├── Inject Contact Adapters (11 → 14 nodes)
    ├── Save Processed ReactFlow to Firestore
    └── Create Skeleton (14 tasks)
    ↓
Compilation Phase (transform2N8n)
    ├── Load Skeleton + Processed ReactFlow
    ├── Resolve Contact Fields ({{$contact.*}})
    └── Execute Transformations (14 tasks)
    ↓
Compiled Workflow (stored in Firestore)
    ↓
Authentication Injection (replaces placeholders)
    ↓
n8n Sync (deploys to n8n instance)
```

### State Management

The system maintains **two separate ReactFlow workflows**:

1. **Original ReactFlow** (`/workflows/{id}`) - Frontend source of truth
   - Never modified by backend
   - Visible in UI (11 clean nodes)
   - User-editable

2. **Processed ReactFlow** (`/n8n/buildSession/processedReactFlow/main`) - Backend compilation source
   - Computed during planning (11 → 14 nodes via adapter injection)
   - Persisted for recovery scenarios
   - Invisible to frontend
   - Contains adapter nodes for contact field resolution

## File Structure

```
backend/src/
├── docs/workflows/transformationSystem/     # THIS DOCUMENTATION
├── n8n/transformationSystem/
│   ├── orchrestrators/
│   │   └── transformationOrchrestrator.ts  # Coordinates phases
│   ├── services/
│   │   ├── reviewReactFlow.ts              # Planning phase
│   │   │   └── injectContactFieldAdapter.ts # Adapter injection
│   │   └── transform2N8n.ts                # Compilation phase
│   │       ├── transformationSession.ts    # Session orchestration
│   │       └── resolveContactFields.ts     # Field resolution
│   ├── state/
│   │   ├── skeleton/                       # Build plan (14 tasks)
│   │   ├── processedReactFlow/             # Adapter-enhanced workflow (NEW)
│   │   ├── compiledWorkflow/               # Final n8n nodes
│   │   └── session/                        # Session metadata
│   ├── transformationMethodRegistry/
│   │   ├── contactManagement/              # Contact-related transformations
│   │   │   ├── contact_addTag.ts           # Example: URL params
│   │   │   ├── contact_create.ts           # Example: Body params
│   │   │   └── contact_find.ts             # Example: Conditional output
│   │   ├── utils/
│   │   │   └── expressionHelpers.ts        # Helper functions
│   │   └── n8n/nodeSchemas/                # n8n node type definitions
│   └── utils/
│       └── injectAuthenticationKey.ts      # Auth placeholder replacement
└── workflows/services/
    ├── nodeRegistry/nodes/pulseline/       # Node configs
    └── workflowCrudManager/
        └── updateWorkflow.ts               # Entry point for workflow saves
```

## Common Pitfalls

### 1. URL Construction
❌ **WRONG:** Using string concatenation
```typescript
url: `${backendUrl}${endpoint}`
// Result: 'https://api.com/api/contacts/{{$parameter["contactId"]}}'  // LITERAL!
```

✅ **CORRECT:** Using n8n expression concatenation
```typescript
url: `={{ 'https://api.com' + '/api/contacts/' + encodeURIComponent($json.contactId) }}`
// Result: 'https://api.com/api/contacts/abc123'  // EVALUATED!
```

### 2. Body Parameters
❌ **WRONG:** Skipping undefined/null filtering
```typescript
bodyParameters.push({ name: 'email', value: undefined });  // Creates invalid param!
```

✅ **CORRECT:** Using `buildBodyParameters` helper
```typescript
const bodyParameters = buildBodyParameters({ email: nodeParams.email });
// Automatically filters out undefined/null/empty values
```

### 3. Expression Unwrapping
❌ **WRONG:** Nesting expressions
```typescript
const obj = `={{ { id: ={{ $json.id }} } }}`;  // SYNTAX ERROR!
```

✅ **CORRECT:** Unwrapping before embedding
```typescript
const expr = unwrapExpression('={{$json.id}}');  // Returns: '$json.id'
const obj = `={{ { id: ${expr} } }}`;  // VALID!
```

## Testing Checklist

When implementing a new transformation:

- [ ] URL parameters are built using regex parsing + expression concatenation
- [ ] Expressions are detected with `isExpression()`
- [ ] Expressions are unwrapped when embedded in objects
- [ ] Expressions are normalized to have `=` prefix
- [ ] Body parameters filter out undefined/null/empty values
- [ ] Authentication uses placeholder `TENANT_API_KEY_PLACEHOLDER`
- [ ] fixedCollection fields are flattened or converted correctly
- [ ] Conditional outputs create internal edges and replacements

## Getting Help

1. **Pattern Questions:** Check the pattern docs in `./patterns/`
2. **Real Examples:** See `./examples/` for working implementations
3. **API Reference:** See `./helpers/expression-helpers-reference.md`
4. **Debugging:** Enable logging in `transformationSession.ts:119`

## Version History

- **v1.0** (2024-11) - Initial documentation
  - URL construction pattern
  - Body field handling
  - fixedCollection patterns
  - Expression helpers
  - Authentication flow
  - Conditional output
