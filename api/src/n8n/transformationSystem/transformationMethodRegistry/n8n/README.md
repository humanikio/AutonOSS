# n8n Node Schemas

This directory contains TypeScript type definitions for n8n nodes that we use in transformation patterns.

## Purpose

These schemas represent the exact JSON structure that n8n expects in workflow definitions. By maintaining local schemas, we:

1. **Version Control** - Lock to specific n8n versions to prevent breaking changes
2. **Type Safety** - TypeScript validates our transformations produce valid n8n nodes
3. **Documentation** - Self-documenting code shows exactly what each node requires
4. **Independence** - No runtime dependency on n8n packages

## Schemas

| Node Type | Schema File | Version | Purpose |
|-----------|-------------|---------|---------|
| Set | `Set.schema.ts` | v3.4 | Capture execution metadata, modify item fields |
| HttpRequest | `HttpRequest.schema.ts` | v4.2 | Make HTTP requests to external APIs |
| Wait | `Wait.schema.ts` | v1.1 | Pause workflow until webhook callback |
| Webhook | `Webhook.schema.ts` | v1 | Create webhook endpoints for triggers |
| IF | `If.schema.ts` | v2 | Conditional routing based on data |

## Usage in Transformation Patterns

```typescript
import {
  SetNodeConfig,
  SET_NODE_DEFAULTS,
  createSetAssignment,
} from '../../n8n/nodeSchemas/Set.schema';

// Create a Set node with type safety
const setNode: SetNodeConfig = {
  id: `set_${reactFlowNode.id}`,
  name: 'Capture Wait Metadata',
  ...SET_NODE_DEFAULTS,
  position: [x, y],
  parameters: {
    mode: 'manual',
    duplicateItem: false,
    assignments: {
      assignments: [
        createSetAssignment('executionId', 'executionId', '={{ $execution.id }}'),
        createSetAssignment('milestone', 'milestone', milestoneValue),
      ],
    },
  },
};
```

## Updating Schemas

When n8n releases a new version:

1. Check `version.txt` for current version
2. Review n8n changelog for breaking changes to nodes we use
3. Update schema files if node structure changed
4. Update `version.txt` with new version and date
5. Test all transformation patterns still work

## Schema Structure

Each schema file contains:

- **TypeScript interfaces** - Define the node structure
- **Type aliases** - Common enums and unions
- **Constants** - Default values for common configurations
- **Helper functions** - Convenient builders for common patterns (optional)

## Why Not Import n8n Directly?

We could import from `n8n-workflow` or `@n8n/nodes-base`, but:

❌ **Runtime dependency** - Would bundle n8n code into our backend
❌ **Version coupling** - Forced to upgrade when n8n updates
❌ **Build complexity** - n8n uses different build tools
❌ **Unnecessary code** - We only need type definitions, not execution logic

✅ **Local schemas** - Clean, minimal, under our control

## Reference

Source n8n repository: `/Users/tylerthomlinson/Desktop/pulseline/n8n`

Node definitions are found in: `n8n/packages/nodes-base/nodes/`
